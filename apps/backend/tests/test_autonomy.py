"""S3b — Modo Autônomo: responsabilidades, scheduler e execuções.

Critério da Fase 3 (PLANO_DE_ACAO_FASE3.md): uma rotina real executa sem pedido manual pelo
scheduler, respeita pausa e nível, gera execução com código e estado; falha de forma compreensível
(duas tentativas) e dois schedulers não duplicam. Tudo no modo simulado; textos do protótipo (§7).
"""

import asyncio
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import psycopg
import pytest
from psycopg.rows import dict_row

from hellosquad.autonomy.authorization import requires_authorization
from hellosquad.autonomy.scheduler import AUTONOMY_LOCK_KEY, run_due_responsibilities
from hellosquad.config import Settings
from hellosquad.llm.simulated import SimulatedLLM
from hellosquad.worker.main import Worker, worker_conninfo

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
RAFAEL = "rafael@vitta.example"
CARLA = "carla@vitta.example"
PLAN = "5eed0000-0000-4000-8000-000000000a01"
RES = "5eed0000-0000-4000-8000-000000000a02"
SEO = "5eed0000-0000-4000-8000-000000000a03"
BRT = ZoneInfo("America/Sao_Paulo")
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def rows(conn: psycopg.AsyncConnection, query: str, *params: object) -> list[dict[str, Any]]:
    cursor = conn.cursor(row_factory=dict_row)
    await cursor.execute(query, params)
    return await cursor.fetchall()


async def scalar(conn: psycopg.AsyncConnection, query: str, *params: object) -> Any:
    [row] = await rows(conn, query, *params)
    return next(iter(row.values()))


@pytest.fixture(autouse=True)
async def seed_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    yield
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


async def workspace(admin_db: psycopg.AsyncConnection, slug: str) -> str:
    return str(await scalar(admin_db, "select id from public.workspaces where slug = %s", slug))


async def connect() -> psycopg.AsyncConnection:
    return await psycopg.AsyncConnection.connect(
        worker_conninfo(Settings()), autocommit=True, prepare_threshold=None, row_factory=dict_row
    )


async def tick(now: datetime, **kwargs: Any):
    async with await connect() as conn:
        return await run_due_responsibilities(conn, now=now, **kwargs)


async def drain(**llm: Any) -> list[str]:
    settings = Settings(llm_provider="simulated", worker_retry_base_seconds=0)
    async with Worker(settings, llm=SimulatedLLM(**llm)) as worker:
        return await worker.drain()


async def runs_of(
    admin_db: psycopg.AsyncConnection, responsibility_id: str
) -> list[dict[str, Any]]:
    return await rows(
        admin_db,
        "select * from public.responsibility_runs where responsibility_id = %s "
        "order by scheduled_for, created_at",
        responsibility_id,
    )


async def run_by_code(api, token: str, ws: str, code: str) -> dict[str, Any]:
    response = await api.get(f"/workspaces/{ws}/autonomy/runs?limit=100", headers=bearer(token))
    assert response.status_code == 200, response.text
    return next(item for item in response.json()["items"] if item["code"] == code)


