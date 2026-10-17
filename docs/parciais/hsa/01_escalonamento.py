"""H-SA alvo 1 — escalonamento. Todas as 48 operações /admin/* do OpenAPI vivo (leitura e escrita, com corpo válido)
contra Marina (owner), Carla (editora), Pedro (sem negócio), Juliana (owner), sem token, chave publicável e chave anon
legada como bearer, e cinco tokens forjados; impressão digital do banco antes e depois (nada pode mudar). Data API
(/rest/v1) e GraphQL (/graphql/v1) contra as tabelas e views do SA, com leitura e escrita direta.
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/hsa/01_escalonamento.py
"""

import base64
import json
import subprocess
import sys
import time
import uuid

import httpx
import jwt

sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/hsa")
from hsalib import API, C, J, M, MIOLO, P, PK, SUPABASE_URL, V, call, dump, env, login, sql, sql1, token  # noqa: E402

FINGERPRINT = [
    "select count(*) from audit_events", "select count(*) from squad_versions", "select count(*) from agent_prompt_sections",
    "select count(*) from delivery_prices", "select count(*) from plan_prices", "select count(*) from topup_packs",
    "select count(*) from credit_ledger", "select count(*) from credit_grants", "select count(*) from support_access_log",
    "select count(*) from payment_reconciliations", "select count(*) from provider_balance_reports",
    "select count(*) from business_rule_doc_versions", "select count(*) from workspaces where suspended_at is not null",
    "select count(*) from delivery_catalog where for_sale", "select coalesce(string_agg(homologation_status::text, ',' order by delivery_type), '') from delivery_catalog",
    "select count(*) from platform_admins", "select coalesce(string_agg(status::text, ',' order by id), '') from runs",
]


def fingerprint():
    return [sql1(q) for q in FINGERPRINT]


run_id = sql1("select id from runs order by created_at limit 1")
version_id = sql1("select id from squad_versions where agent_id='otto' and kind='soul' and status='active'")
doc_id = sql1("select id from business_rule_docs limit 1")
PATH = {"workspace_id": MIOLO, "run_id": run_id, "version_id": version_id, "doc_id": doc_id, "agent_id": "otto",
        "delivery_type": "04.01", "doc": "README.md", "section": "como_fala", "provider": "anthropic",
        "slug": "squad", "event_id": str(uuid.uuid4())}
REASON = "Teste de escalonamento da H-SA"
BODY = {
    "BalanceUpdate": {"amount": "38.00", "currency": "USD", "read_at": "2026-10-16T22:00:00-03:00", "reason": REASON, "alert_below": "50.00"},
    "ContentEdit": {"content": "---\ndelivery: 04.01\n---\n# H-SA\nTexto forjado.", "note": REASON},
    "SectionEdit": {"body": "Texto forjado pela H-SA.", "note": REASON},
    "ConfigEdit": {"tools": ["memoria.ler"], "note": REASON},
    "RuleDocEdit": {"in_prompt": True, "paragraphs": [{"mark": "decided", "text": "Regra forjada pela H-SA."}], "note": REASON},
    "SupportSessionStart": {"reason": REASON, "duration_minutes": 15},
    "CreditAdjustmentRequest": {"amount": "500", "reason": REASON, "idempotency_key": str(uuid.uuid4())},
    "ReasonRequest": {"reason": REASON},
    "CatalogPriceUpdate": {"credits": "1", "reason": REASON},
    "HomologationUpdate": {"status": "homologated", "reason": REASON},
    "ForSaleUpdate": {"for_sale": True, "reason": REASON},
    "PlanVersionUpdate": {"credits": "9999", "cycle": "monthly", "amount": "1.00", "reason": REASON, "for_sale": True},
    "TopupVersionUpdate": {"credits": "9999", "amount": "1.00", "reason": REASON},
}

spec = httpx.get(API + "/openapi.json", timeout=20).json()
OPS = []
for p, ops in spec["paths"].items():
    if not p.startswith("/admin"):
        continue
    for m, op in ops.items():
        rb = op.get("requestBody", {}).get("content", {}).get("application/json", {}).get("schema", {})
        ref = rb.get("$ref", "").split("/")[-1] if rb else ""
        path = p
        for k, v in PATH.items():
            path = path.replace("{" + k + "}", v)
        if "/topups/" in p:
            path = path.replace("/squad", "/recarga-50")
        OPS.append((m.upper(), path, BODY.get(ref)))
print(f"== {len(OPS)} operações /admin/* no OpenAPI vivo")


