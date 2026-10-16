"""Integração da S1c: pedido da Marina → fila → worker (simulado) → entrega em "Precisa de você".

O worker roda no processo do teste (Worker.drain/serve) contra o Supabase local. Cada teste termina
reaplicando o seed, que recomeça o núcleo, esvazia filas e arquivos da fila e as versões de prompt.
"""

import asyncio
import json
import shutil
from collections.abc import AsyncIterator
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import psycopg
import pytest
from psycopg.rows import dict_row

from hellosquad.config import Settings
from hellosquad.llm.simulated import FIXTURES_DIR, SimulatedLLM
from hellosquad.squad.loader import SquadLoader
from hellosquad.squad.store import RunLost, RunStore
from hellosquad.worker.main import Worker

pytestmark = pytest.mark.integration

MARINA = "marina@miolo.example"
SEED_FILE = Path(__file__).resolve().parents[3] / "supabase" / "seed.sql"
COMPLETE_REQUEST = (
    "Otto, preciso de uma legenda para o Instagram sobre o pão de fermentação longa de sábado. "
    "Quero levar clientes à loja de manhã."
)
VAGUE_REQUEST = "Preciso de um texto para divulgar a padaria."


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def rows(conn: psycopg.AsyncConnection, query: str, *params: object) -> list[dict[str, Any]]:
    cursor = conn.cursor(row_factory=dict_row)
    await cursor.execute(query, params)
    return await cursor.fetchall()


async def one(conn: psycopg.AsyncConnection, query: str, *params: object) -> dict[str, Any]:
    [row] = await rows(conn, query, *params)
    return row


async def scalar(conn: psycopg.AsyncConnection, query: str, *params: object) -> Any:
    return next(iter((await one(conn, query, *params)).values()))


@pytest.fixture(autouse=True)
async def seed_state(admin_db: psycopg.AsyncConnection) -> AsyncIterator[None]:
    yield
    await admin_db.execute(SEED_FILE.read_text(encoding="utf-8"))


@pytest.fixture
async def miolo(admin_db: psycopg.AsyncConnection) -> str:
    return str(await scalar(admin_db, "select id from public.workspaces where slug = 'miolo'"))


def worker_settings(**overrides: Any) -> Settings:
    return Settings(llm_provider="simulated", worker_retry_base_seconds=0, **overrides)


async def request_work(api, access_token, miolo: str, body: str) -> dict[str, str]:
    """Marina abre conversa com o Otto, posta o pedido e cria o trabalho 04.01 (run na fila)."""
    headers = bearer(access_token(MARINA))
    conversation = await api.post(
        f"/workspaces/{miolo}/conversations",
        headers=headers,
        json={"kind": "agent_direct", "primary_agent_id": "otto"},
    )
    assert conversation.status_code == 201, conversation.text
    conversation_id = conversation.json()["id"]
    message = await api.post(
        f"/conversations/{conversation_id}/messages", headers=headers, json={"body": body}
    )
    assert message.status_code == 201, message.text
    work = await api.post(
        f"/messages/{message.json()['id']}/work-items",
        headers=headers,
        json={"delivery_type": "04.01", "title": "Legenda do sábado"},
    )
    assert work.status_code == 201, work.text
    return {
        "conversation_id": conversation_id,
        "work_item_id": work.json()["id"],
        "run_id": work.json()["run_id"],
    }


async def drain(settings: Settings, llm=None) -> list[str]:
    async with Worker(settings, llm=llm or SimulatedLLM()) as worker:
        return await worker.drain()


async def event_types(conn: psycopg.AsyncConnection, run_id: str) -> list[str]:
    found = await rows(
        conn, "select type from public.run_events where run_id = %s order by seq", run_id
    )
    return [r["type"] for r in found]


async def steps(conn: psycopg.AsyncConnection, run_id: str) -> list[dict[str, Any]]:
    return await rows(
        conn,
        """
        select seq, kind::text, status::text, model, input_tokens, output_tokens,
               cache_read_tokens, cache_write_tokens, cost_usd, latency_ms, payload
        from public.run_steps where run_id = %s order by seq
        """,
        run_id,
    )


async def queue_state(conn: psycopg.AsyncConnection, run_id: str) -> dict[str, int]:
    return await one(
        conn,
        """
        select
          (select count(*) from pgmq.q_runs_interactive where message->>'run_id' = %s) as queued,
          (select count(*) from pgmq.a_runs_interactive where message->>'run_id' = %s) as archived
        """,
        run_id,
        run_id,
    )


