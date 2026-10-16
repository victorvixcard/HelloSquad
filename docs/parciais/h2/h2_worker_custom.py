"""Worker do produto (Worker.serve, com os sinais do produto) com o LLM simulado modificado para a H2:
H2_LLM_DELAY segundos por chamada (segura o run em execução para o SIGTERM chegar no meio) e
H2_FAIL_STEPS="etapa:erro,..." (ex.: "otto.reflect:unavailable") para provar o retry."""
import asyncio
import logging
import os
from typing import Any

from hellosquad.config import get_settings
from hellosquad.llm.simulated import SimulatedLLM
from hellosquad.worker.main import Worker

DELAY = float(os.environ.get("H2_LLM_DELAY", "0"))
FAIL = dict(p.split(":", 1) for p in os.environ.get("H2_FAIL_STEPS", "").split(",") if ":" in p)


class H2LLM(SimulatedLLM):
    async def complete(self, *args: Any, **kwargs: Any):  # type: ignore[override]
        if DELAY:
            await asyncio.sleep(DELAY)
        return await super().complete(*args, **kwargs)


async def main() -> None:
    async with Worker(get_settings(), llm=H2LLM(fail_steps=FAIL)) as w:
        await w.serve()


logging.basicConfig(level=logging.INFO)
asyncio.run(main())
