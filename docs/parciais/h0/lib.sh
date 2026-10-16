# H0 — funções de apoio das provas. Uso: `source docs/parciais/h0/lib.sh` na raiz do repositório.
# Lê as chaves locais do .env em tempo de execução e nunca as imprime.

H0_ROOT="${H0_ROOT:-$(git rev-parse --show-toplevel)}"
H0_SUPA="http://127.0.0.1:56321"
H0_API="http://127.0.0.1:8100"
H0_PK="$(sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' "$H0_ROOT/.env")"
H0_PASS='Senha!Teste123'

# Access token de um usuário do seed (login pela Auth local com a chave publicável).
h0_login() {
  curl -s -X POST "$H0_SUPA/auth/v1/token?grant_type=password" \
    -H "apikey: $H0_PK" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"${2:-$H0_PASS}\"}" \
    | python3 -c 'import sys, json; print(json.load(sys.stdin).get("access_token", ""))'
}

# Chamada à API FastAPI: h0_api MÉTODO CAMINHO TOKEN [JSON]. Imprime "HTTP <status> <corpo cortado>".
h0_api() {
  local method="$1" path="$2" token="$3" data="${4:-}"
  local args=(-s -o /tmp/h0_body -w '%{http_code}' -X "$method" "$H0_API$path")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$data" ] && args+=(-H 'Content-Type: application/json' -d "$data")
  local code; code="$(curl "${args[@]}")"
  echo "HTTP $code $(head -c 300 /tmp/h0_body)"
}

# Chamada à Data API (PostgREST) com a chave publicável: h0_rest MÉTODO CAMINHO TOKEN [JSON] [cabeçalho extra].
h0_rest() {
  local method="$1" path="$2" token="$3" data="${4:-}" extra="${5:-}"
  local args=(-s -o /tmp/h0_body -w '%{http_code}' -X "$method" "$H0_SUPA$path" -H "apikey: $H0_PK")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$data" ] && args+=(-H 'Content-Type: application/json' -d "$data")
  [ -n "$extra" ] && args+=(-H "$extra")
  local code; code="$(curl "${args[@]}")"
  echo "HTTP $code $(head -c 300 /tmp/h0_body)"
}

# psql como postgres no container do HelloSquad (só leitura de estado e preparação de cenário).
h0_psql() {
  docker exec -i supabase_db_hellosquad psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qAt "$@"
}
