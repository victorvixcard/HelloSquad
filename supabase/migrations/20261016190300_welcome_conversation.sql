-- S2c — primeira fala do Nexo no negócio novo (A2a §5 itens 3 e 4; V4.6: conversa "Boas-vindas" com o
-- Nexo e a pergunta do objetivo). O texto vem do catálogo do backend no idioma do negócio; o banco só grava.
--
-- app.start_welcome: quem cria o negócio (owner) abre a conversa direta com o Nexo e a fala dele entra como
-- mensagem de agente, sem run. Só vale na mesma transação que criou o workspace (created_at = now()): fora
-- dela ninguém escreve como o Nexo, nem pela Data API. Uma por workspace; repetir devolve a mesma conversa.
-- app.note_objective: depois que a pessoa conta o objetivo ("Adicionar conhecimento" com kind objective), o
-- Nexo responde na conversa de boas-vindas, na mesma transação que gravou o conhecimento (V4.6: "Anotei na
-- Memória da Marca: “…”. Já dá para pedir a primeira entrega.").

alter table public.conversations
  add column welcome boolean not null default false;
comment on column public.conversations.welcome is 'Conversa de boas-vindas do Nexo, aberta junto com o negócio (uma por workspace).';
create unique index conversations_welcome_key on public.conversations (workspace_id) where welcome;

create function app.start_welcome(p_workspace_id uuid, p_title text, p_body text)
returns public.conversations
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations;
begin
  if auth.uid() is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  if not app.has_role(p_workspace_id, 'owner') then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono da conta abre as boas-vindas.';
  end if;

  select c.* into v_conversation
  from public.conversations c
  where c.workspace_id = p_workspace_id and c.welcome;
  if found then
    return v_conversation;
  end if;

  if not exists (select 1 from public.workspaces w where w.id = p_workspace_id and w.created_at = now()) then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'As boas-vindas do Nexo nascem junto com o negócio.';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception using errcode = 'invalid_parameter_value', message = 'A fala de boas-vindas precisa de 1 a 2.000 caracteres.';
  end if;

  v_conversation := app.create_conversation(p_workspace_id, 'agent_direct', 'nexo', null, null, p_title);
  update public.conversations set welcome = true where id = v_conversation.id;
  perform app.post_agent_message(p_workspace_id, v_conversation.id, 'nexo', null, p_body, '[]'::jsonb);

  select c.* into v_conversation from public.conversations c where c.id = v_conversation.id;
  return v_conversation;
end;
$$;

create function app.note_objective(p_fact_id uuid, p_body text)
returns public.messages
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_fact public.brand_facts;
  v_conversation public.conversations;
begin
  if auth.uid() is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  select f.* into v_fact
  from public.brand_facts f
  where f.id = p_fact_id and f.workspace_id in (select app.current_user_workspace_ids());
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Conhecimento não encontrado.';
  end if;
  if not app.has_role(v_fact.workspace_id, 'owner') then
    raise exception using errcode = 'insufficient_privilege', message = 'Só o dono da conta toma esta decisão.';
  end if;
  if v_fact.created_at <> now() or v_fact.area <> 'business' then
    raise exception using
      errcode = 'object_not_in_prerequisite_state',
      message = 'O Nexo só anota o objetivo que acabou de ser contado.';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception using errcode = 'invalid_parameter_value', message = 'A resposta do Nexo precisa de 1 a 2.000 caracteres.';
  end if;

  select c.* into v_conversation
  from public.conversations c
  where c.workspace_id = v_fact.workspace_id and c.welcome and c.archived_at is null;
  if not found then
    return null;
  end if;
  return app.post_agent_message(v_fact.workspace_id, v_conversation.id, 'nexo', null, p_body, '[]'::jsonb);
end;
$$;

revoke all on function app.start_welcome(uuid, text, text), app.note_objective(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function app.start_welcome(uuid, text, text), app.note_objective(uuid, text)
  to authenticated;
