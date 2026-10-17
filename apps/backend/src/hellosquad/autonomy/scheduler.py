"""Scheduler do Modo Autônomo (S3b): a cada tick, as responsabilidades vencidas no fuso do negócio.

Um ciclo cria a execução (código PL/RS/BL/RC-NN, "Programada"), reagenda a próxima e, se a conexão
de que o modelo depende está em ordem, abre o trabalho do runtime com as etapas do modelo e põe a
primeira na fila `runs_scheduled` ("Em andamento"). Daí em diante a execução segue o trabalho por
gatilho no banco. Conexão ausente → "Não executada" e a responsabilidade fica "Bloqueada por
integração"; conexão expirada → nova tentativa em 30 min e, na segunda, "Falhou" com a
responsabilidade em "Falha na execução". Pausada e encerrada não têm próxima execução.
"""

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from psycopg import AsyncConnection
from psycopg.rows import DictRow
from psycopg.types.json import Jsonb

from hellosquad.autonomy.catalog import (
    CODE_PREFIX,
    TEMPLATES,
    Template,
    option_label,
    period_of,
    run_title_params,
)
from hellosquad.i18n import t

log = logging.getLogger("hellosquad.autonomy")

# Uma rodada por vez entre schedulers (trava de sessão, como a renovação): dois schedulers no ar não
# duplicam execução. O índice único (responsabilidade, horário) segura mesmo sem a trava.
AUTONOMY_LOCK_KEY = 0x48535F4155544F4E  # "HS_AUTON" em ASCII
LOCK = "select pg_try_advisory_lock(%s) as locked"
UNLOCK = "select pg_advisory_unlock(%s)"
COORDINATION = "01.02"
# 07.06: alerta só com dado atualizado (o último dia com dado é ontem, no fuso do negócio) e só com
# variação de pelo menos 20% entre os últimos 7 dias e os 7 anteriores. Limiar provisório.
ALERT_THRESHOLD = 0.20
STOCK_METRICS = {"followers"}

DUE = """
select r.id from public.responsibilities r
where r.status in ('active', 'blocked') and r.next_run_at <= %s
order by r.next_run_at, r.id
limit %s
"""
RETRIES = """
select rr.id from public.responsibility_runs rr
where rr.status = 'scheduled' and rr.retry_at <= %s
order by rr.retry_at, rr.id
limit %s
"""
RESPONSIBILITY = """
select r.*, r.collaborator_agent_ids::text[] as collaborator_agent_ids,
       r.lead_agent_id::text as lead_agent_id, r.template::text as template,
       r.status::text as status, w.timezone, w.locale, w.name as brand
from public.responsibilities r
join public.workspaces w on w.id = r.workspace_id
where r.id = %s
for update of r
"""


@dataclass
class AutonomyReport:
    started: int = 0
    skipped: int = 0
    retried: int = 0
    failed: int = 0
    tick_skipped: bool = False

    @property
    def total(self) -> int:
        return self.started + self.skipped + self.retried + self.failed


async def fetchone(conn: AsyncConnection[DictRow], query: str, params: tuple[Any, ...]) -> Any:
    return await (await conn.execute(query, params)).fetchone()


async def run_due_responsibilities(
    conn: AsyncConnection[DictRow],
    *,
    now: datetime | None = None,
    limit: int = 50,
    retry_minutes: int = 30,
) -> AutonomyReport:
    """Um tick. Com outra rodada em andamento (a trava está com outro scheduler), não dispara nada e
    devolve `tick_skipped`."""
    locked = (await fetchone(conn, LOCK, (AUTONOMY_LOCK_KEY,)))["locked"]
    if not locked:
        log.info("modo autônomo: tick pulado, outro scheduler está com a rodada")
        return AutonomyReport(tick_skipped=True)
    try:
        now = now or datetime.now(UTC)
        report = AutonomyReport()
        due = await (await conn.execute(DUE, (now, limit))).fetchall()
        for row in due:
            async with conn.transaction():
                await start_cycle(conn, row["id"], now, report, retry_minutes)
        retries = await (await conn.execute(RETRIES, (now, limit))).fetchall()
        for row in retries:
            async with conn.transaction():
                await retry_run(conn, row["id"], now, report, retry_minutes)
        return report
    finally:
        await conn.execute(UNLOCK, (AUTONOMY_LOCK_KEY,))


