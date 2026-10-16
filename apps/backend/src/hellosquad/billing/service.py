"""Abertura de cobrança: cliente, assinatura, recarga e cancelamento, com o papel privilegiado.

Nenhuma rota chama isto ainda: a compra pela web e pelo app é da Fase 4 (decisão do dono de 16/10).
Sem preço em dinheiro cadastrado, nada é aberto no provedor.
"""

from datetime import date, datetime
from typing import Any
from uuid import UUID, uuid4

from psycopg import AsyncConnection
from psycopg.rows import DictRow
from psycopg.types.json import Jsonb

from hellosquad.billing.asaas import BRASILIA
from hellosquad.billing.provider import (
    CardToken,
    CustomerData,
    PaymentMethod,
    PaymentProvider,
    WebhookEvent,
)


class BillingError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


CUSTOMER = "select * from public.billing_customers where workspace_id = %s and provider = %s"
REGISTER_CUSTOMER = "select * from app.billing_register_customer(%s, %s, %s)"
CURRENT_PLAN = """
select v.id as plan_version_id, v.credits, p.name as plan_name, pp.id as plan_price_id, pp.amount
from app.current_plan_version(%s) v
join public.plans p on p.id = v.plan_id
left join lateral (
  select pp.id, pp.amount
  from public.plan_prices pp
  where pp.plan_id = v.plan_id and pp.valid_from <= now()
  order by pp.valid_from desc
  limit 1
) pp on true
where v.id is not null
"""
REGISTER_SUBSCRIPTION = "select * from app.billing_register_subscription(%s, %s, %s, %s, %s, %s)"
CURRENT_PACK = """
select t.* from public.topup_packs t
where t.slug = %s and t.valid_from <= now()
order by t.valid_from desc
limit 1
"""
REGISTER_TOPUP = "select * from app.billing_register_topup(%s, %s, %s, %s, %s, %s, %s)"
SUBSCRIPTION = "select * from public.subscriptions where id = %s"
APPLY_EVENT = "select * from app.billing_apply_event(%s, %s)"


async def apply_event(
    conn: AsyncConnection[DictRow], provider: str, event: WebhookEvent
) -> dict[str, Any]:
    async with conn.transaction():
        cursor = await conn.execute(APPLY_EVENT, (provider, Jsonb(event.as_json())))
        return await cursor.fetchone()


async def ensure_customer(
    conn: AsyncConnection[DictRow],
    provider: PaymentProvider,
    workspace_id: UUID,
    customer: CustomerData,
) -> dict[str, Any]:
    row = await (await conn.execute(CUSTOMER, (workspace_id, provider.name))).fetchone()
    if row is not None:
        return row
    created = await provider.create_customer(customer)
    return await (
        await conn.execute(
            REGISTER_CUSTOMER, (workspace_id, provider.name, created.provider_customer_id)
        )
    ).fetchone()


async def subscribe(
    conn: AsyncConnection[DictRow],
    provider: PaymentProvider,
    *,
    workspace_id: UUID,
    plan_slug: str,
    method: PaymentMethod,
    customer: CustomerData,
    card: CardToken | None = None,
    start: date | None = None,
) -> dict[str, Any]:
    plan = await (await conn.execute(CURRENT_PLAN, (plan_slug,))).fetchone()
    if plan is None:
        raise BillingError("plan_not_found", "Plano não encontrado.")
    if plan["plan_price_id"] is None:
        raise BillingError(
            "price_not_defined", "Este plano ainda não tem preço: nenhuma cobrança é aberta."
        )
    billing_customer = await ensure_customer(conn, provider, workspace_id, customer)
    remote = await provider.create_subscription(
        customer_id=billing_customer["provider_customer_id"],
        payer_email=customer.email,
        amount=plan["amount"],
        method=method,
        description=f"HelloSquad · {plan['plan_name']}",
        reference=str(workspace_id),
        start=start or datetime.now(BRASILIA).date(),
        card=card,
    )
    return await (
        await conn.execute(
            REGISTER_SUBSCRIPTION,
            (
                workspace_id,
                provider.name,
                remote.provider_subscription_id,
                plan["plan_version_id"],
                plan["plan_price_id"],
                method,
            ),
        )
    ).fetchone()


async def buy_topup(
    conn: AsyncConnection[DictRow],
    provider: PaymentProvider,
    *,
    workspace_id: UUID,
    pack_slug: str,
    method: PaymentMethod,
    customer: CustomerData,
    card: CardToken | None = None,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    pack = await (await conn.execute(CURRENT_PACK, (pack_slug,))).fetchone()
    if pack is None:
        raise BillingError("topup_not_found", "Recarga não encontrada.")
    billing_customer = await ensure_customer(conn, provider, workspace_id, customer)
    remote = await provider.charge(
        customer_id=billing_customer["provider_customer_id"],
        payer_email=customer.email,
        amount=pack["amount"],
        method=method,
        description="HelloSquad · recarga de créditos",
        reference=str(workspace_id),
        idempotency_key=idempotency_key or str(uuid4()),
        card=card,
    )
    return await (
        await conn.execute(
            REGISTER_TOPUP,
            (
                workspace_id,
                provider.name,
                remote.provider_payment_id,
                pack["id"],
                method,
                remote.pix_payload,
                remote.pix_expires_at,
            ),
        )
    ).fetchone()


async def cancel_subscription(
    conn: AsyncConnection[DictRow], provider: PaymentProvider, *, subscription_id: UUID
) -> dict[str, Any]:
    subscription = await (await conn.execute(SUBSCRIPTION, (subscription_id,))).fetchone()
    if subscription is None:
        raise BillingError("subscription_not_found", "Assinatura não encontrada.")
    remote = await provider.cancel_subscription(subscription["provider_subscription_id"])
    event = WebhookEvent(
        event_id=f"cancel:{subscription['id']}",
        event_type="subscription.cancel_requested",
        subscription_id=subscription["provider_subscription_id"],
        subscription_status="cancelled" if remote.status == "cancelled" else None,
    )
    await apply_event(conn, provider.name, event)
    return await (await conn.execute(SUBSCRIPTION, (subscription_id,))).fetchone()
