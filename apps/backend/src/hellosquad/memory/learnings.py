"""Aprendizados por cliente (Memória camada 3, S2c): o que cada agente aprendeu com este negócio.

Leitura pela RLS do membro; promover, descartar e "continua valendo" só pelo owner, por funções
app.* idempotentes. A lista traz a versão em vigor de cada assunto; as anteriores ficam no banco.
"""

from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Query
from psycopg import AsyncConnection
from psycopg.rows import DictRow
from pydantic import BaseModel, ConfigDict, Field

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep, ensure_workspace
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.config import get_settings
from hellosquad.domain import AgentId, AgentLearningStatus

router = APIRouter(tags=["memory"])

LEARNING_COLUMNS = """
select l.id, l.workspace_id, l.agent_id::text, l.delivery_type, l.topic, l.learning,
       l.evidence_refs, l.confidence, l.status::text, l.promotion_rule, l.version,
       l.supersedes_id, l.work_item_id, l.decided_at, l.reviewed_at, l.created_at,
       l.status = 'promoted'
         and coalesce(l.reviewed_at, l.decided_at, l.created_at)
             < now() - make_interval(days => %(review_days)s) as stale
from public.agent_learnings l
"""

LIST_LEARNINGS = f"""{LEARNING_COLUMNS}
where l.workspace_id = %(workspace_id)s and l.superseded_at is null
  and (%(status)s::text is null or l.status::text = %(status)s::text)
  and (%(agent_id)s::text is null or l.agent_id::text = %(agent_id)s::text)
  and (%(delivery_type)s::text is null or l.delivery_type = %(delivery_type)s::text)
order by l.created_at desc, l.id
limit %(limit)s
"""

GET_LEARNING = f"{LEARNING_COLUMNS} where l.id = %(id)s"

DECIDE = {
    "promote": "select id from app.promote_learning(%(id)s)",
    "discard": "select id from app.discard_learning(%(id)s)",
    "keep": "select id from app.keep_learning(%(id)s)",
}

DeliveryType = Annotated[str, Field(pattern=r"^[0-9]{2}\.[0-9]{2}$")]


class AgentLearning(BaseModel):
    id: UUID
    workspace_id: UUID
    agent_id: AgentId
    delivery_type: str = Field(
        description="Delivery do catálogo em que o agente aprendeu, ex.: 04.01."
    )
    topic: str = Field(description="Assunto do aprendizado (ex.: Vocabulário, Tratamento).")
    learning: str
    evidence_refs: list[dict[str, Any]] = Field(
        description=(
            "De onde veio: `correction` (o que a pessoa pediu, com a nota), `version` (versão "
            "entregue) e `decision` (decisão final), cada uma com o trabalho de origem."
        )
    )
    confidence: float
    status: AgentLearningStatus = Field(
        description=(
            "`candidate` fica fora do contexto até o owner promover; `promoted` entra no contexto "
            "do agente nesta delivery; `discarded` não volta."
        )
    )
    promotion_rule: Literal["explicit_correction", "repeated", "owner"] | None = Field(
        description=(
            "`explicit_correction` a pessoa corrigiu com as próprias palavras; `repeated` a mesma "
            "lição em trabalhos diferentes; `owner` o owner promoveu."
        )
    )
    version: int
    supersedes_id: UUID | None
    work_item_id: UUID | None
    decided_at: datetime | None
    reviewed_at: datetime | None = Field(description='Último "continua valendo" do owner.')
    stale: bool = Field(
        description=(
            'Promovido sem "continua valendo" há LEARNING_REVIEW_DAYS dias: entra no contexto '
            "marcado para o agente revisar."
        )
    )
    created_at: datetime


class AgentLearningList(BaseModel):
    items: list[AgentLearning]


class AgentLearningDecisionCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid", json_schema_extra={"examples": [{"action": "promote"}]}
    )

    action: Literal["promote", "discard", "keep"] = Field(
        description=(
            '`promote` "Promover" (entra no contexto do agente); `discard` "Descartar" (sai e não '
            'volta); `keep` "Continua valendo" (só promovido; renova a revisão). Repetir devolve o '
            "mesmo estado."
        )
    )


async def load_learning(conn: AsyncConnection[DictRow], learning_id: UUID) -> AgentLearning:
    row = await (
        await conn.execute(
            GET_LEARNING, {"id": learning_id, "review_days": get_settings().learning_review_days}
        )
    ).fetchone()
    if row is None:
        raise ApiError(404, "not_found", "Aprendizado não encontrado.")
    return AgentLearning(**row)


@router.get(
    "/workspaces/{workspace_id}/memory/learnings",
    summary="Aprendizados do squad com este negócio (versão em vigor, mais recente primeiro)",
    responses=error_responses(401, 404, 422, 503),
)
async def list_learnings(
    workspace_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    status: Annotated[AgentLearningStatus | None, Query()] = None,
    agent_id: Annotated[AgentId | None, Query()] = None,
    delivery_type: Annotated[DeliveryType | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> AgentLearningList:
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        rows = await (
            await conn.execute(
                LIST_LEARNINGS,
                {
                    "workspace_id": workspace_id,
                    "status": status,
                    "agent_id": agent_id,
                    "delivery_type": delivery_type,
                    "limit": limit,
                    "review_days": get_settings().learning_review_days,
                },
            )
        ).fetchall()
    return AgentLearningList(items=[AgentLearning(**row) for row in rows])


@router.post(
    "/memory/learnings/{learning_id}/decision",
    summary='Promover, descartar ou "continua valendo" um aprendizado (idempotente; só o owner)',
    description=(
        "Só o owner decide. Repetir a mesma ação responde 200 com o mesmo estado. `keep` vale só "
        "para aprendizado promovido (senão 409); versão já substituída responde 409."
    ),
    responses=error_responses(401, 403, 404, 409, 422, 503),
)
async def decide_learning(
    learning_id: UUID,
    payload: AgentLearningDecisionCreate,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> AgentLearning:
    async with db.transaction_as(principal) as conn:
        await conn.execute(DECIDE[payload.action], {"id": learning_id})
        return await load_learning(conn, learning_id)
