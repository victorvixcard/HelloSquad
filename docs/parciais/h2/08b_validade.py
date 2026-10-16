"""H2 alvo 7 (validade) — aprendizado promovido sem reafirmação há mais de LEARNING_REVIEW_DAYS (90) entra no prompt
marcado `revisar="sim"`? O gatilho app.agent_learnings_guard recusa editar datas até para o postgres; para envelhecer
o registro de teste, só nesta sessão do psql, `session_replication_role = replica` (gatilhos desligados na sessão).
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/h2/08b_validade.py"""
import importlib.util, os, re, sys
sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/h2")
from h2lib import MIOLO, sql  # noqa: E402
spec = importlib.util.spec_from_file_location("h08", "/home/vitao/projetos/hellosquad/docs/parciais/h2/08_falha_e_contexto.py")
print("envelhecer Tratamento:", sql(f"set session_replication_role = replica; update agent_learnings set decided_at = now() - interval '100 days', created_at = now() - interval '100 days', reviewed_at = null where workspace_id='{MIOLO}' and topic='Tratamento' and superseded_at is null and status='promoted' returning topic, decided_at::date"))
import importlib.machinery, types
m = types.ModuleType("h08b"); src = open("/home/vitao/projetos/hellosquad/docs/parciais/h2/08_falha_e_contexto.py").read()
src = src[: src.index('print("== A.')]  # só as funções de apoio (start, stop, settle) e o preparo
exec(compile(src, "08_falha_e_contexto.py", "exec"), m.__dict__)
import glob, shutil
shutil.rmtree(m.DUMP, ignore_errors=True); os.makedirs(m.DUMP)
w = m.start("/tmp/h2_08c.log", H2_DUMP_DIR=m.DUMP)
wid, _ = m.ask(m.M, MIOLO, "otto", "04.01", "H2 ctx validade", "Otto, legenda para o Instagram: pão de abóbora no sábado. Quero vender na loja.")
m.settle(wid); m.stop(w)
text = open(f"{m.DUMP}/04.01.otto.produce.txt").read()
print("prompt depois de envelhecer:", [x[:160] for x in re.findall(r"<aprendizado [^>]*>[^<]*</aprendizado>", text)])
