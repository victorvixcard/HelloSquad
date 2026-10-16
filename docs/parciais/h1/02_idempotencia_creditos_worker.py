"""H1 alvos 2, 6 e 7: idempotência (decidir 2x, run 2x, retry, reenfileirar), créditos e worker.

Ataca a API no ar (8100) com tokens reais da Auth local e roda o worker do produto no processo, com o LLM
simulado do próprio produto (fail_steps para falha passageira/definitiva; um invólucro lento só para
segurar o run em execução). Nada de código de produto é alterado. Começa e termina reaplicando o seed.
Uso (na raiz, sob a trava do banco):
  flock -w 1800 /tmp/hellosquad-db.lock bash -c 'cd apps/backend && uv run python ../../docs/parciais/h1/02_idempotencia_creditos_worker.py'
"""

import asyncio
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import httpx
import psycopg
from psycopg.rows import dict_row

from hellosquad.config import Settings
from hellosquad.llm.simulated import SimulatedLLM
from hellosquad.worker.main import Worker

ROOT = Path("/home/vitao/projetos/hellosquad")
ENV = dict(
    line.split("=", 1) for line in (ROOT / ".env").read_text().splitlines() if "=" in line and not line.startswith("#")
)
SUPA = ENV["SUPABASE_URL"]
PK = ENV["SUPABASE_PUBLISHABLE_KEY"]
API = "http://127.0.0.1:8100"
PASS = "Senha!Teste123"
SEED = (ROOT / "supabase" / "seed.sql").read_text(encoding="utf-8")
RESULTS: list[tuple[str, bool, str]] = []
COMPLETE = "Otto, preciso de uma legenda para o Instagram sobre o pão de centeio. Quero levar clientes à loja."
VAGUE = "Preciso de um texto para divulgar a padaria."


def report(name: str, ok: bool, detail: str) -> None:
    RESULTS.append((name, ok, detail))
    print(f"{'OK   ' if ok else 'FALHA'} {name}: {detail}", flush=True)


class SlowLLM(SimulatedLLM):
    """O simulado do produto, com espera antes de cada chamada (só para ver o run em execução)."""

    def __init__(self, delay: float, **kw: Any) -> None:
        super().__init__(**kw)
        self.delay = delay

    async def complete(self, *args: Any, **kwargs: Any):  # type: ignore[override]
        await asyncio.sleep(self.delay)
        return await super().complete(*args, **kwargs)


def settings(**over: Any) -> Settings:
    base = {"llm_provider": "simulated", "worker_retry_base_seconds": 0}
    base.update(over)
    return Settings(**base)


async def drain(llm=None, max_rounds: int = 100, **over: Any) -> list[str]:
    async with Worker(settings(**over), llm=llm or SimulatedLLM()) as w:
        return await w.drain(max_rounds=max_rounds)


