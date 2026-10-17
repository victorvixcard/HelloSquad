-- SA7a (H-SA-09): a API não abre sessão de suporte em conta suspensa, como o SA0 e a tela da SA6b (commit
-- 9711b69) já fazem. SQLSTATE HS423 → 423 `workspace_suspended`. O resto da função é o da SA6a.

create or replace function app.admin_support_session_start(p_workspace_id uuid, p_reason text, p_minutes integer)
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
  if v_workspace.suspended_at is not null then
    raise exception using errcode = 'HS423', message = 'Esta conta está suspensa: reative-a antes de abrir uma sessão de suporte.';
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
