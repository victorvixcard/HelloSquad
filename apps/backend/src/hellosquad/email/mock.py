"""Provedor simulado: não sai da memória do processo; id determinístico pelo id do e-mail."""

import hashlib

from hellosquad.email.provider import EmailProvider, EmailRequest, EmailResult, EmailSendError
from hellosquad.email.templates import EmailRenderer, RenderedEmail


class MockEmailProvider(EmailProvider):
    name = "mock"

    def __init__(self, *, sender: str, renderer: EmailRenderer) -> None:
        super().__init__(sender=sender, renderer=renderer)
        self.sent: list[tuple[EmailRequest, RenderedEmail]] = []
        self.failures: list[EmailSendError] = []

    def fail_next(self, *errors: EmailSendError) -> None:
        self.failures.extend(errors)

    async def deliver(self, request: EmailRequest, rendered: RenderedEmail) -> EmailResult:
        if self.failures:
            raise self.failures.pop(0)
        self.sent.append((request, rendered))
        digest = hashlib.sha256(str(request.message_id).encode()).hexdigest()[:20]
        return EmailResult(provider=self.name, provider_message_id=f"mock-{digest}")
