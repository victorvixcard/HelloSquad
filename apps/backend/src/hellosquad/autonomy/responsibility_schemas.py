"""Contrato do Modo Autônomo (S3b): responsabilidades, execuções, modelos e o combinado."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from hellosquad.domain import AgentId

TemplateId = Literal["plan", "posts", "res", "opp", "reat", "reviews", "seo", "crm"]
ResponsibilityStatus = Literal["proposed", "active", "paused", "blocked", "failed", "ended"]
RunStatusValue = Literal[
    "scheduled", "running", "awaiting_approval", "approved", "done", "failed", "skipped"
]
Level = Literal["analyze", "prepare", "execute", "never"]


class OptionChoice(BaseModel):
    value: str
    label: str


class TemplateQuestion(BaseModel):
    key: str = Field(description="Chave da opção no combinado (`obj`, `day`, `vol`, `freq`…).")
    question: str = Field(description="A pergunta do responsável na conversa (V4.6 `Q5`).")
    options: list[OptionChoice]
    default: str


class TemplateInfo(BaseModel):
    id: TemplateId
    title: str
    lead_agent_id: AgentId
    collaborator_agent_ids: list[AgentId]
    questions: list[TemplateQuestion]
    publish_option: bool = Field(
        description='Só `plan` e `posts`: "Aprovar cada publicação" ou "Publicar sozinho".'
    )
    offered: bool = Field(
        description='Aparece em "O que mais pode ficar com o squad" (plan, posts, opp e reviews, '
        "só se ainda não existe)."
    )
    existing_id: UUID | None = Field(
        default=None,
        description='Responsabilidade aberta do mesmo modelo ("O Otto já cuida disso").',
    )
    existing_status: ResponsibilityStatus | None = None


class Fact(BaseModel):
    key: str
    label: str
    value: str


class ExecuteAction(BaseModel):
    action: str
    label: str
    requirement: str
    requirement_label: str
    state: Literal["ok", "you", "no"] = Field(
        description="ok = autorizado; you = pede a sua aprovação; no = autorização não concedida."
    )


class Levels(BaseModel):
    analyze: list[str]
    prepare: list[str]
    execute: list[ExecuteAction]
    never: list[str]
    no_external_action: bool = Field(
        description='"Nenhuma ação externa nesta responsabilidade." quando não há o que executar.'
    )


class Upcoming(BaseModel):
    responsibility_id: UUID
    template: TemplateId
    title: str = Field(description='Título do ciclo ("Plano da semana 44").')
    at: datetime
    at_label: str = Field(description='"qui, 22/10, 9h" no fuso do negócio.')
    state: Literal["scheduled", "blocked"]
    state_label: str
    reason: str | None = Field(default=None, description="Por que não acontece (bloqueada).")


class MemoryUsed(BaseModel):
    fact_id: UUID
    key: str
    state: str


class Alert(BaseModel):
    metric: str
    text: str
    change: float | None = None
    last_day: str


class RunItem(BaseModel):
    id: UUID
    code: str = Field(description="PL-43, RS-42, BL-42b, RC-10…")
    responsibility_id: UUID
    responsibility_title: str
    template: TemplateId
    title: str
    status: RunStatusValue
    status_label: str
    message: str | None
    scheduled_for: datetime
    scheduled_label: str
    started_at: datetime | None
    finished_at: datetime | None
    attempts: int
    work_item_id: UUID | None
    approved_at: datetime | None
    memory_used: list[MemoryUsed] = Field(
        description="O que a execução usou da Memória da Marca (fatos postos no contexto)."
    )
    alerts: list[Alert] = Field(
        default_factory=list, description="07.06: alertas só com dado atualizado."
    )
    stale: list[Alert] = Field(
        default_factory=list, description="07.06: séries atrasadas (sem alerta, com a data)."
    )


class RunPage(BaseModel):
    items: list[RunItem]
    total: int
    next_cursor: str | None = None


class EventItem(BaseModel):
    id: UUID
    action: str
    text: str
    actor_type: Literal["user", "agent", "system"]
    created_at: datetime


class ResponsibilitySummary(BaseModel):
    id: UUID
    template: TemplateId
    title: str
    status: ResponsibilityStatus
    status_label: str
    lead_agent_id: AgentId
    collaborator_agent_ids: list[AgentId]
    coordinator_agent_id: AgentId
    frequency_label: str
    since: datetime
    next_run_at: datetime | None
    next_run_label: str | None
    next_run_title: str | None
    say: str = Field(description="Texto que acompanha o estado (V4.6 L13488).")
    notice: str | None = Field(default=None, description="Aviso de falha ou bloqueio na lista.")
    idle: str | None = Field(
        default=None, description='Sem execução à frente: "Nenhuma execução até você retomar."'
    )
    blocked_by_connection: str | None = None
    can_pause: bool
    can_resume: bool
    can_end: bool
    can_edit: bool
    can_redelegate: bool


class ResponsibilityDetail(ResponsibilitySummary):
    agreement: str
    options: dict[str, str]
    option_labels: dict[str, str]
    auto_publish: bool
    facts: list[Fact] = Field(description='"O combinado": Responsável, Colaboração, Coordenação…')
    levels: Levels
    detail_notice: str | None = None
    memory_used: list[MemoryUsed]
    upcoming: list[Upcoming]
    history: list[RunItem]
    history_total: int
    events: list[EventItem]
    conversation_id: UUID | None


class AutonomySwitch(BaseModel):
    visible: bool = Field(description="Só aparece com responsabilidade ativa ou pausada.")
    on: bool = Field(description='"Ligado" com ao menos uma ativa; senão "Pausado".')
    label: str


class AutonomyCounts(BaseModel):
    active: int
    paused: int
    failed: int
    blocked: int
    ended: int


class LastDays(BaseModel):
    runs: int
    not_concluded: int


class AutonomyOverview(BaseModel):
    switch: AutonomySwitch
    counts: AutonomyCounts
    next: Upcoming | None
    last_7_days: LastDays
    responsibilities: list[ResponsibilitySummary]
    ended: list[ResponsibilitySummary]
    offers: list[TemplateInfo]
    upcoming: list[Upcoming]
    history: list[RunItem]
    history_total: int


class SwitchChange(BaseModel):
    on: bool


class SwitchResult(BaseModel):
    on: bool
    changed: int


class ProposalCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    template: TemplateId
    options: dict[str, str] = Field(
        default_factory=dict, description="As respostas da conversa; o que faltar fica no padrão."
    )
    auto_publish: bool = Field(
        default=False,
        description='"Publicar sozinho o que eu aprovar no plano" (só plan e posts).',
    )
    conversation_id: UUID | None = Field(
        default=None, description="A conversa com o Nexo onde o combinado é apresentado."
    )
    responsibility_id: UUID | None = Field(
        default=None, description='"Editar": mudança no combinado de uma responsabilidade aberta.'
    )


class Proposal(BaseModel):
    id: UUID
    template: TemplateId
    status: Literal["pending", "confirmed", "discarded"]
    responsibility_id: UUID | None
    approval_id: UUID
    work_item_id: UUID
    message_id: UUID | None
    conversation_id: UUID | None
    title: str
    agreement: str
    facts: list[Fact]
    first_run_at: datetime | None
    first_run_label: str | None
    does: list[str]
    asks: list[str]
    never: list[str]
    card: dict[str, Any]
