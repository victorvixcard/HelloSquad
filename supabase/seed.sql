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
          raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
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
    started_at, created_at, updated_at
  ) values (
    v_run, v_miolo, v_work_item, v_otto_chat, 'otto', 'interactive', 'waiting_approval',
    'work_item:' || v_work_item || ':start',
    '2026-10-15 10:14:05-03', '2026-10-15 10:14:00-03', '2026-10-15 10:16:00-03'
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
    and a.entity_type in ('brand_fact', 'memory_suggestion', 'memory_conflict');
  delete from public.run_context_items i using public.workspaces s where s.id = i.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');
  delete from public.memory_conflicts c using public.workspaces s where s.id = c.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');
  delete from public.memory_suggestions m using public.workspaces s where s.id = m.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');
  delete from public.brand_facts f using public.workspaces s where s.id = f.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');
  delete from public.fact_sources f using public.workspaces s where s.id = f.workspace_id and s.slug in ('miolo', 'vitta', 'trilha');

  insert into public.fact_sources (id, workspace_id, kind, name, state, permissions, last_sync_at, created_at, updated_at)
  values
    (v_onboarding, v_miolo, 'onboarding', 'Onboarding e o que você contou', 'declared', '{}', v_at, v_at, v_at),
    (v_instagram, v_miolo, 'connection', 'Instagram', 'not_connected',
     array['Ler posts e métricas', 'Publicar só com sua autorização'], null, v_at, v_at);

  insert into public.brand_facts (
    id, workspace_id, area, topic, key, content, state, source_type, source_id, origin, valid_from,
    confirmed_by, confirmed_at, created_by, created_at, updated_at
  ) values
    ('5eed0000-0000-4000-8000-000000000811', v_miolo, 'business', 'História', 'Negócio',
     'Padaria de fermentação natural, aberta em 2019', 'confirmed', 'onboarding', v_onboarding,
     'Contado por você no cadastro', v_at, v_marina, v_at, v_marina, v_at, v_at),
    ('5eed0000-0000-4000-8000-000000000812', v_miolo, 'audience', 'Perfil dos clientes', 'Público principal',
     'Moradores de Pinheiros e Vila Madalena, 28 a 45 anos', 'confirmed', 'onboarding', v_onboarding,
     'Contado por você no cadastro', v_at, v_marina, v_at, v_marina, v_at, v_at),
    ('5eed0000-0000-4000-8000-000000000813', v_miolo, 'brand', 'Tom de voz', 'Tom de voz',
     'Acolhedor, direto, sem gíria', 'confirmed', 'onboarding', v_onboarding,
     'Contado por você no cadastro', v_at, v_marina, v_at, v_marina, v_at, v_at),
    ('5eed0000-0000-4000-8000-000000000814', v_miolo, 'audience', 'Comportamentos conhecidos', 'Canais',
     'Instagram e WhatsApp', 'confirmed', 'onboarding', v_onboarding,
     'Contado por você no cadastro', v_at, v_marina, v_at, v_marina, v_at, v_at),
    ('5eed0000-0000-4000-8000-000000000815', v_miolo, 'business', 'Produtos', 'Produto âncora',
     'Pão de fermentação longa', 'confirmed', 'onboarding', v_onboarding,
     'Contado por você no cadastro', v_at, v_marina, v_at, v_marina, v_at, v_at),
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
