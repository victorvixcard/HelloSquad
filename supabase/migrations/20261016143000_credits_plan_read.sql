-- S1e — a barra "Plano Squad · créditos do mês" (FLUXOS_DA_V46.md §1.1) precisa do nome do plano da conta.
-- Plano e versão são configuração global, como os preços: authenticated lê, ninguém fora do papel
-- privilegiado escreve.

grant select on table public.plans, public.plan_versions to authenticated;
create policy plans_select_authenticated on public.plans
  for select to authenticated using (true);
create policy plan_versions_select_authenticated on public.plan_versions
  for select to authenticated using (true);
