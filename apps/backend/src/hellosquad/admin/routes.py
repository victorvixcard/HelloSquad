"""Rotas /admin/* de leitura (SA1). Só para quem está em platform_admins: a dependência confere e
a transação de cada rota assume hellosquad_admin (sem BYPASSRLS) só depois de conferir de novo.
Consulta por cliente sempre com workspace_id explícito. Ler o detalhe de uma conta grava "acesso do
suporte" em audit_events. Chave de provedor nunca sai daqui: só "configured" ou "missing"."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from psycopg import AsyncConnection
from psycopg.rows import DictRow
from psycopg.types.json import Jsonb
from pydantic import SecretStr

from hellosquad.admin.schemas import (
    AccountCredits,
    AccountDetail,
    AccountMember,
    AccountPage,
    AccountPlan,
    AccountSubscription,
    AccountSummary,
    AccountTotals,
    AdminMe,
    AdminPayment,
    AdminSubscription,
    AdminWebhookEvent,
    AuditItem,
    AuditPage,
    CatalogItem,
    CatalogPrice,
    CatalogResponse,
    ConsumptionResponse,
    ConsumptionRow,
    ExchangeRate,
    KeyState,
    LedgerEntry,
    ModelCostRow,
    ModelPrice,
    ModelsOverview,
    PaymentProviderState,
    PaymentsOverview,
    PlanItem,
    PlansResponse,
    ProviderHealthItem,
    ProviderSpend,
    ProvidersResponse,
    QualityResponse,
    QualityRow,
    QueueOverview,
    QueueRun,
    QueueSize,
    RunDetail,
    RunEventItem,
    RunStepItem,
    SupportAccess,
    TaskRule,
    TopupItem,
    UsageTotals,
)
from hellosquad.api.deps import CurrentPrincipal, DatabaseDep
from hellosquad.api.errors import ApiError, error_responses
from hellosquad.api.pagination import CursorQuery, decode_cursor, limit_query, split_page
from hellosquad.auth import Principal
from hellosquad.config import get_settings
from hellosquad.db import IS_PLATFORM_ADMIN, NotPlatformAdminError

router = APIRouter(prefix="/admin", tags=["admin"])

MAX_PERIOD_DAYS = 366
ADMIN_ERRORS = (401, 403, 422, 503)


async def require_platform_admin(principal: CurrentPrincipal, db: DatabaseDep) -> Principal:
    """403 para quem não está em platform_admins (owner, membro comum, sem membership)."""
    async with db.transaction_as(principal) as conn:
        row = await (await conn.execute(IS_PLATFORM_ADMIN)).fetchone()
    if row is None or not row["ok"]:
        raise ApiError(403, "platform_admin_only", "error.platform_admin_only")
    return principal


PlatformAdmin = Annotated[Principal, Depends(require_platform_admin)]


class AdminTransaction:
    """Transação da rota no papel do painel; a dependência já conferiu quem é o Super Admin."""

    def __init__(self, db: DatabaseDep, principal: PlatformAdmin) -> None:
        self.db = db
        self.principal = principal

    @asynccontextmanager
    async def __call__(self) -> AsyncIterator[AsyncConnection[DictRow]]:
        try:
            async with self.db.transaction_as_admin(self.principal) as conn:
                yield conn
        except NotPlatformAdminError as exc:
            raise ApiError(403, "platform_admin_only", "error.platform_admin_only") from exc


AdminTx = Annotated[AdminTransaction, Depends()]


async def fetchall(conn: AsyncConnection[DictRow], sql: str, params=None) -> list[dict]:
    return await (await conn.execute(sql, params)).fetchall()


async def fetchone(conn: AsyncConnection[DictRow], sql: str, params=None) -> dict | None:
    return await (await conn.execute(sql, params)).fetchone()


def period(since: date | None, until: date | None) -> tuple[date, date]:
    until = until or datetime.now(UTC).date()
    since = since or until - timedelta(days=29)
    if since > until or (until - since).days + 1 > MAX_PERIOD_DAYS:
        raise ApiError(422, "invalid_period", "error.invalid_period", max_days=MAX_PERIOD_DAYS)
    return since, until


SinceQuery = Annotated[
    date | None, Query(description="Primeiro dia (padrão: 30 dias até `until`).")
]
UntilQuery = Annotated[date | None, Query(description="Último dia, inclusive (padrão: hoje).")]


def key_state(value: SecretStr | None) -> KeyState:
    return "configured" if value is not None and value.get_secret_value() else "missing"


# -------------------------------------------------------------------------------------------------
# Quem está no painel
# -------------------------------------------------------------------------------------------------

ME = """
select l.user_id, l.email, l.full_name, pa.mfa_enforced
from app.admin_user_labels(array[%s]::uuid[]) l
join public.platform_admins pa on pa.user_id = l.user_id
"""


@router.get(
    "/me",
    summary="Super Admin conectado (nome, e-mail e se a verificação em duas etapas é exigida)",
    responses=error_responses(*ADMIN_ERRORS),
)
async def admin_me(admin: PlatformAdmin, tx: AdminTx) -> AdminMe:
    async with tx() as conn:
        row = await fetchone(conn, ME, (admin.user_id,))
    return AdminMe(**row)


# -------------------------------------------------------------------------------------------------
# Contas
# -------------------------------------------------------------------------------------------------

ACCOUNTS_BASE = """
with acc as (
  select w.id, w.slug, w.name, w.locale, w.created_at,
         case when w.deleted_at is null then 'active' else 'deleted' end as status,
         p.slug as plan_slug, p.name as plan_name, v.provisional as plan_provisional,
         app.credit_balance(w.id, now()) as credits_balance,
         (select count(*) from public.memberships m where m.workspace_id = w.id)::integer
           as member_count
  from public.workspaces w
  left join public.credit_accounts a on a.workspace_id = w.id
  left join public.plan_versions v on v.id = a.plan_version_id
  left join public.plans p on p.id = v.plan_id
  where (%(q)s::text is null or w.name ilike '%%' || %(q)s || '%%'
         or w.slug ilike '%%' || %(q)s || '%%')
    and (%(plan)s::text is null or p.slug = %(plan)s)
    and (%(status)s::text is null
         or (%(status)s = 'active' and w.deleted_at is null)
         or (%(status)s = 'deleted' and w.deleted_at is not null))
)
"""

ACCOUNTS_PAGE = (
    ACCOUNTS_BASE
    + """
