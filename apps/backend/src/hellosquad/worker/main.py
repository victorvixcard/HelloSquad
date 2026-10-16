"""Entrypoint `hellosquad-worker`: consome `runs_interactive` (pgmq) e executa o fluxo do squad; com
vaga sobrando, consome `memory_reflect` (reflexão do trabalho fechado, S2c).

Cada mensagem fica invisível por WORKER_VISIBILITY_TIMEOUT_SECONDS; o batimento estende o prazo
enquanto o run roda. Concluído: `delete`. Falha passageira: o run volta para queued e a mensagem
reaparece depois do backoff, até WORKER_MAX_ATTEMPTS. Falha definitiva: run failed e `archive`.
SIGTERM/SIGINT: para de ler, espera os runs em andamento e devolve à fila o que não terminar.
"""

import argparse
import asyncio
import contextlib
import logging
import math
import signal
from typing import Any
from uuid import UUID

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from hellosquad.config import Settings, get_settings
from hellosquad.creative.image_engine import build_image_engine
from hellosquad.i18n import DEFAULT_LOCALE, catalog, t
from hellosquad.llm.base import LLMClient, LLMError
from hellosquad.llm.factory import build_llm_client
from hellosquad.memory.embeddings import build_embeddings
from hellosquad.research.websearch import WebSearch, build_web_search
from hellosquad.runtime import configure_logging
from hellosquad.squad.flow import FlowError, Squad, run_flow, run_reply
from hellosquad.squad.loader import SquadLoader
from hellosquad.squad.reflect import PromotionRules, ReflectionStore, run_reflection
from hellosquad.squad.store import Claim, RunLost, RunStore, redact

log = logging.getLogger("hellosquad.worker")

QUEUE = "runs_interactive"
REFLECT_QUEUE = "memory_reflect"
CAPPED_DELAY_SECONDS = 5


class WorkerConfigError(RuntimeError):
    pass


class AttemptsExhausted(Exception):
    """O run já gastou todas as tentativas (inclusive em worker que morreu no meio)."""


class CreditsRefused(Exception):
    """A reserva de créditos foi recusada ao começar (sem saldo ou sem preço): nada é cobrado."""

    def __init__(self, code: str, details: dict[str, Any]) -> None:
        super().__init__(code)
        self.code = code
        self.details = details


def worker_conninfo(settings: Settings) -> str:
    if settings.worker_database_url is not None:
        return settings.worker_database_url.get_secret_value()
    if settings.app_env in ("local", "test") and settings.database_url is not None:
        return settings.database_url.get_secret_value()
    raise WorkerConfigError("WORKER_DATABASE_URL vazio (em local/test o worker usa DATABASE_URL).")


def classify(exc: BaseException) -> tuple[bool, str, dict[str, Any]]:
    if isinstance(exc, LLMError):
        return exc.transient, exc.code, exc.details
    if isinstance(exc, FlowError):
        return False, exc.code, exc.details
    if isinstance(exc, AttemptsExhausted):
        return False, "attempts_exhausted", {}
    if isinstance(exc, CreditsRefused):
        return False, exc.code, exc.details
    if isinstance(exc, psycopg.OperationalError):
        return True, "database_unavailable", {"error_type": type(exc).__name__}
    return True, "internal", {"error_type": type(exc).__name__}


def error_message(locale: str, code: str, attempts: int) -> str:
    key = f"run_error.{code}"
    if key not in catalog(DEFAULT_LOCALE):
        key = "run_error.internal"
    return t(locale, key, attempts=attempts)


