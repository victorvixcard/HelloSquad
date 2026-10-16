"""S2a: Bia (02.01–02.04, 02.07) e Otto (04.02, 04.03) ponta a ponta no modo simulado.

Pedido da Marina na conversa direta → trabalho → worker (fixtures) → entrega revisável com cartão,
status por etapa e crédito capturado uma vez → aprovação da dona da conta. Mais: a 02.07 distingue
pesquisa real (fonte e data, da busca feita) de sugestão sem validação, sem rede; a 04.02 grava o
calendário editorial e a aprovação o põe na pauta; a 04.03 e a 04.02 seguem a estratégia aprovada da
Bia (02.04). Cada teste termina reaplicando o seed.
"""

from collections.abc import AsyncIterator
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

import psycopg
import pytest
from psycopg.rows import dict_row

from hellosquad.config import Settings
from hellosquad.llm.simulated import SimulatedLLM
from hellosquad.research.websearch import MockWebSearch, SearchResponse, SearchResult
from hellosquad.squad.deliveries import DELIVERIES, Finding, ResearchDelivery
from hellosquad.squad.flow import research_content
from hellosquad.worker.main import Worker

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"

# delivery → (agente, pedido da Marina, título do trabalho, kind da entrega)
REQUESTS = {
    "02.01": (
        "bia",
        "Bia, quero um diagnóstico do marketing da Miolo. O objetivo é vender mais até o Natal.",
        "Diagnóstico de marketing",
        "diagnosis",
    ),
    "02.02": (
        "bia",
        "Bia, documente o posicionamento, o público e os objetivos da Miolo.",
        "Posicionamento da Miolo",
        "positioning",
    ),
    "02.03": (
        "bia",
        "Bia, preciso de um plano de marketing com prioridades para vender mais até o Natal.",
        "Plano até o Natal",
        "marketing_plan",
    ),
    "02.04": (
        "bia",
        "Bia, quero a estratégia da campanha de Natal para vender encomendas antecipadas.",
        "Estratégia de Natal",
        "campaign_strategy",
    ),
    "02.07": (
        "bia",
        "Bia, pesquise os concorrentes do bairro e as tendências de fim de ano.",
        "Concorrentes e tendências",
        "market_research",
    ),
    "04.02": (
        "otto",
        "Otto, monte o calendário editorial da próxima semana, de 19 a 25/10.",
        "Calendário da semana 43",
        "editorial_calendar",
    ),
    "04.03": (
        "otto",
        "Otto, quero um reels para o Instagram e um status de WhatsApp sobre os bastidores da "
        "fornada de sábado.",
        "Bastidores do sábado",
        "multichannel_posts",
    ),
}
# Campos que o fluxo põe na entrega (não vêm do modelo).
FLOW_FIELDS = {"pesquisa", "fontes", "estrategia"}
AGENT_NAMES = {"bia": "Bia", "otto": "Otto"}


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def rows(conn: psycopg.AsyncConnection, query: str, *params: object) -> list[dict[str, Any]]:
    cursor = conn.cursor(row_factory=dict_row)
    await cursor.execute(query, params)
    return await cursor.fetchall()


async def one(conn: psycopg.AsyncConnection, query: str, *params: object) -> dict[str, Any]:
    [row] = await rows(conn, query, *params)
    return row


@pytest.fixture(autouse=True)
async def seed_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    yield
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


@pytest.fixture
async def miolo(admin_db: psycopg.AsyncConnection) -> str:
    return str((await one(admin_db, "select id from public.workspaces where slug = 'miolo'"))["id"])


async def request_work(api, access_token, miolo: str, delivery_type: str) -> dict[str, str]:
    agent, body, title, _ = REQUESTS[delivery_type]
    headers = bearer(access_token(MARINA))
    conversation = await api.post(
        f"/workspaces/{miolo}/conversations",
        headers=headers,
        json={"kind": "agent_direct", "primary_agent_id": agent},
    )
    assert conversation.status_code == 201, conversation.text
    conversation_id = conversation.json()["id"]
    message = await api.post(
        f"/conversations/{conversation_id}/messages", headers=headers, json={"body": body}
    )
    assert message.status_code == 201, message.text
    work = await api.post(
        f"/messages/{message.json()['id']}/work-items",
        headers=headers,
        json={"delivery_type": delivery_type, "title": title},
    )
    assert work.status_code == 201, work.text
    assert work.json()["primary_agent_id"] == agent
    return {
        "conversation_id": conversation_id,
        "work_item_id": work.json()["id"],
        "run_id": work.json()["run_id"],
    }