select acc.*,
       (select mb.email from app.admin_workspace_members(acc.id) mb where mb.role = 'owner' limit 1)
         as owner_email
from acc
where (%(cursor_at)s::timestamptz is null
       or (acc.created_at, acc.id) < (%(cursor_at)s, %(cursor_id)s))
order by acc.created_at desc, acc.id desc
limit %(limit)s
"""
)

ACCOUNTS_TOTALS = (
    ACCOUNTS_BASE
    + """
select count(*)::integer as accounts,
       count(*) filter (where plan_slug is not null and plan_slug <> 'free')::integer as paid_plans,
       count(*) filter (where plan_slug = 'free')::integer as free_plans,
       coalesce(sum(credits_balance), 0)::numeric(12, 2) as credits_balance
from acc
"""
)


def account_summary(row: dict) -> AccountSummary:
    plan = (
        AccountPlan(
            slug=row["plan_slug"], name=row["plan_name"], provisional=row["plan_provisional"]
        )
        if row["plan_slug"]
        else None
    )
    return AccountSummary(
        id=row["id"],
        slug=row["slug"],
        name=row["name"],
        locale=row["locale"],
        status=row["status"],
        created_at=row["created_at"],
        plan=plan,
        credits_balance=row["credits_balance"],
        member_count=row["member_count"],
        owner_email=row["owner_email"],
    )


@router.get(
    "/accounts",
    summary="Contas: lista com plano, saldo e membros, e os totais dos cartões",
    responses=error_responses(*ADMIN_ERRORS),
)
async def list_accounts(
    tx: AdminTx,
    q: Annotated[str | None, Query(max_length=80, description="Busca no nome ou no slug.")] = None,
    plan: Annotated[str | None, Query(max_length=40, description="Slug do plano.")] = None,
    status: Literal["active", "deleted"] | None = None,
    cursor: CursorQuery = None,
    limit: Annotated[int, limit_query(100)] = 50,
) -> AccountPage:
    cursor_at, cursor_id = decode_cursor(cursor)
    params = {
        "q": q or None,
        "plan": plan,
        "status": status,
        "cursor_at": cursor_at,
        "cursor_id": cursor_id,
        "limit": limit + 1,
    }
    async with tx() as conn:
        rows = await fetchall(conn, ACCOUNTS_PAGE, params)
        totals = await fetchone(conn, ACCOUNTS_TOTALS, params)
    page, next_cursor = split_page(rows, limit, "created_at")
    return AccountPage(
        totals=AccountTotals(**totals),
        items=[account_summary(r) for r in page],
        next_cursor=next_cursor,
    )


ACCOUNT = (
    ACCOUNTS_BASE.replace("where (%(q)s", "where w.id = %(workspace_id)s and (%(q)s")
    + """
select acc.*,
       (select mb.email from app.admin_workspace_members(acc.id) mb where mb.role = 'owner' limit 1)
         as owner_email
from acc
"""
)

MEMBERS = "select * from app.admin_workspace_members(%s)"

RESERVED = """
select coalesce(sum(h.estimate), 0)::numeric(12, 2) as reserved
from public.credit_holds h
where h.workspace_id = %s and h.state = 'held'
"""

LEDGER = """
select l.id, l.entry_type::text as entry_type, l.amount, l.note, l.run_id, l.created_at
from public.credit_ledger l
where l.workspace_id = %s
order by l.created_at desc, l.id desc
limit 20
"""

SUPPORT_ACCESSES = """
select s.id, s.reason, s.mode, s.started_at, s.expires_at, s.ended_at,
       (select lb.email from app.admin_user_labels(array[s.admin_id]) lb) as admin_email
