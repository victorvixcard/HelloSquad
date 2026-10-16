"""Erros da API em JSON padronizado, mensagem no idioma de quem pede (ADR-0010).

Formato único: {"error": {"code": "...", "message": "...", "details": [{"field", "message"}]}}.
`code` é estável (o cliente decide por ele); `message` é para a pessoa e sai do catálogo
(`error.*`) no idioma dela; sem idioma escolhido, no do negócio da rota; sem negócio, em pt-BR.
"""

import logging
from typing import Any
from uuid import UUID

import psycopg
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from psycopg import OperationalError, errors
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

from hellosquad.i18n import DEFAULT_LOCALE, t

log = logging.getLogger("hellosquad.api")


class ErrorDetail(BaseModel):
    field: str | None = Field(default=None, description="Campo com problema, quando houver.")
    message: str


class ErrorBody(BaseModel):
    code: str = Field(description="Identificador estável do erro, em inglês.")
    message: str = Field(description="Explicação em português para quem usa.")
    details: list[ErrorDetail] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error: ErrorBody


class ApiError(Exception):
    """`key` é a chave do catálogo (`error.*`); `params` preenchem o texto no idioma da resposta."""

    def __init__(
        self,
        status_code: int,
        code: str,
        key: str,
        *,
        headers: dict[str, str] | None = None,
        **params: object,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.key = key
        self.params = params
        self.headers = headers
        self.message = t(DEFAULT_LOCALE, key, **params)
        super().__init__(self.message)

    def message_in(self, locale: str) -> str:
        return t(locale, self.key, **self.params)


def error_responses(*status_codes: int) -> dict[int | str, dict[str, Any]]:
    """Bloco `responses` do OpenAPI com o envelope de erro para os status pedidos."""
    descriptions = {
        401: "Token ausente, inválido ou expirado.",
        403: "Sem permissão para esta ação.",
        404: "Recurso não encontrado (ou fora do seu acesso).",
        409: "Conflito com o estado atual do registro.",
        422: "Dados inválidos.",
        503: "Dependência indisponível (banco ou Auth).",
    }
    return {
        code: {"model": ErrorResponse, "description": descriptions[code]} for code in status_codes
    }


def error_json(
    status_code: int,
    code: str,
    message: str,
    *,
    details: list[ErrorDetail] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code=code, message=message, details=details or []))
    return JSONResponse(status_code=status_code, content=body.model_dump(), headers=headers)


# Tipo do erro do Pydantic → chave do catálogo (`error.validation.<tipo>`).
VALIDATION_MESSAGES = {
    kind: f"error.validation.{kind}"
    for kind in (
        "missing",
        "extra_forbidden",
        "string_type",
        "string_too_short",
        "string_too_long",
        "too_short",
        "too_long",
        "string_pattern_mismatch",
        "uuid_parsing",
        "uuid_type",
        "json_invalid",
        "model_attributes_type",
        "dict_type",
    )
}
REQUEST_LOCATIONS = {"body", "query", "path", "header", "cookie"}

WORKSPACE_LOCALE = """
select w.locale from public.workspaces w
where w.id = %s and w.id in (select app.current_user_workspace_ids())
"""


async def request_locale(request: Request, *, ask_database: bool = True) -> str:
    """Idioma da resposta: o da pessoa (JWT); sem ele, o do negócio da rota; sem negócio, pt-BR.

    O negócio só conta se a pessoa é membro (a RLS decide), para o idioma não vazar a quem não é.
    """
    principal = getattr(request.state, "principal", None)
    if principal is None:
        return DEFAULT_LOCALE
    if principal.locale:
        return principal.locale
    raw_workspace = request.path_params.get("workspace_id")
    if not ask_database or raw_workspace is None:
        return DEFAULT_LOCALE
    try:
        workspace_id = UUID(str(raw_workspace))
        async with request.app.state.database.transaction_as(principal) as conn:
            row = await (await conn.execute(WORKSPACE_LOCALE, (workspace_id,))).fetchone()
    except Exception:  # noqa: BLE001 - o idioma nunca troca o erro original por outro.
        log.warning("idioma do negócio indisponível em %s", request.url.path, exc_info=True)
        return DEFAULT_LOCALE
    return row["locale"] if row else DEFAULT_LOCALE