class Ctx:
    def __init__(self) -> None:
        self.http = httpx.AsyncClient(timeout=30)
        self.tokens: dict[str, str] = {}
        self.db: psycopg.AsyncConnection

    async def open(self) -> None:
        self.db = await psycopg.AsyncConnection.connect(ENV["DATABASE_URL"], autocommit=True)

    async def q(self, sql: str, *params: Any) -> list[dict[str, Any]]:
        cur = self.db.cursor(row_factory=dict_row)
        await cur.execute(sql, params)
        return await cur.fetchall() if cur.description else []

    async def v(self, sql: str, *params: Any) -> Any:
        rows = await self.q(sql, *params)
        return next(iter(rows[0].values())) if rows else None

    async def seed(self) -> None:
        await self.db.execute(SEED)

    async def token(self, email: str) -> str:
        if email not in self.tokens:
            r = await self.http.post(
                f"{SUPA}/auth/v1/token?grant_type=password",
                headers={"apikey": PK},
                json={"email": email, "password": PASS},
            )
            self.tokens[email] = r.json()["access_token"]
        return self.tokens[email]

    async def api(self, method: str, path: str, email: str | None, body: Any = None) -> tuple[int, Any]:
        headers = {"Authorization": f"Bearer {await self.token(email)}"} if email else {}
        r = await self.http.request(method, f"{API}{path}", headers=headers, json=body)
        try:
            return r.status_code, r.json()
        except ValueError:
            return r.status_code, r.text

    async def ws(self, slug: str) -> str:
        return str(await self.v("select id from public.workspaces where slug = %s", slug))

    async def request_work(self, email: str, slug: str, body: str = COMPLETE) -> dict[str, str]:
        ws = await self.ws(slug)
        c, conv = await self.api("POST", f"/workspaces/{ws}/conversations", email,
                                 {"kind": "agent_direct", "primary_agent_id": "otto"})
        assert c == 201, (c, conv)
        c, msg = await self.api("POST", f"/conversations/{conv['id']}/messages", email, {"body": body})
        assert c == 201, (c, msg)
        c, work = await self.api("POST", f"/messages/{msg['id']}/work-items", email,
                                 {"delivery_type": "04.01", "title": "Legenda H1"})
        assert c == 201, (c, work)
        return {"ws": ws, "conv": conv["id"], "work": work["id"], "run": work["run_id"]}

    async def balance(self, ws: str) -> float:
        return float(await self.v("select app.credit_balance(%s)", ws))

    async def ledger(self, work: str) -> dict[str, int]:
        rows = await self.q(
            "select l.entry_type::text t, count(*) n, sum(l.amount) a from public.credit_ledger l "
            "join public.runs r on r.id = l.run_id where r.work_item_id = %s group by 1", work)
        return {r["t"]: (int(r["n"]), float(r["a"])) for r in rows}

    async def versions(self, work: str) -> int:
        return int(await self.v(
            "select count(*) from public.delivery_versions v join public.deliveries d on d.id = v.delivery_id "
            "where d.work_item_id = %s", work))

    async def pending(self, work: str, kind: str = "review") -> str | None:
        return await self.v(
            "select id::text from public.approvals where work_item_id = %s and status = 'pending' and kind = %s "
            "order by created_at desc limit 1", work, kind)

    async def queue_len(self) -> int:
        return int(await self.v("select count(*) from pgmq.q_runs_interactive"))


async def t1_decide_concurrently(x: Ctx) -> None:
    w = await x.request_work("marina@miolo.example", "miolo")
    await drain()
    ap = await x.pending(w["work"])
    bodies = ([{"decision": "approved"}] * 5 + [{"decision": "changes_requested", "note": "Mais curto."}] * 4
              + [{"decision": "rejected", "follow_up": "revise"}] * 3)
    res = await asyncio.gather(*(x.api("POST", f"/approvals/{ap}/decision", "marina@miolo.example", b) for b in bodies))
    codes = sorted({c for c, _ in res})
    finals = {(b.get("decision"), b.get("follow_up")) for c, b in res if c == 200}
    row = (await x.q("select decision::text, follow_up from public.approvals where id = %s", ap))[0]
    audits = await x.v("select count(*) from public.audit_events where entity_id = %s and action = 'approval.decided'", ap)
    runs = await x.v("select count(*) from public.runs where work_item_id = %s", w["work"])
    expected_runs = 1 if row["decision"] == "approved" else 2
    ok = codes == [200] and len(finals) == 1 and audits == 1 and runs == expected_runs
    report("T1 decidir 12x em paralelo (3 decisões diferentes)", ok,
           f"códigos={codes}; respostas iguais={len(finals) == 1} {finals}; gravada={row}; auditoria={audits}; runs={runs} (esperado {expected_runs})")
    # A mesma rota depois: repetir com outra decisão devolve 200 e o mesmo estado.
    c, b = await x.api("POST", f"/approvals/{ap}/decision", "marina@miolo.example", {"decision": "rejected", "follow_up": "cancel"})
    st = await x.v("select status::text from public.work_items where id = %s", w["work"])
    report("T1b repetir com decisão diferente depois", c == 200 and b.get("decision") == row["decision"] and st != "cancelled",
           f"HTTP {c}, decisão devolvida={b.get('decision')}, trabalho={st}")
    await drain()  # processa o run do ajuste, se houver


async def t2_run_twice(x: Ctx) -> None:
    w = await x.request_work("marina@miolo.example", "miolo")
    await x.q("select app.enqueue_run(%s)", w["run"])
    await x.q("select app.enqueue_run(%s)", w["run"])
    qn = await x.queue_len()
    b0 = await x.balance(w["ws"])
    outs = await asyncio.gather(drain(worker_visibility_timeout_seconds=3), drain(worker_visibility_timeout_seconds=3))
    await asyncio.sleep(3.5)
    outs2 = await drain(worker_visibility_timeout_seconds=3)
    run = (await x.q("select status::text, attempts, credits_charged from public.runs where id = %s", w["run"]))[0]
    led = await x.ledger(w["work"])
    vers = await x.versions(w["work"])
    ok = vers == 1 and led.get("capture", (0,))[0] == 1 and run["attempts"] == 1 and await x.queue_len() == 0
    report("T2 mesmo run 3x na fila, 2 workers ao mesmo tempo", ok,
           f"mensagens={qn}; saídas={outs}+{outs2}; run={run}; extrato={led}; versões={vers}; fila depois={await x.queue_len()}; saldo {b0}->{await x.balance(w['ws'])}")


