"""H2 alvo 12 (e 8, idioma do negócio) — worker sob estresse: dois workers do produto consumindo a mesma fila,
SIGTERM no meio de um run (LLM simulado lento), retry de reflexão (erro passageiro injetado) e de e-mail (SMTP
fechado), e as falas do squad num negócio em inglês. Tudo dentro da trava.
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/h2/06_worker.py
"""

import os
import signal
import subprocess
import sys
import time

sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/h2")
from h2lib import MIOLO, ROOT, VITTA, ask, call, drain, sql, sql1, work  # noqa: E402

R, M = "rafael@vitta.example", "marina@miolo.example"
CUSTOM = str(ROOT / "docs/parciais/h2/h2_worker_custom.py")
for ws in (VITTA, MIOLO):
    sql1(f"select remaining from app.grant_credits('{ws}', 400, 'bonus', 'h2:06:{ws[:4]}:{int(time.time())}', p_note => 'H2 QA')")


def start_worker(log: str, **extra) -> subprocess.Popen:
    env = dict(os.environ, LLM_PROVIDER="simulated", **{k: str(v) for k, v in extra.items()})
    fh = open(log, "w")
    p = subprocess.Popen(["uv", "run", "python", CUSTOM], cwd=ROOT / "apps/backend", env=env, stdout=fh,
                         stderr=subprocess.STDOUT, start_new_session=True)
    for _ in range(120):
        if "worker no ar" in open(log).read():
            break
        time.sleep(0.5)
    return p


def stop(p: subprocess.Popen, sig=signal.SIGTERM, wait=60) -> str:
    t = time.time()
    os.killpg(p.pid, sig)
    try:
        p.wait(timeout=wait)
    except subprocess.TimeoutExpired:
        os.killpg(p.pid, signal.SIGKILL)
        return "não saiu em 60 s (SIGKILL)"
    return f"saiu em {time.time() - t:.1f} s (código {p.returncode})"


def wait_runs(ids, states=("succeeded", "failed", "cancelled"), timeout=180):
    q = "','".join(ids)
    for _ in range(timeout * 2):
        left = sql1(f"select count(*) from runs where work_item_id in ('{q}') and status not in ('" + "','".join(states) + "')")
        if left == "0":
            return True
        time.sleep(0.5)
    return False


print("== 1. dois workers do produto na mesma fila: 8 pedidos na Vitta")
reqs = [("bia", "02.01", "Bia, quero um diagnóstico do marketing da Vitta."), ("otto", "04.02", "Otto, monte o calendário editorial de 19 a 25/10."),
        ("kiwi", "05.01", "Kiwi, quanto investir em anúncios? Tenho até R$ 1.000 por mês."), ("iris", "07.02", "Íris, analise meus últimos resultados.")] * 2
ids = [ask(R, VITTA, a, d, f"H2 par {i}", b)[0] for i, (a, d, b) in enumerate(reqs)]
w1 = start_worker("/tmp/h2_w1.log"); w2 = start_worker("/tmp/h2_w2.log")
ok = wait_runs(ids)
print("  terminou:", ok, "| parar w1:", stop(w1), "| parar w2:", stop(w2))
q = "','".join(ids)
print("  runs:", sql(f"select status, attempts, count(*) from runs where work_item_id in ('{q}') group by 1,2"))
print("  versões por trabalho:", sorted({r[0] for r in sql(f"select count(v.*) from work_items w join deliveries d on d.work_item_id=w.id join delivery_versions v on v.delivery_id=d.id where w.id in ('{q}') group by w.id")}))
print("  reservas:", sql(f"select h.state, count(*), sum(h.captured) from credit_holds h join runs r on r.id=h.run_id where r.work_item_id in ('{q}') group by 1"))
print("  capturas no extrato:", sql1(f"select count(*) from credit_ledger l join runs r on r.id=l.run_id where r.work_item_id in ('{q}') and l.entry_type='capture'"))
print("  runs por worker: w1", open("/tmp/h2_w1.log").read().count("concluído"), "| w2", open("/tmp/h2_w2.log").read().count("concluído"))

print("== 2. SIGTERM no meio do run (LLM lento, 3 s por chamada)")
wid, _ = ask(R, VITTA, "bia", "02.03", "H2 SIGTERM", "Bia, preciso de um plano de marketing com prioridades para lotar a agenda de dezembro.")
slow = start_worker("/tmp/h2_wslow.log", H2_LLM_DELAY=3)
for _ in range(60):
    if sql1(f"select status from runs where work_item_id='{wid}' order by created_at desc limit 1") == "running":
        break
    time.sleep(0.5)
