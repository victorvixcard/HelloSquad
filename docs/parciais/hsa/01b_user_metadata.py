"""H-SA alvo 1 (complemento) — a Marina grava no próprio user_metadata (a Auth deixa) os campos platform_admin, role e
is_super_admin; o token novo, com assinatura válida, carrega os campos. /admin/* precisa continuar 403. O 01 mandou
user_metadata e app_metadata juntos e a Auth recusou o pedido inteiro (403), por isso este complemento só com `data`.
Restaura o user_metadata exatamente como estava. Uso: apps/backend/.venv/bin/python docs/parciais/hsa/01b_user_metadata.py
"""
import base64
import json
import sys

import httpx

sys.path.insert(0, "/home/vitao/projetos/hellosquad/docs/parciais/hsa")
from hsalib import MIOLO, M, PK, SUPABASE_URL, call, dump, login, sql, sql1, token  # noqa: E402

orig = sql1("select raw_user_meta_data::text from auth.users where email='marina@miolo.example'")
r = httpx.put(f"{SUPABASE_URL}/auth/v1/user", headers={"apikey": PK, "Authorization": f"Bearer {token(M)}"},
              json={"data": {"platform_admin": True, "role": "platform_admin", "is_super_admin": True}}, timeout=20)
print("PUT /auth/v1/user só com data:", r.status_code)
t = login(M)["access_token"]
c = json.loads(base64.urlsafe_b64decode(t.split(".")[1] + "=="))
print("user_metadata no token novo:", c.get("user_metadata"))
for method, path, body in [("GET", "/admin/me", None), ("GET", "/admin/accounts", None), ("GET", "/admin/audit", None),
                           ("POST", f"/admin/accounts/{MIOLO}/credit-adjustments", {"amount": "500", "reason": "Teste de escalonamento da H-SA"})]:
    s, d = call(method, path, bearer=t, body=body)
    print(f"  {method} {path}: {s} {dump(d, 90)}")
sql(f"update auth.users set raw_user_meta_data = $${orig}$$::jsonb where email='marina@miolo.example'")
print("user_metadata restaurado:", sql1("select raw_user_meta_data::text from auth.users where email='marina@miolo.example'") == orig)
