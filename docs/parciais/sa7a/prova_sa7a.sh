#!/usr/bin/env bash
# SA7a: prova ao vivo na API do dono (8100) e na Data API local. Não imprime token nem chave.
set -uo pipefail
cd "$(dirname "$0")/../../.."
PK=$(sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' .env)
AUTH_URL=http://127.0.0.1:56321
API=http://127.0.0.1:8100
token() {
  curl -s -X POST "$AUTH_URL/auth/v1/token?grant_type=password" -H "apikey: $PK" -H 'Content-Type: application/json' \
    -d "{\"email\": \"$1\", \"password\": \"Senha!Teste123\"}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])'
}
VIC=$(token vic@hellosquad.example); MARINA=$(token marina@miolo.example); PEDRO=$(token pedro@semconta.example)
code() { curl -s -o /tmp/sa7a_body.json -w '%{http_code}' "$@"; }
echo "== H-SA-02: GET /me"
for who in VIC MARINA PEDRO; do
  t=${!who}
  echo "$who: $(curl -s "$API/me" -H "Authorization: Bearer $t" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("is_platform_admin =", d["is_platform_admin"], "| memberships =", len(d["memberships"]))')"
done
echo "== H-SA-01: Data API (o motivo não existe mais nas tabelas do produto; as tabelas do motivo fecham)"
echo "Pedro delivery_prices?select=note: $(code "http://127.0.0.1:56321/rest/v1/delivery_prices?select=note&limit=1" -H "apikey: $PK" -H "Authorization: Bearer $PEDRO") $(python3 -c 'import json; print(json.load(open("/tmp/sa7a_body.json")).get("code"))')"
echo "Pedro delivery_prices?select=credits (o produto lê o preço): $(code "http://127.0.0.1:56321/rest/v1/delivery_prices?select=credits&delivery_type=eq.04.01" -H "apikey: $PK" -H "Authorization: Bearer $PEDRO")"
echo "Pedro delivery_price_notes: $(code "http://127.0.0.1:56321/rest/v1/delivery_price_notes" -H "apikey: $PK" -H "Authorization: Bearer $PEDRO") $(python3 -c 'import json; print(json.load(open("/tmp/sa7a_body.json")).get("code"))')"
echo "Marina workspaces?select=suspension_reason: $(code "http://127.0.0.1:56321/rest/v1/workspaces?select=suspension_reason" -H "apikey: $PK" -H "Authorization: Bearer $MARINA") $(python3 -c 'import json; print(json.load(open("/tmp/sa7a_body.json")).get("code"))')"
echo "Marina workspace_suspension_reasons: $(code "http://127.0.0.1:56321/rest/v1/workspace_suspension_reasons" -H "apikey: $PK" -H "Authorization: Bearer $MARINA") $(python3 -c 'import json; print(json.load(open("/tmp/sa7a_body.json")).get("code"))')"
echo "anon delivery_price_notes: $(code "http://127.0.0.1:56321/rest/v1/delivery_price_notes" -H "apikey: $PK") $(python3 -c 'import json; print(json.load(open("/tmp/sa7a_body.json")).get("code"))')"
echo "== /admin/accounts com o Vic (a rota lê o motivo pela tabela do painel)"
echo "GET /admin/accounts: $(code "$API/admin/accounts" -H "Authorization: Bearer $VIC") | itens com suspension_reason na resposta: $(python3 -c 'import json; d=json.load(open("/tmp/sa7a_body.json")); print(sum("suspension_reason" in i for i in d["items"]), "de", len(d["items"]))')"
echo "Marina GET /admin/accounts: $(code "$API/admin/accounts" -H "Authorization: Bearer $MARINA")"
rm -f /tmp/sa7a_body.json