from public.support_access_log s
where s.workspace_id = %s
order by s.started_at desc
limit 20
"""

USAGE = """
select coalesce(sum(requests), 0)::integer as requests,
       coalesce(sum(credits_charged), 0)::numeric(12, 2) as credits_charged,
       coalesce(sum(llm_calls), 0)::integer as llm_calls,
       coalesce(sum(conversation_calls), 0)::integer as conversation_calls,
       coalesce(sum(input_tokens), 0)::bigint as input_tokens,
       coalesce(sum(cache_read_tokens), 0)::bigint as cache_read_tokens,
       coalesce(sum(cache_write_tokens), 0)::bigint as cache_write_tokens,
       coalesce(sum(output_tokens), 0)::bigint as output_tokens,
       coalesce(sum(ai_cost_deliveries_usd), 0)::numeric(14, 6) as ai_cost_deliveries_usd,
       coalesce(sum(ai_cost_conversation_usd), 0)::numeric(14, 6) as ai_cost_conversation_usd,
       coalesce(sum(ai_cost_deliveries_usd + ai_cost_conversation_usd), 0)::numeric(14, 6)
         as ai_cost_usd
from public.v_consumo_por_cliente
where workspace_id = %s and day between %s and %s
"""

SUBSCRIPTION = """
select s.status::text as status, p.name as plan, v.provisional, s.provider::text as provider,
       s.method::text as method, s.current_period_end
from public.subscriptions s
join public.plan_versions v on v.id = s.plan_version_id
join public.plans p on p.id = v.plan_id
where s.workspace_id = %s
order by (s.status <> 'cancelled') desc, s.created_at desc
limit 1
"""

AUDIT_SUPPORT_READ = "select app.admin_audit(%s, %s, 'workspace', %s, %s) as id"


@router.get(
    "/accounts/{workspace_id}",
    summary="Conta: membros, créditos, extrato, acessos do suporte, uso em 30 dias e assinatura",
    description=(
        "Cada leitura fica em audit_events como acesso do suporte (`support.account_viewed`)."
    ),
    responses=error_responses(401, 403, 404, 422, 503),
)
async def get_account(workspace_id: UUID, tx: AdminTx) -> AccountDetail:
    today = datetime.now(UTC).date()
    async with tx() as conn:
        row = await fetchone(
            conn,
            ACCOUNT,
            {"workspace_id": workspace_id, "q": None, "plan": None, "status": None},
        )
        if row is None:
            raise ApiError(404, "not_found", "error.account_not_found")
        members = await fetchall(conn, MEMBERS, (workspace_id,))
        reserved = (await fetchone(conn, RESERVED, (workspace_id,)))["reserved"]
        ledger = await fetchall(conn, LEDGER, (workspace_id,))
        accesses = await fetchall(conn, SUPPORT_ACCESSES, (workspace_id,))
        usage = await fetchone(conn, USAGE, (workspace_id, today - timedelta(days=29), today))
        subscription = await fetchone(conn, SUBSCRIPTION, (workspace_id,))
        audit = await fetchone(
            conn,
            AUDIT_SUPPORT_READ,
            (
                "support.account_viewed",
                workspace_id,
                str(workspace_id),
                Jsonb({"category": "support_access", "mode": "read_only", "via": "admin_api"}),
            ),
        )
    balance = row["credits_balance"]
    return AccountDetail(
        account=account_summary(row),
        members=[AccountMember(**m) for m in members],
        credits=AccountCredits(
            balance=balance, reserved=reserved, available=max(balance - reserved, Decimal(0))
        ),
        ledger=[LedgerEntry(**e) for e in ledger],
        support_accesses=[SupportAccess(**a) for a in accesses],
        usage_30d=UsageTotals(**usage),
        subscription=AccountSubscription(**subscription) if subscription else None,
        audit_event_id=audit["id"],
    )


# -------------------------------------------------------------------------------------------------
# Catálogo, planos e recargas
# -------------------------------------------------------------------------------------------------

CATALOG = """
select c.delivery_type, c.agent_id::text as agent_id, c.name, c.result, c.depth::text as depth,
       c.depth_source, c.integrations, c.prerequisites, c.catalog_status, c.homologation_status,
       c.for_sale, p.credits, p.revision_credits, p.provisional, p.approved_commercially,
       p.valid_from,
       (select count(*) from public.delivery_prices x
        where x.delivery_type = c.delivery_type)::integer
         as versions
