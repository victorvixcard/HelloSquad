"""Leitura do squad: agent.yaml, SOUL.md, skills/<delivery>.md e as regras compartilhadas.

Origem: as versões ativas do banco (SA3a, montadas como arquivos por versions.py) ou, com o banco
vazio, a pasta squad/. A versão de um prompt é o sha256 do manifesto (arquivo → sha256 do conteúdo)
de tudo que entra no prefixo estável: regras compartilhadas, agent.yaml, SOUL.md e a skill. Mudou um
byte, mudou a versão; a mesma origem de conteúdo dá o mesmo hash, venha do banco ou da pasta.
"""

import hashlib
import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

REPO_SQUAD_DIR = Path(__file__).resolve().parents[5] / "squad"
SHARED_RULES_HEADING = "## Regras que todos os agentes compartilham"
FRONT_MATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
# Resposta na conversa (run sem trabalho): squad/conversa.md no lugar da skill.
REPLY_SKILL = "conversa"
# Reflexão depois do trabalho fechado (Memória camada 3): squad/reflexao.md no lugar da skill.
REFLECT_SKILL = "reflexao"


class SquadDefinitionError(RuntimeError):
    pass


SECTION_KEYS = ("identidade", "o_que_faz", "como_fala", "limites", "memoria", "nunca_faz")
OUT_OF_PROMPT = "<!-- fora do prompt -->"
HEADING = re.compile(r"^(#{1,2}) (.+)$", re.MULTILINE)
SECTION_BY_HEADING = {
    "o que você faz": "o_que_faz",
    "limites": "limites",
    "memória": "memoria",
    "o que você nunca faz": "nunca_faz",
}


@dataclass(frozen=True)
class SoulSection:
    section: str
    position: int
    heading: str
    body: str
    in_prompt: bool = True

    def as_json(self) -> dict[str, Any]:
        return {
            "section": self.section,
            "position": self.position,
            "heading": self.heading,
            "body": self.body,
            "in_prompt": self.in_prompt,
        }


def section_key(level: str, heading: str) -> str:
    if level == "#":
        return "identidade"
    normalized = heading.strip().lower()
    if normalized.startswith("como você"):
        return "como_fala"
    if normalized not in SECTION_BY_HEADING:
        raise SquadDefinitionError(f"SOUL.md com seção desconhecida: {heading!r}.")
    return SECTION_BY_HEADING[normalized]


def parse_soul(text: str) -> list[SoulSection]:
    """SOUL.md → as seis seções na ordem do arquivo (título nível 1 = identidade)."""
    matches = list(HEADING.finditer(text))
    if not matches or matches[0].start() != 0 or matches[0].group(1) != "#":
        raise SquadDefinitionError("SOUL.md precisa começar pelo título do agente (# …).")
    sections = []
    for position, match in enumerate(matches, start=1):
        end = matches[position].start() if position < len(matches) else len(text)
        raw = text[match.end() : end].strip("\n")
        in_prompt = True
        if raw.startswith(OUT_OF_PROMPT):
            in_prompt = False
            raw = raw[len(OUT_OF_PROMPT) :].strip("\n")
        sections.append(
            SoulSection(
                section=section_key(match.group(1), match.group(2)),
                position=position,
                heading=match.group(2).strip(),
                body=raw,
                in_prompt=in_prompt,
            )
        )
    keys = [s.section for s in sections]
    if sorted(keys) != sorted(SECTION_KEYS):
        raise SquadDefinitionError(f"SOUL.md precisa das seis seções {SECTION_KEYS}; tem {keys}.")
    return sections


def render_soul(sections: Iterable[SoulSection], *, prompt_only: bool = False) -> str:
    """Seções → SOUL.md. Fora do prompt: marcada no arquivo; some no texto do prompt."""
    parts = []
    for s in sorted(sections, key=lambda s: s.position):
        if prompt_only and not s.in_prompt:
            continue
        level = "#" if s.section == "identidade" else "##"
        marker = f"{OUT_OF_PROMPT}\n\n" if not s.in_prompt and not prompt_only else ""
        parts.append(f"{level} {s.heading}\n\n{marker}{s.body}")
    return "\n\n".join(parts) + "\n"


def soul_prompt_text(text: str) -> str:
    """Texto da SOUL que entra no prompt: sem as seções marcadas como fora do prompt."""
    if OUT_OF_PROMPT not in text:
        return text.strip()
    return render_soul(parse_soul(text), prompt_only=True).strip()


@dataclass(frozen=True)
class AgentDefinition:
    id: str
    name: str
    config: dict[str, Any]
    soul: str

    @property
    def tools(self) -> frozenset[str]:
        return frozenset(self.config.get("ferramentas") or [])

    @property
    def deliveries(self) -> frozenset[str]:
        return frozenset(self.config.get("deliveries") or [])

    @property
    def model(self) -> dict[str, Any]:
        return self.config.get("modelo") or {}

    def allows(self, tool: str) -> bool:
        return tool in self.tools


@dataclass(frozen=True)
class Skill:
    delivery_type: str
    meta: dict[str, Any]
    body: str

    @property
    def essentials(self) -> list[str]:
        return list(self.meta.get("essenciais") or [])

    @property
    def delivery_kind(self) -> str | None:
        return self.meta.get("entrega_kind")


