"""H-SA alvos 3, 5 e 6 — cada escrita do Super Admin gera audit_events (quem, quando, motivo) e nada se apaga; créditos
nunca negativos e idempotentes (inclusive em paralelo); suspender pausa cobrança e rotinas sem cancelar; "à venda" só
com homologação e preço aprovado; valores marcados provisório/proposta; nenhuma chave nas respostas de /admin/*.
Restaura no fim (versões novas com os valores do seed; nada é apagado) e roda o `make seed`.
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/hsa/03_escritas_auditoria.py
"""

import hashlib
import hmac
import json
import os
import subprocess
import sys
import threading
import time
import uuid

import httpx

sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/hsa")
from hsalib import (API, M, MIOLO, P, PK, ROOT, SUPABASE_URL, V, VITTA, call, dump, env, secrets_in, sql, sql1,  # noqa: E402
                    token)

R = "Teste da H-SA com motivo registrado"
vic_id = sql1("select id from auth.users where email='vic@hellosquad.example'")
t0 = sql1("select now()")
audit0 = int(sql1("select count(*) from audit_events"))
bal = lambda ws=MIOLO: sql1(f"select app.credit_balance('{ws}')")  # noqa: E731
avail = lambda ws=MIOLO: sql1(f"select coalesce(sum(remaining - reserved), 0) from credit_grants where workspace_id='{ws}' and (expires_at is null or expires_at > now())")  # noqa: E731


def act(method, path, body, label, who=V):
    s, d = call(method, path, who, body)
    code = d.get("error", {}).get("code") if isinstance(d, dict) and isinstance(d.get("error"), dict) else ""
    print(f"  {label}: {s} {code or dump(d, 150)}")
    return s, d


print("== 5. créditos (Miolo); saldo inicial", bal(), "disponível", avail())
k1 = str(uuid.uuid4())
act("POST", f"/admin/accounts/{MIOLO}/credit-adjustments", {"amount": "10", "reason": R, "idempotency_key": k1}, "+10 com chave K1")
print("    saldo:", bal())
act("POST", f"/admin/accounts/{MIOLO}/credit-adjustments", {"amount": "10", "reason": R, "idempotency_key": k1}, "+10 repetindo K1")
act("POST", f"/admin/accounts/{MIOLO}/credit-adjustments", {"amount": "999", "reason": R, "idempotency_key": k1}, "+999 com a mesma K1")
print("    saldo depois das repetições:", bal())
a = avail()
act("POST", f"/admin/accounts/{MIOLO}/credit-adjustments", {"amount": f"-{float(a) + 0.01:.2f}", "reason": R}, f"débito de disponível+0,01 (-{float(a) + 0.01:.2f})")
print("    saldo:", bal())
for body, lab in (({"amount": "0", "reason": R}, "zero"), ({"amount": "1.001", "reason": R}, "3 casas"),
                  ({"amount": "5", "reason": "curtinho"}, "motivo curto"), ({"amount": "5", "reason": " " * 30}, "motivo só espaços"),
                  ({"amount": "abc", "reason": R}, "não numérico")):
    act("POST", f"/admin/accounts/{MIOLO}/credit-adjustments", body, lab)
a = float(avail())
res = []
half = f"-{a / 2 + 1:.2f}"


def debit():
    res.append(call("POST", f"/admin/accounts/{MIOLO}/credit-adjustments", V, {"amount": half, "reason": R})[0])


ts = [threading.Thread(target=debit) for _ in range(5)]
[t.start() for t in ts]
[t.join() for t in ts]
print(f"  5 débitos paralelos de {half} (disponível {a:.2f}): {sorted(res)}; saldo {bal()}, disponível {avail()}; grant negativo:",
      sql1(f"select count(*) from credit_grants where workspace_id='{MIOLO}' and remaining < 0"))
k2 = str(uuid.uuid4())
res = []


def same_key():
    res.append(call("POST", f"/admin/accounts/{MIOLO}/credit-adjustments", V, {"amount": "3", "reason": R, "idempotency_key": k2})[1])


ts = [threading.Thread(target=same_key) for _ in range(5)]
[t.start() for t in ts]
[t.join() for t in ts]
print("  5 ajustes paralelos com a mesma chave K2: duplicate =", sorted(str(x.get("duplicate")) if isinstance(x, dict) else str(x)[:40] for x in res),
      "| grants de ajuste com K2:", sql1(f"select count(*) from credit_grants where workspace_id='{MIOLO}' and origin='adjustment' and created_at > '{t0}' and amount = 3"))
