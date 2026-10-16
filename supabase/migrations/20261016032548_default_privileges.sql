-- S0 — decisão `auto_expose_new_tables = false` escrita como código, para valer igual no local e na nuvem.
-- O config.toml só aplica a opção ao criar o banco; esta migration remove os GRANTs automáticos que o
-- Supabase dá aos papéis da Data API em objetos novos de `public`. Cada migration concede o mínimo.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;
-- O EXECUTE de PUBLIC em funções vem do padrão global do Postgres e não sai por schema: cada função
-- nova revoga PUBLIC explicitamente, e o teste pgTAP de varredura falha se `anon` puder executar alguma.
