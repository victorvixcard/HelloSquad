"""H-SA alvos 8 e 9 — Consumo, Qualidade, Modelos e Saúde batem com run_steps e o extrato num cenário conhecido (Trilha,
hoje); uma etapa fictícia cara faz a conta cruzar a faixa e o alerta só avisa (nada muda); e-mail da sessão de suporte
chega ao Mailpit no idioma do titular (Marina pt-BR, Rafael en, Juliana es pelo user_metadata.locale, restaurado no fim).
Uso: flock -o -w 1200 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/hsa/05_consumo_email.py
"""

import json
import os
import subprocess
import sys
import time
from decimal import Decimal

import httpx

sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/hsa")
from hsalib import J, M, MIOLO, R, ROOT, TRILHA, V, VITTA, ask, call, drain, dump, sql, sql1  # noqa: E402

LOG = "/tmp/hsa_worker_05.log"
open(LOG, "w").close()
TODAY = sql1("select (now() at time zone 'America/Sao_Paulo')::date")
day = f"(created_at at time zone 'America/Sao_Paulo')::date = '{TODAY}'"
sql1(f"select remaining from app.grant_credits('{TRILHA}', 100, 'bonus', 'hsa:05:{int(time.time())}', p_note => 'H-SA QA')")
prov0 = next(p for p in call("GET", "/admin/providers", V)[1]["items"] if p["provider"] == "anthropic")

print("== A. cenário conhecido na Trilha (hoje,", TODAY, "): duas legendas do Otto, uma aprovada de primeira, outra com ajuste")
w1, _ = ask(J, TRILHA, "otto", "04.01", "Legenda H-SA 1", "Otto, preciso de uma legenda para o Instagram anunciando a trilha do fim de semana. Quero mais inscrições.")
w2, _ = ask(J, TRILHA, "otto", "04.01", "Legenda H-SA 2", "Otto, preciso de uma legenda para o Instagram anunciando o passeio noturno. Quero mais inscrições.")
print("  worker:", drain(LOG))
p1 = call("GET", f"/work-items/{w1}", J)[1]["pending_approval"]["id"]
p2 = call("GET", f"/work-items/{w2}", J)[1]["pending_approval"]["id"]
print("  aprovar 1:", call("POST", f"/approvals/{p1}/decision", J, {"decision": "approved"})[0],
      "| ajuste na 2:", call("POST", f"/approvals/{p2}/decision", J, {"decision": "changes_requested", "note": "Chame de 'você' e cite o ponto de encontro."})[0])
print("  worker:", drain(LOG))
p2b = call("GET", f"/work-items/{w2}", J)[1]["pending_approval"]["id"]
print("  aprovar a v2:", call("POST", f"/approvals/{p2b}/decision", J, {"decision": "approved"})[0])
drain(LOG)

truth = {
    "requests": sql1(f"select count(*) from work_items where workspace_id='{TRILHA}' and {day}"),
    "credits_charged": sql1(f"select coalesce(-sum(amount), 0) from credit_ledger where workspace_id='{TRILHA}' and entry_type='capture' and {day}"),
    "llm_calls": sql1(f"select count(*) from run_steps s join runs r on r.id=s.run_id where r.workspace_id='{TRILHA}' and s.kind in ('llm_call','check') and (r.created_at at time zone 'America/Sao_Paulo')::date = '{TODAY}'"),
    "ai_cost_usd": sql1(f"select coalesce(sum(s.cost_usd), 0) from run_steps s join runs r on r.id=s.run_id where r.workspace_id='{TRILHA}' and (r.created_at at time zone 'America/Sao_Paulo')::date = '{TODAY}'"),
    "input_tokens": sql1(f"select coalesce(sum(s.input_tokens), 0) from run_steps s join runs r on r.id=s.run_id where r.workspace_id='{TRILHA}' and (r.created_at at time zone 'America/Sao_Paulo')::date = '{TODAY}'"),
    "output_tokens": sql1(f"select coalesce(sum(s.output_tokens), 0) from run_steps s join runs r on r.id=s.run_id where r.workspace_id='{TRILHA}' and (r.created_at at time zone 'America/Sao_Paulo')::date = '{TODAY}'"),
    "turns": sql1(f"select count(distinct r.id) from runs r join run_steps s on s.run_id=r.id and s.kind in ('llm_call','check') where r.workspace_id='{TRILHA}' and (r.created_at at time zone 'America/Sao_Paulo')::date = '{TODAY}'"),
}
s, cons = call("GET", f"/admin/consumption?workspace_id={TRILHA}&since={TODAY}&until={TODAY}", V)
item = (cons.get("items") or [{}])[0]
print("  verdade (SQL nas tabelas cruas):", truth)
print("  API /admin/consumption:        ", {k: item.get(k) for k in truth})
diff = {k: (truth[k], item.get(k)) for k in truth if Decimal(str(truth[k])) != Decimal(str(item.get(k) or 0))}
print("  diferenças:", diff or "nenhuma")
s, q = call("GET", f"/admin/quality?since={TODAY}&until={TODAY}", V)
print("  qualidade 04.01 hoje:", [{k: x.get(k) for k in ("key", "deliveries", "approved_first_time", "adjustments", "not_approved", "ai_cost_per_approved_usd", "agent_errors", "failed_steps")} for x in q.get("by_type", []) if x.get("key") == "04.01"])
cost_approved = sql1(f"select round(coalesce(sum(s.cost_usd),0) / 2, 6) from run_steps s join runs r on r.id=s.run_id where r.work_item_id in ('{w1}','{w2}')")
print("  verdade: 2 entregas, 1 aprovada de primeira, 1 ajuste, 0 não aprovada, custo por aprovada", cost_approved)
s, mo = call("GET", f"/admin/models?since={TODAY}&until={TODAY}", V)
print("  modelos hoje (custo por modelo):", [(x.get("model"), x.get("calls"), x.get("cost_usd")) for x in mo.get("costs_by_model", [])],
      "| SQL:", sql(f"select s.model, count(*) filter (where s.kind in ('llm_call','check')), sum(s.cost_usd) from run_steps s join runs r on r.id=s.run_id where (r.created_at at time zone 'America/Sao_Paulo')::date = '{TODAY}' group by 1"))
