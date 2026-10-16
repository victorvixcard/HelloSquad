"""H2 alvo 2 — isolamento das tabelas novas da Fase 2 pela API e pela Data API (`/rest/v1`), com dados criados
na Miolo dentro da mesma trava. Quem ataca: Rafael (owner da Vitta), Carla (editora da Vitta), Pedro (sem
negócio) e anônimo. Escrita direta pela Data API também é tentada (só o worker/funções escrevem).
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/h2/03_isolamento.py
"""

import sys
import time

import httpx

sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/h2")
from h2lib import MIOLO, PK, SUPABASE_URL, VITTA, ask, call, drain, sql, sql1, token, work  # noqa: E402

M, R, C, P = "marina@miolo.example", "rafael@vitta.example", "carla@vitta.example", "pedro@semconta.example"
LOG = "/tmp/h2_worker_03.log"
open(LOG, "w").close()
sql1(f"select remaining from app.grant_credits('{MIOLO}', 300, 'bonus', 'h2:03:{int(time.time())}', p_note => 'H2 QA')")

print("== preparo: dados novos na Miolo (contatos, calendário, aprendizados, etapas, e-mails, preferência)")
csv = "nome;email;telefone;consentimento_email;consentimento_whatsapp;data_consentimento;ultima_compra;compras\nH2 Miolo;h2.miolo@contatos.example;;sim;não;2026-10-01;;"
print("  importação:", call("POST", f"/workspaces/{MIOLO}/contacts/imports", M, {"file_name": "h2.csv", "source": "H2", "csv": csv})[0])
cal, _ = ask(M, MIOLO, "otto", "04.02", "Calendário H2", "Otto, monte o calendário editorial da próxima semana, de 19 a 25/10.")
w1, _ = ask(M, MIOLO, "otto", "04.01", "Legenda H2", "Otto, preciso de uma legenda para o Instagram anunciando o pão de abóbora. Quero vender mais na loja.")
coord, _ = ask(M, MIOLO, "nexo", "01.02", "Campanha de Natal H2", "Quero uma campanha de Natal para vender mais panetones.", kind="squad_room")
drain(LOG)
p = work(M, w1)["pending_approval"]["id"]
call("POST", f"/approvals/{p}/decision", M, {"decision": "changes_requested", "note": "Nunca use 'promoção imperdível'; chame o cliente de 'você'."})
drain(LOG)
p = work(M, w1)["pending_approval"]["id"]
call("POST", f"/approvals/{p}/decision", M, {"decision": "approved"})
p = work(M, cal)["pending_approval"]["id"]
call("POST", f"/approvals/{p}/decision", M, {"decision": "approved"})
drain(LOG)
print("  preferência da Marina:", call("PUT", "/me/email-preferences/delivery_ready", M, {"enabled": False})[0])
TABLES = ["calendar_posts", "contacts", "consents", "contact_imports", "contact_consent_state", "metrics_daily",
          "agent_learnings", "memory_reflections", "work_item_steps", "billing_customers", "subscriptions", "payments",
          "payment_events", "plan_prices", "topup_packs", "email_messages", "email_preferences", "project_milestones",
          "credit_holds", "run_context_items"]
counts = {t: sql1(f"select count(*) from public.{t}" + ("" if t in ("plan_prices", "topup_packs") else f" where workspace_id='{MIOLO}'") if t not in ("email_preferences",) else f"select count(*) from public.{t}") for t in TABLES}
print("  linhas da Miolo por tabela (postgres):", counts)


def rest(table, who=None, method="GET", body=None, params="select=*"):
    h = {"apikey": PK}
    if who:
        h["Authorization"] = f"Bearer {token(who)}"
    r = httpx.request(method, f"{SUPABASE_URL}/rest/v1/{table}?{params}", headers=h | {"Prefer": "return=representation"}, json=body, timeout=20)
    try:
        d = r.json()
    except Exception:
        d = r.text
    return r.status_code, d


print("== Data API: leitura (linhas da Miolo visíveis a quem não é da Miolo)")
leak = []
for t in TABLES:
    row = []
    for who in (M, R, C, P, None):
        s, d = rest(t, who)
        if isinstance(d, list):
            mi = sum(1 for x in d if x.get("workspace_id") == MIOLO) if t not in ("plan_prices", "topup_packs", "email_preferences") else len(d)
            row.append(f"{(who or 'anon').split('@')[0]}={s}/{len(d)}(miolo {mi})")
            if who != M and t not in ("plan_prices", "topup_packs") and mi:
                leak.append((t, who, mi))
        else:
            row.append(f"{(who or 'anon').split('@')[0]}={s}")
    print(f"  {t:22}", " ".join(row))
