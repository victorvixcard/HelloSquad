"""Leituras e escritas do runtime com o papel privilegiado.

O papel ignora a RLS, então cada consulta filtra pelo workspace_id que veio da fila (RunStore é
amarrado a um workspace e a um run). A conexão sai do pool só durante a escrita; nenhuma fica
presa enquanto o modelo pensa. As mudanças de estado de um desfecho (entrega, pergunta, falha)
vão numa transação só: ou tudo aparece para o usuário, ou nada.
"""

import json
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from psycopg import AsyncConnection
from psycopg.rows import DictRow
from psycopg.types.json import Jsonb
from psycopg_pool import AsyncConnectionPool

from hellosquad.llm.base import Usage
from hellosquad.squad.loader import SquadPrompt
from hellosquad.squad.prompt import HistoryMessage

FINISHED_RUN = {"succeeded", "failed", "cancelled", "waiting_approval"}
RUNNABLE_WORK = {"draft", "in_progress", "failed"}
REDACTED_KEYS = ("key", "token", "secret", "password", "authorization", "cookie")

ClaimOutcome = Literal["claimed", "finished", "busy", "capped", "missing", "skipped", "exhausted"]


class RunLost(RuntimeError):
    """O run foi retomado por outro worker (tentativa nova): este resultado não vale mais."""


@dataclass(frozen=True)
class Claim:
    outcome: ClaimOutcome
    attempts: int = 0
    agent_id: str | None = None
    work_item_id: UUID | None = None
    locale: str = "pt-BR"


@dataclass(frozen=True)
class WorkItem:
    id: UUID
    status: str
    title: str
    briefing: dict[str, Any]
    delivery_type: str | None
    conversation_id: UUID | None
    origin_message_id: UUID | None


