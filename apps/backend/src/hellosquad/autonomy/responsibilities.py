"""Modo Autônomo (S3b): responsabilidades, execuções e a delegação pela conversa.

Leitura para todo membro (RLS); pausar, retomar, encerrar e o interruptor são do owner, e o
combinado só vale com o ok dele (approvals `confirm`). Os textos saem do catálogo no idioma de quem
pede.
"""

from datetime import datetime
from typing import Annotated, Any
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Query, Request
from psycopg import AsyncConnection
from psycopg.rows import DictRow
from psycopg.types.json import Jsonb

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep, ensure_workspace
from hellosquad.api.errors import ApiError, error_responses, request_locale
from hellosquad.api.pagination import limit_query
from hellosquad.autonomy.catalog import (
    PREVIEW_NEVER,
    PREVIEW_STEPS,
    TEMPLATES,
    OptionError,
    actions_for,
    agent_name,
    agreement,
    approval_label,
    collaboration_label,
    date_label,
    deliverable,
    frequency_label,
    option_label,
    period_of,
    resolve_options,
    rhythm,
    run_title_params,
    time_label,
    when_label,
)
from hellosquad.autonomy.responsibility_schemas import (
    Alert,
    AutonomyCounts,
    AutonomyOverview,
    AutonomySwitch,
    EventItem,
    ExecuteAction,
    Fact,
    LastDays,
    Levels,
    MemoryUsed,
    OptionChoice,
    Proposal,
    ProposalCreate,
    ResponsibilityDetail,
    ResponsibilitySummary,
    RunItem,
    RunPage,
    SwitchChange,
    SwitchResult,
    TemplateInfo,
    TemplateQuestion,
    Upcoming,
)
from hellosquad.i18n import t

router = APIRouter(tags=["autonomy"])

OFFERED_LIMIT = 5
DETAIL_UPCOMING = 3
HISTORY_PREVIEW = 3

WORKSPACE = "select id, name, locale, timezone from public.workspaces where id = %s"
RESPONSIBILITY_COLUMNS = """
r.id, r.workspace_id, r.template::text as template, r.title, r.lead_agent_id::text as lead_agent_id,
       r.collaborator_agent_ids::text[] as collaborator_agent_ids,
       r.coordinator_agent_id::text as coordinator_agent_id, r.cadence::text as cadence, r.weekdays,
       r.month_day, r.run_time, r.options, r.agreement, r.actions, r.limits, r.auto_publish,
       r.approval_required, r.required_connections, r.status::text as status, r.status_reason,
       r.status_params, r.blocked_by_connection, r.since, r.next_run_at, r.last_run_at,
       r.paused_at, r.ended_at, r.conversation_id
"""
RESPONSIBILITIES = f"""
select {RESPONSIBILITY_COLUMNS} from public.responsibilities r
where r.workspace_id = %s
order by r.since, r.id
"""
RESPONSIBILITY = f"""
select {RESPONSIBILITY_COLUMNS} from public.responsibilities r
where r.id = %s and r.workspace_id = %s
"""
RUNS = """
select rr.*, r.title as responsibility_title, r.template::text as template
from public.responsibility_runs rr
join public.responsibilities r on r.id = rr.responsibility_id
where rr.workspace_id = %(workspace_id)s
  and (%(responsibility_id)s::uuid is null or rr.responsibility_id = %(responsibility_id)s)
  and (%(before)s::timestamptz is null or rr.scheduled_for < %(before)s)
order by rr.scheduled_for desc, rr.id desc
limit %(limit)s
"""
RUNS_TOTAL = """
select count(*) as n from public.responsibility_runs rr
where rr.workspace_id = %(workspace_id)s
  and (%(responsibility_id)s::uuid is null or rr.responsibility_id = %(responsibility_id)s)
"""
OCCURRENCES = """
with recursive occ as (
  select r.id, r.template, r.status, 1 as n, r.next_run_at as at, r.cadence, r.weekdays,
         r.month_day, r.run_time, w.timezone
  from public.responsibilities r
  join public.workspaces w on w.id = r.workspace_id
  where r.workspace_id = %(workspace_id)s and r.status in ('active', 'failed', 'blocked')
    and r.next_run_at is not null
    and (%(responsibility_id)s::uuid is null or r.id = %(responsibility_id)s)
  union all
  select o.id, o.template, o.status, o.n + 1,
         app.responsibility_next_run(
           o.cadence, o.weekdays, o.month_day, o.run_time, o.timezone, o.at
         ),
         o.cadence, o.weekdays, o.month_day, o.run_time, o.timezone
  from occ o
  where o.n < %(per)s and o.at is not null
)
select id, template::text, status::text, at, blocked.blocked_by_connection
from occ
join lateral (
  select r.blocked_by_connection from public.responsibilities r where r.id = occ.id
) blocked on true
where at is not null
order by at, id
"""
EVENTS = """
select e.id, e.action, e.params, e.actor_type::text, e.created_at
from public.responsibility_events e
where e.responsibility_id = %s
order by e.created_at desc, e.id desc
limit 50
"""
LAST_7_DAYS = """
select count(*) as runs,
       count(*) filter (where rr.status in ('failed', 'skipped')) as not_concluded
from public.responsibility_runs rr
where rr.workspace_id = %s and rr.scheduled_for >= %s::timestamptz - interval '7 days'
  and rr.scheduled_for <= %s
"""
PROPOSE = "select * from app.propose_responsibility(%s, %s, %s, %s, %s, %s)"
SET_STATE = "select id from app.set_responsibility_state(%s, %s)"
SET_AUTONOMY = "select app.set_autonomy(%s, %s) as changed"
NEXT_RUN = """
select app.responsibility_next_run(
  %s::public.responsibility_cadence, %s::smallint[], %s::smallint, %s::time, %s, now()
) as at
"""