async def t3_retry_then_success(x: Ctx) -> dict[str, str]:
    w = await x.request_work("marina@miolo.example", "miolo")
    b0 = await x.balance(w["ws"])
    o1 = await drain(SimulatedLLM(fail_steps={"otto.check": "unavailable"}), max_rounds=1)
    mid = (await x.q("select status::text, attempts from public.runs where id = %s", w["run"]))[0]
    hold_mid = await x.q("select state::text, estimate from public.credit_holds where run_id = %s", w["run"])
    o2 = await drain()
    run = (await x.q("select status::text, attempts, credits_charged from public.runs where id = %s", w["run"]))[0]
    led = await x.ledger(w["work"])
    holds = await x.v("select count(*) from public.credit_holds where run_id = %s", w["run"])
    ok = (mid["status"] == "queued" and run["status"] == "succeeded" and run["attempts"] == 2 and holds == 1
          and led.get("hold", (0,))[0] == 1 and led.get("capture", (0,))[0] == 1 and await x.versions(w["work"]) == 1)
    report("T3 falha passageira depois de produzir, retry e sucesso", ok,
           f"{o1}->{mid} reserva no meio={hold_mid}; {o2}->{run}; reservas={holds}; extrato={led}; saldo {b0}->{await x.balance(w['ws'])}")
    return w


async def t4_requeue_after_success(x: Ctx, w: dict[str, str]) -> None:
    led0 = await x.ledger(w["work"])
    await x.q("select app.enqueue_run(%s)", w["run"])
    o = await drain()
    led1 = await x.ledger(w["work"])
    ok = o == ["finished"] and led0 == led1 and await x.versions(w["work"]) == 1 and await x.queue_len() == 0
    report("T4 reenfileirar run concluído", ok, f"saída={o}; extrato antes={led0} depois={led1}; versões={await x.versions(w['work'])}")


async def t5_failure_releases(x: Ctx) -> None:
    w = await x.request_work("marina@miolo.example", "miolo")
    b0 = await x.balance(w["ws"])
    o = await drain(SimulatedLLM(fail_steps={"otto.produce": "refusal"}))
    run = (await x.q("select status::text, attempts, credits_charged, error->>'code' code from public.runs where id = %s", w["run"]))[0]
    st = await x.v("select status::text from public.work_items where id = %s", w["work"])
    led = await x.ledger(w["work"])
    hold = await x.q("select state::text from public.credit_holds where run_id = %s", w["run"])
    res = await x.q("select reserved from public.credit_grants g join public.credit_accounts a on a.id = g.account_id where a.workspace_id = %s", w["ws"])
    ok = run["status"] == "failed" and st == "failed" and "capture" not in led and abs(await x.balance(w["ws"]) - b0) < 1e-9 \
        and all(float(r["reserved"]) == 0 for r in res)
    report("T5 falha definitiva libera a reserva", ok, f"{o}; run={run}; trabalho={st}; reserva={hold}; extrato={led}; saldo {b0}->{await x.balance(w['ws'])}; reservado nos grants={[float(r['reserved']) for r in res]}")
    w2 = await x.request_work("marina@miolo.example", "miolo")
    o = await drain(SimulatedLLM(fail_steps={"otto.produce": "unavailable"}))
    run = (await x.q("select status::text, attempts from public.runs where id = %s", w2["run"]))[0]
    led = await x.ledger(w2["work"])
    report("T5b falha passageira esgota tentativas e libera", run["status"] == "failed" and "capture" not in led and run["attempts"] == 3,
           f"{o}; run={run}; extrato={led}; saldo={await x.balance(w2['ws'])}")


