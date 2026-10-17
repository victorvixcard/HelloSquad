"""H-SA alvo 4 — versões do squad × runtime, com o worker do produto em modo simulado (`--drain`).
1. rascunho na seção "como fala" da Alma do Otto com um marcador: não entra no prompt ativo nem no run seguinte;
2. publicar: o run seguinte usa (hash novo, `sources` com a versão nova); 3. voltar à v1: o run seguinte volta ao hash
da v1; 4. ferramenta desconhecida = 422; tirar `entregas.criar_versao` do Otto e publicar: o run é recusado pelo
runtime (`tool_not_allowed`), sem versão de entrega; 5. `make squad-export` sem mudança = diff vazio; com a v2 = só a
seção; 6. auditoria das gravações. No fim apaga só as versões que criou (como o roteiro da SA3a) e roda o `make seed`.
Uso: flock -o -w 1200 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/hsa/04_squad_runtime.py
"""

import os
import subprocess
import sys
import time
import uuid

sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/hsa")
from hsalib import M, MIOLO, ROOT, V, ask, call, drain, dump, sql, sql1  # noqa: E402

LOG = "/tmp/hsa_worker_04.log"
open(LOG, "w").close()
ENV = dict(os.environ, HELLOSQUAD_DB_LOCK_HELD="1")
vic_id = sql1("select id from auth.users where email='vic@hellosquad.example'")
t0 = sql1("select now()")
BEFORE_VERSIONS = [r[0] for r in sql("select id from squad_versions")]
MARK = "HSAMARCA" + uuid.uuid4().hex[:10].upper()


