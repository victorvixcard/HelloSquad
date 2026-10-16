-- S2f: e-mail transacional. RLS forçada em email_messages e email_preferences; a pessoa vê os e-mails
-- que recebeu e o owner os do negócio (outro negócio nunca); ninguém grava e-mail pelo papel do usuário;
-- preferência só da própria pessoa e só para os avisos opcionais; os gatilhos enfileiram um e-mail por
-- evento e pessoa, no idioma da pessoa → do negócio → pt-BR, com a mensagem na fila email_outbox.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(23);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
  (select id from auth.users where email = 'carla@vitta.example') as carla,
  (select id from auth.users where email = 'pedro@semconta.example') as pedro,
  (select id from public.workspaces where slug = 'miolo') as miolo,
  (select id from public.workspaces where slug = 'vitta') as vitta;
grant select on fx to public;

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  set local role authenticated;
end;
$$;

select pgmq.purge_queue('email_outbox');

select has_table('public', 'email_messages', 'email_messages existe');
select has_table('public', 'email_preferences', 'email_preferences existe');
select ok(
  (select bool_and(c.relrowsecurity and c.relforcerowsecurity) from pg_class c
   where c.oid in ('public.email_messages'::regclass, 'public.email_preferences'::regclass)),
  'RLS habilitada e forçada nas duas tabelas'
);

-- Vitta em en; Carla escolheu es para si.
update public.workspaces set locale = 'en' where slug = 'vitta';
update auth.users set raw_user_meta_data = raw_user_meta_data || '{"locale": "es"}' where email = 'carla@vitta.example';

insert into public.invitations (workspace_id, email, role, token_hash, expires_at, invited_by)
select miolo, 'pgtap.convite@miolo.example', 'editor', repeat('a', 64), now() + interval '7 days', marina from fx;
insert into public.invitations (workspace_id, email, role, token_hash, expires_at, invited_by)
select vitta, 'pgtap.convite@vitta.example', 'viewer', repeat('b', 64), now() + interval '7 days', rafael from fx;
insert into public.invitations (workspace_id, email, role, token_hash, expires_at, invited_by)
select vitta, 'carla@vitta.example', 'admin', repeat('c', 64), now() + interval '7 days', rafael from fx;

select is(
  (select array_agg(recipient_email || ':' || locale order by recipient_email) from public.email_messages
   where created_at = now() and template = 'invitation' and recipient_email like any (array['pgtap.%', 'carla@%'])),
  array['carla@vitta.example:es', 'pgtap.convite@miolo.example:pt-BR', 'pgtap.convite@vitta.example:en'],
  'convite: idioma da pessoa (Carla, es) → do negócio (Vitta en, Miolo pt-BR)'
);
select is(
  (select recipient_user_id from public.email_messages where created_at = now() and recipient_email = 'carla@vitta.example'),
  (select carla from fx),
  'convite a quem já tem conta liga o e-mail à pessoa'
);
select is(
  (select variables ->> 'inviter_name' from public.email_messages where created_at = now() and recipient_email = 'pgtap.convite@vitta.example'),
  'Rafael Nunes',
  'variáveis resolvidas no negócio do evento (quem convidou)'
);
select is(
  (select count(*)::int from pgmq.q_email_outbox q
   join public.email_messages m on m.id = (q.message ->> 'email_message_id')::uuid
   where m.created_at = now() and m.template = 'invitation' and m.recipient_email like any (array['pgtap.%', 'carla@%'])),
  3,
  'cada e-mail vai para a fila email_outbox'
);

-- Cobrança da Miolo com problema: aviso ao owner; repetir o mesmo estado não duplica.
update public.payments set status = 'overdue' where id = '5eed0000-0000-4000-8000-0000000009d2';
update public.payments set status = 'pending' where id = '5eed0000-0000-4000-8000-0000000009d2';
update public.payments set status = 'overdue' where id = '5eed0000-0000-4000-8000-0000000009d2';
select is(
  (select array_agg(recipient_email) from public.email_messages where created_at = now() and template = 'payment_problem'),
  array['marina@miolo.example'],
  'cobrança vencida: um aviso só, ao owner'
);
update public.payments set status = 'confirmed', confirmed_at = now() where id = '5eed0000-0000-4000-8000-0000000009d2';
select is(
  (select variables - 'workspace_name' - 'recipient_name' from public.email_messages where created_at = now() and template = 'payment_confirmed'),
  '{"method": "pix", "status": "confirmed", "payment_kind": "topup", "workspace_slug": "miolo"}'::jsonb,
  'pagamento confirmado: sem valor em dinheiro nem créditos nas variáveis'
);

