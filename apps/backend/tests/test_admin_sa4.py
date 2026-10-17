"""Integração da SA4a: Consumo por cliente com alertas econômicos (faixas de referência em tabela,
marcadas como proposta), Qualidade das entregas por tipo, mês e versão de prompt com comparação de
períodos, Saúde das APIs com saldo informado e auditado. Os números vêm de uma conta fictícia criada
no teste (Ateliê Lume), com runs, etapas, créditos e decisões conhecidos; ela some no fim."""

from collections.abc import AsyncIterator
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import uuid4

import psycopg
import pytest
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from hellosquad.config import get_settings
from hellosquad.work.live import DISPLAY_TZ

pytestmark = pytest.mark.integration

VIC = "vic@hellosquad.example"
MARINA = "marina@miolo.example"
V1 = "a1" * 32
V2 = "b2" * 32
ACCOUNT_STATE = """
select app.credit_balance(%s) as balance, w.deleted_at,
       (select count(*) from public.audit_events a where a.workspace_id = w.id) as audit,
       (select c.plan_version_id from public.credit_accounts c where c.workspace_id = w.id) as plan
from public.workspaces w
where w.id = %s
"""


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def one(conn: psycopg.AsyncConnection, query: str, *params: object) -> dict[str, Any]:
    cursor = conn.cursor(row_factory=dict_row)
    await cursor.execute(query, params)
    return await cursor.fetchone()


async def run(
    conn: psycopg.AsyncConnection,
    ws: Any,
    *,
    agent: str,
    days_ago: int,
    work_item: Any = None,
    prompt: str | None = None,
    status: str = "succeeded",
) -> Any:
    row = await one(
        conn,
        "insert into public.runs (workspace_id, work_item_id, agent_id, status, prompt_version,"
        " idempotency_key, created_at)"
        " values (%s, %s, %s, %s, %s, %s, now() - %s * interval '1 day') returning id",
        ws,
        work_item,
        agent,
        status,
        prompt,
        f"sa4-{uuid4().hex}",
        days_ago,
    )
    return row["id"]


async def step(
    conn: psycopg.AsyncConnection,
    ws: Any,
    run_id: Any,
    seq: int,
    *,
    cost: str,
    days_ago: int,
    kind: str = "llm_call",
    status: str = "succeeded",
    payload: dict | None = None,
) -> None:
    await conn.execute(
        "insert into public.run_steps (workspace_id, run_id, seq, kind, model, cost_usd, status,"
        " payload, created_at) values (%s, %s, %s, %s, 'claude-opus-5-5', %s, %s, %s,"
        " now() - %s * interval '1 day')",
        (ws, run_id, seq, kind, Decimal(cost), status, Jsonb(payload or {}), days_ago),
    )


async def work_item(conn: psycopg.AsyncConnection, ws: Any, delivery: str, days_ago: int) -> Any:
    row = await one(
        conn,
        "insert into public.work_items (workspace_id, title, delivery_type, created_at)"
        " values (%s, %s, %s, now() - %s * interval '1 day') returning id",
        ws,
        f"Trabalho {delivery} (teste SA4)",
        delivery,
        days_ago,
    )
    return row["id"]


async def decide(
    conn: psycopg.AsyncConnection,
    ws: Any,
    item: Any,
    decision: str,
    days_ago: float,
    follow_up: str | None = None,
) -> None:
    await conn.execute(
        "insert into public.approvals (workspace_id, work_item_id, kind, requested_by_agent_id,"
        " status, decision, follow_up, decided_at, created_at)"
        " values (%s, %s, 'review', 'otto', 'decided', %s, %s, now() - %s * interval '1 day',"
        " now() - %s * interval '1 day')",
        (ws, item, decision, follow_up, days_ago, days_ago),
    )


