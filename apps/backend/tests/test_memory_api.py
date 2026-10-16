"""Integração da S1d: Memória da Marca pela API, com JWT real e a RLS do banco.

Cada teste termina reaplicando o seed: o banco volta ao estado do seed mesmo se o teste falhar.
"""

from collections.abc import AsyncIterator
from pathlib import Path

import psycopg
import pytest

from hellosquad import domain

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
RAFAEL = "rafael@vitta.example"
CARLA = "carla@vitta.example"
PEDRO = "pedro@semconta.example"

SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
SEED_DECLARED_SOURCE = "5eed0000-0000-4000-8000-000000000801"
SEED_TONE = "5eed0000-0000-4000-8000-000000000813"
SEED_FORBIDDEN_WORD = "5eed0000-0000-4000-8000-000000000816"
SEED_SUGGESTION = "5eed0000-0000-4000-8000-000000000821"

SUGGEST = """
select outcome, suggestion_id, fact_id, conflict_id
from app.suggest_memory(%s, %s, %s, %s, %s, %s, p_state => %s::public.brand_fact_state)
"""


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def scalar(conn: psycopg.AsyncConnection, query: str, *params: object) -> object:
    row = await (await conn.execute(query, params)).fetchone()
    return row[0] if row else None


async def suggest(
    conn: psycopg.AsyncConnection,
    workspace: str,
    content: str,
    *,
    state: str = "suggested",
    area: str = "knowledge",
    topic: str = "Descobertas",
    key: str = "Teste",
    agent: str = "otto",
) -> tuple:
    return await (
        await conn.execute(SUGGEST, (workspace, agent, area, topic, key, content, state))
    ).fetchone()


@pytest.fixture(autouse=True)
async def seed_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    yield
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


@pytest.fixture
async def miolo(admin_db: psycopg.AsyncConnection) -> str:
    return str(await scalar(admin_db, "select id from public.workspaces where slug = 'miolo'"))


@pytest.fixture
async def vitta(admin_db: psycopg.AsyncConnection) -> str:
    return str(await scalar(admin_db, "select id from public.workspaces where slug = 'vitta'"))


async def test_memory_enums_match_the_database(admin_db) -> None:
    enums = {
        "memory_area": domain.MemoryArea,
        "brand_fact_state": domain.BrandFactState,
        "fact_source_kind": domain.FactSourceKind,
        "fact_source_state": domain.FactSourceState,
        "memory_suggestion_state": domain.MemorySuggestionState,
        "memory_suggestion_decision": domain.MemorySuggestionDecision,
        "memory_conflict_state": domain.MemoryConflictState,
        "memory_conflict_resolution": domain.MemoryConflictResolution,
        "run_context_kind": domain.RunContextKind,
        "reflection_outcome": domain.ReflectionOutcome,
        "reflection_status": domain.ReflectionStatus,
        "agent_learning_status": domain.AgentLearningStatus,
    }
    for name, enum in enums.items():
        values = await scalar(admin_db, f"select enum_range(null::public.{name})::text[]")
        assert values == [member.value for member in enum], name


async def test_dossier_groups_by_area_and_topic(api, access_token, miolo) -> None:
    response = await api.get(f"/workspaces/{miolo}/memory", headers=bearer(access_token(MARINA)))
    assert response.status_code == 200
    dossier = response.json()

    assert dossier["brand_name"] == "Miolo"
    assert dossier["confirmed_count"] == 6
    assert dossier["pending"] == {"suggestions": 1, "conflicts": 0, "outdated": 0}
    layout = [
        (area["area"], topic["topic"], [fact["key"] for fact in topic["facts"]])
        for area in dossier["areas"]
        for topic in area["topics"]
    ]
    assert layout == [
        ("business", "História", ["Negócio"]),
        ("business", "Produtos", ["Produto âncora"]),
        ("brand", "Tom de voz", ["Tom de voz", "Palavra proibida"]),
        ("audience", "Perfil dos clientes", ["Público principal"]),
        ("audience", "Comportamentos conhecidos", ["Canais"]),
    ]
    forbidden = dossier["areas"][1]["topics"][0]["facts"][1]
    assert (forbidden["state"], forbidden["content"], forbidden["version"]) == (
        "decision",
        "Não usar a palavra 'artesanal' nas legendas",
        1,
    )
    assert [
        (s["name"], s["state"], s["fact_count"], s["permissions"]) for s in dossier["sources"]
    ] == [
        ("Onboarding e o que você contou", "declared", 5, []),
        (
            "Instagram",
            "not_connected",
            0,
            ["Ler posts e métricas", "Publicar só com sua autorização"],
        ),
    ]
    [suggestion] = dossier["suggestions"]
    assert (suggestion["agent_id"], suggestion["state"], suggestion["title"]) == (
        "otto",
        "open",
        "Posts com bastidores do forno têm mais salvamentos",
    )


