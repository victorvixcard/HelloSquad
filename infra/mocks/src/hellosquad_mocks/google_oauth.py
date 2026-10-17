"""Google OAuth 2.0 para aplicativos de servidor web.

Espelha https://accounts.google.com/o/oauth2/v2/auth, https://oauth2.googleapis.com/token,
/revoke e /tokeninfo. Refresh token só com access_type=offline e, como no Google real, só no
primeiro consentimento ou com prompt=consent (reconectar sem prompt=consent não traz refresh novo).
"""

from __future__ import annotations

import base64
import hashlib
import re
import secrets
from urllib.parse import urlencode

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse, Response

from . import errors, fixtures
from .state import STATE, AuthCode

router = APIRouter(tags=["google-oauth"])

SCOPE_PREFIX = "https://www.googleapis.com/auth/"
KNOWN_SCOPES = {
    "openid",
    "email",
    "profile",
    SCOPE_PREFIX + "userinfo.email",
    SCOPE_PREFIX + "userinfo.profile",
    SCOPE_PREFIX + "analytics.readonly",
    SCOPE_PREFIX + "analytics",
    SCOPE_PREFIX + "webmasters.readonly",
    SCOPE_PREFIX + "webmasters",
    SCOPE_PREFIX + "business.manage",
    SCOPE_PREFIX + "plus.business.manage",
}
CODE_TTL = 600


def _redirect_error(redirect_uri: str, error: str, state: str | None) -> RedirectResponse:
    query = {"error": error}
    if state:
        query["state"] = state
    return RedirectResponse(f"{redirect_uri}?{urlencode(query)}", status_code=302)


@router.get("/google/accounts/o/oauth2/v2/auth")
def authorize(request: Request) -> Response:
    q = request.query_params
    config = STATE.config["google"]
    consent = STATE.config["consent"]["google"]
    if q.get("client_id") != config["client_id"]:
        return JSONResponse(
            {"error": "invalid_client", "error_description": "The OAuth client was not found."}, 401
        )
    redirect_uri = q.get("redirect_uri", "")
    if not any(redirect_uri.startswith(p) for p in STATE.config["allowed_redirect_prefixes"]):
        return JSONResponse(
            {
                "error": "redirect_uri_mismatch",
                "error_description": "The redirect URI in the request does not match the ones "
                "authorized for the OAuth client.",
            },
            400,
        )
    if q.get("response_type") != "code":
        return JSONResponse(
            {"error": "invalid_request", "error_description": "Missing response_type: code"}, 400
        )
    scopes = [s for s in re.split(r"\s+", q.get("scope", "").strip()) if s]
    if not scopes:
        return JSONResponse(
            {"error": "invalid_request", "error_description": "Missing required parameter: scope"},
            400,
        )
    unknown = [s for s in scopes if s not in KNOWN_SCOPES]
    if unknown:
        return JSONResponse(
            {
                "error": "invalid_scope",
                "error_description": f"Some requested scopes were invalid. {{invalid={unknown}}}",
            },
            400,
        )
    state = q.get("state")
    if q.get("mock_deny", "") in ("1", "true") or consent.get("deny"):
        return _redirect_error(redirect_uri, "access_denied", state)
    user = (
        fixtures.find_user(q.get("mock_user") or q.get("login_hint") or consent.get("user"))
        or fixtures.USERS["marina"]
    )
    declined = {s for s in (q.get("mock_decline") or "").split(",") if s} | set(
        consent.get("decline") or []
    )
    granted = [s for s in scopes if s not in declined]
    if not granted:
        return _redirect_error(redirect_uri, "access_denied", state)
    if q.get("include_granted_scopes") == "true":
        previous = [
            s
            for t in STATE.tokens.values()
            if t.provider == "google" and t.user_key == user.key and t.state(STATE.now()) == "valid"
            for s in t.scopes
        ]
        granted += [s for s in dict.fromkeys(previous) if s not in granted]
    method = q.get("code_challenge_method") or ("plain" if q.get("code_challenge") else None)
    code = "4/0Mock" + secrets.token_urlsafe(32)
    STATE.codes[code] = AuthCode(
        code=code,
        provider="google",
        client_id=config["client_id"],
        redirect_uri=redirect_uri,
        user_key=user.key,
        scopes=granted,
        created_at=STATE.now(),
        access_type=q.get("access_type", "online"),
        prompt=q.get("prompt", ""),
        code_challenge=q.get("code_challenge"),
        code_challenge_method=method,
    )
    query = {"code": code, "scope": " ".join(granted), "authuser": "0", "prompt": "consent"}
    if state:
        query = {"state": state, **query}
    return RedirectResponse(f"{redirect_uri}?{urlencode(query)}", status_code=302)


def _check_client(form: dict) -> None:
    config = STATE.config["google"]
    if form.get("client_id") != config["client_id"]:
        raise errors.oauth_error("invalid_client", "The OAuth client was not found.", 401)
    if config["client_secret"] and form.get("client_secret") != config["client_secret"]:
        raise errors.oauth_error("invalid_client", "Unauthorized", 401)


def _pkce_ok(code: AuthCode, verifier: str | None) -> bool:
    if not code.code_challenge:
        return True
    if not verifier:
        return False
    if code.code_challenge_method == "S256":
        digest = hashlib.sha256(verifier.encode()).digest()
        expected = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
        return secrets.compare_digest(expected, code.code_challenge)
    return secrets.compare_digest(verifier, code.code_challenge)


