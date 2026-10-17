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


# 05.01 · Plano de mídia e recomendação de orçamento -------------------------------------------
# Verba de mídia é dinheiro do cliente, separado dos créditos da plataforma: o teto proposto é o
# limite que a pessoa autorizaria, nunca crédito. Nada é investido: `execucao` entra pelo fluxo.

AD_CHANNELS = ["meta_ads", "google_ads"]
AdChannel = Literal["meta_ads", "google_ads"]


class MediaChannel(StepOutput):
    canal: AdChannel
    papel: str = Text
    publico: str = Text


class BudgetSplit(StepOutput):
    canal: AdChannel
    valor: int = Field(ge=0)


class MediaBudget(StepOutput):
    moeda: Literal["BRL"]
    teto_informado: int | None = Field(ge=0)
    teto_proposto: int = Field(ge=0)
    periodo: str = Text
    distribuicao: list[BudgetSplit] = Field(min_length=1)

    @model_validator(mode="after")
    def inside_ceiling(self) -> "MediaBudget":
        if self.teto_informado is not None and self.teto_proposto > self.teto_informado:
            raise ValueError("o teto proposto passa do valor que a pessoa informou")
        if sum(s.valor for s in self.distribuicao) > self.teto_proposto:
            raise ValueError("a distribuição passa do teto proposto")
        return self


class Hypothesis(StepOutput):
    hipotese: str = Text
    como_medir: str = Text
    criterio_de_sucesso: str = Text


class MediaPlanDelivery(StepOutput):
    """O que o modelo escreve. `execucao` (nada investido, conta não conectada) entra pelo fluxo."""

    titulo: str = Text
    resumo: str = Text
    objetivos: list[Objective] = Field(min_length=1)
    canais: list[MediaChannel] = Field(min_length=1)
    orcamento: MediaBudget
    limites: list[str] = Field(min_length=1)
    hipoteses: list[Hypothesis] = Field(min_length=1)
    para_executar: list[str] = Field(min_length=1)
    premissas: list[str]

    @model_validator(mode="after")
    def budget_on_planned_channels(self) -> "MediaPlanDelivery":
        planned = {c.canal for c in self.canais}
        outside = sorted({s.canal for s in self.orcamento.distribuicao} - planned)
        if outside:
            raise ValueError(f"verba em canal fora do plano: {', '.join(outside)}")
        return self


MEDIA_PLAN_SCHEMA = obj(
    {
        "titulo": STRING,
        "resumo": STRING,
        "objetivos": array(obj({"objetivo": STRING, "indicador": STRING, "prazo": STRING})),
        "canais": array(obj({"canal": enum(AD_CHANNELS), "papel": STRING, "publico": STRING})),
        "orcamento": obj(
            {
                "moeda": enum(["BRL"]),
                "teto_informado": nullable(INTEGER),
                "teto_proposto": INTEGER,
                "periodo": STRING,
                "distribuicao": array(obj({"canal": enum(AD_CHANNELS), "valor": INTEGER})),
            }
        ),
        "limites": STRINGS,
        "hipoteses": array(
            obj({"hipotese": STRING, "como_medir": STRING, "criterio_de_sucesso": STRING})
        ),
        "para_executar": STRINGS,
        "premissas": STRINGS,
    }
)


# 05.02 · Públicos e testes de anúncios ---------------------------------------------------------

TEST_VARIABLES = ["publico", "mensagem", "criativo", "formato"]


class AdAudience(StepOutput):
    id: str = Field(pattern=r"^P\d{1,2}$")
    nome: str = Text
    segmentacao: str = Text
    por_que: str = Text


class AdMessage(StepOutput):
    id: str = Field(pattern=r"^M\d{1,2}$")
    angulo: str = Text
    texto: str = Text


class AdVariation(StepOutput):
    id: str = Field(pattern=r"^V\d{1,2}$")
    publico: str = Text
    mensagem: str = Text
    canal: AdChannel
    formato: Format
    criativo: str = Text


class AdTest(StepOutput):
    ordem: int = Field(ge=1)
    hipotese: str = Text
    variavel: Literal["publico", "mensagem", "criativo", "formato"]
    variacoes: list[str] = Field(min_length=2)
    metrica_principal: str = Text
    criterio_de_sucesso: str = Text
    duracao: str = Text
    verba: int | None = Field(ge=0)


