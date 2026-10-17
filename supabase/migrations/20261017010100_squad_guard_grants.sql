-- SA3a: as funções de gatilho do squad versionado não ficam executáveis pela Data API (como as demais
-- funções de public e app; pgTAP 01_rls_coverage).
revoke all on function app.squad_version_guard() from public, anon, authenticated, service_role;
revoke all on function app.agent_prompt_section_guard() from public, anon, authenticated, service_role;
