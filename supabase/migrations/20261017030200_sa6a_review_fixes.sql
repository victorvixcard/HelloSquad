-- SA6a (revisão do próprio diff): a chave de idempotência do ajuste é comparada por prefixo, sem LIKE (a
-- chave vem do pedido e poderia trazer % ou _); plano "à venda" sem preço novo exige o preço em dinheiro
-- vigente aprovado; reenfileirar recusa run que já reservou créditos (S1e: uma reserva por run, e a
-- retentativa devolveria a reserva já liberada).

create or replace function app.admin_adjust_credits(
  p_workspace_id uuid,
  p_amount numeric,
  p_reason text,
  p_idempotency_key text
)
returns table (balance_before numeric, balance_after numeric, entries integer, duplicate boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_key text;
  v_account public.credit_accounts;
  v_before numeric;
  v_available numeric;
  v_left numeric;
  v_take numeric;
  v_grant record;
  v_entries integer := 0;
begin
  perform app.admin_require();
  v_reason := app.admin_reason(p_reason);
  if p_amount is null or p_amount = 0 or scale(p_amount) > 2 then
    raise exception using errcode = 'invalid_parameter_value', message = 'O ajuste precisa ser diferente de zero, com até duas casas.';
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 120 then
    raise exception using errcode = 'invalid_parameter_value', message = 'A chave de idempotência precisa ter de 8 a 120 caracteres.';
  end if;
  v_key := 'admin_adjustment:' || p_idempotency_key;

  select a.* into v_account from public.credit_accounts a
  join public.workspaces w on w.id = a.workspace_id
  where a.workspace_id = p_workspace_id and w.deleted_at is null
  for update of a;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Conta não encontrada ou sem conta de créditos.';
  end if;
  v_before := app.credit_balance(p_workspace_id);

  if exists (
    select 1 from public.credit_ledger l
    where l.workspace_id = p_workspace_id
      and (l.idempotency_key = v_key or starts_with(l.idempotency_key, v_key || ':'))
  ) then
    return query select v_before, v_before, 0, true;
    return;
  end if;

  if p_amount > 0 then
    perform app.grant_credits(p_workspace_id, p_amount, 'adjustment', v_key, null, null, v_reason);
    v_entries := 1;
  else
    select coalesce(sum(g.remaining - g.reserved), 0) into v_available
    from public.credit_grants g
    where g.workspace_id = p_workspace_id and g.starts_at <= now() and (g.expires_at is null or g.expires_at > now());
    if v_available < -p_amount then
      raise exception using
        errcode = 'object_not_in_prerequisite_state',
        message = format('O ajuste deixaria o saldo negativo: disponível %s, débito %s.', app.format_credits(v_available), app.format_credits(-p_amount));
    end if;
    v_left := -p_amount;
    for v_grant in
      select g.id, g.remaining - g.reserved as free
      from public.credit_grants g
      where g.workspace_id = p_workspace_id and g.starts_at <= now() and (g.expires_at is null or g.expires_at > now())
        and g.remaining - g.reserved > 0
      order by g.expires_at nulls last, g.starts_at, g.id
      for update
    loop
      exit when v_left <= 0;
      v_take := least(v_grant.free, v_left);
      insert into public.credit_ledger (workspace_id, account_id, entry_type, grant_id, amount, idempotency_key, note, metadata)
      values (p_workspace_id, v_account.id, 'adjustment', v_grant.id, -v_take, v_key || ':' || v_grant.id, v_reason,
              jsonb_build_object('platform_admin', true));
      update public.credit_grants g set remaining = g.remaining - v_take where g.id = v_grant.id;
      v_left := v_left - v_take;
      v_entries := v_entries + 1;
    end loop;
  end if;

  perform app.admin_audit(
    'credits.adjusted', p_workspace_id, 'credit_account', v_account.id::text,
    jsonb_build_object(
      'reason', v_reason, 'amount', p_amount, 'balance_before', v_before,
      'balance_after', app.credit_balance(p_workspace_id), 'idempotency_key', p_idempotency_key
    )
  );
  return query select v_before, app.credit_balance(p_workspace_id), v_entries, false;
end;
$$;

create or replace function app.admin_plan_version(
  p_slug text,
  p_credits numeric,
  p_cycle text,
  p_validity_days integer,
  p_amount numeric,
  p_currency text,
  p_provisional boolean,
  p_approved_commercially boolean,
  p_for_sale boolean,
  p_reason text
)
returns public.plan_versions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_plan public.plans;
  v_previous public.plan_versions;
  v_version public.plan_versions;
  v_price public.plan_prices;
  v_now timestamptz := clock_timestamp();
begin
  perform app.admin_require();
  v_reason := app.admin_reason(p_reason);
  select p.* into v_plan from public.plans p where p.slug = p_slug for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Plano não encontrado.';
  end if;
  if p_approved_commercially and p_provisional then
    raise exception using errcode = 'invalid_parameter_value', message = 'Preço aprovado comercialmente não pode estar marcado como provisório.';
  end if;
  if p_for_sale and not p_approved_commercially then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Só vai à venda com o preço aprovado comercialmente.';
  end if;
  if p_for_sale and p_amount is null and not exists (
    select 1 from public.plan_prices pp
    where pp.plan_id = v_plan.id and pp.approved_commercially and not pp.provisional
      and pp.valid_from = (select max(x.valid_from) from public.plan_prices x where x.plan_id = v_plan.id)
  ) then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Só vai à venda com o preço em dinheiro aprovado comercialmente.';
  end if;
  select v.* into v_previous from public.plan_versions v where v.plan_id = v_plan.id order by v.version desc limit 1;

  insert into public.plan_versions (plan_id, version, credits, cycle, validity_days, valid_from, provisional, approved_commercially)
  values (v_plan.id, coalesce(v_previous.version, 0) + 1, p_credits, p_cycle, p_validity_days, v_now, p_provisional, p_approved_commercially)
  returning * into v_version;
  if p_amount is not null then
    insert into public.plan_prices (plan_id, amount, currency, valid_from, provisional, approved_commercially)
    values (v_plan.id, p_amount, coalesce(p_currency, 'BRL'), v_now, p_provisional, p_approved_commercially)
    returning * into v_price;
  end if;
  update public.plans p set for_sale = p_for_sale where p.id = v_plan.id;

  perform app.admin_audit(
    'admin.plan_versioned', null, 'plan_version', v_version.id::text,
    jsonb_build_object(
      'reason', v_reason, 'plan', p_slug, 'version', v_version.version, 'previous_version', v_previous.version,
      'credits', p_credits, 'cycle', p_cycle, 'validity_days', p_validity_days, 'amount', p_amount,
      'provisional', p_provisional, 'approved_commercially', p_approved_commercially, 'for_sale', p_for_sale
    )
  );
  return v_version;
end;
$$;

create or replace function app.admin_run_requeue(p_run_id uuid, p_reason text)
returns public.runs
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_run public.runs;
  v_before public.run_status;
  v_msg_id bigint;
begin
  perform app.admin_require();
  v_reason := app.admin_reason(p_reason);
  select r.* into v_run from public.runs r where r.id = p_run_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Run não encontrado.';
  end if;
  if v_run.status not in ('failed', 'cancelled') then
    raise exception using errcode = 'object_not_in_prerequisite_state',
      message = format('Só run que falhou ou foi cancelado volta à fila; este está em %s.', v_run.status);
  end if;
  if exists (select 1 from public.credit_holds h where h.run_id = p_run_id) then
    raise exception using errcode = 'object_not_in_prerequisite_state',
      message = 'Este run já reservou créditos: a reserva é uma por run, então ele não volta à fila; peça o trabalho de novo.';
  end if;
  v_before := v_run.status;
  update public.runs r
  set status = 'queued', attempts = 0, error = null, started_at = null, finished_at = null
  where r.id = p_run_id
  returning * into v_run;
  v_msg_id := app.enqueue_run(p_run_id);
  perform app.admin_audit(
    'run.requeued_by_support', v_run.workspace_id, 'run', p_run_id::text,
    jsonb_build_object('reason', v_reason, 'before', v_before, 'queue', app.run_queue_name(v_run.kind), 'msg_id', v_msg_id)
  );
  return v_run;
end;
$$;