def fixture_output(step: str, case: int = -1) -> dict[str, Any]:
    data = json.loads((FIXTURES_DIR / "04.01" / f"{step}.json").read_text(encoding="utf-8"))
    return data["cases"][case]["output"]


async def test_request_becomes_delivery_in_needs_you_with_events_steps_and_cost(
    api, access_token, admin_db, miolo
) -> None:
    ids = await request_work(api, access_token, miolo, COMPLETE_REQUEST)
    run_id, work_item_id = ids["run_id"], ids["work_item_id"]

    assert await drain(worker_settings()) == ["delivered"]

    run = await one(admin_db, "select * from public.runs where id = %s", run_id)
    otto_version = SquadLoader().prompt("otto", "04.01").content_hash
    assert run["status"] == "succeeded" and run["attempts"] == 1 and run["error"] is None
    assert run["prompt_version"] == otto_version and run["model"] == "claude-opus-5-5"
    # Triagem (Haiku) 1850/210 + produção (Opus) 640/520, 2900 gravados + check 980/150, 2900 lidos.
    assert (run["input_tokens"], run["output_tokens"]) == (3470, 880)
    assert (run["cache_read_tokens"], run["cache_write_tokens"]) == (2900, 2900)
    assert run["cost_usd"] == Decimal("0.037860")  # 0,002900 + 0,027460 + 0,007500

    run_steps = await steps(admin_db, run_id)
    assert [(s["kind"], s["payload"].get("step") or s["payload"]["tool"]) for s in run_steps] == [
        ("llm_call", "nexo.triage"),
        ("tool_call", "squad.delegar"),
        ("llm_call", "otto.produce"),
        ("check", "otto.check"),
        ("tool_call", "entregas.criar_versao"),
    ]
    assert {s["status"] for s in run_steps} == {"succeeded"}
    triage, _, produce, check, create = run_steps
    assert triage["model"] == "claude-haiku-4-5" and triage["cost_usd"] == Decimal("0.002900")
    assert (produce["input_tokens"], produce["cache_write_tokens"]) == (640, 2900)
    assert check["cache_read_tokens"] == 2900 and check["payload"]["approved"] is True
    assert all(s["latency_ms"] is not None for s in (triage, produce, check))
    assert triage["payload"]["prompt_version"] == SquadLoader().prompt("nexo", "01.01").content_hash
    assert produce["payload"]["prompt_version"] == otto_version
    assert create["payload"]["revisions"] == 0 and create["payload"]["check_approved"] is True

    assert await event_types(admin_db, run_id) == [
        "started",
        "agent.thinking",
        "conversation.typing",
        "step.done",
        "agent.thinking",
        "conversation.typing",
        "step.done",
        "agent.thinking",
        "conversation.typing",
        "step.done",
        "delivery.created",
        "message.created",
        "approval.requested",
        "finished",
    ]
    broadcast = await scalar(
        admin_db,
        "select count(*) from realtime.messages "
        "where topic = %s and event = 'run_event' and payload->>'run_id' = %s",
        f"workspace:{miolo}",
        run_id,
    )
    assert broadcast == 14

    version = await one(
        admin_db,
        """
        select v.*, d.kind, d.current_version_id
        from public.delivery_versions v join public.deliveries d on d.id = v.delivery_id
        where d.work_item_id = %s
        """,
        work_item_id,
    )
    produced = fixture_output("otto.produce")
    assert version["content"] == produced["entrega"] and version["kind"] == "caption"
    assert (version["created_by_type"], version["created_by_agent_id"]) == ("agent", "otto")
    assert str(version["run_id"]) == run_id and version["status"] == "draft"
    assert version["current_version_id"] == version["id"] and version["version_no"] == 1
    assert version["change_note"] == "Primeira versão."

    approval = await one(
        admin_db, "select * from public.approvals where work_item_id = %s", work_item_id
    )
    assert (approval["kind"], approval["status"], approval["requested_by_agent_id"]) == (
        "review",
        "pending",
        "otto",
    )
    assert approval["delivery_version_id"] == version["id"] and str(approval["run_id"]) == run_id
    assert await scalar(
        admin_db, "select status::text from public.work_items where id = %s", work_item_id
    ) == ("needs_you")
    work_steps = await rows(
        admin_db,
        "select title, agent_id::text, status::text from public.work_item_steps "
        "where work_item_id = %s order by seq",
        work_item_id,
    )
    assert work_steps == [
        {"title": "Qualificar o pedido", "agent_id": "nexo", "status": "done"},
        {"title": "Escrever o texto", "agent_id": "otto", "status": "done"},
    ]
    transitions = await rows(
        admin_db,
        "select actor_id, payload->>'from' as from_status, payload->>'to' as to_status "
        "from public.audit_events where entity_id = %s and action = 'work_item.status_changed' "
        "order by created_at",
        work_item_id,
    )
    assert [(t["actor_id"], t["from_status"], t["to_status"]) for t in transitions] == [
        ("nexo", "draft", "in_progress"),
        ("otto", "in_progress", "needs_you"),
    ]
    assert await queue_state(admin_db, run_id) == {"queued": 0, "archived": 0}

    # A Marina vê tudo pela API (JWT dela, RLS valendo): mensagem do Otto, entrega e a revisão.
    headers = bearer(access_token(MARINA))
    messages = await api.get(f"/conversations/{ids['conversation_id']}/messages", headers=headers)
    otto_message = messages.json()["items"][-1]
    assert otto_message["author_type"] == "agent" and otto_message["author_agent_id"] == "otto"
    assert otto_message["body"] == produced["mensagem"]
    detail = (await api.get(f"/work-items/{work_item_id}", headers=headers)).json()
    assert detail["status"] == "needs_you"
    assert detail["deliveries"][0]["versions"][0]["content"] == produced["entrega"]
    pending = await api.get(f"/workspaces/{miolo}/approvals?status=pending", headers=headers)
    assert str(approval["id"]) in {a["id"] for a in pending.json()["items"]}

    # Segunda mensagem do mesmo run (entrega repetida da fila): no-op, apagada.
    before = await one(
        admin_db,
        """
        select (select count(*) from public.run_steps where run_id = %s) as steps,
               (select count(*) from public.run_events where run_id = %s) as events,
               (select count(*) from public.messages where run_id = %s) as messages,
               (select count(*) from public.approvals where run_id = %s) as approvals,
               (select count(*) from public.delivery_versions where run_id = %s) as versions
        """,
        *[run_id] * 5,
    )
    await admin_db.execute(
        "select pgmq.send('runs_interactive', %s::jsonb)",
        (json.dumps({"run_id": run_id, "workspace_id": miolo, "kind": "interactive"}),),
    )
    assert await drain(worker_settings()) == ["finished"]
    after = await one(
        admin_db,
        """
        select (select count(*) from public.run_steps where run_id = %s) as steps,
               (select count(*) from public.run_events where run_id = %s) as events,
               (select count(*) from public.messages where run_id = %s) as messages,
               (select count(*) from public.approvals where run_id = %s) as approvals,
               (select count(*) from public.delivery_versions where run_id = %s) as versions
        """,
        *[run_id] * 5,
    )
    assert (
        after == before == {"steps": 5, "events": 11, "messages": 1, "approvals": 1, "versions": 1}
    )
    assert await queue_state(admin_db, run_id) == {"queued": 0, "archived": 0}