prov1 = next(p for p in call("GET", "/admin/providers", V)[1]["items"] if p["provider"] == "anthropic")
print("  saúde Anthropic: chamadas 24h", prov0.get("calls_24h"), "->", prov1.get("calls_24h"), "| gasto 24h", (prov0.get("spend_usd") or {}).get("h24"), "->", (prov1.get("spend_usd") or {}).get("h24"))

print("== B. etapa fictícia cara na Trilha: o alerta cruza a faixa e só avisa")
rid = sql1(f"select id from runs where work_item_id='{w1}' order by created_at limit 1")
fp = lambda: sql(f"select app.credit_balance('{TRILHA}'), (select count(*) from workspaces where id='{TRILHA}' and suspended_at is null), (select string_agg(slug,',') from plans where for_sale), (select count(*) from provider_health)")  # noqa: E731
before = fp()
step = sql1(f"insert into run_steps (run_id, workspace_id, seq, kind, model, input_tokens, output_tokens, cost_usd, status) values ('{rid}', '{TRILHA}', (select coalesce(max(seq), 0) + 100 from run_steps where run_id='{rid}'), 'llm_call', 'claude-opus-5-5', 1000, 1000, 5.000000, 'succeeded') returning id")
s, cons = call("GET", f"/admin/consumption?workspace_id={TRILHA}&since={TODAY}&until={TODAY}", V)
item = (cons.get("items") or [{}])[0]
print("  IA por crédito (R$):", item.get("economics", {}).get("ai_cost_per_credit_brl"), "| alertas da conta:", [(a.get("metric"), a.get("proposal"), a.get("threshold")) for a in item.get("economics", {}).get("alerts", [])])
s, al = call("GET", "/admin/alerts", V)
print("  /admin/alerts contas:", [(a.get("workspace_name"), [x.get("metric") for x in a.get("alerts", [])]) for a in al.get("accounts", [])], "| faixas proposta:", all(r.get("proposal") for r in al.get("alert_rules", [])))
print("  nada mudou por causa do alerta:", before == fp())
sql(f"delete from run_steps where id='{step}'")
print("  etapa fictícia removida; alertas da Trilha agora:", [a.get("workspace_name") for a in call("GET", "/admin/alerts", V)[1].get("accounts", [])])

print("== C. e-mail da sessão de suporte no idioma do titular (Mailpit)")
meta = {e: sql1(f"select raw_user_meta_data::text from auth.users where email='{e}'") for e in (R, J)}
sql(f"update auth.users set raw_user_meta_data = raw_user_meta_data || '{{\"locale\": \"en\"}}'::jsonb where email='{R}'")
sql(f"update auth.users set raw_user_meta_data = raw_user_meta_data || '{{\"locale\": \"es\"}}'::jsonb where email='{J}'")
t_mail = time.time()
for ws, label in ((MIOLO, "Miolo"), (VITTA, "Vitta"), (TRILHA, "Trilha")):
    s, d = call("POST", f"/admin/accounts/{ws}/support-session", V, {"reason": f"Conferência do e-mail de suporte na {label} (H-SA)", "duration_minutes": 15})
    print(f"  sessão na {label}:", s, "| e-mail na fila:", sql1(f"select locale||' '||status::text from email_messages where workspace_id='{ws}' and template='support_session_started' order by created_at desc limit 1"))
    call("DELETE", f"/admin/accounts/{ws}/support-session", V)
print("  worker:", drain(LOG))
msgs = httpx.get("http://127.0.0.1:56324/api/v1/messages?limit=60", timeout=20).json().get("messages", [])
for who in (M, R, J):
    got = [m for m in msgs if any(t["Address"] == who for t in m["To"]) and any(w in m["Subject"] for w in ("suporte", "support", "soporte"))]
    if got:
        m = got[0]
        body = httpx.get(f"http://127.0.0.1:56324/api/v1/message/{m['ID']}", timeout=20).json().get("Text", "")
        print(f"  {who}: '{m['Subject']}' | {m['Created'][:19]} | corpo: {body.strip().splitlines()[0][:110] if body.strip() else ''} | motivo no corpo: {'(H-SA)' in body}")
    else:
        print(f"  {who}: nenhum e-mail de suporte no Mailpit")
for e, m in meta.items():
    sql(f"update auth.users set raw_user_meta_data = $${m}$$::jsonb where email='{e}'")
print("  user_metadata de Rafael e Juliana restaurados:", all(sql1(f"select raw_user_meta_data::text from auth.users where email='{e}'") == m for e, m in meta.items()))
p = subprocess.run(["make", "seed"], cwd=ROOT, env=dict(os.environ, HELLOSQUAD_DB_LOCK_HELD="1"), capture_output=True, text=True, timeout=300)
print("  make seed:", p.returncode, "| saldos:", sql("select slug, app.credit_balance(id) from workspaces order by 1"))