@dataclass(frozen=True)
class RunData:
    agent_id: str
    attempts: int
    work_item: WorkItem
    workspace_name: str
    locale: str
    request: str
    history: list[HistoryMessage]
    brand_facts: list[str]


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
                select r.status, r.attempts, r.agent_id, r.work_item_id, s.locale,
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
            return Claim("claimed", attempts, run["agent_id"], run["work_item_id"], run["locale"])

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
                       w.delivery_type, w.conversation_id, w.origin_message_id,
                       s.name as workspace_name, s.locale, m.body as request
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
            facts = await self._brand_facts(conn)
        item = WorkItem(
            id=row["work_item_id"],
            status=row["status"],
            title=row["title"],
            briefing=row["briefing"] or {},
            delivery_type=row["delivery_type"],
            conversation_id=row["conversation_id"],
            origin_message_id=row["origin_message_id"],
        )
        return RunData(
            agent_id=row["agent_id"],
            attempts=row["attempts"],
            work_item=item,
            workspace_name=row["workspace_name"],
            locale=row["locale"],
            request=row["request"] or row["title"],
            history=history,
            brand_facts=facts,
        )

    async def _brand_facts(self, conn: AsyncConnection[DictRow]) -> list[str]:
        """Bloco fixo da marca enquanto a memória (S1d) não chega: brand_profiles, se existir."""
        exists = await fetchval(conn, "select to_regclass('public.brand_profiles') is not null")
        if not exists:
            return []
        profile = await fetchval(
            conn,
            "select to_jsonb(p) - 'id' - 'workspace_id' - 'created_at' - 'updated_at' "
            "from public.brand_profiles p where p.workspace_id = %s limit 1",
            (self.workspace_id,),
        )
        return [f"{k}: {v}" for k, v in sorted((profile or {}).items()) if isinstance(v, str) and v]

    async def ensure_prompt_version(self, prompt: SquadPrompt) -> str:
        async with self.pool.connection() as conn:
            await conn.execute(
                """
                insert into public.agent_prompt_versions (
                  agent_id, content_hash, delivery_type, files
                )
                values (%s, %s, %s, %s)
                on conflict (agent_id, content_hash) do nothing
                """,
                (
                    prompt.agent.id,
                    prompt.content_hash,
                    prompt.skill.delivery_type,
                    Jsonb(prompt.files),
                ),
            )
        return prompt.content_hash

    # ------------------------------------------------------------------------------------------
    # Etapas, eventos e etapas do trabalho
    # ------------------------------------------------------------------------------------------

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
        """Etapa do trabalho com o agente responsável. Repetir (nova tentativa) atualiza a mesma."""
        async with self.pool.connection() as conn:
            await self._work_step(conn, work_item_id, title, agent_id, status)

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
    ) -> dict[str, Any]:
        """Entrega pronta: versão, mensagem do agente, revisão pedida, trabalho em needs_you."""
        async with self.pool.connection() as conn, conn.transaction():
            await self._fence(conn)
            delivery = await fetchone(
                conn,
                """
                select id, current_version_id from public.deliveries
                where workspace_id = %s and work_item_id = %s and kind = %s
                order by created_at, id
                limit 1
                for update
                """,
                (self.workspace_id, work_item.id, kind),
            )
            if delivery is None:
                delivery = await fetchone(
                    conn,
                    "insert into public.deliveries (workspace_id, work_item_id, kind) "
                    "values (%s, %s, %s) returning id, current_version_id",
                    (self.workspace_id, work_item.id, kind),
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
            message_id = await self._agent_message(
                conn,
                work_item,
                agent_id,
                message,
                [{"type": "delivery_version", **{k: str(v) for k, v in ids.items()}}],
            )
            approval_id = await fetchval(
                conn,
                """
                insert into public.approvals (
                  workspace_id, work_item_id, delivery_version_id, run_id, kind,
                  requested_by_agent_id
                ) values (%s, %s, %s, %s, 'review', %s)
                returning id
                """,
                (self.workspace_id, work_item.id, version["id"], self.run_id, agent_id),
            )
            await self._event(
                conn, "approval.requested", {"approval_id": approval_id, "kind": "review"}
            )
            await transition(conn, work_item.id, "needs_you", "agent", agent_id, "in_progress")
            await self._work_step(conn, work_item.id, work_step_title, agent_id, "done")
            totals = await self._succeed(conn, model=model, prompt_version=prompt_version)
            await self._event(
                conn, "finished", {"status": "succeeded", "work_item_status": "needs_you"}
            )
        return ids | {"message_id": message_id, "approval_id": approval_id, **totals}

    async def ask(
        self,
        *,
        work_item: WorkItem,
        agent_id: str,
        question: str,
        tool_data: dict[str, Any],
        model: str,
    ) -> dict[str, Any]:
        """Briefing incompleto: o agente pergunta, a resposta fica pedida e o trabalho espera.

        O especialista do run não chegou a rodar: runs.prompt_version fica nulo e a versão do Nexo
        fica na etapa da triagem.
        """
        async with self.pool.connection() as conn, conn.transaction():
            await self._fence(conn)
            await self._start_step(conn, "tool_call", None, tool_data, status="succeeded")
            message_id = await self._agent_message(conn, work_item, agent_id, question, [])
            approval_id = await fetchval(
                conn,
                """
                insert into public.approvals (
                  workspace_id, work_item_id, run_id, kind, requested_by_agent_id
                ) values (%s, %s, %s, 'respond', %s)
                returning id
                """,
                (self.workspace_id, work_item.id, self.run_id, agent_id),
            )
            await self._event(
                conn, "approval.requested", {"approval_id": approval_id, "kind": "respond"}
            )
            await transition(conn, work_item.id, "needs_you", "agent", agent_id, "in_progress")
            totals = await self._succeed(conn, model=model, prompt_version=None)
            await self._event(
                conn, "finished", {"status": "succeeded", "work_item_status": "needs_you"}
            )
        return {"message_id": message_id, "approval_id": approval_id, **totals}

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
        work_item: WorkItem,
        agent_id: str,
        body: str,
        attachments: list[dict[str, Any]],
    ) -> UUID | None:
        if work_item.conversation_id is None:
            return None
        message_id = await fetchval(
            conn,
            "select (app.post_agent_message(%s, %s, %s, %s, %s, %s)).id",
            (
                self.workspace_id,
                work_item.conversation_id,
                agent_id,
                self.run_id,
                body,
                Jsonb(attachments),
            ),
        )
        await self._event(
            conn,
            "message.created",
            {
                "message_id": message_id,
                "conversation_id": work_item.conversation_id,
                "agent_id": agent_id,
            },
        )
        return message_id

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
                      r.cost_usd
            """,
            (self.run_id, self.workspace_id, self.run_id, self.workspace_id),
        )

    async def _succeed(
        self, conn: AsyncConnection[DictRow], *, model: str, prompt_version: str | None
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