async def test_incomplete_briefing_asks_before_calling_otto(
    api, access_token, admin_db, miolo
) -> None:
    ids = await request_work(api, access_token, miolo, VAGUE_REQUEST)
    run_id, work_item_id = ids["run_id"], ids["work_item_id"]

    assert await drain(worker_settings()) == ["asked"]

    approval = await one(
        admin_db, "select * from public.approvals where work_item_id = %s", work_item_id
    )
    assert (approval["kind"], approval["status"], approval["requested_by_agent_id"]) == (
        "respond",
        "pending",
        "nexo",
    )
    assert approval["delivery_version_id"] is None and str(approval["run_id"]) == run_id
    question = await one(
        admin_db,
        "select author_type::text, author_agent_id::text, body from public.messages "
        "where run_id = %s",
        run_id,
    )
    assert question == {
        "author_type": "agent",
        "author_agent_id": "nexo",
        "body": fixture_output("nexo.triage", 0)["pergunta"],
    }
    assert await scalar(
        admin_db, "select status::text from public.work_items where id = %s", work_item_id
    ) == ("needs_you")
    assert await scalar(
        admin_db, "select count(*) from public.deliveries where work_item_id = %s", work_item_id
    ) == (0)
    run = await one(admin_db, "select * from public.runs where id = %s", run_id)
    assert run["status"] == "succeeded" and run["prompt_version"] is None
    assert run["model"] == "claude-haiku-4-5" and run["cost_usd"] == Decimal("0.002280")
    run_steps = await steps(admin_db, run_id)
    assert [(s["kind"], s["payload"].get("step") or s["payload"]["tool"]) for s in run_steps] == [
        ("llm_call", "nexo.triage"),
        ("tool_call", "conversas.perguntar"),
    ]
    assert run_steps[1]["payload"]["faltam"] == ["canal", "objetivo"]
    assert await event_types(admin_db, run_id) == [
        "started",
        "agent.thinking",
        "conversation.typing",
        "step.done",
        "message.created",
        "approval.requested",
        "finished",
    ]


