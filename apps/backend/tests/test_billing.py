"""Integração da S2e: cobrança atrás de PaymentProvider. Webhook idempotente (repetido não repete
efeito), assinatura inválida recusada, Pix pendente → confirmado, ciclo da assinatura com validade,
estorno e contestação pelo extrato, renovação no scheduler (só com pagamento confirmado; sem ele,
past_due sem bloquear leitura) e leitura só do owner, sem dinheiro. Cada teste reaplica o seed no
fim.
"""

import asyncio
import json
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID

import httpx
import psycopg
import pytest
from billing_fakes import (
    APPROVED_CARD,
    ASAAS_KEY,
    ASAAS_WEBHOOK_TOKEN,
    MP_TOKEN,
    MP_WEBHOOK_SECRET,
    FakeAsaas,
    FakeMercadoPago,
    fake_app,
)
from psycopg.rows import dict_row

from hellosquad.billing import service
from hellosquad.billing.factory import build_provider
from hellosquad.billing.mock import MockProvider, mock_signature
from hellosquad.billing.provider import CardToken, CustomerData
from hellosquad.billing.renewal import RENEWAL_LOCK_KEY, RenewalReport, renew_due_subscriptions
from hellosquad.billing.routes import get_payment_http
from hellosquad.config import get_settings

pytestmark = pytest.mark.integration

SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
MARINA = "marina@miolo.example"
RAFAEL = "rafael@vitta.example"
CARLA = "carla@vitta.example"
MOCK_SECRET = "segredo-local-do-simulado"
BRASILIA = timezone(timedelta(hours=-3))
# Documento fictício de propósito: só zeros não é CPF de ninguém (docs/DADOS_FICTICIOS.md).
VITTA = CustomerData(
    name="Vitta", email="rafael@vitta.example", reference="vitta", document="00000000000"
)
MIOLO = CustomerData(
    name="Miolo", email="marina@miolo.example", reference="miolo", document="00000000000"
)
CARD = CardToken(token=APPROVED_CARD, brand="master", remote_ip="203.0.113.10")


@dataclass
class Fakes:
    asaas: FakeAsaas
    mercadopago: FakeMercadoPago
    http: httpx.AsyncClient


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


async def workspace(conn: psycopg.AsyncConnection, slug: str) -> UUID:
    return await scalar(conn, "select id from public.workspaces where slug = %s", slug)


async def balance(conn: psycopg.AsyncConnection, workspace_id: UUID) -> Decimal:
    return await scalar(conn, "select app.credit_balance(%s)", workspace_id)


@pytest.fixture(autouse=True)
async def seed_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    yield
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


@pytest.fixture
def billing_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name, value in {
        "ASAAS_API_KEY": ASAAS_KEY,
        "ASAAS_BASE_URL": "http://asaas.test/v3",
        "ASAAS_WEBHOOK_TOKEN": ASAAS_WEBHOOK_TOKEN,
        "MERCADOPAGO_ACCESS_TOKEN": MP_TOKEN,
        "MERCADOPAGO_BASE_URL": "http://mercadopago.test",
        "MERCADOPAGO_WEBHOOK_SECRET": MP_WEBHOOK_SECRET,
        "PAYMENT_MOCK_WEBHOOK_SECRET": MOCK_SECRET,
    }.items():
        monkeypatch.setenv(name, value)
    get_settings.cache_clear()


@pytest.fixture
async def fakes() -> AsyncIterator[Fakes]:
    asaas, mercadopago = FakeAsaas(), FakeMercadoPago()
    transport = httpx.ASGITransport(app=fake_app(asaas, mercadopago))
    async with httpx.AsyncClient(transport=transport) as http:
        yield Fakes(asaas, mercadopago, http)


@pytest.fixture
async def billing_api(billing_env, api, fakes) -> AsyncIterator[httpx.AsyncClient]:
    from hellosquad.api.main import app

    app.dependency_overrides[get_payment_http] = lambda: fakes.http
    try:
        yield api
    finally:
        app.dependency_overrides.pop(get_payment_http, None)


@pytest.fixture
async def db(admin_db: psycopg.AsyncConnection) -> AsyncIterator[psycopg.AsyncConnection]:
    """Papel privilegiado do serviço de cobrança (o mesmo do worker e do scheduler em local)."""
    async with await psycopg.AsyncConnection.connect(
        get_settings().database_url.get_secret_value(), autocommit=True, row_factory=dict_row
    ) as conn:
        yield conn


