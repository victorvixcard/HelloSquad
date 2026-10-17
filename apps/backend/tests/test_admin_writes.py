"""Integração da SA6a: escrita do Super Admin. A Marina (owner) recebe 403 em toda rota de escrita
do painel; cada ação do Vic fica em audit_events com o motivo; a sessão de suporte dá leitura só
durante a janela, nunca escrita, expira sozinha e avisa o titular; ajuste de crédito não deixa o
saldo negativo; catálogo e planos ganham versão nova sem tocar a passada; reprocessar webhook não
duplica o crédito."""

import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import psycopg
import pytest
from psycopg.rows import dict_row

from hellosquad.billing.mock import MockProvider, mock_signature
from hellosquad.billing.provider import ProviderPayment
from hellosquad.config import get_settings
from hellosquad.email.templates import EmailRenderer

pytestmark = pytest.mark.integration

VIC = "vic@hellosquad.example"
MARINA = "marina@miolo.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
MOCK_SECRET = "segredo-local-do-simulado"
REASON = "Conferência pedida pela titular no chamado 42"


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def rows(conn: psycopg.AsyncConnection, query: str, *params: object) -> list[dict[str, Any]]:
    cursor = conn.cursor(row_factory=dict_row)
    await cursor.execute(query, params)
    return await cursor.fetchall()


async def one(conn: psycopg.AsyncConnection, query: str, *params: object) -> dict[str, Any]:
    return (await rows(conn, query, *params))[0]


async def scalar(conn: psycopg.AsyncConnection, query: str, *params: object) -> Any:
    return next(iter((await one(conn, query, *params)).values()))


async def workspace(conn: psycopg.AsyncConnection, slug: str) -> UUID:
    return await scalar(conn, "select id from public.workspaces where slug = %s", slug)


async def audits(conn: psycopg.AsyncConnection, action: str, since: datetime) -> list[dict]:
    return await rows(
        conn,
        "select a.*, u.email from public.audit_events a left join auth.users u on u.id::text ="
        " a.actor_id where a.action = %s and a.created_at >= %s order by a.created_at",
        action,
        since,
    )


@pytest.fixture(autouse=True)
async def seed_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    yield
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


@pytest.fixture
def mock_billing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PAYMENT_MOCK_WEBHOOK_SECRET", MOCK_SECRET)
    get_settings.cache_clear()


async def write_paths(admin_db: psycopg.AsyncConnection) -> list[tuple[str, str]]:
    """Todas as rotas de escrita /admin/* do app, com os parâmetros preenchidos."""
    from hellosquad.api.main import app

    miolo = await workspace(admin_db, "miolo")
    values = {
        "workspace_id": str(miolo),
        "run_id": str(uuid4()),
        "event_id": str(uuid4()),
        "delivery_type": "04.01",
        "slug": "squad",
        "provider": "anthropic",
        "version_id": str(uuid4()),
        "agent_id": "otto",
        "section": "identidade",
        "doc": "regras",
        "doc_id": str(uuid4()),
    }
    paths = []
    for path, methods in app.openapi()["paths"].items():
        if not path.startswith("/admin"):
            continue
        for method in methods:
            if method in ("post", "put", "patch", "delete"):
                paths.append((method.upper(), path.format(**values)))
    return paths


async def test_marina_gets_403_on_every_admin_write_route(api, access_token, admin_db) -> None:
    since = datetime.now(UTC)
    paths = await write_paths(admin_db)
    assert len(paths) >= 21
    token = access_token(MARINA)
    for method, path in paths:
        response = await api.request(method, path, headers=bearer(token), json={"reason": REASON})
        assert response.status_code == 403, (method, path, response.text)
        assert response.json()["error"]["code"] == "platform_admin_only", (method, path)
    count = await scalar(
        admin_db,
        "select count(*) from public.audit_events where created_at >= %s and"
        " payload ->> 'platform_admin' = 'true'",
        since,
    )
    assert count == 0


