#!/usr/bin/env bash
# H0, alvo 3 — escrita direta em audit_events e workspaces pela Data API (authenticated) e chamada de
# funções de public/app como anon (Data API e SQL). Esperado: tudo recusado; contagens inalteradas.
set -u
source "$(git rev-parse --show-toplevel)/docs/parciais/h0/lib.sh"

MIOLO="$(h0_psql -c "select id from public.workspaces where slug='miolo'")"
M="$(h0_login marina@miolo.example)"
RET='Prefer: return=representation'
before="$(h0_psql -c "select (select count(*) from public.audit_events) || '/' || (select count(*) from public.workspaces)")"

echo "== audit_events como authenticated (Marina, owner)"
echo "INSERT -> $(h0_rest POST /rest/v1/audit_events "$M" "{\"workspace_id\":\"$MIOLO\",\"actor_type\":\"user\",\"actor_id\":\"x\",\"action\":\"workspace.created\"}" "$RET" | cut -c1-170)"
echo "UPDATE -> $(h0_rest PATCH "/rest/v1/audit_events?workspace_id=eq.$MIOLO" "$M" '{"action":"x.y"}' "$RET" | cut -c1-170)"
echo "DELETE -> $(h0_rest DELETE "/rest/v1/audit_events?workspace_id=eq.$MIOLO" "$M" '' "$RET" | cut -c1-170)"
echo "== workspaces: INSERT direto como authenticated"
echo "INSERT -> $(h0_rest POST /rest/v1/workspaces "$M" '{"slug":"h0-direto","name":"H0 direto"}' "$RET" | cut -c1-170)"

echo "== RPC pela Data API (schemas expostos: public, graphql_public)"
for who in anon marina; do
  tok=""; [ "$who" = marina ] && tok="$M"
  echo "$who rpc/create_workspace (public)          -> $(h0_rest POST /rest/v1/rpc/create_workspace "$tok" '{"p_name":"x","p_slug":"h0-rpc"}' | cut -c1-150)"
  echo "$who rpc/create_workspace (Content-Profile app) -> $(h0_rest POST /rest/v1/rpc/create_workspace "$tok" '{"p_name":"x","p_slug":"h0-rpc"}' 'Content-Profile: app' | cut -c1-150)"
  echo "$who rpc/has_role (Accept-Profile app)      -> $(h0_rest GET "/rest/v1/rpc/has_role?p_workspace_id=$MIOLO&p_min_role=owner" "$tok" '' 'Accept-Profile: app' | cut -c1-150)"
done

echo "== SQL como anon: EXECUTE em funções de public e app"
h0_psql <<'SQL'
select 'funções em public/app executáveis por anon: ' || count(*)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'app') and has_function_privilege('anon', p.oid, 'EXECUTE');
select 'funções em public/app executáveis por authenticated: ' || coalesce(string_agg(n.nspname || '.' || p.proname, ', ' order by 1), '-')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'app') and has_function_privilege('authenticated', p.oid, 'EXECUTE');
select 'USAGE em app para anon: ' || has_schema_privilege('anon', 'app', 'USAGE');
SQL
echo "anon chamando app.create_workspace por SQL:"
h0_psql 2>&1 <<'SQL' | grep -E 'ERROR|create' | head -2
begin; set local role anon; select app.create_workspace('x', 'h0-anon'); rollback;
SQL
echo "authenticated sem sub chamando app.create_workspace por SQL:"
h0_psql 2>&1 <<'SQL' | grep -E 'ERROR' | head -2
begin; set local role authenticated; select app.create_workspace('x', 'h0-sem-sub'); rollback;
SQL

after="$(h0_psql -c "select (select count(*) from public.audit_events) || '/' || (select count(*) from public.workspaces)")"
echo "== contagem audit_events/workspaces antes=$before depois=$after"
