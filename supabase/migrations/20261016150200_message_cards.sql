-- S1f — cartão estruturado dentro da mensagem do agente (FLUXOS_DA_V46.md §4.5; x1/cartoes_da_conversa.txt).
-- Os tipos que já têm objeto no banco: work_created (isWork, "Trabalho criado"), material (isMat,
-- "Material · vN"), approval (pedido de aprovação ou autorização: isConcept, isPub, isMsgs, isSend),
-- question (pergunta do agente, respondida por escrito), options (isChoices/isOpts: escolher uma opção
-- responde), team (isTeam, equipe montada) e budget (isBudget, orçamento em créditos).
-- O cartão é sempre ligado ao objeto por colunas com FK composta (mesmo workspace): material → versão da
-- entrega e trabalho; approval, question e options → a pendência; work_created, team e budget → o trabalho.
-- actions[] diz ao web que botões mostrar; a decisão continua em POST /approvals/{id}/decision. Cartão
-- não existe sem o objeto (on delete cascade). Só mensagem de agente tem cartão; quem grava é o worker.

alter table public.approvals
  add constraint approvals_workspace_id_id_key unique (workspace_id, id);

alter table public.messages
  add column card jsonb,
  add column work_item_id uuid,
  add column delivery_version_id uuid,
  add column approval_id uuid,
  add constraint messages_work_item_fk foreign key (workspace_id, work_item_id)
    references public.work_items (workspace_id, id) on delete cascade,
  add constraint messages_delivery_version_fk foreign key (workspace_id, delivery_version_id)
    references public.delivery_versions (workspace_id, id) on delete cascade,
  add constraint messages_approval_fk foreign key (workspace_id, approval_id)
    references public.approvals (workspace_id, id) on delete cascade,
  add constraint messages_card_shape check (
    card is null or (
      jsonb_typeof(card) = 'object'
      and card ->> 'type' in ('work_created', 'material', 'approval', 'question', 'options', 'team', 'budget')
      and jsonb_typeof(coalesce(card -> 'actions', '[]'::jsonb)) = 'array'
    )
  ),
  add constraint messages_card_author check (card is null or author_type = 'agent'),
  add constraint messages_card_linked check (
    card is null
    or case card ->> 'type'
      when 'material' then delivery_version_id is not null and work_item_id is not null
      when 'approval' then approval_id is not null
      when 'question' then approval_id is not null
      when 'options' then approval_id is not null and jsonb_typeof(card -> 'options') = 'array'
      else work_item_id is not null
    end
  ),
  add constraint messages_links_need_card check (
    card is not null or num_nulls(work_item_id, delivery_version_id, approval_id) = 3
  );

comment on column public.messages.card is 'Cartão do agente: {type, actions[], …}. Ligado ao objeto por work_item_id, delivery_version_id e approval_id.';

create index messages_work_item_idx on public.messages (work_item_id) where work_item_id is not null;
create index messages_delivery_version_idx on public.messages (delivery_version_id) where delivery_version_id is not null;
create index messages_approval_idx on public.messages (approval_id) where approval_id is not null;
