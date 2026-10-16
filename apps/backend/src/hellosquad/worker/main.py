"""Entrypoint `hellosquad-worker`. Placeholder da J0: a fila (pgmq) chega na Fase 1."""

from hellosquad.config import get_settings
from hellosquad.runtime import configure_logging, idle_loop


def run() -> None:
    settings = get_settings()
    configure_logging(settings.log_level)
    idle_loop("worker", settings.worker_idle_seconds, "nenhuma fila conectada ainda")
