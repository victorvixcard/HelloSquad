#!/usr/bin/env bash
# S2e: roteiro local da cobrança com o provedor simulado (sem conta em provedor, sem dinheiro de verdade).
# Pré-requisitos: make up && make seed; API no ar com PAYMENT_MOCK_WEBHOOK_SECRET (o mesmo valor deste
# shell). Rode da raiz do repositório. Depois do roteiro, `make seed` devolve a Miolo ao estado do seed.
set -euo pipefail
API=${API:-http://127.0.0.1:8100}
SECRET=${PAYMENT_MOCK_WEBHOOK_SECRET:?defina PAYMENT_MOCK_WEBHOOK_SECRET com o mesmo valor da API}
PK=$(sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' .env)
JWT=$(curl -s -X POST 'http://127.0.0.1:56321/auth/v1/token?grant_type=password' \
  -H "apikey: $PK" -H 'Content-Type: application/json' \
  -d '{"email":"marina@miolo.example","password":"Senha!Teste123"}' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])')
AUTH="Authorization: Bearer $JWT"
WS=$(curl -s "$API/workspaces" -H "$AUTH" | python3 -c '
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get("items", [])
print(next(w["id"] for w in items if w["slug"] == "miolo"))')
saldo() {
  curl -s "$API/me" -H "$AUTH" | python3 -c '
import sys, json
for m in json.load(sys.stdin)["memberships"]:
    if m["workspace"]["slug"] == "miolo":
        c = m["credits"]
        print({k: c[k] for k in ("plan", "balance", "available", "cycle_credits", "cycle_used")})'
}
assinar() { printf 'sha256=%s' "$(printf '%s' "$1" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')"; }

echo "# 1. Assinatura da Miolo (simulada) e histórico: créditos e estado, sem valor em dinheiro"
curl -s "$API/workspaces/$WS/billing/subscription" -H "$AUTH"; echo
curl -s "$API/workspaces/$WS/billing/payments?limit=5" -H "$AUTH"; echo

echo "# 2. Saldo antes"
saldo

echo "# 3. Webhook simulado: a recarga Pix pendente do seed foi paga"
BODY='{"id":"evt-roteiro-1","type":"payment.confirmed","payment":{"id":"mock_pay_miolo_recarga","status":"confirmed"}}'
curl -s -X POST "$API/billing/webhooks/mock" -H 'Content-Type: application/json' \
  -H "x-mock-signature: $(assinar "$BODY")" -d "$BODY"; echo

echo "# 4. O mesmo evento de novo: repetido, sem efeito"
curl -s -X POST "$API/billing/webhooks/mock" -H 'Content-Type: application/json' \
  -H "x-mock-signature: $(assinar "$BODY")" -d "$BODY"; echo

echo "# 5. Assinatura errada: recusado, nada gravado"
curl -s -w ' HTTP %{http_code}' -X POST "$API/billing/webhooks/mock" -H 'Content-Type: application/json' \
  -H 'x-mock-signature: sha256=00' -d "$BODY"; echo

echo "# 6. Cobrança que não é desta plataforma: 200 e ignorada (o provedor não reenvia)"
OUTRO='{"id":"evt-roteiro-2","type":"payment.confirmed","payment":{"id":"pagamento-alheio","status":"confirmed"}}'
curl -s -X POST "$API/billing/webhooks/mock" -H 'Content-Type: application/json' \
  -H "x-mock-signature: $(assinar "$OUTRO")" -d "$OUTRO"; echo

echo "# 7. Saldo depois (+50 da recarga) e histórico"
saldo
curl -s "$API/workspaces/$WS/billing/payments?limit=1" -H "$AUTH"; echo
