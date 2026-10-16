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
| 12:00 | Sub-agente (a) Projetos: Projetos, catálogo e mapa de situação do Quadro (STK6, colunas da V4.6, filtros) | feito | `e42f2c0` |
| 12:02 | Sub-agente (c) ambientes: Estratégia · Bia no primeiro acesso da V4.6 (Direção estratégica e Analisar meu negócio) e catálogo dos cinco ambientes | feito | `5195d7a` |
| 12:02 | Sub-agente (c) ambientes: Resultados · Íris e CRM · Max com o vazio honesto da V4.6 (Ver conexões; as quatro fontes com estado e o aviso padrão) | feito | `87b9db3` |
| 12:03 | Sub-agente (c) ambientes: Marca & Criação · Kaia, estúdio da V4.6 (Bancada da Kaia com Em produção real e Criações com filtros, contagens reais e novo pedido) | feito | `29b7dbd` |
| 12:03 | Sub-agente (b) Equipe/Autônomo: Modo Autônomo com o estado vazio da V4.6 e os limites; catálogo da Minha Equipe | feito | `4d88e1a` |
| 12:03 | Sub-agente (a) Projetos: Projetos · Nexo com roadmap (vazio da V4.6), quem está trabalhando, próximos marcos e Todos os trabalhos (Quadro, Lista, Biblioteca, filtros) | feito | `16e395f` |
| 12:04 | Sub-agente (c) ambientes: Growth Marketing · Kiwi sem número inventado (objetivo vazio pede conexão, três frentes e regras da V4.6) e linha de identidade da V4.2 | feito | `3dc70f5` |
| 12:05 | Sub-agente (c) ambientes: testes dos cinco ambientes (textos exatos do vazio, nenhum número inventado, botões e aria) e Kiwi sem CSS próprio | feito | `7a39f04` |
| 12:06 | Sub-agente (b) Equipe/Autônomo: Minha Equipe & Conversas com os sete perfis, o agora do estado vivo e a lista real de conversas | feito | `c936369` |
| 12:06 | Sub-agente (c) ambientes: capturas lado a lado de Bia, Kaia, Kiwi, Max e Íris (protótipo no primeiro acesso × nosso, Marina, 1440×900) | feito | `0431e79` |
| 12:06 | Sub-agente (a) Projetos: detalhe do trabalho com origem da conversa, time (pilha), projeto e histórico montado da API (pedido, runs, versões, decisões); quatro colunas lado a lado em Projetos (is-2) | feito | `897229b` |
| 12:08 | Sub-agente (b) Equipe/Autônomo: testes da Minha Equipe & Conversas e do Modo Autônomo; Nova conversa ao lado dos filtros | feito | `82fd9ac` |
| 12:08 | Sub-agente (a) Projetos: testes de Projetos (vazios da V4.6, colunas e mapa de status, filtros e Limpar filtros, Lista, Biblioteca, cartão abre o detalhe); plural com =1 como o protótipo (0 trabalhos) | feito | `22dc43a` |
| 12:08 | Sub-agente (a) Projetos: testes do detalhe do trabalho (origem, histórico montado da API, time, voltar para Projetos, conversa do pedido, link do projeto) | feito | `b5e8573` |
| 12:09 | Sub-agente (a) Projetos: capturas lado a lado de Projetos e do detalhe do trabalho (V4.6 x nosso, 1440x900, Marina com o seed) | feito | `95f18fc` |
| 12:10 | Sub-agente (a) Projetos: captura do Começar pela Campanha de Natal (Sala do Squad em tela cheia com o pedido no campo) | feito | `37bd6f8` |
| 12:10 | Sub-agente (b) Equipe/Autônomo: capturas lado a lado da Minha Equipe & Conversas e do Modo Autônomo (protótipo × nosso, 1440×900) | feito | `7c3813b` |
| 12:10 | Sub-agente (a) Projetos: tira duas capturas repetidas do protótipo (a página rola por dentro; a captura inteira saía igual à da tela) | feito | `ba738e5` |
| 12:09 | e2e do Quadro com o trabalho do seed, do dossiê da Miolo e da sugestão confirmada pela Marina com a outra aba ao vivo | feito | `094eec9` |
| 12:11 | número suave da Memória na barra (sugestões abertas, 'N informações para confirmar'); capturas lado a lado da Memória e da barra de créditos | feito | `6b9c19d` |
