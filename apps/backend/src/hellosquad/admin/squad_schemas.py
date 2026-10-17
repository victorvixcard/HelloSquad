"""Respostas e pedidos de /admin/squad/* e /admin/rules/* (SA3a). O formato segue as telas Squad IA
do protótipo SA0 (design/super-admin-proto/app/data-squad.js): Squad, Agente › Alma / Skills /
Ferramentas e limites / O que ele lê, e Regras de negócio. Rótulos ficam no catálogo do web."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

VersionKind = Literal["soul", "skill", "config", "shared"]
VersionStatus = Literal["draft", "active", "superseded", "discarded"]
SectionKey = Literal["identidade", "o_que_faz", "como_fala", "limites", "memoria", "nunca_faz"]
SharedDoc = Literal["README.md", "conversa.md", "reflexao.md"]
RuleMark = Literal["decided", "current_base", "pending", "proposal"]


class VersionRef(BaseModel):
    id: UUID
    kind: VersionKind
    agent_id: str | None
    key: str
    version: int
    status: VersionStatus
    author: str
    note: str | None
    created_at: datetime
    published_at: datetime | None
    restored_from_version: int | None = Field(
        default=None, description="Voltar versão: a versão cujo conteúdo esta repete."
    )


class SoulSection(BaseModel):
    section: SectionKey
    position: int
    heading: str
    body: str
    in_prompt: bool
    words: int
    chars: int
    changed_in_version: int = Field(
        description="Versão da SOUL em que texto, título ou flag desta seção mudou por último."
    )


class SoulVersion(BaseModel):
    ref: VersionRef
    title: str = Field(description="Título do agente (seção identidade, nível 1).")
    sections: list[SoulSection]
    sections_in_prompt: int
    chars_in_prompt: int = Field(description="Caracteres da SOUL que entram no prompt.")


class ConfigFields(BaseModel):
    tools: list[str]
    tool_notes: dict[str, str] = Field(
        description="Comentário de cada ferramenta no agent.yaml (condição de uso)."
    )
    collaborators: list[str]
    max_autonomy: str | None
    model: dict[str, Any]
    memory: dict[str, Any]
    deliveries: list[str]


class ConfigVersion(BaseModel):
    ref: VersionRef
    yaml: str
    fields: ConfigFields


class SkillSection(BaseModel):
    title: str
    body: str


class SkillVersion(BaseModel):
    ref: VersionRef
    content: str = Field(description="skills/<delivery>.md inteiro, com o front matter.")
    meta: dict[str, Any]
    title: str | None
    sections: list[SkillSection] = Field(
        description="Seções ## do corpo (procedimento, formato da entrega, critérios de aceite)."
    )
    chars: int


class SkillSummary(BaseModel):
    delivery_type: str
    title: str | None
    active: VersionRef | None = Field(description="Nulo: a delivery ainda não tem skill escrita.")
    draft: VersionRef | None
    chars: int | None


class SquadAgentSummary(BaseModel):
    id: str
    name: str
    article: str | None
    role: str | None
    role_full: str | None
    color: str | None
    shape: str | None
    default_model: str | None
    effort: str | None
    deliveries: int
    skills_written: int
    soul_version: int | None
    config_version: int | None
    pending_drafts: int
    last_prompt_hash: str | None = Field(
        description="Hash do último prompt usado num run deste agente (agent_prompt_versions)."
    )
    runs_30d: int
    avg_cost_usd_30d: float | None = Field(
        description="Custo médio de IA por run concluído nos últimos 30 dias; nulo sem run."
    )


class SharedUnit(BaseModel):
    doc: SharedDoc
    active: VersionRef | None
    draft: VersionRef | None


class SquadOverview(BaseModel):
    agents: list[SquadAgentSummary]
    shared: list[SharedUnit]
    tool_catalog: list[str] = Field(
        description="Catálogo de ferramentas do squad: a união das listas dos sete agent.yaml."
    )
    fingerprint: str | None = Field(
        description="Impressão digital das versões ativas (muda quando algo é publicado)."
    )


class AgentDetail(BaseModel):
    agent: SquadAgentSummary
    soul: SoulVersion | None
    soul_draft: SoulVersion | None
    config: ConfigVersion | None
    config_draft: ConfigVersion | None
    skills: list[SkillSummary]


class SkillDetail(BaseModel):
    agent_id: str
    delivery_type: str
    active: SkillVersion | None
    draft: SkillVersion | None


class SharedDetail(BaseModel):
    doc: SharedDoc
    active: VersionRef | None
    active_content: str | None
    shared_rules: str | None = Field(
        description="README.md: a seção de regras compartilhadas que entra no prompt dos sete."
    )
    draft: VersionRef | None
    draft_content: str | None


class VersionList(BaseModel):
    items: list[VersionRef]


class VersionContent(BaseModel):
    ref: VersionRef
    path: str = Field(description="Arquivo de squad/ que esta versão representa.")
    content: str = Field(description="Texto do arquivo como o export grava (a SOUL já montada).")


class DiffLine(BaseModel):
    op: Literal[" ", "+", "-"]
    text: str


class VersionDiff(BaseModel):
    path: str
    from_version: VersionRef
    to_version: VersionRef
    unified: str = Field(description="Diff unificado (difflib), vazio quando o conteúdo é igual.")
    lines: list[DiffLine]
    changed_sections: list[str] = Field(
        description="Na SOUL: seções com título, texto ou flag diferente."
    )


class PromptBlock(BaseModel):
    part: Literal["rules_and_soul", "skill", "workspace", "message"]
    text: str
    cached: bool
    chars: int
    tokens_estimated: int


class PromptPreview(BaseModel):
    agent_id: str
    route: str = Field(
        description="Delivery (skill), conversa ou reflexao: o que o run lê nessa rota."
    )
    draft: bool = Field(description="true: montado com os rascunhos no lugar das versões ativas.")
    origin: Literal["database", "files"]
    content_hash: str
    sources: list[dict[str, Any]]
    example_context: dict[str, str]
    blocks: list[PromptBlock]
    chars: int
    tokens_estimated: int
    token_estimate_method: str


class SectionEdit(BaseModel):
    heading: str | None = Field(default=None, min_length=1, max_length=120)
    body: str | None = Field(default=None, max_length=20000)
    in_prompt: bool | None = None
    note: str | None = Field(default=None, max_length=500)


class ContentEdit(BaseModel):
    content: str = Field(min_length=1, max_length=60000)
    note: str | None = Field(default=None, max_length=500)


class ConfigEdit(BaseModel):
    yaml: str | None = Field(
        default=None, min_length=1, max_length=20000, description="agent.yaml inteiro."
    )
    tools: list[str] | None = Field(
        default=None,
        description="Ferramentas permitidas; mantém os comentários das que ficam no agent.yaml.",
    )
    max_autonomy: Literal["analisar", "preparar", "executar"] | None = None
    note: str | None = Field(default=None, max_length=500)


class RestoreRequest(BaseModel):
    note: str | None = Field(default=None, max_length=500)


class RuleParagraph(BaseModel):
    mark: RuleMark
    text: str = Field(min_length=1, max_length=4000)
    source: str | None = Field(default=None, max_length=200)


class RuleDocSummary(BaseModel):
    id: UUID
    slug: str
    title: str
    in_prompt: bool
    version: int | None
    updated_at: datetime | None
    author: str | None
    marks: dict[str, int]


class RuleDocList(BaseModel):
    items: list[RuleDocSummary]
    shared_rules_draft: VersionRef | None = Field(
        description="Rascunho das regras compartilhadas esperando publicação, se houver."
    )


class RuleVersion(BaseModel):
    id: UUID
    version: int
    author: str
    change_note: str | None
    created_at: datetime
    paragraphs: list[RuleParagraph]


class RuleDocDetail(BaseModel):
    doc: RuleDocSummary
    current: RuleVersion | None
    versions: list[RuleVersion]
    prompt_paragraphs: list[RuleParagraph] = Field(
        description="O que entra no prompt: [DECIDIDO] e [BASE ATUAL] de documento no prompt."
    )


class RuleDocEdit(BaseModel):
    paragraphs: list[RuleParagraph] = Field(min_length=1, max_length=200)
    in_prompt: bool | None = None
    note: str | None = Field(default=None, max_length=500)


class RuleSaveResult(BaseModel):
    doc: RuleDocSummary
    version: RuleVersion
    shared_rules_draft: VersionRef | None = Field(
        description="Rascunho novo do README.md (regras compartilhadas) quando o prompt mudou."
    )
