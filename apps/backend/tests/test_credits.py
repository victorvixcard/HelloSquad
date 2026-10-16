"""Integração da S1e: créditos no worker (reserva ao começar, captura ao entregar, liberação em falha
e na pergunta) e na API (saldo em GET /me, estimativa). Cada teste termina reaplicando o seed.
"""

from collections.abc import AsyncIterator
from decimal import Decimal
from pathlib import Path
from typing import Any

import psycopg
import pytest
from psycopg.rows import dict_row

from hellosquad.config import Settings
from hellosquad.llm.simulated import SimulatedLLM
from hellosquad.worker.main import Worker

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
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


async def one(conn: psycopg.AsyncConnection, query: str, *params: object) -> dict[str, Any]:
    [row] = await rows(conn, query, *params)
    return row


async def scalar(conn: psycopg.AsyncConnection, query: str, *params: object) -> Any:
    return next(iter((await one(conn, query, *params)).values()))


@pytest.fixture(autouse=True)
async def seed_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    yield
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


@pytest.fixture
async def miolo(admin_db: psycopg.AsyncConnection) -> str:
    return str(await scalar(admin_db, "select id from public.workspaces where slug = 'miolo'"))


def worker_settings(**overrides: Any) -> Settings:
    return Settings(llm_provider="simulated", worker_retry_base_seconds=0, **overrides)


async def drain(settings: Settings, llm=None) -> list[str]:
    async with Worker(settings, llm=llm or SimulatedLLM()) as worker:
        return await worker.drain()


async def request_work(api, access_token, miolo: str, body: str) -> dict[str, str]:
    headers = bearer(access_token(MARINA))
    conversation = await api.post(
        f"/workspaces/{miolo}/conversations",
        headers=headers,
        json={"kind": "agent_direct", "primary_agent_id": "otto"},
    )
    assert conversation.status_code == 201, conversation.text
    message = await api.post(
        f"/conversations/{conversation.json()['id']}/messages",
        headers=headers,
        json={"body": body},
    )
    assert message.status_code == 201, message.text
    work = await api.post(
        f"/messages/{message.json()['id']}/work-items",
        headers=headers,
        json={"delivery_type": "04.01", "title": "Legenda do sábado"},
    )
    assert work.status_code == 201, work.text
    return {"work_item_id": work.json()["id"], "run_id": work.json()["run_id"]}


async def credit_state(conn: psycopg.AsyncConnection, workspace_id: str) -> dict[str, Decimal]:
    return await one(
        conn,
        """
        select app.credit_balance(%s) as balance,
               (select coalesce(sum(remaining - reserved), 0) from public.credit_grants
                where workspace_id = %s) as available
        """,
        workspace_id,
        workspace_id,
    )


async def run_credits(conn: psycopg.AsyncConnection, run_id: str) -> dict[str, Any]:
    return await one(
        conn,
        """
        select h.state::text as state, h.estimate, h.captured, h.idempotency_key,
               r.credits_charged,
               (select count(*) from public.credit_holds x where x.run_id = r.id) as holds,
               (select array_agg(l.entry_type::text order by l.created_at, l.entry_type)
                from public.credit_ledger l where l.run_id = r.id) as entries,
               (select coalesce(sum(l.amount), 0) from public.credit_ledger l
                where l.run_id = r.id) as debited
        from public.runs r
        left join public.credit_holds h on h.run_id = r.id
        where r.id = %s
        """,
        run_id,
    )


class FlakyLLM(SimulatedLLM):
    """Falha passageira na primeira produção do Otto; depois responde como o simulado."""

    def __init__(self) -> None:
        super().__init__()
        self.failing = SimulatedLLM(fail_steps={"otto.produce": "unavailable"})
        self.failures = 0

    async def complete(self, **kwargs: Any):
        if kwargs["tag"].step == "otto.produce" and self.failures == 0:
            self.failures += 1
            return await self.failing.complete(**kwargs)
        return await super().complete(**kwargs)


# ----------------------------------------------------------------------------------------------
# Worker
# ----------------------------------------------------------------------------------------------


