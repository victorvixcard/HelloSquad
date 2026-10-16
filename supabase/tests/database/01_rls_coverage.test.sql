-- S0 (a): varredura de segurança do schema public. Não lista tabela por nome: qualquer objeto novo
-- que escapar da RLS forçada, ficar visível para anon ou ganhar função SECURITY DEFINER sem
-- search_path fixo derruba o teste.
-- S0b (H0-01): anon e service_role não têm privilégio nenhum em tabela, sequência ou função de public
-- e app. É o que segura um token forjado na Data API: service_role ignora a RLS, então só a falta de
-- GRANT o impede de ler.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(8);

select isnt_empty(
  $$select 1 from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')$$,
  'há tabelas em public para varrer'
);

select is_empty(
  $$select c.relname
    from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('r', 'p')
      and not (c.relrowsecurity and c.relforcerowsecurity)$$,
  'toda tabela de public tem RLS habilitada e forçada'
);

select is_empty(
  $$select c.relname
    from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind = 'v'
      and not coalesce('security_invoker=true' = any (c.reloptions), false)
      and (has_any_column_privilege('anon', c.oid, 'select')
           or has_any_column_privilege('authenticated', c.oid, 'select'))$$,
  'view de public visível para a Data API usa security_invoker (respeita a RLS)'
);

select is_empty(
  $$select c.relname
    from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('m', 'f')
      and (has_any_column_privilege('anon', c.oid, 'select')
           or has_any_column_privilege('authenticated', c.oid, 'select'))$$,
  'materialized view e foreign table de public (sem RLS) não ficam visíveis para a Data API'
);

select is_empty(
  $$select r.rolname, c.oid::regclass, p.privilege
    from pg_class c
    cross join (values ('anon'), ('service_role')) as r (rolname)
    cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) as p (privilege)
    where c.relnamespace in ('public'::regnamespace, 'app'::regnamespace)
      and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and has_any_column_privilege(r.rolname, c.oid, p.privilege)
    union all
    select r.rolname, c.oid::regclass, p.privilege
    from pg_class c
    cross join (values ('anon'), ('service_role')) as r (rolname)
    cross join unnest(array['DELETE', 'TRUNCATE', 'TRIGGER', 'MAINTAIN']) as p (privilege)
    where c.relnamespace in ('public'::regnamespace, 'app'::regnamespace)
      and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and has_table_privilege(r.rolname, c.oid, p.privilege)$$,
  'anon e service_role não têm privilégio em nenhuma tabela ou view de public nem de app'
);

select is_empty(
  $$select r.rolname, c.oid::regclass, p.privilege
    from pg_class c
    cross join (values ('anon'), ('service_role')) as r (rolname)
    cross join unnest(array['USAGE', 'SELECT', 'UPDATE']) as p (privilege)
    where c.relnamespace in ('public'::regnamespace, 'app'::regnamespace)
      and c.relkind = 'S'
      and has_sequence_privilege(r.rolname, c.oid, p.privilege)$$,
  'anon e service_role não têm privilégio em nenhuma sequência de public nem de app'
);

select is_empty(
  $$select r.rolname, p.oid::regprocedure
    from pg_proc p
    cross join (values ('anon'), ('service_role')) as r (rolname)
    where p.pronamespace in ('public'::regnamespace, 'app'::regnamespace)
      and has_function_privilege(r.rolname, p.oid, 'execute')$$,
  'anon e service_role não executam nenhuma função de public nem de app'
);

select is_empty(
  $$select p.oid::regprocedure
    from pg_proc p
    where p.pronamespace in ('public'::regnamespace, 'app'::regnamespace)
      and p.prosecdef
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) as c (setting) where c.setting like 'search_path=%'
      )$$,
  'função SECURITY DEFINER de public e app tem search_path fixo'
);

select * from finish();
rollback;
