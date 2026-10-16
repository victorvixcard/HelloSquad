"""Erros da API em JSON padronizado, mensagens em português.

Formato único: {"error": {"code": "...", "message": "...", "details": [{"field", "message"}]}}.
`code` é estável (o cliente decide por ele); `message` é para a pessoa.
"""

import logging
from typing import Any

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
        409: "Conflito com um registro existente.",
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
    return ErrorDetail(
        field=".".join(location) or None,
        message=VALIDATION_MESSAGES.get(error.get("type", ""), "Valor inválido."),
    )


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


async def handle_insufficient_privilege(
    request: Request, exc: errors.InsufficientPrivilege
) -> JSONResponse:
    # Inclui a recusa da RLS (WITH CHECK): o banco é quem decide a permissão.
    return error_json(403, "forbidden", "Você não tem permissão para esta ação.")


async def handle_check_violation(request: Request, exc: errors.CheckViolation) -> JSONResponse:
    return error_json(422, "validation_error", "Dados inválidos.")


async def handle_unique_violation(request: Request, exc: errors.UniqueViolation) -> JSONResponse:
    return error_json(409, "conflict", "Já existe um registro com esses dados.")


async def handle_database_unavailable(request: Request, exc: Exception) -> JSONResponse:
    log.warning("banco indisponível em %s %s: %s", request.method, request.url.path, exc)
    return error_json(503, "database_unavailable", "Banco de dados indisponível. Tente de novo.")


async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
    log.exception("erro não tratado em %s %s", request.method, request.url.path)
    return error_json(500, "internal_error", "Erro interno. Tente de novo em instantes.")


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiError, handle_api_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, handle_http_error)
    app.add_exception_handler(errors.InsufficientPrivilege, handle_insufficient_privilege)
    app.add_exception_handler(errors.CheckViolation, handle_check_violation)
    app.add_exception_handler(errors.UniqueViolation, handle_unique_violation)
    # Inclui PoolTimeout (subclasse de OperationalError): pool esgotado também é indisponibilidade.
    app.add_exception_handler(OperationalError, handle_database_unavailable)
    app.add_exception_handler(Exception, handle_unexpected)
