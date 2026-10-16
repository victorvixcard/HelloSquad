#!/usr/bin/env bash
# S2a: cada delivery da Bia e do Otto pedida por curl contra a API local (8100), com o worker simulado.
# Uso (na raiz do repositório, com make dev-api no ar e o seed aplicado):
#   bash docs/parciais/s2a/curl_bia_otto.sh
# Nenhuma chave é impressa: a chave publicável sai do .env só para o login da Marina (dado fictício).
set -euo pipefail

PK=$(sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' .env)
JWT=$(curl -s -X POST 'http://127.0.0.1:56321/auth/v1/token?grant_type=password' \
  -H "apikey: $PK" -H 'Content-Type: application/json' \
  -d '{"email":"marina@miolo.example","password":"Senha!Teste123"}' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])')
API=http://127.0.0.1:8100; AUTH="Authorization: Bearer $JWT"; JSON='Content-Type: application/json'
field() { python3 -c 'import json, sys
d = json.load(sys.stdin)
for k in sys.argv[1].split("."): d = d[int(k)] if k.isdigit() else d[k]
print(d if isinstance(d, str) else json.dumps(d, ensure_ascii=False))' "$1"; }
WS=$(curl -s $API/workspaces -H "$AUTH" | field items.0.id)                             # Miolo

# A Miolo do seed tem 36 créditos (provisórios): dá para 3 pedidos de 10. A demonstração faz 9, então
# concede um bônus local de 100 pelo papel privilegiado (só no banco local; make seed devolve o saldo).
docker exec supabase_db_hellosquad psql -U postgres -qtAc \
  "select remaining from app.grant_credits('$WS', 100, 'bonus', 'demo:s2a:$(date +%s)', p_note => 'Demonstração local da S2a')" \
  | sed 's/^/bônus local concedido: /'

# Pedido na conversa direta com o especialista → trabalho com run na fila. Ecoa o id do trabalho.
pedir() {  # agente, delivery, título, pedido
  local conv msg
  conv=$(curl -s -X POST $API/workspaces/$WS/conversations -H "$AUTH" -H "$JSON" \
    -d "{\"kind\":\"agent_direct\",\"primary_agent_id\":\"$1\"}" | field id)
  msg=$(curl -s -X POST $API/conversations/$conv/messages -H "$AUTH" -H "$JSON" \
    -d "{\"body\":\"$4\"}" | field id)
  curl -s -X POST $API/messages/$msg/work-items -H "$AUTH" -H "$JSON" \
    -d "{\"delivery_type\":\"$2\",\"title\":\"$3\"}" | field id
}
worker() { (cd apps/backend && LLM_PROVIDER=simulated WORKER_WORKSPACE_CAP=8 "$@" uv run hellosquad-worker --drain 2>&1 \
  | grep -E 'concluído|falhou' | sed -E 's/run [0-9a-f-]+/run …/'); }
aprovar() {  # trabalho
  local ap
  ap=$(curl -s $API/work-items/$1 -H "$AUTH" | field pending_approval.id)
  curl -s -X POST $API/approvals/$ap/decision -H "$AUTH" -H "$JSON" -d '{"decision":"approved"}' \
    | field status
}
resumo() {  # trabalho
  curl -s $API/work-items/$1 -H "$AUTH" | python3 -c 'import json, sys
w = json.load(sys.stdin); d = w["deliveries"][0]; v = d["versions"][-1]
print(" ", w["delivery_type"], "|", w["status"], "|", w["status_label"], "|", d["kind"], "v%d" % v["version_no"], "|", ", ".join(sorted(v["content"])))'
}

echo "== 1. Bia 02.01, 02.02, 02.03, 02.04 e Otto 04.03: pedido → trabalho → entrega"
D1=$(pedir bia 02.01 "Diagnóstico de marketing" "Bia, quero um diagnóstico do marketing da Miolo. O objetivo é vender mais até o Natal.")
D2=$(pedir bia 02.02 "Posicionamento da Miolo" "Bia, documente o posicionamento, o público e os objetivos da Miolo.")
D3=$(pedir bia 02.03 "Plano até o Natal" "Bia, preciso de um plano de marketing com prioridades para vender mais até o Natal.")
D4=$(pedir bia 02.04 "Estratégia de Natal" "Bia, quero a estratégia da campanha de Natal para vender encomendas antecipadas.")
worker
for w in $D1 $D2 $D3 $D4; do resumo $w; done

echo "== 2. Aprovação da dona da conta (owner): a 02.04 aprovada vira a referência do Otto"
for w in $D1 $D2 $D3 $D4; do echo "  $(aprovar $w)"; done
O3=$(pedir otto 04.03 "Bastidores do sábado" "Otto, quero um reels para o Instagram e um status de WhatsApp sobre os bastidores da fornada de sábado.")
O2=$(pedir otto 04.02 "Calendário da semana 43" "Otto, monte o calendário editorial da próxima semana, de 19 a 25/10.")
worker
resumo $O3; resumo $O2
curl -s $API/work-items/$O3 -H "$AUTH" | field deliveries.0.versions.0.content.estrategia
echo "  calendário (propostas antes da aprovação):"
curl -s "$API/workspaces/$WS/calendar?from=2026-10-19&to=2026-10-25" -H "$AUTH" | python3 -c 'import json, sys
for p in json.load(sys.stdin)["items"]: print("   ", p["scheduled_on"], (p["scheduled_time"] or "")[:5], p["channel"], p["format"], p["owner_agent_id"], p["status"], "·", p["theme"])'
echo "  $(aprovar $O2) · $(aprovar $O3)"
echo "  calendário (depois da aprovação):"
curl -s "$API/workspaces/$WS/calendar?from=2026-10-19&to=2026-10-25" -H "$AUTH" | python3 -c 'import json, sys
print("   ", sorted({p["status"] for p in json.load(sys.stdin)["items"]}))'

echo "== 3. Bia 02.07 sem busca (padrão) e com a busca mock (WEB_SEARCH_PROVIDER=mock)"
R1=$(pedir bia 02.07 "Concorrentes e tendências" "Bia, pesquise os concorrentes do bairro e as tendências de fim de ano.")
worker
curl -s $API/work-items/$R1 -H "$AUTH" | python3 -c 'import json, sys
c = json.load(sys.stdin)["deliveries"][0]["versions"][0]["content"]
print("  pesquisa:", c["pesquisa"]["estado"], "| fontes:", len(c["fontes"]), "| achados:", [a["tipo"] for a in c["achados"]])'
R2=$(pedir bia 02.07 "Concorrentes e tendências (com busca)" "Bia, pesquise os concorrentes do bairro e as tendências de fim de ano.")
worker env WEB_SEARCH_PROVIDER=mock
curl -s $API/work-items/$R2 -H "$AUTH" | python3 -c 'import json, sys
c = json.load(sys.stdin)["deliveries"][0]["versions"][0]["content"]
print("  pesquisa:", c["pesquisa"]["estado"], c["pesquisa"]["provedor"], "| achados:", [(a["tipo"], a["fontes"]) for a in c["achados"]])
for f in c["fontes"]: print("   ", f["id"], f["url"], "publicado", f["publicado_em"], "coletado", f["coletado_em"][:10])'

echo "== 4. Conversa do ambiente (H1-04): uma por ambiente, primeira fala e sugestões"
for i in 1 2; do
  curl -s -o /tmp/env.json -w '  HTTP %{http_code} ' -X POST $API/workspaces/$WS/conversations -H "$AUTH" -H "$JSON" \
    -d '{"kind":"object","context":{"type":"environment","key":"bia","title":"Estratégia"}}'
  field id < /tmp/env.json
done
field opening < /tmp/env.json
curl -s -X POST $API/workspaces/$WS/conversations -H "$AUTH" -H "$JSON" \
  -d '{"kind":"object","context":{"type":"environment","key":"otto","title":"Conteúdo"}}' | field opening.message
