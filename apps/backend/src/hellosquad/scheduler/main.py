"""Entrypoint `hellosquad-scheduler`. Placeholder da J0: as rotinas chegam com o Modo Autônomo."""

from hellosquad.config import get_settings
from hellosquad.runtime import configure_logging, idle_loop


def run() -> None:
    settings = get_settings()
    configure_logging(settings.log_level)
    idle_loop("scheduler", settings.scheduler_tick_seconds, "nenhuma rotina cadastrada ainda")
