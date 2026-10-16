"""S1g: trabalho rico (frase viva, próximo passo, origem, histórico legível), "Agora não",
projeto com datas, marcos e equipe, "Precisa de você" com "Em seguida" e o status vivo do
squad, contra o Supabase local e o worker simulado."""

from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import psycopg
import pytest
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from hellosquad.config import Settings
from hellosquad.llm.simulated import SimulatedLLM
from hellosquad.squad.store import RunStore
from hellosquad.worker.main import Worker

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
RAFAEL = "rafael@vitta.example"
CARLA = "carla@vitta.example"
PEDRO = "pedro@semconta.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
SEED_WORK = "5eed0000-0000-4000-8000-000000000301"
SEED_REVIEW = "5eed0000-0000-4000-8000-000000000601"
SEED_SUGGESTION = "5eed0000-0000-4000-8000-000000000821"


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


async def drain() -> list[str]:
    settings = Settings(llm_provider="simulated", worker_retry_base_seconds=0)
    async with Worker(settings, llm=SimulatedLLM()) as worker:
        return await worker.drain()


async def authorization(
    admin_db: psycopg.AsyncConnection, workspace_id: str, *, version_no: int = 2
) -> tuple[str, str]:
    """Post aprovado (vN) com a autorização de publicação do Otto pendente (jornada 1, passo 7)."""
    work = await scalar(
        admin_db,
        """
        insert into public.work_items (workspace_id, title, delivery_type, status, primary_agent_id)
        values (%s, 'Post do Dia Mundial do Pão', '04.01', 'approved', 'kaia') returning id
        """,
        workspace_id,
    )
    delivery = await scalar(
        admin_db,
        "insert into public.deliveries (workspace_id, work_item_id, kind) "
        "values (%s, %s, 'caption') returning id",
        workspace_id,
        work,
    )
    version = await scalar(
        admin_db,
        """
        insert into public.delivery_versions (
          workspace_id, delivery_id, version_no, content, created_by_type, created_by_agent_id,
          status
        ) values (%s, %s, %s, '{}', 'agent', 'kaia', 'approved') returning id
        """,
        workspace_id,
        delivery,
        version_no,
    )
    approval = await scalar(
        admin_db,
        """
        insert into public.approvals (
          workspace_id, work_item_id, delivery_version_id, kind, requested_by_agent_id, due_at
        ) values (%s, %s, %s, 'authorize', 'otto', '2026-10-16 09:00-03') returning id
        """,
        workspace_id,
        work,
        version,
    )
    return str(work), str(approval)


async def money(admin_db: psycopg.AsyncConnection) -> tuple[int, int, int]:
    [row] = await rows(
        admin_db,
        """
        select (select count(*) from public.credit_ledger) as ledger,
               (select count(*) from public.credit_holds) as holds,
               (select count(*) from public.runs) as runs
        """,
    )
    return row["ledger"], row["holds"], row["runs"]