# ------------------------------------------------------------------------------------------------
# Textos
# ------------------------------------------------------------------------------------------------


def connection_label(locale: str, connection: str | None) -> str:
    return t(locale, f"autonomy.connection.{connection}") if connection else ""


def run_title(locale: str, template: str, params: dict[str, Any]) -> str:
    return t(locale, f"autonomy.template.{template}.run_title", **params)


def cycle_title(locale: str, template: str, at: datetime, tz: ZoneInfo) -> str:
    period = period_of(template, at, tz)
    return run_title(locale, template, run_title_params(template, at, tz, period))


def moment(value: Any) -> datetime:
    return value if isinstance(value, datetime) else datetime.fromisoformat(str(value))


def run_message(locale: str, run: DictRow, tz: ZoneInfo) -> str | None:
    key, params = run["message_key"], dict(run["message_params"] or {})
    if key is None:
        return None
    if key == "approved":
        at = run["approved_at"] or moment(params.get("at"))
        return t(locale, "autonomy.run_message.approved", when=when_label(locale, at, tz))
    if key == "retrying":
        first, retry = moment(params["time"]).astimezone(tz), moment(params["retry"]).astimezone(tz)
        return t(
            locale,
            "autonomy.run_message.retrying",
            time=time_label(locale, first.time().replace(second=0, microsecond=0)),
            retry=time_label(locale, retry.time().replace(second=0, microsecond=0)),
        )
    if key == "failed_attempts":
        return t(
            locale,
            f"autonomy.run_message.failed_attempts.{params.get('reason', 'runtime_failed')}",
            connection=connection_label(locale, params.get("connection")),
        )
    if key == "reader_pending":
        return t(
            locale,
            "autonomy.run_message.reader_pending",
            connection=connection_label(locale, params.get("connection")),
        )
    return t(locale, f"autonomy.run_message.{key}")


def short_day(value: str) -> str:
    day = datetime.fromisoformat(value)
    return f"{day.day:02d}/{day.month:02d}"


def alerts(locale: str, items: list[dict[str, Any]], key: str) -> list[Alert]:
    return [
        Alert(
            metric=item["metric"],
            change=item.get("change"),
            last_day=item["last_day"],
            text=t(
                locale,
                f"autonomy.alert.{key}",
                metric=t(locale, f"autonomy.metric.{item['metric']}"),
                change=item.get("change"),
                date=short_day(item["last_day"]),
            ),
        )
        for item in items
    ]


def run_item(locale: str, run: DictRow, tz: ZoneInfo) -> RunItem:
    output = run["output"] or {}
    return RunItem(
        id=run["id"],
        code=run["code"],
        responsibility_id=run["responsibility_id"],
        responsibility_title=run["responsibility_title"],
        template=run["template"],
        title=run_title(locale, run["title_key"], run["title_params"] or {}),
        status=run["status"],
        status_label=t(locale, f"autonomy.run_status.{run['status']}"),
        message=run_message(locale, run, tz),
        scheduled_for=run["scheduled_for"],
        scheduled_label=date_label(locale, run["scheduled_for"], tz) or "",
        started_at=run["started_at"],
        finished_at=run["finished_at"],
        attempts=run["attempts"],
        work_item_id=run["work_item_id"],
        approved_at=run["approved_at"],
        memory_used=[MemoryUsed(**m) for m in run["memory_used"] or []],
        alerts=alerts(locale, output.get("alerts", []), "change"),
        stale=alerts(locale, output.get("stale", []), "stale"),
    )


