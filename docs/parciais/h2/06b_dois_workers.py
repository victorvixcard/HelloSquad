"""H2 alvo 12 (complemento) — dois workers do produto já no ar antes dos pedidos; 8 pedidos na Vitta; detalhe
por run (reserva, captura, versões) medido dentro da trava. Controle: os mesmos 8 com um worker só (--drain).
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/h2/06b_dois_workers.py"""
import sys, time
sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/h2")
from h2lib import VITTA, ask, drain, sql, sql1  # noqa: E402
import importlib.util
spec = importlib.util.spec_from_file_location("w06", "/home/vitao/projetos/hellosquad/docs/parciais/h2/06_worker.py")
R = "rafael@vitta.example"
sql1(f"select remaining from app.grant_credits('{VITTA}', 400, 'bonus', 'h2:06b:{int(time.time())}', p_note => 'H2 QA')")
import os, signal, subprocess
from h2lib import ROOT
CUSTOM = str(ROOT / "docs/parciais/h2/h2_worker_custom.py")
def start(log):
    fh = open(log, "w")
    p = subprocess.Popen(["uv", "run", "python", CUSTOM], cwd=ROOT / "apps/backend", env=dict(os.environ, LLM_PROVIDER="simulated", H2_LLM_DELAY="0.5"), stdout=fh, stderr=subprocess.STDOUT, start_new_session=True)
    for _ in range(120):
        if "worker no ar" in open(log).read(): break
        time.sleep(0.5)
    return p
def detail(ids):
    q = "','".join(ids)
    return sql(f"select w.title, w.delivery_type, w.status, r.status, r.attempts, coalesce(r.credits_charged::text,'-'), coalesce(h.state::text,'-'), coalesce(h.captured::text,'-'), (select count(*) from deliveries d join delivery_versions v on v.delivery_id=d.id where d.work_item_id=w.id), (select count(*) from approvals a where a.work_item_id=w.id and a.status='pending') from work_items w join runs r on r.work_item_id=w.id left join credit_holds h on h.run_id=r.id where w.id in ('{q}') order by w.title")
reqs = [("bia", "02.01", "Bia, quero um diagnóstico do marketing da Vitta."), ("otto", "04.02", "Otto, monte o calendário editorial de 19 a 25/10."),
        ("kiwi", "05.01", "Kiwi, quanto investir em anúncios? Tenho até R$ 1.000 por mês."), ("iris", "07.02", "Íris, analise meus últimos resultados.")] * 2
print("== controle: um worker (--drain)")
ids = [ask(R, VITTA, a, d, f"H2 ctl {i} {d}", b)[0] for i, (a, d, b) in enumerate(reqs)]
print("  worker:", drain("/tmp/h2_06b_ctl.log"))
for row in detail(ids): print("  ", row)
print("== dois workers no ar antes dos pedidos")
w1, w2 = start("/tmp/h2_06b_w1.log"), start("/tmp/h2_06b_w2.log")
ids = [ask(R, VITTA, a, d, f"H2 par {i} {d}", b)[0] for i, (a, d, b) in enumerate(reqs)]
q = "','".join(ids)
for _ in range(240):
    if sql1(f"select count(*) from runs where work_item_id in ('{q}') and status not in ('succeeded','failed','cancelled')") == "0": break
    time.sleep(0.5)
for p in (w1, w2):
    os.killpg(p.pid, signal.SIGTERM); p.wait(timeout=60)
for row in detail(ids): print("  ", row)
print("  runs por worker: w1", open("/tmp/h2_06b_w1.log").read().count("concluído"), "| w2", open("/tmp/h2_06b_w2.log").read().count("concluído"))
print("  capturas:", sql1(f"select count(*) from credit_ledger l join runs r on r.id=l.run_id where r.work_item_id in ('{q}') and l.entry_type='capture'"))
