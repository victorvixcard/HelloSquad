"""Integração da S1d: o runtime (worker simulado) recebe a Memória da Marca e registra o contexto.

Cada teste termina reaplicando o seed.
"""

from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import psycopg
import pytest
from psycopg.rows import dict_row

from hellosquad.config import Settings
from hellosquad.llm.base import ChatMessage, Completion, SystemBlock
from hellosquad.llm.simulated import SimulatedLLM
from hellosquad.worker.main import Worker

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
SEED_TONE = "5eed0000-0000-4000-8000-000000000813"
SEED_FORBIDDEN_WORD = "5eed0000-0000-4000-8000-000000000816"
SEED_ANCHOR_PRODUCT = "5eed0000-0000-4000-8000-000000000815"
SEED_SUGGESTION = "5eed0000-0000-4000-8000-000000000821"
OBSERVATION = "Posts com bastidores do forno têm mais salvamentos"
REQUEST = (
    "Otto, preciso de uma legenda para o Instagram sobre o pão de fermentação longa de sábado. "
    "Quero levar clientes à loja de manhã."
)


class RecordingLLM(SimulatedLLM):
    """Simulado que guarda o system e as mensagens de cada etapa."""

    def __init__(self) -> None:
        super().__init__()
        self.calls: dict[str, tuple[str, str]] = {}

    async def complete(
        self, *, messages: list[ChatMessage], system: list[SystemBlock], **kwargs: Any
    ) -> Completion:
        self.calls[kwargs["tag"].step] = (
            "\n".join(block.text for block in system),
            "\n".join(m.content for m in messages),
        )
        return await super().complete(messages=messages, system=system, **kwargs)


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


@pytest.fixture
async def miolo(admin_db: psycopg.AsyncConnection) -> str:
    return str(await scalar(admin_db, "select id from public.workspaces where slug = 'miolo'"))


async def run_request(api, access_token, miolo: str, **settings: Any) -> tuple[str, RecordingLLM]:
    headers = bearer(access_token(MARINA))
    conversation = await api.post(
        f"/workspaces/{miolo}/conversations",
        headers=headers,
        json={"kind": "agent_direct", "primary_agent_id": "otto"},
    )
    message = await api.post(
        f"/conversations/{conversation.json()['id']}/messages",
        headers=headers,
        json={"body": REQUEST},
    )
    work = await api.post(
        f"/messages/{message.json()['id']}/work-items",
        headers=headers,
        json={"delivery_type": "04.01", "title": "Legenda do sábado"},
    )
    assert work.status_code == 201, work.text
    llm = RecordingLLM()
    config = Settings(llm_provider="simulated", worker_retry_base_seconds=0, **settings)
    async with Worker(config, llm=llm) as worker:
        await worker.drain()
    return work.json()["run_id"], llm


async def context_items(conn: psycopg.AsyncConnection, run_id: str) -> dict[str, str]:
    found = await rows(
        conn,
        "select fact_id::text, reason from public.run_context_items where run_id = %s",
        run_id,
    )
    return {r["fact_id"]: r["reason"] for r in found}


async def test_corrected_preference_reaches_the_next_run(
    api, access_token, admin_db, miolo
) -> None:
    new_tone = "Acolhedor, direto e com humor leve"
    corrected = await api.post(
        f"/memory/facts/{SEED_TONE}/correct",
        headers=bearer(access_token(MARINA)),
        json={"content": new_tone},
    )
    assert corrected.status_code == 200
    new_id = corrected.json()["id"]

    run_id, llm = await run_request(api, access_token, miolo)

    system, _ = llm.calls["otto.produce"]
    assert f'<fato estado="Confirmado" assunto="Tom de voz">Tom de voz: {new_tone}</fato>' in system
    assert "Acolhedor, direto, sem gíria" not in system
    assert (
        '<fato estado="Decisão sua" assunto="Tom de voz">Palavra proibida: '
        "Não usar a palavra 'artesanal' nas legendas</fato>"
    ) in system
    items = await context_items(admin_db, run_id)
    assert items[new_id] == "essential"
    assert items[SEED_FORBIDDEN_WORD] == "essential"
    assert SEED_TONE not in items
    assert await scalar(admin_db, "select status::text from public.runs where id = %s", run_id) == (
        "succeeded"
    )


