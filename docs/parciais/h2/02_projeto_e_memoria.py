"""H2 alvos 1 e 7 (API) — projeto coordenado na Vitta (com e sem tema), reflexão ao aprovar deliveries sem
fixture de reflexão, e a correção da Marina na Miolo (04.01 -> 04.01 e 04.03), descarte, isolamento e validade
dos aprendizados. Tudo é medido dentro da mesma trava (outro processo pode reaplicar o seed depois).
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/h2/02_projeto_e_memoria.py
"""

import sys
import time

sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/h2")
from h2lib import MIOLO, VITTA, ask, call, credits, drain, dump, sql, sql1, work  # noqa: E402

R, C, M = "rafael@vitta.example", "carla@vitta.example", "marina@miolo.example"
LOG = "/tmp/h2_worker_02.log"
open(LOG, "w").close()
for ws in (VITTA, MIOLO):
    sql1(f"select remaining from app.grant_credits('{ws}', 300, 'bonus', 'h2:02:{ws[:4]}:{int(time.time())}', p_note => 'H2 QA')")


def decide(who, wid, decision, note=None):
    p = work(who, wid).get("pending_approval")
    if not p:
        return "sem pendência"
    body = {"decision": decision} | ({"note": note} if note else {})
    s, d = call("POST", f"/approvals/{p['id']}/decision", who, body)
    return f"{p.get('kind')}->{decision}: {s}" + ("" if s == 200 else " " + dump(d, 160))


def steps(who, wid):
    w = work(who, wid)
    return w["status"], [(s["seq"], s["agent_id"], s["delivery_type"], s["status"], s.get("status_reason")) for s in w.get("steps", [])]


def text_of(who, wid):
    v = work(who, wid)["deliveries"][0]["versions"][-1]
    c = v["content"]
    t = c.get("versoes", [{}])[0].get("texto") if c.get("versoes") else dump(c, 260)
    return f"v{v['version_no']} {str(t).replace(chr(10), ' / ')[:260]}"


def ctx(wid):
    return sql(
        "select r.attempts, i.kind, i.reason, coalesce(l.topic,'') from run_context_items i join runs r on r.id=i.run_id "
        f"left join agent_learnings l on l.id=i.learning_id where r.work_item_id='{wid}' and i.kind='learning' order by r.created_at, l.topic"
    )


print("== A. campanha sem tema na Vitta: o Nexo pergunta; a resposta destrava o plano?")
WA, _ = ask(R, VITTA, "nexo", "01.02", "Campanha de fim de ano", "Quero uma campanha de fim de ano para lotar a agenda de dezembro.", kind="squad_room")
print("  worker:", drain(LOG)); print("  ", steps(R, WA))
print("  responde:", decide(R, WA, "answered", "É a campanha de Natal: quero lotar a agenda de dezembro com pacotes de presente."))
print("  worker:", drain(LOG)); print("  ", steps(R, WA), "| pendente:", (work(R, WA).get("pending_approval") or {}).get("kind"))
print("  ", credits(WA))

print("== B. campanha de Natal na Vitta: Bia -> Kaia(stub) -> Otto")
WB, _ = ask(R, VITTA, "nexo", "01.02", "Campanha de Natal", "Quero uma campanha de Natal para vender mais pacotes de presente.", kind="squad_room")
print("  worker:", drain(LOG)); print("  ", steps(R, WB))
print("  Carla tenta decidir a etapa:", decide(C, WB, "approved"))
print("  ", decide(R, WB, "approved")); print("  worker:", drain(LOG)); print("  ", steps(R, WB))
print("  ", decide(R, WB, "approved")); print("  worker:", drain(LOG)); print("  ", steps(R, WB))
w = work(R, WB); pid = w.get("project_id")
s, proj = call("GET", f"/projects/{pid}", R) if pid else (0, {})
print("  trabalho:", w["status"], "| projeto:", s, proj.get("status"), "| dono:", dump(proj.get("owner"), 140))
print("  participantes:", [(p.get("agent_id"), p.get("responsibility")) for p in proj.get("participants", [])])
print("  marcos:", [(m.get("title"), m.get("agent_id"), m.get("done")) for m in proj.get("milestones", [])])
print("  runs:", sql(f"select coalesce(s.seq::text,'-'), r.agent_id, r.status, coalesce(r.credits_charged::text,'-') from runs r left join work_item_steps s on s.id=r.step_id where r.work_item_id='{WB}' order by r.created_at"))
print("  reservas:", sql(f"select h.delivery_type, h.state, h.estimate, coalesce(h.captured::text,'-') from credit_holds h join runs r on r.id=h.run_id where r.work_item_id='{WB}' order by h.created_at"))
print("  handoff:", sql(f"select r.agent_id, i.reason, s.seq, v.version_no from run_context_items i join runs r on r.id=i.run_id left join work_item_steps s on s.id=i.step_id left join delivery_versions v on v.id=i.delivery_version_id where r.work_item_id='{WB}' and i.kind='step'"))
print("  Kaia na conversa:", [m[0][:200] for m in sql(f"select body from messages where author_agent_id='kaia' and conversation_id=(select conversation_id from work_items where id='{WB}')")])
print("  Juliana (Trilha) lê o projeto:", call("GET", f"/projects/{pid}", "juliana@trilha.example")[0] if pid else "-")

