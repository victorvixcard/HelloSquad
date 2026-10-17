-- SA7a (H-SA-01): o motivo interno do Super Admin (versão de preço e suspensão) não é legível por nenhum
-- papel da Data API. A varredura passa por toda tabela e view de public em que authenticated tem SELECT, como
-- a Marina (titular da conta suspensa) e como o Pedro (sem negócio), procurando o motivo gravado pelo Vic. A
-- mesma varredura com o vazamento reintroduzido de propósito (mutação) acha o motivo: o teste não é vazio.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(16);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'pedro@semconta.example') as pedro,
  (select id from auth.users where email = 'vic@hellosquad.example') as vic,
  (select id from public.workspaces where slug = 'miolo') as miolo,
  'Motivo interno SA7a do preço 3f9c'::text as price_reason,
  'Motivo interno SA7a da suspensão 7b21'::text as suspension_reason;
grant select on fx to public;

grant hellosquad_admin to postgres with inherit false, set true;
grant usage on schema extensions to hellosquad_admin;

create function pg_temp.claims(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
end;
$$;

-- Linhas, em toda relação de public legível por authenticated, cujo texto contém p_marker (com a RLS de quem chama).
create function pg_temp.leaks(p_marker text) returns integer
language plpgsql as $$
declare
  v_rel regclass;
  v_count integer;
  v_total integer := 0;
begin
  for v_rel in
    select c.oid::regclass
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p')
      and has_table_privilege('authenticated', c.oid, 'select')
  loop
    execute format('select count(*) from %s t where t::text like %L', v_rel, '%' || p_marker || '%') into v_count;
    v_total := v_total + v_count;
  end loop;
  return v_total;
end;
$$;

select hasnt_column('public', 'delivery_prices', 'note', 'delivery_prices não tem mais o motivo do Super Admin');
select hasnt_column('public', 'workspaces', 'suspension_reason', 'workspaces não tem mais o motivo da suspensão');
select ok(
  not has_table_privilege('authenticated', 'public.delivery_price_notes', 'select')
  and not has_table_privilege('anon', 'public.delivery_price_notes', 'select')
  and not has_table_privilege('service_role', 'public.delivery_price_notes', 'select')
  and not has_table_privilege('authenticated', 'public.workspace_suspension_reasons', 'select')
  and not has_table_privilege('anon', 'public.workspace_suspension_reasons', 'select')
  and not has_table_privilege('service_role', 'public.workspace_suspension_reasons', 'select'),
  'as tabelas dos motivos não têm GRANT para anon, authenticated nem service_role'
);

select pg_temp.claims((select vic from fx));
set local role hellosquad_admin;
select lives_ok(
  format($$select app.admin_catalog_price('04.01', 7, null, true, false, %L)$$, (select price_reason from fx)),
  'o Vic grava uma versão de preço da 04.01 com motivo'
);
select lives_ok(
  format($$select * from app.admin_set_workspace_suspended(%L, true, %L)$$, (select miolo from fx), (select suspension_reason from fx)),
  'o Vic suspende a Miolo com motivo'
);
select is(
  (select count(*)::integer from public.delivery_price_notes where note = (select price_reason from fx))
  + (select count(*)::integer from public.workspace_suspension_reasons
     where workspace_id = (select miolo from fx) and reason = (select suspension_reason from fx)),
  2,
  'o painel (hellosquad_admin com o JWT do Vic) lê os dois motivos'
);
reset role;

select pg_temp.claims((select marina from fx));
set local role authenticated;
select is(pg_temp.leaks((select suspension_reason from fx)), 0, 'a Marina (titular da conta suspensa) não lê o motivo da suspensão em tabela nenhuma');
select is(pg_temp.leaks((select price_reason from fx)), 0, 'a Marina não lê o motivo do preço em tabela nenhuma');
select ok(
  (select suspended_at is not null from public.workspaces where id = (select miolo from fx)),
  'a Marina continua vendo que a conta está suspensa'
);
select throws_ok('select reason from public.workspace_suspension_reasons', '42501', null, 'a Marina não lê a tabela do motivo da suspensão');
reset role;

select pg_temp.claims((select pedro from fx));
set local role authenticated;
select is(pg_temp.leaks((select price_reason from fx)), 0, 'o Pedro (sem negócio) não lê o motivo do preço em tabela nenhuma');
select is(pg_temp.leaks((select suspension_reason from fx)), 0, 'o Pedro não lê o motivo da suspensão em tabela nenhuma');
select ok(
  exists (select 1 from public.delivery_prices where delivery_type = '04.01' and credits = 7),
  'o Pedro continua lendo o preço em créditos da versão nova (o produto não perde nada)'
);
select throws_ok('select note from public.delivery_price_notes', '42501', null, 'o Pedro não lê a tabela do motivo do preço');
reset role;

-- Mutação: devolver o motivo ao alcance de authenticated faz a mesma varredura achá-lo.
grant select on public.delivery_price_notes, public.workspace_suspension_reasons to authenticated;
create policy sa7a_mutation_notes on public.delivery_price_notes for select to authenticated using (true);
create policy sa7a_mutation_reasons on public.workspace_suspension_reasons for select to authenticated
  using (workspace_id in (select app.current_user_workspace_ids()));

select pg_temp.claims((select pedro from fx));
set local role authenticated;
select is(pg_temp.leaks((select price_reason from fx)), 1, 'mutação: com GRANT para authenticated, a varredura acha o motivo do preço (Pedro)');
reset role;

select pg_temp.claims((select marina from fx));
set local role authenticated;
select is(pg_temp.leaks((select suspension_reason from fx)), 1, 'mutação: com GRANT para authenticated, a varredura acha o motivo da suspensão (Marina)');
reset role;

select * from finish();
rollback;