async def webhook(
    api: httpx.AsyncClient,
    provider: str,
    headers: dict[str, str],
    body: bytes,
    query: dict[str, str] | None = None,
) -> httpx.Response:
    return await api.post(
        f"/billing/webhooks/{provider}", params=query or {}, headers=headers, content=body
    )


async def test_pix_topup_goes_from_pending_to_confirmed_once(billing_api, fakes, db) -> None:
    vitta = await workspace(db, "vitta")
    provider = build_provider("asaas", get_settings(), fakes.http)
    payment = await service.buy_topup(
        db, provider, workspace_id=vitta, pack_slug="recarga-50", method="pix", customer=VITTA
    )
    assert (payment["status"], payment["kind"], payment["credits"]) == ("pending", "topup", 50)
    assert payment["pix_payload"].startswith("000201") and payment["grant_id"] is None
    before = await balance(db, vitta)

    created = await webhook(
        billing_api,
        "asaas",
        *fakes.asaas.webhook("PAYMENT_CREATED", payment_id=payment["provider_payment_id"]),
    )
    assert created.json()["outcome"] == "no_change"
    assert await balance(db, vitta) == before

    fakes.asaas.set_status(payment["provider_payment_id"], "RECEIVED")
    headers, body = fakes.asaas.webhook(
        "PAYMENT_RECEIVED", payment_id=payment["provider_payment_id"]
    )
    first = await webhook(billing_api, "asaas", headers, body)
    assert first.status_code == 200
    assert first.json() == {
        "received": True,
        "result": "SUCCESS",
        "duplicate": False,
        "outcome": "applied",
    }
    again = await webhook(billing_api, "asaas", headers, body)
    assert again.status_code == 200 and again.json()["duplicate"] is True
    late = await webhook(
        billing_api,
        "asaas",
        *fakes.asaas.webhook("PAYMENT_CONFIRMED", payment_id=payment["provider_payment_id"]),
    )
    assert late.json()["outcome"] == "no_change"

    assert await balance(db, vitta) == before + 50
    grant = await one(
        db,
        "select g.origin::text as origin, g.amount, g.expires_at from public.payments p "
        "join public.credit_grants g on g.id = p.grant_id where p.id = %s",
        payment["id"],
    )
    assert grant == {"origin": "topup", "amount": 50, "expires_at": None}
    entries = await scalar(
        db,
        "select count(*) from public.credit_ledger where idempotency_key = %s",
        f"billing:payment:{payment['id']}",
    )
    assert entries == 1
    event_id = json.loads(body)["id"]
    stored = await one(
        db,
        "select count(*) as n, min(payload::text) as payload from public.payment_events "
        "where provider = 'asaas' and event_id = %s",
        event_id,
    )
    assert stored["n"] == 1 and "creditCard" not in stored["payload"]


async def test_webhook_without_valid_signature_is_refused_and_not_recorded(
    billing_api, fakes, db
) -> None:
    before = await scalar(db, "select count(*) from public.payment_events")
    headers, body = fakes.asaas.webhook("PAYMENT_RECEIVED", token="token-errado-000000000000000000")
    refused = await webhook(billing_api, "asaas", headers, body)
    assert refused.status_code == 401
    assert refused.json()["error"]["code"] == "invalid_signature"

    query, mp_headers, mp_body = fakes.mercadopago.webhook("payment", "123", secret="outro-segredo")
    assert (
        await webhook(billing_api, "mercadopago", mp_headers, mp_body, query)
    ).status_code == 401
    query, mp_headers, mp_body = fakes.mercadopago.webhook("payment", "123", ts="1577836800")
    replayed = await webhook(billing_api, "mercadopago", mp_headers, mp_body, query)
    assert replayed.status_code == 401
    assert replayed.json()["error"]["code"] == "invalid_signature"

    body_mock = json.dumps({"id": "evt-x", "type": "payment.confirmed"}).encode()
    forged = await webhook(
        billing_api, "mock", {"x-mock-signature": mock_signature("outro", body_mock)}, body_mock
    )
    assert forged.status_code == 401
    assert (await billing_api.post("/billing/webhooks/stripe", content=b"{}")).status_code == 422
    assert await scalar(db, "select count(*) from public.payment_events") == before


