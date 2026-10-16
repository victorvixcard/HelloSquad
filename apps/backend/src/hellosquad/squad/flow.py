"""Fluxo v0 de um run: o Nexo qualifica o pedido e delega; o especialista produz, se autoverifica
e entrega para a revisão da pessoa. Cada chamada de LLM ou ferramenta vira uma etapa do run.
"""

import time
from collections.abc import Mapping
from dataclasses import dataclass
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
from hellosquad.squad.loader import AgentDefinition, SquadLoader
from hellosquad.squad.memory import search_text
from hellosquad.squad.prompt import (
    RunContext,
    check_messages,
    production_messages,
    revision_messages,
    system_blocks,
    triage_messages,
)
from hellosquad.squad.schemas import (
    CHECK_SCHEMA,
    PRODUCTION_SCHEMA,
    TRIAGE_SCHEMA,
    CheckResult,
    ProductionResult,
    StepOutput,
    TriageResult,
)
from hellosquad.squad.store import RunStore

COORDINATOR = "nexo"
TRIAGE_SKILL = "01.01"
TRIAGE_THINKING_BUDGET = 1024
TRIAGE_MAX_TOKENS = 4096

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
    def __init__(self, squad: Squad, store: RunStore, delivery_type: str, attempt: int) -> None:
        self.squad = squad
        self.store = store
        self.delivery_type = delivery_type
        self.attempt = attempt
        self.last_model: str | None = None

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
        effort: Any = None,
        thinking_budget: int | None = None,
        max_tokens: int = 16000,
    ) -> Output:
        await self.store.event("agent.thinking", {"agent_id": agent.id, "step": step})
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
    if not delivery_type or not squad.loader.has_skill(data.agent_id, delivery_type):
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
    calls = StepCaller(squad, store, delivery_type, data.attempts)

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
        thinking_budget=TRIAGE_THINKING_BUDGET,
        max_tokens=TRIAGE_MAX_TOKENS,
    )

    missing = missing_fields(triage, expert_prompt.skill.essentials)
    if missing:
        require_tool(nexo, "conversas.perguntar")
        fields = "; ".join(t(locale, f"triage.field.{f}") for f in missing)
        question = (triage.pergunta or "").strip() or t(
            locale, "triage.fallback_question", fields=fields
        )
        result = await store.ask(
            work_item=item,
            agent_id=nexo.id,
            question=question,
            tool_data={"tool": "conversas.perguntar", "agent_id": nexo.id, "faltam": missing},
            model=calls.last_model or nexo.model["triagem"],
        )
        return {"outcome": "asked", "missing": missing, **result}

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
    system = system_blocks(expert_prompt, ctx)
    common = {
        "agent": expert,
        "version": expert_version,
        "model": expert.model["padrao"],
        "system": system,
        "effort": expert.model.get("effort"),
    }
    production = await calls.llm(
        ProductionResult,
        step=f"{expert.id}.produce",
        kind="llm_call",
        messages=production_messages(ctx, briefing, triage.resumo),
        schema=PRODUCTION_SCHEMA,
        **common,
    )
    review = await calls.llm(
        CheckResult,
        step=f"{expert.id}.check",
        kind="check",
        messages=check_messages(ctx, briefing, production.entrega.model_dump()),
        schema=CHECK_SCHEMA,
        **common,
    )
    observations = {o.leitura: o for o in production.observacoes}
    revisions = 0
    if not review.approved:
        production = await calls.llm(
            ProductionResult,
            step=f"{expert.id}.revise",
            kind="llm_call",
            messages=revision_messages(
                ctx, briefing, production.entrega.model_dump(), review.model_dump()
            ),
            schema=PRODUCTION_SCHEMA,
            **common,
        )
        observations |= {o.leitura: o for o in production.observacoes}
        revisions = 1
        review = await calls.llm(
            CheckResult,
            step=f"{expert.id}.check",
            kind="check",
            messages=check_messages(ctx, briefing, production.entrega.model_dump()),
            schema=CHECK_SCHEMA,
            **common,
        )

    require_tool(expert, "entregas.criar_versao")
    kind = expert_prompt.skill.delivery_kind
    if not kind:
        raise FlowError("delivery_not_supported", {"delivery_type": delivery_type})
    note_key = change_note_key(data.feedback, revisions)
    result = await store.deliver(
        work_item=item,
        agent_id=expert.id,
        kind=kind,
        content=production.entrega.model_dump(),
        message=production.mensagem,
        change_note=t(locale, f"delivery_version.change_note.{note_key}"),
        tool_data={
            "tool": "entregas.criar_versao",
            "agent_id": expert.id,
            "revisions": revisions,
            "check_approved": review.approved,
        },
        work_step_title=produce_title,
        model=calls.last_model or expert.model["padrao"],
        prompt_version=expert_version,
        observations=[o.model_dump() for o in observations.values()],
    )
    return {"outcome": "delivered", "revisions": revisions, "check_approved": review.approved} | (
        result
    )
