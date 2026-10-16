-- S2a: conversa do ambiente (H1-04: uma por ambiente e workspace, agente do ambiente à frente) e calendário
-- editorial do Otto (calendar_posts: RLS forçada, isolamento, só leitura para o membro, rascunho → pauta na
-- aprovação, cancelado com o trabalho, post aberto na conversa pelo id).
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(30);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'rafael@vitta.example') as rafael,
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

-- ---------------------------------------------------------------------------------------------------
-- Calendário: dados montados pelo papel privilegiado (o worker escreve assim)
-- ---------------------------------------------------------------------------------------------------

with x as (
  insert into public.work_items (workspace_id, title, delivery_type, status, primary_agent_id, idempotency_key, created_by)
  values ((select miolo from fx), 'Calendário da semana 43', '04.02', 'draft', 'otto', 'pgtap:s2a:calendar', (select marina from fx))
  returning id
)
insert into ids select 'work', id from x;
with x as (
  insert into public.deliveries (workspace_id, work_item_id, kind)
  values ((select miolo from fx), (select id from ids where name = 'work'), 'editorial_calendar')
  returning id
)
insert into ids select 'delivery', id from x;
with x as (
  insert into public.delivery_versions (workspace_id, delivery_id, version_no, content, created_by_type, created_by_agent_id)
  values ((select miolo from fx), (select id from ids where name = 'delivery'), 1, '{}', 'agent', 'otto')
  returning id
)
insert into ids select 'v1', id from x;
with x as (
  insert into public.delivery_versions (workspace_id, delivery_id, version_no, content, created_by_type, created_by_agent_id)
  values ((select miolo from fx), (select id from ids where name = 'delivery'), 2, '{}', 'agent', 'otto')
  returning id
)
insert into ids select 'v2', id from x;
with x as (
  insert into public.calendar_posts (workspace_id, scheduled_on, channel, format, theme, status, work_item_id, delivery_version_id)
  values ((select miolo from fx), current_date, 'instagram', 'post', 'Fornada de segunda', 'planned',
          (select id from ids where name = 'work'), (select id from ids where name = 'v1'))
  returning id
)
insert into ids select 'post_v1', id from x;
with x as (
  insert into public.calendar_posts (workspace_id, scheduled_on, scheduled_time, channel, format, theme, owner_agent_id, work_item_id, delivery_version_id)
  values ((select miolo from fx), current_date + 2, '09:00', 'instagram', 'carousel', 'Bastidores da fermentação', 'kaia',
          (select id from ids where name = 'work'), (select id from ids where name = 'v2'))
  returning id
)
insert into ids select 'post_v2', id from x;
with x as (
  insert into public.calendar_posts (workspace_id, scheduled_on, channel, format, theme)
  values ((select vitta from fx), current_date, 'instagram', 'reels', 'Treino da manhã')
  returning id
)
insert into ids select 'post_vitta', id from x;

select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.calendar_posts'::regclass),
  'calendar_posts: RLS ligada e forçada'
);
select is(
  (select status::text from public.calendar_posts where id = (select id from ids where name = 'post_v2')),
  'draft',
  'post nasce rascunho (material produzido não é aprovado)'
);
select throws_ok(
  $$ insert into public.calendar_posts (workspace_id, scheduled_on, channel, format, theme)
     values ((select miolo from fx), current_date, 'Instagram!', 'post', 'x') $$,
  '23514', null, 'canal é um id (o web traduz)'
);
select throws_ok(
  $$ insert into public.calendar_posts (workspace_id, scheduled_on, channel, format, theme)
     values ((select miolo from fx), current_date, 'instagram', 'post', '  ') $$,
  '23514', null, 'tema não pode ser vazio'
);

-- ---------------------------------------------------------------------------------------------------
-- Leitura e isolamento
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
select is(
  (select count(*)::int from public.calendar_posts where workspace_id = (select miolo from fx)),
  2,
  'Marina vê o calendário da Miolo'
);
select is(
  (select count(*)::int from public.calendar_posts where id = (select id from ids where name = 'post_vitta')),
  0,
  'Marina não vê o calendário da Vitta'
);
select throws_ok(
  $$ insert into public.calendar_posts (workspace_id, scheduled_on, channel, format, theme)
     values ((select miolo from fx), current_date, 'instagram', 'post', 'Post da Marina') $$,
  '42501', null, 'membro não escreve no calendário direto (só o worker)'
);
select throws_ok(
  $$ update public.calendar_posts set theme = 'Outro' where id = (select id from ids where name = 'post_v1') $$,
  '42501', null, 'membro não altera post direto'
);
select throws_ok(
  $$ delete from public.calendar_posts where id = (select id from ids where name = 'post_v1') $$,
  '42501', null, 'membro não apaga post direto'
);

select pg_temp.act_as((select rafael from fx));
select is(
  (select count(*)::int from public.calendar_posts where workspace_id = (select miolo from fx)),
  0,
  'Rafael (Vitta) não vê nenhum post da Miolo'
);
select throws_ok(
  $$ select app.create_conversation((select miolo from fx), 'object', p_context_type => 'calendar_post',
       p_context_id => (select id from ids where name = 'post_v1')) $$,
  'P0002', null, 'Rafael não abre conversa sobre post da Miolo'
);
select throws_ok(
  $$ select app.create_conversation((select vitta from fx), 'object', p_context_type => 'calendar_post',
       p_context_id => (select id from ids where name = 'post_v1')) $$,
  'P0002', 'Objeto da conversa não encontrado.', 'post da Miolo não serve de objeto no workspace da Vitta'
);
reset role;

-- ---------------------------------------------------------------------------------------------------
-- Aprovação e cancelamento
-- ---------------------------------------------------------------------------------------------------

