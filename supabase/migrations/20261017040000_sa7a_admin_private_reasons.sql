-- SA7a (H-SA-01): os motivos internos do Super Admin saem das tabelas do produto. `delivery_prices.note`
-- (lida por qualquer autenticado) e `workspaces.suspension_reason` (lida pelos membros do negócio) vão para
-- tabelas do painel: RLS forçada, sem GRANT para anon/authenticated/service_role, leitura só de
-- hellosquad_admin com o JWT de um Super Admin. A escrita continua só pelas funções app.admin_* e o motivo
-- segue também em audit_events. As rotas /admin/* devolvem o mesmo que antes.

create table public.delivery_price_notes (
  price_id uuid primary key references public.delivery_prices (id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);
comment on table public.delivery_price_notes is 'Motivo interno do Super Admin ao versionar um preço (também em audit_events). Só o painel lê.';

create table public.workspace_suspension_reasons (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);
comment on table public.workspace_suspension_reasons is 'Motivo interno da suspensão em vigor (também em audit_events). Só o painel lê; sai na reativação.';

do $$
declare
  v_table text;
begin
  foreach v_table in array array['delivery_price_notes', 'workspace_suspension_reasons'] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', v_table);
    execute format('grant select on public.%I to hellosquad_admin', v_table);
    execute format(
      'create policy %I on public.%I for select to hellosquad_admin using ((select app.is_platform_admin()))',
      v_table || '_platform_admin_read', v_table
    );
  end loop;
end;
$$;

insert into public.delivery_price_notes (price_id, note, created_at)
select id, note, created_at from public.delivery_prices where note is not null;

insert into public.workspace_suspension_reasons (workspace_id, reason, created_at)
select id, suspension_reason, coalesce(suspended_at, now()) from public.workspaces where suspension_reason is not null;

alter table public.workspaces drop constraint workspaces_suspension_consistent;
alter table public.workspaces drop column suspension_reason;
alter table public.delivery_prices drop column note;

create or replace function app.admin_catalog_price(
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

  insert into public.delivery_prices (delivery_type, depth, credits, revision_credits, valid_from, approved_commercially, provisional)
  values (p_delivery_type, v_item.depth, p_credits, p_revision_credits, clock_timestamp(), p_approved_commercially, p_provisional)
  returning * into v_price;
  insert into public.delivery_price_notes (price_id, note) values (v_price.id, v_reason);

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

-- O retorno deixa de ser a linha de workspaces (que não tem mais o motivo): mesmas três colunas que a API lê.
drop function app.admin_set_workspace_suspended(uuid, boolean, text);
create function app.admin_set_workspace_suspended(p_workspace_id uuid, p_suspended boolean, p_reason text)
returns table (id uuid, suspended_at timestamptz, suspension_reason text)
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
  set suspended_at = case when p_suspended then now() end
  where w.id = p_workspace_id
  returning * into v_workspace;
  if p_suspended then
    insert into public.workspace_suspension_reasons as r (workspace_id, reason)
    values (p_workspace_id, v_reason)
    on conflict on constraint workspace_suspension_reasons_pkey
      do update set reason = excluded.reason, created_at = now();
  else
    delete from public.workspace_suspension_reasons r where r.workspace_id = p_workspace_id;
  end if;

  perform app.admin_audit(
    case when p_suspended then 'workspace.suspended' else 'workspace.reactivated' end,
    p_workspace_id, 'workspace', p_workspace_id::text,
    jsonb_build_object('reason', v_reason)
  );
  return query select v_workspace.id, v_workspace.suspended_at, case when p_suspended then v_reason end;
end;
$$;
revoke all on function app.admin_set_workspace_suspended(uuid, boolean, text) from public, anon, authenticated, service_role;
grant execute on function app.admin_set_workspace_suspended(uuid, boolean, text) to hellosquad_admin;
