"""Squad versionado no banco (SA3a): squad/ é seed e exportação; o runtime lê as versões ativas.

Arquivo de squad/ ↔ unidade em squad_versions:
  <agente>/SOUL.md              kind soul (texto nas seis seções de agent_prompt_sections)
  <agente>/agent.yaml           kind config
  <agente>/skills/<delivery>.md kind skill, key = delivery
  README.md, conversa.md, reflexao.md  kind shared (sem agente)

Os bytes de cada arquivo montado do banco são os mesmos do arquivo em squad/ quando o conteúdo é o
mesmo; por isso o hash do prompt (sha256 do manifesto, loader.py) não muda com a origem.
"""

import logging
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from psycopg import AsyncConnection
from psycopg.rows import DictRow

from hellosquad.squad.loader import SoulSection, SquadLoader, render_soul

log = logging.getLogger(__name__)

SHARED_FILES = ("README.md", "conversa.md", "reflexao.md")

ACTIVE_FINGERPRINT = """
select md5(string_agg(v.id::text, ',' order by v.id)) as fingerprint
from public.squad_versions v
where v.status = 'active'
"""
ACTIVE_VERSIONS = """
select v.id, v.kind, v.agent_id::text as agent_id, v.key, v.version, v.body
from public.squad_versions v
where v.status = 'active'
order by v.kind, v.agent_id nulls first, v.key
"""
ACTIVE_SECTIONS = """
select s.version_id, s.section, s.position, s.heading, s.body, s.in_prompt
from public.agent_prompt_sections s
join public.squad_versions v on v.id = s.version_id
where v.status = 'active'
order by s.version_id, s.position
"""


@dataclass(frozen=True)
class Unit:
    kind: str
    agent_id: str | None
    key: str

    @property
    def path(self) -> str:
        if self.kind == "shared":
            return self.key
        if self.kind == "skill":
            return f"{self.agent_id}/skills/{self.key}.md"
        return f"{self.agent_id}/{self.key}"


def unit_for_path(relative: str) -> Unit | None:
    parts = relative.split("/")
    if len(parts) == 1 and parts[0] in SHARED_FILES:
        return Unit("shared", None, parts[0])
    if len(parts) == 2 and parts[1] == "SOUL.md":
        return Unit("soul", parts[0], "SOUL.md")
    if len(parts) == 2 and parts[1] == "agent.yaml":
        return Unit("config", parts[0], "agent.yaml")
    if len(parts) == 3 and parts[1] == "skills" and parts[2].endswith(".md"):
        return Unit("skill", parts[0], parts[2].removesuffix(".md"))
    return None


def squad_files(squad_dir: Path) -> dict[str, str]:
    """Os arquivos de squad/ que viram unidades (caminho relativo → texto)."""
    found = {}
    for path in sorted(squad_dir.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(squad_dir).as_posix()
        if unit_for_path(relative) is not None:
            found[relative] = path.read_text(encoding="utf-8")
    return found


@dataclass
class Snapshot:
    """Versões ativas do banco já montadas como arquivos de squad/."""

    files: dict[str, bytes] = field(default_factory=dict)
    sources: dict[str, list[dict[str, Any]]] = field(default_factory=dict)


def build_snapshot(
    versions: Iterable[Mapping[str, Any]], sections: Iterable[Mapping[str, Any]]
) -> Snapshot:
    by_version: dict[Any, list[SoulSection]] = {}
    for row in sections:
        by_version.setdefault(row["version_id"], []).append(
            SoulSection(
                section=row["section"],
                position=row["position"],
                heading=row["heading"],
                body=row["body"],
                in_prompt=row["in_prompt"],
            )
        )
    snapshot = Snapshot()
    for row in versions:
        unit = Unit(row["kind"], row["agent_id"], row["key"])
        text = render_soul(by_version.get(row["id"], [])) if unit.kind == "soul" else row["body"]
        snapshot.files[unit.path] = text.encode("utf-8")
        snapshot.sources[unit.path] = [
            {"id": str(row["id"]), "kind": unit.kind, "key": unit.key, "version": row["version"]}
        ]
    return snapshot


async def load_snapshot(conn: AsyncConnection[DictRow]) -> Snapshot:
    versions = await (await conn.execute(ACTIVE_VERSIONS)).fetchall()
    sections = await (await conn.execute(ACTIVE_SECTIONS)).fetchall()
    return build_snapshot(versions, sections)


class SquadCatalog:
    """O squad que o runtime usa: versões ativas do banco, com cache pela impressão digital das
    versões ativas (muda quando algo é publicado). Banco sem versão ativa: squad/, com aviso."""

    def __init__(self, fallback: SquadLoader) -> None:
        self.fallback = fallback
        self._fingerprint: str | None = None
        self._loader: SquadLoader | None = None
        self._warned = False

    async def loader(self, conn: AsyncConnection[DictRow]) -> SquadLoader:
        row = await (await conn.execute(ACTIVE_FINGERPRINT)).fetchone()
        fingerprint = row["fingerprint"] if row else None
        if fingerprint is None:
            if not self._warned:
                log.warning(
                    "squad_versions sem versão ativa: o runtime lê squad/ (rode make squad-seed)"
                )
                self._warned = True
            return self.fallback
        if fingerprint != self._fingerprint or self._loader is None:
            snapshot = await load_snapshot(conn)
            self._loader = SquadLoader(files=snapshot.files, sources=snapshot.sources)
            self._fingerprint = fingerprint
            log.info("squad carregado do banco (versões ativas %s)", fingerprint[:12])
        return self._loader