print("  extrato da Marina (produto) mostra o motivo do Super Admin?",
      [x.get("note") for x in (call("GET", f"/workspaces/{MIOLO}/credits/ledger", M)[1] or {}).get("items", [])[:3]] if call("GET", f"/workspaces/{MIOLO}/credits/ledger", M)[0] == 200 else "sem rota de extrato")

print("== 5. suspender / reativar (Miolo)")
due = lambda: sql1(f"select count(*) from app.billing_due_subscriptions(now() + interval '400 days') s where s.workspace_id='{MIOLO}'")  # noqa: E731
sub = lambda: sql1(f"select status::text from subscriptions where workspace_id='{MIOLO}'")  # noqa: E731
print("  assinatura:", sub(), "| devida para a renovação (daqui a 400 dias):", due())
act("POST", f"/admin/accounts/{MIOLO}/reactivate", {"reason": R}, "reativar conta ativa")
act("POST", f"/admin/accounts/{MIOLO}/suspend", {"reason": R}, "suspender")
act("POST", f"/admin/accounts/{MIOLO}/suspend", {"reason": R}, "suspender de novo")
print("  assinatura:", sub(), "| devida para a renovação:", due())
s, me = call("GET", "/me", M)
print("  GET /me da Marina:", [(x.get("workspace_id", "")[:8], x.get("workspace_status"), x.get("suspension_reason", "—")) for x in me.get("memberships", [])])
rr = httpx.get(f"{SUPABASE_URL}/rest/v1/workspaces?select=slug,suspended_at,suspension_reason&slug=eq.miolo", headers={"apikey": PK, "Authorization": f"Bearer {token(M)}"}, timeout=20)
print("  Data API: a Marina lê o motivo da suspensão?", rr.status_code, rr.text[:160])
run = sql1(f"insert into runs (workspace_id, agent_id, status, kind, idempotency_key) values ('{MIOLO}', 'otto', 'queued', 'scheduled', 'hsa-rotina-' || gen_random_uuid()) returning id")
try:
    sql(f"select app.enqueue_run('{run}')")
    print("  rotina (run scheduled) entrou na fila com a conta suspensa: ATENÇÃO")
except RuntimeError as e:
    print("  rotina com a conta suspensa:", str(e).splitlines()[0][:110])
s, d = call("POST", f"/workspaces/{MIOLO}/conversations", M, {"kind": "agent_direct", "primary_agent_id": "otto"})
print("  conversa pedida pela Marina com a conta suspensa:", s)
s, d = act("POST", f"/admin/accounts/{MIOLO}/support-session", {"reason": R, "duration_minutes": 15}, "sessão de suporte em conta suspensa (a SA6b esconde o botão)")
if s == 201:
    call("DELETE", f"/admin/accounts/{MIOLO}/support-session", V)
act("POST", f"/admin/accounts/{MIOLO}/reactivate", {"reason": R}, "reativar")
print("  assinatura:", sub(), "| devida para a renovação:", due())
msg = sql1(f"select app.enqueue_run('{run}')")
print("  rotina depois de reativar: entrou na fila (msg", msg, ")")
q = sql1(f"select app.run_queue_name('scheduled')")
sql(f"select pgmq.delete('{q}', {msg}::bigint)")
sql(f"update runs set status='cancelled' where id='{run}'")

print("== 6. catálogo, planos e recargas")
s, cat = call("GET", "/admin/catalog", V)
orig = next(x for x in cat["items"] if x["delivery_type"] == "04.01")
print("  04.01 antes:", orig["homologation_status"], orig["for_sale"], dump(orig["price"], 120))
print("  itens do catálogo com preço provisório:", sum(1 for x in cat["items"] if x["price"]["provisional"]), "de", len(cat["items"]),
      "| à venda:", sum(1 for x in cat["items"] if x["for_sale"]), "| profundidade inferida:", sum(1 for x in cat["items"] if x["depth_source"] == "inferred"))
