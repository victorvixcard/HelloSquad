"""Adaptador SMTP. Local: o Mailpit do Supabase CLI (`[local_smtp] smtp_port`, 127.0.0.1:56325,
sem autenticação); a interface web e a API HTTP do Mailpit ficam em 127.0.0.1:56324.

O id do provedor é o da resposta ao DATA (`250 2.0.0 Ok: queued as <id>`): no Mailpit é o mesmo id
de `GET /api/v1/message/{id}`. Sem esse trecho na resposta, vale o Message-ID que nós gravamos.
"""

import asyncio
import re
import smtplib
from email.message import EmailMessage
from email.utils import formataddr, formatdate

from hellosquad.email.provider import EmailProvider, EmailRequest, EmailResult, EmailSendError
from hellosquad.email.templates import EmailRenderer, RenderedEmail

QUEUED_AS = re.compile(rb"queued as ([A-Za-z0-9._-]+)")


class SmtpEmailProvider(EmailProvider):
    name = "mailpit"

    def __init__(
        self,
        *,
        sender: str,
        sender_name: str,
        renderer: EmailRenderer,
        host: str,
        port: int,
        timeout: float,
    ) -> None:
        super().__init__(sender=sender, renderer=renderer)
        self.sender_name = sender_name
        self.host = host
        self.port = port
        self.timeout = timeout

    async def deliver(self, request: EmailRequest, rendered: RenderedEmail) -> EmailResult:
        message = EmailMessage()
        message["From"] = formataddr((self.sender_name, self.sender))
        message["To"] = request.to
        message["Subject"] = rendered.subject
        message["Date"] = formatdate(localtime=False)
        message["Message-ID"] = self.message_id_header(request)
        message["Content-Language"] = request.locale
        message["Auto-Submitted"] = "auto-generated"
        message["X-HelloSquad-Template"] = str(request.template)
        message.set_content(rendered.text)
        message.add_alternative(rendered.html, subtype="html")
        return await asyncio.to_thread(self._send, request, message)

    def _send(self, request: EmailRequest, message: EmailMessage) -> EmailResult:
        try:
            with smtplib.SMTP(self.host, self.port, timeout=self.timeout) as smtp:
                smtp.ehlo()
                code, reply = smtp.mail(self.sender)
                self._check(code, reply, "mail_from")
                code, reply = smtp.rcpt(request.to)
                self._check(code, reply, "rcpt_to")
                code, reply = smtp.data(message.as_bytes())
                self._check(code, reply, "data")
        except EmailSendError:
            raise
        except (OSError, smtplib.SMTPException) as exc:
            raise EmailSendError(
                "smtp_unavailable", transient=True, details={"error_type": type(exc).__name__}
            ) from exc
        found = QUEUED_AS.search(reply)
        provider_id = found.group(1).decode() if found else message["Message-ID"].strip("<>")
        return EmailResult(provider=self.name, provider_message_id=provider_id)

    @staticmethod
    def _check(code: int, reply: bytes, stage: str) -> None:
        if 200 <= code < 400:
            return
        # 4xx: recusa temporária (tente de novo); 5xx: definitiva.
        raise EmailSendError(
            f"smtp_{stage}_rejected",
            transient=400 <= code < 500,
            details={"smtp_code": code, "reply": reply.decode(errors="replace")[:200]},
        )