update public.delivery_versions set status = 'approved' where id = (select id from ids where name = 'v2');
select is(
  (select status::text from public.calendar_posts where id = (select id from ids where name = 'post_v2')),
  'planned',
  'versão aprovada: o rascunho entra na pauta'
);
select is(
  (select status::text from public.calendar_posts where id = (select id from ids where name = 'post_v1')),
  'cancelled',
  'o post de outra versão do mesmo calendário sai da pauta'
);
select is(
  (select status::text from public.calendar_posts where id = (select id from ids where name = 'post_vitta')),
  'draft',
  'aprovação na Miolo não toca no calendário da Vitta'
);

with x as (
  insert into public.calendar_posts (workspace_id, scheduled_on, channel, format, theme, work_item_id)
  values ((select miolo from fx), current_date + 3, 'whatsapp', 'status', 'Encomendas de sábado', (select id from ids where name = 'work'))
  returning id
)
insert into ids select 'post_draft', id from x;
update public.work_items set status = 'cancelled' where id = (select id from ids where name = 'work');
select is(
  (select status::text from public.calendar_posts where id = (select id from ids where name = 'post_draft')),
  'cancelled',
  'trabalho cancelado: a proposta sai do calendário'
);
select is(
  (select status::text from public.calendar_posts where id = (select id from ids where name = 'post_v2')),
  'planned',
  'o que já estava na pauta continua'
);

-- ---------------------------------------------------------------------------------------------------
-- Post do calendário como objeto da conversa
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
insert into ids select 'post_conversation', id
from app.create_conversation((select miolo from fx), 'object', p_context_type => 'calendar_post',
  p_context_id => (select id from ids where name = 'post_v2'));
select is(
  (select row(kind::text, context_type, primary_agent_id::text, context_key)::text from public.conversations
   where id = (select id from ids where name = 'post_conversation')),
  row('object', 'calendar_post', 'kaia', null)::text,
  'post do calendário abre pelo id, com o responsável à frente'
);
select is(
  (select id from app.create_conversation((select miolo from fx), 'object', p_context_type => 'calendar_post',
     p_context_id => (select id from ids where name = 'post_v2'))),
  (select id from ids where name = 'post_conversation'),
  'o mesmo post reabre a mesma conversa'
);
select isnt(
  (select id from app.create_conversation((select miolo from fx), 'object', p_context_type => 'calendar_post',
     p_context_key => 'post:sexta', p_context_meta => '{"title": "Dia Mundial do Pão"}')),
  null,
  'post que ainda não mora no banco continua abrindo pela chave'
);

-- ---------------------------------------------------------------------------------------------------
-- Conversa do ambiente (H1-04)
-- ---------------------------------------------------------------------------------------------------

insert into ids select 'env_bia', id
from app.create_conversation((select miolo from fx), 'object', p_context_type => 'environment',
  p_context_key => 'bia', p_context_meta => '{"title": "Estratégia"}');
select is(
  (select row(kind::text, context_type, context_key, primary_agent_id::text, title)::text from public.conversations
   where id = (select id from ids where name = 'env_bia')),
  row('object', 'environment', 'bia', 'bia', 'Estratégia')::text,
  'conversa do ambiente: chave = agente do ambiente, à frente, com o nome do ambiente'
);
select is(
  (select array_agg(coalesce(agent_id::text, 'pessoa') order by agent_id nulls first) from public.conversation_participants
   where conversation_id = (select id from ids where name = 'env_bia')),
  array['pessoa', 'bia'],
  'participam a pessoa e o agente do ambiente'
);
select is(
  (select id from app.create_conversation((select miolo from fx), 'object', p_context_type => 'environment',
     p_context_key => 'bia', p_context_meta => '{"title": "Estratégia"}')),
  (select id from ids where name = 'env_bia'),
  'uma por ambiente: abrir de novo reabre a mesma'
);
select isnt(
  (select id from app.create_conversation((select miolo from fx), 'object', p_context_type => 'environment',
     p_context_key => 'otto', p_context_meta => '{"title": "Conteúdo"}')),
  (select id from ids where name = 'env_bia'),
  'outro ambiente, outra conversa'
);
select isnt(
  (select id from app.create_conversation((select miolo from fx), 'agent_direct', 'bia')),
  (select id from ids where name = 'env_bia'),
  'a conversa direta com a Bia continua separada da do ambiente'
);
select throws_ok(
  $$ select app.create_conversation((select miolo from fx), 'object', p_context_type => 'environment',
       p_context_key => 'zeca', p_context_meta => '{"title": "Outro"}') $$,
  '22023', 'Ambiente fora do squad.', 'ambiente fora do squad é recusado'
);
select throws_ok(
  $$ select app.create_conversation((select miolo from fx), 'object', p_context_type => 'environment',
       p_context_key => 'bia') $$,
  '22023', 'Informe o título do objeto da conversa.', 'o ambiente precisa do nome'
);
select throws_ok(
  $$ select app.create_conversation((select miolo from fx), 'object', 'otto', p_context_type => 'environment',
       p_context_key => 'bia', p_context_meta => '{"title": "Estratégia"}') $$,
  '22023', 'Na conversa do ambiente, quem responde é o agente do ambiente.', 'outro agente à frente é recusado'
);

select pg_temp.act_as((select rafael from fx));
select isnt(
  (select id from app.create_conversation((select vitta from fx), 'object', p_context_type => 'environment',
     p_context_key => 'bia', p_context_meta => '{"title": "Estratégia"}')),
  (select id from ids where name = 'env_bia'),
  'cada workspace tem a sua conversa do ambiente'
);
select is(
  (select count(*)::int from public.conversations where id = (select id from ids where name = 'env_bia')),
  0,
  'Rafael não vê a conversa do ambiente da Miolo'
);

select * from finish();
rollback;
