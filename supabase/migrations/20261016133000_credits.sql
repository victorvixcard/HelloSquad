-- S1e — créditos (Fase 1). ARQUITETURA_PROPOSTA.md §6, ADR-0007; decisão do dono de 16/10: "preço e créditos
-- ficam por último": o mecanismo existe, os valores são provisórios e marcados como provisórios, sem preço em
-- dinheiro, sem compra e sem paywall.
--
-- credit_accounts: uma por workspace (app.create_workspace cria, com o grant do Free vigente).
-- credit_grants: de onde vêm os créditos (ciclo do plano, recarga, bônus, ajuste), com validade. `remaining` e
--   `reserved` são cache do extrato, mantidos pelas funções abaixo na mesma transação.
-- credit_holds: a reserva de um run (estimativa) e o desfecho: captured (entregou) ou released (não entregou).
-- credit_ledger: extrato somente inserção. Cada lançamento é de um grant: `amount` move o saldo e
--   `reserved_delta` move o reservado. hold: reserva (amount 0); capture: cobra o que estava reservado;
--   release: devolve o reservado sem cobrar. UPDATE, DELETE e TRUNCATE são recusados para qualquer papel; a
--   única saída de uma linha é junto com a conta de crédito inteira (exclusão do workspace, recomeço do seed).
-- delivery_prices e plan_versions: versionados (linha nova por mudança, UPDATE recusado), provisórios.
-- Saldo = soma do extrato dos grants válidos (app.credit_balance). Consumo: primeiro o que vence antes.

create type public.credit_grant_origin as enum ('plan_cycle', 'topup', 'bonus', 'adjustment');
create type public.credit_hold_state as enum ('held', 'captured', 'released');
create type public.credit_entry_type as enum ('grant', 'hold', 'capture', 'release', 'refund', 'adjustment');
create type public.delivery_depth as enum ('orientar', 'produzir', 'executar', 'otimizar');

-- ---------------------------------------------------------------------------------------------------
-- Planos e preços (configuração global, versionada)
-- ---------------------------------------------------------------------------------------------------

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint plans_slug_key unique (slug),
  constraint plans_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint plans_name_length check (char_length(btrim(name)) between 1 and 80)
);
comment on table public.plans is 'Planos (Free, assinaturas). Só créditos: preço em dinheiro entra quando o dono definir (Fase 2).';

create table public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  version integer not null,
  credits numeric(12, 2) not null,
  cycle text not null,
  validity_days integer,
  valid_from timestamptz not null default now(),
  provisional boolean not null default true,
  approved_commercially boolean not null default false,
  created_at timestamptz not null default now(),
  constraint plan_versions_plan_version_key unique (plan_id, version),
  constraint plan_versions_version_positive check (version > 0),
  constraint plan_versions_credits_non_negative check (credits >= 0),
  constraint plan_versions_cycle_values check (cycle in ('one_time', 'monthly')),
  constraint plan_versions_validity_positive check (validity_days > 0)
);
comment on column public.plan_versions.credits is 'Créditos concedidos por ciclo (one_time: uma vez, ao criar o workspace).';
comment on column public.plan_versions.validity_days is 'Validade do grant em dias a partir da concessão. Nulo = não vence.';
comment on column public.plan_versions.provisional is 'Valor provisório (dono, 16/10): ainda não é regra comercial.';

create table public.delivery_prices (
  id uuid primary key default gen_random_uuid(),
  delivery_type text not null,
  depth public.delivery_depth not null,
  credits numeric(12, 2) not null,
  revision_credits numeric(12, 2),
  valid_from timestamptz not null default now(),
  approved_commercially boolean not null default false,
  provisional boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  constraint delivery_prices_version_key unique (delivery_type, depth, valid_from),
  constraint delivery_prices_delivery_type_catalog check (
    delivery_type ~ '^[0-9]{2}\.[0-9]{2}$' and app.delivery_type_agent(delivery_type) is not null
  ),
  constraint delivery_prices_credits_non_negative check (credits >= 0),
  constraint delivery_prices_revision_non_negative check (revision_credits >= 0)
);
comment on table public.delivery_prices is 'Preço em créditos por delivery do catálogo e profundidade. Versionado: mudança = linha nova com valid_from.';
comment on column public.delivery_prices.revision_credits is 'Preço de uma nova versão pedida pela pessoa (ajuste ou nova proposta). Nulo = mesmo valor de credits.';
comment on column public.delivery_prices.provisional is 'Valor provisório (dono, 16/10): ainda não é regra comercial.';
create index delivery_prices_current_idx on public.delivery_prices (delivery_type, valid_from desc);

