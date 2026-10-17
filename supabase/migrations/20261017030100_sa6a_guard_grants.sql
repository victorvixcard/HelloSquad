-- SA6a: as funções de gatilho do registro de acesso do suporte e da conciliação não ficam executáveis
-- para PUBLIC (garantia da S0: anon e service_role não executam nada de app).
revoke all on function app.support_access_log_guard() from public, anon, authenticated, service_role;
revoke all on function app.payment_reconciliations_immutable() from public, anon, authenticated, service_role;