async def drain(web_search=None) -> list[str]:
    settings = Settings(llm_provider="simulated", worker_retry_base_seconds=0)
    async with Worker(settings, llm=SimulatedLLM(), web_search=web_search) as worker:
        return await worker.drain()


async def delivered(admin_db, work_item_id: str) -> dict[str, Any]:
    return await one(
        admin_db,
        """
        select d.kind, v.id as version_id, v.version_no, v.status::text as version_status,
               v.content, v.change_note, w.status::text as work_status,
               a.id as approval_id, a.status::text as approval_status
        from public.work_items w
        join public.deliveries d on d.work_item_id = w.id
        join public.delivery_versions v on v.delivery_id = d.id
        join public.approvals a on a.delivery_version_id = v.id and a.kind = 'review'
        where w.id = %s
        order by v.version_no desc
        limit 1
        """,
        work_item_id,
    )


async def approve(api, access_token, approval_id: str, body: dict | None = None) -> None:
    response = await api.post(
        f"/approvals/{approval_id}/decision",
        headers=bearer(access_token(MARINA)),
        json=body or {"decision": "approved"},
    )
    assert response.status_code == 200, response.text


def model_part(content: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in content.items() if k not in FLOW_FIELDS}


@pytest.mark.parametrize("delivery_type", sorted(REQUESTS))
async def test_delivery_end_to_end(api, access_token, admin_db, miolo, delivery_type):
    agent, _, _, kind = REQUESTS[delivery_type]
    work = await request_work(api, access_token, miolo, delivery_type)

    assert await drain() == ["delivered"]

    entry = await delivered(admin_db, work["work_item_id"])
    assert (entry["kind"], entry["version_no"], entry["work_status"]) == (kind, 1, "needs_you")
    assert entry["approval_status"] == "pending"
    DELIVERIES[delivery_type].entrega.model_validate(model_part(entry["content"]))

    # Cartão "material" na mensagem do especialista, ligado à versão e à pendência (S1f).
    message = await one(
        admin_db,
        """
        select author_agent_id::text, card ->> 'type' as card, delivery_version_id, approval_id
        from public.messages
        where conversation_id = %s and author_type = 'agent' and card is not null
        order by created_at desc limit 1
        """,
        work["conversation_id"],
    )
    assert message == {
        "author_agent_id": agent,
        "card": "material",
        "delivery_version_id": entry["version_id"],
        "approval_id": entry["approval_id"],
    }

    # Status por etapa (S1g): o especialista criando e, depois, aguardando a aprovação.
    events = await rows(
        admin_db,
        "select type, payload from public.run_events where run_id = %s order by seq",
        work["run_id"],
    )
    labels = [e["payload"].get("status_label") for e in events if e["payload"].get("status_label")]
    name = AGENT_NAMES[agent]
    assert f"{name} · criando a primeira versão" in labels
    assert labels[-1] == f"{name} · aguarda sua aprovação"

    # Crédito (S1e): preço provisório da delivery reservado e capturado uma vez.
    credits = await one(
        admin_db,
        """
        select r.credits_charged, h.state::text, p.credits as price, p.provisional
        from public.runs r
        join public.credit_holds h on h.run_id = r.id
        join public.delivery_prices p on p.id = h.price_id
        where r.id = %s
        """,
        work["run_id"],
    )
    assert credits == {
        "credits_charged": Decimal("10.00"),
        "state": "captured",
        "price": Decimal("10.00"),
        "provisional": True,
    }

    listed = await api.get(
        f"/work-items/{work['work_item_id']}", headers=bearer(access_token(MARINA))
    )
    assert listed.json()["status_label"] == "v1 aguarda sua aprovação"

    await approve(api, access_token, str(entry["approval_id"]))
    after = await delivered(admin_db, work["work_item_id"])
    assert (after["work_status"], after["version_status"]) == ("approved", "approved")

    # A2b §5.1: a lista de trabalhos traz a versão atual (número, estado, data e decisão).
    page = await api.get(f"/workspaces/{miolo}/work-items", headers=bearer(access_token(MARINA)))
    assert page.status_code == 200, page.text
    [listed_item] = [i for i in page.json()["items"] if i["id"] == work["work_item_id"]]
    current = listed_item["current_version"]
    assert (current["id"], current["version_no"]) == (str(after["version_id"]), 1)
    assert (current["status"], current["decision"]) == ("approved", "approved")


