"""Adaptador de busca web da Bia (02.07): sem rede nos testes."""

import json
from datetime import date

import httpx
import pytest

from hellosquad.research.websearch import (
    BRAVE_URL,
    BraveWebSearch,
    DisabledWebSearch,
    MockWebSearch,
    WebSearchUnavailable,
    build_web_search,
)


async def test_disabled_search_is_the_default_and_never_searches():
    search = build_web_search("disabled", None)
    assert isinstance(search, DisabledWebSearch) and not search.enabled
    with pytest.raises(WebSearchUnavailable) as raised:
        await search.search("padarias", locale="pt-BR")
    assert raised.value.reason == "disabled"


def test_brave_without_key_falls_back_to_disabled():
    assert isinstance(build_web_search("brave", None), DisabledWebSearch)
    assert isinstance(build_web_search("brave", "chave-falsa"), BraveWebSearch)


async def test_mock_search_is_deterministic_and_fictional():
    first = await MockWebSearch().search("concorrentes", locale="pt-BR", max_results=2)
    second = await MockWebSearch().search("concorrentes", locale="pt-BR", max_results=2)
    assert [r.url for r in first.results] == [r.url for r in second.results]
    assert all(r.url.split("/")[2].endswith(".example") for r in first.results)
    assert all(r.published_at for r in first.results)


async def test_brave_parses_results_with_dates_and_drops_unsafe_links():
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["token"] = request.headers.get("X-Subscription-Token")
        body = {
            "web": {
                "results": [
                    {
                        "title": "Padaria fictícia",
                        "url": "https://padaria.example/natal",
                        "description": "Encomendas de Natal.",
                        "page_age": "2026-10-09T10:00:00",
                    },
                    {"title": "Link ruim", "url": "javascript:alert(1)", "description": "x"},
                    {"title": "Sem data", "url": "http://outra.example/", "description": "y"},
                ]
            }
        }
        return httpx.Response(200, content=json.dumps(body))

    search = BraveWebSearch("chave-falsa", transport=httpx.MockTransport(handler))
    response = await search.search("padarias de bairro", locale="pt-BR", max_results=5)

    assert str(seen["url"]).startswith(BRAVE_URL) and "search_lang=pt-br" in str(seen["url"])
    assert seen["token"] == "chave-falsa"
    assert [(r.url, r.published_at) for r in response.results] == [
        ("https://padaria.example/natal", date(2026, 10, 9)),
        ("http://outra.example/", None),
    ]
    assert response.provider == "brave" and response.query == "padarias de bairro"


async def test_brave_failure_becomes_unavailable():
    search = BraveWebSearch(
        "chave-falsa", transport=httpx.MockTransport(lambda request: httpx.Response(429))
    )
    with pytest.raises(WebSearchUnavailable) as raised:
        await search.search("padarias", locale="pt-BR")
    assert raised.value.reason == "http:429"
