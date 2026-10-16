#!/usr/bin/env bash
# H0, alvo 2 (complemento) — (a) admin tentando virar owner ou mexer no owner; (b) corrida: dois owners
# se rebaixando ao mesmo tempo não pode deixar o workspace sem owner. Restaura a Carla como editor no fim.
set -u
source "$(git rev-parse --show-toplevel)/docs/parciais/h0/lib.sh"

VITTA="$(h0_psql -c "select id from public.workspaces where slug='vitta'")"
CARLA_ID="$(h0_psql -c "select id from auth.users where email='carla@vitta.example'")"
RAFAEL_ID="$(h0_psql -c "select id from auth.users where email='rafael@vitta.example'")"
PEDRO_ID="$(h0_psql -c "select id from auth.users where email='pedro@semconta.example'")"
C_MEM="$(h0_psql -c "select id from public.memberships where user_id='$CARLA_ID'")"
R_MEM="$(h0_psql -c "select id from public.memberships where user_id='$RAFAEL_ID'")"
R="$(h0_login rafael@vitta.example)"
C="$(h0_login carla@vitta.example)"
RET='Prefer: return=representation'
HASH="$(printf 'h0-token-admin' | sha256sum | cut -d' ' -f1)"
EXP="$(date -u -d '+1 day' +%Y-%m-%dT%H:%M:%SZ)"

echo "== (a) Rafael promove Carla a admin (pela Data API)"
echo "Rafael: Carla -> admin            -> $(h0_rest PATCH "/rest/v1/memberships?id=eq.$C_MEM" "$R" '{"role":"admin"}' "$RET" | grep -o '"role":"[a-z]*"')"
echo "Carla admin: própria -> owner      -> $(h0_rest PATCH "/rest/v1/memberships?id=eq.$C_MEM" "$C" '{"role":"owner"}' "$RET" | cut -c1-140)"
echo "Carla admin: Rafael -> viewer      -> $(h0_rest PATCH "/rest/v1/memberships?id=eq.$R_MEM" "$C" '{"role":"viewer"}' "$RET" | cut -c1-140)"
echo "Carla admin: DELETE Rafael         -> $(h0_rest DELETE "/rest/v1/memberships?id=eq.$R_MEM" "$C" '' "$RET" | cut -c1-140)"
echo "Carla admin: INSERT Pedro owner    -> $(h0_rest POST /rest/v1/memberships "$C" "{\"workspace_id\":\"$VITTA\",\"user_id\":\"$PEDRO_ID\",\"role\":\"owner\"}" "$RET" | cut -c1-140)"
echo "Carla admin: convite de owner      -> $(h0_rest POST /rest/v1/invitations "$C" "{\"workspace_id\":\"$VITTA\",\"email\":\"h0-dono@teste.example\",\"role\":\"owner\",\"token_hash\":\"$HASH\",\"expires_at\":\"$EXP\"}" "$RET" | cut -c1-140)"
echo "Carla admin: convite com invited_by do Rafael -> $(h0_rest POST /rest/v1/invitations "$C" "{\"workspace_id\":\"$VITTA\",\"email\":\"h0-x@teste.example\",\"role\":\"viewer\",\"token_hash\":\"$HASH\",\"expires_at\":\"$EXP\",\"invited_by\":\"$RAFAEL_ID\"}" "$RET" | cut -c1-160)"
echo "Carla admin: convite de viewer (permitido) -> $(h0_rest POST /rest/v1/invitations "$C" "{\"workspace_id\":\"$VITTA\",\"email\":\"h0-viewer@teste.example\",\"role\":\"viewer\",\"token_hash\":\"$HASH\",\"expires_at\":\"$EXP\"}" "$RET" | grep -oE '"(role|invited_by)":"[^"]*"' | tr '\n' ' ')"
echo "Carla admin: convite expira em 9999 -> $(h0_rest POST /rest/v1/invitations "$C" "{\"workspace_id\":\"$VITTA\",\"email\":\"h0-longo@teste.example\",\"role\":\"viewer\",\"token_hash\":\"$(printf x9999 | sha256sum | cut -d' ' -f1)\",\"expires_at\":\"9999-12-31T00:00:00Z\"}" "$RET" | grep -oE '"expires_at":"[^"]*"')"
h0_psql -c "delete from public.invitations where email like 'h0-%@teste.example'" >/dev/null

echo "== (b) corrida: Carla vira owner (postgres), os dois owners se rebaixam ao mesmo tempo"
h0_psql -c "update public.memberships set role='owner' where id='$C_MEM'" >/dev/null
demote() { # $1 = sub de quem age, $2 = membership alvo
  h0_psql 2>&1 <<SQL
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"$1","role":"authenticated"}', true);
update public.memberships set role = 'admin' where id = '$2';
select pg_sleep(1.5);
commit;
SQL
}
demote "$RAFAEL_ID" "$C_MEM" > /tmp/h0_race_a.txt & A=$!
demote "$CARLA_ID" "$R_MEM" > /tmp/h0_race_b.txt & B=$!
wait $A $B
echo "sessão A (Rafael rebaixa Carla): $(grep -E 'ERROR|COMMIT|ROLLBACK' /tmp/h0_race_a.txt | tr '\n' ' ')"
echo "sessão B (Carla rebaixa Rafael): $(grep -E 'ERROR|COMMIT|ROLLBACK' /tmp/h0_race_b.txt | tr '\n' ' ')"
echo "owners na Vitta depois da corrida: $(h0_psql -c "select count(*) from public.memberships where workspace_id='$VITTA' and role='owner'")"

echo "== restaura o seed da Vitta (Rafael owner, Carla editor)"
h0_psql -c "update public.memberships set role='owner' where id='$R_MEM'" -c "update public.memberships set role='editor' where id='$C_MEM'" >/dev/null
h0_psql -c "select u.email || ':' || m.role from public.memberships m join auth.users u on u.id = m.user_id where m.workspace_id = '$VITTA' order by 1"
