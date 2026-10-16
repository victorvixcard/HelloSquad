"""Projetos e trabalhos. Pedido → trabalho: app.create_work_item_from_message (run e fila)."""

from collections import defaultdict
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response
from fastapi import status as http_status
from psycopg.types.json import Jsonb

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep, ensure_workspace
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.api.pagination import CursorQuery, decode_cursor, limit_query, split_page
from hellosquad.approvals.routes import APPROVAL_SELECT, approval_from_row
from hellosquad.autonomy.schemas import RunSummary
from hellosquad.domain import WorkItemStatus
from hellosquad.i18n import t
from hellosquad.work.live import history_text, live_fields, step_reason
from hellosquad.work.schemas import (
    Delivery,
    DeliveryFile,
    DeliveryVersion,
    PendingApprovalSummary,
    Project,
    ProjectPage,
    WorkItem,
    WorkItemCreate,
    WorkItemCreated,
    WorkItemDetail,
    WorkItemHistoryEntry,
    WorkItemOrigin,
    WorkItemPage,
    WorkItemStep,
)

router = APIRouter(tags=["work"])

PROJECT_COLUMNS = """
p.id, p.workspace_id, p.name, p.objective, p.status::text, p.owner_agent_id::text, p.starts_at,
p.ends_at, p.created_by, p.archived_at, p.created_at, p.updated_at
"""

LIST_PROJECTS = f"""
select {PROJECT_COLUMNS}
from public.projects p
where p.workspace_id = %(workspace_id)s
  and p.archived_at is null
  and (%(cursor_at)s::timestamptz is null
       or (p.created_at, p.id) < (%(cursor_at)s, %(cursor_id)s::uuid))
order by p.created_at desc, p.id desc
limit %(limit)s
"""

# Trabalho com a origem resolvida, a pendência aberta (a que depende de você primeiro; as adiadas
# por último) e as versões, para a frase do estado.
WORK_ITEM_SELECT = """
select w.id, w.workspace_id, w.project_id, w.conversation_id, w.origin_message_id, w.title,
       w.delivery_type, w.status::text, w.primary_agent_id::text,
       w.collaborator_agent_ids::text[] as collaborator_agent_ids, w.created_by, w.created_at,
       w.updated_at, w.due_at, w.next_step, w.status_label, w.origin_type::text, w.origin_ref,
       s.locale,
       oc.id as origin_conversation_id, oc.kind::text as origin_conversation_kind,
       oc.primary_agent_id::text as origin_conversation_agent_id,
       ms.agent_id::text as origin_insight_agent_id, ms.title as origin_insight_title,
       op.name as origin_project_name,
       pa.id as pending_approval_id, pa.kind as pending_kind, pa.version_no as pending_version_no,
       pa.due_at as pending_due_at, pa.agent_id as pending_agent_id,
       pa.deferred as pending_deferred, dv.approved_version_no,
       st.step_total, coalesce(st.step_active, st.step_next) as step_current
from public.work_items w
join public.workspaces s on s.id = w.workspace_id
left join public.messages om on om.id = w.origin_message_id
left join public.conversations oc on oc.id = om.conversation_id
left join public.memory_suggestions ms
  on w.origin_type = 'insight' and ms.workspace_id = w.workspace_id
 and ms.id = (case when w.origin_type = 'insight' then w.origin_ref::uuid end)
left join public.projects op
  on w.origin_type = 'project' and op.workspace_id = w.workspace_id
 and op.id = (case when w.origin_type = 'project' then w.origin_ref::uuid end)
left join lateral (
  select a.id, a.kind::text as kind, v.version_no, a.due_at,
         a.requested_by_agent_id::text as agent_id, app.approval_is_deferred(a) as deferred
  from public.approvals a
  left join public.delivery_versions v on v.id = a.delivery_version_id
  where a.work_item_id = w.id and a.status = 'pending'
  order by app.approval_is_deferred(a), a.created_at desc, a.id desc
  limit 1
) pa on true
left join lateral (
  select max(v.version_no) filter (where v.status = 'approved') as approved_version_no
  from public.delivery_versions v
  join public.deliveries d on d.id = v.delivery_id
  where d.work_item_id = w.id
) dv on true
left join lateral (
  select count(*) as step_total,
         min(s.seq) filter (where s.status in ('in_progress', 'needs_you')) as step_active,
         min(s.seq) filter (where s.status = 'pending') as step_next
  from public.work_item_steps s
  where s.work_item_id = w.id and s.delivery_type is not null
) st on true
"""

