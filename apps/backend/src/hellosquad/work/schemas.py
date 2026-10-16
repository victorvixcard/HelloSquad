import json
from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from hellosquad.approvals.schemas import Approval
from hellosquad.autonomy.schemas import RunSummary
from hellosquad.domain import (
    AgentId,
    ApprovalKind,
    ConversationKind,
    DeliveryVersionStatus,
    MessageAuthorType,
    PrincipalType,
    ProjectStatus,
    WorkItemOriginType,
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
    starts_at: datetime | None = Field(default=None, description="Início no roadmap.")
    ends_at: datetime | None = Field(default=None, description='Prazo ("20/12"); nulo = sem prazo.')
    created_by: UUID | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ProjectParticipant(BaseModel):
    agent_id: AgentId
    responsibility: str | None = Field(examples=["estratégia e conceito"])


class ProjectMilestone(BaseModel):
    id: UUID
    project_id: UUID
    title: str = Field(examples=["Revisão das peças"])
    summary: str | None = Field(examples=["você aprova cada uma"])
    agent_id: AgentId | None
    kind: Literal["milestone", "goal"] = Field(description="`goal` é a meta do projeto.")
    due_at: datetime | None = Field(description="Nulo = sem data.")
    needs_you: bool = Field(description='"decisão sua" no roadmap.')
    planned: bool = Field(description='"previsto" no roadmap.')
    done: bool
    done_at: datetime | None
    work_item_id: UUID | None = Field(description="Trabalho pedido dentro do projeto.")
    approval_id: UUID | None = Field(description="Pendência em que o marco virou decisão.")
    created_at: datetime
    updated_at: datetime
    step_id: UUID | None = Field(default=None, description="Etapa do trabalho coordenado.")


class ProjectOwner(BaseModel):
    user_id: UUID
    role: Literal["owner"] = "owner"
    responsibility: str = Field(examples=["decide cada entrega"])


class ProjectDetail(Project):
    participants: list[ProjectParticipant] = Field(description="Quem conduz primeiro.")
    owner: ProjectOwner | None = Field(
        default=None, description="O dono da conta: participa do projeto e decide cada entrega."
    )
    milestones: list[ProjectMilestone] = Field(description="Por data; sem data por último.")
    work_item_count: int = Field(description='"Trabalhos pedidos neste projeto · N".')


ProjectName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
ProjectObjective = Annotated[str, StringConstraints(strip_whitespace=True, max_length=4000)]
Responsibility = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]
MilestoneTitle = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]
MilestoneSummary = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)]


class ProjectParticipantIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    agent_id: AgentId
    responsibility: Responsibility | None = None


class ProjectCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "name": "Campanha de Natal",
                    "objective": "Vender mais panetones pelo site e na loja.",
                    "owner_agent_id": "nexo",
                    "starts_at": "2026-10-05T09:00:00-03:00",
                    "ends_at": "2026-12-20T18:00:00-03:00",
                    "participants": [
                        {"agent_id": "bia", "responsibility": "estratégia e conceito"},
                        {"agent_id": "kaia", "responsibility": "peças da campanha"},
                    ],
                }
            ]
        },
    )

    name: ProjectName
    objective: ProjectObjective | None = None
    owner_agent_id: AgentId = Field(default=AgentId.nexo, description="Quem conduz.")
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    participants: list[ProjectParticipantIn] = Field(default_factory=list, max_length=7)


class ProjectUpdate(BaseModel):
    """Só os campos enviados mudam; `null` em objective, starts_at e ends_at apaga o valor."""

    model_config = ConfigDict(extra="forbid")

    name: ProjectName | None = None
    objective: ProjectObjective | None = None
    status: ProjectStatus | None = None
    owner_agent_id: AgentId | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class ProjectParticipantsSet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    participants: list[ProjectParticipantIn] = Field(
        max_length=7, description="A equipe inteira; quem conduz continua nela."
    )


class MilestoneCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "title": "Revisão das peças",
                    "summary": "você aprova cada uma",
                    "agent_id": "kaia",
                    "due_at": "2026-10-22T09:00:00-03:00",
                    "needs_you": True,
                }
            ]
        },
    )

    title: MilestoneTitle
    summary: MilestoneSummary | None = None
    agent_id: AgentId | None = None
    due_at: datetime | None = None
    kind: Literal["milestone", "goal"] = "milestone"
    needs_you: bool = False
    planned: bool = False


class MilestoneUpdate(BaseModel):
    """Só os campos enviados mudam; `done: true` conclui agora, `false` reabre."""

    model_config = ConfigDict(extra="forbid")

    title: MilestoneTitle | None = None
    summary: MilestoneSummary | None = None
    agent_id: AgentId | None = None
    due_at: datetime | None = None
    kind: Literal["milestone", "goal"] | None = None
    needs_you: bool | None = None
    planned: bool | None = None
    done: bool | None = None


class MilestonePage(BaseModel):
    items: list[ProjectMilestone] = Field(description="Por data, o mais próximo primeiro.")


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


class WorkItemOrigin(BaseModel):
    """De onde o trabalho nasceu, com o que o web precisa para escrever a origem."""

    type: WorkItemOriginType
    ref: str = Field(description="Id da mensagem, da sugestão ou do projeto; código da execução.")
    conversation_id: UUID | None = Field(description="Conversa do pedido (origem mensagem).")
    conversation_kind: ConversationKind | None
    agent_id: AgentId | None = Field(
        description="Especialista da conversa direta ou quem percebeu o insight."
    )
    title: str | None = Field(description="Título do insight ou nome do projeto.")


