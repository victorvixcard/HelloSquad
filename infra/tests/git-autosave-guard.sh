#!/usr/bin/env bash
# Teste da guarda de segredo do infra/git-autosave.sh (H1-02), num repositório temporário com remoto local.
# Os "segredos" são gerados na hora a partir de bytes aleatórios: nenhum valor real existe, e este arquivo não
# contém nada que a própria guarda recuse. Tudo fica em /tmp e é apagado no fim.
set -euo pipefail
AUTOSAVE="${AUTOSAVE:-$(cd "$(dirname "$0")/.." && pwd)/git-autosave.sh}"
TMP="$(mktemp -d /tmp/hellosquad-autosave-test.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT
export HOME="$TMP/home" GIT_CONFIG_NOSYSTEM=1
LOG="$HOME/.local/state/git-autosave.log"
rand() { LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$1" || true; }

git init -q --bare "$TMP/remote.git"
git clone -q "$TMP/remote.git" "$TMP/repo" 2>/dev/null
cd "$TMP/repo"
echo "inicial" > README.md
git add README.md
git -c user.name=teste -c user.email=teste@hellosquad.example commit -q -m inicial
git push -q -u origin HEAD 2>/dev/null

fails=0
check_refused() {
  local name="$1" file="$2" value="$3" head_before code=0
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

printf 'cookie sb-127-auth-token: httpOnly=true\nANTHROPIC_API_KEY=\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ci_ficticia\n' > notas.md
code=0; "$AUTOSAVE" "$TMP/repo" "wip: teste" 2>"$TMP/stderr" || code=$?
if [ "$code" -eq 0 ] && git log -1 --format=%s | grep -q '^wip: teste' \
  && [ "$(git rev-parse HEAD)" = "$(git --git-dir="$TMP/remote.git" rev-parse HEAD)" ]; then
  echo "ok   commitou e enviou: nome do cookie sem valor, ANTHROPIC_API_KEY vazia, chave fictícia curta"
else
  echo "FALHA texto sem segredo não foi commitado/enviado (saída $code)"; fails=$((fails + 1))
fi

[ "$fails" -eq 0 ] && echo "guarda do autosave: 8/8" || { echo "guarda do autosave: $fails falha(s)"; exit 1; }
