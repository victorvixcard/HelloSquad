-- Seed local do HelloSquad: tenants e usuários fictícios de docs/DADOS_FICTICIOS.md (nada real).
-- Idempotente: roda no `supabase db reset` e no `make seed` quantas vezes for preciso e sempre devolve
-- o mesmo estado. Um único bloco, então aplica tudo ou nada. Senha só local, a de DADOS_FICTICIOS.md.
--
-- Estado garantido:
--   miolo  → Marina owner
--   vitta  → Rafael owner, Carla editor
--   trilha → Juliana owner
--   Pedro  → autenticado e sem membership em lugar nenhum (testes negativos de RLS)

do $seed$
declare
  v_password constant text := 'Senha!Teste123';
  v_user record;
  v_user_id uuid;
  v_pedro_id uuid;
begin
  -- Usuário com senha conhecida nunca entra em banco com gente de verdade (DIRETRIZES_DO_DONO.md).
  if exists (select 1 from auth.users where email is not null and email not like '%.example') then
    raise exception 'Seed fictício recusado: este banco tem usuário com e-mail fora de .example.';
  end if;

  for v_user in
    select * from (values
      ('marina@miolo.example', 'Marina Costa'),
      ('rafael@vitta.example', 'Rafael Nunes'),
      ('carla@vitta.example', 'Carla Dias'),
      ('juliana@trilha.example', 'Juliana Prado'),
      ('pedro@semconta.example', 'Pedro Teste')
    ) as t (email, full_name)
  loop
    select id into v_user_id from auth.users where email = v_user.email;

    if v_user_id is null then
      v_user_id := gen_random_uuid();
      -- Os campos de token vazios ('' e não nulo) são exigidos pela Auth (GoTrue) no login.
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', v_user.email,
        extensions.crypt(v_password, extensions.gen_salt('bf', 10)), now(),
        '', '', '', '',
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('full_name', v_user.full_name),
        now(), now()
      );
    else
      update auth.users
      set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf', 10)),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          -- O idioma escolhido pela pessoa (A2a) volta ao padrão: nenhum teste herda o en de outro.
          raw_user_meta_data = (coalesce(raw_user_meta_data, '{}'::jsonb) - 'locale')
            || jsonb_build_object('full_name', v_user.full_name),
          banned_until = null,
          deleted_at = null,
          updated_at = now()
      where id = v_user_id
        and (
          encrypted_password is null
          or encrypted_password <> extensions.crypt(v_password, encrypted_password)
          or email_confirmed_at is null
          or raw_user_meta_data ->> 'full_name' is distinct from v_user.full_name
          or raw_user_meta_data ? 'locale'
          or banned_until is not null
          or deleted_at is not null
        );
    end if;

    insert into auth.identities (provider_id, user_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (
      v_user_id::text, v_user_id, 'email',
      jsonb_build_object('sub', v_user_id::text, 'email', v_user.email, 'email_verified', true, 'phone_verified', false),
      now(), now(), now()
    )
    on conflict (provider_id, provider) do nothing;
  end loop;

  insert into public.workspaces (slug, name, created_by)
  select s.slug, s.name, u.id
  from (values
    ('miolo', 'Miolo', 'marina@miolo.example'),
    ('vitta', 'Vitta Estética', 'rafael@vitta.example'),
    ('trilha', 'Trilha Urbana', 'juliana@trilha.example')
  ) as s (slug, name, owner_email)
  join auth.users u on u.email = s.owner_email
  on conflict (slug) do update
    set name = excluded.name, deleted_at = null
    where workspaces.name is distinct from excluded.name or workspaces.deleted_at is not null;

  create temporary table seed_memberships on commit drop as
  select w.id as workspace_id, u.id as user_id, s.role::public.workspace_role as role
  from (values
    ('miolo', 'marina@miolo.example', 'owner'),
    ('vitta', 'rafael@vitta.example', 'owner'),
    ('vitta', 'carla@vitta.example', 'editor'),
    ('trilha', 'juliana@trilha.example', 'owner')
  ) as s (slug, email, role)
  join public.workspaces w on w.slug = s.slug
  join auth.users u on u.email = s.email;

  insert into public.memberships (workspace_id, user_id, role)
  select workspace_id, user_id, role from seed_memberships
  on conflict (workspace_id, user_id) do update
    set role = excluded.role
    where memberships.role is distinct from excluded.role;

  -- Nos workspaces do seed, só ficam os memberships do seed.
  delete from public.memberships m
  using public.workspaces w
  where w.id = m.workspace_id
    and w.slug in ('miolo', 'vitta', 'trilha')
    and not exists (
      select 1 from seed_memberships s where s.workspace_id = m.workspace_id and s.user_id = m.user_id
    );

  -- Workspaces que só o Pedro integra são resíduo de teste manual: saem com a trilha de auditoria deles.
  select id into v_pedro_id from auth.users where email = 'pedro@semconta.example';
  delete from public.audit_events a
  using public.memberships m
  where m.user_id = v_pedro_id
    and a.workspace_id = m.workspace_id
    and not exists (
      select 1 from public.memberships o where o.workspace_id = m.workspace_id and o.user_id <> v_pedro_id
    );
  delete from public.workspaces w
  using public.memberships m
  where m.user_id = v_pedro_id
    and w.id = m.workspace_id
    and not exists (
      select 1 from public.memberships o where o.workspace_id = m.workspace_id and o.user_id <> v_pedro_id
    );
  delete from public.memberships where user_id = v_pedro_id;

  drop table seed_memberships;
end;
$seed$;

-- S1a — núcleo da Miolo (conversa → trabalho → entrega → revisão pendente). Ids e horários fixos, então
-- cada execução devolve exatamente as mesmas linhas. Vitta e Trilha ficam sem conversa, trabalho ou run
-- (estado vazio honesto). Textos fictícios, coerentes com a Memória da Marca de DADOS_FICTICIOS.md.
--
-- Estado garantido na Miolo:
--   Sala do Squad (Marina + 7 agentes) com 1 mensagem da Marina
--   Conversa direta com o Otto com 2 mensagens da Marina
--   Trabalho 04.01 em needs_you (Otto), run em waiting_approval, entrega com a versão 1 (rascunho) e
--   uma aprovação review pendente
--   Filas pgmq vazias

do $seed_nucleo$
declare
  v_miolo uuid := (select id from public.workspaces where slug = 'miolo');
  v_marina uuid := (select id from auth.users where email = 'marina@miolo.example');
  v_room constant uuid := '5eed0000-0000-4000-8000-000000000101';
  v_otto_chat constant uuid := '5eed0000-0000-4000-8000-000000000102';
  v_msg_room constant uuid := '5eed0000-0000-4000-8000-000000000201';
  v_msg_ask constant uuid := '5eed0000-0000-4000-8000-000000000202';
  v_msg_tone constant uuid := '5eed0000-0000-4000-8000-000000000203';
  v_work_item constant uuid := '5eed0000-0000-4000-8000-000000000301';
  v_run constant uuid := '5eed0000-0000-4000-8000-000000000401';
  v_delivery constant uuid := '5eed0000-0000-4000-8000-000000000501';
  v_version constant uuid := '5eed0000-0000-4000-8000-000000000502';
  v_approval constant uuid := '5eed0000-0000-4000-8000-000000000601';
  v_queue text;
begin
  if v_miolo is null or v_marina is null then
    raise exception 'Seed do núcleo depende da Miolo e da Marina (bloco anterior).';
  end if;

  -- Recomeça o núcleo dos três workspaces do seed (as cascatas levam mensagens, etapas, versões etc.).
  delete from public.audit_events a
  using public.workspaces w
  where w.id = a.workspace_id
    and w.slug in ('miolo', 'vitta', 'trilha')
    and a.entity_type in ('work_item', 'approval', 'run', 'conversation', 'message', 'delivery');
  -- S2a: o calendário editorial recomeça junto com o núcleo (o post sobreviveria ao trabalho apagado).
  delete from public.calendar_posts p using public.workspaces s where s.id = p.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');
  delete from public.work_items w using public.workspaces s where s.id = w.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');
  delete from public.runs r using public.workspaces s where s.id = r.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');
  delete from public.conversations c using public.workspaces s where s.id = c.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');
  delete from public.projects p using public.workspaces s where s.id = p.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');

  foreach v_queue in array array['runs_interactive', 'runs_scheduled', 'external_actions', 'memory_reflect'] loop
    perform pgmq.purge_queue(v_queue);
    execute format('delete from pgmq.%I', 'a_' || v_queue);
  end loop;

  -- S1c: versões de prompt sem run que as use (os runs do seed não têm versão) e o idioma padrão.
  delete from public.agent_prompt_versions v
  where not exists (select 1 from public.runs r where r.agent_id = v.agent_id and r.prompt_version = v.content_hash);
  update public.workspaces set locale = 'pt-BR' where slug in ('miolo', 'vitta', 'trilha') and locale <> 'pt-BR';

  insert into public.conversations (id, workspace_id, kind, primary_agent_id, title, created_by, last_message_at, created_at, updated_at)
  values
    (v_room, v_miolo, 'squad_room', 'nexo', 'Sala do Squad', v_marina,
     '2026-10-15 09:05:00-03', '2026-10-15 09:00:00-03', '2026-10-15 09:05:00-03'),
    (v_otto_chat, v_miolo, 'agent_direct', 'otto', 'Conversa com o Otto', v_marina,
     '2026-10-15 10:13:00-03', '2026-10-15 10:10:00-03', '2026-10-15 10:13:00-03');

  insert into public.conversation_participants (id, workspace_id, conversation_id, participant_type, user_id, agent_id, created_at, updated_at)
  select md5('seed:participant:' || p.conversation_id || ':' || p.who)::uuid, v_miolo, p.conversation_id, p.kind::public.principal_type,
         case when p.kind = 'user' then v_marina end, case when p.kind = 'agent' then p.who end,
         '2026-10-15 09:00:00-03', '2026-10-15 09:00:00-03'
  from (
    select v_room as conversation_id, 'user' as kind, 'marina' as who
    union all
    select v_room, 'agent', a from unnest(array['nexo', 'bia', 'kaia', 'otto', 'kiwi', 'max', 'iris']) as a
    union all
    select v_otto_chat, 'user', 'marina'
    union all
    select v_otto_chat, 'agent', 'otto'
  ) p;

  insert into public.messages (id, workspace_id, conversation_id, author_type, author_user_id, body, created_at, updated_at)
  values
    (v_msg_room, v_miolo, v_room, 'user', v_marina,
     'Bom dia, squad! Nesta semana o foco é o pão de fermentação longa.',
     '2026-10-15 09:05:00-03', '2026-10-15 09:05:00-03'),
    (v_msg_ask, v_miolo, v_otto_chat, 'user', v_marina,
     'Otto, preciso de uma legenda para o post de sábado sobre o pão de fermentação longa.',
     '2026-10-15 10:12:00-03', '2026-10-15 10:12:00-03'),
    (v_msg_tone, v_miolo, v_otto_chat, 'user', v_marina,
     'Tom acolhedor e direto, sem gíria. E sem a palavra "artesanal", combinado?',
     '2026-10-15 10:13:00-03', '2026-10-15 10:13:00-03');

  insert into public.work_items (
    id, workspace_id, conversation_id, origin_message_id, title, briefing, delivery_type, status,
    primary_agent_id, idempotency_key, created_by, created_at, updated_at
  ) values (
    v_work_item, v_miolo, v_otto_chat, v_msg_ask, 'Legenda do post de sábado: pão de fermentação longa',
    jsonb_build_object(
      'canal', 'instagram', 'objetivo', 'Levar clientes à loja no sábado de manhã',
      'tom', 'acolhedor, direto, sem gíria', 'restricoes', jsonb_build_array('não usar a palavra "artesanal"')
    ),
    '04.01', 'needs_you', 'otto', 'message:' || v_msg_ask || ':04.01', v_marina,
    '2026-10-15 10:14:00-03', '2026-10-15 10:16:00-03'
  );

  insert into public.runs (
    id, workspace_id, work_item_id, conversation_id, agent_id, kind, status, idempotency_key,
    started_at, credits_charged, created_at, updated_at
  ) values (
    v_run, v_miolo, v_work_item, v_otto_chat, 'otto', 'interactive', 'waiting_approval',
    'work_item:' || v_work_item || ':start',
    '2026-10-15 10:14:05-03', 10, '2026-10-15 10:14:00-03', '2026-10-15 10:16:00-03'
  );

  insert into public.deliveries (id, workspace_id, work_item_id, kind, created_at, updated_at)
  values (v_delivery, v_miolo, v_work_item, 'caption', '2026-10-15 10:16:00-03', '2026-10-15 10:16:00-03');

  insert into public.delivery_versions (
    id, workspace_id, delivery_id, version_no, content, created_by_type, created_by_agent_id, run_id,
    change_note, status, created_at, updated_at
  ) values (
    v_version, v_miolo, v_delivery, 1,
    jsonb_build_object(
      'canal', 'instagram',
      'legenda', 'Sábado tem pão de fermentação longa saindo do forno. São 36 horas de calma até a casca '
        || 'ficar crocante e o miolo, macio. Passe na Miolo, em Pinheiros, a partir das 8h, e leve o seu '
        || 'ainda morno.',
      'hashtags', jsonb_build_array('#fermentacaonatural', '#pinheiros', '#paodesabado')
    ),
    'agent', 'otto', v_run, 'Primeira versão.', 'draft', '2026-10-15 10:16:00-03', '2026-10-15 10:16:00-03'
  );

  update public.deliveries set current_version_id = v_version where id = v_delivery;

  insert into public.approvals (
    id, workspace_id, work_item_id, delivery_version_id, run_id, kind, requested_by_agent_id, status,
    created_at, updated_at
  ) values (
    v_approval, v_miolo, v_work_item, v_version, v_run, 'review', 'otto', 'pending',
    '2026-10-15 10:16:00-03', '2026-10-15 10:16:00-03'
  );

  insert into public.audit_events (id, workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload, created_at)
  values
    ('5eed0000-0000-4000-8000-000000000701', v_miolo, 'user', v_marina::text, 'work_item.created', 'work_item', v_work_item::text,
     jsonb_build_object('delivery_type', '04.01', 'origin_message_id', v_msg_ask, 'run_id', v_run, 'primary_agent_id', 'otto'),
     '2026-10-15 10:14:00-03'),
    ('5eed0000-0000-4000-8000-000000000702', v_miolo, 'agent', 'otto', 'work_item.status_changed', 'work_item', v_work_item::text,
     jsonb_build_object('from', 'draft', 'to', 'in_progress'), '2026-10-15 10:14:05-03'),
    ('5eed0000-0000-4000-8000-000000000703', v_miolo, 'agent', 'otto', 'work_item.status_changed', 'work_item', v_work_item::text,
     jsonb_build_object('from', 'in_progress', 'to', 'needs_you'), '2026-10-15 10:16:00-03');
end;
$seed_nucleo$;

-- S1d — Memória da Marca da Miolo (DADOS_FICTICIOS.md e FLUXOS_DA_V46.md §6, §8 e §9). Ids e horários fixos.
-- Vitta e Trilha ficam sem memória (estado vazio honesto).
--
-- Estado garantido na Miolo:
--   Fontes: "Onboarding e o que você contou" (Declarado por você, 01/10) e Instagram (Não conectada)
--   5 conhecimentos "Confirmado" do cadastro, 1 "Decisão sua" (não usar a palavra 'artesanal')
--   1 sugestão aberta "Otto percebeu" (bastidores do forno)

do $seed_memoria$
declare
  v_miolo uuid := (select id from public.workspaces where slug = 'miolo');
  v_marina uuid := (select id from auth.users where email = 'marina@miolo.example');
  v_onboarding constant uuid := '5eed0000-0000-4000-8000-000000000801';
  v_instagram constant uuid := '5eed0000-0000-4000-8000-000000000802';
  v_at constant timestamptz := '2026-10-01 10:00:00-03';
begin
  if v_miolo is null or v_marina is null then
    raise exception 'Seed da memória depende da Miolo e da Marina (primeiro bloco).';
  end if;

  delete from public.audit_events a
  using public.workspaces w
  where w.id = a.workspace_id
    and w.slug in ('miolo', 'vitta', 'trilha')
    and a.entity_type in ('brand_fact', 'memory_suggestion', 'memory_conflict', 'brand_profile');
  delete from public.brand_profiles p using public.workspaces s where s.id = p.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');
  delete from public.run_context_items i using public.workspaces s where s.id = i.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');
  delete from public.memory_conflicts c using public.workspaces s where s.id = c.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');
  delete from public.memory_suggestions m using public.workspaces s where s.id = m.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');
  delete from public.brand_facts f using public.workspaces s where s.id = f.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');
  delete from public.fact_sources f using public.workspaces s where s.id = f.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');

  -- Dossiê (S1f): descrição do negócio de DADOS_FICTICIOS.md; a síntese do squad fica para o agente.
  insert into public.brand_profiles (workspace_id, description, updated_by, created_at, updated_at)
  values (v_miolo, 'Padaria de fermentação natural em Pinheiros, São Paulo.', v_marina, v_at, v_at);

  insert into public.fact_sources (id, workspace_id, kind, name, state, permissions, last_sync_at, created_at, updated_at)
  values
    (v_onboarding, v_miolo, 'onboarding', 'Onboarding e o que você contou', 'declared', '{}', v_at, v_at, v_at),
    (v_instagram, v_miolo, 'connection', 'Instagram', 'not_connected',
     array['Ler posts e métricas', 'Publicar só com sua autorização'], null,
     v_at + interval '5 minutes', v_at + interval '5 minutes');

  insert into public.brand_facts (
    id, workspace_id, area, topic, key, content, state, source_type, source_id, origin, valid_from,
    confirmed_by, confirmed_at, created_by, created_at, updated_at
  ) values
    ('5eed0000-0000-4000-8000-000000000811', v_miolo, 'business', 'História', 'Negócio',
     'Padaria de fermentação natural, aberta em 2019', 'confirmed', 'onboarding', v_onboarding,
     'Contado por você no cadastro', v_at, v_marina, v_at, v_marina, v_at, v_at),
    ('5eed0000-0000-4000-8000-000000000812', v_miolo, 'audience', 'Perfil dos clientes', 'Público principal',
     'Moradores de Pinheiros e Vila Madalena, 28 a 45 anos', 'confirmed', 'onboarding', v_onboarding,
     'Contado por você no cadastro', v_at, v_marina, v_at, v_marina, v_at + interval '3 minutes', v_at + interval '3 minutes'),
    ('5eed0000-0000-4000-8000-000000000813', v_miolo, 'brand', 'Tom de voz', 'Tom de voz',
     'Acolhedor, direto, sem gíria', 'confirmed', 'onboarding', v_onboarding,
     'Contado por você no cadastro', v_at, v_marina, v_at, v_marina, v_at + interval '2 minutes', v_at + interval '2 minutes'),
    ('5eed0000-0000-4000-8000-000000000814', v_miolo, 'audience', 'Comportamentos conhecidos', 'Canais',
     'Instagram e WhatsApp', 'confirmed', 'onboarding', v_onboarding,
     'Contado por você no cadastro', v_at, v_marina, v_at, v_marina, v_at + interval '4 minutes', v_at + interval '4 minutes'),
    ('5eed0000-0000-4000-8000-000000000815', v_miolo, 'business', 'Produtos', 'Produto âncora',
     'Pão de fermentação longa', 'confirmed', 'onboarding', v_onboarding,
     'Contado por você no cadastro', v_at, v_marina, v_at, v_marina, v_at + interval '1 minutes', v_at + interval '1 minutes'),
    ('5eed0000-0000-4000-8000-000000000816', v_miolo, 'brand', 'Tom de voz', 'Palavra proibida',
     'Não usar a palavra ''artesanal'' nas legendas', 'decision', 'conversation', null,
     'Dito por você numa conversa', '2026-10-15 10:13:00-03', v_marina, '2026-10-15 10:13:00-03', v_marina,
     '2026-10-15 10:13:00-03', '2026-10-15 10:13:00-03');

  insert into public.memory_suggestions (
    id, workspace_id, agent_id, title, area, topic, key, content, used_by_agents, created_at, updated_at
  ) values (
    '5eed0000-0000-4000-8000-000000000821', v_miolo, 'otto', 'Posts com bastidores do forno têm mais salvamentos',
    'knowledge', 'Descobertas', 'Bastidores', 'Posts com bastidores do forno têm mais salvamentos',
    array['otto', 'kaia'], '2026-10-15 11:00:00-03', '2026-10-15 11:00:00-03'
  );
end;
$seed_memoria$;

-- S1e — créditos, com valores provisórios (dono, 16/10: "preço e créditos ficam por último"; nada de preço em
-- dinheiro). Preços: as 46 deliveries do catálogo (Documento Mestre, Anexo A) com a profundidade inferida no
-- protótipo SA0 (pergunta 6 do SA0, aberta): 04.01 = 10 créditos (produzir), 01.01 = 0 (incluído), as demais
-- = 10 (valor padrão provisório); todas provisional e sem aprovação comercial. Preço é versionado: linha fixa,
-- nunca alterada. A conta de crédito de cada workspace do seed recomeça (o extrato só sai junto com a conta)
-- e volta com ids fixos. O ciclo da Miolo acompanha o mês corrente, para o seed não vencer.
--
-- Estado garantido:
--   Miolo: plano Squad (fictício, provisório), ciclo do mês com 100 créditos e 64 usados (54 de consumo
--     anterior fictício, para a barra da V4.6 em 64%, e 10 da legenda do seed, cobrados pelo run dela);
--     saldo 36, nada reservado
--   Vitta: Free, 20 créditos iniciais, nada usado
--   Trilha: Free, 20 créditos iniciais, 0,8 usado (4%, o primeiro acesso da V4.6)

do $seed_creditos$
declare
  v_miolo uuid := (select id from public.workspaces where slug = 'miolo');
  v_vitta uuid := (select id from public.workspaces where slug = 'vitta');
  v_trilha uuid := (select id from public.workspaces where slug = 'trilha');
  v_run constant uuid := '5eed0000-0000-4000-8000-000000000401';
  v_free uuid := (app.current_plan_version('free')).id;
  v_squad uuid;
  v_account_miolo constant uuid := '5eed0000-0000-4000-8000-000000000911';
  v_account_vitta constant uuid := '5eed0000-0000-4000-8000-000000000912';
  v_account_trilha constant uuid := '5eed0000-0000-4000-8000-000000000913';
  v_grant_miolo constant uuid := '5eed0000-0000-4000-8000-000000000921';
  v_grant_vitta constant uuid := '5eed0000-0000-4000-8000-000000000922';
  v_grant_trilha constant uuid := '5eed0000-0000-4000-8000-000000000923';
  v_hold constant uuid := '5eed0000-0000-4000-8000-000000000931';
  v_free_start constant timestamptz := '2026-10-01 00:00:00-03';
  v_cycle_start timestamptz := date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_held_at timestamptz;
  v_charged_at timestamptz;
begin
  if v_miolo is null or v_vitta is null or v_trilha is null then
    raise exception 'Seed dos créditos depende da Miolo, da Vitta e da Trilha (primeiro bloco).';
  end if;
  if v_free is null then
    raise exception 'Seed dos créditos depende do plano Free da migration 20261016133000_credits.sql.';
  end if;
  v_held_at := greatest('2026-10-15 10:14:05-03'::timestamptz, least(v_cycle_start + interval '2 minutes', now()));
  v_charged_at := greatest('2026-10-15 10:16:00-03'::timestamptz, least(v_cycle_start + interval '3 minutes', now()));

  insert into public.delivery_prices (id, delivery_type, depth, credits, valid_from, provisional, approved_commercially, created_at)
  select md5('seed:price:' || c.delivery_type)::uuid, c.delivery_type, c.depth::public.delivery_depth,
         case c.delivery_type when '01.01' then 0 else 10 end,
         v_free_start, true, false, v_free_start
  from (values
    ('01.01', 'orientar'), ('01.02', 'produzir'), ('01.03', 'orientar'), ('01.04', 'otimizar'),
    ('02.01', 'orientar'), ('02.02', 'orientar'), ('02.03', 'produzir'), ('02.04', 'produzir'),
    ('02.05', 'orientar'), ('02.06', 'orientar'), ('02.07', 'orientar'),
    ('03.01', 'produzir'), ('03.02', 'produzir'), ('03.03', 'produzir'), ('03.04', 'produzir'),
    ('03.05', 'produzir'), ('03.06', 'produzir'), ('03.07', 'produzir'),
    ('04.01', 'produzir'), ('04.02', 'produzir'), ('04.03', 'produzir'), ('04.04', 'executar'),
    ('04.05', 'executar'), ('04.06', 'produzir'), ('04.07', 'produzir'),
    ('05.01', 'orientar'), ('05.02', 'produzir'), ('05.03', 'orientar'), ('05.04', 'orientar'),
    ('05.05', 'otimizar'), ('05.06', 'executar'), ('05.07', 'orientar'), ('05.08', 'otimizar'),
    ('05.09', 'otimizar'),
    ('06.01', 'orientar'), ('06.02', 'produzir'), ('06.03', 'produzir'), ('06.04', 'produzir'),
    ('06.05', 'produzir'), ('06.06', 'executar'),
    ('07.01', 'orientar'), ('07.02', 'orientar'), ('07.03', 'produzir'), ('07.04', 'orientar'),
    ('07.05', 'produzir'), ('07.06', 'otimizar')
  ) as c (delivery_type, depth)
  on conflict (id) do nothing;

  insert into public.plans (id, slug, name, created_at)
  values ('5eed0000-0000-4000-8000-000000000901', 'squad', 'Squad', v_free_start)
  on conflict (slug) do nothing;
  insert into public.plan_versions (
    id, plan_id, version, credits, cycle, validity_days, valid_from, provisional, approved_commercially, created_at
  )
  select '5eed0000-0000-4000-8000-000000000902', p.id, 1, 100, 'monthly', null, v_free_start, true, false, v_free_start
  from public.plans p where p.slug = 'squad'
  on conflict (plan_id, version) do nothing;
  v_squad := (
    select v.id from public.plan_versions v join public.plans p on p.id = v.plan_id
    where p.slug = 'squad' and v.version = 1
  );

  delete from public.credit_accounts a using public.workspaces s
  where s.id = a.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');

  insert into public.credit_accounts (id, workspace_id, plan_version_id, created_at, updated_at) values
    (v_account_miolo, v_miolo, v_squad, v_free_start, v_free_start),
    (v_account_vitta, v_vitta, v_free, v_free_start, v_free_start),
    (v_account_trilha, v_trilha, v_free, v_free_start, v_free_start);

  insert into public.credit_grants (
    id, workspace_id, account_id, origin, plan_version_id, amount, remaining, reserved, starts_at, expires_at,
    created_at, updated_at
  ) values
    (v_grant_miolo, v_miolo, v_account_miolo, 'plan_cycle', v_squad, 100, 36, 0,
     v_cycle_start, v_cycle_start + interval '1 month', v_cycle_start, v_charged_at),
    (v_grant_vitta, v_vitta, v_account_vitta, 'plan_cycle', v_free, 20, 20, 0,
     v_free_start, null, v_free_start, v_free_start),
    (v_grant_trilha, v_trilha, v_account_trilha, 'plan_cycle', v_free, 20, 19.2, 0,
     v_free_start, null, v_free_start, v_free_start);

  insert into public.credit_holds (
    id, workspace_id, account_id, run_id, idempotency_key, delivery_type, price_id, estimate, captured, state,
    settled_at, created_at, updated_at
  ) values (
    v_hold, v_miolo, v_account_miolo, v_run, 'run:' || v_run, '04.01', md5('seed:price:04.01')::uuid, 10, 10,
    'captured', v_charged_at, v_held_at, v_charged_at
  );

  insert into public.credit_ledger (
    id, workspace_id, account_id, entry_type, grant_id, hold_id, run_id, amount, reserved_delta,
    idempotency_key, note, metadata, created_at
  ) values
    ('5eed0000-0000-4000-8000-000000000941', v_miolo, v_account_miolo, 'grant', v_grant_miolo, null, null,
     100, 0, 'seed:miolo:plan_cycle', null, '{}', v_cycle_start),
    ('5eed0000-0000-4000-8000-000000000942', v_miolo, v_account_miolo, 'adjustment', v_grant_miolo, null, null,
     -54, 0, 'seed:miolo:consumo_anterior',
     'Consumo anterior do ciclo (fictício): a conta em uso da V4.6 mostra 64% dos créditos do mês.', '{}',
     least(v_cycle_start + interval '1 minute', now())),
    ('5eed0000-0000-4000-8000-000000000943', v_miolo, v_account_miolo, 'hold', v_grant_miolo, v_hold, v_run,
     0, 10, 'run:' || v_run || ':hold:' || v_grant_miolo, null,
     jsonb_build_object('delivery_type', '04.01', 'work_item_id', '5eed0000-0000-4000-8000-000000000301'),
     v_held_at),
    ('5eed0000-0000-4000-8000-000000000944', v_miolo, v_account_miolo, 'capture', v_grant_miolo, v_hold, v_run,
     -10, -10, 'run:' || v_run || ':capture:' || v_grant_miolo, null,
     jsonb_build_object('delivery_type', '04.01'), v_charged_at),
    ('5eed0000-0000-4000-8000-000000000951', v_vitta, v_account_vitta, 'grant', v_grant_vitta, null, null,
     20, 0, 'seed:vitta:free', null, '{}', v_free_start),
    ('5eed0000-0000-4000-8000-000000000961', v_trilha, v_account_trilha, 'grant', v_grant_trilha, null, null,
     20, 0, 'seed:trilha:free', null, '{}', v_free_start),
    ('5eed0000-0000-4000-8000-000000000962', v_trilha, v_account_trilha, 'adjustment', v_grant_trilha, null, null,
     -0.8, 0, 'seed:trilha:primeiro_acesso',
     'Uso fictício do primeiro acesso: a V4.6 mostra 4% dos créditos do mês.', '{}',
     v_free_start + interval '5 minutes');
end;
$seed_creditos$;

-- S2b — base de clientes do Max e métricas da Íris (DADOS_FICTICIOS.md, "Contatos fictícios" e "Métricas
-- fictícias"). Ids fixos nos contatos; datas relativas ao dia do seed, para a base e a série estarem sempre
-- atuais.
--
-- Estado garantido:
--   Miolo: 20 contatos (cliente01…cliente20@contatos.example, +55 11 99999-0001…0020), origem "importação CSV de
--     teste"; consentimento de e-mail nos 10 primeiros (WhatsApp em 6 deles) e nenhum nos outros 10. Última
--     compra e número de compras fictícios, para a segmentação (ativos, esfriando, inativos, sem compra).
--   Miolo e Vitta: 90 dias de métricas até ontem (sessões no site, seguidores e alcance no Instagram, pedidos),
--     origem `fonte_de_teste`, unidade declarada, valores de função determinística (semente fixa); a Miolo tem
--     um buraco de 3 dias nas sessões (dado ausente). Trilha sem contatos nem métricas (primeiro acesso,
--     estado vazio honesto).
do $seed_s2b$
declare
  v_miolo uuid := (select id from public.workspaces where slug = 'miolo');
begin
  delete from public.contacts c using public.workspaces s where s.id = c.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');
  delete from public.contact_imports i using public.workspaces s where s.id = i.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');
  delete from public.metrics_daily m using public.workspaces s where s.id = m.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');

  insert into public.contacts (id, workspace_id, full_name, email, phone, source, last_purchase_on, purchases_count)
  select ('5eed0000-0000-4000-8000-0000000010' || lpad(c.n::text, 2, '0'))::uuid, v_miolo, c.name,
         'cliente' || lpad(c.n::text, 2, '0') || '@contatos.example',
         '+55119999900' || lpad(c.n::text, 2, '0'),
         'importação CSV de teste',
         case when c.days_ago is not null then current_date - c.days_ago end, c.purchases
  from (values
    (1, 'Ana Souza', 5, 12), (2, 'Bruno Lima', 12, 4), (3, 'Camila Rocha', 25, 2), (4, 'Diego Alves', 40, 6),
    (5, 'Elisa Martins', 55, 1), (6, 'Fábio Ribeiro', 75, 3), (7, 'Gabriela Castro', 100, 5),
    (8, 'Henrique Duarte', 130, 2), (9, 'Isabela Moreira', 160, 1), (10, 'João Ferreira', null, 0),
    (11, 'Larissa Gomes', 8, 7), (12, 'Marcos Pereira', 20, 1), (13, 'Natália Barbosa', 35, 2),
    (14, 'Otávio Mendes', 60, 4), (15, 'Paula Carvalho', 95, 1), (16, 'Renato Araújo', 120, 3),
    (17, 'Sofia Teixeira', 200, 1), (18, 'Tiago Monteiro', null, 0), (19, 'Vanessa Freitas', 15, 3),
    (20, 'Wagner Lopes', 110, 2)
  ) as c (n, name, days_ago, purchases);

  insert into public.consents (workspace_id, contact_id, channel, status, legal_basis, source, given_at, recorded_at)
  select v_miolo, ('5eed0000-0000-4000-8000-0000000010' || lpad(c.n::text, 2, '0'))::uuid, c.channel::public.consent_channel,
         'granted', 'consent', 'importação CSV de teste', date '2026-09-01' + c.n, timestamptz '2026-10-01 12:00-03'
  from (
    select n, 'email' as channel from generate_series(1, 10) as n
    union all
    select n, 'whatsapp' from unnest(array[1, 2, 4, 6, 7, 9]) as n
  ) as c;

  insert into public.metrics_daily (workspace_id, channel, metric, day, value, unit, source, collected_at)
  select w.id, p.channel, p.metric, current_date - g.n,
         case when p.kind = 'stock' then
           p.base + p.step_old * least(90 - g.n, 60) + p.step_new * greatest(30 - g.n, 0)
           + (('x' || substr(md5(p.slug || p.metric || g.n), 1, 8))::bit(32)::int % 3)
         else
           round(p.base * case when g.n <= 30 then p.recent else 1 end
                 * case g.n % 7 when 0 then 1.2 when 1 then 1.05 when 4 then 0.9 else 1 end
                 * (1 + 0.08 * ((('x' || substr(md5(p.slug || p.metric || g.n), 1, 8))::bit(32)::int % 1000) / 1000.0)))
         end,
         p.unit, 'fonte_de_teste', (current_date - g.n + 1)::timestamptz + interval '6 hours'
  from (values
    ('miolo', 'site', 'sessions', 'sessões', 'flow', 140, 0.87, 0, 0),
    ('miolo', 'instagram', 'followers', 'seguidores', 'stock', 3850, 1, 3, 4),
    ('miolo', 'instagram', 'reach', 'pessoas alcançadas', 'flow', 900, 1.18, 0, 0),
    ('miolo', 'store', 'orders', 'pedidos', 'flow', 38, 0.96, 0, 0),
    ('vitta', 'site', 'sessions', 'sessões', 'flow', 85, 1.06, 0, 0),
    ('vitta', 'instagram', 'followers', 'seguidores', 'stock', 5200, 1, 5, 2),
    ('vitta', 'instagram', 'reach', 'pessoas alcançadas', 'flow', 1300, 0.9, 0, 0),
    ('vitta', 'store', 'orders', 'pedidos', 'flow', 9, 1.03, 0, 0)
  ) as p (slug, channel, metric, unit, kind, base, recent, step_old, step_new)
  join public.workspaces w on w.slug = p.slug
  cross join generate_series(1, 90) as g (n)
  where not (p.slug = 'miolo' and p.metric = 'sessions' and g.n between 43 and 45);
end;
$seed_s2b$;
