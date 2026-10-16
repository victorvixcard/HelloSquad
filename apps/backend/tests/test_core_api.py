"""Integração da S1b: pedido → trabalho → aprovação pela API, com JWT real e a RLS do banco.

Cada teste termina reaplicando o seed (supabase/seed.sql recomeça o núcleo dos workspaces do seed e
esvazia as filas), então o banco volta ao estado do seed mesmo se o teste falhar no meio.
"""

from collections.abc import AsyncIterator
from pathlib import Path
from uuid import uuid4

import psycopg
import pytest

from hellosquad import domain

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
RAFAEL = "rafael@vitta.example"
CARLA = "carla@vitta.example"
PEDRO = "pedro@semconta.example"

SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
SEED_ROOM = "5eed0000-0000-4000-8000-000000000101"
SEED_OTTO_CHAT = "5eed0000-0000-4000-8000-000000000102"
SEED_ASK_MESSAGE = "5eed0000-0000-4000-8000-000000000202"
SEED_WORK_ITEM = "5eed0000-0000-4000-8000-000000000301"
SEED_RUN = "5eed0000-0000-4000-8000-000000000401"
SEED_DELIVERY = "5eed0000-0000-4000-8000-000000000501"
SEED_VERSION = "5eed0000-0000-4000-8000-000000000502"
SEED_APPROVAL = "5eed0000-0000-4000-8000-000000000601"


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def scalar(conn: psycopg.AsyncConnection, query: str, *params: object) -> object:
    row = await (await conn.execute(query, params)).fetchone()
    return row[0] if row else None


async def workspace_id(conn: psycopg.AsyncConnection, slug: str) -> str:
    return str(await scalar(conn, "select id from public.workspaces where slug = %s", slug))


async def queue_messages(conn: psycopg.AsyncConnection, run_id: str) -> list[int]:
    rows = await (
        await conn.execute(
            "select msg_id from pgmq.q_runs_interactive where message->>'run_id' = %s",
            (run_id,),
        )
    ).fetchall()
    return [row[0] for row in rows]


@pytest.fixture(autouse=True)
async def seed_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    yield
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


@pytest.fixture
async def miolo(admin_db: psycopg.AsyncConnection) -> str:
    return await workspace_id(admin_db, "miolo")


@pytest.fixture
async def vitta(admin_db: psycopg.AsyncConnection) -> str:
    return await workspace_id(admin_db, "vitta")


async def test_api_enums_match_the_database(admin_db) -> None:
    enums = {
        "principal_type": domain.PrincipalType,
        "conversation_kind": domain.ConversationKind,
        "message_author_type": domain.MessageAuthorType,
        "project_status": domain.ProjectStatus,
        "work_item_status": domain.WorkItemStatus,
        "work_item_step_status": domain.WorkItemStepStatus,
        "delivery_version_status": domain.DeliveryVersionStatus,
        "approval_kind": domain.ApprovalKind,
        "approval_status": domain.ApprovalStatus,
        "approval_decision": domain.ApprovalDecision,
        "run_kind": domain.RunKind,
        "run_status": domain.RunStatus,
    }
    for name, enum in enums.items():
        values = await scalar(admin_db, f"select enum_range(null::public.{name})::text[]")
        assert values == [member.value for member in enum], name
    for agent in domain.AgentId:
        assert await scalar(admin_db, "select %s::public.agent_id::text", agent.value) == agent
    with pytest.raises(psycopg.errors.CheckViolation):
        await admin_db.execute("select 'thor'::public.agent_id")