act("PUT", "/admin/catalog/04.01/for-sale", {"for_sale": True, "reason": R}, "à venda sem homologação nem preço aprovado")
act("PUT", "/admin/catalog/04.01/price", {"credits": "12", "provisional": True, "approved_commercially": True, "reason": R}, "aprovado e provisório ao mesmo tempo")
act("PUT", "/admin/catalog/04.01/homologation", {"status": "homologated", "reason": R}, "homologar")
act("PUT", "/admin/catalog/04.01/for-sale", {"for_sale": True, "reason": R}, "à venda homologada com preço provisório")
act("PUT", "/admin/catalog/04.01/price", {"credits": "12", "provisional": False, "approved_commercially": True, "reason": R}, "preço aprovado")
act("PUT", "/admin/catalog/04.01/for-sale", {"for_sale": True, "reason": R}, "à venda homologada com preço aprovado")
act("PUT", "/admin/catalog/04.01/homologation", {"status": "in_homologation", "reason": R}, "reabrir homologação à venda")
act("PUT", "/admin/catalog/04.01/price", {"credits": "13", "provisional": True, "approved_commercially": False, "reason": R}, "preço provisório com a delivery à venda")
act("PUT", "/admin/catalog/99.99/price", {"credits": "1", "reason": R}, "delivery que não existe")
act("PUT", "/admin/catalog/04.01/price", {"credits": "-1", "reason": R}, "preço negativo")
rr = httpx.get(f"{SUPABASE_URL}/rest/v1/delivery_prices?select=delivery_type,credits,note&delivery_type=eq.04.01&order=valid_from.desc&limit=2",
               headers={"apikey": PK, "Authorization": f"Bearer {token(P)}"}, timeout=20)
print("  Data API: o Pedro (sem negócio) lê a versão nova de preço com o motivo do Super Admin:", rr.status_code, rr.text[:200])
s, est = call("POST", "/credits/estimate", M, {"workspace_id": MIOLO, "delivery_type": "04.01"})
print("  estimativa da Marina para 04.01 (preço novo vale para o cliente):", s, dump(est, 140))
s, plans = call("GET", "/admin/plans", V)
sq = next(x for x in plans["plans"] if x["slug"] == "squad")
tp = plans["topups"][0]
act("PUT", "/admin/plans/squad", {"credits": "120", "cycle": "monthly", "amount": "109.00", "for_sale": True, "reason": R}, "plano à venda com preço provisório")
act("PUT", "/admin/plans/squad", {"credits": "120", "cycle": "monthly", "amount": "109.00", "reason": R}, "plano: versão nova (provisória)")
act("PUT", "/admin/topups/recarga-50", {"credits": "60", "amount": "59.00", "for_sale": True, "reason": R}, "recarga à venda com preço provisório")
act("PUT", "/admin/topups/recarga-50", {"credits": "60", "amount": "59.00", "reason": R}, "recarga: versão nova (provisória)")
print("  versões antigas intactas (plano squad):", sql("select version, credits from plan_versions v join plans p on p.id=v.plan_id where p.slug='squad' order by version"))

print("== 3. fila e pagamentos")
rf = sql1(f"insert into runs (workspace_id, agent_id, status, idempotency_key, started_at, finished_at) values ('{MIOLO}', 'otto', 'failed', 'hsa-' || gen_random_uuid(), now() - interval '5 minutes', now() - interval '4 minutes') returning id")
act("POST", f"/admin/queue/runs/{rf}/cancel", {"reason": R}, "cancelar run que falhou")
act("POST", f"/admin/queue/runs/{rf}/requeue", {"reason": R}, "reenfileirar run que falhou (sem reserva)")
act("POST", f"/admin/queue/runs/{rf}/requeue", {"reason": R}, "reenfileirar de novo (já na fila)")
act("POST", f"/admin/queue/runs/{rf}/cancel", {"reason": R}, "cancelar o reenfileirado")
print("  run:", sql(f"select status, attempts, error->>'code', error->>'message' from runs where id='{rf}'"))
print("  mensagens do run na fila:", sql1(f"select count(*) from pgmq.q_runs_interactive where message->>'run_id'='{rf}'"))
secret = env("PAYMENT_MOCK_WEBHOOK_SECRET") if "PAYMENT_MOCK_WEBHOOK_SECRET" in open(ROOT / ".env").read() else ""
ev = None
if secret:
    body = json.dumps({"id": f"evt-hsa-{uuid.uuid4().hex[:8]}", "type": "payment.pending", "payment": {"id": "mock_pay_miolo_recarga", "status": "pending"}}).encode()
    sig = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    r = httpx.post(API + "/billing/webhooks/mock", content=body, headers={"x-mock-signature": sig, "content-type": "application/json"}, timeout=20)
    print("  webhook simulado assinado:", r.status_code, r.text[:120])
    ev = sql1("select id from payment_events where event_id like 'evt-hsa-%' order by received_at desc limit 1")
