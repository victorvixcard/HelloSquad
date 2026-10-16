"""H2 alvo 1 (API) — critério da Fase 2 em modo simulado, sobre a Vitta (Rafael owner, Carla editor), um tenant
que as fatias não usaram nos roteiros: seis personas com delivery real (Nexo pelo projeto coordenado), projeto
Bia -> Kaia(stub) -> Otto com responsável por etapa, créditos por delivery e por etapa, consentimento do CSV.
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/h2/01_criterio_api.py
"""

import concurrent.futures as cf
import sys
import time

sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/h2")
from h2lib import VITTA, ask, call, credits, drain, dump, sql, sql1, work  # noqa: E402

R, C = "rafael@vitta.example", "carla@vitta.example"
LOG = "/tmp/h2_worker_criterio.log"
open(LOG, "w").close()

print("== 0. preparo: bônus local de 300 na Vitta (make seed devolve o saldo)")
print("  bônus:", sql1(f"select remaining from app.grant_credits('{VITTA}', 300, 'bonus', 'h2:criterio:{int(time.time())}', p_note => 'H2 QA')"))
B0 = float(sql1(f"select app.credit_balance('{VITTA}')"))
print("  saldo antes:", B0)

print("== 1. importação de CSV (Max) com linhas adversárias")
csv = "\n".join([
    "nome;email;telefone;consentimento_email;consentimento_whatsapp;data_consentimento;ultima_compra;compras",
    "Ana Valida;ana.valida@contatos.example;+55 27 99999-0101;sim;não;2026-10-01;2026-09-20;2",
    "Sem Consent;sem.consent@contatos.example;;não;não;;;",
    "Ana Dup Caixa;ANA.VALIDA@Contatos.Example;;sim;não;2026-10-01;;",
    "Fora Sufixo;fora@contatos.example.com;;sim;não;2026-10-01;;",
    "Real;alguem@gmail.com;;sim;sim;2026-10-01;;",
    "Sem Data;sem.data@contatos.example;;sim;não;;;",
    "Zap Sem Fone;zap@contatos.example;;não;sim;2026-10-01;;",
    "Outro Tenant;cliente01@contatos.example;;sim;não;2026-10-01;;",
    "=HYPERLINK(\"http://x.example\");formula@contatos.example;;sim;não;2026-10-01;;",
])
s, imp = call("POST", f"/workspaces/{VITTA}/contacts/imports", R, {"file_name": "h2.csv", "source": "Planilha H2", "csv": csv})
print("  status:", s, dump(imp, 900))
rows = sql(f"select c.email, coalesce(string_agg(k.channel||':'||k.status, ',' order by k.channel), '-') from contacts c left join consents k on k.contact_id=c.id where c.workspace_id='{VITTA}' and c.import_id is not null group by c.email order by c.email")
print("  contatos gravados na Vitta por importação:", rows)
s2, imp2 = call("POST", f"/workspaces/{VITTA}/contacts/imports", C, {"file_name": "h2b.csv", "source": "Planilha H2", "csv": csv})
print("  editor (Carla) importa:", s2, dump(imp2, 160))

print("== 2. seis pedidos na Vitta: Bia 02.01, Otto 04.02, Kiwi 05.01, Max 06.03, Íris 07.02 + Nexo 01.02 (Sala)")
W = {}
W["bia"] = ask(R, VITTA, "bia", "02.01", "Diagnóstico da Vitta", "Bia, quero um diagnóstico do marketing da Vitta. O objetivo é lotar a agenda de novembro.")[0]
W["otto"] = ask(R, VITTA, "otto", "04.02", "Calendário da semana 43", "Otto, monte o calendário editorial da próxima semana, de 19 a 25/10.")[0]
W["kiwi"] = ask(R, VITTA, "kiwi", "05.01", "Plano de mídia", "Kiwi, quanto investir em anúncios em novembro? Quero mais agendamentos e tenho até R$ 1.000 por mês.")[0]
W["max"] = ask(R, VITTA, "max", "06.03", "Segmentos da base", "Max, organize minha base de clientes em segmentos.")[0]
W["iris"] = ask(R, VITTA, "iris", "07.02", "Análise do mês", "Íris, analise meus últimos resultados.")[0]
W["nexo"], ROOM = ask(R, VITTA, "nexo", "01.02", "Campanha de fim de ano", "Quero uma campanha de fim de ano para lotar a agenda de dezembro.", kind="squad_room")
print("  worker:", drain(LOG))
for a, wid in W.items():
    w = work(R, wid)
    d = (w.get("deliveries") or [{}])[0]
    vs = d.get("versions") or []
    print(f"  {a:5} {w['delivery_type']} status={w['status']} label={w.get('status_label')!r} versões={len(vs)} kind={d.get('kind')}")
    print(f"        {credits(wid)}")

