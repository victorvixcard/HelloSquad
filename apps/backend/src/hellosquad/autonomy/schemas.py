from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from hellosquad.domain import AgentId, RunKind, RunStatus


class RunSummary(BaseModel):
    id: UUID
    agent_id: AgentId
    kind: RunKind
    status: RunStatus
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None


class Run(RunSummary):
    workspace_id: UUID
    work_item_id: UUID | None
    conversation_id: UUID | None
    model: str | None = Field(description="Modelo usado (preenchido pelo runtime).")
    prompt_version: str | None
    error: dict[str, Any] | None = Field(description="Erro já redigido pelo runtime, se falhou.")
    updated_at: datetime


class RunEvent(BaseModel):
    id: UUID
    run_id: UUID
    seq: int = Field(description="Ordem do evento no run (1, 2, 3…).")
    type: str = Field(examples=["run.progress"])
    payload: dict[str, Any]
    created_at: datetime


class RunEventPage(BaseModel):
    items: list[RunEvent] = Field(description="Eventos com `seq` maior que `after`, em ordem.")
    next_after: int | None = Field(
        description="Use como `after` para buscar o restante; nulo quando não há mais eventos."
    )
