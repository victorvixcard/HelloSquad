-- S1c — runtime do squad v0: idioma do workspace, versões de prompt dos agentes, tentativas do run e
-- mensagem de agente gravada pelo worker.
-- workspaces.locale (ADR-0010): o runtime instrui o agente a responder no idioma do workspace.
-- agent_prompt_versions: uma linha por conteúdo distinto de squad/ que um agente usou (regras
-- compartilhadas + agent.yaml + SOUL.md + skill da delivery). runs.prompt_version guarda o hash e aponta
-- para a linha do agente do run. Tabela global (sem workspace_id), só do papel privilegiado.
-- runs.attempts: quantas vezes o worker reivindicou o run (limite de tentativas com backoff).
-- app.post_agent_message: única escrita de mensagem de agente; o worker passa o workspace_id explícito.

alter table public.workspaces
  add column locale text not null default 'pt-BR',
  add constraint workspaces_locale_supported check (locale in ('pt-BR', 'en', 'es'));
comment on column public.workspaces.locale is 'Idioma do workspace (ADR-0010). Os agentes respondem nele.';

create table public.agent_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id public.agent_id not null,
  content_hash text not null,
  delivery_type text,
  files jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint agent_prompt_versions_agent_hash_key unique (agent_id, content_hash),
  constraint agent_prompt_versions_hash_format check (content_hash ~ '^[0-9a-f]{64}$'),
  constraint agent_prompt_versions_files_object check (jsonb_typeof(files) = 'object')
);
comment on table public.agent_prompt_versions is 'Versões dos prompts dos agentes (conteúdo de squad/). Somente inserção, pelo worker.';
comment on column public.agent_prompt_versions.files is 'Arquivo de squad/ → sha256 do conteúdo usado nesta versão.';

alter table public.agent_prompt_versions enable row level security;
alter table public.agent_prompt_versions force row level security;
revoke all on table public.agent_prompt_versions from public, anon, authenticated, service_role;

alter table public.runs
  add column attempts integer not null default 0,
  add constraint runs_attempts_non_negative check (attempts >= 0),
  add constraint runs_prompt_version_fk foreign key (agent_id, prompt_version)
    references public.agent_prompt_versions (agent_id, content_hash);
create index runs_prompt_version_idx on public.runs (agent_id, prompt_version) where prompt_version is not null;

-- Mensagem de agente na conversa do trabalho. Uso do papel privilegiado (worker); authenticated não
-- executa. A conversa precisa ser do workspace informado (mesma resposta para outro workspace e para
-- inexistente) e estar ativa.
create function app.post_agent_message(
  p_workspace_id uuid,
  p_conversation_id uuid,
  p_agent_id public.agent_id,
  p_run_id uuid,
  p_body text,
  p_attachments jsonb default '[]'::jsonb
)
returns public.messages
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_conversation public.conversations;
  v_body text := btrim(coalesce(p_body, ''));
  v_message public.messages;
begin
  select c.* into v_conversation
  from public.conversations c
  where c.id = p_conversation_id and c.workspace_id = p_workspace_id;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Conversa não encontrada.';
  end if;
  if v_conversation.archived_at is not null then
    raise exception using errcode = 'object_not_in_prerequisite_state', message = 'Esta conversa está arquivada.';
  end if;
  if v_body = '' then
    raise exception using errcode = 'invalid_parameter_value', message = 'A mensagem não pode ficar vazia.';
  end if;
  if char_length(v_body) > 20000 then
    raise exception using errcode = 'invalid_parameter_value', message = 'A mensagem passou de 20.000 caracteres.';
  end if;
  if jsonb_typeof(coalesce(p_attachments, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = 'invalid_parameter_value', message = 'Os anexos precisam ser uma lista JSON.';
  end if;

  insert into public.messages (
    workspace_id, conversation_id, author_type, author_agent_id, run_id, body, attachments
  ) values (
    p_workspace_id, p_conversation_id, 'agent', p_agent_id, p_run_id, v_body, coalesce(p_attachments, '[]'::jsonb)
  )
  returning * into v_message;

  update public.conversations
  set last_message_at = greatest(coalesce(last_message_at, v_message.created_at), v_message.created_at)
  where id = p_conversation_id;

  insert into public.conversation_participants (workspace_id, conversation_id, participant_type, agent_id)
  values (p_workspace_id, p_conversation_id, 'agent', p_agent_id)
  on conflict (conversation_id, agent_id) do nothing;

  return v_message;
end;
$$;

revoke all on function app.post_agent_message(uuid, uuid, public.agent_id, uuid, text, jsonb)
  from public, anon, authenticated, service_role;
