"""Modelos do e-mail transacional: texto e HTML simples com a marca, no idioma gravado no e-mail.

Todo texto vem do catálogo do backend (`i18n/<idioma>.json`, chaves `email.*`). As variáveis já chegam
resolvidas no workspace do evento (gatilhos de `20261016220000_transactional_email.sql`); aqui só se
escolhe a frase, formata a data e escapa o HTML. Sem imagem externa: a marca é texto e cor.
"""

import html
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from hellosquad.i18n import DEFAULT_LOCALE, t

SUPPORTED_LOCALES = ("pt-BR", "en", "es")

# Cores do DS (packages/ui/src/tokens.css): papel, tinta, tinta suave, rótulo e o laranja do Nexo.
PAPER, INK, INK_SOFT, LABEL, ACCENT = "#F7F7F5", "#0F0D22", "#4A4760", "#8A8799", "#FF4D1F"


@dataclass(frozen=True)
class RenderedEmail:
    subject: str
    text: str
    html: str


@dataclass(frozen=True)
class _Parts:
    subject: str
    greeting: str
    paragraphs: list[str]
    cta_label: str
    cta_url: str
    footer: list[str]


class EmailRenderer:
    def __init__(self, *, app_url: str, timezone: str = "America/Sao_Paulo") -> None:
        self.app_url = app_url.rstrip("/")
        self.zone = ZoneInfo(timezone)

    def render(self, template: str, locale: str, variables: Mapping[str, Any]) -> RenderedEmail:
        locale = locale if locale in SUPPORTED_LOCALES else DEFAULT_LOCALE
        builder = getattr(self, f"_{template}", None)
        if builder is None:
            raise ValueError(f"modelo de e-mail desconhecido: {template}")
        parts: _Parts = builder(locale, dict(variables))
        return RenderedEmail(
            subject=parts.subject,
            text=self._text(locale, parts),
            html=self._html(locale, parts),
        )

    # ------------------------------------------------------------------------------------------
    # Modelos
    # ------------------------------------------------------------------------------------------

    def _invitation(self, locale: str, v: dict[str, Any]) -> _Parts:
        workspace = v.get("workspace_name", "")
        inviter = v.get("inviter_name") or t(locale, "email.invitation.inviter_fallback")
        role = t(locale, f"email.role.{v.get('role', 'viewer')}")
        paragraphs = [
            t(locale, "email.invitation.intro", inviter=inviter, workspace=workspace, role=role)
        ]
        if v.get("expires_at"):
            expires = self._date(locale, v["expires_at"])
            paragraphs.append(t(locale, "email.invitation.expires", date=expires))
        has_account = bool(v.get("has_account"))
        return _Parts(
            subject=t(locale, "email.invitation.subject", inviter=inviter, workspace=workspace),
            greeting=t(locale, "email.greeting_anonymous"),
            paragraphs=paragraphs,
            cta_label=t(
                locale, "email.invitation.cta_sign_in" if has_account else "email.invitation.cta_sign_up"
            ),
            cta_url=f"{self.app_url}/{'entrar' if has_account else 'criar-conta'}",
            footer=[t(locale, "email.invitation.footer")],
        )

    def _approval_pending(self, locale: str, v: dict[str, Any]) -> _Parts:
        workspace = v.get("workspace_name", "")
        agent = self._agent(locale, v.get("agent_id"))
        action = t(locale, f"email.approval_kind.{v.get('kind', 'review')}")
        title = v.get("work_item_title")
        paragraphs = [
            t(locale, "email.approval_pending.intro", agent=agent, workspace=workspace, action=action)
        ]
        if title:
            paragraphs.append(t(locale, "email.approval_pending.work_item", title=title))
        paragraphs.append(t(locale, "email.approval_pending.owner_only"))
        subject_key = "email.approval_pending.subject" if title else "email.approval_pending.subject_plain"
        return _Parts(
            subject=t(locale, subject_key, title=title or "", workspace=workspace),
            greeting=self._greeting(locale, v),
            paragraphs=paragraphs,
            cta_label=t(locale, "email.approval_pending.cta"),
            cta_url=self._workspace_url(v),
            footer=[t(locale, "email.footer.member", workspace=workspace)],
        )

    def _delivery_ready(self, locale: str, v: dict[str, Any]) -> _Parts:
        workspace = v.get("workspace_name", "")
        agent = self._agent(locale, v.get("agent_id"))
        title = v.get("work_item_title", "")
        return _Parts(
            subject=t(locale, "email.delivery_ready.subject", title=title),
            greeting=self._greeting(locale, v),
            paragraphs=[
                t(
                    locale,
                    "email.delivery_ready.intro",
                    agent=agent,
                    version=v.get("version_no", 1),
                    title=title,
                    workspace=workspace,
                ),
                t(locale, "email.delivery_ready.detail"),
            ],
            cta_label=t(locale, "email.delivery_ready.cta"),
            cta_url=self._workspace_url(v),
            footer=[t(locale, "email.footer.member", workspace=workspace)],
        )

    def _payment_confirmed(self, locale: str, v: dict[str, Any]) -> _Parts:
        workspace = v.get("workspace_name", "")
        kind = t(locale, f"email.payment_kind.{v.get('payment_kind', 'subscription_cycle')}")
        method = t(locale, f"email.payment_method.{v.get('method', 'card')}")
        return _Parts(
            subject=t(locale, "email.payment_confirmed.subject", workspace=workspace),
            greeting=self._greeting(locale, v),
            paragraphs=[
                t(
                    locale,
                    "email.payment_confirmed.intro",
                    kind=kind,
                    workspace=workspace,
                    method=method,
                ),
                t(locale, "email.payment_confirmed.detail"),
            ],
            cta_label=t(locale, "email.cta.open"),
            cta_url=self._workspace_url(v),
            footer=[t(locale, "email.footer.owner", workspace=workspace)],
        )

    def _payment_problem(self, locale: str, v: dict[str, Any]) -> _Parts:
        workspace = v.get("workspace_name", "")
        kind = t(locale, f"email.payment_kind.{v.get('payment_kind', 'subscription_cycle')}")
        status = t(locale, f"email.payment_status.{v.get('status', 'failed')}")
        return _Parts(
            subject=t(locale, "email.payment_problem.subject", workspace=workspace),
            greeting=self._greeting(locale, v),
            paragraphs=[
                t(
                    locale,
                    "email.payment_problem.intro",
                    kind=kind,
                    workspace=workspace,
                    status=status,
                ),
                t(locale, "email.payment_problem.detail"),
            ],
            cta_label=t(locale, "email.cta.open"),
            cta_url=self._workspace_url(v),
            footer=[t(locale, "email.footer.owner", workspace=workspace)],
        )

    def _password_changed(self, locale: str, v: dict[str, Any]) -> _Parts:
        when = self._datetime(locale, v["changed_at"]) if v.get("changed_at") else ""
        return _Parts(
            subject=t(locale, "email.password_changed.subject"),
            greeting=self._greeting(locale, v),
            paragraphs=[
                t(locale, "email.password_changed.intro", email=v.get("recipient_email", ""), when=when),
                t(locale, "email.password_changed.detail"),
            ],
            cta_label=t(locale, "email.password_changed.cta"),
            cta_url=f"{self.app_url}/entrar",
            footer=[t(locale, "email.password_changed.footer")],
        )

    # ------------------------------------------------------------------------------------------
    # Partes comuns
    # ------------------------------------------------------------------------------------------

    def _greeting(self, locale: str, v: Mapping[str, Any]) -> str:
        name = (v.get("recipient_name") or "").split(" ")[0]
        if not name:
            return t(locale, "email.greeting_anonymous")
        return t(locale, "email.greeting", name=name)

    def _agent(self, locale: str, agent_id: object) -> str:
        if not agent_id:
            return t(locale, "email.agent_fallback")
        return t(locale, f"agent.{agent_id}.name")

    def _workspace_url(self, v: Mapping[str, Any]) -> str:
        slug = v.get("workspace_slug")
        return f"{self.app_url}/app/{slug}" if slug else f"{self.app_url}/app"

    def _local(self, value: str | datetime) -> datetime:
        moment = value if isinstance(value, datetime) else datetime.fromisoformat(str(value))
        return moment.astimezone(self.zone)

    def _date(self, locale: str, value: str | datetime) -> str:
        moment = self._local(value)
        pattern = "%m/%d/%Y" if locale == "en" else "%d/%m/%Y"
        return moment.strftime(pattern)

    def _datetime(self, locale: str, value: str | datetime) -> str:
        moment = self._local(value)
        offset = moment.strftime("%z")
        zone = f"UTC{offset[:3]}:{offset[3:]}"
        return t(
            locale,
            "email.datetime",
            date=self._date(locale, moment),
            time=moment.strftime("%H:%M"),
            zone=zone,
        )

    def _text(self, locale: str, parts: _Parts) -> str:
        lines = [parts.greeting, "", *_join(parts.paragraphs), "", f"{parts.cta_label}: {parts.cta_url}"]
        lines += ["", "—", *parts.footer, t(locale, "email.automatic"), "HelloSquad"]
        return "\n".join(lines) + "\n"

    def _html(self, locale: str, parts: _Parts) -> str:
        e = html.escape
        body = "".join(
            f'<p style="margin:0 0 16px">{e(paragraph)}</p>' for paragraph in parts.paragraphs
        )
        footer = "".join(f'<p style="margin:0 0 6px">{e(line)}</p>' for line in parts.footer)
        return (
            f'<!doctype html><html lang="{e(locale)}"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            f"<title>{e(parts.subject)}</title></head>"
            f'<body style="margin:0;padding:0;background:{PAPER};color:{INK};'
            'font-family:Helvetica,Arial,sans-serif">'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="background:{PAPER};padding:32px 12px"><tr><td align="center">'
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            'style="max-width:560px;background:#FFFFFF;border-radius:16px;padding:32px">'
            f'<tr><td style="font-size:20px;font-weight:700;letter-spacing:-0.02em">Hello'
            f'<span style="color:{ACCENT}">Squad</span></td></tr>'
            f'<tr><td style="padding-top:24px;font-size:16px;line-height:1.55">'
            f'<p style="margin:0 0 16px">{e(parts.greeting)}</p>{body}'
            f'<p style="margin:24px 0 8px"><a href="{e(parts.cta_url)}" '
            f'style="display:inline-block;background:{INK};color:#FFFFFF;text-decoration:none;'
            f'padding:12px 20px;border-radius:999px;font-weight:700">{e(parts.cta_label)}</a></p>'
            f'</td></tr><tr><td style="padding-top:24px;font-size:13px;line-height:1.5;color:{INK_SOFT}">'
            f"{footer}"
            f'<p style="margin:12px 0 0;color:{LABEL}">{e(t(locale, "email.automatic"))}</p>'
            "</td></tr></table></td></tr></table></body></html>"
        )


def _join(paragraphs: list[str]) -> list[str]:
    lines: list[str] = []
    for index, paragraph in enumerate(paragraphs):
        if index:
            lines.append("")
        lines.append(paragraph)
    return lines
