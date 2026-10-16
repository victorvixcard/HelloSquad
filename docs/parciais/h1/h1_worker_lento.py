"""Worker do produto (Worker.serve, com os sinais do produto) e o LLM simulado com 2 s por chamada.

Só para o T12 do 02_idempotencia_creditos_worker.py: segura o run em execução para o sinal chegar no meio.
"""

import asyncio
import logging
from typing import Any

from hellosquad.config import get_settings
from hellosquad.llm.simulated import SimulatedLLM
from hellosquad.worker.main import Worker


class SlowLLM(SimulatedLLM):
    async def complete(self, *args: Any, **kwargs: Any):  # type: ignore[override]
        await asyncio.sleep(2.0)
        return await super().complete(*args, **kwargs)


async def main() -> None:
    async with Worker(get_settings(), llm=SlowLLM()) as w:
        await w.serve()


logging.basicConfig(level=logging.INFO)
asyncio.run(main())
