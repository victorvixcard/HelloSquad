"""Base dos processos de longa duração (worker e scheduler)."""

import logging
import signal
import threading


def configure_logging(level: str) -> None:
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def idle_loop(name: str, interval_seconds: float, idle_message: str) -> None:
    """Loga e dorme até SIGINT/SIGTERM. Placeholder da J0, trocado pela lógica real depois."""
    log = logging.getLogger(f"hellosquad.{name}")
    stop = threading.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: stop.set())

    log.info("%s iniciado (placeholder J0), intervalo de %ss", name, interval_seconds)
    while not stop.wait(interval_seconds):
        log.info("%s ocioso: %s", name, idle_message)
    log.info("%s encerrado", name)