LIST_WORK_ITEMS = f"""
{WORK_ITEM_SELECT}
where w.workspace_id = %(workspace_id)s
  and (%(statuses)s::public.work_item_status[] is null
       or w.status = any (%(statuses)s::public.work_item_status[]))
  and (%(project_id)s::uuid is null or w.project_id = %(project_id)s::uuid)
  and (%(cursor_at)s::timestamptz is null
       or (w.created_at, w.id) < (%(cursor_at)s, %(cursor_id)s::uuid))
order by w.created_at desc, w.id desc
limit %(limit)s
"""

GET_WORK_ITEM = f"""
{WORK_ITEM_SELECT}
where w.id = %s and w.workspace_id in (select app.current_user_workspace_ids())
"""

BRIEFING = "select w.briefing from public.work_items w where w.id = %s"

CREATE_WORK_ITEM = """
select w.id, w.origin_message_id, w.briefing, w.created_at = now() as created
from app.create_work_item_from_message(%s, %s, %s, %s, %s) w
"""

START_RUN = """
select r.id from public.runs r
where r.work_item_id = %s and r.idempotency_key = 'work_item:' || r.work_item_id || ':start'
"""

HISTORY = """
select h.id, h.actor_type::text, h.actor_user_id, h.actor_agent_id::text as agent_id, h.kind,
       h.params, h.mark, h.approval_id, h.delivery_version_id, h.created_at
from public.work_item_history h
where h.work_item_id = %s
order by h.created_at, h.id
"""


def origin_of(row: dict) -> WorkItemOrigin | None:
    if row["origin_type"] is None:
        return None
    return WorkItemOrigin(
        type=row["origin_type"],
        ref=row["origin_ref"],
        conversation_id=row["origin_conversation_id"],
        conversation_kind=row["origin_conversation_kind"],
        agent_id=row["origin_insight_agent_id"]
        or (
            row["origin_conversation_agent_id"]
            if row["origin_conversation_kind"] == "agent_direct"
            else None
        ),
        title=row["origin_insight_title"] or row["origin_project_name"],
    )


def work_item_fields(row: dict) -> dict:
    """Colunas do trabalho, frase viva, origem e a pendência aberta, prontas para os schemas."""
    status_label, next_step = live_fields(row["locale"], row)
    pending = None
    if row["pending_approval_id"] is not None:
        pending = PendingApprovalSummary(
            id=row["pending_approval_id"],
            kind=row["pending_kind"],
            requested_by_agent_id=row["pending_agent_id"],
            delivery_version_no=row["pending_version_no"],
            due_at=row["pending_due_at"],
            deferred=row["pending_deferred"],
        )
    return {
        **{key: row[key] for key in WorkItem.model_fields if key in row},
        "status_label": status_label,
        "next_step": next_step,
        "origin": origin_of(row),
        "awaiting_you": pending is not None and not pending.deferred,
        "pending_approval": pending,
        "step_label": t(
            row["locale"], "work.step_label", seq=row["step_current"], total=row["step_total"]
        )
        if row.get("step_total") and row.get("step_current")
        else None,
    }


def work_step(locale: str, row: dict) -> WorkItemStep:
    params = row.pop("status_params") or {}
    return WorkItemStep(
        **row, status_reason_label=step_reason(locale, row["status_reason"], params)
    )


def history_entry(locale: str, row: dict, origin: WorkItemOrigin | None) -> WorkItemHistoryEntry:
    origin_data = origin.model_dump(mode="json") if origin else {}
    return WorkItemHistoryEntry(
        **row,
        text=history_text(locale, row, origin_data),
        mark_label=t(locale, f"history.mark.{row['mark']}") if row["mark"] else None,
    )


