-- S2c — o contexto do run passa a registrar aprendizados por cliente (camada 3). Valor novo de enum fica
-- numa migration à parte: o Postgres não deixa usar o valor na mesma transação que o cria.

alter type public.run_context_kind add value if not exists 'learning';
