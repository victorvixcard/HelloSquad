"""H-SA alvo 2 (complemento) — no 02, 11 escritas voltaram 422 porque o corpo não batia com o contrato (a guarda não
chegou a ser exercida). Aqui as mesmas, com corpo válido, durante uma sessão de suporte aberta na Miolo; mais a fila de
e-mail da sessão, as chaves do payload da auditoria, seis aberturas em paralelo e o `make seed` diante do negócio que o
Vic criou no 02 (POST /workspaces é do produto, vale para qualquer autenticado).
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/hsa/02b_suporte_escritas.py
"""

import os
import subprocess
import sys
import threading

sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/hsa")
from hsalib import MIOLO, ROOT, V, call, dump, sql, sql1  # noqa: E402

W = MIOLO
conv = sql1(f"select id from conversations where workspace_id='{W}' order by created_at limit 1")
msg = sql1(f"select id from messages where workspace_id='{W}' and author_type='user' order by created_at limit 1") or \
    sql1(f"select id from messages where workspace_id='{W}' order by created_at limit 1")
appr = sql1(f"select id from approvals where workspace_id='{W}' order by created_at limit 1")
fact = sql1(f"select id from brand_facts where workspace_id='{W}' order by created_at limit 1")
sugg = sql1(f"select id from memory_suggestions where workspace_id='{W}' order by created_at limit 1")
proj = sql1(f"select id from projects where workspace_id='{W}' order by created_at limit 1")
print("ids da Miolo:", {"conversa": bool(conv), "mensagem": bool(msg), "aprovação": bool(appr), "fato": bool(fact), "sugestão": bool(sugg), "projeto": bool(proj)})
CASES = [
    ("PATCH", f"/workspaces/{W}", {"locale": "en"}),
    ("POST", f"/workspaces/{W}/conversations", {"kind": "agent_direct", "primary_agent_id": "otto"}),
    ("POST", f"/conversations/{conv}/read", None),
    ("POST", f"/conversations/{conv}/messages", {"body": "Mensagem escrita pelo suporte (H-SA)."}),
    ("POST", f"/messages/{msg}/reply", None),
    ("POST", f"/workspaces/{W}/projects", {"name": "Projeto do suporte H-SA", "owner_agent_id": "nexo", "participants": []}),
    ("POST", f"/messages/{msg}/work-items", {"delivery_type": "04.01", "title": "Trabalho do suporte H-SA", "briefing": {}}),
    ("POST", f"/approvals/{appr}/decision", {"decision": "approved"}),
    ("POST", f"/approvals/{appr}/defer", {}),
    ("POST", f"/memory/facts/{fact}/correct", {"content": "Corrigido pelo suporte H-SA"}),
    ("POST", f"/memory/facts/{fact}/state", {"action": "stop_using"}),
    ("POST", f"/workspaces/{W}/memory/facts", {"area": "brand", "content": "Fato do suporte H-SA"}),
    ("PUT", f"/workspaces/{W}/memory/profile", {"description": "Perfil escrito pelo suporte H-SA"}),
    ("POST", "/credits/estimate", {"workspace_id": W, "delivery_type": "04.01"}),
    ("POST", f"/workspaces/{W}/contacts/imports", {"file_name": "s.csv", "source": "H-SA", "csv": "nome;email;telefone;consentimento_email;consentimento_whatsapp;data_consentimento;ultima_compra;compras\nH-SA;hsa@contatos.example;;sim;não;2026-10-01;;"}),
    ("POST", f"/workspaces/{W}/contacts/consents/revocations", {"email": "hsa@contatos.example", "source": "H-SA"}),
]
if sugg:
    CASES.append(("POST", f"/memory/suggestions/{sugg}/decision", {"decision": "confirm"}))
    CASES.append(("POST", f"/memory/suggestions/{sugg}/seen", None))
if proj:
    CASES.append(("PATCH", f"/projects/{proj}", {"name": "Renomeado pelo suporte"}))
    CASES.append(("POST", f"/projects/{proj}/milestones", {"title": "Marco do suporte", "kind": "milestone"}))
