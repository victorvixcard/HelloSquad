"""Dependências comuns das rotas: usuário do JWT e acesso ao banco."""

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
            "Envie o token de acesso no cabeçalho Authorization: Bearer <token>.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    verifier: TokenVerifier = request.app.state.token_verifier
    try:
        return verifier.verify(credentials.credentials)
    except AuthUnavailableError as exc:
        raise ApiError(
            503, "auth_unavailable", "Não foi possível validar a sessão agora. Tente de novo."
        ) from exc
    except InvalidTokenError as exc:
        raise ApiError(
            401,
            "invalid_token",
            "Token de acesso inválido ou expirado. Faça login de novo.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        ) from exc


def get_database(request: Request) -> Database:
    return request.app.state.database


CurrentPrincipal = Annotated[Principal, Depends(get_principal)]
DatabaseDep = Annotated[Database, Depends(get_database)]


VISIBLE_WORKSPACE = """
select 1 from public.workspaces w
where w.id = %s and w.id in (select app.current_user_workspace_ids())
"""


async def ensure_workspace(conn: AsyncConnection[DictRow], workspace_id: UUID) -> None:
    """Coleções sob /workspaces/{id}: quem não é membro recebe o mesmo 404 de um id inexistente."""
    if await (await conn.execute(VISIBLE_WORKSPACE, (workspace_id,))).fetchone() is None:
        raise ApiError(404, "not_found", "Workspace não encontrado.")