async def test_account_in_use_matches_the_prototype(api, access_token, admin_db) -> None:
    ws = await workspace(admin_db, "miolo")
    token = access_token(MARINA)
    response = await api.get(f"/workspaces/{ws}/autonomy", headers=bearer(token))
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["counts"] == {"active": 2, "paused": 1, "failed": 1, "blocked": 1, "ended": 0}
    assert body["switch"] == {"visible": True, "on": True, "label": "Ligado"}
    by_template = {item["template"]: item for item in body["responsibilities"]}
    plan = by_template["plan"]
    assert plan["title"] == "Planejar meus conteúdos toda semana"
    assert plan["status_label"] == "Ativa"
    assert plan["frequency_label"] == "Toda quinta, às 9h"
    assert plan["next_run_label"] == "qui, 22/10, 9h"
    assert plan["say"] == (
        "Próxima execução: qui, 22/10, 9h · Plano da semana 44. Plano editorial com 3 posts por "
        "semana."
    )
    assert by_template["seo"]["say"] == (
        "A última execução falhou: o acesso ao Google Perfil expirou e precisa ser reconectado."
    )
    assert by_template["seo"]["idle"] == "Nada acontece até a conexão voltar."
    assert by_template["crm"]["status_label"] == "Bloqueada por integração"
    assert by_template["crm"]["say"] == (
        "O e-mail marketing não está conectado: o Max prepara segmentos, mas nada pode ser enviado."
    )
    assert by_template["posts"]["say"] == (
        "Pausada por você: nada novo é preparado ou publicado até você retomar."
    )
    assert not by_template["seo"]["can_pause"] and not by_template["seo"]["can_end"]
    assert [offer["id"] for offer in body["offers"]] == ["opp", "reviews"]
    assert body["history_total"] == 5
    assert [u["state"] for u in body["upcoming"]].count("blocked") >= 1

    pl42 = await run_by_code(api, token, ws, "PL-42")
    assert (pl42["status_label"], pl42["message"]) == (
        "Aprovada por você",
        "Aprovado por você na sexta, 17:42",
    )
    assert pl42["title"] == "Plano da semana 42"
    bl42 = await run_by_code(api, token, ws, "BL-42")
    assert (bl42["status_label"], bl42["message"]) == (
        "Falhou",
        "Falhou nas duas tentativas: o acesso ao Google Perfil expirou e precisa ser reconectado.",
    )
    rc10 = await run_by_code(api, token, ws, "RC-10")
    assert (rc10["status_label"], rc10["message"]) == (
        "Não executada",
        "Não executada: o e-mail marketing não está conectado. Nada foi preparado para envio.",
    )
    assert (await run_by_code(api, token, ws, "RS-42"))["title"] == "Leitura da semana 05 a 11/10"

    seo = (
        await api.get(f"/workspaces/{ws}/autonomy/responsibilities/{SEO}", headers=bearer(token))
    ).json()
    assert seo["detail_notice"] == (
        "A consulta de hoje falhou duas vezes (9h e 9h30): o acesso ao Google Perfil expirou. "
        "Nada foi apresentado como concluído."
    )
    detail = (
        await api.get(f"/workspaces/{ws}/autonomy/responsibilities/{PLAN}", headers=bearer(token))
    ).json()
    assert detail["agreement"] == (
        "Toda quinta às 9h, o Otto apresenta o plano da semana seguinte com 3 posts por semana. "
        "A Kaia cria as artes. Nada é publicado sem a sua aprovação."
    )
    facts = {fact["key"]: fact["value"] for fact in detail["facts"]}
    assert facts["responsible"] == "Otto" and facts["collaboration"] == "Kaia"
    assert facts["coordination"] == "Nexo"
    assert facts["approval"] == "Necessária antes de publicar"
    execute = {a["action"]: a for a in detail["levels"]["execute"]}
    assert execute["publish_instagram"]["state"] == "you"
    assert execute["publish_instagram"]["requirement_label"] == (
        "Sua aprovação, publicação por publicação"
    )
    assert execute["change_paid_campaigns"]["state"] == "no"
    assert "Investir em anúncios" in detail["levels"]["never"]
    assert [u["title"] for u in detail["upcoming"]] == [
        "Plano da semana 44",
        "Plano da semana 45",
        "Plano da semana 46",
    ]
    assert detail["events"][-1]["text"] == "Você delegou: planejar meus conteúdos toda semana"