print("== 3. decisão: a editora não decide; o owner aprova (12 chamadas concorrentes na da Bia)")
ap = work(R, W["bia"])["pending_approval"]["id"]
print("  Carla aprova:", call("POST", f"/approvals/{ap}/decision", C, {"decision": "approved"})[0])
with cf.ThreadPoolExecutor(12) as ex:
    res = list(ex.map(lambda _: call("POST", f"/approvals/{ap}/decision", R, {"decision": "approved"})[0], range(12)))
print("  Rafael x12:", sorted(set(res)), "eventos approval.decided:", sql1(f"select count(*) from audit_events where entity_id='{ap}' and action='approval.decided'"))
for a in ("otto", "kiwi", "max", "iris"):
    p = work(R, W[a]).get("pending_approval")
    if p:
        print(f"  aprova {a}:", call("POST", f"/approvals/{p['id']}/decision", R, {"decision": "approved"})[0], work(R, W[a])["status"])
    else:
        print(f"  {a}: sem pendência ({work(R, W[a])['status']})")
cal = call("GET", f"/workspaces/{VITTA}/calendar?from=2026-10-19&to=2026-10-25", R)[1]
print("  calendário da Vitta depois de aprovar a 04.02:", sorted({p["status"] for p in cal.get("items", [])}), len(cal.get("items", [])), "posts")

print("== 4. projeto coordenado: aprovar a etapa da Bia, rodar, aprovar a do Otto")
def steps(wid):
    w = work(R, wid)
    return w, [(s["seq"], s["agent_id"], s["delivery_type"], s["status"]) for s in w.get("steps", [])]
w, st = steps(W["nexo"]); print("  etapas:", st, "| pendente:", (w.get("pending_approval") or {}).get("id") is not None)
for rnd in range(3):
    p = work(R, W["nexo"]).get("pending_approval")
    if not p:
        break
    print(f"  rodada {rnd}: aprova {p.get('kind')}:", call("POST", f"/approvals/{p['id']}/decision", R, {"decision": "approved"})[0])
    print("  worker:", drain(LOG))
    w, st = steps(W["nexo"]); print("  etapas:", st, "| trabalho:", w["status"])
pid = work(R, W["nexo"]).get("project_id")
s, proj = call("GET", f"/projects/{pid}", R) if pid else (0, {})
print("  projeto:", s, proj.get("status"), "| dono:", dump(proj.get("owner"), 160))
print("  marcos:", [(m.get("title"), m.get("agent_id"), m.get("done")) for m in proj.get("milestones", [])])
print("  runs por etapa:", sql(f"select coalesce(s.seq::text,'-'), r.agent_id, coalesce(s.delivery_type,'01.02'), r.status, coalesce(r.credits_charged::text,'-') from runs r left join work_item_steps s on s.id=r.step_id where r.work_item_id='{W['nexo']}' order by r.created_at"))
print("  reservas por etapa:", sql(f"select h.delivery_type, h.state, h.estimate, coalesce(h.captured::text,'-') from credit_holds h join runs r on r.id=h.run_id where r.work_item_id='{W['nexo']}' order by h.created_at"))
print("  handoff no contexto:", sql(f"select r.agent_id, i.kind, i.reason, s.seq from run_context_items i join runs r on r.id=i.run_id left join work_item_steps s on s.id=i.step_id where r.work_item_id='{W['nexo']}' and i.kind='step'"))

print("== 5. créditos: soma das capturas = queda do saldo; estimativa = cobrado por run")
B1 = float(sql1(f"select app.credit_balance('{VITTA}')"))
ids = "','".join(W.values())
cap = sql1(f"select coalesce(sum(h.captured),0) from credit_holds h join runs r on r.id=h.run_id where r.work_item_id in ('{ids}')")
print(f"  saldo depois: {B1} | queda: {round(B0 - B1, 2)} | capturado: {cap}")
print("  run cobrado com estimativa diferente:", sql(f"select r.id, e.credits, r.credits_charged from runs r, app.run_credit_estimate(r.id) e where r.work_item_id in ('{ids}') and r.credits_charged is not null and e.credits <> r.credits_charged"))
print("  reservas presas (held):", sql1(f"select count(*) from credit_holds h join runs r on r.id=h.run_id where r.work_item_id in ('{ids}') and h.state='held'"))

print("== 6. consentimento: nada vai para contato; segmentos do Max")
print("  e-mails para contatos (deve ser 0):", sql1("select count(*) from email_messages e join contacts c on lower(c.email)=lower(e.recipient_email)"))
v = (work(R, W["max"]).get("deliveries") or [{}])[0].get("versions") or [{}]
print("  06.03 conteúdo (chaves):", sorted((v[-1].get("content") or {}).keys())[:20])
print("  06.03 base:", dump((v[-1].get("content") or {}).get("base"), 400))
print("IDS", W)
