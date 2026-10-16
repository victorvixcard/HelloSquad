"""Conversas e mensagens. Tudo roda como o usuário do JWT; escrita só pelas funções app.*."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response, status
from psycopg import AsyncConnection
from psycopg.rows import DictRow

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep, ensure_workspace
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.api.pagination import CursorQuery, decode_cursor, limit_query, split_page
from hellosquad.conversations.schemas import (
    Conversation,
    ConversationContext,
    ConversationCreate,
    ConversationDetail,
    ConversationPage,
    Message,
    MessageCreate,
    MessagePage,
    Participant,
)

router = APIRouter(tags=["conversations"])

CONVERSATION_COLUMNS = """
c.id, c.workspace_id, c.kind::text, c.primary_agent_id::text, c.context_type, c.context_id, c.title,
c.created_by, c.last_message_at, c.archived_at, c.created_at, c.updated_at
"""

LIST_CONVERSATIONS = f"""
select {CONVERSATION_COLUMNS}, coalesce(c.last_message_at, c.created_at) as activity_at
from public.conversations c
where c.workspace_id = %(workspace_id)s
  and c.archived_at is null
  and (%(cursor_at)s::timestamptz is null
       or (coalesce(c.last_message_at, c.created_at), c.id) < (%(cursor_at)s, %(cursor_id)s::uuid))
order by activity_at desc, c.id desc
limit %(limit)s
"""

GET_CONVERSATION = f"""
select {CONVERSATION_COLUMNS}
from public.conversations c
where c.id = %s and c.workspace_id in (select app.current_user_workspace_ids())
"""

CREATE_CONVERSATION = """
select c.id, c.created_at = now() as created
from app.create_conversation(%s, %s::public.conversation_kind, %s, %s, %s, %s) c
"""

PARTICIPANTS = """
select p.participant_type::text, p.user_id, p.agent_id::text
from public.conversation_participants p
where p.conversation_id = %s
order by p.participant_type, p.created_at, p.agent_id
"""

# Cartão do objeto da conversa: título e estado, lidos com a RLS do usuário.
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
}

MESSAGE_COLUMNS = """
m.id, m.conversation_id, m.author_type::text, m.author_user_id, m.author_agent_id::text, m.run_id,
m.body, m.body_format, m.attachments, m.created_at
"""

LIST_MESSAGES = f"""
select {MESSAGE_COLUMNS}
from public.messages m
where m.conversation_id = %(conversation_id)s
  and (%(cursor_at)s::timestamptz is null
       or (m.created_at, m.id) > (%(cursor_at)s, %(cursor_id)s::uuid))
order by m.created_at, m.id
limit %(limit)s
"""

# Para trás: lê das mais novas para as mais antigas; a rota devolve a página cronológica.
LIST_MESSAGES_BEFORE = f"""
select {MESSAGE_COLUMNS}
from public.messages m
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


async def load_conversation(conn: AsyncConnection[DictRow], conversation_id: UUID) -> dict:
    row = await (await conn.execute(GET_CONVERSATION, (conversation_id,))).fetchone()
    if row is None:
        # Inexistente e de outro workspace respondem igual.
        raise ApiError(404, "not_found", "Conversa não encontrada.")
    return row


async def conversation_detail(
    conn: AsyncConnection[DictRow], conversation_id: UUID
) -> ConversationDetail:
    row = await load_conversation(conn, conversation_id)
    participants = await (await conn.execute(PARTICIPANTS, (conversation_id,))).fetchall()
    context = None
    if row["context_type"] is not None:
        query = CONTEXT_QUERIES.get(row["context_type"])
        found = (
            await (await conn.execute(query, (row["context_id"],))).fetchone() if query else None
        )
        context = ConversationContext(
            type=row["context_type"],
            id=row["context_id"],
            title=found["title"] if found else None,
            status=found["status"] if found else None,
        )
    return ConversationDetail(
        **row, participants=[Participant(**p) for p in participants], context=context
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
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        created = await (
            await conn.execute(
                CREATE_CONVERSATION,
                (
                    workspace_id,
                    payload.kind,
                    payload.primary_agent_id,
                    context.type if context else None,
                    context.id if context else None,
                    payload.title,
                ),
            )
        ).fetchone()
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
    return MessagePage(items=[Message(**row) for row in page], next_cursor=next_cursor)


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