async def test_search_fills_the_budget_and_skips_what_is_not_in_use(
    api, access_token, admin_db, miolo
) -> None:
    await admin_db.execute(
        """
        insert into public.brand_facts (workspace_id, area, topic, key, content, state, source_type)
        values
          (%s, 'business', 'Operação', 'Horário de sábado', 'Sábado a loja abre às 7h',
           'from_source', 'connection'),
          (%s, 'business', 'Operação', 'Fornada', 'Fornada de sábado sai às 6h', 'discarded',
           'conversation'),
          (%s, 'business', 'Operação', 'Fila', 'Sábado de manhã tem fila na loja', 'conflicting',
           'connection')
        """,
        (miolo, miolo, miolo),
    )
    run_id, llm = await run_request(api, access_token, miolo)
    _, user_turn = llm.calls["otto.produce"]
    relevant = user_turn.split("<memoria_relevante>")[1].split("</memoria_relevante>")[0]
    assert "Produto âncora: Pão de fermentação longa" in relevant
    assert '<fato estado="Da fonte" assunto="Operação">Horário de sábado' in relevant
    assert "Fornada de sábado" not in user_turn and "tem fila" not in user_turn
    items = await context_items(admin_db, run_id)
    assert items[SEED_ANCHOR_PRODUCT] == "search"
    reasons = sorted(items.values())
    assert reasons.count("essential") == 4 and reasons.count("search") >= 2

    tight_run, tight = await run_request(api, access_token, miolo, memory_context_tokens=0)
    assert "<memoria_relevante>" not in tight.calls["otto.produce"][1]
    assert sorted((await context_items(admin_db, tight_run)).values()) == ["essential"] * 4


async def test_production_observation_becomes_an_otto_suggestion(
    api, access_token, admin_db, miolo
) -> None:
    await admin_db.execute(
        "delete from public.memory_suggestions where id = %s", (SEED_SUGGESTION,)
    )

    run_id, _ = await run_request(api, access_token, miolo)

    [suggestion] = await rows(
        admin_db,
        "select agent_id::text, state::text, title, run_id::text, area::text, decision "
        "from public.memory_suggestions where workspace_id = %s",
        miolo,
    )
    assert suggestion == {
        "agent_id": "otto",
        "state": "open",
        "title": OBSERVATION,
        "run_id": run_id,
        "area": "knowledge",
        "decision": None,
    }
    assert (
        await scalar(
            admin_db, "select count(*) from public.brand_facts where content = %s", OBSERVATION
        )
        == 0
    )
    assert "memory.suggested" in [
        r["type"]
        for r in await rows(
            admin_db, "select type from public.run_events where run_id = %s", run_id
        )
    ]


async def test_discarded_suggestion_stays_out_of_context_and_does_not_return(
    api, access_token, admin_db, miolo
) -> None:
    discarded = await api.post(
        f"/memory/suggestions/{SEED_SUGGESTION}/decision",
        headers=bearer(access_token(MARINA)),
        json={"decision": "discard"},
    )
    assert discarded.status_code == 200

    run_id, llm = await run_request(api, access_token, miolo)

    assert all("bastidores do forno" not in system + user for system, user in llm.calls.values())
    assert (
        await scalar(
            admin_db,
            "select count(*) from public.memory_suggestions where workspace_id = %s",
            miolo,
        )
        == 1
    )
    assert (
        await scalar(
            admin_db, "select count(*) from public.brand_facts where content = %s", OBSERVATION
        )
        == 0
    )
    assert "memory.suggested" not in [
        r["type"]
        for r in await rows(
            admin_db, "select type from public.run_events where run_id = %s", run_id
        )
    ]
