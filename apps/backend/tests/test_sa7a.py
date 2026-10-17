"""SA7a (H-SA-02): o `GET /me` diz quem é Super Admin e o seed sobrevive ao que o Vic faz pelo
produto e pelo painel (negócio criado por ele, saldo informado na tela Saúde)."""

from collections.abc import AsyncIterator
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import UUID

import psycopg
import pytest
from psycopg.rows import dict_row

SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
VIC = "vic@hellosquad.example"
MARINA = "marina@miolo.example"
PEDRO = "pedro@semconta.example"
SLUGS = ("negocio-do-vic-sa7a", "negocio-dividido-sa7a")


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
    for table, column in (("audit_events", "workspace_id"), ("workspaces", "id")):
        await admin_db.execute(
            f"delete from public.{table} where {column} in"
            " (select id from public.workspaces where slug = any(%s))",
            (list(SLUGS),),
        )
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


async def test_me_tells_who_is_platform_admin(api, access_token) -> None:
    vic = (await api.get("/me", headers=bearer(access_token(VIC)))).json()
    assert vic["is_platform_admin"] is True
    assert vic["memberships"] == []
    for email in (MARINA, PEDRO):
        me = (await api.get("/me", headers=bearer(access_token(email)))).json()
        assert me["is_platform_admin"] is False, email


async def test_seed_survives_a_business_the_super_admin_created_and_a_reported_balance(
    api, access_token, admin_db
) -> None:
    vic = bearer(access_token(VIC))
    created = await api.post(
        "/workspaces", headers=vic, json={"name": "Negócio do Vic", "slug": SLUGS[0]}
    )
    assert created.status_code == 201, created.text
    alone = UUID(created.json()["id"])
    shared = await api.post(
        "/workspaces", headers=vic, json={"name": "Negócio dividido", "slug": SLUGS[1]}
    )
    assert shared.status_code == 201, shared.text
    shared_id = UUID(shared.json()["id"])
    await admin_db.execute(
        "insert into public.memberships (workspace_id, user_id, role)"
        " select %s, id, 'owner' from auth.users where email = %s",
        (shared_id, MARINA),
    )
    balance = await api.patch(
        "/admin/providers/anthropic/balance",
        headers=vic,
        json={
            "amount": "38.00",
            "currency": "USD",
            "read_at": (datetime.now().astimezone() - timedelta(hours=1)).isoformat(),
            "reason": "Saldo lido no console da Anthropic (teste SA7a)",
        },
    )
    assert balance.status_code == 200, balance.text

    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))

    assert (
        await scalar(admin_db, "select count(*) from public.workspaces where id = %s", alone) == 0
    )
    assert (
        await scalar(
            admin_db, "select count(*) from public.audit_events where workspace_id = %s", alone
        )
        == 0
    )
    vic_memberships = (
        "select count(*) from public.memberships m join auth.users u on u.id = m.user_id"
        " where u.email = %s"
    )
    assert await scalar(admin_db, vic_memberships, VIC) == 0
    owners = await scalar(
        admin_db,
        "select array_agg(u.email) from public.memberships m join auth.users u on u.id = m.user_id"
        " where m.workspace_id = %s and m.role = 'owner'",
        shared_id,
    )
    assert owners == [MARINA]
    assert await scalar(admin_db, "select count(*) from public.provider_balance_reports") == 0
    assert (
        await scalar(
            admin_db,
            "select count(*) from public.provider_health"
            " where reported_balance is not null or alert_below is not null",
        )
        == 0
    )
    me = (await api.get("/me", headers=vic)).json()
    assert me["memberships"] == []
    assert me["is_platform_admin"] is True


async def test_support_session_is_refused_on_a_suspended_account(
    api, access_token, admin_db
) -> None:
    vic = bearer(access_token(VIC))
    miolo = await scalar(admin_db, "select id from public.workspaces where slug = 'miolo'")
    reason = {"reason": "Conferência pedida pela titular (SA7a)"}
    suspended = await api.post(f"/admin/accounts/{miolo}/suspend", headers=vic, json=reason)
    assert suspended.status_code == 200, suspended.text
    refused = await api.post(
        f"/admin/accounts/{miolo}/support-session",
        headers=vic,
        json={**reason, "duration_minutes": 15},
    )
    assert refused.status_code == 423, refused.text
    assert refused.json()["error"]["code"] == "workspace_suspended"
    sessions = (
        "select count(*) from public.support_access_log"
        " where workspace_id = %s and ended_at is null and expires_at > now()"
    )
    assert await scalar(admin_db, sessions, miolo) == 0
    reactivated = await api.post(f"/admin/accounts/{miolo}/reactivate", headers=vic, json=reason)
    assert reactivated.status_code == 200, reactivated.text
