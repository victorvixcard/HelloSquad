"""Adaptador Mercado Pago: clientes, assinaturas (preapproval), pagamentos Pix e cartão, webhooks.

Autenticação `Authorization: Bearer`; POST /v1/payments exige `X-Idempotency-Key`. O webhook traz só
o id do recurso: o estado vem de um GET no recurso. A origem é verificada pelo `x-signature`
(HMAC-SHA256 do manifesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` com a assinatura
secreta). Assinatura pela API só com cartão (`card_token_id`). Fontes e datas: relatório da S2e.
"""

import hashlib
import hmac
import json
import time
from collections.abc import Mapping
from dataclasses import replace
from datetime import date, datetime
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

# Cobrança de ciclo da assinatura = authorized_payment (as retentativas são do mesmo ciclo); o id
# guardado leva este prefixo para não se confundir com o id de um pagamento avulso.
AUTHORIZED_PREFIX = "ap:"

# Distância máxima entre o `ts` do x-signature e o relógio local, para trás e para a frente.
SIGNATURE_TOLERANCE_SECONDS = 5 * 60
# A documentação mostra o `ts` em segundos no exemplo e diz milissegundos no texto: a partir de
# 10^11 (1973 em milissegundos, ano 5138 em segundos) o valor é lido como milissegundos.
TS_MILLISECONDS_FROM = 10**11

PAYMENT_STATUS: dict[str, PaymentStatus | None] = {
    "pending": "pending",
    "in_process": "pending",
    "authorized": "pending",
    "approved": "confirmed",
    "rejected": "failed",
    "cancelled": "cancelled",
    "canceled": "cancelled",
    "refunded": "refunded",
    "charged_back": "charged_back",
    "in_mediation": None,
}
PREAPPROVAL_STATUS: dict[str, SubscriptionStatus | None] = {
    "pending": "pending",
    "authorized": "active",
    "paused": None,
    "canceled": "cancelled",
    "cancelled": "cancelled",
}
AUTHORIZED_STATUS: dict[str, PaymentStatus | None] = {
    "scheduled": "pending",
    "recycling": "failed",
    "processed": None,
}


def _date(text: str | None) -> date | None:
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _datetime(text: str | None) -> datetime | None:
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None


def signature_manifest(data_id: str | None, request_id: str | None, ts: str) -> str:
    """Manifesto do x-signature: trecho ausente sai; data.id alfanumérico vai em minúsculas."""
    parts = []
    if data_id:
        parts.append(f"id:{data_id.lower() if data_id.isalnum() else data_id};")
    if request_id:
        parts.append(f"request-id:{request_id};")
    parts.append(f"ts:{ts};")
    return "".join(parts)


def _ts_seconds(ts: str) -> float | None:
    try:
        value = int(ts)
    except ValueError:
        return None
    return value / 1000 if value >= TS_MILLISECONDS_FROM else float(value)


