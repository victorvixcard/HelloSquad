"""Dependências comuns das rotas: usuário do JWT e acesso ao banco."""

from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

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
