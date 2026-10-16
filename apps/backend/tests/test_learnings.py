"""S2c — Memória camada 3: reflexão do trabalho fechado e aprendizados por cliente.

Critério da Fase 2 (PLANO_DE_ACAO_FASE2.md): uma correção da Marina aparece aplicada na entrega
seguinte do Otto. Tudo no modo simulado (fixtures da 04.01 com o pão de abóbora).
"""

from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import psycopg
import pytest
from psycopg.rows import dict_row

from hellosquad.config import Settings
from hellosquad.llm.simulated import SimulatedLLM
from hellosquad.squad.reflect import Evidence, version_diff
from hellosquad.worker.main import Worker

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
RAFAEL = "rafael@vitta.example"
CARLA = "carla@vitta.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
FIRST_REQUEST = (
    "Otto, preciso de uma legenda para o Instagram anunciando o pão de abóbora. "
    "Quero vender mais na loja."
)
SECOND_REQUEST = (
    "Otto, outra legenda para o Instagram: o pão de abóbora volta na sexta. Quero vender na loja."
)
CORRECTION = "Nunca use 'promoção imperdível'; chame o cliente de 'você'."


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


def settings() -> Settings:
    return Settings(llm_provider="simulated", worker_retry_base_seconds=0)


async def drain() -> list[str]:
    async with Worker(settings(), llm=SimulatedLLM()) as worker:
        return await worker.drain()


async def reflect() -> list[str]:
    async with Worker(settings(), llm=SimulatedLLM()) as worker:
        return await worker.drain_reflections()


async def request_work(api, access_token, user: str, workspace_id: str, body: str) -> str:
    headers = bearer(access_token(user))
    conversation = await api.post(
        f"/workspaces/{workspace_id}/conversations",
        headers=headers,
        json={"kind": "agent_direct", "primary_agent_id": "otto"},
    )
    assert conversation.status_code == 201, conversation.text
    message = await api.post(
        f"/conversations/{conversation.json()['id']}/messages", headers=headers, json={"body": body}
    )
    assert message.status_code == 201, message.text
    work = await api.post(
        f"/messages/{message.json()['id']}/work-items",
        headers=headers,
        json={"delivery_type": "04.01", "title": "Legenda do pão de abóbora"},
    )
    assert work.status_code == 201, work.text
    return work.json()["id"]


async def pending(admin_db, work_item_id: str) -> str:
    return str(
        await scalar(
            admin_db,
            "select id from public.approvals where work_item_id = %s and status = 'pending'",
            work_item_id,
        )
    )


async def decide(api, token: str, approval_id: str, body: dict[str, Any]) -> None:
    response = await api.post(
        f"/approvals/{approval_id}/decision", headers=bearer(token), json=body
    )
    assert response.status_code == 200, response.text


async def latest_text(admin_db, work_item_id: str) -> str:
    content = await scalar(
        admin_db,
        """
        select v.content from public.delivery_versions v
        join public.deliveries d on d.id = v.delivery_id
        where d.work_item_id = %s
        order by v.version_no desc
        limit 1
        """,
        work_item_id,
    )
    return content["versoes"][0]["texto"]


async def latest_run(admin_db, work_item_id: str) -> str:
    return str(
        await scalar(
            admin_db,
            """
            select id from public.runs where work_item_id = %s and kind = 'interactive'
            order by created_at desc, id desc limit 1
            """,
            work_item_id,
        )
    )


async def produce_prompt(admin_db, run_id: str) -> dict[str, Any]:
    [step] = await rows(
        admin_db,
        """
        select payload from public.run_steps
        where run_id = %s and payload->>'step' = 'otto.produce' and status = 'succeeded'
        order by seq desc limit 1
        """,
        run_id,
    )
    return step["payload"]


async def marina_corrects_and_approves(api, access_token, admin_db, miolo: str) -> str:
    work_item_id = await request_work(api, access_token, MARINA, miolo, FIRST_REQUEST)
    assert await drain() == ["delivered"]
    v1 = await latest_text(admin_db, work_item_id)
    assert "Promoção imperdível" in v1 and "vocês" in v1.lower()

    token = access_token(MARINA)
    await decide(
        api,
        token,
        await pending(admin_db, work_item_id),
        {"decision": "changes_requested", "note": CORRECTION},
    )
    # Pedir ajuste não fecha o trabalho: nada entra na fila de reflexão.
    assert await reflect() == []
    assert await drain() == ["delivered"]
    v2 = await latest_text(admin_db, work_item_id)
    assert "imperdível" not in v2.lower() and "Você" in v2

    await decide(api, token, await pending(admin_db, work_item_id), {"decision": "approved"})
    return work_item_id


