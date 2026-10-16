"""S2b: Kiwi (05.01, 05.02), Max (06.01–06.03) e Íris (07.02–07.04) ponta a ponta no modo simulado.

Pedido na conversa direta → trabalho → worker (fixtures) → entrega revisável com cartão, status por
etapa e crédito capturado uma vez → aprovação da dona da conta. Mais: os números das entregas
saem da base de contatos e de `metrics_daily`, nunca do modelo; nada é investido nem enviado;
estado vazio pede importação ou conexão sem cobrar; a Íris não afirma causa sem evidência
(fixtures e fluxo); a importação de CSV recusa linha sem consentimento, duplicata e e-mail fora de
`.example` no local.
Cada teste termina reaplicando o seed.
"""

import json
import re
from collections.abc import AsyncIterator
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

import psycopg
import pytest
from psycopg.rows import dict_row

from hellosquad.config import Settings
from hellosquad.contacts.routes import parse_rows
from hellosquad.llm.simulated import FIXTURES_DIR, SimulatedLLM
from hellosquad.squad.data import ground_reading, ground_recommendation, metrics_evidence
from hellosquad.squad.deliveries import DELIVERIES, Reading, Recommendation
from hellosquad.worker.main import Worker

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
RAFAEL = "rafael@vitta.example"
CARLA = "carla@vitta.example"
JULIANA = "juliana@trilha.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"

# delivery → (agente, pedido, título do trabalho, kind da entrega)
REQUESTS = {
    "05.01": (
        "kiwi",
        "Kiwi, quanto investir em anúncios no Natal? Quero mais encomendas pelo site e tenho até "
        "R$ 1.500 por mês.",
        "Plano de mídia do Natal",
        "media_plan",
    ),
    "05.02": (
        "kiwi",
        "Kiwi, quero testar dois anúncios das encomendas de Natal no Instagram.",
        "Teste de anúncios do Natal",
        "ad_tests",
    ),
    "06.01": (
        "max",
        "Max, quero reativar os clientes que sumiram, com uma oferta para as encomendas de Natal.",
        "Reativação de Natal",
        "retention_campaign",
    ),
    "06.02": (
        "max",
        "Max, escreva a sequência de e-mails e mensagens da reativação.",
        "Sequência da reativação",
        "message_sequence",
    ),
    "06.03": (
        "max",
        "Max, organize minha base de clientes em segmentos.",
        "Segmentos da base",
        "customer_segments",
    ),
    "07.02": (
        "iris",
        "Íris, analise meus últimos resultados.",
        "Análise do mês",
        "performance_analysis",
    ),
    "07.03": (
        "iris",
        "Íris, compare o último mês com o anterior e monte o relatório.",
        "Relatório do mês",
        "period_report",
    ),
    "07.04": (
        "iris",
        "Íris, o que devemos fazer primeiro a partir dos números?",
        "Prioridades a partir dos números",
        "prioritized_recommendations",
    ),
}
AGENT_NAMES = {"kiwi": "Kiwi", "max": "Max", "iris": "Íris"}
# Campos que o fluxo põe na entrega (não vêm do modelo).
FLOW_FIELDS = {
    "execucao",
    "plano_de_midia",
    "base",
    "envio",
    "publico",
    "campanha",
    "dados",
    "evidencias",
    "relatorio_anterior",
    "analises",
}
SEGMENT_NUMBERS = {"tamanho", "elegiveis"}
# Base fictícia da Miolo (seed): tamanho e elegíveis por canal de cada segmento possível.
MIOLO_SEGMENTS = {
    "todos": {"tamanho": 20, "elegiveis": {"email": 10, "whatsapp": 6}},
    "ativos_30": {"tamanho": 6, "elegiveis": {"email": 3, "whatsapp": 2}},
    "esfriando_31_90": {"tamanho": 5, "elegiveis": {"email": 3, "whatsapp": 2}},
    "inativos_90": {"tamanho": 7, "elegiveis": {"email": 3, "whatsapp": 2}},
    "sem_compra": {"tamanho": 2, "elegiveis": {"email": 1, "whatsapp": 0}},
    "recorrentes": {"tamanho": 9, "elegiveis": {"email": 5, "whatsapp": 5}},
}
CAUSAL = re.compile(
    r"\b(por causa d|causou|causad[oa]s? por|devido [àa]|devido ao|graças [àa]|provocou|"
    r"resultou em|levou [àa]|é o motivo|foi o motivo|fez (cair|subir|crescer|aumentar|diminuir))",
    re.IGNORECASE,
)


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


