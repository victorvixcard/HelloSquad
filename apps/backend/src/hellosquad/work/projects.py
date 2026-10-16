"""Projetos: datas, marcos e participantes (FLUXOS_DA_V46.md §2.3). Escrita por editor ou acima."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query
from fastapi import status as http_status
from psycopg import AsyncConnection
from psycopg.rows import DictRow
from psycopg.types.json import Jsonb

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep, ensure_workspace
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.i18n import t
from hellosquad.work.schemas import (
    MilestoneCreate,
    MilestonePage,
    MilestoneUpdate,
    ProjectCreate,
    ProjectDetail,
    ProjectMilestone,
    ProjectOwner,
    ProjectParticipant,
    ProjectParticipantsSet,
    ProjectUpdate,
)

router = APIRouter(tags=["work"])

PROJECT = """
select p.id, p.workspace_id, p.name, p.objective, p.status::text, p.owner_agent_id::text,
       p.starts_at, p.ends_at, p.created_by, p.archived_at, p.created_at, p.updated_at,
       (select count(*) from public.work_items w where w.project_id = p.id) as work_item_count
from public.projects p
where p.id = %s and p.workspace_id in (select app.current_user_workspace_ids())
"""

PARTICIPANTS = """
select pp.agent_id::text, pp.responsibility
from public.project_participants pp
join public.projects p on p.id = pp.project_id
where pp.project_id = %s
order by pp.agent_id = p.owner_agent_id desc, pp.created_at, pp.agent_id
"""

MILESTONE_COLUMNS = """
m.id, m.project_id, m.title, m.summary, m.agent_id::text, m.kind, m.due_at, m.needs_you,
m.planned, m.done_at is not null as done, m.done_at, m.work_item_id, m.approval_id, m.created_at,
m.updated_at, m.step_id
"""

MILESTONES = f"""
select {MILESTONE_COLUMNS}
from public.project_milestones m
left join public.work_item_steps s on s.id = m.step_id
where m.project_id = %s
order by m.due_at nulls last, m.created_at, s.seq nulls last, m.id
"""

GET_MILESTONE = f"""
select {MILESTONE_COLUMNS}
from public.project_milestones m
where m.id = %s and m.workspace_id in (select app.current_user_workspace_ids())
"""

UPCOMING_MILESTONES = f"""
select {MILESTONE_COLUMNS}
from public.project_milestones m
join public.projects p on p.id = m.project_id and p.archived_at is null
where m.workspace_id = %(workspace_id)s and m.done_at is null and m.due_at is not null
  and m.due_at >= date_trunc('day', now())
  and m.due_at < date_trunc('day', now()) + make_interval(days => %(days)s + 1)