create function app.versioned_row_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = 'insufficient_privilege',
    message = 'Preço e plano são versionados: crie uma versão nova em vez de alterar esta.';
end;
$$;

create trigger plan_versions_immutable
  before update on public.plan_versions
  for each row execute function app.versioned_row_immutable();
create trigger delivery_prices_immutable
  before update on public.delivery_prices
  for each row execute function app.versioned_row_immutable();

-- ---------------------------------------------------------------------------------------------------
-- Conta, grants, reservas e extrato (por workspace)
-- ---------------------------------------------------------------------------------------------------

create table public.credit_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  plan_version_id uuid references public.plan_versions (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_accounts_workspace_key unique (workspace_id),
  constraint credit_accounts_workspace_id_id_key unique (workspace_id, id)
);
comment on table public.credit_accounts is 'Conta de créditos do workspace (uma por workspace). Toda movimentação trava esta linha primeiro.';
create index credit_accounts_plan_version_idx on public.credit_accounts (plan_version_id);
create trigger credit_accounts_set_updated_at
  before update on public.credit_accounts
  for each row execute function app.set_updated_at();

create table public.credit_grants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  account_id uuid not null,
  origin public.credit_grant_origin not null,
  plan_version_id uuid references public.plan_versions (id),
  amount numeric(12, 2) not null,
  remaining numeric(12, 2) not null,
  reserved numeric(12, 2) not null default 0,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_grants_workspace_id_id_key unique (workspace_id, id),
  constraint credit_grants_account_fk foreign key (workspace_id, account_id)
    references public.credit_accounts (workspace_id, id) on delete cascade,
  constraint credit_grants_amount_positive check (amount > 0),
  constraint credit_grants_remaining_range check (remaining >= 0 and remaining <= amount),
  constraint credit_grants_reserved_range check (reserved >= 0 and reserved <= remaining),
  constraint credit_grants_expires_after_start check (expires_at > starts_at),
  constraint credit_grants_plan_cycle_has_plan check (origin <> 'plan_cycle' or plan_version_id is not null)
);
comment on column public.credit_grants.remaining is 'Cache: soma de amount do extrato deste grant (inclui o que está reservado).';
comment on column public.credit_grants.reserved is 'Cache: soma de reserved_delta do extrato deste grant.';
comment on column public.credit_grants.expires_at is 'Nulo = não vence. Consumo: primeiro o que vence antes.';
create index credit_grants_account_expiry_idx on public.credit_grants (account_id, expires_at, starts_at);
create index credit_grants_plan_version_idx on public.credit_grants (plan_version_id) where plan_version_id is not null;
create trigger credit_grants_set_updated_at
  before update on public.credit_grants
  for each row execute function app.set_updated_at();

