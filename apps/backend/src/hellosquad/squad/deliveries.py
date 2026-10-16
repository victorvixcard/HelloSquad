"""Formato da entrega de cada delivery (`content` da versão revisável) e o JSON Schema da produção.

O fluxo é o mesmo para todas (triagem do Nexo → produzir → autoverificar → no máximo uma revisão →
entrega para a revisão da pessoa); o que muda por `delivery_type` é o formato da entrega, aqui, e o
contexto extra que o fluxo junta antes de produzir (busca web da 02.07, calendário da 04.02,
estratégia aprovada da Bia para o Otto), em `flow.py`. Chaves do conteúdo em português, como a
04.01; valores de lista fechada são ids que o web traduz.
"""

from dataclasses import dataclass
from datetime import date
from functools import cached_property
from typing import Any, Literal

from pydantic import Field, create_model, model_validator

from hellosquad.squad.schemas import (
    OBSERVATIONS_SCHEMA,
    STRING,
    STRINGS,
    CaptionDelivery,
    Observation,
    StepOutput,
    nullable,
    obj,
)

AGENTS = ["nexo", "bia", "kaia", "otto", "kiwi", "max", "iris"]
CHANNELS = [
    "instagram",
    "facebook",
    "whatsapp",
    "gbp",
    "site",
    "blog",
    "email",
    "tiktok",
    "linkedin",
]
FORMATS = ["post", "carousel", "reels", "stories", "status", "article", "email", "video"]
PRIORITIES = ["alta", "media", "baixa"]

AgentRef = Literal["nexo", "bia", "kaia", "otto", "kiwi", "max", "iris"]
Channel = Literal[
    "instagram", "facebook", "whatsapp", "gbp", "site", "blog", "email", "tiktok", "linkedin"
]
Format = Literal["post", "carousel", "reels", "stories", "status", "article", "email", "video"]
Priority = Literal["alta", "media", "baixa"]
Text = Field(min_length=1)


def enum(values: list[str]) -> dict[str, Any]:
    return {"type": "string", "enum": values}


def array(items: dict[str, Any]) -> dict[str, Any]:
    return {"type": "array", "items": items}


INTEGER = {"type": "integer"}


# 02.01 · Diagnóstico inicial de marketing ------------------------------------------------------


class Gap(StepOutput):
    titulo: str = Text
    descricao: str = Text


class Opportunity(StepOutput):
    titulo: str = Text
    descricao: str = Text
    prioridade: Priority


class MissingData(StepOutput):
    dado: str = Text
    como_conseguir: str = Text


class DiagnosisDelivery(StepOutput):
    titulo: str = Text
    resumo: str = Text
    lacunas: list[Gap] = Field(min_length=1)
    oportunidades: list[Opportunity] = Field(min_length=1)
    premissas: list[str]
    dados_que_faltam: list[MissingData]


DIAGNOSIS_SCHEMA = obj(
    {
        "titulo": STRING,
        "resumo": STRING,
        "lacunas": array(obj({"titulo": STRING, "descricao": STRING})),
        "oportunidades": array(
            obj({"titulo": STRING, "descricao": STRING, "prioridade": enum(PRIORITIES)})
        ),
        "premissas": STRINGS,
        "dados_que_faltam": array(obj({"dado": STRING, "como_conseguir": STRING})),
    }
)


# 02.02 · Posicionamento, público e objetivos ---------------------------------------------------


class Audience(StepOutput):
    nome: str = Text
    descricao: str = Text
    o_que_valoriza: str = Text


class Objective(StepOutput):
    objetivo: str = Text
    indicador: str = Text
    prazo: str = Text


class PositioningDelivery(StepOutput):
    titulo: str = Text
    resumo: str = Text
    posicionamento: str = Text
    diferenciais: list[str] = Field(min_length=1)
    publicos: list[Audience] = Field(min_length=1)
    objetivos: list[Objective] = Field(min_length=1)
    premissas: list[str]


POSITIONING_SCHEMA = obj(
    {
        "titulo": STRING,
        "resumo": STRING,
        "posicionamento": STRING,
        "diferenciais": STRINGS,
        "publicos": array(obj({"nome": STRING, "descricao": STRING, "o_que_valoriza": STRING})),
        "objetivos": array(obj({"objetivo": STRING, "indicador": STRING, "prazo": STRING})),
        "premissas": STRINGS,
    }
)


