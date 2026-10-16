-- S2e — cobrança (Fase 2). ADR-0008: Asaas e Mercado Pago atrás de uma interface única (PaymentProvider);
-- Arquitetura §6: webhooks com event_id único gravado antes de processar. Decisões do dono de 16/10: pagamento
-- recorrente é requisito; preço e créditos ficam por último (valores em tabela, provisórios; nenhuma tela de
-- preço, paywall ou cobrança real até o dono definir).
--
-- plan_prices e topup_packs: quanto a assinatura e a recarga custam em dinheiro. Versionados (linha nova por
--   mudança, UPDATE recusado), provisórios. Sem leitura pela Data API nem pelo usuário: a UI não mostra preço.
-- billing_customers: o cliente no provedor. Só o id do provedor; nome, documento e cartão ficam no provedor.
-- subscriptions: assinatura recorrente de um plano; o período pago é o do último ciclo confirmado.
-- payments: cada cobrança (ciclo da assinatura ou recarga SPOT). Confirmada → credit_grants pelo extrato da
--   S1e (ciclo com validade do período, recarga sem validade curta); estorno ou contestação → adjustment;
--   contestação revertida → refund.
-- payment_events: todo webhook recebido, único por (provider, event_id), gravado antes do efeito e na mesma
--   transação: evento repetido não repete efeito.
-- Nenhum dado de cartão entra no banco: só ids e tokens do provedor.

create type public.payment_provider as enum ('asaas', 'mercadopago', 'mock');
create type public.payment_method as enum ('card', 'pix');
create type public.payment_kind as enum ('subscription_cycle', 'topup');
create type public.payment_status as enum (
  'pending', 'confirmed', 'overdue', 'failed', 'refunded', 'charged_back', 'cancelled'
);
create type public.subscription_status as enum ('pending', 'active', 'past_due', 'cancelled');

-- ---------------------------------------------------------------------------------------------------
-- Preços em dinheiro (configuração global, versionada, provisória)
-- ---------------------------------------------------------------------------------------------------

create table public.plan_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  amount numeric(12, 2) not null,
  currency text not null default 'BRL',
  valid_from timestamptz not null default now(),
  provisional boolean not null default true,
  approved_commercially boolean not null default false,
  created_at timestamptz not null default now(),
  constraint plan_prices_version_key unique (plan_id, valid_from),
  constraint plan_prices_amount_positive check (amount > 0),
  constraint plan_prices_currency_format check (currency ~ '^[A-Z]{3}$')
);
comment on table public.plan_prices is 'Preço em dinheiro por ciclo de um plano. Versionado: mudança = linha nova com valid_from.';
comment on column public.plan_prices.provisional is 'Valor provisório (dono, 16/10): ainda não é regra comercial.';
create trigger plan_prices_immutable
  before update on public.plan_prices
  for each row execute function app.versioned_row_immutable();

create table public.topup_packs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  credits numeric(12, 2) not null,
  validity_days integer,
  amount numeric(12, 2) not null,
  currency text not null default 'BRL',
  valid_from timestamptz not null default now(),
  provisional boolean not null default true,
  approved_commercially boolean not null default false,
  created_at timestamptz not null default now(),
  constraint topup_packs_version_key unique (slug, valid_from),
  constraint topup_packs_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint topup_packs_credits_positive check (credits > 0),
  constraint topup_packs_validity_positive check (validity_days > 0),
  constraint topup_packs_amount_positive check (amount > 0),
  constraint topup_packs_currency_format check (currency ~ '^[A-Z]{3}$')
);
comment on table public.topup_packs is 'Recargas avulsas (SPOT): créditos e preço em dinheiro. Versionado por (slug, valid_from).';
comment on column public.topup_packs.validity_days is 'Validade do grant em dias. Nulo = não vence (SPOT sem validade curta).';
create trigger topup_packs_immutable
  before update on public.topup_packs
  for each row execute function app.versioned_row_immutable();

-- ---------------------------------------------------------------------------------------------------
-- Cliente, assinatura, cobrança e eventos (por workspace)
-- ---------------------------------------------------------------------------------------------------

