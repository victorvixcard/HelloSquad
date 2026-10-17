"""Integração da SA1: rotas /admin/* só para o Super Admin (Vic fictício); owner comum e quem não
tem membership recebem 403 em todas; a Data API não expõe nada do painel; nenhuma resposta leva
segredo; ler o detalhe de uma conta fica em audit_events como acesso do suporte."""

import re
from typing import Any
from uuid import UUID

import httpx
import psycopg
import pytest
from psycopg.rows import dict_row

from hellosquad.api.main import app
from hellosquad.config import get_settings
from hellosquad.db import NotPlatformAdminError

pytestmark = pytest.mark.integration

VIC = "vic@hellosquad.example"
MARINA = "marina@miolo.example"
PEDRO = "pedro@semconta.example"

SA_OBJECTS = [
    "platform_admins",
    "support_access_log",
    "topups",
    "topup_versions",
    "delivery_catalog",
    "business_rule_docs",
    "business_rule_doc_versions",
    "reference_items",
    "model_pricing",
    "task_model_rules",
    "provider_health",
    "v_consumo_por_cliente",
    "v_qualidade_entregas",
    "v_fila",
    "v_fila_filas",
]

SECRET_MARKERS = re.compile(r"sb_|eyJ|ASAAS|MP_")


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def one(conn: psycopg.AsyncConnection, query: str, *params: object) -> dict[str, Any]:
    cursor = conn.cursor(row_factory=dict_row)
    await cursor.execute(query, params)
    return await cursor.fetchone()


async def admin_paths(admin_db: psycopg.AsyncConnection) -> list[str]:
    """Todas as rotas GET /admin/* do app, com os parâmetros preenchidos pelo seed."""
    miolo = (await one(admin_db, "select id from public.workspaces where slug = 'miolo'"))["id"]
    run = (
        await one(admin_db, "select id from public.runs where workspace_id = %s limit 1", miolo)
    )["id"]
    soul = (
        await one(
            admin_db,
            "select id from public.squad_versions"
            " where kind = 'soul' and agent_id = 'otto' and status = 'active'",
        )
    )["id"]
    doc = (
        await one(
            admin_db, "select id from public.business_rule_docs where slug = 'diretrizes-do-dono'"
        )
    )["id"]
    query = {
        "/admin/squad/versions": "?kind=soul&agent_id=otto",
        "/admin/squad/diff": f"?from={soul}&to={soul}",
        "/admin/squad/agents/{agent_id}/prompt": "?route=04.01",
    }
    filled = {
        "{workspace_id}": miolo,
        "{run_id}": run,
        "{agent_id}": "otto",
        "{delivery_type}": "04.01",
        "{doc}": "README.md",
        "{version_id}": soul,
        "{doc_id}": doc,
    }
    paths = []
    for path, operations in app.openapi()["paths"].items():
        if not path.startswith("/admin/") or "get" not in operations:
            continue
        url = path + query.get(path, "")
        for name, value in filled.items():
            url = url.replace(name, str(value))
        paths.append(url)
    assert len(paths) == 23, paths
    return paths


@pytest.mark.parametrize("email", [MARINA, PEDRO])
async def test_owner_and_user_without_membership_get_403_on_every_admin_route(
    api, access_token, admin_db, email
) -> None:
    for path in await admin_paths(admin_db):
        response = await api.get(path, headers=bearer(access_token(email)))
        assert response.status_code == 403, (path, response.status_code)
        error = response.json()["error"]
        assert error["code"] == "platform_admin_only"
        assert error["message"] == "Só o Super Admin da plataforma acessa o painel."


async def test_admin_routes_require_a_token(api, admin_db) -> None:
    for path in await admin_paths(admin_db):
        response = await api.get(path)
        assert response.status_code == 401, path


async def test_vic_reads_every_admin_route_without_secrets(api, access_token, admin_db) -> None:
    settings = get_settings()
    secrets = [
        s.get_secret_value()
        for s in (
            settings.anthropic_api_key,
            settings.asaas_api_key,
            settings.asaas_webhook_token,
            settings.mercadopago_access_token,
            settings.mercadopago_webhook_secret,
            settings.payment_mock_webhook_secret,
            settings.supabase_secret_key,
            settings.supabase_jwt_secret,
        )
        if s is not None and s.get_secret_value()
    ] + [settings.supabase_publishable_key]
    for path in await admin_paths(admin_db):
        response = await api.get(path, headers=bearer(access_token(VIC)))
        assert response.status_code == 200, (path, response.text[:300])
        assert not SECRET_MARKERS.search(response.text), path
        assert not any(secret and secret in response.text for secret in secrets), path


