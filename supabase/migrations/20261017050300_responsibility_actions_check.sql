-- S3b — defesa no banco para o nível por ação: só "Publicar no Instagram" pode nascer autorizada, e só pela opção
-- "Publicar sozinho o que eu aprovar no plano" (auto_publish) de plan e posts. Nenhuma outra ação (anúncios,
-- verba, envio de mensagens) fica autorizada por proposta, nem por chamada direta à função (Data API local).

create function app.responsibility_actions_valid(
  p_actions jsonb, p_template public.responsibility_template, p_auto_publish boolean
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_actions) = 'array' and not exists (
    select 1
    from jsonb_array_elements(p_actions) a
    where jsonb_typeof(a) <> 'object'
       or coalesce(a ->> 'level', '') not in ('analyze', 'prepare', 'execute', 'never')
       or (
         coalesce(a ->> 'granted', 'false') = 'true'
         and not (
           a ->> 'action' = 'publish_instagram' and a ->> 'requirement' = 'authorized_plan'
           and p_auto_publish and p_template in ('plan', 'posts')
         )
       )
  )
$$;

alter table public.responsibilities
  add constraint responsibilities_actions_valid check (app.responsibility_actions_valid(actions, template, auto_publish));
alter table public.responsibility_proposals
  add constraint responsibility_proposals_actions_valid check (
    app.responsibility_actions_valid(
      coalesce(spec -> 'actions', '[]'::jsonb), template, coalesce((spec ->> 'auto_publish')::boolean, false)
    )
  );

revoke all on function app.responsibility_actions_valid(jsonb, public.responsibility_template, boolean)
  from public, anon, authenticated, service_role;