from public.delivery_catalog c
left join lateral (
  select dp.* from public.delivery_prices dp
  where dp.delivery_type = c.delivery_type and dp.valid_from <= now()
  order by dp.valid_from desc
  limit 1
) p on true
where (%(agent_id)s::text is null or c.agent_id::text = %(agent_id)s)
order by c.sort_order
"""


@router.get(
    "/catalog",
    summary="Catálogo das 46 deliveries com o preço provisório em vigor e a homologação",
    responses=error_responses(*ADMIN_ERRORS),
)
async def get_catalog(
    tx: AdminTx,
    agent_id: Annotated[
        Literal["nexo", "bia", "kaia", "otto", "kiwi", "max", "iris"] | None, Query()
    ] = None,
) -> CatalogResponse:
    async with tx() as conn:
        rows = await fetchall(conn, CATALOG, {"agent_id": agent_id})
    items = []
    for r in rows:
        price = (
            CatalogPrice(
                credits=r["credits"],
                revision_credits=r["revision_credits"],
                provisional=r["provisional"],
                approved_commercially=r["approved_commercially"],
                valid_from=r["valid_from"],
                versions=r["versions"],
            )
            if r["credits"] is not None
            else None
        )
        items.append(
            CatalogItem(
                **{k: r[k] for k in CatalogItem.model_fields if k != "price"},
                price=price,
            )
        )
    return CatalogResponse(items=items)


PLANS = """
select p.id, p.slug, p.name, p.for_sale, v.version, v.cycle, v.credits, v.validity_days,
       v.provisional, v.approved_commercially,
       pp.amount as price_amount, pp.currency as price_currency,
       pp.provisional as price_provisional, pp.approved_commercially as price_approved_commercially
from public.plans p
join lateral (
  select pv.* from public.plan_versions pv
  where pv.plan_id = p.id and pv.valid_from <= now()
  order by pv.valid_from desc, pv.version desc
  limit 1
) v on true
left join lateral (
  select x.* from public.plan_prices x
  where x.plan_id = p.id and x.valid_from <= now()
  order by x.valid_from desc
  limit 1
) pp on true
order by v.credits, p.slug
"""

TOPUPS = """
select distinct on (t.topup_id)
       t.topup_id as id, t.slug, t.name, t.for_sale, t.version, t.credits, t.validity_days,
       t.amount,
       t.currency, t.provisional, t.approved_commercially
from public.topup_versions t
where t.valid_from <= now()
order by t.topup_id, t.valid_from desc
"""


@router.get(
    "/plans",
    summary="Planos e recargas na versão em vigor (valores provisórios, nada à venda)",
    responses=error_responses(*ADMIN_ERRORS),
)
async def get_plans(tx: AdminTx) -> PlansResponse:
    async with tx() as conn:
        plans = await fetchall(conn, PLANS)
        topups = await fetchall(conn, TOPUPS)
    return PlansResponse(
        plans=[PlanItem(**p) for p in plans],
        topups=[TopupItem(**t) for t in sorted(topups, key=lambda t: t["credits"])],
    )


# -------------------------------------------------------------------------------------------------
# Pagamentos (S2e)
# -------------------------------------------------------------------------------------------------

SUBSCRIPTIONS = """
select s.id, s.workspace_id, w.name as workspace_name, p.name as plan, v.provisional,
       s.provider::text as provider, s.method::text as method, s.status::text as status,
       s.current_period_end, pp.amount, pp.currency
from public.subscriptions s
join public.workspaces w on w.id = s.workspace_id
join public.plan_versions v on v.id = s.plan_version_id
join public.plans p on p.id = v.plan_id
left join public.plan_prices pp on pp.id = s.plan_price_id
order by s.created_at desc
limit 100
"""

PAYMENTS = """
select x.id, x.workspace_id, w.name as workspace_name, x.kind::text as kind,
       x.provider::text as provider,
       x.method::text as method, x.status::text as status, x.amount, x.currency, x.credits,
       x.created_at, x.confirmed_at
from public.payments x
join public.workspaces w on w.id = x.workspace_id
order by x.created_at desc, x.id desc
limit 50
"""

WEBHOOKS = """
select e.id, e.provider::text as provider, e.event_id, e.event_type, e.workspace_id,
       w.name as workspace_name, e.outcome, e.note, e.received_at, e.processed_at
