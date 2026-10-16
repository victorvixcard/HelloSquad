"""H2 alvo 6 (complemento) — nome do negócio com HTML (sem CRLF) no convite: o HTML do e-mail escapa?
E o convite com CRLF no nome: o que sobra na fila depois do envio falhar.
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/h2/05b_email_html.py"""
import sys, time
import httpx
sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/h2")
from h2lib import call, drain, sql, sql1  # noqa: E402
P = "pedro@semconta.example"; MP = "http://127.0.0.1:56324/api/v1"; LOG = "/tmp/h2_worker_05b.log"; open(LOG, "w").close()
slug = f"h2-html-{int(time.time())}"
s, ws = call("POST", "/workspaces", P, {"name": "Padaria <b>X</b><img src=x onerror=alert(1)> & \"Cia\"", "slug": slug, "locale": "pt-BR"})
print("POST /workspaces:", s, ws.get("name"))
inj = sql1(f"insert into invitations (workspace_id, email, role, token_hash, expires_at, invited_by) values ('{ws['id']}', 'convidado.html@contatos.example', 'editor', encode(sha256(random()::text::bytea), 'hex'), now() + interval '7 days', (select id from auth.users where email='{P}')) returning id")
print("worker:", drain(LOG))
print("e-mail:", sql(f"select status, provider from email_messages where idempotency_key='invitation:{inj}'"))
got = httpx.get(f"{MP}/search", params={"query": "to:convidado.html@contatos.example", "limit": 5}, timeout=10).json().get("messages", [])
if got:
    d = httpx.get(f"{MP}/message/{got[0]['ID']}", timeout=10).json()
    html, text = d.get("HTML", ""), d.get("Text", "")
    print("Subject:", repr(d.get("Subject")))
    print("HTML tem <img src=x cru?", "<img src=x" in html, "| tem <b>X</b> cru?", "<b>X</b>" in html, "| escapado?", "&lt;img" in html)
    i = html.find("Padaria"); print("HTML trecho:", html[i:i + 110].replace("\n", " "))
print("convites com CRLF que ficaram na fila:", sql("select status, attempts, left(coalesce(error::text,''),90), updated_at from email_messages where template='invitation' and recipient_email='convidado.h2@contatos.example'"))
sql1(f"delete from audit_events where workspace_id='{ws['id']}'; delete from workspaces where id='{ws['id']}' returning 1")
