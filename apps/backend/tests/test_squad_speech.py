"""H2-05: o que o squad fala sozinho sai do catálogo, e o pt-BR do catálogo segue o `agent.yaml`."""

import pytest
import yaml

from hellosquad.i18n import catalog, t
from hellosquad.squad.loader import SquadLoader
from hellosquad.squad.prompt import BRAND_NAME_PLACEHOLDER

SQUAD = ["nexo", "bia", "kaia", "otto", "kiwi", "max", "iris"]


@pytest.mark.parametrize("agent_id", SQUAD)
def test_catalog_greeting_in_pt_br_is_the_agent_yaml_saudacao(agent_id: str) -> None:
    loader = SquadLoader()
    config = yaml.safe_load((loader.squad_dir / agent_id / "agent.yaml").read_text("utf-8"))
    saudacao = config["saudacao"].replace(BRAND_NAME_PLACEHOLDER, "{brand}")
    assert catalog("pt-BR")[f"agent.{agent_id}.greeting"] == saudacao
    for locale in ("en", "es"):
        translated = catalog(locale)[f"agent.{agent_id}.greeting"]
        assert translated and translated != saudacao, locale
    assert t("en", f"agent.{agent_id}.greeting", brand="Miolo").startswith("Hi, I'm ")