def b64(d):
    return base64.urlsafe_b64encode(json.dumps(d, separators=(",", ":")).encode()).rstrip(b"=").decode()


# Tokens forjados
mar = token(M)
h, p_, s = mar.split(".")
claims = json.loads(base64.urlsafe_b64decode(p_ + "=" * (-len(p_) % 4)))
vic_id = sql1("select id from auth.users where email='vic@hellosquad.example'")
forged = {}
forged["marina+platform_admin no payload (assinatura original)"] = ".".join(
    [h, b64(claims | {"platform_admin": True, "app_metadata": {**claims.get("app_metadata", {}), "role": "platform_admin", "platform_admin": True}}), s])
forged["marina com sub do Vic (assinatura original)"] = ".".join([h, b64(claims | {"sub": vic_id}), s])
forged["alg none com sub do Vic"] = ".".join([b64({"alg": "none", "typ": "JWT"}), b64(claims | {"sub": vic_id, "email": "vic@hellosquad.example"}), ""])
forged["HS256 com o segredo padrão do Supabase local, sub do Vic"] = jwt.encode(
    claims | {"sub": vic_id, "email": "vic@hellosquad.example", "exp": int(time.time()) + 600},
    "super-secret-jwt-token-with-at-least-32-characters-long", algorithm="HS256")
st = subprocess.run(["pnpm", "exec", "supabase", "status", "-o", "env"], cwd="/home/vitao/projetos/hellosquad",
                    capture_output=True, text=True, timeout=60).stdout
anon_legacy = next((line.split("=", 1)[1].strip().strip('"') for line in st.splitlines() if line.startswith("ANON_KEY=")), "")
service_legacy = next((line.split("=", 1)[1].strip().strip('"') for line in st.splitlines() if line.startswith("SERVICE_ROLE_KEY=")), "")
bearers = {"chave publicável como bearer": PK, "chave anon legada (JWT role=anon)": anon_legacy,
           "chave service_role legada (JWT role=service_role)": service_legacy} | forged

# Marina com user_metadata de Super Admin (o usuário pode mudar o próprio user_metadata pela Auth)
orig_meta = sql1("select raw_user_meta_data::text from auth.users where email='marina@miolo.example'")
r = httpx.put(f"{SUPABASE_URL}/auth/v1/user", headers={"apikey": PK, "Authorization": f"Bearer {mar}"},
              json={"data": {"platform_admin": True, "role": "platform_admin", "is_super_admin": True},
                    "app_metadata": {"role": "platform_admin"}}, timeout=20)
print("  Marina grava user_metadata de Super Admin pela Auth:", r.status_code)
meta_token = login(M)["access_token"]
mc = json.loads(base64.urlsafe_b64decode(meta_token.split(".")[1] + "=="))
print("  token novo da Marina: user_metadata =", dump(mc.get("user_metadata")), "| app_metadata =", dump(mc.get("app_metadata")))
bearers["marina com user_metadata platform_admin (assinatura válida)"] = meta_token

before = fingerprint()
results = {}
anomalies = []
personas = [("Marina (owner)", M), ("Carla (editora)", C), ("Pedro (sem negócio)", P), ("Juliana (owner)", J)]
for method, path, body in OPS:
    for label, who in personas:
        s, d = call(method, path, who, body)
        code = d.get("error", {}).get("code") if isinstance(d, dict) else None
        results.setdefault(label, []).append(s)
        if s != 403 or code != "platform_admin_only":
            anomalies.append((label, method, path, s, dump(d, 160)))
    s, d = call(method, path, None, body)
    results.setdefault("sem token", []).append(s)
    if s != 401:
        anomalies.append(("sem token", method, path, s, dump(d, 160)))
    for label, b in bearers.items():
        s, d = call(method, path, None, body, bearer=b)
        results.setdefault(label, []).append(s)
        expected = 403 if "user_metadata" in label else 401
        if s != expected:
            anomalies.append((label, method, path, s, dump(d, 160)))
after = fingerprint()

print("== resultado por quem ataca (status: quantas operações)")
for label, codes in results.items():
    hist = {}
    for c in codes:
        hist[c] = hist.get(c, 0) + 1
    print(f"  {label}: {hist}")
print("== anomalias (status diferente de 403 platform_admin_only / 401):", len(anomalies))
for a in anomalies[:30]:
    print("  ", a)
print("== impressão digital do banco antes == depois:", before == after)
if before != after:
    for q, a, b in zip(FINGERPRINT, before, after):
        if a != b:
            print("   MUDOU:", q, a, "->", b)

