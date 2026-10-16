"""Configuração lida do ambiente e, em máquina local, do `.env` da raiz do monorepo."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # `make dev-api` roda de apps/backend; a raiz do monorepo fica dois níveis acima.
        # Variável de ambiente vale mais que o arquivo; arquivo ausente é ignorado.
        env_file=("../../.env", ".env"),
        extra="ignore",
    )

    app_env: Literal["local", "test", "staging", "production"] = "local"
    api_host: str = "127.0.0.1"
    api_port: int = 8100
    api_reload: bool = False
    log_level: str = "INFO"
    worker_idle_seconds: float = 30.0
    scheduler_tick_seconds: float = 60.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