async def test_work_item_has_live_phrase_next_step_origin_and_history(
    api, access_token, admin_db, monkeypatch
) -> None:
    headers = bearer(access_token(MARINA))
    miolo = await workspace(admin_db, "miolo")

    detail = (await api.get(f"/work-items/{SEED_WORK}", headers=headers)).json()
    listed = (await api.get(f"/workspaces/{miolo}/work-items", headers=headers)).json()["items"]

    assert (detail["status_label"], detail["next_step"]) == (
        "v1 aguarda sua aprovação",
        "Aprovar a v1",
    )
    assert detail["origin"] == {
        "type": "message",
        "ref": "5eed0000-0000-4000-8000-000000000202",
        "conversation_id": "5eed0000-0000-4000-8000-000000000102",
        "conversation_kind": "agent_direct",
        "agent_id": "otto",
        "title": None,
    }
    assert detail["awaiting_you"] is True
    assert detail["pending_approval"]["kind"] == "review"
    assert [(h["text"], h["mark_label"]) for h in detail["history"]] == [
        ("Você pediu na conversa com o Otto", None),
        ("v1 entregue", "automático"),
    ]
    assert listed[0]["status_label"] == "v1 aguarda sua aprovação"
    assert listed[0]["origin"]["type"] == "message"

    # Pedido de ajuste: o Otto volta a trabalhar e escreve a frase viva no trabalho.
    seen: dict[str, Any] = {}
    original = RunStore.deliver

    async def spy(self: RunStore, **kwargs: Any) -> dict[str, Any]:
        async with self.pool.connection() as conn:
            cursor = conn.cursor(row_factory=dict_row)
            await cursor.execute(
                "select status_label, next_step from public.work_items where id = %s",
                (kwargs["work_item"].id,),
            )
            seen.update(await cursor.fetchone())
        return await original(self, **kwargs)

    monkeypatch.setattr(RunStore, "deliver", spy)
    decided = await api.post(
        f"/approvals/{SEED_REVIEW}/decision",
        headers=headers,
        json={"decision": "changes_requested", "note": "Deixa o horário mais visível."},
    )
    assert decided.status_code == 200
    adjusting = (await api.get(f"/work-items/{SEED_WORK}", headers=headers)).json()
    assert (adjusting["status"], adjusting["awaiting_you"]) == ("in_progress", False)
    assert await drain() == ["delivered"]

    assert seen == {"status_label": "Otto ajustando a versão", "next_step": "Otto entrega a v2"}
    after = (await api.get(f"/work-items/{SEED_WORK}", headers=headers)).json()
    assert (after["status"], after["status_label"], after["next_step"]) == (
        "needs_you",
        "v2 aguarda sua aprovação",
        "Aprovar a v2",
    )
    assert [h["text"] for h in after["history"]] == [
        "Você pediu na conversa com o Otto",
        "v1 entregue",
        "Você pediu: “Deixa o horário mais visível.”",
        "v2 entregue",
    ]
    v2 = after["pending_approval"]["id"]
    approved = await api.post(
        f"/approvals/{v2}/decision", headers=headers, json={"decision": "approved"}
    )
    assert approved.status_code == 200
    final = (await api.get(f"/work-items/{SEED_WORK}", headers=headers)).json()
    assert (final["status_label"], final["next_step"]) == ("v2 aprovada", None)
    assert (final["history"][-1]["text"], final["history"][-1]["mark_label"]) == (
        "Você aprovou a v2",
        "aprovado por você",
    )


