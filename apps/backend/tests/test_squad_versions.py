"""Squad versionado no banco (SA3a): editar → publicar → o próximo run usa; voltar versão;
ferramenta fora da lista recusada pelo runtime; diff; regras de negócio → rascunho das regras
compartilhadas; só o Super Admin lê e escreve, com audit_events. Integração: Supabase local com
seed e squad-seed.

Cada teste devolve o squad ao estado do seed (versão 1 ativa de tudo): as versões criadas aqui são
apagadas com os gatilhos desligados só nesta limpeza, para o banco local não acumular histórico de
teste (no produto, versão não se apaga)."""

from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import psycopg
import pytest
from psycopg.rows import dict_row

from hellosquad.config import Settings
from hellosquad.llm.simulated import SimulatedLLM
from hellosquad.squad.loader import REPO_SQUAD_DIR, SquadLoader
from hellosquad.squad.versions import squad_files
from hellosquad.worker.main import Worker

pytestmark = pytest.mark.integration

VIC = "vic@hellosquad.example"
MARINA = "marina@miolo.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
REQUEST = (
    "Otto, preciso de uma legenda para o Instagram sobre o pão de fermentação longa de sábado. "
    "Quero levar clientes à loja de manhã."
)
NEW_VOICE = "Na voz da marca, não na sua. Frases curtas e concretas. Uma ideia por peça."


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def rows(conn: psycopg.AsyncConnection, query: str, *params: object) -> list[dict[str, Any]]:
    cursor = conn.cursor(row_factory=dict_row)
    await cursor.execute(query, params)
    return await cursor.fetchall()


async def one(conn: psycopg.AsyncConnection, query: str, *params: object) -> dict[str, Any]:
    [row] = await rows(conn, query, *params)
    return row


@pytest.fixture(autouse=True)
async def squad_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    before = {r["id"] for r in await rows(admin_db, "select id from public.squad_versions")}
    active = [
        r["id"]
        for r in await rows(
            admin_db, "select id from public.squad_versions where status = 'active'"
        )
    ]
    assert len(active) == len(squad_files(REPO_SQUAD_DIR)), "rode make seed (squad no banco)"
    rules = await rows(admin_db, "select id, in_prompt from public.business_rule_docs")
    rule_versions = {
        r["id"] for r in await rows(admin_db, "select id from public.business_rule_doc_versions")
    }
    yield
    async with admin_db.transaction():
        await admin_db.execute("set local session_replication_role = replica")
        created = [
            r["id"]
            for r in await rows(admin_db, "select id from public.squad_versions")
            if r["id"] not in before
        ]
        await admin_db.execute(
            "delete from public.agent_prompt_sections where version_id = any(%s)", (created,)
        )
        await admin_db.execute("delete from public.squad_versions where id = any(%s)", (created,))
        await admin_db.execute(
            "update public.squad_versions set status = 'active' where id = any(%s)", (active,)
        )
        await admin_db.execute(
            "delete from public.business_rule_doc_versions where not (id = any(%s))",
            (list(rule_versions),),
        )
        for rule in rules:
            await admin_db.execute(
                "update public.business_rule_docs set in_prompt = %s where id = %s",
                (rule["in_prompt"], rule["id"]),
            )
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


@pytest.fixture
async def miolo(admin_db: psycopg.AsyncConnection) -> str:
    return str((await one(admin_db, "select id from public.workspaces where slug = 'miolo'"))["id"])


async def request_work(api, access_token, miolo: str) -> dict[str, str]:
    headers = bearer(access_token(MARINA))
    conversation = await api.post(
        f"/workspaces/{miolo}/conversations",
        headers=headers,
        json={"kind": "agent_direct", "primary_agent_id": "otto"},
    )
    assert conversation.status_code == 201, conversation.text
    message = await api.post(
        f"/conversations/{conversation.json()['id']}/messages",
        headers=headers,
        json={"body": REQUEST},
    )
    assert message.status_code == 201, message.text
    work = await api.post(
        f"/messages/{message.json()['id']}/work-items",
        headers=headers,
        json={"delivery_type": "04.01", "title": "Legenda do sábado"},
    )
    assert work.status_code == 201, work.text
    return work.json()


