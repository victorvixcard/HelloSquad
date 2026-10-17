"""H-SA — apoio dos roteiros da QA da trilha Super Admin (Hulk). Lê as chaves locais do .env em tempo de execução e
nunca as imprime. Uso: `apps/backend/.venv/bin/python docs/parciais/hsa/<roteiro>.py` na raiz do repositório; o que
muda o banco roda sob a trava (`flock -o -w 900 /tmp/hellosquad-db.lock ...`)."""

import json
import os
import re
import subprocess
from pathlib import Path

import httpx

ROOT = Path("/home/vitao/projetos/hellosquad")
API = "http://127.0.0.1:8100"
WEB = "http://127.0.0.1:3100"
MIOLO = "6bcdc5bd-3c9a-4a7a-bb83-22b2ba88edc2"
VITTA = "fc0bba8b-f2b1-46fd-a843-b5ff0cc3ea7b"
TRILHA = "a031591a-034d-4bda-90be-568d4e71c06f"
PASSWORD = "Senha!Teste123"
M, R, C, J, P, V = ("marina@miolo.example", "rafael@vitta.example", "carla@vitta.example", "juliana@trilha.example",
                    "pedro@semconta.example", "vic@hellosquad.example")
SECRET_PATTERNS = re.compile(r"sb_(secret|publishable)_|eyJ[A-Za-z0-9_-]{10,}|ASAAS|MP_|ANTHROPIC|sk-ant|whsec_|\$aact_")


def env(key: str) -> str:
    for line in (ROOT / ".env").read_text().splitlines():
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip()
    raise KeyError(key)


SUPABASE_URL = env("SUPABASE_URL").rstrip("/")
PK = env("SUPABASE_PUBLISHABLE_KEY")
_tokens: dict[str, str] = {}


def login(email: str) -> dict:
    r = httpx.post(f"{SUPABASE_URL}/auth/v1/token?grant_type=password", headers={"apikey": PK},
                   json={"email": email, "password": PASSWORD}, timeout=20)
    r.raise_for_status()
    return r.json()


def token(email: str) -> str:
    if email not in _tokens:
        _tokens[email] = login(email)["access_token"]
    return _tokens[email]


def call(method: str, path: str, who: str | None = None, body=None, headers=None, timeout=60, bearer=None):
    h = dict(headers or {})
    if who:
        h["Authorization"] = f"Bearer {token(who)}"
    if bearer is not None:
        h["Authorization"] = f"Bearer {bearer}"
    r = httpx.request(method, API + path, headers=h, json=body, timeout=timeout)
    try:
        data = r.json()
    except Exception:
        data = r.text
    return r.status_code, data


def raw(method: str, path: str, who: str | None = None, body=None, timeout=60) -> httpx.Response:
    h = {"Authorization": f"Bearer {token(who)}"} if who else {}
    return httpx.request(method, API + path, headers=h, json=body, timeout=timeout)


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
    payload = {"kind": kind} if kind == "squad_room" else {"kind": kind, "primary_agent_id": agent}
    s, conv = call("POST", f"/workspaces/{ws}/conversations", who, payload)
    assert s in (200, 201), (s, conv)
    s, msg = call("POST", f"/conversations/{conv['id']}/messages", who, {"body": body})
    assert s in (200, 201), (s, msg)
    s, wi = call("POST", f"/messages/{msg['id']}/work-items", who, {"delivery_type": delivery, "title": title})
    assert s in (200, 201), (s, wi)
    return wi["id"], conv["id"]


def dump(obj, n=300) -> str:
    return json.dumps(obj, ensure_ascii=False)[:n]


def secrets_in(text: str) -> list[str]:
    """Padrões de chave e os valores reais dos segredos do .env presentes no texto."""
    hits = sorted({m.group(0)[:12] for m in SECRET_PATTERNS.finditer(text)})
    for key in ("SUPABASE_SECRET_KEY", "SUPABASE_PUBLISHABLE_KEY", "API_DATABASE_URL", "PAYMENT_MOCK_WEBHOOK_SECRET",
                "ANTHROPIC_API_KEY", "ASAAS_API_KEY", "MERCADOPAGO_ACCESS_TOKEN", "SUPABASE_JWT_SECRET"):
        try:
            v = env(key)
        except KeyError:
            continue
        if v and len(v) >= 8 and v in text:
            hits.append(f"valor de {key}")
    return hits
