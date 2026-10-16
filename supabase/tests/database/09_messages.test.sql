-- S1a: mensagens imutáveis e app.post_message (membership, papel, conversa arquivada, corpo vazio).
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(16);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
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

create temporary table conv (miolo_otto uuid, vitta_otto uuid, miolo_archived uuid);
grant select on conv to public;
with
  a as (insert into public.conversations (workspace_id, kind, primary_agent_id)
        select miolo, 'agent_direct', 'otto' from fx returning id),
  b as (insert into public.conversations (workspace_id, kind, primary_agent_id)
        select vitta, 'agent_direct', 'otto' from fx returning id),
  c as (insert into public.conversations (workspace_id, kind, primary_agent_id, archived_at)
        select miolo, 'agent_direct', 'bia', now() from fx returning id)
insert into conv select (select id from a), (select id from b), (select id from c);
create temporary table posted (id uuid, created_at timestamptz, author_type text, author_user_id uuid, body text);
grant select, insert on posted to public;

-- Marina posta na conversa da Miolo
select pg_temp.act_as((select marina from fx));

insert into posted
select id, created_at, author_type::text, author_user_id, body
from app.post_message((select miolo_otto from conv), '  Preciso de uma legenda para o pão de sábado.  ');

select is(
  (select row(author_type, author_user_id, body)::text from posted),
  row('user', (select marina from fx), 'Preciso de uma legenda para o pão de sábado.')::text,
  'post_message grava autor usuário = auth.uid() e corpo sem espaços nas pontas'
);
select is(
  (select last_message_at from public.conversations where id = (select miolo_otto from conv)),
  (select created_at from posted),
  'post_message atualiza last_message_at da conversa'
);
select isnt_empty(
  format(
    'select 1 from public.conversation_participants where conversation_id = %L and user_id = %L',
    (select miolo_otto from conv), (select marina from fx)
  ),
  'quem posta passa a constar como participante'
);

-- Imutáveis: nada de UPDATE, DELETE ou INSERT direto
select throws_ok(
  format('update public.messages set body = %L where id = %L', 'editada', (select id from posted)),
  '42501', null, 'Marina não edita mensagem (sem UPDATE)'
);
select throws_ok(
  format('delete from public.messages where id = %L', (select id from posted)),
  '42501', null, 'Marina não apaga mensagem (sem DELETE)'
);
select throws_ok(
  format(
    $$insert into public.messages (workspace_id, conversation_id, author_type, author_agent_id, body)
      values (%L, %L, 'agent', 'otto', 'me passando pelo Otto')$$,
    (select miolo from fx), (select miolo_otto from conv)
  ),
  '42501', null, 'Marina não insere mensagem direto (nem se passando por agente)'
);

-- Regras de entrada
select throws_ok(
  format('select app.post_message(%L, %L)', (select miolo_otto from conv), '   '),
  '22023', 'A mensagem não pode ficar vazia.', 'corpo em branco é recusado'
);
select throws_ok(
  format('select app.post_message(%L, %L)', (select miolo_otto from conv), repeat('a', 20001)),
  '22023', null, 'corpo acima de 20.000 caracteres é recusado'
);
select throws_ok(
  format('select app.post_message(%L, %L)', (select miolo_archived from conv), 'oi'),
  '55000', 'Esta conversa está arquivada.', 'conversa arquivada não recebe mensagem'
);

-- Outro workspace e conversa inexistente dão o mesmo erro (sem revelar existência)
select throws_ok(
  format('select app.post_message(%L, %L)', (select vitta_otto from conv), 'oi'),
  'P0002', 'Conversa não encontrada.', 'Marina não posta na conversa da Vitta'
);
select throws_ok(
  format('select app.post_message(%L, %L)', gen_random_uuid(), 'oi'),
  'P0002', 'Conversa não encontrada.', 'conversa inexistente: mesmo erro'
);

select pg_temp.act_as((select rafael from fx));
select is_empty(
  format('select 1 from public.messages where id = %L', (select id from posted)),
  'Rafael não lê a mensagem da Miolo'
);

select pg_temp.act_as((select pedro from fx));
select throws_ok(
  format('select app.post_message(%L, %L)', (select miolo_otto from conv), 'oi'),
  'P0002', 'Conversa não encontrada.', 'Pedro (sem membership) não posta na Miolo'
);

-- Viewer lê, mas não posta
reset role;
insert into public.memberships (workspace_id, user_id, role) select miolo, pedro, 'viewer' from fx;
select pg_temp.act_as((select pedro from fx));
select isnt_empty(
  format('select 1 from public.messages where id = %L', (select id from posted)),
  'Pedro como viewer da Miolo lê a mensagem'
);
select throws_ok(
  format('select app.post_message(%L, %L)', (select miolo_otto from conv), 'oi'),
  '42501', 'Seu papel não permite enviar mensagens.', 'viewer não posta'
);

reset role;
set local role anon;
select throws_ok(
  format('select app.post_message(%L, %L)', (select miolo_otto from conv), 'oi'),
  '42501', null, 'anon não executa post_message'
);

reset role;
select * from finish();
rollback;