class MercadoPagoProvider:
    name = "mercadopago"

    def __init__(
        self,
        *,
        access_token: str | None,
        base_url: str,
        webhook_secret: str | None,
        back_url: str,
        http: httpx.AsyncClient,
    ) -> None:
        self._access_token = access_token
        self._base_url = base_url.rstrip("/")
        self._webhook_secret = webhook_secret
        self._back_url = back_url
        self._http = http

    async def _request(
        self,
        method: str,
        path: str,
        *,
        body: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        if not self._access_token:
            raise PaymentProviderError(
                "provider_not_configured", "MERCADOPAGO_ACCESS_TOKEN vazio.", transient=False
            )
        headers = {"Authorization": f"Bearer {self._access_token}"}
        if idempotency_key:
            headers["X-Idempotency-Key"] = idempotency_key
        try:
            response = await self._http.request(
                method, f"{self._base_url}{path}", json=body, params=params, headers=headers
            )
        except httpx.TransportError as exc:
            raise PaymentProviderError(
                "provider_unreachable", "Mercado Pago fora do alcance.", transient=True
            ) from exc
        status = response.status_code
        if status == 401:
            raise PaymentProviderError(
                "provider_unauthorized",
                "Token do Mercado Pago recusado.",
                transient=False,
                status_code=401,
            )
        if status == 429 or status >= 500:
            raise PaymentProviderError(
                "provider_unavailable",
                f"Mercado Pago respondeu {status}.",
                transient=True,
                status_code=status,
            )
        if status >= 400:
            data = response.json() if response.content else {}
            cause = (data.get("cause") or [{}])[0] if isinstance(data, dict) else {}
            code = cause.get("code") or data.get("error") or status
            raise PaymentProviderError(
                "provider_not_found" if status == 404 else f"mercadopago_{code}",
                cause.get("description")
                or data.get("message")
                or f"Mercado Pago recusou ({status}).",
                transient=False,
                status_code=status,
            )
        return response.json()

    async def create_customer(self, customer: CustomerData) -> ProviderCustomer:
        body: dict[str, Any] = {
            "email": customer.email,
            "first_name": customer.name,
            "description": customer.reference,
        }
        if customer.document:
            kind = "CNPJ" if len(customer.document) == 14 else "CPF"
            body["identification"] = {"type": kind, "number": customer.document}
        try:
            data = await self._request("POST", "/v1/customers", body=body)
        except PaymentProviderError as exc:
            if exc.code != "mercadopago_101":
                raise
            found = await self._request(
                "GET", "/v1/customers/search", params={"email": customer.email}
            )
            results = found.get("results") or []
            if not results:
                raise
            data = results[0]
        return ProviderCustomer(provider_customer_id=str(data["id"]))

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
        if method != "card":
            raise PaymentProviderError(
                "method_not_supported",
                "Assinatura do Mercado Pago pela API só com cartão.",
                transient=False,
            )
        if card is None:
            raise PaymentProviderError(
                "card_token_required", "Assinatura por cartão exige o token.", transient=False
            )
        data = await self._request(
            "POST",
            "/preapproval",
            body={
                "reason": description,
                "external_reference": reference,
                "payer_email": payer_email,
                "card_token_id": card.token,
                "auto_recurring": {
                    "frequency": 1,
                    "frequency_type": "months",
                    "transaction_amount": float(amount),
                    "currency_id": "BRL",
                    "start_date": f"{start.isoformat()}T00:00:00.000-03:00",
                },
                "back_url": self._back_url,
                "status": "authorized",
            },
        )
        return self._subscription(data)

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
            "transaction_amount": float(amount),
            "description": description,
            "external_reference": reference,
            "payer": {"email": payer_email},
        }
        if method == "pix":
            body["payment_method_id"] = "pix"
        else:
            if card is None or not card.brand:
                raise PaymentProviderError(
                    "card_token_required",
                    "Cobrança por cartão exige o token e a bandeira.",
                    transient=False,
                )
            body.update({"token": card.token, "installments": 1, "payment_method_id": card.brand})
        data = await self._request(
            "POST", "/v1/payments", body=body, idempotency_key=idempotency_key
        )
        return self._payment(data)

    async def cancel_subscription(self, provider_subscription_id: str) -> ProviderSubscription:
        return self._subscription(
            await self._request(
                "PUT", f"/preapproval/{provider_subscription_id}", body={"status": "canceled"}
            )
        )

    async def get_subscription(self, provider_subscription_id: str) -> ProviderSubscription:
        return self._subscription(
            await self._request("GET", f"/preapproval/{provider_subscription_id}")
        )

    async def get_payment(self, provider_payment_id: str) -> ProviderPayment:
        if provider_payment_id.startswith(AUTHORIZED_PREFIX):
            authorized_id = provider_payment_id.removeprefix(AUTHORIZED_PREFIX)
            return self._authorized(
                await self._request("GET", f"/authorized_payments/{authorized_id}")
            )
        return self._payment(await self._request("GET", f"/v1/payments/{provider_payment_id}"))

    async def list_subscription_payments(
        self, provider_subscription_id: str
    ) -> list[ProviderPayment]:
        payments: list[ProviderPayment] = []
        offset = 0
        while True:
            page = await self._request(
                "GET",
                "/authorized_payments/search",
                params={"preapproval_id": provider_subscription_id, "offset": offset, "limit": 50},
            )
            results = page.get("results") or []
            payments.extend(self._authorized(item) for item in results)
            total = (page.get("paging") or {}).get("total", 0)
            offset += len(results)
            if not results or offset >= total:
                return payments

    async def parse_webhook(
        self, *, headers: Mapping[str, str], query: Mapping[str, str], body: bytes
    ) -> WebhookEvent:
        data_id = query.get("data.id")
        request_id = headers.get("x-request-id")
        self._verify(headers.get("x-signature") or "", data_id, request_id)
        try:
            data = json.loads(body)
        except ValueError as exc:
            raise InvalidWebhookPayload("corpo não é JSON") from exc
        if not isinstance(data, dict):
            raise InvalidWebhookPayload("corpo não é objeto")
        topic = data.get("type") or query.get("type")
        body_id = (data.get("data") or {}).get("id")
        # A assinatura cobre o data.id da query, não o corpo: vale o id assinado.
        if data_id and body_id is not None and str(body_id).lower() != data_id.lower():
            raise InvalidWebhookPayload("data.id do corpo diferente do data.id assinado")
        resource_id = data_id or body_id
        if not isinstance(topic, str) or not topic or resource_id is None:
            raise InvalidWebhookPayload("notificação sem tipo ou sem data.id")
        resource_id = str(resource_id)
        action = data.get("action")
        event_type = topic
        if isinstance(action, str) and action:
            event_type = action if action.startswith(topic) else f"{topic}.{action}"
        notification_id = data.get("id")
        event_id = (
            str(notification_id)
            if notification_id is not None
            else f"{topic}:{resource_id}:{request_id}"
        )
        event = WebhookEvent(
            event_id=event_id,
            event_type=event_type,
            occurred_at=_datetime(data.get("date_created")),
            payload=scrub(data),
        )
        try:
            if topic == "payment":
                return replace(event, payment=await self.get_payment(resource_id))
            if topic == "subscription_authorized_payment":
                payment = await self.get_payment(f"{AUTHORIZED_PREFIX}{resource_id}")
                return replace(event, payment=payment)
            if topic == "subscription_preapproval":
                subscription = await self.get_subscription(resource_id)
                return replace(
                    event,
                    subscription_id=subscription.provider_subscription_id,
                    subscription_status="cancelled" if subscription.status == "cancelled" else None,
                )
        except PaymentProviderError as exc:
            if exc.code != "provider_not_found":
                raise
        return event

    def _verify(self, header: str, data_id: str | None, request_id: str | None) -> None:
        """Confere o x-signature: HMAC-SHA256 do manifesto com a assinatura secreta e `ts`
        (segundos ou milissegundos) a no máximo SIGNATURE_TOLERANCE_SECONDS (5 minutos) do relógio
        local, para trás ou para a frente; notificação capturada e reenviada depois é recusada.
        Toda falha levanta InvalidWebhookSignature: 401 e nada gravado."""
        if not self._webhook_secret:
            raise InvalidWebhookSignature("MERCADOPAGO_WEBHOOK_SECRET vazio: webhook recusado.")
        fields = dict(part.strip().split("=", 1) for part in header.split(",") if "=" in part)
        ts, received = fields.get("ts"), fields.get("v1")
        if not ts or not received:
            raise InvalidWebhookSignature("x-signature ausente ou sem ts/v1.")
        expected = hmac.new(
            self._webhook_secret.encode(),
            signature_manifest(data_id, request_id, ts).encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, received):
            raise InvalidWebhookSignature("x-signature não confere.")
        signed_at = _ts_seconds(ts)
        if signed_at is None or abs(time.time() - signed_at) > SIGNATURE_TOLERANCE_SECONDS:
            raise InvalidWebhookSignature("x-signature fora da tolerância de tempo.")

    @staticmethod
    def _subscription(data: dict[str, Any]) -> ProviderSubscription:
        return ProviderSubscription(
            provider_subscription_id=str(data["id"]),
            status=PREAPPROVAL_STATUS.get(data.get("status") or ""),
            next_due_date=_date(data.get("next_payment_date")),
            checkout_url=data.get("init_point"),
        )

    @staticmethod
    def _payment(data: dict[str, Any]) -> ProviderPayment:
        transaction = (data.get("point_of_interaction") or {}).get("transaction_data") or {}
        detail = data.get("status_detail")
        status = PAYMENT_STATUS.get(data.get("status") or "")
        if detail == "partially_refunded":
            status, detail = "refunded", PARTIAL_REFUND
        amount = data.get("transaction_amount")
        return ProviderPayment(
            provider_payment_id=str(data["id"]),
            status=status,
            status_detail=detail,
            method="pix" if data.get("payment_method_id") == "pix" else "card",
            amount=Decimal(str(amount)) if amount is not None else None,
            pix_payload=transaction.get("qr_code"),
            pix_expires_at=_datetime(data.get("date_of_expiration")),
        )

    @staticmethod
    def _authorized(data: dict[str, Any]) -> ProviderPayment:
        payment = data.get("payment") or {}
        raw = data.get("status") or ""
        if raw in ("canceled", "cancelled"):
            status: PaymentStatus | None = "cancelled"
        elif payment.get("status"):
            status = PAYMENT_STATUS.get(payment["status"])
        else:
            status = AUTHORIZED_STATUS.get(raw)
        amount = data.get("transaction_amount")
        return ProviderPayment(
            provider_payment_id=f"{AUTHORIZED_PREFIX}{data['id']}",
            status=status,
            status_detail=payment.get("status_detail") or raw or None,
            method="card",
            amount=Decimal(str(amount)) if amount is not None else None,
            provider_subscription_id=data.get("preapproval_id"),
            due_date=_date(data.get("debit_date")),
        )
