"""Adaptador Asaas (API v3): clientes, assinaturas, cobranças avulsas, Pix e webhooks.

Autenticação pelo cabeçalho `access_token`; o webhook chega com o cabeçalho `asaas-access-token`
igual ao token cadastrado no webhook (o Asaas não assina o corpo). Fontes e datas: relatório da S2e.
"""

import hmac
import json
from collections.abc import Mapping
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

import httpx

from hellosquad.billing.provider import (
    PARTIAL_REFUND,
    CardToken,
    CustomerData,
    InvalidWebhookPayload,
    InvalidWebhookSignature,
    PaymentMethod,
    PaymentProviderError,
    PaymentStatus,
    ProviderCustomer,
    ProviderPayment,
    ProviderSubscription,
    SubscriptionStatus,
    WebhookEvent,
    scrub,
)

# O Asaas grava datas no horário de Brasília, sem fuso no texto.
BRASILIA = timezone(timedelta(hours=-3))

PAYMENT_STATUS: dict[str, PaymentStatus | None] = {
    "PENDING": "pending",
    "AWAITING_RISK_ANALYSIS": "pending",
    "CONFIRMED": "confirmed",
    "RECEIVED": "confirmed",
    "RECEIVED_IN_CASH": "confirmed",
    "DUNNING_RECEIVED": "confirmed",
    "OVERDUE": "overdue",
    "DUNNING_REQUESTED": "overdue",
    "REFUNDED": "refunded",
    "REFUND_REQUESTED": None,
    "REFUND_IN_PROGRESS": None,
    "CHARGEBACK_REQUESTED": "charged_back",
    "CHARGEBACK_DISPUTE": "charged_back",
    "AWAITING_CHARGEBACK_REVERSAL": "charged_back",
}
# Eventos que dizem mais do que o status da cobrança que vem no corpo.
EVENT_STATUS: dict[str, PaymentStatus] = {
    "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED": "failed",
    "PAYMENT_REPROVED_BY_RISK_ANALYSIS": "failed",
    "PAYMENT_DELETED": "cancelled",
    "PAYMENT_RESTORED": "pending",
    "PAYMENT_REFUNDED": "refunded",
    "PAYMENT_PARTIALLY_REFUNDED": "refunded",
}
SUBSCRIPTION_CANCEL_EVENTS = {"SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED"}
SUBSCRIPTION_STATUS: dict[str, SubscriptionStatus] = {
    "ACTIVE": "active",
    "INACTIVE": "cancelled",
    "EXPIRED": "cancelled",
}
BILLING_TYPE: dict[PaymentMethod, str] = {"pix": "PIX", "card": "CREDIT_CARD"}
METHOD: dict[str, PaymentMethod] = {"PIX": "pix", "CREDIT_CARD": "card", "DEBIT_CARD": "card"}


def _brasilia(text: str | None) -> datetime | None:
    if not text:
        return None
    try:
        return datetime.fromisoformat(text).replace(tzinfo=BRASILIA)
    except ValueError:
        return None