@router.post("/google/oauth2/token")
async def token(request: Request) -> Response:
    form = {k: str(v) for k, v in (await request.form()).items()}
    _check_client(form)
    config = STATE.config["google"]
    grant_type = form.get("grant_type")
    if grant_type == "authorization_code":
        code = STATE.codes.get(form.get("code", ""))
        if code is None or code.provider != "google" or code.used:
            raise errors.oauth_error("invalid_grant", "Bad Request")
        if STATE.now() - code.created_at > CODE_TTL:
            raise errors.oauth_error("invalid_grant", "Bad Request")
        if form.get("redirect_uri") != code.redirect_uri:
            raise errors.oauth_error("redirect_uri_mismatch", "Bad Request")
        if not _pkce_ok(code, form.get("code_verifier")):
            raise errors.oauth_error("invalid_grant", "Invalid code verifier.")
        code.used = True
        body: dict = {"token_type": "Bearer", "scope": " ".join(code.scopes)}
        grant_key = (code.user_key, code.client_id)
        first_consent = grant_key not in STATE.google_granted
        refresh = None
        if code.access_type == "offline" and (first_consent or "consent" in code.prompt):
            refresh = STATE.issue(
                "google", "refresh", code.user_key, code.client_id, code.scopes,
                config["refresh_ttl"],
            )
            body["refresh_token"] = refresh.value
            if config["refresh_ttl"]:
                body["refresh_token_expires_in"] = config["refresh_ttl"]
        STATE.google_granted.add(grant_key)
        access = STATE.issue(
            "google", "access", code.user_key, code.client_id, code.scopes, config["access_ttl"],
            parent=refresh.value if refresh else None,
        )
        body = {"access_token": access.value, "expires_in": config["access_ttl"], **body}
        if "openid" in code.scopes:
            body["id_token"] = _fake_id_token(code.user_key, code.client_id)
        return JSONResponse(body)
    if grant_type == "refresh_token":
        refresh = STATE.tokens.get(form.get("refresh_token", ""))
        if refresh is None or refresh.provider != "google" or refresh.kind != "refresh":
            raise errors.oauth_error("invalid_grant", "Bad Request")
        if refresh.client_id != form.get("client_id"):
            raise errors.oauth_error("unauthorized_client", "Unauthorized")
        if refresh.state(STATE.now()) != "valid":
            raise errors.oauth_error("invalid_grant", "Token has been expired or revoked.")
        access = STATE.issue(
            "google", "access", refresh.user_key, refresh.client_id, refresh.scopes,
            config["access_ttl"], parent=refresh.value,
        )
        return JSONResponse(
            {
                "access_token": access.value,
                "expires_in": config["access_ttl"],
                "scope": " ".join(refresh.scopes),
                "token_type": "Bearer",
            }
        )
    raise errors.oauth_error("unsupported_grant_type", f"Invalid grant_type: {grant_type or ''}")


def _fake_id_token(user_key: str, client_id: str) -> str:
    """JWT de formato real e assinatura falsa: só para leitura do `sub`/`email` em local."""
    import json

    user = fixtures.USERS[user_key]
    now = int(STATE.now())

    def part(data: dict) -> str:
        return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b"=").decode()

    header = part({"alg": "none", "typ": "JWT", "kid": "mock"})
    payload = part(
        {
            "iss": "https://accounts.google.com",
            "aud": client_id,
            "sub": user.google_sub,
            "email": user.email,
            "email_verified": True,
            "name": user.name,
            "iat": now,
            "exp": now + 3600,
        }
    )
    return f"{header}.{payload}.mock-signature"


@router.post("/google/oauth2/revoke")
async def revoke(request: Request) -> Response:
    form = {k: str(v) for k, v in (await request.form()).items()}
    value = request.query_params.get("token") or form.get("token", "")
    token = STATE.tokens.get(value)
    if token is None or token.provider != "google" or token.state(STATE.now()) == "revoked":
        raise errors.oauth_error("invalid_token", "Token expired or revoked")
    # Revogar o access revoga o grant inteiro (refresh e os outros access), como no Google.
    for member in STATE.family(token):
        member.revoked = True
    STATE.google_granted.discard((token.user_key, token.client_id))
    return JSONResponse({})


@router.get("/google/oauth2/tokeninfo")
@router.get("/google/oauth2/v3/tokeninfo")
def tokeninfo(request: Request) -> Response:
    value = request.query_params.get("access_token", "")
    token = STATE.tokens.get(value)
    if token is None or token.provider != "google" or token.state(STATE.now()) != "valid":
        raise errors.oauth_error("invalid_token", "Invalid Value")
    user = fixtures.USERS[token.user_key]
    remaining = int((token.expires_at or STATE.now()) - STATE.now())
    body = {
        "azp": token.client_id,
        "aud": token.client_id,
        "sub": user.google_sub,
        "scope": " ".join(token.scopes),
        "exp": str(int(token.expires_at or 0)),
        "expires_in": str(max(remaining, 0)),
        "access_type": "offline" if token.parent else "online",
    }
    if {"email", SCOPE_PREFIX + "userinfo.email"} & set(token.scopes):
        body["email"] = user.email
        body["email_verified"] = "true"
    return JSONResponse(body)


@router.get("/google/openidconnect/v1/userinfo")
def userinfo(request: Request) -> Response:
    header = request.headers.get("authorization", "")
    value = header[7:] if header.lower().startswith("bearer ") else ""
    token = STATE.tokens.get(value)
    if token is None or token.kind != "access" or token.state(STATE.now()) != "valid":
        raise errors.google_unauthenticated("openidconnect.googleapis.com", "userinfo")
    user = fixtures.USERS[token.user_key]
    return JSONResponse({"sub": user.google_sub, "name": user.name, "email": user.email,
                         "email_verified": True})