create table public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  provider public.payment_provider not null,
  provider_customer_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_customers_workspace_id_id_key unique (workspace_id, id),
  constraint billing_customers_workspace_provider_key unique (workspace_id, provider),
  constraint billing_customers_provider_id_key unique (provider, provider_customer_id),
  constraint billing_customers_provider_customer_id_length check (char_length(provider_customer_id) between 1 and 200)
);
comment on table public.billing_customers is 'Cliente no provedor de pagamento. Só o id do provedor: nome, documento e cartão ficam lá.';
create trigger billing_customers_set_updated_at
  before update on public.billing_customers
  for each row execute function app.set_updated_at();

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  customer_id uuid not null,
  provider public.payment_provider not null,
  provider_subscription_id text not null,
  plan_version_id uuid not null references public.plan_versions (id),
  plan_price_id uuid not null references public.plan_prices (id),
  method public.payment_method not null,
  status public.subscription_status not null default 'pending',
  started_at timestamptz not null default now(),
  current_period_start timestamptz,
  current_period_end timestamptz,
  past_due_since timestamptz,
  cancelled_at timestamptz,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_workspace_id_id_key unique (workspace_id, id),
  constraint subscriptions_provider_id_key unique (provider, provider_subscription_id),
  constraint subscriptions_customer_fk foreign key (workspace_id, customer_id)
    references public.billing_customers (workspace_id, id) on delete cascade,
  constraint subscriptions_provider_subscription_id_length check (char_length(provider_subscription_id) between 1 and 200),
  constraint subscriptions_period check (
    (current_period_start is null) = (current_period_end is null) and current_period_end > current_period_start
  ),
  constraint subscriptions_past_due check ((status = 'past_due') = (past_due_since is not null)),
  constraint subscriptions_cancelled check ((status = 'cancelled') = (cancelled_at is not null))
);
comment on table public.subscriptions is 'Assinatura recorrente de um plano. pending até o primeiro ciclo confirmado; past_due quando o período pago acabou sem o próximo ciclo confirmado (não bloqueia nada: paywall é decisão do dono).';
comment on column public.subscriptions.plan_version_id is 'Versão do plano vendida: créditos por ciclo que esta assinatura recebe.';
comment on column public.subscriptions.current_period_end is 'Fim do período pago: o próximo ciclo começa aqui.';
comment on column public.subscriptions.checked_at is 'Última conciliação do scheduler com o provedor.';
create unique index subscriptions_one_open_per_workspace
  on public.subscriptions (workspace_id) where status <> 'cancelled';
create index subscriptions_due_idx
  on public.subscriptions (current_period_end) where status in ('active', 'past_due');
