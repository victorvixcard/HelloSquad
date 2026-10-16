"""API HTTP do HelloSquad (FastAPI). Entrypoint: `hellosquad-api`."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Literal

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from hellosquad import __version__
from hellosquad.api.errors import register_error_handlers
from hellosquad.approvals.routes import router as approvals_router
from hellosquad.auth import TokenVerifier
from hellosquad.autonomy.routes import router as runs_router
from hellosquad.config import get_settings
from hellosquad.conversations.routes import router as conversations_router
from hellosquad.db import Database
from hellosquad.identity.routes import router as identity_router
from hellosquad.work.routes import router as work_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    if settings.api_database_url is None:
        raise RuntimeError("API_DATABASE_URL vazio: a API conecta como hellosquad_api.")
    app.state.token_verifier = TokenVerifier.from_settings(settings)
    database = Database(
        settings.api_database_url.get_secret_value(),
        min_size=settings.api_db_pool_min_size,
        max_size=settings.api_db_pool_max_size,
    )
    await database.open()
    app.state.database = database
    try:
        yield
    finally:
        await database.close()


app = FastAPI(
    title="HelloSquad API",
    version=__version__,
    description=(
        "API do HelloSquad. Autenticação: `Authorization: Bearer <access_token>` da Auth do "
        "Supabase. Toda consulta roda com a identidade do usuário e passa pela RLS do banco. "
        'Erros seguem o formato `{"error": {"code", "message", "details"}}`.'
    ),
    lifespan=lifespan,
)
# Token no cabeçalho Authorization, sem cookie: CORS sem credenciais e só para as origens do web.
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().api_cors_origins,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Location"],
    max_age=600,
)
register_error_handlers(app)
app.include_router(identity_router)
app.include_router(conversations_router)
app.include_router(work_router)
app.include_router(approvals_router)
app.include_router(runs_router)


class Health(BaseModel):
    status: Literal["ok"] = "ok"
    version: str
    environment: str


@app.get("/health", tags=["infra"])
def health() -> Health:
    """Liveness: o processo está de pé. Não consulta banco nem serviço externo."""
    return Health(version=__version__, environment=get_settings().app_env)


def run() -> None:
    settings = get_settings()
    uvicorn.run(
        "hellosquad.api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
        log_level=settings.log_level.lower(),
    )