class AsaasProvider:
    name = "asaas"

    def __init__(
        self,
        *,
        api_key: str | None,
        base_url: str,
        webhook_token: str | None,
        http: httpx.AsyncClient,
        user_agent: str = "hellosquad",
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._webhook_token = webhook_token
        self._http = http
        self._user_agent = user_agent

    async def _request(
        self,
        method: str,
        path: str,
        *,
        body: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not self._api_key:
            raise PaymentProviderError(
                "provider_not_configured", "ASAAS_API_KEY vazio.", transient=False
            )
        try:
            response = await self._http.request(
                method,
                f"{self._base_url}{path}",
                json=body,
                params=params,
                headers={"access_token": self._api_key, "User-Agent": self._user_agent},
            )
        except httpx.TransportError as exc:
            raise PaymentProviderError(
                "provider_unreachable", "Asaas fora do alcance.", transient=True
            ) from exc
        status = response.status_code
        if status == 401:
            raise PaymentProviderError(
                "provider_unauthorized",
                "Chave do Asaas recusada.",
                transient=False,
                status_code=401,
            )
        if status == 429 or status >= 500:
            raise PaymentProviderError(
                "provider_unavailable",
                f"Asaas respondeu {status}.",
                transient=True,
                status_code=status,
            )
        if status == 404:
            raise PaymentProviderError(
                "provider_not_found",
                "Recurso não encontrado no Asaas.",
                transient=False,
                status_code=404,
            )
        if status >= 400:
            errors = (response.json() or {}).get("errors") or [{}]
            raise PaymentProviderError(
                f"asaas_{errors[0].get('code') or 'error'}",
                errors[0].get("description") or f"Asaas recusou ({status}).",
                transient=False,
                status_code=status,
            )
        return response.json()

    async def create_customer(self, customer: CustomerData) -> ProviderCustomer:
        data = await self._request(
            "POST",
            "/customers",
            body={
                "name": customer.name,
                "email": customer.email,
                "cpfCnpj": customer.document,
                "externalReference": customer.reference,
                "notificationDisabled": True,
            },
        )
        return ProviderCustomer(provider_customer_id=data["id"])

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
        body: dict[str, Any] = {
            "customer": customer_id,
            "billingType": BILLING_TYPE[method],
            "value": float(amount),
            "nextDueDate": start.isoformat(),
            "cycle": "MONTHLY",
            "description": description,
            "externalReference": reference,
        }
        body.update(self._card(method, card))
        return self._subscription(await self._request("POST", "/subscriptions", body=body))

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
        body: dict[str, Any] = {
            "customer": customer_id,
            "billingType": BILLING_TYPE[method],
            "value": float(amount),
            "dueDate": datetime.now(BRASILIA).date().isoformat(),
            "description": description,
            "externalReference": reference,
        }
        body.update(self._card(method, card))
        payment = self._payment(await self._request("POST", "/payments", body=body))
        if method != "pix":
            return payment
        qr = await self._request("GET", f"/payments/{payment.provider_payment_id}/pixQrCode")
        return ProviderPayment(
            provider_payment_id=payment.provider_payment_id,
            status=payment.status,
            status_detail=payment.status_detail,
            method=payment.method,
            amount=payment.amount,
            pix_payload=qr.get("payload"),
            pix_expires_at=_brasilia(qr.get("expirationDate")),
        )

    async def cancel_subscription(self, provider_subscription_id: str) -> ProviderSubscription:
        data = await self._request("DELETE", f"/subscriptions/{provider_subscription_id}")
        return ProviderSubscription(
            provider_subscription_id=data.get("id") or provider_subscription_id,
            status="cancelled" if data.get("deleted") else None,
        )

    async def get_subscription(self, provider_subscription_id: str) -> ProviderSubscription:
        return self._subscription(
            await self._request("GET", f"/subscriptions/{provider_subscription_id}")
        )

    async def get_payment(self, provider_payment_id: str) -> ProviderPayment:
        return self._payment(await self._request("GET", f"/payments/{provider_payment_id}"))

    async def list_subscription_payments(
        self, provider_subscription_id: str
    ) -> list[ProviderPayment]:
        payments: list[ProviderPayment] = []
        offset = 0
        while True:
            page = await self._request(
                "GET",
                f"/subscriptions/{provider_subscription_id}/payments",
                params={"offset": offset, "limit": 100},
            )
            data = page.get("data") or []
            payments.extend(self._payment(item) for item in data)
            if not page.get("hasMore") or not data:
                return payments
            offset += len(data)

    async def parse_webhook(
        self, *, headers: Mapping[str, str], query: Mapping[str, str], body: bytes
    ) -> WebhookEvent:
        token = headers.get("asaas-access-token") or ""
        if not self._webhook_token or not hmac.compare_digest(
            token.encode(), self._webhook_token.encode()
        ):
            raise InvalidWebhookSignature("asaas-access-token ausente ou diferente do cadastrado.")
        try:
            data = json.loads(body)
        except ValueError as exc:
            raise InvalidWebhookPayload("corpo não é JSON") from exc
        if not isinstance(data, dict) or not isinstance(data.get("id"), str):
            raise InvalidWebhookPayload("evento sem id")
        event = data.get("event")
        if not isinstance(event, str) or not event:
            raise InvalidWebhookPayload("evento sem tipo")
        payment = data.get("payment")
        subscription = data.get("subscription")
        subscription_id = subscription.get("id") if isinstance(subscription, dict) else None
        return WebhookEvent(
            event_id=data["id"],
            event_type=event,
            occurred_at=_brasilia(data.get("dateCreated")),
            payload=scrub(data),
            payment=self._payment(payment, event) if isinstance(payment, dict) else None,
            subscription_id=subscription_id,
            subscription_status="cancelled" if event in SUBSCRIPTION_CANCEL_EVENTS else None,
        )

    @staticmethod
    def _card(method: PaymentMethod, card: CardToken | None) -> dict[str, Any]:
        if method != "card":
            return {}
        if card is None:
            raise PaymentProviderError(
                "card_token_required", "Cobrança por cartão exige o token.", transient=False
            )
        extra: dict[str, Any] = {"creditCardToken": card.token}
        if card.remote_ip:
            extra["remoteIp"] = card.remote_ip
        return extra

    @staticmethod
    def _subscription(data: dict[str, Any]) -> ProviderSubscription:
        status = "cancelled" if data.get("deleted") else SUBSCRIPTION_STATUS.get(data.get("status"))
        next_due = data.get("nextDueDate")
        return ProviderSubscription(
            provider_subscription_id=data["id"],
            status=status,
            next_due_date=date.fromisoformat(next_due) if next_due else None,
        )

    @staticmethod
    def _payment(data: dict[str, Any], event: str | None = None) -> ProviderPayment:
        raw = data.get("status")
        status = EVENT_STATUS.get(event or "") or PAYMENT_STATUS.get(raw)
        if event == "PAYMENT_PARTIALLY_REFUNDED":
            raw = PARTIAL_REFUND
        value = data.get("value")
        due = data.get("dueDate")
        return ProviderPayment(
            provider_payment_id=data["id"],
            status=status,
            status_detail=raw,
            method=METHOD.get(data.get("billingType")),
            amount=Decimal(str(value)) if value is not None else None,
            provider_subscription_id=data.get("subscription"),
            due_date=date.fromisoformat(due) if due else None,
        )