async def test_support_session_reads_only_inside_the_window_never_writes(
    api, access_token, admin_db
) -> None:
    since = datetime.now(UTC)
    vic = bearer(access_token(VIC))
    miolo, vitta = await workspace(admin_db, "miolo"), await workspace(admin_db, "vitta")
    conversations = f"/workspaces/{miolo}/conversations"

    before = await api.get(conversations, headers=vic)
    assert (
        before.status_code == 403 and before.json()["error"]["code"] == "support_session_required"
    )

    url = f"/admin/accounts/{miolo}/support-session"
    short = await api.post(url, headers=vic, json={"reason": "curto", "duration_minutes": 15})
    assert short.status_code == 422
    odd = await api.post(url, headers=vic, json={"reason": REASON, "duration_minutes": 45})
    assert odd.status_code == 422

    started = await api.post(url, headers=vic, json={"reason": REASON, "duration_minutes": 15})
    assert started.status_code == 201, started.text
    session = started.json()
    try:
        assert session["status"] == "active" and session["mode"] == "read_only"
        minutes = (
            datetime.fromisoformat(session["expires_at"])
            - datetime.fromisoformat(session["started_at"])
        ).total_seconds() / 60
        assert minutes == 15
        again = await api.post(url, headers=vic, json={"reason": REASON, "duration_minutes": 30})
        assert again.status_code == 409

        read = await api.get(conversations, headers=vic)
        assert read.status_code == 200, read.text
        assert len(read.json()["items"]) > 0
        assert (await api.get(f"/workspaces/{miolo}/work-items", headers=vic)).status_code == 200
        other = await api.get(f"/workspaces/{vitta}/conversations", headers=vic)
        assert (
            other.status_code == 403 and other.json()["error"]["code"] == "support_session_required"
        )

        count = "select count(*) from public.conversations where workspace_id = %s"
        total = await scalar(admin_db, count, miolo)
        write = await api.post(
            conversations, headers=vic, json={"kind": "agent_direct", "primary_agent_id": "otto"}
        )
        assert write.status_code in (403, 404), write.text
        assert await scalar(admin_db, count, miolo) == total

        log = await one(
            admin_db, "select * from public.support_access_log where id = %s", session["id"]
        )
        assert log["reason"] == REASON and log["ended_at"] is None
        [audit] = await audits(admin_db, "support.session_started", since)
        assert audit["email"] == VIC and audit["workspace_id"] == miolo
        assert audit["payload"]["reason"] == REASON and audit["payload"]["minutes"] == 15
        assert audit["payload"]["platform_admin"] is True
        [email] = await rows(
            admin_db,
            "select * from public.email_messages where template = 'support_session_started'"
            " and idempotency_key like %s",
            f"support:{session['id']}:%",
        )
        assert email["recipient_email"] == MARINA and email["workspace_id"] == miolo
        assert email["variables"]["minutes"] == 15 and email["variables"]["reason"] == REASON
        renderer = EmailRenderer(app_url="http://127.0.0.1:3100")
        for locale, word in (("pt-BR", "15 minutos"), ("en", "15 minutes"), ("es", "15 minutos")):
            rendered = renderer.render("support_session_started", locale, email["variables"])
            assert "Miolo" in rendered.subject and word in rendered.text
            assert REASON in rendered.text and "{" not in rendered.text
    finally:
        ended = await api.delete(url, headers=vic)
    assert ended.status_code == 200 and ended.json()["status"] == "ended"
    assert (await api.get(conversations, headers=vic)).status_code == 403
    assert (await api.delete(url, headers=vic)).status_code == 404
    [closed] = await audits(admin_db, "support.session_ended", since)
    assert closed["payload"]["reason"] == REASON

    # Sessão vencida (prazo no passado): sem leitura, mesmo sem ninguém ter encerrado.
    vic_id = await scalar(admin_db, "select id from auth.users where email = %s", VIC)
    await admin_db.execute(
        "insert into public.support_access_log (admin_id, workspace_id, reason, started_at,"
        " expires_at) values (%s, %s, %s, now() - interval '20 minutes',"
        " now() - interval '5 minutes')",
        (vic_id, miolo, REASON),
    )
    expired = await api.get(conversations, headers=vic)
    assert (
        expired.status_code == 403 and expired.json()["error"]["code"] == "support_session_required"
    )
    detail = (await api.get(f"/admin/accounts/{miolo}", headers=vic)).json()
    assert detail["support_accesses"][0]["reason"] == REASON


