"""S1f: ações da Memória que faltavam na S1d (não usar mais, voltar a usar, confirmar da fonte ou
observado, continua valendo, adicionar conhecimento, marcar como vista), descrição do negócio e
busca sem acento. Só o owner decide; outra empresa não vê."""

from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import psycopg
import pytest
from psycopg.rows import dict_row

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


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def scalar(conn: psycopg.AsyncConnection, query: str, *params: object) -> Any:
    cursor = conn.cursor(row_factory=dict_row)
    await cursor.execute(query, params)
    row = await cursor.fetchone()
    return next(iter(row.values()))


@pytest.fixture(autouse=True)
async def seed_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    yield
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


@pytest.fixture
async def miolo(admin_db: psycopg.AsyncConnection) -> str:
    return str(await scalar(admin_db, "select id from public.workspaces where slug = 'miolo'"))


async def act(api, headers, fact_id: str, action: str):
    return await api.post(
        f"/memory/facts/{fact_id}/state", headers=headers, json={"action": action}
    )


async def test_stop_and_resume_using_keep_the_previous_state(api, access_token, miolo) -> None:
    headers = bearer(access_token(MARINA))

    stopped = await act(api, headers, SEED_TONE, "stop_using")
    again = await act(api, headers, SEED_TONE, "stop_using")
    decision = await act(api, headers, SEED_FORBIDDEN_WORD, "stop_using")
    assert (stopped.status_code, again.status_code) == (200, 200)
    assert (stopped.json()["state"], stopped.json()["unused_from"]) == ("unused", "confirmed")
    assert again.json() == stopped.json()
    assert decision.json()["unused_from"] == "decision"

    resumed = await act(api, headers, SEED_TONE, "resume_using")
    resumed_again = await act(api, headers, SEED_TONE, "resume_using")
    back_to_decision = await act(api, headers, SEED_FORBIDDEN_WORD, "resume_using")
    assert (resumed.json()["state"], resumed.json()["unused_from"]) == ("confirmed", None)
    assert resumed_again.json()["state"] == "confirmed"
    assert back_to_decision.json()["state"] == "decision"
    # Mudar o estado não cria versão.
    assert resumed.json()["version"] == 1 and resumed.json()["id"] == SEED_TONE

    history = (await api.get(f"/memory/facts/{SEED_TONE}/history", headers=headers)).json()
    assert len(history["versions"]) == 1


async def test_confirm_and_keep_follow_the_prototype_states(
    api, access_token, admin_db, miolo
) -> None:
    headers = bearer(access_token(MARINA))
    observed = await scalar(
        admin_db,
        """
        select fact_id::text from app.suggest_memory(
          %s, 'iris', 'knowledge', 'Descobertas', 'Dia com mais encomendas', 'Sábado',
          p_state => 'observed'
        )
        """,
        miolo,
    )
    from_source = await scalar(
        admin_db,
        """
        select fact_id::text from app.suggest_memory(
          %s, 'iris', 'business', 'Produtos', 'Mais vendidos', 'Levain e focaccia',
          p_state => 'from_source'
        )
        """,
        miolo,
    )

    confirmed = await act(api, headers, observed, "confirm")
    confirmed_again = await act(api, headers, observed, "confirm")
    assert (confirmed.json()["state"], confirmed_again.json()["state"]) == (
        "confirmed",
        "confirmed",
    )
    assert confirmed.json()["confirmed_at"] is not None

    not_confirmable = await act(api, headers, SEED_FORBIDDEN_WORD, "confirm")
    assert (not_confirmable.status_code, not_confirmable.json()["error"]["code"]) == (
        409,
        "invalid_state",
    )

    await admin_db.execute(
        "update public.brand_facts set state = 'outdated' where id = %s", (from_source,)
    )
    kept = await act(api, headers, from_source, "keep")
    kept_again = await act(api, headers, from_source, "keep")
    assert (kept.json()["state"], kept_again.json()["state"]) == ("from_source", "from_source")
    not_outdated = await act(api, headers, SEED_TONE, "keep")
    assert not_outdated.status_code == 409

    audit = await scalar(
        admin_db,
        "select array_agg(action order by created_at) from public.audit_events "
        "where workspace_id = %s and action in ('memory.fact_confirmed', 'memory.fact_kept')",
        miolo,
    )
    assert audit == ["memory.fact_confirmed", "memory.fact_kept"]


