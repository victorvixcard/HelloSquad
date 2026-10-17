"""Validação de token nas rotas dos provedores, com o erro que cada provedor real devolve."""

from __future__ import annotations

from fastapi import Request

from . import errors, fixtures
from .state import STATE, Token


def bearer(request: Request) -> str | None:
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip() or None
    if header.lower().startswith("oauth "):  # a Graph API também aceita "OAuth <token>"
        return header[6:].strip() or None
    return None


def token_from_request(request: Request, form: dict | None = None) -> str | None:
    return (
        bearer(request)
        or request.query_params.get("access_token")
        or (form or {}).get("access_token")
        or None
    )


def meta_token(request: Request, form: dict | None = None) -> Token:
    value = token_from_request(request, form)
    if not value:
        raise errors.meta_token_missing()
    token = STATE.tokens.get(value)
    if token is None or token.provider != "meta":
        raise errors.meta_token_invalid()
    now = STATE.now()
    state = token.state(now)
    if state == "revoked":
        raise errors.meta_token_revoked(STATE.config["meta"]["app_id"])
    if state == "expired":
        raise errors.meta_token_expired(token.expired_at(now), now)
    if token.parent:  # token de Página morre junto com o do usuário que o gerou
        parent = STATE.tokens.get(token.parent)
        if parent is not None and parent.state(now) == "revoked":
            raise errors.meta_token_revoked(STATE.config["meta"]["app_id"])
        if parent is not None and parent.expired_forced_at is not None:
            raise errors.meta_token_expired(parent.expired_at(now), now)
    return token


def meta_require(token: Token, *scopes: str) -> None:
    missing = [s for s in scopes if s not in token.scopes]
    if missing:
        raise errors.meta_no_permission()


def google_token(
    request: Request, service: str, method: str, accepted_scopes: tuple[str, ...]
) -> Token:
    value = bearer(request) or request.query_params.get("access_token")
    if not value:
        raise errors.google_unauthenticated(service, method, missing=True)
    token = STATE.tokens.get(value)
    if token is None or token.provider != "google" or token.kind != "access":
        raise errors.google_unauthenticated(service, method)
    if token.state(STATE.now()) != "valid":
        raise errors.google_unauthenticated(service, method)
    if not any(scope in token.scopes for scope in accepted_scopes):
        raise errors.google_scope_insufficient(service, method)
    return token


def user_of(token: Token) -> fixtures.User:
    return fixtures.USERS[token.user_key]