async def test_routine_runs_without_manual_request(api, access_token, admin_db) -> None:
    """O scheduler dispara o plano de quinta e a leitura de segunda sem ninguém pedir: execução
    com código, trabalho com as etapas do modelo na fila runs_scheduled, Otto entrega, "Aguarda sua
    aprovação", o dono aprova ("Aprovada por você") e a Kaia fica aguardando o motor."""
    ws = await workspace(admin_db, "miolo")
    token = access_token(MARINA)
    due = await scalar(
        admin_db, "select next_run_at from public.responsibilities where id = %s", PLAN
    )
    assert due.astimezone(BRT).strftime("%a %H:%M") == "Thu 09:00"

    report = await tick(due + timedelta(minutes=1))
    assert (report.started, report.skipped, report.failed) == (2, 0, 0)

    [pl] = [r for r in await runs_of(admin_db, PLAN) if r["code"] == "PL-44"]
    assert pl["status"] == "running" and pl["attempts"] == 1 and pl["scheduled_for"] == due
    item = (
        await rows(admin_db, "select * from public.work_items where id = %s", pl["work_item_id"])
    )[0]
    assert (item["origin_type"], item["origin_ref"], item["primary_agent_id"]) == (
        "routine_run",
        "PL-44",
        "otto",
    )
    assert item["title"] == "Plano da semana 44"
    steps = await rows(
        admin_db,
        "select seq, agent_id::text, delivery_type, depends_on from public.work_item_steps "
        "where work_item_id = %s order by seq",
        item["id"],
    )
    assert [(s["agent_id"], s["delivery_type"], s["depends_on"]) for s in steps] == [
        ("otto", "04.02", []),
        ("kaia", "03.01", [1]),
    ]
    [run] = await rows(
        admin_db, "select kind::text, step_id from public.runs where id = %s", pl["run_id"]
    )
    assert run["kind"] == "scheduled" and run["step_id"] is not None
    assert (
        await scalar(
            admin_db,
            "select count(*) from pgmq.q_runs_scheduled where (message ->> 'run_id')::uuid = %s",
            pl["run_id"],
        )
        == 1
    )
    next_plan = await scalar(
        admin_db, "select next_run_at from public.responsibilities where id = %s", PLAN
    )
    assert next_plan == due + timedelta(days=7)

    await drain()
    item_status = await scalar(
        admin_db, "select status::text from public.work_items where id = %s", item["id"]
    )
    assert item_status == "needs_you"
    pl44 = await run_by_code(api, token, ws, "PL-44")
    assert (pl44["status_label"], pl44["message"]) == (
        "Aguarda sua aprovação",
        "Entregue · aguarda a sua aprovação",
    )
    assert pl44["memory_used"], "o plano usou a Memória da Marca e isso fica na execução"
    rs43 = await run_by_code(api, token, ws, "RS-43")
    assert (rs43["status_label"], rs43["message"]) == ("Concluída", "Entregue")
    assert rs43["title"] == "Leitura da semana 12 a 18/10"

    approval = await scalar(
        admin_db,
        "select id from public.approvals where work_item_id = %s and status = 'pending'",
        item["id"],
    )
    decided = await api.post(
        f"/approvals/{approval}/decision", json={"decision": "approved"}, headers=bearer(token)
    )
    assert decided.status_code == 200, decided.text
    pl44 = await run_by_code(api, token, ws, "PL-44")
    assert pl44["status_label"] == "Aprovada por você"
    assert pl44["message"].startswith("Aprovado por você ")

    await drain()
    kaia = await rows(
        admin_db,
        "select status::text, status_reason from public.work_item_steps "
        "where work_item_id = %s and seq = 2",
        item["id"],
    )
    assert kaia == [{"status": "waiting_engine", "status_reason": "image_engine_pending"}]
    assert (await run_by_code(api, token, ws, "PL-44"))["status"] == "approved"


