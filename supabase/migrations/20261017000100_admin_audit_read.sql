-- SA1 — Auditoria no painel sem política em audit_events. A S0 garante que audit_events não tem política
-- (nenhum papel da Data API ou da API passa pela RLS: 05_audit_events.test.sql); a 20261017000000 tinha
-- criado audit_events_platform_admin_read e o GRANT de leitura ao papel do painel. Os dois saem: o painel lê
-- a auditoria só por app.admin_audit_events, que confere platform_admins, como app.admin_audit já faz para
-- gravar.

drop policy audit_events_platform_admin_read on public.audit_events;
revoke select on public.audit_events from hellosquad_admin;

-- actor: platform_admin (gesto do painel, marcado por app.admin_audit), customer (pessoa da conta) ou system
-- (agentes, worker, agendador). category: tipo da tela de Auditoria, pelo prefixo da ação.
create function app.admin_audit_events(
  p_actor text default null,
  p_workspace_id uuid default null,
  p_category text default null,
  p_since date default null,
  p_until date default null,
  p_cursor_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 50
)
returns table (
  id uuid, created_at timestamptz, actor text, actor_type text, actor_id text, workspace_id uuid,
  workspace_name text, category text, action text, entity_type text, entity_id text, payload jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_platform_admin() then
    raise exception using errcode = 'insufficient_privilege', message = 'Só Super Admin lê a auditoria do painel.';
  end if;
  return query
    with ev as (
      select a.*,
             case
               when coalesce((a.payload ->> 'platform_admin')::boolean, false) then 'platform_admin'
               when a.actor_type = 'user' then 'customer'
               else 'system'
             end as actor_kind,
             case
               when a.action like 'support.%' then 'support_access'
               when a.action like 'approval.%' then 'approval'
               when a.action like 'memory%' then 'memory'
               when a.action like 'work_item.%' or a.action like 'project%' or a.action like 'run.%' then 'work'
               when a.action like 'conversation.%' or a.action like 'message.%' then 'conversation'
               when a.action like 'workspace.%' or a.action like 'membership.%' or a.action like 'invitation.%'
                 then 'account'
               when a.action like 'contacts.%' then 'contacts'
               when a.action like 'credit%' then 'ledger'
               when a.action like 'billing.%' or a.action like 'payment.%' or a.action like 'subscription.%'
                 then 'billing'
               when a.action like 'admin.%' then 'configuration'
               else 'other'
             end as category_code
      from public.audit_events a
      where (p_workspace_id is null or a.workspace_id = p_workspace_id)
        and (p_since is null or a.created_at >= (p_since::timestamp at time zone 'America/Sao_Paulo'))
        and (p_until is null or a.created_at < ((p_until + 1)::timestamp at time zone 'America/Sao_Paulo'))
        and (p_cursor_at is null or (a.created_at, a.id) < (p_cursor_at, p_cursor_id))
    )
    select ev.id, ev.created_at, ev.actor_kind, ev.actor_type::text, ev.actor_id, ev.workspace_id, w.name,
           ev.category_code, ev.action, ev.entity_type, ev.entity_id, ev.payload
    from ev
    left join public.workspaces w on w.id = ev.workspace_id
    where (p_actor is null or ev.actor_kind = p_actor)
      and (p_category is null or ev.category_code = p_category)
    order by ev.created_at desc, ev.id desc
    limit least(greatest(coalesce(p_limit, 50), 1), 201);
end;
$$;
comment on function app.admin_audit_events(text, uuid, text, date, date, timestamptz, uuid, integer) is
  'Auditoria do painel (SA1): só Super Admin; audit_events continua sem política (S0).';
revoke all on function app.admin_audit_events(text, uuid, text, date, date, timestamptz, uuid, integer)
  from public, anon, authenticated, service_role;
grant execute on function app.admin_audit_events(text, uuid, text, date, date, timestamptz, uuid, integer)
  to hellosquad_admin;