async def test_marina_correction_is_applied_in_the_next_otto_delivery(
    api, access_token, admin_db
) -> None:
    miolo = await workspace(admin_db, "miolo")
    first = await marina_corrects_and_approves(api, access_token, admin_db, miolo)

    # Fechamento → fila memory_reflect com o trabalho, o desfecho e as referências.
    [job] = await rows(
        admin_db,
        """
        select r.outcome::text, r.status::text, r.refs, r.agent_id::text, r.delivery_type
        from public.memory_reflections r where r.work_item_id = %s
        """,
        first,
    )
    assert job["outcome"] == "approved_with_edits" and job["status"] == "queued"
    assert (job["agent_id"], job["delivery_type"]) == ("otto", "04.01")
    refs = job["refs"]
    assert refs["work_item"]["briefing"]["canal"] == "instagram"
    assert [v["version_no"] for v in refs["versions"]] == [1, 2]
    assert [c["note"] for c in refs["corrections"]] == [CORRECTION]
    assert refs["decision"]["decision"] == "approved"
    [message] = await rows(
        admin_db,
        "select message from pgmq.q_memory_reflect where message->>'work_item_id' = %s",
        first,
    )
    assert message["message"]["outcome"] == "approved_with_edits"
    assert message["message"]["refs"]["corrections"][0]["note"] == CORRECTION

    assert await reflect() == ["reflected"]
    [done] = await rows(
        admin_db,
        "select status::text, learnings_count, diff, model from public.memory_reflections"
        " where work_item_id = %s",
        first,
    )
    assert done["status"] == "succeeded" and done["learnings_count"] == 3
    diff = "\n".join(done["diff"][0]["lines"])
    assert "-versoes[0].texto: Promoção imperdível" in diff
    assert done["model"] == "claude-opus-5-5"

    learned = {
        r["topic"]: r
        for r in await rows(
            admin_db,
            """
            select topic, learning, status::text, promotion_rule, evidence_refs, confidence
            from public.agent_learnings
            where work_item_id = %s and superseded_at is null
            """,
            first,
        )
    }
    assert set(learned) == {"Vocabulário", "Tratamento", "Abertura"}
    assert learned["Vocabulário"]["status"] == "promoted"
    assert learned["Vocabulário"]["promotion_rule"] == "explicit_correction"
    assert learned["Tratamento"]["status"] == "promoted"
    # Observação de confiança baixa fica candidata; o rótulo inventado (X9) sai da evidência.
    assert learned["Abertura"]["status"] == "candidate"
    assert {e["type"] for e in learned["Abertura"]["evidence_refs"]} == {"version"}
    # Aprendizado só com evidência inventada não é gravado.
    assert await scalar(
        admin_db, "select count(*) from public.agent_learnings where topic = 'Emojis'"
    ) == (0)
    correction_ref = next(
        e for e in learned["Vocabulário"]["evidence_refs"] if e["type"] == "correction"
    )
    assert correction_ref["note"] == CORRECTION and correction_ref["work_item_id"] == first

    # Próximo pedido de 04.01 da Miolo: o aprendizado promovido entra no contexto e é respeitado.
    second = await request_work(api, access_token, MARINA, miolo, SECOND_REQUEST)
    assert await drain() == ["delivered"]
    run_id = await latest_run(admin_db, second)
    items = await rows(
        admin_db,
        """
        select l.topic, i.reason, i.tokens
        from public.run_context_items i
        join public.agent_learnings l on l.id = i.learning_id
        where i.run_id = %s and i.kind = 'learning'
        order by l.topic
        """,
        run_id,
    )
    assert [(i["topic"], i["reason"]) for i in items] == [
        ("Tratamento", "delivery"),
        ("Vocabulário", "delivery"),
    ]
    assert all(i["tokens"] > 0 for i in items)
    step = await produce_prompt(admin_db, run_id)
    assert step["simulated"]["case"] == "abobora_com_aprendizado"
    v1_next = await latest_text(admin_db, second)
    assert "imperdível" not in v1_next.lower()
    assert "vocês" not in v1_next.lower() and "Você" in v1_next

    # Aprovada sem ajuste: a mesma observação num segundo trabalho é promovida por repetição.
    await decide(
        api, access_token(MARINA), await pending(admin_db, second), {"decision": "approved"}
    )
    assert await reflect() == ["reflected"]
    [opening] = await rows(
        admin_db,
        """
        select status::text, promotion_rule, version, supersedes_id is not null as replaces,
               (select count(distinct e->>'work_item_id')
                from jsonb_array_elements(evidence_refs) e) as work_items
        from public.agent_learnings
        where topic = 'Abertura' and superseded_at is null
        """,
    )
    assert opening == {
        "status": "promoted",
        "promotion_rule": "repeated",
        "version": 2,
        "replaces": True,
        "work_items": 2,
    }

    # Isolamento: a Vitta pede a mesma delivery e não recebe nada da Miolo.
    vitta = await workspace(admin_db, "vitta")
    vitta_work = await request_work(api, access_token, RAFAEL, vitta, FIRST_REQUEST)
    assert await drain() == ["delivered"]
    vitta_run = await latest_run(admin_db, vitta_work)
    assert await scalar(
        admin_db,
        "select count(*) from public.run_context_items where run_id = %s and kind = 'learning'",
        vitta_run,
    ) == (0)
    assert (await produce_prompt(admin_db, vitta_run))["simulated"]["case"] == (
        "abobora_primeira_versao"
    )
    assert "Promoção imperdível" in await latest_text(admin_db, vitta_work)
    listed = await api.get(
        f"/workspaces/{vitta}/memory/learnings", headers=bearer(access_token(RAFAEL))
    )
    assert listed.status_code == 200 and listed.json()["items"] == []
    other = await api.get(
        f"/workspaces/{miolo}/memory/learnings", headers=bearer(access_token(RAFAEL))
    )
    assert other.status_code == 404