async def test_text_search_finds_the_forbidden_word(api, access_token, miolo) -> None:
    headers = bearer(access_token(MARINA))
    for query in ("palavra proibida", "tom", "artesanal", "palavras proibidas"):
        response = await api.get(
            f"/workspaces/{miolo}/memory/search", headers=headers, params={"q": query}
        )
        assert response.status_code == 200, query
        assert SEED_FORBIDDEN_WORD in [hit["id"] for hit in response.json()["items"]], query

    nothing = await api.get(
        f"/workspaces/{miolo}/memory/search", headers=headers, params={"q": "bicicleta"}
    )
    assert nothing.json() == {"query": "bicicleta", "items": []}


async def test_confirming_is_idempotent_and_creates_one_fact(api, access_token, admin_db) -> None:
    headers = bearer(access_token(MARINA))
    url = f"/memory/suggestions/{SEED_SUGGESTION}/decision"

    first = await api.post(url, headers=headers, json={"decision": "confirm"})
    assert first.status_code == 200
    body = first.json()
    assert (body["state"], body["decision"]) == ("done", "confirm")
    fact = body["resulting_fact"]
    assert (fact["state"], fact["content"], fact["perceived_by_agent_id"], fact["area"]) == (
        "confirmed",
        "Posts com bastidores do forno têm mais salvamentos",
        "otto",
        "knowledge",
    )
    assert fact["used_by_agents"] == ["otto", "kaia"]

    again = await api.post(url, headers=headers, json={"decision": "confirm"})
    late_discard = await api.post(url, headers=headers, json={"decision": "discard"})
    for response in (again, late_discard):
        assert response.status_code == 200
        assert (response.json()["decision"], response.json()["resulting_fact_id"]) == (
            "confirm",
            fact["id"],
        )
    assert (
        await scalar(
            admin_db,
            "select count(*) from public.brand_facts where content = %s",
            fact["content"],
        )
        == 1
    )
    assert (
        await scalar(
            admin_db,
            "select count(*) from public.audit_events where entity_id = %s "
            "and action = 'memory.suggestion_decided'",
            SEED_SUGGESTION,
        )
        == 1
    )


async def test_discarded_suggestion_never_becomes_a_fact_nor_returns(
    api, access_token, admin_db, miolo
) -> None:
    headers = bearer(access_token(MARINA))
    discarded = await api.post(
        f"/memory/suggestions/{SEED_SUGGESTION}/decision",
        headers=headers,
        json={"decision": "discard"},
    )
    assert discarded.status_code == 200
    assert (discarded.json()["decision"], discarded.json()["resulting_fact"]) == ("discard", None)

    content = "Posts com bastidores do forno têm mais salvamentos"
    assert (
        await scalar(
            admin_db, "select count(*) from public.brand_facts where content = %s", content
        )
        == 0
    )
    repeated = "  POSTS com  bastidores do forno têm mais salvamentos "
    outcome, suggestion_id, fact_id, _ = await suggest(admin_db, miolo, repeated)
    assert (outcome, str(suggestion_id), fact_id) == ("discarded_before", SEED_SUGGESTION, None)
    open_items = await api.get(
        f"/workspaces/{miolo}/memory/suggestions", headers=headers, params={"state": "open"}
    )
    assert open_items.json() == {"items": []}


async def test_only_the_owner_decides_on_memory(api, access_token, admin_db, vitta) -> None:
    _, suggestion_id, _, _ = await suggest(admin_db, vitta, "Clientes preferem horários à noite")
    url = f"/memory/suggestions/{suggestion_id}/decision"

    refused = await api.post(url, headers=bearer(access_token(CARLA)), json={"decision": "confirm"})
    assert refused.status_code == 403
    assert refused.json()["error"] == {
        "code": "forbidden",
        "message": "Só o dono da conta toma esta decisão.",
        "details": [],
    }
    assert await scalar(
        admin_db, "select state::text from public.memory_suggestions where id = %s", suggestion_id
    ) == ("open")

    carla_reads = await api.get(
        f"/workspaces/{vitta}/memory/suggestions", headers=bearer(access_token(CARLA))
    )
    assert [item["id"] for item in carla_reads.json()["items"]] == [str(suggestion_id)]

    corrected = await api.post(
        url,
        headers=bearer(access_token(RAFAEL)),
        json={"decision": "correct", "content": "Clientes preferem atendimento depois das 18h"},
    )
    assert corrected.status_code == 200
    assert corrected.json()["resulting_fact"]["content"] == (
        "Clientes preferem atendimento depois das 18h"
    )
    assert corrected.json()["resulting_fact"]["source_type"] == "correction"


