"""Worker do produto (Worker.serve, com os sinais do produto) com o LLM simulado modificado para a H2:
H2_LLM_DELAY segundos por chamada (segura o run em execução para o SIGTERM chegar no meio) e
H2_FAIL_STEPS="etapa:erro,..." (ex.: "otto.reflect:unavailable") para provar o retry; H2_DUMP_DIR grava o
texto que chega ao LLM por etapa (prova do que entra no contexto)."""
import asyncio
import logging
import os
from typing import Any

from hellosquad.config import get_settings
from hellosquad.llm.simulated import SimulatedLLM
from hellosquad.worker.main import Worker

DELAY = float(os.environ.get("H2_LLM_DELAY", "0"))
FAIL = dict(p.split(":", 1) for p in os.environ.get("H2_FAIL_STEPS", "").split(",") if ":" in p)
DUMP = os.environ.get("H2_DUMP_DIR")  # grava o texto que chega ao LLM (usuário e system) por etapa


class H2LLM(SimulatedLLM):
    async def complete(self, *args: Any, **kwargs: Any):  # type: ignore[override]
        if DELAY:
            await asyncio.sleep(DELAY)
        if DUMP:
            tag = kwargs["tag"]
            user = "\n".join(m.content for m in kwargs["messages"] if m.role == "user")
            system = "\n".join(str(getattr(b, "text", b)) for b in kwargs.get("system") or [])
            with open(f"{DUMP}/{tag.delivery_type}.{tag.step}.txt", "a") as fh:
                fh.write(f"=== {tag.step}\n--- system\n{system}\n--- user\n{user}\n")
        return await super().complete(*args, **kwargs)


async def main() -> None:
    async with Worker(get_settings(), llm=H2LLM(fail_steps=FAIL)) as w:
        await w.serve()


logging.basicConfig(level=logging.INFO)
asyncio.run(main())