from public.payment_events e
left join public.workspaces w on w.id = e.workspace_id
order by e.received_at desc, e.id desc
limit 50
"""


@router.get(
    "/payments",
    summary="Pagamentos: provedores, assinaturas, cobranças e eventos de webhook",
    responses=error_responses(*ADMIN_ERRORS),
)
async def get_payments(tx: AdminTx) -> PaymentsOverview:
    settings = get_settings()
    providers = [
        PaymentProviderState(
            provider="asaas",
            selected=settings.payment_provider == "asaas",
            api_key=key_state(settings.asaas_api_key),
            webhook_secret=key_state(settings.asaas_webhook_token),
        ),
        PaymentProviderState(
            provider="mercadopago",
            selected=settings.payment_provider == "mercadopago",
            api_key=key_state(settings.mercadopago_access_token),
            webhook_secret=key_state(settings.mercadopago_webhook_secret),
        ),
        PaymentProviderState(
            provider="mock",
            selected=settings.payment_provider == "mock",
            api_key="not_applicable",
            webhook_secret=key_state(settings.payment_mock_webhook_secret),
        ),
    ]
    async with tx() as conn:
        subscriptions = await fetchall(conn, SUBSCRIPTIONS)
        payments = await fetchall(conn, PAYMENTS)
        webhooks = await fetchall(conn, WEBHOOKS)
    return PaymentsOverview(
        providers=providers,
        subscriptions=[AdminSubscription(**s) for s in subscriptions],
        payments=[AdminPayment(**p) for p in payments],
        webhooks=[AdminWebhookEvent(**e) for e in webhooks],
    )


# -------------------------------------------------------------------------------------------------
# Auditoria
# -------------------------------------------------------------------------------------------------

AUDIT = """
with ev as (
  select a.*,
         case
           when coalesce((a.payload ->> 'platform_admin')::boolean, false) then 'platform_admin'
           when a.actor_type = 'user' then 'customer'
           else 'system'
         end as actor,
         case
           when a.action like 'support.%%' then 'support_access'
           when a.action like 'approval.%%' then 'approval'
           when a.action like 'memory%%' then 'memory'
           when a.action like 'work_item.%%' or a.action like 'project%%' or a.action like 'run.%%'
             then 'work'
           when a.action like 'conversation.%%' or a.action like 'message.%%' then 'conversation'
           when a.action like 'workspace.%%' or a.action like 'membership.%%'
             or a.action like 'invitation.%%' then 'account'
           when a.action like 'contacts.%%' then 'contacts'
           when a.action like 'credit%%' then 'ledger'
           when a.action like 'billing.%%' or a.action like 'payment.%%'
             or a.action like 'subscription.%%' then 'billing'
           when a.action like 'admin.%%' then 'configuration'
           else 'other'
         end as category
  from public.audit_events a
  where (%(workspace_id)s::uuid is null or a.workspace_id = %(workspace_id)s)
    and (%(since)s::date is null or a.created_at >= %(since)s::date::timestamptz)
    and (%(until)s::date is null or a.created_at < (%(until)s::date + 1)::timestamptz)
    and (%(cursor_at)s::timestamptz is null
         or (a.created_at, a.id) < (%(cursor_at)s, %(cursor_id)s))
)
select ev.id, ev.created_at, ev.actor, ev.actor_type::text as actor_type, ev.actor_id,
       ev.workspace_id,
       w.name as workspace_name, ev.category, ev.action, ev.entity_type, ev.entity_id, ev.payload
from ev
left join public.workspaces w on w.id = ev.workspace_id
where (%(actor)s::text is null or ev.actor = %(actor)s)
  and (%(category)s::text is null or ev.category = %(category)s)
order by ev.created_at desc, ev.id desc
limit %(limit)s
"""

USER_LABELS = "select * from app.admin_user_labels(%s::uuid[])"


@router.get(
    "/audit",
    summary="Auditoria: tudo o que aconteceu, com filtros por autor, conta, tipo e período",
    responses=error_responses(*ADMIN_ERRORS),
)
async def get_audit(
    tx: AdminTx,
    actor: Literal["platform_admin", "customer", "system"] | None = None,
    workspace_id: UUID | None = None,
    category: Annotated[str | None, Query(max_length=40)] = None,
    since: date | None = None,
    until: date | None = None,
    cursor: CursorQuery = None,
    limit: Annotated[int, limit_query(200)] = 50,
) -> AuditPage:
    if since and until and since > until:
        raise ApiError(422, "invalid_period", "error.invalid_period", max_days=MAX_PERIOD_DAYS)
    cursor_at, cursor_id = decode_cursor(cursor)
    async with tx() as conn:
        rows = await fetchall(
            conn,
            AUDIT,
            {
                "actor": actor,
                "workspace_id": workspace_id,
                "category": category,
                "since": since,
                "until": until,
                "cursor_at": cursor_at,
                "cursor_id": cursor_id,
                "limit": limit + 1,
            },
        )
        page, next_cursor = split_page(rows, limit, "created_at")
        user_ids = list(
            {
                UUID(r["actor_id"])
                for r in page
                if r["actor_type"] == "user" and is_uuid(r["actor_id"])
            }
        )
        labels = (
            {lb["user_id"]: lb for lb in await fetchall(conn, USER_LABELS, (user_ids,))}
            if user_ids
            else {}
        )
    items = []
    for r in page:
        label = labels.get(UUID(r["actor_id"])) if is_uuid(r["actor_id"]) else None
        items.append(
            AuditItem(
                **r,
                actor_email=label["email"] if label else None,
                actor_name=label["full_name"] if label else None,
            )
        )
    return AuditPage(items=items, next_cursor=next_cursor)


def is_uuid(value: str | None) -> bool:
    if not value:
        return False
    try:
        UUID(value)
    except ValueError:
        return False
    return True


# -------------------------------------------------------------------------------------------------
# Fila de trabalhos
# -------------------------------------------------------------------------------------------------

QUEUES = "select * from public.v_fila_filas order by queue_name"

STATUS_COUNTS = "select status::text as status, count(*)::integer as n from public.runs group by 1"

QUEUE_RUNS = """
select f.run_id as id, f.workspace_id, w.name as workspace_name, f.work_item_id, f.work_title,
       f.delivery_type, f.agent_id, f.kind::text as kind, f.status::text as status, f.attempts,
       f.created_at, f.started_at, f.finished_at, f.queue_name, f.lease_until, f.current_step,
       f.error_code, f.error_message