async def start_cycle(
    conn: AsyncConnection[DictRow],
    responsibility_id: UUID,
    now: datetime,
    report: AutonomyReport,
    retry_minutes: int,
) -> None:
    resp = await fetchone(conn, RESPONSIBILITY, (responsibility_id,))
    if (
        resp is None
        or resp["status"] not in ("active", "blocked")
        or resp["next_run_at"] is None
        or resp["next_run_at"] > now
    ):
        return
    tz = ZoneInfo(resp["timezone"])
    scheduled_for = resp["next_run_at"]
    template = resp["template"]
    period_no = period_of(template, scheduled_for, tz)
    code = await unique_code(conn, resp["workspace_id"], CODE_PREFIX[template], period_no)
    run = await fetchone(
        conn,
        """
        insert into public.responsibility_runs (
          workspace_id, responsibility_id, code, period_no, title_key, title_params, scheduled_for
        ) values (%s, %s, %s, %s, %s, %s, %s)
        on conflict (responsibility_id, scheduled_for) do nothing
        returning *
        """,
        (
            resp["workspace_id"],
            resp["id"],
            code,
            period_no,
            template,
            Jsonb(run_title_params(template, scheduled_for, tz, period_no)),
            scheduled_for,
        ),
    )
    await conn.execute(
        """
        update public.responsibilities
        set next_run_at = app.responsibility_next_run_for(id, greatest(%s::timestamptz, %s)),
            last_run_at = %s
        where id = %s
        """,
        (scheduled_for, now, now, resp["id"]),
    )
    if run is None:
        return
    log.info("modo autônomo: %s (%s) programada para %s", code, template, scheduled_for)
    if resp["status"] == "blocked":
        connection = resp["blocked_by_connection"]
        await finish_run(conn, run["id"], "skipped", f"not_connected.{connection}", {})
        report.skipped += 1
        return
    await attempt(conn, run, resp, now, report, retry_minutes)


async def retry_run(
    conn: AsyncConnection[DictRow],
    run_id: UUID,
    now: datetime,
    report: AutonomyReport,
    retry_minutes: int,
) -> None:
    run = await fetchone(
        conn,
        "select * from public.responsibility_runs where id = %s for update",
        (run_id,),
    )
    if run is None or run["status"] != "scheduled" or run["retry_at"] is None:
        return
    resp = await fetchone(conn, RESPONSIBILITY, (run["responsibility_id"],))
    if resp is None or resp["status"] != "active":
        # Pausada, encerrada ou bloqueada depois da primeira tentativa: a nova não acontece.
        await finish_run(conn, run["id"], "skipped", "not_retried", {})
        report.skipped += 1
        return
    await attempt(conn, run, resp, now, report, retry_minutes)


