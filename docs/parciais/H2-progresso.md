# H2 — Progresso da QA adversária da Fase 2 (Hulk)

Disparada 16/10/2026 18:55 pela main. Sozinha no ambiente. Não altera código de produto; scripts e provas em
`docs/parciais/h2/`; saídas longas em `/tmp/h2_*`. Relatório final: `docs/parciais/H2-relatorio.md`.

| Hora | Bloco | Estado | Nota |
|---|---|---|---|
| 18:56 | PASSO 0 | em andamento | diretrizes, plano da Fase 2, plano de desenvolvimento §4/§7 e FLUXOS §1/§3/§5/§6 lidos; ambiente no ar (API 8100 ok, web 3100 200, 11 containers `supabase_*_hellosquad`, sem worker) |
| 19:06 | Bloco 1 (critério pela API) e bloco 2 (isolamento) | feito | `h2/01_criterio_api.txt`: Bia, Otto, Kiwi, Max e Íris entregam na Vitta (1 reserva + 1 captura cada); CSV recusa 6 de 9 linhas adversárias. `h2/02_projeto_e_memoria.txt`: projeto Bia → Kaia(waiting_engine) → Otto fecha com dono e marcos; correção da Marina entra na 04.01 seguinte (não na 04.03); reflexão falha (`llm_config`) em 02.01/05.01/07.02 por falta de fixture; Nexo repete a pergunta depois da resposta (campanha sem tema). `h2/03_isolamento.txt`: 20 tabelas, 0 vazamento pela Data API, escrita direta 403, rotas novas 404 entre tenants. Três auxiliares rodando (protótipo, clone limpo, varredura estática + site) |
