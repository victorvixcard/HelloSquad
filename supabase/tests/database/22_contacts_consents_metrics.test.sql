-- S2b: base de clientes do Max (contacts, consents somente inserção, contact_imports, app.import_contacts) e
-- métricas da Íris (metrics_daily, `metric` apontando para a série): RLS forçada, isolamento entre workspaces,
-- só leitura para o membro, importação que recusa contato sem consentimento, consentimento imutável (revogar é
-- linha nova) e que sai só com o contato.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(34);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'carla@vitta.example') as carla,
  (select id from auth.users where email = 'pedro@semconta.example') as pedro,
  (select id from public.workspaces where slug = 'miolo') as miolo,
  (select id from public.workspaces where slug = 'vitta') as vitta,
  '5eed0000-0000-4000-8000-000000001001'::uuid as ana,
  '5eed0000-0000-4000-8000-000000001011'::uuid as larissa;
grant select on fx to public;

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  set local role authenticated;
end;
$$;

-- RLS forçada nas tabelas novas.
select ok((select relforcerowsecurity from pg_class where oid = 'public.contacts'::regclass), 'contacts: RLS forçada');
select ok((select relforcerowsecurity from pg_class where oid = 'public.consents'::regclass), 'consents: RLS forçada');
select ok((select relforcerowsecurity from pg_class where oid = 'public.contact_imports'::regclass), 'contact_imports: RLS forçada');
select ok((select relforcerowsecurity from pg_class where oid = 'public.metrics_daily'::regclass), 'metrics_daily: RLS forçada');

-- ---------------------------------------------------------------------------------------------------
-- Isolamento e só leitura
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
select is((select count(*) from public.contacts)::int, 20, 'Marina vê os 20 contatos da Miolo');
select is((select count(*) from public.consents)::int, 16, 'Marina vê os 16 consentimentos da Miolo');
select is(
  (select count(*) from public.contact_consent_state where status = 'granted' and channel = 'email')::int, 10,
  'consentimento vigente: 10 contatos aceitam e-mail'
);
select is(
  (select array_agg(distinct workspace_id) from public.metrics_daily), array[(select miolo from fx)],
  'Marina vê só as métricas da Miolo'
);
select throws_ok(
  $$insert into public.contacts (workspace_id, full_name, email, source) values ((select miolo from fx), 'X', 'x@contatos.example', 'teste')$$,
  '42501', null, 'membro não insere contato direto'
);
select throws_ok(
  $$insert into public.consents (workspace_id, contact_id, channel, status, source, given_at) values ((select miolo from fx), (select ana from fx), 'email', 'revoked', 'teste', current_date)$$,
  '42501', null, 'membro não grava consentimento direto'
);
select is_empty(
  $$update public.metrics_daily set value = 0 where workspace_id = (select miolo from fx) returning 1$$,
  'membro não altera métrica (nenhuma linha muda)'
);

select pg_temp.act_as((select rafael from fx));
select is((select count(*) from public.contacts)::int, 0, 'Rafael (Vitta) não vê contato da Miolo');
select is((select count(*) from public.consents)::int, 0, 'Rafael não vê consentimento da Miolo');
select is(
  (select array_agg(distinct workspace_id) from public.metrics_daily), array[(select vitta from fx)],
  'Rafael vê só as métricas da Vitta'
);

select pg_temp.act_as((select pedro from fx));
select is((select count(*) from public.metrics_daily)::int, 0, 'Pedro (sem workspace) não vê métrica');

-- ---------------------------------------------------------------------------------------------------
-- Importação
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
select is(
  (select row(total_rows, accepted_rows, refused_rows, refused)::text from app.import_contacts(
    (select miolo from fx), 'teste.csv', 'Planilha de teste', 3,
    '[{"line": 2, "name": "Nova Cliente", "email": "nova@contatos.example", "phone": null,
       "consents": [{"channel": "email", "given_at": "2026-10-01"}]},
      {"line": 3, "name": "Já Existe", "email": "cliente02@contatos.example", "phone": null,
       "consents": [{"channel": "email", "given_at": "2026-10-01"}]}]'::jsonb,
    '[{"line": 4, "reason": "no_consent"}]'::jsonb
  )),
  row(3, 1, 2, '[{"line": 3, "reason": "duplicate_existing"}, {"line": 4, "reason": "no_consent"}]'::jsonb)::text,
  'importação: um aceito, a duplicata da base e a recusa da API no relatório'
);
select is(
  (select row(c.source, s.channel, s.status, s.legal_basis, s.given_at)::text
   from public.contacts c join public.consents s on s.contact_id = c.id
   where c.email = 'nova@contatos.example'),
  row('Planilha de teste', 'email'::public.consent_channel, 'granted'::public.consent_status,
      'consent'::public.legal_basis, date '2026-10-01')::text,
  'contato importado com origem, base legal, data e canal do consentimento'
);
select throws_ok(
  $$select app.import_contacts((select miolo from fx), 'x.csv', 'Teste', 1,
    '[{"line": 2, "name": "Sem", "email": "sem@contatos.example", "consents": []}]'::jsonb)$$,
  '23514', 'Contato sem consentimento não entra na base.', 'contato sem consentimento é recusado pelo banco'
);
select throws_ok(
  $$select app.import_contacts((select miolo from fx), 'x.csv', 'Teste', 1,
    '[{"line": 2, "name": "Futuro", "email": "futuro@contatos.example",
       "consents": [{"channel": "email", "given_at": "2999-01-01"}]}]'::jsonb)$$,
  '23514', 'Data de consentimento ausente ou no futuro.', 'consentimento com data no futuro é recusado'
);
select throws_ok(
  $$select app.import_contacts((select miolo from fx), 'x.csv', 'Teste', 1,
    '[{"line": 2, "name": "Sem Telefone", "email": "st@contatos.example",
       "consents": [{"channel": "whatsapp", "given_at": "2026-10-01"}]}]'::jsonb)$$,
  '23514', 'Consentimento num canal sem endereço.', 'consentimento de WhatsApp sem telefone é recusado'
);
select throws_ok(
  $$select app.import_contacts((select miolo from fx), 'x.csv', 'Teste', 5, '[]'::jsonb)$$,
  '22023', 'A contagem de linhas não fecha.', 'contagem que não fecha é recusada'
);