async def test_pause_resume_end_and_switch(api, access_token, admin_db) -> None:
    ws = await workspace(admin_db, "miolo")
    headers = bearer(access_token(MARINA))
    base = f"/workspaces/{ws}/autonomy/responsibilities"
    paused = await api.post(f"{base}/{PLAN}/pause", headers=headers)
    assert paused.status_code == 200, paused.text
    body = paused.json()
    assert (body["status"], body["next_run_at"], body["idle"]) == (
        "paused",
        None,
        "Nenhuma execução até você retomar.",
    )
    assert (await api.post(f"{base}/{PLAN}/pause", headers=headers)).status_code == 200

    before = len(await runs_of(admin_db, PLAN))
    await tick(datetime.now(UTC) + timedelta(days=30))
    assert len(await runs_of(admin_db, PLAN)) == before, "pausada não executa"

    resumed = (await api.post(f"{base}/{PLAN}/resume", headers=headers)).json()
    assert resumed["status"] == "active"
    assert datetime.fromisoformat(resumed["next_run_at"]) > datetime.now(UTC)
    assert (await api.post(f"{base}/{SEO}/pause", headers=headers)).status_code == 409
    assert (await api.post(f"{base}/{SEO}/end", headers=headers)).status_code == 409

    ended = (await api.post(f"{base}/{PLAN}/end", headers=headers)).json()
    assert (ended["status"], ended["can_redelegate"], ended["say"]) == (
        "ended",
        True,
        "Encerrada por você. O histórico continua disponível.",
    )
    assert ended["history_total"] == len(await runs_of(admin_db, PLAN))
    assert [e["text"] for e in ended["events"][:3]] == [
        "Você encerrou a responsabilidade. Nada novo é preparado; o histórico fica guardado.",
        "Você retomou a responsabilidade",
        "Você pausou a responsabilidade",
    ]
    assert (await api.post(f"{base}/{PLAN}/resume", headers=headers)).status_code == 409

    switch = f"/workspaces/{ws}/autonomy/switch"
    off = await api.post(switch, json={"on": False}, headers=headers)
    assert off.json() == {"on": False, "changed": 1}
    overview = (await api.get(f"/workspaces/{ws}/autonomy", headers=headers)).json()
    assert overview["switch"] == {"visible": True, "on": False, "label": "Pausado"}
    assert overview["counts"]["ended"] == 1 and overview["counts"]["failed"] == 1
    assert (await api.post(switch, json={"on": True}, headers=headers)).json()["changed"] == 2

    redelegated = await api.post(f"{base}/{PLAN}/redelegate", headers=headers)
    assert redelegated.status_code == 201, redelegated.text
    assert redelegated.json()["agreement"].startswith("Toda quinta às 9h, o Otto apresenta")


