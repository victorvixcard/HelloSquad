"""Conversas e mensagens. Tudo roda como o usuário do JWT; escrita só pelas funções app.*."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response, status
from psycopg import AsyncConnection
from psycopg.rows import DictRow
from psycopg.types.json import Jsonb

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep, ensure_workspace
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.api.pagination import CursorQuery, decode_cursor, limit_query, split_page
from hellosquad.conversations.schemas import (
    AgentUnread,
    Conversation,
    ConversationContext,
    ConversationCreate,
    ConversationDetail,
    ConversationPage,
    ConversationRead,
    Message,
    MessageCard,
    MessageCreate,
    MessagePage,
    Participant,
    ReadCreate,
    ReplyRequest,
    UnreadCount,
    UnreadSummary,
)
from hellosquad.domain import AgentId

router = APIRouter(tags=["conversations"])

SQUAD_ORDER = "array['nexo', 'bia', 'kaia', 'otto', 'kiwi', 'max', 'iris']"

# Leitura da pessoa logada e não lidas: mensagens de outros (agente, sistema, outra pessoa)
# depois dela.
CONVERSATION_COLUMNS = f"""
c.id, c.workspace_id, c.kind::text, c.primary_agent_id::text, c.context_type, c.context_id,
c.context_key, c.context_meta, c.title, c.topic, c.created_by, c.last_message_at, c.archived_at,
c.created_at, c.updated_at, r.last_read_at,
array(
  select p.agent_id::text from public.conversation_participants p
  where p.conversation_id = c.id and p.participant_type = 'agent'
  order by array_position({SQUAD_ORDER}, p.agent_id::text)
) as agent_ids,
(
  select count(*) from public.messages m
  where m.conversation_id = c.id
    and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
    and m.author_user_id is distinct from (select auth.uid())
)::int as unread_count
"""

CONVERSATION_FROM = """
from public.conversations c
left join public.conversation_reads r
  on r.conversation_id = c.id and r.user_id = (select auth.uid())
"""

LIST_CONVERSATIONS = f"""
select {CONVERSATION_COLUMNS}, coalesce(c.last_message_at, c.created_at) as activity_at
{CONVERSATION_FROM}
where c.workspace_id = %(workspace_id)s
  and c.archived_at is null
  and (%(cursor_at)s::timestamptz is null
       or (coalesce(c.last_message_at, c.created_at), c.id) < (%(cursor_at)s, %(cursor_id)s::uuid))
order by activity_at desc, c.id desc
limit %(limit)s
"""

GET_CONVERSATION = f"""
select {CONVERSATION_COLUMNS}
{CONVERSATION_FROM}
where c.id = %s and c.workspace_id in (select app.current_user_workspace_ids())
"""

CREATE_CONVERSATION = """
select c.id, c.created_at = now() as created
from app.create_conversation(
  %(workspace_id)s, %(kind)s::public.conversation_kind, %(primary_agent_id)s, %(context_type)s,
  %(context_id)s, %(title)s, %(agent_ids)s::public.agent_id[], %(context_key)s, %(context_meta)s
) c
"""

UNREAD_BY_AGENT = """
select case when c.kind = 'squad_room' then null else c.primary_agent_id::text end as agent_id,
       count(*)::int as conversations, sum(u.unread)::int as messages
from public.conversations c
left join public.conversation_reads r
  on r.conversation_id = c.id and r.user_id = (select auth.uid())
cross join lateral (
  select count(*) as unread from public.messages m
  where m.conversation_id = c.id
    and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
    and m.author_user_id is distinct from (select auth.uid())
) u
where c.workspace_id = %s and c.archived_at is null and u.unread > 0
group by 1
"""

MARK_READ = """
select r.conversation_id, r.last_read_at
from app.mark_conversation_read(%s, %s) r
"""

REQUEST_REPLY = """
select r.id as run_id, r.conversation_id, r.message_id, r.agent_id::text, r.status::text,
       r.created_at = now() as created