async def test_vic_sees_seeded_panel_data(api, access_token) -> None:
    headers = bearer(access_token(VIC))

    me = (await api.get("/admin/me", headers=headers)).json()
    assert me["email"] == VIC and me["mfa_enforced"] is False

    accounts = (await api.get("/admin/accounts", headers=headers)).json()
    slugs = {a["slug"] for a in accounts["items"]}
    assert {"miolo", "vitta", "trilha"} <= slugs
    assert accounts["totals"]["accounts"] >= 3
    miolo = next(a for a in accounts["items"] if a["slug"] == "miolo")
    assert miolo["owner_email"] == MARINA and miolo["plan"]["slug"] == "squad"

    first = (await api.get("/admin/accounts", params={"limit": 1}, headers=headers)).json()
    second = (
        await api.get(
            "/admin/accounts", params={"limit": 1, "cursor": first["next_cursor"]}, headers=headers
        )
    ).json()
    assert first["next_cursor"] and second["items"][0]["id"] != first["items"][0]["id"]

    catalog = (await api.get("/admin/catalog", headers=headers)).json()["items"]
    assert len(catalog) == 46
    assert not any(item["for_sale"] for item in catalog)
    assert {item["depth_source"] for item in catalog} == {"inferred"}
    assert all(item["price"]["provisional"] for item in catalog)
    otto = (await api.get("/admin/catalog", params={"agent_id": "otto"}, headers=headers)).json()
    assert [i["delivery_type"] for i in otto["items"]][:2] == ["04.01", "04.02"]

    plans = (await api.get("/admin/plans", headers=headers)).json()
    assert {p["slug"] for p in plans["plans"]} >= {"free", "squad"}
    assert not any(p["for_sale"] for p in plans["plans"] + plans["topups"])
    assert all(p["provisional"] for p in plans["plans"])

    payments = (await api.get("/admin/payments", headers=headers)).json()
    assert {p["provider"] for p in payments["providers"]} == {"asaas", "mercadopago", "mock"}
    assert {p["api_key"] for p in payments["providers"]} <= {
        "configured",
        "missing",
        "not_applicable",
    }

    providers = (await api.get("/admin/providers", headers=headers)).json()["items"]
    assert [p["provider"] for p in providers] == [
        "anthropic",
        "image_engine",
        "asaas",
        "mercadopago",
        "email",
    ]

    models = (await api.get("/admin/models", headers=headers)).json()
    assert len(models["prices"]) == 5 and len(models["rules"]) == 8
    assert models["rules"][0]["agent_id"] == "nexo"

    queue = (await api.get("/admin/queue", headers=headers)).json()
    assert {q["queue_name"] for q in queue["queues"]} == {
        "runs_interactive",
        "runs_scheduled",
        "memory_reflect",
        "external_actions",
        "email_outbox",
    }
    run = queue["runs"][0]
    detail = (await api.get(f"/admin/queue/runs/{run['id']}", headers=headers)).json()
    assert detail["run"]["id"] == run["id"]

    bad = await api.get(
        "/admin/consumption", params={"since": "2026-10-16", "until": "2026-10-01"}, headers=headers
    )
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "invalid_period"

    missing = await api.get("/admin/accounts/00000000-0000-4000-8000-000000000000", headers=headers)
    assert missing.status_code == 404 and missing.json()["error"]["code"] == "not_found"


async def test_account_detail_is_audited_as_support_access(api, access_token, admin_db) -> None:
    miolo = (await one(admin_db, "select id from public.workspaces where slug = 'miolo'"))["id"]
    vic = (await one(admin_db, "select id from auth.users where email = %s", VIC))["id"]
    headers = bearer(access_token(VIC))

    detail = (await api.get(f"/admin/accounts/{miolo}", headers=headers)).json()

    assert [m["email"] for m in detail["members"]] == [MARINA]
    event = await one(
        admin_db, "select * from public.audit_events where id = %s", UUID(detail["audit_event_id"])
    )
    assert event["action"] == "support.account_viewed"
    assert event["workspace_id"] == miolo and event["actor_id"] == str(vic)
    assert event["payload"]["platform_admin"] is True
    assert event["payload"]["category"] == "support_access"

    audit = (
        await api.get(
            "/admin/audit",
            params={"actor": "platform_admin", "category": "support_access", "workspace_id": miolo},
            headers=headers,
        )
    ).json()
    assert audit["items"][0]["id"] == detail["audit_event_id"]
    assert audit["items"][0]["actor_email"] == VIC

    customers = (
        await api.get("/admin/audit", params={"actor": "customer"}, headers=headers)
    ).json()
    assert all(item["actor"] == "customer" for item in customers["items"])


async def test_admin_role_reads_nothing_without_a_platform_admin_jwt(
    api, access_token, admin_db
) -> None:
    marina = app.state.token_verifier.verify(access_token(MARINA))

    with pytest.raises(NotPlatformAdminError):
        async with app.state.database.transaction_as_admin(marina):
            pass

    # Mesmo que a API assumisse o papel do painel sem conferir, as políticas não deixam ler nada.
    async with app.state.database.transaction_as(marina) as conn:
        await conn.execute("select set_config('role', 'hellosquad_admin', true)")
        row = await (
            await conn.execute(
                "select (select count(*) from public.workspaces) + "
                "(select count(*) from public.delivery_catalog) + "
                "(select count(*) from public.platform_admins) as n"
            )
        ).fetchone()
    assert row["n"] == 0


@pytest.mark.parametrize("name", SA_OBJECTS)
async def test_data_api_does_not_expose_the_panel(access_token, name) -> None:
    settings = get_settings()
    async with httpx.AsyncClient(base_url=settings.supabase_url) as client:
        anon = await client.get(
            f"/rest/v1/{name}", headers={"apikey": settings.supabase_publishable_key}
        )
        vic = await client.get(
            f"/rest/v1/{name}",
            headers={"apikey": settings.supabase_publishable_key, **bearer(access_token(VIC))},
        )
        marina = await client.get(
            f"/rest/v1/{name}",
            headers={"apikey": settings.supabase_publishable_key, **bearer(access_token(MARINA))},
        )
    assert anon.status_code == 401 and anon.json()["code"] == "42501"
    assert vic.status_code == 403 and vic.json()["code"] == "42501"
    assert marina.status_code == 403 and marina.json()["code"] == "42501"