async def test_request_becomes_work_item_with_queued_run(api, access_token, admin_db, miolo):
    headers = bearer(access_token(MARINA))

    conversation = await api.post(
        f"/workspaces/{miolo}/conversations",
        headers=headers,
        json={"kind": "agent_direct", "primary_agent_id": "otto"},
    )
    assert conversation.status_code == 201
    conversation_id = conversation.json()["id"]
    assert conversation.headers["Location"] == f"/conversations/{conversation_id}"
    assert sorted(
        (p["participant_type"], p["agent_id"]) for p in conversation.json()["participants"]
    ) == [("agent", "otto"), ("user", None)]

    message = await api.post(
        f"/conversations/{conversation_id}/messages",
        headers=headers,
        json={"body": "  Otto, uma legenda para o pão de sábado, tom acolhedor.  "},
    )
    assert message.status_code == 201
    assert message.json()["body"] == "Otto, uma legenda para o pão de sábado, tom acolhedor."
    assert message.json()["author_type"] == "user"

    request = {
        "delivery_type": "04.01",
        "title": "Legenda do pão de sábado",
        "briefing": {"canal": "instagram", "tom": "acolhedor"},
        "idempotency_key": f"teste:{uuid4()}",
    }
    created = await api.post(
        f"/messages/{message.json()['id']}/work-items", headers=headers, json=request
    )
    assert created.status_code == 201
    work_item = created.json()
    assert (work_item["status"], work_item["primary_agent_id"], work_item["delivery_type"]) == (
        "draft",
        "otto",
        "04.01",
    )
    assert work_item["briefing"] == request["briefing"]
    run_id = work_item["run_id"]
    assert await scalar(admin_db, "select status::text from public.runs where id = %s", run_id) == (
        "queued"
    )

    # A fila só é lida pelo papel privilegiado: exatamente uma mensagem para o run.
    queued = await queue_messages(admin_db, run_id)
    assert len(queued) == 1
    payload = await scalar(
        admin_db, "select message from pgmq.q_runs_interactive where msg_id = %s", queued[0]
    )
    assert (payload["workspace_id"], payload["agent_id"], payload["work_item_id"]) == (
        miolo,
        "otto",
        work_item["id"],
    )

    repeated = await api.post(
        f"/messages/{message.json()['id']}/work-items", headers=headers, json=request
    )
    assert repeated.status_code == 200
    assert (repeated.json()["id"], repeated.json()["run_id"]) == (work_item["id"], run_id)
    assert await queue_messages(admin_db, run_id) == queued, "repetir não enfileira de novo"

    detail = await api.get(f"/work-items/{work_item['id']}", headers=headers)
    assert detail.status_code == 200
    assert [(r["id"], r["status"]) for r in detail.json()["runs"]] == [(run_id, "queued")]
    assert detail.json()["approvals"] == [] and detail.json()["deliveries"] == []

    run = await api.get(f"/runs/{run_id}", headers=headers)
    assert (run.status_code, run.json()["status"], run.json()["kind"]) == (
        200,
        "queued",
        "interactive",
    )

    for msg_id in queued:
        await admin_db.execute("select pgmq.delete('runs_interactive', %s::bigint)", (msg_id,))
    assert await queue_messages(admin_db, run_id) == []


async def test_needs_you_shows_seed_approval_and_decision_is_idempotent(
    api, access_token, admin_db, miolo
):
    headers = bearer(access_token(MARINA))

    pending = await api.get(f"/workspaces/{miolo}/approvals?status=pending", headers=headers)
    assert pending.status_code == 200
    [item] = pending.json()["items"]
    assert (item["id"], item["kind"], item["status"], item["delivery_version_no"]) == (
        SEED_APPROVAL,
        "review",
        "pending",
        1,
    )
    assert (item["work_item"]["id"], item["work_item"]["status"]) == (SEED_WORK_ITEM, "needs_you")

    decided = await api.post(
        f"/approvals/{SEED_APPROVAL}/decision", headers=headers, json={"decision": "approved"}
    )
    assert decided.status_code == 200
    body = decided.json()
    assert (body["status"], body["decision"], body["work_item"]["status"]) == (
        "decided",
        "approved",
        "approved",
    )

    detail = (await api.get(f"/work-items/{SEED_WORK_ITEM}", headers=headers)).json()
    assert detail["status"] == "approved"
    [delivery] = detail["deliveries"]
    assert delivery["current_version_id"] == SEED_VERSION
    assert [(v["version_no"], v["status"]) for v in delivery["versions"]] == [(1, "approved")]
    assert delivery["versions"][0]["content"]["canal"] == "instagram"
    assert [a["status"] for a in detail["approvals"]] == ["decided"]

    for retry in ({"decision": "approved"}, {"decision": "changes_requested", "note": "outra"}):
        again = await api.post(f"/approvals/{SEED_APPROVAL}/decision", headers=headers, json=retry)
        assert again.status_code == 200
        assert again.json() == body, "repetir devolve o mesmo estado"

    assert (
        await scalar(
            admin_db,
            "select count(*) from public.audit_events where action = 'approval.decided' "
            "and entity_id = %s",
            SEED_APPROVAL,
        )
        == 1
    )
    assert (await api.get(f"/workspaces/{miolo}/approvals?status=pending", headers=headers)).json()[
        "items"
    ] == []


