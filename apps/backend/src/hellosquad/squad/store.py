"""Leituras e escritas do runtime com o papel privilegiado.

O papel ignora a RLS, então cada consulta filtra pelo workspace_id que veio da fila (RunStore é
amarrado a um workspace e a um run). A conexão sai do pool só durante a escrita; nenhuma fica
presa enquanto o modelo pensa. As mudanças de estado de um desfecho (entrega, pergunta, falha)
vão numa transação só: ou tudo aparece para o usuário, ou nada.
"""

import contextlib
import json
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

import psycopg
from psycopg import AsyncConnection
from psycopg.rows import DictRow
from psycopg.types.json import Jsonb
from psycopg_pool import AsyncConnectionPool

from hellosquad.llm.base import Usage
from hellosquad.squad.coordination import CoordinationPlan
from hellosquad.squad.loader import SquadPrompt
from hellosquad.squad.memory import (
    AgentLearning,
    LearningQuery,
    MemoryFact,
    estimate_tokens,
    select_memory,
)
from hellosquad.squad.prompt import HistoryMessage

FINISHED_RUN = {"succeeded", "failed", "cancelled", "waiting_approval"}
RUNNABLE_WORK = {"draft", "in_progress", "failed"}
REDACTED_KEYS = ("key", "token", "secret", "password", "authorization", "cookie")

ClaimOutcome = Literal[
    "claimed",
    "finished",
    "busy",
    "capped",
    "waiting",
    "missing",
    "skipped",
    "exhausted",
    "unbillable",
]
# Reserva recusada: HS001 = sem saldo; P0002 = delivery sem preço ou workspace sem conta; 22023 =
# trabalho sem tipo de delivery.
CREDIT_ERRORS = {
    "HS001": "insufficient_credits",
    "P0002": "credit_price_missing",
    "22023": "credit_price_missing",
}


class RunLost(RuntimeError):
    """O run foi retomado por outro worker (tentativa nova): este resultado não vale mais."""


@dataclass(frozen=True)
class Claim:
    outcome: ClaimOutcome
    attempts: int = 0
    agent_id: str | None = None
    work_item_id: UUID | None = None
    locale: str = "pt-BR"
    error: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class WorkItem:
    id: UUID
    status: str
    title: str
    briefing: dict[str, Any]
    delivery_type: str | None
    conversation_id: UUID | None
    origin_message_id: UUID | None
    project_id: UUID | None = None


@dataclass(frozen=True)
class WorkStep:
    """Etapa planejada pelo Nexo (01.02) que este run executa."""

    id: UUID
    seq: int
    title: str
    agent_id: str
    delivery_type: str
    input: dict[str, Any]
    depends_on: list[int]
    total: int


@dataclass(frozen=True)
class RunData:
    agent_id: str
    attempts: int
    work_item: WorkItem
    workspace_name: str
    locale: str
    request: str
    history: list[HistoryMessage]
    feedback: dict[str, Any] | None = None
    next_version: int = 1
    step: WorkStep | None = None


@dataclass(frozen=True)
class ReplyData:
    agent_id: str
    attempts: int
    conversation_id: UUID
    workspace_name: str
    locale: str
    request: str
    history: list[HistoryMessage]


@dataclass(frozen=True)
class WorkLive:
    """Frase viva e próximo passo que o agente escreve no trabalho enquanto trabalha."""

    work_item_id: UUID
    status_label: str
    next_step: str


# Botões do cartão (o web traduz pelo catálogo); a decisão vai por POST /approvals/{id}/decision.
MATERIAL_ACTIONS = [
    {"id": "approve", "decision": "approved"},
    {"id": "request_changes", "decision": "changes_requested"},
]
QUESTION_ACTIONS = [{"id": "answer", "decision": "answered"}]


