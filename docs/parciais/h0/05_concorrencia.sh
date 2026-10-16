#!/usr/bin/env bash
# H0, alvo 5 — a identidade de um tenant não vaza para outro pela conexão reaproveitada do pool.
# Dispara /me e /workspaces de 3 tenants em paralelo, muitas vezes, e confere que cada um só vê o seu.
set -u
source "$(git rev-parse --show-toplevel)/docs/parciais/h0/lib.sh"

declare -A TOK SLUG
TOK[marina]="$(h0_login marina@miolo.example)";   SLUG[marina]=miolo
TOK[rafael]="$(h0_login rafael@vitta.example)";    SLUG[rafael]=vitta
TOK[juliana]="$(h0_login juliana@trilha.example)"; SLUG[juliana]=trilha
for u in marina rafael juliana; do [ -n "${TOK[$u]}" ] || { echo "login $u falhou"; exit 1; }; done

ROUNDS=30
out=/tmp/h0_conc; rm -f "$out"_*.txt
echo "== $ROUNDS rodadas, 3 tenants x (/me + /workspaces) simultâneas = $((ROUNDS*6)) requisições concorrentes"
probe() { # $1 usuário, $2 rodada
  local u="$1" r="$2" esp="${SLUG[$1]}"
  local me ws
  me="$(curl -s "$H0_API/me" -H "Authorization: Bearer ${TOK[$u]}" | grep -o '"slug":"[a-z-]*"' | sort -u | tr '\n' ',')"
  ws="$(curl -s "$H0_API/workspaces" -H "Authorization: Bearer ${TOK[$u]}" | grep -o '"slug":"[a-z-]*"' | sort -u | tr '\n' ',')"
  # Pedro em paralelo: nunca pode ver nada
  echo "$u r$r me=$me ws=$ws esperado=\"slug\":\"$esp\"," >> "${out}_$u.txt"
}
for r in $(seq 1 $ROUNDS); do
  for u in marina rafael juliana; do probe "$u" "$r" & done
done
wait

fail=0
for u in marina rafael juliana; do
  esp="\"slug\":\"${SLUG[$u]}\","
  total=$(wc -l < "${out}_$u.txt")
  bad=$(grep -v "me=$esp ws=$esp " "${out}_$u.txt" | wc -l)
  echo "$u: $total respostas, $bad divergentes (esperado me=ws=$esp)"
  [ "$bad" -ne 0 ] && { fail=1; grep -v "me=$esp ws=$esp " "${out}_$u.txt" | head -3; }
done
# nenhuma resposta pode conter o slug de outro tenant
cross=$(grep -h -o '"slug":"[a-z-]*"' "${out}"_*.txt | sort | uniq -c)
echo "== slugs observados no total:"; echo "$cross"
if grep -q 'miolo' "${out}_rafael.txt" || grep -q 'vitta' "${out}_marina.txt" || grep -q 'trilha' "${out}_marina.txt"; then
  echo "VAZAMENTO ENTRE TENANTS"; fail=1
fi
[ "$fail" -eq 0 ] && echo "RESULTADO: nenhuma mistura entre tenants em $((ROUNDS*6)) requisições concorrentes" || echo "RESULTADO: FALHA"
