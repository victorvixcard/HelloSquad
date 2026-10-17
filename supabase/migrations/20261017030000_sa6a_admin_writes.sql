-- SA6a — Escrita do Super Admin e sessão de suporte. Plano: docs/PLANO_DE_ACAO_SA.md (linha SA6) e as
-- leituras conservadoras das perguntas ao dono: sessão de suporte só leitura, 15/30/60 min, dono avisado
-- por e-mail; ajuste de crédito sem limite, sempre com motivo e auditoria; suspender pausa cobrança e
-- rotinas, não cancela; "à venda" exige homologação concluída e preço aprovado.
--
-- Toda escrita passa por uma função SECURITY DEFINER que confere app.is_platform_admin(), exige motivo de
-- 10 a 500 caracteres e grava audit_events por app.admin_audit (quem, quando, motivo). Só hellosquad_admin
-- executa; anon, authenticated e service_role não.
--
-- Sessão de suporte: o Super Admin lê o negócio pela API do produto como um membro "viewer", só numa
-- transação READ ONLY aberta pela API (app.support_session_enter). O Postgres recusa qualquer escrita nessa
-- transação, inclusive dentro de funções SECURITY DEFINER; app.has_role (políticas de escrita) não muda.

-- ---------------------------------------------------------------------------------------------------
-- Motivo: regra única
-- ---------------------------------------------------------------------------------------------------