async def test_delegation_is_a_conversation_and_only_the_owner_confirms(
    api, access_token, admin_db
) -> None:
    ws = await workspace(admin_db, "vitta")
    owner, editor = bearer(access_token(RAFAEL)), bearer(access_token(CARLA))
    conversation = await scalar(
        admin_db,
        "insert into public.conversations (workspace_id, kind, primary_agent_id, title) "
        "values (%s, 'agent_direct', 'nexo', 'Nova responsabilidade') returning id",
        ws,
    )
    templates = (await api.get(f"/workspaces/{ws}/autonomy/templates", headers=owner)).json()
    plan = next(item for item in templates if item["id"] == "plan")
    day = next(q for q in plan["questions"] if q["key"] == "day")
    assert day["question"] == "Em que dia você quer receber o plano da semana seguinte?"
    assert {"value": "fri", "label": "sexta"} in day["options"]

    proposals = f"/workspaces/{ws}/autonomy/proposals"
    bad = await api.post(
        proposals, json={"template": "plan", "options": {"day": "sun"}}, headers=owner
    )
    assert bad.status_code == 422
    assert (
        await api.post(proposals, json={"template": "res", "auto_publish": True}, headers=owner)
    ).status_code == 422

    created = await api.post(
        proposals,
        json={
            "template": "plan",
            "options": {"obj": "site_orders", "day": "fri", "vol": "posts3"},
            "conversation_id": str(conversation),
        },
        headers=editor,
    )
    assert created.status_code == 201, created.text
    proposal = created.json()
    assert proposal["agreement"] == (
        "Toda sexta às 9h, o Otto apresenta o plano da semana seguinte com 3 posts por semana. "
        "A Kaia cria as artes. Nada é publicado sem a sua aprovação."
    )
    assert proposal["first_run_label"].startswith("sex, ")
    [message] = await rows(
        admin_db,
        "select author_agent_id::text, body, card, approval_id from public.messages where id = %s",
        proposal["message_id"],
    )
    assert message["author_agent_id"] == "nexo"
    assert message["body"] == "Antes de ativar, confira o combinado:"
    assert message["card"]["type"] == "responsibility_proposal"
    assert message["card"]["kicker"] == "Responsabilidade"
    assert str(message["approval_id"]) == proposal["approval_id"]
    assert (
        await scalar(
            admin_db,
            "select kind::text from public.approvals where id = %s",
            proposal["approval_id"],
        )
        == "confirm"
    )
    assert (
        await scalar(
            admin_db,
            "select count(*) from public.responsibilities where workspace_id = %s",
            ws,
        )
        == 0
    ), "nada é ativado antes do ok do dono"

    decision = f"/approvals/{proposal['approval_id']}/decision"
    assert (
        await api.post(decision, json={"decision": "approved"}, headers=editor)
    ).status_code == 403
    assert (
        await api.post(decision, json={"decision": "approved"}, headers=owner)
    ).status_code == 200
    [resp] = await rows(
        admin_db, "select * from public.responsibilities where workspace_id = %s", ws
    )
    assert (resp["status"], resp["template"], resp["options"]["day"]) == ("active", "plan", "fri")
    assert resp["next_run_at"].astimezone(BRT).strftime("%a %H:%M") == "Fri 09:00"
    reply = await scalar(
        admin_db,
        "select body from public.messages where conversation_id = %s and author_agent_id = 'nexo' "
        "and card is null order by created_at desc limit 1",
        conversation,
    )
    assert reply.startswith(
        "Delegado. Está no Modo Autônomo como responsabilidade ativa. Primeira execução: sex, "
    )
    assert (
        await scalar(
            admin_db,
            "select status::text from public.work_items where id = %s",
            proposal["work_item_id"],
        )
        == "done"
    )
    duplicate = await api.post(proposals, json={"template": "plan"}, headers=owner)
    assert duplicate.status_code == 409

    base = f"/workspaces/{ws}/autonomy/responsibilities/{resp['id']}"
    assert (await api.post(f"{base}/pause", headers=editor)).status_code == 403

    change = {
        "template": "plan",
        "options": {"day": "thu", "vol": "posts3"},
        "auto_publish": True,
        "conversation_id": str(conversation),
        "responsibility_id": str(resp["id"]),
    }
    adjusted = (await api.post(proposals, json=change, headers=owner)).json()
    assert adjusted["card"]["kicker"] == "Mudança no combinado"
    await api.post(
        f"/approvals/{adjusted['approval_id']}/decision",
        json={"decision": "rejected"},
        headers=owner,
    )
    assert (await api.get(base, headers=owner)).json()["options"]["day"] == "fri"

    confirmed = (await api.post(proposals, json=change, headers=owner)).json()
    await api.post(
        f"/approvals/{confirmed['approval_id']}/decision",
        json={"decision": "approved"},
        headers=owner,
    )
    detail = (await api.get(base, headers=owner)).json()
    assert detail["options"]["day"] == "thu" and detail["auto_publish"] is True
    publish = next(a for a in detail["levels"]["execute"] if a["action"] == "publish_instagram")
    assert (publish["state"], publish["requirement_label"]) == (
        "ok",
        "Autorizado: o que você aprovar no plano",
    )
    assert detail["events"][0]["text"] == "Você mudou o combinado: toda quinta, às 9h"
    last_reply = await scalar(
        admin_db,
        "select body from public.messages where conversation_id = %s and author_agent_id = 'nexo' "
        "and card is null order by created_at desc limit 1",
        conversation,
    )
    assert last_reply == (
        "Atualizado. Vale a partir da próxima execução, e o histórico continua o mesmo."
    )

    actions = (
        await rows(
            admin_db, "select actions from public.responsibilities where id = %s", resp["id"]
        )
    )[0]["actions"]
    approved = requires_authorization(actions, "publish_instagram", approved_in_plan=True)
    assert approved.pre_authorized and not approved.needs_owner_authorization
    loose = requires_authorization(actions, "publish_instagram", approved_in_plan=False)
    assert loose.allowed and loose.needs_owner_authorization
    campaigns = requires_authorization(actions, "change_paid_campaigns", approved_in_plan=True)
    assert campaigns.needs_owner_authorization and campaigns.requirement == "specific_authorization"
    assert not requires_authorization(actions, "invest_in_ads").allowed
    assert not requires_authorization(actions, "send_messages").allowed
    assert requires_authorization(actions, "create_topics").needs_owner_authorization is False


