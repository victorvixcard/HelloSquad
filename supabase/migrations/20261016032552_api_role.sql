-- S0 — papel de conexão da API (FastAPI).
-- Sem BYPASSRLS e sem herdar privilégios: conectado, o papel não lê nenhuma tabela. A cada requisição
-- autenticada a API abre uma transação, assume `authenticated` (SET LOCAL ROLE) e grava os claims do
-- JWT validado em `request.jwt.claims`, então a RLS vale dentro da API como vale no PostgREST.
-- A senha não fica aqui: `make migrate`/`make seed` a definem a partir de API_DATABASE_URL do .env,
-- com hash SCRAM calculado no cliente (o log de DDL do Postgres nunca vê a senha em claro).

do $$
declare
  v_role pg_catalog.pg_roles;
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'hellosquad_api') then
    create role hellosquad_api with login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;

  -- No Supabase o postgres não é superusuário e não pode rebaixar atributos com ALTER ROLE; se o papel
  -- já existir com algum privilégio a mais, a migration falha em vez de seguir com um papel perigoso.
  select * into v_role from pg_catalog.pg_roles where rolname = 'hellosquad_api';
  if v_role.rolsuper or v_role.rolbypassrls or v_role.rolreplication or v_role.rolcreaterole
     or v_role.rolcreatedb or v_role.rolinherit or not v_role.rolcanlogin then
    raise exception 'hellosquad_api existe com atributos inesperados; corrija com um superusuário antes de migrar.';
  end if;
end;
$$;

-- Mesmos limites do `authenticator`, o papel de conexão do PostgREST.
alter role hellosquad_api set statement_timeout = '8s';
alter role hellosquad_api set lock_timeout = '8s';

grant authenticated to hellosquad_api with inherit false, set true;
