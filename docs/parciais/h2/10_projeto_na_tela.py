"""H2 alvo 1 (complemento) — projeto coordenado criado pela API na Miolo (Bia aprovada, Kaia aguardando motor, Otto
aguardando aprovação): o que a tela mostra em Projetos, no detalhe do trabalho e na Sala do Squad.
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/h2/10_projeto_na_tela.py"""
import json, subprocess, sys, time
sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/h2")
from h2lib import MIOLO, ask, call, drain, sql1, work  # noqa: E402
M = "marina@miolo.example"
sql1(f"select remaining from app.grant_credits('{MIOLO}', 100, 'bonus', 'h2:10:{int(time.time())}', p_note => 'H2 QA')")
wid, room = ask(M, MIOLO, "nexo", "01.02", "Campanha de Natal", "Quero uma campanha de Natal para vender mais panetones.", kind="squad_room")
drain("/tmp/h2_10.log")
call("POST", f"/approvals/{work(M, wid)['pending_approval']['id']}/decision", M, {"decision": "approved"})
drain("/tmp/h2_10.log")
w = work(M, wid)
print("API:", w["status"], w.get("step_label"), [(s["seq"], s["agent_id"], s["status"]) for s in w["steps"]], "projeto", w.get("project_id"))
json.dump({"work": wid, "project": w.get("project_id"), "room": room}, open("/tmp/h2_10_ids.json", "w"))
p = subprocess.run(["node", "/home/vitao/projetos/hellosquad/docs/parciais/h2/10_projeto_na_tela.mjs"], cwd="/home/vitao/projetos/hellosquad/apps/web", capture_output=True, text=True, timeout=180)
print(p.stdout[-3000:], p.stderr[-800:])
