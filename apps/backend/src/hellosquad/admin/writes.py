"""Rotas /admin/* de escrita (SA6a): sessão de suporte, ajuste de crédito, suspender e reativar,
catálogo, planos e recargas versionados, fila e pagamentos. Cada rota chama uma função app.admin_*
no papel do painel; a função confere o Super Admin, exige o motivo e grava audit_events na mesma
transação. Nenhuma escreve direto em tabela."""

from dataclasses import replace
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Path
from psycopg.types.json import Jsonb

from hellosquad.admin.routes import ADMIN_ERRORS, AdminTx, fetchone
from hellosquad.admin.write_schemas import (
    AccountStatusResult,
    CatalogPriceUpdate,
    CatalogPriceVersion,
    CatalogState,
    CreditAdjustmentRequest,
    CreditAdjustmentResult,
    ForSaleUpdate,
    HomologationUpdate,
    PlanVersionResult,
    PlanVersionUpdate,
    ReasonRequest,
    ReconciliationResult,
    RunActionResult,
    SupportSession,
    SupportSessionStart,
    TopupVersionResult,
    TopupVersionUpdate,
    WebhookReprocessResult,
)
from hellosquad.api.deps import DatabaseDep
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.billing.factory import build_provider
from hellosquad.billing.provider import PaymentProviderError, WebhookEvent
from hellosquad.billing.routes import PaymentHttpDep
from hellosquad.billing.service import apply_event
from hellosquad.config import get_settings

router = APIRouter(prefix="/admin", tags=["admin"])

WRITE_ERRORS = (*ADMIN_ERRORS, 404, 409)
DeliveryType = Annotated[str, Path(pattern=r"^[0-9]{2}\.[0-9]{2}$")]
Slug = Annotated[str, Path(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=60)]


def session_status(row: dict) -> str:
    if row["ended_at"] is not None:
        return "ended"
    return "active" if row["expires_at"] > datetime.now(UTC) else "expired"


def support_session(row: dict) -> SupportSession:
    return SupportSession(
        **{k: row[k] for k in SupportSession.model_fields if k in row}, status=session_status(row)
    )


# -------------------------------------------------------------------------------------------------
# Sessão de suporte
# -------------------------------------------------------------------------------------------------


@router.post(
    "/accounts/{workspace_id}/support-session",
    status_code=201,
    summary="Entrar no ambiente do cliente: sessão de suporte só leitura (motivo, 15/30/60 min)",
    description=(
        "Grava `support_access_log` e `audit_events` (`support.session_started`) e põe na fila o "
        "e-mail ao titular da conta (`support_session_started`, no idioma dele). Durante a janela, "
        "os GET da API do produto deste negócio respondem ao Super Admin como a um membro de "
        "leitura, numa transação READ ONLY; qualquer escrita é recusada. Expira sozinha. Conta "
        "suspensa: 423 `workspace_suspended` (como o SA0)."
    ),
    responses=error_responses(*WRITE_ERRORS, 423),
)
async def start_support_session(
    workspace_id: UUID, payload: SupportSessionStart, tx: AdminTx
) -> SupportSession:
    async with tx() as conn:
        row = await fetchone(
            conn,
            "select * from app.admin_support_session_start(%s, %s, %s)",
            (workspace_id, payload.reason, payload.duration_minutes),
        )
    return support_session(row)


@router.delete(
    "/accounts/{workspace_id}/support-session",
    summary="Encerrar a sessão de suporte aberta nesta conta (auditado)",
    responses=error_responses(*WRITE_ERRORS),
)
async def end_support_session(workspace_id: UUID, tx: AdminTx) -> SupportSession:
    async with tx() as conn:
        row = await fetchone(
            conn, "select * from app.admin_support_session_end(%s)", (workspace_id,)
        )
    return support_session(row)


# -------------------------------------------------------------------------------------------------
# Contas: crédito, suspender, reativar
# -------------------------------------------------------------------------------------------------