class Worker:
    def __init__(
        self,
        settings: Settings,
        *,
        llm: LLMClient | None = None,
        loader: SquadLoader | None = None,
        web_search: WebSearch | None = None,
    ) -> None:
        self.settings = settings
        api_key = settings.web_search_api_key
        self.squad = Squad(
            loader=loader or SquadLoader(settings.squad_dir),
            llm=llm or build_llm_client(settings),
            prices=settings.llm_prices,
            history_limit=settings.worker_history_messages,
            memory_budget=settings.memory_context_tokens,
            learning_top_k=settings.learning_top_k,
            learning_review_days=settings.learning_review_days,
            embeddings=build_embeddings(settings.embeddings_provider),
            image_engine=build_image_engine(settings.image_engine_provider),
            web_search=web_search
            or build_web_search(
                settings.web_search_provider,
                api_key.get_secret_value() if api_key else None,
                timeout=settings.web_search_timeout_seconds,
            ),
        )
        self.pool = AsyncConnectionPool(
            worker_conninfo(settings),
            min_size=1,
            max_size=settings.worker_concurrency * 2 + 1,
            open=False,
            kwargs={"autocommit": True, "prepare_threshold": None, "row_factory": dict_row},
            check=AsyncConnectionPool.check_connection,
            name="hellosquad-worker",
        )
        self.stopping = asyncio.Event()
        self.inflight: set[asyncio.Task[str]] = set()

    async def __aenter__(self) -> "Worker":
        await self.pool.open(wait=True, timeout=10)
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.pool.close()

    # ------------------------------------------------------------------------------------------
    # Fila
    # ------------------------------------------------------------------------------------------

    async def read(self, qty: int, queue: str = QUEUE) -> list[dict[str, Any]]:
        async with self.pool.connection() as conn:
            cursor = await conn.execute(
                "select msg_id, read_ct, message from pgmq.read(%s, %s, %s)",
                (queue, self.settings.worker_visibility_timeout_seconds, qty),
            )
            return await cursor.fetchall()

    async def queue_call(self, function: str, msg_id: int, *args: int, queue: str = QUEUE) -> None:
        placeholders = ", ".join(["%s"] * (2 + len(args)))
        async with self.pool.connection() as conn:
            await conn.execute(f"select pgmq.{function}({placeholders})", (queue, msg_id, *args))

    # ------------------------------------------------------------------------------------------
    # Um run
    # ------------------------------------------------------------------------------------------

    async def handle(self, msg: dict[str, Any]) -> str:
        msg_id, message = msg["msg_id"], msg["message"] or {}
        try:
            run_id, workspace_id = UUID(message["run_id"]), UUID(message["workspace_id"])
        except (KeyError, TypeError, ValueError):
            log.error("mensagem %s sem run_id ou workspace_id válidos: arquivada", msg_id)
            await self.queue_call("archive", msg_id)
            return "invalid"

        store = RunStore(self.pool, workspace_id=workspace_id, run_id=run_id)
        claim = await store.begin(
            workspace_cap=self.settings.worker_workspace_cap,
            lease_seconds=self.settings.worker_visibility_timeout_seconds,
            max_attempts=self.settings.worker_max_attempts,
        )
        if claim.outcome in ("finished", "missing", "skipped"):
            await self.queue_call("delete", msg_id)
            log.info(
                "run %s: %s, nada a fazer (mensagem %s apagada)", run_id, claim.outcome, msg_id
            )
            return claim.outcome
        if claim.outcome == "busy":
            log.info("run %s em execução em outro worker; a mensagem %s espera", run_id, msg_id)
            return "busy"
        if claim.outcome == "capped":
            await self.queue_call("set_vt", msg_id, CAPPED_DELAY_SECONDS)
            log.info(
                "workspace %s no teto de %s runs simultâneos; run %s volta em %ss",
                workspace_id,
                self.settings.worker_workspace_cap,
                run_id,
                CAPPED_DELAY_SECONDS,
            )
            return "capped"
        if claim.outcome == "waiting":
            await self.queue_call("set_vt", msg_id, CAPPED_DELAY_SECONDS)
            log.info(
                "run %s: outro especialista está respondendo nesta conversa; volta em %ss",
                run_id,
                CAPPED_DELAY_SECONDS,
            )
            return "waiting"
        if claim.outcome == "exhausted":
            return await self.failed(store, msg_id, claim, AttemptsExhausted())
        if claim.outcome == "unbillable":
            return await self.failed(store, msg_id, claim, CreditsRefused(**claim.error))

        log.info(
            "run %s (workspace %s, %s): tentativa %s de %s",
            run_id,
            workspace_id,
            claim.agent_id,
            claim.attempts,
            self.settings.worker_max_attempts,
        )
        heartbeat = asyncio.create_task(self.heartbeat(store, msg_id))
        try:
            flow = run_reply if claim.work_item_id is None else run_flow
            result = await flow(self.squad, store)
        except asyncio.CancelledError:
            await asyncio.shield(self.release(store, msg_id))
            raise
        except RunLost:
            log.warning(
                "run %s foi retomado por outro worker; este resultado foi descartado", run_id
            )
            return "lost"
        except Exception as exc:
            return await self.failed(store, msg_id, claim, exc)
        finally:
            heartbeat.cancel()
        await self.queue_call("delete", msg_id)
        log.info("run %s concluído: %s", run_id, summary(result))
        return result["outcome"]

    # ------------------------------------------------------------------------------------------
    # Uma reflexão (fila memory_reflect)
    # ------------------------------------------------------------------------------------------

    async def handle_reflection(self, msg: dict[str, Any]) -> str:
        msg_id, message = msg["msg_id"], msg["message"] or {}
        try:
            reflection_id = UUID(message["reflection_id"])
            workspace_id = UUID(message["workspace_id"])
        except (KeyError, TypeError, ValueError):
            log.error("reflexão %s sem reflection_id ou workspace_id válidos: arquivada", msg_id)
            await self.queue_call("archive", msg_id, queue=REFLECT_QUEUE)
            return "invalid"
        store = ReflectionStore(self.pool, workspace_id=workspace_id, reflection_id=reflection_id)
        state, claim = await store.claim(self.settings.worker_max_attempts)
        if claim is None:
            if state == "exhausted":
                await store.fail({"code": "attempts_exhausted"})
            await self.queue_call("delete", msg_id, queue=REFLECT_QUEUE)
            return state
        rules = PromotionRules(
            min_confidence=self.settings.learning_promotion_confidence,
            repeats=self.settings.learning_promotion_repeats,
        )
        try:
            result = await run_reflection(self.squad, store, claim, rules)
        except Exception as exc:
            transient, code, details = classify(exc)
            if code == "internal":
                log.exception("reflexão %s: erro inesperado", reflection_id)
            error = {"code": code, "attempts": claim.attempts, "details": redact(details)}
            if transient and claim.attempts < self.settings.worker_max_attempts:
                delay = self.settings.worker_retry_base_seconds * 2 ** (claim.attempts - 1)
                await store.retry_later(error)
                await self.queue_call("set_vt", msg_id, math.ceil(delay), queue=REFLECT_QUEUE)
                log.warning("reflexão %s: %s; nova tentativa em %ss", reflection_id, code, delay)
                return "retry"
            await store.fail(error)
            await self.queue_call("archive", msg_id, queue=REFLECT_QUEUE)
            log.error("reflexão %s falhou (%s); mensagem %s arquivada", reflection_id, code, msg_id)
            return "failed"
        await self.queue_call("delete", msg_id, queue=REFLECT_QUEUE)
        log.info(
            "reflexão %s do trabalho %s: %s aprendizado(s) gravado(s)",
            reflection_id,
            result["work_item_id"],
            len(result["learnings"]),
        )
        return result["outcome"]

    async def drain_reflections(self, max_rounds: int = 100) -> list[str]:
        """Processa a fila memory_reflect até não ter mensagem visível (testes e `--drain`)."""
        outcomes: list[str] = []
        for _ in range(max_rounds):
            batch = await self.read(self.settings.worker_concurrency, REFLECT_QUEUE)
            if not batch:
                break
            outcomes += await asyncio.gather(*(self.handle_reflection(m) for m in batch))
        return outcomes

    async def heartbeat(self, store: RunStore, msg_id: int) -> None:
        timeout = self.settings.worker_visibility_timeout_seconds
        while True:
            await asyncio.sleep(max(timeout / 3, 1))
            try:
                await store.touch()
                await self.queue_call("set_vt", msg_id, timeout)
            except Exception:
                log.warning("batimento do run %s falhou", store.run_id, exc_info=True)

    async def release(self, store: RunStore, msg_id: int) -> None:
        await store.release()
        await self.queue_call("set_vt", msg_id, 0)
        log.warning("run %s devolvido à fila no encerramento do worker", store.run_id)

    async def failed(self, store: RunStore, msg_id: int, claim: Claim, exc: Exception) -> str:
        transient, code, details = classify(exc)
        if code == "internal":
            log.exception("run %s: erro inesperado", store.run_id)
        error = {
            "code": code,
            "message": error_message(claim.locale, code, claim.attempts),
            "attempts": claim.attempts,
            "details": redact(details),
        }
        if transient and claim.attempts < self.settings.worker_max_attempts:
            delay = self.settings.worker_retry_base_seconds * 2 ** (claim.attempts - 1)
            await store.retry_later(error | {"retry_in_seconds": delay})
            await self.queue_call("set_vt", msg_id, math.ceil(delay))
            log.warning(
                "run %s: %s na tentativa %s; nova tentativa em %ss",
                store.run_id,
                code,
                claim.attempts,
                delay,
            )
            return "retry"
        work_status = await store.fail(error, work_item_id=claim.work_item_id)
        await self.queue_call("archive", msg_id)
        log.error(
            "run %s falhou (%s, tentativa %s); trabalho em %s; mensagem %s arquivada",
            store.run_id,
            code,
            claim.attempts,
            work_status,
            msg_id,
        )
        return "failed"

    # ------------------------------------------------------------------------------------------
    # Laços
    # ------------------------------------------------------------------------------------------

    async def drain(self, max_rounds: int = 100) -> list[str]:
        """Processa até a fila não ter mensagem visível (testes e `--drain`)."""
        outcomes: list[str] = []
        for _ in range(max_rounds):
            batch = await self.read(self.settings.worker_concurrency)
            if not batch:
                break
            outcomes += await asyncio.gather(*(self.handle(m) for m in batch))
        return outcomes

    def stop(self) -> None:
        if not self.stopping.is_set():
            log.info("sinal de encerramento recebido: parando de ler a fila")
        self.stopping.set()

    async def serve(self, *, handle_signals: bool = True) -> None:
        if handle_signals:
            loop = asyncio.get_running_loop()
            for sig in (signal.SIGINT, signal.SIGTERM):
                loop.add_signal_handler(sig, self.stop)
        log.info(
            "worker no ar: fila %s, concorrência %s, teto por workspace %s, LLM %s",
            QUEUE,
            self.settings.worker_concurrency,
            self.settings.worker_workspace_cap,
            self.squad.llm.provider,
        )
        while not self.stopping.is_set():
            free = self.settings.worker_concurrency - len(self.inflight)
            if free <= 0:
                await self.wait_for_slot()
                continue
            try:
                batch = await self.read(free)
                reflections = (
                    await self.read(free - len(batch), REFLECT_QUEUE) if len(batch) < free else []
                )
            except psycopg.OperationalError:
                log.warning("banco indisponível ao ler a fila; nova leitura em instantes")
                batch, reflections = [], []
            if not batch and not reflections:
                await self.pause(self.settings.worker_poll_seconds)
                continue
            jobs = [self.handle(m) for m in batch] + [
                self.handle_reflection(m) for m in reflections
            ]
            for job in jobs:
                task = asyncio.create_task(job)
                self.inflight.add(task)
                task.add_done_callback(self.task_done)
        await self.shutdown()

    def task_done(self, task: asyncio.Task[str]) -> None:
        self.inflight.discard(task)
        if not task.cancelled() and task.exception() is not None:
            log.error("falha ao processar mensagem da fila", exc_info=task.exception())

    async def wait_for_slot(self) -> None:
        stop = asyncio.create_task(self.stopping.wait())
        await asyncio.wait({*self.inflight, stop}, return_when=asyncio.FIRST_COMPLETED)
        stop.cancel()

    async def pause(self, seconds: float) -> None:
        with contextlib.suppress(TimeoutError):
            await asyncio.wait_for(self.stopping.wait(), timeout=seconds)

    async def shutdown(self) -> None:
        if self.inflight:
            grace = self.settings.worker_shutdown_grace_seconds
            log.info("esperando %s run(s) em andamento por até %ss", len(self.inflight), grace)
            _, pending = await asyncio.wait(set(self.inflight), timeout=grace)
            for task in pending:
                task.cancel()
            await asyncio.gather(*pending, return_exceptions=True)
        log.info("worker encerrado")