async def test_provider_failure_retries_then_fails_run_and_work(
    api, access_token, admin_db, miolo
) -> None:
    ids = await request_work(api, access_token, miolo, COMPLETE_REQUEST)
    run_id, work_item_id = ids["run_id"], ids["work_item_id"]
    failing = SimulatedLLM(fail_steps={"otto.produce": "unavailable"})

    assert await drain(worker_settings(worker_max_attempts=2), failing) == ["retry", "failed"]

    run = await one(admin_db, "select * from public.runs where id = %s", run_id)
    assert run["status"] == "failed" and run["attempts"] == 2 and run["finished_at"] is not None
    assert run["error"]["code"] == "llm_unavailable" and run["error"]["attempts"] == 2
    assert run["error"]["message"] == (
        "O provedor de IA não respondeu depois de 2 tentativas. Tente de novo em alguns minutos."
    )
    assert run["error"]["details"]["step"] == "otto.produce"
    assert run["cost_usd"] == Decimal("0.005800")  # as duas triagens foram gastas de verdade
    assert await scalar(
        admin_db, "select status::text from public.work_items where id = %s", work_item_id
    ) == ("failed")
    work_steps = await rows(
        admin_db,
        "select title, status::text from public.work_item_steps where work_item_id = %s "
        "order by seq",
        work_item_id,
    )
    assert work_steps == [
        {"title": "Qualificar o pedido", "status": "done"},
        {"title": "Escrever o texto", "status": "failed"},
    ]
    produce = [
        s for s in await steps(admin_db, run_id) if s["payload"].get("step") == "otto.produce"
    ]
    assert [s["status"] for s in produce] == ["failed", "failed"]
    assert produce[0]["payload"]["error"]["code"] == "llm_unavailable"
    events = await event_types(admin_db, run_id)
    assert events.count("started") == 2 and events[-1] == "failed"
    assert await queue_state(admin_db, run_id) == {"queued": 0, "archived": 1}
    assert await scalar(
        admin_db, "select count(*) from public.approvals where work_item_id = %s", work_item_id
    ) == (0)


@pytest.mark.parametrize(
    ("revised_is_clean", "approved"),
    [(True, True), (False, False)],
    ids=["revisao-aprovada", "revisao-ainda-reprovada"],
)
async def test_check_rejection_allows_a_single_revision(
    api, access_token, admin_db, miolo, tmp_path: Path, revised_is_clean: bool, approved: bool
) -> None:
    fixtures = tmp_path / "fixtures"
    shutil.copytree(FIXTURES_DIR, fixtures)
    for step in ("otto.produce",) if revised_is_clean else ("otto.produce", "otto.revise"):
        path = fixtures / "04.01" / f"{step}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        version = data["cases"][-1]["output"]["entrega"]["versoes"][0]
        version["texto"] = version["texto"].replace("fermentação longa", "pão artesanal")
        path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    ids = await request_work(api, access_token, miolo, COMPLETE_REQUEST)

    assert await drain(worker_settings(), SimulatedLLM(fixtures)) == ["delivered"]

    run_steps = await steps(admin_db, ids["run_id"])
    assert [(s["kind"], s["payload"].get("step") or s["payload"]["tool"]) for s in run_steps] == [
        ("llm_call", "nexo.triage"),
        ("tool_call", "squad.delegar"),
        ("llm_call", "otto.produce"),
        ("check", "otto.check"),
        ("llm_call", "otto.revise"),
        ("check", "otto.check"),
        ("tool_call", "entregas.criar_versao"),
    ]
    assert run_steps[3]["payload"]["approved"] is False
    assert run_steps[5]["payload"]["approved"] is approved
    assert run_steps[6]["payload"]["revisions"] == 1
    assert run_steps[6]["payload"]["check_approved"] is approved
    version = await one(
        admin_db,
        "select content, change_note from public.delivery_versions where run_id = %s",
        ids["run_id"],
    )
    assert version["change_note"] == "Primeira versão, revisada na autoverificação."
    assert ("artesanal" not in json.dumps(version["content"], ensure_ascii=False)) is approved