from public.v_fila f
join public.workspaces w on w.id = f.workspace_id
where (%(status)s::text is null or f.status::text = %(status)s)
  and (%(workspace_id)s::uuid is null or f.workspace_id = %(workspace_id)s)
  and (%(cursor_at)s::timestamptz is null
       or (f.created_at, f.run_id) < (%(cursor_at)s, %(cursor_id)s))
order by f.created_at desc, f.run_id desc
limit %(limit)s
"""


@router.get(
    "/queue",
    summary="Fila de trabalhos: filas pgmq, contagem por estado e runs (tentativas, posse, erro)",
    responses=error_responses(*ADMIN_ERRORS),
)
async def get_queue(
    tx: AdminTx,
    status: Annotated[str | None, Query(max_length=40, description="Estado do run.")] = None,
    workspace_id: UUID | None = None,
    cursor: CursorQuery = None,
    limit: Annotated[int, limit_query(200)] = 50,
) -> QueueOverview:
    cursor_at, cursor_id = decode_cursor(cursor)
    max_attempts = get_settings().worker_max_attempts
    async with tx() as conn:
        queues = await fetchall(conn, QUEUES)
        counts = await fetchall(conn, STATUS_COUNTS)
        rows = await fetchall(
            conn,
            QUEUE_RUNS,
            {
                "status": status,
                "workspace_id": workspace_id,
                "cursor_at": cursor_at,
                "cursor_id": cursor_id,
                "limit": limit + 1,
            },
        )
    page, next_cursor = split_page(rows, limit, "created_at")
    return QueueOverview(
        queues=[QueueSize(**q) for q in queues],
        status_counts={c["status"]: c["n"] for c in counts},
        runs=[QueueRun(**r, max_attempts=max_attempts) for r in page],
        next_cursor=next_cursor,
    )


QUEUE_RUN = """
select f.run_id as id, f.workspace_id, w.name as workspace_name, f.work_item_id, f.work_title,
       f.delivery_type, f.agent_id, f.kind::text as kind, f.status::text as status, f.attempts,
       f.created_at, f.started_at, f.finished_at, f.queue_name, f.lease_until, f.current_step,
       f.error_code, f.error_message
from public.v_fila f
join public.workspaces w on w.id = f.workspace_id
where f.workspace_id = %s and f.run_id = %s
"""

RUN_WORKSPACE = "select workspace_id from public.runs where id = %s"

RUN_STEPS = """
select s.seq, s.kind::text as kind, s.payload ->> 'step' as step, s.model, s.status::text as status,
       s.input_tokens, s.output_tokens, s.cache_read_tokens, s.cache_write_tokens, s.cost_usd,
       s.latency_ms, s.created_at
from public.run_steps s
where s.workspace_id = %s and s.run_id = %s
order by s.seq
"""

RUN_EVENTS = """
select e.seq, e.type, e.payload, e.created_at
from public.run_events e
where e.workspace_id = %s and e.run_id = %s
order by e.seq
"""


@router.get(
    "/queue/runs/{run_id}",
    summary="Run com passos (modelo, tokens, custo) e eventos",
    responses=error_responses(401, 403, 404, 422, 503),
)
async def get_queue_run(run_id: UUID, tx: AdminTx) -> RunDetail:
    max_attempts = get_settings().worker_max_attempts
    async with tx() as conn:
        owner = await fetchone(conn, RUN_WORKSPACE, (run_id,))
        if owner is None:
            raise ApiError(404, "not_found", "error.run_not_found")
        workspace_id = owner["workspace_id"]
        run = await fetchone(conn, QUEUE_RUN, (workspace_id, run_id))
        steps = await fetchall(conn, RUN_STEPS, (workspace_id, run_id))
        events = await fetchall(conn, RUN_EVENTS, (workspace_id, run_id))
    return RunDetail(
        run=QueueRun(**run, max_attempts=max_attempts),
        steps=[RunStepItem(**s) for s in steps],
        events=[RunEventItem(**e) for e in events],
    )


# -------------------------------------------------------------------------------------------------
# Modelos e custos, consumo por cliente, qualidade
# -------------------------------------------------------------------------------------------------

PRICES = """
select distinct on (m.model)
       m.model, m.display_name, m.input_usd_per_mtok, m.output_usd_per_mtok,
       m.cache_read_usd_per_mtok,
       m.cache_write_usd_per_mtok, m.provisional, m.checked_at, m.source, m.valid_from
