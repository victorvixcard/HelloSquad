"""API HTTP do HelloSquad (FastAPI). Entrypoint: `hellosquad-api`."""

from typing import Literal

import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

from hellosquad import __version__
from hellosquad.config import get_settings

app = FastAPI(title="HelloSquad API", version=__version__)


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