async def attempt(
    conn: AsyncConnection[DictRow],
    run: DictRow,
    resp: DictRow,
    now: datetime,
    report: AutonomyReport,
    retry_minutes: int,
) -> None:
    tpl = TEMPLATES[resp["template"]]
    attempts = run["attempts"] + 1
    times = [*run["attempt_times"], now]
    for connection in resp["required_connections"]:
        state = (
            await fetchone(
                conn,
                "select app.responsibility_connection_state(%s, %s) as state",
                (resp["workspace_id"], connection),
            )
        )["state"]
        if state == "not_connected":
            await finish_run(conn, run["id"], "skipped", f"not_connected.{connection}", {})
            await set_blocked(conn, resp, "blocked", "connection_missing", connection)
            report.skipped += 1
            return
        if state == "needs_reconnect":
            if attempts < run["max_attempts"]:
                retry_at = now + timedelta(minutes=retry_minutes)
                await conn.execute(
                    """
                    update public.responsibility_runs
                    set status = 'scheduled', attempts = %s, attempt_times = %s, retry_at = %s,
                        started_at = coalesce(started_at, %s), message_key = 'retrying',
                        message_params = %s
                    where id = %s
                    """,
                    (
                        attempts,
                        times,
                        retry_at,
                        now,
                        Jsonb(
                            {
                                "reason": "connection_expired",
                                "connection": connection,
                                "time": now.isoformat(),
                                "retry": retry_at.isoformat(),
                            }
                        ),
                        run["id"],
                    ),
                )
                report.retried += 1
                return
            await conn.execute(
                """
                update public.responsibility_runs
                set status = 'failed', attempts = %s, attempt_times = %s, retry_at = null,
                    started_at = coalesce(started_at, %s), finished_at = %s,
                    message_key = 'failed_attempts', message_params = %s
                where id = %s
                """,
                (
                    attempts,
                    times,
                    now,
                    now,
                    Jsonb(
                        {
                            "reason": "connection_expired",
                            "connection": connection,
                            "attempt_times": [moment.isoformat() for moment in times],
                        }
                    ),
                    run["id"],
                ),
            )
            await set_blocked(conn, resp, "failed", "connection_expired", connection)
            report.failed += 1
            return
    if not tpl.steps:
        # O leitor deste modelo (Google Perfil, avaliações) chega com as conexões da S3a.
        connection = resp["required_connections"][0] if resp["required_connections"] else None
        await finish_run(
            conn,
            run["id"],
            "skipped",
            "reader_pending",
            {"connection": connection} if connection else {},
        )
        report.skipped += 1
        return
    output = await monitor(conn, resp, now) if tpl.extra.get("monitor") else {}
    if run["work_item_id"] is not None:
        work_run_id = await requeue_work(conn, run, resp, attempts)
        work_item_id = run["work_item_id"]
    else:
        work_item_id, work_run_id = await open_work(conn, run, resp, tpl, attempts)
    await conn.execute(
        """
        update public.responsibility_runs
        set status = 'running', attempts = %s, attempt_times = %s, retry_at = null,
            started_at = coalesce(started_at, %s), work_item_id = %s, run_id = %s,
            message_key = null, message_params = '{}'::jsonb, output = output || %s
        where id = %s
        """,
        (attempts, times, now, work_item_id, work_run_id, Jsonb(output), run["id"]),
    )
    report.started += 1


async def finish_run(
    conn: AsyncConnection[DictRow],
    run_id: UUID,
    status: str,
    message_key: str,
    params: dict[str, Any],
) -> None:
    await conn.execute(
        """
        update public.responsibility_runs
        set status = %s, finished_at = now(), retry_at = null, message_key = %s, message_params = %s
        where id = %s
        """,
        (status, message_key, Jsonb(params), run_id),
    )


async def set_blocked(
    conn: AsyncConnection[DictRow], resp: DictRow, status: str, reason: str, connection: str
) -> None:
    changed = await fetchone(
        conn,
        """
        update public.responsibilities
        set status = %s, status_reason = %s, status_params = %s, blocked_by_connection = %s
        where id = %s and (status <> %s or blocked_by_connection is distinct from %s)
        returning id
        """,
        (
            status,
            reason,
            Jsonb({"connection": connection}),
            connection,
            resp["id"],
            status,
            connection,
        ),
    )
    if changed is not None:
        await conn.execute(
            """
            insert into public.responsibility_events
              (workspace_id, responsibility_id, actor_type, action, params)
            values (%s, %s, 'system', %s, %s)
            """,
            (
                resp["workspace_id"],
                resp["id"],
                status,
                Jsonb({"connection": connection, "reason": reason}),
            ),
        )


async def unique_code(
    conn: AsyncConnection[DictRow], workspace_id: UUID, prefix: str, period_no: int
) -> str:
    """PL-43; a segunda execução do mesmo período vira PL-43b (como o BL-42b do protótipo)."""
    base = f"{prefix}-{period_no}"
    taken = (
        await fetchone(
            conn,
            """
            select count(*) as n from public.responsibility_runs
            where workspace_id = %s and (code = %s or code ~ ('^' || %s || '[a-z]$'))
            """,
            (workspace_id, base, base),
        )
    )["n"]
    return base if taken == 0 else f"{base}{chr(ord('a') + taken)}"


