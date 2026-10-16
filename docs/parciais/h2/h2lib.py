"""H2 — apoio dos roteiros da QA da Fase 2 (Hulk). Lê as chaves locais do .env em tempo de execução e
nunca as imprime. Uso: `apps/backend/.venv/bin/python docs/parciais/h2/<roteiro>.py` na raiz do repositório,
sob a trava do banco (`flock -o -w 900 /tmp/hellosquad-db.lock ...`)."""

import json
import os
import subprocess
from pathlib import Path

import httpx

ROOT = Path("/home/vitao/projetos/hellosquad")
API = "http://127.0.0.1:8100"
MIOLO = "6bcdc5bd-3c9a-4a7a-bb83-22b2ba88edc2"
VITTA = "fc0bba8b-f2b1-46fd-a843-b5ff0cc3ea7b"
TRILHA = "a031591a-034d-4bda-90be-568d4e71c06f"
PASSWORD = "Senha!Teste123"


def env(key: str) -> str:
    for line in (ROOT / ".env").read_text().splitlines():
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip()
    raise KeyError(key)


SUPABASE_URL = env("SUPABASE_URL").rstrip("/")
PK = env("SUPABASE_PUBLISHABLE_KEY")
_tokens: dict[str, str] = {}


def token(email: str) -> str:
    if email not in _tokens:
        r = httpx.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": PK},
            json={"email": email, "password": PASSWORD},
            timeout=20,
        )
        r.raise_for_status()
        _tokens[email] = r.json()["access_token"]
    return _tokens[email]


def call(method: str, path: str, who: str | None = None, body=None, headers=None, timeout=60):
    h = dict(headers or {})
    if who:
        h["Authorization"] = f"Bearer {token(who)}"
    r = httpx.request(method, API + path, headers=h, json=body, timeout=timeout)
    try:
        data = r.json()
    except Exception:
        data = r.text
    return r.status_code, data


def sql(q: str) -> list[list[str]]:
    out = subprocess.run(
        ["docker", "exec", "-i", "supabase_db_hellosquad", "psql", "-U", "postgres", "-d", "postgres",
         "-v", "ON_ERROR_STOP=1", "-qAt", "-F", "|", "-c", q],
        capture_output=True, text=True, timeout=60,
    )
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip()[:400])
    return [line.split("|") for line in out.stdout.splitlines() if line]


def sql1(q: str) -> str:
    rows = sql(q)
    return rows[0][0] if rows else ""


def drain(log: str, extra_env: dict | None = None) -> str:
    """Worker do produto em modo simulado, `--drain` (consome as filas e sai)."""
    e = dict(os.environ, LLM_PROVIDER="simulated", WORKER_WORKSPACE_CAP="8")
    e.update(extra_env or {})
    with open(log, "a") as fh:
        p = subprocess.run(["uv", "run", "hellosquad-worker", "--drain"], cwd=ROOT / "apps/backend",
                           env=e, stdout=fh, stderr=subprocess.STDOUT, timeout=600)
    text = Path(log).read_text()
    return f"exit={p.returncode} concluídos={text.count('concluído')} falhas={text.count('falhou')}"


def ask(who: str, ws: str, agent: str, delivery: str, title: str, body: str, kind="agent_direct"):
    """Pedido na conversa com o especialista -> trabalho com run na fila. Devolve (trabalho, conversa)."""
    payload = {"kind": kind} if kind == "squad_room" else {"kind": kind, "primary_agent_id": agent}
    s, conv = call("POST", f"/workspaces/{ws}/conversations", who, payload)
    assert s in (200, 201), (s, conv)
    s, msg = call("POST", f"/conversations/{conv['id']}/messages", who, {"body": body})
    assert s in (200, 201), (s, msg)
    s, wi = call("POST", f"/messages/{msg['id']}/work-items", who, {"delivery_type": delivery, "title": title})
    assert s in (200, 201), (s, wi)
    return wi["id"], conv["id"]


def work(who: str, wid: str) -> dict:
    s, w = call("GET", f"/work-items/{wid}", who)
    assert s == 200, (s, w)
    return w


def credits(wid: str) -> str:
    holds = sql(
        "select h.state, h.estimate, coalesce(h.captured::text,'-') from credit_holds h join runs r on r.id=h.run_id "
        f"where r.work_item_id='{wid}' order by h.created_at"
    )
    ledger = sql(
        "select l.entry_type, sum(l.amount), count(*) from credit_ledger l join runs r on r.id=l.run_id "
        f"where r.work_item_id='{wid}' group by 1 order by 1"
    )
    runs = sql(f"select status, attempts, coalesce(credits_charged::text,'-') from runs where work_item_id='{wid}' order by created_at")
    return f"runs={runs} reservas={holds} extrato={ledger}"


def dump(obj, n=300) -> str:
    return json.dumps(obj, ensure_ascii=False)[:n]
