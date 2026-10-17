"""Entrypoint `hellosquad-scheduler`: a cada tick (60 s), as responsabilidades vencidas do Modo
Autônomo (S3b) e a renovação mensal das assinaturas (S2e).

`--once` roda um tick e sai (roteiro local). Em local/test usa DATABASE_URL, como o worker.
"""

import argparse
import asyncio
import contextlib
import logging
import signal

import httpx
import psycopg
from psycopg.rows import dict_row

from hellosquad.autonomy.scheduler import run_due_responsibilities
from hellosquad.billing.factory import configured_providers
from hellosquad.billing.renewal import renew_due_subscriptions
from hellosquad.config import Settings, get_settings
from hellosquad.runtime import configure_logging
from hellosquad.worker.main import worker_conninfo

log = logging.getLogger("hellosquad.scheduler")


async def main(settings: Settings, *, once: bool) -> None:
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)
    async with (
        await psycopg.AsyncConnection.connect(
            worker_conninfo(settings), autocommit=True, prepare_threshold=None, row_factory=dict_row
        ) as conn,
        httpx.AsyncClient(timeout=settings.payment_timeout_seconds) as http,
    ):
        providers = configured_providers(settings, http)
        log.info(
            "scheduler iniciado, intervalo de %ss; provedores de pagamento: %s",
            settings.scheduler_tick_seconds,
            ", ".join(sorted(providers)) or "nenhum",
        )
        while True:
            autonomy = await run_due_responsibilities(
                conn, retry_minutes=settings.autonomy_retry_minutes
            )
            if autonomy.total:
                log.info(
                    "modo autônomo: %s em andamento, %s não executadas, %s para nova tentativa, "
                    "%s falharam",
                    autonomy.started,
                    autonomy.skipped,
                    autonomy.retried,
                    autonomy.failed,
                )
            report = await renew_due_subscriptions(
                conn, providers, recheck_minutes=settings.billing_recheck_minutes
            )
            if not report.skipped:
                log.info(
                    "renovação: %s vencidas, %s renovadas, %s em atraso, %s falhas de conciliação",
                    report.checked,
                    report.renewed,
                    report.past_due,
                    report.provider_errors,
                )
            if once or stop.is_set():
                break
            with contextlib.suppress(TimeoutError):
                await asyncio.wait_for(stop.wait(), settings.scheduler_tick_seconds)
            if stop.is_set():
                break
    log.info("scheduler encerrado")


def run() -> None:
    parser = argparse.ArgumentParser(prog="hellosquad-scheduler")
    parser.add_argument("--once", action="store_true", help="roda um tick e sai")
    args = parser.parse_args()
    settings = get_settings()
    configure_logging(settings.log_level)
    asyncio.run(main(settings, once=args.once))