create table public.credit_holds (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  account_id uuid not null,
  run_id uuid,
  idempotency_key text not null,
  delivery_type text,
  price_id uuid references public.delivery_prices (id),
  estimate numeric(12, 2) not null,
  captured numeric(12, 2),
  state public.credit_hold_state not null default 'held',
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_holds_workspace_id_id_key unique (workspace_id, id),
  constraint credit_holds_run_key unique (run_id),
  constraint credit_holds_idempotency_key unique (workspace_id, idempotency_key),
  constraint credit_holds_account_fk foreign key (workspace_id, account_id)
    references public.credit_accounts (workspace_id, id) on delete cascade,
  constraint credit_holds_run_fk foreign key (workspace_id, run_id)
    references public.runs (workspace_id, id) on delete set null (run_id),
  constraint credit_holds_idempotency_key_length check (char_length(idempotency_key) between 1 and 200),
  constraint credit_holds_estimate_non_negative check (estimate >= 0),
  constraint credit_holds_captured_range check (captured >= 0 and captured <= estimate),
  constraint credit_holds_settled check ((state = 'held') = (settled_at is null)),
  constraint credit_holds_captured_state check ((state = 'captured') = (captured is not null))
);
comment on table public.credit_holds is 'Reserva de créditos de um run: held ao começar; captured se entregou (captured ≤ estimate); released se não entregou.';
comment on column public.credit_holds.run_id is 'Nulo só se o run for apagado (exclusão do workspace, recomeço do seed): reserva e extrato ficam.';
create index credit_holds_account_state_idx on public.credit_holds (account_id, state);
create index credit_holds_price_idx on public.credit_holds (price_id) where price_id is not null;
create trigger credit_holds_set_updated_at
  before update on public.credit_holds
  for each row execute function app.set_updated_at();

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  account_id uuid not null,
  entry_type public.credit_entry_type not null,
  grant_id uuid not null,
  hold_id uuid,
  run_id uuid,
  amount numeric(12, 2) not null,
  reserved_delta numeric(12, 2) not null default 0,
  idempotency_key text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint credit_ledger_idempotency_key unique (workspace_id, idempotency_key),
  constraint credit_ledger_account_fk foreign key (workspace_id, account_id)
    references public.credit_accounts (workspace_id, id) on delete cascade,
  constraint credit_ledger_grant_fk foreign key (workspace_id, grant_id)
    references public.credit_grants (workspace_id, id) on delete cascade,
  constraint credit_ledger_hold_fk foreign key (workspace_id, hold_id)
    references public.credit_holds (workspace_id, id) on delete cascade,
  constraint credit_ledger_idempotency_key_length check (char_length(idempotency_key) between 1 and 300),
  constraint credit_ledger_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint credit_ledger_amounts check (
    case entry_type
      when 'grant' then amount > 0 and reserved_delta = 0
      when 'hold' then amount = 0 and reserved_delta > 0
      when 'capture' then amount < 0 and reserved_delta = amount
      when 'release' then amount = 0 and reserved_delta < 0
      when 'refund' then amount > 0 and reserved_delta = 0
      when 'adjustment' then amount < 0 and reserved_delta = 0
    end
  ),
  constraint credit_ledger_hold_required check (
    entry_type not in ('hold', 'capture', 'release') or hold_id is not null
  )
);
comment on table public.credit_ledger is 'Extrato de créditos, somente inserção: nenhum papel altera ou apaga uma linha (trigger). Sai só junto com a conta.';
comment on column public.credit_ledger.amount is 'Movimento do saldo do grant: grant e refund > 0; capture e adjustment < 0; hold e release = 0.';
comment on column public.credit_ledger.reserved_delta is 'Movimento do reservado do grant: hold > 0; capture e release < 0.';
create index credit_ledger_account_created_idx on public.credit_ledger (account_id, created_at desc, id desc);
create index credit_ledger_grant_idx on public.credit_ledger (grant_id);
create index credit_ledger_hold_idx on public.credit_ledger (hold_id) where hold_id is not null;

create function app.credit_ledger_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if not exists (select 1 from public.credit_accounts a where a.id = old.account_id) then
      return old;
    end if;
  end if;
  raise exception using
    errcode = 'insufficient_privilege',
    message = 'O extrato de créditos é somente inserção: lançamento não se altera nem se apaga.';
end;
$$;

create trigger credit_ledger_immutable
  before update or delete on public.credit_ledger
  for each row execute function app.credit_ledger_immutable();
create trigger credit_ledger_no_truncate
  before truncate on public.credit_ledger
  for each statement execute function app.credit_ledger_immutable();

alter table public.runs
  add column credits_charged numeric(12, 2) not null default 0,
  add constraint runs_credits_charged_non_negative check (credits_charged >= 0);
comment on column public.runs.credits_charged is 'Créditos cobrados por este run (captura da reserva). Zero quando não entregou.';

