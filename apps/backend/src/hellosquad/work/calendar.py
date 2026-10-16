"""Calendário editorial do Otto (04.02): leitura do período, com a RLS da pessoa.

Os posts nascem da versão da 04.02 como proposta (`draft`) e entram na pauta (`planned`) quando a
pessoa aprova a versão; cancelados ficam de fora. Escrever no calendário é do worker (a delivery);
publicar e agendar no canal chegam na Fase 3.
"""

from datetime import date, time
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep, ensure_workspace
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.domain import AgentId

router = APIRouter(tags=["work"])

MAX_DAYS = 92

LIST_CALENDAR = """
select p.id, p.scheduled_on, p.scheduled_time, p.channel, p.format, p.theme,
       p.owner_agent_id::text, p.status::text, p.notes, p.work_item_id, p.delivery_version_id
from public.calendar_posts p
where p.workspace_id = %s and p.scheduled_on between %s and %s and p.status <> 'cancelled'
order by p.scheduled_on, p.scheduled_time nulls last, p.id
"""


class CalendarPost(BaseModel):
    id: UUID
    scheduled_on: date
    scheduled_time: time | None
    channel: str = Field(examples=["instagram"], description="Id do canal; o web traduz.")
    format: str = Field(examples=["reels"], description="Id do formato; o web traduz.")
    theme: str = Field(examples=["Bastidores da fermentação longa"])
    owner_agent_id: AgentId = Field(description="Responsável no squad.")
    status: str = Field(
        examples=["planned"],
        description=(
            "`draft` (proposta na versão em revisão), `planned` (pauta aprovada), `scheduled` e "
            "`published` (Fase 3)."
        ),
    )
    notes: str | None
    work_item_id: UUID | None = Field(description="Trabalho da 04.02 que propôs o post.")
    delivery_version_id: UUID | None


class CalendarPage(BaseModel):
    items: list[CalendarPost]


@router.get(
    "/workspaces/{workspace_id}/calendar",
    summary="Calendário editorial no período (propostas e pauta; cancelados ficam de fora)",
    responses=error_responses(401, 404, 422, 503),
)
async def list_calendar(
    workspace_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    start: Annotated[date, Query(alias="from", description="Primeiro dia (AAAA-MM-DD).")],
    end: Annotated[date, Query(alias="to", description="Último dia, até 92 dias depois.")],
) -> CalendarPage:
    if end < start or (end - start).days > MAX_DAYS:
        raise ApiError(422, "invalid_period", "O período vai de 1 a 92 dias, do início ao fim.")
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        found = await (await conn.execute(LIST_CALENDAR, (workspace_id, start, end))).fetchall()
    return CalendarPage(items=[CalendarPost(**row) for row in found])