async def test_owner_promotes_discards_and_keeps_learnings(api, access_token, admin_db) -> None:
    miolo = await workspace(admin_db, "miolo")
    await marina_corrects_and_approves(api, access_token, admin_db, miolo)
    assert await reflect() == ["reflected"]
    headers = bearer(access_token(MARINA))

    listed = await api.get(
        f"/workspaces/{miolo}/memory/learnings",
        headers=headers,
        params={"status": "candidate", "agent_id": "otto", "delivery_type": "04.01"},
    )
    assert listed.status_code == 200, listed.text
    [candidate] = listed.json()["items"]
    assert candidate["topic"] == "Abertura" and candidate["stale"] is False

    # "Continua valendo" só vale para promovido.
    refused = await api.post(
        f"/memory/learnings/{candidate['id']}/decision", headers=headers, json={"action": "keep"}
    )
    assert refused.status_code == 409

    promoted = await api.post(
        f"/memory/learnings/{candidate['id']}/decision", headers=headers, json={"action": "promote"}
    )
    assert promoted.status_code == 200, promoted.text
    assert promoted.json()["status"] == "promoted"
    assert promoted.json()["promotion_rule"] == "owner"
    again = await api.post(
        f"/memory/learnings/{candidate['id']}/decision", headers=headers, json={"action": "promote"}
    )
    assert again.json()["decided_at"] == promoted.json()["decided_at"]

    kept = await api.post(
        f"/memory/learnings/{candidate['id']}/decision", headers=headers, json={"action": "keep"}
    )
    assert kept.status_code == 200 and kept.json()["reviewed_at"] is not None

    vocabulary = next(
        item
        for item in (
            await api.get(f"/workspaces/{miolo}/memory/learnings", headers=headers)
        ).json()["items"]
        if item["topic"] == "Vocabulário"
    )
    discarded = await api.post(
        f"/memory/learnings/{vocabulary['id']}/decision",
        headers=headers,
        json={"action": "discard"},
    )
    assert discarded.status_code == 200 and discarded.json()["status"] == "discarded"
    assert await scalar(
        admin_db,
        "select count(*) from public.audit_events where entity_id = any(%s) and action in"
        " ('memory.learning_promoted', 'memory.learning_kept', 'memory.learning_discarded')",
        [candidate["id"], vocabulary["id"]],
    ) == (3)

    # Descartado sai do contexto do próximo run.
    second = await request_work(api, access_token, MARINA, miolo, SECOND_REQUEST)
    assert await drain() == ["delivered"]
    topics = [
        r["topic"]
        for r in await rows(
            admin_db,
            """
            select l.topic from public.run_context_items i
            join public.agent_learnings l on l.id = i.learning_id
            where i.run_id = %s order by l.topic
            """,
            await latest_run(admin_db, second),
        )
    ]
    assert topics == ["Abertura", "Tratamento"]

    # Só o owner decide; quem não é do workspace não acha.
    carla = await api.post(
        f"/memory/learnings/{candidate['id']}/decision",
        headers=bearer(access_token(CARLA)),
        json={"action": "discard"},
    )
    assert carla.status_code == 404
    bad = await api.post(
        f"/memory/learnings/{candidate['id']}/decision", headers=headers, json={"action": "edit"}
    )
    assert bad.status_code == 422


