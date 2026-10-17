#!/usr/bin/env bash
# SA1: roteiro do painel /admin/* contra a API local (8100). Rodar da raiz do repositório com o Supabase
# local e a API no ar. Não imprime token nem chave: só status e um recorte de cada resposta.
set -euo pipefail
API=http://127.0.0.1:8100
PK=$(sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' .env)
login() {
  curl -s -X POST 'http://127.0.0.1:56321/auth/v1/token?grant_type=password' \
    -H "apikey: $PK" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"Senha!Teste123\"}" \
    | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])'
}
VIC=$(login vic@hellosquad.example)
MARINA=$(login marina@miolo.example)
get() { # get <jwt> <caminho> <expressão python sobre r (resposta)>
  curl -s -w '\n%{http_code}' "$API$2" -H "Authorization: Bearer $1" | python3 -c "
import sys, json
*body, status = sys.stdin.read().split('\n')
r = json.loads('\n'.join(body))
print('$2 ->', status, $3)"
}
echo '== Vic (Super Admin fictício)'
get "$VIC" /admin/me 'r["email"], "mfa_enforced:", r["mfa_enforced"]'
get "$VIC" /admin/accounts '"contas:", r["totals"], [a["slug"] for a in r["items"]]'
WS=$(curl -s "$API/admin/accounts?q=miolo" -H "Authorization: Bearer $VIC" | python3 -c 'import sys, json; print(json.load(sys.stdin)["items"][0]["id"])')
get "$VIC" "/admin/accounts/$WS" '"membros:", [m["email"] + "/" + m["role"] for m in r["members"]], "créditos:", r["credits"], "auditoria:", r["audit_event_id"][:8]'
get "$VIC" /admin/catalog '"itens:", len(r["items"]), "à venda:", sum(i["for_sale"] for i in r["items"]), "primeiro:", r["items"][0]["delivery_type"], r["items"][0]["depth"], r["items"][0]["depth_source"], r["items"][0]["price"]["credits"], "provisório" if r["items"][0]["price"]["provisional"] else ""'
get "$VIC" /admin/plans '[(p["slug"], str(p["credits"]), "à venda" if p["for_sale"] else "fora de venda") for p in r["plans"]], [(t["slug"], str(t["amount"])) for t in r["topups"]]'
get "$VIC" /admin/payments '[(p["provider"], p["api_key"], "selecionado" if p["selected"] else "") for p in r["providers"]], "assinaturas:", len(r["subscriptions"]), "cobranças:", len(r["payments"]), "eventos:", len(r["webhooks"])'
get "$VIC" "/admin/audit?actor=platform_admin&category=support_access&limit=3" '[(i["action"], i["actor_email"], i["workspace_name"]) for i in r["items"]]'
get "$VIC" /admin/queue '"filas:", [(q["queue_name"], q["queued"]) for q in r["queues"]], "estados:", r["status_counts"]'
RUN=$(curl -s "$API/admin/queue?limit=1" -H "Authorization: Bearer $VIC" | python3 -c 'import sys, json; print(json.load(sys.stdin)["runs"][0]["id"])')
get "$VIC" "/admin/queue/runs/$RUN" '"run:", r["run"]["status"], r["run"]["agent_id"], "passos:", len(r["steps"]), "eventos:", len(r["events"])'
get "$VIC" /admin/models '"preços:", [(p["model"], str(p["input_usd_per_mtok"]), str(p["output_usd_per_mtok"])) for p in r["prices"]], "câmbio:", r["exchange_rate"]["usd_brl"], "regras:", len(r["rules"])'
get "$VIC" "/admin/consumption?since=2026-09-17&until=2026-10-16" '"contas:", [(i["workspace_name"], i["llm_calls"], str(i["ai_cost_usd"])) for i in r["items"]]'
get "$VIC" "/admin/quality?since=2026-08-01&until=2026-10-31" '"por tipo:", [(q["key"], q["deliveries"], q["approved_first_time"]) for q in r["by_type"]]'
get "$VIC" /admin/providers '[(p["provider"], p["status"], p["key"]) for p in r["items"]]'
echo '== Marina (owner da Miolo)'
get "$MARINA" /admin/accounts 'r["error"]["code"], r["error"]["message"]'
get "$MARINA" "/admin/accounts/$WS" 'r["error"]["code"]'
echo '== Data API com o JWT do Vic'
curl -s -w ' -> %{http_code}\n' "http://127.0.0.1:56321/rest/v1/delivery_catalog?limit=1" -H "apikey: $PK" -H "Authorization: Bearer $VIC"
