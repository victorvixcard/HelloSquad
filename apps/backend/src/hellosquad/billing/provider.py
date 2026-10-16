"""Interface única de provedor de pagamento (ADR-0008) e o modelo que os adaptadores devolvem.

Cada adaptador (Asaas, Mercado Pago, simulado) traduz a API do provedor para estes tipos; o resto do
sistema não conhece formato de provedor. Cartão nunca passa por aqui: só o token que o provedor gerou
no navegador ou no app.
"""

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal, Protocol

ProviderName = Literal["asaas", "mercadopago", "mock"]
PaymentMethod = Literal["card", "pix"]
PaymentStatus = Literal[
    "pending", "confirmed", "overdue", "failed", "refunded", "charged_back", "cancelled"
]
SubscriptionStatus = Literal["pending", "active", "past_due", "cancelled"]

# Estorno parcial não tem regra comercial: o evento fica para conciliação à mão (needs_review).
PARTIAL_REFUND = "partial_refund"


class PaymentProviderError(Exception):
    """Falha ao falar com o provedor. transient: vale tentar de novo (rede, 429, 5xx)."""

    def __init__(
        self, code: str, message: str, *, transient: bool, status_code: int | None = None
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.transient = transient
        self.status_code = status_code


class InvalidWebhookSignature(Exception):
    """Webhook sem assinatura ou com assinatura que não confere: nada é gravado."""


class InvalidWebhookPayload(Exception):
    """Webhook assinado, mas o corpo não tem o formato documentado do provedor."""


@dataclass(frozen=True)
class CustomerData:
    name: str
    email: str
    reference: str
    document: str | None = None


@dataclass(frozen=True)
class CardToken:
    """Token do cartão gerado pelo provedor no cliente. brand: payment_method_id do Mercado Pago."""

    token: str
    brand: str | None = None


@dataclass(frozen=True)
class ProviderCustomer:
    provider_customer_id: str


@dataclass(frozen=True)
class ProviderSubscription:
    provider_subscription_id: str
    status: SubscriptionStatus | None
    next_due_date: date | None = None
    checkout_url: str | None = None


@dataclass(frozen=True)
class ProviderPayment:
    provider_payment_id: str
    status: PaymentStatus | None
    status_detail: str | None = None
    method: PaymentMethod | None = None
    amount: Decimal | None = None
    provider_subscription_id: str | None = None
    pix_payload: str | None = None
    pix_expires_at: datetime | None = None

    def as_event(self) -> dict[str, Any]:
        return {
            "provider_payment_id": self.provider_payment_id,
            "provider_subscription_id": self.provider_subscription_id,
            "status": self.status,
            "status_detail": self.status_detail,
            "method": self.method,
            "amount": str(self.amount) if self.amount is not None else None,
        }


@dataclass(frozen=True)
class WebhookEvent:
    """Evento verificado e interpretado: o formato que app.billing_apply_event recebe."""

    event_id: str
    event_type: str
    occurred_at: datetime | None = None
    payload: dict[str, Any] = field(default_factory=dict)
    payment: ProviderPayment | None = None
    subscription_id: str | None = None
    subscription_status: SubscriptionStatus | None = None

    def as_json(self) -> dict[str, Any]:
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "occurred_at": self.occurred_at.isoformat() if self.occurred_at else None,
            "payload": self.payload,
            "payment": self.payment.as_event() if self.payment else None,
            "subscription": (
                {"provider_subscription_id": self.subscription_id, "status": self.subscription_status}
                if self.subscription_id
                else None
            ),
        }


class PaymentProvider(Protocol):
    name: ProviderName

    async def create_customer(self, customer: CustomerData) -> ProviderCustomer: ...

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
    ) -> ProviderSubscription: ...

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
    ) -> ProviderPayment: ...

    async def cancel_subscription(self, provider_subscription_id: str) -> ProviderSubscription: ...

    async def get_subscription(self, provider_subscription_id: str) -> ProviderSubscription: ...

    async def get_payment(self, provider_payment_id: str) -> ProviderPayment: ...

    async def list_subscription_payments(
        self, provider_subscription_id: str
    ) -> list[ProviderPayment]: ...

    async def parse_webhook(
        self, *, headers: Mapping[str, str], query: Mapping[str, str], body: bytes
    ) -> WebhookEvent:
        """Verifica a assinatura (InvalidWebhookSignature) e interpreta o evento."""
        ...


SENSITIVE_PARTS = (
    "card",
    "cpf",
    "cnpj",
    "document",
    "identification",
    "holder",
    "email",
    "phone",
    "address",
    "postal",
    "token",
    "name",
    "payer",
)
SENSITIVE_KEYS = {"ip", "remoteip", "ip_address"}


def _sensitive(key: str) -> bool:
    lowered = key.lower()
    return lowered in SENSITIVE_KEYS or any(part in lowered for part in SENSITIVE_PARTS)


def scrub(value: Any) -> Any:
    """Cópia do payload sem dado de cartão nem dado pessoal: só ids, estados, valores e datas."""
    if isinstance(value, dict):
        return {key: scrub(item) for key, item in value.items() if not _sensitive(key)}
    if isinstance(value, list):
        return [scrub(item) for item in value]
    return value
