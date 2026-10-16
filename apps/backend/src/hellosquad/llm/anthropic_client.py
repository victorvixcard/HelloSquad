"""Modo real: SDK oficial `anthropic` (streaming, thinking, effort, caching, fallback de recusa)."""

import logging
from dataclasses import dataclass
from typing import Any, Literal

import anthropic

from hellosquad.llm.base import (
    CallTag,
    ChatMessage,
    Completion,
    Effort,
    LLMConfigError,
    LLMOutputError,
    LLMRefusalError,
    LLMTransientError,
    SystemBlock,
    Usage,
)

log = logging.getLogger("hellosquad.llm")

FALLBACK_BETA = "server-side-fallback-2026-07-01"


@dataclass(frozen=True)
class ModelProfile:
    thinking: Literal["adaptive", "budget"]
    effort: bool
    server_fallback: bool


# O que cada modelo aceita. Haiku 4.5: thinking só por budget_tokens e sem effort; o fallback de
# recusa vale para os modelos com classificadores (Opus 5.5, Sonnet 5.5).
MODEL_PROFILES: dict[str, ModelProfile] = {
    "claude-opus-5-5": ModelProfile(thinking="adaptive", effort=True, server_fallback=True),
    "claude-sonnet-5-5": ModelProfile(thinking="adaptive", effort=True, server_fallback=True),
    "claude-haiku-4-5": ModelProfile(thinking="budget", effort=False, server_fallback=False),
}
DEFAULT_PROFILE = ModelProfile(thinking="adaptive", effort=True, server_fallback=False)


def build_request(
    *,
    messages: list[ChatMessage],
    system: list[SystemBlock],
    model: str,
    effort: Effort | None,
    tools: list[dict[str, Any]] | None,
    output_schema: dict[str, Any] | None,
    thinking_budget: int | None,
    max_tokens: int,
) -> dict[str, Any]:
    profile = MODEL_PROFILES.get(model, DEFAULT_PROFILE)
    params: dict[str, Any] = {
        "model": model,
        "max_tokens": max_tokens,
        "system": [
            {"type": "text", "text": block.text}
            | ({"cache_control": {"type": "ephemeral"}} if block.cache else {})
            for block in system
        ],
        "messages": [{"role": m.role, "content": m.content} for m in messages],
    }
    if profile.thinking == "adaptive":
        params["thinking"] = {"type": "adaptive"}
    elif thinking_budget:
        params["thinking"] = {"type": "enabled", "budget_tokens": thinking_budget}
    output_config: dict[str, Any] = {}
    if effort and profile.effort:
        output_config["effort"] = effort
    if output_schema is not None:
        output_config["format"] = {"type": "json_schema", "schema": output_schema}
    if output_config:
        params["output_config"] = output_config
    if tools:
        params["tools"] = tools
    if profile.server_fallback:
        params["fallbacks"] = "default"
        params["betas"] = [FALLBACK_BETA]
    return params


def usage_from(message: Any) -> Usage:
    usage = message.usage
    return Usage(
        input_tokens=usage.input_tokens or 0,
        output_tokens=usage.output_tokens or 0,
        cache_read_tokens=usage.cache_read_input_tokens or 0,
        cache_write_tokens=usage.cache_creation_input_tokens or 0,
    )


def completion_from(message: Any) -> Completion:
    request_id = getattr(message, "_request_id", None)
    if message.stop_reason == "refusal":
        details = getattr(message, "stop_details", None)
        raise LLMRefusalError(
            "O modelo recusou o pedido.",
            details={
                "category": getattr(details, "category", None),
                "request_id": request_id,
            },
        )
    if message.stop_reason == "max_tokens":
        raise LLMOutputError(
            "A resposta do modelo foi cortada no limite de tokens.",
            details={"request_id": request_id},
        )
    blocks = [block.to_dict() for block in message.content]
    text = "".join(block.text for block in message.content if block.type == "text")
    iterations = getattr(message.usage, "iterations", None) or []
    return Completion(
        text=text,
        blocks=blocks,
        usage=usage_from(message),
        model=message.model,
        stop_reason=message.stop_reason,
        provider="anthropic",
        request_id=request_id,
        fallback_used=any(getattr(i, "type", None) == "fallback_message" for i in iterations),
    )


class AnthropicLLM:
    provider = "anthropic"

    def __init__(self, api_key: str, *, timeout_seconds: float, max_retries: int) -> None:
        self._client = anthropic.AsyncAnthropic(
            api_key=api_key, timeout=timeout_seconds, max_retries=max_retries
        )

    async def complete(
        self,
        *,
        messages: list[ChatMessage],
        system: list[SystemBlock],
        model: str,
        tag: CallTag,
        effort: Effort | None = None,
        tools: list[dict[str, Any]] | None = None,
        output_schema: dict[str, Any] | None = None,
        thinking_budget: int | None = None,
        max_tokens: int = 16000,
        stream: bool = True,
    ) -> Completion:
        params = build_request(
            messages=messages,
            system=system,
            model=model,
            effort=effort,
            tools=tools,
            output_schema=output_schema,
            thinking_budget=thinking_budget,
            max_tokens=max_tokens,
        )
        try:
            if stream:
                async with self._client.beta.messages.stream(**params) as response_stream:
                    message = await response_stream.get_final_message()
            else:
                message = await self._client.beta.messages.create(**params)
        except (
            anthropic.RateLimitError,
            anthropic.InternalServerError,
            anthropic.APITimeoutError,
            anthropic.APIConnectionError,
        ) as exc:
            raise LLMTransientError(
                "O provedor de IA não respondeu.", details=error_details(exc, tag)
            ) from exc
        except (anthropic.AuthenticationError, anthropic.PermissionDeniedError) as exc:
            raise LLMConfigError(
                "A chave da Anthropic foi recusada.", details=error_details(exc, tag)
            ) from exc
        except anthropic.APIStatusError as exc:
            if exc.status_code >= 500:
                raise LLMTransientError(
                    "O provedor de IA não respondeu.", details=error_details(exc, tag)
                ) from exc
            raise LLMConfigError(
                "O provedor de IA recusou a requisição.", details=error_details(exc, tag)
            ) from exc
        return completion_from(message)


def error_details(exc: Exception, tag: CallTag) -> dict[str, Any]:
    """Só o que ajuda a diagnosticar: status, tipo e request id. Sem corpo, cabeçalho ou chave."""
    details: dict[str, Any] = {"step": tag.step, "error_type": type(exc).__name__}
    if isinstance(exc, anthropic.APIStatusError):
        details["status_code"] = exc.status_code
        details["request_id"] = exc.request_id
    return details
