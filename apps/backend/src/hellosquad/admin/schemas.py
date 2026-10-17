"""Respostas das rotas /admin/* (Super Admin). Campos em inglês; o formato segue o que as telas
do protótipo SA0 esperam (design/super-admin-proto/app/data.js). Rótulos ficam no catálogo do web:
aqui só códigos estáveis. Nenhum segredo: chave de provedor é só "configured" ou "missing"."""

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

KeyState = Literal["configured", "missing", "not_applicable"]
ActorKind = Literal["platform_admin", "customer", "system"]


class AdminMe(BaseModel):
    user_id: UUID
    email: str | None
    full_name: str | None
    mfa_enforced: bool = Field(
        description="Verificação em duas etapas exigida. false até a Fase 5: o painel avisa."
    )


class AccountPlan(BaseModel):
    slug: str
    name: str
    provisional: bool


class AccountSummary(BaseModel):
    id: UUID
    slug: str
    name: str
    locale: str
    status: Literal["active", "suspended", "deleted"] = Field(
        description="`suspended` = suspensa pelo Super Admin (cobrança e rotinas pausadas)."
    )
    suspension_reason: str | None = None
    created_at: datetime
    plan: AccountPlan | None
    credits_balance: Decimal
    member_count: int
    owner_email: str | None


class AccountTotals(BaseModel):
    accounts: int
    paid_plans: int
    free_plans: int
    credits_balance: Decimal


class AccountPage(BaseModel):
    totals: AccountTotals
    items: list[AccountSummary]
    next_cursor: str | None


class AccountMember(BaseModel):
    user_id: UUID
    email: str | None
    full_name: str | None
    role: str
    member_since: datetime
    last_sign_in_at: datetime | None


class AccountCredits(BaseModel):
    balance: Decimal
    reserved: Decimal
    available: Decimal


class LedgerEntry(BaseModel):
    id: UUID
    entry_type: str
    amount: Decimal
    note: str | None
    run_id: UUID | None
    created_at: datetime


class SupportAccess(BaseModel):
    id: UUID
    admin_email: str | None
    reason: str
    mode: str
    started_at: datetime
    expires_at: datetime
    ended_at: datetime | None


class UsageTotals(BaseModel):
    requests: int
    credits_charged: Decimal
    llm_calls: int
    conversation_calls: int
    input_tokens: int
    cache_read_tokens: int
    cache_write_tokens: int
    output_tokens: int
    ai_cost_deliveries_usd: Decimal
    ai_cost_conversation_usd: Decimal
    ai_cost_usd: Decimal
    turns: int = Field(description="Runs com chamada de IA (cada resposta de um agente).")
    conversation_turns: int
    turn_cost_usd: Decimal


class AccountSubscription(BaseModel):
    status: str
    plan: str
    provisional: bool
    provider: str
    method: str
    current_period_end: datetime | None


class AccountDetail(BaseModel):
    account: AccountSummary
    members: list[AccountMember]
    credits: AccountCredits
    ledger: list[LedgerEntry] = Field(description="Últimos 20 lançamentos do extrato.")
    support_accesses: list[SupportAccess]
    usage_30d: UsageTotals
    subscription: AccountSubscription | None
    audit_event_id: UUID = Field(
        description="Registro desta leitura em audit_events (acesso do suporte)."
    )


class CatalogPrice(BaseModel):
    credits: Decimal
    revision_credits: Decimal | None
    provisional: bool
    approved_commercially: bool
    valid_from: datetime
    versions: int


class CatalogItem(BaseModel):
    delivery_type: str
    agent_id: str
    name: str
    result: str
    depth: str
    depth_source: Literal["inferred", "confirmed"]
    integrations: str | None
    prerequisites: str | None
    catalog_status: str
    homologation_status: str
    for_sale: bool
    price: CatalogPrice | None


class CatalogResponse(BaseModel):
    items: list[CatalogItem]


class PlanItem(BaseModel):
    id: UUID
    slug: str
    name: str
    for_sale: bool
    version: int
    cycle: str
    credits: Decimal
    validity_days: int | None
    provisional: bool
    approved_commercially: bool
    price_amount: Decimal | None
    price_currency: str | None
    price_provisional: bool | None
    price_approved_commercially: bool | None


