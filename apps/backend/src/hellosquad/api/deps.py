"""Dependências comuns das rotas: usuário do JWT e acesso ao banco."""

from dataclasses import replace
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from psycopg import AsyncConnection
from psycopg.rows import DictRow

from hellosquad.api.errors import ApiError
from hellosquad.auth import AuthUnavailableError, InvalidTokenError, Principal, TokenVerifier
from hellosquad.db import Database

bearer_scheme = HTTPBearer(
    auto_error=False,
    bearerFormat="JWT",
    description="access_token da Auth do Supabase (login do usuário).",
)


def get_principal(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> Principal:
    # Função síncrona de propósito: o FastAPI a roda no threadpool, e a busca do JWKS (rede, com
    # cache) não trava o event loop.
    if credentials is None:
        raise ApiError(
            401,
            "not_authenticated",
            "error.not_authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    verifier: TokenVerifier = request.app.state.token_verifier
    try:
        principal = verifier.verify(credentials.credentials)
    except AuthUnavailableError as exc:
        raise ApiError(503, "auth_unavailable", "error.auth_unavailable") from exc
    except InvalidTokenError as exc:
        raise ApiError(
            401,
            "invalid_token",
            "error.invalid_token",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        ) from exc
    principal = replace(principal, read_request=request.method in ("GET", "HEAD"))
    # Os erros da rota respondem no idioma desta pessoa (api/errors.py).
    request.state.principal = principal
    return principal


def get_database(request: Request) -> Database:
    return request.app.state.database


CurrentPrincipal = Annotated[Principal, Depends(get_principal)]
DatabaseDep = Annotated[Database, Depends(get_database)]


VISIBLE_WORKSPACE = """
select 1 from public.workspaces w
where w.id = %s and w.id in (select app.current_user_workspace_ids())
"""


SUPPORT_SESSION_STATE = "select app.support_session_state(%s) as state"


async def ensure_workspace(conn: AsyncConnection[DictRow], workspace_id: UUID) -> None:
    """Coleções sob /workspaces/{id}: quem não é membro recebe o mesmo 404 de um id inexistente. O
    Super Admin sem sessão de suporte (ou pedindo escrita durante a sessão) recebe o 403 honesto."""
    if await (await conn.execute(VISIBLE_WORKSPACE, (workspace_id,))).fetchone() is not None:
        return
    support = await (await conn.execute(SUPPORT_SESSION_STATE, (workspace_id,))).fetchone()
    if support is not None and support["state"] == "read_only":
        raise ApiError(403, "support_session_read_only", "error.support_session_read_only")
    if support is not None and support["state"] == "none":
        raise ApiError(403, "support_session_required", "error.support_session_required")
    raise ApiError(404, "not_found", "error.workspace_not_found")
