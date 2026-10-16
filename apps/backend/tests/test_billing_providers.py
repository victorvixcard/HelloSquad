"""S2e: adaptadores Asaas e Mercado Pago contra os servidores falsos (billing_fakes), verificação do
webhook de cada um, simulado e escolha do provedor pelo `.env`. Sem banco."""

import json
from collections.abc import AsyncIterator
from datetime import date
from decimal import Decimal

import httpx
import pytest

from billing_fakes import (
    APPROVED_CARD,
    ASAAS_KEY,
    ASAAS_WEBHOOK_TOKEN,
    DECLINED_CARD,
    MP_TOKEN,
    MP_WEBHOOK_SECRET,
    FakeAsaas,
    FakeMercadoPago,
    fake_app,
)
from hellosquad.billing.asaas import AsaasProvider
from hellosquad.billing.factory import active_provider, configured_providers
from hellosquad.billing.mercadopago import MercadoPagoProvider
from hellosquad.billing.mock import MockProvider, mock_signature
from hellosquad.billing.provider import (
    CardToken,
    CustomerData,
    InvalidWebhookSignature,
    PaymentProviderError,
    scrub,
)
from hellosquad.config import Settings

# Documento fictício de propósito: só zeros não é CPF de ninguém (docs/DADOS_FICTICIOS.md).
CUSTOMER = CustomerData(
    name="Miolo Padaria", email="marina@miolo.example", reference="ws-1", document="00000000000"
)
CARD = CardToken(token=APPROVED_CARD, brand="master", remote_ip="203.0.113.10")


@pytest.fixture
def fakes() -> tuple[FakeAsaas, FakeMercadoPago]:
    return FakeAsaas(), FakeMercadoPago()


@pytest.fixture
async def http(fakes) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=fake_app(*fakes))
    async with httpx.AsyncClient(transport=transport) as client:
        yield client


def asaas(http: httpx.AsyncClient, key: str = ASAAS_KEY) -> AsaasProvider:
    return AsaasProvider(
        api_key=key,
        base_url="http://asaas.test/v3",
        webhook_token=ASAAS_WEBHOOK_TOKEN,
        http=http,
    )


def mercadopago(http: httpx.AsyncClient, token: str = MP_TOKEN) -> MercadoPagoProvider:
    return MercadoPagoProvider(
        access_token=token,
        base_url="http://mercadopago.test",
        webhook_secret=MP_WEBHOOK_SECRET,
        back_url="http://127.0.0.1:3100",
        http=http,
    )


async def test_asaas_subscription_pix_and_card_topup(fakes, http) -> None:
    fake_asaas, _ = fakes
    provider = asaas(http)
    customer = await provider.create_customer(CUSTOMER)
    assert customer.provider_customer_id.startswith("cus_")

    subscription = await provider.create_subscription(
        customer_id=customer.provider_customer_id,
        payer_email=CUSTOMER.email,
        amount=Decimal("99.00"),
        method="pix",
        description="HelloSquad · Squad",
        reference="ws-1",
        start=date(2026, 10, 16),
    )
    assert subscription.provider_subscription_id.startswith("sub_")
    assert subscription.status == "active"
    [cycle] = await provider.list_subscription_payments(subscription.provider_subscription_id)
    assert (cycle.status, cycle.method, cycle.due_date) == ("pending", "pix", date(2026, 10, 16))
    assert cycle.provider_subscription_id == subscription.provider_subscription_id

    pix = await provider.charge(
        customer_id=customer.provider_customer_id,
        payer_email=CUSTOMER.email,
        amount=Decimal("49.00"),
        method="pix",
        description="recarga",
        reference="ws-1",
        idempotency_key="k1",
    )
    assert pix.status == "pending" and pix.pix_payload.startswith("000201")
    assert pix.pix_expires_at is not None

    card = await provider.charge(
        customer_id=customer.provider_customer_id,
        payer_email=CUSTOMER.email,
        amount=Decimal("49.00"),
        method="card",
        description="recarga",
        reference="ws-1",
        idempotency_key="k2",
        card=CARD,
    )
    assert (card.status, card.method) == ("confirmed", "card")
    assert all(request["user_agent"] for request in fake_asaas.requests)

    cancelled = await provider.cancel_subscription(subscription.provider_subscription_id)
    assert cancelled.status == "cancelled"
    assert (await provider.get_subscription(subscription.provider_subscription_id)).status == (
        "cancelled"
    )