async def test_added_knowledge_is_declared_confirmed_and_searchable(
    api, access_token, miolo
) -> None:
    headers = bearer(access_token(MARINA))

    added = await api.post(
        f"/workspaces/{miolo}/memory/facts",
        headers=headers,
        json={"area": "business", "content": "Aos domingos a loja fecha às 13h"},
    )
    assert added.status_code == 201, added.text
    fact = added.json()
    assert (fact["state"], fact["source_type"], fact["source_id"]) == (
        "confirmed",
        "correction",
        SEED_DECLARED_SOURCE,
    )
    assert (fact["topic"], fact["key"]) == ("História", "Contado por você")
    assert fact["used_by_agents"] == ["nexo", "bia", "kaia", "otto", "kiwi", "max", "iris"]

    chosen = await api.post(
        f"/workspaces/{miolo}/memory/facts",
        headers=headers,
        json={"area": "audience", "content": "Famílias do bairro", "topic": "Necessidades"},
    )
    assert (chosen.json()["topic"], chosen.json()["area"]) == ("Necessidades", "audience")

    async def search(q: str) -> list[str]:
        found = await api.get(
            f"/workspaces/{miolo}/memory/search", headers=headers, params={"q": q}
        )
        assert found.status_code == 200, found.text
        return [
            item["fact"]["id"] if "fact" in item else item["id"] for item in found.json()["items"]
        ]

    # Sem acento acha com acento, e o contrário.
    assert fact["id"] in await search("domingos")
    assert SEED_FORBIDDEN_WORD in await search("nao usar")
    assert SEED_FORBIDDEN_WORD in await search("não usar")
    assert len(await search("fermentacao")) >= 1
    assert await search("bicicleta") == []

    empty = await api.post(
        f"/workspaces/{miolo}/memory/facts", headers=headers, json={"area": "brand", "content": " "}
    )
    assert empty.status_code == 422


async def test_suggestion_seen_and_profile(api, access_token, admin_db, miolo) -> None:
    headers = bearer(access_token(MARINA))

    seen = await api.post(f"/memory/suggestions/{SEED_SUGGESTION}/seen", headers=headers)
    seen_again = await api.post(f"/memory/suggestions/{SEED_SUGGESTION}/seen", headers=headers)
    assert (seen.json()["state"], seen_again.json()["state"]) == ("seen", "seen")
    decided = await api.post(
        f"/memory/suggestions/{SEED_SUGGESTION}/decision",
        headers=headers,
        json={"decision": "confirm"},
    )
    assert decided.json()["state"] == "done"
    after = await api.post(f"/memory/suggestions/{SEED_SUGGESTION}/seen", headers=headers)
    assert after.json()["state"] == "done"

    dossier = (await api.get(f"/workspaces/{miolo}/memory", headers=headers)).json()
    assert dossier["profile"]["description"] == (
        "Padaria de fermentação natural em Pinheiros, São Paulo."
    )
    assert dossier["profile"]["squad_summary"] is None

    updated = await api.put(
        f"/workspaces/{miolo}/memory/profile",
        headers=headers,
        json={"description": "Padaria de fermentação natural, aberta em 2019."},
    )
    assert updated.status_code == 200
    assert updated.json()["description"] == "Padaria de fermentação natural, aberta em 2019."

    await admin_db.execute(
        "select app.set_brand_summary(%s, %s, 'nexo')",
        (miolo, "Padaria de fermentação natural de Pinheiros, com pão de fermentação longa."),
    )
    dossier = (await api.get(f"/workspaces/{miolo}/memory", headers=headers)).json()
    assert dossier["profile"]["summary_agent_id"] == "nexo"
    assert dossier["profile"]["description"] == "Padaria de fermentação natural, aberta em 2019."


async def test_only_the_owner_acts_and_other_companies_never_see(
    api, access_token, admin_db
) -> None:
    vitta = str(await scalar(admin_db, "select id from public.workspaces where slug = 'vitta'"))
    rafael, carla = bearer(access_token(RAFAEL)), bearer(access_token(CARLA))
    added = await api.post(
        f"/workspaces/{vitta}/memory/facts",
        headers=rafael,
        json={"area": "business", "content": "Estúdio de pilates"},
    )
    assert added.status_code == 201
    fact = added.json()["id"]

    owner_only = "Só o dono da conta toma esta decisão."
    for response in (
        await act(api, carla, fact, "stop_using"),
        await api.post(
            f"/workspaces/{vitta}/memory/facts",
            headers=carla,
            json={"area": "brand", "content": "Tom leve"},
        ),
        await api.put(
            f"/workspaces/{vitta}/memory/profile", headers=carla, json={"description": "X"}
        ),
    ):
        assert (response.status_code, response.json()["error"]["message"]) == (403, owner_only)

    marina, pedro = bearer(access_token(MARINA)), bearer(access_token(PEDRO))
    for headers in (marina, pedro):
        assert (await act(api, headers, fact, "stop_using")).status_code == 404
        assert (
            await api.post(
                f"/workspaces/{vitta}/memory/facts",
                headers=headers,
                json={"area": "brand", "content": "Tom leve"},
            )
        ).status_code == 404
    # O Pedro não é de nenhum workspace: não vê a sugestão da Miolo.
    assert (
        await api.post(f"/memory/suggestions/{SEED_SUGGESTION}/seen", headers=pedro)
    ).status_code == 404
    assert await scalar(
        admin_db, "select state::text from public.brand_facts where id = %s", fact
    ) == ("confirmed")