@pytest.fixture
async def atelie(admin_db: psycopg.AsyncConnection) -> AsyncIterator[dict[str, Any]]:
    """Conta fictícia com números conhecidos (custos em US$, câmbio do seed 5,40):

    - 10 créditos cobrados hoje (reserva + captura de um run sem chamada de IA);
    - entrega W1 (04.01, prompt v1 do Otto): run há 10 dias, 1 chamada de US$ 0,02; aprovada de
      primeira há 9 dias;
    - conversa B há 9 dias: 1 chamada de US$ 0,02;
    - entrega W2 (04.01, prompt v2): run há 2 dias com chamada de US$ 0,02, autoverificação
      reprovada (erro do agente) e uma chamada com falha; ajuste pedido há 1 dia, aprovada hoje;
    - entrega W3 (02.01): rejeitada e cancelada há 3 dias;
    - conversa D há 1 dia: 1 chamada de US$ 0,02.

    Total US$ 0,08 em 4 turnos: R$ 0,432 de IA, R$ 0,0432 por crédito, margem 91,36% com o crédito
    a R$ 0,50 e custo por turno estável (tendência 0): dentro das três faixas."""
    slug = f"atelie-lume-{uuid4().hex[:8]}"
    ws = (
        await one(
            admin_db,
            "insert into public.workspaces (name, slug) values ('Ateliê Lume', %s) returning id",
            slug,
        )
    )["id"]
    await admin_db.execute("insert into public.credit_accounts (workspace_id) values (%s)", (ws,))
    await admin_db.execute(
        "select app.grant_credits(%s, 20, 'bonus', %s)", (ws, f"sa4-grant-{slug}")
    )
    charged = await run(admin_db, ws, agent="otto", days_ago=0)
    await admin_db.execute(
        "select app.reserve_credits(%s, 10, %s, '04.01')", (charged, f"sa4-hold-{slug}")
    )
    await admin_db.execute("select app.capture_credits(%s, 10)", (charged,))
    for content_hash, version in ((V1, 1), (V2, 2)):
        await admin_db.execute(
            "insert into public.agent_prompt_versions (agent_id, content_hash, delivery_type,"
            " origin, sources) values ('otto', %s, '04.01', 'database', %s)"
            " on conflict (agent_id, content_hash) do nothing",
            (
                content_hash,
                Jsonb([{"id": str(uuid4()), "kind": "soul", "key": "SOUL.md", "version": version}]),
            ),
        )

    w1 = await work_item(admin_db, ws, "04.01", 10)
    a = await run(admin_db, ws, agent="otto", days_ago=10, work_item=w1, prompt=V1)
    await step(admin_db, ws, a, 1, cost="0.02", days_ago=10)
    await decide(admin_db, ws, w1, "approved", 9)

    b = await run(admin_db, ws, agent="nexo", days_ago=9)
    await step(admin_db, ws, b, 1, cost="0.02", days_ago=9)

    w2 = await work_item(admin_db, ws, "04.01", 2)
    c = await run(admin_db, ws, agent="otto", days_ago=2, work_item=w2, prompt=V2)
    await step(admin_db, ws, c, 1, cost="0.02", days_ago=2)
    await step(admin_db, ws, c, 2, cost="0", days_ago=2, kind="check", payload={"approved": False})
    await step(
        admin_db,
        ws,
        c,
        3,
        cost="0",
        days_ago=2,
        status="failed",
        payload={"error": {"code": "llm_unavailable", "status_code": 529}},
    )
    await decide(admin_db, ws, w2, "changes_requested", 1)
    await decide(admin_db, ws, w2, "approved", 0.01)

    w3 = await work_item(admin_db, ws, "02.01", 3)
    await run(admin_db, ws, agent="bia", days_ago=3, work_item=w3)
    await decide(admin_db, ws, w3, "rejected", 3, follow_up="cancel")

    d = await run(admin_db, ws, agent="nexo", days_ago=1)
    await step(admin_db, ws, d, 1, cost="0.02", days_ago=1)

    yield {"id": ws, "slug": slug, "run_c": c}

    await admin_db.execute("delete from public.audit_events where workspace_id = %s", (ws,))
    await admin_db.execute("delete from public.workspaces where id = %s", (ws,))
    await admin_db.execute(
        "delete from public.agent_prompt_versions p where p.agent_id = 'otto'"
        " and p.content_hash in (%s, %s)"
        " and not exists (select 1 from public.runs r where r.prompt_version = p.content_hash)",
        (V1, V2),
    )


