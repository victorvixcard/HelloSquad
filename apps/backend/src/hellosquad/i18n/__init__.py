"""Catálogo de mensagens do backend por idioma (ADR-0010).

pt-BR agora; en e es caem no pt-BR até a tradução.
"""

import json
from functools import cache
from pathlib import Path

CATALOG_DIR = Path(__file__).resolve().parent
DEFAULT_LOCALE = "pt-BR"


@cache
def catalog(locale: str) -> dict[str, str]:
    path = CATALOG_DIR / f"{locale}.json"
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def t(locale: str, key: str, **params: object) -> str:
    template = catalog(locale).get(key) or catalog(DEFAULT_LOCALE).get(key) or key
    return template.format(**params) if params else template
