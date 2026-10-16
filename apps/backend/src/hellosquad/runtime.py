"""Base dos processos de longa duração (worker e scheduler)."""

import logging


def configure_logging(level: str) -> None:
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
