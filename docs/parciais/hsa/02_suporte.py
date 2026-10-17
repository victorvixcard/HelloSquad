"""H-SA alvo 2 — o papel privilegiado não vaza e a sessão de suporte é só leitura, com prazo.
A. Vic SEM sessão: as 30 rotas GET do produto com os ids reais da Miolo e da Vitta (nada de 200 com dado).
B. Vic COM sessão na Miolo: GET da Miolo 200; GET da Vitta continua fechado; 27 escritas do produto na Miolo (corpo
   válido) recusadas e nada gravado; rotas só do owner fechadas; segunda sessão 409; motivo e duração inválidos 422.
C. Encerrar (DELETE) → a próxima leitura já é 403. D. Expirar (expires_at no passado, como o relógio faria) → 403.
E. Auditoria e support_access_log da sessão; e-mail na fila para a titular. F. Duas aberturas em paralelo.
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/hsa/02_suporte.py
"""

import json
import sys
import threading
import uuid

import httpx

sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/hsa")
from hsalib import API, M, MIOLO, V, VITTA, call, dump, sql, sql1, token  # noqa: E402


def ids(ws):
    one = lambda q: sql1(q.replace("$W", ws))  # noqa: E731
    return {
        "workspace_id": ws,
        "conversation_id": one("select id from conversations where workspace_id='$W' order by created_at limit 1"),
        "work_item_id": one("select id from work_items where workspace_id='$W' order by created_at limit 1"),
        "project_id": one("select id from projects where workspace_id='$W' order by created_at limit 1") or str(uuid.uuid4()),
        "run_id": one("select id from runs where workspace_id='$W' order by created_at limit 1") or str(uuid.uuid4()),
        "fact_id": one("select id from brand_facts where workspace_id='$W' order by created_at limit 1") or str(uuid.uuid4()),
        "message_id": one("select id from messages where workspace_id='$W' order by created_at limit 1"),
        "approval_id": one("select id from approvals where workspace_id='$W' order by created_at limit 1") or str(uuid.uuid4()),
        "suggestion_id": one("select id from memory_suggestions where workspace_id='$W' order by created_at limit 1") or str(uuid.uuid4()),
        "conflict_id": one("select id from memory_conflicts where workspace_id='$W' order by created_at limit 1") or str(uuid.uuid4()),
        "learning_id": str(uuid.uuid4()),
        "milestone_id": one("select id from project_milestones where workspace_id='$W' order by created_at limit 1") or str(uuid.uuid4()),
        "template": "delivery_ready", "provider": "mock",
    }


spec = httpx.get(API + "/openapi.json", timeout=20).json()
GETS, WRITES = [], []
for p, ops in spec["paths"].items():
    if p.startswith("/admin") or p == "/health":
        continue
    for m in ops:
        (GETS if m == "get" else WRITES).append((m.upper(), p))


def fill(p, ws_ids):
    for k, v in ws_ids.items():
        p = p.replace("{" + k + "}", str(v))
    return p


QS = {"/workspaces/{workspace_id}/memory/search": "?q=forno", "/workspaces/{workspace_id}/metrics": ""}
WBODY = {
    "POST /workspaces": {"name": "Suporte H-SA", "slug": "suporte-hsa"},
    "PATCH /workspaces/{workspace_id}": {"locale": "en"},
    "POST /workspaces/{workspace_id}/conversations": {"kind": "agent_direct", "primary_agent_id": "otto"},
    "POST /conversations/{conversation_id}/read": {},
    "POST /conversations/{conversation_id}/messages": {"body": "Mensagem escrita pelo suporte (H-SA)."},
    "POST /messages/{message_id}/reply": {},
    "POST /workspaces/{workspace_id}/projects": {"title": "Projeto do suporte H-SA"},
    "POST /messages/{message_id}/work-items": {"delivery_type": "04.01", "title": "Trabalho do suporte H-SA"},
    "PATCH /projects/{project_id}": {"title": "Renomeado pelo suporte"},
    "PUT /projects/{project_id}/participants": {"agent_ids": ["otto"]},
    "POST /projects/{project_id}/milestones": {"title": "Marco do suporte"},
    "PATCH /milestones/{milestone_id}": {"status": "done"},
    "POST /approvals/{approval_id}/decision": {"decision": "approved"},
    "POST /approvals/{approval_id}/defer": {},
    "POST /approvals/{approval_id}/resume": {},
    "POST /memory/suggestions/{suggestion_id}/decision": {"decision": "confirm"},
    "POST /memory/facts/{fact_id}/correct": {"content": "Corrigido pelo suporte H-SA"},
    "POST /memory/conflicts/{conflict_id}/resolve": {"keep": "a"},
    "POST /memory/facts/{fact_id}/state": {"state": "inactive"},
    "POST /workspaces/{workspace_id}/memory/facts": {"area": "marca", "subject": "tom", "content": "Fato do suporte H-SA"},
    "POST /memory/suggestions/{suggestion_id}/seen": {},
    "PUT /workspaces/{workspace_id}/memory/profile": {"profile": {"objetivo": "suporte"}},
    "POST /memory/learnings/{learning_id}/decision": {"decision": "promote"},
    "POST /credits/estimate": {"workspace_id": MIOLO, "delivery_type": "04.01"},
    "POST /workspaces/{workspace_id}/contacts/imports": {"file_name": "s.csv", "source": "H-SA", "csv": "nome;email\nA;a@b.example"},
    "POST /workspaces/{workspace_id}/contacts/consents/revocations": {"email": "a@b.example"},
    "PUT /me/email-preferences/{template}": {"enabled": False},
}
MIOLO_FP = ["conversations", "messages", "work_items", "projects", "project_milestones", "approvals", "brand_facts",
            "memory_suggestions", "contacts", "contact_imports", "conversation_reads", "runs", "credit_holds", "consents"]