async def test_workspace_cap_and_stale_runs_on_dequeue(admin_db, miolo) -> None:
    vitta = str(await scalar(admin_db, "select id from public.workspaces where slug = 'vitta'"))

    async def new_run(workspace: str, status: str, *, stale: bool = False) -> UUID:
        item = await scalar(
            admin_db,
            "insert into public.work_items (workspace_id, title, delivery_type, primary_agent_id) "
            "values (%s, 'Teste do teto', '04.01', 'otto') returning id",
            workspace,
        )
        return await scalar(
            admin_db,
            """
            insert into public.runs (
              workspace_id, work_item_id, agent_id, status, idempotency_key, updated_at
            ) values (%s, %s, 'otto', %s, %s, now() - case when %s then interval '1 hour' else
              interval '0' end)
            returning id
            """,
            workspace,
            item,
            status,
            str(uuid4()),
            stale,
        )

    settings = worker_settings()
    async with Worker(settings, llm=SimulatedLLM()) as worker:

        async def claim(workspace: str, run_id: UUID) -> str:
            store = RunStore(worker.pool, workspace_id=UUID(workspace), run_id=run_id)
            result = await store.begin(workspace_cap=3, lease_seconds=120, max_attempts=3)
            return result.outcome

        running = [await new_run(miolo, "running") for _ in range(3)]
        waiting = await new_run(miolo, "queued")
        assert await claim(miolo, waiting) == "capped"
        assert await claim(miolo, running[0]) == "busy"
        assert await claim(vitta, await new_run(vitta, "queued")) == "claimed"
        assert await claim(vitta, waiting) == "missing"  # workspace_id explícito: run da Miolo

        await admin_db.execute(
            "update public.runs set status = 'succeeded' where id = %s", (running[0],)
        )
        assert await claim(miolo, running[0]) == "finished"
        assert await claim(miolo, waiting) == "claimed"
        assert await claim(miolo, await new_run(miolo, "queued")) == "capped"
        # Run em running sem batimento há mais que o lease: o worker dele morreu; outro retoma.
        assert await claim(vitta, await new_run(vitta, "running", stale=True)) == "claimed"


class BlockingLLM(SimulatedLLM):
    """Simulado que trava na produção do Otto até o teste encerrar o worker."""

    def __init__(self) -> None:
        super().__init__()
        self.reached = asyncio.Event()

    async def complete(self, **kwargs: Any):
        if kwargs["tag"].step == "otto.produce":
            self.reached.set()
            await asyncio.Event().wait()
        return await super().complete(**kwargs)


async def test_shutdown_returns_unfinished_run_to_the_queue(
    api, access_token, admin_db, miolo
) -> None:
    ids = await request_work(api, access_token, miolo, COMPLETE_REQUEST)
    run_id = ids["run_id"]
    llm = BlockingLLM()

    async with Worker(worker_settings(worker_shutdown_grace_seconds=0.2), llm=llm) as worker:
        serving = asyncio.create_task(worker.serve(handle_signals=False))
        await asyncio.wait_for(llm.reached.wait(), timeout=10)
        worker.stop()
        await asyncio.wait_for(serving, timeout=10)

    run = await one(
        admin_db, "select status::text, attempts from public.runs where id = %s", run_id
    )
    assert run == {"status": "queued", "attempts": 0}
    visible = await scalar(
        admin_db,
        "select count(*) from pgmq.q_runs_interactive where message->>'run_id' = %s "
        "and vt <= clock_timestamp()",
        run_id,
    )
    assert visible == 1

    assert await drain(worker_settings()) == ["delivered"]
    run = await one(
        admin_db, "select status::text, attempts from public.runs where id = %s", run_id
    )
    assert run == {"status": "succeeded", "attempts": 1}