async def test_agora_nao_defers_without_rejecting_or_charging(api, access_token, admin_db) -> None:
    headers = bearer(access_token(MARINA))
    miolo = await workspace(admin_db, "miolo")
    vitta = await workspace(admin_db, "vitta")
    work, approval = await authorization(admin_db, miolo)
    _, vitta_approval = await authorization(admin_db, vitta)
    before = await money(admin_db)

    asking = (await api.get(f"/work-items/{work}", headers=headers)).json()
    needs = (await api.get(f"/workspaces/{miolo}/needs", headers=headers)).json()
    assert (asking["status_label"], asking["next_step"], asking["awaiting_you"]) == (
        "Aprovado. Falta decidir a publicação.",
        "Autorizar ou não a publicação",
        True,
    )
    assert (needs["count"], needs["deferred_count"]) == (2, 0)

    outsider = await api.post(
        f"/approvals/{approval}/defer", headers=bearer(access_token(CARLA)), json={}
    )
    editor = await api.post(
        f"/approvals/{vitta_approval}/defer", headers=bearer(access_token(CARLA)), json={}
    )
    review = await api.post(f"/approvals/{SEED_REVIEW}/defer", headers=headers, json={})
    deferred = await api.post(f"/approvals/{approval}/defer", headers=headers, json={})
    again = await api.post(f"/approvals/{approval}/defer", headers=headers, json={})

    assert (outsider.status_code, editor.status_code) == (404, 403)
    assert editor.json()["error"]["message"] == "Só o dono da conta toma esta decisão."
    assert (review.status_code, review.json()["error"]["message"]) == (
        422,
        "“Agora não” vale só para autorizações.",
    )
    body = deferred.json()
    assert deferred.status_code == 200
    assert (body["status"], body["decision"], body["deferred"], body["deferred_until"]) == (
        "pending",
        None,
        True,
        None,
    )
    assert again.json()["deferred_at"] == body["deferred_at"]
    assert await money(admin_db) == before, "adiar não cobra, não libera e não cria run"

    later = (await api.get(f"/work-items/{work}", headers=headers)).json()
    needs = (await api.get(f"/workspaces/{miolo}/needs", headers=headers)).json()
    pending = (
        await api.get(
            f"/workspaces/{miolo}/approvals", headers=headers, params={"status": "pending"}
        )
    ).json()["items"]
    everything = (
        await api.get(
            f"/workspaces/{miolo}/approvals",
            headers=headers,
            params={"status": "pending", "include_deferred": "true"},
        )
    ).json()["items"]
    assert (later["status"], later["status_label"], later["next_step"]) == (
        "approved",
        "v2 aprovada · publicação não autorizada",
        "Publicação quando você quiser",
    )
    assert (later["awaiting_you"], later["pending_approval"]["deferred"]) == (False, True)
    assert (needs["count"], needs["deferred_count"]) == (1, 1)
    assert [i["approval"]["id"] for i in needs["items"]] == [SEED_REVIEW]
    assert [a["id"] for a in pending] == [SEED_REVIEW]
    assert {a["id"] for a in everything} == {SEED_REVIEW, approval}

    resumed = await api.post(f"/approvals/{approval}/resume", headers=headers)
    assert (resumed.status_code, resumed.json()["deferred"]) == (200, False)
    assert (await api.get(f"/workspaces/{miolo}/needs", headers=headers)).json()["count"] == 2

    authorized = await api.post(
        f"/approvals/{approval}/decision", headers=headers, json={"decision": "approved"}
    )
    assert authorized.status_code == 200
    history = (await api.get(f"/work-items/{work}", headers=headers)).json()["history"]
    assert (history[-1]["text"], history[-1]["mark_label"]) == (
        "Publicação autorizada para sex, 16/10, 9h",
        "aprovado por você",
    )
    assert (
        await api.post(f"/approvals/{approval}/defer", headers=headers, json={})
    ).status_code == 409
    assert await money(admin_db) == before


async def test_decide_takes_the_choice_and_returns_to_the_agent(
    api, access_token, admin_db
) -> None:
    headers = bearer(access_token(MARINA))
    miolo = await workspace(admin_db, "miolo")
    work = await scalar(
        admin_db,
        "insert into public.work_items (workspace_id, title, delivery_type, status, "
        "primary_agent_id) values (%s, 'Verba dos anúncios de Natal', '05.01', 'needs_you', "
        "'kiwi') returning id",
        miolo,
    )
    decide = await scalar(
        admin_db,
        "insert into public.approvals (workspace_id, work_item_id, kind, requested_by_agent_id) "
        "values (%s, %s, 'decide', 'kiwi') returning id",
        miolo,
        work,
    )

    before = (await api.get(f"/work-items/{work}", headers=headers)).json()
    wrong = await api.post(
        f"/approvals/{decide}/decision", headers=headers, json={"decision": "approved"}
    )
    chosen = await api.post(
        f"/approvals/{decide}/decision",
        headers=headers,
        json={"decision": "answered", "note": "Até R$ 40 por dia"},
    )
    after = (await api.get(f"/work-items/{work}", headers=headers)).json()

    assert (before["status_label"], before["next_step"]) == ("Uma decisão aguarda você", "Decidir")
    assert wrong.status_code == 422
    assert (chosen.status_code, chosen.json()["kind"]) == (200, "decide")
    assert after["status"] == "in_progress"
    assert after["history"][-1]["text"] == "Você decidiu: “Até R$ 40 por dia”"
    assert (
        await scalar(
            admin_db,
            "select count(*) from public.runs where idempotency_key = %s",
            f"approval:{decide}",
        )
        == 1
    )