@dataclass(frozen=True)
class SquadPrompt:
    agent: AgentDefinition
    skill: Skill
    shared_rules: str
    content_hash: str
    files: dict[str, str] = field(default_factory=dict)
    # Origem do conteúdo: "database" (versões ativas) ou "files" (squad/), e as versões usadas.
    origin: str = "files"
    sources: list[dict[str, Any]] = field(default_factory=list)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def parse_skill(delivery_type: str, raw: str) -> Skill:
    match = FRONT_MATTER.match(raw)
    meta = (yaml.safe_load(match.group(1)) or {}) if match else {}
    body = raw[match.end() :] if match else raw
    return Skill(delivery_type=delivery_type, meta=meta, body=body.strip())


class SquadLoader:
    """Lê de `files` (arquivos montados das versões ativas do banco) ou, sem eles, de squad_dir."""

    def __init__(
        self,
        squad_dir: Path | None = None,
        *,
        files: Mapping[str, bytes] | None = None,
        sources: Mapping[str, list[dict[str, Any]]] | None = None,
    ) -> None:
        self.squad_dir = squad_dir or REPO_SQUAD_DIR
        self.files = dict(files) if files is not None else None
        self.sources = dict(sources or {})

    @property
    def origin(self) -> str:
        return "files" if self.files is None else "database"

    def _exists(self, relative: str) -> bool:
        if self.files is not None:
            return relative in self.files
        return (self.squad_dir / relative).is_file()

    def _read(self, relative: str, files: dict[str, str]) -> str:
        if not self._exists(relative):
            raise SquadDefinitionError(f"squad/{relative} não existe.")
        data = self.files[relative] if self.files is not None else (self.squad_dir / relative).read_bytes()
        files[relative] = sha256(data)
        return data.decode("utf-8")

    def shared_rules(self, files: dict[str, str] | None = None) -> str:
        readme = self._read("README.md", files if files is not None else {})
        start = readme.find(SHARED_RULES_HEADING)
        if start < 0:
            raise SquadDefinitionError("squad/README.md sem a seção de regras compartilhadas.")
        end = readme.find("\n## ", start + len(SHARED_RULES_HEADING))
        return readme[start : end if end >= 0 else None].strip()

    def agent(self, agent_id: str, files: dict[str, str] | None = None) -> AgentDefinition:
        files = files if files is not None else {}
        config = yaml.safe_load(self._read(f"{agent_id}/agent.yaml", files)) or {}
        if config.get("id") != agent_id:
            raise SquadDefinitionError(f"squad/{agent_id}/agent.yaml com id {config.get('id')!r}.")
        soul = soul_prompt_text(self._read(f"{agent_id}/SOUL.md", files))
        return AgentDefinition(
            id=agent_id, name=config.get("name", agent_id), config=config, soul=soul
        )

    def skill(
        self, agent_id: str, delivery_type: str, files: dict[str, str] | None = None
    ) -> Skill:
        raw = self._read(
            f"{agent_id}/skills/{delivery_type}.md", files if files is not None else {}
        )
        return parse_skill(delivery_type, raw)

    def has_skill(self, agent_id: str, delivery_type: str) -> bool:
        return self._exists(f"{agent_id}/skills/{delivery_type}.md")

    def prompt(self, agent_id: str, delivery_type: str) -> SquadPrompt:
        files: dict[str, str] = {}
        shared = self.shared_rules(files)
        agent = self.agent(agent_id, files)
        skill = self.skill(agent_id, delivery_type, files)
        return self._assemble(agent, skill, shared, files)

    def reply_prompt(self, agent_id: str) -> SquadPrompt:
        """Resposta na conversa: as instruções de squad/conversa.md fazem o papel da skill."""
        files: dict[str, str] = {}
        shared = self.shared_rules(files)
        agent = self.agent(agent_id, files)
        skill = parse_skill(REPLY_SKILL, self._read(f"{REPLY_SKILL}.md", files))
        return self._assemble(agent, skill, shared, files)

    def reflect_prompt(self, agent_id: str) -> SquadPrompt:
        """Reflexão depois do trabalho fechado (S2c): squad/reflexao.md faz o papel da skill."""
        files: dict[str, str] = {}
        shared = self.shared_rules(files)
        agent = self.agent(agent_id, files)
        skill = parse_skill(REFLECT_SKILL, self._read(f"{REFLECT_SKILL}.md", files))
        return self._assemble(agent, skill, shared, files)

    def _assemble(
        self, agent: AgentDefinition, skill: Skill, shared: str, files: dict[str, str]
    ) -> SquadPrompt:
        manifest = "".join(f"{path}\n{digest}\n" for path, digest in sorted(files.items()))
        return SquadPrompt(
            agent=agent,
            skill=skill,
            shared_rules=shared,
            content_hash=sha256(manifest.encode("utf-8")),
            files=dict(sorted(files.items())),
            origin=self.origin,
            sources=[ref for path in sorted(files) for ref in self.sources.get(path, [])],
        )
