"""Créditos: estimativa antes de pedir. Roda como o usuário do JWT; a RLS limita ao workspace."""

from fastapi import APIRouter

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep, ensure_workspace
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.credits.schemas import CreditEstimate, CreditEstimateRequest

router = APIRouter(tags=["credits"])

# Mesma regra de app.run_credit_estimate (o que o worker reserva): preço vigente da delivery;
# trabalho que já tem versão entregue paga o preço de revisão (nulo = mesmo preço).
ESTIMATE = """
select p.delivery_type, p.depth::text as depth, p.provisional, r.revision,
       case when r.revision then coalesce(p.revision_credits, p.credits) else p.credits end
         as credits,
       (select coalesce(sum(g.remaining - g.reserved), 0)
        from public.credit_grants g
        where g.workspace_id = %(workspace_id)s and g.starts_at <= now()
          and (g.expires_at is null or g.expires_at > now())) as available
from app.current_delivery_price(%(delivery_type)s) p
cross join lateral (
  select exists (
    select 1
    from public.delivery_versions v
    join public.deliveries d on d.id = v.delivery_id and d.workspace_id = v.workspace_id
    where d.workspace_id = %(workspace_id)s and d.work_item_id = %(work_item_id)s
  ) as revision
) r
where p.id is not null
"""

WORK_ITEM = "select 1 from public.work_items where id = %s and workspace_id = %s"


@router.post(
    "/credits/estimate",
    summary="Quanto uma entrega custa em créditos antes de pedir (valores provisórios)",
    responses=error_responses(401, 404, 422, 503),
)
async def estimate_credits(
    payload: CreditEstimateRequest, principal: CurrentPrincipal, db: DatabaseDep
) -> CreditEstimate:
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, payload.workspace_id)
        if payload.work_item_id is not None:
            found = await (
                await conn.execute(WORK_ITEM, (payload.work_item_id, payload.workspace_id))
            ).fetchone()
            if found is None:
                raise ApiError(404, "work_item_not_found", "error.work_item_not_found")
        row = await (
            await conn.execute(
                ESTIMATE,
                {
                    "workspace_id": payload.workspace_id,
                    "delivery_type": payload.delivery_type,
                    "work_item_id": payload.work_item_id,
                },
            )
        ).fetchone()
    if row is None:
        raise ApiError(404, "price_not_found", "error.price_not_found")
    return CreditEstimate(**row, sufficient=row["available"] >= row["credits"])
