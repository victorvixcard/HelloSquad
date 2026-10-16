#!/usr/bin/env bash
# H0, alvo 2 — Carla (editor da Vitta) tentando administrar; Rafael (único owner) tentando se rebaixar.
# Esperado: toda tentativa da Carla recusada (403/0 linhas); Rafael recusado pela regra do último owner.
# Ao fim, confere que o banco continua no estado do seed.
set -u
source "$(git rev-parse --show-toplevel)/docs/parciais/h0/lib.sh"

VITTA="$(h0_psql -c "select id from public.workspaces where slug='vitta'")"
CARLA_ID="$(h0_psql -c "select id from auth.users where email='carla@vitta.example'")"
RAFAEL_ID="$(h0_psql -c "select id from auth.users where email='rafael@vitta.example'")"
PEDRO_ID="$(h0_psql -c "select id from auth.users where email='pedro@semconta.example'")"
C_MEM="$(h0_psql -c "select id from public.memberships where user_id='$CARLA_ID'")"
R_MEM="$(h0_psql -c "select id from public.memberships where user_id='$RAFAEL_ID'")"
C="$(h0_login carla@vitta.example)"
R="$(h0_login rafael@vitta.example)"
HASH="$(printf 'h0-token-de-prova' | sha256sum | cut -d' ' -f1)"
EXP="$(date -u -d '+1 day' +%Y-%m-%dT%H:%M:%SZ)"
RET='Prefer: return=representation'

echo "== Carla (editor)"
echo "UPDATE própria linha role=owner  -> $(h0_rest PATCH "/rest/v1/memberships?id=eq.$C_MEM" "$C" '{"role":"owner"}' "$RET")"
echo "UPDATE própria linha role=admin  -> $(h0_rest PATCH "/rest/v1/memberships?id=eq.$C_MEM" "$C" '{"role":"admin"}' "$RET")"
echo "UPDATE linha do Rafael role=viewer -> $(h0_rest PATCH "/rest/v1/memberships?id=eq.$R_MEM" "$C" '{"role":"viewer"}' "$RET")"
echo "INSERT membership Pedro editor   -> $(h0_rest POST /rest/v1/memberships "$C" "{\"workspace_id\":\"$VITTA\",\"user_id\":\"$PEDRO_ID\",\"role\":\"editor\"}" "$RET")"
echo "UPSERT própria linha como owner  -> $(h0_rest POST "/rest/v1/memberships?on_conflict=workspace_id,user_id" "$C" "{\"workspace_id\":\"$VITTA\",\"user_id\":\"$CARLA_ID\",\"role\":\"owner\"}" 'Prefer: resolution=merge-duplicates,return=representation')"
echo "INSERT convite de owner          -> $(h0_rest POST /rest/v1/invitations "$C" "{\"workspace_id\":\"$VITTA\",\"email\":\"h0-dono@teste.example\",\"role\":\"owner\",\"token_hash\":\"$HASH\",\"expires_at\":\"$EXP\"}" "$RET")"
echo "INSERT convite de viewer         -> $(h0_rest POST /rest/v1/invitations "$C" "{\"workspace_id\":\"$VITTA\",\"email\":\"h0-viewer@teste.example\",\"role\":\"viewer\",\"token_hash\":\"$HASH\",\"expires_at\":\"$EXP\"}" "$RET")"
echo "DELETE membership do Rafael      -> $(h0_rest DELETE "/rest/v1/memberships?id=eq.$R_MEM" "$C" '' "$RET")"
echo "UPDATE workspace_id da própria   -> $(h0_rest PATCH "/rest/v1/memberships?id=eq.$C_MEM" "$C" "{\"workspace_id\":\"$VITTA\"}" "$RET" | cut -c1-160)"
echo "UPDATE nome da Vitta             -> $(h0_rest PATCH "/rest/v1/workspaces?id=eq.$VITTA" "$C" '{"name":"Tomada"}' "$RET" | cut -c1-160)"
echo "DELETE da Vitta                  -> $(h0_rest DELETE "/rest/v1/workspaces?id=eq.$VITTA" "$C" '' "$RET" | cut -c1-160)"
echo "SELECT convites da Vitta         -> $(h0_rest GET "/rest/v1/invitations?workspace_id=eq.$VITTA" "$C")"

echo "== Rafael (único owner)"
echo "UPDATE própria linha role=admin  -> $(h0_rest PATCH "/rest/v1/memberships?id=eq.$R_MEM" "$R" '{"role":"admin"}' "$RET" | cut -c1-200)"
echo "DELETE própria linha             -> $(h0_rest DELETE "/rest/v1/memberships?id=eq.$R_MEM" "$R" '' "$RET" | cut -c1-200)"
echo "UPDATE em lote todos da Vitta=viewer -> $(h0_rest PATCH "/rest/v1/memberships?workspace_id=eq.$VITTA" "$R" '{"role":"viewer"}' "$RET" | cut -c1-200)"

echo "== Estado depois das tentativas"
h0_psql -c "select u.email || ':' || m.role from public.memberships m join auth.users u on u.id = m.user_id where m.workspace_id = '$VITTA' order by 1"
h0_psql -c "select 'convites=' || count(*) from public.invitations"
