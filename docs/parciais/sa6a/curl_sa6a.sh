#!/usr/bin/env bash
# SA6a: roteiro da escrita do Super Admin e da sessão de suporte contra a API local (8100). Rodar da raiz do
# repositório com o Supabase local e o seed. Não imprime token nem chave. Tudo o que o roteiro faz fica na
# auditoria (nada se apaga); no fim o run fictício sai e o `make seed` devolve saldo, preço e estado da conta.
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
ERR='r.get("error", {}).get("code"), r.get("error", {}).get("message")'
MIOLO=$($DB -c "select id from public.workspaces where slug = 'miolo'")
REASON='Conferência pedida pela titular no chamado 42'

echo '== A Marina (owner) não escreve pelo painel'
call POST "$MARINA" "/admin/accounts/$MIOLO/support-session" "{\"reason\":\"$REASON\",\"duration_minutes\":15}" "$ERR"
call POST "$MARINA" "/admin/accounts/$MIOLO/credit-adjustments" "{\"amount\":\"100\",\"reason\":\"$REASON\"}" "$ERR"

echo '== Sessão de suporte (só leitura, 15 min)'
call GET "$VIC" "/workspaces/$MIOLO/conversations" - "$ERR"
call POST "$VIC" "/admin/accounts/$MIOLO/support-session" "{\"reason\":\"curto\",\"duration_minutes\":15}" '"motivo curto recusado"'
call POST "$VIC" "/admin/accounts/$MIOLO/support-session" "{\"reason\":\"$REASON\",\"duration_minutes\":15}" 'r["status"], r["mode"], r["started_at"], "→", r["expires_at"]'
call GET "$VIC" "/workspaces/$MIOLO/conversations" - '"conversas lidas:", len(r["items"])'
call GET "$VIC" "/workspaces/$MIOLO/work-items" - '"trabalhos lidos:", len(r["items"])'
call POST "$VIC" "/workspaces/$MIOLO/conversations" '{"kind":"agent_direct","primary_agent_id":"otto"}' "$ERR"
$DB -c "select 'e-mail ao titular: ' || recipient_email || ' · ' || template || ' · ' || locale || ' · ' || status || ' · ' || (variables ->> 'minutes') || ' min' from public.email_messages where template = 'support_session_started' order by created_at desc limit 1"
call DELETE "$VIC" "/admin/accounts/$MIOLO/support-session" - 'r["status"], r["ended_at"]'
call GET "$VIC" "/workspaces/$MIOLO/conversations" - "$ERR"

echo '== Ajuste de crédito (motivo; nunca negativo)'
call POST "$VIC" "/admin/accounts/$MIOLO/credit-adjustments" "{\"amount\":\"5\",\"reason\":\"$REASON\"}" 'r["balance_before"], "→", r["balance_after"]'
call POST "$VIC" "/admin/accounts/$MIOLO/credit-adjustments" "{\"amount\":\"-100000\",\"reason\":\"$REASON\"}" "$ERR"
call POST "$VIC" "/admin/accounts/$MIOLO/credit-adjustments" "{\"amount\":\"-5\",\"reason\":\"$REASON\"}" 'r["balance_before"], "→", r["balance_after"]'

echo '== Suspender e reativar (pausa cobrança e rotinas; não cancela)'
call POST "$VIC" "/admin/accounts/$MIOLO/suspend" "{\"reason\":\"$REASON\"}" 'r["status"], r["suspension_reason"]'
call GET "$MARINA" /me - '[(m["workspace"]["slug"], m["workspace_status"]) for m in r["memberships"]]'
$DB -c "select 'assinatura da Miolo: ' || status from public.subscriptions where workspace_id = '$MIOLO'"
call POST "$VIC" "/admin/accounts/$MIOLO/reactivate" "{\"reason\":\"$REASON\"}" 'r["status"]'

echo '== Catálogo: "à venda" exige homologação e preço aprovado'
call PUT "$VIC" /admin/catalog/04.01/for-sale "{\"for_sale\":true,\"reason\":\"$REASON\"}" "$ERR"
call PUT "$VIC" /admin/catalog/04.01/price "{\"credits\":\"12\",\"reason\":\"$REASON\"}" 'r["credits"], "provisório" if r["provisional"] else "definitivo", "aprovado" if r["approved_commercially"] else "sem aprovação"'

echo '== Fila: reenfileirar e cancelar com motivo'
RUN=$($DB -c "insert into public.runs (workspace_id, agent_id, status, idempotency_key, started_at, finished_at) values ('$MIOLO', 'otto', 'failed', 'roteiro-sa6a-' || gen_random_uuid(), now() - interval '5 minutes', now() - interval '4 minutes') returning id" | head -1)
call POST "$VIC" "/admin/queue/runs/$RUN/requeue" "{\"reason\":\"$REASON\"}" 'r["status"], "tentativas", r["attempts"]'
call POST "$VIC" "/admin/queue/runs/$RUN/cancel" "{\"reason\":\"$REASON\"}" 'r["status"]'
call POST "$VIC" "/admin/payments/webhooks/$(python3 -c 'import uuid; print(uuid.uuid4())')/reprocess" "{\"reason\":\"$REASON\"}" "$ERR"

echo '== Auditoria do Super Admin (quem, quando, motivo)'
call GET "$VIC" "/admin/audit?actor=platform_admin&limit=14" - '[(i["action"], i["actor_email"], (i["payload"] or {}).get("reason")) for i in r["items"]]'

$DB -c "select pgmq.delete('runs_interactive', msg_id) from pgmq.q_runs_interactive where message ->> 'run_id' = '$RUN'" > /dev/null
$DB -c "delete from public.runs where id = '$RUN'" > /dev/null
$DB -c "delete from public.delivery_prices where delivery_type = '04.01' and id <> md5('seed:price:04.01')::uuid" > /dev/null
make -s seed > /dev/null
$DB -c "select 'depois do seed: saldo da Miolo ' || app.credit_balance('$MIOLO') || ', preço 04.01 ' || (app.current_delivery_price('04.01')).credits || ', suspensa ' || (suspended_at is not null) from public.workspaces where id = '$MIOLO'"
