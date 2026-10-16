from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from hellosquad.billing.provider import PaymentMethod, PaymentStatus, ProviderName

NO_PRICE = "Sem valor em dinheiro: preço e plano ficam em tabela, provisórios (dono, 16/10)."


class WebhookReceipt(BaseModel):
    received: Literal[True] = True
    result: Literal["SUCCESS"] = Field(
        default="SUCCESS",
        description="Fila do Asaas com apiVersion antiga só aceita resposta com SUCCESS no corpo.",
    )
    duplicate: bool = Field(description="Evento já recebido antes: nada foi aplicado de novo.")
    outcome: Literal["received", "applied", "no_change", "ignored", "needs_review"] = Field(
        description=(
            "applied: mudou cobrança, assinatura ou créditos; no_change: estado igual ou fora de "
            "ordem; ignored: cobrança ou assinatura que não é desta plataforma; needs_review: "
            "conciliação à mão (estorno parcial)."
        )
    )


class SubscriptionState(BaseModel):
    status: Literal["none", "pending", "active", "past_due", "cancelled"] = Field(
        description=(
            "none: sem assinatura; pending: aguardando o primeiro pagamento; past_due: o período "
            "pago acabou sem o próximo ciclo confirmado (nada é bloqueado)."
        )
    )
    plan: str | None = Field(description="Nome do plano assinado.", examples=["Squad"])
    provisional: bool = Field(description=NO_PRICE)
    provider: ProviderName | None
    method: PaymentMethod | None
    current_period_start: datetime | None
    current_period_end: datetime | None = Field(description="Fim do período pago.")
    next_cycle_at: datetime | None = Field(
        description="Quando começa o próximo ciclo (nulo se cancelada ou sem assinatura)."
    )
    past_due_since: datetime | None
    cancelled_at: datetime | None


class PaymentItem(BaseModel):
    id: UUID
    kind: Literal["subscription_cycle", "topup"]
    method: PaymentMethod
    status: PaymentStatus
    provider: ProviderName
    credits: float = Field(description="Créditos que a confirmação concede.")
    credits_revoked: float = Field(description="Créditos retirados por estorno ou contestação.")
    period_start: datetime | None = Field(description="Ciclo coberto (assinatura).")
    period_end: datetime | None
    confirmed_at: datetime | None
    created_at: datetime


class PaymentPage(BaseModel):
    items: list[PaymentItem] = Field(description=f"O mais novo primeiro. {NO_PRICE}")
    next_cursor: str | None
