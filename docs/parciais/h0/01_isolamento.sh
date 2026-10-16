#!/usr/bin/env bash
# H0, alvo 1 — JWT da Marina (owner da Miolo) tentando ler a Vitta pela API e pela Data API.
# Esperado: 404 na API; lista vazia (200 []) na Data API; nada da Vitta em nenhum join.
set -u
source "$(git rev-parse --show-toplevel)/docs/parciais/h0/lib.sh"

VITTA="$(h0_psql -c "select id from public.workspaces where slug='vitta'")"
MIOLO="$(h0_psql -c "select id from public.workspaces where slug='miolo'")"
RAFAEL="$(h0_psql -c "select id from auth.users where email='rafael@vitta.example'")"
M="$(h0_login marina@miolo.example)"
[ -n "$M" ] || { echo "login da Marina falhou"; exit 1; }

echo "== API"
echo "GET /workspaces/{vitta}           -> $(h0_api GET "/workspaces/$VITTA" "$M")"
echo "GET /workspaces/{miolo} (controle) -> $(h0_api GET "/workspaces/$MIOLO" "$M" | cut -c1-80)"
echo "GET /workspaces                    -> $(h0_api GET /workspaces "$M" | grep -o '"slug":"[a-z-]*"' | tr '\n' ' ')"
echo "GET /me                            -> $(h0_api GET /me "$M" | grep -o '"slug":"[a-z-]*"' | tr '\n' ' ')"
echo "GET /workspaces/<não-uuid>         -> $(h0_api GET "/workspaces/vitta" "$M" | cut -c1-120)"

echo "== Data API (/rest/v1) com chave publicável + Bearer da Marina"
for p in \
  "workspaces?select=*" \
  "workspaces?id=eq.$VITTA" \
  "workspaces?slug=eq.vitta" \
  "workspaces?or=(id.eq.$VITTA,slug.eq.vitta)" \
  "memberships?select=*" \
  "memberships?workspace_id=eq.$VITTA" \
  "memberships?user_id=eq.$RAFAEL" \
  "invitations?select=*" \
  "invitations?workspace_id=eq.$VITTA" \
  "workspaces?select=*,memberships(*)" \
  "memberships?select=*,workspaces(*)" \
  "workspaces?select=*,invitations(*)" \
  "audit_events?select=*" ; do
  printf '%-48s -> %s\n' "$p" "$(h0_rest GET "/rest/v1/$p" "$M" | sed "s/$VITTA/<VITTA>/g; s/$MIOLO/<MIOLO>/g" | cut -c1-200)"
done

echo "== Data API: contagem exata pelo cabeçalho (vaza tamanho?)"
for t in workspaces memberships invitations; do
  r="$(curl -s -o /dev/null -D - "$H0_SUPA/rest/v1/$t?select=id" -H "apikey: $H0_PK" -H "Authorization: Bearer $M" -H 'Prefer: count=exact' | grep -i '^content-range' | tr -d '\r')"
  echo "$t: $r"
done

echo "== Data API: HEAD e filtro por Range sem Bearer (anon, só chave publicável)"
for t in workspaces memberships invitations audit_events; do
  echo "anon GET $t -> $(h0_rest GET "/rest/v1/$t?select=*" "" | cut -c1-160)"
done

echo "== GraphQL (/graphql/v1), schema graphql_public exposto no config.toml"
q='{"query":"{ workspacesCollection { edges { node { id slug } } } }"}'
echo "Marina workspacesCollection -> $(h0_rest POST /graphql/v1 "$M" "$q" | sed "s/$MIOLO/<MIOLO>/g; s/$VITTA/<VITTA>/g" | cut -c1-240)"
echo "anon   workspacesCollection -> $(h0_rest POST /graphql/v1 "" "$q" | cut -c1-240)"