async def test_correcting_a_fact_creates_a_version_and_keeps_history(
    api, access_token, admin_db
) -> None:
    headers = bearer(access_token(MARINA))
    new_text = "Acolhedor, direto e com humor leve"

    corrected = await api.post(
        f"/memory/facts/{SEED_TONE}/correct", headers=headers, json={"content": new_text}
    )
    assert corrected.status_code == 200
    version = corrected.json()
    assert (version["version"], version["supersedes_id"], version["state"]) == (
        2,
        SEED_TONE,
        "confirmed",
    )
    assert (version["content"], version["source_type"], version["superseded_at"]) == (
        new_text,
        "correction",
        None,
    )
    assert version["source_id"] == SEED_DECLARED_SOURCE

    repeated = await api.post(
        f"/memory/facts/{SEED_TONE}/correct", headers=headers, json={"content": new_text}
    )
    assert (repeated.status_code, repeated.json()["id"]) == (200, version["id"])
    stale = await api.post(
        f"/memory/facts/{SEED_TONE}/correct", headers=headers, json={"content": "Outro tom"}
    )
    assert (stale.status_code, stale.json()["error"]["code"]) == (409, "invalid_state")

    history = await api.get(f"/memory/facts/{SEED_TONE}/history", headers=headers)
    assert history.status_code == 200
    versions = history.json()["versions"]
    assert [(v["version"], v["content"]) for v in versions] == [
        (2, new_text),
        (1, "Acolhedor, direto, sem gíria"),
    ]
    assert versions[1]["superseded_at"] is not None

    with pytest.raises(psycopg.errors.ObjectNotInPrerequisiteState):
        await admin_db.execute(
            "update public.brand_facts set content = 'editado' where id = %s", (version["id"],)
        )


async def test_memory_is_isolated_by_workspace(api, access_token, miolo, vitta) -> None:
    for email, workspace in ((PEDRO, miolo), (MARINA, vitta)):
        headers = bearer(access_token(email))
        for path in ("memory", "memory/suggestions", "memory/sources", "memory/conflicts"):
            response = await api.get(f"/workspaces/{workspace}/{path}", headers=headers)
            assert response.status_code == 404, (email, path)
    outsider = await api.get(
        f"/memory/facts/{SEED_TONE}/history", headers=bearer(access_token(RAFAEL))
    )
    assert outsider.status_code == 404
    decided = await api.post(
        f"/memory/suggestions/{SEED_SUGGESTION}/decision",
        headers=bearer(access_token(RAFAEL)),
        json={"decision": "confirm"},
    )
    assert (decided.status_code, decided.json()["error"]["code"]) == (404, "not_found")

    empty = await api.get(f"/workspaces/{vitta}/memory", headers=bearer(access_token(RAFAEL)))
    assert empty.json()["areas"] == [] and empty.json()["sources"] == []


async def test_conflict_stops_both_versions_until_the_owner_decides(
    api, access_token, admin_db, miolo
) -> None:
    outcome, _, fact_id, conflict_id = await suggest(
        admin_db,
        miolo,
        "Pão de fermentação longa e focaccia",
        state="from_source",
        area="business",
        topic="Produtos",
        key="Produto âncora",
        agent="iris",
    )
    assert outcome == "conflict"
    headers = bearer(access_token(MARINA))

    listed = await api.get(
        f"/workspaces/{miolo}/memory/conflicts", headers=headers, params={"state": "open"}
    )
    [conflict] = listed.json()["items"]
    assert conflict["id"] == str(conflict_id)
    assert {conflict["fact_a"]["state"], conflict["fact_b"]["state"]} == {"conflicting"}

    url = f"/memory/conflicts/{conflict_id}/resolve"
    assert (
        await api.post(
            url, headers=bearer(access_token(CARLA)), json={"keep_fact_id": str(fact_id)}
        )
    ).status_code == 404
    resolved = await api.post(url, headers=headers, json={"keep_fact_id": str(fact_id)})
    assert resolved.status_code == 200
    body = resolved.json()
    assert (body["state"], body["resolution"], body["resulting_fact_id"]) == (
        "resolved",
        "keep_b",
        str(fact_id),
    )
    assert (body["fact_a"]["state"], body["fact_b"]["state"]) == ("discarded", "confirmed")
    again = await api.post(url, headers=headers, json={"content": "Outra coisa"})
    assert (again.status_code, again.json()["resolution"]) == (200, "keep_b")


async def test_decision_payload_errors(api, access_token) -> None:
    headers = bearer(access_token(MARINA))
    url = f"/memory/suggestions/{SEED_SUGGESTION}/decision"
    missing = await api.post(url, headers=headers, json={"decision": "correct"})
    assert missing.status_code == 422
    assert (
        missing.json()["error"]["details"][0]["message"] == "Ao corrigir, escreva como deve ficar."
    )
    stray = await api.post(url, headers=headers, json={"decision": "confirm", "content": "x"})
    assert stray.status_code == 422
    unknown = await api.post(url, headers=headers, json={"decision": "accept"})
    assert unknown.status_code == 422