from app.request_reply(%s) r
"""

PARTICIPANTS = """
select p.participant_type::text, p.user_id, p.agent_id::text
from public.conversation_participants p
where p.conversation_id = %s
order by p.participant_type, p.created_at, p.agent_id
"""

# Cartão do objeto que mora no banco: título e estado, lidos com a RLS do usuário. Os outros
# tipos trazem título e estado em context_meta.
CONTEXT_QUERIES = {
    "project": (
        "select p.name as title, p.status::text as status from public.projects p where p.id = %s"
    ),
    "work_item": (
        "select w.title, w.status::text as status from public.work_items w where w.id = %s"
    ),
    "delivery": (
        "select w.title, w.status::text as status from public.deliveries d "
        "join public.work_items w on w.id = d.work_item_id where d.id = %s"
    ),
    "memory_fact": (
        "select f.key || ': ' || f.content as title, f.state::text as status "
        "from public.brand_facts f where f.id = %s"
    ),
    "insight": (
        "select s.title, s.state::text as status from public.memory_suggestions s where s.id = %s"
    ),
}

MESSAGE_COLUMNS = """
m.id, m.conversation_id, m.author_type::text, m.author_user_id, m.author_agent_id::text, m.run_id,
m.body, m.body_format, m.attachments, m.created_at
"""

# Cartão do agente com o estado vivo do objeto ligado (pendência, versão, trabalho).
CARD_COLUMNS = """
m.card, m.work_item_id, m.delivery_version_id, m.approval_id, a.status::text as approval_status,
a.decision::text as approval_decision, a.note as approval_note, v.status::text as version_status,
w.status::text as work_item_status
"""

CARD_JOINS = """
left join public.approvals a on a.id = m.approval_id
left join public.delivery_versions v on v.id = m.delivery_version_id
left join public.work_items w on w.id = m.work_item_id
"""

LIST_MESSAGES = f"""
select {MESSAGE_COLUMNS}, {CARD_COLUMNS}
from public.messages m
{CARD_JOINS}
where m.conversation_id = %(conversation_id)s
  and (%(cursor_at)s::timestamptz is null
       or (m.created_at, m.id) > (%(cursor_at)s, %(cursor_id)s::uuid))
order by m.created_at, m.id
limit %(limit)s
"""

# Para trás: lê das mais novas para as mais antigas; a rota devolve a página cronológica.
LIST_MESSAGES_BEFORE = f"""
select {MESSAGE_COLUMNS}, {CARD_COLUMNS}
from public.messages m
{CARD_JOINS}
where m.conversation_id = %(conversation_id)s
  and (%(cursor_at)s::timestamptz is null
       or (m.created_at, m.id) < (%(cursor_at)s, %(cursor_id)s::uuid))
