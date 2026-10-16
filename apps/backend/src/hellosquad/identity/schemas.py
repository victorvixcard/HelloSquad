from datetime import datetime
from enum import StrEnum
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints

SLUG_PATTERN = r"^[a-z0-9]+(-[a-z0-9]+)*$"


def normalize_slug(value: object) -> object:
    # No Pydantic, to_lower do StringConstraints só roda depois do pattern; normaliza antes.
    return value.strip().lower() if isinstance(value, str) else value


class WorkspaceRole(StrEnum):
    owner = "owner"
    admin = "admin"
    editor = "editor"
    viewer = "viewer"


class WorkspaceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)] = (
        Field(description="Nome do negócio, como aparece para o time.", examples=["Miolo"])
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


class WorkspaceSummary(BaseModel):
    id: UUID
    slug: str
    name: str


class Workspace(WorkspaceSummary):
    role: WorkspaceRole = Field(description="Seu papel neste workspace.")
    created_at: datetime


class WorkspaceList(BaseModel):
    items: list[Workspace]


class User(BaseModel):
    id: UUID
    email: str | None
    full_name: str | None


class Membership(BaseModel):
    workspace: WorkspaceSummary
    role: WorkspaceRole


class Me(BaseModel):
    user: User
    memberships: list[Membership] = Field(description="Workspaces ativos de que você participa.")
