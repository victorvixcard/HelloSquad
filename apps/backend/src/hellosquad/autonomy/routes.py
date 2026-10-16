"""Runs e eventos de progresso, só leitura: fallback para quem perdeu o Realtime."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.api.pagination import limit_query
from hellosquad.autonomy.schemas import Run, RunEvent, RunEventPage

router = APIRouter(tags=["runs"])

GET_RUN = """
select r.id, r.workspace_id, r.work_item_id, r.conversation_id, r.agent_id::text, r.kind::text,
       r.status::text, r.model, r.prompt_version, r.error, r.created_at, r.started_at,
       r.finished_at, r.updated_at
from public.runs r
where r.id = %s and r.workspace_id in (select app.current_user_workspace_ids())
"""

LIST_EVENTS = """
select e.id, e.run_id, e.seq, e.type, e.payload, e.created_at
from public.run_events e
where e.run_id = %s and e.seq > %s
order by e.seq
limit %s
"""


async def load_run(conn, run_id: UUID) -> dict:
    row = await (await conn.execute(GET_RUN, (run_id,))).fetchone()
    if row is None:
        raise ApiError(404, "not_found", "error.run_not_found")
    return row


@router.get(
    "/runs/{run_id}",
    summary="Um run (estado da execução de um agente)",
    responses=error_responses(401, 404, 422, 503),
)
async def get_run(run_id: UUID, principal: CurrentPrincipal, db: DatabaseDep) -> Run:
    async with db.transaction_as(principal) as conn:
        return Run(**await load_run(conn, run_id))


@router.get(
    "/runs/{run_id}/events",
    summary="Eventos do run depois de `after` (fallback do Realtime)",
    responses=error_responses(401, 404, 422, 503),
)
async def list_run_events(
    run_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    after: Annotated[
        int, Query(ge=0, description="Último `seq` que o cliente já tem (0 = desde o início).")
    ] = 0,
    limit: Annotated[int, limit_query(500)] = 100,
) -> RunEventPage:
    async with db.transaction_as(principal) as conn:
        await load_run(conn, run_id)
        rows = await (await conn.execute(LIST_EVENTS, (run_id, after, limit + 1))).fetchall()
    page = rows[:limit]
    next_after = page[-1]["seq"] if len(rows) > limit else None
    return RunEventPage(items=[RunEvent(**row) for row in page], next_after=next_after)
