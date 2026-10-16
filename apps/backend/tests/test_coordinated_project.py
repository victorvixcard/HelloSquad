"""S2d — Colaboração entre agentes e projeto coordenado (01.02 do Nexo).

Critério da Fase 2 (PLANO_DE_ACAO_FASE2.md): um projeto coordenado (Bia → Kaia → Otto) fecha com
um responsável por etapa. Tudo no modo simulado; a etapa da Kaia aguarda o motor de imagem do dono
(stub honesto), não falha, não cobra e não segura a etapa do Otto, que não depende da peça.
"""

from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import psycopg
import pytest
from psycopg.rows import dict_row

from hellosquad.config import Settings
from hellosquad.llm.simulated import SimulatedLLM
from hellosquad.worker.main import Worker

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
RAFAEL = "rafael@vitta.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
REQUEST = "Quero uma campanha de Natal para vender mais panetones."


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def rows(conn: psycopg.AsyncConnection, query: str, *params: object) -> list[dict[str, Any]]:
    cursor = conn.cursor(row_factory=dict_row)
    await cursor.execute(query, params)
    return await cursor.fetchall()


async def scalar(conn: psycopg.AsyncConnection, query: str, *params: object) -> Any:
    [row] = await rows(conn, query, *params)
    return next(iter(row.values()))


@pytest.fixture(autouse=True)
async def seed_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    yield
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


async def workspace(admin_db: psycopg.AsyncConnection, slug: str) -> str:
    return str(await scalar(admin_db, "select id from public.workspaces where slug = %s", slug))


async def drain(**llm: Any) -> list[str]:
    settings = Settings(llm_provider="simulated", worker_retry_base_seconds=0)
    async with Worker(settings, llm=SimulatedLLM(**llm)) as worker:
        return await worker.drain()


async def ask_campaign(api, access_token, user: str, workspace_id: str) -> tuple[str, str]:
    headers = bearer(access_token(user))
    room = await api.post(
        f"/workspaces/{workspace_id}/conversations", headers=headers, json={"kind": "squad_room"}
    )
    assert room.status_code in (200, 201), room.text
    message = await api.post(
        f"/conversations/{room.json()['id']}/messages", headers=headers, json={"body": REQUEST}
    )
    assert message.status_code == 201, message.text
    work = await api.post(
        f"/messages/{message.json()['id']}/work-items",
        headers=headers,
        json={"delivery_type": "01.02", "title": "Campanha de Natal"},
    )
    assert work.status_code == 201, work.text
    return work.json()["id"], room.json()["id"]


async def steps(admin_db, work_item_id: str) -> list[dict[str, Any]]:
    return await rows(
        admin_db,
        """
        select id, seq, title, agent_id::text, delivery_type, status::text, depends_on,
               status_reason, status_params, output, started_at, finished_at
        from public.work_item_steps where work_item_id = %s order by seq
        """,
        work_item_id,
    )


async def step_runs(admin_db, work_item_id: str) -> list[dict[str, Any]]:
    return await rows(
        admin_db,
        """
        select r.id, r.agent_id::text, r.status::text, s.seq, r.created_at
        from public.runs r left join public.work_item_steps s on s.id = r.step_id
        where r.work_item_id = %s order by r.created_at, r.id
        """,
        work_item_id,
    )


async def pending(admin_db, work_item_id: str) -> dict[str, Any]:
    [row] = await rows(
        admin_db,
        "select id, step_id, kind::text, requested_by_agent_id::text as agent_id "
        "from public.approvals where work_item_id = %s and status = 'pending'",
        work_item_id,
    )
    return row


async def approve(api, access_token, approval_id: Any) -> None:
    response = await api.post(
        f"/approvals/{approval_id}/decision",
        headers=bearer(access_token(MARINA)),
        json={"decision": "approved"},
    )
    assert response.status_code == 200, response.text


