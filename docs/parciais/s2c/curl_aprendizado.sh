#!/usr/bin/env bash
# S2c: critério da Fase 2 por curl contra a API local (8100) com o worker simulado em --drain. Marina pede a
# legenda do pão de abóbora ao Otto, pede ajuste com uma correção concreta, aprova a v2; a reflexão grava os
# aprendizados; o próximo pedido de 04.01 entra com eles no contexto e a entrega os respeita. No fim, a Vitta
# pede o mesmo e não recebe nada da Miolo, e o Pedro cria um negócio em espanhol e recebe as boas-vindas do Nexo.
# Uso (na raiz do repositório, com a API no ar e o seed aplicado): bash docs/parciais/s2c/curl_aprendizado.sh
# Nenhuma chave é impressa: a chave publicável sai do .env só para o login (dados fictícios). No fim, make seed.
set -euo pipefail

PK=$(sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' .env)
login() { curl -s -X POST 'http://127.0.0.1:56321/auth/v1/token?grant_type=password' \
  -H "apikey: $PK" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"Senha!Teste123\"}" \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])'; }
API=http://127.0.0.1:8100; JSON='Content-Type: application/json'
MARINA="Authorization: Bearer $(login marina@miolo.example)"
RAFAEL="Authorization: Bearer $(login rafael@vitta.example)"
PEDRO="Authorization: Bearer $(login pedro@semconta.example)"
field() { python3 -c 'import json, sys
d = json.load(sys.stdin)
for k in sys.argv[1].split("."): d = d[int(k)] if k.isdigit() else d[k]
print(d if isinstance(d, str) else json.dumps(d, ensure_ascii=False))' "$1"; }
sql() { docker exec supabase_db_hellosquad psql -U postgres -qtAc "$1"; }
pedir() {  # auth, workspace, pedido
  local conv msg
  conv=$(curl -s -X POST $API/workspaces/$2/conversations -H "$1" -H "$JSON" \
    -d '{"kind":"agent_direct","primary_agent_id":"otto"}' | field id)
  msg=$(curl -s -X POST $API/conversations/$conv/messages -H "$1" -H "$JSON" -d "{\"body\":\"$3\"}" | field id)
  curl -s -X POST $API/messages/$msg/work-items -H "$1" -H "$JSON" \
    -d '{"delivery_type":"04.01","title":"Legenda do pão de abóbora"}' | field id
}
worker() { (cd apps/backend && LLM_PROVIDER=simulated uv run hellosquad-worker --drain 2>&1 \
  | grep -E 'concluído|falhou|reflexão' | sed -E 's/(run|reflexão|trabalho) [0-9a-f-]{36}/\1 …/g'); }
texto() { curl -s $API/work-items/$2 -H "$1" | python3 -c 'import json, sys
w = json.load(sys.stdin); v = w["deliveries"][0]["versions"][-1]
print("  v%d | %s | %s" % (v["version_no"], w["status"], v["content"]["versoes"][0]["texto"].replace(chr(10), " / ")))'; }
pendente() { curl -s $API/work-items/$2 -H "$1" | field pending_approval.id; }
decidir() { curl -s -X POST $API/approvals/$2/decision -H "$1" -H "$JSON" -d "$3" | field work_item.status; }

MIOLO=$(curl -s $API/workspaces -H "$MARINA" | field items.0.id)
VITTA=$(curl -s $API/workspaces -H "$RAFAEL" | field items.0.id)

echo "== 1. Marina pede a legenda do pão de abóbora; o Otto entrega a v1"
W1=$(pedir "$MARINA" $MIOLO "Otto, preciso de uma legenda para o Instagram anunciando o pão de abóbora. Quero vender mais na loja.")
worker; texto "$MARINA" $W1

echo "== 2. Marina pede ajuste com uma correção concreta; nada entra na fila de reflexão (ajuste não fecha)"
decidir "$MARINA" $(pendente "$MARINA" $W1) '{"decision":"changes_requested","note":"Nunca use '"'"'promoção imperdível'"'"'; chame o cliente de '"'"'você'"'"'."}'
echo "  reflexões na fila: $(sql "select count(*) from pgmq.q_memory_reflect")"
worker; texto "$MARINA" $W1

echo "== 3. Marina aprova a v2: o trabalho fecha e a fila memory_reflect recebe o fechamento"
decidir "$MARINA" $(pendente "$MARINA" $W1) '{"decision":"approved"}'
sql "select '  desfecho: ' || (message->>'outcome') || ' | versões: ' || jsonb_array_length(message->'refs'->'versions') || ' | correção: ' || (message->'refs'->'corrections'->0->>'note') from pgmq.q_memory_reflect"

echo "== 4. O worker reflete: aprendizados do Otto com a Miolo (versão em vigor)"
worker
curl -s "$API/workspaces/$MIOLO/memory/learnings" -H "$MARINA" | python3 -c 'import json, sys
for i in json.load(sys.stdin)["items"]:
    print("  %-12s %-9s %-20s %s" % (i["topic"], i["status"], i["promotion_rule"] or "-", i["learning"]))'

echo "== 5. Próximo pedido de 04.01 da Miolo: o aprendizado entra no contexto e a entrega o respeita"
W2=$(pedir "$MARINA" $MIOLO "Otto, outra legenda para o Instagram: o pão de abóbora volta na sexta. Quero vender na loja.")
worker; texto "$MARINA" $W2
sql "select '  run_context_items: ' || string_agg(l.topic || ' (' || i.reason || ', ' || i.tokens || ' tokens)', ', ' order by l.topic) from public.run_context_items i join public.agent_learnings l on l.id = i.learning_id join public.runs r on r.id = i.run_id where r.work_item_id = '$W2'"

echo "== 6. Isolamento: a Vitta pede o mesmo e não recebe nada da Miolo"
W3=$(pedir "$RAFAEL" $VITTA "Otto, preciso de uma legenda para o Instagram anunciando o pão de abóbora. Quero vender mais na loja.")
worker; texto "$RAFAEL" $W3
echo "  aprendizados no contexto da Vitta: $(sql "select count(*) from public.run_context_items i join public.runs r on r.id = i.run_id where r.work_item_id = '$W3' and i.kind = 'learning'")"
echo "  GET learnings da Miolo pelo Rafael: $(curl -s -o /dev/null -w '%{http_code}' "$API/workspaces/$MIOLO/memory/learnings" -H "$RAFAEL")"

echo "== 7. Pedro cria um negócio em espanhol: conversa de boas-vindas com a primeira fala do Nexo"
SLUG="panaderia-pedro-$(date +%s)"
P=$(curl -s -X POST $API/workspaces -H "$PEDRO" -H "$JSON" -d "{\"name\":\"Panadería Pedro\",\"slug\":\"$SLUG\",\"locale\":\"es\"}" | field id)
C=$(curl -s $API/workspaces/$P/conversations -H "$PEDRO" | field items.0.id)
echo "  conversa: $(curl -s $API/workspaces/$P/conversations -H "$PEDRO" | field items.0.title)"
curl -s "$API/conversations/$C/messages" -H "$PEDRO" | python3 -c 'import json, sys
for m in json.load(sys.stdin)["items"]: print("  %s: %s" % (m.get("author_agent_id") or m["author_type"], m["body"]))'
curl -s -X POST $API/workspaces/$P/memory/facts -H "$PEDRO" -H "$JSON" \
  -d '{"area":"business","content":"Conseguir más pedidos","kind":"objective"}' | python3 -c 'import json, sys
f = json.load(sys.stdin); print("  objetivo guardado: %s · %s = %s (%s)" % (f["topic"], f["key"], f["content"], f["state"]))'
curl -s "$API/conversations/$C/messages" -H "$PEDRO" | python3 -c 'import json, sys
m = json.load(sys.stdin)["items"][-1]; print("  %s: %s" % (m.get("author_agent_id") or m["author_type"], m["body"]))'
sql "delete from public.audit_events where workspace_id = '$P'; delete from public.workspaces where id = '$P'" >/dev/null

echo "== 8. make seed (banco local de volta ao estado do seed)"
make -s seed >/dev/null && echo "  seed reaplicado"
