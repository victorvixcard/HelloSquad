"""Interface única do e-mail transacional (S2f).

Quem envia pede pelo modelo, pelas variáveis, pelo idioma e pelo destinatário; o texto sai do
catálogo do backend (`email/templates.py`) e o adaptador só transporta. Trocar de provedor (Mailpit
local hoje; Resend, Postmark, SES… na Fase 5) é escrever outro `deliver`, sem tocar em quem envia.
"""

from abc import ABC, abstractmethod
from collections.abc import Mapping
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any
from uuid import UUID

from hellosquad.email.templates import EmailRenderer, RenderedEmail


class EmailTemplate(StrEnum):
    invitation = "invitation"
    approval_pending = "approval_pending"
    delivery_ready = "delivery_ready"
    payment_confirmed = "payment_confirmed"
    payment_problem = "payment_problem"
    password_changed = "password_changed"
    support_session_started = "support_session_started"


# Convite e avisos de segurança (senha, sessão de suporte) não respeitam preferência (quem é
# convidado ainda não tem conta). Espelho da constraint email_preferences_optional_template.
OPTIONAL_TEMPLATES = frozenset(EmailTemplate) - {
    EmailTemplate.invitation,
    EmailTemplate.password_changed,
    EmailTemplate.support_session_started,
}


@dataclass(frozen=True)
class EmailRequest:
    # email_messages.id: vira o Message-ID e identifica o envio no provedor.
    message_id: UUID
    to: str
    template: EmailTemplate
    locale: str
    variables: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class EmailResult:
    provider: str
    provider_message_id: str


class EmailSendError(Exception):
    """Falha do provedor. `transient`: vale tentar de novo (rede, 4xx temporário do SMTP)."""

    def __init__(self, code: str, *, transient: bool, details: dict[str, Any] | None = None):
        super().__init__(code)
        self.code = code
        self.transient = transient
        self.details = details or {}


class EmailProvider(ABC):
    name: str

    def __init__(self, *, sender: str, renderer: EmailRenderer) -> None:
        self.sender = sender
        self.renderer = renderer

    async def send(self, request: EmailRequest) -> EmailResult:
        rendered = self.renderer.render(request.template, request.locale, request.variables)
        return await self.deliver(request, rendered)

    @abstractmethod
    async def deliver(self, request: EmailRequest, rendered: RenderedEmail) -> EmailResult: ...

    def message_id_header(self, request: EmailRequest) -> str:
        domain = self.sender.rsplit("@", 1)[-1].rstrip(">")
        return f"<{request.message_id}@{domain}>"
