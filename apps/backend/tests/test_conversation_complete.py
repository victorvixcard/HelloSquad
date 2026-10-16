"""S1f: conversa em grupo com um especialista por vez, contexto dos tipos do protótipo, não lidas
por pessoa, cartão ligado ao objeto e status por etapa, contra o Supabase local e o worker
simulado."""

from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any
from uuid import UUID

import psycopg
import pytest
from psycopg.rows import dict_row

from hellosquad.config import Settings
from hellosquad.llm.simulated import SimulatedLLM
from hellosquad.squad.store import RunStore
from hellosquad.worker.main import Worker

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
RAFAEL = "rafael@vitta.example"
CARLA = "carla@vitta.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
SEED_TONE = "5eed0000-0000-4000-8000-000000000813"
SEED_SUGGESTION = "5eed0000-0000-4000-8000-000000000821"
COMPLETE_REQUEST = (
    "Otto, preciso de uma legenda para o Instagram sobre o pão de fermentação longa de sábado. "
    "Quero levar clientes à loja de manhã."
)
VAGUE_REQUEST = "Preciso de um texto para divulgar a padaria."


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


async def open_group(api, headers, workspace_id: str, agents: list[str]):
    return await api.post(
        f"/workspaces/{workspace_id}/conversations",
        headers=headers,
        json={"kind": "group", "agent_ids": agents},
    )


