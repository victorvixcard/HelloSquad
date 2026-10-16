-- S2g (H2-17): o consentimento pode ser revogado, sem apagar nada (public.consents segue somente inserção: revogar é
-- uma linha nova `revoked`, como a S2b previu).
-- 1. Rota da API (app.revoke_consent): owner ou admin acha o contato pelo e-mail ou telefone e revoga um canal ou
--    todos; evento de auditoria `contacts.consent_revoked` com os canais e a origem, sem dado pessoal.
-- 2. Reimportação: linha de um contato que já está na base, sem nenhum "sim" e com "não" explícito num canal, revoga
--    o consentimento vigente desse canal em vez de ser recusada (`no_consent`); conta em `revoked_rows`. Contato que
--    não está na base continua recusado sem consentimento; linha que não muda nada (já revogado) é duplicata.

alter table public.contact_imports
  add column revoked_rows integer not null default 0,
  drop constraint contact_imports_counts,
  add constraint contact_imports_counts check (
    total_rows >= 0 and accepted_rows >= 0 and refused_rows >= 0 and revoked_rows >= 0
    and accepted_rows + refused_rows + revoked_rows = total_rows
  );
comment on column public.contact_imports.revoked_rows is
  'Linhas de contatos já na base que revogaram consentimento ("não" explícito, sem nenhum "sim").';