async def run_once(api, access_token, admin_db, miolo: str) -> dict[str, Any]:
    """Marina pede a legenda; o worker roda; devolve o run do Otto com a versão do prompt."""
    work = await request_work(api, access_token, miolo)
    settings = Settings(llm_provider="simulated", worker_retry_base_seconds=0)
    async with Worker(settings, llm=SimulatedLLM()) as worker:
        await worker.drain()
    return await one(
        admin_db,
        """
        select r.status::text, r.error, r.prompt_version, p.origin, p.sources
        from public.runs r
        left join public.agent_prompt_versions p
          on p.agent_id = r.agent_id and p.content_hash = r.prompt_version
        where r.id = %s
        """,
        work["run_id"],
    )


async def edit_voice(api, headers) -> dict[str, Any]:
    response = await api.put(
        "/admin/squad/agents/otto/soul/sections/como_fala",
        headers=headers,
        json={"body": NEW_VOICE, "note": "Voz mais curta (teste SA3a)."},
    )
    assert response.status_code == 200, response.text
    return response.json()


async def test_edit_publish_next_run_uses_and_restore_returns_the_old_prompt(
    api, access_token, admin_db, miolo
) -> None:
    headers = bearer(access_token(VIC))
    original = SquadLoader().prompt("otto", "04.01").content_hash

    draft = await edit_voice(api, headers)
    assert (draft["kind"], draft["version"], draft["status"]) == ("soul", 2, "draft")

    # Com o rascunho pendente, o run usa a versão 1 ativa, lida do banco.
    first = await run_once(api, access_token, admin_db, miolo)
    assert first["status"] == "succeeded" and first["prompt_version"] == original
    assert first["origin"] == "database"
    soul_v1 = next(s for s in first["sources"] if s["kind"] == "soul")
    assert soul_v1["version"] == 1

    preview = await api.get(
        "/admin/squad/agents/otto/prompt", headers=headers, params={"route": "04.01", "draft": True}
    )
    assert preview.status_code == 200, preview.text
    assert NEW_VOICE in preview.json()["blocks"][0]["text"]
    assert preview.json()["content_hash"] != original

    published = await api.post(f"/admin/squad/versions/{draft['id']}/publish", headers=headers)
    assert published.status_code == 200, published.text
    assert published.json()["status"] == "active"

    second = await run_once(api, access_token, admin_db, miolo)
    assert second["status"] == "succeeded"
    assert second["prompt_version"] not in (original, None)
    assert second["prompt_version"] == preview.json()["content_hash"]
    assert {"id": draft["id"], "kind": "soul", "key": "SOUL.md", "version": 2} in second["sources"]

    restored = await api.post(
        f"/admin/squad/versions/{soul_v1['id']}/restore", headers=headers, json={}
    )
    assert restored.status_code == 200, restored.text
    assert (restored.json()["version"], restored.json()["status"]) == (3, "active")
    assert restored.json()["restored_from_version"] == 1
    third = await run_once(api, access_token, admin_db, miolo)
    assert third["prompt_version"] == original

    history = await api.get(
        "/admin/squad/versions", headers=headers, params={"kind": "soul", "agent_id": "otto"}
    )
    assert [(v["version"], v["status"]) for v in history.json()["items"]] == [
        (3, "active"),
        (2, "superseded"),
        (1, "superseded"),
    ]
    actions = await rows(
        admin_db,
        """
        select a.action, a.payload ->> 'version' as version, u.email
        from public.audit_events a join auth.users u on u.id::text = a.actor_id
        where a.entity_type = 'squad_version' and a.payload ->> 'agent_id' = 'otto'
        order by a.created_at
        """,
    )
    assert [(a["action"], a["version"], a["email"]) for a in actions][-3:] == [
        ("squad.draft_saved", "2", VIC),
        ("squad.version_published", "2", VIC),
        ("squad.version_restored", "3", VIC),
    ]