async def test_credit_adjustment_is_audited_and_never_leaves_a_negative_balance(
    api, access_token, admin_db
) -> None:
    since = datetime.now(UTC)
    vic = bearer(access_token(VIC))
    miolo = await workspace(admin_db, "miolo")
    url = f"/admin/accounts/{miolo}/credit-adjustments"
    balance = "select app.credit_balance(%s)"
    available_sql = (
        "select coalesce(sum(remaining - reserved), 0) from public.credit_grants where"
        " workspace_id = %s and starts_at <= now() and (expires_at is null or expires_at > now())"
    )
    start = await scalar(admin_db, balance, miolo)

    credit = await api.post(url, headers=vic, json={"amount": "10", "reason": REASON})
    assert credit.status_code == 201, credit.text
    assert Decimal(credit.json()["balance_after"]) == start + 10
    grant = await one(
        admin_db,
        "select g.origin::text as origin, g.note from public.credit_grants g join"
        " public.credit_ledger l on l.grant_id = g.id where l.workspace_id = %s and"
        " l.entry_type = 'grant' order by l.created_at desc limit 1",
        miolo,
    )
    assert grant == {"origin": "adjustment", "note": REASON}

    available = await scalar(admin_db, available_sql, miolo)
    too_much = await api.post(
        url, headers=vic, json={"amount": str(-(available + 1)), "reason": REASON}
    )
    assert too_much.status_code == 409, too_much.text
    assert await scalar(admin_db, balance, miolo) == start + 10

    key = uuid4().hex
    debit = {"amount": "-5.50", "reason": REASON, "idempotency_key": key}
    first = await api.post(url, headers=vic, json=debit)
    assert first.status_code == 201 and first.json()["duplicate"] is False
    assert Decimal(first.json()["balance_after"]) == start + Decimal("4.50")
    repeated = await api.post(url, headers=vic, json=debit)
    assert repeated.json()["duplicate"] is True and repeated.json()["entries"] == 0
    assert await scalar(admin_db, balance, miolo) == start + Decimal("4.50")
    entries = await rows(
        admin_db,
        "select amount from public.credit_ledger where workspace_id = %s and"
        " entry_type = 'adjustment' and idempotency_key like %s",
        miolo,
        f"admin_adjustment:{key}:%",
    )
    assert sum(e["amount"] for e in entries) == Decimal("-5.50")

    everything = await scalar(admin_db, available_sql, miolo)
    drained = await api.post(url, headers=vic, json={"amount": str(-everything), "reason": REASON})
    assert drained.status_code == 201, drained.text
    assert await scalar(admin_db, available_sql, miolo) == 0
    assert await scalar(admin_db, balance, miolo) >= 0

    zero = await api.post(url, headers=vic, json={"amount": "0", "reason": REASON})
    assert zero.status_code == 422
    wildcard = {"amount": "1", "reason": REASON, "idempotency_key": "chave-%-curinga"}
    assert (await api.post(url, headers=vic, json=wildcard)).status_code == 422
    adjusted = await audits(admin_db, "credits.adjusted", since)
    assert len(adjusted) == 3
    assert all(a["email"] == VIC and a["payload"]["reason"] == REASON for a in adjusted)