class TopupItem(BaseModel):
    id: UUID
    slug: str
    name: str
    for_sale: bool
    version: int
    credits: Decimal
    validity_days: int | None
    amount: Decimal
    currency: str
    provisional: bool
    approved_commercially: bool


class PlansResponse(BaseModel):
    plans: list[PlanItem]
    topups: list[TopupItem]


class PaymentProviderState(BaseModel):
    provider: str
    selected: bool = Field(description="É o PAYMENT_PROVIDER das cobranças novas.")
    api_key: KeyState
    webhook_secret: KeyState


class AdminSubscription(BaseModel):
    id: UUID
    workspace_id: UUID
    workspace_name: str
    plan: str
    provisional: bool
    provider: str
    method: str
    status: str
    current_period_end: datetime | None
    amount: Decimal | None
    currency: str | None


class AdminPayment(BaseModel):
    id: UUID
    workspace_id: UUID
    workspace_name: str
    kind: str
    provider: str
    method: str
    status: str
    amount: Decimal
    currency: str
    credits: Decimal | None
    created_at: datetime
    confirmed_at: datetime | None


class AdminWebhookEvent(BaseModel):
    id: UUID
    provider: str
    event_id: str
    event_type: str
    workspace_id: UUID | None
    workspace_name: str | None
    outcome: str | None
    note: str | None
    received_at: datetime
    processed_at: datetime | None
    reconciled_at: datetime | None = None
    reconciliation_reason: str | None = None


class PaymentsOverview(BaseModel):
    providers: list[PaymentProviderState]
    subscriptions: list[AdminSubscription]
    payments: list[AdminPayment] = Field(description="Últimas 50 cobranças.")
    webhooks: list[AdminWebhookEvent] = Field(description="Últimos 50 eventos recebidos.")


class AuditItem(BaseModel):
    id: UUID
    created_at: datetime
    actor: ActorKind
    actor_type: str
    actor_id: str | None
    actor_email: str | None
    actor_name: str | None
    workspace_id: UUID | None
    workspace_name: str | None
    category: str
    action: str
    entity_type: str | None
    entity_id: str | None
    payload: dict[str, Any]


class AuditPage(BaseModel):
    items: list[AuditItem]
    next_cursor: str | None


class QueueSize(BaseModel):
    queue_name: str
    queued: int
    in_flight: int
    oldest_enqueued_at: datetime | None


class QueueRun(BaseModel):
    id: UUID
    workspace_id: UUID
    workspace_name: str
    work_item_id: UUID | None
    work_title: str | None
    delivery_type: str | None
    agent_id: str | None
    kind: str
    status: str
    attempts: int
    max_attempts: int
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    queue_name: str | None
    lease_until: datetime | None
    current_step: str | None
    error_code: str | None
    error_message: str | None


class QueueOverview(BaseModel):
    queues: list[QueueSize]
    status_counts: dict[str, int]
    runs: list[QueueRun]
    next_cursor: str | None


class RunStepItem(BaseModel):
    seq: int
    kind: str
    step: str | None
    model: str | None
    status: str
    input_tokens: int | None
    output_tokens: int | None
    cache_read_tokens: int | None
    cache_write_tokens: int | None
    cost_usd: Decimal | None
    latency_ms: int | None
    created_at: datetime


class RunEventItem(BaseModel):
    seq: int
    type: str
    payload: dict[str, Any]
    created_at: datetime


class RunDetail(BaseModel):
    run: QueueRun
    steps: list[RunStepItem]
    events: list[RunEventItem]


class ModelPrice(BaseModel):
    model: str
    display_name: str
    input_usd_per_mtok: Decimal
    output_usd_per_mtok: Decimal
    cache_read_usd_per_mtok: Decimal
    cache_write_usd_per_mtok: Decimal
    provisional: bool
    checked_at: date
    source: str
    valid_from: datetime


class ExchangeRate(BaseModel):
    usd_brl: Decimal
    fx_date: date
    fx_source: str


