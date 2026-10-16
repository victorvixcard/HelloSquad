#!/usr/bin/env bash
# H0, alvo 6/7 (parte sem sessão) — cabeçalhos, noindex, redirecionamentos e safeNext no web (:3100).
set -u
WEB=http://127.0.0.1:3100
hdr() { curl -s -o /dev/null -D - "$@"; }

echo "== Cabeçalhos de segurança na página pública (/)"
hdr "$WEB/" | grep -iE '^(content-security-policy|x-frame-options|referrer-policy|x-content-type-options|strict-transport-security|x-powered-by|x-robots-tag|permissions-policy):' | tr -d '\r' || true
echo "(acima: só os que existem; ausência = não enviado)"

echo; echo "== X-Robots-Tag e status em /app/* (inclusive 404 dentro de /app)"
for p in /app /app/miolo /app/nao-existe /app/miolo/squad/fulano; do
  printf '%-28s -> %s\n' "$p" "$(hdr "$WEB$p" | tr -d '\r' | grep -iE '^(HTTP|location|x-robots-tag):' | paste -sd' ')"
done

echo; echo "== Redirecionamento de /app sem sessão mantém o host e manda next seguro"
for h in 127.0.0.1 localhost; do
  loc="$(curl -s -o /dev/null -D - "$WEB/app/miolo" -H "Host: $h:3100" | tr -d '\r' | sed -n 's/^location: //Ip')"
  echo "Host $h -> Location: $loc"
done

echo; echo "== Set-Cookie nas telas de sessão: HttpOnly? (cookie legível por JS?)"
curl -s -o /dev/null -D - "$WEB/entrar" | tr -d '\r' | grep -i '^set-cookie:' | sed -E 's/=[^;]+/=<v>/' || echo "(sem Set-Cookie em /entrar)"

echo; echo "== GET /sair não encerra sessão (deve só renderizar a confirmação, sem Set-Cookie de logout)"
printf 'status=%s  set-cookie=%s\n' \
  "$(curl -s -o /dev/null -w '%{http_code}' "$WEB/sair")" \
  "$(curl -s -o /dev/null -D - "$WEB/sair" | tr -d '\r' | grep -ci '^set-cookie:')"

echo; echo "== robots.txt, sitemap e llms.txt públicos"
printf 'robots: %s | sitemap: %s | llms: %s\n' \
  "$(curl -s -o /dev/null -w '%{http_code}' "$WEB/robots.txt")" \
  "$(curl -s -o /dev/null -w '%{http_code}' "$WEB/sitemap.xml")" \
  "$(curl -s -o /dev/null -w '%{http_code}' "$WEB/llms.txt")"
echo "robots.txt (linhas de Disallow):"; curl -s "$WEB/robots.txt" | grep -iE 'disallow|user-agent' | head