print("== C. reflexão ao aprovar deliveries sem fixture de reflexão (02.01, 05.01, 07.02)")
for agent, dt, body in (("bia", "02.01", "Bia, quero um diagnóstico do marketing da Vitta."),
                        ("kiwi", "05.01", "Kiwi, quanto investir em anúncios em novembro? Tenho até R$ 1.000 por mês."),
                        ("iris", "07.02", "Íris, analise meus últimos resultados.")):
    wid, _ = ask(R, VITTA, agent, dt, f"H2 {dt}", body)
    drain(LOG); decide(R, wid, "approved")
drain(LOG)
print("  reflexões da Vitta:", sql(f"select delivery_type, outcome, status, attempts, left(coalesce(error::text,''),90) from memory_reflections where workspace_id='{VITTA}' order by created_at"))

print("== D. correção da Marina na Miolo (04.01), aplicada na entrega seguinte do Otto")
W1, _ = ask(M, MIOLO, "otto", "04.01", "Legenda do pão de abóbora", "Otto, preciso de uma legenda para o Instagram anunciando o pão de abóbora. Quero vender mais na loja.")
drain(LOG); print("  W1", text_of(M, W1))
print("  ", decide(M, W1, "changes_requested", "Nunca use 'promoção imperdível'; chame o cliente de 'você'."))
drain(LOG); print("  W1", text_of(M, W1))
print("  ", decide(M, W1, "approved")); print("  worker:", drain(LOG))
print("  reflexão:", sql(f"select outcome, status, learnings_count from memory_reflections where work_item_id='{W1}'"))
s, L = call("GET", f"/workspaces/{MIOLO}/memory/learnings", M)
items = L.get("items", []) if isinstance(L, dict) else []
print("  aprendizados:", s, [(i["topic"], i["status"], i.get("promotion_rule")) for i in items])
W2, _ = ask(M, MIOLO, "otto", "04.01", "Legenda do pão de abóbora (sexta)", "Otto, outra legenda para o Instagram: o pão de abóbora volta na sexta. Quero vender na loja.")
drain(LOG); print("  W2 (04.01 seguinte)", text_of(M, W2)); print("  W2 contexto:", ctx(W2))
W3, _ = ask(M, MIOLO, "otto", "04.03", "Posts dos bastidores", "Otto, quero um reels para o Instagram e um status de WhatsApp sobre os bastidores da fornada de sábado.")
drain(LOG); print("  W3 (04.03 seguinte) contexto:", ctx(W3))
print("  W3 texto contém 'imperdível'?", "imperd" in dump(work(M, W3)["deliveries"][0]["versions"][-1]["content"], 20000).lower())
W4, _ = ask(M, MIOLO, "otto", "04.01", "Legenda do centeio", "Otto, uma legenda para o Instagram sobre o pão de centeio de sábado.")
drain(LOG); print("  W4 (04.01, outro pão)", text_of(M, W4)); print("  W4 contexto:", ctx(W4))

print("== E. isolamento e decisão dos aprendizados")
lid = next((i["id"] for i in items if i["status"] == "promoted"), None)
cand = next((i["id"] for i in items if i["status"] == "candidate"), None)
print("  Rafael lista os da Miolo:", call("GET", f"/workspaces/{MIOLO}/memory/learnings", R)[0])
print("  Rafael descarta um da Miolo:", call("POST", f"/memory/learnings/{lid}/decision", R, {"action": "discard"})[0] if lid else "-")
print("  Pedro (sem conta) lista:", call("GET", f"/workspaces/{MIOLO}/memory/learnings", "pedro@semconta.example")[0])
WV, _ = ask(R, VITTA, "otto", "04.01", "Legenda do pão de abóbora", "Otto, preciso de uma legenda para o Instagram anunciando o pão de abóbora. Quero vender mais na loja.")
drain(LOG); print("  Vitta 04.01 contexto (aprendizados da Miolo não entram):", ctx(WV), "|", text_of(R, WV)[:120])
print("  Marina descarta todos os promovidos:")
for i in items:
    if i["status"] == "promoted":
        print("    ", i["topic"], call("POST", f"/memory/learnings/{i['id']}/decision", M, {"action": "discard"})[0])
W5, _ = ask(M, MIOLO, "otto", "04.01", "Legenda do pão de abóbora (domingo)", "Otto, legenda para o Instagram: pão de abóbora no domingo. Quero vender na loja.")
drain(LOG); print("  W5 depois do descarte", text_of(M, W5)); print("  W5 contexto:", ctx(W5))
if cand:
    print("  Marina promove a candidata:", call("POST", f"/memory/learnings/{cand}/decision", M, {"action": "promote"})[0])
    W6, _ = ask(M, MIOLO, "otto", "04.01", "Legenda do pão de abóbora (segunda)", "Otto, legenda para o Instagram: pão de abóbora na segunda. Quero vender na loja.")
    drain(LOG); print("  W6 contexto (promovida entra):", ctx(W6))

print("== F. validade: aprendizado sem reafirmação há LEARNING_REVIEW_DAYS")
print("  config:", sql1("select 1") and __import__('os').popen("grep -h 'LEARNING_REVIEW_DAYS' /home/vitao/projetos/hellosquad/.env.example /home/vitao/projetos/hellosquad/apps/backend/src/hellosquad/config.py | head -3").read().strip()[:200])
print("  falhas no log do worker:", sum(1 for line in open(LOG) if "falhou" in line))