@router.post(
    "/accounts/{workspace_id}/credit-adjustments",
    status_code=201,
    summary="Ajustar crédito com motivo (positivo concede, negativo debita só até o disponível)",
    description=(
        "Sem limite de valor (leitura conservadora do dono), sempre com motivo e auditoria "
        "(`credits.adjusted`, com saldo antes e depois). Positivo: grant de origem `adjustment`. "
        "Negativo: lançamentos `adjustment` nos grants válidos, primeiro o que vence antes; se "
        "deixaria o saldo disponível negativo, 409 e nada muda."
    ),
    responses=error_responses(*WRITE_ERRORS),
)
async def adjust_credits(
    workspace_id: UUID, payload: CreditAdjustmentRequest, tx: AdminTx
) -> CreditAdjustmentResult:
    async with tx() as conn:
        row = await fetchone(
            conn,
            "select * from app.admin_adjust_credits(%s, %s, %s, %s)",
            (
                workspace_id,
                payload.amount,
                payload.reason,
                payload.idempotency_key or uuid4().hex,
            ),
        )
    return CreditAdjustmentResult(workspace_id=workspace_id, amount=payload.amount, **row)


async def set_suspended(
    workspace_id: UUID, suspended: bool, reason: str, tx: AdminTx
) -> AccountStatusResult:
    async with tx() as conn:
        row = await fetchone(
            conn,
            "select id, suspended_at, suspension_reason "
            "from app.admin_set_workspace_suspended(%s, %s, %s)",
            (workspace_id, suspended, reason),
        )
    return AccountStatusResult(
        workspace_id=row["id"],
        status="suspended" if row["suspended_at"] else "active",
        suspended_at=row["suspended_at"],
        suspension_reason=row["suspension_reason"],
    )


@router.post(
    "/accounts/{workspace_id}/suspend",
    summary="Suspender a conta: pausa a renovação da cobrança e as rotinas; não cancela",
    description=(
        "A assinatura e os dados ficam; a renovação do scheduler pula a conta e run agendado "
        "(rotina) recebe 423 `workspace_suspended`. Os membros veem `workspace_status: "
        "suspended` em `GET /me`. Auditado (`workspace.suspended`)."
    ),
    responses=error_responses(*WRITE_ERRORS),
)
async def suspend_account(
    workspace_id: UUID, payload: ReasonRequest, tx: AdminTx
) -> AccountStatusResult:
    return await set_suspended(workspace_id, True, payload.reason, tx)


@router.post(
    "/accounts/{workspace_id}/reactivate",
    summary="Reativar a conta suspensa (auditado)",
    responses=error_responses(*WRITE_ERRORS),
)
async def reactivate_account(
    workspace_id: UUID, payload: ReasonRequest, tx: AdminTx
) -> AccountStatusResult:
    return await set_suspended(workspace_id, False, payload.reason, tx)


# -------------------------------------------------------------------------------------------------
# Catálogo, planos e recargas (versão nova a cada gravação; versões passadas são imutáveis)
# -------------------------------------------------------------------------------------------------


@router.put(
    "/catalog/{delivery_type}/price",
    summary="Preço em créditos de uma delivery: versão nova (provisório marcado por padrão)",
    responses=error_responses(*WRITE_ERRORS),
)
async def put_catalog_price(
    delivery_type: DeliveryType, payload: CatalogPriceUpdate, tx: AdminTx
) -> CatalogPriceVersion:
    async with tx() as conn:
        row = await fetchone(
            conn,
            "select * from app.admin_catalog_price(%s, %s, %s, %s, %s, %s)",
            (
                delivery_type,
                payload.credits,
                payload.revision_credits,
                payload.provisional,
                payload.approved_commercially,
                payload.reason,
            ),
        )
    return CatalogPriceVersion(**{k: row[k] for k in CatalogPriceVersion.model_fields})