from public.model_pricing m
where m.valid_from <= now()
order by m.model, m.valid_from desc
"""

FX = """
select m.usd_brl, m.fx_date, m.fx_source
from public.model_pricing m
where m.valid_from <= now()
order by m.valid_from desc, m.fx_date desc
limit 1
"""

RULES = """
select distinct on (r.agent_id, r.task)
       r.agent_id::text as agent_id, r.task, r.steps, r.model, r.effort, r.thinking,
       r.thinking_budget,
       r.source, r.valid_from
from public.task_model_rules r
where r.valid_from <= now()
order by r.agent_id, r.task, r.valid_from desc
"""

COSTS_BY_MODEL = """
select s.model, count(*)::integer as calls,
       coalesce(sum(s.input_tokens), 0)::bigint as input_tokens,
       coalesce(sum(s.cache_read_tokens), 0)::bigint as cache_read_tokens,
       coalesce(sum(s.cache_write_tokens), 0)::bigint as cache_write_tokens,
       coalesce(sum(s.output_tokens), 0)::bigint as output_tokens,
       coalesce(sum(s.cost_usd), 0)::numeric(14, 6) as cost_usd
from public.run_steps s
where s.kind = 'llm_call' and s.model is not null
  and (s.created_at at time zone 'America/Sao_Paulo')::date between %s and %s
group by s.model
order by cost_usd desc, s.model
"""

AGENT_ORDER = ["nexo", "bia", "kaia", "otto", "kiwi", "max", "iris"]


@router.get(
    "/models",
    summary="Modelos e custos: preços e câmbio (provisórios), regras por tarefa e custo por modelo",
    responses=error_responses(*ADMIN_ERRORS),
)
async def get_models(
    tx: AdminTx, since: SinceQuery = None, until: UntilQuery = None
) -> ModelsOverview:
    since, until = period(since, until)
    async with tx() as conn:
        prices = await fetchall(conn, PRICES)
        fx = await fetchone(conn, FX)
        rules = await fetchall(conn, RULES)
        costs = await fetchall(conn, COSTS_BY_MODEL, (since, until))
    rules.sort(key=lambda r: (AGENT_ORDER.index(r["agent_id"]), r["task"] != "default"))
    return ModelsOverview(
        since=since,
        until=until,
        prices=[ModelPrice(**p) for p in sorted(prices, key=lambda p: p["valid_from"])],
        exchange_rate=ExchangeRate(**fx) if fx else None,
        rules=[TaskRule(**r) for r in rules],
        costs_by_model=[ModelCostRow(**c) for c in costs],
    )


CONSUMPTION = """
select v.workspace_id, w.name as workspace_name,
       sum(v.requests)::integer as requests,
       sum(v.credits_charged)::numeric(12, 2) as credits_charged,
       sum(v.llm_calls)::integer as llm_calls,
       sum(v.conversation_calls)::integer as conversation_calls,
       sum(v.input_tokens)::bigint as input_tokens,
       sum(v.cache_read_tokens)::bigint as cache_read_tokens,
       sum(v.cache_write_tokens)::bigint as cache_write_tokens,
       sum(v.output_tokens)::bigint as output_tokens,
       sum(v.ai_cost_deliveries_usd)::numeric(14, 6) as ai_cost_deliveries_usd,
       sum(v.ai_cost_conversation_usd)::numeric(14, 6) as ai_cost_conversation_usd,
       sum(v.ai_cost_deliveries_usd + v.ai_cost_conversation_usd)::numeric(14, 6) as ai_cost_usd
from public.v_consumo_por_cliente v
join public.workspaces w on w.id = v.workspace_id
where v.day between %(since)s and %(until)s
  and (%(workspace_id)s::uuid is null or v.workspace_id = %(workspace_id)s)
group by v.workspace_id, w.name
order by ai_cost_usd desc, w.name
"""

CENTS = Decimal("0.0001")


@router.get(
    "/consumption",
    summary="Consumo por cliente e período: solicitações, créditos cobrados, tokens e custo de IA",
    description=(
        "Conversa não cobra crédito, mas custa: aparece em `ai_cost_conversation_usd`. Reais pelo "
        "câmbio "
        "informado em Modelos e custos (provisório). Alertas econômicos ficam para a SA4."
    ),
    responses=error_responses(*ADMIN_ERRORS),
)
async def get_consumption(
    tx: AdminTx,
    since: SinceQuery = None,
    until: UntilQuery = None,
    workspace_id: UUID | None = None,
) -> ConsumptionResponse:
    since, until = period(since, until)
    async with tx() as conn:
        rows = await fetchall(
            conn, CONSUMPTION, {"since": since, "until": until, "workspace_id": workspace_id}
        )
        fx = await fetchone(conn, FX)
    usd_brl = fx["usd_brl"] if fx else None
    items = []
    for r in rows:
        cost_brl = (r["ai_cost_usd"] * usd_brl).quantize(CENTS) if usd_brl is not None else None
        per_credit = (
            (cost_brl / r["credits_charged"]).quantize(CENTS)
            if cost_brl is not None and r["credits_charged"]
            else None
        )
        items.append(ConsumptionRow(**r, ai_cost_brl=cost_brl, ai_cost_per_credit_brl=per_credit))
    fields = UsageTotals.model_fields
    totals = UsageTotals(**{f: sum((getattr(i, f) for i in items), start=0) for f in fields})
    return ConsumptionResponse(
        since=since, until=until, usd_brl=usd_brl, items=items, totals=totals
    )


QUALITY = """
select {key} as key,
       sum(q.deliveries)::integer as deliveries,
       sum(q.approved_first_time)::integer as approved_first_time,
       sum(q.approved)::integer as approved,
       sum(q.adjustments)::integer as adjustments,
       sum(q.not_approved)::integer as not_approved,
       sum(q.ai_cost_usd)::numeric(14, 6) as ai_cost_usd,
       case when sum(q.approved) > 0
            then (sum(q.ai_cost_approved_usd) / sum(q.approved))::numeric(14, 6) end
         as ai_cost_per_approved_usd,
       sum(q.failed_runs)::integer as failed_runs,
       sum(q.failed_steps)::integer as failed_steps
