#!/usr/bin/env bash
# H2 estático P2 (adaptado de docs/parciais/h1/estatico/a1_cabecalhos.sh): cabeçalhos de segurança, robots e cache
# por rota contra o `next start` da 3198 (rodar dentro de p2_com_servidor.sh).
# Uso: bash docs/parciais/h2/estatico/p2_cabecalhos.sh [arquivo-de-cookies-netscape]
# Saída completa em /tmp/h2_est_p2_cab_<anon|logado>.txt; imprime só o resumo por rota.
set -u
BASE="${BASE:-http://127.0.0.1:3198}"
JAR="${1:-}"
TAG="${JAR:+logado}"; TAG="${TAG:-anon}"
OUT="/tmp/h2_est_p2_cab_${TAG}.txt"; : > "$OUT"
ROUTES=(/ /entrar /criar-conta /sair /como-funciona /en /es/squad/kiwi /app /app/miolo /app/miolo/equipe /admin /admin/x
  /robots.txt /sitemap.xml /llms.txt /precos /pricing /precios /en/pricing /es/precios /planos /assinatura)
for r in "${ROUTES[@]}"; do
  h=$(curl -s -o /dev/null -D - --max-time 60 ${JAR:+-b "$JAR"} "$BASE$r" | tr -d '\r')
  { echo "### $r"; echo "$h"; } >> "$OUT"
  code=$(echo "$h" | head -1 | awk '{print $2}')
  csp=$(echo "$h" | grep -i '^content-security-policy:' | head -1)
  has() { echo "$h" | grep -qi "^$1:" && echo "s" || echo "N"; }
  fa=$(echo "$csp" | grep -o "frame-ancestors [^;]*" | head -1)
  nonce=$(echo "$csp" | grep -q "'nonce-" && echo nonce || echo sem-nonce)
  xrt=$(echo "$h" | grep -i '^x-robots-tag:' | head -1 | cut -d' ' -f2-)
  loc=$(echo "$h" | grep -i '^location:' | head -1 | cut -d' ' -f2-)
  cc=$(echo "$h" | grep -i '^cache-control:' | head -1 | cut -d' ' -f2-)
  n=0; for k in content-security-policy x-frame-options referrer-policy x-content-type-options permissions-policy strict-transport-security; do
    echo "$h" | grep -qi "^$k:" && n=$((n+1)); done
  printf '%-18s %s csp=%s(%s) [%s] XFO=%s RP=%s XCTO=%s PP=%s HSTS=%s seg=%s/6 XRT=%s cc=%s %s\n' \
    "$r" "$code" "$( [ -n "$csp" ] && echo s || echo N )" "$nonce" "$fa" \
    "$(has x-frame-options)" "$(has referrer-policy)" "$(has x-content-type-options)" "$(has permissions-policy)" \
    "$(has strict-transport-security)" "$n" "${xrt:--}" "${cc:--}" "${loc:+-> $loc}"
done
echo "valores (de /):"; sed -n '/^### \/$/,/^### /p' "$OUT" | grep -iE '^(x-frame-options|referrer-policy|x-content-type-options|permissions-policy|strict-transport-security|cross-origin-opener-policy|x-powered-by):'
echo "CSP de / :"; sed -n '/^### \/$/,/^### /p' "$OUT" | grep -i -m1 '^content-security-policy:' | cut -c1-700
echo "CSP de /entrar :"; sed -n '/^### \/entrar$/,/^### /p' "$OUT" | grep -i -m1 '^content-security-policy:' | sed -E "s/'nonce-[^']+'/'nonce-***'/g" | cut -c1-700