# 02.03 · Plano de marketing com prioridades ----------------------------------------------------


class PlanAction(StepOutput):
    ordem: int = Field(ge=1)
    acao: str = Text
    por_que: str = Text
    responsavel: AgentRef
    horizonte: str = Text


class MarketingPlanDelivery(StepOutput):
    titulo: str = Text
    resumo: str = Text
    horizonte: str = Text
    acoes: list[PlanAction] = Field(min_length=1)
    premissas: list[str]


MARKETING_PLAN_SCHEMA = obj(
    {
        "titulo": STRING,
        "resumo": STRING,
        "horizonte": STRING,
        "acoes": array(
            obj(
                {
                    "ordem": INTEGER,
                    "acao": STRING,
                    "por_que": STRING,
                    "responsavel": enum(AGENTS),
                    "horizonte": STRING,
                }
            )
        ),
        "premissas": STRINGS,
    }
)


# 02.04 · Estratégia para campanhas integradas --------------------------------------------------


class Concept(StepOutput):
    nome: str = Text
    ideia: str = Text


class CampaignFront(StepOutput):
    ordem: int = Field(ge=1)
    frente: str = Text
    responsavel: AgentRef
    entregas: list[str] = Field(min_length=1)


class CampaignStrategyDelivery(StepOutput):
    titulo: str = Text
    resumo: str = Text
    conceito: Concept
    publico: str = Text
    mensagens_chave: list[str] = Field(min_length=1)
    periodo: str = Text
    prioridades: list[CampaignFront] = Field(min_length=1)
    premissas: list[str]


CAMPAIGN_STRATEGY_SCHEMA = obj(
    {
        "titulo": STRING,
        "resumo": STRING,
        "conceito": obj({"nome": STRING, "ideia": STRING}),
        "publico": STRING,
        "mensagens_chave": STRINGS,
        "periodo": STRING,
        "prioridades": array(
            obj(
                {
                    "ordem": INTEGER,
                    "frente": STRING,
                    "responsavel": enum(AGENTS),
                    "entregas": STRINGS,
                }
            )
        ),
        "premissas": STRINGS,
    }
)


# 02.07 · Pesquisa de concorrentes e tendências -------------------------------------------------


class Finding(StepOutput):
    texto: str = Text
    tipo: Literal["pesquisa", "sugestao"]
    fontes: list[str]


class ResearchDelivery(StepOutput):
    """O que o modelo escreve. `pesquisa` e `fontes` entram pelo fluxo, a partir da busca feita."""

    titulo: str = Text
    resumo: str = Text
    achados: list[Finding] = Field(min_length=1)
    hipoteses: list[str]
    proximos_passos: list[str]


RESEARCH_SCHEMA = obj(
    {
        "titulo": STRING,
        "resumo": STRING,
        "achados": array(
            obj({"texto": STRING, "tipo": enum(["pesquisa", "sugestao"]), "fontes": STRINGS})
        ),
        "hipoteses": STRINGS,
        "proximos_passos": STRINGS,
    }
)


# 04.02 · Calendário editorial e pauta semanal --------------------------------------------------


class CalendarPeriod(StepOutput):
    inicio: date
    fim: date


class CalendarEntry(StepOutput):
    data: date
    horario: str | None = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    canal: Channel
    formato: Format
    tema: str = Field(min_length=1, max_length=200)
    responsavel: Literal["otto", "kaia"]
    objetivo: str = Text
    notas: str = Field(max_length=500)


class EditorialCalendarDelivery(StepOutput):
    titulo: str = Text
    periodo: CalendarPeriod
    posts: list[CalendarEntry] = Field(min_length=1)
    notas: str

    @model_validator(mode="after")
    def posts_inside_period(self) -> "EditorialCalendarDelivery":
        start, end = self.periodo.inicio, self.periodo.fim
        if start > end:
            raise ValueError("o período do calendário começa depois de terminar")
        outside = [p.data.isoformat() for p in self.posts if not start <= p.data <= end]
        if outside:
            raise ValueError(f"posts fora do período: {', '.join(outside)}")
        return self