async def test_projects_with_dates_team_milestones_and_next(api, access_token, admin_db) -> None:
    headers = bearer(access_token(MARINA))
    miolo = await workspace(admin_db, "miolo")
    vitta = await workspace(admin_db, "vitta")
    pedro = await scalar(admin_db, "select id from auth.users where email = %s", PEDRO)
    await admin_db.execute(
        "insert into public.memberships (workspace_id, user_id, role) values (%s, %s, 'viewer')",
        (vitta, pedro),
    )

    created = await api.post(
        f"/workspaces/{miolo}/projects",
        headers=headers,
        json={
            "name": "Campanha de Natal",
            "objective": "Vender mais panetones pelo site e na loja.",
            "starts_at": "2026-10-05T09:00:00-03:00",
            "ends_at": "2026-12-20T18:00:00-03:00",
            "participants": [
                {"agent_id": "bia", "responsibility": "estratégia e conceito"},
                {"agent_id": "kaia", "responsibility": "peças da campanha"},
            ],
        },
    )
    assert created.status_code == 201, created.text
    project = created.json()
    assert [p["agent_id"] for p in project["participants"]] == ["nexo", "bia", "kaia"]
    assert project["ends_at"] == "2026-12-20T21:00:00Z"

    patched = await api.patch(
        f"/projects/{project['id']}", headers=headers, json={"ends_at": None, "status": "active"}
    )
    cleared = await api.patch(f"/projects/{project['id']}", headers=headers, json={"name": None})
    team = await api.put(
        f"/projects/{project['id']}/participants",
        headers=headers,
        json={"participants": [{"agent_id": "kiwi", "responsibility": "anúncios"}]},
    )
    milestone = await api.post(
        f"/projects/{project['id']}/milestones",
        headers=headers,
        json={
            "title": "Revisão das peças",
            "summary": "você aprova cada uma",
            "agent_id": "kaia",
            "due_at": "2099-01-01T09:00:00-03:00",
            "needs_you": True,
        },
    )
    assert (patched.status_code, patched.json()["ends_at"]) == (200, None)
    assert cleared.status_code == 422
    assert [p["agent_id"] for p in team.json()["participants"]] == ["nexo", "kiwi"]
    assert milestone.status_code == 201
    mark = milestone.json()

    # Marco seu dentro da janela de 10 dias aparece em "Em seguida", fora da contagem.
    await admin_db.execute(
        "update public.project_milestones set due_at = now() + interval '3 days' where id = %s",
        (mark["id"],),
    )
    needs = (await api.get(f"/workspaces/{miolo}/needs", headers=headers)).json()
    upcoming = (await api.get(f"/workspaces/{miolo}/milestones", headers=headers)).json()["items"]
    nexts = [i for i in needs["items"] if i["type"] == "next"]
    assert needs["count"] == 1
    assert [(i["milestone"]["title"], i["project"]["name"], i["agent_id"]) for i in nexts] == [
        ("Revisão das peças", "Campanha de Natal", "kaia")
    ]
    assert [m["id"] for m in upcoming] == [mark["id"]]
    done = await api.patch(f"/milestones/{mark['id']}", headers=headers, json={"done": True})
    assert done.json()["done"] is True
    assert not [
        i
        for i in (await api.get(f"/workspaces/{miolo}/needs", headers=headers)).json()["items"]
        if i["type"] == "next"
    ]

    # Pedido na conversa do projeto: o trabalho entra no projeto, com o marco e a equipe.
    chat = await api.post(
        f"/workspaces/{miolo}/conversations",
        headers=headers,
        json={
            "kind": "object",
            "primary_agent_id": "nexo",
            "context": {"type": "project", "id": project["id"]},
        },
    )
    assert chat.status_code == 201, chat.text
    message = await api.post(
        f"/conversations/{chat.json()['id']}/messages",
        headers=headers,
        json={"body": "Otto, escreve a legenda de abertura da campanha."},
    )
    work = await api.post(
        f"/messages/{message.json()['id']}/work-items",
        headers=headers,
        json={"delivery_type": "04.01", "title": "Legenda de abertura da campanha"},
    )
    assert work.status_code == 201, work.text
    item = work.json()
    detail = (await api.get(f"/projects/{project['id']}", headers=headers)).json()
    assert (item["project_id"], item["origin"]["type"], item["origin"]["title"]) == (
        project["id"],
        "project",
        "Campanha de Natal",
    )
    assert (await api.get(f"/work-items/{item['id']}", headers=headers)).json()["history"][0][
        "text"
    ] == "Você pediu no projeto Campanha de Natal"
    assert detail["work_item_count"] == 1
    assert "otto" in [p["agent_id"] for p in detail["participants"]]
    assert [m["work_item_id"] for m in detail["milestones"] if m["work_item_id"]] == [item["id"]]

    # Papéis e isolamento.
    rafael = bearer(access_token(RAFAEL))
    carla = bearer(access_token(CARLA))
    viewer = bearer(access_token(PEDRO))
    assert (await api.get(f"/projects/{project['id']}", headers=rafael)).status_code == 404
    assert (
        await api.post(f"/workspaces/{miolo}/projects", headers=carla, json={"name": "Alheio"})
    ).status_code == 404
    assert (
        await api.post(f"/workspaces/{vitta}/projects", headers=carla, json={"name": "Plano anual"})
    ).status_code == 201
    refused = await api.post(f"/workspaces/{vitta}/projects", headers=viewer, json={"name": "Lido"})
    assert (refused.status_code, refused.json()["error"]["message"]) == (
        403,
        "Seu papel não permite criar projetos.",
    )
    assert (await api.get(f"/workspaces/{miolo}/needs", headers=rafael)).status_code == 404