STEPS = """
select s.id, s.seq, s.title, s.agent_id::text, s.status::text, s.started_at, s.finished_at,
       s.delivery_type, s.depends_on, s.input ->> 'responsabilidade' as responsibility,
       s.input ->> 'instrucao' as instruction, s.status_reason, s.status_params,
       (s.output ->> 'delivery_version_id')::uuid as delivery_version_id,
       (s.output ->> 'version_no')::integer as version_no
from public.work_item_steps s
where s.work_item_id = %s
order by s.seq
"""

DELIVERIES = """
select d.id, d.kind, d.current_version_id, d.step_id, d.created_at, d.updated_at
from public.deliveries d
where d.work_item_id = %s
order by d.created_at, d.id
"""

VERSIONS = """
select v.id, v.delivery_id, v.version_no, v.status::text, v.content, v.created_by_type::text,
       v.created_by_user_id, v.created_by_agent_id::text, v.run_id, v.change_note, v.created_at
from public.delivery_versions v
join public.deliveries d on d.id = v.delivery_id
where d.work_item_id = %s
order by v.delivery_id, v.version_no
"""

FILES = """
select f.id, f.version_id, f.storage_path, f.mime, f.size_bytes
from public.delivery_files f
join public.delivery_versions v on v.id = f.version_id
join public.deliveries d on d.id = v.delivery_id
where d.work_item_id = %s
order by f.created_at, f.id
"""

WORK_ITEM_APPROVALS = f"{APPROVAL_SELECT} where a.work_item_id = %s order by a.created_at, a.id"

RUNS = """
select r.id, r.agent_id::text, r.kind::text, r.status::text, r.created_at, r.started_at,
       r.finished_at
from public.runs r
where r.work_item_id = %s
order by r.created_at, r.id
"""


@router.get(
    "/workspaces/{workspace_id}/projects",
    summary="Projetos ativos do workspace (paginação por cursor)",
    responses=error_responses(401, 404, 422, 503),
)
async def list_projects(
    workspace_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    cursor: CursorQuery = None,
    limit: Annotated[int, limit_query(100)] = 50,
) -> ProjectPage:
    cursor_at, cursor_id = decode_cursor(cursor)
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        params = {
            "workspace_id": workspace_id,
            "cursor_at": cursor_at,
            "cursor_id": cursor_id,
            "limit": limit + 1,
        }
        rows = await (await conn.execute(LIST_PROJECTS, params)).fetchall()
    page, next_cursor = split_page(rows, limit, "created_at")
    return ProjectPage(items=[Project(**row) for row in page], next_cursor=next_cursor)


@router.post(
    "/messages/{message_id}/work-items",
    status_code=http_status.HTTP_201_CREATED,
    summary="Transforma uma mensagem em trabalho e enfileira o run (editor ou acima)",
    description=(
        "Cria o trabalho (`draft`), o run `queued` e a mensagem na fila `runs_interactive` na "
        "mesma transação. Repetir com a mesma `idempotency_key` (ou, sem chave, a mesma mensagem "
        "com o mesmo `delivery_type`) responde 200 com o mesmo trabalho e o mesmo run. Chave já "
        "usada em outra mensagem responde 409 `idempotency_key_reused`."
    ),
    responses={
        200: {"model": WorkItemCreated, "description": "Pedido repetido: o trabalho já existia."},
        **error_responses(401, 403, 404, 409, 422, 503),
    },
)
async def create_work_item(
    message_id: UUID,
    payload: WorkItemCreate,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    response: Response,
) -> WorkItemCreated:
    async with db.transaction_as(principal) as conn:
        created = await (
            await conn.execute(
                CREATE_WORK_ITEM,
                (
                    message_id,
                    payload.delivery_type,
                    payload.title,
                    Jsonb(payload.briefing),
                    payload.idempotency_key,
                ),
            )
        ).fetchone()
        if created["origin_message_id"] != message_id:
            raise ApiError(
                409,
                "idempotency_key_reused",
                "Esta chave de idempotência já foi usada em outro pedido.",
            )
        row = await (await conn.execute(GET_WORK_ITEM, (created["id"],))).fetchone()
        run = await (await conn.execute(START_RUN, (created["id"],))).fetchone()
    if not created["created"]:
        response.status_code = http_status.HTTP_200_OK
    response.headers["Location"] = f"/work-items/{created['id']}"
    return WorkItemCreated(
        **work_item_fields(row), briefing=created["briefing"], run_id=run["id"] if run else None
    )


