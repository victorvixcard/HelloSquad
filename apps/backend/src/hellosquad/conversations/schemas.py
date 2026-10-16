from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from hellosquad.domain import (
    AgentId,
    ContextType,
    ConversationKind,
    MessageAuthorType,
    PrincipalType,
)


class ContextRef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: ContextType = Field(description="Tipo do objeto de onde a conversa foi aberta.")
    id: UUID = Field(description="Id do objeto, no mesmo workspace.")


class ConversationCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {"kind": "agent_direct", "primary_agent_id": "otto"},
                {"kind": "squad_room"},
                {
                    "kind": "object",
                    "context": {"type": "work_item", "id": "5eed0000-0000-4000-8000-000000000301"},
                },
            ]
        },
    )

    kind: ConversationKind = Field(
        description=(
            "`squad_room`: Sala do Squad (uma por workspace, reutilizada). `agent_direct`: "
            "conversa "
            "direta com um agente (sempre nova). `object`: conversa de um objeto (uma por objeto, "
            "reutilizada)."
        )
    )
    primary_agent_id: AgentId | None = Field(
        default=None,
        description=(
            "Agente à frente. Obrigatório em `agent_direct`; na Sala do Squad o padrão é o Nexo; "
            "na conversa de objeto, o responsável pelo objeto."
        ),
    )
    context: ContextRef | None = Field(default=None, description="Só em `kind = object`.")
    title: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] | None = None


class Participant(BaseModel):
    participant_type: PrincipalType
    user_id: UUID | None
    agent_id: AgentId | None


class ConversationContext(BaseModel):
    type: str = Field(examples=["work_item"])
    id: UUID
    title: str | None = Field(
        description="Título do objeto (nulo se o objeto não existe mais).",
        examples=["Legenda do post de sábado: pão de fermentação longa"],
    )
    status: str | None = Field(description="Estado do objeto, quando ele tem estado.")


class Conversation(BaseModel):
    id: UUID
    workspace_id: UUID
    kind: ConversationKind
    primary_agent_id: AgentId | None
    context_type: str | None
    context_id: UUID | None
    title: str | None = Field(examples=["Conversa com o Otto"])
    created_by: UUID | None
    last_message_at: datetime | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ConversationDetail(Conversation):
    participants: list[Participant]
    context: ConversationContext | None = Field(description="Cartão do objeto (só em `object`).")


class ConversationPage(BaseModel):
    items: list[Conversation] = Field(
        description="Conversas ativas, a de atividade mais recente antes."
    )
    next_cursor: str | None


class MessageCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "body": (
                        "Otto, preciso de uma legenda para o post de sábado sobre o pão de "
                        "fermentação longa."
                    )
                }
            ]
        },
    )

    body: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20000)
    ] = Field(description="Texto da mensagem (markdown), de 1 a 20.000 caracteres.")


class Message(BaseModel):
    id: UUID
    conversation_id: UUID
    author_type: MessageAuthorType
    author_user_id: UUID | None
    author_agent_id: AgentId | None
    run_id: UUID | None
    body: str = Field(examples=["Tom acolhedor e direto, sem gíria."])
    body_format: str = Field(examples=["markdown"])
    attachments: list[Any]
    created_at: datetime


class MessagePage(BaseModel):
    items: list[Message] = Field(
        description="Em ordem cronológica (mais antiga primeiro), também com `before`."
    )
    next_cursor: str | None = Field(
        description=(
            "Cursor da próxima página no sentido da leitura: sem `before`, das mensagens mais "
            "novas (passe em `cursor`); com `before`, das mais antigas (passe em `before`). Nulo "
            "quando não há mais."
        )
    )
