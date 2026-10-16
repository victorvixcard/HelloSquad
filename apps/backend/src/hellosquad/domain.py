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


class ContextType(StrEnum):
    project = "project"
    work_item = "work_item"
    delivery = "delivery"


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
