"""Provedor simulado (só local e testes): ids fictícios, Pix fictício e webhook assinado.

O webhook do simulado chega com `x-mock-signature: sha256=<HMAC-SHA256 do corpo>` usando
PAYMENT_MOCK_WEBHOOK_SECRET, e o corpo já traz os estados do domínio (pending, confirmed...).
É o que o roteiro de `docs/SETUP_LOCAL.md` usa para simular um pagamento sem conta em provedor.
"""

import hashlib
import hmac
import json
from collections.abc import Mapping
from datetime import date, datetime
from decimal import Decimal
from typing import Any, get_args
from uuid import uuid4

from hellosquad.billing.provider import (
    CardToken,
    CustomerData,
    InvalidWebhookPayload,
    InvalidWebhookSignature,
    PaymentMethod,
    PaymentStatus,
    ProviderCustomer,
    ProviderPayment,
    ProviderSubscription,
    SubscriptionStatus,
    WebhookEvent,
    scrub,
)


def mock_signature(secret: str, body: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def _choice(value: Any, allowed: tuple[str, ...]) -> Any:
    return value if value in allowed else None


class MockProvider:
    name = "mock"

    def __init__(self, *, webhook_secret: str | None) -> None:
        self._webhook_secret = webhook_secret

    async def create_customer(self, customer: CustomerData) -> ProviderCustomer:
        return ProviderCustomer(provider_customer_id=f"mock_cus_{uuid4().hex[:16]}")

    async def create_subscription(
        self,
        *,
        customer_id: str,
        payer_email: str,
        amount: Decimal,
        method: PaymentMethod,
        description: str,
        reference: str,
        start: date,
        card: CardToken | None = None,
    ) -> ProviderSubscription:
        return ProviderSubscription(
            provider_subscription_id=f"mock_sub_{uuid4().hex[:16]}",
            status="active",
            next_due_date=start,
        )

    async def charge(
        self,
        *,
        customer_id: str,
        payer_email: str,
        amount: Decimal,
        method: PaymentMethod,
        description: str,
        reference: str,
        idempotency_key: str,
        card: CardToken | None = None,
    ) -> ProviderPayment:
        payment_id = f"mock_pay_{uuid4().hex[:16]}"
        return ProviderPayment(
            provider_payment_id=payment_id,
            status="pending",
            status_detail="mock_pending",
            method=method,
            amount=amount,
            pix_payload=f"PIX-SIMULADO-{payment_id}" if method == "pix" else None,
        )

    async def cancel_subscription(self, provider_subscription_id: str) -> ProviderSubscription:
        return ProviderSubscription(
            provider_subscription_id=provider_subscription_id, status="cancelled"
        )

    async def get_subscription(self, provider_subscription_id: str) -> ProviderSubscription:
        return ProviderSubscription(provider_subscription_id=provider_subscription_id, status=None)

    async def get_payment(self, provider_payment_id: str) -> ProviderPayment:
        return ProviderPayment(provider_payment_id=provider_payment_id, status=None)

    async def list_subscription_payments(
        self, provider_subscription_id: str
    ) -> list[ProviderPayment]:
        return []

    async def parse_webhook(
        self, *, headers: Mapping[str, str], query: Mapping[str, str], body: bytes
    ) -> WebhookEvent:
        received = headers.get("x-mock-signature") or ""
        if not self._webhook_secret or not hmac.compare_digest(
            received, mock_signature(self._webhook_secret, body)
        ):
            raise InvalidWebhookSignature("x-mock-signature ausente ou diferente.")
        try:
            data = json.loads(body)
        except ValueError as exc:
            raise InvalidWebhookPayload("corpo não é JSON") from exc
        if not isinstance(data, dict) or not data.get("id") or not data.get("type"):
            raise InvalidWebhookPayload("evento sem id ou sem tipo")
        payment = data.get("payment") if isinstance(data.get("payment"), dict) else None
        subscription = (
            data.get("subscription") if isinstance(data.get("subscription"), dict) else None
        )
        return WebhookEvent(
            event_id=str(data["id"]),
            event_type=str(data["type"]),
            occurred_at=datetime.fromisoformat(data["date"]) if data.get("date") else None,
            payload=scrub(data),
            payment=(
                ProviderPayment(
                    provider_payment_id=str(payment["id"]),
                    status=_choice(payment.get("status"), get_args(PaymentStatus)),
                    status_detail=payment.get("status_detail"),
                    method=_choice(payment.get("method"), get_args(PaymentMethod)),
                    amount=Decimal(str(payment["amount"])) if payment.get("amount") else None,
                    provider_subscription_id=payment.get("subscription"),
                    due_date=date.fromisoformat(payment["due_date"])
                    if payment.get("due_date")
                    else None,
                )
                if payment and payment.get("id")
                else None
            ),
            subscription_id=str(subscription["id"])
            if subscription and subscription.get("id")
            else None,
            subscription_status=(
                _choice(subscription.get("status"), get_args(SubscriptionStatus))
                if subscription
                else None
            ),
        )