else:
    ev = sql1(f"insert into payment_events (provider, event_id, event_type, workspace_id, payment_id, payload, outcome) values ('mock', 'evt-hsa-' || gen_random_uuid(), 'payment.pending', '{MIOLO}', '5eed0000-0000-4000-8000-0000000009d2', '{{}}'::jsonb, 'needs_review') returning id")
    print("  sem segredo do webhook simulado no .env (PAYMENT_MOCK_WEBHOOK_SECRET vazio): evento da recarga pendente da Miolo inserido direto no banco")
grants0 = sql1(f"select count(*) from credit_grants where workspace_id='{MIOLO}'")
act("POST", f"/admin/payments/webhooks/{ev}/reprocess", {"reason": R}, "reprocessar (simulado não informa estado)")
act("POST", f"/admin/payments/webhooks/{ev}/reprocess", {"reason": R}, "reprocessar de novo")
act("POST", f"/admin/payments/webhooks/{ev}/reconcile", {"reason": R}, "conciliar")
act("POST", f"/admin/payments/webhooks/{ev}/reconcile", {"reason": R}, "conciliar de novo")
print("  grants da Miolo antes/depois do reprocessar:", grants0, sql1(f"select count(*) from credit_grants where workspace_id='{MIOLO}'"))

print("== 3. saldo informado e regras de negócio")
act("PATCH", "/admin/providers/anthropic/balance", {"amount": "38.00", "currency": "USD", "read_at": "2026-10-16T22:00:00-03:00", "reason": R, "alert_below": "50.00"}, "saldo informado")
act("PATCH", "/admin/providers/anthropic/balance", {"amount": "38.00", "currency": "USD", "read_at": "2030-01-01T00:00:00-03:00", "reason": R}, "leitura no futuro")
act("PATCH", "/admin/providers/inexistente/balance", {"amount": "1", "currency": "USD", "read_at": "2026-10-16T22:00:00-03:00", "reason": R}, "provedor desconhecido")
act("PATCH", "/admin/providers/anthropic/balance", {"amount": "-5", "currency": "USD", "read_at": "2026-10-16T22:00:00-03:00", "reason": R}, "saldo negativo")
doc = sql1("select id from business_rule_docs limit 1")
s, rd = call("GET", f"/admin/rules/{doc}", V)
paragraphs = (rd.get("current") or {}).get("paragraphs") or []
act("POST", f"/admin/rules/{doc}/versions", {"paragraphs": paragraphs + [{"mark": "pending", "text": "Parágrafo pendente da H-SA."}], "note": R}, "regra: versão nova com um [PENDENTE]")

print("== 3. auditoria de tudo o que este roteiro escreveu")
rows = sql(f"select action, count(*), bool_and(actor_id = '{vic_id}'), bool_and(coalesce(payload->>'reason','') <> ''), bool_and(coalesce((payload->>'platform_admin')::boolean, false)) "
           f"from audit_events where created_at > '{t0}' and actor_id = '{vic_id}' group by 1 order by 1")
for r in rows:
    print("  ", r)
print("  eventos novos:", int(sql1("select count(*) from audit_events")) - audit0)
print("  escritas sem evento: ajuste/suspensão/preço/plano/recarga/fila/webhook/saldo/regra =",
      [a for a in ("credits.adjusted", "workspace.suspended", "workspace.reactivated", "admin.catalog_price_versioned", "admin.catalog_homologation_changed",
                   "admin.catalog_for_sale_changed", "admin.plan_versioned", "admin.topup_versioned", "run.requeued_by_support", "run.cancelled_by_support",
                   "payment.webhook_reprocessed", "payment.webhook_reconciled", "admin.provider_balance_reported")
       if a not in {r[0] for r in rows}])
print("  as recusas (409/422) gravaram evento?", sql1(f"select count(*) from audit_events where created_at > '{t0}' and actor_id='{vic_id}' and action='admin.catalog_for_sale_changed'"), "evento(s) de à venda (só 1 aceito)")
for role in ("hellosquad_api", "hellosquad_admin", "authenticated"):
    try:  # sempre com ROLLBACK: nada é apagado de verdade
        sql(f"begin; set local role {role}; delete from audit_events where id = (select id from audit_events where created_at > '{t0}' limit 1); rollback;")
        print(f"  apagar evento como {role}: o DELETE passou (desfeito pelo ROLLBACK) — ATENÇÃO")
    except RuntimeError as e:
        print(f"  apagar evento como {role}:", str(e).splitlines()[0][:100])

