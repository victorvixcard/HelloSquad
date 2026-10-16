"""Coordenação do Nexo (01.02): o plano de etapas por agente e a conferência dele no backend.

O Nexo monta as etapas a partir do pedido e da estratégia da campanha (02.04): cada etapa tem um
especialista responsável, uma delivery do catálogo, a instrução para ele e as etapas cuja saída ele
lê antes de começar. O backend não confia no modelo: agente, delivery e dependências são conferidos
contra o `agent.yaml` e as skills de `squad/` antes de qualquer etapa existir.
"""

from typing import Any

from pydantic import Field

from hellosquad.domain import AgentId
from hellosquad.squad.loader import SquadLoader
from hellosquad.squad.schemas import (
    STRING,
    STRINGS,
    StepOutput,
    TriageBriefing,
    nullable,
    obj,
)

COORDINATION = "01.02"
# Deliveries visuais da Kaia: passam pelo motor de imagem do dono (creative/image_engine.py).
IMAGE_DELIVERIES = frozenset({"03.01", "03.02", "03.03"})
MAX_STEPS = 6


class PlanStep(StepOutput):
    agente: str
    delivery: str = Field(pattern=r"^[0-9]{2}\.[0-9]{2}$")
    titulo: str = Field(min_length=1, max_length=80)
    responsabilidade: str = Field(min_length=1, max_length=120)
    instrucao: str = Field(min_length=1, max_length=600)
    depende_de: list[int]


class PlanProject(StepOutput):
    nome: str = Field(min_length=1, max_length=120)
    objetivo: str = Field(min_length=1, max_length=400)


class CoordinationPlan(StepOutput):
    briefing: TriageBriefing
    faltam: list[str]
    pergunta: str | None
    projeto: PlanProject | None
    etapas: list[PlanStep]
    mensagem: str = Field(min_length=1)
    resumo: str


PLAN_SCHEMA = obj(
    {
        "briefing": obj(
            {
                "canal": nullable(STRING),
                "objetivo": nullable(STRING),
                "tema": nullable(STRING),
                "tom": nullable(STRING),
                "restricoes": STRINGS,
                "cta": nullable(STRING),
                "data": nullable(STRING),
            }
        ),
        "faltam": STRINGS,
        "pergunta": nullable(STRING),
        "projeto": nullable(obj({"nome": STRING, "objetivo": STRING})),
        "etapas": {
            "type": "array",
            "items": obj(
                {
                    "agente": STRING,
                    "delivery": STRING,
                    "titulo": STRING,
                    "responsabilidade": STRING,
                    "instrucao": STRING,
                    "depende_de": {"type": "array", "items": {"type": "integer"}},
                }
            ),
        },
        "mensagem": STRING,
        "resumo": STRING,
    }
)


def available_deliveries(loader: SquadLoader) -> list[dict[str, str]]:
    """O que o Nexo pode pôr numa etapa: as deliveries dos especialistas que têm skill em squad/."""
    found = []
    for agent_id in AgentId:
        if agent_id == AgentId.nexo:
            continue
        agent = loader.agent(agent_id.value)
        for delivery in sorted(agent.deliveries):
            if loader.has_skill(agent.id, delivery):
                skill = loader.skill(agent.id, delivery)
                found.append(
                    {"agente": agent.id, "delivery": delivery, "titulo": skill.meta.get("titulo", "")}
                )
    return found


def plan_problems(plan: CoordinationPlan, loader: SquadLoader) -> list[dict[str, Any]]:
    """Conferência do plano: cada etapa precisa ser executável pelo squad, na ordem, sem ciclo."""
    allowed = {(d["agente"], d["delivery"]) for d in available_deliveries(loader)}
    problems: list[dict[str, Any]] = []
    if not plan.etapas or len(plan.etapas) > MAX_STEPS:
        problems.append({"code": "steps_count", "count": len(plan.etapas)})
    for seq, step in enumerate(plan.etapas, start=1):
        if (step.agente, step.delivery) not in allowed:
            problems.append(
                {"code": "step_not_available", "seq": seq, "agent_id": step.agente,
                 "delivery_type": step.delivery}
            )
        if any(dep < 1 or dep >= seq for dep in step.depende_de):
            problems.append({"code": "step_depends_forward", "seq": seq})
    return problems


def strategy_front(content: dict[str, Any], agent_id: str) -> list[dict[str, Any]]:
    """A frente da estratégia (02.04) que cabe ao especialista da etapa seguinte."""
    return [p for p in content.get("prioridades") or [] if p.get("responsavel") == agent_id]