def fp(ws):
    out = {t: sql1(f"select count(*) from public.{t} where workspace_id='{ws}'") for t in MIOLO_FP}
    out["workspace"] = sql1(f"select name||'|'||locale||'|'||coalesce(suspended_at::text,'') from workspaces where id='{ws}'")
    out["email_prefs_vic"] = sql1("select count(*) from email_preferences e join auth.users u on u.id=e.user_id where u.email='vic@hellosquad.example'")
    out["workspaces_total"] = sql1("select count(*) from workspaces")
    return out


def sweep_gets(ws_ids, label):
    hist, data200 = {}, []
    for _, p in GETS:
        s, d = call("GET", fill(p, ws_ids) + QS.get(p, ""), V)
        code = d.get("error", {}).get("code") if isinstance(d, dict) and isinstance(d.get("error"), dict) else ""
        hist[f"{s} {code}".strip()] = hist.get(f"{s} {code}".strip(), 0) + 1
        if s == 200:
            data200.append(p)
        if s >= 500:
            print(f"   500 em {p}: {dump(d, 160)}")
    print(f"  {label}: {hist}")
    return data200


mi, vi = ids(MIOLO), ids(VITTA)
sql("update support_access_log set ended_at = now() where ended_at is null and expires_at > now()")  # nenhuma sessão aberta antes
print("== A. Vic sem sessão de suporte")
s, me = call("GET", "/me", V)
print("  GET /me:", s, "memberships =", dump(me.get("memberships") if isinstance(me, dict) else me, 120))
s, wl = call("GET", "/workspaces", V)
print("  GET /workspaces:", s, dump(wl, 120))
ok_miolo = sweep_gets(mi, "Miolo, sem sessão")
print("    GET 200 sem sessão (só valem /me, /workspaces e /me/email-preferences, sem dado da Miolo):", ok_miolo)
sweep_gets(vi, "Vitta, sem sessão")

print("== B. Vic com sessão de suporte na Miolo")
before = fp(MIOLO)
aud0 = int(sql1("select count(*) from audit_events"))
for body in ({"reason": "curto", "duration_minutes": 15}, {"reason": "          espaços          ", "duration_minutes": 15},
             {"reason": "Motivo válido da H-SA", "duration_minutes": 120}, {"reason": "Motivo válido da H-SA", "duration_minutes": 0},
             {"reason": "x" * 501, "duration_minutes": 15}):
    s, d = call("POST", f"/admin/accounts/{MIOLO}/support-session", V, body)
    print(f"  abrir com {dump(body, 60)}: {s} {dump(d, 100)}")
s, ses = call("POST", f"/admin/accounts/{MIOLO}/support-session", V, {"reason": "Conferência pedida pela titular (H-SA)", "duration_minutes": 15})
print("  abrir (15 min):", s, dump(ses, 220))
s, d = call("POST", f"/admin/accounts/{MIOLO}/support-session", V, {"reason": "Segunda sessão em paralelo (H-SA)", "duration_minutes": 30})
print("  abrir de novo com uma aberta:", s, dump(d, 120))
ok = sweep_gets(mi, "Miolo, com sessão")
print("    GET 200 na Miolo com sessão:", len(ok), "de", len(GETS))
closed = [p for _, p in GETS if p not in ok]
print("    GET da Miolo que continuam fechados com sessão:", closed)
leak_v = sweep_gets(vi, "Vitta (sem sessão), enquanto a da Miolo está aberta")
print("    GET 200 na Vitta:", leak_v)
s, d = call("GET", f"/workspaces/{MIOLO}/conversations", V)
print("  conteúdo lido (conversas da Miolo):", s, len(d.get("items", d) if isinstance(d, dict) else d) if s == 200 else dump(d, 100))
print("  escritas do produto na Miolo, com sessão aberta:")
wh = {}
for m, p in WRITES:
    if p.startswith("/billing/webhooks"):
        continue
    s, d = call(m, fill(p, mi), V, WBODY.get(f"{m} {p}", {}))
    code = d.get("error", {}).get("code") if isinstance(d, dict) and isinstance(d.get("error"), dict) else ""
    wh[f"{s} {code}"] = wh.get(f"{s} {code}", 0) + 1
    if s < 400 or s >= 500:
        print(f"   ATENÇÃO {m} {p}: {s} {dump(d, 160)}")