create index subscriptions_customer_idx on public.subscriptions (customer_id);
create index subscriptions_plan_version_idx on public.subscriptions (plan_version_id);
create index subscriptions_plan_price_idx on public.subscriptions (plan_price_id);
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function app.set_updated_at();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  customer_id uuid not null,
  provider public.payment_provider not null,
  provider_payment_id text not null,
  kind public.payment_kind not null,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  status_detail text,
  subscription_id uuid,
  plan_version_id uuid references public.plan_versions (id),
  topup_pack_id uuid references public.topup_packs (id),
  amount numeric(12, 2) not null,
  currency text not null default 'BRL',
  credits numeric(12, 2) not null,
  period_start timestamptz,
  period_end timestamptz,
  pix_payload text,
  pix_expires_at timestamptz,
  grant_id uuid,
  credits_revoked numeric(12, 2) not null default 0,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_workspace_id_id_key unique (workspace_id, id),
  constraint payments_provider_id_key unique (provider, provider_payment_id),
  constraint payments_customer_fk foreign key (workspace_id, customer_id)
    references public.billing_customers (workspace_id, id) on delete cascade,
  constraint payments_subscription_fk foreign key (workspace_id, subscription_id)
    references public.subscriptions (workspace_id, id) on delete cascade,
  constraint payments_grant_fk foreign key (workspace_id, grant_id)
    references public.credit_grants (workspace_id, id) on delete set null (grant_id),
  constraint payments_provider_payment_id_length check (char_length(provider_payment_id) between 1 and 200),
  constraint payments_amount_positive check (amount > 0),
  constraint payments_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint payments_credits_positive check (credits > 0),
  constraint payments_revoked_range check (credits_revoked >= 0 and credits_revoked <= credits),
  constraint payments_status_detail_length check (char_length(status_detail) <= 200),
  constraint payments_pix_only check (method = 'pix' or (pix_payload is null and pix_expires_at is null)),
  constraint payments_kind_shape check (
    case kind
      when 'subscription_cycle' then subscription_id is not null and plan_version_id is not null
        and topup_pack_id is null and period_end > period_start
      when 'topup' then topup_pack_id is not null and subscription_id is null
        and period_start is null and period_end is null
    end
  ),
  constraint payments_granted_when_paid check (grant_id is null or confirmed_at is not null)
);
comment on table public.payments is 'Cobrança no provedor: ciclo da assinatura ou recarga SPOT. Confirmada uma vez → um grant (chave billing:payment:<id>).';
comment on column public.payments.credits is 'Créditos que a confirmação concede (versão do plano ou da recarga no momento da cobrança).';
comment on column public.payments.credits_revoked is 'Créditos retirados por estorno ou contestação (o que já tinha sido usado não volta).';
comment on column public.payments.pix_payload is 'Pix copia e cola devolvido pelo provedor (não é dado de cartão).';
create index payments_workspace_created_idx on public.payments (workspace_id, created_at desc, id desc);
create index payments_subscription_period_idx on public.payments (subscription_id, period_start)
  where subscription_id is not null;
create index payments_customer_idx on public.payments (customer_id);
create index payments_grant_idx on public.payments (grant_id) where grant_id is not null;
create index payments_plan_version_idx on public.payments (plan_version_id) where plan_version_id is not null;
create index payments_topup_pack_idx on public.payments (topup_pack_id) where topup_pack_id is not null;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function app.set_updated_at();

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider public.payment_provider not null,
  event_id text not null,
  event_type text not null,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  payment_id uuid references public.payments (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  outcome text not null default 'received',
  note text,
  occurred_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint payment_events_provider_event_key unique (provider, event_id),
  constraint payment_events_event_id_length check (char_length(event_id) between 1 and 200),
  constraint payment_events_event_type_length check (char_length(event_type) between 1 and 100),
  constraint payment_events_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint payment_events_outcome_values check (
    outcome in ('received', 'applied', 'no_change', 'ignored', 'needs_review')
  )
);
comment on table public.payment_events is 'Webhooks recebidos (e conciliações do scheduler), únicos por (provider, event_id). Gravado antes do efeito, na mesma transação. Payload sem dado de cartão nem documento.';
create index payment_events_workspace_received_idx on public.payment_events (workspace_id, received_at desc)
  where workspace_id is not null;
create index payment_events_payment_idx on public.payment_events (payment_id) where payment_id is not null;
create index payment_events_subscription_idx on public.payment_events (subscription_id) where subscription_id is not null;

