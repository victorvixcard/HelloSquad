""" "Precisa de você" e o status vivo do squad (FLUXOS_DA_V46.md §5 e §10.3), derivados do banco.

As pendências contam só o que depende da pessoa agora: as autorizações adiadas ("Agora não") ficam
fora e os marcos "Em seguida" vêm à parte. O status de cada especialista segue o `_modes` da V4.6
(L8049) e a mesma regra que o web já aplica ao vivo (`agentModes`): quem está numa etapa de um run
em execução fica `work`, quem pede decisão fica `wait` (vence o `work`), o Nexo coordena (`live`)
enquanto alguém trabalha ou espera. `sleep` sai dos trabalhos pausados; `monitor` vem das rotinas
(Fase 3).
"""

from uuid import UUID

from fastapi import APIRouter

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep, ensure_workspace
from hellosquad.api.errors import error_responses
from hellosquad.approvals.routes import APPROVAL_SELECT, approval_from_row
from hellosquad.domain import AgentId
from hellosquad.i18n import t
from hellosquad.squad.flow import SHORT_AT_WORK
from hellosquad.work.projects import MILESTONE_COLUMNS
from hellosquad.work.schemas import (
    AgentStatus,
    NeedItem,
    NeedProject,
    NeedsYou,
    ProjectMilestone,
    SquadStatus,
)

router = APIRouter(tags=["work"])

SQUAD_ORDER = [agent.value for agent in AgentId]
COORDINATOR = "nexo"
NEXT_WINDOW_DAYS = 10
WAIT_PHRASE = {
    "review": "wait_approval",
    "approve": "wait_approval",
    "respond": "wait_answer",
    "decide": "wait_answer",
    "authorize": "wait_authorization",
    "confirm": "wait_confirmation",
    "reconnect": "wait",
}

LOCALE = "select s.locale from public.workspaces s where s.id = %s"

PENDING_NOW = f"""
{APPROVAL_SELECT}
where a.workspace_id = %s and a.status = 'pending' and not app.approval_is_deferred(a)
order by a.created_at, a.id
"""

DEFERRED_COUNT = """
select count(*) as n from public.approvals a
where a.workspace_id = %s and app.approval_is_deferred(a)
"""

# "Em seguida": marco seu (decisão sua) dos próximos dias que ainda não virou pendência.
NEXT_MILESTONES = f"""
select {MILESTONE_COLUMNS}, p.name as project_name, p.owner_agent_id::text as project_agent_id
from public.project_milestones m
join public.projects p on p.id = m.project_id and p.archived_at is null
left join public.approvals a on a.id = m.approval_id
where m.workspace_id = %(workspace_id)s and m.needs_you and m.done_at is null
  and m.due_at >= date_trunc('day', now())
  and m.due_at < date_trunc('day', now()) + make_interval(days => %(days)s + 1)
  and (a.id is null or a.status <> 'pending')
order by m.due_at, m.id
"""

RUNNING = """
select r.id, r.agent_id::text as owner, r.work_item_id, r.conversation_id, e.payload as thinking
from public.runs r
left join lateral (
  select e.payload from public.run_events e
  where e.run_id = r.id and e.type = 'agent.thinking'
  order by e.seq desc
  limit 1
) e on true
where r.workspace_id = %s and r.status = 'running'
order by r.started_at nulls last, r.id
"""

WAITING = """
select a.id, a.kind::text, a.requested_by_agent_id::text as agent_id, a.work_item_id
from public.approvals a
where a.workspace_id = %s and a.status = 'pending' and not app.approval_is_deferred(a)
order by a.created_at, a.id
"""

PAUSED = """
select w.primary_agent_id::text as agent_id, w.id as work_item_id
from public.work_items w
where w.workspace_id = %s and w.status = 'paused'
order by w.updated_at desc, w.id
"""