async def test_rejection_and_cancellation_feed_the_reflection_queue(
    api, access_token, admin_db
) -> None:
    miolo = await workspace(admin_db, "miolo")
    token = access_token(MARINA)
    revise = await request_work(api, access_token, MARINA, miolo, FIRST_REQUEST)
    assert await drain() == ["delivered"]
    await decide(
        api,
        token,
        await pending(admin_db, revise),
        {"decision": "rejected", "follow_up": "revise", "note": "Quero outra abordagem."},
    )
    cancel = await request_work(api, access_token, MARINA, miolo, FIRST_REQUEST)
    assert await drain() == ["delivered", "delivered"]
    await decide(
        api,
        token,
        await pending(admin_db, cancel),
        {"decision": "rejected", "follow_up": "cancel"},
    )
    outcomes = {
        str(r["work_item_id"]): r["outcome"]
        for r in await rows(
            admin_db, "select work_item_id, outcome::text from public.memory_reflections"
        )
    }
    assert outcomes == {revise: "rejected_revise", cancel: "rejected_cancel"}
    # Recusar e cancelar: uma reflexão só (o cancelamento do trabalho não enfileira de novo) e
    # nenhum run novo do agente.
    assert await scalar(admin_db, "select count(*) from pgmq.q_memory_reflect") == (2)
    assert await scalar(
        admin_db, "select count(*) from public.runs where work_item_id = %s", cancel
    ) == (1)
    assert sorted(await reflect()) == ["reflected", "reflected"]
    assert await scalar(
        admin_db,
        "select count(*) from public.memory_reflections where status = 'succeeded'",
    ) == (2)

    # Cancelado por outro caminho (sem recusa): também alimenta a fila, uma vez.
    dropped = await request_work(api, access_token, MARINA, miolo, FIRST_REQUEST)
    await admin_db.execute(
        "select app.transition_work_item(%s, 'cancelled', 'system', 'teste')", (dropped,)
    )
    [cancelled] = await rows(
        admin_db,
        "select outcome::text, idempotency_key from public.memory_reflections"
        " where work_item_id = %s",
        dropped,
    )
    assert cancelled == {"outcome": "cancelled", "idempotency_key": f"cancel:{dropped}"}


def test_diff_and_evidence_labels() -> None:
    before = {"versoes": [{"texto": "Promoção imperdível: pão.\nVocês vão adorar."}]}
    after = {"versoes": [{"texto": "Pão de abóbora.\nVocês vão adorar."}]}
    assert version_diff(before, after) == [
        "-versoes[0].texto: Promoção imperdível: pão.",
        "+versoes[0].texto: Pão de abóbora.",
    ]
    evidence = Evidence()
    evidence.add("C1", {"type": "correction"}, note="Nunca use isso.")
    evidence.add("C2", {"type": "correction"}, note="")
    evidence.add("V1", {"type": "version"})
    assert evidence.resolve(["c1", "X9", "V1", "C1"]) == [
        {"type": "correction"},
        {"type": "version"},
    ]
    assert evidence.explicit(["C1"]) and not evidence.explicit(["C2", "V1"])