async def test_mercadopago_cycle_grants_the_plan_credits_until_the_period_ends(
    billing_api, fakes, db
) -> None:
    vitta = await workspace(db, "vitta")
    provider = build_provider("mercadopago", get_settings(), fakes.http)
    subscription = await service.subscribe(
        db,
        provider,
        workspace_id=vitta,
        plan_slug="squad",
        method="card",
        customer=VITTA,
        card=CARD,
    )
    assert subscription["status"] == "pending"
    before = await balance(db, vitta)
    [authorized] = fakes.mercadopago.authorized.values()

    query, headers, body = fakes.mercadopago.webhook(
        "subscription_authorized_payment", authorized["id"], action="created"
    )
    first = await webhook(billing_api, "mercadopago", headers, body, query)
    assert first.json()["outcome"] == "applied"
    again = await webhook(billing_api, "mercadopago", headers, body, query)
    assert again.json()["duplicate"] is True

    cycle = await one(
        db,
        "select p.status::text as status, p.provider_payment_id, p.period_start, p.period_end, "
        "g.origin::text as origin, g.amount, g.starts_at, g.expires_at "
        "from public.payments p join public.credit_grants g on g.id = p.grant_id "
        "where p.subscription_id = %s",
        subscription["id"],
    )
    today = datetime.now(BRASILIA).replace(hour=0, minute=0, second=0, microsecond=0)
    assert cycle["provider_payment_id"] == f"ap:{authorized['id']}"
    assert (cycle["status"], cycle["origin"], cycle["amount"]) == ("confirmed", "plan_cycle", 100)
    assert cycle["period_start"] == today and cycle["starts_at"] == today
    assert cycle["expires_at"] == cycle["period_end"] > cycle["period_start"]
    state = await one(
        db,
        "select s.status::text as status, s.current_period_end, a.plan_version_id "
        "from public.subscriptions s "
        "join public.credit_accounts a on a.workspace_id = s.workspace_id "
        "where s.id = %s",
        subscription["id"],
    )
    assert state["status"] == "active" and state["current_period_end"] == cycle["period_end"]
    assert state["plan_version_id"] == subscription["plan_version_id"]
    assert await balance(db, vitta) == before + 100

    await service.cancel_subscription(db, provider, subscription_id=subscription["id"])
    cancelled = await one(
        db,
        "select status::text as status from public.subscriptions where id = %s",
        subscription["id"],
    )
    assert cancelled["status"] == "cancelled"
    assert await balance(db, vitta) == before + 100


async def test_chargeback_and_refund_take_back_only_unused_credits(billing_api, fakes, db) -> None:
    vitta = await workspace(db, "vitta")
    provider = build_provider("asaas", get_settings(), fakes.http)
    payment = await service.buy_topup(
        db, provider, workspace_id=vitta, pack_slug="recarga-50", method="pix", customer=VITTA
    )
    reference = payment["provider_payment_id"]

    async def send(event: str, status: str) -> dict[str, Any]:
        fakes.asaas.set_status(reference, status)
        response = await webhook(
            billing_api, "asaas", *fakes.asaas.webhook(event, payment_id=reference)
        )
        assert response.status_code == 200
        return response.json()

    await send("PAYMENT_RECEIVED", "RECEIVED")
    grant_id = await scalar(db, "select grant_id from public.payments where id = %s", payment["id"])
    await db.execute(
        "insert into public.credit_ledger (workspace_id, account_id, entry_type, grant_id, amount, "
        "idempotency_key, note) select g.workspace_id, g.account_id, 'adjustment', g.id, -20, "
        "'teste:consumo', 'Consumo fictício do teste.' from public.credit_grants g where g.id = %s",
        (grant_id,),
    )
    await db.execute(
        "update public.credit_grants set remaining = remaining - 20 where id = %s", (grant_id,)
    )

    assert (await send("PAYMENT_CHARGEBACK_REQUESTED", "CHARGEBACK_REQUESTED"))[
        "outcome"
    ] == "applied"
    revoked = await one(
        db,
        "select p.status::text as status, p.credits_revoked, g.remaining from public.payments p "
        "join public.credit_grants g on g.id = p.grant_id where p.id = %s",
        payment["id"],
    )
    assert revoked == {"status": "charged_back", "credits_revoked": 30, "remaining": 0}

    assert (await send("PAYMENT_RECEIVED", "RECEIVED"))["outcome"] == "applied"
    assert (await send("PAYMENT_REFUNDED", "REFUNDED"))["outcome"] == "applied"
    entries = await rows(
        db,
        "select entry_type::text as entry_type, amount from public.credit_ledger "
        "where grant_id = %s order by created_at, id",
        grant_id,
    )
    assert [(e["entry_type"], e["amount"]) for e in entries] == [
        ("grant", 50),
        ("adjustment", -20),
        ("adjustment", -30),
        ("refund", 30),
        ("adjustment", -30),
    ]
    final = await one(
        db,
        "select status::text as status, credits_revoked from public.payments where id = %s",
        payment["id"],
    )
    assert final == {"status": "refunded", "credits_revoked": 30}


