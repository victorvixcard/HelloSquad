"""Motor de imagem da Kaia (03.01–03.03), atrás de uma interface só.

O motor é do dono: ele está construindo e envia com as chaves; ninguém escolhe fornecedor
(DIRETRIZES_DO_DONO, 16/10). Até ele chegar só existe `PendingImageEngine`, que responde com
honestidade "aguardando o motor de imagem do dono": a etapa da Kaia fica `waiting_engine`, nada é
cobrado e nada é inventado. A configuração recusa qualquer outro valor em vez de fingir que gera.

Contrato esperado do motor (o mesmo de `squad/kaia/skills/03.01.md`): recebe o briefing da peça e a
identidade da marca; devolve os arquivos (caminho no bucket privado `deliveries`, tipo, dimensões),
os metadados da geração, a versão do motor e o custo.
"""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Literal, Protocol

ImageOutcomeStatus = Literal["generated", "waiting_engine"]


@dataclass(frozen=True)
class BrandIdentity:
    """O que a marca já confirmou e a peça precisa respeitar (Memória da Marca)."""

    name: str
    facts: list[str] = field(default_factory=list)
    references: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ImageRequest:
    workspace_id: str
    delivery_type: str
    locale: str
    briefing: dict[str, Any]
    brand: BrandIdentity
    format: str = "4:5"
    documents: list[dict[str, Any]] = field(default_factory=list)


@dataclass(frozen=True)
class ImageFile:
    storage_path: str
    mime_type: str
    width: int
    height: int
    size_bytes: int


@dataclass(frozen=True)
class ImageCost:
    credits: Decimal = Decimal(0)
    usd: Decimal = Decimal(0)


@dataclass(frozen=True)
class ImageOutcome:
    status: ImageOutcomeStatus
    engine: str
    engine_version: str | None = None
    files: list[ImageFile] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    cost: ImageCost = field(default_factory=ImageCost)
    reason: str | None = None


class ImageEngine(Protocol):
    provider: str
    available: bool

    async def generate(self, request: ImageRequest) -> ImageOutcome: ...


class PendingImageEngine:
    """Stub honesto: o motor do dono ainda não chegou. Não gera, não cobra, não falha."""

    provider = "pending"
    available = False

    async def generate(self, request: ImageRequest) -> ImageOutcome:
        return ImageOutcome(
            status="waiting_engine",
            engine=self.provider,
            reason="image_engine_pending",
            metadata={"delivery_type": request.delivery_type, "format": request.format},
        )


def build_image_engine(provider: str) -> ImageEngine:
    if provider == "pending":
        return PendingImageEngine()
    raise ValueError(
        f"IMAGE_ENGINE_PROVIDER={provider!r}: o motor de imagem é do dono e ainda não chegou."
    )
