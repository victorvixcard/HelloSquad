"""Decisões pedidas ao usuário. A decisão passa por app.decide_approval (idempotente)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query
from psycopg import AsyncConnection
from psycopg.rows import DictRow

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep, ensure_workspace
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.api.pagination import CursorQuery, decode_cursor, limit_query, split_page
from hellosquad.approvals.schemas import (
    Approval,
    ApprovalDecisionCreate,
    ApprovalDefer,
    ApprovalPage,
    ApprovalWorkItem,
)
from hellosquad.autonomy.responsibilities import after_decision
from hellosquad.domain import ApprovalStatus

router = APIRouter(tags=["approvals"])

APPROVAL_SELECT = """
select a.id, a.workspace_id, a.kind::text, a.status::text, a.decision::text, a.follow_up,
       a.requested_by_agent_id::text, a.delivery_version_id, v.version_no as delivery_version_no,
       a.run_id, a.decided_by, a.decided_at, a.note, a.due_at, a.created_at, a.updated_at,
       app.approval_is_deferred(a) as deferred, a.deferred_at, a.deferred_until,
       w.id as work_item_id, w.title as work_item_title, w.status::text as work_item_status,
       w.delivery_type as work_item_delivery_type,
       w.primary_agent_id::text as work_item_primary_agent_id
from public.approvals a
join public.work_items w on w.id = a.work_item_id
left join public.delivery_versions v on v.id = a.delivery_version_id
"""

LIST_APPROVALS = f"""
{APPROVAL_SELECT}
where a.workspace_id = %(workspace_id)s
  and (%(status)s::public.approval_status is null or a.status = %(status)s::public.approval_status)
  and (%(include_deferred)s or not app.approval_is_deferred(a))
  and (%(cursor_at)s::timestamptz is null
       or (a.created_at, a.id) > (%(cursor_at)s, %(cursor_id)s::uuid))
order by a.created_at, a.id
limit %(limit)s
"""

GET_APPROVAL = f"""
{APPROVAL_SELECT}
where a.id = %s and a.workspace_id in (select app.current_user_workspace_ids())
"""

DECIDE_APPROVAL = "select id from app.decide_approval(%s, %s::public.approval_decision, %s, %s)"
DEFER_APPROVAL = "select id from app.defer_approval(%s, %s)"
RESUME_APPROVAL = "select id from app.resume_approval(%s)"


def approval_from_row(row: dict) -> Approval:
    return Approval(
        **row,
        work_item=ApprovalWorkItem(
            id=row["work_item_id"],
            title=row["work_item_title"],
            status=row["work_item_status"],
            delivery_type=row["work_item_delivery_type"],
            primary_agent_id=row["work_item_primary_agent_id"],
        ),
    )


async def load_approval(conn: AsyncConnection[DictRow], approval_id: UUID) -> Approval:
    row = await (await conn.execute(GET_APPROVAL, (approval_id,))).fetchone()
    if row is None:
        raise ApiError(404, "not_found", "error.approval_not_found")
    return approval_from_row(row)


@router.get(
    "/workspaces/{workspace_id}/approvals",
    summary='Decisões do workspace; `status=pending` é a faixa "Precisa de você"',
    responses=error_responses(401, 404, 422, 503),
)
async def list_approvals(
    workspace_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    status: Annotated[
        ApprovalStatus | None, Query(description="Filtra pelo estado da decisão.")
    ] = None,
    include_deferred: Annotated[
        bool,
        Query(description='Inclui as autorizações adiadas ("Agora não"); por padrão ficam fora.'),
    ] = False,
    cursor: CursorQuery = None,
    limit: Annotated[int, limit_query(100)] = 50,
) -> ApprovalPage:
    cursor_at, cursor_id = decode_cursor(cursor)
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        params = {
            "workspace_id": workspace_id,
            "status": status,
            "include_deferred": include_deferred,
            "cursor_at": cursor_at,
            "cursor_id": cursor_id,
            "limit": limit + 1,
        }
        rows = await (await conn.execute(LIST_APPROVALS, params)).fetchall()
    page, next_cursor = split_page(rows, limit, "created_at")
    return ApprovalPage(items=[approval_from_row(row) for row in page], next_cursor=next_cursor)


@router.post(
    "/approvals/{approval_id}/decision",
    summary="Decide uma aprovação (idempotente: repetir devolve o estado atual)",
    description=(
        "A primeira decisão vale; repetir (clique duplo, retry) responde 200 com o mesmo estado, "
        "sem erro e sem efeito novo. Revisar/aprovar com `approved` aprova a versão e o trabalho; "
        "`changes_requested` e `rejected` com `follow_up=revise` devolvem o trabalho ao agente "
        "(novo run na fila); `rejected` com `follow_up=cancel` cancela o trabalho; `answered` "
        "(responder) devolve ao agente com a resposta. Só o owner decide."
    ),
    responses=error_responses(401, 403, 404, 409, 422, 503),
)
async def decide_approval(
    approval_id: UUID,
    payload: ApprovalDecisionCreate,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> Approval:
    async with db.transaction_as(principal) as conn:
        await conn.execute(
            DECIDE_APPROVAL, (approval_id, payload.decision, payload.note, payload.follow_up)
        )
        await after_decision(conn, approval_id)
        return await load_approval(conn, approval_id)


@router.post(
    "/approvals/{approval_id}/defer",
    summary='"Agora não": adia a autorização sem decidir nem rejeitar (só o owner)',
    description=(
        'A autorização continua pendente, sem decisão, e sai de "Precisa de você"; o trabalho não '
        "muda de estado, nenhum run nasce e nada é cobrado. Repetir devolve o mesmo estado. Só "
        "para `authorize`; decidida responde 409."
    ),
    responses=error_responses(401, 403, 404, 409, 422, 503),
)
async def defer_approval(
    approval_id: UUID,
    payload: ApprovalDefer,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> Approval:
    async with db.transaction_as(principal) as conn:
        await conn.execute(DEFER_APPROVAL, (approval_id, payload.until))
        return await load_approval(conn, approval_id)


@router.post(
    "/approvals/{approval_id}/resume",
    summary='"Decidir agora": a autorização adiada volta a pedir a decisão (só o owner)',
    description='Volta para "Precisa de você". Sem adiamento, devolve o estado atual.',
    responses=error_responses(401, 403, 404, 409, 422, 503),
)
async def resume_approval(
    approval_id: UUID, principal: CurrentPrincipal, db: DatabaseDep
) -> Approval:
    async with db.transaction_as(principal) as conn:
        await conn.execute(RESUME_APPROVAL, (approval_id,))
        return await load_approval(conn, approval_id)
