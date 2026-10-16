-- S2g (H2-03): aprendizado promovido vale para o agente em todas as deliveries dele. No contexto do run, os
-- da mesma delivery entram com motivo 'delivery'; os de outras deliveries que a busca acha, 'search'; os
-- demais do mesmo agente, 'agent'.
alter table public.run_context_items
  drop constraint run_context_items_reason_values,
  add constraint run_context_items_reason_values
    check (reason in ('essential', 'search', 'delivery', 'handoff', 'agent'));
comment on column public.run_context_items.learning_id is
  'Aprendizado por cliente que entrou no contexto (camada 3): pela delivery, pela busca ou por ser do agente.';
