"""Interface única de LLM do runtime: o que o squad pede e recebe, seja qual for o provedor."""

import json
from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

Effort = Literal["low", "medium", "high", "xhigh", "max"]


@dataclass(frozen=True)
class SystemBlock:
    text: str
    # Marca o fim de um prefixo estável (SOUL + skill, contexto do workspace): vira cache_control.
    cache: bool = False


@dataclass(frozen=True)
class ChatMessage:
    role: Literal["user", "assistant"]
    content: str


@dataclass(frozen=True)
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_write_tokens: int = 0

    def __add__(self, other: "Usage") -> "Usage":
        return Usage(
            self.input_tokens + other.input_tokens,
            self.output_tokens + other.output_tokens,
            self.cache_read_tokens + other.cache_read_tokens,
            self.cache_write_tokens + other.cache_write_tokens,
        )


@dataclass(frozen=True)
class CallTag:
    """Qual delivery e qual etapa a chamada serve. O simulado escolhe a fixture por ela."""

    delivery_type: str
    step: str


@dataclass(frozen=True)
class Completion:
    text: str
    blocks: list[dict[str, Any]]
    usage: Usage
    model: str
    stop_reason: str | None
    provider: str
    request_id: str | None = None
    fallback_used: bool = False
    extra: dict[str, Any] = field(default_factory=dict)

    def json(self) -> Any:
        try:
            return json.loads(self.text)
        except json.JSONDecodeError as exc:
            raise LLMOutputError("A resposta do modelo não é um JSON válido.") from exc


class LLMError(Exception):
    """Falha de LLM com código estável; `transient` diz se vale tentar de novo."""

    code = "llm_error"
    transient = False

    def __init__(
        self,
        message: str,
        *,
        details: dict[str, Any] | None = None,
        usage: Usage | None = None,
        model: str | None = None,
    ) -> None:
        super().__init__(message)
        self.details = details or {}
        # Recusa e corte no limite chegam com HTTP 200 e são cobrados: o custo da etapa conta.
        self.usage = usage
        self.model = model


class LLMTransientError(LLMError):
    code = "llm_unavailable"
    transient = True


class LLMRefusalError(LLMError):
    code = "llm_refusal"


class LLMOutputError(LLMError):
    code = "llm_invalid_output"


class LLMConfigError(LLMError):
    code = "llm_config"


class LLMClient(Protocol):
    provider: str

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
    ) -> Completion: ...
