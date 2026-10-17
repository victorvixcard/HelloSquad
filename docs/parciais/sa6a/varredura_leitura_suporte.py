# SA6a: abre uma sessão de suporte real (Vic, Miolo, 15 min) na API local (8100), chama todo GET do produto
# com id do seed e encerra. Rodar de apps/backend com `uv run python`. Não imprime token.
import re, httpx, psycopg
from hellosquad.config import Settings
s = Settings()
API = "http://127.0.0.1:8100"
def login(email):
    r = httpx.post(f"{s.supabase_url}/auth/v1/token", params={"grant_type": "password"},
                   headers={"apikey": s.supabase_publishable_key},
                   json={"email": email, "password": "Senha!Teste123"}, timeout=10)
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
vic = login("vic@hellosquad.example")
with psycopg.connect(s.database_url.get_secret_value()) as db:
    q = lambda sql: (db.execute(sql).fetchone() or [None])[0]
    ws = q("select id from public.workspaces where slug = 'miolo'")
    ids = {
        "workspace_id": ws,
        "conversation_id": q(f"select id from public.conversations where workspace_id = '{ws}' order by created_at limit 1"),
        "work_item_id": q(f"select id from public.work_items where workspace_id = '{ws}' limit 1"),
        "project_id": q(f"select id from public.projects where workspace_id = '{ws}' limit 1"),
        "approval_id": q(f"select id from public.approvals where workspace_id = '{ws}' limit 1"),
        "run_id": q(f"select id from public.runs where workspace_id = '{ws}' limit 1"),
        "delivery_id": q(f"select id from public.deliveries where workspace_id = '{ws}' limit 1"),
    }
spec = httpx.get(f"{API}/openapi.json").json()
paths = [p for p, v in spec["paths"].items() if "get" in v and not p.startswith(("/admin", "/health", "/me", "/billing")) and "{" in p]
reason = "Varredura de leitura do suporte (SA6a)"
start = httpx.post(f"{API}/admin/accounts/{ids['workspace_id']}/support-session", headers=vic,
                   json={"reason": reason, "duration_minutes": 15})
print("sessão:", start.status_code)
try:
    for p in sorted(paths):
        names = re.findall(r"{(\w+)}", p)
        if any(ids.get(n) is None for n in names):
            print("  (sem id no seed)", p); continue
        url = p.format(**{n: ids[n] for n in names})
        r = httpx.get(API + url, headers=vic, timeout=20)
        code = r.json().get("error", {}).get("code", "") if r.status_code >= 400 else ""
        print(f"  {r.status_code} {code:28} GET {p}")
finally:
    end = httpx.delete(f"{API}/admin/accounts/{ids['workspace_id']}/support-session", headers=vic)
    print("fim:", end.status_code)