async def test_connection_gate_retries_twice_then_fails(api, access_token, admin_db) -> None:
    """Sem conexão: "Não executada" e "Bloqueada por integração". Conexão expirada: tentativa às 9h,
    nova às 9h30 e, na segunda, "Falhou" com a responsabilidade em "Falha na execução". O gancho
    da S3a destrava."""
    ws = await workspace(admin_db, "vitta")
    owner = bearer(access_token(RAFAEL))
    created = (
        await api.post(
            f"/workspaces/{ws}/autonomy/proposals", json={"template": "seo"}, headers=owner
        )
    ).json()
    await api.post(
        f"/approvals/{created['approval_id']}/decision",
        json={"decision": "approved"},
        headers=owner,
    )
    resp_id = await scalar(
        admin_db, "select id from public.responsibilities where workspace_id = %s", ws
    )
    due = await scalar(
        admin_db, "select next_run_at from public.responsibilities where id = %s", resp_id
    )

    report = await tick(due)
    assert report.skipped == 1
    [skipped] = await runs_of(admin_db, resp_id)
    assert (skipped["status"], skipped["message_key"]) == (
        "skipped",
        "not_connected.google_business_profile",
    )
    detail = (
        await api.get(f"/workspaces/{ws}/autonomy/responsibilities/{resp_id}", headers=owner)
    ).json()
    assert detail["status_label"] == "Bloqueada por integração"
    assert detail["history"][0]["message"] == (
        "Não executada: o Google Perfil não está conectado. Nada foi lido."
    )

    await admin_db.execute(
        "insert into public.fact_sources (workspace_id, kind, name, state) "
        "values (%s, 'connection', 'Google Perfil', 'needs_reconnect')",
        (ws,),
    )
    retry_at = due + timedelta(hours=2)
    assert (
        await scalar(
            admin_db,
            "select app.unblock_responsibilities_for_connection(%s, 'google_business_profile', %s)",
            ws,
            retry_at,
        )
        == 1
    )
    first = await tick(retry_at)
    assert first.retried == 1
    retry = (await runs_of(admin_db, resp_id))[-1]
    assert (retry["status"], retry["attempts"], retry["code"]) == (
        "scheduled",
        1,
        f"{skipped['code']}b",
    )
    message = (await run_by_code(api, access_token(RAFAEL), ws, retry["code"]))["message"]
    assert message == "A tentativa das 11h falhou; nova tentativa às 11h30."

    second = await tick(retry_at + timedelta(minutes=30))
    assert second.failed == 1
    failed = (await runs_of(admin_db, resp_id))[-1]
    assert (failed["status"], failed["attempts"]) == ("failed", 2)
    detail = (
        await api.get(f"/workspaces/{ws}/autonomy/responsibilities/{resp_id}", headers=owner)
    ).json()
    assert detail["status_label"] == "Falha na execução"
    assert detail["history"][0]["message"] == (
        "Falhou nas duas tentativas: o acesso ao Google Perfil expirou e precisa ser reconectado."
    )
    assert detail["detail_notice"] == (
        "A consulta de hoje falhou duas vezes (11h e 11h30): o acesso ao Google Perfil expirou. "
        "Nada foi apresentado como concluído."
    )
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        await admin_db.execute(
            "update public.responsibility_runs set message_key = 'delivered' where id = %s",
            (failed["id"],),
        )


