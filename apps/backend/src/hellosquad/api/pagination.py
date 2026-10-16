"""Paginação por cursor (keyset): cursor opaco com (instante, id) do último item da página."""

import base64
import binascii
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import Query

from hellosquad.api.errors import ApiError

CursorQuery = Annotated[
    str | None,
    Query(
        max_length=200,
        description="Valor de `next_cursor` da página anterior. Vazio = primeira página.",
    ),
]


def limit_query(maximum: int):
    return Query(ge=1, le=maximum, description=f"Itens por página (1 a {maximum}).")


def encode_cursor(moment: datetime, item_id: UUID) -> str:
    raw = f"{moment.isoformat()}|{item_id}".encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def decode_cursor(cursor: str | None) -> tuple[datetime | None, UUID | None]:
    if not cursor:
        return None, None
    try:
        raw = base64.urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4)).decode()
        moment, item_id = raw.split("|", 1)
        parsed = datetime.fromisoformat(moment)
        if parsed.tzinfo is None:
            raise ValueError("cursor sem fuso")
        return parsed, UUID(item_id)
    except (binascii.Error, UnicodeDecodeError, ValueError) as exc:
        raise ApiError(422, "invalid_cursor", "error.invalid_cursor") from exc


def split_page(rows: list[dict], limit: int, moment_key: str) -> tuple[list[dict], str | None]:
    """Recebe até limit + 1 linhas; devolve a página e o cursor da próxima (se houver)."""
    if len(rows) <= limit:
        return rows, None
    page = rows[:limit]
    last = page[-1]
    return page, encode_cursor(last[moment_key], last["id"])