order by m.due_at, m.needs_you desc, m.id
limit %(limit)s
"""

CREATE_PROJECT = "select id from app.create_project(%s, %s, %s, %s, %s, %s, %s)"
UPDATE_PROJECT = "select id from app.update_project(%s, %s)"
SET_PARTICIPANTS = "select project_id from app.set_project_participants(%s, %s) limit 1"
ADD_MILESTONE = "select id from app.add_project_milestone(%s, %s, %s, %s, %s, %s, %s, %s)"
UPDATE_MILESTONE = "select id from app.update_project_milestone(%s, %s)"

OWNER = """
select m.user_id, s.locale
from public.projects p
join public.workspaces s on s.id = p.workspace_id
join public.memberships m on m.workspace_id = p.workspace_id and m.role = 'owner'
where p.id = %s
order by m.created_at, m.user_id
limit 1
"""

REQUIRED_PROJECT_FIELDS = ("name", "status", "owner_agent_id")


async def load_project(conn: AsyncConnection[DictRow], project_id: UUID) -> ProjectDetail:
    row = await (await conn.execute(PROJECT, (project_id,))).fetchone()
    if row is None:
        raise ApiError(404, "not_found", "Projeto não encontrado.")
    participants = await (await conn.execute(PARTICIPANTS, (project_id,))).fetchall()
    milestones = await (await conn.execute(MILESTONES, (project_id,))).fetchall()
    owner = await (await conn.execute(OWNER, (project_id,))).fetchone()
    return ProjectDetail(
        **row,
        participants=[ProjectParticipant(**p) for p in participants],
        milestones=[ProjectMilestone(**m) for m in milestones],
        owner=ProjectOwner(
            user_id=owner["user_id"],
            responsibility=t(owner["locale"], "project.owner_responsibility"),
        )
        if owner
        else None,
    )


async def load_milestone(conn: AsyncConnection[DictRow], milestone_id: UUID) -> ProjectMilestone:
    row = await (await conn.execute(GET_MILESTONE, (milestone_id,))).fetchone()
    if row is None:
        raise ApiError(404, "not_found", "Marco não encontrado.")
    return ProjectMilestone(**row)


def participants_json(items: list) -> Jsonb:
    return Jsonb([item.model_dump(mode="json", exclude_none=True) for item in items])


@router.get(
    "/projects/{project_id}",
    summary="Um projeto com a equipe, os marcos e quantos trabalhos foram pedidos nele",
    responses=error_responses(401, 404, 422, 503),
)
async def get_project(
    project_id: UUID, principal: CurrentPrincipal, db: DatabaseDep
) -> ProjectDetail:
    async with db.transaction_as(principal) as conn:
        return await load_project(conn, project_id)


@router.post(
    "/workspaces/{workspace_id}/projects",
    status_code=http_status.HTTP_201_CREATED,
    summary="Cria um projeto com datas e equipe (editor ou acima)",
    description="Quem conduz (`owner_agent_id`, o Nexo por padrão) entra na equipe sozinho.",
    responses=error_responses(401, 403, 404, 409, 422, 503),
)
async def create_project(
    workspace_id: UUID, payload: ProjectCreate, principal: CurrentPrincipal, db: DatabaseDep
) -> ProjectDetail:
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        row = await (
            await conn.execute(
                CREATE_PROJECT,
                (
                    workspace_id,
                    payload.name,
                    payload.objective,
                    payload.owner_agent_id,
                    payload.starts_at,
                    payload.ends_at,
                    participants_json(payload.participants),
                ),
            )
        ).fetchone()
        return await load_project(conn, row["id"])


@router.patch(
    "/projects/{project_id}",
    summary="Altera nome, objetivo, estado, quem conduz ou as datas (editor ou acima)",
    description="Só os campos enviados mudam; `null` em objective, starts_at e ends_at apaga.",
    responses=error_responses(401, 403, 404, 422, 503),
)
async def update_project(
    project_id: UUID, payload: ProjectUpdate, principal: CurrentPrincipal, db: DatabaseDep
) -> ProjectDetail:
    patch = payload.model_dump(mode="json", exclude_unset=True)
    cleared = [
        field for field in REQUIRED_PROJECT_FIELDS if field in patch and patch[field] is None
    ]
    if cleared:
        raise ApiError(422, "validation_error", f"{cleared[0]} não pode ficar vazio.")
    async with db.transaction_as(principal) as conn:
        await conn.execute(UPDATE_PROJECT, (project_id, Jsonb(patch)))
        return await load_project(conn, project_id)


@router.put(
    "/projects/{project_id}/participants",
    summary="Troca a equipe do projeto (editor ou acima)",
    description="Quem conduz continua na equipe, mesmo fora da lista.",
    responses=error_responses(401, 403, 404, 422, 503),
)
async def set_participants(
    project_id: UUID,
    payload: ProjectParticipantsSet,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> ProjectDetail:
    async with db.transaction_as(principal) as conn:
        await conn.execute(SET_PARTICIPANTS, (project_id, participants_json(payload.participants)))
        return await load_project(conn, project_id)


@router.post(
    "/projects/{project_id}/milestones",
    status_code=http_status.HTTP_201_CREATED,
    summary="Acrescenta um marco ao roadmap do projeto (editor ou acima)",
    responses=error_responses(401, 403, 404, 422, 503),
)
async def add_milestone(
    project_id: UUID, payload: MilestoneCreate, principal: CurrentPrincipal, db: DatabaseDep
) -> ProjectMilestone:
    async with db.transaction_as(principal) as conn:
        row = await (
            await conn.execute(
                ADD_MILESTONE,
                (
                    project_id,
                    payload.title,
                    payload.summary,
                    payload.agent_id,
                    payload.due_at,
                    payload.kind,
                    payload.needs_you,
                    payload.planned,
                ),
            )
        ).fetchone()
        return await load_milestone(conn, row["id"])


@router.patch(
    "/milestones/{milestone_id}",
    summary="Altera um marco; `done: true` conclui, `false` reabre (editor ou acima)",
    responses=error_responses(401, 403, 404, 422, 503),
)
async def update_milestone(
    milestone_id: UUID, payload: MilestoneUpdate, principal: CurrentPrincipal, db: DatabaseDep
) -> ProjectMilestone:
    patch = payload.model_dump(mode="json", exclude_unset=True)
    if "title" in patch and patch["title"] is None:
        raise ApiError(422, "validation_error", "title não pode ficar vazio.")
    async with db.transaction_as(principal) as conn:
        await conn.execute(UPDATE_MILESTONE, (milestone_id, Jsonb(patch)))
        return await load_milestone(conn, milestone_id)


@router.get(
    "/workspaces/{workspace_id}/milestones",
    summary='"Próximos marcos": os de todos os projetos que vencem nos próximos dias',
    responses=error_responses(401, 404, 422, 503),
)
async def upcoming_milestones(
    workspace_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    days: Annotated[
        int, Query(ge=0, le=90, description="Janela a partir de hoje (o protótipo usa 10).")
    ] = 10,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> MilestonePage:
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        rows = await (
            await conn.execute(
                UPCOMING_MILESTONES, {"workspace_id": workspace_id, "days": days, "limit": limit}
            )
        ).fetchall()
    return MilestonePage(items=[ProjectMilestone(**row) for row in rows])
