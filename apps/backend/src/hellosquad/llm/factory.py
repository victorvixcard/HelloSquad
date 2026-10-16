"""Escolhe o provedor pela configuração. Sem ANTHROPIC_API_KEY, cai no simulado com aviso."""

import logging

from hellosquad.config import Settings
from hellosquad.llm.anthropic_client import AnthropicLLM
from hellosquad.llm.base import LLMClient
from hellosquad.llm.simulated import SimulatedLLM

log = logging.getLogger("hellosquad.llm")


def build_llm_client(settings: Settings) -> LLMClient:
    if settings.llm_provider == "simulated":
        log.info("LLM em modo simulado (LLM_PROVIDER=simulated): respostas das fixtures, sem custo")
        return SimulatedLLM()
    api_key = settings.anthropic_api_key.get_secret_value() if settings.anthropic_api_key else ""
    if not api_key.strip():
        log.warning(
            "LLM_PROVIDER=anthropic sem ANTHROPIC_API_KEY: usando o modo simulado "
            "(fixtures, sem custo)"
        )
        return SimulatedLLM()
    log.info("LLM em modo real: Anthropic (chave configurada)")
    return AnthropicLLM(
        api_key.strip(),
        timeout_seconds=settings.llm_timeout_seconds,
        max_retries=settings.llm_max_retries,
    )
