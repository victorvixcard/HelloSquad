#!/usr/bin/env bash
# Teste da guarda de segredo do infra/git-autosave.sh (H1-02, H2-07), num repositório temporário com remoto local.
# Os "segredos" são gerados na hora a partir de bytes aleatórios: nenhum valor real existe, e este arquivo não
# contém nada que a própria guarda recuse. Tudo fica em /tmp e é apagado no fim.
set -euo pipefail
AUTOSAVE="${AUTOSAVE:-$(cd "$(dirname "$0")/.." && pwd)/git-autosave.sh}"
ENV_EXAMPLE="$(cd "$(dirname "$0")/../.." && pwd)/.env.example"
TMP="$(mktemp -d /tmp/hellosquad-autosave-test.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT
export HOME="$TMP/home" GIT_CONFIG_NOSYSTEM=1
LOG="$HOME/.local/state/git-autosave.log"
rand() { LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$1" || true; }
digits() { LC_ALL=C tr -dc '0-9' </dev/urandom | head -c "$1" || true; }
hex() { LC_ALL=C tr -dc '0-9a-f' </dev/urandom | head -c "$1" || true; }

git init -q --bare "$TMP/remote.git"
git clone -q "$TMP/remote.git" "$TMP/repo" 2>/dev/null
cd "$TMP/repo"
echo "inicial" > README.md
git add README.md
git -c user.name=teste -c user.email=teste@hellosquad.example commit -q -m inicial
git push -q -u origin HEAD 2>/dev/null

fails=0 total=0
check_refused() {
  local name="$1" file="$2" value="$3" head_before code=0
  total=$((total + 1))
  head_before="$(git rev-parse HEAD)"
  "$AUTOSAVE" "$TMP/repo" "wip: teste" 2>"$TMP/stderr" || code=$?
  if [ "$code" -eq 2 ] && [ "$(git rev-parse HEAD)" = "$head_before" ] \
    && tail -n 1 "$LOG" | grep -q "POSSÍVEL SEGREDO.*$file" && grep -q "POSSÍVEL SEGREDO" "$TMP/stderr" \
    && ! grep -qF "$value" "$LOG" "$TMP/stderr"; then
    echo "ok   recusou: $name"
  else
    echo "FALHA não recusou: $name (saída $code)"; fails=$((fails + 1))
  fi
}

jwt="eyJ$(rand 36).eyJ$(rand 60).$(rand 43)"
printf 'curl -H "Authorization: Bearer %s" http://127.0.0.1:8100/v1/me\n' "$jwt" > prova.txt
check_refused "JWT em arquivo novo" prova.txt "$jwt"; rm prova.txt

cookie="base64-eyJ$(rand 80)"
mkdir -p docs/parciais/x
printf 'Cookie: sb-127-auth-token=%s\n' "$cookie" > docs/parciais/x/cookie.txt
check_refused "cookie de sessão em arquivo novo (subpasta)" docs/parciais/x/cookie.txt "$cookie"; rm -r docs

printf '[{"name":"sb-127-auth-token","value":"%s"}]\n' "$cookie" > storage-state.json
check_refused "valor do cookie em JSON (nome e valor separados)" storage-state.json "$cookie"; rm storage-state.json

secret="sb_secret_$(rand 31)"
printf 'SUPABASE_SECRET_KEY=%s\n' "$secret" > env.txt
check_refused "sb_secret_ com valor" env.txt "$secret"; rm env.txt

publishable="sb_publishable_$(rand 31)"
printf 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=%s\n' "$publishable" > web.env.txt
check_refused "sb_publishable_ com valor" web.env.txt "$publishable"; rm web.env.txt

anthropic="$(rand 48)"
printf 'ANTHROPIC_API_KEY=%s\n' "$anthropic" > llm.txt
check_refused "ANTHROPIC_API_KEY preenchida" llm.txt "$anthropic"; rm llm.txt

printf 'token: %s\n' "$jwt" >> README.md
check_refused "JWT em linha nova de arquivo versionado" README.md "$jwt"; git checkout -q README.md

# Cobrança (S2e, H2-07): chave do Asaas, Access Token do Mercado Pago e as variáveis de chave e de segredo de webhook.
anthropic_key="sk-ant-api03-$(rand 93)AA"
printf 'curl -H "x-api-key: %s" https://api.anthropic.com/v1/messages\n' "$anthropic_key" > roteiro-llm.sh
check_refused "chave da Anthropic (sk-ant-) em roteiro" roteiro-llm.sh "$anthropic_key"; rm roteiro-llm.sh

asaas="\$aact_hmlg_000$(rand 120)"
printf 'curl -H "access_token: %s" https://api-sandbox.asaas.com/v3/customers\n' "$asaas" > roteiro-asaas.sh
check_refused "chave do Asaas em roteiro" roteiro-asaas.sh "$asaas"; rm roteiro-asaas.sh

asaas_old="\$aact_$(rand 100)=="
printf '{"asaas": "%s"}\n' "$asaas_old" > asaas.json
check_refused "chave do Asaas no formato antigo (base64) em JSON" asaas.json "$asaas_old"; rm asaas.json

mp_prod="APP_USR-$(digits 16)-$(digits 6)-$(hex 32)-$(digits 9)"
printf 'curl -H "Authorization: Bearer %s" https://api.mercadopago.com/preapproval\n' "$mp_prod" > roteiro-mp.sh
check_refused "Access Token do Mercado Pago (APP_USR-) em roteiro" roteiro-mp.sh "$mp_prod"; rm roteiro-mp.sh

mp_test="TEST-$(digits 16)-$(digits 6)-$(hex 32)-$(digits 9)"
printf '{"access_token": "%s"}\n' "$mp_test" > mp.json
check_refused "Access Token de teste do Mercado Pago (TEST-) em JSON" mp.json "$mp_test"; rm mp.json

google_secret="GOCSPX-$(hex 28)"
printf '{"web": {"client_secret": "%s"}}\n' "$google_secret" > client_secret.json
check_refused "segredo de cliente OAuth do Google (GOCSPX-) em JSON" client_secret.json "$google_secret"; rm client_secret.json

meta_token="EAA$(hex 160)"
printf 'curl "https://graph.facebook.com/v26.0/me?access_token=%s"\n' "$meta_token" > roteiro-meta.sh
check_refused "token de acesso da Meta (EAA…) em roteiro" roteiro-meta.sh "$meta_token"; rm roteiro-meta.sh

google_access="ya29.$(hex 120)"; google_refresh="1//0$(hex 90)"
printf 'Authorization: Bearer %s\nrefresh_token=%s\n' "$google_access" "$google_refresh" > notas-google.md
check_refused "tokens do Google (ya29. e 1//0) em notas" notas-google.md "$google_access"; rm notas-google.md

for var in ASAAS_API_KEY ASAAS_WEBHOOK_TOKEN MERCADOPAGO_ACCESS_TOKEN MERCADOPAGO_WEBHOOK_SECRET MP_ACCESS_TOKEN \
  PAYMENT_MOCK_WEBHOOK_SECRET META_APP_SECRET GOOGLE_CLIENT_SECRET; do
  value="$(hex 48)"
  printf 'export %s="%s"\n' "$var" "$value" > .env.local
  check_refused "$var preenchida em arquivo novo" .env.local "$value"; rm .env.local
done

total=$((total + 1))
code=0; head_before="$(git rev-parse HEAD)"
printf 'cookie sb-127-auth-token: httpOnly=true\nANTHROPIC_API_KEY=\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ci_ficticia\nMETA_APP_SECRET=\nGOOGLE_CLIENT_SECRET=\naccess_token=EAAMockAbc123 ya29.mock-abc 1//mock-abc\n' > notas.md
"$AUTOSAVE" "$TMP/repo" "wip: teste" 2>"$TMP/stderr" || code=$?
if [ "$code" -eq 0 ] && [ "$(git rev-parse HEAD)" != "$head_before" ] && git log -1 --format=%s | grep -q '^wip: teste' \
  && [ "$(git rev-parse HEAD)" = "$(git --git-dir="$TMP/remote.git" rev-parse HEAD)" ]; then
  echo "ok   commitou e enviou: nome do cookie sem valor, ANTHROPIC_API_KEY vazia, chave fictícia curta, segredos Meta/Google vazios e tokens dos mocks"
else
  echo "FALHA texto sem segredo não foi commitado/enviado (saída $code)"; fails=$((fails + 1))
fi

# O .env.example de verdade (chaves vazias, URLs dos provedores preenchidas) e o nome citado em documento passam.
total=$((total + 1))
code=0; head_before="$(git rev-parse HEAD)"
cp "$ENV_EXAMPLE" .env.example
cat > cobranca.md <<'EOF'
Conta sandbox e chave de API ($aact_hmlg_…) em ASAAS_API_KEY; o token APP_USR-… ou TEST-… do Mercado Pago.
`ASAAS_API_KEY=`/`MERCADOPAGO_ACCESS_TOKEN=` preenchidos; ASAAS_API_KEY=<sua-chave-de-sandbox>
MERCADOPAGO_ACCESS_TOKEN="$MERCADOPAGO_ACCESS_TOKEN" e ASAAS_WEBHOOK_TOKEN=${ASAAS_WEBHOOK_TOKEN}
echo "PAYMENT_MOCK_WEBHOOK_SECRET=$(openssl rand -hex 24)" >> .env
ASAAS_KEY = "$aact_hmlg_000000000000_ficticia" e ANTHROPIC = "sk-ant-segredo-de-teste" (fictícias curtas dos testes)
EOF
"$AUTOSAVE" "$TMP/repo" "wip: teste" 2>"$TMP/stderr" || code=$?
if [ "$code" -eq 0 ] && [ "$(git rev-parse HEAD)" != "$head_before" ] && git ls-files --error-unmatch .env.example >/dev/null \
  && [ "$(git rev-parse HEAD)" = "$(git --git-dir="$TMP/remote.git" rev-parse HEAD)" ]; then
  echo "ok   commitou e enviou: .env.example com as chaves vazias e nomes citados em documento"
else
  echo "FALHA .env.example ou documento sem segredo não foi commitado/enviado (saída $code)"; fails=$((fails + 1))
fi

webhook_token="$(rand 40)"
sed -i "s|^ASAAS_WEBHOOK_TOKEN=\$|ASAAS_WEBHOOK_TOKEN=$webhook_token|" .env.example
check_refused "segredo de webhook preenchido no .env.example versionado" .env.example "$webhook_token"
git checkout -q .env.example 2>/dev/null || rm -f .env.example

[ "$fails" -eq 0 ] && echo "guarda do autosave: $total/$total" || { echo "guarda do autosave: $fails falha(s) em $total"; exit 1; }
