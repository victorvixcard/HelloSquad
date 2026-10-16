"""H2-05 (prova): o idioma do negócio entra no system do run (`<idioma>`); o agente responde nele.

O pedido é o da S1c (Marina → Otto, legenda 04.01) com a Miolo em en ou es; o worker roda com o LLM
simulado, que guarda o system de cada chamada.
"""

from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import psycopg
import pytest

from hellosquad.config import Settings
from hellosquad.llm.simulated import SimulatedLLM
from hellosquad.worker.main import Worker

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
REQUEST = (
    "Otto, preciso de uma legenda para o Instagram sobre o pão de fermentação longa de sábado. "
    "Quero levar clientes à loja de manhã."
)


class RecordingLLM(SimulatedLLM):
    def __init__(self) -> None:
        super().__init__()
        self.systems: dict[str, str] = {}

    async def complete(self, **kwargs: Any):
        self.systems[kwargs["tag"].step] = "\n".join(block.text for block in kwargs["system"])
        return await super().complete(**kwargs)


@pytest.fixture(autouse=True)
async def seed_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    yield
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


async def request_otto_caption(api, token: str, workspace: str) -> None:
    headers = {"Authorization": f"Bearer {token}"}
    conversation = await api.post(
        f"/workspaces/{workspace}/conversations",
        headers=headers,
        json={"kind": "agent_direct", "primary_agent_id": "otto"},
    )
    assert conversation.status_code == 201, conversation.text
    message = await api.post(
        f"/conversations/{conversation.json()['id']}/messages",
        headers=headers,
        json={"body": REQUEST},
    )
    assert message.status_code == 201, message.text
    work = await api.post(
        f"/messages/{message.json()['id']}/work-items",
        headers=headers,
        json={"delivery_type": "04.01", "title": "Legenda do sábado"},
    )
    assert work.status_code == 201, work.text


@pytest.mark.parametrize("locale", ["en", "es"])
async def test_run_system_prompt_carries_the_workspace_locale(
    api, access_token, admin_db, locale: str
) -> None:
    cursor = await admin_db.execute("select id from public.workspaces where slug = 'miolo'")
    miolo = str((await cursor.fetchone())[0])
    await admin_db.execute(
        "update public.workspaces set locale = %s where id = %s", (locale, miolo)
    )
    await request_otto_caption(api, access_token(MARINA), miolo)

    llm = RecordingLLM()
    settings = Settings(llm_provider="simulated", worker_retry_base_seconds=0)
    async with Worker(settings, llm=llm) as worker:
        assert await worker.drain() == ["delivered"]

    assert {"nexo.triage", "otto.produce", "otto.check"} <= set(llm.systems)
    for step, system in llm.systems.items():
        assert f"<idioma>{locale}</idioma>" in system, step
        assert "<idioma>pt-BR</idioma>" not in system, step
