-- S2c — a reflexão recebe o briefing que guiou o trabalho: o que o Nexo extraiu e entregou ao
-- especialista (passo squad.delegar do run mais recente); sem triagem, o briefing do trabalho.

create or replace function app.enqueue_reflection(
  p_work_item_id uuid,
  p_outcome public.reflection_outcome,
  p_approval_id uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_item public.work_items;
  v_agent public.agent_id;
  v_refs jsonb;
  v_id uuid;
begin
  select w.* into v_item from public.work_items w where w.id = p_work_item_id;
  if not found or v_item.delivery_type is null then
    return null;
  end if;
  v_agent := app.delivery_type_agent(v_item.delivery_type);

  v_refs := jsonb_build_object(
    'work_item', jsonb_build_object(
      'id', v_item.id, 'title', v_item.title, 'delivery_type', v_item.delivery_type,
      'briefing', coalesce((
        select s.payload->'briefing'
        from public.run_steps s
        join public.runs r on r.id = s.run_id and r.workspace_id = s.workspace_id
        where r.work_item_id = v_item.id
          and s.payload->>'tool' = 'squad.delegar'
          and s.payload ? 'briefing'
        order by r.created_at desc, s.seq desc
        limit 1
      ), v_item.briefing)
    ),
    'versions', coalesce((
      select jsonb_agg(
               jsonb_build_object('id', v.id, 'version_no', v.version_no, 'status', v.status)
               order by v.version_no
             )
      from public.delivery_versions v
      join public.deliveries d on d.id = v.delivery_id
      where d.work_item_id = v_item.id
    ), '[]'::jsonb),
    'corrections', coalesce((
      select jsonb_agg(
               jsonb_strip_nulls(jsonb_build_object(
                 'approval_id', a.id, 'decision', a.decision, 'follow_up', a.follow_up, 'note', a.note,
                 'delivery_version_id', a.delivery_version_id, 'decided_at', a.decided_at
               ))
               order by a.decided_at, a.id
             )
      from public.approvals a
      where a.work_item_id = v_item.id
        and a.kind in ('review', 'approve')
        and a.status = 'decided'
        and a.decision in ('changes_requested', 'rejected')
    ), '[]'::jsonb),
    'decision', (
      select jsonb_strip_nulls(jsonb_build_object(
               'approval_id', a.id, 'decision', a.decision, 'follow_up', a.follow_up, 'note', a.note,
               'delivery_version_id', a.delivery_version_id, 'decided_at', a.decided_at
             ))
      from public.approvals a
      where a.id = p_approval_id
    )
  );

  insert into public.memory_reflections (
    workspace_id, work_item_id, agent_id, delivery_type, outcome, approval_id, idempotency_key, refs
  )
  values (
    v_item.workspace_id, v_item.id, v_agent, v_item.delivery_type, p_outcome, p_approval_id,
    coalesce('approval:' || p_approval_id, 'cancel:' || v_item.id), jsonb_strip_nulls(v_refs)
  )
  on conflict (workspace_id, idempotency_key) do nothing
  returning id into v_id;

  if v_id is not null then
    perform pgmq.send(
      'memory_reflect',
      jsonb_build_object(
        'reflection_id', v_id, 'workspace_id', v_item.workspace_id, 'work_item_id', v_item.id,
        'agent_id', v_agent, 'delivery_type', v_item.delivery_type, 'outcome', p_outcome,
        'refs', jsonb_strip_nulls(v_refs)
      )
    );
  end if;
  return v_id;
end;
$$;