async def test_only_the_owner_decides(api, access_token, admin_db, vitta):
    """Decisão do dono (16/10 08:55): só o owner decide revisão, autorização e resposta."""
    item = await scalar(
        admin_db,
        "insert into public.work_items (workspace_id, title, delivery_type, primary_agent_id) "
        "values (%s, 'Post da Vitta', '04.01', 'otto') returning id",
        vitta,
    )
    review, authorize = [
        str(
            await scalar(
                admin_db,
                "insert into public.approvals (workspace_id, work_item_id, kind, "
                "requested_by_agent_id) values (%s, %s, %s, 'otto') returning id",
                vitta,
                item,
                kind,
            )
        )
        for kind in ("review", "authorize")
    ]
    carla = bearer(access_token(CARLA))
    forbidden = {
        "code": "forbidden",
        "message": "Só o dono da conta toma esta decisão.",
        "details": [],
    }

    for approval, body in (
        (review, {"decision": "changes_requested", "note": "Mais curto."}),
        (authorize, {"decision": "approved"}),
    ):
        refused = await api.post(f"/approvals/{approval}/decision", headers=carla, json=body)
        assert refused.status_code == 403
        assert refused.json()["error"] == forbidden

    reviewed = await api.post(
        f"/approvals/{review}/decision",
        headers=bearer(access_token(RAFAEL)),
        json={"decision": "changes_requested", "note": "Mais curto."},
    )
    assert (reviewed.status_code, reviewed.json()["decision"], reviewed.json()["note"]) == (
        200,
        "changes_requested",
        "Mais curto.",
    )
    assert reviewed.json()["follow_up"] is None
    assert await scalar(
        admin_db, "select status::text from public.approvals where id = %s", authorize
    ) == ("pending")


async def test_pedro_without_workspace_sees_nothing(api, access_token, miolo) -> None:
    headers = bearer(access_token(PEDRO))

    for path in (
        f"/workspaces/{miolo}/conversations",
        f"/workspaces/{miolo}/work-items",
        f"/workspaces/{miolo}/approvals?status=pending",
        f"/workspaces/{miolo}/projects",
        f"/conversations/{SEED_ROOM}",
        f"/conversations/{SEED_OTTO_CHAT}/messages",
        f"/work-items/{SEED_WORK_ITEM}",
        f"/runs/{SEED_RUN}",
        f"/runs/{SEED_RUN}/events",
    ):
        response = await api.get(path, headers=headers)
        assert response.status_code == 404, path
        assert response.json()["error"]["code"] == "not_found", path

    for path, payload in (
        (f"/conversations/{SEED_OTTO_CHAT}/messages", {"body": "Oi"}),
        (f"/messages/{SEED_ASK_MESSAGE}/work-items", {"title": "Nada"}),
        (f"/approvals/{SEED_APPROVAL}/decision", {"decision": "approved"}),
        (f"/workspaces/{miolo}/conversations", {"kind": "squad_room"}),
    ):
        response = await api.post(path, headers=headers, json=payload)
        assert response.status_code == 404, path

    assert (await api.get("/workspaces", headers=headers)).json() == {"items": []}


async def test_marina_cannot_read_vitta_conversation(api, access_token, admin_db, vitta):
    conversation = str(
        await scalar(
            admin_db,
            "insert into public.conversations (workspace_id, kind, primary_agent_id) "
            "values (%s, 'agent_direct', 'otto') returning id",
            vitta,
        )
    )
    await admin_db.execute(
        "insert into public.messages (workspace_id, conversation_id, author_type, body) "
        "values (%s, %s, 'system', 'Conversa da Vitta')",
        (vitta, conversation),
    )
    marina = bearer(access_token(MARINA))

    outsider = await api.get(f"/conversations/{conversation}", headers=marina)
    missing = await api.get(f"/conversations/{uuid4()}", headers=marina)
    messages = await api.get(f"/conversations/{conversation}/messages", headers=marina)
    posted = await api.post(
        f"/conversations/{conversation}/messages", headers=marina, json={"body": "Oi"}
    )
    member = await api.get(
        f"/conversations/{conversation}/messages", headers=bearer(access_token(RAFAEL))
    )

    assert outsider.status_code == 404
    assert outsider.json() == missing.json()
    assert (messages.status_code, posted.status_code) == (404, 404)
    assert posted.json()["error"]["message"] == "Conversa não encontrada."
    assert [m["body"] for m in member.json()["items"]] == ["Conversa da Vitta"]


