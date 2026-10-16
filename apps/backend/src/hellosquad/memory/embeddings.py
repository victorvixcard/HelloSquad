"""Embeddings da memória (ADR-0009), atrás de uma interface só e desligados.

A recuperação (squad/memory.py) usa a busca textual do Postgres no idioma do workspace. Busca
híbrida (pgvector + FTS) entra quando o dono escolher o fornecedor (modelo aberto no worker ou API
paga): é escrever um adaptador com esta interface, a coluna de vetor e reindexar. Até lá só existe
`DisabledEmbeddings`, e a configuração recusa qualquer outro valor em vez de fingir que busca por
significado.
"""

from typing import Protocol


class EmbeddingsUnavailable(Exception):
    """Embeddings desligados: o fornecedor ainda não foi decidido (ADR-0009)."""


class Embeddings(Protocol):
    provider: str
    enabled: bool

    async def embed(self, texts: list[str]) -> list[list[float]]: ...


class DisabledEmbeddings:
    provider = "disabled"
    enabled = False

    async def embed(self, texts: list[str]) -> list[list[float]]:
        raise EmbeddingsUnavailable("Embeddings desligados: fornecedor não decidido (ADR-0009).")


def build_embeddings(provider: str) -> Embeddings:
    if provider == "disabled":
        return DisabledEmbeddings()
    raise ValueError(f"EMBEDDINGS_PROVIDER={provider!r}: fornecedor não decidido (ADR-0009).")