def export_diff(label):
    p = subprocess.run(["make", "squad-export"], cwd=ROOT, env=ENV, capture_output=True, text=True, timeout=300)
    st = subprocess.run(["git", "status", "--porcelain", "squad/"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    diff = subprocess.run(["git", "diff", "--unified=0", "squad/"], cwd=ROOT, capture_output=True, text=True).stdout
    added = [line for line in diff.splitlines() if line.startswith("+") and not line.startswith("+++")]
    print(f"  make squad-export ({label}): exit {p.returncode}; git status squad/ = [{st}]; linhas novas: {[a[:90] for a in added][:4]}")
    return st, added


def run_otto(label, delivery="04.01"):
    wid, conv = ask(M, MIOLO, "otto", delivery, f"Legenda H-SA {label}", "Otto, preciso de uma legenda para o Instagram anunciando o pão de abóbora. Quero vender mais na loja.")
    drain(LOG)
    r = sql(f"select status, coalesce(prompt_version,''), coalesce(error->>'code',''), coalesce(error::text,'') from runs where work_item_id='{wid}' and agent_id='otto' order by created_at desc limit 1")
    st, hsh, code, err = r[0] if r else ("sem run do otto", "", "", "")
    src = sql1(f"select coalesce(sources::text,'') from agent_prompt_versions where content_hash='{hsh}' and agent_id='otto' limit 1") if hsh else ""
    versions = sql1(f"select count(*) from delivery_versions dv join deliveries d on d.id=dv.delivery_id where d.work_item_id='{wid}'")
    print(f"  run do Otto ({label}): {st} {code} | hash {hsh[:12]} | versões de entrega {versions} | sources {src[:160]}")
    if err and code:
        print("    erro:", err[:200])
    return hsh, src


def prompt(draft):
    s, d = call("GET", f"/admin/squad/agents/otto/prompt?route=04.01&draft={'true' if draft else 'false'}", V)
    text = " ".join(b.get("text", "") for b in d.get("blocks", []))
    return d.get("content_hash", ""), (MARK in text), d.get("sources")


sql1(f"select remaining from app.grant_credits('{MIOLO}', 300, 'bonus', 'hsa:04:{int(time.time())}', p_note => 'H-SA QA')")
print("== 0. linha de base (bônus de 300 na Miolo para os runs; o make seed do fim devolve o saldo)")
st, _ = export_diff("nada mudou")
s, ag = call("GET", "/admin/squad/agents/otto", V)
soul = ag["soul"]
v1 = soul["ref"]["id"] if isinstance(soul.get("ref"), dict) else soul.get("id")
sec = next(x for x in soul["sections"] if x["section"] == "como_fala")
print("  Alma ativa do Otto:", soul["ref"].get("version"), v1[:8], "| seção como_fala:", sec["words"], "palavras")
h0, has0, _ = prompt(False)
h_base, _ = run_otto("antes de tudo")
print("  prompt ativo (preview) hash", h0[:12], "== hash do run:", h0 == h_base)

print("== 1. rascunho com marcador")
s, dr = call("PUT", "/admin/squad/agents/otto/soul/sections/como_fala", V, {"body": sec["body"] + f"\n\nFrase de teste {MARK}.", "note": "H-SA: rascunho com marcador"})
draft_id = (dr.get("ref") or {}).get("id") or dr.get("id")
print("  PUT seção:", s, "rascunho", str(draft_id)[:8], (dr.get("ref") or {}).get("status"))
ha, inA, _ = prompt(False)
hd, inD, _ = prompt(True)
print(f"  preview ativo tem o marcador? {inA} (hash {ha[:12]} == base {ha == h0}) | preview com rascunho tem? {inD} (hash {hd[:12]})")
h1, src1 = run_otto("com rascunho pendente")
print("  run com rascunho pendente usou o hash da v1:", h1 == h_base, "| rascunho em sources:", str(draft_id) in src1)
print("  marcador no prompt de conversa (preview ativo):", MARK in " ".join(b.get("text", "") for b in call("GET", "/admin/squad/agents/otto/prompt?route=conversa", V)[1].get("blocks", [])))

print("== 2. publicar")
s, pub = call("POST", f"/admin/squad/versions/{draft_id}/publish", V, {"note": "H-SA: publicar"})
print("  publicar:", s, (pub.get("ref") or pub).get("status") if isinstance(pub, dict) else pub)
hp, inP, srcp = prompt(False)
print(f"  preview ativo depois de publicar tem o marcador? {inP} (hash {hp[:12]})")
h2, src2 = run_otto("depois de publicar")
print("  run depois de publicar: hash == preview publicado:", h2 == hp, "| != v1:", h2 != h_base, "| versão publicada em sources:", str(draft_id) in src2)
st2, added2 = export_diff("com a v2 publicada")
subprocess.run(["git", "checkout", "--", "squad/"], cwd=ROOT)

print("== 3. voltar à v1")
s, rs = call("POST", f"/admin/squad/versions/{v1}/restore", V, {"note": "H-SA: voltar à v1"})
v3 = (rs.get("ref") or {}).get("id") or rs.get("id")
print("  voltar:", s, "versão nova", (rs.get("ref") or rs).get("version") if isinstance(rs, dict) else rs, str(v3)[:8])
hr, inR, _ = prompt(False)
h3, src3 = run_otto("depois de voltar")
print(f"  preview tem o marcador? {inR} | run depois de voltar usa o hash da v1: {h3 == h_base} | v3 em sources: {str(v3) in src3}")
st3, added3 = export_diff("depois de voltar (conteúdo da v1)")

print("== 4. ferramentas")
s, d = call("PUT", "/admin/squad/agents/otto/config", V, {"tools": ["memoria.ler", "ferramenta.inexistente"], "note": "H-SA: ferramenta desconhecida"})
print("  ferramenta desconhecida:", s, d.get("error", {}).get("code") if isinstance(d, dict) else d)
tools = ag["config"]["fields"]["tools"]
s, cd = call("PUT", "/admin/squad/agents/otto/config", V, {"tools": [x for x in tools if x != "entregas.criar_versao"], "note": "H-SA: sem entregas.criar_versao"})
cfg_draft = (cd.get("ref") or {}).get("id") or cd.get("id")
print("  config sem entregas.criar_versao (rascunho):", s, str(cfg_draft)[:8])
s, d = call("POST", f"/admin/squad/versions/{cfg_draft}/publish", V, {"note": "H-SA: publicar config sem a ferramenta"})
print("  publicar config:", s)
h4, _ = run_otto("sem a ferramenta de entregar")
cfg_v1 = sql1("select id from squad_versions where agent_id='otto' and kind='config' and version=1")
s, d = call("POST", f"/admin/squad/versions/{cfg_v1}/restore", V, {"note": "H-SA: voltar o agent.yaml"})
print("  voltar o agent.yaml:", s)
h5, _ = run_otto("com o agent.yaml de volta")

print("== 6. auditoria das gravações do squad")
for r in sql(f"select action, count(*), bool_and(actor_id='{vic_id}'), bool_and(coalesce(payload->>'note','') <> ''), bool_and((payload->>'platform_admin')::boolean) "
             f"from audit_events where created_at > '{t0}' and action like 'squad.%' group by 1 order by 1"):
    print("  ", r)

print("== limpeza (como o roteiro da SA3a: só as versões criadas aqui, gatilhos desligados só nessa limpeza)")
keep = ",".join(BEFORE_VERSIONS)
sql(f"begin; set local session_replication_role = replica; "
    f"delete from public.agent_prompt_sections where not (version_id::text = any(string_to_array('{keep}', ','))); "
    f"delete from public.squad_versions where not (id::text = any(string_to_array('{keep}', ','))); "
    f"update public.squad_versions set status = 'active' where id::text = any(string_to_array('{keep}', ',')) and status = 'superseded' and kind in ('soul','config') and agent_id = 'otto'; commit;")
p = subprocess.run(["make", "seed"], cwd=ROOT, env=ENV, capture_output=True, text=True, timeout=300)
print("  make seed:", p.returncode, "| versões do Otto:", sql("select kind, key, version, status from squad_versions where agent_id='otto' and kind in ('soul','config') order by 1"))
export_diff("depois da limpeza")
print("  worker:", open(LOG).read().count("concluído"), "concluídos;", open(LOG).read().count("falhou"), "falhas no log")