async def test_suspension_pauses_billing_and_routines_and_members_see_it(
    api, access_token, admin_db
) -> None:
    since = datetime.now(UTC)
    vic, marina = bearer(access_token(VIC)), bearer(access_token(MARINA))
    miolo = await workspace(admin_db, "miolo")
    due = (
        "select count(*) from app.billing_due_subscriptions(now() + interval '400 days',"
        " interval '0 seconds', 1000) where workspace_id = %s"
    )
    assert await scalar(admin_db, due, miolo) == 1

    suspended = await api.post(
        f"/admin/accounts/{miolo}/suspend", headers=vic, json={"reason": REASON}
    )
    assert suspended.status_code == 200, suspended.text
    assert suspended.json()["status"] == "suspended"
    assert (
        await api.post(f"/admin/accounts/{miolo}/suspend", headers=vic, json={"reason": REASON})
    ).status_code == 409

    me = (await api.get("/me", headers=marina)).json()
    [membership] = [m for m in me["memberships"] if m["workspace"]["id"] == str(miolo)]
    assert membership["workspace_status"] == "suspended"
    listed = (await api.get("/admin/accounts?status=suspended", headers=vic)).json()
    assert [a["slug"] for a in listed["items"]] == ["miolo"]
    assert listed["items"][0]["suspension_reason"] == REASON
    assert await scalar(admin_db, due, miolo) == 0
    status = await scalar(
        admin_db, "select status::text from public.subscriptions where workspace_id = %s", miolo
    )
    assert status == "active"

    run = await scalar(
        admin_db,
        "insert into public.runs (workspace_id, agent_id, kind, status, idempotency_key)"
        " values (%s, 'otto', 'scheduled', 'queued', %s) returning id",
        miolo,
        f"sa6a-rotina-{uuid4().hex}",
    )
    try:
        with pytest.raises(psycopg.Error) as refused:
            await admin_db.execute("select app.enqueue_run(%s)", (run,))
        assert refused.value.sqlstate == "HS423"

        reactivated = await api.post(
            f"/admin/accounts/{miolo}/reactivate", headers=vic, json={"reason": REASON}
        )
        assert reactivated.status_code == 200 and reactivated.json()["status"] == "active"
        assert await scalar(admin_db, due, miolo) == 1
        assert await scalar(admin_db, "select app.enqueue_run(%s)", run) is not None
    finally:
        await admin_db.execute(
            "select pgmq.delete('runs_scheduled', msg_id) from pgmq.q_runs_scheduled"
            " where message ->> 'run_id' = %s",
            (str(run),),
        )
        await admin_db.execute("delete from public.runs where id = %s", (run,))
    for action in ("workspace.suspended", "workspace.reactivated"):
        [audit] = await audits(admin_db, action, since)
        assert audit["email"] == VIC and audit["payload"]["reason"] == REASON


async def test_catalog_and_plans_get_new_versions_and_for_sale_needs_homologation_and_price(
    api, access_token, admin_db
) -> None:
    since = datetime.now(UTC)
    vic = bearer(access_token(VIC))
    old_price = await one(
        admin_db, "select * from public.delivery_prices where delivery_type = '04.01'"
    )
    try:
        sale = "/admin/catalog/04.01/for-sale"
        early = await api.put(sale, headers=vic, json={"for_sale": True, "reason": REASON})
        assert early.status_code == 409, early.text

        price = "/admin/catalog/04.01/price"
        provisional = await api.put(price, headers=vic, json={"credits": "12", "reason": REASON})
        assert provisional.status_code == 200, provisional.text
        assert provisional.json()["provisional"] is True
        assert provisional.json()["approved_commercially"] is False
        homologated = await api.put(
            "/admin/catalog/04.01/homologation",
            headers=vic,
            json={"status": "homologated", "reason": REASON},
        )
        assert homologated.status_code == 200, homologated.text
        not_approved = await api.put(sale, headers=vic, json={"for_sale": True, "reason": REASON})
        assert not_approved.status_code == 409

        both = {"provisional": True, "approved_commercially": True, "reason": REASON}
        assert (
            await api.put(price, headers=vic, json={"credits": "12", **both})
        ).status_code == 422
        approved = await api.put(
            price,
            headers=vic,
            json={
                "credits": "12",
                "provisional": False,
                "approved_commercially": True,
                "reason": REASON,
            },
        )
        assert approved.status_code == 200, approved.text
        on_sale = await api.put(sale, headers=vic, json={"for_sale": True, "reason": REASON})
        assert on_sale.status_code == 200 and on_sale.json()["for_sale"] is True
        catalog = (await api.get("/admin/catalog?agent_id=otto", headers=vic)).json()
        [item] = [i for i in catalog["items"] if i["delivery_type"] == "04.01"]
        assert item["for_sale"] is True and Decimal(item["price"]["credits"]) == 12

        versions = await rows(
            admin_db,
            "select credits, provisional from public.delivery_prices where delivery_type ="
            " '04.01' order by valid_from",
        )
        assert [v["credits"] for v in versions] == [old_price["credits"], 12, 12]
        with pytest.raises(psycopg.Error):
            await admin_db.execute(
                "update public.delivery_prices set credits = 1 where id = %s", (old_price["id"],)
            )

        plan = {"credits": "120", "cycle": "monthly", "amount": "109.00", "reason": REASON}
        refused = await api.put("/admin/plans/squad", headers=vic, json={**plan, "for_sale": True})
        assert refused.status_code == 409
        approved_plan = {
            "credits": "120",
            "cycle": "monthly",
            "provisional": False,
            "approved_commercially": True,
            "for_sale": True,
            "reason": REASON,
        }
        old_money = await api.put("/admin/plans/squad", headers=vic, json=approved_plan)
        assert old_money.status_code == 409, old_money.text
        created = await api.put("/admin/plans/squad", headers=vic, json=plan)
        assert created.status_code == 200, created.text
        assert created.json()["version"] == 2 and created.json()["provisional"] is True
        plan_versions = await rows(
            admin_db,
            "select v.version, v.credits from public.plan_versions v join public.plans p on"
            " p.id = v.plan_id where p.slug = 'squad' order by v.version",
        )
        assert plan_versions == [
            {"version": 1, "credits": Decimal("100.00")},
            {"version": 2, "credits": Decimal("120.00")},
        ]
        topup = await api.put(
            "/admin/topups/recarga-50",
            headers=vic,
            json={"credits": "60", "amount": "59.00", "reason": REASON},
        )
        assert topup.status_code == 200 and topup.json()["provisional"] is True
        for action in (
            "admin.catalog_price_versioned",
            "admin.catalog_homologation_changed",
            "admin.catalog_for_sale_changed",
            "admin.plan_versioned",
            "admin.topup_versioned",
        ):
            done = await audits(admin_db, action, since)
            assert done and all(a["payload"]["reason"] == REASON for a in done), action
    finally:
        await admin_db.execute(
            "delete from public.delivery_prices where delivery_type = '04.01' and id <> %s",
            (old_price["id"],),
        )
        await admin_db.execute(
            "update public.delivery_catalog set for_sale = false,"
            " homologation_status = 'in_homologation' where delivery_type = '04.01'"
        )
        await admin_db.execute("delete from public.plan_prices where created_at >= %s", (since,))
        await admin_db.execute("delete from public.plan_versions where created_at >= %s", (since,))
        await admin_db.execute("delete from public.topup_packs where created_at >= %s", (since,))
        await admin_db.execute("update public.plans set for_sale = false")
        await admin_db.execute("update public.topups set for_sale = false")