def summary(locale: str, row: DictRow, tz: ZoneInfo, brand: str) -> ResponsibilitySummary:
    template, status = row["template"], row["status"]
    options = row["options"] or {}
    connection = row["blocked_by_connection"]
    next_label = date_label(locale, row["next_run_at"], tz) if status == "active" else None
    next_title = (
        cycle_title(locale, template, row["next_run_at"], tz)
        if status == "active" and row["next_run_at"] is not None
        else None
    )
    if status == "active":
        say = (
            t(
                locale,
                "autonomy.status.active.say",
                date=next_label,
                title=next_title,
                deliver=deliverable(locale, template, options, brand),
            )
            if next_label
            else t(locale, "autonomy.frequency.continuous")
        )
    elif status in ("failed", "blocked") and connection:
        say = t(locale, f"autonomy.status.{status}.say.{connection}")
    else:
        say = t(locale, f"autonomy.status.{status}.say") if status != "failed" else ""
    return ResponsibilitySummary(
        id=row["id"],
        template=template,
        title=t(locale, f"autonomy.template.{template}.title"),
        status=status,
        status_label=t(locale, f"autonomy.status.{status}"),
        lead_agent_id=row["lead_agent_id"],
        collaborator_agent_ids=row["collaborator_agent_ids"],
        coordinator_agent_id=row["coordinator_agent_id"],
        frequency_label=frequency_label(locale, template, options, row["run_time"]),
        since=row["since"],
        next_run_at=row["next_run_at"] if status == "active" else None,
        next_run_label=next_label,
        next_run_title=next_title,
        say=say,
        notice=(
            t(locale, f"autonomy.status.{status}.notice.{connection}")
            if status in ("failed", "blocked") and connection
            else None
        ),
        idle=(
            t(locale, f"autonomy.status.{status}.idle")
            if status in ("paused", "ended", "blocked", "failed")
            else None
        ),
        blocked_by_connection=connection,
        can_pause=status == "active",
        can_resume=status == "paused",
        can_end=status in ("active", "paused"),
        can_edit=status != "ended",
        can_redelegate=status == "ended",
    )


def facts(
    locale: str,
    template: str,
    lead: str,
    collaborators: list[str],
    coordinator: str,
    options: dict[str, str],
    run_time: Any,
    auto_publish: bool,
    brand: str,
) -> list[Fact]:
    values = [
        ("responsible", agent_name(locale, lead)),
        ("collaboration", collaboration_label(locale, collaborators)),
        ("coordination", agent_name(locale, coordinator)),
        ("frequency", frequency_label(locale, template, options, run_time)),
        ("deliver", deliverable(locale, template, options, brand)),
        ("approval", approval_label(locale, template, auto_publish)),
    ]
    return [Fact(key=k, label=t(locale, f"autonomy.fact.{k}"), value=v) for k, v in values]


def levels(locale: str, actions: list[dict[str, Any]]) -> Levels:
    def labels(level: str) -> list[str]:
        return [t(locale, f"autonomy.action.{a['action']}") for a in actions if a["level"] == level]

    execute = []
    for item in actions:
        if item["level"] != "execute":
            continue
        requirement = item.get("requirement") or "approval_each"
        state = (
            "ok"
            if item.get("granted")
            else ("you" if requirement.startswith("approval_each") else "no")
        )
        execute.append(
            ExecuteAction(
                action=item["action"],
                label=t(locale, f"autonomy.action.{item['action']}"),
                requirement=requirement,
                requirement_label=t(locale, f"autonomy.requirement.{requirement}"),
                state=state,
            )
        )
    return Levels(
        analyze=labels("analyze"),
        prepare=labels("prepare"),
        execute=execute,
        never=labels("never"),
        no_external_action=not execute,
    )


def event_text(locale: str, event: DictRow, title: str, frequency: str) -> str:
    params = event["params"] or {}
    return t(
        locale,
        f"autonomy.event.{event['action']}",
        title=title.lower(),
        frequency=frequency.lower(),
        connection=connection_label(locale, params.get("connection")),
    )