-- ---------------------------------------------------------------------------------------------------
-- RLS: assinatura e cobranças só para o owner (quem assina); preço, cliente e eventos só pela API privilegiada
-- ---------------------------------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'plan_prices', 'topup_packs', 'billing_customers', 'subscriptions', 'payments', 'payment_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', v_table);
  end loop;
  foreach v_table in array array['subscriptions', 'payments']
  loop
    execute format('grant select on table public.%I to authenticated', v_table);
    execute format(
      'create policy %I on public.%I for select to authenticated '
      'using (workspace_id in (select app.current_user_workspace_ids(''owner'')))',
      v_table || '_select_owner', v_table
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Registro (papel privilegiado: serviço de cobrança; a compra pela UI é da Fase 4)
-- ---------------------------------------------------------------------------------------------------

create function app.billing_register_customer(
  p_workspace_id uuid,
  p_provider public.payment_provider,
  p_provider_customer_id text
)
returns public.billing_customers
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_customer public.billing_customers;
begin
  insert into public.billing_customers (workspace_id, provider, provider_customer_id)
  values (p_workspace_id, p_provider, p_provider_customer_id)
  on conflict (workspace_id, provider) do nothing;
  select c.* into v_customer
  from public.billing_customers c
  where c.workspace_id = p_workspace_id and c.provider = p_provider;
  if v_customer.provider_customer_id <> p_provider_customer_id then
    raise exception using
      errcode = 'unique_violation',
      message = 'Este workspace já tem outro cliente neste provedor.';
  end if;
  return v_customer;
end;
$$;

create function app.billing_register_subscription(
  p_workspace_id uuid,
  p_provider public.payment_provider,
  p_provider_subscription_id text,
  p_plan_version_id uuid,
  p_plan_price_id uuid,
  p_method public.payment_method,
  p_started_at timestamptz default now()
)
returns public.subscriptions
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_customer public.billing_customers;
  v_version public.plan_versions;
  v_subscription public.subscriptions;
begin
  select c.* into v_customer
  from public.billing_customers c
  where c.workspace_id = p_workspace_id and c.provider = p_provider;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Este workspace não tem cliente neste provedor.';
  end if;
  select v.* into v_version from public.plan_versions v where v.id = p_plan_version_id;
  if not found or v_version.cycle <> 'monthly' then
    raise exception using errcode = 'invalid_parameter_value', message = 'Assinatura só de plano mensal.';
  end if;
  if not exists (
    select 1 from public.plan_prices pp where pp.id = p_plan_price_id and pp.plan_id = v_version.plan_id
  ) then
    raise exception using errcode = 'invalid_parameter_value', message = 'O preço não é deste plano.';
  end if;

  insert into public.subscriptions (
    workspace_id, customer_id, provider, provider_subscription_id, plan_version_id, plan_price_id, method,
    started_at
  ) values (
    p_workspace_id, v_customer.id, p_provider, p_provider_subscription_id, p_plan_version_id, p_plan_price_id,
    p_method, p_started_at
  )
  on conflict (provider, provider_subscription_id) do nothing;
  select s.* into v_subscription
  from public.subscriptions s
  where s.provider = p_provider and s.provider_subscription_id = p_provider_subscription_id;
  if v_subscription.workspace_id <> p_workspace_id then
    raise exception using errcode = 'unique_violation', message = 'Esta assinatura do provedor é de outro workspace.';
  end if;
  return v_subscription;
end;
$$;

create function app.billing_register_topup(
  p_workspace_id uuid,
  p_provider public.payment_provider,
  p_provider_payment_id text,
  p_topup_pack_id uuid,
  p_method public.payment_method,
  p_pix_payload text default null,
  p_pix_expires_at timestamptz default null
)
returns public.payments
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_customer public.billing_customers;
  v_pack public.topup_packs;
  v_payment public.payments;
begin
  select c.* into v_customer
  from public.billing_customers c
  where c.workspace_id = p_workspace_id and c.provider = p_provider;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Este workspace não tem cliente neste provedor.';
  end if;
  select t.* into v_pack from public.topup_packs t where t.id = p_topup_pack_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Recarga não encontrada.';
  end if;

  insert into public.payments (
    workspace_id, customer_id, provider, provider_payment_id, kind, method, topup_pack_id, amount, currency,
    credits, pix_payload, pix_expires_at
  ) values (
    p_workspace_id, v_customer.id, p_provider, p_provider_payment_id, 'topup', p_method, v_pack.id,
    v_pack.amount, v_pack.currency, v_pack.credits, p_pix_payload, p_pix_expires_at
  )
  on conflict (provider, provider_payment_id) do nothing;
  select p.* into v_payment
  from public.payments p
  where p.provider = p_provider and p.provider_payment_id = p_provider_payment_id;
  if v_payment.workspace_id <> p_workspace_id then
    raise exception using errcode = 'unique_violation', message = 'Esta cobrança do provedor é de outro workspace.';
  end if;
  return v_payment;
end;
$$;

-- Ciclo novo que o provedor gerou para a assinatura (webhook ou conciliação): cobre o próximo período ainda
-- sem cobrança (o primeiro começa em started_at), com os créditos da versão vendida e o preço da assinatura.
create function app.billing_open_cycle_payment(
  p_subscription_id uuid,
  p_provider_payment_id text,
  p_method public.payment_method default null,
  p_amount numeric default null
)
returns public.payments
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_subscription public.subscriptions;
  v_version public.plan_versions;
  v_price public.plan_prices;
  v_start timestamptz;
  v_payment public.payments;
begin
  select s.* into v_subscription from public.subscriptions s where s.id = p_subscription_id for update;
  select v.* into v_version from public.plan_versions v where v.id = v_subscription.plan_version_id;
  select pp.* into v_price from public.plan_prices pp where pp.id = v_subscription.plan_price_id;
  select coalesce(max(p.period_end), v_subscription.started_at) into v_start
  from public.payments p
  where p.subscription_id = v_subscription.id and p.workspace_id = v_subscription.workspace_id
    and p.status <> 'cancelled';

  insert into public.payments (
    workspace_id, customer_id, provider, provider_payment_id, kind, method, subscription_id, plan_version_id,
    amount, currency, credits, period_start, period_end
  ) values (
    v_subscription.workspace_id, v_subscription.customer_id, v_subscription.provider, p_provider_payment_id,
    'subscription_cycle', coalesce(p_method, v_subscription.method), v_subscription.id, v_version.id,
    coalesce(p_amount, v_price.amount), v_price.currency, v_version.credits, v_start, v_start + interval '1 month'
  )
  on conflict (provider, provider_payment_id) do nothing;
  select p.* into v_payment
  from public.payments p
  where p.provider = v_subscription.provider and p.provider_payment_id = p_provider_payment_id;
  return v_payment;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Máquina de estados da cobrança e efeito no extrato de créditos
-- ---------------------------------------------------------------------------------------------------

create function app.billing_payment_transition_allowed(
  p_from public.payment_status,
  p_to public.payment_status
)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case p_from
    when 'pending' then p_to in ('confirmed', 'overdue', 'failed', 'cancelled')
    when 'overdue' then p_to in ('confirmed', 'pending', 'failed', 'cancelled')
    when 'failed' then p_to in ('confirmed', 'pending', 'overdue', 'cancelled')
    when 'confirmed' then p_to in ('refunded', 'charged_back')
    when 'charged_back' then p_to in ('confirmed', 'refunded')
    when 'cancelled' then p_to = 'pending'
    else false
  end
$$;

-- Aplica o estado que o provedor informou. Confirmada: concede os créditos uma vez (ciclo: validade do período;
-- recarga: validade da recarga, nula = não vence) e põe a assinatura em dia; contestação revertida devolve o
-- que foi retirado (refund). Estornada ou contestada: retira o que ainda não foi usado (adjustment). Vencida ou
-- recusada depois do fim do período pago: assinatura past_due. Transição fora de ordem não muda nada.
create function app.billing_set_payment_status(
  p_payment_id uuid,
  p_status public.payment_status,
  p_detail text,
  p_event_id uuid
)
returns table (outcome text, note text)
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_payment public.payments;
  v_pack public.topup_packs;
  v_grant public.credit_grants;
  v_subscription public.subscriptions;
  v_take numeric;
  v_note text;
begin
  select p.* into v_payment from public.payments p where p.id = p_payment_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Cobrança não encontrada.';
  end if;
  if p_status is null or p_status = v_payment.status then
    return query select 'no_change'::text, null::text;
    return;
  end if;
  if not app.billing_payment_transition_allowed(v_payment.status, p_status) then
    return query select 'no_change'::text, format('Transição ignorada: %s → %s.', v_payment.status, p_status);
    return;
  end if;
  if p_status = 'refunded' and v_payment.status = 'confirmed' and coalesce(p_detail, '') = 'partial_refund' then
    return query select 'needs_review'::text, 'Estorno parcial: conciliar à mão (regra comercial pendente).'::text;
    return;
  end if;

  perform 1 from public.credit_accounts a where a.workspace_id = v_payment.workspace_id for update;

  if p_status = 'confirmed' then
    if v_payment.grant_id is null then
      if v_payment.kind = 'subscription_cycle' then
        v_grant := app.grant_credits(
          v_payment.workspace_id, v_payment.credits, 'plan_cycle', 'billing:payment:' || v_payment.id,
          v_payment.period_end, v_payment.plan_version_id, 'Ciclo da assinatura pago.', v_payment.period_start
        );
      else
        select t.* into v_pack from public.topup_packs t where t.id = v_payment.topup_pack_id;
        v_grant := app.grant_credits(
          v_payment.workspace_id, v_payment.credits, 'topup', 'billing:payment:' || v_payment.id,
          case when v_pack.validity_days is not null then now() + make_interval(days => v_pack.validity_days) end,
          null, 'Recarga paga.'
        );
      end if;
      v_note := format('Créditos concedidos: %s.', app.format_credits(v_payment.credits));
    elsif v_payment.credits_revoked > 0 then
      select g.* into v_grant from public.credit_grants g where g.id = v_payment.grant_id for update;
      insert into public.credit_ledger (
        workspace_id, account_id, entry_type, grant_id, amount, idempotency_key, note, metadata
      ) values (
        v_payment.workspace_id, v_grant.account_id, 'refund', v_grant.id, v_payment.credits_revoked,
        'billing:event:' || p_event_id || ':restore', 'Contestação do pagamento revertida: créditos devolvidos.',
        jsonb_build_object('payment_id', v_payment.id)
      );
      update public.credit_grants set remaining = remaining + v_payment.credits_revoked where id = v_grant.id;
      v_note := format('Créditos devolvidos: %s.', app.format_credits(v_payment.credits_revoked));
    else
      select g.* into v_grant from public.credit_grants g where g.id = v_payment.grant_id;
    end if;
    update public.payments
    set status = 'confirmed', status_detail = p_detail, grant_id = v_grant.id, credits_revoked = 0,
        confirmed_at = coalesce(confirmed_at, now())
    where id = v_payment.id
    returning * into v_payment;

    if v_payment.kind = 'subscription_cycle' then
      update public.subscriptions s
      set current_period_start = case
            when s.current_period_end is null or v_payment.period_end > s.current_period_end
              then v_payment.period_start else s.current_period_start end,
          current_period_end = greatest(s.current_period_end, v_payment.period_end)
      where s.id = v_payment.subscription_id
      returning s.* into v_subscription;
      if v_subscription.status <> 'cancelled' then
        update public.subscriptions s
        set status = case when s.current_period_end > now() then 'active' else 'past_due' end::public.subscription_status,
            past_due_since = case when s.current_period_end > now() then null else coalesce(s.past_due_since, now()) end
        where s.id = v_subscription.id;
        update public.credit_accounts a
        set plan_version_id = v_payment.plan_version_id
        where a.workspace_id = v_payment.workspace_id and a.plan_version_id is distinct from v_payment.plan_version_id;
      end if;
    end if;
    return query select 'applied'::text, v_note;
    return;
  end if;

  if p_status in ('refunded', 'charged_back') then
    if v_payment.grant_id is not null then
      select g.* into v_grant from public.credit_grants g where g.id = v_payment.grant_id for update;
      v_take := least(v_grant.remaining - v_grant.reserved, v_payment.credits - v_payment.credits_revoked);
      if v_take > 0 then
        insert into public.credit_ledger (
          workspace_id, account_id, entry_type, grant_id, amount, idempotency_key, note, metadata
        ) values (
          v_payment.workspace_id, v_grant.account_id, 'adjustment', v_grant.id, -v_take,
          'billing:event:' || p_event_id || ':revoke',
          case p_status when 'refunded' then 'Pagamento estornado: créditos retirados.'
                        else 'Pagamento contestado: créditos retirados.' end,
          jsonb_build_object('payment_id', v_payment.id, 'not_recovered', v_payment.credits - v_payment.credits_revoked - v_take)
        );
        update public.credit_grants set remaining = remaining - v_take where id = v_grant.id;
      end if;
      v_take := greatest(v_take, 0);
      v_note := format(
        'Créditos retirados: %s de %s (o resto já tinha sido usado ou está reservado).',
        app.format_credits(v_take), app.format_credits(v_payment.credits - v_payment.credits_revoked)
      );
      update public.payments
      set status = p_status, status_detail = p_detail, credits_revoked = credits_revoked + v_take
      where id = v_payment.id;
    else
      update public.payments set status = p_status, status_detail = p_detail where id = v_payment.id;
    end if;
    return query select 'applied'::text, v_note;
    return;
  end if;

  update public.payments set status = p_status, status_detail = p_detail where id = v_payment.id
  returning * into v_payment;
  if p_status in ('overdue', 'failed') and v_payment.kind = 'subscription_cycle' then
    update public.subscriptions s
    set status = 'past_due', past_due_since = now()
    where s.id = v_payment.subscription_id and s.status = 'active' and s.current_period_end <= now();
  end if;
  return query select 'applied'::text, null::text;
end;
$$;

-- Recebe um evento já verificado e interpretado pelo adaptador do provedor. Grava o evento antes do efeito;
-- (provider, event_id) repetido devolve o resultado da primeira vez sem efeito novo. Formato de p_event:
-- {"event_id", "event_type", "occurred_at", "payload": {...},
--  "payment": {"provider_payment_id", "provider_subscription_id", "status", "status_detail", "method", "amount"},
--  "subscription": {"provider_subscription_id", "status"}}
create function app.billing_apply_event(p_provider text, p_event jsonb)
returns table (
  event_id uuid,
  duplicate boolean,
  outcome text,
  workspace_id uuid,
  payment_id uuid,
  subscription_id uuid
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_provider public.payment_provider := p_provider::public.payment_provider;
  v_event public.payment_events;
  v_pay jsonb := nullif(p_event -> 'payment', 'null'::jsonb);
  v_sub jsonb := nullif(p_event -> 'subscription', 'null'::jsonb);
  v_payment public.payments;
  v_subscription public.subscriptions;
  v_subscription_ref text;
  v_outcome text := 'no_change';
  v_note text;
  v_result record;
begin
  if jsonb_typeof(p_event) is distinct from 'object' then
    raise exception using errcode = 'invalid_parameter_value', message = 'Evento de pagamento inválido.';
  end if;

  insert into public.payment_events (provider, event_id, event_type, payload, occurred_at)
  values (
    v_provider, p_event ->> 'event_id', p_event ->> 'event_type',
    coalesce(nullif(p_event -> 'payload', 'null'::jsonb), '{}'::jsonb),
    (p_event ->> 'occurred_at')::timestamptz
  )
  on conflict on constraint payment_events_provider_event_key do nothing
  returning * into v_event;
  if not found then
    select e.* into v_event
    from public.payment_events e
    where e.provider = v_provider and e.event_id = p_event ->> 'event_id';
    return query select v_event.id, true, v_event.outcome, v_event.workspace_id, v_event.payment_id,
      v_event.subscription_id;
    return;
  end if;

  if v_pay ->> 'provider_payment_id' is not null then
    v_subscription_ref := v_pay ->> 'provider_subscription_id';
    select p.* into v_payment
    from public.payments p
    where p.provider = v_provider and p.provider_payment_id = v_pay ->> 'provider_payment_id'
    for update;
    if not found and v_subscription_ref is not null then
      select s.* into v_subscription
      from public.subscriptions s
      where s.provider = v_provider and s.provider_subscription_id = v_subscription_ref;
      if found then
        v_payment := app.billing_open_cycle_payment(
          v_subscription.id, v_pay ->> 'provider_payment_id',
          (v_pay ->> 'method')::public.payment_method, (v_pay ->> 'amount')::numeric
        );
      end if;
    end if;
    if v_payment.id is null then
      v_outcome := 'ignored';
      v_note := 'Cobrança desconhecida: não foi aberta por esta plataforma.';
    else
      select r.outcome, r.note into v_result
      from app.billing_set_payment_status(
        v_payment.id, (v_pay ->> 'status')::public.payment_status, left(v_pay ->> 'status_detail', 200), v_event.id
      ) r;
      v_outcome := v_result.outcome;
      v_note := v_result.note;
    end if;
  end if;

  if v_sub ->> 'provider_subscription_id' is not null then
    select s.* into v_subscription
    from public.subscriptions s
    where s.provider = v_provider and s.provider_subscription_id = v_sub ->> 'provider_subscription_id'
    for update;
    if not found then
      if v_payment.id is null then
        v_outcome := 'ignored';
        v_note := 'Assinatura desconhecida: não foi aberta por esta plataforma.';
      end if;
    elsif v_sub ->> 'status' = 'cancelled' and v_subscription.status <> 'cancelled' then
      update public.subscriptions s
      set status = 'cancelled', cancelled_at = now(), past_due_since = null
      where s.id = v_subscription.id
      returning s.* into v_subscription;
      v_outcome := 'applied';
      v_note := coalesce(v_note || ' ', '') || 'Assinatura cancelada no provedor.';
    end if;
  end if;

  update public.payment_events e
  set outcome = v_outcome,
      note = v_note,
      processed_at = now(),
      workspace_id = coalesce(v_payment.workspace_id, v_subscription.workspace_id),
      payment_id = v_payment.id,
      subscription_id = coalesce(v_payment.subscription_id, v_subscription.id)
  where e.id = v_event.id
  returning e.* into v_event;

  return query select v_event.id, false, v_event.outcome, v_event.workspace_id, v_event.payment_id,
    v_event.subscription_id;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Renovação (scheduler): assinaturas com o período pago vencido; sem ciclo confirmado → past_due
-- ---------------------------------------------------------------------------------------------------

create function app.billing_due_subscriptions(
  p_at timestamptz default now(),
  p_recheck interval default interval '1 hour',
  p_limit integer default 100
)
returns setof public.subscriptions
language sql
stable
set search_path = ''
as $$
  select s.*
  from public.subscriptions s
  where s.status in ('active', 'past_due')
    and s.current_period_end <= p_at
    and (s.checked_at is null or s.checked_at <= p_at - p_recheck)
  order by s.current_period_end, s.id
  limit p_limit
$$;

-- Fecha a conciliação de uma assinatura vencida: registra a checagem e, se o período pago acabou sem ciclo
-- novo confirmado, marca past_due (a leitura continua liberada; bloqueio é decisão do dono).
create function app.billing_settle_due_subscription(p_subscription_id uuid, p_at timestamptz default now())
returns public.subscriptions
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_subscription public.subscriptions;
begin
  update public.subscriptions s
  set checked_at = p_at,
      status = case when s.status = 'active' and s.current_period_end <= p_at then 'past_due' else s.status end,
      past_due_since = case
        when s.status = 'active' and s.current_period_end <= p_at then p_at else s.past_due_since end
  where s.id = p_subscription_id
  returning s.* into v_subscription;
  return v_subscription;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Papel do webhook: a API (hellosquad_api) assume hellosquad_billing só na transação do webhook, que não tem
-- usuário; o papel executa só billing_apply_event e não lê nenhuma tabela.
-- ---------------------------------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'hellosquad_billing') then
    create role hellosquad_billing with nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
end;
$$;
grant hellosquad_billing to hellosquad_api with inherit false, set true;
grant usage on schema app to hellosquad_billing;

revoke all on function
  app.billing_register_customer(uuid, public.payment_provider, text),
  app.billing_register_subscription(uuid, public.payment_provider, text, uuid, uuid, public.payment_method, timestamptz),
  app.billing_register_topup(uuid, public.payment_provider, text, uuid, public.payment_method, text, timestamptz),
  app.billing_open_cycle_payment(uuid, text, public.payment_method, numeric),
  app.billing_payment_transition_allowed(public.payment_status, public.payment_status),
  app.billing_set_payment_status(uuid, public.payment_status, text, uuid),
  app.billing_apply_event(text, jsonb),
  app.billing_due_subscriptions(timestamptz, interval, integer),
  app.billing_settle_due_subscription(uuid, timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function app.billing_apply_event(text, jsonb) to hellosquad_billing;