print("== 6. segredos e nuvem nas respostas de /admin/* (Vic)")
spec = httpx.get(API + "/openapi.json", timeout=20).json()
QS = {"/admin/quality/compare": "?a_since=2026-09-01&a_until=2026-09-30&b_since=2026-10-01&b_until=2026-10-16", "/admin/squad/versions": "?kind=soul&agent_id=otto",
      "/admin/squad/agents/{agent_id}/prompt": "?route=04.01", "/admin/squad/diff": ""}
blob = []
for p, ops in spec["paths"].items():
    if not p.startswith("/admin") or "get" not in ops:
        continue
    path = p.replace("{workspace_id}", MIOLO).replace("{run_id}", rf).replace("{agent_id}", "otto").replace("{delivery_type}", "04.01").replace("{doc}", "README.md").replace("{doc_id}", doc)
    path = path.replace("{version_id}", sql1("select id from squad_versions where agent_id='otto' and kind='soul' and status='active'"))
    if p == "/admin/squad/diff":
        vid = sql1("select id from squad_versions where agent_id='otto' and kind='soul' and status='active'")
        path += f"?from={vid}&to={vid}"
    s, d = call("GET", path + QS.get(p, ""), V)
    blob.append(json.dumps(d, ensure_ascii=False))
for extra in ("/admin/consumption?workspace_id=" + MIOLO, "/admin/audit?limit=100", "/admin/squad/agents/otto/prompt?route=conversa&draft=true"):
    blob.append(json.dumps(call("GET", extra, V)[1], ensure_ascii=False))
text = "\n".join(blob)
print("  respostas lidas:", len(blob), "| bytes:", len(text))
print("  padrões de chave/segredo encontrados:", secrets_in(text))
for word in ("supabase.co", "railway.app", "vercel.app", "amazonaws", "api.anthropic.com", "asaas.com", "mercadopago.com"):
    if word in text:
        i = text.find(word)
        print(f"  aponta para nuvem? '{word}': ...{text[max(0, i - 60):i + 40]}...")
print("  'configured/missing' nas chaves dos provedores:", sorted({p.get("key") for p in call("GET", "/admin/providers", V)[1].get("providers", [])}))

print("== restauração (versões novas com os valores do seed; nada apagado)")
act("PUT", "/admin/catalog/04.01/for-sale", {"for_sale": False, "reason": "Restauração da H-SA: fora de venda como no seed"}, "04.01 fora de venda")
act("PUT", "/admin/catalog/04.01/price", {"credits": orig["price"]["credits"], "provisional": True, "approved_commercially": False, "reason": "Restauração da H-SA: preço do seed"}, "04.01 preço do seed")
act("PUT", "/admin/catalog/04.01/homologation", {"status": orig["homologation_status"], "reason": "Restauração da H-SA: homologação do seed"}, "04.01 homologação do seed")
act("PUT", "/admin/plans/squad", {"credits": sq["credits"], "cycle": sq["cycle"], "amount": sq["price_amount"], "for_sale": False, "provisional": True, "approved_commercially": False, "reason": "Restauração da H-SA: plano do seed"}, "plano squad do seed")
act("PUT", "/admin/topups/recarga-50", {"credits": tp["credits"], "amount": tp["amount"], "for_sale": False, "provisional": True, "approved_commercially": False, "reason": "Restauração da H-SA: recarga do seed"}, "recarga do seed")
p = subprocess.run(["make", "seed"], cwd=ROOT, env=dict(os.environ, HELLOSQUAD_DB_LOCK_HELD="1"), capture_output=True, text=True, timeout=300)
print("  make seed: exit", p.returncode, "| saldos:", sql("select slug, app.credit_balance(id) from workspaces order by 1"))
s, cat = call("GET", "/admin/catalog", V)
o2 = next(x for x in cat["items"] if x["delivery_type"] == "04.01")
print("  04.01 depois:", o2["homologation_status"], o2["for_sale"], dump(o2["price"], 120))
print("  planos depois:", [(x["slug"], x["credits"], x["for_sale"], x["version"]) for x in call("GET", "/admin/plans", V)[1]["plans"]])
