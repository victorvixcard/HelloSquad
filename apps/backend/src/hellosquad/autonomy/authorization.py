"""Gancho de autorização por ação do Modo Autônomo (S3b → S3a).

Conectar não autoriza agir e aprovar um conteúdo não autoriza publicar (Documento Mestre, regra
2). Antes de criar uma ação externa (`external_actions`, S3a), o executor pergunta aqui o que o
combinado da responsabilidade permite: Analisar e Preparar acontecem sozinhos; Executar só com a
autorização específica do dono para aquela ação (ou a antecipada, "o que você aprovar no plano",
só para os itens aprovados no plano); Nunca não acontece nem com autorização. Ação fora da lista é
tratada como Nunca.
"""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class AuthorizationRequirement:
    action: str
    level: str
    allowed: bool
    needs_owner_authorization: bool
    pre_authorized: bool
    requirement: str | None = None


def requires_authorization(
    actions: list[dict[str, Any]], action: str, *, approved_in_plan: bool = False
) -> AuthorizationRequirement:
    item = next((a for a in actions if a.get("action") == action), None)
    if item is None or item.get("level") == "never":
        return AuthorizationRequirement(action, "never", False, False, False)
    level = item["level"]
    if level in ("analyze", "prepare"):
        return AuthorizationRequirement(action, level, True, False, False)
    requirement = item.get("requirement") or "approval_each"
    pre_authorized = bool(item.get("granted")) and approved_in_plan
    return AuthorizationRequirement(
        action,
        level,
        allowed=True,
        needs_owner_authorization=not pre_authorized,
        pre_authorized=pre_authorized,
        requirement=requirement,
    )