def summary(result: dict[str, Any]) -> str:
    cost = (
        f"{result['input_tokens']} tokens de entrada, {result['output_tokens']} de saída, "
        f"{result['cache_read_tokens']} lidos e {result['cache_write_tokens']} gravados no cache, "
        f"US$ {result['cost_usd']}"
    )
    if result["outcome"] == "replied":
        return f"{result['agent_id']} respondeu na conversa; {cost}"
    if result["outcome"] == "asked":
        missing = ", ".join(result["missing"])
        return f"briefing incompleto ({missing}); pergunta enviada, trabalho em needs_you; {cost}"
    if result["outcome"] == "planned":
        return f"equipe com {result['steps']} etapas; primeira: {result['advanced']}; {cost}"
    if result["outcome"] == "waiting_engine":
        return f"etapa aguarda o motor de imagem; seguinte: {result['advanced']}; {cost}"
    revised = ", revisada uma vez na autoverificação" if result.get("revisions") else ""
    return (
        f"entrega v{result['version_no']}{revised}; revisão pedida, trabalho em needs_you; "
        f"{result['credits_charged']} créditos cobrados; {cost}"
    )


async def main(settings: Settings, *, drain: bool) -> None:
    async with Worker(settings) as worker:
        if drain:
            outcomes = await worker.drain()
            log.info("fila esvaziada: %s mensagem(ns) tratada(s) %s", len(outcomes), outcomes)
            reflections = await worker.drain_reflections()
            log.info("reflexões: %s mensagem(ns) tratada(s) %s", len(reflections), reflections)
        else:
            await worker.serve()


def run() -> None:
    parser = argparse.ArgumentParser(prog="hellosquad-worker", description=__doc__)
    parser.add_argument("--drain", action="store_true", help="processa a fila até esvaziar e sai")
    args = parser.parse_args()
    settings = get_settings()
    configure_logging(settings.log_level)
    asyncio.run(main(settings, drain=args.drain))