-- Contato do workspace pelo e-mail (primeiro) ou pelo telefone.
create function app.find_contact(p_workspace_id uuid, p_email text, p_phone text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.contacts c
  where c.workspace_id = p_workspace_id
    and (c.email = lower(nullif(btrim(p_email), '')) or c.phone = nullif(btrim(p_phone), ''))
  order by (c.email = lower(nullif(btrim(p_email), ''))) is true desc, c.created_at, c.id
  limit 1;
$$;

-- Revoga os canais pedidos que estão com consentimento vigente; devolve os canais revogados.
create function app.revoke_contact_consents(
  p_workspace_id uuid,
  p_contact_id uuid,
  p_channels public.consent_channel[],
  p_source text,
  p_revoked_on date,
  p_import_id uuid,
  p_user_id uuid
)
returns public.consent_channel[]
language sql
volatile
security definer
set search_path = ''
as $$
  with granted as (
    select s.channel
    from public.contact_consent_state s
    where s.workspace_id = p_workspace_id
      and s.contact_id = p_contact_id
      and s.channel = any (p_channels)
      and s.status = 'granted'
  ), inserted as (
    insert into public.consents (
      workspace_id, contact_id, channel, status, legal_basis, source, given_at, import_id, recorded_by
    )
    select p_workspace_id, p_contact_id, g.channel, 'revoked', 'consent', p_source, p_revoked_on, p_import_id,
           p_user_id
    from granted g
    returning channel
  )
  select coalesce(array_agg(i.channel order by i.channel), '{}'::public.consent_channel[]) from inserted i;
$$;

create function app.revoke_consent(
  p_workspace_id uuid,
  p_email text,
  p_phone text,
  p_channel public.consent_channel,
  p_source text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_source text := nullif(btrim(p_source), '');
  v_contact_id uuid;
  v_channels public.consent_channel[];
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  if p_workspace_id is null or p_workspace_id not in (select app.current_user_workspace_ids()) then
    raise exception using errcode = 'no_data_found', message = 'Workspace não encontrado.';
  end if;
  if not app.has_role(p_workspace_id, 'admin') then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono ou um admin revoga consentimento.';
  end if;
  if v_source is null or char_length(v_source) > 120 then
    raise exception using errcode = 'invalid_parameter_value', message = 'Informe a origem da revogação (até 120 caracteres).';
  end if;
  if nullif(btrim(p_email), '') is null and nullif(btrim(p_phone), '') is null then
    raise exception using errcode = 'invalid_parameter_value', message = 'Informe o e-mail ou o telefone do contato.';
  end if;
  v_contact_id := app.find_contact(p_workspace_id, p_email, p_phone);
  if v_contact_id is null then
    raise exception using errcode = 'no_data_found', message = 'Contato não encontrado.';
  end if;
  v_channels := app.revoke_contact_consents(
    p_workspace_id, v_contact_id,
    case when p_channel is null then enum_range(null::public.consent_channel) else array[p_channel] end,
    v_source, current_date, null, v_user_id
  );
  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    p_workspace_id, 'user', v_user_id::text, 'contacts.consent_revoked', 'contact', v_contact_id::text,
    jsonb_build_object('requested', coalesce(p_channel::text, 'all'), 'revoked', to_jsonb(v_channels), 'source', v_source)
  );
  return jsonb_build_object(
    'contact_id', v_contact_id,
    'revoked', to_jsonb(v_channels),
    'consents', (
      select coalesce(
        jsonb_agg(jsonb_build_object('channel', s.channel, 'status', s.status, 'given_at', s.given_at) order by s.channel),
        '[]'::jsonb
      )
      from public.contact_consent_state s
      where s.workspace_id = p_workspace_id and s.contact_id = v_contact_id
    )
  );
end;
$$;

-- Importação: além do que a S2b fazia, a linha de revogação ({"line", "email", "phone", "revoke": ["email"],
-- "revoked_on": "AAAA-MM-DD"}, sem "consents").
create or replace function app.import_contacts(
  p_workspace_id uuid,
  p_file_name text,
  p_source text,
  p_total_rows integer,
  p_rows jsonb,
  p_refused jsonb default '[]'::jsonb
)
returns public.contact_imports
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_source text := nullif(btrim(p_source), '');
  v_import public.contact_imports;
  v_row jsonb;
  v_consent jsonb;
  v_contact_id uuid;
  v_refused jsonb := coalesce(p_refused, '[]'::jsonb);
  v_accepted integer := 0;
  v_channel public.consent_channel;
  v_given date;
  v_revoked integer := 0;
  v_channels public.consent_channel[];
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  if p_workspace_id is null or p_workspace_id not in (select app.current_user_workspace_ids()) then
    raise exception using errcode = 'no_data_found', message = 'Workspace não encontrado.';
  end if;
  if not app.has_role(p_workspace_id, 'admin') then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono ou um admin importa contatos.';
  end if;
  if v_source is null or char_length(v_source) > 120 then
    raise exception using errcode = 'invalid_parameter_value', message = 'Informe a origem dos dados (até 120 caracteres).';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_typeof(v_refused) is distinct from 'array' then
    raise exception using errcode = 'invalid_parameter_value', message = 'Linhas da importação inválidas.';
  end if;
  if p_total_rows is null or p_total_rows <> jsonb_array_length(p_rows) + jsonb_array_length(v_refused) then
    raise exception using errcode = 'invalid_parameter_value', message = 'A contagem de linhas não fecha.';
  end if;

  insert into public.contact_imports (workspace_id, file_name, source, created_by)
  values (p_workspace_id, btrim(p_file_name), v_source, v_user_id)
  returning * into v_import;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    if jsonb_typeof(v_row -> 'revoke') = 'array' and jsonb_array_length(v_row -> 'revoke') > 0
       and coalesce(jsonb_array_length(v_row -> 'consents'), 0) = 0 then
      v_given := coalesce((v_row ->> 'revoked_on')::date, current_date);
      if v_given > current_date then
        raise exception using errcode = 'check_violation', message = 'Data de revogação no futuro.';
      end if;
      v_contact_id := app.find_contact(p_workspace_id, v_row ->> 'email', v_row ->> 'phone');
      if v_contact_id is null then
        v_refused := v_refused || jsonb_build_array(jsonb_build_object('line', (v_row ->> 'line')::integer, 'reason', 'no_consent'));
        continue;
      end if;
      v_channels := app.revoke_contact_consents(
        p_workspace_id, v_contact_id,
        array(select jsonb_array_elements_text(v_row -> 'revoke'))::public.consent_channel[],
        v_source, v_given, v_import.id, v_user_id
      );
      if cardinality(v_channels) = 0 then
        v_refused := v_refused || jsonb_build_array(jsonb_build_object('line', (v_row ->> 'line')::integer, 'reason', 'duplicate_existing'));
      else
        v_revoked := v_revoked + 1;
      end if;
      v_contact_id := null;
      continue;
    end if;
    if jsonb_typeof(v_row -> 'consents') is distinct from 'array' or jsonb_array_length(v_row -> 'consents') = 0 then
      raise exception using errcode = 'check_violation', message = 'Contato sem consentimento não entra na base.';
    end if;
    for v_consent in select value from jsonb_array_elements(v_row -> 'consents') loop
      v_channel := (v_consent ->> 'channel')::public.consent_channel;
      v_given := (v_consent ->> 'given_at')::date;
      if v_given is null or v_given > current_date then
        raise exception using errcode = 'check_violation', message = 'Data de consentimento ausente ou no futuro.';
      end if;
      if (v_channel = 'email' and nullif(v_row ->> 'email', '') is null)
         or (v_channel = 'whatsapp' and nullif(v_row ->> 'phone', '') is null) then
        raise exception using errcode = 'check_violation', message = 'Consentimento num canal sem endereço.';
      end if;
    end loop;

    insert into public.contacts (
      workspace_id, full_name, email, phone, source, import_id, last_purchase_on, purchases_count
    ) values (
      p_workspace_id, btrim(v_row ->> 'name'), nullif(v_row ->> 'email', ''), nullif(v_row ->> 'phone', ''),
      v_source, v_import.id, (v_row ->> 'last_purchase_on')::date, (v_row ->> 'purchases_count')::integer
    )
    on conflict do nothing
    returning id into v_contact_id;

    if v_contact_id is null then
      v_refused := v_refused || jsonb_build_array(jsonb_build_object('line', (v_row ->> 'line')::integer, 'reason', 'duplicate_existing'));
      continue;
    end if;

    insert into public.consents (
      workspace_id, contact_id, channel, status, legal_basis, source, given_at, import_id, recorded_by
    )
    select p_workspace_id, v_contact_id, (c ->> 'channel')::public.consent_channel, 'granted', 'consent',
           v_source, (c ->> 'given_at')::date, v_import.id, v_user_id
    from jsonb_array_elements(v_row -> 'consents') as c;
    v_accepted := v_accepted + 1;
    v_contact_id := null;
  end loop;

  update public.contact_imports i
  set total_rows = p_total_rows,
      accepted_rows = v_accepted,
      revoked_rows = v_revoked,
      refused_rows = p_total_rows - v_accepted - v_revoked,
      refused = (
        select coalesce(jsonb_agg(r order by (r ->> 'line')::integer), '[]'::jsonb)
        from jsonb_array_elements(v_refused) as r
      )
  where i.id = v_import.id
  returning * into v_import;

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    p_workspace_id, 'user', v_user_id::text, 'contacts.imported', 'contact_import', v_import.id::text,
    jsonb_build_object(
      'total', v_import.total_rows, 'accepted', v_import.accepted_rows, 'refused', v_import.refused_rows,
      'revoked', v_import.revoked_rows
    )
  );
  return v_import;
end;
$$;

revoke all on function app.find_contact(uuid, text, text) from public, anon, authenticated, service_role;
revoke all on function app.revoke_contact_consents(uuid, uuid, public.consent_channel[], text, date, uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function app.revoke_consent(uuid, text, text, public.consent_channel, text) from public, anon, service_role;
grant execute on function app.revoke_consent(uuid, text, text, public.consent_channel, text) to authenticated;