async def t6_respond_does_not_charge(x: Ctx) -> None:
    w = await x.request_work("marina@miolo.example", "miolo", VAGUE)
    b0 = await x.balance(w["ws"])
    o = await drain()
    ap = await x.pending(w["work"], "respond")
    led = await x.ledger(w["work"])
    b1 = await x.balance(w["ws"])
    c, _ = await x.api("POST", f"/approvals/{ap}/decision", "marina@miolo.example", {"decision": "answered", "note": "É para o Instagram, no sábado."})
    o2 = await drain()
    led2 = await x.ledger(w["work"])
    b2 = await x.balance(w["ws"])
    est_c, est = await x.api("POST", "/credits/estimate", "marina@miolo.example", {"workspace_id": w["ws"], "delivery_type": "04.01"})
    ok = ap is not None and "capture" not in led and b1 == b0 and c == 200 and led2.get("capture", (0,))[0] == 1 and round(b0 - b2, 2) == est["credits"]
    report("T6 pergunta (respond) não cobra; a resposta gera a entrega cobrada uma vez", ok,
           f"{o}->{o2}; pendência respond={bool(ap)}; extrato após a pergunta={led}; após a entrega={led2}; saldo {b0}->{b1}->{b2}; estimativa={est.get('credits')} revisão={est.get('revision')}")


async def t7_estimate_equals_charge_revision(x: Ctx) -> None:
    w = await x.request_work("marina@miolo.example", "miolo")
    _, e1 = await x.api("POST", "/credits/estimate", "marina@miolo.example", {"workspace_id": w["ws"], "delivery_type": "04.01"})
    await drain()
    ap = await x.pending(w["work"])
    _, e2 = await x.api("POST", "/credits/estimate", "marina@miolo.example", {"workspace_id": w["ws"], "delivery_type": "04.01", "work_item_id": w["work"]})
    await x.api("POST", f"/approvals/{ap}/decision", "marina@miolo.example", {"decision": "changes_requested", "note": "Mais curto."})
    await drain()
    charged = [float(r["credits_charged"]) for r in await x.q("select credits_charged from public.runs where work_item_id = %s order by created_at", w["work"])]
    ok = charged == [e1["credits"], e2["credits"]] and e2["revision"] is True
    report("T7 estimativa = cobrado (primeira versão e ajuste)", ok, f"estimativas={e1['credits']}/{e2['credits']} (revisão={e2['revision']}); cobrado por run={charged}")


