-- S2b item 2 — base de clientes do Max (06.03, Documento Mestre §15 e Anexo A: "organiza segmentos com origem
-- dos dados e verificação de consentimento").
-- `contacts`: quem é o contato e de onde veio o dado (origem e importação). `consents`: o registro de
-- consentimento por canal (base legal, data, origem), somente inserção como o extrato de créditos: nada se
-- altera nem se apaga; revogar (opt-out) é uma linha nova `revoked`, e o estado vigente é a linha mais recente
-- do contato no canal. Sai só junto com o contato (direito de exclusão) ou com o workspace.
-- `contact_imports`: cada importação de CSV, com o relatório das linhas recusadas (número da linha e motivo,
-- sem o dado pessoal da linha recusada).
-- Leitura para todo membro do workspace (RLS forçada); escrita só por `app.import_contacts` (owner ou admin),
-- que recusa contato sem consentimento, e pelo papel privilegiado (seed). Nada aqui envia mensagem.

create type public.consent_channel as enum ('email', 'whatsapp');
create type public.consent_status as enum ('granted', 'revoked');
create type public.legal_basis as enum ('consent');

create table public.contact_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  file_name text not null,
  source text not null,
  total_rows integer not null default 0,
  accepted_rows integer not null default 0,
  refused_rows integer not null default 0,
  refused jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint contact_imports_workspace_id_id_key unique (workspace_id, id),
  constraint contact_imports_file_name_length check (char_length(btrim(file_name)) between 1 and 200),
  constraint contact_imports_source_length check (char_length(btrim(source)) between 1 and 120),
  constraint contact_imports_counts check (
    total_rows >= 0 and accepted_rows >= 0 and refused_rows >= 0 and accepted_rows + refused_rows = total_rows
  ),
  constraint contact_imports_refused_array check (jsonb_typeof(refused) = 'array')
);
comment on table public.contact_imports is 'Importação de contatos por CSV: origem declarada, contagens e linhas recusadas (linha e motivo, sem dado pessoal).';

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  source text not null,
  import_id uuid,
  last_purchase_on date,
  purchases_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_workspace_id_id_key unique (workspace_id, id),
  constraint contacts_import_fk foreign key (workspace_id, import_id)
    references public.contact_imports (workspace_id, id) on delete set null (import_id),
  constraint contacts_name_length check (char_length(btrim(full_name)) between 1 and 120),
  constraint contacts_email_format check (
    email is null or (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[a-z0-9-]{2,}$' and char_length(email) <= 254)
  ),
  constraint contacts_phone_format check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint contacts_reachable check (email is not null or phone is not null),
  constraint contacts_source_length check (char_length(btrim(source)) between 1 and 120),
  constraint contacts_purchases check (purchases_count is null or purchases_count >= 0)
);
comment on table public.contacts is 'Contatos do workspace (base do Max), com a origem do dado. Consentimento por canal em public.consents.';
comment on column public.contacts.source is 'Origem do dado (ex.: "Planilha de clientes do balcão").';
comment on column public.contacts.phone is 'Telefone em E.164 (+5511999990001).';

create unique index contacts_workspace_email_key on public.contacts (workspace_id, email) where email is not null;
create unique index contacts_workspace_phone_key on public.contacts (workspace_id, phone) where phone is not null;
create index contacts_import_idx on public.contacts (import_id) where import_id is not null;

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function app.set_updated_at();

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  contact_id uuid not null,
  channel public.consent_channel not null,
  status public.consent_status not null,
  legal_basis public.legal_basis not null default 'consent',
  source text not null,
  given_at date not null,
  import_id uuid,
  recorded_by uuid references auth.users (id) on delete set null,
  recorded_at timestamptz not null default now(),
  constraint consents_contact_fk foreign key (workspace_id, contact_id)
    references public.contacts (workspace_id, id) on delete cascade,
  constraint consents_import_fk foreign key (workspace_id, import_id)
    references public.contact_imports (workspace_id, id),
  constraint consents_source_length check (char_length(btrim(source)) between 1 and 120)
);
comment on table public.consents is 'Consentimento por contato e canal (base legal, data, origem). Somente inserção; o vigente é o mais recente.';
comment on column public.consents.given_at is 'Data em que o contato deu (ou revogou) o consentimento, como declarada na origem.';

