"""H2 alvo 6 — e-mail transacional contra o Mailpit local (56324): idioma (pessoa -> negócio -> pt-BR),
preferência, isolamento, destinatário fora de `.example`, e injeção de cabeçalho/HTML pelo nome do negócio
(o nome é livre no POST /workspaces). Tudo dentro da trava; `make seed` ao fim do bloco devolve o estado.
Uso: flock -o -w 900 /tmp/hellosquad-db.lock apps/backend/.venv/bin/python docs/parciais/h2/05_email.py
"""

import sys
import time

import httpx

sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/h2")
from h2lib import MIOLO, VITTA, ask, call, drain, sql, sql1, work  # noqa: E402

R, C, M, P = "rafael@vitta.example", "carla@vitta.example", "marina@miolo.example", "pedro@semconta.example"
MP = "http://127.0.0.1:56324/api/v1"
LOG = "/tmp/h2_worker_05.log"
open(LOG, "w").close()
T0 = sql1("select now()")
sql1(f"select remaining from app.grant_credits('{VITTA}', 300, 'bonus', 'h2:05:{int(time.time())}', p_note => 'H2 QA')")


def mailpit(to: str):
    r = httpx.get(f"{MP}/search", params={"query": f"to:{to}", "limit": 50}, timeout=10).json()
    return r.get("messages", [])


def since(to: str, n0: int):
    msgs = mailpit(to)
    return msgs[: max(0, len(msgs) - n0)] if len(msgs) >= n0 else msgs


print("== 1. idioma: Carla (editora) escolhe es; Vitta passa a en; Rafael sem idioma próprio")
sql1("update auth.users set raw_user_meta_data = raw_user_meta_data || '{\"locale\":\"es\"}' where email='carla@vitta.example' returning 1")
sql1("update auth.users set raw_user_meta_data = raw_user_meta_data - 'locale' where email='rafael@vitta.example' returning 1")
print("  PATCH Vitta en (owner):", call("PATCH", f"/workspaces/{VITTA}", R, {"locale": "en"})[0], "| editora tenta:", call("PATCH", f"/workspaces/{VITTA}", C, {"locale": "es"})[0])
n_c, n_r, n_m = len(mailpit("carla@vitta.example")), len(mailpit("rafael@vitta.example")), len(mailpit("marina@miolo.example"))
w1, _ = ask(R, VITTA, "otto", "04.01", "Legenda H2 e-mail", "Otto, uma legenda para o Instagram sobre o pacote de presente de Natal.")
print("  worker:", drain(LOG))
rows = sql(f"select recipient_email, template, locale, status from email_messages where workspace_id='{VITTA}' and created_at > '{T0}' order by created_at")
print("  email_messages Vitta:", rows)
for who in ("carla@vitta.example", "rafael@vitta.example"):
    print(f"  Mailpit {who}:", [(m.get("Subject"), m.get("Snippet", "")[:60]) for m in since(who, n_c if who.startswith("carla") else n_r)][:4])
print("  Marina recebeu algo da Vitta?", [m.get("Subject") for m in since("marina@miolo.example", n_m)][:4])

print("== 2. preferência: Carla desliga delivery_ready; nova entrega na Vitta")
print("  PUT:", call("PUT", "/me/email-preferences/delivery_ready", C, {"enabled": False})[0], "| GET:", str(call("GET", "/me/email-preferences", C)[1])[:200])
print("  convite não é opcional:", call("PUT", "/me/email-preferences/invitation", C, {"enabled": False})[0])
T1 = sql1("select now()")
n_c = len(mailpit("carla@vitta.example"))
w2, _ = ask(R, VITTA, "otto", "04.01", "Legenda H2 e-mail 2", "Otto, uma legenda para o Instagram sobre o kit de cuidados de dezembro.")
print("  worker:", drain(LOG))
print("  email_messages p/ Carla depois de desligar:", sql(f"select template, status from email_messages where recipient_email='carla@vitta.example' and created_at > '{T1}'"))
print("  Mailpit Carla novas:", [m.get("Subject") for m in since("carla@vitta.example", n_c)])

