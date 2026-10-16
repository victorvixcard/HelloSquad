"""H2 alvo 5 — cobrança adversária, fora da árvore de testes do produto. Reaproveita os servidores falsos e as
fixtures da S2e (`apps/backend/tests/billing_fakes.py`, `test_billing.py`, `conftest.py`) e ataca o que os
testes da fatia fazem em sequência: webhooks idênticos e gêmeos (RECEIVED + CONFIRMED) em paralelo, assinatura
forjada ou de outro recurso, e dois schedulers renovando ao mesmo tempo. Cada teste reaplica o seed no fim.
Uso (raiz do repositório, sob a trava):
  flock -o -w 900 /tmp/hellosquad-db.lock bash -c 'cd apps/backend && PYTHONPATH=tests uv run pytest \
    ../../docs/parciais/h2/04_cobranca_test.py -p conftest -q -s -p no:cacheprovider --rootdir . -c pyproject.toml'
"""

import asyncio
from datetime import timedelta

import psycopg
import pytest
from psycopg.rows import dict_row
from test_billing import (  # noqa: F401 (fixtures da S2e)
    CARD,
    VITTA,
    balance,
    billing_api,
    billing_env,
    db,
    fakes,
    scalar,
    seed_state,
    webhook,
    workspace,
)

from hellosquad.billing import service
from hellosquad.billing.factory import build_provider
from hellosquad.billing.mock import MockProvider
from hellosquad.billing.renewal import renew_due_subscriptions
from hellosquad.config import get_settings

pytestmark = pytest.mark.integration


async def ledger_entries(db, payment_id) -> int:
    return await scalar(
        db, "select count(*) from public.credit_ledger where idempotency_key = %s", f"billing:payment:{payment_id}"
    )


async def test_asaas_parallel_duplicates_and_twin_events_grant_once(billing_api, fakes, db) -> None:
    vitta = await workspace(db, "vitta")
    provider = build_provider("asaas", get_settings(), fakes.http)
    payment = await service.buy_topup(db, provider, workspace_id=vitta, pack_slug="recarga-50", method="pix", customer=VITTA)
    before = await balance(db, vitta)
    pid = payment["provider_payment_id"]
    fakes.asaas.set_status(pid, "RECEIVED")
    same = fakes.asaas.webhook("PAYMENT_RECEIVED", payment_id=pid)
    twins = [fakes.asaas.webhook(ev, payment_id=pid) for ev in ("PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_CONFIRMED")]
    calls = [webhook(billing_api, "asaas", *same) for _ in range(10)] + [webhook(billing_api, "asaas", *t) for t in twins]
    responses = await asyncio.gather(*calls)
    outcomes = sorted((r.status_code, r.json().get("outcome"), r.json().get("duplicate")) for r in responses)
    after = await balance(db, vitta)
    events = await scalar(db, "select count(*) from public.payment_events where provider = 'asaas'")
    print(f"\nASAAS 10 idênticos + 3 gêmeos em paralelo: {outcomes}")
    print(f"ASAAS saldo {before} -> {after}; lançamentos do pagamento: {await ledger_entries(db, payment['id'])}; eventos gravados: {events}")
    assert after == before + 50
    assert await ledger_entries(db, payment["id"]) == 1


async def test_mercadopago_parallel_notifications_grant_the_cycle_once(billing_api, fakes, db) -> None:
    vitta = await workspace(db, "vitta")
    provider = build_provider("mercadopago", get_settings(), fakes.http)
    await service.subscribe(db, provider, workspace_id=vitta, plan_slug="squad", method="card", customer=VITTA, card=CARD)
    before = await balance(db, vitta)
    [authorized] = fakes.mercadopago.authorized.values()
    notes = [fakes.mercadopago.webhook("subscription_authorized_payment", authorized["id"], action="created") for _ in range(6)]
    same = notes[0]
    calls = [webhook(billing_api, "mercadopago", same[1], same[2], same[0]) for _ in range(6)]
    calls += [webhook(billing_api, "mercadopago", h, b, q) for q, h, b in notes[1:]]
    responses = await asyncio.gather(*calls)
    outcomes = sorted((r.status_code, r.json().get("outcome"), r.json().get("duplicate")) for r in responses)
    after = await balance(db, vitta)
    grants = await scalar(
        db, "select count(*) from public.payments p join public.credit_grants g on g.id = p.grant_id "
        "join public.workspaces w on w.id = p.workspace_id where w.slug = 'vitta'"
    )
    print(f"\nMP 6 idênticas + 5 notificações distintas do mesmo ciclo em paralelo: {outcomes}")
    print(f"MP saldo {before} -> {after}; grants de pagamento da Vitta: {grants}")
    assert grants == 1