async def test_attempt_limit_holds_even_when_workers_die_mid_run(admin_db, miolo) -> None:
    # Duas tentativas já gastas por workers que morreram: run em running sem batimento há 1 hora.
    work_item_id = await scalar(
        admin_db,
        "insert into public.work_items "
        "(workspace_id, title, delivery_type, primary_agent_id, status) "
        "values (%s, 'Legenda do sábado', '04.01', 'otto', 'in_progress') returning id",
        miolo,
    )
    run_id = str(
        await scalar(
            admin_db,
            """
            insert into public.runs (
              workspace_id, work_item_id, agent_id, status, attempts, idempotency_key, updated_at
            ) values (%s, %s, 'otto', 'running', 2, %s, now() - interval '1 hour')
            returning id
            """,
            miolo,
            work_item_id,
            str(uuid4()),
        )
    )
    await admin_db.execute(
        "select pgmq.send('runs_interactive', %s::jsonb)",
        (json.dumps({"run_id": run_id, "workspace_id": miolo, "kind": "interactive"}),),
    )

    assert await drain(worker_settings(worker_max_attempts=2)) == ["failed"]

    run = await one(admin_db, "select status::text, error from public.runs where id = %s", run_id)
    assert run["status"] == "failed" and run["error"]["code"] == "attempts_exhausted"
    assert run["error"]["message"] == "O trabalho não terminou depois de 2 tentativas."
    assert await scalar(
        admin_db, "select status::text from public.work_items where id = %s", work_item_id
    ) == ("failed")
    assert await queue_state(admin_db, run_id) == {"queued": 0, "archived": 1}


async def test_run_taken_over_by_another_worker_cannot_finish_twice(
    api, access_token, admin_db, miolo
) -> None:
    ids = await request_work(api, access_token, miolo, COMPLETE_REQUEST)
    async with Worker(worker_settings(), llm=SimulatedLLM()) as worker:
        store = RunStore(worker.pool, workspace_id=UUID(miolo), run_id=UUID(ids["run_id"]))
        claim = await store.begin(workspace_cap=3, lease_seconds=120, max_attempts=3)
        assert (claim.outcome, claim.attempts) == ("claimed", 1)
        # Outro worker retomou o run (nova tentativa): a ficha deste não vale mais.
        await admin_db.execute(
            "update public.runs set attempts = 2 where id = %s", (ids["run_id"],)
        )
        await store.retry_later({"code": "llm_unavailable"})
        with pytest.raises(RunLost):
            await store.fail({"code": "llm_unavailable"}, work_item_id=UUID(ids["work_item_id"]))
    run = await one(
        admin_db,
        "select status::text, attempts, error from public.runs where id = %s",
        ids["run_id"],
    )
    assert run == {"status": "running", "attempts": 2, "error": None}


async def decide(api, access_token, approval_id: str, body: dict[str, Any]):
    return await api.post(
        f"/approvals/{approval_id}/decision", headers=bearer(access_token(MARINA)), json=body
    )


async def pending_review(admin_db, work_item_id: str) -> str:
    return str(
        await scalar(
            admin_db,
            "select id from public.approvals where work_item_id = %s and status = 'pending'",
            work_item_id,
        )
    )


