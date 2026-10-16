#!/usr/bin/env bash
# S0b (H0-06): segue o "Subir do zero" do docs/SETUP_LOCAL.md num clone limpo do GitHub em /tmp.
# Antes, a ordem antiga: `make up` sem .env (deve só avisar) e `make migrate` sem .env (deve falhar).
# Saída longa em /tmp/s0b_clone_*.log; aqui só o resumo, sem imprimir chave. O clone tem .env com
# chaves locais e é apagado no fim. Troca a senha do hellosquad_api: rode `make seed` no repo depois.
set -uo pipefail
ROOT=/tmp/s0b_clone
rm -rf "$ROOT" && mkdir -p "$ROOT" && cd "$ROOT" || exit 1

step() {
  local name=$1
  shift
  "$@" > "/tmp/s0b_clone_${name}.log" 2>&1
  local rc=$?
  echo "$name exit=$rc"
  return 0
}

git clone -q https://github.com/victorvixcard/HelloSquad.git && cd HelloSquad || exit 1
echo "clone: $(git log --oneline -1)"
corepack enable pnpm

echo "== ordem antiga (H0-06): sem .env"
step up_sem_env make up
grep -E "^(aviso|erro):" /tmp/s0b_clone_up_sem_env.log
step migrate_sem_env make migrate
grep -E "^(aviso|erro):" /tmp/s0b_clone_migrate_sem_env.log

echo "== ordem nova do SETUP_LOCAL"
cp .env.example .env
password=$(openssl rand -hex 24)
sed -i "s|^API_DATABASE_URL=.*|API_DATABASE_URL=postgresql://hellosquad_api:${password}@127.0.0.1:56322/postgres|" .env
step up make up
grep -E "^(aviso|erro):|^senha do papel" /tmp/s0b_clone_up.log

keys=$(pnpm exec supabase status -o env 2>/dev/null)
publishable=$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<< "$keys")
secret=$(sed -n 's/^SECRET_KEY="\(.*\)"$/\1/p' <<< "$keys")
sed -i -e "s|^SUPABASE_PUBLISHABLE_KEY=.*|SUPABASE_PUBLISHABLE_KEY=${publishable}|" \
  -e "s|^SUPABASE_SECRET_KEY=.*|SUPABASE_SECRET_KEY=${secret}|" \
  -e "s|^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishable}|" .env
echo "chaves no .env: publishable=${publishable:0:15}… secret=${secret:0:10}…"

step seed make seed
tail -n 2 /tmp/s0b_clone_seed.log
step test make test
grep -E "^(=+ .*(passed|failed).*=+|Result: |All checks passed!)|Tests +[0-9]+ (passed|failed)" /tmp/s0b_clone_test.log

echo "== API do clone (porta 8100) com o .env novo"
(cd apps/backend && exec .venv/bin/hellosquad-api) > /tmp/s0b_clone_api.log 2>&1 &
api_pid=$!
curl -fsS --retry 30 --retry-connrefused --retry-delay 1 http://127.0.0.1:8100/health && echo
jwt=$(curl -fsS -X POST 'http://127.0.0.1:56321/auth/v1/token?grant_type=password' \
  -H "apikey: ${publishable}" -H 'Content-Type: application/json' \
  -d '{"email":"marina@miolo.example","password":"Senha!Teste123"}' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])')
curl -fsS http://127.0.0.1:8100/me -H "Authorization: Bearer ${jwt}" \
  | python3 -c 'import sys, json; b = json.load(sys.stdin); print("/me:", b["user"]["email"], [m["workspace"]["slug"] for m in b["memberships"]])'
curl -sS -X POST http://127.0.0.1:8100/workspaces -H "Authorization: Bearer ${jwt}" \
  -H 'Content-Type: application/json' -d '{"name":"Rota","slug":"novo-workspace"}' -w ' HTTP %{http_code}\n'
kill "$api_pid"
wait "$api_pid" 2>/dev/null

cd /tmp && rm -rf "$ROOT"
echo "clone apagado: $(test -e "$ROOT" && echo não || echo sim)"