print("   ", wh)
after = fp(MIOLO)
print("  Miolo antes == depois das escritas do suporte:", before == after, "" if before == after else {k: (before[k], after[k]) for k in before if before[k] != after[k]})

print("== C. encerrar e ler de novo")
s, d = call("DELETE", f"/admin/accounts/{MIOLO}/support-session", V)
print("  DELETE:", s, dump(d, 200))
s, d = call("GET", f"/workspaces/{MIOLO}/conversations", V)
print("  GET conversas logo depois:", s, dump(d, 120))
s, d = call("DELETE", f"/admin/accounts/{MIOLO}/support-session", V)
print("  DELETE de novo:", s, dump(d, 120))

print("== D. expirar (expires_at no passado) e ler")
s, ses2 = call("POST", f"/admin/accounts/{MIOLO}/support-session", V, {"reason": "Sessão para testar o prazo (H-SA)", "duration_minutes": 15})
print("  abrir:", s, dump(ses2, 120))
s, d = call("GET", f"/workspaces/{MIOLO}/work-items", V)
print("  GET trabalhos dentro do prazo:", s)
# o relógio andando: o gatilho só deixa gravar o fim; a simulação desliga os gatilhos só neste UPDATE (superusuário)
sql(f"set session_replication_role = replica; update support_access_log set expires_at = now() - interval '1 second', started_at = now() - interval '16 minutes' where id = '{ses2['id']}'; set session_replication_role = origin")
s, d = call("GET", f"/workspaces/{MIOLO}/work-items", V)
print("  GET trabalhos depois do prazo:", s, dump(d, 120))
s, det = call("GET", f"/admin/accounts/{MIOLO}", V)
sa = det.get("support_accesses", []) if isinstance(det, dict) else []
print("  detalhe da conta: sessões mostradas =", [(x.get("status"), x.get("reason", "")[:30]) for x in sa[:3]])
s, d = call("DELETE", f"/admin/accounts/{MIOLO}/support-session", V)
print("  DELETE depois do prazo:", s, dump(d, 120))
s, d = call("POST", f"/admin/accounts/{MIOLO}/support-session", V, {"reason": "Reabrir depois de expirar (H-SA)", "duration_minutes": 15})
print("  reabrir depois de expirar:", s, dump(d, 100))
call("DELETE", f"/admin/accounts/{MIOLO}/support-session", V)

print("== E. auditoria e support_access_log")
for r in sql("select action, actor_id is not null, payload->>'reason', payload->>'duration_minutes', coalesce(payload->>'ended_early',''), (payload->>'platform_admin') from audit_events "
             f"where workspace_id='{MIOLO}' and action like 'support.session%' order by created_at desc limit 6"):
    print("  ", r)
print("  eventos novos na auditoria neste bloco:", int(sql1("select count(*) from audit_events")) - aud0)
for r in sql(f"select reason, mode, (expires_at - started_at)::text, ended_at is not null from support_access_log where workspace_id='{MIOLO}' order by created_at desc limit 4"):
    print("  log:", r)
print("  e-mails support_session_started na fila/enviados à titular:", sql("select template, locale, status, count(*) from email_messages where template like 'support%' group by 1,2,3"))

print("== F. duas aberturas em paralelo")
res = []


def open_session():
    res.append(call("POST", f"/admin/accounts/{MIOLO}/support-session", V, {"reason": "Abertura paralela da H-SA", "duration_minutes": 15})[0])


ts = [threading.Thread(target=open_session) for _ in range(6)]
[t.start() for t in ts]
[t.join() for t in ts]
print("  status das 6 aberturas paralelas:", sorted(res), "| abertas no banco:",
      sql1(f"select count(*) from support_access_log where workspace_id='{MIOLO}' and ended_at is null and expires_at>now()"))
call("DELETE", f"/admin/accounts/{MIOLO}/support-session", V)
print("  abertas depois do DELETE:", sql1("select count(*) from support_access_log where ended_at is null and expires_at>now()"))