-- Isolamento e papéis na leitura.
select pg_temp.act_as((select marina from fx));
select is(
  (select count(*)::int from public.email_messages where workspace_id = (select vitta from fx)),
  0,
  'Marina não vê nenhum e-mail da Vitta'
);
select ok(
  (select count(*) from public.email_messages where workspace_id = (select miolo from fx)) >= 3,
  'Marina (owner) vê os e-mails da Miolo: convite e avisos de cobrança'
);
select throws_ok(
  $$insert into public.email_messages (workspace_id, recipient_email, template, locale, idempotency_key)
    values ((select miolo from fx), 'x@miolo.example', 'invitation', 'pt-BR', 'pgtap:forjado')$$,
  '42501',
  null,
  'usuário não grava e-mail (sem GRANT de escrita)'
);
select throws_ok(
  $$select app.enqueue_email('invitation', (select miolo from fx), null, 'x@miolo.example', '{}', 'pgtap:direto')$$,
  '42501',
  null,
  'usuário não chama app.enqueue_email'
);
reset role;

select pg_temp.act_as((select carla from fx));
select is(
  (select array_agg(recipient_email) from public.email_messages where created_at = now()),
  array['carla@vitta.example'],
  'Carla (não owner) vê só o e-mail que ela recebeu, não os convites da Vitta'
);
reset role;

select pg_temp.act_as((select pedro from fx));
select is((select count(*)::int from public.email_messages), 0, 'Pedro sem negócio não vê nenhum e-mail');
reset role;

-- Preferências: só da própria pessoa, só os avisos opcionais.
select pg_temp.act_as((select marina from fx));
select lives_ok(
  $$insert into public.email_preferences (user_id, template, enabled)
    values ((select marina from fx), 'payment_problem', false)$$,
  'Marina desliga o aviso de cobrança com problema'
);
select throws_ok(
  $$insert into public.email_preferences (user_id, template, enabled)
    values ((select rafael from fx), 'payment_problem', false)$$,
  '42501',
  null,
  'Marina não grava preferência do Rafael'
);
select throws_ok(
  $$insert into public.email_preferences (user_id, template, enabled)
    values ((select marina from fx), 'password_changed', false)$$,
  '23514',
  null,
  'aviso de senha não é opcional'
);
reset role;

select pg_temp.act_as((select rafael from fx));
select is((select count(*)::int from public.email_preferences), 0, 'Rafael não vê a preferência da Marina');
select is_empty(
  $$update public.email_preferences set enabled = true returning 1$$,
  'Rafael não muda a preferência da Marina'
);
reset role;

update public.payments set status = 'failed' where id = '5eed0000-0000-4000-8000-0000000009d1';
select is(
  (select count(*)::int from public.email_messages where created_at = now() and template = 'payment_problem'),
  1,
  'com o aviso desligado, a cobrança recusada não gera e-mail à Marina'
);

-- Aprovação pendente vai só ao owner; versão de entrega do agente vai a quem não é owner.
insert into public.approvals (workspace_id, work_item_id, kind, requested_by_agent_id)
select w.workspace_id, w.id, 'respond', 'nexo'
from public.work_items w where w.workspace_id = (select miolo from fx) limit 1;
select is(
  (select array_agg(recipient_email || ':' || locale) from public.email_messages where created_at = now() and template = 'approval_pending'),
  array['marina@miolo.example:pt-BR'],
  'aprovação pendente: só o owner, no idioma do negócio'
);

select ok(
  not exists (select 1 from public.email_messages where workspace_id is null and template <> 'password_changed'),
  'só o aviso de senha não tem negócio'
);

select * from finish();
rollback;
