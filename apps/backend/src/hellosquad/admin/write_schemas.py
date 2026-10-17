"""Corpos e respostas das rotas de escrita do Super Admin (SA6a). Todo pedido leva motivo de 10 a
500 caracteres; a regra também vale no banco (app.admin_reason)."""

from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field

Reason = Annotated[
    str,
    Field(
        min_length=10,
        max_length=500,
        description="Motivo (10 a 500 caracteres); fica em `audit_events`.",
    ),
]
Money = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]
Credits = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]


class ReasonRequest(BaseModel):
    reason: Reason


class SupportSessionStart(BaseModel):
    reason: Reason
    duration_minutes: Literal[15, 30, 60] = Field(
        default=30, description="Duração da sessão (padrão 30, leitura conservadora do dono)."
    )


class SupportSession(BaseModel):
    id: UUID
    workspace_id: UUID
    reason: str
    mode: Literal["read_only"]
    started_at: datetime
    expires_at: datetime
    ended_at: datetime | None
    status: Literal["active", "ended", "expired"]


class CreditAdjustmentRequest(BaseModel):
    amount: Annotated[Decimal, Field(max_digits=12, decimal_places=2)] = Field(
        description="Créditos: positivo concede (grant de origem `adjustment`); negativo debita "
        "(lançamento `adjustment`) só até o saldo disponível."
    )
    reason: Reason
    idempotency_key: str | None = Field(
        default=None,
        min_length=8,
        max_length=120,
        pattern=r"^[A-Za-z0-9._:-]+$",
        description="Repetir o pedido com a mesma chave não lança de novo.",
    )


class CreditAdjustmentResult(BaseModel):
    workspace_id: UUID
    amount: Decimal
    balance_before: Decimal
    balance_after: Decimal
    entries: int = Field(description="Lançamentos gravados no extrato (0 quando repetido).")
    duplicate: bool


class AccountStatusResult(BaseModel):
    workspace_id: UUID
    status: Literal["active", "suspended"]
    suspended_at: datetime | None
    suspension_reason: str | None


class CatalogPriceUpdate(BaseModel):
    credits: Credits
    revision_credits: Credits | None = None
    provisional: bool = Field(default=True, description="Valor provisório (padrão: sim).")
    approved_commercially: bool = Field(
        default=False, description='Trava "preço aprovado comercialmente" (padrão: não).'
    )
    reason: Reason


class CatalogPriceVersion(BaseModel):
    id: UUID
    delivery_type: str
    credits: Decimal
    revision_credits: Decimal | None
    provisional: bool
    approved_commercially: bool
    valid_from: datetime


HomologationStatus = Literal[
    "not_started", "in_homologation", "awaiting_integration", "awaiting_engine", "homologated"
]


class HomologationUpdate(BaseModel):
    status: HomologationStatus
    reason: Reason


class ForSaleUpdate(BaseModel):
    for_sale: bool
    reason: Reason


class CatalogState(BaseModel):
    delivery_type: str
    homologation_status: HomologationStatus
    for_sale: bool


class PlanVersionUpdate(BaseModel):
    credits: Credits
    cycle: Literal["one_time", "monthly"]
    validity_days: int | None = Field(default=None, gt=0)
    amount: Money | None = Field(default=None, description="Preço em dinheiro (versão nova).")
    currency: Annotated[str, Field(pattern=r"^[A-Z]{3}$")] = "BRL"
    provisional: bool = True
    approved_commercially: bool = False
    for_sale: bool = Field(default=False, description="Só com preço aprovado comercialmente.")
    reason: Reason


class PlanVersionResult(BaseModel):
    plan: str
    version: int
    credits: Decimal
    cycle: str
    validity_days: int | None
    provisional: bool
    approved_commercially: bool
    for_sale: bool
    valid_from: datetime


class TopupVersionUpdate(BaseModel):
    credits: Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]
    validity_days: int | None = Field(default=None, gt=0)
    amount: Money
    currency: Annotated[str, Field(pattern=r"^[A-Z]{3}$")] = "BRL"
    provisional: bool = True
    approved_commercially: bool = False
    for_sale: bool = Field(default=False, description="Só com preço aprovado comercialmente.")
    reason: Reason


class TopupVersionResult(BaseModel):
    topup: str
    pack_id: UUID
    credits: Decimal
    validity_days: int | None
    amount: Decimal
    currency: str
    provisional: bool
    approved_commercially: bool
    for_sale: bool
    valid_from: datetime


class RunActionResult(BaseModel):
    id: UUID
    workspace_id: UUID
    status: str
    attempts: int


class WebhookReprocessResult(BaseModel):
    payment_event_id: UUID
    provider: str
    provider_status: str | None = Field(
        description="Estado da cobrança no provedor agora (nulo = o provedor não informou)."
    )
    applied_event_id: str | None = Field(
        description="Evento de conciliação aplicado (`reprocess:<cobrança>:<estado>`)."
    )
    duplicate: bool | None = Field(description="true = este estado já tinha sido aplicado.")
    outcome: str = Field(description="`applied`, `no_change`, `ignored` ou `provider_unknown`.")


class ReconciliationResult(BaseModel):
    id: UUID
    payment_event_id: UUID
    reason: str
    created_at: datetime