async def test_rejection_and_adjustment_send_the_work_back_to_otto(
    api, access_token, admin_db, miolo
) -> None:
    ids = await request_work(api, access_token, miolo, COMPLETE_REQUEST)
    work_item_id = ids["work_item_id"]
    assert await drain(worker_settings()) == ["delivered"]

    first_review = await pending_review(admin_db, work_item_id)
    missing = await decide(api, access_token, first_review, {"decision": "rejected"})
    assert missing.status_code == 422
    assert missing.json()["error"]["message"] == (
        "Ao rejeitar, escolha cancelar o trabalho ou pedir nova proposta."
    )

    # Rejeitar e pedir nova proposta: o trabalho volta ao Otto, que entrega a v2.
    rejected = await decide(
        api,
        access_token,
        first_review,
        {
            "decision": "rejected",
            "follow_up": "revise",
            "note": "Quero o sábado na primeira linha.",
        },
    )
    assert rejected.status_code == 200 and rejected.json()["follow_up"] == "revise"
    assert rejected.json()["work_item"]["status"] == "in_progress"
    rerun = await one(
        admin_db,
        "select id, agent_id::text, status::text from public.runs where idempotency_key = %s",
        f"approval:{first_review}",
    )
    assert (rerun["agent_id"], rerun["status"]) == ("otto", "queued")
    assert await queue_state(admin_db, str(rerun["id"])) == {"queued": 1, "archived": 0}

    assert await drain(worker_settings()) == ["delivered"]

    versions = await rows(
        admin_db,
        """
        select v.version_no, v.change_note, v.content, v.status::text
        from public.delivery_versions v join public.deliveries d on d.id = v.delivery_id
        where d.work_item_id = %s order by v.version_no
        """,
        work_item_id,
    )
    assert [(v["version_no"], v["change_note"]) for v in versions] == [
        (1, "Primeira versão."),
        (2, "Nova proposta depois da sua rejeição."),
    ]
    assert versions[1]["content"] == fixture_output("otto.produce", 0)["entrega"]
    produce = next(
        s
        for s in await steps(admin_db, str(rerun["id"]))
        if s["payload"].get("step") == "otto.produce"
    )
    assert produce["payload"]["simulated"]["case"] == "nova_versao_com_retorno"
    second_review = await pending_review(admin_db, work_item_id)
    assert second_review != first_review
    assert await scalar(
        admin_db, "select status::text from public.work_items where id = %s", work_item_id
    ) == ("needs_you")

    # Pedir ajuste: mais uma volta, v3 com a nota do ajuste.
    adjusted = await decide(
        api,
        access_token,
        second_review,
        {"decision": "changes_requested", "note": "Deixe a fornada da manhã mais visível."},
    )
    assert adjusted.status_code == 200 and adjusted.json()["work_item"]["status"] == "in_progress"
    assert await drain(worker_settings()) == ["delivered"]
    assert await scalar(
        admin_db,
        """
        select v.change_note from public.delivery_versions v
        join public.deliveries d on d.id = v.delivery_id
        where d.work_item_id = %s and v.version_no = 3
        """,
        work_item_id,
    ) == ("Nova versão com o ajuste que você pediu.")

    # Rejeitar e cancelar: trabalho cancelado, nenhum run novo.
    third_review = await pending_review(admin_db, work_item_id)
    runs_before = await scalar(
        admin_db, "select count(*) from public.runs where work_item_id = %s", work_item_id
    )
    cancelled = await decide(
        api, access_token, third_review, {"decision": "rejected", "follow_up": "cancel"}
    )
    assert cancelled.status_code == 200 and cancelled.json()["work_item"]["status"] == "cancelled"
    assert await scalar(
        admin_db, "select count(*) from public.runs where work_item_id = %s", work_item_id
    ) == (runs_before)
    assert await drain(worker_settings()) == []


async def test_answer_to_the_question_resumes_the_work(api, access_token, admin_db, miolo) -> None:
    ids = await request_work(api, access_token, miolo, VAGUE_REQUEST)
    assert await drain(worker_settings()) == ["asked"]
    question = await pending_review(admin_db, ids["work_item_id"])

    answered = await decide(
        api,
        access_token,
        question,
        {
            "decision": "answered",
            "note": "É para o Instagram, para levar clientes à loja no sábado de manhã.",
        },
    )
    assert answered.status_code == 200 and answered.json()["work_item"]["status"] == "in_progress"
    assert await drain(worker_settings()) == ["delivered"]

    rerun = await one(
        admin_db,
        "select id, status::text from public.runs where idempotency_key = %s",
        f"approval:{question}",
    )
    assert rerun["status"] == "succeeded"
    triage = (await steps(admin_db, str(rerun["id"])))[0]
    assert triage["payload"]["simulated"]["case"] == "briefing_completo"
    version = await one(
        admin_db,
        """
        select v.version_no, v.change_note from public.delivery_versions v
        join public.deliveries d on d.id = v.delivery_id where d.work_item_id = %s
        """,
        ids["work_item_id"],
    )
    assert version == {"version_no": 1, "change_note": "Primeira versão."}
    assert await scalar(
        admin_db,
        "select kind::text from public.approvals where work_item_id = %s and status = 'pending'",
        ids["work_item_id"],
    ) == ("review")
