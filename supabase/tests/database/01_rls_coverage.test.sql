-- S0 (a): varredura de segurança do schema public. Não lista tabela por nome: qualquer objeto novo
-- que escapar da RLS forçada, ficar visível para anon ou ganhar função SECURITY DEFINER sem
-- search_path fixo derruba o teste.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(7);

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
  $$select c.relname, p.privilege
    from pg_class c
    cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) as p (privilege)
    where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and has_any_column_privilege('anon', c.oid, p.privilege)
    union all
    select c.relname, p.privilege
    from pg_class c
    cross join unnest(array['DELETE', 'TRUNCATE', 'TRIGGER']) as p (privilege)
    where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and has_table_privilege('anon', c.oid, p.privilege)$$,
  'anon não tem privilégio em nenhuma relação de public'
);

select is_empty(
  $$select p.oid::regprocedure
    from pg_proc p
    where p.pronamespace in ('public'::regnamespace, 'app'::regnamespace)
      and has_function_privilege('anon', p.oid, 'execute')$$,
  'anon não executa nenhuma função de public nem de app'
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