create index consents_contact_channel_idx on public.consents (workspace_id, contact_id, channel, recorded_at desc, id desc);
create index consents_import_idx on public.consents (import_id) where import_id is not null;

create function app.consents_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if not exists (select 1 from public.contacts c where c.id = old.contact_id) then
      return old;
    end if;
  end if;
  raise exception using
    errcode = 'insufficient_privilege',
    message = 'O registro de consentimento é somente inserção: para revogar, registre uma linha nova.';
end;
$$;

create trigger consents_immutable
  before update or delete on public.consents
  for each row execute function app.consents_immutable();
create trigger consents_no_truncate
  before truncate on public.consents
  for each statement execute function app.consents_immutable();

-- A importação nunca apaga consentimento: a linha da importação fica enquanto houver consentimento dela.
alter table public.contact_imports enable row level security;
alter table public.contact_imports force row level security;
alter table public.contacts enable row level security;
alter table public.contacts force row level security;
alter table public.consents enable row level security;
alter table public.consents force row level security;
revoke all on table public.contact_imports, public.contacts, public.consents from public, anon, authenticated, service_role;
grant select on table public.contact_imports, public.contacts, public.consents to authenticated;
create policy contact_imports_select_member on public.contact_imports for select to authenticated
  using (workspace_id in (select app.current_user_workspace_ids()));
create policy contacts_select_member on public.contacts for select to authenticated
  using (workspace_id in (select app.current_user_workspace_ids()));
create policy consents_select_member on public.consents for select to authenticated
  using (workspace_id in (select app.current_user_workspace_ids()));

-- Estado vigente do consentimento: a linha mais recente de cada contato em cada canal.
create view public.contact_consent_state
with (security_invoker = true)
as
select distinct on (c.workspace_id, c.contact_id, c.channel)
       c.workspace_id, c.contact_id, c.channel, c.status, c.legal_basis, c.source, c.given_at, c.recorded_at
from public.consents c
order by c.workspace_id, c.contact_id, c.channel, c.recorded_at desc, c.id desc;
comment on view public.contact_consent_state is 'Consentimento vigente por contato e canal (o registro mais recente).';
revoke all on public.contact_consent_state from public, anon, authenticated, service_role;
grant select on public.contact_consent_state to authenticated;

-- Importação: as linhas já validadas pela API (formato, e-mail, telefone, duplicata no próprio arquivo) entram
-- aqui. A função confere de novo o que é regra: papel owner ou admin, consentimento em ao menos um canal, canal
-- com endereço, data do consentimento que não está no futuro. Contato que já existe (mesmo e-mail ou telefone)
-- fica de fora como duplicata. As recusas da API chegam em p_refused e entram no relatório.
-- p_rows: [{"line": 2, "name": "…", "email": "…", "phone": "+55…", "last_purchase_on": "AAAA-MM-DD",
--           "purchases_count": 3, "consents": [{"channel": "email", "given_at": "AAAA-MM-DD"}]}]
create function app.import_contacts(
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
      refused_rows = p_total_rows - v_accepted,
      refused = (
        select coalesce(jsonb_agg(r order by (r ->> 'line')::integer), '[]'::jsonb)
        from jsonb_array_elements(v_refused) as r
      )
  where i.id = v_import.id
  returning * into v_import;

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    p_workspace_id, 'user', v_user_id::text, 'contacts.imported', 'contact_import', v_import.id::text,
    jsonb_build_object('total', v_import.total_rows, 'accepted', v_import.accepted_rows, 'refused', v_import.refused_rows)
  );
  return v_import;
end;
$$;

revoke all on function app.import_contacts(uuid, text, text, integer, jsonb, jsonb) from public, anon, service_role;
grant execute on function app.import_contacts(uuid, text, text, integer, jsonb, jsonb) to authenticated;
revoke all on function app.consents_immutable() from public, anon, authenticated, service_role;