-- ---------------------------------------------------------------------------------------------------
-- RLS: authenticated lê conta, grants, reservas e extrato dos seus workspaces e os preços; nada de escrita
-- ---------------------------------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  foreach v_table in array array['credit_accounts', 'credit_grants', 'credit_holds', 'credit_ledger']
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', v_table);
    execute format('grant select on table public.%I to authenticated', v_table);
    execute format(
      'create policy %I on public.%I for select to authenticated '
      'using (workspace_id in (select app.current_user_workspace_ids()))',
      v_table || '_select_member', v_table
    );
  end loop;
end;
$$;

alter table public.plans enable row level security;
alter table public.plans force row level security;
alter table public.plan_versions enable row level security;
alter table public.plan_versions force row level security;
alter table public.delivery_prices enable row level security;
alter table public.delivery_prices force row level security;
revoke all on table public.plans, public.plan_versions, public.delivery_prices
  from public, anon, authenticated, service_role;
grant select on table public.delivery_prices to authenticated;
create policy delivery_prices_select_authenticated on public.delivery_prices
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------------------------------
-- Leitura: saldo, vencimentos, preço vigente e estimativa
-- ---------------------------------------------------------------------------------------------------

-- Saldo = soma do extrato dos grants válidos em p_at (inclui o que está reservado; disponível = saldo −
-- reservado). SECURITY INVOKER: para authenticated, a RLS limita aos workspaces da pessoa.
create function app.credit_balance(p_workspace_id uuid, p_at timestamptz default now())
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(l.amount), 0)::numeric(12, 2)
  from public.credit_ledger l
  join public.credit_grants g on g.id = l.grant_id and g.workspace_id = l.workspace_id
  where l.workspace_id = p_workspace_id
    and l.created_at <= p_at
    and g.starts_at <= p_at
    and (g.expires_at is null or g.expires_at > p_at)
$$;

