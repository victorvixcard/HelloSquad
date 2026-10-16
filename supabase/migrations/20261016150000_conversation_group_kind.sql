-- S1f — conversa em grupo (2 a 6 especialistas escolhidos no Início, FLUXOS_DA_V46.md §4.1).
-- Valor novo de enum fica numa migration só dele: o Postgres não deixa usar o valor na mesma transação
-- em que ele foi criado (a migration seguinte já usa).

alter type public.conversation_kind add value if not exists 'group';