create function app.admin_reason(p_reason text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_reason is null or char_length(btrim(p_reason)) not between 10 and 500 then
    raise exception using errcode = 'invalid_parameter_value', message = 'O motivo precisa ter de 10 a 500 caracteres.';
  end if;
  return btrim(p_reason);
end;
$$;
revoke all on function app.admin_reason(text) from public, anon, authenticated, service_role;

create function app.admin_require()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_platform_admin() then
    raise exception using errcode = 'insufficient_privilege', message = 'Só Super Admin grava pelo painel.';
  end if;
  return (select auth.uid());
end;
$$;
revoke all on function app.admin_require() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------
-- Suspensão da conta: pausa cobrança e rotinas; a assinatura não é cancelada
-- ---------------------------------------------------------------------------------------------------

alter table public.workspaces
  add column suspended_at timestamptz,
  add column suspension_reason text,
  add constraint workspaces_suspension_consistent check ((suspended_at is null) = (suspension_reason is null));
comment on column public.workspaces.suspended_at is 'Conta suspensa pelo Super Admin (nulo = ativa). Pausa a renovação da cobrança e as rotinas; a assinatura e os dados ficam.';
comment on column public.workspaces.suspension_reason is 'Motivo da suspensão (também em audit_events).';

create function app.workspace_is_suspended(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.workspaces w where w.id = p_workspace_id and w.suspended_at is not null)
$$;
revoke all on function app.workspace_is_suspended(uuid) from public, anon, service_role;
grant execute on function app.workspace_is_suspended(uuid) to authenticated, hellosquad_admin, hellosquad_api;

create function app.admin_set_workspace_suspended(p_workspace_id uuid, p_suspended boolean, p_reason text)
returns public.workspaces
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_workspace public.workspaces;
begin
  perform app.admin_require();
  v_reason := app.admin_reason(p_reason);
  select w.* into v_workspace from public.workspaces w where w.id = p_workspace_id and w.deleted_at is null for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Conta não encontrada.';
  end if;
  if p_suspended and v_workspace.suspended_at is not null then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'A conta já está suspensa.';
  end if;
  if not p_suspended and v_workspace.suspended_at is null then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'A conta não está suspensa.';
  end if;

  update public.workspaces w
  set suspended_at = case when p_suspended then now() end,
      suspension_reason = case when p_suspended then v_reason end
  where w.id = p_workspace_id
  returning * into v_workspace;

  perform app.admin_audit(
    case when p_suspended then 'workspace.suspended' else 'workspace.reactivated' end,
    p_workspace_id, 'workspace', p_workspace_id::text,
    jsonb_build_object('reason', v_reason)
  );
  return v_workspace;
end;
$$;
revoke all on function app.admin_set_workspace_suspended(uuid, boolean, text) from public, anon, authenticated, service_role;
grant execute on function app.admin_set_workspace_suspended(uuid, boolean, text) to hellosquad_admin;

-- Cobrança: a renovação não olha assinatura de conta suspensa (a assinatura segue como está).
create or replace function app.billing_due_subscriptions(
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
  join public.workspaces w on w.id = s.workspace_id
  where s.status in ('active', 'past_due')
    and s.current_period_end <= p_at
    and (s.checked_at is null or s.checked_at <= p_at - p_recheck)
    and w.suspended_at is null
  order by s.current_period_end, s.id
  limit p_limit
$$;

-- Rotinas: run agendado de conta suspensa não entra na fila (SQLSTATE HS423 → 423 na API).
create or replace function app.enqueue_run(p_run_id uuid)
returns bigint
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_run public.runs;
  v_msg_id bigint;
begin
  select r.* into v_run from public.runs r where r.id = p_run_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Run não encontrado.';
  end if;
  if v_run.status <> 'queued' then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = format('Só run em queued entra na fila; este está em %s.', v_run.status);
  end if;
  if v_run.kind = 'scheduled' and app.workspace_is_suspended(v_run.workspace_id) then
    raise exception using errcode = 'HS423', message = 'Esta conta está suspensa: as rotinas estão pausadas.';
  end if;

  select pgmq.send(
    app.run_queue_name(v_run.kind),
    jsonb_strip_nulls(jsonb_build_object(
      'run_id', v_run.id,
      'workspace_id', v_run.workspace_id,
      'kind', v_run.kind,
      'agent_id', v_run.agent_id,
      'work_item_id', v_run.work_item_id,
      'conversation_id', v_run.conversation_id
    ))
  ) into v_msg_id;

  return v_msg_id;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Sessão de suporte ("entrar no ambiente do cliente")
-- ---------------------------------------------------------------------------------------------------

-- O registro só cresce: nada se apaga pelos papéis da API e da Data API (sem GRANT de DELETE/UPDATE) e o
-- único UPDATE aceito é gravar o fim uma vez (dono das tabelas: o encerramento por função).
create function app.support_access_log_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.ended_at is null and new.ended_at is not null
     and (to_jsonb(new) - 'ended_at') = (to_jsonb(old) - 'ended_at') then
    return new;
  end if;
  raise exception using
    errcode = 'insufficient_privilege',
    message = 'O registro de acesso do suporte é somente inserção: só o fim da sessão é gravado, uma vez.';
end;
$$;
create trigger support_access_log_guard
  before update on public.support_access_log
  for each row execute function app.support_access_log_guard();

create index support_access_log_open_idx on public.support_access_log (admin_id, expires_at)
  where ended_at is null;

alter type public.email_template add value if not exists 'support_session_started';

-- Aviso de segurança: o titular não desliga (como convite e senha).
alter table public.email_preferences drop constraint email_preferences_optional_template;
alter table public.email_preferences add constraint email_preferences_optional_template
  check (template::text not in ('invitation', 'password_changed', 'support_session_started'));

create function app.admin_support_session_start(p_workspace_id uuid, p_reason text, p_minutes integer)
returns public.support_access_log
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := app.admin_require();
  v_reason text := app.admin_reason(p_reason);
  v_workspace public.workspaces;
  v_session public.support_access_log;
begin
  if p_minutes is null or p_minutes not in (15, 30, 60) then
    raise exception using errcode = 'invalid_parameter_value', message = 'A sessão de suporte dura 15, 30 ou 60 minutos.';
  end if;
  select w.* into v_workspace from public.workspaces w where w.id = p_workspace_id and w.deleted_at is null;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Conta não encontrada.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('support:' || v_admin::text || ':' || p_workspace_id::text, 0));
  if exists (
    select 1 from public.support_access_log s
    where s.admin_id = v_admin and s.workspace_id = p_workspace_id and s.ended_at is null and s.expires_at > now()
  ) then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Já há uma sessão de suporte aberta nesta conta.';
  end if;

  insert into public.support_access_log (admin_id, workspace_id, reason, mode, started_at, expires_at)
  values (v_admin, p_workspace_id, v_reason, 'read_only', now(), now() + make_interval(mins => p_minutes))
  returning * into v_session;

  perform app.admin_audit(
    'support.session_started', p_workspace_id, 'support_access', v_session.id::text,
    jsonb_build_object('reason', v_reason, 'minutes', p_minutes, 'mode', v_session.mode, 'expires_at', v_session.expires_at)
  );

  perform app.enqueue_email(
    'support_session_started', p_workspace_id, o.user_id, o.email,
    jsonb_build_object(
      'workspace_name', v_workspace.name, 'workspace_slug', v_workspace.slug, 'recipient_name', o.full_name,
      'minutes', p_minutes, 'reason', v_reason, 'expires_at', v_session.expires_at
    ),
    'support:' || v_session.id || ':' || o.user_id
  )
  from app.workspace_owner_recipients(p_workspace_id) o;

  return v_session;
end;
$$;
revoke all on function app.admin_support_session_start(uuid, text, integer) from public, anon, authenticated, service_role;
grant execute on function app.admin_support_session_start(uuid, text, integer) to hellosquad_admin;

create function app.admin_support_session_end(p_workspace_id uuid)
returns public.support_access_log
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := app.admin_require();
  v_session public.support_access_log;
begin
  update public.support_access_log s
  set ended_at = now()
  where s.id = (
    select o.id from public.support_access_log o
    where o.admin_id = v_admin and o.workspace_id = p_workspace_id and o.ended_at is null and o.expires_at > now()
    order by o.started_at desc
    limit 1
  )
  returning * into v_session;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Não há sessão de suporte aberta nesta conta.';
  end if;
  perform app.admin_audit(
    'support.session_ended', p_workspace_id, 'support_access', v_session.id::text,
    jsonb_build_object('reason', v_session.reason, 'ended_early', v_session.ended_at < v_session.expires_at)
  );
  return v_session;
end;
$$;
revoke all on function app.admin_support_session_end(uuid) from public, anon, authenticated, service_role;
grant execute on function app.admin_support_session_end(uuid) to hellosquad_admin;

-- Chamada pela API no começo das transações de leitura (GET) do produto: se quem está no JWT é Super Admin
-- com sessão aberta, a transação passa a READ ONLY e marca a leitura do suporte. Para todos os outros não
-- muda nada.
create function app.support_session_enter()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.support_access_log s
    join public.platform_admins pa on pa.user_id = s.admin_id
    where s.admin_id = (select auth.uid()) and s.ended_at is null and s.expires_at > now()
  ) then
    return false;
  end if;
  perform set_config('transaction_read_only', 'on', true);
  perform set_config('hellosquad.support_read', 'on', true);
  return true;