@router.put(
    "/catalog/{delivery_type}/homologation",
    summary="Estado de homologação de uma delivery (auditado)",
    responses=error_responses(*WRITE_ERRORS),
)
async def put_catalog_homologation(
    delivery_type: DeliveryType, payload: HomologationUpdate, tx: AdminTx
) -> CatalogState:
    async with tx() as conn:
        row = await fetchone(
            conn,
            "select * from app.admin_catalog_homologation(%s, %s, %s)",
            (delivery_type, payload.status, payload.reason),
        )
    return CatalogState(**{k: row[k] for k in CatalogState.model_fields})


@router.put(
    "/catalog/{delivery_type}/for-sale",
    summary='"À venda": só com homologação concluída e preço aprovado comercialmente',
    responses=error_responses(*WRITE_ERRORS),
)
async def put_catalog_for_sale(
    delivery_type: DeliveryType, payload: ForSaleUpdate, tx: AdminTx
) -> CatalogState:
    async with tx() as conn:
        row = await fetchone(
            conn,
            "select * from app.admin_catalog_for_sale(%s, %s, %s)",
            (delivery_type, payload.for_sale, payload.reason),
        )
    return CatalogState(**{k: row[k] for k in CatalogState.model_fields})


@router.put(
    "/plans/{slug}",
    summary="Plano: versão nova (créditos, ciclo, validade, preço) com a trava de preço aprovado",
    description=(
        "Grava `plan_versions` (versão + 1) e, com `amount`, `plan_prices`; as versões passadas "
        'não mudam (trigger). "À venda" só com preço aprovado comercialmente e não provisório.'
    ),
    responses=error_responses(*WRITE_ERRORS),
)
async def put_plan(slug: Slug, payload: PlanVersionUpdate, tx: AdminTx) -> PlanVersionResult:
    async with tx() as conn:
        row = await fetchone(
            conn,
            "select * from app.admin_plan_version(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                slug,
                payload.credits,
                payload.cycle,
                payload.validity_days,
                payload.amount,
                payload.currency,
                payload.provisional,
                payload.approved_commercially,
                payload.for_sale,
                payload.reason,
            ),
        )
    return PlanVersionResult(
        plan=slug,
        for_sale=payload.for_sale,
        **{k: row[k] for k in PlanVersionResult.model_fields if k not in ("plan", "for_sale")},
    )


@router.put(
    "/topups/{slug}",
    summary="Recarga avulsa: versão nova com a trava de preço aprovado",
    responses=error_responses(*WRITE_ERRORS),
)
async def put_topup(slug: Slug, payload: TopupVersionUpdate, tx: AdminTx) -> TopupVersionResult:
    async with tx() as conn:
        row = await fetchone(
            conn,
            "select * from app.admin_topup_version(%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                slug,
                payload.credits,
                payload.validity_days,
                payload.amount,
                payload.currency,
                payload.provisional,
                payload.approved_commercially,
                payload.for_sale,
                payload.reason,
            ),
        )
    return TopupVersionResult(
        topup=slug,
        pack_id=row["id"],
        for_sale=payload.for_sale,
        **{
            k: row[k]
            for k in TopupVersionResult.model_fields
            if k not in ("topup", "pack_id", "for_sale")
        },
    )


# -------------------------------------------------------------------------------------------------
# Fila
# -------------------------------------------------------------------------------------------------


async def run_action(sql: str, run_id: UUID, reason: str, tx: AdminTx) -> RunActionResult:
    async with tx() as conn:
        row = await fetchone(conn, sql, (run_id, reason))
    return RunActionResult(**{k: row[k] for k in RunActionResult.model_fields})


@router.post(
    "/queue/runs/{run_id}/requeue",
    summary="Reenfileirar run que falhou ou foi cancelado (com motivo; tentativas zeradas)",
    responses=error_responses(*WRITE_ERRORS),
)
async def requeue_run(run_id: UUID, payload: ReasonRequest, tx: AdminTx) -> RunActionResult:
    return await run_action(
        "select * from app.admin_run_requeue(%s, %s)", run_id, payload.reason, tx
    )


