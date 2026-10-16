-- S2e — o período de um ciclo novo vem do vencimento que o provedor informa (dueDate do Asaas, debit_date do
-- Mercado Pago). O Asaas gera a cobrança do ciclo até 40 dias antes do vencimento e, sem envio sequencial, não
-- garante a ordem dos webhooks: "o próximo período sem cobrança" trocaria os ciclos de lugar quando dois chegam
-- fora de ordem. Sem vencimento (simulado), continua valendo o próximo período sem cobrança.

drop function app.billing_open_cycle_payment(uuid, text, public.payment_method, numeric);

create function app.billing_open_cycle_payment(
  p_subscription_id uuid,
  p_provider_payment_id text,
  p_method public.payment_method default null,
  p_amount numeric default null,
  p_due_date date default null
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
  if p_due_date is not null then
    v_start := p_due_date::timestamp at time zone 'America/Sao_Paulo';
  else
    select coalesce(max(p.period_end), v_subscription.started_at) into v_start
    from public.payments p
    where p.subscription_id = v_subscription.id and p.workspace_id = v_subscription.workspace_id
      and p.status <> 'cancelled';
  end if;

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

-- Recebe um evento já verificado e interpretado pelo adaptador do provedor. Grava o evento antes do efeito;
-- (provider, event_id) repetido devolve o resultado da primeira vez sem efeito novo. Formato de p_event:
-- {"event_id", "event_type", "occurred_at", "payload": {...},
--  "payment": {"provider_payment_id", "provider_subscription_id", "status", "status_detail", "method", "amount",
--              "due_date"},
--  "subscription": {"provider_subscription_id", "status"}}
create or replace function app.billing_apply_event(p_provider text, p_event jsonb)
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
          (v_pay ->> 'method')::public.payment_method, (v_pay ->> 'amount')::numeric,
          (v_pay ->> 'due_date')::date
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

revoke all on function app.billing_open_cycle_payment(uuid, text, public.payment_method, numeric, date)
  from public, anon, authenticated, service_role;
