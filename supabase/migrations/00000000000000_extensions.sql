-- J0 — extensões base do HelloSquad.
-- vector: embeddings da Memória da Marca (pgvector).
-- pgmq: filas de trabalho dos agentes (Supabase Queues).
-- pg_cron: rotinas agendadas do Modo Autônomo.
-- pg_net: chamadas HTTP assíncronas a partir do banco.
-- Mesmos comandos e schemas que o painel do Supabase usa, para a migration valer igual na nuvem.

create extension if not exists vector with schema extensions;
create extension if not exists pgmq;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
