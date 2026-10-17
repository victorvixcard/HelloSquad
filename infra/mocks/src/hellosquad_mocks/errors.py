"""Corpos de erro no formato dos provedores reais (Meta Graph e Google APIs)."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

from fastapi.responses import JSONResponse


class ProviderError(Exception):
    """Resposta de erro pronta; o handler do app devolve exatamente esta resposta."""

    def __init__(self, response: JSONResponse) -> None:
        super().__init__(response.status_code)
        self.response = response


def _fbtrace() -> str:
    return "Mock" + secrets.token_urlsafe(8)


def meta_error(
    message: str,
    code: int,
    *,
    subcode: int | None = None,
    status: int = 400,
    type_: str = "OAuthException",
    transient: bool | None = None,
    headers: dict[str, str] | None = None,
) -> ProviderError:
    error: dict = {"message": message, "type": type_, "code": code}
    if subcode is not None:
        error["error_subcode"] = subcode
    if transient is not None:
        error["is_transient"] = transient
    error["fbtrace_id"] = _fbtrace()
    hdrs = dict(headers or {})
    if code in (102, 190):
        hdrs["WWW-Authenticate"] = f'OAuth "Facebook Platform" "invalid_token" "{message}"'
    return ProviderError(JSONResponse({"error": error}, status_code=status, headers=hdrs))


def _meta_time(ts: float) -> str:
    # A Meta escreve o horário do Pacífico: "Saturday, 17-Oct-26 05:00:00 PDT".
    moment = datetime.fromtimestamp(ts, UTC) - timedelta(hours=7)
    return moment.strftime("%A, %d-%b-%y %H:%M:%S PDT")


def meta_token_expired(expired_at: float, now: float) -> ProviderError:
    return meta_error(
        "Error validating access token: Session has expired on "
        f"{_meta_time(expired_at)}. The current time is {_meta_time(now)}.",
        190,
        subcode=463,
    )


def meta_token_revoked(app_id: str) -> ProviderError:
    return meta_error(
        f"Error validating access token: The user has not authorized application {app_id}.",
        190,
        subcode=458,
    )


def meta_token_invalid() -> ProviderError:
    return meta_error("Invalid OAuth access token - Cannot parse access token", 190)


def meta_token_missing() -> ProviderError:
    return meta_error("An access token is required to request this resource.", 104)


def meta_no_permission() -> ProviderError:
    return meta_error("(#10) Application does not have permission for this action", 10, status=403)


def meta_object_not_found(node_id: str, edge: str | None = None) -> ProviderError:
    what = "get" if edge is None else "request"
    return meta_error(
        f"Unsupported {what} request. Object with ID '{node_id}' does not exist, cannot be loaded "
        "due to missing permissions, or does not support this operation. Please read the Graph "
        "API documentation at https://developers.facebook.com/docs/graph-api",
        100,
        subcode=33,
        type_="GraphMethodException",
    )


def meta_param(message: str, *, subcode: int | None = None) -> ProviderError:
    return meta_error(message, 100, subcode=subcode)


def meta_rate_limited(retry_after: int, status: int) -> ProviderError:
    usage = '{"call_count":100,"total_cputime":42,"total_time":47}'
    return meta_error(
        "(#4) Application request limit reached",
        4,
        status=status,
        transient=True,
        headers={"Retry-After": str(retry_after), "X-App-Usage": usage},
    )


def meta_server_error(status: int = 500) -> ProviderError:
    if status == 503:
        return meta_error("Service temporarily unavailable", 2, status=503, transient=True)
    return meta_error(
        "An unexpected error has occurred. Please retry your request later.",
        2,
        status=status,
        transient=True,
    )


def meta_timeout() -> ProviderError:
    return meta_error("(#1) An unknown error occurred", 1, status=504, transient=True)


_GOOGLE_STATUS = {
    400: "INVALID_ARGUMENT",
    401: "UNAUTHENTICATED",
    403: "PERMISSION_DENIED",
    404: "NOT_FOUND",
    409: "ALREADY_EXISTS",
    429: "RESOURCE_EXHAUSTED",
    500: "INTERNAL",
    503: "UNAVAILABLE",
    504: "DEADLINE_EXCEEDED",
}

_AUTH_HELP = (
    "Expected OAuth 2 access token, login cookie or other valid authentication credential. "
    "See https://developers.google.com/identity/sign-in/web/devconsole-project."
)


def google_error(
    code: int,
    message: str,
    *,
    reason: str | None = None,
    service: str | None = None,
    method: str | None = None,
    headers: dict[str, str] | None = None,
    extra_metadata: dict[str, str] | None = None,
) -> ProviderError:
    error: dict = {"code": code, "message": message, "status": _GOOGLE_STATUS.get(code, "UNKNOWN")}
    if reason:
        metadata: dict[str, str] = {}
        if service:
            metadata["service"] = service
        if method:
            metadata["method"] = method
        metadata.update(extra_metadata or {})
        error["details"] = [
            {
                "@type": "type.googleapis.com/google.rpc.ErrorInfo",
                "reason": reason,
                "domain": "googleapis.com",
                "metadata": metadata,
            }
        ]
    return ProviderError(JSONResponse({"error": error}, status_code=code, headers=headers or {}))


def google_unauthenticated(service: str, method: str, *, missing: bool = False) -> ProviderError:
    if missing:
        message = f"Request is missing required authentication credential. {_AUTH_HELP}"
        reason = "CREDENTIALS_MISSING"
    else:
        message = f"Request had invalid authentication credentials. {_AUTH_HELP}"
        reason = "ACCESS_TOKEN_EXPIRED"
    return google_error(
        401,
        message,
        reason=reason,
        service=service,
        method=method,
        headers={"WWW-Authenticate": 'Bearer realm="https://accounts.google.com/", error="invalid_token"'},
    )


def google_scope_insufficient(service: str, method: str) -> ProviderError:
    return google_error(
        403,
        "Request had insufficient authentication scopes.",
        reason="ACCESS_TOKEN_SCOPE_INSUFFICIENT",
        service=service,
        method=method,
        headers={
            "WWW-Authenticate": 'Bearer realm="https://accounts.google.com/", '
            'error="insufficient_scope"'
        },
    )


def google_rate_limited(service: str, retry_after: int) -> ProviderError:
    return google_error(
        429,
        "Quota exceeded for quota metric 'Requests' and limit 'Requests per minute' of service "
        f"'{service}' for consumer 'project_number:000000000000'.",
        reason="RATE_LIMIT_EXCEEDED",
        service=service,
        headers={"Retry-After": str(retry_after)},
        extra_metadata={
            "quota_metric": f"{service}/requests",
            "quota_limit": "RequestsPerMinutePerProject",
            "consumer": "projects/000000000000",
        },
    )


def google_server_error(status: int = 500) -> ProviderError:
    if status == 503:
        return google_error(503, "The service is currently unavailable.")
    return google_error(status, "Internal error encountered.")


def google_timeout() -> ProviderError:
    return google_error(504, "The request was aborted because it exceeded the deadline.")


def oauth_error(error: str, description: str, status: int = 400) -> ProviderError:
    """Erro do endpoint de token do Google (RFC 6749: error + error_description)."""
    return ProviderError(
        JSONResponse({"error": error, "error_description": description}, status_code=status)
    )