async def test_queue_requeue_and_cancel_need_a_reason_and_are_audited(
    api, access_token, admin_db
) -> None:
    since = datetime.now(UTC)
    vic = bearer(access_token(VIC))
    miolo = await workspace(admin_db, "miolo")
    run = await scalar(
        admin_db,
        "insert into public.runs (workspace_id, agent_id, status, idempotency_key, attempts,"
        " started_at, finished_at, error) values (%s, 'otto', 'failed', %s, 3,"
        " now() - interval '5 minutes', now() - interval '4 minutes',"
        ' \'{"code": "llm_failed"}\') returning id',
        miolo,
        f"sa6a-run-{uuid4().hex}",
    )
    held = None
    try:
        requeue = f"/admin/queue/runs/{run}/requeue"
        assert (await api.post(requeue, headers=vic, json={"reason": "curto"})).status_code == 422
        queued = await api.post(requeue, headers=vic, json={"reason": REASON})
        assert queued.status_code == 200, queued.text
        assert queued.json()["status"] == "queued" and queued.json()["attempts"] == 0
        sent = await scalar(
            admin_db,
            "select count(*) from pgmq.q_runs_interactive where message ->> 'run_id' = %s",
            str(run),
        )
        assert sent == 1
        assert (await api.post(requeue, headers=vic, json={"reason": REASON})).status_code == 409

        cancelled = await api.post(
            f"/admin/queue/runs/{run}/cancel", headers=vic, json={"reason": REASON}
        )
        assert cancelled.status_code == 200 and cancelled.json()["status"] == "cancelled"
        error = await scalar(admin_db, "select error from public.runs where id = %s", run)
        assert error == {"code": "cancelled_by_support", "message": REASON}
        missing = await api.post(
            f"/admin/queue/runs/{uuid4()}/cancel", headers=vic, json={"reason": REASON}
        )
        assert missing.status_code == 404

        # Run que já reservou créditos não volta à fila (S1e: uma reserva por run).
        held = await scalar(
            admin_db,
            "insert into public.runs (workspace_id, agent_id, status, idempotency_key)"
            " values (%s, 'otto', 'running', %s) returning id",
            miolo,
            f"sa6a-run-{uuid4().hex}",
        )
        await admin_db.execute(
            "select app.reserve_credits(%s, 1, 'run:' || %s::text)", (held, str(held))
        )
        await admin_db.execute(
            "update public.runs set status = 'failed', started_at = now(), finished_at = now()"
            " where id = %s",
            (held,),
        )
        refused = await api.post(
            f"/admin/queue/runs/{held}/requeue", headers=vic, json={"reason": REASON}
        )
        assert refused.status_code == 409, refused.text
    finally:
        await admin_db.execute(
            "select pgmq.delete('runs_interactive', msg_id) from pgmq.q_runs_interactive"
            " where message ->> 'run_id' = %s",
            (str(run),),
        )
        await admin_db.execute("delete from public.runs where id = any(%s)", ([run, held],))
    for action in ("run.requeued_by_support", "run.cancelled_by_support"):
        [audit] = await audits(admin_db, action, since)
        assert audit["email"] == VIC and audit["payload"]["reason"] == REASON