async def responsibility_conversation(conn: AsyncConnection[DictRow], resp: DictRow) -> UUID:
    """A conversa da responsabilidade (objeto `responsibility` pela chave, com o responsável à
    frente): a mesma que "Conversar sobre ela" abre."""
    row = await fetchone(
        conn,
        """
        insert into public.conversations (
          workspace_id, kind, primary_agent_id, context_type, context_key, context_meta, title
        ) values (%s, 'object', %s, 'responsibility', %s, %s, %s)
        on conflict (workspace_id, context_type, context_key)
          where kind = 'object' and archived_at is null and context_key is not null
            and context_type <> 'capability'
        do nothing
        returning id
        """,
        (
            resp["workspace_id"],
            resp["lead_agent_id"],
            str(resp["id"]),
            Jsonb({"title": resp["title"], "origin": "autonomy"}),
            resp["title"],
        ),
    )
    if row is not None:
        return row["id"]
    row = await fetchone(
        conn,
        """
        select id from public.conversations
        where workspace_id = %s and kind = 'object' and context_type = 'responsibility'
          and context_key = %s and archived_at is null
        """,
        (resp["workspace_id"], str(resp["id"])),
    )
    return row["id"]


async def open_work(
    conn: AsyncConnection[DictRow],
    run: DictRow,
    resp: DictRow,
    tpl: Template,
    attempts: int,
) -> tuple[UUID, UUID]:
    """O trabalho do runtime: o pedido é a mensagem de sistema com o código e o combinado; cada
    etapa do modelo é uma etapa do trabalho (agente, delivery, dependência), e a primeira vai para
    a fila `runs_scheduled`."""
    locale, template = resp["locale"], resp["template"]
    title = t(locale, f"autonomy.template.{template}.run_title", **run["title_params"])
    options = {
        key: option_label(locale, template, key, value)
        for key, value in (resp["options"] or {}).items()
    }
    conversation_id = await responsibility_conversation(conn, resp)
    message = await fetchone(
        conn,
        """
        insert into public.messages (workspace_id, conversation_id, author_type, body)
        values (%s, %s, 'system', %s)
        returning id
        """,
        (
            resp["workspace_id"],
            conversation_id,
            t(
                locale,
                "autonomy.run_request",
                code=run["code"],
                title=title,
                agreement=resp["agreement"],
            ),
        ),
    )
    collaborators = [a for a in resp["collaborator_agent_ids"] if a != resp["lead_agent_id"]]
    item = await fetchone(
        conn,
        """
        insert into public.work_items (
          workspace_id, conversation_id, origin_message_id, title, briefing, delivery_type, status,
          primary_agent_id, collaborator_agent_ids, idempotency_key, origin_type, origin_ref
        ) values (%s, %s, %s, %s, %s, %s, 'draft', %s, %s, %s, 'routine_run', %s)
        returning id
        """,
        (
            resp["workspace_id"],
            conversation_id,
            message["id"],
            title,
            Jsonb(
                {
                    "responsibility_id": str(resp["id"]),
                    "template": template,
                    "code": run["code"],
                    "options": resp["options"],
                }
            ),
            tpl.steps[0].delivery_type if len(tpl.steps) == 1 else COORDINATION,
            resp["lead_agent_id"],
            collaborators,
            f"responsibility_run:{run['id']}",
            run["code"],
        ),
    )
    first_step: UUID | None = None
    for seq, step in enumerate(tpl.steps, start=1):
        instruction = t(locale, f"autonomy.step.{template}.{seq}", title=title, **options)
        row = await fetchone(
            conn,
            """
            insert into public.work_item_steps (
              workspace_id, work_item_id, seq, title, agent_id, delivery_type, depends_on, input
            ) values (%s, %s, %s, %s, %s, %s, %s, %s)
            returning id
            """,
            (
                resp["workspace_id"],
                item["id"],
                seq,
                instruction[:200],
                step.agent_id,
                step.delivery_type,
                list(step.depends_on),
                Jsonb(
                    {
                        "instrucao": instruction,
                        "responsabilidade": resp["agreement"],
                        "briefing": {"objetivo": resp["agreement"], "tema": title},
                    }
                ),
            ),
        )
        if first_step is None:
            first_step = row["id"]
    work_run = await queue_step(conn, resp, item["id"], conversation_id, first_step, run, attempts)
    await conn.execute(
        """
        insert into public.audit_events
          (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
        values (%s, 'system', 'scheduler', 'work_item.created', 'work_item', %s, %s)
        """,
        (
            resp["workspace_id"],
            str(item["id"]),
            Jsonb(
                {
                    "origin_type": "routine_run",
                    "origin_ref": run["code"],
                    "responsibility_id": str(resp["id"]),
                    "run_id": str(work_run),
                }
            ),
        ),
    )
    return item["id"], work_run


