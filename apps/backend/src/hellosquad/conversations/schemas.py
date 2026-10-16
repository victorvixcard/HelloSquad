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


ContextText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ContextRef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: ContextType = Field(description="Tipo do objeto de onde a conversa foi aberta.")
    id: UUID | None = Field(
        default=None,
        description=(
            "Id do objeto, no mesmo workspace: `project`, `work_item`, `delivery`, `memory_fact` e "
            "`insight` (\"<Agente> percebeu\")."
        ),
    )
    key: Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$")] | None = (
        Field(
            default=None,
            description=(
                "Chave do objeto que ainda não mora no banco: `calendar_post`, `metric`, "
                "`opportunity`, `responsibility`, `segment`, `document` e `capability` (o código da "
                "delivery, ex.: `04.01`). Exclusiva com `id`."
            ),
            examples=["04.01"],
        )
    )
    title: Annotated[ContextText, StringConstraints(max_length=200)] | None = Field(
        default=None, description="Título no cartão. Obrigatório para objeto que vem pela chave."
    )
    status: Annotated[ContextText, StringConstraints(max_length=60)] | None = Field(
        default=None, description="Estado do objeto que vem pela chave."
    )
    summary: Annotated[ContextText, StringConstraints(max_length=500)] | None = None
    period: Annotated[ContextText, StringConstraints(max_length=80)] | None = Field(
        default=None, description="Período da página de onde a conversa abriu.", examples=["Semana 42"]
    )
    origin: Annotated[ContextText, StringConstraints(max_length=120)] | None = Field(
        default=None, description="De onde a pessoa abriu.", examples=["Calendário · semana"]
    )

    def meta(self) -> dict[str, str] | None:
        fields = ("title", "status", "summary", "period", "origin")
        meta = {f: getattr(self, f) for f in fields if getattr(self, f) is not None}
        return meta or None


class ConversationCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {"kind": "agent_direct", "primary_agent_id": "otto"},
                {"kind": "squad_room"},
                {"kind": "group", "agent_ids": ["bia", "kaia", "otto"]},
                {
                    "kind": "object",
                    "context": {"type": "work_item", "id": "5eed0000-0000-4000-8000-000000000301"},
                },
                {
                    "kind": "object",
                    "primary_agent_id": "iris",
                    "context": {
                        "type": "metric",
                        "key": "alcance:semana",
                        "title": "Alcance da semana",
                        "period": "Semana 42",
                        "origin": "Resultados · semana",
                    },
                },
            ]
        },
    )

    kind: ConversationKind = Field(
        description=(
            "`squad_room`: Sala do Squad (uma por workspace, reutilizada). `agent_direct`: "
            "conversa "
            "direta com um agente (sempre nova). `object`: conversa de um objeto (uma por objeto, "
            "reutilizada; `capability` abre uma por pedido). `group`: conversa em grupo com 2 a 6 "
            "especialistas (uma por conjunto, reutilizada; responde um especialista por vez)."
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
    agent_ids: list[AgentId] | None = Field(
        default=None,
        min_length=2,
        max_length=6,
        description="Só em `kind = group`: os especialistas escolhidos no Início, de 2 a 6.",
    )
    title: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] | None = None


class Participant(BaseModel):
    participant_type: PrincipalType
    user_id: UUID | None
    agent_id: AgentId | None


class ConversationContext(BaseModel):
    type: str = Field(examples=["work_item"])
    id: UUID | None = Field(description="Id do objeto que mora no banco.")
    key: str | None = Field(description="Chave do objeto que ainda não mora no banco.")
    title: str | None = Field(
        description="Título do objeto (nulo se o objeto não existe mais).",
        examples=["Legenda do post de sábado: pão de fermentação longa"],
    )
    status: str | None = Field(description="Estado do objeto, quando ele tem estado.")
    summary: str | None = None
    period: str | None = Field(description="Período, quando há.", examples=["Semana 42"])
    origin: str | None = Field(description="De onde a pessoa abriu.", examples=["Calendário · semana"])


class Conversation(BaseModel):
    id: UUID
    workspace_id: UUID
    kind: ConversationKind
    primary_agent_id: AgentId | None
    context_type: str | None
    context_id: UUID | None
    context_key: str | None
    title: str | None = Field(examples=["Conversa com o Otto"])
    topic: str | None = Field(
        description="Tópico da Sala do Squad; nulo = \"Pedidos grandes\".", examples=["Campanha de Natal"]
    )
    agent_ids: list[AgentId] = Field(
        description="Especialistas que participam, na ordem do squad.", examples=[["bia", "kaia"]]
    )
    created_by: UUID | None
    last_message_at: datetime | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime
    last_read_at: datetime | None = Field(description="Até onde a pessoa logada leu.")
    unread_count: int = Field(
        description="Mensagens de outros (agentes, sistema, outras pessoas) depois de `last_read_at`."
    )


class ConversationDetail(Conversation):
    participants: list[Participant]
    context: ConversationContext | None = Field(description="Cartão do objeto (só em `object`).")


class ConversationPage(BaseModel):
    items: list[Conversation] = Field(
        description="Conversas ativas, a de atividade mais recente antes."
    )
    next_cursor: str | None


class UnreadCount(BaseModel):
    conversations: int
    messages: int


class AgentUnread(UnreadCount):
    agent_id: AgentId


class UnreadSummary(BaseModel):
    conversations: int = Field(description="Conversas com mensagem não lida.")
    messages: int = Field(description="Mensagens não lidas, somadas.")
    squad_room: UnreadCount = Field(description="Sala do Squad.")
    by_agent: list[AgentUnread] = Field(
        description=(
            "Pelo especialista à frente da conversa (o ambiente dele), fora a Sala do Squad; só os "
            "que têm não lida."
        )
    )


class ReadCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    read_at: datetime | None = Field(
        default=None,
        description="Hora da última mensagem que a pessoa viu (padrão: agora). Nunca volta para trás.",
    )


class ConversationRead(BaseModel):
    conversation_id: UUID
    last_read_at: datetime
    unread_count: int


class ReplyRequest(BaseModel):
    run_id: UUID
    conversation_id: UUID
    message_id: UUID
    agent_id: AgentId = Field(description="Quem vai responder: um especialista por vez.")
    status: str = Field(examples=["queued"])


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