async def test_tool_removed_from_agent_yaml_is_refused_by_the_runtime(
    api, access_token, admin_db, miolo
) -> None:
    headers = bearer(access_token(VIC))
    agent = (await api.get("/admin/squad/agents/otto", headers=headers)).json()
    tools = agent["config"]["fields"]["tools"]
    assert "entregas.criar_versao" in tools
    assert agent["config"]["fields"]["tool_notes"]["canais.publicar_facebook"] == "idem"

    unknown = await api.put(
        "/admin/squad/agents/otto/config",
        headers=headers,
        json={"tools": [*tools, "planilhas.apagar_tudo"]},
    )
    assert unknown.status_code == 422
    assert unknown.json()["error"]["code"] == "unknown_tool"

    draft = await api.put(
        "/admin/squad/agents/otto/config",
        headers=headers,
        json={"tools": [t for t in tools if t != "entregas.criar_versao"], "note": "teste"},
    )
    assert draft.status_code == 200, draft.text
    content = (await api.get(f"/admin/squad/versions/{draft.json()['id']}", headers=headers)).json()
    assert "entregas.criar_versao" not in content["content"]
    # O resto do agent.yaml, com os comentários, fica igual.
    original = (REPO_SQUAD_DIR / "otto" / "agent.yaml").read_text(encoding="utf-8")
    assert content["content"] == original.replace("  - entregas.criar_versao\n", "")

    published = await api.post(
        f"/admin/squad/versions/{draft.json()['id']}/publish", headers=headers
    )
    assert published.status_code == 200, published.text
    run = await run_once(api, access_token, admin_db, miolo)
    assert run["status"] == "failed"
    assert run["error"]["code"] == "tool_not_allowed"


async def test_diff_compares_two_versions_of_the_same_unit(api, access_token) -> None:
    headers = bearer(access_token(VIC))
    draft = await edit_voice(api, headers)
    history = (
        await api.get(
            "/admin/squad/versions", headers=headers, params={"kind": "soul", "agent_id": "otto"}
        )
    ).json()["items"]
    v1 = next(v for v in history if v["version"] == 1)
    diff = await api.get(
        "/admin/squad/diff", headers=headers, params={"from": v1["id"], "to": draft["id"]}
    )
    assert diff.status_code == 200, diff.text
    body = diff.json()
    assert body["path"] == "otto/SOUL.md" and body["changed_sections"] == ["como_fala"]
    assert {"op": "+", "text": NEW_VOICE} in body["lines"]
    assert any(
        line["op"] == "-" and line["text"].startswith("Na voz da marca") for line in body["lines"]
    )
    assert body["unified"].startswith("--- otto/SOUL.md (versão 1)")

    config = (
        await api.get(
            "/admin/squad/versions", headers=headers, params={"kind": "config", "agent_id": "otto"}
        )
    ).json()["items"][0]
    mixed = await api.get(
        "/admin/squad/diff", headers=headers, params={"from": config["id"], "to": draft["id"]}
    )
    assert mixed.status_code == 422

    same = await api.get(
        "/admin/squad/diff", headers=headers, params={"from": v1["id"], "to": v1["id"]}
    )
    assert same.json()["unified"] == "" and {line["op"] for line in same.json()["lines"]} == {" "}

    discarded = await api.post(f"/admin/squad/versions/{draft['id']}/discard", headers=headers)
    assert discarded.json()["status"] == "discarded"
    again = await api.post(f"/admin/squad/versions/{draft['id']}/publish", headers=headers)
    assert again.status_code == 409


async def test_what_it_reads_matches_the_runtime_prompt(api, access_token) -> None:
    headers = bearer(access_token(VIC))
    preview = await api.get(
        "/admin/squad/agents/otto/prompt", headers=headers, params={"route": "04.01"}
    )
    assert preview.status_code == 200, preview.text
    body = preview.json()
    assert body["origin"] == "database"
    assert body["content_hash"] == SquadLoader().prompt("otto", "04.01").content_hash
    assert [b["part"] for b in body["blocks"]] == [
        "rules_and_soul",
        "skill",
        "workspace",
        "message",
    ]
    assert (
        "{{marca.nome}}" not in body["blocks"][0]["text"] and "Miolo" in body["blocks"][0]["text"]
    )
    assert body["tokens_estimated"] == sum(b["tokens_estimated"] for b in body["blocks"]) > 0
    for route in ("conversa", "reflexao"):
        other = await api.get(
            "/admin/squad/agents/nexo/prompt", headers=headers, params={"route": route}
        )
        assert other.status_code == 200, (route, other.text)
    missing = await api.get(
        "/admin/squad/agents/otto/prompt", headers=headers, params={"route": "04.07"}
    )
    assert missing.status_code == 404

    agent = (await api.get("/admin/squad/agents/otto", headers=headers)).json()
    assert agent["soul"]["sections_in_prompt"] == 6
    assert [s["section"] for s in agent["soul"]["sections"]] == [
        "identidade",
        "o_que_faz",
        "como_fala",
        "limites",
        "memoria",
        "nunca_faz",
    ]
    assert agent["soul"]["title"] == "Otto — Conteúdo e Comunicação"
    skills = {s["delivery_type"]: s for s in agent["skills"]}
    assert skills["04.01"]["active"]["version"] == 1 and skills["04.07"]["active"] is None