async def test_renewal_grants_only_with_confirmed_payment_otherwise_past_due(
    billing_api, fakes, db, access_token
) -> None:
    vitta, miolo = await workspace(db, "vitta"), await workspace(db, "miolo")
    provider = build_provider("asaas", get_settings(), fakes.http)
    subscription = await service.subscribe(
        db, provider, workspace_id=vitta, plan_slug="squad", method="pix", customer=VITTA
    )
    [first] = fakes.asaas.payments.values()
    fakes.asaas.set_status(first["id"], "RECEIVED")
    await webhook(
        billing_api, "asaas", *fakes.asaas.webhook("PAYMENT_RECEIVED", payment_id=first["id"])
    )
    period_end = await scalar(
        db, "select current_period_end from public.subscriptions where id = %s", subscription["id"]
    )
    second = fakes.asaas.next_cycle(subscription["provider_subscription_id"])
    fakes.asaas.set_status(second["id"], "RECEIVED")

    later = period_end + timedelta(days=1)
    providers = {"asaas": provider, "mock": MockProvider(webhook_secret=None)}
    report = await renew_due_subscriptions(db, providers, now=later)
    assert (report.checked, report.renewed, report.past_due) == (2, 1, 1)

    renewed = await one(
        db,
        "select s.status::text as status, s.current_period_start, s.current_period_end, "
        "g.origin::text as origin, g.amount, g.starts_at, g.expires_at "
        "from public.subscriptions s join public.payments p on p.subscription_id = s.id "
        "join public.credit_grants g on g.id = p.grant_id "
        "where s.id = %s and p.provider_payment_id = %s",
        subscription["id"],
        second["id"],
    )
    assert renewed["status"] == "active" and renewed["origin"] == "plan_cycle"
    assert renewed["starts_at"] == renewed["current_period_start"] == period_end
    assert renewed["expires_at"] == renewed["current_period_end"] > later
    assert renewed["amount"] == 100

    past_due = await one(
        db,
        "select status::text as status, past_due_since from public.subscriptions "
        "where workspace_id = %s",
        miolo,
    )
    assert past_due == {"status": "past_due", "past_due_since": later}
    assert (await renew_due_subscriptions(db, providers, now=later)).checked == 0

    token = access_token(MARINA)
    assert (await billing_api.get("/me", headers=bearer(token))).status_code == 200
    state = await billing_api.get(
        f"/workspaces/{miolo}/billing/subscription", headers=bearer(token)
    )
    assert state.json()["status"] == "past_due"
    assert state.json()["next_cycle_at"] == state.json()["current_period_end"]


