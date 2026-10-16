"""Adaptador de LLM: requisição da Anthropic, mapeamento de usage e erros, simulado e custo."""

import logging
from decimal import Decimal
from types import SimpleNamespace

import anthropic
import httpx2
import pytest

from hellosquad.config import Settings
from hellosquad.llm.anthropic_client import FALLBACK_BETA, AnthropicLLM, build_request
from hellosquad.llm.base import (
    CallTag,
    ChatMessage,
    LLMOutputError,
    LLMRefusalError,
    LLMTransientError,
    SystemBlock,
    Usage,
)
from hellosquad.llm.factory import build_llm_client
from hellosquad.llm.pricing import DEFAULT_PRICES, cost_usd
from hellosquad.llm.simulated import SimulatedLLM

SYSTEM = [SystemBlock("regras + SOUL"), SystemBlock("skill", cache=True)]
MESSAGES = [ChatMessage("user", "<pedido>Legenda para o Instagram</pedido>")]
TAG = CallTag("04.01", "otto.produce")
SCHEMA = {"type": "object", "properties": {}, "required": [], "additionalProperties": False}


def fake_message(**overrides):
    usage = SimpleNamespace(
        input_tokens=640,
        output_tokens=520,
        cache_read_input_tokens=0,
        cache_creation_input_tokens=2900,
        iterations=None,
    )
    content = [
        SimpleNamespace(type="thinking", to_dict=lambda: {"type": "thinking", "thinking": ""}),
        SimpleNamespace(type="text", text='{"ok": true}', to_dict=lambda: {"type": "text"}),
    ]
    fields = {
        "usage": usage,
        "content": content,
        "model": "claude-opus-5-5",
        "stop_reason": "end_turn",
        "stop_details": None,
        "_request_id": "req_teste",
    }
    return SimpleNamespace(**(fields | overrides))


class FakeStream:
    def __init__(self, message=None, error=None):
        self.message, self.error = message, error

    async def __aenter__(self):
        if self.error:
            raise self.error
        return self

    async def __aexit__(self, *exc):
        return False

    async def get_final_message(self):
        return self.message


def adapter_with(stream: FakeStream) -> tuple[AnthropicLLM, dict]:
    calls: dict = {}
    llm = AnthropicLLM("sk-ant-teste", timeout_seconds=5, max_retries=0)

    def fake_stream(**params):
        calls.update(params)
        return stream

    llm._client = SimpleNamespace(
        beta=SimpleNamespace(messages=SimpleNamespace(stream=fake_stream))
    )
    return llm, calls


def test_opus_request_uses_adaptive_thinking_effort_fallback_and_cache() -> None:
    params = build_request(
        messages=MESSAGES,
        system=SYSTEM,
        model="claude-opus-5-5",
        effort="medium",
        tools=None,
        output_schema=SCHEMA,
        thinking_budget=None,
        max_tokens=16000,
    )
    assert params["thinking"] == {"type": "adaptive"}
    assert params["output_config"] == {
        "effort": "medium",
        "format": {"type": "json_schema", "schema": SCHEMA},
    }
    assert params["fallbacks"] == "default"
    assert params["betas"] == [FALLBACK_BETA] == ["server-side-fallback-2026-07-01"]
    assert params["system"] == [
        {"type": "text", "text": "regras + SOUL"},
        {"type": "text", "text": "skill", "cache_control": {"type": "ephemeral"}},
    ]
    assert params["messages"] == [
        {"role": "user", "content": "<pedido>Legenda para o Instagram</pedido>"}
    ]


def test_haiku_request_uses_thinking_budget_without_effort_or_fallback() -> None:
    params = build_request(
        messages=MESSAGES,
        system=SYSTEM,
        model="claude-haiku-4-5",
        effort="high",
        tools=None,
        output_schema=SCHEMA,
        thinking_budget=1024,
        max_tokens=4096,
    )
    assert params["thinking"] == {"type": "enabled", "budget_tokens": 1024}
    assert params["output_config"] == {"format": {"type": "json_schema", "schema": SCHEMA}}
    assert "fallbacks" not in params and "betas" not in params


async def test_streaming_call_maps_text_blocks_and_usage() -> None:
    llm, calls = adapter_with(FakeStream(fake_message()))
    completion = await llm.complete(
        messages=MESSAGES, system=SYSTEM, model="claude-opus-5-5", tag=TAG, effort="medium"
    )
    assert calls["model"] == "claude-opus-5-5" and calls["fallbacks"] == "default"
    assert completion.text == '{"ok": true}'
    assert completion.json() == {"ok": True}
    assert [b["type"] for b in completion.blocks] == ["thinking", "text"]
    assert completion.usage == Usage(640, 520, 0, 2900)
    assert completion.provider == "anthropic" and completion.request_id == "req_teste"