async def test_reprocessing_a_webhook_never_grants_twice_and_reconcile_is_once(
    api, access_token, admin_db, mock_billing, monkeypatch
) -> None:
    since = datetime.now(UTC)
    vic = bearer(access_token(VIC))
    miolo = await workspace(admin_db, "miolo")
    balance = "select app.credit_balance(%s)"
    start = await scalar(admin_db, balance, miolo)

    async def post_webhook(payload: dict[str, Any]) -> dict[str, Any]:
        body = json.dumps(payload).encode()
        headers = {"x-mock-signature": mock_signature(MOCK_SECRET, body)}
        response = await api.post("/billing/webhooks/mock", headers=headers, content=body)
        assert response.status_code == 200, response.text
        return response.json()

    await post_webhook(
        {
            "id": "evt-sa6a-pendente",
            "type": "payment.pending",
            "payment": {"id": "mock_pay_miolo_recarga", "status": "pending"},
        }
    )
    await post_webhook({"id": "evt-sa6a-desconhecido", "type": "x", "payment": {"id": "x"}})
    event = await scalar(
        admin_db, "select id from public.payment_events where event_id = 'evt-sa6a-pendente'"
    )
    unknown = await scalar(
        admin_db, "select id from public.payment_events where event_id = 'evt-sa6a-desconhecido'"
    )

    async def confirmed(self, provider_payment_id: str) -> ProviderPayment:
        return ProviderPayment(provider_payment_id=provider_payment_id, status="confirmed")

    monkeypatch.setattr(MockProvider, "get_payment", confirmed)
    url = f"/admin/payments/webhooks/{event}/reprocess"
    first = await api.post(url, headers=vic, json={"reason": REASON})
    assert first.status_code == 200, first.text
    assert first.json()["outcome"] == "applied" and first.json()["duplicate"] is False
    assert first.json()["applied_event_id"] == "reprocess:mock_pay_miolo_recarga:confirmed"
    second = await api.post(url, headers=vic, json={"reason": REASON})
    assert second.json()["duplicate"] is True
    assert await scalar(admin_db, balance, miolo) == start + 50
    grants = await scalar(
        admin_db,
        "select count(*) from public.credit_grants g join public.payments p on p.grant_id = g.id"
        " where p.provider_payment_id = 'mock_pay_miolo_recarga'",
    )
    assert grants == 1

    no_payment = await api.post(
        f"/admin/payments/webhooks/{unknown}/reprocess", headers=vic, json={"reason": REASON}
    )
    assert no_payment.status_code == 409 and no_payment.json()["error"]["code"] == (
        "webhook_not_reprocessable"
    )
    absent = await api.post(
        f"/admin/payments/webhooks/{uuid4()}/reprocess", headers=vic, json={"reason": REASON}
    )
    assert absent.status_code == 404

    reconcile = f"/admin/payments/webhooks/{event}/reconcile"
    marked = await api.post(reconcile, headers=vic, json={"reason": REASON})
    assert marked.status_code == 201, marked.text
    assert (await api.post(reconcile, headers=vic, json={"reason": REASON})).status_code == 409
    payments = (await api.get("/admin/payments", headers=vic)).json()
    [webhook] = [w for w in payments["webhooks"] if w["id"] == str(event)]
    assert webhook["reconciliation_reason"] == REASON and webhook["reconciled_at"]

    assert len(await audits(admin_db, "payment.webhook_reprocessed", since)) == 2
    [audit] = await audits(admin_db, "payment.reconciled", since)
    assert audit["email"] == VIC and audit["payload"]["reason"] == REASON
