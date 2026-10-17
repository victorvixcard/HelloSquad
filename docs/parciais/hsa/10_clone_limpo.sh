#!/usr/bin/env bash
# H-SA alvo 10 — clone limpo em /tmp seguindo só o docs/SETUP_LOCAL.md ("Subir do zero" e "Segundo checkout").
# Mesmo Supabase (projeto hellosquad); portas do clone 8199/3199; API (8100) e web (3100) do dono intocadas.
# Nenhuma chave é impressa: o .env do clone recebe o API_DATABASE_URL do dono e as chaves do `supabase status`.
# Uso: bash docs/parciais/hsa/10_clone_limpo.sh > /tmp/hsa_clone.log 2>&1
set -u
DONO=/home/vitao/projetos/hellosquad
C=/tmp/hsa_clone
step() { echo; echo "== $(date +%H:%M:%S) $*"; }
run() { local t0=$(date +%s); "$@"; local rc=$?; echo "-- exit=$rc duração=$(( $(date +%s) - t0 ))s"; return $rc; }
owner_ok() { echo "[dono] health=$(curl -s -m 5 http://127.0.0.1:8100/health | head -c 60) web=$(curl -s -m 10 -o /dev/null -w '%{http_code}' http://127.0.0.1:3100/)"; }

step "git clone (remoto público, como o SETUP_LOCAL)"
rm -rf "$C"
run git clone -q https://github.com/victorvixcard/HelloSquad.git "$C" && git -C "$C" log --oneline -1
cd "$C" || exit 1
corepack enable pnpm
step "cp .env.example .env && chmod 600 .env; segundo checkout: API_DATABASE_URL do dono, portas 8199/3199 e as URLs que andam com elas"
cp .env.example .env && chmod 600 .env
python3 - "$DONO/.env" .env <<'EOF'
import sys
dono = dict(l.split("=", 1) for l in open(sys.argv[1]).read().splitlines() if "=" in l and not l.startswith("#"))
lines = open(sys.argv[2]).read().splitlines()
new = {"API_DATABASE_URL": dono["API_DATABASE_URL"], "API_PORT": "8199", "API_URL": "http://127.0.0.1:8199",
       "WEB_PORT": "3199", "NEXT_PUBLIC_SITE_URL": "http://127.0.0.1:3199", "EMAIL_APP_URL": "http://127.0.0.1:3199",
       "PAYMENT_BACK_URL": "http://127.0.0.1:3199/app"}
out = []
for l in lines:
    k = l.split("=", 1)[0]
    out.append(f"{k}={new.pop(k)}" if k in new and "=" in l and not l.startswith("#") else l)
out += [f"{k}={v}" for k, v in new.items()]
open(sys.argv[2], "w").write("\n".join(out) + "\n")
print("chaves trocadas no .env do clone:", sorted(["API_DATABASE_URL", "API_PORT", "API_URL", "WEB_PORT", "NEXT_PUBLIC_SITE_URL", "EMAIL_APP_URL", "PAYMENT_BACK_URL"]))
EOF
owner_ok
step "make up"
run make up 2>&1 | tail -15
owner_ok
step "pnpm exec supabase status -o env → PUBLISHABLE_KEY e SECRET_KEY no .env (sem imprimir)"
pnpm exec supabase status -o env > /tmp/hsa_clone_status.env 2>/dev/null
python3 - /tmp/hsa_clone_status.env .env <<'EOF'
import sys
st = {}
for l in open(sys.argv[1]).read().splitlines():
    if "=" in l:
        k, v = l.split("=", 1)
        st[k] = v.strip().strip('"')
new = {"SUPABASE_PUBLISHABLE_KEY": st.get("PUBLISHABLE_KEY", ""), "SUPABASE_SECRET_KEY": st.get("SECRET_KEY", ""),
       "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": st.get("PUBLISHABLE_KEY", "")}
lines = open(sys.argv[2]).read().splitlines()
out = [f"{l.split('=',1)[0]}={new[l.split('=',1)[0]]}" if l.split("=", 1)[0] in new and not l.startswith("#") else l for l in lines]
open(sys.argv[2], "w").write("\n".join(out) + "\n")
print("chaves preenchidas:", {k: ("ok" if v else "VAZIA") for k, v in new.items()})
EOF
rm -f /tmp/hsa_clone_status.env
step "make migrate"
run make migrate 2>&1 | tail -6
step "make seed"
run make seed 2>&1 | tail -8
owner_ok
step "make test (saída inteira em /tmp/hsa_clone_test.log)"
run make test > /tmp/hsa_clone_test.log 2>&1
grep -E "passed|failed|Result:|Tests +[0-9]+|Test Files|error|Error" /tmp/hsa_clone_test.log | grep -v "^ *✓" | tail -25
owner_ok
step "make squad-export no clone e git status de squad/ (alvo 4: vazio quando nada mudou)"
run make squad-export 2>&1 | tail -5
echo "git status --porcelain squad/: [$(git status --porcelain squad/ | head -20)]"
step "fim"