def upcoming(locale: str, row: DictRow, tz: ZoneInfo) -> Upcoming:
    blocked = row["status"] != "active"
    return Upcoming(
        responsibility_id=row["id"],
        template=row["template"],
        title=cycle_title(locale, row["template"], row["at"], tz),
        at=row["at"],
        at_label=date_label(locale, row["at"], tz) or "",
        state="blocked" if blocked else "scheduled",
        state_label=t(locale, f"autonomy.upcoming.{'blocked' if blocked else 'scheduled'}"),
        reason=t(locale, f"autonomy.status.{row['status']}.idle") if blocked else None,
    )


# ------------------------------------------------------------------------------------------------
# Leitura
# ------------------------------------------------------------------------------------------------


async def load_workspace(conn: AsyncConnection[DictRow], workspace_id: UUID) -> DictRow:
    await ensure_workspace(conn, workspace_id)
    return await (await conn.execute(WORKSPACE, (workspace_id,))).fetchone()


async def load_runs(
    conn: AsyncConnection[DictRow],
    workspace_id: UUID,
    responsibility_id: UUID | None,
    limit: int,
    before: datetime | None = None,
) -> tuple[list[DictRow], int]:
    params = {
        "workspace_id": workspace_id,
        "responsibility_id": responsibility_id,
        "limit": limit,
        "before": before,
    }
    rows = await (await conn.execute(RUNS, params)).fetchall()
    total = (await (await conn.execute(RUNS_TOTAL, params)).fetchone())["n"]
    return rows, total


async def occurrences(
    conn: AsyncConnection[DictRow], workspace_id: UUID, responsibility_id: UUID | None, per: int
) -> list[DictRow]:
    params = {"workspace_id": workspace_id, "responsibility_id": responsibility_id, "per": per}
    return await (await conn.execute(OCCURRENCES, params)).fetchall()


async def template_infos(
    locale: str, rows: list[DictRow], *, offered_only: bool
) -> list[TemplateInfo]:
    open_by_template = {r["template"]: r for r in rows if r["status"] != "ended"}
    infos = []
    for tpl in TEMPLATES.values():
        existing = open_by_template.get(tpl.id)
        if offered_only and (not tpl.offered or existing is not None):
            continue
        infos.append(
            TemplateInfo(
                id=tpl.id,
                title=t(locale, f"autonomy.template.{tpl.id}.title"),
                lead_agent_id=tpl.lead,
                collaborator_agent_ids=list(tpl.collaborators),
                questions=[
                    TemplateQuestion(
                        key=q.key,
                        question=t(locale, f"autonomy.question.{tpl.id}.{q.key}"),
                        options=[
                            OptionChoice(value=v, label=option_label(locale, tpl.id, q.key, v))
                            for v in q.values
                        ],
                        default=q.default,
                    )
                    for q in tpl.questions
                    if q.asked
                ],
                publish_option=tpl.publish_option,
                offered=tpl.offered,
                existing_id=existing["id"] if existing else None,
                existing_status=existing["status"] if existing else None,
            )
        )
    return infos


@router.get(
    "/workspaces/{workspace_id}/autonomy",
    summary="Modo Autônomo: interruptor, resumo, responsabilidades, próximas e histórico",
    responses=error_responses(401, 404, 422, 503),
)
async def get_autonomy(
    workspace_id: UUID, request: Request, principal: CurrentPrincipal, db: DatabaseDep
) -> AutonomyOverview:
    locale = await request_locale(request)
    async with db.transaction_as(principal) as conn:
        ws = await load_workspace(conn, workspace_id)
        tz = ZoneInfo(ws["timezone"])
        rows = await (await conn.execute(RESPONSIBILITIES, (workspace_id,))).fetchall()
        upcoming_rows = await occurrences(conn, workspace_id, None, OFFERED_LIMIT)
        runs, total = await load_runs(conn, workspace_id, None, HISTORY_PREVIEW)
        now = datetime.now(tz)
        last = await (await conn.execute(LAST_7_DAYS, (workspace_id, now, now))).fetchone()
        offers = await template_infos(locale, rows, offered_only=True)
    count = {s: sum(1 for r in rows if r["status"] == s) for s in AutonomyCounts.model_fields}
    upcoming_items = [upcoming(locale, row, tz) for row in upcoming_rows][:OFFERED_LIMIT]
    scheduled = [u for u in upcoming_items if u.state == "scheduled"]
    return AutonomyOverview(
        switch=AutonomySwitch(
            visible=count["active"] + count["paused"] > 0,
            on=count["active"] > 0,
            label=t(locale, f"autonomy.switch.{'on' if count['active'] else 'paused'}"),
        ),
        counts=AutonomyCounts(**count),
        next=scheduled[0] if scheduled else None,
        last_7_days=LastDays(runs=last["runs"], not_concluded=last["not_concluded"]),
        responsibilities=[
            summary(locale, r, tz, ws["name"]) for r in rows if r["status"] != "ended"
        ],
        ended=[summary(locale, r, tz, ws["name"]) for r in rows if r["status"] == "ended"],
        offers=offers,
        upcoming=upcoming_items,
        history=[run_item(locale, r, tz) for r in runs],
        history_total=total,
    )


