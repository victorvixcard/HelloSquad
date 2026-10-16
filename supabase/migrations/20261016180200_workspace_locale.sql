-- S2b (pedido da A2a) — idioma do negócio pela API (ADR-0010: idioma por workspace e por usuário no banco).
-- `workspaces.locale` existe desde a S1c e é o idioma em que os agentes respondem; até aqui só mudava no banco.
-- `app.set_workspace_locale`: owner ou admin trocam o idioma do workspace (pt-BR, en, es), com auditoria.
-- O idioma da pessoa fica no cadastro dela (auth.users, user_metadata.locale, gravado pelo web) e sai no GET /me.

create function app.set_workspace_locale(p_workspace_id uuid, p_locale text)
returns public.workspaces
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_before text;
  v_workspace public.workspaces;
begin
  if v_user_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  if p_workspace_id is null or p_workspace_id not in (select app.current_user_workspace_ids()) then
    raise exception using errcode = 'no_data_found', message = 'Workspace não encontrado.';
  end if;
  if not app.has_role(p_workspace_id, 'admin') then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono ou um admin muda o idioma do negócio.';
  end if;
  if p_locale is null or p_locale not in ('pt-BR', 'en', 'es') then
    raise exception using errcode = 'invalid_parameter_value', message = 'Idioma não suportado (pt-BR, en ou es).';
  end if;

  select w.locale into v_before from public.workspaces w where w.id = p_workspace_id;
  update public.workspaces w set locale = p_locale where w.id = p_workspace_id
  returning * into v_workspace;

  if v_before is distinct from p_locale then
    insert into public.audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, payload)
    values (
      p_workspace_id, 'user', v_user_id::text, 'workspace.locale_changed', 'workspace', p_workspace_id::text,
      jsonb_build_object('from', v_before, 'to', p_locale)
    );
  end if;
  return v_workspace;
end;
$$;

revoke all on function app.set_workspace_locale(uuid, text) from public, anon, service_role;
grant execute on function app.set_workspace_locale(uuid, text) to authenticated;
