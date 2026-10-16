"""H1-01: o token de acesso que o browser recebe para o Realtime vale no máximo 1 h, e trocar a
senha pede reautenticação (`secure_password_change`). Usuário fictício, apagado no fim."""

import base64
import json
import time
import tomllib
import uuid
from collections.abc import Iterator
from pathlib import Path

import httpx
import psycopg
import pytest

from hellosquad.config import get_settings

CONFIG_TOML = Path(__file__).resolve().parents[3] / "supabase" / "config.toml"
ONE_HOUR = 3600
PASSWORD = "Senha!Teste123"


def claims(token: str) -> dict:
    payload = token.split(".")[1]
    return json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))


def auth(path: str, **kwargs) -> httpx.Response:
    settings = get_settings()
    headers = {"apikey": settings.supabase_publishable_key or "", **kwargs.pop("headers", {})}
    return httpx.request(
        kwargs.pop("method", "POST"),
        f"{settings.supabase_url}/auth/v1/{path}",
        headers=headers,
        timeout=10,
        **kwargs,
    )


def admin_sql(query: str, *params: object) -> None:
    settings = get_settings()
    assert settings.database_url is not None
    with psycopg.connect(settings.database_url.get_secret_value(), autocommit=True) as conn:
        conn.execute(query, params)


@pytest.fixture
def throwaway_user() -> Iterator[str]:
    email = f"s1h-sessao-{uuid.uuid4().hex[:10]}@hellosquad.example"
    created = auth("signup", json={"email": email, "password": PASSWORD})
    assert created.status_code == 200, created.text
    yield email
    admin_sql("delete from auth.users where email = %s", email)


def sign_in(email: str, password: str = PASSWORD) -> httpx.Response:
    return auth(
        "token", params={"grant_type": "password"}, json={"email": email, "password": password}
    )


def change_password(token: str, new_password: str) -> httpx.Response:
    return auth(
        "user",
        method="PUT",
        headers={"Authorization": f"Bearer {token}"},
        json={"password": new_password},
    )


def test_config_keeps_short_token_and_secure_password_change() -> None:
    config = tomllib.loads(CONFIG_TOML.read_text(encoding="utf-8"))

    assert config["auth"]["jwt_expiry"] <= ONE_HOUR
    assert config["auth"]["email"]["secure_password_change"] is True


@pytest.mark.integration
def test_access_token_lives_at_most_one_hour(throwaway_user: str) -> None:
    session = sign_in(throwaway_user)
    assert session.status_code == 200, session.text
    body = session.json()
    token = claims(body["access_token"])

    assert body["expires_in"] <= ONE_HOUR
    assert token["exp"] - token["iat"] <= ONE_HOUR
    assert token["exp"] - time.time() <= ONE_HOUR + 5


@pytest.mark.integration
def test_password_change_on_old_session_requires_reauthentication(throwaway_user: str) -> None:
    session = sign_in(throwaway_user).json()
    admin_sql(
        "update auth.sessions set created_at = now() - interval '25 hours' where id = %s",
        claims(session["access_token"])["session_id"],
    )

    refused = change_password(session["access_token"], "Outra!Senha456")

    assert refused.status_code == 400, refused.text
    assert refused.json()["error_code"] == "reauthentication_needed"
    assert sign_in(throwaway_user).status_code == 200


@pytest.mark.integration
def test_fresh_session_still_changes_password_inside_the_24h_window(throwaway_user: str) -> None:
    """Limite da Auth local (v2.197): sessão com menos de 24 h troca a senha sem reautenticar.
    Registrado na S1h; na nuvem, `update_password_require_current_password` fecha o caso."""
    session = sign_in(throwaway_user).json()

    changed = change_password(session["access_token"], "Outra!Senha456")

    assert changed.status_code == 200, changed.text
    assert sign_in(throwaway_user).status_code == 400
