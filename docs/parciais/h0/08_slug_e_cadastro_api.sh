#!/usr/bin/env bash
# H0, alvo 7 (lado API) — validação de slug no POST /workspaces e o caso novo-workspace (gap A0).
# Usa o Pedro (sem membership) para provar criação; apaga o que criar e deixa Pedro com 0 memberships.
set -u
source "$(git rev-parse --show-toplevel)/docs/parciais/h0/lib.sh"
P="$(h0_login pedro@semconta.example)"

echo "== POST /workspaces (Pedro), casos que DEVEM falhar"
try() { echo "slug=$(printf '%q' "$2") -> $(h0_api POST /workspaces "$P" "{\"name\":\"$1\",\"slug\":\"$2\"}" | cut -c1-120)"; }
try "Curto"      "ab"
try "Longo49"    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"   # 49 chars
try "Acento"     "ação"
try "Espaco"     "novo workspace"
try "Injecao"    "x'; drop table public.workspaces;--"
try "Hifen dup"  "--"
try "Vazio"      ""
echo "nome com SQL -> $(h0_api POST /workspaces "$P" '{"name":"Robert\"); DROP TABLE public.workspaces;--","slug":"h0-sqlname"}' | cut -c1-90)"

echo; echo "== Caso maiúscula: a API normaliza para minúscula (decisão S0) — prova:"
echo "slug=MIOLO (já existe em minúscula) -> $(h0_api POST /workspaces "$P" '{"name":"X","slug":"MIOLO"}' | cut -c1-120)"

echo; echo "== GAP conhecido (A0 §5.3): a API aceita 'novo-workspace' (só o web recusa)"
r="$(h0_api POST /workspaces "$P" '{"name":"Novo","slug":"novo-workspace"}')"
echo "slug=novo-workspace -> $r"
NW="$(echo "$r" | grep -o '"id":"[0-9a-f-]*"' | head -1 | cut -d'"' -f4)"
echo "   Pedro agora tem memberships: $(h0_psql -c "select count(*) from public.memberships m join auth.users u on u.id=m.user_id where u.email='pedro@semconta.example'")"

echo; echo "== limpeza do que o Pedro criou (sqlname + novo-workspace)"
h0_psql -c "delete from public.workspaces where slug in ('novo-workspace','h0-sqlname')"
echo "   tabela workspaces ainda existe? $(h0_psql -c "select to_regclass('public.workspaces') is not null") | workspaces no banco: $(h0_psql -c 'select count(*) from public.workspaces')"
echo "   Pedro memberships: $(h0_psql -c "select count(*) from public.memberships m join auth.users u on u.id=m.user_id where u.email='pedro@semconta.example'")"
