"""Integração da S0 com o Supabase local: JWT real da Auth, RLS valendo na API e na Data API."""

import base64
import json
from collections.abc import AsyncIterator
from uuid import uuid4

import httpx
import psycopg
import pytest

from hellosquad.api.main import app
from hellosquad.config import get_settings
from hellosquad.db import Database, UnsafeDatabaseRoleError

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
RAFAEL = "rafael@vitta.example"
CARLA = "carla@vitta.example"
PEDRO = "pedro@semconta.example"


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def scalar(conn: psycopg.AsyncConnection, query: str, *params: object) -> object:
    row = await (await conn.execute(query, params)).fetchone()
    return row[0] if row else None


async def workspace_id(conn: psycopg.AsyncConnection, slug: str) -> str:
    return str(await scalar(conn, "select id from public.workspaces where slug = %s", slug))


async def user_id(conn: psycopg.AsyncConnection, email: str) -> str:
    return str(await scalar(conn, "select id from auth.users where email = %s", email))


async def membership_count(conn: psycopg.AsyncConnection, workspace: str, user: str) -> int:
    return await scalar(
        conn,
        "select count(*) from public.memberships where workspace_id = %s and user_id = %s",
        workspace,
        user,
    )


@pytest.fixture
async def created_slugs(admin_db: psycopg.AsyncConnection) -> AsyncIterator[list[str]]:
    """Workspaces criados no teste saem no fim, com a trilha de auditoria deles."""
    slugs: list[str] = []
    yield slugs
    for slug in slugs:
        await admin_db.execute(
            "delete from public.audit_events where workspace_id in "
            "(select id from public.workspaces where slug = %s)",
            (slug,),
        )
        await admin_db.execute("delete from public.workspaces where slug = %s", (slug,))


async def test_me_returns_user_and_memberships(api, access_token) -> None:
    response = await api.get("/me", headers=bearer(access_token(MARINA)))

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == MARINA
    assert body["user"]["full_name"] == "Marina Costa"
    assert [(m["workspace"]["slug"], m["role"]) for m in body["memberships"]] == [
        ("miolo", "owner")
    ]


async def test_marina_lists_only_miolo(api, access_token) -> None:
    response = await api.get("/workspaces", headers=bearer(access_token(MARINA)))

    assert response.status_code == 200
    assert [(w["slug"], w["name"], w["role"]) for w in response.json()["items"]] == [
        ("miolo", "Miolo", "owner")
    ]


async def test_pedro_without_membership_gets_empty_lists(api, access_token) -> None:
    headers = bearer(access_token(PEDRO))

    workspaces = await api.get("/workspaces", headers=headers)
    me = await api.get("/me", headers=headers)

    assert workspaces.status_code == 200
    assert workspaces.json() == {"items": []}
    assert me.json()["memberships"] == []


async def test_workspace_of_another_tenant_answers_not_found(api, access_token, admin_db) -> None:
    vitta = await workspace_id(admin_db, "vitta")

    outsider = await api.get(f"/workspaces/{vitta}", headers=bearer(access_token(MARINA)))
    member = await api.get(f"/workspaces/{vitta}", headers=bearer(access_token(CARLA)))
    missing = await api.get(f"/workspaces/{uuid4()}", headers=bearer(access_token(MARINA)))

    assert outsider.status_code == 404
    assert outsider.json() == missing.json()
    assert outsider.json()["error"]["code"] == "workspace_not_found"
    assert member.status_code == 200
    assert (member.json()["slug"], member.json()["role"]) == ("vitta", "editor")


