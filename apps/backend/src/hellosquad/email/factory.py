"""Escolha do provedor por `EMAIL_PROVIDER` (mailpit | mock). Os dois são só do ambiente local e de
teste: o provedor de produção (Resend, Postmark, SES…) é decisão do dono para a Fase 5. Fora de
local/test não há provedor e o worker deixa a fila email_outbox parada (nada se perde)."""

import logging

from hellosquad.config import Settings
from hellosquad.email.mock import MockEmailProvider
from hellosquad.email.provider import EmailProvider
from hellosquad.email.smtp import SmtpEmailProvider
from hellosquad.email.templates import EmailRenderer

log = logging.getLogger("hellosquad.email")

LOCAL_ENVS = ("local", "test")


def build_renderer(settings: Settings) -> EmailRenderer:
    return EmailRenderer(app_url=settings.email_app_url, timezone=settings.email_timezone)


def build_email_provider(settings: Settings) -> EmailProvider | None:
    if settings.app_env not in LOCAL_ENVS:
        log.warning(
            "EMAIL_PROVIDER=%s só vale em local/test; sem provedor de produção, a fila email_outbox "
            "fica parada",
            settings.email_provider,
        )
        return None
    renderer = build_renderer(settings)
    if settings.email_provider == "mock":
        return MockEmailProvider(sender=settings.email_from, renderer=renderer)
    return SmtpEmailProvider(
        sender=settings.email_from,
        sender_name=settings.email_from_name,
        renderer=renderer,
        host=settings.email_smtp_host,
        port=settings.email_smtp_port,
        timeout=settings.email_timeout_seconds,
    )