class TaskRule(BaseModel):
    agent_id: str
    task: str
    steps: list[str]
    model: str
    effort: str | None
    thinking: str
    thinking_budget: int | None
    source: str
    valid_from: datetime


class ModelCostRow(BaseModel):
    model: str
    calls: int
    input_tokens: int
    cache_read_tokens: int
    cache_write_tokens: int
    output_tokens: int
    cost_usd: Decimal


class ModelsOverview(BaseModel):
    since: date
    until: date
    prices: list[ModelPrice]
    exchange_rate: ExchangeRate | None
    rules: list[TaskRule]
    costs_by_model: list[ModelCostRow]


AlertMetric = Literal["ai_cost_per_credit_brl", "gross_margin", "cost_per_turn_trend"]
Granularity = Literal["day", "week", "month"]


class AlertRule(BaseModel):
    metric: AlertMetric
    comparison: Literal["max", "min"] = Field(
        description="max = OK até o limite (acima, atenção); min = OK a partir do limite."
    )
    threshold: Decimal = Field(description="R$ por crédito, ou fração (0,65 = 65%; 0,10 = +10%).")
    credit_reference_brl: Decimal | None = Field(
        description="Valor do crédito em R$ usado na margem (exemplo do protótipo, provisório)."
    )
    window_days: int | None
    proposal: bool = Field(description="Faixa ainda é proposta; o Vic decide.")
    source: str
    valid_from: datetime


class EconomicAlert(BaseModel):
    metric: AlertMetric
    value: Decimal
    threshold: Decimal
    comparison: Literal["max", "min"]
    proposal: bool


class EconomicReadings(BaseModel):
    """As três leituras econômicas; alerta só avisa, nada muda automaticamente."""

    ai_cost_per_credit_brl: Decimal | None = Field(
        description="Custo de IA (entregas e conversa) em R$ ÷ créditos cobrados."
    )
    gross_margin: Decimal | None = Field(
        description="1 − custo de IA em R$ ÷ (créditos × valor de referência do crédito)."
    )
    cost_per_turn_usd: Decimal | None = Field(description="Custo dos turnos ÷ turnos, no período.")
    cost_per_turn_trend: Decimal | None = Field(
        description="Custo por turno nos últimos N dias ÷ nos N anteriores − 1 (N da faixa)."
    )
    alerts: list[EconomicAlert]


class ConsumptionRow(UsageTotals):
    workspace_id: UUID
    workspace_name: str
    ai_cost_brl: Decimal | None
    ai_cost_per_credit_brl: Decimal | None
    economics: EconomicReadings


class ConsumptionBucket(BaseModel):
    period_start: date
    requests: int
    credits_charged: Decimal
    llm_calls: int
    ai_cost_deliveries_usd: Decimal
    ai_cost_conversation_usd: Decimal
    ai_cost_usd: Decimal
    ai_cost_brl: Decimal | None
    turns: int
    turn_cost_usd: Decimal
    ai_cost_per_credit_brl: Decimal | None
    gross_margin: Decimal | None
    cost_per_turn_usd: Decimal | None


class MarginBasis(BaseModel):
    """Com que preços a margem foi estimada; tudo provisório até o Vic decidir preço e créditos."""

    credit_reference_brl: Decimal | None = Field(
        description="Valor do crédito em R$ na faixa da margem (exemplo do protótipo)."
    )
    exchange_rate: ExchangeRate | None = Field(description="Câmbio de Modelos e custos.")
    provisional: bool = Field(
        description="Verdadeiro enquanto a faixa for proposta ou o preço/câmbio for provisório."
    )


class ConsumptionResponse(BaseModel):
    since: date
    until: date
    usd_brl: Decimal | None
    items: list[ConsumptionRow]
    totals: UsageTotals
    granularity: Granularity
    series: list[ConsumptionBucket] = Field(
        description="Conjunto filtrado (todas as contas ou `workspace_id`) por dia, semana ou mês."
    )
    economics: EconomicReadings = Field(
        description=(
            "Leituras do conjunto filtrado: somas para IA por crédito, margem e custo por turno; "
            "tendência = média das contas ponderada pelo custo (como o protótipo)."
        )
    )
    trend_accounts: int = Field(description="Contas que entraram na tendência do conjunto.")
    alert_rules: list[AlertRule]
    margin_basis: MarginBasis