time.sleep(1.5)
print("  run antes do sinal:", sql(f"select status, attempts from runs where work_item_id='{wid}'"))
print("  SIGTERM:", stop(slow))
print("  run depois do sinal:", sql(f"select status, attempts from runs where work_item_id='{wid}'"), "| reserva:", sql(f"select h.state, h.captured from credit_holds h join runs r on r.id=h.run_id where r.work_item_id='{wid}'"))
print("  log do worker lento:", [line[24:150] for line in open("/tmp/h2_wslow.log").read().splitlines() if any(k in line for k in ("sinal", "SIGTERM", "devolv", "encerr", "parando", "fila"))][-4:])
time.sleep(2)
print("  drain normal:", drain("/tmp/h2_w_after.log"))
print("  depois:", sql(f"select status, attempts, credits_charged from runs where work_item_id='{wid}'"), "| capturas:", sql1(f"select count(*) from credit_ledger l join runs r on r.id=l.run_id where r.work_item_id='{wid}' and l.entry_type='capture'"), "| versões:", sql1(f"select count(*) from deliveries d join delivery_versions v on v.delivery_id=d.id where d.work_item_id='{wid}'"))

print("== 3. reflexão com erro passageiro (otto.reflect indisponível) e depois sem erro")
w3, _ = ask(M, MIOLO, "otto", "04.01", "H2 reflexão retry", "Otto, preciso de uma legenda para o Instagram anunciando o pão de abóbora. Quero vender mais na loja.")
drain("/tmp/h2_w3a.log")
p = work(M, w3)["pending_approval"]["id"]
print("  aprova:", call("POST", f"/approvals/{p}/decision", M, {"decision": "approved"})[0])
fw = start_worker("/tmp/h2_wfail.log", H2_FAIL_STEPS="otto.reflect:unavailable", WORKER_RETRY_BASE_SECONDS=1)
time.sleep(8)
print("  com falha:", sql(f"select status, attempts, left(coalesce(error::text,''),80) from memory_reflections where work_item_id='{w3}'"), "| parar:", stop(fw))
time.sleep(2)
print("  drain normal:", drain("/tmp/h2_w3b.log", {"WORKER_RETRY_BASE_SECONDS": "1"}))
print("  depois:", sql(f"select status, attempts, learnings_count from memory_reflections where work_item_id='{w3}'"))

print("== 4. e-mail com SMTP fechado e depois aberto (retry sem duplicar)")
w4, _ = ask(R, VITTA, "otto", "04.01", "H2 e-mail retry", "Otto, uma legenda para o Instagram sobre o pacote de presente de Natal.")
print("  drain com SMTP na porta 1:", drain("/tmp/h2_w4a.log", {"EMAIL_SMTP_PORT": "1", "EMAIL_RETRY_BASE_SECONDS": "1"}))
print("  e-mails do trabalho:", sql(f"select template, status, attempts, left(coalesce(error::text,''),70) from email_messages where variables::text like '%H2 e-mail retry%' order by created_at"))
time.sleep(3)
print("  drain com SMTP certo:", drain("/tmp/h2_w4b.log", {"EMAIL_RETRY_BASE_SECONDS": "1"}))
print("  depois:", sql(f"select template, status, attempts from email_messages where variables::text like '%H2 e-mail retry%' order by created_at"))

print("== 5. idioma do negócio nas falas: Vitta em en, Otto 04.01 e projeto coordenado")
call("PATCH", f"/workspaces/{VITTA}", R, {"locale": "en"})
w5, conv = ask(R, VITTA, "otto", "04.01", "H2 en", "Otto, a caption for Instagram about the Christmas gift package.")
w6, room = ask(R, VITTA, "nexo", "01.02", "H2 en Natal", "Quero uma campanha de Natal para vender mais pacotes de presente.", kind="squad_room")
drain("/tmp/h2_w5.log")
w = work(R, w5)
print("  status_label:", repr(w.get("status_label")), "| texto v1:", str(w["deliveries"][0]["versions"][-1]["content"].get("versoes", [{}])[0].get("texto"))[:90])
for cid in (conv, room):
    msgs = call("GET", f"/conversations/{cid}/messages?limit=20", R)[1].get("items", [])
    print("  falas de agente:", [m["body"][:90] for m in msgs if m.get("author_type") == "agent"][:4])
print("  etapas:", [(s["title"], s.get("status_reason_label")) for s in work(R, w6).get("steps", [])])
call("PATCH", f"/workspaces/{VITTA}", R, {"locale": "pt-BR"})