-- Quanto vence quando: um item por grant válido com saldo, na ordem de consumo (primeiro o que vence antes).
create function app.credit_breakdown(p_workspace_id uuid, p_at timestamptz default now())
returns table (
  grant_id uuid,
  origin public.credit_grant_origin,
  amount numeric,
  balance numeric,
  reserved numeric,
  starts_at timestamptz,
  expires_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select g.id, g.origin, g.amount, sum(l.amount)::numeric(12, 2), sum(l.reserved_delta)::numeric(12, 2),
         g.starts_at, g.expires_at
  from public.credit_grants g
  join public.credit_ledger l on l.grant_id = g.id and l.workspace_id = g.workspace_id and l.created_at <= p_at
  where g.workspace_id = p_workspace_id
    and g.starts_at <= p_at
    and (g.expires_at is null or g.expires_at > p_at)
  group by g.id
  having sum(l.amount) > 0
  order by g.expires_at asc nulls last, g.starts_at, g.id
$$;

-- Preço vigente de uma delivery: a versão mais recente com valid_from ≤ p_at.
create function app.current_delivery_price(p_delivery_type text, p_at timestamptz default now())
returns public.delivery_prices
language sql
stable
set search_path = ''
as $$
  select p.*
  from public.delivery_prices p
  where p.delivery_type = p_delivery_type and p.valid_from <= p_at
  order by p.valid_from desc, p.depth
  limit 1
$$;

-- Estimativa do run: preço vigente da delivery do trabalho; se o trabalho já tem versão entregue, é uma
-- nova versão pedida pela pessoa (ajuste ou nova proposta) e vale revision_credits (nulo = mesmo preço).
create function app.run_credit_estimate(p_run_id uuid)
returns table (
  price_id uuid,
  delivery_type text,
  depth public.delivery_depth,
  credits numeric,
  revision boolean,
  provisional boolean
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_run public.runs;
  v_delivery_type text;
  v_revision boolean;
  v_price public.delivery_prices;
begin
  select r.* into v_run from public.runs r where r.id = p_run_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Run não encontrado.';
  end if;
  select w.delivery_type into v_delivery_type
  from public.work_items w
  where w.id = v_run.work_item_id and w.workspace_id = v_run.workspace_id;
  if v_delivery_type is null then
    raise exception using errcode = 'invalid_parameter_value', message = 'O trabalho deste run não tem tipo de delivery.';
  end if;
  v_price := app.current_delivery_price(v_delivery_type);
  if v_price.id is null then
    raise exception using
      errcode = 'no_data_found',
      message = format('A delivery %s ainda não tem preço em créditos.', v_delivery_type);
  end if;
  v_revision := exists (
    select 1
    from public.delivery_versions v
    join public.deliveries d on d.id = v.delivery_id and d.workspace_id = v.workspace_id
    where d.workspace_id = v_run.workspace_id
      and d.work_item_id = v_run.work_item_id
      and v.run_id is distinct from v_run.id
  );
  return query select v_price.id, v_price.delivery_type, v_price.depth,
    case when v_revision then coalesce(v_price.revision_credits, v_price.credits) else v_price.credits end,
    v_revision, v_price.provisional;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Escrita (papel privilegiado: worker, seed; authenticated não executa)
-- ---------------------------------------------------------------------------------------------------

create function app.format_credits(p_value numeric)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select replace(trim_scale(p_value)::text, '.', ',')
$$;

-- Concede créditos (ciclo do plano, recarga, bônus ou ajuste positivo). Idempotente pela chave: a segunda
-- chamada devolve o grant já criado.
create function app.grant_credits(
  p_workspace_id uuid,
  p_amount numeric,
  p_origin public.credit_grant_origin,
  p_idempotency_key text,
  p_expires_at timestamptz default null,
  p_plan_version_id uuid default null,
  p_note text default null,
  p_starts_at timestamptz default now()
)
returns public.credit_grants
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_account public.credit_accounts;
  v_grant public.credit_grants;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = 'invalid_parameter_value', message = 'A quantidade de créditos precisa ser positiva.';
  end if;
  if char_length(p_idempotency_key) not between 1 and 200 then
    raise exception using errcode = 'invalid_parameter_value', message = 'A chave de idempotência precisa ter de 1 a 200 caracteres.';
  end if;

  select a.* into v_account from public.credit_accounts a where a.workspace_id = p_workspace_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Este workspace não tem conta de créditos.';
  end if;

  select g.* into v_grant
  from public.credit_ledger l
  join public.credit_grants g on g.id = l.grant_id
  where l.workspace_id = p_workspace_id and l.idempotency_key = p_idempotency_key;
  if found then
    return v_grant;
  end if;

  insert into public.credit_grants (
    workspace_id, account_id, origin, plan_version_id, amount, remaining, starts_at, expires_at, note
  ) values (
    p_workspace_id, v_account.id, p_origin, p_plan_version_id, p_amount, p_amount, p_starts_at, p_expires_at,
    nullif(btrim(p_note), '')
  )
  returning * into v_grant;

  insert into public.credit_ledger (workspace_id, account_id, entry_type, grant_id, amount, idempotency_key, note)
  values (p_workspace_id, v_account.id, 'grant', v_grant.id, p_amount, p_idempotency_key, v_grant.note);

  return v_grant;
end;
$$;

-- Reserva a estimativa de um run ao começar, dos grants válidos, primeiro o que vence antes. Sem saldo
-- disponível: SQLSTATE HS001 (créditos insuficientes). O run tem uma reserva só: chamar de novo (retentativa,
-- segundo processamento) devolve a mesma, sem lançamento novo.
create function app.reserve_credits(
  p_run_id uuid,
  p_estimate numeric,
  p_idempotency_key text,
  p_delivery_type text default null,
  p_price_id uuid default null
)
returns public.credit_holds
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_run public.runs;
  v_account public.credit_accounts;
  v_hold public.credit_holds;
  v_available numeric;
  v_left numeric;
  v_take numeric;
  v_grant record;
begin
  if p_estimate is null or p_estimate < 0 then
    raise exception using errcode = 'invalid_parameter_value', message = 'A estimativa precisa ser zero ou positiva.';
  end if;
  if char_length(p_idempotency_key) not between 1 and 200 then
    raise exception using errcode = 'invalid_parameter_value', message = 'A chave de idempotência precisa ter de 1 a 200 caracteres.';
  end if;

  select r.* into v_run from public.runs r where r.id = p_run_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Run não encontrado.';
  end if;

  select a.* into v_account from public.credit_accounts a where a.workspace_id = v_run.workspace_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Este workspace não tem conta de créditos.';
  end if;

  select h.* into v_hold from public.credit_holds h where h.run_id = p_run_id;
  if found then
    if v_hold.idempotency_key <> p_idempotency_key then
      raise exception using
        errcode = 'unique_violation',
        message = 'Este run já tem uma reserva de créditos com outra chave de idempotência.';
    end if;
    return v_hold;
  end if;
  if exists (
    select 1 from public.credit_holds h
    where h.workspace_id = v_run.workspace_id and h.idempotency_key = p_idempotency_key
  ) then
    raise exception using
      errcode = 'unique_violation',
      message = 'Esta chave de idempotência já reservou créditos para outro run.';
  end if;

  select coalesce(sum(g.remaining - g.reserved), 0) into v_available
  from public.credit_grants g
  where g.account_id = v_account.id
    and g.starts_at <= now()
    and (g.expires_at is null or g.expires_at > now());
  if v_available < p_estimate then
    raise exception using
      errcode = 'HS001',
      message = format(
        'Créditos insuficientes: esta entrega precisa de %s e o saldo disponível é %s.',
        app.format_credits(p_estimate), app.format_credits(v_available)
      ),
      detail = jsonb_build_object('needed', p_estimate, 'available', v_available)::text;
  end if;

  insert into public.credit_holds (
    workspace_id, account_id, run_id, idempotency_key, delivery_type, price_id, estimate
  ) values (
    v_run.workspace_id, v_account.id, p_run_id, p_idempotency_key, p_delivery_type, p_price_id, p_estimate
  )
  returning * into v_hold;

  v_left := p_estimate;
  for v_grant in
    select g.id, g.remaining - g.reserved as available
    from public.credit_grants g
    where g.account_id = v_account.id
      and g.starts_at <= now()
      and (g.expires_at is null or g.expires_at > now())
      and g.remaining - g.reserved > 0
    order by g.expires_at asc nulls last, g.starts_at, g.id
  loop
    exit when v_left <= 0;
    v_take := least(v_left, v_grant.available);
    insert into public.credit_ledger (
      workspace_id, account_id, entry_type, grant_id, hold_id, run_id, amount, reserved_delta,
      idempotency_key, metadata
    ) values (
      v_run.workspace_id, v_account.id, 'hold', v_grant.id, v_hold.id, p_run_id, 0, v_take,
      p_idempotency_key || ':hold:' || v_grant.id,
      jsonb_strip_nulls(jsonb_build_object('delivery_type', p_delivery_type, 'work_item_id', v_run.work_item_id))
    );
    update public.credit_grants set reserved = reserved + v_take where id = v_grant.id;
    v_left := v_left - v_take;
  end loop;

  return v_hold;
end;
$$;

-- Fecha a reserva sem cobrar: o reservado volta ao saldo disponível. Idempotente: reserva já fechada (ou run
-- sem reserva) não muda nada.
create function app.release_credits(p_run_id uuid)
returns public.credit_holds
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_hold public.credit_holds;
  v_row record;
begin
  select h.* into v_hold from public.credit_holds h where h.run_id = p_run_id;
  if not found then
    return null;
  end if;
  perform 1 from public.credit_accounts a where a.id = v_hold.account_id for update;
  select h.* into v_hold from public.credit_holds h where h.id = v_hold.id;
  if v_hold.state <> 'held' then
    return v_hold;
  end if;

  for v_row in
    select l.grant_id, sum(l.reserved_delta) as reserved
    from public.credit_ledger l
    where l.hold_id = v_hold.id and l.workspace_id = v_hold.workspace_id
    group by l.grant_id
    having sum(l.reserved_delta) > 0
    order by l.grant_id
  loop
    insert into public.credit_ledger (
      workspace_id, account_id, entry_type, grant_id, hold_id, run_id, amount, reserved_delta,
      idempotency_key, metadata
    ) values (
      v_hold.workspace_id, v_hold.account_id, 'release', v_row.grant_id, v_hold.id, v_hold.run_id, 0,
      -v_row.reserved, v_hold.idempotency_key || ':release:' || v_row.grant_id,
      jsonb_strip_nulls(jsonb_build_object('delivery_type', v_hold.delivery_type))
    );
    update public.credit_grants set reserved = reserved - v_row.reserved where id = v_row.grant_id;
  end loop;

  update public.credit_holds
  set state = 'released', settled_at = now()
  where id = v_hold.id
  returning * into v_hold;
  return v_hold;
end;
$$;

-- Cobra o run que entregou: captura p_final (0 ≤ p_final ≤ estimativa) dos grants da reserva, primeiro o
-- que vence antes, e libera a diferença. Grava runs.credits_charged. Idempotente: reserva já capturada
-- devolve o mesmo resultado sem lançamento novo; reserva já liberada não é cobrada.
create function app.capture_credits(p_run_id uuid, p_final numeric)
returns public.credit_holds
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_hold public.credit_holds;
  v_row record;
  v_left numeric;
  v_take numeric;
begin
  select h.* into v_hold from public.credit_holds h where h.run_id = p_run_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Este run não tem reserva de créditos.';
  end if;
  perform 1 from public.credit_accounts a where a.id = v_hold.account_id for update;
  select h.* into v_hold from public.credit_holds h where h.id = v_hold.id;
  if v_hold.state = 'captured' then
    return v_hold;
  end if;
  if v_hold.state = 'released' then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'A reserva deste run já foi liberada: não há o que cobrar.';
  end if;
  if p_final is null or p_final < 0 or p_final > v_hold.estimate then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = format('A cobrança precisa ficar entre 0 e a reserva (%s).', app.format_credits(v_hold.estimate));
  end if;

  v_left := p_final;
  for v_row in
    select l.grant_id, sum(l.reserved_delta) as reserved
    from public.credit_ledger l
    join public.credit_grants g on g.id = l.grant_id
    where l.hold_id = v_hold.id and l.workspace_id = v_hold.workspace_id
    group by l.grant_id, g.expires_at, g.starts_at
    having sum(l.reserved_delta) > 0
    order by g.expires_at asc nulls last, g.starts_at, l.grant_id
  loop
    v_take := least(v_left, v_row.reserved);
    if v_take > 0 then
      insert into public.credit_ledger (
        workspace_id, account_id, entry_type, grant_id, hold_id, run_id, amount, reserved_delta,
        idempotency_key, metadata
      ) values (
        v_hold.workspace_id, v_hold.account_id, 'capture', v_row.grant_id, v_hold.id, v_hold.run_id, -v_take,
        -v_take, v_hold.idempotency_key || ':capture:' || v_row.grant_id,
        jsonb_strip_nulls(jsonb_build_object('delivery_type', v_hold.delivery_type))
      );
      update public.credit_grants
      set remaining = remaining - v_take, reserved = reserved - v_take
      where id = v_row.grant_id;
    end if;
    if v_row.reserved > v_take then
      insert into public.credit_ledger (
        workspace_id, account_id, entry_type, grant_id, hold_id, run_id, amount, reserved_delta,
        idempotency_key, metadata
      ) values (
        v_hold.workspace_id, v_hold.account_id, 'release', v_row.grant_id, v_hold.id, v_hold.run_id, 0,
        -(v_row.reserved - v_take), v_hold.idempotency_key || ':release:' || v_row.grant_id,
        jsonb_strip_nulls(jsonb_build_object('delivery_type', v_hold.delivery_type))
      );
      update public.credit_grants set reserved = reserved - (v_row.reserved - v_take) where id = v_row.grant_id;
    end if;
    v_left := v_left - v_take;
  end loop;

  update public.credit_holds
  set state = 'captured', captured = p_final, settled_at = now()
  where id = v_hold.id
  returning * into v_hold;
  update public.runs set credits_charged = p_final where id = v_hold.run_id and workspace_id = v_hold.workspace_id;
  return v_hold;
end;
$$;

-- Run que termina sem ter sido cobrado (falhou, foi cancelado ou concluiu sem entrega, como a pergunta do
-- Nexo) não fica com reserva presa: o que estiver reservado volta.
create function app.runs_release_credits()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform app.release_credits(new.id);
  return null;
end;
$$;

create trigger runs_release_credits
  after update of status on public.runs
  for each row
  when (old.status is distinct from new.status and new.status in ('succeeded', 'failed', 'cancelled'))
  execute function app.runs_release_credits();

-- ---------------------------------------------------------------------------------------------------
-- Plano Free (provisório) e conta de crédito em todo workspace
-- ---------------------------------------------------------------------------------------------------

insert into public.plans (slug, name) values ('free', 'Free');
insert into public.plan_versions (plan_id, version, credits, cycle, validity_days, valid_from, provisional, approved_commercially)
select p.id, 1, 20, 'one_time', null, '2026-10-01 00:00:00-03', true, false
from public.plans p
where p.slug = 'free';

insert into public.credit_accounts (workspace_id)
select w.id from public.workspaces w
on conflict (workspace_id) do nothing;

-- Plano vigente: versão mais recente com valid_from ≤ agora.
create function app.current_plan_version(p_plan_slug text)
returns public.plan_versions
language sql
stable
set search_path = ''
as $$
  select v.*
  from public.plan_versions v
  join public.plans p on p.id = v.plan_id
  where p.slug = p_plan_slug and v.valid_from <= now()
  order by v.valid_from desc, v.version desc
  limit 1
$$;

-- app.create_workspace (S0) ganha a conta de créditos com o grant inicial do Free vigente. O resto é igual.
create or replace function app.create_workspace(p_name text, p_slug text)
returns public.workspaces
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace public.workspaces;
  v_free public.plan_versions;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;

  insert into public.workspaces (slug, name, created_by)
  values (lower(btrim(p_slug)), btrim(p_name), v_user_id)
  returning * into v_workspace;

  insert into public.memberships (workspace_id, user_id, role)
  values (v_workspace.id, v_user_id, 'owner');

  insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
  values (
    v_workspace.id, 'user', v_user_id::text, 'workspace.created', 'workspace', v_workspace.id::text,
    jsonb_build_object('slug', v_workspace.slug, 'name', v_workspace.name)
  );

  v_free := app.current_plan_version('free');
  insert into public.credit_accounts (workspace_id, plan_version_id)
  values (v_workspace.id, v_free.id);
  if v_free.id is not null and v_free.credits > 0 then
    perform app.grant_credits(
      v_workspace.id, v_free.credits, 'plan_cycle', 'workspace:' || v_workspace.id || ':plan:' || v_free.id,
      case when v_free.validity_days is not null then now() + make_interval(days => v_free.validity_days) end,
      v_free.id
    );
  end if;

  return v_workspace;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- EXECUTE: authenticated só lê (saldo, vencimentos, preço, estimativa do próprio pedido pela API)
-- ---------------------------------------------------------------------------------------------------

revoke all on function
  app.versioned_row_immutable(),
  app.credit_ledger_immutable(),
  app.credit_balance(uuid, timestamptz),
  app.credit_breakdown(uuid, timestamptz),
  app.current_delivery_price(text, timestamptz),
  app.run_credit_estimate(uuid),
  app.format_credits(numeric),
  app.grant_credits(uuid, numeric, public.credit_grant_origin, text, timestamptz, uuid, text, timestamptz),
  app.reserve_credits(uuid, numeric, text, text, uuid),
  app.release_credits(uuid),
  app.capture_credits(uuid, numeric),
  app.runs_release_credits(),
  app.current_plan_version(text),
  app.create_workspace(text, text)
  from public, anon, authenticated, service_role;

grant execute on function
  app.credit_balance(uuid, timestamptz),
  app.credit_breakdown(uuid, timestamptz),
  app.current_delivery_price(text, timestamptz),
  app.create_workspace(text, text)
  to authenticated;
