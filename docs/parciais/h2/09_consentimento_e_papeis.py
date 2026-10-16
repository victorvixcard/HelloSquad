"""H2 alvos 3, 5 e 7 (complemento) — reimportar contato com consentimento revogado; duplicata com caixa diferente
entre importações; resposta de cobrança sem dinheiro; editora decide aprendizado da Vitta.
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/h2/09_consentimento_e_papeis.py"""
import sys, time
sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/h2")
from h2lib import MIOLO, VITTA, ask, call, drain, dump, sql, sql1, work  # noqa: E402
M, R, C = "marina@miolo.example", "rafael@vitta.example", "carla@vitta.example"
H = "nome;email;telefone;consentimento_email;consentimento_whatsapp;data_consentimento;ultima_compra;compras\n"
print("== consentimento: cliente01 da Miolo hoje:", sql(f"select channel, status from contact_consent_state s join contacts c on c.id=s.contact_id where c.workspace_id='{MIOLO}' and c.email='cliente01@contatos.example'"))
s, d = call("POST", f"/workspaces/{MIOLO}/contacts/imports", M, {"file_name": "revoga.csv", "source": "H2", "csv": H + "Cliente Um;cliente01@contatos.example;;não;não;2026-10-16;;"})
print("  reimporta com 'não' (revogar):", s, dump(d.get("refused") if isinstance(d, dict) else d, 160))
s, d = call("POST", f"/workspaces/{MIOLO}/contacts/imports", M, {"file_name": "caixa.csv", "source": "H2", "csv": H + "Cliente Um;CLIENTE01@Contatos.Example;;sim;não;2026-10-16;;"})
print("  mesma pessoa com caixa diferente:", s, dump(d.get("refused") if isinstance(d, dict) else d, 160))
print("  depois:", sql(f"select channel, status from contact_consent_state s join contacts c on c.id=s.contact_id where c.workspace_id='{MIOLO}' and lower(c.email)='cliente01@contatos.example'"), "| contatos com esse e-mail:", sql1(f"select count(*) from contacts where workspace_id='{MIOLO}' and lower(email)='cliente01@contatos.example'"))
print("  rota para revogar consentimento:", [p for p in __import__('json').load(open('/home/vitao/projetos/hellosquad/packages/contracts/openapi.json'))['paths'] if 'consent' in p or 'contacts' in p])
print("== cobrança: a resposta do owner tem dinheiro?")
for path in (f"/workspaces/{MIOLO}/billing/subscription", f"/workspaces/{MIOLO}/billing/payments"):
    s, d = call("GET", path, M); txt = dump(d, 4000)
    print(f"  {path.split('/')[-1]}: {s} chaves={sorted(d.keys()) if isinstance(d, dict) else type(d)} | 'R$'/amount/value/price no corpo: {any(k in txt for k in ('R$', 'amount', 'value', 'price', '99'))}")
    print("    ", txt[:300])
print("== aprendizado na Vitta: editora decide?")
sql1(f"select remaining from app.grant_credits('{VITTA}', 100, 'bonus', 'h2:09:{int(time.time())}', p_note => 'H2 QA')")
w, _ = ask(R, VITTA, "otto", "04.01", "H2 papel", "Otto, preciso de uma legenda para o Instagram anunciando o pão de abóbora. Quero vender mais na loja.")
drain("/tmp/h2_09.log")
call("POST", f"/approvals/{work(R, w)['pending_approval']['id']}/decision", R, {"decision": "changes_requested", "note": "Nunca use 'promoção imperdível'; chame o cliente de 'você'."})
drain("/tmp/h2_09.log")
call("POST", f"/approvals/{work(R, w)['pending_approval']['id']}/decision", R, {"decision": "approved"})
drain("/tmp/h2_09.log")
items = call("GET", f"/workspaces/{VITTA}/memory/learnings", C)[1].get("items", [])
print("  Carla lista:", [(i["topic"], i["status"]) for i in items])
for i in items[:1]:
    print("  Carla descarta:", call("POST", f"/memory/learnings/{i['id']}/decision", C, {"action": "discard"})[0], "| Marina (outra empresa) descarta:", call("POST", f"/memory/learnings/{i['id']}/decision", M, {"action": "discard"})[0], "| Rafael repete promover 2x:", [call("POST", f"/memory/learnings/{i['id']}/decision", R, {"action": "promote"})[0] for _ in range(2)])