async def test_squad_status_is_derived_from_runs_and_pending(api, access_token, admin_db) -> None:
    headers = bearer(access_token(MARINA))
    miolo = await workspace(admin_db, "miolo")
    vitta = await workspace(admin_db, "vitta")

    def modes(body: dict) -> dict[str, tuple[str, str, str | None]]:
        return {
            a["agent_id"]: (a["mode"], a["status_short"], a["status_label"]) for a in body["agents"]
        }

    initial = modes((await api.get(f"/workspaces/{miolo}/squad/status", headers=headers)).json())
    assert initial["otto"] == ("wait", "aguarda você", "Otto · aguarda sua aprovação")
    assert initial["nexo"] == ("live", "coordenando", "Nexo · coordenando")
    assert initial["kaia"] == ("idle", "disponível", None)

    work = await scalar(
        admin_db,
        "insert into public.work_items (workspace_id, title, delivery_type, status, "
        "primary_agent_id) values (%s, 'Post do Dia Mundial do Pão', '03.01', 'in_progress', "
        "'kaia') returning id",
        miolo,
    )
    run = await scalar(
        admin_db,
        "insert into public.runs (workspace_id, work_item_id, agent_id, kind, status, started_at, "
        "idempotency_key) values (%s, %s, 'kaia', 'interactive', 'running', now(), 's1g:kaia') "
        "returning id",
        miolo,
        work,
    )
    for seq, agent, label in (
        (1, "nexo", "Nexo · organizando seu pedido"),
        (2, "kaia", "Kaia · criando a primeira versão"),
    ):
        await admin_db.execute(
            "insert into public.run_events (workspace_id, run_id, seq, type, payload) "
            "values (%s, %s, %s, 'agent.thinking', %s)",
            (miolo, run, seq, Jsonb({"agent_id": agent, "status_label": label})),
        )
    await admin_db.execute(
        "insert into public.work_items (workspace_id, title, status, primary_agent_id) "
        "values (%s, 'Reativação de clientes inativos', 'paused', 'max')",
        (miolo,),
    )
    _, deferred = await authorization(admin_db, miolo)
    await admin_db.execute(
        "update public.approvals set deferred_at = now() where id = %s", (deferred,)
    )

    raw = (await api.get(f"/workspaces/{miolo}/squad/status", headers=headers)).json()
    busy = modes(raw)
    otto = next(a for a in raw["agents"] if a["agent_id"] == "otto")
    other = modes(
        (
            await api.get(f"/workspaces/{vitta}/squad/status", headers=bearer(access_token(RAFAEL)))
        ).json()
    )

    assert busy["kaia"] == ("work", "criando", "Kaia · criando a primeira versão")
    assert busy["max"] == ("sleep", "pausado", "Max · pausado")
    assert (otto["mode"], otto["approval_id"]) == ("wait", SEED_REVIEW), "a adiada não conta"
    assert busy["nexo"][0] == "live"
    assert set(other.values()) == {("idle", "disponível", None)}
    assert (await api.get(f"/workspaces/{vitta}/squad/status", headers=headers)).status_code == 404