TABLES = ["conversations", "messages", "work_items", "projects", "project_milestones", "approvals", "brand_facts", "brand_profiles",
          "memory_suggestions", "contacts", "contact_imports", "conversation_reads", "runs", "credit_holds", "consents"]


def fp():
    d = {t: sql1(f"select count(*)||':'||coalesce(max(updated_at)::text, max(created_at)::text, '') from public.{t} where workspace_id='{W}'")
         if sql1(f"select count(*) from information_schema.columns where table_schema='public' and table_name='{t}' and column_name='updated_at'") == "1"
         else sql1(f"select count(*)::text from public.{t} where workspace_id='{W}'") for t in TABLES}
    d["workspace"] = sql1(f"select locale from workspaces where id='{W}'")
    d["approval_states"] = sql1(f"select string_agg(status::text, ',' order by id) from approvals where workspace_id='{W}'")
    d["fact_states"] = sql1(f"select string_agg(state::text, ',' order by id) from brand_facts where workspace_id='{W}'")
    return d


sql("update support_access_log set ended_at = now() where ended_at is null and expires_at > now()")
s, ses = call("POST", f"/admin/accounts/{W}/support-session", V, {"reason": "Escritas com corpo válido (H-SA)", "duration_minutes": 15})
print("sessão aberta:", s)
before = fp()
hist = {}
for m, p, body in CASES:
    s, d = call(m, p, V, body)
    code = d.get("error", {}).get("code") if isinstance(d, dict) and isinstance(d.get("error"), dict) else ""
    hist[f"{s} {code}"] = hist.get(f"{s} {code}", 0) + 1
    print(f"  {m} {p.replace(W, '<miolo>')[:60]}: {s} {code or dump(d, 80)}")
after = fp()
print("resumo:", hist)
print("Miolo antes == depois:", before == after, "" if before == after else {k: (before[k], after[k]) for k in before if before[k] != after[k]})
call("DELETE", f"/admin/accounts/{W}/support-session", V)

print("== payload da auditoria e e-mail da sessão")
print("  chaves do payload de support.session_started:", sql1("select string_agg(k, ',') from (select jsonb_object_keys(payload) k from audit_events where action='support.session_started' order by created_at desc limit 20) x"))
print("  e-mails da sessão:", sql("select template::text, locale, status::text, recipient_email, count(*) from email_messages where template::text like 'support%' group by 1,2,3,4"))
print("  fila email_outbox (pgmq):", sql1("select count(*) from pgmq.q_email_outbox"))
s, det = call("GET", f"/admin/accounts/{W}", V)
print("  chaves de support_accesses no detalhe:", sorted((det.get("support_accesses") or [{}])[0].keys()))

print("== seis aberturas em paralelo")
res = []


def open_session():
    res.append(call("POST", f"/admin/accounts/{W}/support-session", V, {"reason": "Abertura paralela da H-SA", "duration_minutes": 15})[0])


ts = [threading.Thread(target=open_session) for _ in range(6)]
[t.start() for t in ts]
[t.join() for t in ts]
print("  status:", sorted(res), "| abertas no banco:", sql1(f"select count(*) from support_access_log where workspace_id='{W}' and ended_at is null and expires_at>now()"))
call("DELETE", f"/admin/accounts/{W}/support-session", V)
print("  abertas depois do DELETE:", sql1("select count(*) from support_access_log where ended_at is null and expires_at>now()"))

print("== negócio criado pelo Vic no 02 (POST /workspaces) diante do make seed")
print("  antes do seed:", sql("select w.slug, (select count(*) from memberships m where m.workspace_id=w.id) from workspaces w where w.slug='suporte-hsa'"))
p = subprocess.run(["make", "seed"], cwd=ROOT, env=dict(os.environ, HELLOSQUAD_DB_LOCK_HELD="1"), capture_output=True, text=True, timeout=300)
print("  make seed: exit", p.returncode)
print("  depois do seed:", sql("select w.slug, (select count(*) from memberships m where m.workspace_id=w.id) from workspaces w where w.slug='suporte-hsa'"))
s, acc = call("GET", "/admin/accounts?limit=50", V)
print("  Contas no painel depois do seed:", [a.get("name") for a in acc.get("items", [])], "| totais:", dump(acc.get("totals"), 120))
