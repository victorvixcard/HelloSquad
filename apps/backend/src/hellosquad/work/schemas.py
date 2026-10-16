import json
from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from hellosquad.approvals.schemas import Approval
from hellosquad.autonomy.schemas import RunSummary
from hellosquad.domain import (
    AgentId,
    DeliveryVersionStatus,
    PrincipalType,
    ProjectStatus,
    WorkItemStatus,
    WorkItemStepStatus,
)

BRIEFING_MAX_CHARS = 20000


class Project(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str = Field(examples=["Lançamento do pão de fermentação longa"])
    objective: str | None
    status: ProjectStatus
    owner_agent_id: AgentId
    created_by: UUID | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ProjectPage(BaseModel):
    items: list[Project] = Field(description="Projetos ativos, o mais novo primeiro.")
    next_cursor: str | None


class WorkItemCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "delivery_type": "04.01",
                    "title": "Legenda do post de sábado: pão de fermentação longa",
                    "briefing": {"canal": "instagram", "tom": "acolhedor, direto, sem gíria"},
                    "idempotency_key": "web:7f6c2a5e-legenda-sabado",
                }
            ]
        },
    )

    delivery_type: Annotated[str, StringConstraints(pattern=r"^[0-9]{2}\.[0-9]{2}$")] | None = (
        Field(
            default=None,
            description="Id da delivery no catálogo (Documento Mestre, Anexo A); define o dono.",
            examples=["04.01"],
        )
    )
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    briefing: dict[str, Any] = Field(
        default_factory=dict,
        description="Objeto JSON livre (até 20.000 caracteres depois de serializado).",
    )
    idempotency_key: (
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
        | None
    ) = Field(
        default=None,
        description=(
            "Chave do cliente para repetir o pedido sem duplicar. Sem ela, a chave é a mensagem "
            "mais o tipo de delivery."
        ),
    )

    @field_validator("briefing")
    @classmethod
    def limit_briefing_size(cls, value: dict[str, Any]) -> dict[str, Any]:
        if len(json.dumps(value, ensure_ascii=False)) > BRIEFING_MAX_CHARS:
            raise ValueError("O briefing passou de 20.000 caracteres.")
        return value


class WorkItem(BaseModel):
    id: UUID
    workspace_id: UUID
    project_id: UUID | None
    conversation_id: UUID | None
    origin_message_id: UUID | None
    title: str = Field(examples=["Legenda do post de sábado: pão de fermentação longa"])
    delivery_type: str | None = Field(examples=["04.01"])
    status: WorkItemStatus
    primary_agent_id: AgentId
    collaborator_agent_ids: list[AgentId]
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime


class WorkItemPage(BaseModel):
    items: list[WorkItem] = Field(description="O mais novo primeiro.")
    next_cursor: str | None


class WorkItemCreated(WorkItem):
    briefing: dict[str, Any]
    run_id: UUID | None = Field(
        description="Run enfileirado em runs_interactive para este trabalho."
    )


class WorkItemStep(BaseModel):
    id: UUID
    seq: int
    title: str
    agent_id: AgentId | None
    status: WorkItemStepStatus
    started_at: datetime | None
    finished_at: datetime | None


class DeliveryFile(BaseModel):
    id: UUID
    storage_path: str = Field(description="Caminho no bucket privado `deliveries`.")
    mime: str
    size_bytes: int


class DeliveryVersion(BaseModel):
    id: UUID
    version_no: int
    status: DeliveryVersionStatus
    content: dict[str, Any] = Field(
        examples=[{"canal": "instagram", "legenda": "Sábado tem pão de fermentação longa…"}]
    )
    created_by_type: PrincipalType
    created_by_user_id: UUID | None
    created_by_agent_id: AgentId | None
    run_id: UUID | None
    change_note: str | None
    created_at: datetime
    files: list[DeliveryFile]


class Delivery(BaseModel):
    id: UUID
    kind: str = Field(examples=["caption"])
    current_version_id: UUID | None
    created_at: datetime
    updated_at: datetime
    versions: list[DeliveryVersion] = Field(description="Da primeira à mais recente.")


class WorkItemDetail(WorkItem):
    briefing: dict[str, Any]
    steps: list[WorkItemStep]
    deliveries: list[Delivery]
    approvals: list[Approval]
    runs: list[RunSummary]
