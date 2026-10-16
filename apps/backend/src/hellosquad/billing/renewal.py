"""Renovação mensal (scheduler): a assinatura com o período pago vencido só ganha ciclo novo com pagamento
confirmado pelo provedor. Antes de decidir, concilia com o provedor (o webhook pode ter se perdido); sem
confirmação, a assinatura fica past_due e nada é bloqueado (paywall é decisão do dono)."""

import logging
from collections.abc import Mapping
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from typing import Any

from psycopg import AsyncConnection
from psycopg.rows import DictRow

from hellosquad.billing.provider import PaymentProvider, PaymentProviderError, WebhookEvent
from hellosquad.billing.service import apply_event

log = logging.getLogger("hellosquad.billing")

DUE = "select * from app.billing_due_subscriptions(%s, make_interval(mins => %s), %s)"
SETTLE = "select * from app.billing_settle_due_subscription(%s, %s)"


@dataclass
class RenewalReport:
    checked: int = 0
    renewed: int = 0
    past_due: int = 0
    provider_errors: int = 0


async def reconcile_subscription(
    conn: AsyncConnection[DictRow], provider: PaymentProvider, subscription: Mapping[str, Any]
) -> None:
    """Traz do provedor o estado dos ciclos e da assinatura, como eventos de conciliação idempotentes
    (o mesmo estado da mesma cobrança vira o mesmo event_id)."""
    reference = subscription["provider_subscription_id"]
    remote = await provider.get_subscription(reference)
    for payment in await provider.list_subscription_payments(reference):
        if payment.status is None:
            continue
        event = WebhookEvent(
            event_id=f"reconcile:{payment.provider_payment_id}:{payment.status}",
            event_type="reconcile.payment",
            payment=replace(payment, provider_subscription_id=reference),
        )
        await apply_event(conn, provider.name, event)
    if remote.status == "cancelled":
        await apply_event(
            conn,
            provider.name,
            WebhookEvent(
                event_id=f"reconcile:{reference}:cancelled",
                event_type="reconcile.subscription",
                subscription_id=reference,
                subscription_status="cancelled",
            ),
        )


async def renew_due_subscriptions(
    conn: AsyncConnection[DictRow],
    providers: Mapping[str, PaymentProvider],
    *,
    now: datetime | None = None,
    recheck_minutes: int = 60,
    limit: int = 100,
) -> RenewalReport:
    now = now or datetime.now(UTC)
    report = RenewalReport()
    due = await (await conn.execute(DUE, (now, recheck_minutes, limit))).fetchall()
    for subscription in due:
        report.checked += 1
        provider = providers.get(subscription["provider"])
        if provider is not None:
            try:
                await reconcile_subscription(conn, provider, subscription)
            except PaymentProviderError as exc:
                report.provider_errors += 1
                log.warning(
                    "conciliação da assinatura %s com %s falhou: %s",
                    subscription["id"],
                    provider.name,
                    exc.code,
                )
        async with conn.transaction():
            settled = await (await conn.execute(SETTLE, (subscription["id"], now))).fetchone()
        if settled["status"] == "past_due":
            report.past_due += 1
        elif settled["current_period_end"] is not None and settled["current_period_end"] > now:
            report.renewed += 1
    return report