from public.v_qualidade_entregas q
where q.month between date_trunc('month', %(since)s::date)::date and %(until)s
  and (%(workspace_id)s::uuid is null or q.workspace_id = %(workspace_id)s)
group by 1
order by 1
"""


@router.get(
    "/quality",
    summary="Qualidade das entregas por tipo e por mês (aprovadas de primeira, ajustes, custo)",
    responses=error_responses(*ADMIN_ERRORS),
)
async def get_quality(
    tx: AdminTx,
    since: SinceQuery = None,
    until: UntilQuery = None,
    workspace_id: UUID | None = None,
) -> QualityResponse:
    since, until = period(since, until)
    params = {"since": since, "until": until, "workspace_id": workspace_id}
    async with tx() as conn:
        by_type = await fetchall(conn, QUALITY.format(key="q.delivery_type"), params)
        by_month = await fetchall(conn, QUALITY.format(key="to_char(q.month, 'YYYY-MM')"), params)
    return QualityResponse(
        since=since,
        until=until,
        by_type=[QualityRow(**r) for r in by_type],
        by_month=[QualityRow(**r) for r in by_month],
    )


# -------------------------------------------------------------------------------------------------
# Saúde das APIs
# -------------------------------------------------------------------------------------------------

PROVIDERS = "select * from public.provider_health order by sort_order"

LLM_ACTIVITY = """
with s as (
  select st.created_at, st.status, coalesce(st.cost_usd, 0) as cost,
         st.created_at > now() - interval '24 hours' as in_24h
  from public.run_steps st
  where st.kind = 'llm_call'
)
select count(*) filter (where in_24h)::integer as calls_24h,
       count(*) filter (where in_24h and status = 'failed')::integer as failures_24h,
       coalesce(sum(cost) filter (where in_24h), 0)::numeric(14, 6) as h24,
       coalesce(sum(cost) filter (where created_at > now() - interval '7 days'), 0)::numeric(14, 6)
         as d7,
       coalesce(sum(cost) filter (where created_at > now() - interval '30 days'), 0)::numeric(14, 6)
         as d30,
       coalesce(sum(cost), 0)::numeric(14, 6) as total,
       max(created_at) filter (where status = 'succeeded') as last_success_at
from s
"""


@router.get(
    "/providers",
    summary="Saúde das APIs: estado, chave configurada ou ausente, chamadas, falhas e gasto",
    responses=error_responses(*ADMIN_ERRORS),
)
async def get_providers(tx: AdminTx) -> ProvidersResponse:
    settings = get_settings()
    keys: dict[str, KeyState] = {
        "anthropic": key_state(settings.anthropic_api_key),
        "image_engine": "not_applicable",
        "asaas": key_state(settings.asaas_api_key),
        "mercadopago": key_state(settings.mercadopago_access_token),
        "email": "not_applicable",
    }
    async with tx() as conn:
        rows = await fetchall(conn, PROVIDERS)
        llm = await fetchone(conn, LLM_ACTIVITY)
    items = []
    for r in rows:
        activity = {"calls_24h": None, "failures_24h": None, "spend_usd": None}
        last_success = r["last_success_at"]
        if r["provider"] == "anthropic":
            activity = {
                "calls_24h": llm["calls_24h"],
                "failures_24h": llm["failures_24h"],
                "spend_usd": ProviderSpend(
                    h24=llm["h24"], d7=llm["d7"], d30=llm["d30"], total=llm["total"]
                ),
            }
            last_success = last_success or llm["last_success_at"]
        items.append(
            ProviderHealthItem(
                **{k: r[k] for k in ProviderHealthItem.model_fields if k in r},
                **activity,
                key=keys.get(r["provider"], "missing"),
            ).model_copy(update={"last_success_at": last_success})
        )
    return ProvidersResponse(items=items)