end;
$$;
revoke all on function app.support_session_enter() from public, anon, service_role;
grant execute on function app.support_session_enter() to authenticated;

-- Para o erro honesto da API: 'read_only' (sessão aberta, pedido de escrita), 'none' (Super Admin sem
-- sessão nesta conta) ou nulo (não é Super Admin: vale o 404 de sempre).
create function app.support_session_state(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not app.is_platform_admin() then null
    when exists (
      select 1 from public.support_access_log s
      where s.admin_id = (select auth.uid()) and s.workspace_id = p_workspace_id
        and s.ended_at is null and s.expires_at > now()
    ) then 'read_only'
    else 'none'
  end
$$;
revoke all on function app.support_session_state(uuid) from public, anon, service_role;
grant execute on function app.support_session_state(uuid) to authenticated;

-- Leitura do produto: o negócio da sessão entra como "viewer" só em transação READ ONLY marcada pela API.
-- has_role (escrita) não muda; escrita numa transação READ ONLY o Postgres recusa (25006).
create or replace function app.current_user_workspace_ids(p_min_role public.workspace_role default 'viewer')
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.workspace_id
  from public.memberships m
  join public.workspaces w on w.id = m.workspace_id
  where m.user_id = (select auth.uid())
    and w.deleted_at is null
    and app.role_rank(m.role) >= app.role_rank(p_min_role)
  union
  select s.workspace_id
  from public.support_access_log s
  join public.workspaces w on w.id = s.workspace_id
  join public.platform_admins pa on pa.user_id = s.admin_id
  where p_min_role = 'viewer'
    and current_setting('transaction_read_only') = 'on'
    and current_setting('hellosquad.support_read', true) = 'on'
    and s.admin_id = (select auth.uid())
    and s.ended_at is null
    and s.expires_at > now()
    and w.deleted_at is null
$$;

-- ---------------------------------------------------------------------------------------------------
-- Ajuste manual de crédito (sem limite; motivo e auditoria; o saldo disponível nunca fica negativo)
-- ---------------------------------------------------------------------------------------------------

create function app.admin_adjust_credits(
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
    where l.workspace_id = p_workspace_id and (l.idempotency_key = v_key or l.idempotency_key like v_key || ':%')
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
revoke all on function app.admin_adjust_credits(uuid, numeric, text, text) from public, anon, authenticated, service_role;
grant execute on function app.admin_adjust_credits(uuid, numeric, text, text) to hellosquad_admin;

-- ---------------------------------------------------------------------------------------------------
-- Catálogo, planos e recargas: versão nova a cada gravação (as passadas são imutáveis por trigger)
-- ---------------------------------------------------------------------------------------------------

create function app.admin_catalog_price(
  p_delivery_type text,
  p_credits numeric,
  p_revision_credits numeric,
  p_provisional boolean,
  p_approved_commercially boolean,
  p_reason text
)
returns public.delivery_prices
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_item public.delivery_catalog;
  v_previous public.delivery_prices;
  v_price public.delivery_prices;
begin
  perform app.admin_require();
  v_reason := app.admin_reason(p_reason);
  select c.* into v_item from public.delivery_catalog c where c.delivery_type = p_delivery_type for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Delivery não encontrada no catálogo.';
  end if;
  if p_credits is null or p_credits < 0 or (p_revision_credits is not null and p_revision_credits < 0) then
    raise exception using errcode = 'invalid_parameter_value', message = 'Preço em créditos precisa ser zero ou positivo.';
  end if;
  if p_approved_commercially and p_provisional then
    raise exception using errcode = 'invalid_parameter_value', message = 'Preço aprovado comercialmente não pode estar marcado como provisório.';
  end if;
  if v_item.for_sale and not p_approved_commercially then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Tire a delivery de venda antes de gravar um preço sem aprovação comercial.';
  end if;
  v_previous := app.current_delivery_price(p_delivery_type);

  insert into public.delivery_prices (delivery_type, depth, credits, revision_credits, valid_from, approved_commercially, provisional, note)
  values (p_delivery_type, v_item.depth, p_credits, p_revision_credits, clock_timestamp(), p_approved_commercially, p_provisional, v_reason)
  returning * into v_price;

  perform app.admin_audit(
    'admin.catalog_price_versioned', null, 'delivery_price', v_price.id::text,
    jsonb_build_object(
      'reason', v_reason, 'delivery_type', p_delivery_type,
      'before', jsonb_build_object('id', v_previous.id, 'credits', v_previous.credits, 'provisional', v_previous.provisional,
                                   'approved_commercially', v_previous.approved_commercially),
      'after', jsonb_build_object('credits', p_credits, 'revision_credits', p_revision_credits,
                                  'provisional', p_provisional, 'approved_commercially', p_approved_commercially)
    )
  );
  return v_price;
end;
$$;
revoke all on function app.admin_catalog_price(text, numeric, numeric, boolean, boolean, text) from public, anon, authenticated, service_role;
grant execute on function app.admin_catalog_price(text, numeric, numeric, boolean, boolean, text) to hellosquad_admin;

create function app.admin_catalog_homologation(p_delivery_type text, p_status text, p_reason text)
returns public.delivery_catalog
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_item public.delivery_catalog;
  v_before text;
begin
  perform app.admin_require();
  v_reason := app.admin_reason(p_reason);
  select c.* into v_item from public.delivery_catalog c where c.delivery_type = p_delivery_type for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Delivery não encontrada no catálogo.';
  end if;
  if v_item.for_sale and p_status <> 'homologated' then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Tire a delivery de venda antes de reabrir a homologação.';
  end if;
  v_before := v_item.homologation_status;
  update public.delivery_catalog c set homologation_status = p_status where c.delivery_type = p_delivery_type
  returning * into v_item;
  perform app.admin_audit(
    'admin.catalog_homologation_changed', null, 'delivery_catalog', p_delivery_type,
    jsonb_build_object('reason', v_reason, 'before', v_before, 'after', p_status)
  );
  return v_item;
end;
$$;
revoke all on function app.admin_catalog_homologation(text, text, text) from public, anon, authenticated, service_role;
grant execute on function app.admin_catalog_homologation(text, text, text) to hellosquad_admin;

create function app.admin_catalog_for_sale(p_delivery_type text, p_for_sale boolean, p_reason text)
returns public.delivery_catalog
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_item public.delivery_catalog;
  v_price public.delivery_prices;
begin
  perform app.admin_require();
  v_reason := app.admin_reason(p_reason);
  select c.* into v_item from public.delivery_catalog c where c.delivery_type = p_delivery_type for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Delivery não encontrada no catálogo.';
  end if;
  v_price := app.current_delivery_price(p_delivery_type);
  if p_for_sale and v_item.homologation_status <> 'homologated' then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Só vai à venda com a homologação concluída.';
  end if;
  if p_for_sale and (v_price.id is null or not v_price.approved_commercially or v_price.provisional) then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Só vai à venda com o preço aprovado comercialmente.';
  end if;
  update public.delivery_catalog c set for_sale = p_for_sale where c.delivery_type = p_delivery_type
  returning * into v_item;
  perform app.admin_audit(
    'admin.catalog_for_sale_changed', null, 'delivery_catalog', p_delivery_type,
    jsonb_build_object('reason', v_reason, 'for_sale', p_for_sale, 'price_id', v_price.id)
  );
  return v_item;
end;
$$;
revoke all on function app.admin_catalog_for_sale(text, boolean, text) from public, anon, authenticated, service_role;
grant execute on function app.admin_catalog_for_sale(text, boolean, text) to hellosquad_admin;

create function app.admin_plan_version(
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
revoke all on function app.admin_plan_version(text, numeric, text, integer, numeric, text, boolean, boolean, boolean, text) from public, anon, authenticated, service_role;
grant execute on function app.admin_plan_version(text, numeric, text, integer, numeric, text, boolean, boolean, boolean, text) to hellosquad_admin;

create function app.admin_topup_version(
  p_slug text,
  p_credits numeric,
  p_validity_days integer,
  p_amount numeric,
  p_currency text,
  p_provisional boolean,
  p_approved_commercially boolean,
  p_for_sale boolean,
  p_reason text
)
returns public.topup_packs
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_topup public.topups;
  v_pack public.topup_packs;
begin
  perform app.admin_require();
  v_reason := app.admin_reason(p_reason);
  select t.* into v_topup from public.topups t where t.slug = p_slug for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Recarga não encontrada.';
  end if;
  if p_approved_commercially and p_provisional then
    raise exception using errcode = 'invalid_parameter_value', message = 'Preço aprovado comercialmente não pode estar marcado como provisório.';
  end if;
  if p_for_sale and not p_approved_commercially then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Só vai à venda com o preço aprovado comercialmente.';
  end if;
  insert into public.topup_packs (slug, credits, validity_days, amount, currency, valid_from, provisional, approved_commercially)
  values (p_slug, p_credits, p_validity_days, p_amount, coalesce(p_currency, 'BRL'), clock_timestamp(), p_provisional, p_approved_commercially)
  returning * into v_pack;
  update public.topups t set for_sale = p_for_sale where t.id = v_topup.id;
  perform app.admin_audit(
    'admin.topup_versioned', null, 'topup_pack', v_pack.id::text,
    jsonb_build_object(
      'reason', v_reason, 'topup', p_slug, 'credits', p_credits, 'validity_days', p_validity_days, 'amount', p_amount,
      'provisional', p_provisional, 'approved_commercially', p_approved_commercially, 'for_sale', p_for_sale
    )
  );
  return v_pack;
end;
$$;
revoke all on function app.admin_topup_version(text, numeric, integer, numeric, text, boolean, boolean, boolean, text) from public, anon, authenticated, service_role;
grant execute on function app.admin_topup_version(text, numeric, integer, numeric, text, boolean, boolean, boolean, text) to hellosquad_admin;

-- ---------------------------------------------------------------------------------------------------
-- Fila: reenfileirar (falhou/cancelado) e cancelar (na fila/esperando aprovação), com motivo
-- ---------------------------------------------------------------------------------------------------

create function app.admin_run_requeue(p_run_id uuid, p_reason text)
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
revoke all on function app.admin_run_requeue(uuid, text) from public, anon, authenticated, service_role;
grant execute on function app.admin_run_requeue(uuid, text) to hellosquad_admin;

create function app.admin_run_cancel(p_run_id uuid, p_reason text)
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
begin
  perform app.admin_require();
  v_reason := app.admin_reason(p_reason);
  select r.* into v_run from public.runs r where r.id = p_run_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Run não encontrado.';
  end if;
  if v_run.status not in ('queued', 'waiting_approval') then
    raise exception using errcode = 'object_not_in_prerequisite_state',
      message = format('Só run na fila ou esperando aprovação é cancelado pelo painel; este está em %s.', v_run.status);
  end if;
  v_before := v_run.status;
  update public.runs r
  set status = 'cancelled',
      finished_at = greatest(now(), coalesce(r.started_at, now())),
      error = jsonb_build_object('code', 'cancelled_by_support', 'message', v_reason)
  where r.id = p_run_id
  returning * into v_run;
  perform app.admin_audit(
    'run.cancelled_by_support', v_run.workspace_id, 'run', p_run_id::text,
    jsonb_build_object('reason', v_reason, 'before', v_before)
  );
  return v_run;
end;
$$;
revoke all on function app.admin_run_cancel(uuid, text) from public, anon, authenticated, service_role;
grant execute on function app.admin_run_cancel(uuid, text) to hellosquad_admin;

-- ---------------------------------------------------------------------------------------------------
-- Pagamentos: conciliação marcada à mão (uma vez por webhook, só inserção) e auditoria do reprocessamento
-- ---------------------------------------------------------------------------------------------------

create table public.payment_reconciliations (
  id uuid primary key default gen_random_uuid(),
  payment_event_id uuid not null references public.payment_events (id) on delete cascade,
  admin_id uuid not null references public.platform_admins (user_id) on delete restrict,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint payment_reconciliations_event_key unique (payment_event_id),
  constraint payment_reconciliations_reason_length check (char_length(btrim(reason)) between 10 and 500)
);
comment on table public.payment_reconciliations is 'Conciliação marcada pelo Super Admin num webhook recebido (motivo obrigatório; também em audit_events). Só inserção.';
create index payment_reconciliations_admin_idx on public.payment_reconciliations (admin_id);
alter table public.payment_reconciliations enable row level security;
alter table public.payment_reconciliations force row level security;
revoke all on table public.payment_reconciliations from public, anon, authenticated, service_role;
grant select on public.payment_reconciliations to hellosquad_admin;
create policy payment_reconciliations_platform_admin_read on public.payment_reconciliations
  for select to hellosquad_admin using ((select app.is_platform_admin()));

create function app.payment_reconciliations_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from public.payment_events e where e.id = old.payment_event_id) then
    return old;
  end if;
  raise exception using errcode = 'insufficient_privilege', message = 'A conciliação marcada é somente inserção.';
end;
$$;
create trigger payment_reconciliations_immutable
  before update or delete on public.payment_reconciliations
  for each row execute function app.payment_reconciliations_immutable();

create function app.admin_payment_reconcile(p_event_id uuid, p_reason text)
returns public.payment_reconciliations
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := app.admin_require();
  v_reason text := app.admin_reason(p_reason);
  v_event public.payment_events;
  v_row public.payment_reconciliations;
begin
  select e.* into v_event from public.payment_events e where e.id = p_event_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Webhook não encontrado.';
  end if;
  insert into public.payment_reconciliations (payment_event_id, admin_id, reason)
  values (p_event_id, v_admin, v_reason)
  on conflict on constraint payment_reconciliations_event_key do nothing
  returning * into v_row;
  if v_row.id is null then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Este webhook já foi marcado como conciliado.';
  end if;
  perform app.admin_audit(
    'payment.reconciled', v_event.workspace_id, 'payment_event', p_event_id::text,
    jsonb_build_object('reason', v_reason, 'provider', v_event.provider, 'event_id', v_event.event_id,
                       'outcome', v_event.outcome, 'payment_id', v_event.payment_id)
  );
  return v_row;
end;
$$;
revoke all on function app.admin_payment_reconcile(uuid, text) from public, anon, authenticated, service_role;
grant execute on function app.admin_payment_reconcile(uuid, text) to hellosquad_admin;

-- O reprocessamento consulta o provedor e aplica o estado como evento de conciliação idempotente pela
-- app.billing_apply_event (papel hellosquad_billing); aqui só o registro de quem pediu e por quê.
create function app.admin_payment_reprocess_audit(
  p_event_id uuid,
  p_reason text,
  p_result jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_event public.payment_events;
begin
  perform app.admin_require();
  v_reason := app.admin_reason(p_reason);
  select e.* into v_event from public.payment_events e where e.id = p_event_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Webhook não encontrado.';
  end if;
  return app.admin_audit(
    'payment.webhook_reprocessed', v_event.workspace_id, 'payment_event', p_event_id::text,
    jsonb_build_object('reason', v_reason, 'provider', v_event.provider, 'event_id', v_event.event_id)
      || coalesce(p_result, '{}'::jsonb)
  );
end;
$$;
revoke all on function app.admin_payment_reprocess_audit(uuid, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function app.admin_payment_reprocess_audit(uuid, text, jsonb) to hellosquad_admin;
