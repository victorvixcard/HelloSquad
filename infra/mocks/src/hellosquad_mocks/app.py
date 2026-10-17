"""App FastAPI dos mocks: middleware de falhas, rate limit e gravação; controle em `/_mock/*`."""

from __future__ import annotations

import asyncio
import html
import json
import math
import time
from datetime import UTC, datetime
from typing import Annotated
from urllib.parse import parse_qsl

from fastapi import Body, FastAPI, Request
from fastapi.responses import JSONResponse, Response

from . import errors, fixtures, netguard
from .state import STATE, FailRule

# Prefixo → (provedor, serviço). Cada prefixo espelha um host real.
SERVICES = [
    ("/meta/www/", "meta", "meta_oauth_dialog"),
    ("/meta/graph/", "meta", "meta_graph"),
    ("/google/accounts/", "google", "google_oauth"),
    ("/google/oauth2/", "google", "google_oauth"),
    ("/google/openidconnect/", "google", "google_oauth"),
    ("/google/analyticsdata/", "google", "ga4"),
    ("/google/analyticsadmin/", "google", "ga4_admin"),
    ("/google/searchconsole/", "google", "search_console"),
    ("/google/mybusinessaccountmanagement/", "google", "gbp"),
    ("/google/mybusinessbusinessinformation/", "google", "gbp"),
    ("/google/mybusiness/", "google", "gbp"),
]
GOOGLE_HOSTS = {
    "ga4": "analyticsdata.googleapis.com",
    "ga4_admin": "analyticsadmin.googleapis.com",
    "search_console": "searchconsole.googleapis.com",
    "gbp": "mybusiness.googleapis.com",
    "google_oauth": "oauth2.googleapis.com",
}
HEALTH = {
    "meta": "/meta/graph",
    "google_oauth": "/google/oauth2",
    "ga4": "/google/analyticsdata",
    "search_console": "/google/searchconsole",
    "gbp": "/google/mybusiness",
}
OAUTH_SERVICES = {"meta_oauth_dialog", "google_oauth"}
FAIL_MODES = {"500", "503", "429", "timeout", "expired"}
SECRET_FIELDS = {"client_secret", "code_verifier"}


def service_of(path: str) -> tuple[str, str] | None:
    for prefix, provider, service in SERVICES:
        if path.startswith(prefix):
            return provider, service
    return None


def _is_meta_token_endpoint(path: str) -> bool:
    return path.endswith("/oauth/access_token")


def _parse_body(raw: bytes, content_type: str) -> object:
    if not raw:
        return None
    if "json" in content_type:
        try:
            return json.loads(raw)
        except ValueError:
            return raw.decode(errors="replace")[:2000]
    if "x-www-form-urlencoded" in content_type:
        return dict(parse_qsl(raw.decode(errors="replace"), keep_blank_values=True))
    return raw.decode(errors="replace")[:2000]


def _mask(data: object) -> object:
    if isinstance(data, dict):
        return {k: ("***" if k in SECRET_FIELDS and v else _mask(v)) for k, v in data.items()}
    return data


def _token_in(request: Request, body: object) -> str | None:
    header = request.headers.get("authorization", "")
    if " " in header:
        return header.split(" ", 1)[1].strip() or None
    value = request.query_params.get("access_token")
    if not value and isinstance(body, dict):
        value = body.get("access_token")
    return value or None


def _fault_response(provider: str, service: str, mode: str, path: str) -> Response:
    now = STATE.now()
    if mode == "429":
        return _rate_limited(provider, service, 30)
    if mode in ("500", "503"):
        status = int(mode)
        err = (
            errors.meta_server_error(status)
            if provider == "meta"
            else errors.google_server_error(status)
        )
        return err.response
    if mode == "timeout":
        err = errors.meta_timeout() if provider == "meta" else errors.google_timeout()
        return err.response
    # expired: a resposta de token vencido do provedor (no endpoint de token, o erro de grant).
    if provider == "meta":
        return errors.meta_token_expired(now - 60, now).response
    if service == "google_oauth" and path.endswith("/token"):
        return errors.oauth_error("invalid_grant", "Token has been expired or revoked.").response
    host = GOOGLE_HOSTS.get(service, "googleapis.com")
    return errors.google_unauthenticated(host, "mock").response


def _rate_limited(provider: str, service: str, retry_after: int) -> Response:
    if provider == "meta":
        status = int(STATE.config["meta"].get("rate_limit_status") or 429)
        return errors.meta_rate_limited(retry_after, status).response
    return errors.google_rate_limited(
        GOOGLE_HOSTS.get(service, "googleapis.com"), retry_after
    ).response


def _take_fail_rule(provider: str, method: str, path: str) -> str | None:
    for rule in list(STATE.fail_rules):
        if rule.provider and rule.provider != provider:
            continue
        if rule.method and rule.method.upper() != method:
            continue
        if rule.path_contains and rule.path_contains not in path:
            continue
        rule.remaining -= 1
        if rule.remaining <= 0:
            STATE.fail_rules.remove(rule)
        return rule.mode
    return None


