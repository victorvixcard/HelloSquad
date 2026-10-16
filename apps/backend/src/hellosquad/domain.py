"""Valores fechados do núcleo, espelho dos enums e do domínio `agent_id` do banco (S1a).

Um teste de integração compara cada um com `enum_range` no Postgres: valor novo no banco exige
mudança aqui no mesmo commit.
"""

from enum import StrEnum


class AgentId(StrEnum):
    nexo = "nexo"
    bia = "bia"
    kaia = "kaia"
    otto = "otto"
    kiwi = "kiwi"
    max = "max"
    iris = "iris"


class PrincipalType(StrEnum):
    user = "user"
    agent = "agent"


class ConversationKind(StrEnum):
    squad_room = "squad_room"
    agent_direct = "agent_direct"
    object = "object"
    group = "group"


# Objeto de onde a conversa foi aberta (FLUXOS_DA_V46.md §4.1). Os cinco primeiros moram no banco e
# vêm pelo id; os outros ainda não têm tabela e vêm por uma chave, com título e estado no cartão.
class ContextType(StrEnum):
    project = "project"
    work_item = "work_item"
    delivery = "delivery"
    memory_fact = "memory_fact"
    insight = "insight"
    calendar_post = "calendar_post"
    metric = "metric"
    opportunity = "opportunity"
    responsibility = "responsibility"
    segment = "segment"
    document = "document"
    capability = "capability"


CONTEXT_TYPES_BY_ID = frozenset(
    {
        ContextType.project,
        ContextType.work_item,
        ContextType.delivery,
        ContextType.memory_fact,
        ContextType.insight,
    }
)


class MessageAuthorType(StrEnum):
    user = "user"
    agent = "agent"
    system = "system"


class ProjectStatus(StrEnum):
    draft = "draft"
    active = "active"
    paused = "paused"
    done = "done"
    cancelled = "cancelled"


class WorkItemStatus(StrEnum):
    draft = "draft"
    in_progress = "in_progress"
    needs_you = "needs_you"
    scheduled = "scheduled"
    approved = "approved"
    done = "done"
    paused = "paused"
    blocked = "blocked"
    failed = "failed"
    cancelled = "cancelled"


class WorkItemStepStatus(StrEnum):
    pending = "pending"
    in_progress = "in_progress"
    done = "done"
    failed = "failed"
    skipped = "skipped"


class DeliveryVersionStatus(StrEnum):
    draft = "draft"
    approved = "approved"
    superseded = "superseded"


class ApprovalKind(StrEnum):
    review = "review"
    approve = "approve"
    authorize = "authorize"
    confirm = "confirm"
    reconnect = "reconnect"
    respond = "respond"


class ApprovalStatus(StrEnum):
    pending = "pending"
    decided = "decided"
    expired = "expired"


class ApprovalDecision(StrEnum):
    approved = "approved"
    rejected = "rejected"
    changes_requested = "changes_requested"
    answered = "answered"


class RunKind(StrEnum):
    interactive = "interactive"
    scheduled = "scheduled"
    reflection = "reflection"


class RunStatus(StrEnum):
    queued = "queued"
    running = "running"
    waiting_approval = "waiting_approval"
    succeeded = "succeeded"
    failed = "failed"
    cancelled = "cancelled"


# Memória da Marca (S1d). Rótulos da V4.6 no catálogo (i18n/pt-BR.json, chaves memory.*).
class MemoryArea(StrEnum):
    business = "business"
    brand = "brand"
    audience = "audience"
    knowledge = "knowledge"


class BrandFactState(StrEnum):
    confirmed = "confirmed"
    decision = "decision"
    from_source = "from_source"
    observed = "observed"
    suggested = "suggested"
    outdated = "outdated"
    discarded = "discarded"
    conflicting = "conflicting"
    unused = "unused"


class FactSourceKind(StrEnum):
    onboarding = "onboarding"
    conversation = "conversation"
    correction = "correction"
    approval = "approval"
    file = "file"
    connection = "connection"
    agent_observation = "agent_observation"


class FactSourceState(StrEnum):
    declared = "declared"
    connected = "connected"
    outdated = "outdated"
    needs_reconnect = "needs_reconnect"
    not_connected = "not_connected"
    unavailable = "unavailable"


class MemorySuggestionState(StrEnum):
    open = "open"
    seen = "seen"
    done = "done"


class MemorySuggestionDecision(StrEnum):
    confirm = "confirm"
    correct = "correct"
    discard = "discard"


class MemoryConflictState(StrEnum):
    open = "open"
    resolved = "resolved"


class MemoryConflictResolution(StrEnum):
    keep_a = "keep_a"
    keep_b = "keep_b"
    corrected = "corrected"


class RunContextKind(StrEnum):
    fact = "fact"
    suggestion = "suggestion"


class DeliveryDepth(StrEnum):
    orientar = "orientar"
    produzir = "produzir"
    executar = "executar"
    otimizar = "otimizar"