class AdTestsDelivery(StepOutput):
    """O que o modelo escreve. `execucao` e o plano de mídia aprovado entram pelo fluxo."""

    titulo: str = Text
    resumo: str = Text
    publicos: list[AdAudience] = Field(min_length=1)
    mensagens: list[AdMessage] = Field(min_length=1)
    variacoes: list[AdVariation] = Field(min_length=2)
    testes: list[AdTest] = Field(min_length=1)
    pedido_para_kaia: str | None
    premissas: list[str]

    @model_validator(mode="after")
    def references_exist(self) -> "AdTestsDelivery":
        audiences = {p.id for p in self.publicos}
        messages = {m.id for m in self.mensagens}
        variations = {v.id for v in self.variacoes}
        if len(audiences) < len(self.publicos) or len(messages) < len(self.mensagens):
            raise ValueError("id de público ou de mensagem repetido")
        if len(variations) < len(self.variacoes):
            raise ValueError("id de variação repetido")
        broken = [
            v.id for v in self.variacoes if v.publico not in audiences or v.mensagem not in messages
        ]
        broken += [x for t in self.testes for x in t.variacoes if x not in variations]
        if broken:
            raise ValueError(f"referência que não existe: {', '.join(broken)}")
        return self


AD_TESTS_SCHEMA = obj(
    {
        "titulo": STRING,
        "resumo": STRING,
        "publicos": array(
            obj({"id": STRING, "nome": STRING, "segmentacao": STRING, "por_que": STRING})
        ),
        "mensagens": array(obj({"id": STRING, "angulo": STRING, "texto": STRING})),
        "variacoes": array(
            obj(
                {
                    "id": STRING,
                    "publico": STRING,
                    "mensagem": STRING,
                    "canal": enum(AD_CHANNELS),
                    "formato": enum(FORMATS),
                    "criativo": STRING,
                }
            )
        ),
        "testes": array(
            obj(
                {
                    "ordem": INTEGER,
                    "hipotese": STRING,
                    "variavel": enum(TEST_VARIABLES),
                    "variacoes": STRINGS,
                    "metrica_principal": STRING,
                    "criterio_de_sucesso": STRING,
                    "duracao": STRING,
                    "verba": nullable(INTEGER),
                }
            )
        ),
        "pedido_para_kaia": nullable(STRING),
        "premissas": STRINGS,
    }
)


# 06.03 · Segmentação de base de clientes -------------------------------------------------------
# Os segmentos possíveis são calculados pelo fluxo a partir da base importada (critério fechado); o
# modelo escolhe, nomeia e diz o uso. Tamanho, elegíveis por canal e origem saem da base, nunca do
# modelo.

SEGMENT_IDS = ["todos", "ativos_30", "esfriando_31_90", "inativos_90", "sem_compra", "recorrentes"]
SegmentId = Literal[
    "todos", "ativos_30", "esfriando_31_90", "inativos_90", "sem_compra", "recorrentes"
]
MESSAGE_CHANNELS = ["email", "whatsapp"]
MessageChannel = Literal["email", "whatsapp"]


class SegmentPick(StepOutput):
    id: SegmentId
    nome: str = Text
    descricao: str = Text
    uso_sugerido: str = Text


class SegmentationDelivery(StepOutput):
    """O que o modelo escreve. `base` e os números de cada segmento entram pelo fluxo."""

    titulo: str = Text
    resumo: str = Text
    segmentos: list[SegmentPick] = Field(min_length=1)
    cuidados: list[str] = Field(min_length=1)
    premissas: list[str]

    @model_validator(mode="after")
    def unique_segments(self) -> "SegmentationDelivery":
        if len({s.id for s in self.segmentos}) < len(self.segmentos):
            raise ValueError("segmento repetido")
        return self


SEGMENTATION_SCHEMA = obj(
    {
        "titulo": STRING,
        "resumo": STRING,
        "segmentos": array(
            obj(
                {
                    "id": enum(SEGMENT_IDS),
                    "nome": STRING,
                    "descricao": STRING,
                    "uso_sugerido": STRING,
                }
            )
        ),
        "cuidados": STRINGS,
        "premissas": STRINGS,
    }
)


# 06.01 · Planejar campanha de reativação/fidelização -------------------------------------------


class SegmentChoice(StepOutput):
    id: SegmentId
    por_que: str = Text


