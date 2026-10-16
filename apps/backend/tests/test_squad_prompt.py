"""Leitura de squad/ e montagem do prompt: versão, prefixo cacheado, idioma e escape do contexto."""

import shutil
from pathlib import Path
from uuid import uuid4

import pytest

from hellosquad.squad.loader import REPO_SQUAD_DIR, SquadDefinitionError, SquadLoader
from hellosquad.squad.memory import MemoryFact
from hellosquad.squad.prompt import (
    HistoryMessage,
    RunContext,
    check_messages,
    system_blocks,
    triage_messages,
)


@pytest.fixture
def squad_copy(tmp_path: Path) -> Path:
    target = tmp_path / "squad"
    shutil.copytree(REPO_SQUAD_DIR, target)
    return target


def context(**overrides) -> RunContext:
    fields = {
        "locale": "pt-BR",
        "brand_name": "Miolo",
        "request": "Otto, preciso de uma legenda para o Instagram.",
        "work_title": "Legenda de sábado",
        "delivery_type": "04.01",
        "briefing": {},
        "history": [
            HistoryMessage("user", None, "Tom acolhedor <b>sem gíria</b>."),
            HistoryMessage("agent", "otto", "Anotado."),
        ],
    }
    return RunContext(**(fields | overrides))


def test_prompt_reads_agent_soul_skill_and_shared_rules() -> None:
    prompt = SquadLoader().prompt("otto", "04.01")
    assert prompt.agent.name == "Otto" and prompt.agent.allows("entregas.criar_versao")
    assert not prompt.agent.allows("aprovacoes.solicitar")
    assert prompt.agent.model["padrao"] == "claude-opus-5-5"
    assert prompt.agent.model["effort"] == "medium"
    assert prompt.skill.essentials == ["canal", "objetivo", "tema"]
    assert prompt.skill.delivery_kind == "caption"
    assert prompt.skill.body.startswith("# 04.01 · Textos e legendas de marketing")
    assert prompt.shared_rules.startswith("## Regras que todos os agentes compartilham")
    assert "## Fonte" not in prompt.shared_rules
    assert set(prompt.files) == {
        "README.md",
        "otto/agent.yaml",
        "otto/SOUL.md",
        "otto/skills/04.01.md",
    }
    assert len(prompt.content_hash) == 64


def test_version_changes_when_soul_skill_or_rules_change(squad_copy: Path) -> None:
    loader = SquadLoader(squad_copy)
    original = loader.prompt("otto", "04.01").content_hash
    assert loader.prompt("otto", "04.01").content_hash == original

    soul = squad_copy / "otto" / "SOUL.md"
    soul.write_text(soul.read_text(encoding="utf-8") + "\nUma regra nova.\n", encoding="utf-8")
    changed_soul = loader.prompt("otto", "04.01").content_hash
    assert changed_soul != original

    skill = squad_copy / "otto" / "skills" / "04.01.md"
    skill.write_text(skill.read_text(encoding="utf-8").replace("duas versões", "três versões"))
    changed_skill = loader.prompt("otto", "04.01").content_hash
    assert changed_skill not in (original, changed_soul)

    readme = squad_copy / "README.md"
    rules = readme.read_text(encoding="utf-8")
    readme.write_text(rules.replace("frases curtas", "frases curtas."), encoding="utf-8")
    assert loader.prompt("otto", "04.01").content_hash not in (
        original,
        changed_soul,
        changed_skill,
    )
    assert SquadLoader().prompt("otto", "04.01").content_hash == original


def test_missing_skill_or_wrong_agent_id_is_refused(squad_copy: Path) -> None:
    loader = SquadLoader(squad_copy)
    assert not loader.has_skill("otto", "04.07")
    with pytest.raises(SquadDefinitionError):
        loader.prompt("otto", "04.07")
    yaml_path = squad_copy / "otto" / "agent.yaml"
    yaml_path.write_text(yaml_path.read_text(encoding="utf-8").replace("id: otto", "id: bia"))
    with pytest.raises(SquadDefinitionError):
        loader.agent("otto")


def test_system_prompt_caches_the_stable_prefix_and_renders_the_brand() -> None:
    prompt = SquadLoader().prompt("otto", "04.01")
    tone = MemoryFact(
        uuid4(), "decision", "brand", "Tom de voz", "Tom", "acolhedor", "essential", None, 9
    )
    found = MemoryFact(
        uuid4(), "confirmed", "audience", "Canais", "Canais", "Instagram", "search", 0.4, 9
    )
    ctx = context(locale="es", memory=[tone, found])
    blocks = system_blocks(prompt, ctx)
    assert [b.cache for b in blocks] == [False, True, True]
    assert blocks[0].text.startswith("## Regras que todos os agentes compartilham")
    assert "squad da Miolo" in blocks[0].text and "{{marca.nome}}" not in blocks[0].text
    assert blocks[1].text == prompt.skill.body
    assert "<idioma>es</idioma>" in blocks[2].text
    tone_fact = '<fato estado="Decisión tuya" assunto="Tom de voz">Tom: acolhedor</fato>'
    assert tone_fact in blocks[2].text
    assert "Instagram" not in blocks[2].text
    [message] = triage_messages(ctx, prompt.skill)
    assert (
        '<memoria_relevante>\n<fato estado="Confirmado" assunto="Canais">Canais: Instagram</fato>'
        in message.content
    )


def test_run_context_is_escaped_data_in_the_user_turn() -> None:
    target = SquadLoader().skill("otto", "04.01")
    [message] = triage_messages(context(briefing={"canal": "instagram"}), target)
    assert message.role == "user"
    assert '<trabalho delivery="04.01">Legenda de sábado</trabalho>' in message.content
    assert '<mensagem autor="pessoa">Tom acolhedor &lt;b&gt;sem gíria&lt;/b&gt;.</mensagem>' in (
        message.content
    )
    assert '<mensagem autor="otto">Anotado.</mensagem>' in message.content
    assert "<essenciais>canal, objetivo, tema</essenciais>" in message.content
    assert '<briefing>{"canal": "instagram"}</briefing>' in message.content
    assert message.content.endswith("<etapa>triagem</etapa>")

    [check] = check_messages(context(), {"tema": "pão"}, {"versoes": [{"texto": "<script>"}]})
    assert '<versao>{"versoes": [{"texto": "&lt;script&gt;"}]}</versao>' in check.content
