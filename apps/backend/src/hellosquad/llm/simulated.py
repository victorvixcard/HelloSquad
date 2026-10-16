"""Modo simulado: respostas determinísticas das fixtures, por delivery e etapa. Sem chave e custo.

Fixture: `fixtures/<delivery>/<etapa>.json` com `cases` em ordem; vale o primeiro cujo `when` casa
com o texto das mensagens do usuário (ou com o conteúdo de uma tag, `when.tag`). Case sem `when` é
o padrão.
Um case pode trazer `error` (`unavailable`, `refusal`, `config`) em vez de `output`.
"""

import json
import re
from collections.abc import Mapping
from functools import cache
from pathlib import Path
from typing import Any

from hellosquad.llm.base import (
    CallTag,
    ChatMessage,
    Completion,
    Effort,
    LLMConfigError,
    LLMError,
    LLMRefusalError,
    LLMTransientError,
    SystemBlock,
    Usage,
)

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

ERRORS: dict[str, type[LLMError]] = {
    "unavailable": LLMTransientError,
    "refusal": LLMRefusalError,
    "config": LLMConfigError,
}
ERROR_MESSAGES = {
    "unavailable": "O provedor de IA não respondeu.",
    "refusal": "O modelo recusou o pedido.",
    "config": "O provedor de IA recusou a requisição.",
}


@cache
def load_fixture(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def tag_content(text: str, tag: str) -> str:
    match = re.search(rf"<{tag}(?:\s[^>]*)?>(.*?)</{tag}>", text, flags=re.DOTALL)
    return match.group(1) if match else ""


def case_matches(case: Mapping[str, Any], text: str) -> bool:
    when = case.get("when")
    if not when:
        return True
    target = tag_content(text, when["tag"]) if "tag" in when else text
    if "matches" in when and not re.search(when["matches"], target, flags=re.IGNORECASE):
        return False
    return not (
        "not_matches" in when and re.search(when["not_matches"], target, flags=re.IGNORECASE)
    )


class SimulatedLLM:
    provider = "simulated"

    def __init__(
        self,
        fixtures_dir: Path = FIXTURES_DIR,
        *,
        fail_steps: Mapping[str, str] | None = None,
    ) -> None:
        self._fixtures_dir = fixtures_dir
        self._fail_steps = dict(fail_steps or {})

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
        if tag.step in self._fail_steps:
            raise_simulated(self._fail_steps[tag.step], tag)
        path = self._fixtures_dir / tag.delivery_type / f"{tag.step}.json"
        if not path.is_file():
            raise LLMConfigError(
                "Não há resposta simulada para esta etapa.",
                details={"step": tag.step, "delivery_type": tag.delivery_type},
            )
        text = "\n".join(m.content for m in messages if m.role == "user")
        case = next(c for c in load_fixture(path)["cases"] if case_matches(c, text))
        if "error" in case:
            raise_simulated(case["error"], tag)
        output = case["output"]
        body = json.dumps(output, ensure_ascii=False) if not isinstance(output, str) else output
        return Completion(
            text=body,
            blocks=[{"type": "text", "text": body}],
            usage=Usage(**case.get("usage", {})),
            model=model,
            stop_reason="end_turn",
            provider=self.provider,
            extra={"fixture": f"{tag.delivery_type}/{tag.step}.json", "case": case.get("name")},
        )


def raise_simulated(kind: str, tag: CallTag) -> None:
    error = ERRORS.get(kind, LLMTransientError)
    raise error(
        ERROR_MESSAGES.get(kind, ERROR_MESSAGES["unavailable"]),
        details={"step": tag.step, "error_type": f"simulated:{kind}"},
    )
