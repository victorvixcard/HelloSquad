#!/usr/bin/env bash
# Roteiro curl da Meta contra o mock (J3): OAuth → leitura → escrita → 429 → expiração → refresh.
# Uso: make mocks && bash infra/mocks/roteiros/meta.sh  (zera o estado do mock no começo).
set -u
B=${MOCKS_URL:-http://127.0.0.1:8300}; G=$B/meta/graph/v26.0; R=http://127.0.0.1:3100/oauth/callback; APP=999000000000001
j() { python3 -c "import sys,json;print(json.load(sys.stdin)$1)"; }
curl -s -X POST $B/_mock/reset >/dev/null
L=$(curl -s -o /dev/null -w '%{redirect_url}' "$B/meta/www/v26.0/dialog/oauth?client_id=$APP&redirect_uri=$R&state=abc&scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_manage_insights,instagram_manage_comments")
CODE=$(python3 -c "import sys,urllib.parse as u;print(u.parse_qs(u.urlparse(sys.argv[1]).query)['code'][0])" "$L")
AT=$(curl -s "$G/oauth/access_token?client_id=$APP&client_secret=x&redirect_uri=$R&code=$CODE" | j "['access_token']")
LL=$(curl -s "$G/oauth/access_token?grant_type=fb_exchange_token&client_id=$APP&client_secret=x&fb_exchange_token=$AT")
echo "1 troca longa: $(echo $LL | cut -c1-30)... expires_in=$(echo $LL | j "['expires_in']")"
AT=$(echo $LL | j "['access_token']")
PT=$(curl -s "$G/me/accounts?access_token=$AT" | j "['data'][0]['access_token']")
C=$(curl -s -X POST "$G/17841400000000101/media" -d "image_url=https://cdn.example/p.jpg&caption=Teste do mock&access_token=$AT" | j "['id']")
echo "2 contêiner: $C status=$(curl -s "$G/$C?fields=status_code&access_token=$AT" | j "['status_code']")"
echo "3 publicar: $(curl -s -X POST "$G/17841400000000101/media_publish" -d "creation_id=$C&access_token=$AT")"
echo "4 publicar de novo: $(curl -s -w ' HTTP %{http_code}' -X POST "$G/17841400000000101/media_publish" -d "creation_id=$C&access_token=$AT")"
echo "5 feed da Página: $(curl -s -X POST "$G/100000000000101/feed" -d "message=Fornada de sábado&access_token=$PT")"
echo "6 comentários: $(curl -s "$G/17900000001010001/comments?fields=username,text&access_token=$AT" | cut -c1-120)"
echo "7 429: $(curl -s -D - -o /tmp/j3-429.json -H 'X-Mock-Fail: 429' "$G/me?access_token=$AT" | grep -i -E '^(HTTP|retry-after)' | tr -d '\r' | tr '\n' ' ') $(cat /tmp/j3-429.json)"
curl -s -X POST $B/_mock/expire -H 'content-type: application/json' -d '{"provider":"meta","workspace":"miolo"}' >/dev/null
echo "8 expirado: $(curl -s -w ' HTTP %{http_code}' "$G/me?access_token=$AT")"
echo "9 página expirada: $(curl -s -w ' HTTP %{http_code}' -X POST "$G/100000000000101/feed" -d "message=x&access_token=$PT" | cut -c1-80)"
echo "10 chamadas de media_publish: $(curl -s "$B/_mock/calls?path_contains=media_publish" | j "['count']")"