async def test_business_rules_in_the_prompt_become_a_shared_rules_draft(
    api, access_token, admin_db
) -> None:
    headers = bearer(access_token(VIC))
    docs = (await api.get("/admin/rules", headers=headers)).json()["items"]
    doc = next(d for d in docs if d["slug"] == "diretrizes-do-dono")
    saved = await api.post(
        f"/admin/rules/{doc['id']}/versions",
        headers=headers,
        json={
            "in_prompt": True,
            "note": "teste SA3a",
            "paragraphs": [
                {"mark": "decided", "text": "Aprovar conteúdo não autoriza publicar."},
                {"mark": "current_base", "text": "Créditos com valores provisórios."},
                {"mark": "pending", "text": "Regra pendente que não entra."},
                {"mark": "proposal", "text": "Proposta que não entra."},
            ],
        },
    )
    assert saved.status_code == 201, saved.text
    result = saved.json()
    assert result["version"]["version"] == 2 and result["doc"]["in_prompt"] is True
    draft = result["shared_rules_draft"]
    assert draft["key"] == "README.md" and draft["status"] == "draft"
    content = (await api.get(f"/admin/squad/versions/{draft['id']}", headers=headers)).json()
    rules = SquadLoader(files={"README.md": content["content"].encode()}).shared_rules()
    assert "### Regras de negócio: Diretrizes do dono (versão 2)" in rules
    assert "- Aprovar conteúdo não autoriza publicar." in rules
    assert "- Créditos com valores provisórios." in rules
    assert "pendente" not in rules and "Proposta" not in rules

    detail = (await api.get(f"/admin/rules/{doc['id']}", headers=headers)).json()
    assert [p["mark"] for p in detail["prompt_paragraphs"]] == ["decided", "current_base"]
    assert [v["version"] for v in detail["versions"]] == [2, 1]

    # Rascunho não entra no runtime; publicar entra.
    preview = (
        await api.get("/admin/squad/agents/nexo/prompt", headers=headers, params={"route": "01.01"})
    ).json()
    assert "Regras de negócio" not in preview["blocks"][0]["text"]
    await api.post(f"/admin/squad/versions/{draft['id']}/publish", headers=headers)
    preview = (
        await api.get("/admin/squad/agents/nexo/prompt", headers=headers, params={"route": "01.01"})
    ).json()
    assert "- Aprovar conteúdo não autoriza publicar." in preview["blocks"][0]["text"]
    audit = await one(
        admin_db,
        "select payload from public.audit_events where action = 'rules.version_saved'"
        " order by created_at desc limit 1",
    )
    assert audit["payload"]["version"] == 2 and audit["payload"]["platform_admin"] is True


async def test_only_the_platform_admin_writes_and_restore_waits_for_pending_draft(
    api, access_token, admin_db
) -> None:
    marina = bearer(access_token(MARINA))
    v1 = (
        await one(
            admin_db,
            "select id from public.squad_versions where kind = 'soul' and agent_id = 'otto'",
        )
    )["id"]
    for method, path, payload in (
        ("put", "/admin/squad/agents/otto/soul/sections/como_fala", {"body": NEW_VOICE}),
        ("put", "/admin/squad/agents/otto/config", {"max_autonomy": "analisar"}),
        ("put", "/admin/squad/agents/otto/skills/04.01", {"content": "x"}),
        ("put", "/admin/squad/shared/README.md", {"content": "x"}),
        ("post", f"/admin/squad/versions/{v1}/publish", None),
        ("post", f"/admin/squad/versions/{v1}/restore", {}),
        ("post", f"/admin/squad/versions/{v1}/discard", None),
    ):
        response = await api.request(method.upper(), path, headers=marina, json=payload)
        assert response.status_code == 403, (path, response.status_code)
        assert response.json()["error"]["code"] == "platform_admin_only"

    headers = bearer(access_token(VIC))
    active = await api.post(f"/admin/squad/versions/{v1}/restore", headers=headers, json={})
    assert active.status_code == 409  # a versão 1 é a ativa: nada a voltar
    draft = await edit_voice(api, headers)
    await api.post(f"/admin/squad/versions/{draft['id']}/publish", headers=headers)
    await edit_voice(api, headers)
    pending = await api.post(f"/admin/squad/versions/{v1}/restore", headers=headers, json={})
    assert pending.status_code == 409
    assert "rascunho pendente" in pending.json()["error"]["message"]
