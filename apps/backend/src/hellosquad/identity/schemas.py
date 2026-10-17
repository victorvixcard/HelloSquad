import re
from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal
from uuid import UUID

from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    StringConstraints,
)

from hellosquad.credits.schemas import CreditBalance

SLUG_PATTERN = r"^[a-z0-9]+(-[a-z0-9]+)*$"


def normalize_slug(value: object) -> object:
    # No Pydantic, to_lower do StringConstraints só roda depois do pattern; normaliza antes.
    return value.strip().lower() if isinstance(value, str) else value


# O nome do negócio vai para o assunto e o corpo dos e-mails e para a tela: sem caracteres de
# controle (quebra de linha), marcas de direção do texto nem < >.
UNSAFE_NAME = re.compile(r"[\x00-\x1f\x7f-\x9f\u200e\u200f\u202a-\u202e\u2066-\u2069<>]")


def check_display_name(value: str) -> str:
    if UNSAFE_NAME.search(value):
        raise ValueError("error.validation.display_name")
    return value


class WorkspaceRole(StrEnum):
    owner = "owner"
    admin = "admin"
    editor = "editor"
    viewer = "viewer"


class WorkspaceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=120),
        AfterValidator(check_display_name),
    ] = Field(
        description=(
            "Nome do negócio, como aparece para o time. Sem quebra de linha, caracteres de "
            "controle nem < > (422 validation_error)."
        ),
        examples=["Miolo"],
    )
    slug: Annotated[
        str,
        BeforeValidator(normalize_slug),
        StringConstraints(min_length=3, max_length=48, pattern=SLUG_PATTERN),
    ] = Field(
        description=(
            "Endereço único: letras minúsculas, números e hífen (3 a 48). "
            "Endereço reservado (rotas do app) responde 422 slug_reserved."
        ),
        examples=["miolo"],
    )
    locale: Literal["pt-BR", "en", "es"] | None = Field(
        default=None,
        description=(
            "Idioma do negócio desde o começo (os agentes respondem nele e a fala de boas-vindas "
            "do Nexo sai nele). Sem ele, pt-BR, como antes."
        ),
    )


Locale = Literal["pt-BR", "en", "es"]
SUPPORTED_LOCALES = ("pt-BR", "en", "es")


class WorkspaceSummary(BaseModel):
    id: UUID
    slug: str
    name: str
    locale: Locale = Field(description="Idioma do negócio; os agentes respondem nele (ADR-0010).")


class Workspace(WorkspaceSummary):
    role: WorkspaceRole = Field(description="Seu papel neste workspace.")
    created_at: datetime


class WorkspaceList(BaseModel):
    items: list[Workspace]


class WorkspaceUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    locale: Locale = Field(description="Idioma do negócio (owner ou admin).")


class User(BaseModel):
    id: UUID
    email: str | None
    full_name: str | None
    locale: Locale | None = Field(
        default=None,
        description="Idioma escolhido pela pessoa (cadastro, user_metadata.locale); null usa o do "
        "negócio.",
    )


class Membership(BaseModel):
    workspace: WorkspaceSummary
    role: WorkspaceRole
    workspace_status: Literal["active", "suspended"] = Field(
        default="active",
        description="`suspended` = conta suspensa pelo suporte: cobrança e rotinas pausadas; "
        "os dados e a assinatura ficam.",
    )
    credits: CreditBalance = Field(description="Créditos do workspace (valores provisórios).")


class Me(BaseModel):
    user: User
    memberships: list[Membership] = Field(description="Workspaces ativos de que você participa.")