async def test_asaas_errors_follow_the_documented_envelope(http) -> None:
    with pytest.raises(PaymentProviderError) as wrong_key:
        await asaas(http, key="$aact_hmlg_outra").create_customer(CUSTOMER)
    assert (wrong_key.value.code, wrong_key.value.transient) == ("provider_unauthorized", False)

    provider = asaas(http)
    with pytest.raises(PaymentProviderError) as no_document:
        await provider.create_customer(
            CustomerData(name="Sem documento", email="x@vitta.example", reference="ws-2")
        )
    assert no_document.value.code == "asaas_invalid_cpfCnpj"

    customer = await provider.create_customer(CUSTOMER)
    with pytest.raises(PaymentProviderError) as no_ip:
        await provider.charge(
            customer_id=customer.provider_customer_id,
            payer_email=CUSTOMER.email,
            amount=Decimal("49"),
            method="card",
            description="recarga",
            reference="ws-1",
            idempotency_key="k3",
            card=CardToken(token=APPROVED_CARD),
        )
    assert no_ip.value.code == "asaas_invalid_remoteIp"
    with pytest.raises(PaymentProviderError) as declined:
        await provider.charge(
            customer_id=customer.provider_customer_id,
            payer_email=CUSTOMER.email,
            amount=Decimal("49"),
            method="card",
            description="recarga",
            reference="ws-1",
            idempotency_key="k4",
            card=CardToken(token=DECLINED_CARD, remote_ip="203.0.113.10"),
        )
    assert declined.value.code == "asaas_invalid_creditCard"
    with pytest.raises(PaymentProviderError) as missing:
        await provider.get_payment("pay_inexistente")
    assert missing.value.code == "provider_not_found"


async def test_asaas_webhook_needs_the_registered_token(fakes, http) -> None:
    fake_asaas, _ = fakes
    provider = asaas(http)
    customer = await provider.create_customer(CUSTOMER)
    payment = await provider.charge(
        customer_id=customer.provider_customer_id,
        payer_email=CUSTOMER.email,
        amount=Decimal("49"),
        method="pix",
        description="recarga",
        reference="ws-1",
        idempotency_key="k5",
    )
    fake_asaas.set_status(payment.provider_payment_id, "RECEIVED")
    headers, body = fake_asaas.webhook("PAYMENT_RECEIVED", payment_id=payment.provider_payment_id)
    event = await provider.parse_webhook(headers=headers, query={}, body=body)
    assert event.event_id == json.loads(body)["id"]
    assert event.event_type == "PAYMENT_RECEIVED"
    assert (event.payment.status, event.payment.method) == ("confirmed", "pix")
    assert "creditCard" not in json.dumps(event.payload)

    for token in ("token-errado-de-proposito-000000000", None):
        bad_headers, bad_body = fake_asaas.webhook(
            "PAYMENT_RECEIVED", payment_id=payment.provider_payment_id, token=token
        )
        with pytest.raises(InvalidWebhookSignature):
            await provider.parse_webhook(headers=bad_headers, query={}, body=bad_body)
    without_secret = AsaasProvider(
        api_key=ASAAS_KEY, base_url="http://asaas.test/v3", webhook_token=None, http=http
    )
    with pytest.raises(InvalidWebhookSignature):
        await without_secret.parse_webhook(headers=headers, query={}, body=body)


async def test_asaas_refused_card_and_partial_refund_events(fakes, http) -> None:
    fake_asaas, _ = fakes
    provider = asaas(http)
    customer = await provider.create_customer(CUSTOMER)
    payment = await provider.charge(
        customer_id=customer.provider_customer_id,
        payer_email=CUSTOMER.email,
        amount=Decimal("49"),
        method="pix",
        description="recarga",
        reference="ws-1",
        idempotency_key="k6",
    )
    headers, body = fake_asaas.webhook(
        "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED", payment_id=payment.provider_payment_id
    )
    refused = await provider.parse_webhook(headers=headers, query={}, body=body)
    assert refused.payment.status == "failed"
    headers, body = fake_asaas.webhook(
        "PAYMENT_PARTIALLY_REFUNDED", payment_id=payment.provider_payment_id
    )
    partial = await provider.parse_webhook(headers=headers, query={}, body=body)
    assert (partial.payment.status, partial.payment.status_detail) == ("refunded", "partial_refund")