print("== 3. destinatário fora de .example (convite por SQL, como o roteiro da S2f)")
rid = sql1(f"insert into invitations (workspace_id, email, role, token_hash, expires_at, invited_by) values ('{VITTA}', 'fulano.real@gmail.com', 'editor', encode(sha256(random()::text::bytea), 'hex'), now() + interval '7 days', (select id from auth.users where email='rafael@vitta.example')) returning id")
rid2 = sql1(f"insert into invitations (workspace_id, email, role, token_hash, expires_at, invited_by) values ('{VITTA}', 'quase@contatos.example.com', 'editor', encode(sha256(random()::text::bytea), 'hex'), now() + interval '7 days', (select id from auth.users where email='rafael@vitta.example')) returning id")
print("  worker:", drain(LOG))
print("  e-mails dos convites:", sql(f"select recipient_email, status, left(coalesce(error::text,''),80) from email_messages where idempotency_key in ('invitation:{rid}','invitation:{rid2}')"))
print("  Mailpit gmail:", len(mailpit("fulano.real@gmail.com")), "| .example.com:", len(mailpit("quase@contatos.example.com")))

print("== 4. injeção pelo nome do negócio (Pedro cria um negócio com CRLF e HTML no nome)")
slug = f"h2-inj-{int(time.time())}"
name = "Padaria <b>X</b><img src=x onerror=alert(1)>\r\nBcc: espiao@contatos.example"
s, ws = call("POST", "/workspaces", P, {"name": name, "slug": slug, "locale": "pt-BR"})
print("  POST /workspaces com CRLF no nome:", s, (ws.get("name") if isinstance(ws, dict) else str(ws)[:160]))
if s in (200, 201):
    inj = sql1(f"insert into invitations (workspace_id, email, role, token_hash, expires_at, invited_by) values ('{ws['id']}', 'convidado.h2@contatos.example', 'editor', encode(sha256(random()::text::bytea), 'hex'), now() + interval '7 days', (select id from auth.users where email='{P}')) returning id")
    n_e = len(mailpit("espiao@contatos.example"))
    print("  worker:", drain(LOG))
    print("  e-mail do convite:", sql(f"select status, left(coalesce(error::text,''),100) from email_messages where idempotency_key='invitation:{inj}'"))
    got = mailpit("convidado.h2@contatos.example")
    print("  Mailpit convidado:", len(got), "| espião (Bcc injetado):", len(mailpit("espiao@contatos.example")) - n_e)
    if got:
        mid = got[0]["ID"]
        d = httpx.get(f"{MP}/message/{mid}", timeout=10).json()
        print("  Subject:", repr(d.get("Subject"))[:160])
        print("  Bcc:", d.get("Bcc"), "| To:", [t.get("Address") for t in d.get("To", [])])
        html = d.get("HTML", "")
        print("  HTML tem <img onerror> cru?", "<img src=x" in html, "| escapado?", "&lt;img" in html or "&lt;b&gt;" in html)
        print("  HTML trecho:", html[html.find("Padaria"):html.find("Padaria") + 120].replace("\n", " ") if "Padaria" in html else "(nome ausente)")
    sql1(f"delete from audit_events where workspace_id='{ws['id']}'; delete from workspaces where id='{ws['id']}' returning 1")
print("== 5. volta: Vitta pt-BR, Carla sem idioma, preferência ligada")
call("PATCH", f"/workspaces/{VITTA}", R, {"locale": "pt-BR"})
call("PUT", "/me/email-preferences/delivery_ready", C, {"enabled": True})
sql1("update auth.users set raw_user_meta_data = raw_user_meta_data - 'locale' where email='carla@vitta.example' returning 1")
print("  falhas no worker:", sum(1 for line in open(LOG) if "falhou" in line))
