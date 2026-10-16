"""H2 alvo 2 (complemento) — IDOR no objeto da conversa: Rafael abre, na Vitta, conversa sobre um post do calendário,
um trabalho e um projeto da Miolo (ids reais); e na Miolo (onde não é membro).
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/h2/12_idor_objeto.py"""
import sys, time
sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/h2")
from h2lib import MIOLO, VITTA, ask, call, drain, dump, sql1, work  # noqa: E402
M, R = "marina@miolo.example", "rafael@vitta.example"
sql1(f"select remaining from app.grant_credits('{MIOLO}', 50, 'bonus', 'h2:12:{int(time.time())}', p_note => 'H2 QA')")
wid, _ = ask(M, MIOLO, "otto", "04.02", "Calendário H2 IDOR", "Otto, monte o calendário editorial da próxima semana, de 19 a 25/10.")
drain("/tmp/h2_12.log")
post = sql1(f"select id from calendar_posts where workspace_id='{MIOLO}' order by created_at desc limit 1")
print("post da Miolo:", bool(post), "| trabalho:", wid[:8])
for ctx in ({"type": "calendar_post", "id": post}, {"type": "work_item", "id": wid}):
    for ws in (VITTA, MIOLO):
        s, d = call("POST", f"/workspaces/{ws}/conversations", R, {"kind": "object", "context": ctx})
        print(f"  Rafael · {ctx['type']} da Miolo · na {'Vitta' if ws == VITTA else 'Miolo'}: {s} {dump(d, 140)}")
s, d = call("POST", f"/workspaces/{MIOLO}/conversations", M, {"kind": "object", "context": {"type": "calendar_post", "id": post}})
print("  controle: Marina · post da Miolo:", s, dump(d, 160))