async def test_delivered_run_is_charged_once_even_after_a_transient_retry(
    api, access_token, admin_db, miolo
) -> None:
    assert await credit_state(admin_db, miolo) == {
        "balance": Decimal("36.00"),
        "available": Decimal("36.00"),
    }
    ids = await request_work(api, access_token, miolo, COMPLETE_REQUEST)

    assert await drain(worker_settings(), FlakyLLM()) == ["retry", "delivered"]

    run = await one(
        admin_db, "select status::text, attempts from public.runs where id = %s", ids["run_id"]
    )
    assert run == {"status": "succeeded", "attempts": 2}
    credits = await run_credits(admin_db, ids["run_id"])
    assert credits == {
        "state": "captured",
        "estimate": Decimal("10.00"),
        "captured": Decimal("10.00"),
        "idempotency_key": f"run:{ids['run_id']}",
        "credits_charged": Decimal("10.00"),
        "holds": 1,
        "entries": ["hold", "capture"],
        "debited": Decimal("-10.00"),
    }
    assert await credit_state(admin_db, miolo) == {
        "balance": Decimal("26.00"),
        "available": Decimal("26.00"),
    }


async def test_definitive_failure_releases_the_hold(api, access_token, admin_db, miolo) -> None:
    ids = await request_work(api, access_token, miolo, COMPLETE_REQUEST)
    failing = SimulatedLLM(fail_steps={"otto.produce": "unavailable"})

    assert await drain(worker_settings(worker_max_attempts=2), failing) == ["retry", "failed"]

    credits = await run_credits(admin_db, ids["run_id"])
    assert credits["state"] == "released" and credits["captured"] is None
    assert credits["holds"] == 1 and credits["entries"] == ["hold", "release"]
    assert credits["debited"] == 0 and credits["credits_charged"] == 0
    assert await credit_state(admin_db, miolo) == {
        "balance": Decimal("36.00"),
        "available": Decimal("36.00"),
    }


async def test_question_from_nexo_is_not_charged(api, access_token, admin_db, miolo) -> None:
    ids = await request_work(api, access_token, miolo, VAGUE_REQUEST)

    assert await drain(worker_settings()) == ["asked"]

    credits = await run_credits(admin_db, ids["run_id"])
    assert (credits["state"], credits["credits_charged"], credits["debited"]) == (
        "released",
        0,
        0,
    )
    assert (await credit_state(admin_db, miolo))["available"] == Decimal("36.00")


async def test_without_credits_the_run_fails_without_charging(
    api, access_token, admin_db, miolo
) -> None:
    # Consumo fictício deixa a Miolo com 6 créditos; a 04.01 custa 10 (provisório).
    await admin_db.execute(
        """
        with g as (
          select id, account_id from public.credit_grants where workspace_id = %s
        ), l as (
          insert into public.credit_ledger
            (workspace_id, account_id, entry_type, grant_id, amount, idempotency_key)
          select %s, g.account_id, 'adjustment', g.id, -30, 'pytest:sem-saldo' from g
        )
        update public.credit_grants set remaining = remaining - 30
        where id = (select id from g)
        """,
        (miolo, miolo),
    )
    ids = await request_work(api, access_token, miolo, COMPLETE_REQUEST)

    assert await drain(worker_settings()) == ["failed"]

    run = await one(
        admin_db, "select status::text, error from public.runs where id = %s", ids["run_id"]
    )
    assert run["status"] == "failed"
    assert run["error"]["code"] == "insufficient_credits"
    assert run["error"]["message"] == (
        "Não há créditos disponíveis para esta entrega. Nada foi cobrado."
    )
    assert run["error"]["details"] == {"needed": 10, "available": 6}
    assert await scalar(
        admin_db, "select status::text from public.work_items where id = %s", ids["work_item_id"]
    ) == ("failed")
    credits = await run_credits(admin_db, ids["run_id"])
    assert (credits["holds"], credits["entries"], credits["credits_charged"]) == (0, None, 0)
    assert await credit_state(admin_db, miolo) == {
        "balance": Decimal("6.00"),
        "available": Decimal("6.00"),
    }
