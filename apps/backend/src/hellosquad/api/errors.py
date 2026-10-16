"""Erros da API em JSON padronizado, mensagens em português.

Formato único: {"error": {"code": "...", "message": "...", "details": [{"field", "message"}]}}.
`code` é estável (o cliente decide por ele); `message` é para a pessoa.
"""

import logging
from typing import Any

import psycopg
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from psycopg import OperationalError, errors
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

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
    def __init__(
        self, status_code: int, code: str, message: str, *, headers: dict[str, str] | None = None
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.headers = headers


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


VALIDATION_MESSAGES = {
    "missing": "Campo obrigatório.",
    "extra_forbidden": "Campo não aceito.",
    "string_type": "Precisa ser texto.",
    "string_too_short": "Texto curto demais.",
    "string_too_long": "Texto longo demais.",
    "too_short": "Curto demais.",
    "too_long": "Longo demais.",
    "string_pattern_mismatch": "Formato inválido.",
    "uuid_parsing": "Identificador inválido.",
    "uuid_type": "Identificador inválido.",
    "json_invalid": "JSON inválido.",
    "model_attributes_type": "Precisa ser um objeto JSON.",
    "dict_type": "Precisa ser um objeto JSON.",
}
REQUEST_LOCATIONS = {"body", "query", "path", "header", "cookie"}


def _validation_detail(error: dict[str, Any]) -> ErrorDetail:
    location = [str(part) for part in error.get("loc", ())]
    if location and location[0] in REQUEST_LOCATIONS:
        location = location[1:]
    message = VALIDATION_MESSAGES.get(error.get("type", ""), "Valor inválido.")
    # ValueError dos validadores dos schemas já vem escrito em português para quem usa.
    if error.get("type") == "value_error" and error.get("ctx", {}).get("error"):
        message = str(error["ctx"]["error"])
    return ErrorDetail(field=".".join(location) or None, message=message)


async def handle_api_error(request: Request, exc: ApiError) -> JSONResponse:
    return error_json(exc.status_code, exc.code, exc.message, headers=exc.headers)


async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [_validation_detail(error) for error in exc.errors()]
    return error_json(422, "validation_error", "Dados inválidos.", details=details)


async def handle_http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    known = {
        404: ("not_found", "Endereço não encontrado."),
        405: ("method_not_allowed", "Método não aceito neste endereço."),
    }
    code, message = known.get(exc.status_code, ("http_error", "Requisição não atendida."))
    return error_json(exc.status_code, code, message, headers=getattr(exc, "headers", None))


# SQLSTATE das funções app.* (tabela da S1a §1) → status, code estável e mensagem padrão.
SQLSTATE_ERRORS: dict[str, tuple[int, str, str]] = {
    "P0002": (404, "not_found", "Recurso não encontrado."),
    "42501": (403, "forbidden", "Você não tem permissão para esta ação."),
    "22023": (422, "invalid_parameter", "Dados inválidos."),
    "22P02": (422, "invalid_value", "Valor inválido."),
    "55000": (409, "invalid_state", "O estado atual não permite esta ação."),
    "WI001": (409, "transition_not_allowed", "Esta mudança de estado do trabalho não é permitida."),
    "WI002": (
        409,
        "status_changed",
        "O trabalho mudou de estado enquanto a ação acontecia. Atualize e tente de novo.",
    ),
}


def raised_by_app_function(exc: psycopg.Error) -> bool:
    """A mensagem veio de um RAISE das funções app.* (escrita para o usuário, em português)."""
    return " at RAISE" in (exc.diag.context or "")


async def handle_database_error(request: Request, exc: psycopg.Error) -> JSONResponse:
    mapped = SQLSTATE_ERRORS.get(exc.sqlstate or "")
    if mapped is None:
        return await handle_unexpected(request, exc)
    status_code, code, default_message = mapped
    # Inclui a recusa da RLS (42501 sem RAISE): o banco é quem decide a permissão.
    message = exc.diag.message_primary if raised_by_app_function(exc) else default_message
    return error_json(status_code, code, message or default_message)


async def handle_check_violation(request: Request, exc: errors.CheckViolation) -> JSONResponse:
    return error_json(422, "validation_error", "Dados inválidos.")


async def handle_unique_violation(request: Request, exc: errors.UniqueViolation) -> JSONResponse:
    return error_json(409, "conflict", "Já existe um registro com esses dados.")


async def handle_database_unavailable(request: Request, exc: Exception) -> JSONResponse:
    # 55000 (estado não permite) é OperationalError no psycopg: vale a tabela da S1a, não o 503.
    if isinstance(exc, psycopg.Error) and exc.sqlstate in SQLSTATE_ERRORS:
        return await handle_database_error(request, exc)
    log.warning("banco indisponível em %s %s: %s", request.method, request.url.path, exc)
    return error_json(503, "database_unavailable", "Banco de dados indisponível. Tente de novo.")


async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
    log.exception("erro não tratado em %s %s", request.method, request.url.path)
    return error_json(500, "internal_error", "Erro interno. Tente de novo em instantes.")


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