select pg_temp.act_as((select carla from fx));
select throws_ok(
  $$select app.import_contacts((select vitta from fx), 'x.csv', 'Teste', 1, '[]'::jsonb, '[{"line": 2, "reason": "no_consent"}]'::jsonb)$$,
  '42501', 'Só o dono ou um admin importa contatos.', 'editor não importa contatos'
);
select pg_temp.act_as((select rafael from fx));
select throws_ok(
  $$select app.import_contacts((select miolo from fx), 'x.csv', 'Teste', 1, '[]'::jsonb, '[{"line": 2, "reason": "no_consent"}]'::jsonb)$$,
  'P0002', 'Workspace não encontrado.', 'outro workspace não importa na Miolo'
);
select is((select count(*) from public.contact_imports)::int, 0, 'Rafael não vê a importação da Miolo');

-- ---------------------------------------------------------------------------------------------------
-- Consentimento somente inserção (vale até para o papel privilegiado)
-- ---------------------------------------------------------------------------------------------------

reset role;
select throws_ok(
  $$update public.consents set status = 'revoked' where contact_id = (select ana from fx)$$,
  '42501', 'O registro de consentimento é somente inserção: para revogar, registre uma linha nova.',
  'consentimento não se altera'
);
select throws_ok(
  $$delete from public.consents where contact_id = (select ana from fx)$$,
  '42501', null, 'consentimento não se apaga sozinho'
);
select throws_ok($$truncate public.consents$$, '42501', null, 'consentimento não se trunca');

insert into public.consents (workspace_id, contact_id, channel, status, source, given_at, recorded_at)
values ((select miolo from fx), (select ana from fx), 'whatsapp', 'revoked', 'Pedido de descadastro', current_date, now() + interval '1 second');
select is(
  (select status::text from public.contact_consent_state where contact_id = (select ana from fx) and channel = 'whatsapp'),
  'revoked', 'revogar é linha nova: o vigente passa a ser revoked'
);
select is(
  (select count(*) from public.consents where contact_id = (select ana from fx))::int, 3,
  'o histórico do consentimento fica (concedido e revogado)'
);

delete from public.contacts where id = (select larissa from fx);
select is(
  (select count(*) from public.contacts where id = (select larissa from fx))::int, 0,
  'contato sem consentimento sai da base (exclusão)'
);
delete from public.contacts where id = (select ana from fx);
select is(
  (select count(*) from public.consents where contact_id = (select ana from fx))::int, 0,
  'o consentimento sai junto com o contato (direito de exclusão)'
);
select throws_ok(
  $$insert into public.metrics_daily (workspace_id, channel, metric, day, value, unit, source) values ((select miolo from fx), 'site', 'sessions', current_date, -1, 'sessões', 'teste')$$,
  '23514', null, 'métrica negativa é recusada'
);

-- ---------------------------------------------------------------------------------------------------
-- `metric` aponta para a série
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
select is(
  (select row(c.primary_agent_id, c.context_meta ->> 'origin', c.context_meta ->> 'period')::text
   from app.create_conversation((select miolo from fx), 'object', null, 'metric', null, null, null, 'site.sessions',
                                '{"title": "Sessões no site"}') c),
  row('iris'::public.agent_id, 'fonte_de_teste',
      (current_date - 90)::text || '/' || (current_date - 1)::text)::text,
  'metric com a chave de uma série: Íris à frente, período e origem lidos da tabela'
);
select is(
  (select c.primary_agent_id::text
   from app.create_conversation((select miolo from fx), 'object', null, 'metric', null, null, null, 'store.visits',
                                '{"title": "Visitas"}') c),
  'nexo', 'chave sem série continua como antes'
);
select pg_temp.act_as((select rafael from fx));
select is(
  (select c.context_meta ->> 'period'
   from app.create_conversation((select vitta from fx), 'object', null, 'metric', null, null, null, 'site.sessions',
                                '{"title": "Sessões no site"}') c),
  (current_date - 90)::text || '/' || (current_date - 1)::text,
  'a Vitta abre a série dela'
);

select * from finish();
rollback;