async def test_runtime_failure_gets_a_second_attempt(api, access_token, admin_db) -> None:
    ws = await workspace(admin_db, "miolo")
    due = await scalar(
        admin_db, "select next_run_at from public.responsibilities where id = %s", RES
    )
    await admin_db.execute(
        "update public.responsibilities set next_run_at = now() + interval '1 year' where id = %s",
        (PLAN,),
    )
    assert (await tick(due)).started == 1
    await drain(fail_steps={"iris.produce": "config"})
    run = (await runs_of(admin_db, RES))[-1]
    assert (run["status"], run["attempts"], run["message_key"]) == ("scheduled", 1, "retrying")
    assert run["retry_at"] is not None

    assert (await tick(run["retry_at"] + timedelta(seconds=1))).started == 1
    await drain(fail_steps={"iris.produce": "config"})
    run = (await runs_of(admin_db, RES))[-1]
    assert (run["status"], run["attempts"]) == ("failed", 2)
    message = (await run_by_code(api, access_token(MARINA), ws, run["code"]))["message"]
    assert message == (
        "Falhou nas duas tentativas: o trabalho não terminou. Nada foi apresentado como concluído."
    )
    assert (
        await scalar(
            admin_db, "select status::text from public.responsibilities where id = %s", RES
        )
        == "active"
    ), "falha do runtime não bloqueia a responsabilidade: o próximo ciclo roda"


async def test_two_schedulers_never_duplicate_a_cycle(admin_db) -> None:
    due = await scalar(
        admin_db, "select next_run_at from public.responsibilities where id = %s", PLAN
    )
    async with await connect() as holder, await connect() as other:
        await holder.execute("select pg_advisory_lock(%s)", (AUTONOMY_LOCK_KEY,))
        skipped = await run_due_responsibilities(other, now=due + timedelta(minutes=1))
        assert skipped.tick_skipped and skipped.total == 0
        await holder.execute("select pg_advisory_unlock(%s)", (AUTONOMY_LOCK_KEY,))
        reports = await asyncio.gather(
            run_due_responsibilities(holder, now=due + timedelta(minutes=1)),
            run_due_responsibilities(other, now=due + timedelta(minutes=1)),
        )
    assert sum(r.started for r in reports) == 2
    cycle = await scalar(
        admin_db,
        "select count(*) from public.responsibility_runs where responsibility_id = %s "
        "and scheduled_for = %s",
        PLAN,
        due,
    )
    assert cycle == 1
    assert await tick(due + timedelta(minutes=2)) is not None
    assert len([r for r in await runs_of(admin_db, PLAN) if r["scheduled_for"] == due]) == 1


async def test_other_workspace_sees_nothing(api, access_token, admin_db) -> None:
    miolo = await workspace(admin_db, "miolo")
    vitta = await workspace(admin_db, "vitta")
    rafael = bearer(access_token(RAFAEL))
    assert (await api.get(f"/workspaces/{miolo}/autonomy", headers=rafael)).status_code == 404
    assert (
        await api.get(f"/workspaces/{vitta}/autonomy/responsibilities/{PLAN}", headers=rafael)
    ).status_code == 404
    assert (
        await api.post(
            f"/workspaces/{vitta}/autonomy/responsibilities/{PLAN}/pause", headers=rafael
        )
    ).status_code == 404
    runs = (await api.get(f"/workspaces/{vitta}/autonomy/runs", headers=rafael)).json()
    assert runs == {"items": [], "total": 0, "next_cursor": None}
    overview = (await api.get(f"/workspaces/{vitta}/autonomy", headers=rafael)).json()
    assert overview["switch"]["visible"] is False and overview["responsibilities"] == []
    assert [offer["id"] for offer in overview["offers"]] == ["plan", "posts", "opp", "reviews"]