EDITORIAL_CALENDAR_SCHEMA = obj(
    {
        "titulo": STRING,
        "periodo": obj({"inicio": STRING, "fim": STRING}),
        "posts": array(
            obj(
                {
                    "data": STRING,
                    "horario": nullable(STRING),
                    "canal": enum(CHANNELS),
                    "formato": enum(FORMATS),
                    "tema": STRING,
                    "responsavel": enum(["otto", "kaia"]),
                    "objetivo": STRING,
                    "notas": STRING,
                }
            )
        ),
        "notas": STRING,
    }
)


# 04.03 · Posts e roteiros multicanal -----------------------------------------------------------


class ScriptBeat(StepOutput):
    trecho: str = Text
    visual: str = Text


class ChannelVersion(StepOutput):
    canal: Channel
    formato: Format
    texto: str = Text
    roteiro: list[ScriptBeat]
    hashtags: list[str]
    cta: str


class MultichannelDelivery(StepOutput):
    """O que o modelo escreve. `estrategia` (a 02.04 aprovada usada) entra pelo fluxo."""

    titulo: str = Text
    tema: str = Text
    objetivo: str = Text
    versoes: list[ChannelVersion] = Field(min_length=1)
    pedido_para_kaia: str | None
    notas: str


MULTICHANNEL_SCHEMA = obj(
    {
        "titulo": STRING,
        "tema": STRING,
        "objetivo": STRING,
        "versoes": array(
            obj(
                {
                    "canal": enum(CHANNELS),
                    "formato": enum(FORMATS),
                    "texto": STRING,
                    "roteiro": array(obj({"trecho": STRING, "visual": STRING})),
                    "hashtags": STRINGS,
                    "cta": STRING,
                }
            )
        ),
        "pedido_para_kaia": nullable(STRING),
        "notas": STRING,
    }
)


# 04.01 · Textos e legendas (S1c) ---------------------------------------------------------------

CAPTION_SCHEMA = obj(
    {
        "canal": STRING,
        "objetivo": STRING,
        "versoes": array(obj({"texto": STRING, "hashtags": STRINGS, "cta": STRING})),
        "notas": STRING,
    }
)


@dataclass(frozen=True)
class DeliverySpec:
    delivery_type: str
    entrega: type[StepOutput]
    schema: dict[str, Any]

    @cached_property
    def production(self) -> type[StepOutput]:
        """Saída da etapa `produzir`/`revisar`: a entrega, a mensagem e o que o agente percebeu."""
        return create_model(
            f"Production_{self.delivery_type.replace('.', '_')}",
            __base__=StepOutput,
            entrega=(self.entrega, ...),
            mensagem=(str, Field(min_length=1)),
            observacoes=(list[Observation], Field(default_factory=list)),
        )

    @cached_property
    def production_schema(self) -> dict[str, Any]:
        return obj({"entrega": self.schema, "mensagem": STRING, "observacoes": OBSERVATIONS_SCHEMA})


DELIVERIES: dict[str, DeliverySpec] = {
    spec.delivery_type: spec
    for spec in (
        DeliverySpec("02.01", DiagnosisDelivery, DIAGNOSIS_SCHEMA),
        DeliverySpec("02.02", PositioningDelivery, POSITIONING_SCHEMA),
        DeliverySpec("02.03", MarketingPlanDelivery, MARKETING_PLAN_SCHEMA),
        DeliverySpec("02.04", CampaignStrategyDelivery, CAMPAIGN_STRATEGY_SCHEMA),
        DeliverySpec("02.07", ResearchDelivery, RESEARCH_SCHEMA),
        DeliverySpec("04.01", CaptionDelivery, CAPTION_SCHEMA),
        DeliverySpec("04.02", EditorialCalendarDelivery, EDITORIAL_CALENDAR_SCHEMA),
        DeliverySpec("04.03", MultichannelDelivery, MULTICHANNEL_SCHEMA),
    )
}


def delivery_spec(delivery_type: str | None) -> DeliverySpec | None:
    return DELIVERIES.get(delivery_type or "")
