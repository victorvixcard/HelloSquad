#!/usr/bin/env bash
# H1 estático, item 1 e 4 (parte sem sessão): cabeçalhos de segurança e robots em cada rota do web local.
# Uso: bash docs/parciais/h1/estatico/a1_cabecalhos.sh [arquivo-de-cookies-netscape]
# Saída completa em /tmp/h1_est_a1_*.txt; imprime só o resumo por rota.
set -u
BASE="${BASE:-http://127.0.0.1:3100}"
JAR="${1:-}"
TAG="${JAR:+logado}"; TAG="${TAG:-anon}"
OUT="/tmp/h1_est_a1_${TAG}.txt"; : > "$OUT"
ROUTES=(/ /entrar /criar-conta /sair /app /app/miolo /app/miolo/equipe /app/miolo/modo-autonomo
  /app/miolo/memoria-da-marca /app/miolo/sala-do-squad /app/miolo/squad/nexo
  /app/miolo/squad/nexo/trabalho/00000000-0000-0000-0000-000000000000 /app/inexistente/a/b/c
  /robots.txt /sitemap.xml)
for r in "${ROUTES[@]}"; do
  h=$(curl -s -o /dev/null -D - --max-time 60 ${JAR:+-b "$JAR"} "$BASE$r" | tr -d '\r')
  { echo "### $r"; echo "$h"; } >> "$OUT"
  code=$(echo "$h" | head -1 | awk '{print $2}')
  csp=$(echo "$h" | grep -i '^content-security-policy:' | head -1)
  has() { echo "$h" | grep -qi "^$1:" && echo "s" || echo "N"; }
  ws=$(echo "$csp" | grep -o 'ws://127.0.0.1:56321' | head -1)
  cloud=$(echo "$csp" | grep -o -E '[a-z0-9.-]+\.(supabase\.co|supabase\.com|vercel\.app|railway\.app)' | head -1)
  fa=$(echo "$csp" | grep -o "frame-ancestors [^;]*" | head -1)
  nonce=$(echo "$csp" | grep -q "'nonce-" && echo nonce || echo sem-nonce)
  xrt=$(echo "$h" | grep -i '^x-robots-tag:' | head -1 | cut -d' ' -f2-)
  loc=$(echo "$h" | grep -i '^location:' | head -1 | cut -d' ' -f2-)
  cc=$(echo "$h" | grep -i '^cache-control:' | head -1 | cut -d' ' -f2-)
  printf '%-62s %s csp=%s(%s) ws=%s nuvem=%s [%s] XFO=%s RP=%s XCTO=%s PP=%s XRT=%s cc=%s %s\n' \
    "$r" "$code" "$( [ -n "$csp" ] && echo s || echo N )" "$nonce" "${ws:+s}" "${cloud:-nenhuma}" "$fa" \
    "$(has x-frame-options)" "$(has referrer-policy)" "$(has x-content-type-options)" "$(has permissions-policy)" \
    "${xrt:--}" "${cc:--}" "${loc:+-> $loc}"
done
echo "CSP de / :"; grep -i -m1 '^content-security-policy:' <(sed -n '/^### \/$/,/^### /p' "$OUT") | cut -c1-600
echo "CSP de /app/miolo :"; grep -i -m1 '^content-security-policy:' <(sed -n '/^### \/app\/miolo$/,/^### /p' "$OUT") | sed -E "s/'nonce-[^']+'/'nonce-***'/" | cut -c1-600
echo "robots.txt:"; curl -s --max-time 30 "$BASE/robots.txt" | head -20
echo "sitemap.xml (loc):"; curl -s --max-time 30 "$BASE/sitemap.xml" | grep -o '<loc>[^<]*</loc>' | head -20