async def test_viewer_reads_but_cannot_act(api, access_token, admin_db, miolo) -> None:
    pedro = await scalar(admin_db, "select id from auth.users where email = %s", PEDRO)
    await admin_db.execute(
        "insert into public.memberships (workspace_id, user_id, role) values (%s, %s, 'viewer')",
        (miolo, pedro),
    )
    try:
        headers = bearer(access_token(PEDRO))

        read = await api.get(f"/conversations/{SEED_OTTO_CHAT}/messages", headers=headers)
        posted = await api.post(
            f"/conversations/{SEED_OTTO_CHAT}/messages", headers=headers, json={"body": "Oi"}
        )
        opened = await api.post(
            f"/workspaces/{miolo}/conversations",
            headers=headers,
            json={"kind": "agent_direct", "primary_agent_id": "otto"},
        )
        requested = await api.post(
            f"/messages/{SEED_ASK_MESSAGE}/work-items", headers=headers, json={"title": "Legenda"}
        )
        decided = await api.post(
            f"/approvals/{SEED_APPROVAL}/decision", headers=headers, json={"decision": "approved"}
        )

        assert read.status_code == 200 and len(read.json()["items"]) == 2
        assert posted.status_code == 403
        assert posted.json()["error"]["message"] == "Seu papel não permite enviar mensagens."
        assert (opened.status_code, requested.status_code, decided.status_code) == (403, 403, 403)
    finally:
        await admin_db.execute(
            "delete from public.memberships where workspace_id = %s and user_id = %s",
            (miolo, pedro),
        )


async def test_messages_paginate_by_cursor_in_chronological_order(api, access_token, miolo):
    headers = bearer(access_token(MARINA))
    conversation = (
        await api.post(
            f"/workspaces/{miolo}/conversations",
            headers=headers,
            json={"kind": "agent_direct", "primary_agent_id": "bia"},
        )
    ).json()["id"]
    for body in ("primeira", "segunda", "terceira"):
        sent = await api.post(
            f"/conversations/{conversation}/messages", headers=headers, json={"body": body}
        )
        assert sent.status_code == 201

    first = await api.get(f"/conversations/{conversation}/messages?limit=2", headers=headers)
    second = await api.get(
        f"/conversations/{conversation}/messages",
        headers=headers,
        params={"limit": 2, "cursor": first.json()["next_cursor"]},
    )
    broken = await api.get(
        f"/conversations/{conversation}/messages?cursor=nao-e-cursor", headers=headers
    )

    assert [m["body"] for m in first.json()["items"]] == ["primeira", "segunda"]
    assert first.json()["next_cursor"]
    assert [m["body"] for m in second.json()["items"]] == ["terceira"]
    assert second.json()["next_cursor"] is None
    assert (broken.status_code, broken.json()["error"]["code"]) == (422, "invalid_cursor")


async def test_messages_open_at_the_latest_and_page_backwards(api, access_token, miolo):
    headers = bearer(access_token(MARINA))
    conversation = (
        await api.post(
            f"/workspaces/{miolo}/conversations",
            headers=headers,
            json={"kind": "agent_direct", "primary_agent_id": "bia"},
        )
    ).json()["id"]
    for body in ("primeira", "segunda", "terceira"):
        sent = await api.post(
            f"/conversations/{conversation}/messages", headers=headers, json={"body": body}
        )
        assert sent.status_code == 201
    url = f"/conversations/{conversation}/messages"

    latest = await api.get(url, headers=headers, params={"before": "latest", "limit": 2})
    older = await api.get(
        url, headers=headers, params={"before": latest.json()["next_cursor"], "limit": 2}
    )
    whole = await api.get(url, headers=headers, params={"before": "latest"})
    forward = await api.get(url, headers=headers, params={"limit": 2})
    behind_forward = await api.get(
        url, headers=headers, params={"before": forward.json()["next_cursor"]}
    )
    both = await api.get(
        url, headers=headers, params={"before": "latest", "cursor": forward.json()["next_cursor"]}
    )
    broken = await api.get(url, headers=headers, params={"before": "nao-e-cursor"})
    empty = await api.get(f"{url}?before=", headers=headers)
    foreign = await api.get(url, headers=bearer(access_token(RAFAEL)), params={"before": "latest"})

    assert [m["body"] for m in latest.json()["items"]] == ["segunda", "terceira"]
    assert latest.json()["next_cursor"]
    assert [m["body"] for m in older.json()["items"]] == ["primeira"]
    assert older.json()["next_cursor"] is None
    assert [m["body"] for m in whole.json()["items"]] == ["primeira", "segunda", "terceira"]
    assert whole.json()["next_cursor"] is None
    assert [m["body"] for m in forward.json()["items"]] == ["primeira", "segunda"]
    assert [m["body"] for m in behind_forward.json()["items"]] == ["primeira"]
    assert (both.status_code, both.json()["error"]["code"]) == (422, "invalid_cursor")
    assert (broken.status_code, broken.json()["error"]["code"]) == (422, "invalid_cursor")
    assert (empty.status_code, empty.json()["error"]["code"]) == (422, "validation_error")
    assert foreign.status_code == 404