async def t8_never_negative(x: Ctx) -> None:
    ws = await x.ws("vitta")
    b0 = await x.balance(ws)
    works = [await x.request_work("rafael@vitta.example", "vitta") for _ in range(5)]
    outs = await asyncio.gather(drain(worker_concurrency=4), drain(worker_concurrency=4))
    g = (await x.q("select min(remaining) mr, min(remaining - reserved) ma, sum(reserved) sr from public.credit_grants g join public.credit_accounts a on a.id = g.account_id where a.workspace_id = %s", ws))[0]
    st = [await x.v("select status::text from public.runs where id = %s", w["run"]) for w in works]
    codes = [await x.v("select error->>'code' from public.runs where id = %s", w["run"]) for w in works]
    b1 = await x.balance(ws)
    ok = b1 >= 0 and float(g["mr"]) >= 0 and float(g["ma"]) >= 0 and float(g["sr"]) == 0 and st.count("succeeded") == int(b0 // 10)
    report("T8 saldo nunca negativo (Vitta 20 créditos, 5 pedidos, 2 workers)", ok,
           f"saldo {b0}->{b1}; runs={st}; erros={codes}; grants: menor restante={g['mr']}, menor disponível={g['ma']}, reservado={g['sr']}; saídas={outs}")


async def t9_ledger_immutable(x: Ctx) -> None:
    lid = await x.v("select id::text from public.credit_ledger limit 1")
    out = []
    for sql in ("update public.credit_ledger set amount = amount where id = %s",
                "delete from public.credit_ledger where id = %s"):
        try:
            await x.q(sql, lid)
            out.append(f"postgres {sql.split()[0]}: PASSOU")
        except psycopg.Error as e:
            out.append(f"postgres {sql.split()[0]}: recusado ({e.sqlstate})")
    try:
        async with x.db.transaction():
            await x.db.execute("truncate public.credit_ledger cascade")
            n = await x.v("select count(*) from public.credit_ledger")
            out.append(f"postgres TRUNCATE: PASSOU (linhas={n}, desfeito com rollback)")
            raise RuntimeError("rollback")
    except RuntimeError:
        pass
    except psycopg.Error as e:
        out.append(f"postgres TRUNCATE: recusado ({e.sqlstate})")
    api = await psycopg.AsyncConnection.connect(ENV["API_DATABASE_URL"], autocommit=True)
    for sql in ("update public.credit_ledger set amount = 0 where id = %s", "delete from public.credit_ledger where id = %s",
                "truncate public.credit_ledger", "insert into public.credit_ledger (workspace_id) values (%s)"):
        try:
            await api.execute(sql, (lid,) if "%s" in sql else None)
            out.append(f"hellosquad_api {sql.split()[0]}: PASSOU")
        except psycopg.Error as e:
            out.append(f"hellosquad_api {sql.split()[0]}: recusado ({e.sqlstate})")
    await api.close()
    tok = await x.token("marina@miolo.example")
    async with httpx.AsyncClient() as h:
        for m in ("PATCH", "DELETE"):
            r = await h.request(m, f"{SUPA}/rest/v1/credit_ledger?id=eq.{lid}", headers={"apikey": PK, "Authorization": f"Bearer {tok}", "Content-Type": "application/json"}, json={"amount": 0} if m == "PATCH" else None)
            out.append(f"Data API {m}: HTTP {r.status_code}")
    still = await x.v("select count(*) from public.credit_ledger where id = %s", lid)
    ok = still == 1 and not any("PASSOU" in o and "TRUNCATE" not in o for o in out)
    report("T9 extrato imutável", ok, "; ".join(out))


async def t10_not_now(x: Ctx) -> None:
    ws = await x.ws("miolo")
    work = await x.v("select id::text from public.work_items where workspace_id = %s order by created_at limit 1", ws)
    st0 = await x.v("select status::text from public.work_items where id = %s", work)
    ap = await x.v("insert into public.approvals (workspace_id, work_item_id, kind, requested_by_agent_id) values (%s, %s, 'authorize', 'otto') returning id::text", ws, work)
    led0 = await x.v("select count(*) from public.credit_ledger where workspace_id = %s", ws)
    runs0 = await x.v("select count(*) from public.runs where workspace_id = %s", ws)
    c1, b1 = await x.api("POST", f"/approvals/{ap}/defer", "marina@miolo.example", {})
    c2, b2 = await x.api("POST", f"/approvals/{ap}/defer", "marina@miolo.example", {})
    row = (await x.q("select status::text, decision::text, deferred_at is not null d from public.approvals where id = %s", ap))[0]
    _, lst = await x.api("GET", f"/workspaces/{ws}/approvals?status=pending", "marina@miolo.example")
    listed = any(i["id"] == ap for i in lst["items"])
    c3, _ = await x.api("POST", f"/approvals/{ap}/defer", "rafael@vitta.example", {})
    rev = await x.pending(await x.v("select work_item_id::text from public.approvals where kind = 'review' and status = 'pending' and workspace_id = %s limit 1", ws))
    c4, b4 = await x.api("POST", f"/approvals/{rev}/defer", "marina@miolo.example", {}) if rev else (None, None)
    st1 = await x.v("select status::text from public.work_items where id = %s", work)
    led1 = await x.v("select count(*) from public.credit_ledger where workspace_id = %s", ws)
    runs1 = await x.v("select count(*) from public.runs where workspace_id = %s", ws)
    ok = c1 == 200 and c2 == 200 and row["status"] == "pending" and row["decision"] is None and row["d"] and not listed \
        and c3 == 404 and c4 == 422 and st0 == st1 and led0 == led1 and runs0 == runs1
    report('T10 "Agora não" não cobra nem rejeita', ok,
           f"defer={c1}/{c2}; aprovação={row}; na faixa pendente={listed}; Rafael={c3}; defer de review={c4} {str(b4)[:80]}; trabalho {st0}->{st1}; extrato {led0}->{led1}; runs {runs0}->{runs1}")


async def t11_cap_and_concurrency(x: Ctx) -> None:
    mi, vi = await x.ws("miolo"), await x.ws("vitta")
    for ws in (mi, vi):
        await x.q("select app.grant_credits(%s, 200, 'manual', %s)", ws, f"h1-cap-{ws}-{time.time()}")
    for _ in range(6):
        await x.request_work("marina@miolo.example", "miolo")
    for _ in range(3):
        await x.request_work("rafael@vitta.example", "vitta")
    peaks = {"miolo": 0, "vitta": 0, "total": 0}
    stop = asyncio.Event()

    async def sample() -> None:
        while not stop.is_set():
            rows = await x.q("select workspace_id::text ws, count(*) n from public.runs where status = 'running' group by 1")
            d = {r["ws"]: int(r["n"]) for r in rows}
            peaks["miolo"] = max(peaks["miolo"], d.get(mi, 0))
            peaks["vitta"] = max(peaks["vitta"], d.get(vi, 0))
            peaks["total"] = max(peaks["total"], sum(d.values()))
            await asyncio.sleep(0.1)

    workers = [Worker(settings(worker_concurrency=4, worker_workspace_cap=3, worker_poll_seconds=0.2), llm=SlowLLM(0.8)) for _ in range(2)]
    async with workers[0] as w1, workers[1] as w2:
        s = asyncio.create_task(sample())
        t1, t2 = asyncio.create_task(w1.serve(handle_signals=False)), asyncio.create_task(w2.serve(handle_signals=False))
        for _ in range(240):
            left = await x.v("select count(*) from public.runs where status in ('queued', 'running')")
            if left == 0:
                break
            await asyncio.sleep(0.5)
        w1.stop(); w2.stop()
        await asyncio.gather(t1, t2)
        stop.set(); await s
    done = await x.q("select status::text s, count(*) n from public.runs group by 1")
    ok = peaks["miolo"] <= 3 and peaks["vitta"] <= 3 and peaks["total"] <= 8 and peaks["miolo"] >= 2
    report("T11 teto por workspace (3) com 2 workers de concorrência 4", ok, f"picos={peaks}; runs={ {r['s']: r['n'] for r in done} }")


async def t12_sigterm_and_sigkill(x: Ctx) -> None:
    script = ROOT / "docs/parciais/h1/h1_worker_lento.py"
    for sig, label in ((signal.SIGTERM, "SIGTERM"), (signal.SIGKILL, "SIGKILL")):
        w = await x.request_work("marina@miolo.example", "miolo")
        b0 = await x.balance(w["ws"])
        env = dict(os.environ, WORKER_SHUTDOWN_GRACE_SECONDS="1", WORKER_VISIBILITY_TIMEOUT_SECONDS="4")
        p = subprocess.Popen([sys.executable, str(script)], env=env, stdout=open(f"/tmp/h1_worker_{label}.log", "w"), stderr=subprocess.STDOUT)
        for _ in range(100):
            if await x.v("select status::text from public.runs where id = %s", w["run"]) == "running":
                break
            await asyncio.sleep(0.2)
        await asyncio.sleep(1.0)
        p.send_signal(sig)
        p.wait(timeout=60)
        mid = (await x.q("select status::text, attempts from public.runs where id = %s", w["run"]))[0]
        if sig == signal.SIGKILL:
            await asyncio.sleep(4.5)
        o = await drain(worker_visibility_timeout_seconds=4)
        run = (await x.q("select status::text, attempts, credits_charged from public.runs where id = %s", w["run"]))[0]
        led = await x.ledger(w["work"])
        ok = run["status"] == "succeeded" and led.get("capture", (0,))[0] == 1 and led.get("hold", (0,))[0] == 1 \
            and await x.versions(w["work"]) == 1 and (mid["status"] == "queued" if sig == signal.SIGTERM else True)
        report(f"T12 {label} no meio do run", ok, f"exit={p.returncode}; logo após o sinal={mid}; depois={o} {run}; extrato={led}; versões={await x.versions(w['work'])}; saldo {b0}->{await x.balance(w['ws'])}")


async def main() -> None:
    x = Ctx()
    await x.open()
    await x.seed()
    for t in (t1_decide_concurrently, t2_run_twice):
        try:
            await t(x)
        except Exception as e:  # noqa: BLE001
            report(t.__name__, False, f"exceção {e!r}"[:400])
    try:
        w = await t3_retry_then_success(x)
        await t4_requeue_after_success(x, w)
    except Exception as e:  # noqa: BLE001
        report("t3/t4", False, f"exceção {e!r}"[:400])
    for t in (t5_failure_releases, t6_respond_does_not_charge, t7_estimate_equals_charge_revision, t9_ledger_immutable, t10_not_now):
        try:
            await t(x)
        except Exception as e:  # noqa: BLE001
            report(t.__name__, False, f"exceção {e!r}"[:400])
    await x.seed()
    for t in (t8_never_negative,):
        try:
            await t(x)
        except Exception as e:  # noqa: BLE001
            report(t.__name__, False, f"exceção {e!r}"[:400])
    await x.seed()
    for t in (t11_cap_and_concurrency, t12_sigterm_and_sigkill):
        try:
            await t(x)
        except Exception as e:  # noqa: BLE001
            report(t.__name__, False, f"exceção {e!r}"[:400])
    await x.seed()
    print(f"RESUMO: {sum(ok for _, ok, _ in RESULTS)} de {len(RESULTS)} OK", flush=True)


asyncio.run(main())
