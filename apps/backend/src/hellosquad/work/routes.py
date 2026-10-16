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
from hellosquad.work.schemas import (
    Delivery,
    DeliveryFile,
    DeliveryVersion,
    Project,
    ProjectPage,
    WorkItem,
    WorkItemCreate,
    WorkItemCreated,
    WorkItemDetail,
    WorkItemPage,
    WorkItemStep,
)

router = APIRouter(tags=["work"])

PROJECT_COLUMNS = """
p.id, p.workspace_id, p.name, p.objective, p.status::text, p.owner_agent_id::text, p.created_by,
p.archived_at, p.created_at, p.updated_at
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

GET_PROJECT = f"""
select {PROJECT_COLUMNS}
from public.projects p
where p.id = %s and p.workspace_id in (select app.current_user_workspace_ids())
"""

WORK_ITEM_COLUMNS = """
w.id, w.workspace_id, w.project_id, w.conversation_id, w.origin_message_id, w.title,
w.delivery_type, w.status::text, w.primary_agent_id::text,
w.collaborator_agent_ids::text[] as collaborator_agent_ids, w.created_by, w.created_at,
w.updated_at
"""

LIST_WORK_ITEMS = f"""
select {WORK_ITEM_COLUMNS}
from public.work_items w
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
select {WORK_ITEM_COLUMNS}, w.briefing
from public.work_items w
where w.id = %s and w.workspace_id in (select app.current_user_workspace_ids())
"""

CREATE_WORK_ITEM = f"""
select {WORK_ITEM_COLUMNS}, w.briefing, w.created_at = now() as created
from app.create_work_item_from_message(%s, %s, %s, %s, %s) w
"""

START_RUN = """
select r.id from public.runs r
where r.work_item_id = %s and r.idempotency_key = 'work_item:' || r.work_item_id || ':start'
"""

STEPS = """
select s.id, s.seq, s.title, s.agent_id::text, s.status::text, s.started_at, s.finished_at
from public.work_item_steps s
where s.work_item_id = %s
order by s.seq
"""

DELIVERIES = """
select d.id, d.kind, d.current_version_id, d.created_at, d.updated_at
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


@router.get(
    "/projects/{project_id}",
    summary="Um projeto",
    responses=error_responses(401, 404, 422, 503),
)
async def get_project(project_id: UUID, principal: CurrentPrincipal, db: DatabaseDep) -> Project:
    async with db.transaction_as(principal) as conn:
        row = await (await conn.execute(GET_PROJECT, (project_id,))).fetchone()
    if row is None:
        raise ApiError(404, "not_found", "Projeto não encontrado.")
    return Project(**row)


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
        row = await (
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
        if row["origin_message_id"] != message_id:
            raise ApiError(
                409,
                "idempotency_key_reused",
                "Esta chave de idempotência já foi usada em outro pedido.",
            )
        run = await (await conn.execute(START_RUN, (row["id"],))).fetchone()
    if not row["created"]:
        response.status_code = http_status.HTTP_200_OK
    response.headers["Location"] = f"/work-items/{row['id']}"
    return WorkItemCreated(**row, run_id=run["id"] if run else None)


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
    return WorkItemPage(items=[WorkItem(**row) for row in page], next_cursor=next_cursor)


@router.get(
    "/work-items/{work_item_id}",
    summary="Um trabalho com etapas, entregas (versões e arquivos), aprovações e runs",
    responses=error_responses(401, 404, 422, 503),
)
async def get_work_item(
    work_item_id: UUID, principal: CurrentPrincipal, db: DatabaseDep
) -> WorkItemDetail:
    async with db.transaction_as(principal) as conn:
        item = await (await conn.execute(GET_WORK_ITEM, (work_item_id,))).fetchone()
        if item is None:
            raise ApiError(404, "not_found", "Trabalho não encontrado.")
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
    return WorkItemDetail(
        **item,
        steps=[WorkItemStep(**step) for step in steps],
        deliveries=[
            Delivery(**delivery, versions=versions_by_delivery[delivery["id"]])
            for delivery in deliveries
        ],
        approvals=[approval_from_row(row) for row in approvals],
        runs=[RunSummary(**run) for run in runs],
    )