async def workspace(admin_db, slug: str) -> str:
    return str(
        (await one(admin_db, "select id from public.workspaces where slug = %s", slug))["id"]
    )


@pytest.fixture
async def miolo(admin_db: psycopg.AsyncConnection) -> str:
    return await workspace(admin_db, "miolo")


async def request_work(api, access_token, ws: str, delivery_type: str, who: str = MARINA) -> dict:
    agent, body, title, _ = REQUESTS[delivery_type]
    headers = bearer(access_token(who))
    conversation = await api.post(
        f"/workspaces/{ws}/conversations",
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


async def drain() -> list[str]:
    settings = Settings(llm_provider="simulated", worker_retry_base_seconds=0)
    async with Worker(settings, llm=SimulatedLLM()) as worker:
        return await worker.drain()


async def delivered(admin_db, work_item_id: str) -> dict[str, Any]:
    return await one(
        admin_db,
        """
        select d.kind, v.id as version_id, v.version_no, v.status::text as version_status,
               v.content, w.status::text as work_status,
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


async def approve(api, access_token, approval_id: str) -> None:
    response = await api.post(
        f"/approvals/{approval_id}/decision",
        headers=bearer(access_token(MARINA)),
        json={"decision": "approved"},
    )
    assert response.status_code == 200, response.text


def model_part(content: dict[str, Any]) -> dict[str, Any]:
    """O que o modelo escreveu: sem os campos e os números que o fluxo acrescenta."""
    part = {k: v for k, v in content.items() if k not in FLOW_FIELDS}
    if isinstance(part.get("segmentos"), list):
        part["segmentos"] = [
            {k: v for k, v in s.items() if k not in SEGMENT_NUMBERS} for s in part["segmentos"]
        ]
    if isinstance(part.get("segmento"), dict):
        part["segmento"] = {k: v for k, v in part["segmento"].items() if k not in SEGMENT_NUMBERS}
    return part


@pytest.mark.parametrize("delivery_type", sorted(REQUESTS))
async def test_delivery_end_to_end(api, access_token, admin_db, miolo, delivery_type):
    agent, _, _, kind = REQUESTS[delivery_type]
    work = await request_work(api, access_token, miolo, delivery_type)

    assert await drain() == ["delivered"]

    entry = await delivered(admin_db, work["work_item_id"])
    assert (entry["kind"], entry["version_no"], entry["work_status"]) == (kind, 1, "needs_you")
    assert entry["approval_status"] == "pending"
    DELIVERIES[delivery_type].entrega.model_validate(model_part(entry["content"]))

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

    events = await rows(
        admin_db,
        "select type, payload from public.run_events where run_id = %s order by seq",
        work["run_id"],
    )
    labels = [e["payload"].get("status_label") for e in events if e["payload"].get("status_label")]
    name = AGENT_NAMES[agent]
    assert f"{name} · criando a primeira versão" in labels
    assert labels[-1] == f"{name} · aguarda sua aprovação"

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


async def test_kiwi_never_invests_and_tests_follow_the_approved_plan(
    api, access_token, admin_db, miolo
):
    plan_work = await request_work(api, access_token, miolo, "05.01")
    assert await drain() == ["delivered"]
    plan = await delivered(admin_db, plan_work["work_item_id"])
    budget = plan["content"]["orcamento"]
    assert plan["content"]["execucao"] == {
        "investimento": "nao_executado",
        "conta_de_anuncios": "nao_conectada",
    }
    assert budget["teto_proposto"] <= budget["teto_informado"] == 1500
    assert sum(s["valor"] for s in budget["distribuicao"]) <= budget["teto_proposto"]

    # Sem plano aprovado, o teste de anúncios não tem teto de referência.
    early = await request_work(api, access_token, miolo, "05.02")
    assert await drain() == ["delivered"]
    assert (await delivered(admin_db, early["work_item_id"]))["content"]["plano_de_midia"] is None

    await approve(api, access_token, str(plan["approval_id"]))
    tests_work = await request_work(api, access_token, miolo, "05.02")
    assert await drain() == ["delivered"]
    content = (await delivered(admin_db, tests_work["work_item_id"]))["content"]
    assert content["execucao"] == {"anuncios": "nao_criados", "conta_de_anuncios": "nao_conectada"}
    assert content["plano_de_midia"] == {
        "delivery_version_id": str(plan["version_id"]),
        "versao": 1,
        "teto_proposto": budget["teto_proposto"],
    }
    assert sum(t["verba"] or 0 for t in content["testes"]) <= budget["teto_proposto"]
    tool = await one(
        admin_db,
        "select count(*) as n from public.run_steps where run_id = %s and payload ->> 'tool' "
        "like 'ads.%%'",
        tests_work["run_id"],
    )
    assert tool["n"] == 0


async def test_max_numbers_come_from_the_base_and_nothing_is_sent(
    api, access_token, admin_db, miolo
):
    segments_work = await request_work(api, access_token, miolo, "06.03")
    assert await drain() == ["delivered"]
    segments = await delivered(admin_db, segments_work["work_item_id"])
    content = segments["content"]
    assert content["base"] == {
        "total": 20,
        "com_consentimento": {"email": 10, "whatsapp": 6, "algum": 10},
        "sem_consentimento": 10,
        "origens": [{"origem": "importação CSV de teste", "contatos": 20}],
        "calculado_em": content["base"]["calculado_em"],
    }
    assert content["segmentos"]
    for segment in content["segmentos"]:
        expected = MIOLO_SEGMENTS[segment["id"]]
        assert (segment["tamanho"], segment["elegiveis"]) == (
            expected["tamanho"],
            expected["elegiveis"],
        )
    await approve(api, access_token, str(segments["approval_id"]))

    campaign_work = await request_work(api, access_token, miolo, "06.01")
    assert await drain() == ["delivered"]
    campaign = await delivered(admin_db, campaign_work["work_item_id"])
    segment = campaign["content"]["segmento"]
    assert (segment["tamanho"], segment["elegiveis"]) == (
        MIOLO_SEGMENTS[segment["id"]]["tamanho"],
        MIOLO_SEGMENTS[segment["id"]]["elegiveis"],
    )
    assert campaign["content"]["envio"] == "nao_autorizado"
    await approve(api, access_token, str(campaign["approval_id"]))

    sequence_work = await request_work(api, access_token, miolo, "06.02")
    assert await drain() == ["delivered"]
    sequence = (await delivered(admin_db, sequence_work["work_item_id"]))["content"]
    assert sequence["envio"] == "nao_autorizado"
    assert sequence["campanha"] == {
        "delivery_version_id": str(campaign["version_id"]),
        "versao": 1,
    }
    assert all(step["descadastro"] for step in sequence["etapas"])

    # Nada saiu: nenhum envio, nenhuma ferramenta de envio, nenhum consentimento novo.
    sent = await one(
        admin_db,
        """
        select count(*) filter (where payload ->> 'tool' like 'envios.%%') as envios,
               count(*) filter (where payload ->> 'tool' = 'segmentos.criar') as leituras
        from public.run_steps
        where run_id = any(%s::uuid[])
        """,
        [segments_work["run_id"], campaign_work["run_id"], sequence_work["run_id"]],
    )
    assert sent == {"envios": 0, "leituras": 3}
    consents = await one(admin_db, "select count(*) as n from public.consents")
    assert consents["n"] == 16


@pytest.mark.parametrize(
    ("delivery_type", "missing"), [("06.03", "contacts"), ("07.02", "metrics")]
)
async def test_empty_workspace_asks_for_data_without_charging(
    api, access_token, admin_db, delivery_type, missing
):
    trilha = await workspace(admin_db, "trilha")
    agent = REQUESTS[delivery_type][0]
    work = await request_work(api, access_token, trilha, delivery_type, who=JULIANA)
    assert await drain() == ["asked"]

    state = await one(
        admin_db,
        """
        select w.status::text as work_status, a.kind::text as approval_kind,
               m.author_agent_id::text as author, m.body, m.card ->> 'type' as card,
               (select count(*) from public.deliveries d where d.work_item_id = w.id) as deliveries,
               (select h.state::text from public.credit_holds h where h.run_id = %s) as hold
        from public.work_items w
        join public.approvals a on a.work_item_id = w.id and a.status = 'pending'
        join public.messages m on m.conversation_id = w.conversation_id and m.author_type = 'agent'
        where w.id = %s
        """,
        work["run_id"],
        work["work_item_id"],
    )
    assert state["work_status"] == "needs_you"
    assert (state["approval_kind"], state["author"], state["card"]) == (
        "respond",
        agent,
        "question",
    )
    assert state["deliveries"] == 0
    assert state["hold"] == "released"
    assert "Trilha Urbana" in state["body"]
    step = await one(
        admin_db,
        "select payload from public.run_steps where run_id = %s and payload ->> 'tool' = %s",
        work["run_id"],
        "conversas.perguntar",
    )
    assert step["payload"]["faltam"] == [missing]


async def test_iris_evidence_is_computed_from_metrics_daily(api, access_token, admin_db, miolo):
    work = await request_work(api, access_token, miolo, "07.03")
    assert await drain() == ["delivered"]
    content = (await delivered(admin_db, work["work_item_id"]))["content"]

    yesterday = date.today() - timedelta(days=1)
    assert content["dados"]["atualizado_ate"] == yesterday.isoformat()
    assert content["dados"]["periodo_atual"] == {
        "inicio": (yesterday - timedelta(days=29)).isoformat(),
        "fim": yesterday.isoformat(),
    }
    assert content["dados"]["fontes"] == ["fonte_de_teste"]
    evidence = {e["id"]: e for e in content["evidencias"]}
    assert [(e["canal"], e["metrica"]) for e in content["evidencias"]] == [
        ("site", "sessions"),
        ("instagram", "followers"),
        ("instagram", "reach"),
        ("store", "orders"),
    ]
    # O texto das fixtures diz: sessões caíram, seguidores subiram pouco, alcance subiu, pedidos
    # quase estáveis. Os números calculados do seed confirmam a direção.
    assert evidence["E1"]["variacao_pct"] < 0
    assert 0 < evidence["E2"]["variacao_pct"] < 10
    assert evidence["E3"]["variacao_pct"] > 0
    assert -10 < evidence["E4"]["variacao_pct"] < 2
    # O buraco de 3 dias nas sessões é dado ausente, não zero: a variação usa a média diária.
    assert evidence["E1"]["dias_com_dado"] == {"atual": 30, "anterior": 27}
    assert evidence["E1"]["base_da_variacao"] == "media_diaria"
    assert [g for g in content["dados"]["lacunas"] if g["metrica"] == "sessions"] == [
        {
            "canal": "site",
            "metrica": "sessions",
            "de": (date.today() - timedelta(days=45)).isoformat(),
            "ate": (date.today() - timedelta(days=43)).isoformat(),
        }
    ]
    for reading in content["destaques"] + content["por_canal"]:
        if reading["tipo"] == "fato":
            assert reading["evidencias"] and set(reading["evidencias"]) <= set(evidence)
        assert reading["tipo"] != "causa"


def test_iris_fixtures_never_claim_cause_without_evidence():
    """Teste de fixture: a entrega da Íris não afirma causa sem evidência marcada."""
    for delivery_type in ("07.02", "07.03", "07.04"):
        path = FIXTURES_DIR / delivery_type / "iris.produce.json"
        for case in json.loads(path.read_text(encoding="utf-8"))["cases"]:
            entrega = case["output"]["entrega"]
            readings = (
                entrega.get("leituras", [])
                + entrega.get("destaques", [])
                + entrega.get("por_canal", [])
            )
            for reading in readings:
                tests = [e for e in reading["evidencias"] if e.startswith("T")]
                assert reading["tipo"] != "causa" or tests, (delivery_type, reading)
                assert reading["tipo"] != "fato" or reading["evidencias"], (delivery_type, reading)
            for item in entrega.get("recomendacoes", []):
                assert item["base"] != "dado" or item["evidencias"], (delivery_type, item)
            found = CAUSAL.findall(json.dumps(case["output"], ensure_ascii=False))
            assert not found, (delivery_type, case["name"], found)


def test_flow_downgrades_cause_and_unsupported_fact_to_hypothesis():
    evidence = {"E1", "E2"}
    cause = Reading(texto="A queda veio da pausa dos posts.", tipo="causa", evidencias=["E1"])
    assert ground_reading(cause, evidence, set())["tipo"] == "hipotese"
    tested = Reading(texto="O teste A/B mostrou diferença.", tipo="causa", evidencias=["T1"])
    assert ground_reading(tested, evidence, {"T1"})["tipo"] == "causa"
    fact = Reading(texto="As sessões caíram.", tipo="fato", evidencias=["E9"])
    assert ground_reading(fact, evidence, set()) | {} == {
        "texto": "As sessões caíram.",
        "tipo": "hipotese",
        "evidencias": [],
    }
    grounded = Reading(texto="As sessões caíram.", tipo="fato", evidencias=["E1"])
    assert ground_reading(grounded, evidence, set())["tipo"] == "fato"
    recommendation = Recommendation(
        ordem=1,
        acao="Pôr link do site nos posts",
        por_que="As sessões caíram.",
        base="dado",
        evidencias=["E7"],
        responsavel="otto",
        esforco="baixo",
        discutir_com=["nexo"],
    )
    assert ground_recommendation(recommendation, evidence)["base"] == "hipotese"


def test_metrics_evidence_treats_missing_days_as_absent_not_zero():
    last = date(2026, 10, 15)
    rows_ = [
        {
            "channel": "site",
            "metric": "sessions",
            "day": last - timedelta(days=n),
            "value": Decimal(100),
            "unit": "sessões",
            "source": "fonte_de_teste",
        }
        for n in range(14)
        if n not in (9, 10)
    ]
    data = metrics_evidence(rows_, last, 7)
    [e1] = data["evidencias"]
    assert (e1["atual"], e1["anterior"], e1["variacao_pct"]) == (700, 500, 0.0)
    assert data["lacunas"] == [
        {"canal": "site", "metrica": "sessions", "de": "2026-10-05", "ate": "2026-10-06"}
    ]


async def test_metric_conversation_points_to_the_series(api, access_token, admin_db, miolo):
    headers = bearer(access_token(MARINA))
    opened = await api.post(
        f"/workspaces/{miolo}/conversations",
        headers=headers,
        json={
            "kind": "object",
            "context": {"type": "metric", "key": "site.sessions", "title": "Sessões no site"},
        },
    )
    assert opened.status_code == 201, opened.text
    conversation = await one(
        admin_db,
        "select primary_agent_id::text, context_meta from public.conversations where id = %s",
        opened.json()["id"],
    )
    first = (date.today() - timedelta(days=90)).isoformat()
    last = (date.today() - timedelta(days=1)).isoformat()
    assert conversation["primary_agent_id"] == "iris"
    assert conversation["context_meta"]["period"] == f"{first}/{last}"
    assert conversation["context_meta"]["origin"] == "fonte_de_teste"

    series = await api.get(
        f"/workspaces/{miolo}/metrics",
        headers=headers,
        params={"from": first, "to": last, "channel": "site"},
    )
    assert series.status_code == 200, series.text
    [sessions] = series.json()["items"]
    assert (sessions["metric"], sessions["unit"], sessions["sources"]) == (
        "sessions",
        "sessões",
        ["fonte_de_teste"],
    )
    assert len(sessions["points"]) == 87
    assert sessions["missing_days"] == [
        (date.today() - timedelta(days=n)).isoformat() for n in (45, 44, 43)
    ]
    rafael = await api.get(
        f"/workspaces/{miolo}/metrics",
        headers=bearer(access_token(RAFAEL)),
        params={"from": first, "to": last},
    )
    assert rafael.status_code == 404


CSV_HEADER = (
    "nome;email;telefone;consentimento_email;consentimento_whatsapp;data_consentimento;"
    "ultima_compra;compras"
)


async def test_csv_import_refuses_without_consent_duplicates_and_real_emails(
    api, access_token, admin_db, miolo
):
    lines = [
        CSV_HEADER,
        "Bia Nova;nova01@contatos.example;+55 11 99999-0021;sim;sim;2026-10-01;2026-09-20;2",
        "Sem Consentimento;nova02@contatos.example;;não;não;;;",
        "Repetida no Arquivo;nova01@contatos.example;;sim;não;2026-10-01;;",
        "Já na Base;cliente01@contatos.example;;sim;não;2026-10-01;;",
        "Fora do Domínio;pessoa@exemplo.test;;sim;não;2026-10-01;;",
        "Só WhatsApp;;(11) 99999-0022;não;sim;02/10/2026;;",
        "Consentimento sem Data;nova03@contatos.example;;sim;não;;;",
        "WhatsApp sem Telefone;nova04@contatos.example;;não;sim;2026-10-01;;",
    ]
    response = await api.post(
        f"/workspaces/{miolo}/contacts/imports",
        headers=bearer(access_token(MARINA)),
        json={
            "file_name": "clientes-teste.csv",
            "source": "Planilha de teste do balcão",
            "csv": "\n".join(lines),
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert (body["total_rows"], body["accepted_rows"], body["refused_rows"]) == (8, 2, 6)
    assert body["refused"] == [
        {"line": 3, "reason": "no_consent"},
        {"line": 4, "reason": "duplicate_in_file"},
        {"line": 5, "reason": "duplicate_existing"},
        {"line": 6, "reason": "email_not_fictitious"},
        {"line": 8, "reason": "missing_consent_date"},
        {"line": 9, "reason": "consent_without_address"},
    ]
    # O relatório não guarda dado pessoal das linhas recusadas.
    stored = await one(
        admin_db, "select refused::text from public.contact_imports where id = %s", body["id"]
    )
    assert "@" not in stored["refused"] and "Consentimento" not in stored["refused"]

    imported = await rows(
        admin_db,
        """
        select c.full_name, c.email, c.phone, c.source,
               array_agg(s.channel::text || ':' || s.status::text || ':' || s.legal_basis::text
                         || ':' || s.given_at::text order by s.channel) as consents
        from public.contacts c join public.consents s on s.contact_id = c.id
        where c.import_id = %s
        group by c.id order by c.full_name
        """,
        body["id"],
    )
    assert imported == [
        {
            "full_name": "Bia Nova",
            "email": "nova01@contatos.example",
            "phone": "+5511999990021",
            "source": "Planilha de teste do balcão",
            "consents": ["email:granted:consent:2026-10-01", "whatsapp:granted:consent:2026-10-01"],
        },
        {
            "full_name": "Só WhatsApp",
            "email": None,
            "phone": "+5511999990022",
            "source": "Planilha de teste do balcão",
            "consents": ["whatsapp:granted:consent:2026-10-02"],
        },
    ]
    names = await one(
        admin_db,
        "select count(*) as n from public.contacts where full_name in "
        "('Sem Consentimento', 'Fora do Domínio', 'Repetida no Arquivo')",
    )
    assert names["n"] == 0

    summary = await api.get(
        f"/workspaces/{miolo}/contacts/summary", headers=bearer(access_token(MARINA))
    )
    assert summary.status_code == 200, summary.text
    listed = summary.json()
    assert listed["last_import_at"] is not None
    assert {k: v for k, v in listed.items() if k not in ("sources", "last_import_at")} == {
        "total": 22,
        "consented": {"email": 11, "whatsapp": 8, "any_channel": 12},
        "without_consent": 10,
    }
    assert sorted((s["source"], s["contacts"]) for s in listed["sources"]) == [
        ("Planilha de teste do balcão", 2),
        ("importação CSV de teste", 20),
    ]
    audit = await one(
        admin_db,
        "select payload from public.audit_events where action = 'contacts.imported' "
        "and entity_id = %s",
        body["id"],
    )
    assert audit["payload"] == {"total": 8, "accepted": 2, "refused": 6, "revoked": 0}


async def test_csv_import_permissions_and_invalid_files(api, access_token, admin_db, miolo):
    vitta = await workspace(admin_db, "vitta")
    payload = {
        "file_name": "x.csv",
        "source": "Teste",
        "csv": CSV_HEADER + "\nAlguém;alguem@contatos.example;;sim;não;2026-10-01;;",
    }
    carla = await api.post(
        f"/workspaces/{vitta}/contacts/imports", headers=bearer(access_token(CARLA)), json=payload
    )
    assert carla.status_code == 403, carla.text
    rafael = await api.post(
        f"/workspaces/{miolo}/contacts/imports", headers=bearer(access_token(RAFAEL)), json=payload
    )
    assert rafael.status_code == 404, rafael.text
    missing = await api.post(
        f"/workspaces/{miolo}/contacts/imports",
        headers=bearer(access_token(MARINA)),
        json=payload | {"csv": "nome;email\nAlguém;alguem@contatos.example"},
    )
    assert missing.status_code == 422
    assert missing.json()["error"]["code"] == "invalid_csv"
    count = await one(admin_db, "select count(*) as n from public.contacts")
    assert count["n"] == 20


def test_parse_rows_accepts_comma_and_accented_headers():
    content = (
        "Nome,E-mail,Telefone,Consentimento e-mail,Consentimento WhatsApp,Data consentimento\n"
        "Ana,ana@contatos.example,,Sim,Não,15/10/2026\n"
    )
    total, accepted, refused = parse_rows(content, today=date(2026, 10, 16), local=True)
    assert (total, refused) == (1, [])
    assert accepted[0]["consents"] == [{"channel": "email", "given_at": "2026-10-15"}]
    total, accepted, refused = parse_rows(
        content.replace("15/10/2026", "17/10/2026"), today=date(2026, 10, 16), local=True
    )
    assert refused == [{"line": 2, "reason": "invalid_consent_date"}]
    _, _, refused = parse_rows(
        content.replace("contatos.example", "contatos.test"), today=date(2026, 10, 16), local=False
    )
    assert refused == []


async def test_locale_in_me_and_business_language_change(api, access_token, admin_db, miolo):
    """Pedido da A2a: idioma da pessoa e do negócio no GET /me; owner ou admin troca o do
    negócio."""
    me = (await api.get("/me", headers=bearer(access_token(MARINA)))).json()
    stored = await one(
        admin_db,
        "select raw_user_meta_data ->> 'locale' as locale from auth.users where email = %s",
        MARINA,
    )
    assert me["user"]["locale"] == stored["locale"]
    assert [m["workspace"]["locale"] for m in me["memberships"]] == ["pt-BR"]
    juliana = (await api.get("/me", headers=bearer(access_token(JULIANA)))).json()
    assert juliana["user"]["locale"] is None

    changed = await api.patch(
        f"/workspaces/{miolo}", headers=bearer(access_token(MARINA)), json={"locale": "en"}
    )
    assert changed.status_code == 200, changed.text
    assert (changed.json()["slug"], changed.json()["locale"]) == ("miolo", "en")
    listed = await api.get("/workspaces", headers=bearer(access_token(MARINA)))
    assert [w["locale"] for w in listed.json()["items"]] == ["en"]
    audit = await one(
        admin_db,
        "select payload from public.audit_events where action = 'workspace.locale_changed' "
        "and workspace_id = %s order by created_at desc, id desc limit 1",
        miolo,
    )
    assert audit["payload"] == {"from": "pt-BR", "to": "en"}

    vitta = await workspace(admin_db, "vitta")
    carla = await api.patch(
        f"/workspaces/{vitta}", headers=bearer(access_token(CARLA)), json={"locale": "es"}
    )
    assert carla.status_code == 403, carla.text
    rafael = await api.patch(
        f"/workspaces/{miolo}", headers=bearer(access_token(RAFAEL)), json={"locale": "es"}
    )
    assert rafael.status_code == 404, rafael.text
    unsupported = await api.patch(
        f"/workspaces/{miolo}", headers=bearer(access_token(MARINA)), json={"locale": "fr"}
    )
    assert unsupported.status_code == 422
