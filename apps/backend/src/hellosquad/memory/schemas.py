from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from hellosquad.domain import (
    AgentId,
    BrandFactState,
    FactSourceKind,
    FactSourceState,
    MemoryArea,
    MemoryConflictResolution,
    MemoryConflictState,
    MemorySuggestionDecision,
    MemorySuggestionState,
)

FactText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]


class BrandFact(BaseModel):
    id: UUID
    workspace_id: UUID
    area: MemoryArea = Field(
        description=(
            "`business` Meu negócio, `brand` Minha marca, `audience` Meu público, `knowledge` "
            "Conhecimento e aprendizados."
        )
    )
    topic: str = Field(description="Assunto dentro da área.", examples=["Tom de voz"])
    key: str = Field(examples=["Palavra proibida"])
    content: str = Field(examples=["Não usar a palavra 'artesanal' nas legendas"])
    content_json: Any | None
    state: BrandFactState = Field(
        description=(
            "`confirmed` Confirmado, `decision` Decisão sua, `from_source` Da fonte, `observed` "
            "Observado, `suggested` Sugerido, `outdated` Desatualizado, `discarded` Descartado, "
            "`conflicting` Em conflito, `unused` Não usado. O squad usa só Confirmado e Decisão "
            "sua como orientação."
        )
    )
    source_type: FactSourceKind
    source_id: UUID | None
    origin: str | None = Field(examples=["Contado por você no cadastro"])
    used_by_agents: list[AgentId] = Field(description="Agentes que usam este conhecimento.")
    perceived_by_agent_id: AgentId | None = Field(
        description='Quem percebeu ("<Agente> percebeu").'
    )
    confidence: float | None
    valid_from: datetime
    valid_until: datetime | None
    version: int
    supersedes_id: UUID | None = Field(description="Versão anterior que esta corrigiu.")
    superseded_at: datetime | None = Field(description="Nulo = versão atual.")
    confirmed_by: UUID | None
    confirmed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    unused_from: BrandFactState | None = Field(
        default=None,
        description='Estado antes de "Não usar mais" ("Voltar a usar" volta para ele).',
    )


class MemoryTopic(BaseModel):
    topic: str
    facts: list[BrandFact]


class MemoryAreaGroup(BaseModel):
    area: MemoryArea
    topics: list[MemoryTopic]


class FactSource(BaseModel):
    id: UUID
    kind: FactSourceKind
    name: str = Field(examples=["Instagram"])
    state: FactSourceState = Field(
        description=(
            "`declared` Declarado por você, `connected` Conectada, `outdated` Desatualizada, "
            "`needs_reconnect` Precisa reconectar, `not_connected` Não conectada, `unavailable` "
            "Indisponível."
        )
    )
    permissions: list[str] = Field(examples=[["Ler posts e métricas"]])
    last_sync_at: datetime | None
    fact_count: int = Field(description="Conhecimentos atuais que vieram desta fonte.")
    created_at: datetime
    updated_at: datetime


class FactSourceList(BaseModel):
    items: list[FactSource]


class MemorySuggestion(BaseModel):
    id: UUID
    workspace_id: UUID
    agent_id: AgentId = Field(description='Quem percebeu ("<Agente> percebeu").')
    title: str = Field(description="Leitura curta do agente.")
    explanation: str | None
    question: str | None = Field(description="Pergunta ao dono; sem ela, a tela usa o conteúdo.")
    origin: str | None
    area: MemoryArea
    topic: str
    key: str
    content: str = Field(description="O que vira conhecimento se o dono confirmar.")
    used_by_agents: list[AgentId] = Field(description="Quem vai usar depois do ok do dono.")
    source_id: UUID | None
    run_id: UUID | None
    state: MemorySuggestionState = Field(description="`open` aberto, `seen` visto, `done` feito.")
    decision: MemorySuggestionDecision | None
    decided_by: UUID | None
    decided_at: datetime | None
    resulting_fact_id: UUID | None = Field(
        description="Conhecimento criado por Confirmar ou Corrigir."
    )
    created_at: datetime
    updated_at: datetime


class MemorySuggestionList(BaseModel):
    items: list[MemorySuggestion] = Field(description="Mais recente primeiro.")


class MemorySuggestionDecisionCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {"decision": "confirm"},
                {"decision": "correct", "content": "Bastidores do forno uma vez por semana."},
                {"decision": "discard"},
            ]
        },
    )

    decision: MemorySuggestionDecision = Field(
        description=(
            "`confirm` vira conhecimento Confirmado; `correct` vira Confirmado com o seu texto; "
            "`discard` fica registrada e não volta."
        )
    )
    content: FactText | None = Field(default=None, description="Obrigatório ao corrigir.")

    @model_validator(mode="after")
    def content_only_when_correcting(self) -> "MemorySuggestionDecisionCreate":
        if self.decision == MemorySuggestionDecision.correct and not self.content:
            raise ValueError("Ao corrigir, escreva como deve ficar.")
        if self.decision != MemorySuggestionDecision.correct and self.content is not None:
            raise ValueError("O texto só vale ao corrigir.")
        return self