async def test_idempotency_key_is_bound_to_one_request(api, access_token, miolo) -> None:
    headers = bearer(access_token(MARINA))
    conversation = (
        await api.post(
            f"/workspaces/{miolo}/conversations",
            headers=headers,
            json={"kind": "agent_direct", "primary_agent_id": "otto"},
        )
    ).json()["id"]
    first, second = [
        (
            await api.post(
                f"/conversations/{conversation}/messages", headers=headers, json={"body": body}
            )
        ).json()["id"]
        for body in ("Legenda A", "Legenda B")
    ]
    request = {"delivery_type": "04.01", "title": "Legenda A", "idempotency_key": "chave-a"}

    created = await api.post(f"/messages/{first}/work-items", headers=headers, json=request)
    repeated = await api.post(f"/messages/{first}/work-items", headers=headers, json=request)
    reused = await api.post(f"/messages/{second}/work-items", headers=headers, json=request)
    without_key = [
        await api.post(
            f"/messages/{second}/work-items", headers=headers, json={"title": "Legenda B"}
        )
        for _ in range(2)
    ]

    assert (created.status_code, repeated.status_code) == (201, 200)
    assert repeated.json()["id"] == created.json()["id"]
    assert (reused.status_code, reused.json()["error"]["code"]) == (409, "idempotency_key_reused")
    assert [r.status_code for r in without_key] == [201, 200]
    assert without_key[0].json()["id"] == without_key[1].json()["id"]
    assert without_key[0].json()["primary_agent_id"] == "otto", "conversa direta: agente dela"


async def test_database_errors_follow_the_s1a_table(api, access_token, admin_db, miolo) -> None:
    headers = bearer(access_token(MARINA))

    off_catalog = await api.post(
        f"/messages/{SEED_ASK_MESSAGE}/work-items",
        headers=headers,
        json={"delivery_type": "09.01", "title": "Fora do catálogo"},
    )
    wrong_decision = await api.post(
        f"/approvals/{SEED_APPROVAL}/decision", headers=headers, json={"decision": "answered"}
    )
    missing_object = await api.post(
        f"/workspaces/{miolo}/conversations",
        headers=headers,
        json={"kind": "object", "context": {"type": "work_item", "id": str(uuid4())}},
    )
    context_outside_object = await api.post(
        f"/workspaces/{miolo}/conversations",
        headers=headers,
        json={
            "kind": "agent_direct",
            "primary_agent_id": "otto",
            "context": {"type": "work_item", "id": SEED_WORK_ITEM},
        },
    )
    await admin_db.execute(
        "update public.conversations set archived_at = now() where id = %s", (SEED_OTTO_CHAT,)
    )
    archived = await api.post(
        f"/conversations/{SEED_OTTO_CHAT}/messages", headers=headers, json={"body": "Oi"}
    )

    def error(response) -> tuple[int, str, str]:
        body = response.json()["error"]
        return response.status_code, body["code"], body["message"]

    assert error(off_catalog) == (422, "invalid_parameter", "Tipo de delivery fora do catálogo.")
    assert error(wrong_decision) == (
        422,
        "invalid_parameter",
        "A decisão answered não vale para uma aprovação do tipo review.",
    )
    assert error(missing_object) == (404, "not_found", "Objeto da conversa não encontrado.")
    assert error(context_outside_object) == (
        422,
        "invalid_parameter",
        "Só conversa do tipo object tem objeto de contexto.",
    )
    assert error(archived) == (409, "invalid_state", "Esta conversa está arquivada.")