@router.get(
    "/workspaces/{workspace_id}/autonomy/templates",
    summary="Modelos de responsabilidade com as perguntas e opções da conversa (V4.6 TPL e Q5)",
    responses=error_responses(401, 404, 422, 503),
)
async def list_templates(
    workspace_id: UUID, request: Request, principal: CurrentPrincipal, db: DatabaseDep
) -> list[TemplateInfo]:
    locale = await request_locale(request)
    async with db.transaction_as(principal) as conn:
        await load_workspace(conn, workspace_id)
        rows = await (await conn.execute(RESPONSIBILITIES, (workspace_id,))).fetchall()
    return await template_infos(locale, rows, offered_only=False)


@router.get(
    "/workspaces/{workspace_id}/autonomy/responsibilities",
    summary="Responsabilidades do workspace (encerradas incluídas, com `status`)",
    responses=error_responses(401, 404, 422, 503),
)
async def list_responsibilities(
    workspace_id: UUID,
    request: Request,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    status: Annotated[str | None, Query(description="Filtra por estado (active, ended…).")] = None,
) -> list[ResponsibilitySummary]:
    locale = await request_locale(request)
    async with db.transaction_as(principal) as conn:
        ws = await load_workspace(conn, workspace_id)
        rows = await (await conn.execute(RESPONSIBILITIES, (workspace_id,))).fetchall()
    tz = ZoneInfo(ws["timezone"])
    return [
        summary(locale, r, tz, ws["name"]) for r in rows if status is None or r["status"] == status
    ]


async def detail(
    conn: AsyncConnection[DictRow], locale: str, ws: DictRow, responsibility_id: UUID
) -> ResponsibilityDetail:
    row = await (await conn.execute(RESPONSIBILITY, (responsibility_id, ws["id"]))).fetchone()
    if row is None:
        raise ApiError(404, "not_found", "error.responsibility_not_found")
    tz = ZoneInfo(ws["timezone"])
    runs, total = await load_runs(conn, ws["id"], row["id"], 20)
    upcoming_rows = await occurrences(conn, ws["id"], row["id"], DETAIL_UPCOMING)
    events = await (await conn.execute(EVENTS, (row["id"],))).fetchall()
    base = summary(locale, row, tz, ws["name"])
    options = row["options"] or {}
    used = next((r["memory_used"] for r in runs if r["memory_used"]), [])
    notice = None
    connection = row["blocked_by_connection"]
    if row["status"] == "failed" and connection:
        failed = next((r for r in runs if r["status"] == "failed" and r["attempt_times"]), None)
        times = [
            time_label(locale, m.astimezone(tz).time().replace(second=0, microsecond=0))
            for m in (failed["attempt_times"] if failed else [])
        ]
        if len(times) >= 2:
            notice = t(
                locale,
                f"autonomy.status.failed.detail.{connection}",
                first=times[0],
                second=times[1],
            )
    elif row["status"] == "blocked" and connection:
        notice = t(locale, f"autonomy.status.blocked.detail.{connection}")
    return ResponsibilityDetail(
        **base.model_dump(),
        agreement=row["agreement"],
        options=options,
        option_labels={k: option_label(locale, row["template"], k, v) for k, v in options.items()},
        auto_publish=row["auto_publish"],
        facts=facts(
            locale,
            row["template"],
            row["lead_agent_id"],
            row["collaborator_agent_ids"],
            row["coordinator_agent_id"],
            options,
            row["run_time"],
            row["auto_publish"],
            ws["name"],
        ),
        levels=levels(locale, row["actions"] or []),
        detail_notice=notice,
        memory_used=[MemoryUsed(**m) for m in used],
        upcoming=[upcoming(locale, r, tz) for r in upcoming_rows],
        history=[run_item(locale, r, tz) for r in runs],
        history_total=total,
        events=[
            EventItem(
                id=e["id"],
                action=e["action"],
                text=event_text(locale, e, base.title, base.frequency_label),
                actor_type=e["actor_type"],
                created_at=e["created_at"],
            )
            for e in events
        ],
        conversation_id=row["conversation_id"],
    )