async def test_forged_signatures_are_refused_and_not_recorded(billing_api, fakes, db) -> None:
    vitta = await workspace(db, "vitta")
    provider = build_provider("mercadopago", get_settings(), fakes.http)
    payment = await service.buy_topup(db, provider, workspace_id=vitta, pack_slug="recarga-50", method="pix", customer=VITTA)
    before_events = await scalar(db, "select count(*) from public.payment_events")
    q, h, b = fakes.mercadopago.webhook("payment", payment["provider_payment_id"])
    results = {}
    # assinatura válida de outro recurso, reaproveitada com o data.id deste pagamento
    q2, h2, b2 = fakes.mercadopago.webhook("payment", "999999999")
    results["mp_assinatura_de_outro_recurso"] = (await webhook(billing_api, "mercadopago", h2, b, q)).status_code
    results["mp_segredo_errado"] = (await webhook(billing_api, "mercadopago", *fakes.mercadopago.webhook("payment", payment["provider_payment_id"], secret="x" * 32)[1:], q)).status_code
    results["mp_sem_request_id"] = (await webhook(billing_api, "mercadopago", {k: v for k, v in h.items() if k != "x-request-id"}, b, q)).status_code
    results["mp_sem_assinatura"] = (await webhook(billing_api, "mercadopago", {"content-type": "application/json"}, b, q)).status_code
    results["mp_ts_de_2020_reenviado"] = (await webhook(billing_api, "mercadopago", *fakes.mercadopago.webhook("payment", payment["provider_payment_id"], ts="1577836800")[1:], q)).status_code
    ha, ba = fakes.asaas.webhook("PAYMENT_RECEIVED", token=None)
    results["asaas_sem_token"] = (await webhook(billing_api, "asaas", ha, ba)).status_code
    ha, ba = fakes.asaas.webhook("PAYMENT_RECEIVED", token="token-errado")
    results["asaas_token_errado"] = (await webhook(billing_api, "asaas", ha, ba)).status_code
    results["mock_assinatura_errada"] = (await billing_api.post("/billing/webhooks/mock", headers={"x-mock-signature": "sha256=00"}, content=b'{"id":"x"}')).status_code
    results["provedor_inexistente"] = (await billing_api.post("/billing/webhooks/stripe", content=b"{}")).status_code
    after_events = await scalar(db, "select count(*) from public.payment_events")
    print(f"\nassinaturas forjadas: {results}; eventos gravados {before_events} -> {after_events}")
    assert all(results[k] in (401, 403) for k in results if k not in ("provedor_inexistente", "mp_ts_de_2020_reenviado"))


async def test_two_schedulers_renew_at_the_same_time_grant_once(billing_api, fakes, db) -> None:
    vitta = await workspace(db, "vitta")
    provider = build_provider("asaas", get_settings(), fakes.http)
    subscription = await service.subscribe(db, provider, workspace_id=vitta, plan_slug="squad", method="pix", customer=VITTA)
    [first] = fakes.asaas.payments.values()
    fakes.asaas.set_status(first["id"], "RECEIVED")
    await webhook(billing_api, "asaas", *fakes.asaas.webhook("PAYMENT_RECEIVED", payment_id=first["id"]))
    period_end = await scalar(db, "select current_period_end from public.subscriptions where id = %s", subscription["id"])
    second = fakes.asaas.next_cycle(subscription["provider_subscription_id"])
    fakes.asaas.set_status(second["id"], "RECEIVED")
    later = period_end + timedelta(days=1)
    providers = {"asaas": provider, "mock": MockProvider(webhook_secret=None)}
    url = get_settings().database_url.get_secret_value()
    async with await psycopg.AsyncConnection.connect(url, autocommit=True, row_factory=dict_row) as c1, \
            await psycopg.AsyncConnection.connect(url, autocommit=True, row_factory=dict_row) as c2:
        r1, r2 = await asyncio.gather(
            renew_due_subscriptions(c1, providers, now=later),
            renew_due_subscriptions(c2, providers, now=later),
            return_exceptions=True,
        )
    grants = await scalar(
        db, "select count(*) from public.payments p join public.credit_grants g on g.id = p.grant_id "
        "where p.subscription_id = %s and g.origin = 'plan_cycle'", subscription["id"]
    )
    print(f"\ndois schedulers: {r1!r} | {r2!r}; grants de ciclo da assinatura: {grants}")
    assert grants == 2  # o primeiro ciclo (webhook) + o renovado, uma vez só