async def requeue_work(
    conn: AsyncConnection[DictRow], run: DictRow, resp: DictRow, attempts: int
) -> UUID:
    """Nova tentativa depois de falha do runtime: o mesmo trabalho (failed → in_progress no
    worker) e um run novo da etapa que falhou."""
    step = await fetchone(
        conn,
        """
        select s.id from public.work_item_steps s
        where s.work_item_id = %s and s.delivery_type is not null
          and s.status in ('failed', 'in_progress', 'pending')
        order by (s.status = 'failed') desc, s.seq
        limit 1
        """,
        (run["work_item_id"],),
    )
    item = await fetchone(
        conn,
        "select conversation_id from public.work_items where id = %s",
        (run["work_item_id"],),
    )
    return await queue_step(
        conn,
        resp,
        run["work_item_id"],
        item["conversation_id"],
        step["id"] if step else None,
        run,
        attempts,
    )


async def queue_step(
    conn: AsyncConnection[DictRow],
    resp: DictRow,
    work_item_id: UUID,
    conversation_id: UUID,
    step_id: UUID | None,
    run: DictRow,
    attempts: int,
) -> UUID:
    agent = await fetchone(
        conn,
        "select agent_id::text from public.work_item_steps where id = %s",
        (step_id,),
    )
    row = await fetchone(
        conn,
        """
        insert into public.runs (
          workspace_id, work_item_id, conversation_id, agent_id, kind, status, idempotency_key,
          step_id
        ) values (%s, %s, %s, %s, 'scheduled', 'queued', %s, %s)
        returning id
        """,
        (
            resp["workspace_id"],
            work_item_id,
            conversation_id,
            agent["agent_id"] if agent else resp["lead_agent_id"],
            f"responsibility_run:{run['id']}:attempt:{attempts}",
            step_id,
        ),
    )
    await conn.execute("select app.enqueue_run(%s)", (row["id"],))
    return row["id"]


async def monitor(conn: AsyncConnection[DictRow], resp: DictRow, now: datetime) -> dict[str, Any]:
    """07.06: leitura dos indicadores com alerta só para série atualizada (último dado = ontem no
    fuso do negócio). Série atrasada vira aviso de dado desatualizado, nunca alerta."""
    tz = ZoneInfo(resp["timezone"])
    yesterday = (now.astimezone(tz) - timedelta(days=1)).date()
    rows = await (
        await conn.execute(
            """
            select channel, metric, max(day) as last_day,
                   avg(value) filter (where day > max_day - 7) as recent,
                   avg(value) filter (where day <= max_day - 7 and day > max_day - 14) as previous,
                   (array_agg(value order by day desc))[1] as last_value,
                   (array_agg(value order by day desc) filter (where day <= max_day - 7))[1]
                     as week_ago_value
            from (
              select channel, metric, day, value,
                     max(day) over (partition by channel, metric) as max_day
              from public.metrics_daily
              where workspace_id = %s and day > %s::date - 30
            ) series
            group by channel, metric
            order by channel, metric
            """,
            (resp["workspace_id"], yesterday),
        )
    ).fetchall()
    alerts: list[dict[str, Any]] = []
    stale: list[dict[str, Any]] = []
    for row in rows:
        key = f"{row['channel']}.{row['metric']}"
        if row["last_day"] < yesterday:
            stale.append({"metric": key, "last_day": row["last_day"].isoformat()})
            continue
        if row["metric"] in STOCK_METRICS:
            current, base = row["last_value"], row["week_ago_value"]
        else:
            current, base = row["recent"], row["previous"]
        if current is None or base in (None, 0):
            continue
        change = (float(current) - float(base)) / float(base)
        if abs(change) >= ALERT_THRESHOLD:
            alerts.append(
                {
                    "metric": key,
                    "change": round(change * 100, 1),
                    "last_day": row["last_day"].isoformat(),
                }
            )
    return {"alerts": alerts, "stale": stale, "checked_until": yesterday.isoformat()}