class CampaignOffer(StepOutput):
    descricao: str = Text
    condicoes: str = Text
    validade: str = Text


class CampaignStep(StepOutput):
    ordem: int = Field(ge=1)
    data: date
    canal: MessageChannel
    acao: str = Text


class RetentionCampaignDelivery(StepOutput):
    """O que o modelo escreve. Números do segmento e `envio` entram pelo fluxo."""

    titulo: str = Text
    resumo: str = Text
    tipo: Literal["reativacao", "fidelizacao"]
    objetivo: Objective
    segmento: SegmentChoice
    oferta: CampaignOffer
    calendario: list[CampaignStep] = Field(min_length=1)
    como_medir: list[str] = Field(min_length=1)
    premissas: list[str]

    @model_validator(mode="after")
    def calendar_in_order(self) -> "RetentionCampaignDelivery":
        days = [s.data for s in sorted(self.calendario, key=lambda s: s.ordem)]
        if days != sorted(days) or len({s.ordem for s in self.calendario}) < len(days):
            raise ValueError("o calendário precisa de ordem única e datas em sequência")
        return self


RETENTION_CAMPAIGN_SCHEMA = obj(
    {
        "titulo": STRING,
        "resumo": STRING,
        "tipo": enum(["reativacao", "fidelizacao"]),
        "objetivo": obj({"objetivo": STRING, "indicador": STRING, "prazo": STRING}),
        "segmento": obj({"id": enum(SEGMENT_IDS), "por_que": STRING}),
        "oferta": obj({"descricao": STRING, "condicoes": STRING, "validade": STRING}),
        "calendario": array(
            obj(
                {
                    "ordem": INTEGER,
                    "data": STRING,
                    "canal": enum(MESSAGE_CHANNELS),
                    "acao": STRING,
                }
            )
        ),
        "como_medir": STRINGS,
        "premissas": STRINGS,
    }
)


# 06.02 · Sequências de e-mail e mensagens ------------------------------------------------------


class SequenceStep(StepOutput):
    ordem: int = Field(ge=1)
    dia: int = Field(ge=0)
    canal: MessageChannel
    assunto: str | None
    texto: str = Text
    cta: str = Text
    condicao: str | None
    descadastro: str = Text

    @model_validator(mode="after")
    def subject_only_for_email(self) -> "SequenceStep":
        if (self.canal == "email") != bool((self.assunto or "").strip()):
            raise ValueError("e-mail precisa de assunto; WhatsApp não tem assunto")
        return self


class MessageSequenceDelivery(StepOutput):
    """O que o modelo escreve. `envio` e a campanha aprovada entram pelo fluxo."""

    titulo: str = Text
    resumo: str = Text
    objetivo: str = Text
    segmento: SegmentId | None
    etapas: list[SequenceStep] = Field(min_length=1)
    frequencia: str = Text
    premissas: list[str]

    @model_validator(mode="after")
    def steps_in_order(self) -> "MessageSequenceDelivery":
        steps = sorted(self.etapas, key=lambda s: s.ordem)
        if len({s.ordem for s in steps}) < len(steps) or [s.dia for s in steps] != sorted(
            s.dia for s in steps
        ):
            raise ValueError("as etapas precisam de ordem única e dias em sequência")
        return self


MESSAGE_SEQUENCE_SCHEMA = obj(
    {
        "titulo": STRING,
        "resumo": STRING,
        "objetivo": STRING,
        "segmento": nullable(enum(SEGMENT_IDS)),
        "etapas": array(
            obj(
                {
                    "ordem": INTEGER,
                    "dia": INTEGER,
                    "canal": enum(MESSAGE_CHANNELS),
                    "assunto": nullable(STRING),
                    "texto": STRING,
                    "cta": STRING,
                    "condicao": nullable(STRING),
                    "descadastro": STRING,
                }
            )
        ),
        "frequencia": STRING,
        "premissas": STRINGS,
    }
)


# 07.02, 07.03 e 07.04 · Íris -------------------------------------------------------------------
# Os números saem de `metrics_daily` pelo fluxo, como evidências com id (E1, E2…), nunca do modelo.
# Leitura `fato` precisa citar evidência; `causa` precisa citar um teste controlado (T1…), que ainda
# não existe na plataforma: sem ele, o fluxo rebaixa para `hipotese`. Correlação não é causa.

