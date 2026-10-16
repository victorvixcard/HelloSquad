-- S1g — tipo de pendência "Para você decidir" (FLUXOS_DA_V46.md §5, `NDK5.decide`, L13765): a decisão sem tipo
-- próprio, escolher entre opções. Em arquivo separado: o valor novo do enum só pode ser usado depois do commit.
alter type public.approval_kind add value if not exists 'decide';
