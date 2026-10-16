-- S0 (f): audit_events é somente-inserção. Nenhum papel além do dono da tabela (e superusuário)
-- consegue UPDATE/DELETE/TRUNCATE; a varredura do catálogo pega GRANT novo dado por engano.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(16);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from public.workspaces where slug = 'vitta') as vitta;
grant select on fx to public;

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  perform set_config('role', 'authenticated', true);
end;
$$;

insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id)
select vitta, 'user', rafael::text, 'workspace.created', 'workspace', vitta::text from fx;

select ok((select num_nonnulls(marina, rafael, vitta) = 3 from fx), 'seed presente (make seed)');

select is_empty(
  $$select r.rolname, p.privilege
    from pg_roles r
    cross join unnest(array['UPDATE', 'DELETE', 'TRUNCATE']) as p (privilege)
    where not r.rolsuper
      and r.oid <> (select relowner from pg_class where oid = 'public.audit_events'::regclass)
      and r.rolname <> 'pg_write_all_data'
      and has_table_privilege(r.oid, 'public.audit_events', p.privilege)$$,
  'só o dono da tabela e superusuários alteram ou apagam audit_events'
);
select is_empty(
  $$select m.rolname
    from pg_auth_members am
    join pg_roles m on m.oid = am.member
    where am.roleid = 'pg_write_all_data'::regrole and not m.rolsuper$$,
  'ninguém herda escrita global por pg_write_all_data'
);
select is_empty(
  $$select policyname from pg_policies where schemaname = 'public' and tablename = 'audit_events'$$,
  'audit_events não tem política: nenhum papel da Data API ou da API passa pela RLS'
);

select pg_temp.act_as((select rafael from fx));

select throws_ok(
  $$update public.audit_events set action = 'workspace.renamed'$$,
  '42501', 'permission denied for table audit_events', 'Rafael (owner) não altera audit_events'
);
select throws_ok(
  $$delete from public.audit_events$$,
  '42501', 'permission denied for table audit_events', 'Rafael (owner) não apaga audit_events'
);
select throws_ok(
  $$insert into public.audit_events (workspace_id, actor_type, actor_id, action)
    values ((select vitta from fx), 'user', (select rafael from fx)::text, 'workspace.forged')$$,
  '42501', 'permission denied for table audit_events', 'authenticated não grava auditoria direto'
);
select throws_ok(
  $$select 1 from public.audit_events$$,
  '42501', 'permission denied for table audit_events', 'authenticated não lê audit_events'
);

select pg_temp.act_as((select marina from fx));

select throws_ok(
  $$update public.audit_events set payload = '{}'::jsonb$$,
  '42501', 'permission denied for table audit_events', 'Marina não altera audit_events'
);
select throws_ok(
  $$delete from public.audit_events$$,
  '42501', 'permission denied for table audit_events', 'Marina não apaga audit_events'
);

reset role;
set local role anon;

select throws_ok(
  $$update public.audit_events set action = 'x.y'$$,
  '42501', 'permission denied for table audit_events', 'anon não altera audit_events'
);
select throws_ok(
  $$delete from public.audit_events$$,
  '42501', 'permission denied for table audit_events', 'anon não apaga audit_events'
);

reset role;
set local role service_role;

select throws_ok(
  $$update public.audit_events set action = 'x.y'$$,
  '42501', 'permission denied for table audit_events', 'service_role não altera audit_events'
);
select throws_ok(
  $$delete from public.audit_events$$,
  '42501', 'permission denied for table audit_events', 'service_role não apaga audit_events'
);
select throws_ok(
  $$truncate public.audit_events$$,
  '42501', 'permission denied for table audit_events', 'service_role não esvazia audit_events'
);

reset role;

select is(
  (select count(*) from public.audit_events where workspace_id = (select vitta from fx) and action = 'workspace.created'),
  1::bigint,
  'o evento de auditoria segue intacto'
);

select * from finish();
rollback;