async def test_mercadopago_customer_payments_and_idempotency(fakes, http) -> None:
    _, fake_mp = fakes
    provider = mercadopago(http)
    first = await provider.create_customer(CUSTOMER)
    again = await provider.create_customer(CUSTOMER)
    assert first.provider_customer_id == again.provider_customer_id

    pix = await provider.charge(
        customer_id=first.provider_customer_id,
        payer_email=CUSTOMER.email,
        amount=Decimal("49.00"),
        method="pix",
        description="recarga",
        reference="ws-1",
        idempotency_key="pix-1",
    )
    assert (pix.status, pix.status_detail, pix.method) == (
        "pending",
        "pending_waiting_transfer",
        "pix",
    )
    assert pix.pix_payload.startswith("000201") and pix.pix_expires_at is not None
    repeated = await provider.charge(
        customer_id=first.provider_customer_id,
        payer_email=CUSTOMER.email,
        amount=Decimal("49.00"),
        method="pix",
        description="recarga",
        reference="ws-1",
        idempotency_key="pix-1",
    )
    assert repeated.provider_payment_id == pix.provider_payment_id
    assert len(fake_mp.payments) == 1

    raw = await http.post(
        "http://mercadopago.test/v1/payments",
        headers={"Authorization": f"Bearer {MP_TOKEN}"},
        json={
            "transaction_amount": 49,
            "payment_method_id": "pix",
            "payer": {"email": "a@b.example"},
        },
    )
    assert raw.status_code == 400 and raw.json()["cause"][0]["code"] == 4292

    card = await provider.charge(
        customer_id=first.provider_customer_id,
        payer_email=CUSTOMER.email,
        amount=Decimal("49.00"),
        method="card",
        description="recarga",
        reference="ws-1",
        idempotency_key="card-1",
        card=CARD,
    )
    assert (card.status, card.status_detail) == ("confirmed", "accredited")
    declined = await provider.charge(
        customer_id=first.provider_customer_id,
        payer_email=CUSTOMER.email,
        amount=Decimal("49.00"),
        method="card",
        description="recarga",
        reference="ws-1",
        idempotency_key="card-2",
        card=CardToken(token=DECLINED_CARD, brand="master"),
    )
    assert declined.status == "failed"
    with pytest.raises(PaymentProviderError) as wrong_token:
        await mercadopago(http, token="TEST-outro").get_payment(pix.provider_payment_id)
    assert wrong_token.value.code == "provider_unauthorized"
    with pytest.raises(PaymentProviderError) as missing:
        await provider.get_payment("999")
    assert missing.value.code == "provider_not_found"


async def test_mercadopago_subscription_is_card_only_and_cancels(fakes, http) -> None:
    provider = mercadopago(http)
    with pytest.raises(PaymentProviderError) as pix:
        await provider.create_subscription(
            customer_id="c",
            payer_email=CUSTOMER.email,
            amount=Decimal("99"),
            method="pix",
            description="Squad",
            reference="ws-1",
            start=date(2026, 10, 16),
        )
    assert pix.value.code == "method_not_supported"

    subscription = await provider.create_subscription(
        customer_id="c",
        payer_email=CUSTOMER.email,
        amount=Decimal("99"),
        method="card",
        description="Squad",
        reference="ws-1",
        start=date(2026, 10, 16),
        card=CARD,
    )
    assert subscription.status == "active" and subscription.checkout_url
    [cycle] = await provider.list_subscription_payments(subscription.provider_subscription_id)
    assert cycle.provider_payment_id.startswith("ap:")
    assert (cycle.status, cycle.due_date) == ("confirmed", date(2026, 10, 16))
    assert (await provider.get_payment(cycle.provider_payment_id)).status == "confirmed"

    cancelled = await provider.cancel_subscription(subscription.provider_subscription_id)
    assert cancelled.status == "cancelled"


