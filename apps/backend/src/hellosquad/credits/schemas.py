from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from hellosquad.domain import DeliveryDepth

PROVISIONAL = "Valores provisórios (dono, 16/10): ainda não são regra comercial."


class CreditBalance(BaseModel):
    plan: str | None = Field(description="Nome do plano da conta.", examples=["Squad"])
    provisional: bool = Field(description=PROVISIONAL)
    balance: float = Field(description="Soma do extrato dos grants válidos (inclui o reservado).")
    reserved: float = Field(description="Reservado pelos runs em andamento.")
    available: float = Field(description="Disponível para novas entregas: saldo − reservado.")
    cycle_credits: float = Field(
        description="Créditos do ciclo do plano vigente (barra créditos do mês).", examples=[100]
    )
    cycle_used: float = Field(description="Usado no ciclo do plano vigente.", examples=[64])
    cycle_ends_at: datetime | None = Field(description="Fim do ciclo vigente. Nulo = não vence.")


class CreditEstimateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspace_id: UUID
    delivery_type: Annotated[str, StringConstraints(pattern=r"^[0-9]{2}\.[0-9]{2}$")] = Field(
        description="Delivery do catálogo.", examples=["04.01"]
    )
    work_item_id: UUID | None = Field(
        default=None,
        description=(
            "Trabalho que já tem versão entregue: a estimativa é de uma nova versão (ajuste ou "
            "nova proposta), com o preço de revisão."
        ),
    )


class CreditEstimate(BaseModel):
    delivery_type: str = Field(examples=["04.01"])
    depth: DeliveryDepth
    credits: float = Field(description="Quanto o run reserva ao começar e cobra se entregar.")
    revision: bool = Field(description="Nova versão de um trabalho que já tem entrega.")
    provisional: bool = Field(description=PROVISIONAL)
    available: float = Field(description="Disponível no workspace agora.")
    sufficient: bool = Field(description="O disponível cobre a estimativa.")
