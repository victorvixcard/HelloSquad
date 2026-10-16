# A1b — Progresso (Aranha)

Fatia A1b, "Projetos, Memória e os outros ambientes" (Fase 1). Início: 16/10/2026 11:47. Alvo: 70 minutos.

| Hora | Item | Estado | Commit |
|---|---|---|---|
| 11:47–11:50 | PASSO 0: diretrizes do dono (10:20 e 10:30); FLUXOS §1, §2, §6, §7, §10, §11; A1f, A1a, S1b §1, S1d §1/§4/§7, S1e; notas X1 de telas e memória; seed da Miolo (1 trabalho `needs_you`, 0 projetos, 6 conhecimentos, 1 sugestão do Otto, 2 fontes); contrato (`/memory*`, `/projects`, `/work-items`, `GET /me` com `credits`); protótipo no ar na 8010 | feito | — |
| 11:52 | Estrutura da fatia: catálogo por área (`projects`, `memory`, `team`, `auto`, `envs`) e uma página por ambiente do squad (`squad/[agente]` despacha para `ProjectsPage`, `StrategyPage`, `BrandPage`, `GrowthPage`, `CrmPage`, `ResultsPage`), para três frentes andarem em paralelo sem mexer nos mesmos arquivos | feito | `5d78606` |
| 11:54 | Três sub-agentes meus em paralelo, cada um com arquivos próprios: (a) Projetos · Nexo + detalhe do trabalho; (b) Minha Equipe & Conversas + Modo Autônomo vazio e limites; (c) Bia, Kaia, Kiwi, Max e Íris. Eu: Memória da Marca, barra de créditos, e2e e relatório | em andamento | — |
| 12:00 | Memória da Marca, base: leitura do dossiê, sugestões (todas) e conflitos; ações do owner (`decideSuggestionAction`, `correctFactAction`, `resolveConflictAction`, `factHistoryAction`); modelo puro (KST5, assuntos na ordem `TOPIC5`, busca em chave/valor/assunto, por especialista, histórico só do que aconteceu); catálogo `memory.json` com os rótulos da V4.5/V4.6 | feito | `f75e54f` |
| 12:03 | Tela da Memória (DOM e classes do template L5188–5292): dossiê, "De onde vem", "Principais conhecimentos", "O squad percebeu" com Confirmar/Corrigir/Descartar só para o owner ("Quem decide é o dono da conta" para os outros), conflito ("Vale este", "Nenhum dos dois: corrigir"), desatualizado, "Alterações recentes", "Tudo o que o squad sabe" (abas com contagem, busca, "Ver pelo especialista", linha aberta com origem, estado por extenso, quem usa, histórico), "Conexões e fontes" (SRCST5); Realtime `memory_suggestion.*` → a tela relê e a sugestão nova ganha `is-new`; contexto "Conhecimento" no painel ao conversar sobre um item | feito | `8db7b10` |
| 12:05 | Faixa da Memória com "Squad" e `nd is-tight` (V4.6 L13868, L13832); capturas do protótipo (`proto-memoria-*`) | feito | `b97515a` (autosave) |
| 12:06 | Vitest da Memória: 15 testes (modelo, owner confirma e corrige, leitura de quem não é owner, abas e busca, por especialista, linha aberta, fontes, vazio do primeiro acesso, Realtime) | feito | `6015364` |
| 12:07 | Barra "Plano Squad · créditos do mês" no menu da conta (V4.6 L4559) com `cycle_used / cycle_credits` de `GET /me` (S1e); 2 testes | feito | `857538e` |
