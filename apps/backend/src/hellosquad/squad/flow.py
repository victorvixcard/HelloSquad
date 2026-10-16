"""Fluxo v0 de um run: o Nexo qualifica o pedido e delega; o especialista produz, se autoverifica
e entrega para a revisão da pessoa. Cada chamada de LLM ou ferramenta vira uma etapa do run.
"""

import time
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, TypeVar

from pydantic import ValidationError

from hellosquad.i18n import t
from hellosquad.llm.base import (
    CallTag,
    ChatMessage,
    LLMClient,
    LLMError,
    LLMOutputError,
    SystemBlock,
    Usage,
)
from hellosquad.llm.pricing import ModelPrice, cost_usd
from hellosquad.research.websearch import (
    DisabledWebSearch,
    SearchResponse,
    WebSearch,
    WebSearchUnavailable,
)
from hellosquad.squad.data import (
    base_summary,
    contact_base,
    contact_block,
    ground_reading,
    ground_recommendation,
    metrics_block,
    metrics_evidence,
    metrics_summary,
    period_days,
    segment_numbers,
)
from hellosquad.squad.deliveries import (
    AdTestsDelivery,
    EditorialCalendarDelivery,
    MediaPlanDelivery,
    MessageSequenceDelivery,
    PerformanceAnalysisDelivery,
    PeriodReportDelivery,
    RecommendationsDelivery,
    ResearchDelivery,
    RetentionCampaignDelivery,
    SegmentationDelivery,
    delivery_spec,
)
from hellosquad.squad.loader import AgentDefinition, SquadLoader
from hellosquad.squad.memory import search_text
from hellosquad.squad.prompt import (
    RunContext,
    as_json,
    check_messages,
    production_messages,
    reply_messages,
    revision_messages,
    system_blocks,
    text,
    triage_messages,
)
from hellosquad.squad.schemas import (
    CHECK_SCHEMA,
    REPLY_SCHEMA,
    TRIAGE_SCHEMA,
    CheckResult,
    ReplyResult,
    StepOutput,
    TriageResult,
)
from hellosquad.squad.store import RunStore, WorkLive
from hellosquad.work.live import DISPLAY_TZ

COORDINATOR = "nexo"
TRIAGE_SKILL = "01.01"
REPLY_STEP = "reply"
# Rótulo curto do squad com o agente trabalhando (V4.6 _shortNow, L8064); os outros, "trabalhando".
SHORT_AT_WORK = {"bia": "researching", "kaia": "creating", "otto": "writing"}
TRIAGE_THINKING_BUDGET = 1024
TRIAGE_MAX_TOKENS = 4096
RESEARCH = "02.07"
CALENDAR = "04.02"
MULTICHANNEL = "04.03"
MEDIA_PLAN = "05.01"
AD_TESTS = "05.02"
CAMPAIGN = "06.01"
SEQUENCE = "06.02"
SEGMENTATION = "06.03"
ANALYSIS = "07.02"
REPORT = "07.03"
RECOMMENDATIONS = "07.04"
# Deliveries do Max que leem a base de contatos; a segmentação e a campanha não existem sem ela (a
# pessoa é chamada a importar). As da Íris leem as métricas e, sem métrica, pedem conexão ou
# planilha (Documento Mestre §14: estado vazio pede conexão ou importação, sem inventar resultado).
CONTACT_BASED = {SEGMENTATION, CAMPAIGN, SEQUENCE}
NEEDS_CONTACTS = {SEGMENTATION, CAMPAIGN}
METRIC_BASED = {ANALYSIS, REPORT, RECOMMENDATIONS}
# Documentos aprovados que cada delivery lê antes de produzir (no mesmo projeto; sem projeto, no
# workspace): o plano parte do diagnóstico, a campanha do posicionamento e do plano, e o Otto segue
# a estratégia da campanha (Documento Mestre, Anexo A: 02.03, 02.04 e 04.03).
PRIOR_DOCUMENTS = {
    "02.02": ["02.01"],
    "02.03": ["02.01", "02.02"],
    "02.04": ["02.02", "02.03"],
    CALENDAR: ["02.04"],
    MULTICHANNEL: ["02.04"],
    MEDIA_PLAN: ["02.02", "02.03", "02.04"],
    AD_TESTS: ["02.02", "02.04", MEDIA_PLAN],
    CAMPAIGN: ["02.02", SEGMENTATION],
    SEQUENCE: [CAMPAIGN],
    REPORT: [ANALYSIS, REPORT],
    RECOMMENDATIONS: [ANALYSIS, REPORT],
}
# Deliveries que trabalham com datas: a data de hoje vai no contexto.
DATED = {
    "02.03",
    "02.04",
    CALENDAR,
    MULTICHANNEL,
    MEDIA_PLAN,
    CAMPAIGN,
    SEQUENCE,
    ANALYSIS,
    REPORT,
    RECOMMENDATIONS,
}
CALENDAR_LOOKAHEAD_DAYS = 35

