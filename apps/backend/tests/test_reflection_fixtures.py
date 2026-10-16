"""H2-02 — a reflexão (S2c) responde no modo simulado para toda delivery com fluxo.

Sem `<delivery>/<agente>.reflect.json`, o simulado levanta `LLMConfigError` e a reflexão vai a
`failed` com `llm_config`. Aqui: toda delivery do catálogo com fluxo tem produzir, autoverificar e
refletir; aprovar cada uma das 16 fecha a reflexão como `succeeded`; o fechamento do projeto
coordenado (01.02) só faz refletir os agentes das etapas que a pessoa decidiu (a coordenação do
Nexo e a etapa da Kaia, que aguarda o motor, não têm versão a decidir). Cada teste reaplica o seed.
"""

import json
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import psycopg
import pytest
from psycopg.rows import dict_row

from hellosquad.config import Settings
from hellosquad.llm.simulated import FIXTURES_DIR, SimulatedLLM
from hellosquad.squad.deliveries import AGENTS, DELIVERIES
from hellosquad.squad.loader import SquadLoader
from hellosquad.squad.reflect import ReflectionOutput
from hellosquad.worker.main import Worker

MARINA = "marina@miolo.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"

# delivery → (agente, pedido da Marina, título): os pedidos que já entregam nos testes da S1–S2b.
REQUESTS = {
    "02.01": (
        "bia",
        "Bia, quero um diagnóstico do marketing da Miolo. O objetivo é vender mais até o Natal.",
        "Diagnóstico de marketing",
    ),
    "02.02": (
        "bia",
        "Bia, documente o posicionamento, o público e os objetivos da Miolo.",
        "Posicionamento da Miolo",
    ),
    "02.03": (
        "bia",
        "Bia, preciso de um plano de marketing com prioridades para vender mais até o Natal.",
        "Plano até o Natal",
    ),
    "02.04": (
        "bia",
        "Bia, quero a estratégia da campanha de Natal para vender encomendas antecipadas.",
        "Estratégia de Natal",
    ),
    "02.07": (
        "bia",
        "Bia, pesquise os concorrentes do bairro e as tendências de fim de ano.",
        "Concorrentes e tendências",
    ),
    "04.01": (
        "otto",
        "Otto, preciso de uma legenda para o Instagram sobre o pão de fermentação longa de "
        "sábado. Quero levar clientes à loja de manhã.",
        "Legenda do sábado",
    ),
    "04.02": (
        "otto",
        "Otto, monte o calendário editorial da próxima semana, de 19 a 25/10.",
        "Calendário da semana 43",
    ),
    "04.03": (
        "otto",
        "Otto, quero um reels para o Instagram e um status de WhatsApp sobre os bastidores da "
        "fornada de sábado.",
        "Bastidores do sábado",
    ),
    "05.01": (
        "kiwi",
        "Kiwi, quanto investir em anúncios no Natal? Quero mais encomendas pelo site e tenho até "
        "R$ 1.500 por mês.",
        "Plano de mídia do Natal",
    ),
    "05.02": (
        "kiwi",
        "Kiwi, quero testar dois anúncios das encomendas de Natal no Instagram.",
        "Teste de anúncios do Natal",
    ),
    "06.01": (
        "max",
        "Max, quero reativar os clientes que sumiram, com uma oferta para as encomendas de Natal.",
        "Reativação de Natal",
    ),
    "06.02": (
        "max",
        "Max, escreva a sequência de e-mails e mensagens da reativação.",
        "Sequência da reativação",
    ),
    "06.03": ("max", "Max, organize minha base de clientes em segmentos.", "Segmentos da base"),
    "07.02": ("iris", "Íris, analise meus últimos resultados.", "Análise do mês"),
    "07.03": (
        "iris",
        "Íris, compare o último mês com o anterior e monte o relatório.",
        "Relatório do mês",
    ),
    "07.04": (
        "iris",
        "Íris, o que devemos fazer primeiro a partir dos números?",
        "Prioridades a partir dos números",
    ),
}


def owner(delivery_type: str) -> str:
    loader = SquadLoader()
    [agent] = [a for a in AGENTS if delivery_type in loader.agent(a).deliveries]
    return agent


def test_every_delivery_with_a_flow_has_produce_check_and_reflect_fixtures() -> None:
    assert sorted(REQUESTS) == sorted(DELIVERIES)
    for delivery_type in DELIVERIES:
        agent = owner(delivery_type)
        assert REQUESTS[delivery_type][0] == agent
        for step in ("produce", "check", "reflect"):
            path = FIXTURES_DIR / delivery_type / f"{agent}.{step}.json"
            assert path.is_file(), f"falta {delivery_type}/{agent}.{step}.json"
        fixture = json.loads(
            (FIXTURES_DIR / delivery_type / f"{agent}.reflect.json").read_text(encoding="utf-8")
        )
        assert (fixture["delivery_type"], fixture["step"]) == (delivery_type, f"{agent}.reflect")
        # Sem um caso padrão no fim, um fechamento que nenhum `when` cobre ficaria sem resposta.
        assert "when" not in fixture["cases"][-1], delivery_type
        for case in fixture["cases"]:
            ReflectionOutput.model_validate(case["output"])


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def rows(conn: psycopg.AsyncConnection, query: str, *params: object) -> list[dict[str, Any]]:
    cursor = conn.cursor(row_factory=dict_row)
    await cursor.execute(query, params)
    return await cursor.fetchall()