class PendingApprovalSummary(BaseModel):
    id: UUID
    kind: ApprovalKind
    requested_by_agent_id: AgentId
    delivery_version_no: int | None
    due_at: datetime | None
    deferred: bool = Field(description='"Agora não": fora de "Precisa de você" até decidir.')


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
    due_at: datetime | None = Field(default=None, description="Prazo do trabalho.")
    status_label: str | None = Field(
        default=None,
        description=(
            'Frase viva: a do agente ("Otto criando a primeira versão") ou a do estado '
            '("v1 aguarda sua aprovação"), no idioma do workspace.'
        ),
        examples=["v1 aguarda sua aprovação"],
    )
    next_step: str | None = Field(
        default=None, description="Próximo passo.", examples=["Aprovar a v1"]
    )
    origin: WorkItemOrigin | None = None
    awaiting_you: bool = Field(
        default=False, description="Tem pendência que depende da pessoa agora (não adiada)."
    )
    pending_approval: PendingApprovalSummary | None = Field(
        default=None, description="A pendência aberta (a que depende de você primeiro)."
    )
    step_label: str | None = Field(
        default=None,
        description='Trabalho coordenado: a etapa em que está ("etapa 1 de 3").',
        examples=["etapa 1 de 3"],
    )


class WorkItemHistoryEntry(BaseModel):
    id: UUID
    actor_type: MessageAuthorType
    actor_user_id: UUID | None
    agent_id: AgentId | None
    kind: Literal["requested", "delivered", "decided", "team", "step"]
    text: str = Field(examples=["Você aprovou a v2"])
    mark: Literal["automatic", "approved_by_you"] | None = Field(
        description='"automático" ou "aprovado por você".'
    )
    mark_label: str | None = Field(examples=["aprovado por você"])
    params: dict[str, Any]
    approval_id: UUID | None
    delivery_version_id: UUID | None
    created_at: datetime


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
    agent_id: AgentId | None = Field(description="Responsável pela etapa.")
    status: WorkItemStepStatus
    started_at: datetime | None
    finished_at: datetime | None
    delivery_type: str | None = Field(
        default=None,
        description="Etapa planejada pelo Nexo (01.02): a delivery da etapa. Nulo = fase do run.",
        examples=["02.04"],
    )
    depends_on: list[int] = Field(
        default_factory=list, description="Etapas (seq) cuja saída esta etapa lê antes de começar."
    )
    responsibility: str | None = Field(
        default=None, description="Como aparece na equipe.", examples=["estratégia e conceito"]
    )
    instruction: str | None = Field(default=None, description="O recorte do pedido para a etapa.")
    status_reason: str | None = Field(
        default=None,
        description="Código do motivo (image_engine_pending, depends_on_step, work_cancelled).",
    )
    status_reason_label: str | None = Field(
        default=None,
        description="O motivo no idioma do workspace.",
        examples=["Aguardando o motor de imagem"],
    )
    delivery_version_id: UUID | None = Field(
        default=None, description="A versão que a etapa entregou ou que a fechou (saída)."
    )
    version_no: int | None = None


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
    step_id: UUID | None = Field(default=None, description="Etapa do trabalho coordenado.")
    created_at: datetime
    updated_at: datetime
    versions: list[DeliveryVersion] = Field(description="Da primeira à mais recente.")


class WorkItemDetail(WorkItem):
    briefing: dict[str, Any]
    steps: list[WorkItemStep]
    deliveries: list[Delivery]
    approvals: list[Approval]
    runs: list[RunSummary]
    history: list[WorkItemHistoryEntry] = Field(
        default_factory=list, description="Do mais antigo ao mais recente."
    )


class NeedProject(BaseModel):
    id: UUID
    name: str


class NeedItem(BaseModel):
    type: Literal[
        "review", "approve", "authorize", "confirm", "reconnect", "respond", "decide", "next"
    ] = Field(
        description=(
            'Tipo da linha da faixa: os da pendência ("Para você revisar"…, "Para você decidir") '
            'ou `next` ("Em seguida": marco seu que ainda não depende de você).'
        )
    )
    agent_id: AgentId = Field(description="Quem pede.")
    approval: Approval | None = None
    milestone: ProjectMilestone | None = None
    project: NeedProject | None = None
    due_at: datetime | None = None


class NeedsYou(BaseModel):
    count: int = Field(description="Só o que depende da pessoa agora (sem adiadas e sem `next`).")
    deferred_count: int = Field(description='Autorizações adiadas por "Agora não".')
    items: list[NeedItem] = Field(
        description="O que é agora (mais antigo primeiro), depois `next`."
    )


class AgentStatus(BaseModel):
    agent_id: AgentId
    mode: Literal["idle", "work", "wait", "live", "monitor", "sleep"]
    status_short: str = Field(examples=["escrevendo"], description="Rótulo curto (`_shortNow`).")
    status_label: str | None = Field(
        examples=["Otto · criando a primeira versão"], description="Frase da conversa."
    )
    run_id: UUID | None = None
    work_item_id: UUID | None = None
    conversation_id: UUID | None = None
    approval_id: UUID | None = None


class SquadStatus(BaseModel):
    workspace_id: UUID
    agents: list[AgentStatus] = Field(description="Os sete, na ordem do squad.")