async def holds(admin_db, work_item_id: str) -> dict[str, tuple[str, Any]]:
    found = await rows(
        admin_db,
        """
        select coalesce(s.agent_id::text, r.agent_id::text) as agent, h.state::text, h.captured
        from public.credit_holds h
        join public.runs r on r.id = h.run_id
        left join public.work_item_steps s on s.id = r.step_id
        where r.work_item_id = %s
        """,
        work_item_id,
    )
    return {h["agent"]: (h["state"], h["captured"]) for h in found}


async def test_coordinated_campaign_closes_with_one_owner_per_step(
    api, access_token, admin_db
) -> None:
    miolo = await workspace(admin_db, "miolo")
    work_id, room_id = await ask_campaign(api, access_token, MARINA, miolo)
    headers = bearer(access_token(MARINA))

    # Nexo coordena: monta a equipe e delega só a primeira etapa (um especialista por vez).
    assert await drain() == ["planned", "delivered"]
    planned = await steps(admin_db, work_id)
    assert [(s["seq"], s["agent_id"], s["delivery_type"]) for s in planned] == [
        (1, "bia", "02.04"),
        (2, "kaia", "03.01"),
        (3, "otto", "04.03"),
    ]
    assert [s["status"] for s in planned] == ["needs_you", "pending", "pending"]
    assert [s["depends_on"] for s in planned] == [[], [1], [1]]
    assert [r["seq"] for r in await step_runs(admin_db, work_id)] == [None, 1]

    team = await rows(
        admin_db,
        "select author_agent_id::text as agent, card from public.messages "
        "where conversation_id = %s and card ->> 'type' = 'team'",
        room_id,
    )
    assert [t["agent"] for t in team] == ["nexo"]
    assert [(m["agent_id"], m["responsibility"]) for m in team[0]["card"]["members"]] == [
        ("bia", "estratégia e conceito"),
        ("kaia", "peças da campanha"),
        ("otto", "legendas e roteiros"),
    ]

    item = await rows(
        admin_db,
        "select w.status::text, w.project_id, w.collaborator_agent_ids::text[] as collaborators, "
        "p.name, p.status::text as project_status "
        "from public.work_items w join public.projects p on p.id = w.project_id where w.id = %s",
        work_id,
    )
    assert item[0]["status"] == "needs_you"
    assert item[0]["collaborators"] == ["bia", "kaia", "otto"]
    assert (item[0]["name"], item[0]["project_status"]) == ("Campanha de Natal", "active")
    project_id = item[0]["project_id"]

    # "Precisa de você" só quando a etapa depende da pessoa: a estratégia da Bia.
    strategy = await pending(admin_db, work_id)
    assert (strategy["kind"], strategy["agent_id"], strategy["step_id"]) == (
        "review",
        "bia",
        planned[0]["id"],
    )
    needs = await api.get(f"/workspaces/{miolo}/needs", headers=headers)
    assert needs.status_code == 200, needs.text
    ours = [
        n["approval"]
        for n in needs.json()["items"]
        if n.get("approval") and n["approval"]["id"] == str(strategy["id"])
    ]
    assert [(a["kind"], a["requested_by_agent_id"]) for a in ours] == [("review", "bia")]

    detail = await api.get(f"/work-items/{work_id}", headers=headers)
    assert detail.status_code == 200, detail.text
    body = detail.json()
    assert [(s["seq"], s["agent_id"], s["status"]) for s in body["steps"]] == [
        (1, "bia", "needs_you"),
        (2, "kaia", "pending"),
        (3, "otto", "pending"),
    ]
    assert body["step_label"] == "etapa 1 de 3"
    texts = [h["text"] for h in body["history"]]
    assert "Nexo montou a equipe: Bia, Kaia e Otto" in texts
    assert "Bia começou a etapa 1 · Estratégia" in texts

    # O dono aprova a estratégia: a etapa fecha, a Kaia aguarda o motor e o Otto segue.
    await approve(api, access_token, strategy["id"])
    assert await drain() == ["waiting_engine", "delivered"]
    after = {s["seq"]: s for s in await steps(admin_db, work_id)}
    assert after[1]["status"] == "done"
    strategy_version = after[1]["output"]["delivery_version_id"]
    assert after[2]["status"] == "waiting_engine"
    assert after[2]["status_reason"] == "image_engine_pending"
    assert after[3]["status"] == "needs_you"
    assert [r["seq"] for r in await step_runs(admin_db, work_id)] == [None, 1, 2, 3]

    waiting = await rows(
        admin_db,
        "select body, card from public.messages where conversation_id = %s "
        "and author_agent_id = 'kaia'",
        room_id,
    )
    assert len(waiting) == 1 and waiting[0]["card"] is None
    assert "aguardando o motor de imagem" in waiting[0]["body"]

    # Handoff: a estratégia aprovada entrou no contexto do Otto, sem repetir o briefing inteiro.
    otto_run = (await step_runs(admin_db, work_id))[3]["id"]
    context = await rows(
        admin_db,
        "select kind::text, reason, step_id, delivery_version_id from public.run_context_items "
        "where run_id = %s and kind = 'step'",
        otto_run,
    )
    assert [(c["reason"], c["step_id"], str(c["delivery_version_id"])) for c in context] == [
        ("handoff", planned[0]["id"], str(strategy_version))
    ]
    produce = await scalar(
        admin_db,
        "select payload from public.run_steps where run_id = %s and payload ->> 'step' = "
        "'otto.produce' order by seq desc limit 1",
        otto_run,
    )
    assert produce["simulated"]["case"] == "com_estrategia"
    delegated = await rows(
        admin_db,
        "select payload from public.run_steps where run_id = %s and payload ->> 'tool' = "
        "'squad.delegar'",
        otto_run,
    )
    assert [
        (d["payload"]["agent_id"], d["payload"]["to"], d["payload"]["step"]) for d in delegated
    ] == [("nexo", "otto", 3)]
    texts_version = await scalar(
        admin_db,
        "select v.content from public.delivery_versions v join public.deliveries d "
        "on d.id = v.delivery_id where d.step_id = %s",
        planned[2]["id"],
    )
    assert texts_version["estrategia"]["delivery_version_id"] == str(strategy_version)

    texts_approval = await pending(admin_db, work_id)
    assert (texts_approval["agent_id"], texts_approval["step_id"]) == ("otto", planned[2]["id"])
    await approve(api, access_token, texts_approval["id"])

    # A última etapa fechou: o trabalho e o projeto fecham, com a Kaia marcada como aguardando.
    closed = await rows(
        admin_db,
        "select w.status::text, p.status::text as project_status from public.work_items w "
        "join public.projects p on p.id = w.project_id where w.id = %s",
        work_id,
    )
    assert closed == [{"status": "done", "project_status": "done"}]
    final = await steps(admin_db, work_id)
    assert [(s["agent_id"], s["status"]) for s in final] == [
        ("bia", "done"),
        ("kaia", "waiting_engine"),
        ("otto", "done"),
    ]
    milestones = await rows(
        admin_db,
        "select m.title, m.agent_id::text, m.done_at is not null as done, m.step_id "
        "from public.project_milestones m where m.project_id = %s order by m.created_at, m.title",
        project_id,
    )
    assert {(m["title"], m["agent_id"], m["done"]) for m in milestones} == {
        ("Estratégia", "bia", True),
        ("Peças", "kaia", False),
        ("Textos", "otto", True),
    }
    participants = await rows(
        admin_db,
        "select agent_id::text, responsibility from public.project_participants "
        "where project_id = %s order by agent_id",
        project_id,
    )
    assert {p["agent_id"] for p in participants} == {"bia", "kaia", "otto"}

    # Cada etapa reservou pela delivery dela; só quem entregou foi cobrado.
    charged = await holds(admin_db, work_id)
    assert charged["bia"][0] == "captured" and charged["otto"][0] == "captured"
    assert charged["kaia"][0] == "released" and not charged["kaia"][1]
    assert charged["nexo"][0] == "released"

    project = await api.get(f"/projects/{project_id}", headers=headers)
    assert project.status_code == 200, project.text
    assert project.json()["status"] == "done"
    assert project.json()["owner"]["role"] == "owner"
    final_detail = (await api.get(f"/work-items/{work_id}", headers=headers)).json()
    assert [
        (s["agent_id"], s["status"], s.get("status_reason_label")) for s in final_detail["steps"]
    ] == [
        ("bia", "done", None),
        ("kaia", "waiting_engine", "Aguardando o motor de imagem"),
        ("otto", "done", None),
    ]

    # Isolamento: outra empresa não vê o trabalho, as etapas nem o projeto.
    rafael = bearer(access_token(RAFAEL))
    assert (await api.get(f"/work-items/{work_id}", headers=rafael)).status_code == 404
    assert (await api.get(f"/projects/{project_id}", headers=rafael)).status_code == 404


