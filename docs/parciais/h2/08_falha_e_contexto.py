"""H2 alvos 4 e 7 — (A) falha do run libera a reserva nas deliveries novas (recusa e indisponível até o teto);
(B) o que entra no prompt de verdade (texto que chega ao LLM simulado, gravado pelo h2_worker_custom.py):
aprendizado promovido entra, candidato não, descartado sai, sem reafirmação há LEARNING_REVIEW_DAYS entra marcado
`revisar="sim"`, e nada da Miolo entra no prompt da Vitta. Tudo dentro da trava.
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/h2/08_falha_e_contexto.py
"""

import glob
import os
import re
import shutil
import signal
import subprocess
import sys
import time

sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/h2")
from h2lib import MIOLO, ROOT, VITTA, ask, call, sql, sql1, work  # noqa: E402

R, M = "rafael@vitta.example", "marina@miolo.example"
CUSTOM = str(ROOT / "docs/parciais/h2/h2_worker_custom.py")
DUMP = "/tmp/h2_prompts"
for ws in (VITTA, MIOLO):
    sql1(f"select remaining from app.grant_credits('{ws}', 300, 'bonus', 'h2:08:{ws[:4]}:{int(time.time())}', p_note => 'H2 QA')")


def start(log, **extra):
    fh = open(log, "w")
    env = dict(os.environ, LLM_PROVIDER="simulated", **{k: str(v) for k, v in extra.items()})
    p = subprocess.Popen(["uv", "run", "python", CUSTOM], cwd=ROOT / "apps/backend", env=env, stdout=fh,
                         stderr=subprocess.STDOUT, start_new_session=True)
    for _ in range(120):
        if "worker no ar" in open(log).read():
            break
        time.sleep(0.5)
    return p


def stop(p):
    os.killpg(p.pid, signal.SIGTERM)
    p.wait(timeout=60)


def settle(wid, timeout=90):
    for _ in range(timeout * 2):
        st = sql1(f"select string_agg(status::text, ',') from runs where work_item_id='{wid}'")
        if st and all(s in ("succeeded", "failed", "cancelled") for s in st.split(",")):
            return st
        time.sleep(0.5)
    return sql1(f"select string_agg(status::text, ',') from runs where work_item_id='{wid}'")


def settle_reflections(wid, timeout=60):
    for _ in range(timeout * 2):
        st = sql1(f"select string_agg(status::text, ',') from memory_reflections where work_item_id='{wid}'")
        if st and all(s in ("succeeded", "failed") for s in st.split(",")):
            return st
        time.sleep(0.5)
    return st


print("== A. falha do run libera a reserva")
w = start("/tmp/h2_08a.log", H2_FAIL_STEPS="bia.produce:refusal,kiwi.produce:unavailable", WORKER_RETRY_BASE_SECONDS=0.5)
wa, _ = ask(R, VITTA, "bia", "02.01", "H2 falha recusa", "Bia, quero um diagnóstico do marketing da Vitta.")
wb, _ = ask(R, VITTA, "kiwi", "05.01", "H2 falha indisponível", "Kiwi, quanto investir em anúncios? Tenho até R$ 1.000 por mês.")
print("  runs:", settle(wa), "|", settle(wb, 120))
stop(w)
for wid, name in ((wa, "recusa (bia)"), (wb, "indisponível (kiwi)")):
    print(f"  {name}: trabalho={work(R, wid)['status']} runs={sql(f'select status, attempts, coalesce(credits_charged::text,chr(45)) from runs where work_item_id={chr(39)}{wid}{chr(39)}')}"
          f" reserva={sql(f'select h.state, coalesce(h.captured::text,chr(45)) from credit_holds h join runs r on r.id=h.run_id where r.work_item_id={chr(39)}{wid}{chr(39)}')}"
          f" capturas={sql1(f'select count(*) from credit_ledger l join runs r on r.id=l.run_id where r.work_item_id={chr(39)}{wid}{chr(39)} and l.entry_type={chr(39)}capture{chr(39)}')}")
    msgs = call("GET", f"/conversations/{work(R, wid)['conversation_id']}/messages?limit=10", R)[1].get("items", []) if work(R, wid).get("conversation_id") else []
    print("    fala ao dono:", [m["body"][:110] for m in msgs if m.get("author_type") == "agent"][-1:])

print("== B. o que entra no prompt (Miolo, Otto 04.01)")
shutil.rmtree(DUMP, ignore_errors=True); os.makedirs(DUMP)
w = start("/tmp/h2_08b.log", H2_DUMP_DIR=DUMP)
w1, _ = ask(M, MIOLO, "otto", "04.01", "H2 ctx 1", "Otto, preciso de uma legenda para o Instagram anunciando o pão de abóbora. Quero vender mais na loja.")
settle(w1)
call("POST", f"/approvals/{work(M, w1)['pending_approval']['id']}/decision", M, {"decision": "changes_requested", "note": "Nunca use 'promoção imperdível'; chame o cliente de 'você'."})
time.sleep(1); settle(w1)
call("POST", f"/approvals/{work(M, w1)['pending_approval']['id']}/decision", M, {"decision": "approved"})
print("  reflexão:", settle_reflections(w1))
L = {i["topic"]: i for i in call("GET", f"/workspaces/{MIOLO}/memory/learnings", M)[1]["items"]}
print("  aprendizados:", {k: v["status"] for k, v in L.items()})


def run_and_read(tag, who=M, ws=MIOLO, body="Otto, outra legenda para o Instagram: o pão de abóbora volta na sexta. Quero vender na loja."):
    for f in glob.glob(f"{DUMP}/04.01.otto.produce.txt"):
        os.remove(f)
    wid, _ = ask(who, ws, "otto", "04.01", f"H2 ctx {tag}", body)
    settle(wid)
    text = open(f"{DUMP}/04.01.otto.produce.txt").read() if os.path.exists(f"{DUMP}/04.01.otto.produce.txt") else ""
    learns = re.findall(r"<aprendizado [^>]*>[^<]*</aprendizado>", text)
    return [re.sub(r'agente="otto" delivery="04.01" ', "", x)[:150] for x in learns], text


l1, t1 = run_and_read("2")
print("  B1 promovidos entram; candidata fora:", l1, "| 'Abertura' no prompt:", "Abertura" in t1)
try:
    print("  envelhecer (SQL):", sql1(f"update agent_learnings set decided_at = now() - interval '100 days', created_at = now() - interval '100 days', reviewed_at = null where workspace_id='{MIOLO}' and topic='Tratamento' and superseded_at is null returning topic"))
except RuntimeError as e:
    print("  envelhecer recusado:", str(e)[:160])
l2, _ = run_and_read("3")
print("  B2 sem reafirmação há 100 dias:", l2)
print("  descarta Vocabulário:", call("POST", f"/memory/learnings/{L['Vocabulário']['id']}/decision", M, {"action": "discard"})[0])
l3, t3 = run_and_read("4")
print("  B3 depois do descarte:", l3, "| 'imperdível' em <aprendizados>:", "imperd" in "".join(l3).lower())
l4, t4 = run_and_read("5", R, VITTA, "Otto, preciso de uma legenda para o Instagram anunciando o pão de abóbora. Quero vender mais na loja.")
print("  B4 Vitta:", l4, "| 'Miolo' no prompt da Vitta:", "Miolo" in t4, "| idioma:", re.findall(r"<idioma>[^<]*</idioma>", t4 + open(f"{DUMP}/04.01.otto.produce.txt").read())[:1])
stop(w)
print("  arquivos de prompt:", sorted(os.path.basename(f) for f in glob.glob(f"{DUMP}/*")))