async def say(api, headers, conversation_id: str, body: str) -> str:
    response = await api.post(
        f"/conversations/{conversation_id}/messages", headers=headers, json={"body": body}
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def test_group_is_one_per_set_with_two_to_six_specialists(
    api, access_token, admin_db
) -> None:
    miolo = await workspace(admin_db, "miolo")
    headers = bearer(access_token(MARINA))

    opened = await open_group(api, headers, miolo, ["otto", "bia", "kaia"])
    again = await open_group(api, headers, miolo, ["kaia", "otto", "bia"])
    with_nexo = await open_group(api, headers, miolo, ["iris", "nexo"])
    single = await open_group(api, headers, miolo, ["otto"])
    repeated = await open_group(api, headers, miolo, ["otto", "otto"])
    seven = await open_group(
        api, headers, miolo, ["nexo", "bia", "kaia", "otto", "kiwi", "max", "iris"]
    )
    outsider = await api.post(
        f"/workspaces/{miolo}/conversations",
        headers=headers,
        json={"kind": "group", "agent_ids": ["bia", "kaia"], "primary_agent_id": "otto"},
    )

    assert (opened.status_code, again.status_code) == (201, 200)
    assert again.json()["id"] == opened.json()["id"]
    group = opened.json()
    assert (group["kind"], group["primary_agent_id"]) == ("group", "bia")
    assert group["agent_ids"] == ["bia", "kaia", "otto"]
    assert [p["agent_id"] for p in group["participants"] if p["participant_type"] == "agent"] == [
        "bia",
        "kaia",
        "otto",
    ]
    assert with_nexo.json()["primary_agent_id"] == "nexo"
    assert (single.status_code, seven.status_code) == (422, 422)
    assert repeated.status_code == 422
    assert repeated.json()["error"]["message"] == (
        "Conversa em grupo precisa de 2 a 6 especialistas diferentes."
    )
    assert outsider.status_code == 422
    assert outsider.json()["error"]["message"] == "Quem está à frente precisa estar no grupo."


async def test_one_specialist_answers_each_message_in_the_group(
    api, access_token, admin_db
) -> None:
    miolo = await workspace(admin_db, "miolo")
    headers = bearer(access_token(MARINA))
    group = (await open_group(api, headers, miolo, ["otto", "bia", "kaia"])).json()["id"]

    market = await say(api, headers, group, "Quero entender o mercado e a concorrência do bairro.")
    mention = await say(api, headers, group, "@Kaia, o que você acha da legenda de sábado?")
    nothing = await say(api, headers, group, "Bom dia, pessoal.")
    replies = [await api.post(f"/messages/{m}/reply", headers=headers) for m in (market, mention)]
    repeated = await api.post(f"/messages/{market}/reply", headers=headers)
    plain = await api.post(f"/messages/{nothing}/reply", headers=headers)

    assert [r.status_code for r in replies] == [201, 201]
    assert [r.json()["agent_id"] for r in replies] == ["bia", "kaia"]
    assert (repeated.status_code, repeated.json()["run_id"]) == (200, replies[0].json()["run_id"])
    # Sem palavra de ninguém e sem o Nexo no grupo: o primeiro na ordem do squad.
    assert plain.json()["agent_id"] == "bia"

    # Um especialista por vez: na mesma conversa, uma resposta por rodada; as outras esperam a vez.
    rounds = []
    for _ in range(3):
        rounds.append(sorted(await drain()))
        await admin_db.execute(
            "select pgmq.set_vt('runs_interactive', msg_id, 0) from pgmq.q_runs_interactive"
        )
    assert rounds == [["replied", "waiting", "waiting"], ["replied", "waiting"], ["replied"]]
    answers = await rows(
        admin_db,
        """
        select m.author_agent_id::text as agent, r.message_id::text as asked
        from public.messages m join public.runs r on r.id = m.run_id
        where m.conversation_id = %s and m.author_type = 'agent'
        order by m.created_at, m.id
        """,
        group,
    )
    # Uma resposta por mensagem, de um especialista só.
    assert sorted((a["asked"], a["agent"]) for a in answers) == sorted(
        [(market, "bia"), (mention, "kaia"), (nothing, "bia")]
    )

    run_id = replies[0].json()["run_id"]
    run = (await rows(admin_db, "select * from public.runs where id = %s", run_id))[0]
    assert (run["status"], run["work_item_id"], run["prompt_version"] is not None) == (
        "succeeded",
        None,
        True,
    )
    events = await rows(
        admin_db,
        "select type, payload from public.run_events where run_id = %s order by seq",
        run_id,
    )
    assert [e["type"] for e in events] == [
        "started",
        "agent.thinking",
        "conversation.typing",
        "step.done",
        "message.created",
        "finished",
    ]
    typing = events[2]["payload"]
    assert typing["conversation_id"] == group and typing["agent_id"] == "bia"
    assert (typing["status_label"], typing["status_short"], typing["status_mode"]) == (
        "Bia · escrevendo",
        "pesquisando",
        "work",
    )
    # Resposta não é entrega: nenhuma reserva de crédito.
    assert (
        await scalar(admin_db, "select count(*) from public.credit_holds where run_id = %s", run_id)
        == 0
    )

    message = await api.post(
        f"/conversations/{group}/messages", headers=headers, json={"body": COMPLETE_REQUEST}
    )
    work = await api.post(
        f"/messages/{message.json()['id']}/work-items",
        headers=headers,
        json={"delivery_type": "04.01", "title": "Legenda do sábado"},
    )
    assert work.status_code == 201
    late = await api.post(f"/messages/{message.json()['id']}/reply", headers=headers)
    assert (late.status_code, late.json()["error"]["code"]) == (409, "invalid_state")


async def test_a_second_reply_waits_while_someone_is_speaking(api, access_token, admin_db) -> None:
    miolo = await workspace(admin_db, "miolo")
    headers = bearer(access_token(MARINA))
    group = (await open_group(api, headers, miolo, ["otto", "bia"])).json()["id"]
    first = await api.post(
        f"/messages/{await say(api, headers, group, 'Uma legenda?')}/reply", headers=headers
    )
    second = await api.post(
        f"/messages/{await say(api, headers, group, 'E o mercado?')}/reply", headers=headers
    )
    settings = Settings(llm_provider="simulated")
    async with Worker(settings, llm=SimulatedLLM()) as worker:
        store = RunStore(worker.pool, workspace_id=UUID(miolo), run_id=UUID(first.json()["run_id"]))
        other = RunStore(
            worker.pool, workspace_id=UUID(miolo), run_id=UUID(second.json()["run_id"])
        )
        claimed = await store.begin(workspace_cap=3, lease_seconds=120, max_attempts=3)
        waiting = await other.begin(workspace_cap=3, lease_seconds=120, max_attempts=3)
    assert (claimed.outcome, waiting.outcome) == ("claimed", "waiting")


async def test_unread_is_per_person_and_isolated(api, access_token, admin_db) -> None:
    vitta = await workspace(admin_db, "vitta")
    rafael, carla = bearer(access_token(RAFAEL)), bearer(access_token(CARLA))
    group = (await open_group(api, rafael, vitta, ["max", "iris"])).json()["id"]
    asked = await say(api, rafael, group, "Quero ver os resultados das encomendas.")
    assert (await api.post(f"/messages/{asked}/reply", headers=rafael)).json()["agent_id"] == "iris"
    assert await drain() == ["replied"]

    def unread_of(listing, conversation_id: str) -> int:
        [item] = [c for c in listing.json()["items"] if c["id"] == conversation_id]
        return item["unread_count"]

    rafael_list = await api.get(f"/workspaces/{vitta}/conversations", headers=rafael)
    carla_list = await api.get(f"/workspaces/{vitta}/conversations", headers=carla)
    # A mensagem do próprio Rafael não conta para ele; para a Carla, contam as duas.
    assert (unread_of(rafael_list, group), unread_of(carla_list, group)) == (1, 2)

    read = await api.post(f"/conversations/{group}/read", headers=rafael)
    assert (read.status_code, read.json()["unread_count"]) == (200, 0)
    rafael_list = await api.get(f"/workspaces/{vitta}/conversations", headers=rafael)
    carla_list = await api.get(f"/workspaces/{vitta}/conversations", headers=carla)
    assert (unread_of(rafael_list, group), unread_of(carla_list, group)) == (0, 2)

    # Ler para trás não desfaz a leitura.
    back = await api.post(
        f"/conversations/{group}/read", headers=rafael, json={"read_at": "2020-01-01T00:00:00Z"}
    )
    assert back.json()["unread_count"] == 0

    summary = (await api.get(f"/workspaces/{vitta}/conversations/unread", headers=carla)).json()
    assert (summary["conversations"], summary["messages"]) == (1, 2)
    assert summary["by_agent"] == [{"conversations": 1, "messages": 2, "agent_id": "max"}]
    assert summary["squad_room"] == {"conversations": 0, "messages": 0}
    empty = (await api.get(f"/workspaces/{vitta}/conversations/unread", headers=rafael)).json()
    assert (empty["conversations"], empty["by_agent"]) == (0, [])

    # Outra empresa nunca vê: Marina não lê, não marca e não conta a conversa da Vitta.
    marina = bearer(access_token(MARINA))
    assert (await api.post(f"/conversations/{group}/read", headers=marina)).status_code == 404
    assert (await api.post(f"/messages/{asked}/reply", headers=marina)).status_code == 404
    assert (
        await api.get(f"/workspaces/{vitta}/conversations/unread", headers=marina)
    ).status_code == 404
    reads = await rows(
        admin_db,
        "select u.email from public.conversation_reads r join auth.users u on u.id = r.user_id "
        "where r.conversation_id = %s",
        group,
    )
    assert [r["email"] for r in reads] == [RAFAEL]


async def test_object_context_for_the_prototype_types(api, access_token, admin_db) -> None:
    miolo = await workspace(admin_db, "miolo")
    vitta = await workspace(admin_db, "vitta")
    headers = bearer(access_token(MARINA))

    async def open_object(context: dict[str, Any], agent: str | None = None):
        body: dict[str, Any] = {"kind": "object", "context": context}
        if agent:
            body["primary_agent_id"] = agent
        return await api.post(f"/workspaces/{miolo}/conversations", headers=headers, json=body)

    metric = {
        "type": "metric",
        "key": "alcance:semana",
        "title": "Alcance da semana",
        "period": "Semana 42",
        "origin": "Resultados · semana",
    }
    opened, again = await open_object(metric, "iris"), await open_object(metric, "iris")
    assert (opened.status_code, again.status_code) == (201, 200)
    assert again.json()["id"] == opened.json()["id"]
    assert opened.json()["primary_agent_id"] == "iris"
    assert opened.json()["context"] == {
        "type": "metric",
        "id": None,
        "key": "alcance:semana",
        "title": "Alcance da semana",
        "status": None,
        "summary": None,
        "period": "Semana 42",
        "origin": "Resultados · semana",
    }

    fact = await open_object({"type": "memory_fact", "id": SEED_TONE, "title": "ignorado"})
    assert fact.status_code == 201
    assert fact.json()["context"]["status"] == "confirmed"
    assert fact.json()["context"]["title"].startswith("Tom de voz")

    insight = await open_object({"type": "insight", "id": SEED_SUGGESTION, "origin": "Início"})
    assert insight.json()["primary_agent_id"] == "otto"
    assert insight.json()["context"]["status"] == "open"
    assert insight.json()["context"]["origin"] == "Início"

    capability = {"type": "capability", "key": "04.01", "title": "Textos e legendas"}
    first, second = await open_object(capability), await open_object(capability)
    assert (first.status_code, second.status_code) == (201, 201)
    assert first.json()["id"] != second.json()["id"]
    assert first.json()["primary_agent_id"] == "otto"

    unknown_capability = await open_object({"type": "capability", "key": "99.01", "title": "X"})
    no_title = await open_object({"type": "calendar_post", "key": "post-2026-10-16"})
    by_id = await open_object({"type": "metric", "id": SEED_TONE, "title": "X"})
    vitta_fact = await rows(
        admin_db, "select id::text from public.brand_facts where workspace_id = %s limit 1", vitta
    )
    assert unknown_capability.json()["error"]["message"] == "Capacidade fora do catálogo."
    assert no_title.json()["error"]["message"] == "Informe o título do objeto da conversa."
    assert by_id.status_code == 422
    if vitta_fact:
        other = await open_object({"type": "memory_fact", "id": vitta_fact[0]["id"]})
        assert other.status_code == 404
    other_insight = await open_object(
        {"type": "insight", "id": "5eed0000-0000-4000-8000-0000000009ff"}
    )
    assert other_insight.status_code == 404


async def test_agent_cards_are_linked_to_their_objects(api, access_token, admin_db) -> None:
    miolo = await workspace(admin_db, "miolo")
    headers = bearer(access_token(MARINA))

    async def request(body: str) -> tuple[str, dict[str, Any]]:
        conversation = (
            await api.post(
                f"/workspaces/{miolo}/conversations",
                headers=headers,
                json={"kind": "agent_direct", "primary_agent_id": "otto"},
            )
        ).json()["id"]
        message = await say(api, headers, conversation, body)
        work = await api.post(
            f"/messages/{message}/work-items",
            headers=headers,
            json={"delivery_type": "04.01", "title": body[:40]},
        )
        return conversation, work.json()

    conversation, delivered = await request(COMPLETE_REQUEST)
    vague_conversation, asked = await request(VAGUE_REQUEST)
    assert sorted(await drain()) == ["asked", "delivered"]

    page = (
        await api.get(f"/conversations/{conversation}/messages?before=latest", headers=headers)
    ).json()
    vague_page = (
        await api.get(
            f"/conversations/{vague_conversation}/messages?before=latest", headers=headers
        )
    ).json()
    cards = {m["card"]["type"]: m for m in page["items"] + vague_page["items"] if m["card"]}
    assert sorted(cards) == ["material", "question"]
    material, question = cards["material"]["card"], cards["question"]["card"]

    version = await rows(
        admin_db,
        """
        select v.id::text as version_id, v.version_no, a.id::text as approval_id
        from public.delivery_versions v
        join public.deliveries d on d.id = v.delivery_id
        join public.approvals a on a.delivery_version_id = v.id
        where d.work_item_id = %s
        """,
        delivered["id"],
    )
    assert (material["delivery_version_id"], material["approval_id"], material["version_no"]) == (
        version[0]["version_id"],
        version[0]["approval_id"],
        1,
    )
    assert material["work_item_id"] == delivered["id"]
    assert material["actions"] == [
        {"id": "approve", "decision": "approved"},
        {"id": "request_changes", "decision": "changes_requested"},
    ]
    assert (material["approval_status"], material["version_status"]) == ("pending", "draft")
    assert material["work_item_status"] == "needs_you"
    assert cards["material"]["author_agent_id"] == "otto"

    respond = await scalar(
        admin_db,
        "select id::text from public.approvals where work_item_id = %s and kind = 'respond'",
        asked["id"],
    )
    assert (question["approval_id"], question["work_item_id"]) == (respond, asked["id"])
    assert question["actions"] == [{"id": "answer", "decision": "answered"}]
    assert cards["question"]["author_agent_id"] == "nexo"

    # A decisão continua pela pendência; o cartão mostra o estado novo.
    decided = await api.post(
        f"/approvals/{material['approval_id']}/decision",
        headers=headers,
        json={"decision": "approved"},
    )
    assert decided.status_code == 200
    page = (
        await api.get(f"/conversations/{conversation}/messages?before=latest", headers=headers)
    ).json()
    [material] = [m["card"] for m in page["items"] if m["card"] and m["card"]["type"] == "material"]
    assert (material["approval_status"], material["decision"], material["version_status"]) == (
        "decided",
        "approved",
        "approved",
    )

    # Status por etapa no run da entrega.
    events = await rows(
        admin_db,
        "select type, payload from public.run_events where run_id = %s order by seq",
        delivered["run_id"],
    )
    labels = [e["payload"].get("status_label") for e in events if e["type"] == "agent.thinking"]
    assert labels == [
        "Nexo · organizando seu pedido",
        "Otto · criando a primeira versão",
        "Otto · criando a primeira versão",
    ]
    [review] = [e["payload"] for e in events if e["type"] == "approval.requested"]
    assert (review["status_label"], review["status_short"]) == (
        "Otto · aguarda sua aprovação",
        "aguarda você",
    )
    otto_typing = [
        e["payload"]["status_short"]
        for e in events
        if e["type"] == "conversation.typing" and e["payload"]["agent_id"] == "otto"
    ]
    assert otto_typing == ["escrevendo", "escrevendo"]


async def test_room_topic_is_written_by_the_agent(api, access_token, admin_db) -> None:
    miolo = await workspace(admin_db, "miolo")
    headers = bearer(access_token(MARINA))
    room = (
        await api.post(
            f"/workspaces/{miolo}/conversations", headers=headers, json={"kind": "squad_room"}
        )
    ).json()
    assert room["topic"] is None
    await admin_db.execute(
        "select app.set_conversation_topic(%s, %s, %s)", (miolo, room["id"], "Campanha de Natal")
    )
    detail = (await api.get(f"/conversations/{room['id']}", headers=headers)).json()
    assert detail["topic"] == "Campanha de Natal"
