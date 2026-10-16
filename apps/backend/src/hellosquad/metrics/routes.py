"""Séries diárias de métricas por canal (Resultados da Íris), com a RLS da pessoa.

Dia sem linha é dado ausente e volta em `missing_days`, nunca como zero. A origem e a unidade vêm
de cada linha; nesta fase a origem é `fonte_de_teste` (seed); as conexões reais chegam na Fase 3.
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep, ensure_workspace
from hellosquad.api.errors import ApiError, error_responses

router = APIRouter(tags=["metrics"])

MAX_DAYS = 366

LIST_METRICS = """
select channel, metric, day, value, unit, source
from public.metrics_daily
where workspace_id = %s and day between %s and %s
  and (%s::text is null or channel = %s::text) and (%s::text is null or metric = %s::text)
order by channel, metric, day
"""


class MetricPoint(BaseModel):
    day: date
    value: Decimal


class MetricSeries(BaseModel):
    channel: str = Field(examples=["site"], description="Id do canal; o web traduz.")
    metric: str = Field(examples=["sessions"], description="Id da métrica; o web traduz.")
    unit: str = Field(examples=["sessões"])
    sources: list[str] = Field(examples=[["fonte_de_teste"]])
    points: list[MetricPoint]
    missing_days: list[date] = Field(description="Dias do período sem dado (não são zero).")


class MetricsPage(BaseModel):
    start: date
    end: date
    items: list[MetricSeries]


@router.get(
    "/workspaces/{workspace_id}/metrics",
    summary="Métricas diárias por canal no período, com unidade, origem e dias sem dado",
    responses=error_responses(401, 404, 422, 503),
)
async def list_metrics(
    workspace_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    start: Annotated[date, Query(alias="from", description="Primeiro dia (AAAA-MM-DD).")],
    end: Annotated[date, Query(alias="to", description="Último dia, até 366 dias depois.")],
    channel: Annotated[str | None, Query(max_length=40)] = None,
    metric: Annotated[str | None, Query(max_length=40)] = None,
) -> MetricsPage:
    if end < start or (end - start).days > MAX_DAYS:
        raise ApiError(422, "invalid_period", "error.invalid_period", max_days=366)
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        rows = await (
            await conn.execute(
                LIST_METRICS, (workspace_id, start, end, channel, channel, metric, metric)
            )
        ).fetchall()
    grouped: dict[tuple[str, str], list[dict]] = {}
    for row in rows:
        grouped.setdefault((row["channel"], row["metric"]), []).append(row)
    days = [start + timedelta(days=n) for n in range((end - start).days + 1)]
    items = []
    for (channel_id, metric_id), points in grouped.items():
        present = {p["day"] for p in points}
        items.append(
            MetricSeries(
                channel=channel_id,
                metric=metric_id,
                unit=points[0]["unit"],
                sources=sorted({p["source"] for p in points}),
                points=[MetricPoint(day=p["day"], value=p["value"]) for p in points],
                missing_days=[d for d in days if d not in present],
            )
        )
    return MetricsPage(start=start, end=end, items=items)
