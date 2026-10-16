"""S2c — primeira fala do Nexo no negócio novo (A2a §5 itens 3 e 4; V4.6 "Boas-vindas")."""

from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

import psycopg
import pytest
from psycopg.rows import dict_row

pytestmark = pytest.mark.integration

PEDRO = "pedro@semconta.example"


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def rows(conn: psycopg.AsyncConnection, query: str, *params: object) -> list[dict[str, Any]]:
    cursor = conn.cursor(row_factory=dict_row)
    await cursor.execute(query, params)
    return await cursor.fetchall()


@pytest.fixture
async def created_slugs(admin_db: psycopg.AsyncConnection) -> AsyncIterator[list[str]]:
    """Workspaces criados no teste saem no fim, com a trilha de auditoria deles."""
    slugs: list[str] = []
    yield slugs
    for slug in slugs:
        await admin_db.execute(
            "delete from public.audit_events where workspace_id in "
            "(select id from public.workspaces where slug = %s)",
            (slug,),
        )
        await admin_db.execute("delete from public.workspaces where slug = %s", (slug,))


async def create(api, token: str, created_slugs: list[str], **extra: str) -> dict[str, Any]:
    slug = f"padaria-do-pedro-{uuid4().hex[:8]}"
    created_slugs.append(slug)
    response = await api.post(
        "/workspaces",
        headers=bearer(token),
        json={"name": "Padaria do Pedro", "slug": slug, **extra},
    )
    assert response.status_code == 201, response.text
    return response.json()


async def welcome(admin_db, workspace_id: str) -> list[dict[str, Any]]:
    return await rows(
        admin_db,
        """
        select c.title, c.kind::text, c.primary_agent_id::text, m.author_type::text,
               m.author_agent_id::text, m.run_id, m.body
        from public.conversations c
        join public.messages m on m.conversation_id = c.id
        where c.workspace_id = %s and c.welcome
        order by m.created_at, m.id
        """,
        workspace_id,
    )


async def test_new_business_opens_with_the_nexo_welcome_in_its_language(
    api, access_token, admin_db, created_slugs
) -> None:
    token = access_token(PEDRO)
    expected = {
        None: (
            "pt-BR",
            "Boas-vindas",
            "Oi, Pedro. Eu sou o Nexo e coordeno o squad de Padaria do Pedro. Você pode pedir "
            "qualquer coisa por aqui ou falar direto com um especialista. Para começar: qual é o "
            "objetivo mais importante de Padaria do Pedro agora?",
        ),
        "en": (
            "en",
            "Welcome",
            "Hi, Pedro. I’m Nexo, and I coordinate the Padaria do Pedro squad. You can ask for "
            "anything here or talk directly to a specialist. To start: what’s the most important "
            "goal for Padaria do Pedro right now?",
        ),
        "es": (
            "es",
            "Bienvenida",
            "Hola, Pedro. Soy Nexo y coordino el squad de Padaria do Pedro. Puedes pedir cualquier "
            "cosa por aquí o hablar directo con un especialista. Para empezar: ¿cuál es el "
            "objetivo más importante de Padaria do Pedro ahora?",
        ),
    }
    for locale, (stored, title, body) in expected.items():
        extra = {"locale": locale} if locale else {}
        created = await create(api, token, created_slugs, **extra)
        assert created["locale"] == stored
        [message] = await welcome(admin_db, created["id"])
        assert message == {
            "title": title,
            "kind": "agent_direct",
            "primary_agent_id": "nexo",
            "author_type": "agent",
            "author_agent_id": "nexo",
            "run_id": None,
            "body": body,
        }
        listed = await api.get(f"/workspaces/{created['id']}/conversations", headers=bearer(token))
        assert [(c["title"], c["primary_agent_id"]) for c in listed.json()["items"]] == [
            (title, "nexo")
        ]


async def test_objective_is_named_by_the_api_and_the_nexo_answers(
    api, access_token, admin_db, created_slugs
) -> None:
    token = access_token(PEDRO)
    created = await create(api, token, created_slugs, locale="en")
    fact = await api.post(
        f"/workspaces/{created['id']}/memory/facts",
        headers=bearer(token),
        json={"area": "business", "content": "Get more orders", "kind": "objective"},
    )
    assert fact.status_code == 201, fact.text
    assert (fact.json()["topic"], fact.json()["key"], fact.json()["state"]) == (
        "Goals",
        "Current goal",
        "confirmed",
    )
    messages = await welcome(admin_db, created["id"])
    assert [m["body"] for m in messages][1] == (
        "Noted in Brand Memory: “Get more orders”. You can already ask for the first delivery."
    )
    assert messages[1]["author_agent_id"] == "nexo"

    wrong = await api.post(
        f"/workspaces/{created['id']}/memory/facts",
        headers=bearer(token),
        json={"area": "brand", "content": "Get more orders", "kind": "objective"},
    )
    assert wrong.status_code == 422
    plain = await api.post(
        f"/workspaces/{created['id']}/memory/facts",
        headers=bearer(token),
        json={"area": "business", "content": "Open on Sundays until 1 pm"},
    )
    assert plain.status_code == 201 and plain.json()["key"] != "Current goal"
    assert len(await welcome(admin_db, created["id"])) == 2


async def test_nobody_speaks_as_the_nexo_after_the_business_exists(
    access_token, admin_db, api, created_slugs
) -> None:
    created = await create(api, access_token(PEDRO), created_slugs)
    user_id = (await rows(admin_db, "select id from auth.users where email = %s", PEDRO))[0]["id"]
    await admin_db.execute("begin")
    try:
        await admin_db.execute(
            "select set_config('role', 'authenticated', true), "
            "set_config('request.jwt.claim.sub', %s, true), "
            "set_config('request.jwt.claims', json_build_object('sub', %s::text)::text, true)",
            (str(user_id), str(user_id)),
        )
        same = await rows(
            admin_db,
            "select id from app.start_welcome(%s, 'Outra', 'Sou o Nexo de mentira.')",
            created["id"],
        )
        assert len(same) == 1
    finally:
        await admin_db.execute("rollback")
    assert [m["body"] for m in await welcome(admin_db, created["id"])][0].startswith("Oi, Pedro.")