async def test_pedro_creates_workspace_and_becomes_owner(
    api, access_token, admin_db, created_slugs
) -> None:
    slug = f"padaria-do-pedro-{uuid4().hex[:8]}"
    created_slugs.append(slug)
    headers = bearer(access_token(PEDRO))

    response = await api.post(
        "/workspaces", headers=headers, json={"name": "  Padaria do Pedro ", "slug": slug.upper()}
    )

    assert response.status_code == 201
    created = response.json()
    assert (created["slug"], created["name"], created["role"]) == (
        slug,
        "Padaria do Pedro",
        "owner",
    )
    assert response.headers["location"] == f"/workspaces/{created['id']}"
    me = (await api.get("/me", headers=headers)).json()
    assert [(m["workspace"]["id"], m["role"]) for m in me["memberships"]] == [
        (created["id"], "owner")
    ]
    assert (await api.get(f"/workspaces/{created['id']}", headers=headers)).status_code == 200
    audit = await (
        await admin_db.execute(
            "select actor_type::text, actor_id, action, entity_id "
            "from public.audit_events where workspace_id = %s",
            (created["id"],),
        )
    ).fetchall()
    # S2c: o negócio nasce com a conversa de boas-vindas do Nexo (A2a §5 item 3).
    welcome = await (
        await admin_db.execute(
            "select id::text from public.conversations where workspace_id = %s and welcome",
            (created["id"],),
        )
    ).fetchone()
    assert sorted(audit, key=lambda row: row[2]) == [
        ("user", me["user"]["id"], "conversation.created", welcome[0]),
        ("user", me["user"]["id"], "workspace.created", created["id"]),
    ]


async def test_short_slug_gets_validation_error_in_portuguese(api, access_token) -> None:
    response = await api.post(
        "/workspaces", headers=bearer(access_token(PEDRO)), json={"name": "Pedro", "slug": "ab"}
    )

    assert response.status_code == 422
    assert response.json()["error"]["details"] == [{"field": "slug", "message": "Curto demais."}]


async def test_taken_slug_is_a_conflict(api, access_token) -> None:
    response = await api.post(
        "/workspaces", headers=bearer(access_token(PEDRO)), json={"name": "Outra", "slug": "miolo"}
    )

    assert response.status_code == 409
    assert response.json()["error"] == {
        "code": "slug_taken",
        "message": "Já existe um workspace com esse endereço (slug).",
        "details": [],
    }


async def test_reserved_slugs_are_refused(api, access_token, admin_db) -> None:
    reserved = await scalar(admin_db, "select app.reserved_workspace_slugs()")
    headers = bearer(access_token(PEDRO))

    for slug in [*reserved, " Novo-Workspace "]:
        response = await api.post(
            "/workspaces", headers=headers, json={"name": "Reservado", "slug": slug}
        )
        assert response.status_code == 422, slug
        assert response.json()["error"] == {
            "code": "slug_reserved",
            "message": "Esse endereço é reservado. Escolha outro.",
            "details": [],
        }

    assert "novo-workspace" in reserved
    leftovers = await scalar(
        admin_db, "select count(*) from public.workspaces where slug = any (%s)", reserved
    )
    assert leftovers == 0


async def test_invalid_payload_gets_validation_error_in_portuguese(api, access_token) -> None:
    response = await api.post(
        "/workspaces",
        headers=bearer(access_token(PEDRO)),
        json={"name": "   ", "slug": "slug com espaço", "role": "owner"},
    )

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert error["message"] == "Dados inválidos."
    assert {(d["field"], d["message"]) for d in error["details"]} == {
        ("name", "Texto curto demais."),
        ("slug", "Formato inválido."),
        ("role", "Campo não aceito."),
    }


async def test_carla_cannot_create_membership_through_the_data_api(access_token, admin_db) -> None:
    settings = get_settings()
    vitta, pedro = await workspace_id(admin_db, "vitta"), await user_id(admin_db, PEDRO)

    async with httpx.AsyncClient(base_url=settings.supabase_url) as client:
        response = await client.post(
            "/rest/v1/memberships",
            headers={
                "apikey": settings.supabase_publishable_key,
                **bearer(access_token(CARLA)),
            },
            json={"workspace_id": vitta, "user_id": pedro, "role": "viewer"},
        )

    assert response.status_code == 403
    assert response.json()["code"] == "42501"
    assert await membership_count(admin_db, vitta, pedro) == 0