async def test_mercadopago_webhook_signature_and_resource_lookup(fakes, http) -> None:
    _, fake_mp = fakes
    provider = mercadopago(http)
    pix = await provider.charge(
        customer_id="c",
        payer_email=CUSTOMER.email,
        amount=Decimal("49"),
        method="pix",
        description="recarga",
        reference="ws-1",
        idempotency_key="pix-2",
    )
    fake_mp.payments[int(pix.provider_payment_id)]["status"] = "approved"
    query, headers, body = fake_mp.webhook("payment", pix.provider_payment_id, notification_id=42)
    event = await provider.parse_webhook(headers=headers, query=query, body=body)
    assert (event.event_id, event.event_type) == ("42", "payment.updated")
    assert (event.payment.provider_payment_id, event.payment.status) == (
        pix.provider_payment_id,
        "confirmed",
    )

    tampered = {**headers, "x-signature": headers["x-signature"].replace("ts=", "ts=1")}
    wrong_secret = fake_mp.webhook("payment", pix.provider_payment_id, secret="outro-segredo")
    for bad_query, bad_headers, bad_body in (
        (query, tampered, body),
        wrong_secret,
        (query, {k: v for k, v in headers.items() if k != "x-signature"}, body),
    ):
        with pytest.raises(InvalidWebhookSignature):
            await provider.parse_webhook(headers=bad_headers, query=bad_query, body=bad_body)

    upper_query, upper_headers, upper_body = fake_mp.webhook("payment", "ABC123")
    upper_query["data.id"] = "ABC123"
    await provider.parse_webhook(headers=upper_headers, query=upper_query, body=upper_body)

    unknown_query, unknown_headers, unknown_body = fake_mp.webhook("payment", "123456")
    simulated = await provider.parse_webhook(
        headers=unknown_headers, query=unknown_query, body=unknown_body
    )
    assert simulated.payment is None


def test_scrub_drops_card_and_personal_data() -> None:
    payload = {
        "id": "evt_1",
        "payment": {
            "id": "pay_1",
            "status": "CONFIRMED",
            "subscription": "sub_1",
            "description": "recarga",
            "creditCard": {"creditCardNumber": "0000", "creditCardToken": "tok"},
            "remoteIp": "203.0.113.10",
        },
        "payer": {"email": "a@b.example", "identification": {"number": "00000000000"}},
        "card": {"cardholder": {"name": "X"}},
    }
    clean = scrub(payload)
    assert clean == {
        "id": "evt_1",
        "payment": {
            "id": "pay_1",
            "status": "CONFIRMED",
            "subscription": "sub_1",
            "description": "recarga",
        },
    }


async def test_mock_provider_signs_the_body() -> None:
    provider = MockProvider(webhook_secret="segredo-local")
    body = json.dumps(
        {"id": "evt-1", "type": "payment.confirmed", "payment": {"id": "p1", "status": "confirmed"}}
    ).encode()
    event = await provider.parse_webhook(
        headers={"x-mock-signature": mock_signature("segredo-local", body)}, query={}, body=body
    )
    assert (event.event_id, event.payment.status) == ("evt-1", "confirmed")
    with pytest.raises(InvalidWebhookSignature):
        await provider.parse_webhook(
            headers={"x-mock-signature": mock_signature("outro", body)}, query={}, body=body
        )


def test_provider_comes_from_the_env() -> None:
    http = httpx.AsyncClient()
    assert active_provider(Settings(payment_provider="asaas"), http).name == "asaas"
    assert active_provider(Settings(payment_provider="mercadopago"), http).name == "mercadopago"
    assert active_provider(Settings(payment_provider="mock", app_env="test"), http).name == "mock"
    with pytest.raises(PaymentProviderError):
        active_provider(Settings(payment_provider="mock", app_env="production"), http)
    configured = configured_providers(
        Settings(app_env="production", asaas_api_key="$aact_prod_x", mercadopago_access_token=""),
        http,
    )
    assert set(configured) == {"asaas"}