async def scalar(conn: psycopg.AsyncConnection, query: str, *params: object) -> Any:
    [row] = await rows(conn, query, *params)
    return next(iter(row.values()))


@pytest.fixture
async def seed_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    yield
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


def settings() -> Settings:
    return Settings(llm_provider="simulated", worker_retry_base_seconds=0)


async def drain() -> list[str]:
    async with Worker(settings(), llm=SimulatedLLM()) as worker:
        return await worker.drain()


async def reflect() -> list[str]:
    async with Worker(settings(), llm=SimulatedLLM()) as worker:
        return await worker.drain_reflections()


async def miolo(admin_db) -> str:
    return str(await scalar(admin_db, "select id from public.workspaces where slug = 'miolo'"))


async def request_work(
    api,
    access_token,
    workspace_id: str,
    conversation: dict,
    body: str,
    delivery_type: str,
    title: str,
) -> str:
    headers = bearer(access_token(MARINA))
    opened = await api.post(
        f"/workspaces/{workspace_id}/conversations", headers=headers, json=conversation
    )
    assert opened.status_code in (200, 201), opened.text
    message = await api.post(
        f"/conversations/{opened.json()['id']}/messages", headers=headers, json={"body": body}
    )
    assert message.status_code == 201, message.text
    work = await api.post(
        f"/messages/{message.json()['id']}/work-items",
        headers=headers,
        json={"delivery_type": delivery_type, "title": title},
    )
    assert work.status_code == 201, work.text
    return work.json()["id"]


async def approve_pending(api, access_token, admin_db, work_item_id: str) -> None:
    approval_id = await scalar(
        admin_db,
        "select id from public.approvals where work_item_id = %s and status = 'pending'",
        work_item_id,
    )
    response = await api.post(
        f"/approvals/{approval_id}/decision",
        headers=bearer(access_token(MARINA)),
        json={"decision": "approved"},
    )
    assert response.status_code == 200, response.text


async def reflections(admin_db, work_item_id: str) -> list[dict[str, Any]]:
    return await rows(
        admin_db,
        """
        select agent_id::text, delivery_type, outcome::text, status::text, error, learnings_count
        from public.memory_reflections where work_item_id = %s order by created_at, id
        """,
        work_item_id,
    )


@pytest.mark.integration
@pytest.mark.usefixtures("seed_state")
@pytest.mark.parametrize("delivery_type", sorted(DELIVERIES))
async def test_approving_the_delivery_reflects_in_simulated_mode(
    api, access_token, admin_db, delivery_type
) -> None:
    agent, body, title = REQUESTS[delivery_type]
    work_item_id = await request_work(
        api,
        access_token,
        await miolo(admin_db),
        {"kind": "agent_direct", "primary_agent_id": agent},
        body,
        delivery_type,
        title,
    )
    assert await drain() == ["delivered"]
    await approve_pending(api, access_token, admin_db, work_item_id)

    assert await reflect() == ["reflected"]
    assert await reflections(admin_db, work_item_id) == [
        {
            "agent_id": agent,
            "delivery_type": delivery_type,
            "outcome": "approved",
            "status": "succeeded",
            "error": None,
            "learnings_count": 0,
        }
    ]


@pytest.mark.integration
@pytest.mark.usefixtures("seed_state")
async def test_closing_the_coordinated_project_reflects_only_the_decided_steps(
    api, access_token, admin_db
) -> None:
    work_item_id = await request_work(
        api,
        access_token,
        await miolo(admin_db),
        {"kind": "squad_room"},
        "Quero uma campanha de Natal para vender mais panetones.",
        "01.02",
        "Campanha de Natal",
    )
    assert await drain() == ["planned", "delivered"]
    await approve_pending(api, access_token, admin_db, work_item_id)
    assert await drain() == ["waiting_engine", "delivered"]
    await approve_pending(api, access_token, admin_db, work_item_id)
    assert await scalar(
        admin_db, "select status::text from public.work_items where id = %s", work_item_id
    ) == ("done")

    assert await reflect() == ["reflected", "reflected"]
    assert [
        (r["agent_id"], r["delivery_type"], r["outcome"], r["status"], r["error"])
        for r in await reflections(admin_db, work_item_id)
    ] == [
        ("bia", "02.04", "approved", "succeeded", None),
        ("otto", "04.03", "approved", "succeeded", None),
    ]
