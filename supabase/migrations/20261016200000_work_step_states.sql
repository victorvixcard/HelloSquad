-- S2d — estados novos da etapa do trabalho e o contexto que vem de outra etapa. Valor novo de enum fica numa
-- migration à parte: o Postgres não deixa usar o valor na mesma transação que o cria.
--
-- needs_you: a entrega da etapa aguarda a decisão do dono; waiting_engine: a etapa da Kaia aguarda o motor de
-- imagem do dono (não falha, não cobra); blocked: a etapa depende de outra que não fechou (motivo na etapa).

alter type public.work_item_step_status add value if not exists 'needs_you' after 'in_progress';
alter type public.work_item_step_status add value if not exists 'waiting_engine' after 'needs_you';
alter type public.work_item_step_status add value if not exists 'blocked' after 'waiting_engine';

alter type public.run_context_kind add value if not exists 'step';