class MemorySuggestionDecided(MemorySuggestion):
    resulting_fact: BrandFact | None


class BrandFactCorrection(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"examples": [{"content": "Acolhedor, direto e com humor leve."}]},
    )

    content: FactText = Field(description="O valor certo. Vira uma versão nova, Confirmado.")


class BrandFactHistory(BaseModel):
    fact_id: UUID
    versions: list[BrandFact] = Field(description="Da versão mais nova para a mais antiga.")
    suggestions: list[MemorySuggestion] = Field(
        description='Sugestões ("<Agente> percebeu") que deram origem a alguma versão.'
    )


class MemorySearchHit(BrandFact):
    rank: float = Field(description="Relevância da busca textual (maior primeiro).")


class MemorySearchResult(BaseModel):
    query: str
    items: list[MemorySearchHit]


class MemoryConflict(BaseModel):
    id: UUID
    workspace_id: UUID
    state: MemoryConflictState
    resolution: MemoryConflictResolution | None
    resulting_fact_id: UUID | None
    resolved_by: UUID | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime
    fact_a: BrandFact
    fact_b: BrandFact


class MemoryConflictList(BaseModel):
    items: list[MemoryConflict] = Field(description="Mais recente primeiro.")


class MemoryConflictResolve(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {"keep_fact_id": "5eed0000-0000-4000-8000-000000000811"},
                {"content": "Terça a domingo, das 7h às 19h"},
            ]
        },
    )

    keep_fact_id: UUID | None = Field(default=None, description='"Vale este": a versão que fica.')
    content: FactText | None = Field(default=None, description='"Nenhum dos dois: corrigir".')

    @model_validator(mode="after")
    def one_way_out(self) -> "MemoryConflictResolve":
        if (self.keep_fact_id is None) == (self.content is None):
            raise ValueError("Escolha a versão que vale ou escreva a correção, uma das duas.")
        return self


class MemoryPending(BaseModel):
    suggestions: int = Field(description="Sugestões abertas.")
    conflicts: int = Field(description="Conflitos abertos.")
    outdated: int = Field(description="Conhecimentos desatualizados.")


class BrandFactStateChange(BaseModel):
    model_config = ConfigDict(
        extra="forbid", json_schema_extra={"examples": [{"action": "stop_using"}]}
    )

    action: Literal["stop_using", "resume_using", "confirm", "keep"] = Field(
        description=(
            '`stop_using` "Não usar mais" (Confirmado, Decisão sua, Da fonte, Observado, '
            'Desatualizado → Não usado); `resume_using` "Voltar a usar" (Não usado → o estado de '
            'antes); `confirm` "Confirmar" (Da fonte ou Observado → Confirmado); `keep` "Continua '
            'valendo" (Desatualizado → Da fonte). Repetir devolve o mesmo estado.'
        )
    )


class BrandFactCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [{"area": "business", "content": "Aos domingos a loja fecha às 13h"}]
        },
    )

    area: MemoryArea
    content: FactText = Field(description='"O que o squad precisa saber?"')
    topic: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)] | (
        None
    ) = Field(default=None, description="Assunto; sem ele, o primeiro assunto da área.")
    key: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)] | (
        None
    ) = Field(default=None, description='Chave; sem ela, "Contado por você".')


class BrandProfile(BaseModel):
    description: str | None = Field(description="Descrição do negócio, escrita pelo dono.")
    squad_summary: str | None = Field(description='"O que o squad sabe": síntese do squad.')
    summary_agent_id: AgentId | None
    summary_updated_at: datetime | None


class BrandProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: Annotated[str, StringConstraints(strip_whitespace=True, max_length=600)] | None = (
        Field(description="Vazio ou nulo apaga.")
    )


class MemoryDossier(BaseModel):
    workspace_id: UUID
    brand_name: str = Field(examples=["Miolo"])
    profile: BrandProfile | None = Field(
        default=None, description="Descrição do negócio e síntese do squad (nulo: ainda não há)."
    )
    confirmed_count: int = Field(
        description="Conhecimentos Confirmado e Decisão sua (base da síntese do squad)."
    )
    pending: MemoryPending
    sources: list[FactSource] = Field(description='"De onde vem".')
    areas: list[MemoryAreaGroup] = Field(
        description=(
            "Versões atuais por área e assunto, em todos os estados; a tela esconde Descartado e "
            "Não usado até a pessoa pedir."
        )
    )
    suggestions: list[MemorySuggestion] = Field(
        description='"O squad percebeu": sugestões abertas.'
    )