def _check_rate_limit(provider: str) -> int | None:
    """Janela fixa por provedor. Devolve os segundos até liberar, ou None se dentro do limite."""
    rule = STATE.config["rate_limit"].get(provider)
    if not rule:
        return None
    limit = int(rule.get("limit", 0))
    window = float(rule.get("window_seconds", 60))
    now = STATE.now()
    hits = [t for t in STATE.rate_windows.get(provider, []) if now - t < window]
    if len(hits) >= limit:
        STATE.rate_windows[provider] = hits
        return max(1, math.ceil(window - (now - hits[0])))
    hits.append(now)
    STATE.rate_windows[provider] = hits
    return None


def create_app() -> FastAPI:
    from . import ga4, gbp, google_oauth, meta, search_console

    app = FastAPI(
        title="HelloSquad — mocks locais dos provedores",
        description="Meta Graph (Instagram + Pages), Google OAuth, GA4, Search Console e "
        "Business Profile. Só local: nada sai para a internet.",
        version="0.1.0",
        # Sem Swagger UI: a página buscaria JS e CSS num CDN externo. O contrato fica no JSON.
        docs_url=None,
        openapi_url="/_mock/openapi.json",
        redoc_url=None,
    )

    @app.exception_handler(errors.ProviderError)
    async def provider_error(_request: Request, exc: errors.ProviderError) -> Response:
        return exc.response

    @app.middleware("http")
    async def provider_middleware(request: Request, call_next):
        path = request.url.path
        match = service_of(path)
        if match is None:
            return await call_next(request)
        provider, service = match
        started = time.perf_counter()
        raw = await request.body()
        body = _parse_body(raw, request.headers.get("content-type", ""))
        method = request.method.upper()

        fault = request.headers.get("x-mock-fail", "").strip().lower() or None
        if fault and fault not in FAIL_MODES:
            fault = None
        if fault is None:
            fault = _take_fail_rule(provider, method, path)
        response: Response | None = None
        if fault is not None:
            if fault == "timeout":
                seconds = float(
                    request.headers.get("x-mock-timeout-seconds") or STATE.config["timeout_seconds"]
                )
                await asyncio.sleep(seconds)
            response = _fault_response(provider, service, fault, path)
        elif service not in OAUTH_SERVICES and not _is_meta_token_endpoint(path):
            wait = _check_rate_limit(provider)
            if wait is not None:
                fault = "rate_limit"
                response = _rate_limited(provider, service, wait)
        if response is None:
            response = await call_next(request)

        token_value = _token_in(request, body)
        token = STATE.tokens.get(token_value) if token_value else None
        user = fixtures.USERS.get(token.user_key) if token else None
        STATE.calls.append(
            {
                "seq": STATE.next_seq(),
                "at": datetime.fromtimestamp(STATE.now(), UTC).isoformat(),
                "provider": provider,
                "service": service,
                "method": method,
                "path": path,
                "query": dict(request.query_params),
                "body": _mask(body),
                "token": token_value,
                "user": user.key if user else None,
                "workspace": user.workspace if user else None,
                "status": response.status_code,
                "fault": fault,
                "duration_ms": round((time.perf_counter() - started) * 1000, 1),
            }
        )
        return response

    # --- controle -----------------------------------------------------------------------

    @app.get("/_mock/health", tags=["controle"])
    def health() -> dict:
        return {
            "status": "ok",
            "providers": {
                name: {"status": "ok", "base_path": base} for name, base in HEALTH.items()
            },
            "network_guard": netguard.installed(),
            "calls": len(STATE.calls),
            "tokens": len(STATE.tokens),
            "now": datetime.fromtimestamp(STATE.now(), UTC).isoformat(),
        }

    @app.get("/_mock/health/{provider}", tags=["controle"])
    def health_provider(provider: str) -> Response:
        if provider not in HEALTH:
            return JSONResponse({"status": "unknown", "providers": sorted(HEALTH)}, 404)
        return JSONResponse({"provider": provider, "status": "ok", "base_path": HEALTH[provider]})

    @app.post("/_mock/reset", tags=["controle"])
    def reset() -> dict:
        STATE.reset()
        return {"reset": True}

    @app.get("/_mock/calls", tags=["controle"])
    def calls(
        provider: str | None = None,
        service: str | None = None,
        method: str | None = None,
        path_contains: str | None = None,
        workspace: str | None = None,
        since_seq: int = 0,
    ) -> dict:
        selected = [
            c
            for c in STATE.calls
            if c["seq"] > since_seq
            and (provider is None or c["provider"] == provider)
            and (service is None or c["service"] == service)
            and (method is None or c["method"] == method.upper())
            and (path_contains is None or path_contains in c["path"])
            and (workspace is None or c["workspace"] == workspace)
        ]
        return {"count": len(selected), "calls": selected}

    @app.delete("/_mock/calls", tags=["controle"])
    def clear_calls() -> dict:
        STATE.calls.clear()
        return {"cleared": True}

    @app.post("/_mock/expire", tags=["controle"])
    def expire(payload: Annotated[dict | None, Body()] = None) -> Response:
        payload = payload or {}
        provider = payload.get("provider")
        kind = payload.get("kind", "access")
        if kind not in ("access", "grant"):
            return JSONResponse({"error": "kind deve ser access ou grant"}, 400)
        user_key = None
        if payload.get("workspace") or payload.get("user"):
            user = fixtures.find_user(payload.get("workspace") or payload.get("user"))
            if user is None:
                return JSONResponse({"error": "workspace ou usuário desconhecido"}, 404)
            user_key = user.key
        if not (payload.get("token") or user_key or provider):
            return JSONResponse({"error": "informe token, workspace/user ou provider"}, 400)
        count = STATE.expire_tokens(
            provider=provider, user_key=user_key, token_value=payload.get("token"), kind=kind
        )
        return JSONResponse({"expired": count, "kind": kind})

    @app.post("/_mock/fail", tags=["controle"])
    def fail(payload: Annotated[dict, Body()]) -> Response:
        mode = str(payload.get("mode", "")).lower()
        if mode not in FAIL_MODES:
            return JSONResponse({"error": f"mode deve ser um de {sorted(FAIL_MODES)}"}, 400)
        rule = FailRule(
            mode=mode,
            provider=payload.get("provider"),
            path_contains=payload.get("path_contains"),
            method=payload.get("method"),
            remaining=int(payload.get("count", 1)),
        )
        STATE.fail_rules.append(rule)
        return JSONResponse({"queued": rule.__dict__, "pending": len(STATE.fail_rules)})

    @app.get("/_mock/fail", tags=["controle"])
    def pending_failures() -> dict:
        return {"pending": [r.__dict__ for r in STATE.fail_rules]}

    @app.get("/_mock/config", tags=["controle"])
    def get_config() -> dict:
        return STATE.config

    @app.post("/_mock/config", tags=["controle"])
    def set_config(payload: Annotated[dict, Body()]) -> dict:
        def merge(target: dict, patch: dict) -> None:
            for key, value in patch.items():
                if isinstance(value, dict) and isinstance(target.get(key), dict):
                    merge(target[key], value)
                else:
                    target[key] = value

        merge(STATE.config, payload)
        return STATE.config

    @app.post("/_mock/clock", tags=["controle"])
    def clock(payload: Annotated[dict | None, Body()] = None) -> dict:
        payload = payload or {}
        if payload.get("reset"):
            STATE.clock_offset = 0.0
        STATE.clock_offset += float(payload.get("advance_seconds", 0))
        return {
            "offset_seconds": STATE.clock_offset,
            "now": datetime.fromtimestamp(STATE.now(), UTC).isoformat(),
        }

    @app.get("/_mock/network", tags=["controle"])
    def network() -> dict:
        return {"guard": netguard.installed(), "blocked": netguard.blocked}

    @app.post("/_mock/network/selftest", tags=["controle"])
    def network_selftest() -> dict:
        return netguard.selftest()

    @app.get("/_mock/fixtures", tags=["controle"])
    def fixture_summary() -> dict:
        result = {}
        for user in fixtures.USERS.values():
            m = fixtures.META_ACCOUNTS[user.workspace]
            g = fixtures.GOOGLE_ACCOUNTS[user.workspace]
            result[user.workspace] = {
                "user": user.key,
                "email": user.email,
                "meta": {
                    "user_id": user.meta_user_id,
                    "page_id": m.page_id,
                    "ig_user_id": m.ig_user_id,
                    "ig_username": m.ig_username,
                },
                "google": {
                    "sub": user.google_sub,
                    "ga4_property": g.ga_property,
                    "search_console_site": g.site_url,
                    "gbp_account": g.gbp_account,
                    "gbp_location": g.gbp_location,
                },
            }
        return result

    @app.get("/_mock/media/{name}", tags=["controle"])
    def media_placeholder(name: str) -> Response:
        label = name.rsplit(".", 1)[0][:24]
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">'
            '<rect width="100%" height="100%" fill="#F3E9DC"/>'
            '<text x="50%" y="50%" font-size="64" text-anchor="middle" fill="#7A5230">'
            f"{html.escape(label)}</text></svg>"
        )
        return Response(svg, media_type="image/svg+xml")

    app.include_router(meta.router)
    app.include_router(google_oauth.router)
    app.include_router(ga4.router)
    app.include_router(search_console.router)
    app.include_router(gbp.router)
    return app
