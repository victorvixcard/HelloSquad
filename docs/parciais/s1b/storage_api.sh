set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
PK=$(sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' .env); SK=$(sed -n 's/^SUPABASE_SECRET_KEY=//p' .env)
S=http://127.0.0.1:56321/storage/v1
login() { curl -s -X POST 'http://127.0.0.1:56321/auth/v1/token?grant_type=password' -H "apikey: $PK" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$1\",\"password\":\"Senha!Teste123\"}" | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])'; }
MIOLO=$(docker exec supabase_db_hellosquad psql -U postgres -d postgres -Atc "select id from public.workspaces where slug='miolo'")
OBJ="$MIOLO/deliveries/5eed0000-0000-4000-8000-000000000501/1/s1b-prova.txt"
MARINA=$(login marina@miolo.example); RAFAEL=$(login rafael@vitta.example)
echo "upload com a chave secreta (papel privilegiado): $(curl -s -o /dev/null -w '%{http_code}' -X POST "$S/object/deliveries/$OBJ" -H "apikey: $SK" -H "Authorization: Bearer $SK" -H 'Content-Type: text/plain' --data-binary 'prova da S1b')"
echo "Marina lê (membro da Miolo): $(curl -s -o /tmp/s1b_obj.txt -w '%{http_code}' "$S/object/authenticated/deliveries/$OBJ" -H "apikey: $PK" -H "Authorization: Bearer $MARINA") conteúdo=$(cat /tmp/s1b_obj.txt)"
echo "Rafael lê (Vitta): $(curl -s -o /tmp/s1b_obj2.txt -w '%{http_code}' "$S/object/authenticated/deliveries/$OBJ" -H "apikey: $PK" -H "Authorization: Bearer $RAFAEL") $(cut -c1-90 /tmp/s1b_obj2.txt)"
echo "Marina grava no próprio prefixo: $(curl -s -o /tmp/s1b_obj3.txt -w '%{http_code}' -X POST "$S/object/deliveries/$MIOLO/deliveries/x/1/marina.txt" -H "apikey: $PK" -H "Authorization: Bearer $MARINA" -H 'Content-Type: text/plain' --data-binary 'x') $(cut -c1-90 /tmp/s1b_obj3.txt)"
echo "público sem token: $(curl -s -o /dev/null -w '%{http_code}' "$S/object/public/deliveries/$OBJ")"
echo "remoção com a chave secreta: $(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$S/object/deliveries/$OBJ" -H "apikey: $SK" -H "Authorization: Bearer $SK")"
echo "objetos no bucket depois: $(docker exec supabase_db_hellosquad psql -U postgres -d postgres -Atc "select count(*) from storage.objects where bucket_id='deliveries'")"