@router.get(
    "/workspaces/{workspace_id}/work-items",
    summary="Trabalhos do workspace para o quadro e a lista (paginação por cursor)",
    responses=error_responses(401, 404, 422, 503),
)
async def list_work_items(
    workspace_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    status: Annotated[
        list[WorkItemStatus] | None,
        Query(description="Filtra por estado; repita o parâmetro para mais de um."),
    ] = None,
    project_id: Annotated[UUID | None, Query(description="Só os trabalhos do projeto.")] = None,
    cursor: CursorQuery = None,
    limit: Annotated[int, limit_query(100)] = 50,
) -> WorkItemPage:
    cursor_at, cursor_id = decode_cursor(cursor)
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        params = {
            "workspace_id": workspace_id,
            "statuses": [str(s) for s in status] if status else None,
            "project_id": project_id,
            "cursor_at": cursor_at,
            "cursor_id": cursor_id,
            "limit": limit + 1,
        }
        rows = await (await conn.execute(LIST_WORK_ITEMS, params)).fetchall()
    page, next_cursor = split_page(rows, limit, "created_at")
    return WorkItemPage(
        items=[WorkItem(**work_item_fields(row)) for row in page], next_cursor=next_cursor
    )


@router.get(
    "/work-items/{work_item_id}",
    summary="Um trabalho com etapas, entregas (versões e arquivos), aprovações, runs e histórico",
    responses=error_responses(401, 404, 422, 503),
)
async def get_work_item(
    work_item_id: UUID, principal: CurrentPrincipal, db: DatabaseDep
) -> WorkItemDetail:
    async with db.transaction_as(principal) as conn:
        item = await (await conn.execute(GET_WORK_ITEM, (work_item_id,))).fetchone()
        if item is None:
            raise ApiError(404, "not_found", "Trabalho não encontrado.")
        briefing = await (await conn.execute(BRIEFING, (work_item_id,))).fetchone()
        history = await (await conn.execute(HISTORY, (work_item_id,))).fetchall()
        steps = await (await conn.execute(STEPS, (work_item_id,))).fetchall()
        deliveries = await (await conn.execute(DELIVERIES, (work_item_id,))).fetchall()
        versions = await (await conn.execute(VERSIONS, (work_item_id,))).fetchall()
        files = await (await conn.execute(FILES, (work_item_id,))).fetchall()
        approvals = await (await conn.execute(WORK_ITEM_APPROVALS, (work_item_id,))).fetchall()
        runs = await (await conn.execute(RUNS, (work_item_id,))).fetchall()

    files_by_version: dict[UUID, list[DeliveryFile]] = defaultdict(list)
    for file in files:
        files_by_version[file["version_id"]].append(DeliveryFile(**file))
    versions_by_delivery: dict[UUID, list[DeliveryVersion]] = defaultdict(list)
    for version in versions:
        versions_by_delivery[version["delivery_id"]].append(
            DeliveryVersion(**version, files=files_by_version[version["id"]])
        )
    fields = work_item_fields(item)
    return WorkItemDetail(
        **fields,
        briefing=briefing["briefing"],
        history=[history_entry(item["locale"], row, fields["origin"]) for row in history],
        steps=[work_step(item["locale"], step) for step in steps],
        deliveries=[
            Delivery(**delivery, versions=versions_by_delivery[delivery["id"]])
            for delivery in deliveries
        ],
        approvals=[approval_from_row(row) for row in approvals],
        runs=[RunSummary(**run) for run in runs],
    )
