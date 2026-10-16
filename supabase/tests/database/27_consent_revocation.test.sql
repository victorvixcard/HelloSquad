-- S2g (H2-17): revogação de consentimento. Owner ou admin revoga por app.revoke_consent (linha nova `revoked`; o
-- registro anterior fica), com auditoria sem dado pessoal; editora e outro negócio não revogam; os auxiliares
-- internos não são executáveis por authenticated; reimportar o contato da base com "não" explícito revoga em vez de
-- recusar, e o contato que não está na base continua recusado sem consentimento.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(12);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'carla@vitta.example') as carla,
  (select id from public.workspaces where slug = 'miolo') as miolo,
  (select id from public.workspaces where slug = 'vitta') as vitta,
  '5eed0000-0000-4000-8000-000000001001'::uuid as ana,
  '5eed0000-0000-4000-8000-000000001002'::uuid as cliente02;
grant select on fx to public;

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  set local role authenticated;
end;
$$;

select ok(
  not has_function_privilege(
    'authenticated', 'app.revoke_contact_consents(uuid, uuid, public.consent_channel[], text, date, uuid, uuid)', 'execute'
  ),
  'authenticated não executa app.revoke_contact_consents'
);
select ok(
  not has_function_privilege('authenticated', 'app.find_contact(uuid, text, text)', 'execute'),
  'authenticated não executa app.find_contact'
);
select ok(
  has_function_privilege('authenticated', 'app.revoke_consent(uuid, text, text, public.consent_channel, text)', 'execute'),
  'authenticated executa app.revoke_consent (a função confere papel e negócio)'
);

select pg_temp.act_as((select carla from fx));
select throws_ok(
  $$select app.revoke_consent((select vitta from fx), 'cliente01@contatos.example', null, null, 'Teste')$$,
  '42501', 'Só o dono ou um admin revoga consentimento.', 'editora não revoga'
);
select pg_temp.act_as((select rafael from fx));
select throws_ok(
  $$select app.revoke_consent((select miolo from fx), 'cliente01@contatos.example', null, null, 'Teste')$$,
  'P0002', 'Workspace não encontrado.', 'outro negócio não revoga na Miolo'
);

select pg_temp.act_as((select marina from fx));
select throws_ok(
  $$select app.revoke_consent((select miolo from fx), 'ninguem@contatos.example', null, null, 'Teste')$$,
  'P0002', 'Contato não encontrado.', 'contato fora da base: não encontrado'
);
select is(
  app.revoke_consent((select miolo from fx), null, '+5511999990001', 'whatsapp', 'Ligação da cliente') -> 'revoked',
  '["whatsapp"]'::jsonb,
  'Marina revoga o WhatsApp da Ana pelo telefone'
);
select is(
  (select array_agg(status::text order by recorded_at, id) from public.consents
   where contact_id = (select ana from fx) and channel = 'whatsapp'),
  array['granted', 'revoked'],
  'somente inserção: o consentimento e a revogação ficam no histórico'
);
select is(
  (select status::text from public.contact_consent_state
   where contact_id = (select ana from fx) and channel = 'whatsapp'),
  'revoked',
  'estado vigente do WhatsApp da Ana: revogado'
);
select is(
  (select row(accepted_rows, revoked_rows, refused_rows, refused)::text from app.import_contacts(
    (select miolo from fx), 'revogar.csv', 'Pedidos do balcão', 2,
    '[{"line": 2, "email": "cliente02@contatos.example", "phone": null, "revoke": ["email", "whatsapp"]},
      {"line": 3, "email": "nova.s2g@contatos.example", "phone": null, "revoke": ["email"]}]'::jsonb
  )),
  row(0, 1, 1, '[{"line": 3, "reason": "no_consent"}]'::jsonb)::text,
  'reimportar com "não": o contato da base revoga, o contato novo é recusado sem consentimento'
);

reset role;
select is(
  (select payload from public.audit_events
   where action = 'contacts.consent_revoked' and entity_id = (select ana::text from fx)),
  '{"requested": "whatsapp", "revoked": ["whatsapp"], "source": "Ligação da cliente"}'::jsonb,
  'auditoria da revogação com os canais e a origem, sem dado pessoal'
);
select is(
  (select array_agg(distinct status::text) from public.contact_consent_state where contact_id = (select cliente02 from fx)),
  array['revoked'],
  'cliente02: todos os canais revogados pela reimportação'
);

select * from finish();
rollback;