READING_TYPES = ["fato", "hipotese", "causa"]


class Reading(StepOutput):
    texto: str = Text
    tipo: Literal["fato", "hipotese", "causa"]
    evidencias: list[str]


class ChannelReading(Reading):
    canal: str = Text


class PerformanceAnalysisDelivery(StepOutput):
    titulo: str = Text
    resumo: str = Text
    leituras: list[Reading] = Field(min_length=1)
    o_que_os_dados_nao_mostram: list[str] = Field(min_length=1)
    dados_que_faltam: list[MissingData]
    proximos_passos: list[str]


READING_SCHEMA = obj({"texto": STRING, "tipo": enum(READING_TYPES), "evidencias": STRINGS})

PERFORMANCE_ANALYSIS_SCHEMA = obj(
    {
        "titulo": STRING,
        "resumo": STRING,
        "leituras": array(READING_SCHEMA),
        "o_que_os_dados_nao_mostram": STRINGS,
        "dados_que_faltam": array(obj({"dado": STRING, "como_conseguir": STRING})),
        "proximos_passos": STRINGS,
    }
)


class PeriodReportDelivery(StepOutput):
    titulo: str = Text
    resumo: str = Text
    destaques: list[Reading] = Field(min_length=1)
    por_canal: list[ChannelReading] = Field(min_length=1)
    limitacoes: list[str] = Field(min_length=1)
    proximos_passos: list[str]


PERIOD_REPORT_SCHEMA = obj(
    {
        "titulo": STRING,
        "resumo": STRING,
        "destaques": array(READING_SCHEMA),
        "por_canal": array(
            obj(
                {
                    "canal": STRING,
                    "texto": STRING,
                    "tipo": enum(READING_TYPES),
                    "evidencias": STRINGS,
                }
            )
        ),
        "limitacoes": STRINGS,
        "proximos_passos": STRINGS,
    }
)


class Recommendation(StepOutput):
    ordem: int = Field(ge=1)
    acao: str = Text
    por_que: str = Text
    base: Literal["dado", "hipotese"]
    evidencias: list[str]
    responsavel: AgentRef
    esforco: Literal["baixo", "medio", "alto"]
    discutir_com: list[AgentRef] = Field(min_length=1)


class RecommendationsDelivery(StepOutput):
    titulo: str = Text
    resumo: str = Text
    recomendacoes: list[Recommendation] = Field(min_length=1)
    perguntas_para_o_squad: list[str] = Field(min_length=1)
    premissas: list[str]


RECOMMENDATIONS_SCHEMA = obj(
    {
        "titulo": STRING,
        "resumo": STRING,
        "recomendacoes": array(
            obj(
                {
                    "ordem": INTEGER,
                    "acao": STRING,
                    "por_que": STRING,
                    "base": enum(["dado", "hipotese"]),
                    "evidencias": STRINGS,
                    "responsavel": enum(AGENTS),
                    "esforco": enum(["baixo", "medio", "alto"]),
                    "discutir_com": array(enum(AGENTS)),
                }
            )
        ),
        "perguntas_para_o_squad": STRINGS,
        "premissas": STRINGS,
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
        DeliverySpec("05.01", MediaPlanDelivery, MEDIA_PLAN_SCHEMA),
        DeliverySpec("05.02", AdTestsDelivery, AD_TESTS_SCHEMA),
        DeliverySpec("06.01", RetentionCampaignDelivery, RETENTION_CAMPAIGN_SCHEMA),
        DeliverySpec("06.02", MessageSequenceDelivery, MESSAGE_SEQUENCE_SCHEMA),
        DeliverySpec("06.03", SegmentationDelivery, SEGMENTATION_SCHEMA),
        DeliverySpec("07.02", PerformanceAnalysisDelivery, PERFORMANCE_ANALYSIS_SCHEMA),
        DeliverySpec("07.03", PeriodReportDelivery, PERIOD_REPORT_SCHEMA),
        DeliverySpec("07.05", PeriodReportDelivery, PERIOD_REPORT_SCHEMA),
        DeliverySpec("07.04", RecommendationsDelivery, RECOMMENDATIONS_SCHEMA),
    )
}


def delivery_spec(delivery_type: str | None) -> DeliverySpec | None:
    return DELIVERIES.get(delivery_type or "")
