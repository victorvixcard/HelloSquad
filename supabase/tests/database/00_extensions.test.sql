-- J0: as extensões base do HelloSquad estão instaladas no banco local.
begin;
set local client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

select plan(4);

select has_extension('vector', 'pgvector instalado (Memória da Marca)');
select has_extension('pgmq', 'pgmq instalado (filas dos agentes)');
select has_extension('pg_cron', 'pg_cron instalado (rotinas agendadas)');
select has_extension('pg_net', 'pg_net instalado (HTTP assíncrono)');

select * from finish();
rollback;