async def test_research_without_search_is_suggestion_only(api, access_token, admin_db, miolo):
    work = await request_work(api, access_token, miolo, "02.07")
    assert await drain() == ["delivered"]

    content = (await delivered(admin_db, work["work_item_id"]))["content"]
    assert content["pesquisa"]["estado"] == "indisponivel"
    assert content["pesquisa"]["motivo"] == "disabled"
    assert content["fontes"] == []
    assert {a["tipo"] for a in content["achados"]} == {"sugestao"}
    assert "Não houve pesquisa na web" in content["resumo"]

    tool = await one(
        admin_db,
        "select payload from public.run_steps where run_id = %s and payload ->> 'tool' = %s",
        work["run_id"],
        "pesquisa.web",
    )
    assert (tool["payload"]["provider"], tool["payload"]["estado"]) == ("disabled", "indisponivel")


async def test_research_with_search_cites_dated_sources(api, access_token, admin_db, miolo):
    work = await request_work(api, access_token, miolo, "02.07")
    collected = datetime(2026, 10, 16, 15, 0, tzinfo=UTC)
    assert await drain(MockWebSearch(now=collected)) == ["delivered"]

    content = (await delivered(admin_db, work["work_item_id"]))["content"]
    assert content["pesquisa"] == {
        "estado": "realizada",
        "provedor": "mock",
        "consulta": "Concorrentes do bairro e tendências de fim de ano para padarias de "
        "fermentação natural · Preparar o Natal",
        "coletado_em": collected.isoformat(),
        "motivo": None,
    }
    assert [f["id"] for f in content["fontes"]] == ["F1", "F2", "F3"]
    for source in content["fontes"]:
        assert source["url"].split("/")[2].endswith(".example")
        assert source["publicado_em"] and source["coletado_em"] == collected.isoformat()
    researched = [a for a in content["achados"] if a["tipo"] == "pesquisa"]
    suggested = [a for a in content["achados"] if a["tipo"] == "sugestao"]
    assert len(researched) == 3 and all(a["fontes"] for a in researched)
    assert suggested and all(a["fontes"] == [] for a in suggested)

    thinking = await rows(
        admin_db,
        "select payload ->> 'status_label' as label from public.run_events "
        "where run_id = %s and type = 'agent.thinking'",
        work["run_id"],
    )
    assert "Bia · pesquisando na web" in [t["label"] for t in thinking]


def test_research_finding_without_collected_source_becomes_suggestion():
    response = SearchResponse(
        provider="mock",
        query="padarias",
        retrieved_at=datetime(2026, 10, 16, tzinfo=UTC),
        results=[
            SearchResult("Fonte", "https://a.example/1", "trecho", date(2026, 10, 1)),
        ],
    )
    draft = ResearchDelivery(
        titulo="t",
        resumo="r",
        achados=[
            Finding(texto="com fonte", tipo="pesquisa", fontes=["F1"]),
            Finding(texto="fonte inventada", tipo="pesquisa", fontes=["F9"]),
            Finding(texto="ideia", tipo="sugestao", fontes=["F1"]),
        ],
        hipoteses=[],
        proximos_passos=[],
    )
    content = research_content(draft, response, None)
    assert [(a["tipo"], a["fontes"]) for a in content["achados"]] == [
        ("pesquisa", ["F1"]),
        ("sugestao", []),
        ("sugestao", []),
    ]
    assert content["fontes"][0]["publicado_em"] == "2026-10-01"
    assert research_content(draft, None, "disabled")["fontes"] == []


