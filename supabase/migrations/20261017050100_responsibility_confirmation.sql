-- S3b — depois do ok do dono no cartão do combinado, o Nexo responde na conversa ("Delegado. Está no Modo
-- Autônomo… Primeira execução: …" ou "Atualizado. …"). O texto vem da API, no idioma do negócio; a função
-- grava uma vez só por proposta (idempotente) e só para proposta confirmada de um workspace do usuário.

alter table public.responsibility_proposals
  add column confirmation_message_id uuid,
  add constraint responsibility_proposals_confirmation_message_fk foreign key (workspace_id, confirmation_message_id)
    references public.messages (workspace_id, id) on delete set null (confirmation_message_id);

create function app.post_responsibility_confirmation(p_approval_id uuid, p_body text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_proposal public.responsibility_proposals;
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = 'insufficient_privilege', message = 'Usuário não autenticado.';
  end if;
  select p.* into v_proposal
  from public.responsibility_proposals p
  where p.approval_id = p_approval_id and p.workspace_id in (select app.current_user_workspace_ids())
  for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Proposta não encontrada.';
  end if;
  if v_proposal.status <> 'confirmed' or v_proposal.conversation_id is null then
    return null;
  end if;
  if v_proposal.confirmation_message_id is not null then
    return v_proposal.confirmation_message_id;
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception using errcode = 'invalid_parameter_value', message = 'Mensagem de confirmação inválida.';
  end if;
  insert into public.messages (workspace_id, conversation_id, author_type, author_agent_id, body)
  values (v_proposal.workspace_id, v_proposal.conversation_id, 'agent', 'nexo', btrim(p_body))
  returning id into v_message_id;
  update public.responsibility_proposals set confirmation_message_id = v_message_id where id = v_proposal.id;
  return v_message_id;
end;
$$;

revoke all on function app.post_responsibility_confirmation(uuid, text) from public, anon, authenticated, service_role;
grant execute on function app.post_responsibility_confirmation(uuid, text) to authenticated;