@router.get(
    "/workspaces/{workspace_id}/autonomy/responsibilities/{responsibility_id}",
    summary="Detalhe: o combinado, limites, memória usada, próximas, histórico e alterações",
    responses=error_responses(401, 404, 422, 503),
)
async def get_responsibility(
    workspace_id: UUID,
    responsibility_id: UUID,
    request: Request,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> ResponsibilityDetail:
    locale = await request_locale(request)
    async with db.transaction_as(principal) as conn:
        ws = await load_workspace(conn, workspace_id)
        return await detail(conn, locale, ws, responsibility_id)


@router.get(
    "/workspaces/{workspace_id}/autonomy/upcoming",
    summary="Próximas execuções (pausadas e encerradas não aparecem; bloqueadas, com o motivo)",
    responses=error_responses(401, 404, 422, 503),
)
async def list_upcoming(
    workspace_id: UUID,
    request: Request,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    limit: Annotated[int, limit_query(20)] = OFFERED_LIMIT,
) -> list[Upcoming]:
    locale = await request_locale(request)
    async with db.transaction_as(principal) as conn:
        ws = await load_workspace(conn, workspace_id)
        rows = await occurrences(conn, workspace_id, None, limit)
    tz = ZoneInfo(ws["timezone"])
    return [upcoming(locale, r, tz) for r in rows][:limit]


@router.get(
    "/workspaces/{workspace_id}/autonomy/runs",
    summary="Histórico de execuções (código, estado, mensagem, trabalho, memória usada)",
    responses=error_responses(401, 404, 422, 503),
)
async def list_runs(
    workspace_id: UUID,
    request: Request,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    responsibility_id: Annotated[UUID | None, Query()] = None,
    before: Annotated[
        datetime | None, Query(description="Execuções programadas antes deste instante.")
    ] = None,
    limit: Annotated[int, limit_query(100)] = 20,
) -> RunPage:
    locale = await request_locale(request)
    async with db.transaction_as(principal) as conn:
        ws = await load_workspace(conn, workspace_id)
        rows, total = await load_runs(conn, workspace_id, responsibility_id, limit + 1, before)
    tz = ZoneInfo(ws["timezone"])
    page = rows[:limit]
    return RunPage(
        items=[run_item(locale, r, tz) for r in page],
        total=total,
        next_cursor=page[-1]["scheduled_for"].isoformat() if len(rows) > limit else None,
    )


# ------------------------------------------------------------------------------------------------
# Ações do dono
# ------------------------------------------------------------------------------------------------


async def change_state(
    workspace_id: UUID,
    responsibility_id: UUID,
    action: str,
    request: Request,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> ResponsibilityDetail:
    locale = await request_locale(request)
    async with db.transaction_as(principal) as conn:
        ws = await load_workspace(conn, workspace_id)
        if (
            await (await conn.execute(RESPONSIBILITY, (responsibility_id, workspace_id))).fetchone()
            is None
        ):
            raise ApiError(404, "not_found", "error.responsibility_not_found")
        await conn.execute(SET_STATE, (responsibility_id, action))
        return await detail(conn, locale, ws, responsibility_id)


@router.post(
    "/workspaces/{workspace_id}/autonomy/responsibilities/{responsibility_id}/pause",
    summary='"Pausar": nada novo é preparado até retomar (só o owner; ativa)',
    responses=error_responses(401, 403, 404, 409, 422, 503),
)
async def pause_responsibility(
    workspace_id: UUID,
    responsibility_id: UUID,
    request: Request,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> ResponsibilityDetail:
    return await change_state(workspace_id, responsibility_id, "pause", request, principal, db)


@router.post(
    "/workspaces/{workspace_id}/autonomy/responsibilities/{responsibility_id}/resume",
    summary='"Retomar": volta a Ativa com a próxima execução no ritmo (só o owner; pausada)',
    responses=error_responses(401, 403, 404, 409, 422, 503),
)
async def resume_responsibility(
    workspace_id: UUID,
    responsibility_id: UUID,
    request: Request,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> ResponsibilityDetail:
    return await change_state(workspace_id, responsibility_id, "resume", request, principal, db)


@router.post(
    "/workspaces/{workspace_id}/autonomy/responsibilities/{responsibility_id}/end",
    summary='"Encerrar": nada mais é programado; o histórico fica (só o owner)',
    description="Com falha ou bloqueio, não pausa nem encerra até ser resolvida.",
    responses=error_responses(401, 403, 404, 409, 422, 503),
)
async def end_responsibility(
    workspace_id: UUID,
    responsibility_id: UUID,
    request: Request,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> ResponsibilityDetail:
    return await change_state(workspace_id, responsibility_id, "end", request, principal, db)


@router.post(
    "/workspaces/{workspace_id}/autonomy/switch",
    summary='Interruptor "Ligado"/"Pausado": pausa todas as ativas ou retoma as pausadas',
    description=(
        "Não alcança as com falha ou bloqueio nem as encerradas. O que mais o interruptor "
        "interrompe é pergunta ao dono (FLUXOS §11 item 4). Só o owner."
    ),
    responses=error_responses(401, 403, 404, 422, 503),
)
async def switch_autonomy(
    workspace_id: UUID, payload: SwitchChange, principal: CurrentPrincipal, db: DatabaseDep
) -> SwitchResult:
    async with db.transaction_as(principal) as conn:
        await load_workspace(conn, workspace_id)
        row = await (await conn.execute(SET_AUTONOMY, (workspace_id, payload.on))).fetchone()
    return SwitchResult(on=payload.on, changed=row["changed"])


# ------------------------------------------------------------------------------------------------
# Delegação pela conversa
# ------------------------------------------------------------------------------------------------


async def propose(conn: AsyncConnection[DictRow], ws: DictRow, payload: ProposalCreate) -> Proposal:
    tpl = TEMPLATES[payload.template]
    locale, brand = ws["locale"], ws["name"]
    try:
        options = resolve_options(tpl, payload.options)
    except OptionError as exc:
        raise ApiError(
            422, "invalid_option", "error.responsibility_option", option=exc.key
        ) from exc
    if payload.auto_publish and not tpl.publish_option:
        raise ApiError(422, "invalid_option", "error.responsibility_option", option="auto_publish")
    rh = rhythm(tpl, options)
    title = t(locale, f"autonomy.template.{tpl.id}.title")
    sentence = agreement(locale, tpl.id, options, payload.auto_publish, brand)
    actions = actions_for(tpl, payload.auto_publish)
    spec = {
        "template": tpl.id,
        "title": title,
        "lead_agent_id": tpl.lead,
        "collaborator_agent_ids": list(tpl.collaborators),
        "cadence": rh["cadence"],
        "weekdays": rh["weekdays"],
        "month_day": rh["month_day"],
        "run_time": tpl.run_time.isoformat(),
        "options": options,
        "actions": actions,
        "limits": {},
        "auto_publish": payload.auto_publish,
        "approval_required": tpl.approval_required,
        "required_connections": list(tpl.required_connections),
    }
    tz = ZoneInfo(ws["timezone"])
    first = (
        await (
            await conn.execute(
                NEXT_RUN,
                (rh["cadence"], rh["weekdays"], rh["month_day"], tpl.run_time, ws["timezone"]),
            )
        ).fetchone()
    )["at"]
    first_label = date_label(locale, first, tz)
    lv = levels(locale, actions)
    change = payload.responsibility_id is not None
    fact_list = facts(
        locale,
        tpl.id,
        tpl.lead,
        list(tpl.collaborators),
        "nexo",
        options,
        tpl.run_time,
        payload.auto_publish,
        brand,
    )
    fact_list.append(
        Fact(
            key="valid_from" if change else "first_run",
            label=t(locale, f"autonomy.fact.{'valid_from' if change else 'first_run'}"),
            value=t(locale, "autonomy.fact.next_run") if change else (first_label or "—"),
        )
    )
    does = lv.prepare[:PREVIEW_STEPS]
    asks = [f"{a.label}: {a.requirement_label}" for a in lv.execute]
    never = lv.never[:PREVIEW_NEVER]
    card = {
        "type": "responsibility_proposal",
        "kicker": t(locale, f"autonomy.card.kicker.{'change' if change else 'new'}"),
        "template": tpl.id,
        "title": title,
        "agreement": sentence,
        "facts": [f.model_dump() for f in fact_list],
        "does": does,
        "asks": asks,
        "never": never,
        "actions": [
            {"id": "confirm_change" if change else "confirm_delegation", "decision": "approved"},
            {"id": "adjust", "decision": "rejected"},
        ],
    }
    texts = {
        "work_title": t(
            locale, f"autonomy.work_title.{'change' if change else 'new'}", title=title
        ),
        "message": t(locale, f"autonomy.nexo.{'summary_change' if change else 'summary'}"),
        "card": card,
    }
    row = await (
        await conn.execute(
            PROPOSE,
            (
                ws["id"],
                payload.conversation_id,
                payload.responsibility_id,
                Jsonb(spec),
                sentence,
                Jsonb(texts),
            ),
        )
    ).fetchone()
    return Proposal(
        id=row["id"],
        template=tpl.id,
        status=row["status"],
        responsibility_id=row["responsibility_id"],
        approval_id=row["approval_id"],
        work_item_id=row["work_item_id"],
        message_id=row["message_id"],
        conversation_id=row["conversation_id"],
        title=title,
        agreement=sentence,
        facts=fact_list,
        first_run_at=first,
        first_run_label=first_label,
        does=does,
        asks=asks,
        never=never,
        card=card,
    )


@router.post(
    "/workspaces/{workspace_id}/autonomy/proposals",
    status_code=201,
    summary='O Nexo apresenta "o combinado" na conversa; só ativa com o ok do dono',
    description=(
        "Monta o combinado do modelo com as opções ditas na conversa (o que faltar fica no "
        "padrão), grava a mensagem do Nexo com o cartão `responsibility_proposal` e a pendência "
        "`confirm` (no trabalho 01.04). O owner confirma em `POST /approvals/{id}/decision` "
        '(`approved` ativa; `rejected` é "Ajustar"). Com `responsibility_id`, é a mudança no '
        "combinado (Editar), que vale a partir da próxima execução. Editor ou acima pede."
    ),
    responses=error_responses(401, 403, 404, 409, 422, 503),
)
async def create_proposal(
    workspace_id: UUID,
    payload: ProposalCreate,
    principal: CurrentPrincipal,
    db: DatabaseDep,
) -> Proposal:
    async with db.transaction_as(principal) as conn:
        ws = await load_workspace(conn, workspace_id)
        return await propose(conn, ws, payload)


@router.post(
    "/workspaces/{workspace_id}/autonomy/responsibilities/{responsibility_id}/redelegate",
    status_code=201,
    summary='"Delegar de novo": recomeça a delegação de uma encerrada com o mesmo combinado',
    responses=error_responses(401, 403, 404, 409, 422, 503),
)
async def redelegate(
    workspace_id: UUID,
    responsibility_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    conversation_id: Annotated[UUID | None, Query()] = None,
) -> Proposal:
    async with db.transaction_as(principal) as conn:
        ws = await load_workspace(conn, workspace_id)
        row = await (
            await conn.execute(RESPONSIBILITY, (responsibility_id, workspace_id))
        ).fetchone()
        if row is None:
            raise ApiError(404, "not_found", "error.responsibility_not_found")
        if row["status"] != "ended":
            raise ApiError(409, "invalid_state", "error.invalid_state")
        payload = ProposalCreate(
            template=row["template"],
            options={
                k: v
                for k, v in (row["options"] or {}).items()
                if (q := TEMPLATES[row["template"]].question(k)) is not None and q.asked
            },
            auto_publish=row["auto_publish"],
            conversation_id=conversation_id,
        )
        return await propose(conn, ws, payload)


async def after_decision(conn: AsyncConnection[DictRow], approval_id: UUID) -> None:
    """Depois do ok do dono no cartão, o Nexo responde na conversa ("Delegado. … Primeira
    execução: …" ou "Atualizado. …"), no idioma do negócio. Idempotente."""
    row = await (
        await conn.execute(
            """
            select p.id, p.status, p.responsibility_id, p.conversation_id,
                   (p.spec ->> 'title') as title, r.next_run_at, w.locale, w.timezone, w.name,
                   exists (
                     select 1 from public.responsibility_events e
                     where e.responsibility_id = p.responsibility_id and e.action = 'changed'
                       and e.created_at >= p.decided_at
                   ) as changed
            from public.responsibility_proposals p
            join public.workspaces w on w.id = p.workspace_id
            left join public.responsibilities r on r.id = p.responsibility_id
            where p.approval_id = %s
            """,
            (approval_id,),
        )
    ).fetchone()
    if row is None or row["status"] != "confirmed" or row["conversation_id"] is None:
        return
    locale = row["locale"]
    if row["changed"]:
        body = t(locale, "autonomy.nexo.changed")
    else:
        body = t(
            locale,
            "autonomy.nexo.delegated",
            date=date_label(locale, row["next_run_at"], ZoneInfo(row["timezone"]))
            or t(locale, "autonomy.frequency.continuous"),
            brand=row["name"],
        )
    await conn.execute("select app.post_responsibility_confirmation(%s, %s)", (approval_id, body))