def _validation_detail(locale: str, error: dict[str, Any]) -> ErrorDetail:
    location = [str(part) for part in error.get("loc", ())]
    if location and location[0] in REQUEST_LOCATIONS:
        location = location[1:]
    key = VALIDATION_MESSAGES.get(error.get("type", ""), "error.validation.invalid_value")
    # ValueError dos validadores dos schemas traz a chave do catálogo (error.validation.*).
    if error.get("type") == "value_error" and error.get("ctx", {}).get("error"):
        key = str(error["ctx"]["error"])
    return ErrorDetail(field=".".join(location) or None, message=t(locale, key))


async def handle_api_error(request: Request, exc: ApiError) -> JSONResponse:
    locale = await request_locale(request)
    return error_json(exc.status_code, exc.code, exc.message_in(locale), headers=exc.headers)


async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    locale = await request_locale(request)
    details = [_validation_detail(locale, error) for error in exc.errors()]
    return error_json(422, "validation_error", t(locale, "error.validation_error"), details=details)


async def handle_http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    known = {404: "not_found", 405: "method_not_allowed"}
    code = known.get(exc.status_code, "http_error")
    locale = await request_locale(request)
    return error_json(
        exc.status_code,
        code,
        t(locale, f"error.http.{code}"),
        headers=getattr(exc, "headers", None),
    )


# SQLSTATE das funções app.* (tabela da S1a §1) → status, code estável e mensagem padrão
# (`error.<code>` no catálogo).
SQLSTATE_ERRORS: dict[str, tuple[int, str]] = {
    "P0002": (404, "not_found"),
    "42501": (403, "forbidden"),
    "22023": (422, "invalid_parameter"),
    "22P02": (422, "invalid_value"),
    "55000": (409, "invalid_state"),
    "WI001": (409, "transition_not_allowed"),
    "WI002": (409, "status_changed"),
}


def raised_by_app_function(exc: psycopg.Error) -> bool:
    """A mensagem veio de um RAISE das funções app.* (escrita para o usuário, em português)."""
    return " at RAISE" in (exc.diag.context or "")


async def handle_database_error(request: Request, exc: psycopg.Error) -> JSONResponse:
    mapped = SQLSTATE_ERRORS.get(exc.sqlstate or "")
    if mapped is None:
        return await handle_unexpected(request, exc)
    status_code, code = mapped
    locale = await request_locale(request)
    default_message = t(locale, f"error.{code}")
    # Inclui a recusa da RLS (42501 sem RAISE): o banco é quem decide a permissão. O RAISE das
    # funções app.* é escrito em pt-BR: nos outros idiomas vale a mensagem padrão do catálogo.
    message = None
    if locale == DEFAULT_LOCALE and raised_by_app_function(exc):
        message = exc.diag.message_primary
    return error_json(status_code, code, message or default_message)


async def handle_check_violation(request: Request, exc: errors.CheckViolation) -> JSONResponse:
    locale = await request_locale(request)
    return error_json(422, "validation_error", t(locale, "error.validation_error"))


async def handle_unique_violation(request: Request, exc: errors.UniqueViolation) -> JSONResponse:
    locale = await request_locale(request)
    return error_json(409, "conflict", t(locale, "error.conflict"))


async def handle_database_unavailable(request: Request, exc: Exception) -> JSONResponse:
    # 55000 (estado não permite) é OperationalError no psycopg: vale a tabela da S1a, não o 503.
    if isinstance(exc, psycopg.Error) and exc.sqlstate in SQLSTATE_ERRORS:
        return await handle_database_error(request, exc)
    log.warning("banco indisponível em %s %s: %s", request.method, request.url.path, exc)
    # Sem banco não há idioma do negócio: vale o da pessoa ou o pt-BR.
    locale = await request_locale(request, ask_database=False)
    return error_json(503, "database_unavailable", t(locale, "error.database_unavailable"))


async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
    log.exception("erro não tratado em %s %s", request.method, request.url.path)
    locale = await request_locale(request, ask_database=False)
    return error_json(500, "internal_error", t(locale, "error.internal_error"))


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiError, handle_api_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, handle_http_error)
    app.add_exception_handler(errors.CheckViolation, handle_check_violation)
    app.add_exception_handler(errors.UniqueViolation, handle_unique_violation)
    # Inclui PoolTimeout (subclasse de OperationalError): pool esgotado também é indisponibilidade.
    app.add_exception_handler(OperationalError, handle_database_unavailable)
    app.add_exception_handler(psycopg.Error, handle_database_error)
    app.add_exception_handler(Exception, handle_unexpected)