@router.get(
    "/workspaces/{workspace_id}/needs",
    summary='"Precisa de você": o que depende da pessoa agora e o que vem "Em seguida"',
    description=(
        "`count` conta só as pendências que dependem da pessoa agora (as adiadas por "
        '"Agora não" ficam em `deferred_count`). Os itens `next` são marcos com decisão sua nos '
        "próximos 10 dias que ainda não viraram pendência: vêm depois e não entram na contagem."
    ),
    responses=error_responses(401, 404, 422, 503),
)
async def needs(workspace_id: UUID, principal: CurrentPrincipal, db: DatabaseDep) -> NeedsYou:
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        pending = await (await conn.execute(PENDING_NOW, (workspace_id,))).fetchall()
        deferred = await (await conn.execute(DEFERRED_COUNT, (workspace_id,))).fetchone()
        upcoming = await (
            await conn.execute(
                NEXT_MILESTONES, {"workspace_id": workspace_id, "days": NEXT_WINDOW_DAYS}
            )
        ).fetchall()
    items = [
        NeedItem(
            type=row["kind"],
            agent_id=row["requested_by_agent_id"],
            approval=approval_from_row(row),
            due_at=row["due_at"],
        )
        for row in pending
    ]
    items += [
        NeedItem(
            type="next",
            agent_id=row["agent_id"] or row["project_agent_id"],
            milestone=ProjectMilestone(**row),
            project=NeedProject(id=row["project_id"], name=row["project_name"]),
            due_at=row["due_at"],
        )
        for row in upcoming
    ]
    return NeedsYou(count=len(pending), deferred_count=deferred["n"], items=items)


@router.get(
    "/workspaces/{workspace_id}/squad/status",
    summary="Status vivo dos sete especialistas, derivado dos runs e das pendências",
    description=(
        "Modos da V4.6 (`idle`, `work`, `wait`, `live`, `sleep`; `monitor` chega com as rotinas) "
        'com o rótulo curto ("escrevendo", "aguarda você") e a frase da conversa '
        '("Otto · criando a primeira versão"). Mesma regra do status ao vivo do web: serve para '
        "abrir a tela já com o estado certo antes dos eventos do Realtime."
    ),
    responses=error_responses(401, 404, 422, 503),
)
async def squad_status(
    workspace_id: UUID, principal: CurrentPrincipal, db: DatabaseDep
) -> SquadStatus:
    async with db.transaction_as(principal) as conn:
        await ensure_workspace(conn, workspace_id)
        locale = (await (await conn.execute(LOCALE, (workspace_id,))).fetchone())["locale"]
        running = await (await conn.execute(RUNNING, (workspace_id,))).fetchall()
        waiting = await (await conn.execute(WAITING, (workspace_id,))).fetchall()
        paused = await (await conn.execute(PAUSED, (workspace_id,))).fetchall()

    status: dict[str, dict] = {agent: {"mode": "idle"} for agent in SQUAD_ORDER}
    for run in running:
        thinking = run["thinking"] or {}
        current = thinking.get("agent_id") or run["owner"]
        if current != COORDINATOR:
            status[current] = {
                "mode": "work",
                "status_label": thinking.get("status_label"),
                "run_id": run["id"],
                "work_item_id": run["work_item_id"],
                "conversation_id": run["conversation_id"],
            }
    for approval in waiting:
        status[approval["agent_id"]] = {
            "mode": "wait",
            "phrase": WAIT_PHRASE[approval["kind"]],
            "approval_id": approval["id"],
            "work_item_id": approval["work_item_id"],
        }
    for item in paused:
        if status[item["agent_id"]]["mode"] == "idle":
            status[item["agent_id"]] = {"mode": "sleep", "work_item_id": item["work_item_id"]}
    others_busy = any(
        status[agent]["mode"] in ("work", "wait", "monitor")
        for agent in SQUAD_ORDER
        if agent != COORDINATOR
    )
    if status[COORDINATOR]["mode"] != "wait" and (running or others_busy):
        status[COORDINATOR] = {"mode": "live"}

    return SquadStatus(
        workspace_id=workspace_id,
        agents=[agent_status(locale, agent, status[agent]) for agent in SQUAD_ORDER],
    )


def agent_status(locale: str, agent: str, state: dict) -> AgentStatus:
    mode = state["mode"]
    name = t(locale, f"agent.{agent}.name")
    short_key = {
        "work": SHORT_AT_WORK.get(agent, "working"),
        "wait": "wait",
        "live": "live",
        "sleep": "sleep",
        "monitor": "monitor",
        "idle": "idle",
    }[mode]
    short = t(locale, f"status.short.{short_key}")
    phrase = {
        "work": None,
        "wait": state.get("phrase"),
        "live": "coordinating",
        "sleep": "paused",
        "monitor": None,
        "idle": None,
    }[mode]
    label = state.get("status_label")
    if label is None and phrase is not None:
        label = t(locale, "status.label", agent=name, phrase=t(locale, f"status.phrase.{phrase}"))
    if label is None and mode == "work":
        label = t(locale, "status.label", agent=name, phrase=short)
    return AgentStatus(
        agent_id=agent,
        mode=mode,
        status_short=short,
        status_label=label,
        run_id=state.get("run_id"),
        work_item_id=state.get("work_item_id"),
        conversation_id=state.get("conversation_id"),
        approval_id=state.get("approval_id"),
    )
