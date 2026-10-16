"""Escolha do provedor pelo `.env` (PAYMENT_PROVIDER) e o conjunto configurado para webhooks e
conciliação. Chave nunca vai para log."""

import httpx
from pydantic import SecretStr

from hellosquad.billing.asaas import AsaasProvider
from hellosquad.billing.mercadopago import MercadoPagoProvider
from hellosquad.billing.mock import MockProvider
from hellosquad.billing.provider import PaymentProvider, PaymentProviderError, ProviderName
from hellosquad.config import Settings

PROVIDERS: tuple[ProviderName, ...] = ("asaas", "mercadopago", "mock")


def _secret(value: SecretStr | None) -> str | None:
    return value.get_secret_value() if value is not None and value.get_secret_value() else None


def build_provider(
    name: ProviderName, settings: Settings, http: httpx.AsyncClient
) -> PaymentProvider:
    if name == "asaas":
        return AsaasProvider(
            api_key=_secret(settings.asaas_api_key),
            base_url=settings.asaas_base_url,
            webhook_token=_secret(settings.asaas_webhook_token),
            http=http,
        )
    if name == "mercadopago":
        return MercadoPagoProvider(
            access_token=_secret(settings.mercadopago_access_token),
            base_url=settings.mercadopago_base_url,
            webhook_secret=_secret(settings.mercadopago_webhook_secret),
            back_url=settings.payment_back_url,
            http=http,
        )
    if settings.app_env not in ("local", "test"):
        raise PaymentProviderError(
            "provider_not_configured", "Provedor simulado só em local e teste.", transient=False
        )
    return MockProvider(webhook_secret=_secret(settings.payment_mock_webhook_secret))


def active_provider(settings: Settings, http: httpx.AsyncClient) -> PaymentProvider:
    return build_provider(settings.payment_provider, settings, http)


def configured_providers(settings: Settings, http: httpx.AsyncClient) -> dict[str, PaymentProvider]:
    """Provedores com credencial no `.env` (a conciliação de uma assinatura usa o provedor dela)."""
    providers: dict[str, PaymentProvider] = {}
    if _secret(settings.asaas_api_key):
        providers["asaas"] = build_provider("asaas", settings, http)
    if _secret(settings.mercadopago_access_token):
        providers["mercadopago"] = build_provider("mercadopago", settings, http)
    if settings.app_env in ("local", "test"):
        providers["mock"] = build_provider("mock", settings, http)
    return providers
