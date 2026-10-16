"""Leitura de squad/: agent.yaml, SOUL.md, skills/<delivery>.md e as regras compartilhadas.

A versão de um prompt é o sha256 do manifesto (arquivo → sha256 do conteúdo) de tudo que entra no
prefixo estável: regras compartilhadas, agent.yaml, SOUL.md e a skill. Mudou um byte, mudou a
versão.
"""

import hashlib
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

REPO_SQUAD_DIR = Path(__file__).resolve().parents[5] / "squad"
SHARED_RULES_HEADING = "## Regras que todos os agentes compartilham"
FRONT_MATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
# Resposta na conversa (run sem trabalho): squad/conversa.md no lugar da skill.
REPLY_SKILL = "conversa"


class SquadDefinitionError(RuntimeError):
    pass


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


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def parse_skill(delivery_type: str, raw: str) -> Skill:
    match = FRONT_MATTER.match(raw)
    meta = (yaml.safe_load(match.group(1)) or {}) if match else {}
    body = raw[match.end() :] if match else raw
    return Skill(delivery_type=delivery_type, meta=meta, body=body.strip())


class SquadLoader:
    def __init__(self, squad_dir: Path | None = None) -> None:
        self.squad_dir = squad_dir or REPO_SQUAD_DIR

    def _read(self, relative: str, files: dict[str, str]) -> str:
        path = self.squad_dir / relative
        if not path.is_file():
            raise SquadDefinitionError(f"squad/{relative} não existe.")
        data = path.read_bytes()
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
        soul = self._read(f"{agent_id}/SOUL.md", files).strip()
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
        return (self.squad_dir / agent_id / "skills" / f"{delivery_type}.md").is_file()

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
        )