async def test_two_schedulers_at_the_same_time_renew_the_cycle_once(billing_api, fakes, db) -> None:
    vitta = await workspace(db, "vitta")
    provider = build_provider("asaas", get_settings(), fakes.http)
    subscription = await service.subscribe(
        db, provider, workspace_id=vitta, plan_slug="squad", method="pix", customer=VITTA
    )
    [first] = fakes.asaas.payments.values()
    fakes.asaas.set_status(first["id"], "RECEIVED")
    await webhook(
        billing_api, "asaas", *fakes.asaas.webhook("PAYMENT_RECEIVED", payment_id=first["id"])
    )
    period_end = await scalar(
        db, "select current_period_end from public.subscriptions where id = %s", subscription["id"]
    )
    second = fakes.asaas.next_cycle(subscription["provider_subscription_id"])
    fakes.asaas.set_status(second["id"], "RECEIVED")
    later = period_end + timedelta(days=1)
    providers = {"asaas": provider, "mock": MockProvider(webhook_secret=None)}
    url = get_settings().database_url.get_secret_value()

    async with (
        await psycopg.AsyncConnection.connect(url, autocommit=True, row_factory=dict_row) as c1,
        await psycopg.AsyncConnection.connect(url, autocommit=True, row_factory=dict_row) as c2,
    ):
        await c2.execute("select pg_advisory_lock(%s)", (RENEWAL_LOCK_KEY,))
        assert await renew_due_subscriptions(c1, providers, now=later) == RenewalReport(
            skipped=True
        )
        await c2.execute("select pg_advisory_unlock(%s)", (RENEWAL_LOCK_KEY,))

        r1, r2 = await asyncio.gather(
            renew_due_subscriptions(c1, providers, now=later),
            renew_due_subscriptions(c2, providers, now=later),
        )
        ran, skipped = (r1, r2) if r2.skipped else (r2, r1)
        assert skipped == RenewalReport(skipped=True)
        assert (ran.skipped, ran.checked, ran.renewed, ran.past_due) == (False, 2, 1, 1)
        assert await scalar(db, "select pg_try_advisory_lock(%s)", RENEWAL_LOCK_KEY)
        await db.execute("select pg_advisory_unlock(%s)", (RENEWAL_LOCK_KEY,))

    grants = await scalar(
        db,
        "select count(*) from public.payments p join public.credit_grants g on g.id = p.grant_id "
        "where p.subscription_id = %s and g.origin = 'plan_cycle'",
        subscription["id"],
    )
    assert grants == 2


async def test_billing_reads_are_owner_only_and_carry_no_money(
    billing_api, db, access_token
) -> None:
    miolo, vitta = await workspace(db, "miolo"), await workspace(db, "vitta")
    marina = bearer(access_token(MARINA))

    subscription = await billing_api.get(
        f"/workspaces/{miolo}/billing/subscription", headers=marina
    )
    assert subscription.status_code == 200
    body = subscription.json()
    assert (body["status"], body["plan"], body["provider"], body["method"]) == (
        "active",
        "Squad",
        "mock",
        "pix",
    )
    assert body["provisional"] is True and body["next_cycle_at"] == body["current_period_end"]

    first = await billing_api.get(
        f"/workspaces/{miolo}/billing/payments", params={"limit": 1}, headers=marina
    )
    page = first.json()
    assert [(p["kind"], p["status"], p["credits"]) for p in page["items"]] == [
        ("topup", "pending", 50)
    ]
    second = await billing_api.get(
        f"/workspaces/{miolo}/billing/payments",
        params={"limit": 1, "cursor": page["next_cursor"]},
        headers=marina,
    )
    assert [(p["kind"], p["status"]) for p in second.json()["items"]] == [
        ("subscription_cycle", "confirmed")
    ]
    for payload in (body, page, second.json()):
        text = json.dumps(payload)
        assert "amount" not in text and "price" not in text and "pix_payload" not in text

    carla = await billing_api.get(
        f"/workspaces/{vitta}/billing/subscription", headers=bearer(access_token(CARLA))
    )
    assert carla.status_code == 403 and carla.json()["error"]["code"] == "owner_only"
    outsider = await billing_api.get(f"/workspaces/{vitta}/billing/payments", headers=marina)
    assert outsider.status_code == 404
    rafael = await billing_api.get(
        f"/workspaces/{vitta}/billing/subscription", headers=bearer(access_token(RAFAEL))
    )
    assert rafael.json()["status"] == "none"


async def test_mock_webhook_confirms_the_seed_pix_topup(billing_api, db) -> None:
    miolo = await workspace(db, "miolo")
    before = await balance(db, miolo)

    def signed(payload: dict[str, Any]) -> tuple[dict[str, str], bytes]:
        body = json.dumps(payload).encode()
        return {"x-mock-signature": mock_signature(MOCK_SECRET, body)}, body

    confirm = {
        "id": "evt-local-1",
        "type": "payment.confirmed",
        "date": datetime.now(UTC).isoformat(),
        "payment": {"id": "mock_pay_miolo_recarga", "status": "confirmed"},
    }
    first = await webhook(billing_api, "mock", *signed(confirm))
    assert first.json()["outcome"] == "applied"
    assert (await webhook(billing_api, "mock", *signed(confirm))).json()["duplicate"] is True
    assert await balance(db, miolo) == before + 50

    unknown = {"id": "evt-local-2", "type": "payment.confirmed", "payment": {"id": "x"}}
    ignored = await webhook(billing_api, "mock", *signed(unknown))
    assert ignored.status_code == 200 and ignored.json()["outcome"] == "ignored"