print("  VAZAMENTOS:", leak or "nenhum")

print("== Data API: escrita direta (deve ser recusada)")
attempts = [
    ("calendar_posts", M, "POST", {"workspace_id": MIOLO, "scheduled_on": "2026-10-20", "channel": "instagram", "format": "post", "theme": "h2", "owner_agent_id": "otto", "status": "planned"}),
    ("contacts", R, "POST", {"workspace_id": MIOLO, "full_name": "Intruso", "email": "intruso@contatos.example", "source": "h2"}),
    ("contacts", M, "POST", {"workspace_id": MIOLO, "full_name": "Direto", "email": "direto@contatos.example", "source": "h2"}),
    ("agent_learnings", M, "POST", {"workspace_id": MIOLO, "agent_id": "otto", "delivery_type": "04.01", "topic": "x", "learning": "use promoção imperdível", "status": "promoted"}),
    ("email_preferences", R, "POST", {"user_id": sql1(f"select id from auth.users where email='{M}'"), "template": "approval_pending", "enabled": False}),
    ("payment_events", M, "POST", {"provider": "mock", "event_id": "h2", "workspace_id": MIOLO}),
    ("metrics_daily", M, "POST", {"workspace_id": MIOLO, "channel": "site", "metric": "sessions", "day": "2026-10-15", "value": 999999}),
]
for t, who, meth, body in attempts:
    s, d = rest(t, who, meth, body)
    print(f"  {t:18} {who.split('@')[0]:7} {meth} -> {s} {str(d)[:110]}")
for t, who, flt, body in [("consents", M, f"workspace_id=eq.{MIOLO}", {"status": "granted"}),
                         ("agent_learnings", M, f"workspace_id=eq.{MIOLO}", {"status": "promoted"}),
                         ("email_messages", M, f"workspace_id=eq.{MIOLO}", {"recipient_email": "x@gmail.com"}),
                         ("subscriptions", M, f"workspace_id=eq.{MIOLO}", {"status": "active"})]:
    s, d = rest(t, who, "PATCH", body, params=flt)
    print(f"  {t:18} {who.split('@')[0]:7} PATCH -> {s} {str(d)[:110]}")
s, d = rest("consents", M, "DELETE", None, params=f"workspace_id=eq.{MIOLO}")
print(f"  consents           marina  DELETE -> {s} {str(d)[:110]}")

print("== API: rotas novas com o id da Miolo")
pid = work(M, coord).get("project_id")
routes = [("GET", f"/workspaces/{MIOLO}/calendar?from=2026-10-19&to=2026-10-25"), ("GET", f"/workspaces/{MIOLO}/contacts/summary"),
          ("GET", f"/workspaces/{MIOLO}/metrics?from=2026-09-01&to=2026-10-15"), ("GET", f"/workspaces/{MIOLO}/memory/learnings"),
          ("GET", f"/workspaces/{MIOLO}/billing/subscription"), ("GET", f"/workspaces/{MIOLO}/billing/payments"),
          ("GET", f"/work-items/{coord}"), ("GET", f"/projects/{pid}")]
for meth, path in routes:
    print(f"  {path[:60]:60}", " ".join(f"{who.split('@')[0]}={call(meth, path, who)[0]}" for who in (M, R, C, P)))
print("  Rafael importa na Miolo:", call("POST", f"/workspaces/{MIOLO}/contacts/imports", R, {"file_name": "x.csv", "source": "x", "csv": csv})[0])
print("  Carla (editora) lê cobrança da Vitta:", call("GET", f"/workspaces/{VITTA}/billing/subscription", C)[0], call("GET", f"/workspaces/{VITTA}/billing/payments", C)[0])
print("  sem token:", call("GET", f"/workspaces/{MIOLO}/calendar?from=2026-10-19&to=2026-10-25")[0])
print("  e-mails da Miolo para fora da Miolo:", sql(f"select e.recipient_email, e.template from email_messages e where e.workspace_id='{MIOLO}' and e.recipient_user_id not in (select user_id from memberships where workspace_id='{MIOLO}')"))