async def test_refusal_and_truncation_raise_typed_errors() -> None:
    refused = fake_message(
        stop_reason="refusal", stop_details=SimpleNamespace(category="cyber", explanation="x")
    )
    llm, _ = adapter_with(FakeStream(refused))
    with pytest.raises(LLMRefusalError) as refusal:
        await llm.complete(messages=MESSAGES, system=SYSTEM, model="claude-opus-5-5", tag=TAG)
    assert refusal.value.details["category"] == "cyber"
    assert refusal.value.usage == Usage(640, 520, 0, 2900)  # recusa também é cobrada

    llm, _ = adapter_with(FakeStream(fake_message(stop_reason="max_tokens")))
    with pytest.raises(LLMOutputError):
        await llm.complete(messages=MESSAGES, system=SYSTEM, model="claude-opus-5-5", tag=TAG)


async def test_rate_limit_becomes_transient_error_without_secrets() -> None:
    request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    response = httpx2.Response(429, request=request, headers={"request-id": "req_429"})
    error = anthropic.RateLimitError("rate limited", response=response, body=None)
    llm, _ = adapter_with(FakeStream(error=error))
    with pytest.raises(LLMTransientError) as raised:
        await llm.complete(messages=MESSAGES, system=SYSTEM, model="claude-opus-5-5", tag=TAG)
    assert raised.value.transient
    assert raised.value.details == {
        "step": "otto.produce",
        "error_type": "RateLimitError",
        "status_code": 429,
        "request_id": "req_429",
    }


async def test_simulated_is_deterministic_and_follows_fixture_cases() -> None:
    llm = SimulatedLLM()
    triage = CallTag("04.01", "nexo.triage")
    complete = [ChatMessage("user", "<pedido>Legenda para o Instagram no sábado</pedido>")]
    vague = [ChatMessage("user", "<pedido>Preciso de um texto para divulgar a padaria</pedido>")]

    first = await llm.complete(
        messages=complete, system=SYSTEM, model="claude-haiku-4-5", tag=triage
    )
    second = await llm.complete(
        messages=complete, system=SYSTEM, model="claude-haiku-4-5", tag=triage
    )
    assert first == second
    assert first.json()["faltam"] == [] and first.extra["case"] == "briefing_completo"
    assert first.usage == Usage(input_tokens=1850, output_tokens=210)

    asked = await llm.complete(messages=vague, system=SYSTEM, model="claude-haiku-4-5", tag=triage)
    assert asked.json()["faltam"] == ["canal", "objetivo"]
    assert asked.json()["pergunta"]

    check = CallTag("04.01", "otto.check")
    history = '<historico><mensagem autor="pessoa">sem "artesanal"</mensagem></historico>'
    clean = [ChatMessage("user", f'{history}<versao>{{"texto": "pão"}}</versao>')]
    vetoed = [ChatMessage("user", f'{history}<versao>{{"texto": "pão artesanal"}}</versao>')]
    ok = await llm.complete(messages=clean, system=SYSTEM, model="claude-opus-5-5", tag=check)
    bad = await llm.complete(messages=vetoed, system=SYSTEM, model="claude-opus-5-5", tag=check)
    assert ok.extra["case"] == "aprovada" and bad.extra["case"] == "palavra_vetada"


async def test_simulated_failure_is_transient() -> None:
    llm = SimulatedLLM(fail_steps={"otto.produce": "unavailable"})
    with pytest.raises(LLMTransientError):
        await llm.complete(messages=MESSAGES, system=SYSTEM, model="claude-opus-5-5", tag=TAG)


def test_cost_follows_price_table() -> None:
    opus = cost_usd(Usage(640, 520, 0, 2900), "claude-opus-5-5", DEFAULT_PRICES)
    assert opus == Decimal("0.027460")  # 640×4 + 520×20 + 2900×5 por milhão
    check = cost_usd(Usage(980, 150, 2900, 0), "claude-opus-5-5", DEFAULT_PRICES)
    assert check == Decimal("0.007500")  # 980×4 + 150×20 + 2900×0,20 por milhão
    haiku = cost_usd(Usage(1850, 210), "claude-haiku-4-5", DEFAULT_PRICES)
    assert haiku == Decimal("0.002900")  # 1850×1 + 210×5 por milhão
    assert cost_usd(Usage(1000, 1000), "modelo-sem-preco", DEFAULT_PRICES) == Decimal(0)


def test_price_table_comes_from_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "LLM_PRICES",
        '{"claude-opus-5-5": {"input": 1, "output": 2, "cache_read": 0, "cache_write": 0}}',
    )
    prices = Settings().llm_prices
    assert cost_usd(Usage(1_000_000, 1_000_000), "claude-opus-5-5", prices) == Decimal("3")


def test_provider_selection_never_logs_the_key(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.INFO, logger="hellosquad.llm")
    monkeypatch.setenv("LLM_PROVIDER", "anthropic")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    assert isinstance(build_llm_client(Settings()), SimulatedLLM)
    assert "sem ANTHROPIC_API_KEY" in caplog.text

    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-segredo-de-teste")
    assert isinstance(build_llm_client(Settings()), AnthropicLLM)
    monkeypatch.setenv("LLM_PROVIDER", "simulated")
    assert isinstance(build_llm_client(Settings()), SimulatedLLM)
    assert "sk-ant-segredo-de-teste" not in caplog.text