Output = TypeVar("Output", bound=StepOutput)


class FlowError(Exception):
    """Falha definitiva do fluxo (não adianta tentar de novo)."""

    transient = False

    def __init__(self, code: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(code)
        self.code = code
        self.details = details or {}


@dataclass(frozen=True)
class Squad:
    loader: SquadLoader
    llm: LLMClient
    prices: Mapping[str, ModelPrice]
    history_limit: int = 20
    memory_budget: int = 1500
    web_search: WebSearch = field(default_factory=DisabledWebSearch)


def status_fields(locale: str, agent: AgentDefinition, mode: str, phrase: str) -> dict[str, str]:
    """Status por etapa (FLUXOS_DA_V46.md §10.3): modo da V4.6, rótulo curto e a frase da conversa
    ("Otto · criando a primeira versão"), no idioma do workspace."""
    short = SHORT_AT_WORK.get(agent.id, "working") if mode == "work" else mode
    return {
        "status_mode": mode,
        "status_short": t(locale, f"status.short.{short}"),
        "status_label": t(
            locale, "status.label", agent=agent.name, phrase=t(locale, f"status.phrase.{phrase}")
        ),
    }


def production_phrase(feedback: dict[str, Any] | None) -> str:
    decision = (feedback or {}).get("decisao")
    return "adjusting" if decision in ("changes_requested", "rejected") else "creating_first"


def triage_field(locale: str, delivery_type: str, name: str) -> str:
    """Como perguntar pelo campo que falta: o texto da delivery, se houver; senão, o geral."""
    key = f"triage.field.{delivery_type}.{name}"
    text_ = t(locale, key)
    return text_ if text_ != key else t(locale, f"triage.field.{name}")


def require_tool(agent: AgentDefinition, tool: str) -> None:
    if not agent.allows(tool):
        raise FlowError("tool_not_allowed", {"agent_id": agent.id, "tool": tool})


def missing_fields(triage: TriageResult, essentials: list[str]) -> list[str]:
    """O essencial vazio no briefing extraído conta mesmo que o modelo diga que nada falta."""
    briefing = triage.briefing.model_dump()
    empty = {f for f in essentials if not str(briefing.get(f) or "").strip()}
    flagged = {f for f in triage.faltam if f in essentials}
    return [f for f in essentials if f in empty | flagged]


def change_note_key(feedback: dict[str, Any] | None, revisions: int) -> str:
    decision = (feedback or {}).get("decisao")
    if decision == "changes_requested":
        return "adjusted"
    if decision == "rejected":
        return "new_proposal"
    return "revised" if revisions else "first"


class StepCaller:
    def __init__(
        self,
        squad: Squad,
        store: RunStore,
        delivery_type: str,
        attempt: int,
        *,
        locale: str,
        conversation_id: Any = None,
        work_item_id: Any = None,
        next_step: str | None = None,
    ) -> None:
        self.squad = squad
        self.store = store
        self.delivery_type = delivery_type
        self.attempt = attempt
        self.locale = locale
        self.conversation_id = conversation_id
        self.work_item_id = work_item_id
        self.next_step = next_step
        self.last_model: str | None = None

    def work_live(self, agent: AgentDefinition, phrase: str) -> WorkLive | None:
        """No trabalho: "Otto criando a primeira versão" e "Otto entrega a v1" (V4.6 `_works`)."""
        if self.work_item_id is None or self.next_step is None:
            return None
        label = t(
            self.locale,
            "work.status.doing",
            agent=agent.name,
            phrase=t(self.locale, f"status.phrase.{phrase}"),
        )
        return WorkLive(self.work_item_id, label, self.next_step)

    async def llm(
        self,
        output_type: type[Output],
        *,
        agent: AgentDefinition,
        version: str,
        step: str,
        kind: str,
        model: str,
        system: list[SystemBlock],
        messages: list[ChatMessage],
        schema: dict[str, Any],
        phrase: str,
        effort: Any = None,
        thinking_budget: int | None = None,
        max_tokens: int = 16000,
    ) -> Output:
        await self.store.thinking(
            agent.id,
            step,
            status_fields(self.locale, agent, "work", phrase),
            self.conversation_id,
            self.work_live(agent, phrase),
        )
        step_id, seq = await self.store.start_step(
            kind,
            model,
            {
                "step": step,
                "agent_id": agent.id,
                "prompt_version": version,
                "attempt": self.attempt,
            },
        )
        started = time.monotonic()
        usage, cost, served_by = Usage(), Decimal(0), model
        try:
            completion = await self.squad.llm.complete(
                messages=messages,
                system=system,
                model=model,
                tag=CallTag(self.delivery_type, step),
                effort=effort,
                output_schema=schema,
                thinking_budget=thinking_budget,
                max_tokens=max_tokens,
            )
            usage, served_by = completion.usage, completion.model
            cost = cost_usd(usage, served_by, self.squad.prices)
            output = output_type.model_validate(completion.json())
        except ValidationError as exc:
            error = LLMOutputError(
                "A resposta do modelo não segue o formato da etapa.",
                details={"step": step, "errors": exc.error_count()},
            )
            await self._finish(step_id, "failed", usage, cost, started, served_by, error)
            raise error from exc
        except LLMError as exc:
            if exc.usage is not None:
                usage, served_by = exc.usage, exc.model or served_by
                cost = cost_usd(usage, served_by, self.squad.prices)
            await self._finish(step_id, "failed", usage, cost, started, served_by, exc)
            raise
        data: dict[str, Any] = {
            "provider": completion.provider,
            "stop_reason": completion.stop_reason,
            "request_id": completion.request_id,
            "fallback_used": completion.fallback_used,
            "output": output.model_dump(),
        }
        if isinstance(output, CheckResult):
            data["approved"] = output.approved
        if completion.extra:
            data["simulated"] = completion.extra
        await self._finish(step_id, "succeeded", usage, cost, started, served_by, data)
        await self.store.event("step.done", {"agent_id": agent.id, "step": step, "seq": seq})
        self.last_model = served_by
        return output

    async def _finish(
        self,
        step_id: Any,
        status: str,
        usage: Usage,
        cost: Decimal,
        started: float,
        model: str,
        data: dict[str, Any] | LLMError,
    ) -> None:
        if isinstance(data, LLMError):
            data = {"error": {"code": data.code, **data.details}}
        await self.store.finish_step(
            step_id,
            status=status,
            usage=usage,
            cost=cost,
            latency_ms=round((time.monotonic() - started) * 1000),
            model=model,
            data=data,
        )


async def run_flow(squad: Squad, store: RunStore) -> dict[str, Any]:
    data = await store.load(history_limit=squad.history_limit)
    item, locale = data.work_item, data.locale
    delivery_type = item.delivery_type
    spec = delivery_spec(delivery_type)
    if (
        not delivery_type
        or spec is None
        or not squad.loader.has_skill(data.agent_id, delivery_type)
    ):
        raise FlowError(
            "delivery_not_supported", {"delivery_type": delivery_type, "agent_id": data.agent_id}
        )

    nexo_prompt = squad.loader.prompt(COORDINATOR, TRIAGE_SKILL)
    expert_prompt = squad.loader.prompt(data.agent_id, delivery_type)
    nexo, expert = nexo_prompt.agent, expert_prompt.agent
    nexo_version = await store.ensure_prompt_version(nexo_prompt)
    expert_version = await store.ensure_prompt_version(expert_prompt)
    memory = await store.recall_memory(
        locale=locale,
        text=search_text(
            data.request, item.title, item.briefing, expert_prompt.skill.meta.get("titulo")
        ),
        budget=squad.memory_budget,
    )
    ctx = RunContext(
        locale=locale,
        brand_name=data.workspace_name,
        request=data.request,
        work_title=item.title,
        delivery_type=delivery_type,
        briefing=item.briefing,
        history=data.history,
        memory=memory,
        feedback=data.feedback,
    )
    calls = StepCaller(
        squad,
        store,
        delivery_type,
        data.attempts,
        locale=locale,
        conversation_id=item.conversation_id,
        work_item_id=item.id,
        next_step=t(locale, "work.next.delivers", agent=expert.name, version=data.next_version),
    )

    triage_title = t(locale, "work_item_step.nexo.triage")
    await store.work_step(item.id, triage_title, nexo.id, "in_progress")
    triage = await calls.llm(
        TriageResult,
        agent=nexo,
        version=nexo_version,
        step=f"{nexo.id}.triage",
        kind="llm_call",
        model=nexo.model["triagem"],
        system=system_blocks(nexo_prompt, ctx),
        messages=triage_messages(ctx, expert_prompt.skill),
        schema=TRIAGE_SCHEMA,
        phrase="organizing",
        thinking_budget=TRIAGE_THINKING_BUDGET,
        max_tokens=TRIAGE_MAX_TOKENS,
    )

    missing = missing_fields(triage, expert_prompt.skill.essentials)
    if missing:
        require_tool(nexo, "conversas.perguntar")
        fields = "; ".join(triage_field(locale, delivery_type, f) for f in missing)
        question = (triage.pergunta or "").strip() or t(
            locale, "triage.fallback_question", fields=fields
        )
        result = await store.ask(
            work_item=item,
            agent_id=nexo.id,
            question=question,
            tool_data={"tool": "conversas.perguntar", "agent_id": nexo.id, "faltam": missing},
            model=calls.last_model or nexo.model["triagem"],
            status=status_fields(locale, nexo, "wait", "wait_answer"),
        )
        return {"outcome": "asked", "missing": missing, **result}

    lacking = await missing_data(store, delivery_type)
    if lacking:
        require_tool(expert, "conversas.perguntar")
        result = await store.ask(
            work_item=item,
            agent_id=expert.id,
            question=t(locale, f"data.missing.{lacking}", brand=data.workspace_name),
            tool_data={"tool": "conversas.perguntar", "agent_id": expert.id, "faltam": [lacking]},
            model=calls.last_model or nexo.model["triagem"],
            status=status_fields(locale, expert, "wait", "wait_answer"),
        )
        return {"outcome": "asked", "missing": [lacking], **result}

    require_tool(nexo, "squad.delegar")
    await store.work_step(item.id, triage_title, nexo.id, "done")
    briefing = triage.briefing.model_dump()
    await store.tool_step(
        {
            "tool": "squad.delegar",
            "agent_id": nexo.id,
            "to": expert.id,
            "delivery_type": delivery_type,
            "briefing": briefing,
            "resumo": triage.resumo,
        }
    )

    produce_title = t(locale, f"work_item_step.produce.{delivery_type}")
    await store.work_step(item.id, produce_title, expert.id, "in_progress")
    gathered = await gather_context(
        squad, store, calls, expert, item, delivery_type, briefing, data.request
    )
    system = system_blocks(expert_prompt, ctx)
    common = {
        "agent": expert,
        "version": expert_version,
        "model": expert.model["padrao"],
        "system": system,
        "effort": expert.model.get("effort"),
        "phrase": production_phrase(data.feedback),
    }
    production = await calls.llm(
        spec.production,
        step=f"{expert.id}.produce",
        kind="llm_call",
        messages=production_messages(ctx, briefing, triage.resumo, gathered.blocks),
        schema=spec.production_schema,
        **common,
    )
    content = gathered.finalize(production.entrega)
    review = await calls.llm(
        CheckResult,
        step=f"{expert.id}.check",
        kind="check",
        messages=check_messages(ctx, briefing, content, gathered.blocks),
        schema=CHECK_SCHEMA,
        **common,
    )
    observations = {o.leitura: o for o in production.observacoes}
    revisions = 0
    if not review.approved:
        production = await calls.llm(
            spec.production,
            step=f"{expert.id}.revise",
            kind="llm_call",
            messages=revision_messages(
                ctx, briefing, content, review.model_dump(), gathered.blocks
            ),
            schema=spec.production_schema,
            **common,
        )
        content = gathered.finalize(production.entrega)
        observations |= {o.leitura: o for o in production.observacoes}
        revisions = 1
        review = await calls.llm(
            CheckResult,
            step=f"{expert.id}.check",
            kind="check",
            messages=check_messages(ctx, briefing, content, gathered.blocks),
            schema=CHECK_SCHEMA,
            **common,
        )

    require_tool(expert, "entregas.criar_versao")
    kind = expert_prompt.skill.delivery_kind
    if not kind:
        raise FlowError("delivery_not_supported", {"delivery_type": delivery_type})
    calendar = None
    if isinstance(production.entrega, EditorialCalendarDelivery):
        require_tool(expert, "calendario.agendar_rascunho")
        calendar = calendar_rows(production.entrega)
    note_key = change_note_key(data.feedback, revisions)
    result = await store.deliver(
        work_item=item,
        agent_id=expert.id,
        kind=kind,
        content=content,
        message=production.mensagem,
        change_note=t(locale, f"delivery_version.change_note.{note_key}"),
        tool_data={
            "tool": "entregas.criar_versao",
            "agent_id": expert.id,
            "revisions": revisions,
            "check_approved": review.approved,
            **gathered.tool_data(content),
        },
        work_step_title=produce_title,
        model=calls.last_model or expert.model["padrao"],
        prompt_version=expert_version,
        observations=[o.model_dump() for o in observations.values()],
        status=status_fields(locale, expert, "wait", "wait_approval"),
        calendar_posts=calendar,
    )
    return {"outcome": "delivered", "revisions": revisions, "check_approved": review.approved} | (
        result
    )


@dataclass
class DeliveryContext:
    """O que o fluxo juntou para a delivery antes de produzir e como fecha o conteúdo da versão."""

    delivery_type: str
    blocks: list[str] = field(default_factory=list)
    research: SearchResponse | None = None
    research_error: str | None = None
    documents: list[dict[str, Any]] = field(default_factory=list)
    base: dict[str, Any] | None = None
    metrics: dict[str, Any] | None = None

    def finalize(self, entrega: StepOutput) -> dict[str, Any]:
        content = entrega.model_dump(mode="json")
        if isinstance(entrega, ResearchDelivery):
            content |= research_content(entrega, self.research, self.research_error)
        if self.delivery_type == MULTICHANNEL:
            content["estrategia"] = strategy_reference(self.documents)
        if isinstance(entrega, MediaPlanDelivery | AdTestsDelivery):
            content |= kiwi_content(entrega, self.documents)
        if isinstance(
            entrega, SegmentationDelivery | RetentionCampaignDelivery | MessageSequenceDelivery
        ):
            content |= max_content(entrega, self.base or {}, self.documents)
        if isinstance(
            entrega, PerformanceAnalysisDelivery | PeriodReportDelivery | RecommendationsDelivery
        ):
            content |= iris_content(entrega, self.metrics or {}, self.documents)
        return content

    def tool_data(self, content: dict[str, Any]) -> dict[str, Any]:
        if self.delivery_type == RESEARCH:
            return {
                "pesquisa": content["pesquisa"]["estado"],
                "fontes": len(content["fontes"]),
                "achados_pesquisa": sum(a["tipo"] == "pesquisa" for a in content["achados"]),
            }
        if self.documents:
            return {"documentos": [str(d["delivery_version_id"]) for d in self.documents]}
        return {}


async def gather_context(
    squad: Squad,
    store: RunStore,
    calls: StepCaller,
    expert: AgentDefinition,
    item: Any,
    delivery_type: str,
    briefing: dict[str, Any],
    request: str,
) -> DeliveryContext:
    gathered = DeliveryContext(delivery_type)
    today = datetime.now(DISPLAY_TZ).date()
    if delivery_type in DATED:
        gathered.blocks.append(f"<hoje>{today.isoformat()}</hoje>")
    if delivery_type in PRIOR_DOCUMENTS:
        require_tool(expert, "memoria.ler")
        gathered.documents = await store.approved_documents(
            PRIOR_DOCUMENTS[delivery_type], item.project_id
        )
        gathered.blocks += [
            f'<documento_aprovado delivery="{d["delivery_type"]}" versao="{d["version_no"]}">'
            f"{as_json(d['content'])}</documento_aprovado>"
            for d in gathered.documents
        ]
    if delivery_type == CALENDAR:
        require_tool(expert, "calendario.ler")
        posts = await store.calendar_window(today, today + timedelta(days=CALENDAR_LOOKAHEAD_DAYS))
        gathered.blocks.append(
            f"<calendario_atual>{as_json([calendar_entry(p) for p in posts])}</calendario_atual>"
        )
    if delivery_type == RESEARCH:
        gathered.research, gathered.research_error = await web_research(
            squad, store, calls, expert, briefing, request
        )
        gathered.blocks.append(research_block(gathered.research))
    if delivery_type in CONTACT_BASED:
        require_tool(expert, "segmentos.criar")
        gathered.base = contact_base(await store.contacts(), today)
        await store.tool_step(
            {
                "tool": "segmentos.criar",
                "agent_id": expert.id,
                "contatos": gathered.base["total"],
                "com_consentimento": gathered.base["com_consentimento"]["algum"],
            }
        )
        gathered.blocks.append(contact_block(gathered.base))
    if delivery_type in METRIC_BASED:
        require_tool(expert, "dados.ler_series_historicas")
        days = period_days(briefing.get("data"), request)
        last_day, rows = await store.metrics(days)
        if last_day is None:
            raise FlowError("metrics_missing", {"delivery_type": delivery_type})
        gathered.metrics = metrics_evidence(rows, last_day, days)
        await store.tool_step(
            {
                "tool": "dados.ler_series_historicas",
                "agent_id": expert.id,
                "periodo_atual": gathered.metrics["periodo_atual"],
                "series": len(gathered.metrics["evidencias"]),
                "lacunas": len(gathered.metrics["lacunas"]),
            }
        )
        gathered.blocks.append(metrics_block(gathered.metrics))
    return gathered


async def missing_data(store: RunStore, delivery_type: str) -> str | None:
    """O dado sem o qual a delivery não existe: base de contatos (Max) ou métricas (Íris)."""
    if delivery_type in NEEDS_CONTACTS and not await store.contacts():
        return "contacts"
    if delivery_type in METRIC_BASED and (await store.metrics(1))[0] is None:
        return "metrics"
    return None


def document_reference(
    documents: list[dict[str, Any]], delivery_type: str
) -> dict[str, Any] | None:
    found = next((d for d in documents if d["delivery_type"] == delivery_type), None)
    if found is None:
        return None
    return {"delivery_version_id": str(found["delivery_version_id"]), "versao": found["version_no"]}


def kiwi_content(
    entrega: MediaPlanDelivery | AdTestsDelivery, documents: list[dict[str, Any]]
) -> dict[str, Any]:
    """Nada é investido nem criado nesta fase: a conta de anúncios não está conectada."""
    if isinstance(entrega, MediaPlanDelivery):
        return {"execucao": {"investimento": "nao_executado", "conta_de_anuncios": "nao_conectada"}}
    plan = document_reference(documents, MEDIA_PLAN)
    if plan is not None:
        approved = next(d for d in documents if d["delivery_type"] == MEDIA_PLAN)
        plan["teto_proposto"] = (approved["content"].get("orcamento") or {}).get("teto_proposto")
    return {
        "execucao": {"anuncios": "nao_criados", "conta_de_anuncios": "nao_conectada"},
        "plano_de_midia": plan,
    }


def max_content(
    entrega: SegmentationDelivery | RetentionCampaignDelivery | MessageSequenceDelivery,
    base: dict[str, Any],
    documents: list[dict[str, Any]],
) -> dict[str, Any]:
    """Números da base (tamanho, elegíveis por canal, origem) e o envio: nunca do modelo."""
    if isinstance(entrega, SegmentationDelivery):
        return {
            "base": base_summary(base),
            "segmentos": [
                s.model_dump(mode="json") | base["segmentos"][s.id] for s in entrega.segmentos
            ],
        }
    if isinstance(entrega, RetentionCampaignDelivery):
        return {
            "segmento": entrega.segmento.model_dump(mode="json")
            | segment_numbers(base, entrega.segmento.id),
            "envio": "nao_autorizado",
        }
    return {
        "publico": segment_numbers(base, entrega.segmento) if base.get("total") else None,
        "campanha": document_reference(documents, CAMPAIGN),
        "envio": "nao_autorizado",
    }


def iris_content(
    entrega: PerformanceAnalysisDelivery | PeriodReportDelivery | RecommendationsDelivery,
    metrics: dict[str, Any],
    documents: list[dict[str, Any]],
) -> dict[str, Any]:
    """Evidências calculadas da tabela de métricas; leitura sem evidência não fica como fato e
    causa sem teste controlado vira hipótese."""
    ids = {e["id"] for e in metrics["evidencias"]}
    content: dict[str, Any] = {
        "dados": metrics_summary(metrics),
        "evidencias": metrics["evidencias"],
    }
    if isinstance(entrega, PerformanceAnalysisDelivery):
        content["leituras"] = [ground_reading(r, ids, set()) for r in entrega.leituras]
    elif isinstance(entrega, PeriodReportDelivery):
        content["destaques"] = [ground_reading(r, ids, set()) for r in entrega.destaques]
        content["por_canal"] = [ground_reading(r, ids, set()) for r in entrega.por_canal]
        content["relatorio_anterior"] = document_reference(documents, REPORT)
    else:
        content["recomendacoes"] = [ground_recommendation(r, ids) for r in entrega.recomendacoes]
        content["analises"] = [
            ref for ref in (document_reference(documents, d) for d in (ANALYSIS, REPORT)) if ref
        ]
    return content


async def web_research(
    squad: Squad,
    store: RunStore,
    calls: StepCaller,
    agent: AgentDefinition,
    briefing: dict[str, Any],
    request: str,
) -> tuple[SearchResponse | None, str | None]:
    """Busca web da 02.07 (`pesquisa.web`): o que voltou vira as fontes da entrega, com link e data.

    Busca desligada ou com falha não derruba o run: a entrega fica só com sugestões sem validação.
    """
    require_tool(agent, "pesquisa.web")
    query = (
        " · ".join(str(v).strip() for v in (briefing.get("tema"), briefing.get("objetivo")) if v)
        or request
    )
    await store.thinking(
        agent.id,
        f"{agent.id}.research",
        status_fields(calls.locale, agent, "work", "searching"),
        calls.conversation_id,
        calls.work_live(agent, "searching"),
    )
    response, error = None, None
    try:
        response = await squad.web_search.search(query, locale=calls.locale)
    except WebSearchUnavailable as exc:
        error = exc.reason
    await store.tool_step(
        {
            "tool": "pesquisa.web",
            "agent_id": agent.id,
            "provider": squad.web_search.provider,
            "query": query,
            "estado": "realizada" if response else "indisponivel",
            "results": len(response.results) if response else 0,
            "error": error,
        }
    )
    return response, error


def research_block(response: SearchResponse | None) -> str:
    if response is None:
        return '<pesquisa_web estado="indisponivel"/>'
    sources = "\n".join(
        f'<fonte id="F{n}" url="{text(r.url)}" publicado_em="'
        f'{r.published_at.isoformat() if r.published_at else ""}">'
        f"{text(r.title)} — {text(r.snippet)}</fonte>"
        for n, r in enumerate(response.results, start=1)
    )
    return (
        f'<pesquisa_web estado="realizada" provedor="{text(response.provider)}" '
        f'consulta="{text(response.query)}" coletado_em="{response.retrieved_at.isoformat()}">'
        f"\n{sources}\n</pesquisa_web>"
    )


def research_content(
    entrega: ResearchDelivery, response: SearchResponse | None, error: str | None
) -> dict[str, Any]:
    """Pesquisa real só com fonte que a busca devolveu: achado "pesquisa" que não cita uma fonte
    coletada vira "sugestão" (sem validação), e as fontes saem da busca, nunca do modelo."""
    results = response.results if response else []
    sources = {f"F{n}": r for n, r in enumerate(results, start=1)}
    findings = []
    for finding in entrega.achados:
        cited = [s for s in finding.fontes if s in sources]
        researched = finding.tipo == "pesquisa" and bool(cited)
        findings.append(
            {
                "texto": finding.texto,
                "tipo": "pesquisa" if researched else "sugestao",
                "fontes": cited if researched else [],
            }
        )
    collected = response.retrieved_at.isoformat() if response else None
    return {
        "pesquisa": {
            "estado": "realizada" if response else "indisponivel",
            "provedor": response.provider if response else None,
            "consulta": response.query if response else None,
            "coletado_em": collected,
            "motivo": error,
        },
        "fontes": [
            {
                "id": key,
                "titulo": r.title,
                "url": r.url,
                "trecho": r.snippet,
                "publicado_em": r.published_at.isoformat() if r.published_at else None,
                "coletado_em": collected,
            }
            for key, r in sources.items()
        ],
        "achados": findings,
    }


def strategy_reference(documents: list[dict[str, Any]]) -> dict[str, Any] | None:
    strategy = next((d for d in documents if d["delivery_type"] == "02.04"), None)
    if strategy is None:
        return None
    return {
        "delivery_version_id": str(strategy["delivery_version_id"]),
        "versao": strategy["version_no"],
        "conceito": (strategy["content"].get("conceito") or {}).get("nome"),
    }


def calendar_entry(post: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "data": post["scheduled_on"].isoformat(),
        "horario": post["scheduled_time"].strftime("%H:%M") if post["scheduled_time"] else None,
        "canal": post["channel"],
        "formato": post["format"],
        "tema": post["theme"],
        "responsavel": post["owner_agent_id"],
        "estado": post["status"],
    }


def calendar_rows(calendar: EditorialCalendarDelivery) -> list[dict[str, Any]]:
    return [
        {
            "scheduled_on": post.data,
            "scheduled_time": post.horario,
            "channel": post.canal,
            "format": post.formato,
            "theme": post.tema,
            "owner_agent_id": post.responsavel,
            "notes": post.notas or None,
        }
        for post in calendar.posts
    ]


async def run_reply(squad: Squad, store: RunStore) -> dict[str, Any]:
    """Run de resposta: um especialista responde à mensagem da pessoa na conversa, sem trabalho."""
    data = await store.load_reply(history_limit=squad.history_limit)
    prompt = squad.loader.reply_prompt(data.agent_id)
    agent = prompt.agent
    version = await store.ensure_prompt_version(prompt)
    memory = await store.recall_memory(
        locale=data.locale,
        text=search_text(data.request, "", {}, None),
        budget=squad.memory_budget,
    )
    ctx = RunContext(
        locale=data.locale,
        brand_name=data.workspace_name,
        request=data.request,
        work_title="",
        delivery_type=None,
        briefing={},
        history=data.history,
        memory=memory,
    )
    calls = StepCaller(
        squad,
        store,
        prompt.skill.delivery_type,
        data.attempts,
        locale=data.locale,
        conversation_id=data.conversation_id,
    )
    reply = await calls.llm(
        ReplyResult,
        agent=agent,
        version=version,
        step=REPLY_STEP,
        kind="llm_call",
        model=agent.model["padrao"],
        system=system_blocks(prompt, ctx),
        messages=reply_messages(ctx),
        schema=REPLY_SCHEMA,
        phrase="writing",
        effort=agent.model.get("effort"),
        max_tokens=4096,
    )
    result = await store.reply(
        conversation_id=data.conversation_id,
        agent_id=agent.id,
        body=reply.mensagem,
        model=calls.last_model or agent.model["padrao"],
        prompt_version=version,
    )
    return {"outcome": "replied", "agent_id": agent.id} | result