def redact(value: Any) -> Any:
    """Tira de payload e erro qualquer chave com cara de segredo, em qualquer profundidade."""
    if isinstance(value, dict):
        return {
            k: "[redigido]" if any(s in k.lower() for s in REDACTED_KEYS) else redact(v)
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [redact(v) for v in value]
    return value


def payload(value: dict[str, Any]) -> Jsonb:
    return Jsonb(redact(value), dumps=lambda v: json.dumps(v, ensure_ascii=False, default=str))


class RunStore:
    def __init__(self, pool: AsyncConnectionPool, *, workspace_id: UUID, run_id: UUID) -> None:
        self.pool = pool
        self.workspace_id = workspace_id
        self.run_id = run_id
        # Tentativa reivindicada por este worker: serve de ficha (fencing) nas escritas finais.
        self.attempt: int | None = None
        # Etapa do trabalho coordenado que o run executa (load): entrega e pendência levam a etapa.
        self.step_id: UUID | None = None

    # ------------------------------------------------------------------------------------------
    # Reivindicação e início
    # ------------------------------------------------------------------------------------------

    async def begin(self, *, workspace_cap: int, lease_seconds: int, max_attempts: int) -> Claim:
        """Reivindica o run e o põe em execução, com o teto do workspace, numa transação só.

        O lock por workspace serializa a contagem de runs em execução e o UPDATE, então dois workers
        não passam juntos do teto. Run em running com batimento mais velho que o lease é de um
        worker que morreu: pode ser retomado.
        """
        async with self.pool.connection() as conn, conn.transaction():
            await conn.execute(
                "select pg_advisory_xact_lock(hashtextextended(%s, 0))",
                (f"hellosquad.run_claim:{self.workspace_id}",),
            )
            run = await fetchone(
                conn,
                """
                select r.status, r.attempts, r.agent_id, r.work_item_id, r.message_id,
                       r.conversation_id, s.locale,
                       r.updated_at < now() - make_interval(secs => %s) as stale
                from public.runs r
                join public.workspaces s on s.id = r.workspace_id
                where r.id = %s and r.workspace_id = %s
                for update of r
                """,
                (lease_seconds, self.run_id, self.workspace_id),
            )
            if run is None:
                return Claim("missing")
            if run["status"] in FINISHED_RUN:
                return Claim("finished", run["attempts"])
            if run["status"] == "running" and not run["stale"]:
                return Claim("busy", run["attempts"])
            if run["attempts"] >= max_attempts:
                # Worker que morreu no meio de cada tentativa também gasta o limite.
                self.attempt = run["attempts"]
                return Claim(
                    "exhausted",
                    run["attempts"],
                    run["agent_id"],
                    run["work_item_id"],
                    run["locale"],
                )
            running = await fetchval(
                conn,
                """
                select count(*) from public.runs
                where workspace_id = %s and status = 'running' and id <> %s
                  and updated_at >= now() - make_interval(secs => %s)
                """,
                (self.workspace_id, self.run_id, lease_seconds),
            )
            if running >= workspace_cap:
                return Claim("capped", run["attempts"])

            if run["work_item_id"] is None and run["message_id"] is not None:
                return await self._begin_reply(conn, run, lease_seconds)

            item = None
            if run["work_item_id"] is not None:
                item = await fetchone(
                    conn,
                    "select status from public.work_items where id = %s and workspace_id = %s "
                    "for update",
                    (run["work_item_id"], self.workspace_id),
                )
            if item is None or item["status"] not in RUNNABLE_WORK:
                await conn.execute(
                    """
                    update public.runs
                    set status = 'cancelled', finished_at = now(),
                        error = %s
                    where id = %s and workspace_id = %s
                    """,
                    (
                        payload(
                            {"code": "work_item_not_runnable", "status": item and item["status"]}
                        ),
                        self.run_id,
                        self.workspace_id,
                    ),
                )
                return Claim("skipped", run["attempts"])

            attempts = await fetchval(
                conn,
                """
                update public.runs
                set status = 'running', attempts = attempts + 1,
                    started_at = coalesce(started_at, now()), finished_at = null
                where id = %s and workspace_id = %s
                returning attempts
                """,
                (self.run_id, self.workspace_id),
            )
            self.attempt = attempts
            if item["status"] != "in_progress":
                await transition(
                    conn, run["work_item_id"], "in_progress", "agent", "nexo", item["status"]
                )
            await self._event(conn, "started", {"agent_id": run["agent_id"], "attempt": attempts})
            claim = (attempts, run["agent_id"], run["work_item_id"], run["locale"])
            refused = await self._reserve(conn)
            if refused is not None:
                return Claim("unbillable", *claim, error=refused)
            return Claim("claimed", *claim)

    async def _begin_reply(
        self, conn: AsyncConnection[DictRow], run: DictRow, lease_seconds: int
    ) -> Claim:
        """Run de resposta: sem trabalho, sem reserva (crédito é por entrega). Um especialista por
        vez: com outro run em execução na mesma conversa, espera a vez (volta à fila)."""
        speaking = await fetchval(
            conn,
            """
            select count(*) from public.runs
            where workspace_id = %s and conversation_id = %s and id <> %s and status = 'running'
              and updated_at >= now() - make_interval(secs => %s)
            """,
            (self.workspace_id, run["conversation_id"], self.run_id, lease_seconds),
        )
        if speaking:
            return Claim("waiting", run["attempts"])
        attempts = await fetchval(
            conn,
            """
            update public.runs
            set status = 'running', attempts = attempts + 1,
                started_at = coalesce(started_at, now()), finished_at = null
            where id = %s and workspace_id = %s
            returning attempts
            """,
            (self.run_id, self.workspace_id),
        )
        self.attempt = attempts
        await self._event(conn, "started", {"agent_id": run["agent_id"], "attempt": attempts})
        return Claim("claimed", attempts, run["agent_id"], None, run["locale"])

    async def _reserve(self, conn: AsyncConnection[DictRow]) -> dict[str, Any] | None:
        """Reserva a estimativa do run (preço vigente da delivery do trabalho) ao começar.

        Uma reserva por run: a retentativa (run de volta a queued) devolve a mesma, sem lançamento
        novo. Recusa (sem saldo, sem preço) volta como erro para o worker encerrar o run sem cobrar.
        """
        try:
            async with conn.transaction():
                await conn.execute(
                    """
                    select app.reserve_credits(%s, e.credits, %s, e.delivery_type, e.price_id)
                    from app.run_credit_estimate(%s) e
                    """,
                    (self.run_id, f"run:{self.run_id}", self.run_id),
                )
        except psycopg.Error as exc:
            code = CREDIT_ERRORS.get(exc.sqlstate or "")
            if code is None:
                raise
            details: dict[str, Any] = {}
            if exc.diag.message_detail:
                with contextlib.suppress(ValueError):
                    details = json.loads(exc.diag.message_detail)
            return {"code": code, "details": details}
        return None

    async def touch(self) -> None:
        """Batimento: prova que o worker dono do run está vivo (o lease conta a partir daqui)."""
        async with self.pool.connection() as conn:
            await conn.execute(
                "update public.runs set updated_at = now() "
                "where id = %s and workspace_id = %s and status = 'running'",
                (self.run_id, self.workspace_id),
            )

    async def load(self, *, history_limit: int) -> RunData:
        async with self.pool.connection() as conn:
            row = await fetchone(
                conn,
                """
                select r.agent_id, r.attempts, w.id as work_item_id, w.status, w.title, w.briefing,
                       w.delivery_type, w.conversation_id, w.origin_message_id, w.project_id,
                       s.name as workspace_name, s.locale, m.body as request, r.step_id,
                       (select coalesce(max(v.version_no), 0) + 1
                        from public.delivery_versions v
                        join public.deliveries d on d.id = v.delivery_id
                        where d.work_item_id = w.id and d.workspace_id = r.workspace_id
                          and d.step_id is not distinct from r.step_id
                       ) as next_version
                from public.runs r
                join public.work_items w
                  on w.id = r.work_item_id and w.workspace_id = r.workspace_id
                join public.workspaces s on s.id = r.workspace_id
                left join public.messages m
                  on m.id = w.origin_message_id and m.workspace_id = r.workspace_id
                where r.id = %s and r.workspace_id = %s
                """,
                (self.run_id, self.workspace_id),
            )
            if row is None:
                raise LookupError(
                    f"run {self.run_id} sem trabalho no workspace {self.workspace_id}"
                )
            history: list[HistoryMessage] = []
            if row["conversation_id"] is not None:
                rows = await (
                    await conn.execute(
                        """
                        select author_type::text, author_agent_id::text, body
                        from public.messages
                        where workspace_id = %s and conversation_id = %s
                          and id is distinct from %s
                        order by created_at desc, id desc
                        limit %s
                        """,
                        (
                            self.workspace_id,
                            row["conversation_id"],
                            row["origin_message_id"],
                            history_limit,
                        ),
                    )
                ).fetchall()
                history = [
                    HistoryMessage(r["author_type"], r["author_agent_id"], r["body"])
                    for r in reversed(rows)
                ]
            feedback = await fetchone(
                conn,
                """
                select a.decision::text as decisao, a.follow_up as saida, a.note as observacao,
                       v.version_no as versao_no, v.content as versao
                from public.approvals a
                left join public.delivery_versions v
                  on v.id = a.delivery_version_id and v.workspace_id = a.workspace_id
                where a.workspace_id = %s and a.work_item_id = %s and a.status = 'decided'
                  and a.decision in ('changes_requested', 'rejected', 'answered')
                  and a.step_id is not distinct from %s
                order by a.decided_at desc, a.id desc
                limit 1
                """,
                (self.workspace_id, row["work_item_id"], row["step_id"]),
            )
            step = None
            if row["step_id"] is not None:
                step_row = await fetchone(
                    conn,
                    """
                    select s.id, s.seq, s.title, s.agent_id::text, s.delivery_type, s.input,
                           s.depends_on,
                           (select count(*) from public.work_item_steps t
                            where t.work_item_id = s.work_item_id and t.delivery_type is not null
                           ) as total
                    from public.work_item_steps s
                    where s.id = %s and s.workspace_id = %s
                    """,
                    (row["step_id"], self.workspace_id),
                )
                if step_row is not None:
                    step = WorkStep(**step_row)
                    self.step_id = step.id
        item = WorkItem(
            id=row["work_item_id"],
            status=row["status"],
            title=row["title"],
            briefing=row["briefing"] or {},
            delivery_type=row["delivery_type"],
            conversation_id=row["conversation_id"],
            origin_message_id=row["origin_message_id"],
            project_id=row["project_id"],
        )
        return RunData(
            agent_id=row["agent_id"],
            attempts=row["attempts"],
            work_item=item,
            workspace_name=row["workspace_name"],
            locale=row["locale"],
            request=row["request"] or row["title"],
            history=history,
            feedback=dict(feedback) if feedback else None,
            next_version=row["next_version"],
            step=step,
        )

    async def load_reply(self, *, history_limit: int) -> ReplyData:
        async with self.pool.connection() as conn:
            row = await fetchone(
                conn,
                """
                select r.agent_id, r.attempts, r.conversation_id, m.id as message_id,
                       m.created_at as message_at, m.body as request, s.name as workspace_name,
                       s.locale
                from public.runs r
                join public.messages m on m.id = r.message_id and m.workspace_id = r.workspace_id
                join public.workspaces s on s.id = r.workspace_id
                where r.id = %s and r.workspace_id = %s
                """,
                (self.run_id, self.workspace_id),
            )
            if row is None:
                raise LookupError(
                    f"run {self.run_id} sem mensagem no workspace {self.workspace_id}"
                )
            rows = await (
                await conn.execute(
                    """
                    select author_type::text, author_agent_id::text, body
                    from public.messages
                    where workspace_id = %s and conversation_id = %s
                      and (created_at, id) < (%s, %s)
                    order by created_at desc, id desc
                    limit %s
                    """,
                    (
                        self.workspace_id,
                        row["conversation_id"],
                        row["message_at"],
                        row["message_id"],
                        history_limit,
                    ),
                )
            ).fetchall()
        return ReplyData(
            agent_id=row["agent_id"],
            attempts=row["attempts"],
            conversation_id=row["conversation_id"],
            workspace_name=row["workspace_name"],
            locale=row["locale"],
            request=row["request"],
            history=[
                HistoryMessage(r["author_type"], r["author_agent_id"], r["body"])
                for r in reversed(rows)
            ],
        )

    async def recall_memory(
        self,
        *,
        locale: str,
        text: str,
        budget: int,
        learnings: LearningQuery | None = None,
    ) -> tuple[list[MemoryFact], list[AgentLearning]]:
        """Memória do run (essenciais, aprendizados do agente com este cliente e busca, sob
        orçamento), registrada em run_context_items na mesma transação. Retentativa do run não
        duplica o registro."""
        async with self.pool.connection() as conn, conn.transaction():
            await self._fence(conn)
            facts, taken = await select_memory(
                conn,
                workspace_id=self.workspace_id,
                locale=locale,
                text=text,
                budget=budget,
                learnings=learnings,
            )
            async with conn.cursor() as cur:
                if facts:
                    await cur.executemany(
                        """
                        insert into public.run_context_items (
                          workspace_id, run_id, kind, fact_id, reason, rank, tokens
                        ) values (%s, %s, 'fact', %s, %s, %s, %s)
                        on conflict do nothing
                        """,
                        [
                            (
                                self.workspace_id,
                                self.run_id,
                                fact.fact_id,
                                fact.reason,
                                fact.rank,
                                fact.tokens,
                            )
                            for fact in facts
                        ],
                    )
                if taken:
                    await cur.executemany(
                        """
                        insert into public.run_context_items (
                          workspace_id, run_id, kind, learning_id, reason, rank, tokens
                        ) values (%s, %s, 'learning', %s, %s, %s, %s)
                        on conflict do nothing
                        """,
                        [
                            (
                                self.workspace_id,
                                self.run_id,
                                item.learning_id,
                                item.reason,
                                item.rank,
                                item.tokens,
                            )
                            for item in taken
                        ],
                    )
        return facts, taken

    async def approved_documents(
        self, delivery_types: list[str], project_id: UUID | None
    ) -> list[dict[str, Any]]:
        """Última versão aprovada de cada delivery pedida, no mesmo projeto (sem projeto: no
        workspace). É assim que a estratégia da Bia (02.04) alimenta o Otto, a Kaia e a Kiwi."""
        async with self.pool.connection() as conn:
            return await (
                await conn.execute(
                    """
                    select distinct on (coalesce(s.delivery_type, w.delivery_type))
                           coalesce(s.delivery_type, w.delivery_type) as delivery_type, w.title,
                           v.id as delivery_version_id, v.version_no, v.content,
                           s.id as step_id, s.seq as step_seq, s.agent_id::text as step_agent_id
                    from public.delivery_versions v
                    join public.deliveries d
                      on d.id = v.delivery_id and d.workspace_id = v.workspace_id
                    join public.work_items w
                      on w.id = d.work_item_id and w.workspace_id = d.workspace_id
                    left join public.work_item_steps s
                      on s.id = d.step_id and s.workspace_id = d.workspace_id
                    where v.workspace_id = %s and v.status = 'approved'
                      and coalesce(s.delivery_type, w.delivery_type) = any(%s)
                      and (%s::uuid is null or w.project_id = %s::uuid)
                    order by coalesce(s.delivery_type, w.delivery_type), v.created_at desc,
                             v.id desc
                    """,
                    (self.workspace_id, delivery_types, project_id, project_id),
                )
            ).fetchall()

    async def step_outputs(self, step: WorkStep, work_item_id: UUID) -> list[dict[str, Any]]:
        """Handoff: a saída de cada etapa de que esta depende (a versão que fechou a etapa)."""
        if not step.depends_on:
            return []
        async with self.pool.connection() as conn:
            return await (
                await conn.execute(
                    """
                    select s.delivery_type, w.title, v.id as delivery_version_id, v.version_no,
                           v.content, s.id as step_id, s.seq as step_seq,
                           s.agent_id::text as step_agent_id
                    from public.work_item_steps s
                    join public.work_items w
                      on w.id = s.work_item_id and w.workspace_id = s.workspace_id
                    join public.delivery_versions v
                      on v.id = (s.output ->> 'delivery_version_id')::uuid
                     and v.workspace_id = s.workspace_id
                    where s.workspace_id = %s and s.work_item_id = %s and s.seq = any(%s)
                      and s.status = 'done'
                    order by s.seq
                    """,
                    (self.workspace_id, work_item_id, step.depends_on),
                )
            ).fetchall()

    async def record_handoff(self, documents: list[dict[str, Any]]) -> None:
        """O que veio de outra etapa entra em run_context_items (kind step, motivo handoff)."""
        rows = [
            (
                self.workspace_id,
                self.run_id,
                d["step_id"],
                d["delivery_version_id"],
                estimate_tokens(json.dumps(d["content"], ensure_ascii=False)),
            )
            for d in documents
            if d.get("step_id") is not None
        ]
        if not rows:
            return
        async with self.pool.connection() as conn, conn.cursor() as cur:
            await cur.executemany(
                """
                insert into public.run_context_items (
                  workspace_id, run_id, kind, step_id, delivery_version_id, reason, tokens
                ) values (%s, %s, 'step', %s, %s, 'handoff', %s)
                on conflict do nothing
                """,
                rows,
            )

    async def calendar_window(self, start: date, end: date) -> list[dict[str, Any]]:
        """O que já está no calendário editorial no período (pauta e propostas em aberto)."""
        async with self.pool.connection() as conn:
            return await (
                await conn.execute(
                    """
                    select scheduled_on, scheduled_time, channel, format, theme,
                           owner_agent_id::text, status::text
                    from public.calendar_posts
                    where workspace_id = %s and scheduled_on between %s and %s
                      and status <> 'cancelled'
                    order by scheduled_on, scheduled_time nulls last, id
                    """,
                    (self.workspace_id, start, end),
                )
            ).fetchall()

    async def contacts(self) -> list[dict[str, Any]]:
        """Base de contatos com o consentimento vigente por canal (o registro mais recente)."""
        async with self.pool.connection() as conn:
            return await (
                await conn.execute(
                    """
                    select c.id, c.source, c.last_purchase_on, c.purchases_count,
                           coalesce(bool_or(s.channel = 'email' and s.status = 'granted'), false)
                             as email_ok,
                           coalesce(bool_or(s.channel = 'whatsapp' and s.status = 'granted'), false)
                             as whatsapp_ok
                    from public.contacts c
                    left join public.contact_consent_state s
                      on s.contact_id = c.id and s.workspace_id = c.workspace_id
                    where c.workspace_id = %s
                    group by c.id
                    order by c.id
                    """,
                    (self.workspace_id,),
                )
            ).fetchall()

    async def metrics(self, days: int) -> tuple[date | None, list[dict[str, Any]]]:
        """Último dia com métrica e as linhas dos dois períodos que terminam nele."""
        async with self.pool.connection() as conn:
            last_day = await fetchval(
                conn,
                "select max(day) from public.metrics_daily where workspace_id = %s",
                (self.workspace_id,),
            )
            if last_day is None:
                return None, []
            rows = await (
                await conn.execute(
                    """
                    select channel, metric, day, value, unit, source
                    from public.metrics_daily
                    where workspace_id = %s and day > %s::date - %s * 2 and day <= %s
                    order by channel, metric, day
                    """,
                    (self.workspace_id, last_day, days, last_day),
                )
            ).fetchall()
            return last_day, rows

    async def ensure_prompt_version(self, prompt: SquadPrompt) -> str:
        async with self.pool.connection() as conn:
            await conn.execute(
                """
                insert into public.agent_prompt_versions (
                  agent_id, content_hash, delivery_type, files, origin, sources
                )
                values (%s, %s, %s, %s, %s, %s)
                on conflict (agent_id, content_hash) do update
                  set origin = excluded.origin, sources = excluded.sources
                  where agent_prompt_versions.origin = 'files' and excluded.origin = 'database'
                """,
                (
                    prompt.agent.id,
                    prompt.content_hash,
                    prompt.skill.delivery_type,
                    Jsonb(prompt.files),
                    prompt.origin,
                    Jsonb(prompt.sources),
                ),
            )
        return prompt.content_hash

    # ------------------------------------------------------------------------------------------
    # Etapas, eventos e etapas do trabalho
    # ------------------------------------------------------------------------------------------

    async def thinking(
        self,
        agent_id: str,
        step: str,
        status: dict[str, str],
        conversation_id: UUID | None,
        work: "WorkLive | None" = None,
    ) -> None:
        """Etapa começando: status por etapa, na conversa quem está escrevendo e, no trabalho, a
        frase viva e o próximo passo do agente."""
        async with self.pool.connection() as conn:
            await self._event(
                conn, "agent.thinking", {"agent_id": agent_id, "step": step, **status}
            )
            if conversation_id is not None:
                await self._event(
                    conn,
                    "conversation.typing",
                    {"conversation_id": conversation_id, "agent_id": agent_id, **status},
                )
            if work is not None:
                await conn.execute(
                    """
                    update public.work_items set status_label = %s, next_step = %s
                    where id = %s and workspace_id = %s and status = 'in_progress'
                    """,
                    (work.status_label, work.next_step, work.work_item_id, self.workspace_id),
                )

    async def event(self, type_: str, data: dict[str, Any]) -> None:
        async with self.pool.connection() as conn:
            await self._event(conn, type_, data)

    async def _event(
        self, conn: AsyncConnection[DictRow], type_: str, data: dict[str, Any]
    ) -> None:
        await conn.execute(
            """
            insert into public.run_events (workspace_id, run_id, seq, type, payload)
            select %s, %s, coalesce(max(seq), 0) + 1, %s, %s
            from public.run_events where run_id = %s and workspace_id = %s
            """,
            (self.workspace_id, self.run_id, type_, payload(data), self.run_id, self.workspace_id),
        )

    async def start_step(
        self, kind: str, model: str | None, data: dict[str, Any]
    ) -> tuple[UUID, int]:
        async with self.pool.connection() as conn:
            return await self._start_step(conn, kind, model, data, status="running")

    async def _start_step(
        self,
        conn: AsyncConnection[DictRow],
        kind: str,
        model: str | None,
        data: dict[str, Any],
        *,
        status: str,
    ) -> tuple[UUID, int]:
        row = await fetchone(
            conn,
            """
            insert into public.run_steps (workspace_id, run_id, seq, kind, model, payload, status)
            select %s, %s, coalesce(max(seq), 0) + 1, %s, %s, %s, %s
            from public.run_steps where run_id = %s and workspace_id = %s
            returning id, seq
            """,
            (
                self.workspace_id,
                self.run_id,
                kind,
                model,
                payload(data),
                status,
                self.run_id,
                self.workspace_id,
            ),
        )
        return row["id"], row["seq"]

    async def finish_step(
        self,
        step_id: UUID,
        *,
        status: str,
        usage: Usage,
        cost: Decimal,
        latency_ms: int,
        model: str | None,
        data: dict[str, Any],
    ) -> None:
        async with self.pool.connection() as conn:
            await conn.execute(
                """
                update public.run_steps
                set status = %s, model = coalesce(%s, model), input_tokens = %s, output_tokens = %s,
                    cache_read_tokens = %s, cache_write_tokens = %s, cost_usd = %s,
                    latency_ms = %s, payload = payload || %s
                where id = %s and workspace_id = %s
                """,
                (
                    status,
                    model,
                    usage.input_tokens,
                    usage.output_tokens,
                    usage.cache_read_tokens,
                    usage.cache_write_tokens,
                    cost,
                    latency_ms,
                    payload(data),
                    step_id,
                    self.workspace_id,
                ),
            )

    async def tool_step(self, data: dict[str, Any]) -> int:
        """Ferramenta interna do runtime (squad.delegar): registra a chamada já concluída."""
        async with self.pool.connection() as conn:
            _, seq = await self._start_step(conn, "tool_call", None, data, status="succeeded")
        return seq

    async def work_step(self, work_item_id: UUID, title: str, agent_id: str, status: str) -> None:
        """Etapa do trabalho com o agente responsável. Repetir (nova tentativa) atualiza a mesma.

        Run de uma etapa planejada (01.02): as fases do run não viram etapas; só a etapa começa.
        """
        async with self.pool.connection() as conn:
            if self.step_id is not None:
                if status == "in_progress":
                    await self._plan_step(conn, "in_progress")
                return
            await self._work_step(conn, work_item_id, title, agent_id, status)

    async def _plan_step(
        self,
        conn: AsyncConnection[DictRow],
        status: str,
        *,
        reason: str | None = None,
        output: dict[str, Any] | None = None,
    ) -> None:
        await conn.execute(
            """
            update public.work_item_steps
            set status = %s, started_at = coalesce(started_at, now()), status_reason = %s,
                status_params = '{}'::jsonb, output = coalesce(%s, output)
            where id = %s and workspace_id = %s
            """,
            (
                status,
                reason,
                Jsonb(output) if output is not None else None,
                self.step_id,
                self.workspace_id,
            ),
        )

    async def _work_step(
        self,
        conn: AsyncConnection[DictRow],
        work_item_id: UUID,
        title: str,
        agent_id: str,
        status: str,
    ) -> None:
        updated = await fetchone(
            conn,
            """
            update public.work_item_steps
            set status = %s,
                started_at = coalesce(started_at, now()),
                finished_at = case when %s in ('done', 'failed', 'skipped') then now() end
            where workspace_id = %s and work_item_id = %s and title = %s and agent_id = %s
            returning id
            """,
            (status, status, self.workspace_id, work_item_id, title, agent_id),
        )
        if updated is None:
            await conn.execute(
                """
                insert into public.work_item_steps (
                  workspace_id, work_item_id, seq, title, agent_id, status, started_at, finished_at
                )
                select %s, %s, coalesce(max(seq), 0) + 1, %s, %s, %s, now(),
                       case when %s in ('done', 'failed', 'skipped') then now() end
                from public.work_item_steps where work_item_id = %s and workspace_id = %s
                """,
                (
                    self.workspace_id,
                    work_item_id,
                    title,
                    agent_id,
                    status,
                    status,
                    work_item_id,
                    self.workspace_id,
                ),
            )

    # ------------------------------------------------------------------------------------------
    # Desfechos
    # ------------------------------------------------------------------------------------------

    async def deliver(
        self,
        *,
        work_item: WorkItem,
        agent_id: str,
        kind: str,
        content: dict[str, Any],
        message: str,
        change_note: str,
        tool_data: dict[str, Any],
        work_step_title: str,
        model: str,
        prompt_version: str,
        observations: list[dict[str, str]] | None = None,
        status: dict[str, str] | None = None,
        calendar_posts: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Entrega pronta: versão, mensagem do agente, revisão pedida, trabalho em needs_you e o que
        o agente percebeu como sugestão "<Agente> percebeu" (nunca conhecimento confirmado).

        Calendário editorial (04.02): os posts da versão entram como rascunho no mesmo commit e
        trocam os rascunhos de uma versão anterior do mesmo trabalho; a aprovação os põe na pauta.
        """
        async with self.pool.connection() as conn, conn.transaction():
            await self._fence(conn)
            delivery = await fetchone(
                conn,
                """
                select id, current_version_id from public.deliveries
                where workspace_id = %s and work_item_id = %s and kind = %s
                  and step_id is not distinct from %s
                order by created_at, id
                limit 1
                for update
                """,
                (self.workspace_id, work_item.id, kind, self.step_id),
            )
            if delivery is None:
                delivery = await fetchone(
                    conn,
                    "insert into public.deliveries (workspace_id, work_item_id, kind, step_id) "
                    "values (%s, %s, %s, %s) returning id, current_version_id",
                    (self.workspace_id, work_item.id, kind, self.step_id),
                )
            version = await fetchone(
                conn,
                """
                insert into public.delivery_versions (
                  workspace_id, delivery_id, version_no, content, created_by_type,
                  created_by_agent_id, run_id, change_note, status
                )
                select %s, %s, coalesce(max(version_no), 0) + 1, %s, 'agent', %s, %s, %s, 'draft'
                from public.delivery_versions where delivery_id = %s and workspace_id = %s
                returning id, version_no
                """,
                (
                    self.workspace_id,
                    delivery["id"],
                    Jsonb(content),
                    agent_id,
                    self.run_id,
                    change_note,
                    delivery["id"],
                    self.workspace_id,
                ),
            )
            if delivery["current_version_id"] is None:
                await conn.execute(
                    "update public.deliveries set current_version_id = %s "
                    "where id = %s and workspace_id = %s",
                    (version["id"], delivery["id"], self.workspace_id),
                )
            await self._start_step(
                conn,
                "tool_call",
                None,
                tool_data | {"delivery_version_id": version["id"]},
                status="succeeded",
            )
            ids = {
                "delivery_id": delivery["id"],
                "delivery_version_id": version["id"],
                "version_no": version["version_no"],
            }
            await self._event(conn, "delivery.created", ids)
            if calendar_posts is not None:
                await self._calendar(conn, work_item.id, version["id"], calendar_posts)
            message_id = await self._agent_message(
                conn,
                work_item.conversation_id,
                agent_id,
                message,
                [{"type": "delivery_version", **{k: str(v) for k, v in ids.items()}}],
            )
            approval_id = await fetchval(
                conn,
                """
                insert into public.approvals (
                  workspace_id, work_item_id, delivery_version_id, run_id, kind,
                  requested_by_agent_id, step_id
                ) values (%s, %s, %s, %s, 'review', %s, %s)
                returning id
                """,
                (
                    self.workspace_id,
                    work_item.id,
                    version["id"],
                    self.run_id,
                    agent_id,
                    self.step_id,
                ),
            )
            await self._card(
                conn,
                message_id,
                {
                    "type": "material",
                    "version_no": version["version_no"],
                    "actions": MATERIAL_ACTIONS,
                },
                work_item_id=work_item.id,
                delivery_version_id=version["id"],
                approval_id=approval_id,
            )
            await self._event(
                conn,
                "approval.requested",
                {"approval_id": approval_id, "kind": "review", **(status or {})},
            )
            suggestions = await self._suggest(conn, work_item, agent_id, observations or [])
            await transition(conn, work_item.id, "needs_you", "agent", agent_id, "in_progress")
            if self.step_id is not None:
                # A etapa espera a decisão do dono; o marco dela vira "decisão sua" com a pendência.
                await self._plan_step(
                    conn,
                    "needs_you",
                    output={
                        "delivery_version_id": str(version["id"]),
                        "version_no": version["version_no"],
                    },
                )
                await conn.execute(
                    "update public.project_milestones set approval_id = %s "
                    "where step_id = %s and workspace_id = %s and done_at is null",
                    (approval_id, self.step_id, self.workspace_id),
                )
            else:
                await self._work_step(conn, work_item.id, work_step_title, agent_id, "done")
            # Entregou: cobra a reserva antes do succeeded (run concluído sem captura libera tudo).
            await conn.execute(
                """
                select app.capture_credits(h.run_id, h.estimate)
                from public.credit_holds h
                where h.run_id = %s and h.workspace_id = %s and h.state = 'held'
                """,
                (self.run_id, self.workspace_id),
            )
            totals = await self._succeed(conn, model=model, prompt_version=prompt_version)
            await self._event(
                conn, "finished", {"status": "succeeded", "work_item_status": "needs_you"}
            )
        return ids | {
            "message_id": message_id,
            "approval_id": approval_id,
            "suggestion_ids": suggestions,
            **totals,
        }

    async def _calendar(
        self,
        conn: AsyncConnection[DictRow],
        work_item_id: UUID,
        version_id: UUID,
        posts: list[dict[str, Any]],
    ) -> None:
        await conn.execute(
            "delete from public.calendar_posts "
            "where workspace_id = %s and work_item_id = %s and status = 'draft'",
            (self.workspace_id, work_item_id),
        )
        for post in posts:
            await conn.execute(
                """
                insert into public.calendar_posts (
                  workspace_id, scheduled_on, scheduled_time, channel, format, theme,
                  owner_agent_id, notes, work_item_id, delivery_version_id, objective
                ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    self.workspace_id,
                    post["scheduled_on"],
                    post["scheduled_time"],
                    post["channel"],
                    post["format"],
                    post["theme"],
                    post["owner_agent_id"],
                    post["notes"],
                    work_item_id,
                    version_id,
                    post.get("objective"),
                ),
            )
        await self._event(
            conn,
            "calendar.updated",
            {"work_item_id": work_item_id, "delivery_version_id": version_id, "posts": len(posts)},
        )

    async def _suggest(
        self,
        conn: AsyncConnection[DictRow],
        work_item: WorkItem,
        agent_id: str,
        observations: list[dict[str, str]],
    ) -> list[UUID]:
        created: list[UUID] = []
        for item in observations:
            row = await fetchone(
                conn,
                """
                select outcome, suggestion_id
                from app.suggest_memory(
                  %s, %s, %s::public.memory_area, %s, %s, %s,
                  p_title => %s, p_explanation => %s, p_origin => %s, p_run_id => %s
                )
                """,
                (
                    self.workspace_id,
                    agent_id,
                    item["area"],
                    item["assunto"],
                    item["chave"],
                    item["leitura"],
                    item["leitura"],
                    item.get("explicacao"),
                    work_item.title,
                    self.run_id,
                ),
            )
            if row and row["outcome"] == "created":
                created.append(row["suggestion_id"])
                await self._event(
                    conn,
                    "memory.suggested",
                    {"suggestion_id": row["suggestion_id"], "agent_id": agent_id},
                )
        return created

    async def ask(
        self,
        *,
        work_item: WorkItem,
        agent_id: str,
        question: str,
        tool_data: dict[str, Any],
        model: str,
        status: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """Briefing incompleto: o agente pergunta, a resposta fica pedida e o trabalho espera.

        O especialista do run não chegou a rodar: runs.prompt_version fica nulo e a versão do Nexo
        fica na etapa da triagem.
        """
        async with self.pool.connection() as conn, conn.transaction():
            await self._fence(conn)
            await self._start_step(conn, "tool_call", None, tool_data, status="succeeded")
            message_id = await self._agent_message(
                conn, work_item.conversation_id, agent_id, question, []
            )
            approval_id = await fetchval(
                conn,
                """
                insert into public.approvals (
                  workspace_id, work_item_id, run_id, kind, requested_by_agent_id, step_id
                ) values (%s, %s, %s, 'respond', %s, %s)
                returning id
                """,
                (self.workspace_id, work_item.id, self.run_id, agent_id, self.step_id),
            )
            await self._card(
                conn,
                message_id,
                {"type": "question", "actions": QUESTION_ACTIONS},
                work_item_id=work_item.id,
                approval_id=approval_id,
            )
            await self._event(
                conn,
                "approval.requested",
                {"approval_id": approval_id, "kind": "respond", **(status or {})},
            )
            await transition(conn, work_item.id, "needs_you", "agent", agent_id, "in_progress")
            if self.step_id is not None:
                await self._plan_step(conn, "needs_you")
            totals = await self._succeed(conn, model=model, prompt_version=None)
            await self._event(
                conn, "finished", {"status": "succeeded", "work_item_status": "needs_you"}
            )
        return {"message_id": message_id, "approval_id": approval_id, **totals}

    async def coordinate(
        self,
        *,
        work_item: WorkItem,
        plan: CoordinationPlan,
        tool_data: dict[str, Any],
        model: str,
        prompt_version: str,
        live: "WorkLive | None" = None,
    ) -> dict[str, Any]:
        """Equipe montada (01.02): projeto, participantes, etapas por agente ligadas aos marcos do
        roadmap, cartão `team` do Nexo na conversa e a primeira etapa na fila (um especialista por
        vez). A coordenação não entrega versão: não captura créditos (a reserva é liberada)."""
        agents = list(dict.fromkeys(step.agente for step in plan.etapas))
        responsibilities: dict[str, list[str]] = {}
        for step in plan.etapas:
            responsibilities.setdefault(step.agente, []).append(step.responsabilidade)
        team = [
            {
                "agent_id": agent,
                "responsibility": " · ".join(dict.fromkeys(responsibilities[agent])),
            }
            for agent in agents
        ]
        async with self.pool.connection() as conn, conn.transaction():
            await self._fence(conn)
            project_id = work_item.project_id
            if project_id is None and plan.projeto is not None:
                project_id = await fetchval(
                    conn,
                    """
                    insert into public.projects (
                      workspace_id, name, objective, owner_agent_id, created_by, starts_at
                    )
                    select %s, %s, %s, 'nexo', w.created_by, now()
                    from public.work_items w where w.id = %s and w.workspace_id = %s
                    returning id
                    """,
                    (
                        self.workspace_id,
                        plan.projeto.nome,
                        plan.projeto.objetivo,
                        work_item.id,
                        self.workspace_id,
                    ),
                )
                await self._start_step(
                    conn,
                    "tool_call",
                    None,
                    {"tool": "projetos.criar", "agent_id": "nexo", "project_id": project_id},
                    status="succeeded",
                )
            if project_id is not None:
                async with conn.cursor() as cur:
                    await cur.executemany(
                        """
                        insert into public.project_participants (
                          workspace_id, project_id, agent_id, responsibility
                        ) values (%s, %s, %s, %s)
                        on conflict (project_id, agent_id)
                        do update set responsibility = excluded.responsibility
                        """,
                        [
                            (
                                self.workspace_id,
                                project_id,
                                m["agent_id"],
                                m["responsibility"][:120],
                            )
                            for m in team
                        ],
                    )
            await conn.execute(
                """
                update public.work_items
                set project_id = %s, collaborator_agent_ids = %s::public.agent_id[],
                    briefing = briefing || %s
                where id = %s and workspace_id = %s
                """,
                (
                    project_id,
                    agents,
                    Jsonb(plan.briefing.model_dump()),
                    work_item.id,
                    self.workspace_id,
                ),
            )
            step_ids = []
            for seq, step in enumerate(plan.etapas, start=1):
                step_id = await fetchval(
                    conn,
                    """
                    insert into public.work_item_steps (
                      workspace_id, work_item_id, seq, title, agent_id, delivery_type, depends_on,
                      input
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s)
                    returning id
                    """,
                    (
                        self.workspace_id,
                        work_item.id,
                        seq,
                        step.titulo,
                        step.agente,
                        step.delivery,
                        step.depende_de,
                        Jsonb(
                            {
                                "instrucao": step.instrucao,
                                "responsabilidade": step.responsabilidade,
                                "briefing": plan.briefing.model_dump(),
                            }
                        ),
                    ),
                )
                step_ids.append(step_id)
                if project_id is not None:
                    await conn.execute(
                        """
                        insert into public.project_milestones (
                          workspace_id, project_id, title, summary, agent_id, needs_you, planned,
                          work_item_id, step_id
                        ) values (%s, %s, %s, %s, %s, true, true, %s, %s)
                        """,
                        (
                            self.workspace_id,
                            project_id,
                            step.titulo,
                            step.responsabilidade[:300],
                            step.agente,
                            work_item.id,
                            step_id,
                        ),
                    )
            await self._start_step(
                conn,
                "tool_call",
                None,
                tool_data | {"project_id": project_id, "step_ids": step_ids},
                status="succeeded",
            )
            await conn.execute(
                """
                insert into public.work_item_history (
                  workspace_id, work_item_id, actor_type, actor_agent_id, kind, params, mark
                ) values (%s, %s, 'agent', 'nexo', 'team', %s, 'automatic')
                """,
                (
                    self.workspace_id,
                    work_item.id,
                    Jsonb(
                        {"agents": agents, "project_id": str(project_id) if project_id else None}
                    ),
                ),
            )
            message_id = await self._agent_message(
                conn, work_item.conversation_id, "nexo", plan.mensagem, []
            )
            await self._card(
                conn,
                message_id,
                {
                    "type": "team",
                    "agent_ids": agents,
                    "members": team,
                    "project_id": str(project_id) if project_id else None,
                    "actions": [],
                },
                work_item_id=work_item.id,
            )
            if live is not None:
                await conn.execute(
                    "update public.work_items set status_label = %s, next_step = %s "
                    "where id = %s and workspace_id = %s",
                    (live.status_label, live.next_step, work_item.id, self.workspace_id),
                )
            advanced = await fetchval(conn, "select app.advance_work_steps(%s)", (work_item.id,))
            await self._event(
                conn,
                "work.planned",
                {"project_id": project_id, "steps": len(step_ids), "agents": agents},
            )
            totals = await self._succeed(conn, model=model, prompt_version=prompt_version)
            await self._event(
                conn, "finished", {"status": "succeeded", "work_item_status": "in_progress"}
            )
        return {
            "project_id": project_id,
            "step_ids": step_ids,
            "message_id": message_id,
            "advanced": advanced,
            **totals,
        }

    async def wait_engine(
        self,
        *,
        work_item: WorkItem,
        agent_id: str,
        message: str,
        tool_data: dict[str, Any],
        reason: str,
        status: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """Etapa de imagem sem motor: aguarda o motor do dono (waiting_engine). Não falha, não
        cobra (sem captura, a reserva é liberada) e a próxima etapa que não depende dela segue."""
        async with self.pool.connection() as conn, conn.transaction():
            await self._fence(conn)
            await self._start_step(conn, "tool_call", None, tool_data, status="succeeded")
            await self._plan_step(conn, "waiting_engine", reason=reason)
            message_id = await self._agent_message(
                conn, work_item.conversation_id, agent_id, message, []
            )
            await self._event(
                conn,
                "step.waiting_engine",
                {"step_id": self.step_id, "agent_id": agent_id, "reason": reason, **(status or {})},
            )
            advanced = await fetchval(conn, "select app.advance_work_steps(%s)", (work_item.id,))
            work_status = await fetchval(
                conn,
                "select status::text from public.work_items where id = %s and workspace_id = %s",
                (work_item.id, self.workspace_id),
            )
            totals = await self._succeed(conn, model=None, prompt_version=None)
            await self._event(
                conn, "finished", {"status": "succeeded", "work_item_status": work_status}
            )
        return {
            "message_id": message_id,
            "advanced": advanced,
            "work_status": work_status,
            **totals,
        }

    async def reply(
        self, *, conversation_id: UUID, agent_id: str, body: str, model: str, prompt_version: str
    ) -> dict[str, Any]:
        """Resposta na conversa: a mensagem do especialista e o run concluído, juntos."""
        async with self.pool.connection() as conn, conn.transaction():
            await self._fence(conn)
            message_id = await self._agent_message(conn, conversation_id, agent_id, body, [])
            totals = await self._succeed(conn, model=model, prompt_version=prompt_version)
            await self._event(conn, "finished", {"status": "succeeded"})
        return {"message_id": message_id, **totals}

    async def retry_later(self, error: dict[str, Any]) -> None:
        async with self.pool.connection() as conn:
            await conn.execute(
                "update public.runs set status = 'queued', error = %s "
                "where id = %s and workspace_id = %s and status = 'running' and attempts = %s",
                (payload(error), self.run_id, self.workspace_id, self.attempt),
            )

    async def fail(self, error: dict[str, Any], *, work_item_id: UUID | None) -> str | None:
        """Falha definitiva: run failed com erro legível; trabalho e etapas abertas em failed."""
        async with self.pool.connection() as conn, conn.transaction():
            await self._fence(conn, statuses=("running", "queued"))
            await conn.execute(
                """
                update public.run_steps set status = 'failed'
                where run_id = %s and workspace_id = %s and status = 'running'
                """,
                (self.run_id, self.workspace_id),
            )
            await self._totals(conn)
            await conn.execute(
                "update public.runs set status = 'failed', finished_at = now(), error = %s "
                "where id = %s and workspace_id = %s",
                (payload(error), self.run_id, self.workspace_id),
            )
            work_status = None
            if work_item_id is not None:
                work_status = await fetchval(
                    conn,
                    "select status::text from public.work_items "
                    "where id = %s and workspace_id = %s for update",
                    (work_item_id, self.workspace_id),
                )
                if work_status == "in_progress":
                    await transition(conn, work_item_id, "failed", "system", None, "in_progress")
                    work_status = "failed"
                await conn.execute(
                    """
                    update public.work_item_steps
                    set status = 'failed', finished_at = now()
                    where work_item_id = %s and workspace_id = %s and status = 'in_progress'
                    """,
                    (work_item_id, self.workspace_id),
                )
            await self._event(
                conn, "failed", {"code": error.get("code"), "work_item_status": work_status}
            )
        return work_status

    async def release(self) -> None:
        """Encerramento do worker no meio do run: devolve à fila sem gastar tentativa."""
        async with self.pool.connection() as conn, conn.transaction():
            await conn.execute(
                """
                update public.run_steps
                set status = 'failed', payload = payload || '{"error": {"code": "worker_shutdown"}}'
                where run_id = %s and workspace_id = %s and status = 'running'
                """,
                (self.run_id, self.workspace_id),
            )
            await conn.execute(
                "update public.runs set status = 'queued', attempts = greatest(attempts - 1, 0) "
                "where id = %s and workspace_id = %s and status = 'running' and attempts = %s",
                (self.run_id, self.workspace_id, self.attempt),
            )

    async def _fence(
        self, conn: AsyncConnection[DictRow], statuses: tuple[str, ...] = ("running",)
    ) -> None:
        owned = await fetchone(
            conn,
            "select 1 as ok from public.runs where id = %s and workspace_id = %s "
            "and status::text = any(%s) and attempts = %s for update",
            (self.run_id, self.workspace_id, list(statuses), self.attempt),
        )
        if owned is None:
            raise RunLost(f"run {self.run_id} não está mais na tentativa {self.attempt}")

    async def _agent_message(
        self,
        conn: AsyncConnection[DictRow],
        conversation_id: UUID | None,
        agent_id: str,
        body: str,
        attachments: list[dict[str, Any]],
    ) -> UUID | None:
        if conversation_id is None:
            return None
        message_id = await fetchval(
            conn,
            "select (app.post_agent_message(%s, %s, %s, %s, %s, %s)).id",
            (
                self.workspace_id,
                conversation_id,
                agent_id,
                self.run_id,
                body,
                Jsonb(attachments),
            ),
        )
        await self._event(
            conn,
            "message.created",
            {"message_id": message_id, "conversation_id": conversation_id, "agent_id": agent_id},
        )
        return message_id

    async def _card(
        self,
        conn: AsyncConnection[DictRow],
        message_id: UUID | None,
        card: dict[str, Any],
        *,
        work_item_id: UUID | None = None,
        delivery_version_id: UUID | None = None,
        approval_id: UUID | None = None,
    ) -> None:
        """Cartão na mensagem do agente, ligado ao objeto (a pendência nasce depois da mensagem)."""
        if message_id is None:
            return
        await conn.execute(
            """
            update public.messages
            set card = %s, work_item_id = %s, delivery_version_id = %s, approval_id = %s
            where id = %s and workspace_id = %s and author_type = 'agent'
            """,
            (
                Jsonb(card),
                work_item_id,
                delivery_version_id,
                approval_id,
                message_id,
                self.workspace_id,
            ),
        )

    async def _totals(self, conn: AsyncConnection[DictRow]) -> dict[str, Any]:
        """Tokens e custo do run = soma das etapas (todas as tentativas: é o que foi gasto)."""
        return await fetchone(
            conn,
            """
            update public.runs r
            set input_tokens = s.input_tokens, output_tokens = s.output_tokens,
                cache_read_tokens = s.cache_read_tokens, cache_write_tokens = s.cache_write_tokens,
                cost_usd = s.cost_usd
            from (
              select coalesce(sum(input_tokens), 0) as input_tokens,
                     coalesce(sum(output_tokens), 0) as output_tokens,
                     coalesce(sum(cache_read_tokens), 0) as cache_read_tokens,
                     coalesce(sum(cache_write_tokens), 0) as cache_write_tokens,
                     coalesce(sum(cost_usd), 0) as cost_usd
              from public.run_steps where run_id = %s and workspace_id = %s
            ) s
            where r.id = %s and r.workspace_id = %s
            returning r.input_tokens, r.output_tokens, r.cache_read_tokens, r.cache_write_tokens,
                      r.cost_usd, r.credits_charged
            """,
            (self.run_id, self.workspace_id, self.run_id, self.workspace_id),
        )

    async def _succeed(
        self, conn: AsyncConnection[DictRow], *, model: str | None, prompt_version: str | None
    ) -> dict[str, Any]:
        totals = await self._totals(conn)
        await conn.execute(
            """
            update public.runs
            set status = 'succeeded', finished_at = now(), error = null, model = %s,
                prompt_version = %s
            where id = %s and workspace_id = %s and status = 'running'
            """,
            (model, prompt_version, self.run_id, self.workspace_id),
        )
        return dict(totals)


async def transition(
    conn: AsyncConnection[DictRow],
    work_item_id: UUID,
    to_status: str,
    actor_type: str,
    actor_id: str | None,
    expected_from: str,
) -> None:
    await conn.execute(
        "select app.transition_work_item(%s, %s::public.work_item_status, "
        "%s::public.audit_actor_type, %s, null, %s::public.work_item_status)",
        (work_item_id, to_status, actor_type, actor_id, expected_from),
    )


async def fetchone(
    conn: AsyncConnection[DictRow], query: str, params: tuple[Any, ...] = ()
) -> DictRow | None:
    return await (await conn.execute(query, params)).fetchone()


async def fetchval(conn: AsyncConnection[DictRow], query: str, params: tuple[Any, ...] = ()) -> Any:
    row = await fetchone(conn, query, params)
    return next(iter(row.values())) if row else None
