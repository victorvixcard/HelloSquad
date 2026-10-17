-- SA3a: squad versionado no banco. RLS forçada; Data API sem acesso; o painel só lê com o JWT de um Super
-- Admin e só escreve pelas funções app.admin_squad_* (com audit_events); uma versão ativa e um rascunho por
-- unidade; versão publicada imutável e nada se apaga; publicar, descartar e voltar versão.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(37);

create temporary table fx as
select
  (select id from auth.users where email = 'marina@miolo.example') as marina,
  (select id from auth.users where email = 'vic@hellosquad.example') as vic,
  (select id from public.squad_versions where kind = 'skill' and agent_id = 'otto' and key = '04.01' and status = 'active') as skill_v1,
  (select id from public.squad_versions where kind = 'soul' and agent_id = 'otto' and status = 'active') as soul_v1,
  (select id from public.business_rule_docs where slug = 'diretrizes-do-dono') as rules_doc;
grant select on fx to public;
create temporary table w (name text primary key, id uuid);
grant all on w to public;

grant hellosquad_admin to postgres with inherit false, set true;
grant usage on schema extensions to hellosquad_admin;

create function pg_temp.claims(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
end;
$$;

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform pg_temp.claims(p_user);
  set local role authenticated;
end;
$$;

create function pg_temp.admin_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform pg_temp.claims(p_user);
  set local role hellosquad_admin;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Estrutura, permissões e seed (make squad-seed)
-- ---------------------------------------------------------------------------------------------------

select ok(
  (select bool_and(relrowsecurity and relforcerowsecurity) from pg_class
   where oid in ('public.squad_versions'::regclass, 'public.agent_prompt_sections'::regclass)),
  'RLS habilitada e forçada em squad_versions e agent_prompt_sections'
);
select is(
  (select count(*) from (values ('anon'), ('authenticated'), ('service_role')) r (role),
     (values ('public.squad_versions'), ('public.agent_prompt_sections')) t (name)
   where has_table_privilege(r.role, t.name, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),
  0::bigint,
  'Data API (anon, authenticated, service_role) sem privilégio nas tabelas do squad'
);
select is(
  (select count(*) from (values ('public.squad_versions'), ('public.agent_prompt_sections')) t (name)
   where has_table_privilege('hellosquad_admin', t.name, 'INSERT,UPDATE,DELETE,TRUNCATE')),
  0::bigint,
  'O papel do painel só lê as tabelas do squad (escrita só pelas funções)'
);
select is(
  (select count(*) from (values ('anon'), ('authenticated'), ('service_role')) r (role),
     (values ('app.admin_squad_save_draft(text, public.agent_id, text, text, jsonb, text)'),
             ('app.admin_squad_publish(uuid)'), ('app.admin_squad_discard(uuid)'),
             ('app.admin_squad_restore(uuid, text)'), ('app.admin_rule_doc_save(uuid, jsonb, boolean, text)')) f (sig)
   where has_function_privilege(r.role, f.sig, 'EXECUTE')),
  0::bigint,
  'Funções de escrita do squad fora do alcance da Data API'
);
select ok(
  has_function_privilege('hellosquad_admin', 'app.admin_squad_publish(uuid)', 'EXECUTE'),
  'O papel do painel publica pela função'
);
select is(
  (select array_agg(kind || ':' || n order by kind) from (
     select kind, count(*) as n from public.squad_versions where status = 'active' group by kind) s),
  array['config:7', 'shared:3', 'skill:19', 'soul:7'],
  'Seed do squad: 7 SOUL, 7 agent.yaml, 19 skills e 3 regras compartilhadas ativas'
);
select is(
  (select count(*) from public.agent_prompt_sections s join public.squad_versions v on v.id = s.version_id
   where v.status = 'active'),
  42::bigint,
  'Seis seções por SOUL ativa'
);

-- ---------------------------------------------------------------------------------------------------
-- Uma ativa e um rascunho por unidade; publicada imutável; nada se apaga
-- ---------------------------------------------------------------------------------------------------

select throws_ok(
  $$insert into public.squad_versions (kind, agent_id, key, version, status, body, author, published_at)
    values ('skill', 'otto', '04.01', 99, 'active', 'x', 'teste', now())$$,
  '23505', null, 'Segunda versão ativa da mesma unidade é recusada'
);
insert into public.squad_versions (kind, agent_id, key, version, status, body, author)
values ('skill', 'otto', '04.01', 98, 'draft', 'rascunho', 'teste');
select throws_ok(
  $$insert into public.squad_versions (kind, agent_id, key, version, status, body, author)
    values ('skill', 'otto', '04.01', 99, 'draft', 'outro', 'teste')$$,
  '23505', null, 'Segundo rascunho da mesma unidade é recusado'
);
select lives_ok(
  $$update public.squad_versions set body = 'rascunho editado' where kind = 'skill' and agent_id = 'otto'
      and key = '04.01' and status = 'draft'$$,
  'Rascunho é editável'
);
select throws_ok(
  format('update public.squad_versions set body = %L where id = %L', 'mudado', (select skill_v1 from fx)),
  '42501', null, 'Texto de versão publicada não muda'
);
select throws_ok(
  format('delete from public.squad_versions where id = %L', (select skill_v1 from fx)),
  '42501', null, 'Versão publicada não se apaga'
);
select throws_ok(
  format('update public.agent_prompt_sections set body = %L where version_id = %L and section = %L',
         'mudado', (select soul_v1 from fx), 'limites'),
  '42501', null, 'Seção da SOUL publicada não muda'
);
select throws_ok(
  format('delete from public.agent_prompt_sections where version_id = %L', (select soul_v1 from fx)),
  '42501', null, 'Seção da SOUL publicada não se apaga'
);
select throws_ok(
  format($$insert into public.agent_prompt_sections (version_id, agent_id, section, position, heading, body)
           values (%L, 'otto', 'limites', 4, 'Limites', 'x')$$, (select soul_v1 from fx)),
  '42501', null, 'Nenhuma seção entra numa SOUL publicada'
);
select throws_ok(
  $$insert into public.squad_versions (kind, agent_id, key, version, status, body, author)
    values ('shared', 'otto', 'README.md', 99, 'draft', 'x', 'teste')$$,
  '23514', null, 'Regra compartilhada não tem agente'
);
select is(
  (select app.squad_activate(id, null) from public.squad_versions
   where kind = 'skill' and agent_id = 'otto' and key = '04.01' and status = 'draft'),
  1,
  'Ativar o rascunho devolve a versão que estava ativa'
);
select is(
  (select array_agg(status order by version) from public.squad_versions
   where kind = 'skill' and agent_id = 'otto' and key = '04.01'),
  array['superseded', 'active'],
  'A anterior vira superseded; a nova é a única ativa'
);
select throws_ok(
  format('update public.squad_versions set status = %L where id = %L', 'active', (select skill_v1 from fx)),
  '42501', null, 'superseded não volta a ativa (voltar versão cria versão nova)'
);

-- ---------------------------------------------------------------------------------------------------
-- Quem lê e quem escreve
-- ---------------------------------------------------------------------------------------------------

select pg_temp.act_as((select marina from fx));
select throws_ok($$select count(*) from public.squad_versions$$, '42501', null, 'Marina não lê o squad pela Data API');
select throws_ok(
  format('select app.admin_squad_publish(%L)', (select soul_v1 from fx)), '42501', null,
  'Marina não executa a publicação'
);
reset role;

select pg_temp.act_as((select vic from fx));
select throws_ok(
  $$select count(*) from public.agent_prompt_sections$$, '42501', null,
  'Nem o Super Admin lê o squad pelo papel authenticated (Data API)'
);
reset role;

select pg_temp.admin_as((select marina from fx));
select is((select count(*) from public.squad_versions), 0::bigint, 'Papel do painel com o JWT da Marina lê 0 versões');
select throws_ok(
  $$select app.admin_squad_save_draft('skill', 'otto', '04.01', 'x', null, null)$$,
  '42501', 'Só Super Admin edita o squad.', 'Papel do painel com o JWT da Marina não grava rascunho'
);
reset role;

select pg_temp.admin_as((select vic from fx));
select ok((select count(*) from public.squad_versions) >= 36, 'Papel do painel com o JWT do Vic lê as versões');
select throws_ok(
  format('update public.squad_versions set note = %L where id = %L', 'x', (select soul_v1 from fx)),
  '42501', null, 'Nem o Vic escreve direto na tabela'
);

insert into w
select 'draft', app.admin_squad_save_draft(
  'soul', 'otto', 'SOUL.md', null,
  (select jsonb_agg(jsonb_build_object('section', section, 'position', position, 'heading', heading,
     'body', case when section = 'como_fala' then 'Frases curtas.' else body end, 'in_prompt', in_prompt))
   from public.agent_prompt_sections where version_id = (select soul_v1 from fx)),
  'Voz mais curta'
);
select is(
  (select version || ':' || status from public.squad_versions where id = (select id from w where name = 'draft')),
  '2:draft',
  'Editar a SOUL cria o rascunho da versão 2'
);
select is(
  (select body from public.agent_prompt_sections where version_id = (select id from w where name = 'draft')
     and section = 'como_fala'),
  'Frases curtas.',
  'O rascunho guarda a seção editada'
);
select throws_ok(
  $$select app.admin_squad_save_draft('soul', 'otto', 'SOUL.md', null, '[{"section": "limites"}]', null)$$,
  '22023', null, 'Rascunho da SOUL sem as seis seções é recusado'
);
select throws_ok(
  format('select app.admin_squad_restore(%L)', (select soul_v1 from fx)), '55000', null,
  'Voltar para a versão ativa é recusado'
);
select lives_ok(
  format('select app.admin_squad_publish(%L)', (select id from w where name = 'draft')),
  'O Vic publica o rascunho'
);
select throws_ok(
  format('select app.admin_squad_publish(%L)', (select id from w where name = 'draft')), '55000', null,
  'Versão publicada não se publica de novo'
);
insert into w select 'restored', app.admin_squad_restore((select soul_v1 from fx));
select is(
  (select v.version || ':' || v.status || ':' || (v.restored_from_id = (select soul_v1 from fx))
   from public.squad_versions v where v.id = (select id from w where name = 'restored')),
  '3:active:true',
  'Voltar versão cria a versão 3, ativa, com origem na 1'
);
select is(
  (select string_agg(s.body, '|' order by s.position) from public.agent_prompt_sections s
   where s.version_id = (select id from w where name = 'restored')),
  (select string_agg(s.body, '|' order by s.position) from public.agent_prompt_sections s
   where s.version_id = (select soul_v1 from fx)),
  'A versão 3 repete o texto da versão 1'
);
insert into w select 'discard', app.admin_squad_save_draft('shared', null, 'conversa.md', 'Texto novo.', null, null);
select app.admin_squad_discard((select id from w where name = 'discard'));
select is(
  (select status from public.squad_versions where id = (select id from w where name = 'discard')),
  'discarded',
  'Rascunho descartado fica no histórico como descartado'
);
select throws_ok(
  format('select app.admin_rule_doc_save(%L, %L, null, null)', (select rules_doc from fx),
         '[{"mark": "talvez", "text": "x"}]'),
  '22023', null, 'Parágrafo de regra sem marcação válida é recusado'
);
reset role;

select is(
  (select array_agg(a.action order by a.action) from public.audit_events a
   where a.actor_id = (select vic from fx)::text and a.action like 'squad.%'
     and a.created_at = now()),
  array['squad.draft_discarded', 'squad.draft_saved', 'squad.draft_saved', 'squad.version_published',
        'squad.version_restored'],
  'Cada gesto do Super Admin no squad vira audit_events com ele como autor'
);

select * from finish();
rollback;
