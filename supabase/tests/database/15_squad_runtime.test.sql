-- S1c: o que o runtime do squad acrescentou ao banco. app.post_agent_message grava a mensagem do agente
-- só na conversa do workspace informado e só pelo papel privilegiado; agent_prompt_versions é fechada
-- para a Data API; runs.prompt_version aponta para uma versão do agente do run; workspaces.locale nasce
-- pt-BR e aceita só os idiomas do produto.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(16);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
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

create temporary table ids (name text primary key, id uuid);
grant select, insert on ids to public;

with c as (
  insert into public.conversations (workspace_id, kind, primary_agent_id)
  select miolo, 'agent_direct', 'otto' from fx
  returning id
)
insert into ids select 'conversation', id from c;
with r as (
  insert into public.runs (workspace_id, conversation_id, agent_id, status, idempotency_key)
  select miolo, (select id from ids where name = 'conversation'), 'otto', 'running', 'teste:s1c'
  from fx
  returning id
)
insert into ids select 'run', id from r;

-- Mensagem do agente pelo papel privilegiado
insert into ids
select 'message', id
from app.post_agent_message(
  (select miolo from fx), (select id from ids where name = 'conversation'), 'otto',
  (select id from ids where name = 'run'), '  Escrevi duas versões.  ',
  '[{"type": "delivery_version"}]'::jsonb
);

select results_eq(
  $$select author_type::text, author_agent_id::text, author_user_id, run_id, body, jsonb_array_length(attachments)
    from public.messages where id = (select id from ids where name = 'message')$$,
  $$select 'agent', 'otto', null::uuid, (select id from ids where name = 'run'), 'Escrevi duas versões.', 1$$,
  'post_agent_message grava autor agente, run, corpo aparado e anexos'
);
select ok(
  exists (
    select 1 from public.conversation_participants
    where conversation_id = (select id from ids where name = 'conversation') and agent_id = 'otto'
  ),
  'o agente entra nos participantes da conversa'
);
select ok(
  (select last_message_at from public.conversations where id = (select id from ids where name = 'conversation'))
    = (select created_at from public.messages where id = (select id from ids where name = 'message')),
  'last_message_at acompanha a mensagem do agente'
);
select throws_ok(
  format(
    'select app.post_agent_message(%L, %L, %L, null, %L)',
    (select vitta from fx), (select id from ids where name = 'conversation'), 'otto', 'oi'
  ),
  'P0002', 'Conversa não encontrada.',
  'conversa da Miolo com o workspace da Vitta: não encontrada (workspace_id explícito)'
);
select throws_ok(
  format(
    'select app.post_agent_message(%L, %L, %L, null, %L)',
    (select miolo from fx), (select id from ids where name = 'conversation'), 'otto', '   '
  ),
  '22023', 'A mensagem não pode ficar vazia.',
  'corpo vazio é recusado'
);
select throws_ok(
  format(
    'select app.post_agent_message(%L, %L, %L, null, %L, %L::jsonb)',
    (select miolo from fx), (select id from ids where name = 'conversation'), 'otto', 'oi', '{}'
  ),
  '22023', 'Os anexos precisam ser uma lista JSON.',
  'anexos fora de lista são recusados'
);
select throws_ok(
  format(
    'select app.post_agent_message(%L, %L, %L, null, %L)',
    (select miolo from fx), (select id from ids where name = 'conversation'), 'zeca', 'oi'
  ),
  '23514', null,
  'agente fora de squad/ é recusado pelo domínio agent_id'
);
update public.conversations set archived_at = now() where id = (select id from ids where name = 'conversation');
select throws_ok(
  format(
    'select app.post_agent_message(%L, %L, %L, null, %L)',
    (select miolo from fx), (select id from ids where name = 'conversation'), 'otto', 'oi'
  ),
  '55000', 'Esta conversa está arquivada.',
  'conversa arquivada não recebe mensagem de agente'
);

-- Versões de prompt e runs.prompt_version
insert into public.agent_prompt_versions (agent_id, content_hash, delivery_type, files)
values ('otto', repeat('a', 64), '04.01', '{"otto/SOUL.md": "x"}');
select lives_ok(
  format('update public.runs set prompt_version = %L where id = %L', repeat('a', 64), (select id from ids where name = 'run')),
  'run aponta para uma versão do próprio agente'
);
select throws_ok(
  format('update public.runs set prompt_version = %L where id = %L', repeat('b', 64), (select id from ids where name = 'run')),
  '23503', null,
  'versão inexistente é recusada pela FK'
);
insert into public.agent_prompt_versions (agent_id, content_hash) values ('nexo', repeat('c', 64));
select throws_ok(
  format('update public.runs set prompt_version = %L where id = %L', repeat('c', 64), (select id from ids where name = 'run')),
  '23503', null,
  'versão de outro agente não serve para o run do Otto'
);
select throws_ok(
  $$insert into public.agent_prompt_versions (agent_id, content_hash) values ('otto', 'curto')$$,
  '23514', null,
  'hash fora do formato sha256 é recusado'
);

-- Idioma do workspace
select is(
  (select locale from public.workspaces where id = (select miolo from fx)), 'pt-BR',
  'workspace nasce em pt-BR'
);
select throws_ok(
  format('update public.workspaces set locale = %L where id = %L', 'fr', (select miolo from fx)),
  '23514', null,
  'idioma fora de pt-BR, en e es é recusado'
);

-- Marina (authenticated) não grava mensagem de agente nem lê as versões de prompt
select pg_temp.act_as((select marina from fx));
select throws_ok(
  format(
    'select app.post_agent_message(%L, %L, %L, null, %L)',
    (select miolo from fx), (select id from ids where name = 'conversation'), 'otto', 'oi'
  ),
  '42501', null,
  'authenticated não executa app.post_agent_message'
);
select throws_ok(
  'select count(*) from public.agent_prompt_versions',
  '42501', null,
  'authenticated não lê agent_prompt_versions'
);
reset role;

select * from finish();
rollback;