order by m.created_at desc, m.id desc
limit %(limit)s
"""

LATEST = "latest"

BeforeQuery = Annotated[
    str | None,
    Query(
        min_length=1,
        max_length=200,
        description=(
            "Lê de trás para frente. `latest` traz as mensagens mais recentes; para as anteriores, "
            "passe aqui o `next_cursor` da resposta. A página continua em ordem cronológica. Não "
            "combina com `cursor`."
        ),
    ),
]

POST_MESSAGE = f"select {MESSAGE_COLUMNS} from app.post_message(%s, %s) m"


def message_from_row(row: dict) -> Message:
    card = None
    if row.get("card") is not None:
        card = MessageCard(
            **row["card"],
            work_item_id=row["work_item_id"],
            delivery_version_id=row["delivery_version_id"],
            approval_id=row["approval_id"],
            approval_status=row["approval_status"],
            decision=row["approval_decision"],
            answer=row["approval_note"] if row["approval_decision"] == "answered" else None,
            version_status=row["version_status"],
            work_item_status=row["work_item_status"],
        )
    fields = {k: row[k] for k in Message.model_fields if k in row and k != "card"}
    return Message(**fields, card=card)


async def load_conversation(conn: AsyncConnection[DictRow], conversation_id: UUID) -> dict:
    row = await (await conn.execute(GET_CONVERSATION, (conversation_id,))).fetchone()
    if row is None:
        # Inexistente e de outro workspace respondem igual.
        raise ApiError(404, "not_found", "Conversa não encontrada.")
    return row


async def conversation_context(
    conn: AsyncConnection[DictRow], row: dict
) -> ConversationContext | None:
    if row["context_type"] is None:
        return None
    meta = row["context_meta"] or {}
    query = CONTEXT_QUERIES.get(row["context_type"])
    found = (
        await (await conn.execute(query, (row["context_id"],))).fetchone()
        if query and row["context_id"]
        else None
    )
    source = found if query else meta
    return ConversationContext(
        type=row["context_type"],
        id=row["context_id"],
        key=row["context_key"],
        title=source.get("title") if source else None,
        status=source.get("status") if source else None,
        summary=meta.get("summary"),
        period=meta.get("period"),
        origin=meta.get("origin"),
    )


async def conversation_detail(
    conn: AsyncConnection[DictRow], conversation_id: UUID
) -> ConversationDetail:
    row = await load_conversation(conn, conversation_id)
    participants = await (await conn.execute(PARTICIPANTS, (conversation_id,))).fetchall()
    return ConversationDetail(
        **row,
        participants=[Participant(**p) for p in participants],
        context=await conversation_context(conn, row),
    )


@router.get(
    "/workspaces/{workspace_id}/conversations",
    summary="Conversas ativas do workspace (paginação por cursor)",
    responses=error_responses(401, 404, 422, 503),
)
async def list_conversations(
    workspace_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    cursor: CursorQuery = None,
    limit: Annotated[int, limit_query(100)] = 50,
) -> ConversationPage:
    cursor_at, cursor_id = decode_cursor(cursor)
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        params = {
            "workspace_id": workspace_id,
            "cursor_at": cursor_at,
            "cursor_id": cursor_id,
            "limit": limit + 1,
        }
        rows = await (await conn.execute(LIST_CONVERSATIONS, params)).fetchall()
    page, next_cursor = split_page(rows, limit, "activity_at")
    return ConversationPage(items=[Conversation(**row) for row in page], next_cursor=next_cursor)


@router.get(
    "/workspaces/{workspace_id}/conversations/unread",
    summary="Não lidas da pessoa logada: total, Sala do Squad e por especialista (ambiente)",
    responses=error_responses(401, 404, 422, 503),
)
async def unread_summary(
    workspace_id: UUID, principal: CurrentPrincipal, db: DatabaseDep
) -> UnreadSummary:
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        rows = await (await conn.execute(UNREAD_BY_AGENT, (workspace_id,))).fetchall()
    room = next((r for r in rows if r["agent_id"] is None), None)
    by_agent = sorted(
        (AgentUnread(**r) for r in rows if r["agent_id"] is not None),
        key=lambda a: list(AgentId).index(a.agent_id),
    )
    return UnreadSummary(
        conversations=sum(r["conversations"] for r in rows),
        messages=sum(r["messages"] for r in rows),
        squad_room=UnreadCount(
            conversations=room["conversations"] if room else 0,
            messages=room["messages"] if room else 0,
        ),
        by_agent=by_agent,
    )


@router.post(
    "/conversations/{conversation_id}/read",
    summary="Marca a conversa como lida pela pessoa logada (qualquer membro, até viewer)",
    responses=error_responses(401, 404, 422, 503),
)
async def mark_read(
    conversation_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    payload: ReadCreate | None = None,
) -> ConversationRead:
    async with db.transaction_as(principal) as conn:
        read = await (
            await conn.execute(MARK_READ, (conversation_id, payload.read_at if payload else None))
        ).fetchone()
        row = await load_conversation(conn, conversation_id)
    return ConversationRead(
        conversation_id=read["conversation_id"],
        last_read_at=read["last_read_at"],
        unread_count=row["unread_count"],
    )


@router.post(
    "/workspaces/{workspace_id}/conversations",
    status_code=status.HTTP_201_CREATED,
    summary="Abre uma conversa (Sala do Squad e conversa de objeto são reutilizadas)",
    description=(
        "201 quando cria; 200 com a conversa existente quando a Sala do Squad do workspace ou a "
        "conversa do objeto já existe. Exige papel editor ou acima."
    ),
    responses={
        200: {"model": ConversationDetail, "description": "Conversa existente reutilizada."},
        **error_responses(401, 403, 404, 422, 503),
    },
)
async def create_conversation(
    workspace_id: UUID,
    payload: ConversationCreate,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    response: Response,
) -> ConversationDetail:
    context = payload.context
    params = {
        "workspace_id": workspace_id,
        "kind": payload.kind,
        "primary_agent_id": payload.primary_agent_id,
        "context_type": context.type if context else None,
        "context_id": context.id if context else None,
        "title": payload.title,
        "agent_ids": [str(a) for a in payload.agent_ids] if payload.agent_ids else None,
        "context_key": context.key if context else None,
        "context_meta": Jsonb(meta) if context and (meta := context.meta()) else None,
    }
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        created = await (await conn.execute(CREATE_CONVERSATION, params)).fetchone()
        detail = await conversation_detail(conn, created["id"])
    if not created["created"]:
        response.status_code = status.HTTP_200_OK
    response.headers["Location"] = f"/conversations/{detail.id}"
    return detail


@router.get(
    "/conversations/{conversation_id}",
    summary="Uma conversa, com participantes e o objeto de contexto",
    responses=error_responses(401, 404, 422, 503),
)
async def get_conversation(
    conversation_id: UUID, principal: CurrentPrincipal, db: DatabaseDep
) -> ConversationDetail:
    async with db.transaction_as(principal) as conn:
        return await conversation_detail(conn, conversation_id)


@router.get(
    "/conversations/{conversation_id}/messages",
    summary="Mensagens da conversa em ordem cronológica (paginação por cursor)",
    description=(
        "Sem `before`, a primeira página é a das mensagens mais antigas e `cursor` avança para as "
        "mais novas. Com `before=latest`, a primeira página é a das mais recentes e `before` recua "
        "para as mais antigas. Nos dois sentidos, `next_cursor` continua a leitura no mesmo "
        "parâmetro."
    ),
    responses=error_responses(401, 404, 422, 503),
)
async def list_messages(
    conversation_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    cursor: CursorQuery = None,
    before: BeforeQuery = None,
    limit: Annotated[int, limit_query(100)] = 50,
) -> MessagePage:
    if cursor and before:
        raise ApiError(422, "invalid_cursor", "Use cursor ou before, não os dois.")
    if before is None:
        query, (cursor_at, cursor_id) = LIST_MESSAGES, decode_cursor(cursor)
    else:
        query = LIST_MESSAGES_BEFORE
        cursor_at, cursor_id = (None, None) if before == LATEST else decode_cursor(before)
    async with db.transaction_as(principal) as conn:
        await load_conversation(conn, conversation_id)
        params = {
            "conversation_id": conversation_id,
            "cursor_at": cursor_at,
            "cursor_id": cursor_id,
            "limit": limit + 1,
        }
        rows = await (await conn.execute(query, params)).fetchall()
    page, next_cursor = split_page(rows, limit, "created_at")
    if before is not None:
        page = page[::-1]
    return MessagePage(items=[message_from_row(row) for row in page], next_cursor=next_cursor)


@router.post(
    "/conversations/{conversation_id}/messages",
    status_code=status.HTTP_201_CREATED,
    summary="Envia uma mensagem na conversa (editor ou acima)",
    responses=error_responses(401, 403, 404, 409, 422, 503),
)
async def post_message(
    conversation_id: UUID, payload: MessageCreate, principal: CurrentPrincipal, db: DatabaseDep
) -> Message:
    async with db.transaction_as(principal) as conn:
        row = await (await conn.execute(POST_MESSAGE, (conversation_id, payload.body))).fetchone()
    return Message(**row)


@router.post(
    "/messages/{message_id}/reply",
    status_code=status.HTTP_201_CREATED,
    summary="Pede a resposta do squad a uma mensagem da pessoa (um especialista por vez)",
    description=(
        "Põe na fila o run de resposta (sem trabalho) de quem responde: `@Nome` de um participante "
        "direciona; na conversa em grupo, sem menção, o especialista mais ligado ao pedido "
        "(palavras do protótipo) e, sem nenhuma, o Nexo se participa, senão o primeiro; na Sala "
        "do Squad, o Nexo; nas outras, quem está à frente. 201 quando cria; 200 com o mesmo run "
        "ao repetir. "
        "Mensagem que virou trabalho responde 409. Exige papel editor ou acima."
    ),
    responses={
        200: {"model": ReplyRequest, "description": "Mesmo run, já pedido antes."},
        **error_responses(401, 403, 404, 409, 422, 503),
    },
)
async def request_reply(
    message_id: UUID, principal: CurrentPrincipal, db: DatabaseDep, response: Response
) -> ReplyRequest:
    async with db.transaction_as(principal) as conn:
        row = await (await conn.execute(REQUEST_REPLY, (message_id,))).fetchone()
    if not row["created"]:
        response.status_code = status.HTTP_200_OK
    return ReplyRequest(**row)
