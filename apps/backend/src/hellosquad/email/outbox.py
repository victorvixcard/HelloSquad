"""Fila `email_outbox` (pgmq): o worker tira o e-mail, confere o destinatário, envia pelo
`EmailProvider` e grava o resultado em `email_messages`.

Falha passageira: o e-mail volta a `queued` e a mensagem reaparece depois do backoff, até
EMAIL_MAX_ATTEMPTS; esgotou ou falha definitiva: `failed` e `archive`. Em local/test, destinatário fora
do TLD reservado `.example` é recusado sem tentativa (`refused`): nenhum endereço real recebe nada.
"""

import json
import logging
import math
from typing import Any
from uuid import UUID

from psycopg.rows import DictRow
from psycopg_pool import AsyncConnectionPool

from hellosquad.email.provider import EmailProvider, EmailRequest, EmailSendError, EmailTemplate

log = logging.getLogger("hellosquad.email")

QUEUE = "email_outbox"
LOCAL_ENVS = ("local", "test")
RESERVED_TLD = ".example"

CLAIM = """
update public.email_messages
set status = 'sending', attempts = attempts + 1
where id = %s and status in ('queued', 'sending')
returning id, workspace_id, recipient_user_id, recipient_email, template::text as template, locale,
          variables, attempts
"""
MARK_SENT = """
update public.email_messages
set status = 'sent', provider = %s, provider_message_id = %s, sent_at = now(), error = null
where id = %s
"""
MARK = "update public.email_messages set status = %s::public.email_status, error = %s where id = %s"


def recipient_allowed(email: str, app_env: str) -> bool:
    if app_env not in LOCAL_ENVS:
        return True
    return email.rsplit("@", 1)[-1].lower().endswith(RESERVED_TLD)


class EmailOutbox:
    def __init__(
        self,
        pool: AsyncConnectionPool[Any],
        provider: EmailProvider,
        *,
        app_env: str,
        max_attempts: int,
        retry_base_seconds: float,
        visibility_timeout_seconds: int,
    ) -> None:
        self.pool = pool
        self.provider = provider
        self.app_env = app_env
        self.max_attempts = max_attempts
        self.retry_base_seconds = retry_base_seconds
        self.visibility_timeout_seconds = visibility_timeout_seconds

    async def read(self, qty: int) -> list[dict[str, Any]]:
        if qty <= 0:
            return []
        async with self.pool.connection() as conn:
            cur = await conn.execute(
                "select msg_id, read_ct, message from pgmq.read(%s, %s, %s)",
                (QUEUE, self.visibility_timeout_seconds, qty),
            )
            return await cur.fetchall()

    async def queue_call(self, function: str, msg_id: int, *args: int) -> None:
        placeholders = ", ".join(["%s"] * (2 + len(args)))
        async with self.pool.connection() as conn:
            await conn.execute(f"select pgmq.{function}({placeholders})", (QUEUE, msg_id, *args))

    async def claim(self, email_id: UUID) -> DictRow | None:
        async with self.pool.connection() as conn:
            return await (await conn.execute(CLAIM, (email_id,))).fetchone()

    async def mark(self, email_id: UUID, status: str, error: dict[str, Any] | None) -> None:
        async with self.pool.connection() as conn:
            await conn.execute(MARK, (status, json.dumps(error) if error else None, email_id))

    async def handle(self, msg: dict[str, Any]) -> str:
        msg_id, message = msg["msg_id"], msg["message"] or {}
        try:
            email_id = UUID(message["email_message_id"])
        except (KeyError, TypeError, ValueError):
            log.error("e-mail %s sem email_message_id válido: arquivado", msg_id)
            await self.queue_call("archive", msg_id)
            return "invalid"
        row = await self.claim(email_id)
        if row is None:
            await self.queue_call("delete", msg_id)
            return "skipped"
        if row["attempts"] > self.max_attempts:
            await self.mark(email_id, "failed", {"code": "attempts_exhausted"})
            await self.queue_call("archive", msg_id)
            return "failed"
        if not recipient_allowed(row["recipient_email"], self.app_env):
            await self.mark(email_id, "refused", {"code": "recipient_domain_not_allowed"})
            await self.queue_call("archive", msg_id)
            log.warning("e-mail %s recusado: destinatário fora de %s", email_id, RESERVED_TLD)
            return "refused"
        variables = dict(row["variables"] or {})
        variables["recipient_email"] = row["recipient_email"]
        variables["has_account"] = row["recipient_user_id"] is not None
        request = EmailRequest(
            message_id=row["id"],
            to=row["recipient_email"],
            template=EmailTemplate(row["template"]),
            locale=row["locale"],
            variables=variables,
        )
        try:
            result = await self.provider.send(request)
        except Exception as exc:
            transient = exc.transient if isinstance(exc, EmailSendError) else True
            code = exc.code if isinstance(exc, EmailSendError) else "internal"
            details = exc.details if isinstance(exc, EmailSendError) else {}
            if code == "internal":
                log.exception("e-mail %s: erro inesperado", email_id)
                details = {"error_type": type(exc).__name__}
            error = {"code": code, "attempts": row["attempts"], "details": details}
            if transient and row["attempts"] < self.max_attempts:
                delay = self.retry_base_seconds * 2 ** (row["attempts"] - 1)
                await self.mark(email_id, "queued", error)
                await self.queue_call("set_vt", msg_id, math.ceil(delay))
                log.warning("e-mail %s: %s; nova tentativa em %ss", email_id, code, delay)
                return "retry"
            await self.mark(email_id, "failed", error)
            await self.queue_call("archive", msg_id)
            log.error("e-mail %s falhou (%s); mensagem %s arquivada", email_id, code, msg_id)
            return "failed"
        async with self.pool.connection() as conn:
            await conn.execute(MARK_SENT, (result.provider, result.provider_message_id, email_id))
        await self.queue_call("delete", msg_id)
        log.info("e-mail %s (%s, %s) enviado: %s", email_id, row["template"], row["locale"], result)
        return "sent"

    async def drain(self, max_rounds: int = 100, batch: int = 10) -> list[str]:
        """Processa a fila até não ter mensagem visível (testes e `--drain`)."""
        outcomes: list[str] = []
        for _ in range(max_rounds):
            messages = await self.read(batch)
            if not messages:
                break
            for message in messages:
                outcomes.append(await self.handle(message))
        return outcomes