# restaura o user_metadata da Marina exatamente como estava
sql(f"update auth.users set raw_user_meta_data = $${orig_meta}$$::jsonb where email='marina@miolo.example'")
print("  user_metadata da Marina restaurado:", sql1("select raw_user_meta_data::text from auth.users where email='marina@miolo.example'") == orig_meta)
print("  app_metadata da Marina (o usuário não muda):", sql1("select raw_app_meta_data::text from auth.users where email='marina@miolo.example'"))

print("== controle: Vic 200 nas operações GET")
gets = [(m, p) for m, p, _ in OPS if m == "GET"]
vic_codes = {}
for m, p in gets:
    s, d = call(m, p.replace("/admin/squad/diff", "/admin/squad/diff?from=" + version_id + "&to=" + version_id), V)
    vic_codes[s] = vic_codes.get(s, 0) + 1
    if s != 200:
        print("   Vic", s, p, dump(d, 120))
print("  Vic:", vic_codes, "em", len(gets), "GET")

print("== Data API (/rest/v1) e GraphQL contra as tabelas e views do SA")
SA = ["platform_admins", "support_access_log", "topups", "topup_versions", "delivery_catalog", "business_rule_docs",
      "business_rule_doc_versions", "reference_items", "model_pricing", "task_model_rules", "provider_health",
      "v_consumo_por_cliente", "v_qualidade_entregas", "v_qualidade_itens", "v_fila", "v_fila_filas", "squad_versions",
      "agent_prompt_sections", "economic_alert_rules", "provider_balance_reports", "payment_reconciliations",
      "audit_events", "delivery_prices", "agent_prompt_versions"]
leaks = []
summary = {}
for t in SA:
    row = []
    for label, b in (("anon", None), ("Marina", token(M)), ("Pedro", token(P)), ("Vic", token(V))):
        hh = {"apikey": PK} | ({"Authorization": f"Bearer {b}"} if b else {})
        rr = httpx.get(f"{SUPABASE_URL}/rest/v1/{t}?select=*&limit=3", headers=hh, timeout=20)
        row.append(rr.status_code)
        if rr.status_code == 200:
            leaks.append((t, label, rr.text[:120]))
    summary[t] = row
print("  status [anon, Marina, Pedro, Vic] por tabela:", json.dumps(summary))
print("  leituras 200:", leaks)
writes = [
    ("POST", "platform_admins", M, {"user_id": claims["sub"], "mfa_enforced": False}),
    ("POST", "platform_admins", P, {"user_id": sql1("select id from auth.users where email='pedro@semconta.example'")}),
    ("POST", "support_access_log", V, {"admin_id": vic_id, "workspace_id": MIOLO, "reason": "sem motivo registrado", "expires_at": "2030-01-01T00:00:00Z"}),
    ("PATCH", "squad_versions?id=eq." + version_id, V, {"status": "superseded"}),
    ("DELETE", "audit_events?id=not.is.null", V, None),
    ("PATCH", "delivery_catalog?delivery_type=eq.04.01", V, {"for_sale": True}),
    ("PATCH", "support_access_log?id=not.is.null", V, {"ended_at": None}),
]
for method, tpath, who, body in writes:
    rr = httpx.request(method, f"{SUPABASE_URL}/rest/v1/{tpath}", headers={"apikey": PK, "Authorization": f"Bearer {token(who)}", "Prefer": "return=representation"}, json=body, timeout=20)
    print(f"  {method} {tpath.split('?')[0]} como {who.split('@')[0]}: {rr.status_code} {rr.text[:90]}")
gq = '{ __schema { queryType { fields { name } } } }'
for label, b in (("anon", None), ("Marina", token(M)), ("Vic", token(V))):
    hh = {"apikey": PK} | ({"Authorization": f"Bearer {b}"} if b else {})
    rr = httpx.post(f"{SUPABASE_URL}/graphql/v1", headers=hh, json={"query": gq}, timeout=20)
    names = []
    try:
        names = [f["name"] for f in (rr.json().get("data") or {}).get("__schema", {}).get("queryType", {}).get("fields", [])]
    except Exception:
        pass
    sa_hits = [n for n in names if any(t.replace("_", "") in n.lower().replace("_", "") for t in SA)]
    print(f"  GraphQL {label}: {rr.status_code}; campos de consulta {len(names)}; do SA: {sa_hits}")
print("== impressão digital depois da Data API == antes:", fingerprint() == before)