async def test_step_that_depends_on_the_image_is_blocked_with_the_reason(
    api, access_token, admin_db
) -> None:
    miolo = await workspace(admin_db, "miolo")
    work_id, _ = await ask_campaign(api, access_token, MARINA, miolo)
    assert await drain() == ["planned", "delivered"]
    # Os textos passam a precisar da peça: dependem da etapa 2 (a da Kaia).
    await admin_db.execute(
        "update public.work_item_steps set depends_on = '{1,2}' "
        "where work_item_id = %s and seq = 3",
        (work_id,),
    )
    await approve(api, access_token, (await pending(admin_db, work_id))["id"])
    assert await drain() == ["waiting_engine"]

    blocked = {s["seq"]: s for s in await steps(admin_db, work_id)}
    assert blocked[2]["status"] == "waiting_engine"
    assert blocked[3]["status"] == "blocked"
    assert blocked[3]["status_reason"] == "depends_on_step"
    assert blocked[3]["status_params"]["seq"] == 2
    assert blocked[3]["status_params"]["status"] == "waiting_engine"
    status = await scalar(
        admin_db, "select status::text from public.work_items where id = %s", work_id
    )
    assert status == "blocked"
    assert [r["seq"] for r in await step_runs(admin_db, work_id)] == [None, 1, 2]

    detail = (await api.get(f"/work-items/{work_id}", headers=bearer(access_token(MARINA)))).json()
    assert detail["steps"][2]["status_reason_label"] == (
        "Depende da etapa 2 · Peças, que aguarda o motor de imagem"
    )


