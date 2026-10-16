"""S2a item 0 (H1-04, API): "Conversar com <Nome>" abre a conversa do ambiente.

Uma por ambiente e workspace (reaberta como a de objeto), com o agente do ambiente à frente, a
primeira fala dele e as sugestões do ambiente (V4.6 `_cx('env')` e `_cxEnvFirst`).
"""

from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import psycopg
import pytest
from psycopg.rows import dict_row

from hellosquad.i18n import t

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
RAFAEL = "rafael@vitta.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
SQUAD = ["nexo", "bia", "kaia", "otto", "kiwi", "max", "iris"]
SPECIALISTS = ["bia", "kaia", "kiwi", "max"]


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
async def seed_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    yield
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


async def workspace_id(admin_db: psycopg.AsyncConnection, slug: str) -> str:
    cursor = admin_db.cursor(row_factory=dict_row)
    await cursor.execute("select id from public.workspaces where slug = %s", (slug,))
    return str((await cursor.fetchone())["id"])


async def open_environment(api, token: str, workspace: str, agent: str, title: str) -> Any:
    return await api.post(
        f"/workspaces/{workspace}/conversations",
        headers=bearer(token),
        json={"kind": "object", "context": {"type": "environment", "key": agent, "title": title}},
    )


async def test_environment_conversation_reused_with_opening(api, access_token, admin_db):
    miolo = await workspace_id(admin_db, "miolo")
    token = access_token(MARINA)

    first = await open_environment(api, token, miolo, "bia", "Estratégia")
    assert first.status_code == 201, first.text
    body = first.json()
    assert body["kind"] == "object"
    assert body["primary_agent_id"] == "bia"
    assert body["title"] == "Estratégia"
    assert body["context"] == {
        "type": "environment",
        "id": None,
        "key": "bia",
        "title": "Estratégia",
        "status": None,
        "summary": None,
        "period": None,
        "origin": None,
    }
    assert body["opening"] == {
        "agent_id": "bia",
        "message": "Oi, eu sou a Bia. Disponível. O que você precisa?",
        "suggestions": [
            "Onde a Miolo pode crescer até o Natal?",
            "Crie uma promoção para esta semana",
            "Analisar as padarias do bairro",
        ],
    }

    again = await open_environment(api, token, miolo, "bia", "Estratégia")
    assert again.status_code == 200, again.text
    assert again.json()["id"] == body["id"]

    direct = await api.post(
        f"/workspaces/{miolo}/conversations",
        headers=bearer(token),
        json={"kind": "agent_direct", "primary_agent_id": "bia"},
    )
    assert direct.status_code == 201
    assert direct.json()["id"] != body["id"]
    assert direct.json()["opening"] is None

    detail = await api.get(f"/conversations/{body['id']}", headers=bearer(token))
    assert detail.json()["opening"]["agent_id"] == "bia"

    listed = await api.get(f"/workspaces/{miolo}/conversations", headers=bearer(token))
    row = next(c for c in listed.json()["items"] if c["id"] == body["id"])
    assert (row["context_type"], row["context_key"], row["title"], row["primary_agent_id"]) == (
        "environment",
        "bia",
        "Estratégia",
        "bia",
    )

    hidden = await api.get(f"/conversations/{body['id']}", headers=bearer(access_token(RAFAEL)))
    assert hidden.status_code == 404


async def test_environment_first_lines_follow_the_prototype(api, access_token, admin_db):
    miolo = await workspace_id(admin_db, "miolo")
    token = access_token(MARINA)

    otto = (await open_environment(api, token, miolo, "otto", "Conteúdo")).json()["opening"]
    assert otto["message"] == (
        "Ainda não cuido do calendário da Miolo. Posso planejar os conteúdos toda semana, no "
        "Modo Autônomo, e você aprova antes de qualquer publicação."
    )
    assert otto["suggestions"] == [
        "Como está o plano da próxima semana?",
        "Que conteúdos funcionaram melhor?",
        "Quero melhorar meu Instagram.",
    ]

    iris = (await open_environment(api, token, miolo, "iris", "Resultados")).json()["opening"]
    assert iris["message"].startswith("Ainda não tenho números da Miolo para ler.")

    needs = (await api.get(f"/workspaces/{miolo}/needs", headers=bearer(token))).json()
    nexo = (await open_environment(api, token, miolo, "nexo", "Projetos")).json()["opening"]
    expected = {0: "Nada esperando por você agora.", 1: "Hoje tem uma decisão sua: “"}
    assert nexo["message"].startswith(expected.get(needs["count"], f"Hoje tem {needs['count']}"))
    assert nexo["suggestions"][0] == "O que precisa de mim esta semana?"


async def test_environment_suggestions_are_the_v46_asks_in_the_workspace_locale(
    api, access_token, admin_db
):
    """H2-29: as sugestões dos sete ambientes são os asks da V4.6, no idioma do negócio."""
    miolo = await workspace_id(admin_db, "miolo")
    token = access_token(MARINA)
    seen: dict[str, dict[str, list[str]]] = {}
    for locale in ("pt-BR", "en"):
        await admin_db.execute(
            "update public.workspaces set locale = %s where id = %s", (locale, miolo)
        )
        for agent in SQUAD:
            response = await open_environment(api, token, miolo, agent, agent)
            assert response.status_code in (200, 201), response.text
            opening = response.json()["opening"]
            expected = [
                t(locale, f"environment.suggestion.{agent}.{n}", brand="Miolo") for n in (1, 2, 3)
            ]
            assert opening["suggestions"] == expected, (locale, agent)
            if agent in SPECIALISTS:
                assert opening["message"].startswith(t(locale, f"agent.{agent}.greeting"))
            seen.setdefault(agent, {})[locale] = opening["suggestions"]

    for agent in SQUAD:
        assert seen[agent]["en"] != seen[agent]["pt-BR"], agent
    assert seen["kiwi"]["pt-BR"] == [
        "Onde a Miolo pode aparecer mais no Google?",
        "Quanto investir em anúncios no Natal?",
        "Por que tanta visita não vira encomenda?",
    ]
    assert seen["kiwi"]["en"][0] == "Where can Miolo show up more on Google?"
    assert seen["max"]["pt-BR"][1] == "Um e-mail para quem encomendou no Natal passado"


async def test_environment_outside_squad_is_rejected(api, access_token, admin_db):
    miolo = await workspace_id(admin_db, "miolo")
    response = await open_environment(api, access_token(MARINA), miolo, "zeca", "Outro")
    assert response.status_code == 422
