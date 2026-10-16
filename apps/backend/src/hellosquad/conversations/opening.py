"""Primeira fala e sugestões da conversa do ambiente (V4.6 `_cx('env')` e `_cxEnvFirst`).

Sai do catálogo do backend, no idioma do workspace, e do estado de agora, lido com a RLS da pessoa:
o Nexo fala das decisões que esperam por ela; o Otto, do calendário editorial; a Íris, dos números
conectados (ainda nenhum); os outros se apresentam com o que estão fazendo ("Oi, eu sou a Bia.
Disponível. O que você precisa?"). As sugestões do Nexo, do Otto e da Íris são as do ambiente no
protótipo; as dos outros, os três primeiros pedidos de exemplo do `agent.yaml`.
"""

from datetime import date, datetime, timedelta
from functools import cache
from uuid import UUID

from psycopg import AsyncConnection
from psycopg.rows import DictRow

from hellosquad.conversations.schemas import ConversationOpening
from hellosquad.i18n import t
from hellosquad.squad.loader import SquadLoader
from hellosquad.squad.prompt import BRAND_NAME_PLACEHOLDER
from hellosquad.work.live import DISPLAY_TZ

ENV_SUGGESTIONS = {"nexo", "otto", "iris"}
SUGGESTION_COUNT = 3

WORKSPACE = "select s.name, s.locale from public.workspaces s where s.id = %s"

PENDING = """
select a.requested_by_agent_id::text as agent_id, w.title, v.version_no
from public.approvals a
join public.work_items w on w.id = a.work_item_id
left join public.delivery_versions v on v.id = a.delivery_version_id
where a.workspace_id = %s and a.status = 'pending' and not app.approval_is_deferred(a)
order by a.created_at, a.id
"""

WORKING = """
select w.title from public.work_items w
where w.workspace_id = %s and w.primary_agent_id = %s and w.status = 'in_progress'
order by w.updated_at desc, w.id
limit 1
"""

# Pauta do calendário editorial (aprovada; proposta e cancelado ficam de fora) de segunda em diante.
CALENDAR_POSTS = """
select p.scheduled_on, p.theme
from public.calendar_posts p
where p.workspace_id = %s and p.scheduled_on >= %s
  and p.status in ('planned', 'scheduled', 'published')
order by p.scheduled_on, p.scheduled_time nulls last, p.id
limit 50
"""


@cache
def loader() -> SquadLoader:
    return SquadLoader()


def brand(text: str, name: str) -> str:
    return text.replace(BRAND_NAME_PLACEHOLDER, name)


def day_label(locale: str, value: date) -> str:
    """ "sex, 16/10" (V4.6)."""
    return t(
        locale,
        "date.day",
        weekday=t(locale, f"date.weekday.{value.weekday()}"),
        day=f"{value.day:02d}",
        month=f"{value.month:02d}",
    )


def suggestions(locale: str, agent_id: str, brand_name: str) -> list[str]:
    if agent_id in ENV_SUGGESTIONS:
        return [
            t(locale, f"environment.suggestion.{agent_id}.{n}")
            for n in range(1, SUGGESTION_COUNT + 1)
        ]
    asks = loader().agent(agent_id).config.get("pedidos_sugeridos") or []
    return [brand(ask, brand_name) for ask in asks[:SUGGESTION_COUNT]]


async def nexo_first(conn: AsyncConnection[DictRow], workspace_id: UUID, locale: str) -> str:
    pending = await (await conn.execute(PENDING, (workspace_id,))).fetchall()
    if not pending:
        return t(locale, "environment.first.nexo.none")
    key = "one" if len(pending) == 1 else "many"
    return t(locale, f"environment.first.nexo.{key}", count=len(pending), title=pending[0]["title"])


async def otto_first(
    conn: AsyncConnection[DictRow], workspace_id: UUID, locale: str, brand_name: str
) -> str:
    today = datetime.now(DISPLAY_TZ).date()
    monday = today - timedelta(days=today.weekday())
    posts = await (await conn.execute(CALENDAR_POSTS, (workspace_id, monday))).fetchall()
    week = [p for p in posts if p["scheduled_on"] <= monday + timedelta(days=6)]
    upcoming = next((p for p in posts if p["scheduled_on"] >= today), None)
    if not week and upcoming is None:
        return t(locale, "environment.first.otto.empty", brand=brand_name)
    parts = []
    if week:
        key = "one" if len(week) == 1 else "many"
        parts.append(t(locale, f"environment.first.otto.{key}", count=len(week)))
    if upcoming is not None:
        key = "next" if week else "upcoming"
        parts.append(
            t(
                locale,
                f"environment.first.otto.{key}",
                theme=upcoming["theme"],
                day=day_label(locale, upcoming["scheduled_on"]),
            )
        )
    return " ".join(parts)


async def specialist_first(
    conn: AsyncConnection[DictRow], workspace_id: UUID, locale: str, agent_id: str, brand_name: str
) -> str:
    greeting = brand(loader().agent(agent_id).config.get("saudacao") or "", brand_name)
    pending = await (await conn.execute(PENDING, (workspace_id,))).fetchall()
    waiting = next((p for p in pending if p["agent_id"] == agent_id), None)
    if waiting is not None and waiting["version_no"] is not None:
        status = t(
            locale,
            "environment.status.wait_version",
            version=waiting["version_no"],
            title=waiting["title"],
        )
    elif waiting is not None:
        status = t(locale, "environment.status.wait", title=waiting["title"])
    else:
        working = await (await conn.execute(WORKING, (workspace_id, agent_id))).fetchone()
        status = (
            t(locale, "environment.status.work", title=working["title"])
            if working
            else t(locale, "environment.status.idle")
        )
    return t(locale, "environment.first.specialist", greeting=greeting, status=status).strip()


async def environment_opening(
    conn: AsyncConnection[DictRow], workspace_id: UUID, agent_id: str
) -> ConversationOpening:
    workspace = await (await conn.execute(WORKSPACE, (workspace_id,))).fetchone()
    locale, brand_name = workspace["locale"], workspace["name"]
    if agent_id == "nexo":
        message = await nexo_first(conn, workspace_id, locale)
    elif agent_id == "otto":
        message = await otto_first(conn, workspace_id, locale, brand_name)
    elif agent_id == "iris":
        message = t(locale, "environment.first.iris.no_data", brand=brand_name)
    else:
        message = await specialist_first(conn, workspace_id, locale, agent_id, brand_name)
    return ConversationOpening(
        agent_id=agent_id,
        message=message,
        suggestions=suggestions(locale, agent_id, brand_name),
    )