async def test_calendar_is_persisted_and_planned_on_approval(api, access_token, admin_db, miolo):
    work = await request_work(api, access_token, miolo, "04.02")
    assert await drain() == ["delivered"]
    entry = await delivered(admin_db, work["work_item_id"])

    posts = await rows(
        admin_db,
        """
        select scheduled_on, scheduled_time::text, channel, format, theme, owner_agent_id::text,
               status::text, delivery_version_id
        from public.calendar_posts where work_item_id = %s order by scheduled_on
        """,
        work["work_item_id"],
    )
    assert [(p["scheduled_on"], p["channel"], p["format"], p["owner_agent_id"]) for p in posts] == [
        (date(2026, 10, 19), "instagram", "post", "otto"),
        (date(2026, 10, 21), "instagram", "reels", "kaia"),
        (date(2026, 10, 23), "whatsapp", "status", "otto"),
    ]
    assert {p["status"] for p in posts} == {"draft"}
    assert {p["delivery_version_id"] for p in posts} == {entry["version_id"]}

    # Ajuste pedido: a v2 troca os rascunhos da v1.
    await approve(
        api,
        access_token,
        str(entry["approval_id"]),
        {"decision": "changes_requested", "note": "Passe os bastidores para quinta."},
    )
    assert await drain() == ["delivered"]
    v2 = await delivered(admin_db, work["work_item_id"])
    assert v2["version_no"] == 2
    posts = await rows(
        admin_db,
        "select scheduled_on, status::text, delivery_version_id from public.calendar_posts "
        "where work_item_id = %s order by scheduled_on",
        work["work_item_id"],
    )
    assert [p["scheduled_on"] for p in posts] == [
        date(2026, 10, 19),
        date(2026, 10, 22),
        date(2026, 10, 23),
    ]
    assert {p["delivery_version_id"] for p in posts} == {v2["version_id"]}

    await approve(api, access_token, str(v2["approval_id"]))
    statuses = await rows(
        admin_db,
        "select status::text from public.calendar_posts where work_item_id = %s",
        work["work_item_id"],
    )
    assert {s["status"] for s in statuses} == {"planned"}

    # O post abre como objeto da conversa (pelo id) e a fala do Otto lê a pauta.
    post_id = str(
        (
            await one(
                admin_db,
                "select id from public.calendar_posts where work_item_id = %s "
                "and scheduled_on = '2026-10-22'",
                work["work_item_id"],
            )
        )["id"]
    )
    conversation = await api.post(
        f"/workspaces/{miolo}/conversations",
        headers=bearer(access_token(MARINA)),
        json={"kind": "object", "context": {"type": "calendar_post", "id": post_id}},
    )
    assert conversation.status_code == 201, conversation.text
    context = conversation.json()["context"]
    assert (context["title"], context["status"]) == ("Bastidores da fermentação longa", "planned")
    assert conversation.json()["primary_agent_id"] == "kaia"

    calendar = await api.get(
        f"/workspaces/{miolo}/calendar",
        headers=bearer(access_token(MARINA)),
        params={"from": "2026-10-19", "to": "2026-10-25"},
    )
    assert calendar.status_code == 200, calendar.text
    assert [p["theme"] for p in calendar.json()["items"]] == [
        "Fornada de segunda",
        "Bastidores da fermentação longa",
        "Encomendas do fim de semana",
    ]
    # A2b §5.2: versão, título do trabalho de origem e objetivo de cada post.
    assert {(p["version_no"], p["work_item_title"]) for p in calendar.json()["items"]} == {
        (2, "Calendário da semana 43")
    }
    assert all(p["objective"] for p in calendar.json()["items"])


async def test_otto_follows_approved_strategy(api, access_token, admin_db, miolo):
    strategy = await request_work(api, access_token, miolo, "02.04")
    assert await drain() == ["delivered"]
    strategy_entry = await delivered(admin_db, strategy["work_item_id"])
    await approve(api, access_token, str(strategy_entry["approval_id"]))

    posts = await request_work(api, access_token, miolo, "04.03")
    calendar = await request_work(api, access_token, miolo, "04.02")
    assert await drain() == ["delivered", "delivered"]

    content = (await delivered(admin_db, posts["work_item_id"]))["content"]
    assert content["estrategia"] == {
        "delivery_version_id": str(strategy_entry["version_id"]),
        "versao": 1,
        "conceito": "Natal de forno aceso",
    }
    assert "Natal de forno aceso" in content["notas"]

    themes = await rows(
        admin_db,
        "select theme from public.calendar_posts where work_item_id = %s",
        calendar["work_item_id"],
    )
    assert any("Natal de forno aceso" in t["theme"] for t in themes)