async def test_squad_room_and_object_conversation_are_reused(api, access_token, miolo) -> None:
    headers = bearer(access_token(MARINA))

    room = await api.post(
        f"/workspaces/{miolo}/conversations", headers=headers, json={"kind": "squad_room"}
    )
    object_request = {"kind": "object", "context": {"type": "work_item", "id": SEED_WORK_ITEM}}
    opened = await api.post(
        f"/workspaces/{miolo}/conversations", headers=headers, json=object_request
    )
    reopened = await api.post(
        f"/workspaces/{miolo}/conversations", headers=headers, json=object_request
    )
    listed = await api.get(f"/workspaces/{miolo}/conversations", headers=headers)

    assert (room.status_code, room.json()["id"]) == (200, SEED_ROOM)
    assert len([p for p in room.json()["participants"] if p["participant_type"] == "agent"]) == 7
    assert (opened.status_code, reopened.status_code) == (201, 200)
    assert reopened.json()["id"] == opened.json()["id"]
    assert opened.json()["primary_agent_id"] == "otto"
    assert opened.json()["context"] == {
        "type": "work_item",
        "id": SEED_WORK_ITEM,
        "key": None,
        "title": "Legenda do post de sábado: pão de fermentação longa",
        "status": "needs_you",
        "summary": None,
        "period": None,
        "origin": None,
    }
    assert [c["id"] for c in listed.json()["items"]] == [
        opened.json()["id"],
        SEED_OTTO_CHAT,
        SEED_ROOM,
    ]


async def test_work_items_filter_and_projects(api, access_token, admin_db, miolo) -> None:
    headers = bearer(access_token(MARINA))
    project = str(
        await scalar(
            admin_db,
            "insert into public.projects (workspace_id, name) values (%s, 'Pão de sábado') "
            "returning id",
            miolo,
        )
    )
    await admin_db.execute(
        "update public.work_items set project_id = %s where id = %s", (project, SEED_WORK_ITEM)
    )

    def ids(response) -> list[str]:
        assert response.status_code == 200, response.text
        return [item["id"] for item in response.json()["items"]]

    base = f"/workspaces/{miolo}/work-items"
    assert ids(await api.get(base, headers=headers)) == [SEED_WORK_ITEM]
    assert ids(await api.get(f"{base}?status=needs_you&status=draft", headers=headers)) == [
        SEED_WORK_ITEM
    ]
    assert ids(await api.get(f"{base}?status=done", headers=headers)) == []
    assert ids(await api.get(f"{base}?project_id={project}", headers=headers)) == [SEED_WORK_ITEM]
    assert ids(await api.get(f"{base}?project_id={uuid4()}", headers=headers)) == []
    invalid = await api.get(f"{base}?status=finished", headers=headers)
    assert (invalid.status_code, invalid.json()["error"]["code"]) == (422, "validation_error")

    assert ids(await api.get(f"/workspaces/{miolo}/projects", headers=headers)) == [project]
    detail = await api.get(f"/projects/{project}", headers=headers)
    assert (detail.status_code, detail.json()["name"], detail.json()["status"]) == (
        200,
        "Pão de sábado",
        "active",
    )
    outsider = await api.get(f"/projects/{project}", headers=bearer(access_token(RAFAEL)))
    assert outsider.status_code == 404


async def test_run_events_after_cursor(api, access_token, admin_db) -> None:
    for seq in (1, 2, 3):
        await admin_db.execute(
            "insert into public.run_events (workspace_id, run_id, seq, type, payload) "
            "select workspace_id, id, %s, 'run.progress', jsonb_build_object('step', %s) "
            "from public.runs where id = %s",
            (seq, seq, SEED_RUN),
        )
    headers = bearer(access_token(MARINA))

    first = await api.get(f"/runs/{SEED_RUN}/events?after=1&limit=1", headers=headers)
    rest = await api.get(f"/runs/{SEED_RUN}/events?after=2", headers=headers)
    run = await api.get(f"/runs/{SEED_RUN}", headers=headers)

    assert [(e["seq"], e["payload"]) for e in first.json()["items"]] == [(2, {"step": 2})]
    assert first.json()["next_after"] == 2
    assert [e["seq"] for e in rest.json()["items"]] == [3]
    assert rest.json()["next_after"] is None
    assert (run.json()["status"], run.json()["work_item_id"]) == (
        "waiting_approval",
        SEED_WORK_ITEM,
    )