async def test_failed_step_keeps_the_earlier_ones(api, access_token, admin_db) -> None:
    miolo = await workspace(admin_db, "miolo")
    work_id, _ = await ask_campaign(api, access_token, MARINA, miolo)
    assert await drain() == ["planned", "delivered"]
    await approve(api, access_token, (await pending(admin_db, work_id))["id"])
    assert await drain(fail_steps={"otto.produce": "config"}) == ["waiting_engine", "failed"]

    failed = {s["seq"]: s for s in await steps(admin_db, work_id)}
    assert failed[1]["status"] == "done"
    assert failed[2]["status"] == "waiting_engine"
    assert failed[3]["status"] == "failed"
    status = await scalar(
        admin_db, "select status::text from public.work_items where id = %s", work_id
    )
    assert status == "failed"
    approved = await scalar(
        admin_db,
        "select v.status::text from public.delivery_versions v where v.id = %s",
        failed[1]["output"]["delivery_version_id"],
    )
    assert approved == "approved"


async def test_vague_campaign_gets_a_question_before_the_team(api, access_token, admin_db) -> None:
    miolo = await workspace(admin_db, "miolo")
    headers = bearer(access_token(MARINA))
    room = await api.post(
        f"/workspaces/{miolo}/conversations", headers=headers, json={"kind": "squad_room"}
    )
    message = await api.post(
        f"/conversations/{room.json()['id']}/messages",
        headers=headers,
        json={"body": "Vamos planejar uma campanha"},
    )
    work = await api.post(
        f"/messages/{message.json()['id']}/work-items",
        headers=headers,
        json={"delivery_type": "01.02", "title": "Campanha"},
    )
    assert work.status_code == 201, work.text
    assert await drain() == ["asked"]
    work_id = work.json()["id"]
    assert await steps(admin_db, work_id) == []
    question = await pending(admin_db, work_id)
    assert (question["kind"], question["agent_id"], question["step_id"]) == (
        "respond",
        "nexo",
        None,
    )
