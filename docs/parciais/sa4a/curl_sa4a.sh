#!/usr/bin/env bash
# SA4a: roteiro de Consumo por cliente (alertas econômicos), Qualidade das entregas e Saúde das APIs
# contra a API local (8100). Rodar da raiz do repositório com o Supabase local e o seed. Não imprime token
# nem chave. Cruza a faixa com uma chamada fictícia temporária na Miolo (US$ 0,50 hoje) e, no fim, apaga o
# que o roteiro criou (run, saldo informado e o evento de auditoria dele), para o banco do dono voltar ao
# estado do seed.
set -euo pipefail
API=http://127.0.0.1:8100
PK=$(sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' .env)
DB="docker exec -i supabase_db_hellosquad psql -U postgres -Atq"
login() {
  curl -s -X POST 'http://127.0.0.1:56321/auth/v1/token?grant_type=password' \
    -H "apikey: $PK" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"Senha!Teste123\"}" \
    | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])'
}
VIC=$(login vic@hellosquad.example)
MARINA=$(login marina@miolo.example)
call() { # call <método> <jwt> <caminho> <corpo json ou -> <expressão python sobre r>
  local data=()
  [ "$4" != "-" ] && data=(-H 'Content-Type: application/json' -d "$4")
  curl -s -w '\n%{http_code}' -X "$1" "$API$3" -H "Authorization: Bearer $2" "${data[@]}" | python3 -c "
import sys, json
*body, status = sys.stdin.read().split('\n')
r = json.loads('\n'.join(body))
print('$1 $3 ->', status, $5)"
}
MIOLO=$($DB -c "select id from public.workspaces where slug = 'miolo'")

echo '== Faixas (proposta) e consumo do seed'
call GET "$VIC" /admin/alerts - '[(x["metric"], x["comparison"], x["threshold"], x["credit_reference_brl"], x["window_days"], "proposta" if x["proposal"] else "decidida") for x in r["alert_rules"]], "contas em alerta:", len(r["accounts"]), "saldos em alerta:", len(r["providers"])'
call GET "$VIC" "/admin/consumption?workspace_id=$MIOLO" - '[(i["workspace_name"], "solicitações", i["requests"], "créditos", i["credits_charged"], "IA US$", i["ai_cost_usd"], "turnos", i["turns"], i["economics"]) for i in r["items"]]'

echo '== Cruza a faixa: uma chamada fictícia de US$ 0,50 na Miolo hoje (10 créditos cobrados no seed)'
RUN=$($DB -c "insert into public.runs (workspace_id, agent_id, status, idempotency_key) values ('$MIOLO', 'nexo', 'succeeded', 'roteiro-sa4a-' || gen_random_uuid()) returning id" | head -1)
$DB -c "insert into public.run_steps (workspace_id, run_id, seq, kind, model, cost_usd, status) values ('$MIOLO', '$RUN', 1, 'llm_call', 'claude-opus-5-5', 0.50, 'succeeded')" > /dev/null
call GET "$VIC" "/admin/consumption?workspace_id=$MIOLO&granularity=week" - '[(i["workspace_name"], "IA R$", i["ai_cost_brl"], "por crédito", i["economics"]["ai_cost_per_credit_brl"], "margem", i["economics"]["gross_margin"], "alertas", [(a["metric"], a["value"], a["threshold"]) for a in i["economics"]["alerts"]]) for i in r["items"]], "semanas:", [(b["period_start"], b["ai_cost_usd"]) for b in r["series"]]'
call GET "$VIC" /admin/alerts - '[(a["workspace_name"], [x["metric"] for x in a["alerts"]]) for a in r["accounts"]]'
$DB -c "select 'nada mudou sozinho: saldo da Miolo ' || app.credit_balance('$MIOLO') || ', conta ' || coalesce(w.deleted_at::text, 'ativa') from public.workspaces w where w.id = '$MIOLO'"

echo '== Qualidade (seed sem trabalho decidido: vazio honesto) e "como ler"'
call GET "$VIC" "/admin/quality?locale=es" - '"por tipo:", len(r["by_type"]), "por versão:", len(r["by_prompt_version"]), "como ler:", [h["title"] for h in r["how_to_read"]]'
call GET "$VIC" "/admin/quality/compare?a_since=2026-09-01&a_until=2026-09-30&b_since=2026-10-01&b_until=2026-10-16" - '"a:", r["a"]["totals"]["deliveries"], "b:", r["b"]["totals"]["deliveries"], "delta:", r["delta"]'

echo '== Saúde das APIs e saldo informado'
call GET "$VIC" /admin/providers - '[(p["provider"], p["status"], p["key"], p["calls_24h"], p["spend_usd"]["total"] if p["spend_usd"] else None, p["reported_balance"]) for p in r["items"]]'
NOW=$(date -Iseconds)
call PATCH "$VIC" /admin/providers/anthropic/balance "{\"amount\": \"38.00\", \"currency\": \"USD\", \"read_at\": \"$NOW\", \"reason\": \"Saldo lido no console da Anthropic (roteiro SA4a)\", \"alert_below\": \"50.00\"}" '(r["provider"], r["reported_balance"], r["reported_balance_currency"], "limiar", r["alert_below"], "alerta", r["balance_alert"], "por", r["balance_history"][0]["reported_by_email"])'
call GET "$VIC" /admin/alerts - '"saldos em alerta:", [(p["provider"], p["reported_balance"], p["alert_below"]) for p in r["providers"]]'
call GET "$VIC" "/admin/audit?actor=platform_admin&category=configuration" - '[(i["action"], i["actor_email"], i["payload"].get("reason")) for i in r["items"] if i["action"] == "admin.provider_balance_reported"][:1]'
call PATCH "$VIC" /admin/providers/anthropic/balance "{\"amount\": \"10\", \"currency\": \"USD\", \"read_at\": \"$NOW\", \"reason\": \"curto\"}" 'r["error"]["code"]'

echo '== Marina (owner, sem papel de plataforma)'
for p in /admin/consumption /admin/alerts /admin/quality /admin/providers; do
  call GET "$MARINA" "$p" - 'r["error"]["code"]'
done
call PATCH "$MARINA" /admin/providers/anthropic/balance "{\"amount\": \"10\", \"currency\": \"USD\", \"read_at\": \"$NOW\", \"reason\": \"Tentativa de quem não é Super Admin\"}" 'r["error"]["code"]'

echo '== Limpeza (volta ao seed)'
$DB -c "delete from public.runs where id = '$RUN'" > /dev/null
$DB -c "delete from public.provider_balance_reports" > /dev/null
$DB -c "update public.provider_health set reported_balance = null, reported_balance_currency = null, reported_balance_at = null, alert_below = null" > /dev/null
$DB -c "delete from public.audit_events where action = 'admin.provider_balance_reported'" > /dev/null
call GET "$VIC" /admin/alerts - '"contas em alerta:", len(r["accounts"]), "saldos em alerta:", len(r["providers"])'