class AccountAlerts(BaseModel):
    workspace_id: UUID
    workspace_name: str
    alerts: list[EconomicAlert]


class ProviderBalanceAlert(BaseModel):
    provider: str
    display_name: str
    reported_balance: Decimal
    reported_balance_currency: str
    reported_balance_at: datetime
    alert_below: Decimal


class AlertsResponse(BaseModel):
    since: date
    until: date
    accounts: list[AccountAlerts] = Field(
        description="Só as contas com alguma leitura fora da faixa."
    )
    providers: list[ProviderBalanceAlert] = Field(description="Saldo informado abaixo do limiar.")
    alert_rules: list[AlertRule]


class QualityRow(BaseModel):
    key: str = Field(description="delivery_type em by_type; AAAA-MM em by_month.")
    deliveries: int
    approved_first_time: int
    approved: int
    adjustments: int
    not_approved: int
    ai_cost_usd: Decimal
    ai_cost_per_approved_usd: Decimal | None
    failed_runs: int
    failed_steps: int
    agent_errors: int


class PromptVersionSource(BaseModel):
    kind: str | None = None
    key: str | None = None
    version: int | None = None


class QualityPromptVersionRow(QualityRow):
    agent_id: str
    prompt_version: str = Field(description="Hash do prompt montado (runs.prompt_version).")
    origin: str | None = Field(description="database = versões do painel (SA3a); files = squad/.")
    sources: list[PromptVersionSource]
    first_used_at: datetime | None


class HowToRead(BaseModel):
    key: str
    title: str
    text: str


class QualityResponse(BaseModel):
    since: date
    until: date
    by_type: list[QualityRow]
    by_month: list[QualityRow]
    by_prompt_version: list[QualityPromptVersionRow]
    locale: str
    how_to_read: list[HowToRead]


class QualityRates(BaseModel):
    approved_first_rate: Decimal | None
    adjustments_per_delivery: Decimal | None
    not_approved_rate: Decimal | None
    ai_cost_per_approved_usd: Decimal | None
    agent_errors_per_100: Decimal | None
    failed_calls_per_100: Decimal | None


class QualityPeriod(BaseModel):
    since: date
    until: date
    totals: QualityRow
    rates: QualityRates
    prompt_versions: list[QualityPromptVersionRow]


class QualityComparison(BaseModel):
    a: QualityPeriod
    b: QualityPeriod
    delta: QualityRates = Field(description="b − a, nas mesmas unidades das taxas.")


class ProviderSpend(BaseModel):
    h24: Decimal
    d7: Decimal
    d30: Decimal
    total: Decimal


class BalanceReport(BaseModel):
    id: UUID
    amount: Decimal
    currency: str
    read_at: datetime
    alert_below: Decimal | None
    reason: str
    reported_by: UUID
    reported_by_email: str | None
    created_at: datetime


class ProviderHealthItem(BaseModel):
    provider: str
    display_name: str
    purpose: str
    status: str
    key: KeyState
    calls_24h: int | None
    failures_24h: int | None
    spend_usd: ProviderSpend | None
    last_success_at: datetime | None
    last_failure_at: datetime | None
    last_failure_text: str | None
    last_balance_refusal_at: datetime | None
    reported_balance: Decimal | None
    reported_balance_currency: str | None
    reported_balance_at: datetime | None
    alert_below: Decimal | None
    note: str | None
    calls_7d: int | None = None
    failures_7d: int | None = None
    balance_alert: bool = Field(
        default=False, description="Saldo informado abaixo do limiar (na moeda do saldo)."
    )
    balance_history: list[BalanceReport] = Field(default_factory=list)


class ProvidersResponse(BaseModel):
    items: list[ProviderHealthItem]


class BalanceUpdate(BaseModel):
    amount: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    read_at: datetime = Field(description="Quando o saldo foi lido no painel do provedor.")
    reason: str = Field(min_length=10, max_length=500)
    alert_below: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
        description="Nulo mantém o limiar atual.",
    )
