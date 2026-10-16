"""Frase viva, próximo passo e histórico legível do trabalho (FLUXOS_DA_V46.md §2.1 e §3.1).

O agente escreve a própria frase enquanto trabalha (`work_items.status_label`/`next_step`); quando
o trabalho muda de estado sem ele reescrever, as colunas voltam a nulo e vale a frase do estado,
montada aqui pelo catálogo no idioma do workspace. O histórico guarda o que aconteceu (`kind` e
`params`) e o texto sai daqui, com os literais do protótipo onde eles existem.
"""

from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from hellosquad.i18n import t

# Fuso de exibição até o workspace ter o seu (o protótipo e os dados fictícios são de São Paulo).
DISPLAY_TZ = ZoneInfo("America/Sao_Paulo")


def agent_name(locale: str, agent_id: str | None) -> str:
    return t(locale, f"agent.{agent_id}.name") if agent_id else ""


def format_day(locale: str, value: datetime) -> str:
    """ "sex, 16/10" ou "sex, 16/10, 9h" (V4.6), no fuso de exibição."""
    local = value.astimezone(DISPLAY_TZ)
    parts = {
        "weekday": t(locale, f"date.weekday.{local.weekday()}"),
        "day": f"{local.day:02d}",
        "month": f"{local.month:02d}",
        "hour": str(local.hour),
        "minute": f"{local.minute:02d}",
    }
    if local.hour == 0 and local.minute == 0:
        return t(locale, "date.day", **parts)
    if local.minute == 0:
        return t(locale, "date.day_hour", **parts)
    return t(locale, "date.day_hour_minute", **parts)


def live_fields(locale: str, row: dict[str, Any]) -> tuple[str | None, str | None]:
    """(frase de status, próximo passo): a do agente, se houver; senão, a do estado."""
    status_label, next_step = row.get("status_label"), row.get("next_step")
    if status_label is not None or next_step is not None:
        return status_label, next_step
    return state_fields(locale, row)


def state_fields(locale: str, row: dict[str, Any]) -> tuple[str | None, str | None]:
    kind, deferred = row.get("pending_kind"), bool(row.get("pending_deferred"))
    version = row.get("pending_version_no") or row.get("approved_version_no")
    due = row.get("pending_due_at")
    if kind in ("review", "approve") and not deferred:
        if row.get("pending_version_no") is None:
            return t(locale, "work.status.review_plain"), None
        next_key = "work.next.review_due" if due else "work.next.review"
        return (
            t(locale, "work.status.review", version=version),
            t(locale, next_key, version=version, due=format_day(locale, due) if due else ""),
        )
    if kind == "respond":
        agent_to = t(locale, f"agent.{row.get('pending_agent_id')}.to")
        return t(locale, "work.status.respond"), t(locale, "work.next.respond", agent_to=agent_to)
    if kind == "decide":
        return t(locale, "work.status.decide"), t(locale, "work.next.decide")
    if kind == "authorize" and not deferred:
        return t(locale, "work.status.authorize"), t(locale, "work.next.authorize")
    if kind == "authorize":
        key = (
            "work.status.authorize_deferred" if version else "work.status.authorize_deferred_plain"
        )
        return t(locale, key, version=version), t(locale, "work.next.authorize_deferred")
    if kind == "confirm":
        return t(locale, "work.status.confirm"), None
    status = row.get("status")
    if status == "approved":
        approved = row.get("approved_version_no")
        if approved:
            return t(locale, "work.status.approved", version=approved), None
        return t(locale, "work.status.approved_plain"), None
    if status == "done" and row.get("approved_version_no"):
        return t(locale, "work.status.done"), None
    return None, None


def history_text(locale: str, entry: dict[str, Any], origin: dict[str, Any]) -> str:
    params: dict[str, Any] = entry.get("params") or {}
    kind = entry["kind"]
    if kind == "requested":
        return requested_text(locale, entry, origin)
    if kind == "delivered":
        return t(locale, "history.delivered", version=params.get("version_no"))
    return decided_text(locale, params)


def requested_text(locale: str, entry: dict[str, Any], origin: dict[str, Any]) -> str:
    if entry.get("actor_type") == "system":
        return t(locale, "history.requested.system")
    origin_type = origin.get("type")
    if origin_type == "insight" and origin.get("agent_id"):
        return t(
            locale,
            "history.requested.insight",
            agent_of=t(locale, f"agent.{origin['agent_id']}.of"),
        )
    if origin_type == "project" and origin.get("title"):
        return t(locale, "history.requested.project", project=origin["title"])
    if origin_type == "routine_run":
        return t(locale, "history.requested.routine_run", code=origin.get("ref"))
    kind = origin.get("conversation_kind")
    if kind == "agent_direct" and origin.get("agent_id"):
        return t(
            locale,
            "history.requested.agent_direct",
            agent_with=t(locale, f"agent.{origin['agent_id']}.with"),
        )
    if kind == "squad_room":
        return t(locale, "history.requested.squad_room")
    return t(locale, "history.requested.user")


def decided_text(locale: str, params: dict[str, Any]) -> str:
    kind, decision = params.get("approval_kind"), params.get("decision")
    note, version = params.get("note"), params.get("version_no")
    if kind in ("review", "approve"):
        if decision == "approved":
            if version:
                return t(locale, "history.approved_version", version=version)
            return t(locale, "history.approved")
        if decision == "changes_requested":
            if note:
                return t(locale, "history.changes_requested_note", note=note)
            if version:
                return t(locale, "history.changes_requested_version", version=version)
            return t(locale, "history.changes_requested")
        return t(locale, f"history.rejected.{params.get('follow_up') or 'revise'}")
    if kind == "respond":
        return (
            t(locale, "history.answered_note", note=note) if note else t(locale, "history.answered")
        )
    if kind == "decide":
        return (
            t(locale, "history.decided_note", note=note) if note else t(locale, "history.decided")
        )
    if kind == "authorize":
        if decision != "approved":
            return t(locale, "history.not_authorized")
        due = params.get("due_at")
        if due:
            return t(
                locale,
                "history.authorized_due",
                due=format_day(locale, datetime.fromisoformat(due)),
            )
        return t(locale, "history.authorized")
    if kind == "confirm":
        return t(locale, "history.confirmed" if decision == "approved" else "history.not_confirmed")
    return t(locale, "history.reconnected" if decision == "approved" else "history.not_reconnected")