def row_of(body: dict, ws: Any) -> dict:
    return next(i for i in body["items"] if i["workspace_id"] == str(ws))


async def test_consumption_matches_the_known_numbers_and_stays_inside_the_bands(
    api, access_token, atelie
) -> None:
    response = await api.get(
        f"/admin/consumption?workspace_id={atelie['id']}&granularity=month",
        headers=bearer(access_token(VIC)),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    item = row_of(body, atelie["id"])
    assert item["requests"] == 3
    assert Decimal(item["credits_charged"]) == Decimal("10")
    assert item["llm_calls"] == 6
    assert item["conversation_calls"] == 2
    assert Decimal(item["ai_cost_deliveries_usd"]) == Decimal("0.04")
    assert Decimal(item["ai_cost_conversation_usd"]) == Decimal("0.04")
    assert Decimal(item["ai_cost_usd"]) == Decimal("0.08")
    assert item["turns"] == 4
    assert item["conversation_turns"] == 2
    assert Decimal(item["ai_cost_brl"]) == Decimal("0.432")
    assert Decimal(item["ai_cost_per_credit_brl"]) == Decimal("0.0432")
    economics = item["economics"]
    assert Decimal(economics["ai_cost_per_credit_brl"]) == Decimal("0.0432")
    assert Decimal(economics["gross_margin"]) == Decimal("0.9136")
    assert Decimal(economics["cost_per_turn_usd"]) == Decimal("0.02")
    assert Decimal(economics["cost_per_turn_trend"]) == Decimal("0")
    assert economics["alerts"] == []
    assert body["economics"] == economics
    assert body["trend_accounts"] == 1
    assert [r["metric"] for r in body["alert_rules"]] == [
        "ai_cost_per_credit_brl",
        "gross_margin",
        "cost_per_turn_trend",
    ]
    assert all(r["proposal"] for r in body["alert_rules"])
    margin_rule = body["alert_rules"][1]
    assert Decimal(margin_rule["credit_reference_brl"]) == Decimal("0.50")
    basis = body["margin_basis"]
    assert basis["provisional"] is True
    assert Decimal(basis["credit_reference_brl"]) == Decimal("0.50")
    assert Decimal(basis["exchange_rate"]["usd_brl"]) == Decimal("5.40")
    assert "exemplo" in basis["exchange_rate"]["fx_source"]
    assert body["granularity"] == "month"
    assert sum(Decimal(b["ai_cost_usd"]) for b in body["series"]) == Decimal("0.08")
    assert sum(b["turns"] for b in body["series"]) == 4

    days = await api.get(
        f"/admin/consumption?workspace_id={atelie['id']}&granularity=day",
        headers=bearer(access_token(VIC)),
    )
    series = days.json()["series"]
    assert len(series) == 6
    assert sum(Decimal(b["credits_charged"]) for b in series) == Decimal("10")

    alerts = await api.get("/admin/alerts", headers=bearer(access_token(VIC)))
    assert alerts.status_code == 200
    assert str(atelie["id"]) not in {a["workspace_id"] for a in alerts.json()["accounts"]}


async def test_crossing_the_bands_raises_the_three_alerts_and_changes_nothing(
    api, access_token, admin_db, atelie
) -> None:
    ws = atelie["id"]
    before = await one(
        admin_db,
        ACCOUNT_STATE,
        ws,
        ws,
    )
    await step(admin_db, ws, atelie["run_c"], 4, cost="0.42", days_ago=2)

    response = await api.get(
        f"/admin/consumption?workspace_id={ws}", headers=bearer(access_token(VIC))
    )
    economics = row_of(response.json(), ws)["economics"]
    assert Decimal(economics["ai_cost_per_credit_brl"]) == Decimal("0.27")
    assert Decimal(economics["gross_margin"]) == Decimal("0.46")
    assert Decimal(economics["cost_per_turn_trend"]) == Decimal("10.5")
    assert {a["metric"]: Decimal(a["threshold"]) for a in economics["alerts"]} == {
        "ai_cost_per_credit_brl": Decimal("0.15"),
        "gross_margin": Decimal("0.65"),
        "cost_per_turn_trend": Decimal("0.10"),
    }
    assert all(a["proposal"] for a in economics["alerts"])

    alerts = await api.get("/admin/alerts", headers=bearer(access_token(VIC)))
    account = next(a for a in alerts.json()["accounts"] if a["workspace_id"] == str(ws))
    assert account["workspace_name"] == "Ateliê Lume"
    assert [a["metric"] for a in account["alerts"]] == [
        "ai_cost_per_credit_brl",
        "gross_margin",
        "cost_per_turn_trend",
    ]

    after = await one(
        admin_db,
        ACCOUNT_STATE,
        ws,
        ws,
    )
    assert after == before


async def test_quality_by_type_month_and_prompt_version_with_how_to_read(
    api, access_token, atelie
) -> None:
    response = await api.get(
        f"/admin/quality?workspace_id={atelie['id']}&locale=en",
        headers=bearer(access_token(VIC)),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    by_type = {r["key"]: r for r in body["by_type"]}
    post = by_type["04.01"]
    assert (post["deliveries"], post["approved_first_time"], post["approved"]) == (2, 1, 2)
    assert (post["adjustments"], post["not_approved"]) == (1, 0)
    assert Decimal(post["ai_cost_usd"]) == Decimal("0.04")
    assert Decimal(post["ai_cost_per_approved_usd"]) == Decimal("0.02")
    assert (post["agent_errors"], post["failed_steps"], post["failed_runs"]) == (1, 1, 0)
    brand = by_type["02.01"]
    assert (brand["deliveries"], brand["not_approved"], brand["approved"]) == (1, 1, 0)
    assert brand["ai_cost_per_approved_usd"] is None
    assert sum(m["deliveries"] for m in body["by_month"]) == 3

    versions = {r["prompt_version"]: r for r in body["by_prompt_version"]}
    assert set(versions) == {V1, V2}
    assert (versions[V1]["approved_first_time"], versions[V1]["agent_errors"]) == (1, 0)
    assert (versions[V2]["approved_first_time"], versions[V2]["adjustments"]) == (0, 1)
    assert versions[V2]["agent_errors"] == 1
    assert versions[V2]["origin"] == "database"
    assert versions[V2]["sources"][0]["version"] == 2
    assert versions[V1]["agent_id"] == "otto"

    assert body["locale"] == "en"
    keys = [h["key"] for h in body["how_to_read"]]
    assert keys == [
        "approved_first",
        "adjustments",
        "not_approved",
        "cost_per_approved",
        "agent_error",
        "failed_call",
        "rates",
    ]
    assert body["how_to_read"][0]["title"] == "Approved first time"
    for locale, title in (("pt-BR", "Aprovada de primeira"), ("es", "Aprobada a la primera")):
        localized = await api.get(
            f"/admin/quality?locale={locale}", headers=bearer(access_token(VIC))
        )
        assert localized.json()["how_to_read"][0]["title"] == title


async def test_comparing_two_periods_turns_counts_into_rates(api, access_token, atelie) -> None:
    today = datetime.now(DISPLAY_TZ).date()
    a = (today - timedelta(days=13), today - timedelta(days=5))
    b = (today - timedelta(days=4), today)
    response = await api.get(
        f"/admin/quality/compare?workspace_id={atelie['id']}"
        f"&a_since={a[0]}&a_until={a[1]}&b_since={b[0]}&b_until={b[1]}",
        headers=bearer(access_token(VIC)),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["a"]["totals"]["deliveries"] == 1
    assert body["b"]["totals"]["deliveries"] == 2
    ra, rb, delta = body["a"]["rates"], body["b"]["rates"], body["delta"]
    assert Decimal(ra["approved_first_rate"]) == Decimal("1")
    assert Decimal(rb["approved_first_rate"]) == Decimal("0")
    assert Decimal(rb["adjustments_per_delivery"]) == Decimal("0.5")
    assert Decimal(rb["not_approved_rate"]) == Decimal("0.5")
    assert Decimal(rb["agent_errors_per_100"]) == Decimal("50")
    assert Decimal(rb["failed_calls_per_100"]) == Decimal("50")
    assert Decimal(delta["approved_first_rate"]) == Decimal("-1")
    assert Decimal(delta["agent_errors_per_100"]) == Decimal("50")
    assert [v["prompt_version"] for v in body["a"]["prompt_versions"]] == [V1]
    assert [v["prompt_version"] for v in body["b"]["prompt_versions"]] == [V2]

    wrong = await api.get(
        f"/admin/quality/compare?a_since={a[1]}&a_until={a[0]}&b_since={b[0]}&b_until={b[1]}",
        headers=bearer(access_token(VIC)),
    )
    assert wrong.status_code == 422
    assert wrong.json()["error"]["code"] == "invalid_period"


@pytest.fixture
async def anthropic_balance(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    """Parte do estado do seed (sem saldo informado), mesmo com saldo informado antes pelo painel, e tira o
    que o teste gravou."""

    async def reset() -> None:
        await admin_db.execute("delete from public.provider_balance_reports")
        await admin_db.execute(
            "update public.provider_health set reported_balance = null,"
            " reported_balance_currency = null, reported_balance_at = null, alert_below = null"
        )

    await reset()
    yield
    await reset()
    await admin_db.execute(
        "delete from public.audit_events where action = 'admin.provider_balance_reported'"
    )


async def test_reported_balance_is_audited_and_alerts_below_the_threshold(
    api, access_token, admin_db, anthropic_balance
) -> None:
    read_at = (datetime.now().astimezone() - timedelta(hours=1)).isoformat()
    reason = "Saldo lido no console da Anthropic (teste SA4)"
    response = await api.patch(
        "/admin/providers/anthropic/balance",
        headers=bearer(access_token(VIC)),
        json={
            "amount": "38.00",
            "currency": "USD",
            "read_at": read_at,
            "reason": reason,
            "alert_below": "50.00",
        },
    )
    assert response.status_code == 200, response.text
    item = response.json()
    assert Decimal(item["reported_balance"]) == Decimal("38")
    assert item["reported_balance_currency"] == "USD"
    assert Decimal(item["alert_below"]) == Decimal("50")
    assert item["balance_alert"] is True
    assert item["key"] in {"configured", "missing"}
    history = item["balance_history"]
    assert history[0]["reason"] == reason
    assert history[0]["reported_by_email"] == VIC

    audit = await one(
        admin_db,
        "select actor_id, entity_type, entity_id, payload from public.audit_events"
        " where action = 'admin.provider_balance_reported' order by created_at desc limit 1",
    )
    vic = await one(admin_db, "select id::text as id from auth.users where email = %s", VIC)
    assert audit["actor_id"] == vic["id"]
    assert (audit["entity_type"], audit["entity_id"]) == ("provider_health", "anthropic")
    assert audit["payload"]["reason"] == reason
    assert audit["payload"]["platform_admin"] is True
    assert Decimal(str(audit["payload"]["amount"])) == Decimal("38")

    alerts = await api.get("/admin/alerts", headers=bearer(access_token(VIC)))
    assert [p["provider"] for p in alerts.json()["providers"]] == ["anthropic"]

    log = await api.get(
        "/admin/audit?actor=platform_admin&category=configuration",
        headers=bearer(access_token(VIC)),
    )
    assert "admin.provider_balance_reported" in {i["action"] for i in log.json()["items"]}

    again = await api.patch(
        "/admin/providers/anthropic/balance",
        headers=bearer(access_token(VIC)),
        json={"amount": "80", "currency": "USD", "read_at": read_at, "reason": reason},
    )
    assert again.status_code == 200
    assert Decimal(again.json()["alert_below"]) == Decimal("50")
    assert again.json()["balance_alert"] is False
    assert len(again.json()["balance_history"]) == 2


@pytest.mark.parametrize(
    ("path", "payload", "status", "code"),
    [
        ("anthropic", {"reason": "curto"}, 422, "validation_error"),
        ("anthropic", {"currency": "usd"}, 422, "validation_error"),
        ("anthropic", {"amount": "-1"}, 422, "validation_error"),
        ("anthropic", {"read_at": "2099-01-01T00:00:00Z"}, 422, "invalid_parameter"),
        ("meta", {}, 404, "not_found"),
    ],
)
async def test_invalid_balance_reports_are_refused(
    api, access_token, admin_db, anthropic_balance, path, payload, status, code
) -> None:
    body = {
        "amount": "10",
        "currency": "USD",
        "read_at": datetime.now().astimezone().isoformat(),
        "reason": "Saldo lido no painel do provedor",
    } | payload
    response = await api.patch(
        f"/admin/providers/{path}/balance", headers=bearer(access_token(VIC)), json=body
    )
    assert response.status_code == status, response.text
    assert response.json()["error"]["code"] == code
    count = await one(admin_db, "select count(*) as n from public.provider_balance_reports")
    assert count["n"] == 0


async def test_member_cannot_report_a_balance(
    api, access_token, admin_db, anthropic_balance
) -> None:
    response = await api.patch(
        "/admin/providers/anthropic/balance",
        headers=bearer(access_token(MARINA)),
        json={
            "amount": "10",
            "currency": "USD",
            "read_at": datetime.now().astimezone().isoformat(),
            "reason": "Tentativa de quem não é Super Admin",
        },
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "platform_admin_only"
    state = await one(
        admin_db,
        "select reported_balance, (select count(*) from public.provider_balance_reports) as n"
        " from public.provider_health where provider = 'anthropic'",
    )
    assert state == {"reported_balance": None, "n": 0}


async def test_provider_activity_comes_from_run_steps(api, access_token, admin_db, atelie) -> None:
    before = await api.get("/admin/providers", headers=bearer(access_token(VIC)))
    anthropic = next(i for i in before.json()["items"] if i["provider"] == "anthropic")
    await step(admin_db, atelie["id"], atelie["run_c"], 5, cost="0.30", days_ago=0)
    await step(
        admin_db,
        atelie["id"],
        atelie["run_c"],
        6,
        cost="0",
        days_ago=0,
        status="failed",
        payload={"error": {"code": "llm_unavailable", "status_code": 529}},
    )
    after = await api.get("/admin/providers", headers=bearer(access_token(VIC)))
    items = {i["provider"]: i for i in after.json()["items"]}
    now = items["anthropic"]
    assert now["calls_24h"] == anthropic["calls_24h"] + 2
    assert now["failures_24h"] == anthropic["failures_24h"] + 1
    spent = Decimal(now["spend_usd"]["h24"]) - Decimal(anthropic["spend_usd"]["h24"])
    assert spent == Decimal("0.3")
    assert Decimal(now["spend_usd"]["total"]) - Decimal(anthropic["spend_usd"]["total"]) == spent
    assert now["last_failure_text"] == "llm_unavailable 529"
    if not get_settings().anthropic_api_key:
        assert now["status"] == "simulated"
    assert items["asaas"]["calls_24h"] is None and items["asaas"]["spend_usd"] is None
    assert items["email"]["spend_usd"] is None
    assert isinstance(items["email"]["calls_24h"], int)
    assert items["image_engine"]["status"] == "not_integrated"