@router.post(
    "/queue/runs/{run_id}/cancel",
    summary="Cancelar run na fila ou esperando aprovação (com motivo)",
    responses=error_responses(*WRITE_ERRORS),
)
async def cancel_run(run_id: UUID, payload: ReasonRequest, tx: AdminTx) -> RunActionResult:
    return await run_action(
        "select * from app.admin_run_cancel(%s, %s)", run_id, payload.reason, tx
    )


# -------------------------------------------------------------------------------------------------
# Pagamentos
# -------------------------------------------------------------------------------------------------

WEBHOOK = """
select e.id, e.provider::text as provider, e.event_id, p.provider_payment_id,
       s.provider_subscription_id
from public.payment_events e
left join public.payments p on p.id = e.payment_id
left join public.subscriptions s on s.id = p.subscription_id
where e.id = %s
"""


@router.post(
    "/payments/webhooks/{event_id}/reprocess",
    summary="Reprocessar webhook: consulta a cobrança no provedor e aplica o estado (idempotente)",
    description=(
        "O estado atual da cobrança ligada ao webhook vem do provedor e entra pela "
        "`app.billing_apply_event` como evento `reprocess:<cobrança>:<estado>` (o mesmo caminho e "
        "a mesma idempotência da S2e): repetir não lança crédito de novo. Webhook sem cobrança: "
        "409. Auditado (`payment.webhook_reprocessed`) com o resultado."
    ),
    responses=error_responses(*WRITE_ERRORS),
)
async def reprocess_webhook(
    event_id: UUID,
    payload: ReasonRequest,
    tx: AdminTx,
    db: DatabaseDep,
    http: PaymentHttpDep,
) -> WebhookReprocessResult:
    async with tx() as conn:
        row = await fetchone(conn, WEBHOOK, (event_id,))
    if row is None:
        raise ApiError(404, "webhook_not_found", "error.webhook_not_found")
    if row["provider_payment_id"] is None:
        raise ApiError(409, "webhook_not_reprocessable", "error.webhook_not_reprocessable")
    try:
        adapter = build_provider(row["provider"], get_settings(), http)
        remote = await adapter.get_payment(row["provider_payment_id"])
    except PaymentProviderError as exc:
        raise ApiError(503, "provider_unavailable", "error.provider_unavailable") from exc
    result = WebhookReprocessResult(
        payment_event_id=event_id,
        provider=row["provider"],
        provider_status=remote.status,
        applied_event_id=None,
        duplicate=None,
        outcome="provider_unknown",
    )
    if remote.status is not None:
        event = WebhookEvent(
            event_id=f"reprocess:{remote.provider_payment_id}:{remote.status}",
            event_type="reprocess.payment",
            payment=replace(remote, provider_subscription_id=row["provider_subscription_id"]),
        )
        async with db.transaction_as_billing() as conn:
            applied = await apply_event(conn, row["provider"], event)
        result.applied_event_id = event.event_id
        result.duplicate = applied["duplicate"]
        result.outcome = applied["outcome"]
    async with tx() as conn:
        await fetchone(
            conn,
            "select app.admin_payment_reprocess_audit(%s, %s, %s) as id",
            (
                event_id,
                payload.reason,
                Jsonb(result.model_dump(mode="json", exclude={"payment_event_id", "provider"})),
            ),
        )
    return result


@router.post(
    "/payments/webhooks/{event_id}/reconcile",
    status_code=201,
    summary="Marcar o webhook como conciliado (com motivo; uma vez, só inserção)",
    responses=error_responses(*WRITE_ERRORS),
)
async def reconcile_webhook(
    event_id: UUID, payload: ReasonRequest, tx: AdminTx
) -> ReconciliationResult:
    async with tx() as conn:
        row = await fetchone(
            conn, "select * from app.admin_payment_reconcile(%s, %s)", (event_id, payload.reason)
        )
    return ReconciliationResult(**{k: row[k] for k in ReconciliationResult.model_fields})
