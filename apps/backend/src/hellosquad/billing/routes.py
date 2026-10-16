"""Cobrança: webhook dos provedores (sem usuário, assinatura obrigatória) e leitura da assinatura e
dos pagamentos para o menu da conta (só o owner, sem valores em dinheiro)."""

import logging
from typing import Annotated
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, Request
from psycopg.types.json import Jsonb

from hellosquad.api.deps import CurrentPrincipal, DatabaseDep, ensure_workspace
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.api.pagination import CursorQuery, decode_cursor, limit_query, split_page
from hellosquad.billing.factory import build_provider
from hellosquad.billing.provider import (
    InvalidWebhookPayload,
    InvalidWebhookSignature,
    PaymentProviderError,
    ProviderName,
)
from hellosquad.billing.schemas import PaymentPage, SubscriptionState, WebhookReceipt
from hellosquad.config import get_settings

log = logging.getLogger("hellosquad.billing")
router = APIRouter(tags=["billing"])

APPLY_EVENT = "select * from app.billing_apply_event(%s, %s)"
IS_OWNER = "select %s in (select app.current_user_workspace_ids('owner')) as owner"
SUBSCRIPTION = """
select s.status::text as status, p.name as plan, v.provisional, s.provider::text as provider,
       s.method::text as method, s.current_period_start, s.current_period_end,
       s.past_due_since, s.cancelled_at
from public.subscriptions s
join public.plan_versions v on v.id = s.plan_version_id
join public.plans p on p.id = v.plan_id
where s.workspace_id = %s
order by (s.status <> 'cancelled') desc, s.created_at desc
limit 1
"""
PAYMENTS = """
select p.id, p.kind::text as kind, p.method::text as method, p.status::text as status,
       p.provider::text as provider, p.credits, p.credits_revoked, p.period_start, p.period_end,
       p.confirmed_at, p.created_at
from public.payments p
where p.workspace_id = %(workspace_id)s
  and (%(cursor_at)s::timestamptz is null or (p.created_at, p.id) < (%(cursor_at)s, %(cursor_id)s))
order by p.created_at desc, p.id desc
limit %(limit)s
"""


def get_payment_http(request: Request) -> httpx.AsyncClient:
    return request.app.state.payment_http


PaymentHttpDep = Annotated[httpx.AsyncClient, Depends(get_payment_http)]


@router.post(
    "/billing/webhooks/{provider}",
    summary="Webhook de pagamento (Asaas, Mercado Pago, simulado): idempotente por event_id",
    description=(
        "Sem token de usuário: a origem é verificada pela assinatura do provedor (Asaas: "
        "`asaas-access-token`; Mercado Pago: `x-signature` e `x-request-id`; simulado: "
        "`x-mock-signature`). Evento repetido responde 200 com `duplicate: true` e não repete "
        "efeito."
    ),
    responses=error_responses(401, 404, 422, 503),
)
async def receive_webhook(
    provider: ProviderName, request: Request, db: DatabaseDep, http: PaymentHttpDep
) -> WebhookReceipt:
    try:
        adapter = build_provider(provider, get_settings(), http)
    except PaymentProviderError as exc:
        raise ApiError(404, "provider_not_available", "error.provider_not_available") from exc
    body = await request.body()
    try:
        event = await adapter.parse_webhook(
            headers=request.headers, query=request.query_params, body=body
        )
    except InvalidWebhookSignature as exc:
        log.warning("webhook de %s recusado: %s", provider, exc)
        raise ApiError(401, "invalid_signature", "error.invalid_signature") from exc
    except InvalidWebhookPayload as exc:
        raise ApiError(422, "invalid_payload", "error.invalid_payload") from exc
    except PaymentProviderError as exc:
        log.warning("webhook de %s: consulta ao provedor falhou (%s)", provider, exc.code)
        raise ApiError(503, "provider_unavailable", "error.provider_unavailable") from exc
    async with db.transaction_as_billing() as conn:
        row = await (await conn.execute(APPLY_EVENT, (provider, Jsonb(event.as_json())))).fetchone()
    log.info(
        "webhook %s %s (%s): %s%s",
        provider,
        event.event_type,
        event.event_id,
        row["outcome"],
        " (repetido)" if row["duplicate"] else "",
    )
    return WebhookReceipt(duplicate=row["duplicate"], outcome=row["outcome"])


async def _ensure_owner(conn, workspace_id: UUID) -> None:
    await ensure_workspace(conn, workspace_id)
    if not (await (await conn.execute(IS_OWNER, (workspace_id,))).fetchone())["owner"]:
        raise ApiError(403, "owner_only", "error.billing_owner_only")


@router.get(
    "/workspaces/{workspace_id}/billing/subscription",
    summary="Estado da assinatura e próximo ciclo (só o owner; sem valores em dinheiro)",
    responses=error_responses(401, 403, 404, 422, 503),
)
async def get_subscription(
    workspace_id: UUID, principal: CurrentPrincipal, db: DatabaseDep
) -> SubscriptionState:
    async with db.transaction_as(principal) as conn:
        await _ensure_owner(conn, workspace_id)
        row = await (await conn.execute(SUBSCRIPTION, (workspace_id,))).fetchone()
    if row is None:
        return SubscriptionState(
            status="none",
            plan=None,
            provisional=True,
            provider=None,
            method=None,
            current_period_start=None,
            current_period_end=None,
            next_cycle_at=None,
            past_due_since=None,
            cancelled_at=None,
        )
    open_cycle = row["status"] in ("active", "past_due")
    return SubscriptionState(**row, next_cycle_at=row["current_period_end"] if open_cycle else None)


@router.get(
    "/workspaces/{workspace_id}/billing/payments",
    summary="Histórico de pagamentos (só o owner; créditos e estado, sem valores em dinheiro)",
    responses=error_responses(401, 403, 404, 422, 503),
)
async def list_payments(
    workspace_id: UUID,
    principal: CurrentPrincipal,
    db: DatabaseDep,
    cursor: CursorQuery = None,
    limit: Annotated[int, limit_query(100)] = 20,
) -> PaymentPage:
    cursor_at, cursor_id = decode_cursor(cursor)
    async with db.transaction_as(principal) as conn:
        await _ensure_owner(conn, workspace_id)
        rows = await (
            await conn.execute(
                PAYMENTS,
                {
                    "workspace_id": workspace_id,
                    "cursor_at": cursor_at,
                    "cursor_id": cursor_id,
                    "limit": limit + 1,
                },
            )
        ).fetchall()
    page, next_cursor = split_page(rows, limit, "created_at")
    return PaymentPage(items=page, next_cursor=next_cursor)
