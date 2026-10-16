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