async def test_carla_cannot_create_membership_through_the_api_connection(
    api, access_token, admin_db
) -> None:
    vitta, pedro = await workspace_id(admin_db, "vitta"), await user_id(admin_db, PEDRO)
    carla = app.state.token_verifier.verify(access_token(CARLA))

    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        async with app.state.database.transaction_as(carla) as conn:
            await conn.execute(
                "insert into public.memberships (workspace_id, user_id, role) "
                "values (%s, %s, 'viewer')",
                (vitta, pedro),
            )

    assert await membership_count(admin_db, vitta, pedro) == 0


async def test_rafael_can_create_membership_through_the_data_api(access_token, admin_db) -> None:
    settings = get_settings()
    vitta, pedro = await workspace_id(admin_db, "vitta"), await user_id(admin_db, PEDRO)

    try:
        async with httpx.AsyncClient(base_url=settings.supabase_url) as client:
            response = await client.post(
                "/rest/v1/memberships",
                headers={
                    "apikey": settings.supabase_publishable_key,
                    **bearer(access_token(RAFAEL)),
                },
                json={"workspace_id": vitta, "user_id": pedro, "role": "viewer"},
            )
        assert response.status_code == 201
        assert await membership_count(admin_db, vitta, pedro) == 1
    finally:
        await admin_db.execute(
            "delete from public.memberships where workspace_id = %s and user_id = %s",
            (vitta, pedro),
        )


async def test_rls_applies_inside_the_api_connection(api, access_token) -> None:
    marina = app.state.token_verifier.verify(access_token(MARINA))

    async with app.state.database.transaction_as(marina) as conn:
        identity = await (await conn.execute("select current_user, session_user")).fetchone()
        cursor = await conn.execute("select slug from public.workspaces order by 1")
        rows = await cursor.fetchall()

    assert identity == {"current_user": "authenticated", "session_user": "hellosquad_api"}
    assert [row["slug"] for row in rows] == ["miolo"]


async def test_user_identity_does_not_survive_the_transaction(api, access_token) -> None:
    await api.get("/workspaces", headers=bearer(access_token(MARINA)))

    async with app.state.database._pool.connection() as conn:
        state = await (
            await conn.execute(
                "select current_user, coalesce(current_setting('request.jwt.claims', true), '') "
                "as claims"
            )
        ).fetchone()

    assert state == {"current_user": "hellosquad_api", "claims": ""}


async def test_api_role_cannot_rewrite_audit_events(api, access_token) -> None:
    rafael = app.state.token_verifier.verify(access_token(RAFAEL))

    for statement in (
        "update public.audit_events set action = 'workspace.forged'",
        "delete from public.audit_events",
    ):
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            async with app.state.database.transaction_as(rafael) as conn:
                await conn.execute(statement)


async def test_api_role_alone_has_no_access() -> None:
    settings = get_settings()

    async with await psycopg.AsyncConnection.connect(
        settings.api_database_url.get_secret_value()
    ) as conn:
        role = await (
            await conn.execute(
                "select rolsuper, rolbypassrls from pg_roles where rolname = current_user"
            )
        ).fetchone()
        assert role == (False, False)
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            await conn.execute("select 1 from public.workspaces")


async def test_api_refuses_a_database_role_that_bypasses_rls() -> None:
    database = Database(get_settings().database_url.get_secret_value(), min_size=1, max_size=1)

    with pytest.raises(UnsafeDatabaseRoleError):
        await database.open()


async def test_missing_token_is_unauthorized(api) -> None:
    response = await api.get("/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json()["error"]["code"] == "not_authenticated"


@pytest.mark.parametrize("token", ["abc", "a.b.c", ""], ids=["lixo", "tres-partes", "vazio"])
async def test_invalid_token_is_unauthorized(api, token) -> None:
    response = await api.get("/workspaces", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] in {"invalid_token", "not_authenticated"}


async def test_tampered_token_is_unauthorized(api, access_token, admin_db) -> None:
    header, payload, signature = access_token(PEDRO).split(".")
    claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    claims["sub"] = await user_id(admin_db, MARINA)
    forged_payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).rstrip(b"=").decode()

    response = await api.get(
        "/workspaces", headers=bearer(f"{header}.{forged_payload}.{signature}")
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_token"


async def test_unknown_route_uses_the_error_envelope(api) -> None:
    response = await api.get("/nao-existe")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
