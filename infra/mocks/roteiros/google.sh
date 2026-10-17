#!/usr/bin/env bash
# Roteiro curl do Google contra o mock (J3): OAuth → leitura → escrita → 429 → expiração → refresh.
# Uso: make mocks && bash infra/mocks/roteiros/google.sh  (zera o estado do mock no começo).
set -u
B=${MOCKS_URL:-http://127.0.0.1:8300}; R=http://127.0.0.1:3100/oauth/callback; CID=000000000000-hellosquadlocal.apps.googleusercontent.com
S="https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/business.manage"
j() { python3 -c "import sys,json;print(json.load(sys.stdin)$1)"; }
curl -s -X POST $B/_mock/reset >/dev/null
L=$(curl -s -o /dev/null -w '%{redirect_url}' -G "$B/google/accounts/o/oauth2/v2/auth" --data-urlencode "client_id=$CID" --data-urlencode "redirect_uri=$R" --data-urlencode "response_type=code" --data-urlencode "scope=$S" --data-urlencode "state=xyz" --data-urlencode "access_type=offline" --data-urlencode "prompt=consent")
CODE=$(python3 -c "import sys,urllib.parse as u;print(u.parse_qs(u.urlparse(sys.argv[1]).query)['code'][0])" "$L")
T=$(curl -s -X POST $B/google/oauth2/token --data-urlencode "code=$CODE" --data-urlencode "client_id=$CID" --data-urlencode "client_secret=x" --data-urlencode "redirect_uri=$R" --data-urlencode "grant_type=authorization_code")
AT=$(echo $T | j "['access_token']"); RT=$(echo $T | j "['refresh_token']")
echo "1 token: expires_in=$(echo $T | j "['expires_in']") refresh=${RT:0:12}..."
echo "2 GA4: $(curl -s -X POST $B/google/analyticsdata/v1beta/properties/400000001:runReport -H "Authorization: Bearer $AT" -H 'content-type: application/json' -d '{"dateRanges":[{"startDate":"7daysAgo","endDate":"yesterday"}],"dimensions":[{"name":"date"}],"metrics":[{"name":"sessions"},{"name":"activeUsers"}]}' | cut -c1-260)"
echo "3 GSC: $(curl -s -X POST "$B/google/searchconsole/webmasters/v3/sites/sc-domain%3Amiolo.example/searchAnalytics/query" -H "Authorization: Bearer $AT" -H 'content-type: application/json' -d '{"startDate":"2026-09-17","endDate":"2026-10-16","dimensions":["query"],"rowLimit":3}' | cut -c1-300)"
LOC=accounts/1000000000000000001/locations/2000000000000000001
echo "4 GBP reviews: $(curl -s "$B/google/mybusiness/v4/$LOC/reviews?pageSize=2" -H "Authorization: Bearer $AT" | cut -c1-250)"
RID=$(curl -s "$B/google/mybusiness/v4/$LOC/reviews?pageSize=1" -H "Authorization: Bearer $AT" | j "['reviews'][0]['reviewId']")
echo "5 responder: $(curl -s -X PUT "$B/google/mybusiness/v4/$LOC/reviews/$RID/reply" -H "Authorization: Bearer $AT" -H 'content-type: application/json' -d '{"comment":"Obrigada, Larissa!"}')"
echo "6 localPost: $(curl -s -X POST "$B/google/mybusiness/v4/$LOC/localPosts" -H "Authorization: Bearer $AT" -H 'content-type: application/json' -d '{"languageCode":"pt-BR","summary":"Fornada de sábado às 8h.","topicType":"STANDARD"}' | cut -c1-200)"
echo "7 agendar (campo inexistente): $(curl -s -X POST "$B/google/mybusiness/v4/$LOC/localPosts" -H "Authorization: Bearer $AT" -H 'content-type: application/json' -d '{"summary":"x","scheduleTime":"2026-10-20T12:00:00Z"}' | cut -c1-160)"
curl -s -X POST $B/_mock/config -H 'content-type: application/json' -d '{"rate_limit":{"google":{"limit":1,"window_seconds":60}}}' >/dev/null
curl -s -o /dev/null "$B/google/searchconsole/webmasters/v3/sites" -H "Authorization: Bearer $AT"
echo "8 429 janela: $(curl -s -D /tmp/j3-h.txt "$B/google/searchconsole/webmasters/v3/sites" -H "Authorization: Bearer $AT" | cut -c1-120) $(grep -i retry-after /tmp/j3-h.txt | tr -d '\r')"
curl -s -X POST $B/_mock/config -H 'content-type: application/json' -d '{"rate_limit":{"google":null}}' >/dev/null
curl -s -X POST $B/_mock/expire -H 'content-type: application/json' -d '{"provider":"google","workspace":"miolo","kind":"access"}' >/dev/null
echo "9 expirado: $(curl -s -w ' HTTP %{http_code}' "$B/google/mybusiness/v4/$LOC/reviews" -H "Authorization: Bearer $AT" | cut -c1-140)"
NT=$(curl -s -X POST $B/google/oauth2/token --data-urlencode "refresh_token=$RT" --data-urlencode "client_id=$CID" --data-urlencode "client_secret=x" --data-urlencode "grant_type=refresh_token")
AT2=$(echo $NT | j "['access_token']")
echo "10 refresh: ${AT2:0:14}... leitura=$(curl -s -o /dev/null -w '%{http_code}' "$B/google/mybusiness/v4/$LOC/reviews" -H "Authorization: Bearer $AT2")"
curl -s -X POST $B/_mock/expire -H 'content-type: application/json' -d '{"provider":"google","workspace":"miolo","kind":"grant"}' >/dev/null
echo "11 grant expirado: $(curl -s -w ' HTTP %{http_code}' -X POST $B/google/oauth2/token --data-urlencode "refresh_token=$RT" --data-urlencode "client_id=$CID" --data-urlencode "client_secret=x" --data-urlencode "grant_type=refresh_token")"
echo "12 rede: $(curl -s $B/_mock/network) selftest=$(curl -s -X POST $B/_mock/network/selftest)"
