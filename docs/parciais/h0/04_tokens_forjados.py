#!/usr/bin/env python3
"""H0, alvo 4 — tokens forjados contra a API (8100) e a Data API (56321).

Esperado na API: 401 para HS256 com o JWT_SECRET local (config padrão só aceita ES256 via JWKS),
aud errado, exp vencido, kid inexistente, alg none e claims forjados. A Data API (GoTrue/PostgREST)
aceita HS256 com o JWT_SECRET (é como ela valida), então ali o token forjado vale — mas a RLS ainda
precisa barrar o acesso a outro tenant. Rodar da raiz: `uv --project apps/backend run python docs/parciais/h0/04_tokens_forjados.py`.
"""
import json
import subprocess
import time
import urllib.request
import uuid

import jwt

ROOT = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()
SUPA = "http://127.0.0.1:56321"
API = "http://127.0.0.1:8100"


def env(path, key):
    for line in open(path):
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip()
    return ""


def status_env(key):
    out = subprocess.check_output(["pnpm", "exec", "supabase", "status", "-o", "env"], cwd=ROOT, text=True)
    for line in out.splitlines():
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"')
    return ""


PK = env(f"{ROOT}/.env", "SUPABASE_PUBLISHABLE_KEY")
SECRET = status_env("JWT_SECRET")
ISS = f"{SUPA}/auth/v1"
MARINA = "64f7a1f3-ceec-49b6-8595-e406252e01c2"  # resolvido pelo e-mail abaixo se mudar
OTHER_SUB = str(uuid.uuid4())


def real_sub(email):
    q = f"select id from auth.users where email='{email}'"
    return subprocess.check_output(
        ["docker", "exec", "-i", "supabase_db_hellosquad", "psql", "-U", "postgres", "-d", "postgres", "-qAt", "-c", q],
        text=True,
    ).strip()


def req(url, token, extra=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if extra:
        headers.update(extra)
    r = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(r, timeout=8) as resp:
            return resp.status, resp.read(200).decode(errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read(200).decode(errors="replace")
    except Exception as e:  # noqa: BLE001
        return "ERR", str(e)[:120]


def base(**over):
    now = int(time.time())
    c = {
        "iss": ISS, "aud": "authenticated", "sub": MARINA, "role": "authenticated",
        "email": "marina@miolo.example", "iat": now, "exp": now + 3600,
        "session_id": str(uuid.uuid4()),
    }
    c.update(over)
    return c


def hs256(claims, headers=None):
    return jwt.encode(claims, SECRET, algorithm="HS256", headers=headers)


def main():
    global MARINA
    MARINA = real_sub("marina@miolo.example") or MARINA
    tokens = {
        "HS256 válido (segredo local)": hs256(base()),
        "HS256 aud errado": hs256(base(aud="anon")),
        "HS256 exp vencido": hs256(base(exp=int(time.time()) - 10, iat=int(time.time()) - 3600)),
        "HS256 role service_role forjado": hs256(base(role="service_role")),
        "HS256 sub de outro usuário": hs256(base(sub=OTHER_SUB)),
        "HS256 iss errado": hs256(base(iss="https://evil.example/auth/v1")),
        "HS256 kid inexistente": hs256(base(), headers={"kid": "nao-existe"}),
        "HS256 sem role": hs256({k: v for k, v in base().items() if k != "role"}),
        "alg none (sem assinatura)": jwt.encode(base(), key=None, algorithm="none"),
        "HS256 assinado com segredo errado": jwt.encode(base(), "segredo-errado-h0", algorithm="HS256"),
    }
    print("=== API FastAPI (:8100) — esperado 401 em todos (config padrão = ES256/JWKS)")
    for name, tok in tokens.items():
        s, b = req(f"{API}/me", tok)
        print(f"{name:42} -> {s} {b[:80]}")

    print("\n=== Data API /rest/v1/workspaces (PostgREST valida HS256 com o JWT_SECRET)")
    vitta = real_sub_ws("vitta")
    for name, tok in tokens.items():
        s, b = req(f"{SUPA}/rest/v1/workspaces?select=slug", tok, {"apikey": PK})
        print(f"{name:42} -> {s} {b[:90]}")
    print("\n=== Data API: HS256 service_role forjado tentando ler a Vitta e os memberships")
    tok = tokens["HS256 role service_role forjado"]
    for p in (f"workspaces?id=eq.{vitta}", "memberships?select=*", "audit_events?select=*"):
        s, b = req(f"{SUPA}/rest/v1/{p}", tok, {"apikey": PK})
        print(f"service_role {p:32} -> {s} {b[:90]}")
    print("\n=== Data API: sub de outro usuário (OTHER_SUB aleatório) lendo workspaces")
    s, b = req(f"{SUPA}/rest/v1/workspaces?select=slug", tokens["HS256 sub de outro usuário"], {"apikey": PK})
    print(f"sub forjado -> {s} {b[:90]}")


def real_sub_ws(slug):
    q = f"select id from public.workspaces where slug='{slug}'"
    return subprocess.check_output(
        ["docker", "exec", "-i", "supabase_db_hellosquad", "psql", "-U", "postgres", "-d", "postgres", "-qAt", "-c", q],
        text=True,
    ).strip()


if __name__ == "__main__":
    main()
