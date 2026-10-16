"""H2-05: a mensagem dos erros da API sai do catálogo no idioma da pessoa; sem ele, no do negócio
da rota (só para quem é membro); sem os dois, em pt-BR, igual ao texto de antes. O `code` não muda.
"""

from collections.abc import AsyncIterator
from pathlib import Path
from uuid import uuid4

import httpx
import psycopg
import pytest

from hellosquad.config import Settings

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
RAFAEL = "rafael@vitta.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
SEED_PASSWORD = "Senha!Teste123"


@pytest.fixture(autouse=True)
async def seed_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    yield
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


def fresh_token(email: str) -> str:
    """Login novo (o token guardado pela sessão não traria o idioma gravado agora)."""
    settings = Settings()
    response = httpx.post(
        f"{settings.supabase_url}/auth/v1/token",
        params={"grant_type": "password"},
        headers={"apikey": settings.supabase_publishable_key},
        json={"email": email, "password": SEED_PASSWORD},
        timeout=10,
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def workspace(admin_db: psycopg.AsyncConnection, slug: str, locale: str) -> str:
    cursor = await admin_db.execute(
        "update public.workspaces set locale = %s where slug = %s returning id", (locale, slug)
    )
    return str((await cursor.fetchone())[0])


async def test_error_message_follows_the_person_locale(api, admin_db) -> None:
    await admin_db.execute(
        'update auth.users set raw_user_meta_data = raw_user_meta_data || \'{"locale": "en"}\' '
        "where email = %s",
        (MARINA,),
    )
    headers = bearer(fresh_token(MARINA))

    missing = await api.get(f"/conversations/{uuid4()}", headers=headers)
    assert missing.status_code == 404
    assert missing.json()["error"] == {
        "code": "not_found",
        "message": "Conversation not found.",
        "details": [],
    }

    invalid = await api.post("/workspaces", headers=headers, json={"name": "Miolo\nNovo"})
    assert invalid.status_code == 422
    error = invalid.json()["error"]
    assert (error["code"], error["message"]) == ("validation_error", "Invalid data.")
    assert {
        "field": "name",
        "message": "The name cannot contain line breaks, control characters, < or >.",
    } in error["details"]
    assert {"field": "slug", "message": "Required field."} in error["details"]


async def test_without_person_locale_the_workspace_locale_answers(
    api, access_token, admin_db
) -> None:
    vitta = await workspace(admin_db, "vitta", "es")
    rafael = bearer(access_token(RAFAEL))

    invalid = await api.post(f"/workspaces/{vitta}/conversations", headers=rafael, json={})
    assert invalid.status_code == 422
    error = invalid.json()["error"]
    assert (error["code"], error["message"]) == ("validation_error", "Datos no válidos.")
    assert {"field": "kind", "message": "Campo obligatorio."} in error["details"]

    # Quem não é membro não descobre o idioma do negócio: 404 em pt-BR, como antes.
    outsider = await api.post(
        f"/workspaces/{vitta}/conversations",
        headers=bearer(access_token(MARINA)),
        json={"kind": "agent_direct", "primary_agent_id": "otto"},
    )
    assert outsider.status_code == 404
    assert outsider.json()["error"]["message"] == "Workspace não encontrado."

    await workspace(admin_db, "vitta", "pt-BR")
    same = await api.post(f"/workspaces/{vitta}/conversations", headers=rafael, json={})
    assert same.json()["error"]["message"] == "Dados inválidos."
    assert {"field": "kind", "message": "Campo obrigatório."} in same.json()["error"]["details"]
