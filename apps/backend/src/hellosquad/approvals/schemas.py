from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from hellosquad.domain import (
    AgentId,
    ApprovalDecision,
    ApprovalKind,
    ApprovalStatus,
    WorkItemStatus,
)


class ApprovalWorkItem(BaseModel):
    id: UUID
    title: str = Field(examples=["Legenda do post de sábado: pão de fermentação longa"])
    status: WorkItemStatus
    delivery_type: str | None = Field(examples=["04.01"])
    primary_agent_id: AgentId


class Approval(BaseModel):
    id: UUID
    workspace_id: UUID
    kind: ApprovalKind = Field(
        description=(
            "`review` revisar, `approve` aprovar, `authorize` autorizar ação externa, "
            "`confirm` confirmar, `reconnect` reconectar, `respond` responder. Só o owner decide."
        )
    )
    status: ApprovalStatus
    decision: ApprovalDecision | None
    follow_up: Literal["cancel", "revise"] | None = Field(
        description="Saída da rejeição: `cancel` cancela o trabalho; `revise` pede nova proposta."
    )
    requested_by_agent_id: AgentId
    delivery_version_id: UUID | None
    delivery_version_no: int | None
    run_id: UUID | None
    decided_by: UUID | None
    decided_at: datetime | None
    note: str | None
    due_at: datetime | None
    created_at: datetime
    updated_at: datetime
    work_item: ApprovalWorkItem


class ApprovalPage(BaseModel):
    items: list[Approval] = Field(description="Mais antiga primeiro.")
    next_cursor: str | None


class ApprovalDecisionCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {"decision": "approved"},
                {"decision": "changes_requested", "note": "Troque o horário para 7h."},
                {"decision": "rejected", "follow_up": "revise", "note": "Quero outra abordagem."},
                {"decision": "rejected", "follow_up": "cancel"},
            ]
        },
    )

    decision: ApprovalDecision = Field(
        description=(
            "`review`/`approve`: approved, changes_requested ou rejected. `authorize`/`confirm`/"
            "`reconnect`: approved ou rejected. `respond`: answered."
        )
    )
    note: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] | None = Field(
        default=None, description="Observação de quem decide (até 2.000 caracteres)."
    )
    follow_up: Literal["cancel", "revise"] | None = Field(
        default=None,
        description=(
            "Obrigatório ao rejeitar uma entrega (`review`/`approve`): `cancel` cancela o "
            "trabalho; `revise` devolve ao agente para uma nova proposta. Não vale para outras "
            "decisões."
        ),
    )
