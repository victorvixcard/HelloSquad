"""Busca web da Bia (ferramenta `pesquisa.web`, delivery 02.07), atrás de uma interface só.

- `DisabledWebSearch` (padrão): nenhuma busca; a entrega diz que tudo é sugestão sem validação.
- `MockWebSearch`: resultados fixos e fictícios (`.example`), sem rede. Nos testes e, se alguém
  ligar de propósito (`WEB_SEARCH_PROVIDER=mock`), numa demonstração local.
- `BraveWebSearch`: busca real (Brave Search API), só com `WEB_SEARCH_PROVIDER=brave` e
  `WEB_SEARCH_API_KEY`. O fornecedor ainda não foi escolhido pelo dono (catálogo: "Tavily/Brave/
  SerpAPI — escolher"); trocar é escrever outro adaptador com a mesma interface.

Toda resposta traz o provedor, a consulta e a hora da coleta; cada resultado, título, link, trecho e a
data de publicação quando a fonte informa. Falha da busca não derruba o run: vira pesquisa
indisponível, e a entrega fica só com sugestões.
"""

import logging
from dataclasses import asdict, dataclass, field
from datetime import UTC, date, datetime
from typing import Any, Protocol

import httpx

log = logging.getLogger(__name__)

MAX_RESULTS = 5
SNIPPET_MAX = 400


class WebSearchUnavailable(Exception):
    """A busca não pôde ser feita (desligada, sem chave, rede ou recusa do provedor)."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


@dataclass(frozen=True)
class SearchResult:
    title: str
    url: str
    snippet: str
    published_at: date | None = None


@dataclass(frozen=True)
class SearchResponse:
    provider: str
    query: str
    retrieved_at: datetime
    results: list[SearchResult] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "query": self.query,
            "retrieved_at": self.retrieved_at.isoformat(),
            "results": [
                asdict(r) | {"published_at": r.published_at.isoformat() if r.published_at else None}
                for r in self.results
            ],
        }


class WebSearch(Protocol):
    provider: str
    enabled: bool

    async def search(
        self, query: str, *, locale: str, max_results: int = MAX_RESULTS
    ) -> SearchResponse: ...


class DisabledWebSearch:
    provider = "disabled"
    enabled = False

    async def search(
        self, query: str, *, locale: str, max_results: int = MAX_RESULTS
    ) -> SearchResponse:
        raise WebSearchUnavailable("disabled")


# Resultados fixos da demonstração: concorrentes e tendências fictícios, com domínio reservado.
MOCK_RESULTS = [
    SearchResult(
        title="Forno do Largo abre fila de encomendas de panetone de fermentação natural",
        url="https://noticias-do-bairro.example/forno-do-largo-panetone",
        snippet=(
            "A padaria do Largo da Batata passou a aceitar encomendas de panetone de fermentação "
            "natural pelo WhatsApp, com retirada a partir de 15 de dezembro."
        ),
        published_at=date(2026, 10, 9),
    ),
    SearchResult(
        title="Casa Levain: cardápio de outono e oficina de pão aos sábados",
        url="https://casa-levain.example/blog/outono",
        snippet=(
            "A Casa Levain, em Vila Madalena, anuncia oficinas de pão aos sábados de manhã e um "
            "cardápio com pães de longa fermentação e café coado."
        ),
        published_at=date(2026, 9, 28),
    ),
    SearchResult(
        title="Pesquisa de tendências de panificação 2026: procura por fermentação natural cresce",
        url="https://observatorio-de-panificacao.example/tendencias-2026",
        snippet=(
            "Levantamento com padarias de bairro aponta mais procura por pães de fermentação "
            "natural e por encomendas antecipadas nas datas de fim de ano."
        ),
        published_at=date(2026, 8, 20),
    ),
]


class MockWebSearch:
    provider = "mock"
    enabled = True

    def __init__(
        self, results: list[SearchResult] | None = None, *, now: datetime | None = None
    ) -> None:
        self._results = list(MOCK_RESULTS if results is None else results)
        self._now = now

    async def search(
        self, query: str, *, locale: str, max_results: int = MAX_RESULTS
    ) -> SearchResponse:
        return SearchResponse(
            provider=self.provider,
            query=query,
            retrieved_at=self._now or datetime.now(UTC),
            results=self._results[:max_results],
        )


BRAVE_URL = "https://api.search.brave.com/res/v1/web/search"
BRAVE_LANG = {"pt-BR": ("pt-br", "BR"), "en": ("en", "US"), "es": ("es", "ES")}


def parse_day(value: object) -> date | None:
    if not isinstance(value, str) or len(value) < 10:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


class BraveWebSearch:
    provider = "brave"
    enabled = True

    def __init__(self, api_key: str, *, timeout: float = 10.0) -> None:
        self._api_key = api_key
        self._timeout = timeout

    async def search(
        self, query: str, *, locale: str, max_results: int = MAX_RESULTS
    ) -> SearchResponse:
        lang, country = BRAVE_LANG.get(locale, BRAVE_LANG["pt-BR"])
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(
                    BRAVE_URL,
                    params={
                        "q": query,
                        "count": max_results,
                        "search_lang": lang,
                        "country": country,
                    },
                    headers={"X-Subscription-Token": self._api_key, "Accept": "application/json"},
                )
        except httpx.HTTPError as exc:
            raise WebSearchUnavailable(f"network:{type(exc).__name__}") from exc
        if response.status_code != 200:
            raise WebSearchUnavailable(f"http:{response.status_code}")
        items = (response.json().get("web") or {}).get("results") or []
        results = [
            SearchResult(
                title=str(item.get("title") or "")[:200],
                url=str(item.get("url") or ""),
                snippet=str(item.get("description") or "")[:SNIPPET_MAX],
                published_at=parse_day(item.get("page_age")),
            )
            for item in items[:max_results]
            if item.get("url")
        ]
        return SearchResponse(
            provider=self.provider,
            query=query,
            retrieved_at=datetime.now(UTC),
            results=results,
        )


def build_web_search(provider: str, api_key: str | None, *, timeout: float = 10.0) -> WebSearch:
    if provider == "mock":
        return MockWebSearch()
    if provider == "brave":
        if not api_key:
            log.warning("WEB_SEARCH_PROVIDER=brave sem WEB_SEARCH_API_KEY: busca web desligada.")
            return DisabledWebSearch()
        return BraveWebSearch(api_key, timeout=timeout)
    return DisabledWebSearch()
