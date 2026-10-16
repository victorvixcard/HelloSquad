"""Custo em USD de uma chamada a partir do `usage` e da tabela de preços da configuração."""

import logging
from collections.abc import Mapping
from decimal import Decimal

from pydantic import BaseModel

from hellosquad.llm.base import Usage

log = logging.getLogger("hellosquad.llm")

PER_MILLION = Decimal(1_000_000)
COST_QUANTUM = Decimal("0.000001")


class ModelPrice(BaseModel):
    """USD por milhão de tokens. cache_write: escrita com TTL de 5 minutos (1,25× a entrada)."""

    input: Decimal
    output: Decimal
    cache_read: Decimal
    cache_write: Decimal


# Preços da API Anthropic conferidos em 16/10/2026 (skill claude-api; Arquitetura §4.2).
DEFAULT_PRICES: dict[str, ModelPrice] = {
    "claude-opus-5-5": ModelPrice(
        input=Decimal("4"),
        output=Decimal("20"),
        cache_read=Decimal("0.20"),
        cache_write=Decimal("5"),
    ),
    "claude-haiku-4-5": ModelPrice(
        input=Decimal("1"),
        output=Decimal("5"),
        cache_read=Decimal("0.10"),
        cache_write=Decimal("1.25"),
    ),
    "claude-sonnet-5-5": ModelPrice(
        input=Decimal("2"),
        output=Decimal("10"),
        cache_read=Decimal("0.20"),
        cache_write=Decimal("2.50"),
    ),
    # Destinos do fallback de recusa (fallbacks: "default").
    "claude-opus-5": ModelPrice(
        input=Decimal("5"),
        output=Decimal("25"),
        cache_read=Decimal("0.50"),
        cache_write=Decimal("6.25"),
    ),
    "claude-opus-4-8": ModelPrice(
        input=Decimal("5"),
        output=Decimal("25"),
        cache_read=Decimal("0.50"),
        cache_write=Decimal("6.25"),
    ),
}


def cost_usd(usage: Usage, model: str, prices: Mapping[str, ModelPrice]) -> Decimal:
    price = prices.get(model)
    if price is None:
        log.warning("modelo %s sem preço em LLM_PRICES; custo registrado como 0", model)
        return Decimal(0)
    total = (
        usage.input_tokens * price.input
        + usage.output_tokens * price.output
        + usage.cache_read_tokens * price.cache_read
        + usage.cache_write_tokens * price.cache_write
    )
    return (total / PER_MILLION).quantize(COST_QUANTUM)
