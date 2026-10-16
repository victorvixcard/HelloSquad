# HelloSquad — Plano de Desenvolvimento

**Versão:** 0.2 · **Data:** 15/10/2026 · **Autor:** Thor · **Status:** aprovado para iniciar (infra aprovada pelo Vic em 15/10)
**Base:** `ARQUITETURA_PROPOSTA.md`, `DIRETRIZES_DO_DONO.md`, Documento Mestre v1.0, catálogo de 46 deliveries / 23 integrações.

---

## 1. Regra que organiza este plano: local primeiro

Decisão do Vic em 15/10/2026: tudo é desenvolvido e testado **na máquina local**; só publicamos depois de todos os testes validados; todo dado de teste é **fictício**.

O que isso muda em relação à v0.1:

| Antes (v0.1) | Agora (v0.2) |
|---|---|
| Fase 0 criava projetos Supabase cloud, serviços Railway e Vercel | Fase 0 monta o ambiente **local**: Supabase CLI em Docker (mesmo Postgres, mesma Auth, mesmo Storage da nuvem), FastAPI e Next.js rodando na máquina |
| Deploy contínuo a cada fase | **Nenhum deploy** até a Fase 5. CI no GitHub só roda testes e lint; não publica nada |
| Contas de teste "reais" em staging | Três tenants fictícios definidos em `DADOS_FICTICIOS.md`, com seed reproduzível |
| Integrações externas homologadas em staging | Em local, integrações rodam contra **mocks e sandboxes**; a homologação real com contas de teste dos provedores acontece na Fase 5 |

O que não muda: a arquitetura alvo (Vercel + Railway + Supabase). O Supabase CLI local reproduz Postgres 16, Auth, Storage, Realtime e as extensões (pgvector, pgmq, pg_cron), então a migração para a nuvem na Fase 5 é configuração, não reescrita.

---

## 2. Ambiente local

| Componente | Como roda | Porta |
|---|---|---|
| Supabase (Postgres, Auth, Storage, Realtime, Studio) | `supabase start` via Docker, projeto `hellosquad` com portas próprias para não colidir com outros projetos da máquina | definidas em `supabase/config.toml` |
| API (FastAPI) | `uv run` em `apps/backend`, recarga automática | 8100 |
| Worker e scheduler | mesmos processos Python, entrypoints separados, consumindo pgmq local | — |
| Web (Next.js) | `pnpm dev` em `apps/web` | 3100 |
| Comandos | `Makefile` na raiz: `make up`, `make down`, `make migrate`, `make seed`, `make test`, `make dev` | — |

Variáveis em `.env.example` (commitado) e `.env` (nunca commitado). A chave da API da Anthropic entra só na Fase 1, fornecida pelo Vic.

---

## 3. Confronto honesto com o escopo "tudo em novembro"

O Documento Mestre mapeia 46 deliveries e 23 integrações para novembro de 2026. Hoje é 15/10. Faltam cerca de 6,5 semanas, e agora nada é publicado antes de validado.

| Fato | Impacto |
|---|---|
| 8 integrações dependem de revisão de app na Meta (Instagram, Pages, Ads, WhatsApp) | Revisão exige produto publicado e vídeo de demonstração. Só começa na Fase 5. |
| Google Business Profile API exige aprovação de acesso ao projeto | Prazo externo; pode ser solicitado antes, mas homologado só com produto publicado. |
| Motor de imagem e vídeo sem fornecedor | Kaia depende disso para 7 deliveries; bancada de homologação roda local na Fase 2. |
| Preço e créditos sem decisão | Mecanismo nasce na Fase 1 com valores provisórios em tabela; lançamento comercial depende do Vic. |

**Recomendação mantida:** novembro é a meta do **MVP validado localmente** (Fases 0 a 2), com o teste de aceite do Documento Mestre passando de ponta a ponta sobre dados fictícios. Integrações externas e publicação ficam para dezembro e janeiro, na ordem em que o Vic liberar a Fase 5 e as aprovações externas chegarem.

---

## 4. Fases

### Fase 0 — Fundação local (20 a 24/10)
**Fatias:** J0 Jarvis (toolchain, Supabase local com portas próprias, monorepo com pnpm e uv, Makefile, `.env.example`, GitHub Actions rodando lint e testes) → S0 Stark (migrations de identidade: `workspaces`, `memberships`, `invitations`, `audit_events`; RLS; seed dos tenants fictícios; testes de isolamento com dois tenants e um usuário sem membership; esqueleto FastAPI com healthcheck, validação do JWT do Supabase, `GET /me`, `GET/POST /workspaces`) → A0 Aranha (`packages/ui` com tokens portados de `tokens.json`; `apps/web` Next.js com login e cadastro contra a Auth local, criação de workspace, shell com barra lateral da V4.6 e rota `/app` como `noindex`) → H0 Hulk (QA da fase).
**Critério:** `make up && make migrate && make seed && make test` verde; Marina entra, vê o workspace Miolo; Pedro entra e não vê nada; teste automatizado prova o isolamento.

### Fase 1 — Núcleo vertical (27/10 a 14/11)
**Entregas:** conversas e mensagens; projetos e trabalhos com máquina de estados; runtime do squad com Nexo + Otto (delivery 04.01 textos e legendas) sobre a API da Anthropic com chave local; memória camadas 1 e 2 (fatos com proveniência, sugestões "percebeu", confirmar/corrigir/descartar); ledger de créditos com reserva e captura (preços provisórios em tabela); Realtime de progresso; faixa "Precisa de você"; auditoria; UI V4.6 integrada em Início, Sala do Squad, Conteúdo/Otto e Memória da Marca.
**Critério (teste do Documento Mestre, seção 16):** com a Miolo fictícia, pedido → trabalho → entrega → revisão → aprovação → histórico, com crédito debitado uma vez só e tudo visível na conversa e em Projetos.

### Fase 2 — Squad completo, sem integração externa (17/11 a 05/12)
**Entregas:** Bia 02.01 a 02.04 e 02.07 (busca web atrás de adaptador, com mock em testes); Kaia 03.01 a 03.03 (motor de imagem homologado em bancada local); Otto 04.02 e 04.03; Kiwi 05.01 e 05.02 (planejamento, sem conta conectada); Max 06.01 a 06.03 (importação do CSV fictício com consentimento); Íris 07.02 a 07.04 sobre as métricas fictícias; memória camada 3 (reflexão e aprendizados por cliente); colaboração entre agentes no mesmo trabalho; onboarding progressivo; Stripe em modo teste (assinatura + SPOT); site público com SEO/GEO completo rodando local; e-mail transacional com provedor em sandbox.
**Critério:** as sete personas entregam pelo menos uma delivery real cada sobre os tenants fictícios; um projeto coordenado (Bia → Kaia → Otto) fecha com um responsável por etapa; uma correção da Marina aparece aplicada na entrega seguinte do Otto.

### Fase 3 — Integrações onda 1 e Modo Autônomo, contra mocks (dezembro)
**Entregas:** conectores Meta (Instagram, Pages), GA4, Search Console e GBP implementados atrás de adaptadores com **servidores mock locais** que reproduzem OAuth, rate limit e falha; `responsibilities` + scheduler + runs (01.04, 04.02 recorrente, 07.05, 07.06); `external_actions` idempotentes; reconexão de tokens.
**Critério:** uma rotina real executa sem pedido manual, respeita pausa e permissão, falha de forma compreensível e se recupera; publicar duas vezes é impossível por teste.

### Fase 4 — Integrações onda 2 e mobile (janeiro)
**Entregas:** Meta Ads (leitura, depois escrita com teto) via Marketing API mockada; WhatsApp Cloud e e-mail marketing (06.02, 06.04, 06.06) em sandbox; CMS/blog (04.07); e-commerce (10.03); vídeo (03.07); Expo iOS/Android rodando em simulador contra a API local, com push em modo de desenvolvimento.
**Critério:** nenhuma mudança de verba sem permissão com teto; app abre, autentica e recebe "Precisa de você" no simulador.

### Trilha paralela SA — Super Admin (pedido do Vic em 16/10)
Painel de plataforma para controlar contas, catálogo, planos, pagamentos, auditoria, os sete agentes (SOUL, skills, ferramentas, versões, "o que ele lê"), regras de negócio, motor de imagem, modelos e custos, consumo por cliente, saúde das APIs, fila de trabalhos e qualidade das entregas. Plano completo e fases SA0–SA6 em `docs/SUPER_ADMIN.md`. SA0 (plano + protótipo com o DS) roda já; SA1 em diante entra depois do núcleo de cada fase, nunca à frente dele.

### Fase 5 — Publicação (só com go explícito do Vic)
**Pré-condição:** todas as fases anteriores validadas pelo Hulk e aceitas pelo Vic; revisão de segurança feita (RLS, IDOR, escopo de tenant, injeção via conteúdo de cliente).
**Entregas:** projetos Supabase `staging` e `production`; serviços Railway; projeto Vercel; domínio e DNS; segredos nos cofres de cada plataforma; migrações aplicadas; organização na API da Anthropic fora do tier Evaluation com teto de gasto adequado; solicitações de revisão Meta e Google abertas com o produto publicado; homologação de cada integração com contas de teste dos provedores; monitoramento (Sentry, Langfuse, PostHog) ligado.
**Critério:** teste de aceite completo rodando em staging com os tenants fictícios; go/no-go documentado; só então clientes reais.

---

## 5. Time e sequência (regra do Vic: fases sequenciais, nunca todos ao mesmo tempo)

| Agente | Responsabilidade neste projeto | Skill principal |
|---|---|---|
| **Jarvis** | Ambiente local (Supabase CLI, Docker, pnpm, uv, Makefile), CI de testes, mocks de provedores; na Fase 5, a publicação | devops |
| **Stark** | Schema, RLS, API, runtime do squad, memória, ledger, filas, adaptadores de integração | backend; `verification-before-completion` |
| **Aranha** | Design System em `packages/ui`, Next.js público (SEO/GEO) e app, integração da UI V4.6 | `frontend-vix` principal; `ui-ux-pro-max` apoio |
| **Nick Fury** | Revisão de domínio das skills dos 7 agentes, conteúdo SEO/GEO do site, `llms.txt`, FAQ | marketing |
| **Visão** | Bancada de homologação do motor de imagem (prompts de teste e critérios visuais) | imagem |
| **Hulk** | QA ao fim de cada fase sobre os dados fictícios: teste de aceite, RLS, idempotência, custo por entrega | QA |
| **Thor** | Triagem, briefing enriquecido, decisão de aceite, plano de ação por agente e handoff no repo | coordenação |

Modo de trabalho: uma fatia por vez (ou um par que não conflita), commit em até 10 minutos e a cada item verde, relatório em `docs/parciais/`, check de progresso a cada 10 minutos enquanto houver agente rodando, plano de ação por fase em `docs/PLANO_DE_ACAO_FASE<n>.md`. Antes da Fase 5, sugiro revisão de segurança profunda; essa revisão é do Doutor Estranho e só entra se o Vic pedir.

---

## 6. Riscos e mitigação

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Mock de integração diverge da API real e a Fase 5 revela retrabalho | Média | Mocks construídos a partir da documentação oficial e dos payloads de exemplo; contratos em testes; homologação real reservada na Fase 5. |
| Revisões Meta/Google atrasam a abertura comercial | Alta | Produto não depende delas para o MVP; vídeo de demonstração gravado no local assim que a Fase 2 fechar. |
| Fornecedor de imagem inconsistente com a marca | Média | Bancada com 3 fornecedores antes de codar Kaia; adaptador troca fornecedor sem tocar nas deliveries. |
| Custo de LLM por entrega acima do preço em créditos | Média | Custo medido por run desde a Fase 1 sobre dados fictícios; preços só fecham com dado real; caching e Batch API. |
| Conta Anthropic começa no tier Evaluation e com teto de gasto baixo | Certa | Criar a organização cedo, gerar histórico com os testes locais, pedir aumento antes da Fase 5. |
| Cota de IA do time de desenvolvimento acaba no meio de uma fatia | Média | Commit em até 10 min e a cada item; retomar do disco; nunca re-disparar do zero. |
| Prompt injection via conteúdo do cliente (avaliações, comentários, CSV) | Média | Conteúdo externo entra como dado delimitado; ferramentas checam permissão no servidor; teste com payload malicioso fictício. |
| Portas e containers de outros projetos locais colidem com o Supabase do HelloSquad | Alta nesta máquina | Projeto Supabase com `project_id` e portas próprias em `config.toml`; Jarvis confere antes de subir. |

---

## 7. Definição de "pronto" por fase

Código em `main` com CI verde; `make test` verde localmente; teste de aceite da fase gravado em `docs/parciais/`; Hulk reportou e Thor decidiu; `docs/ESTADO_E_CONTINUIDADE.md` atualizado com onde paramos; nenhum segredo no repo.

---

## 8. Pendências do Vic (não bloqueiam a Fase 0)

1. Chave da API da Anthropic para o `.env` local (necessária na Fase 1). Criar a organização no Console já inicia o histórico de uso.
2. Pix recorrente é requisito? Define o gateway (Stripe só faz Pix avulso).
3. Compra de créditos no app mobile ou só na web?
4. Só pt-BR no lançamento?
5. Domínio hellosquad existe? Define a Fase 5.
6. Revisar `squad/*/SOUL.md`.
7. Dar acesso ao Diogo no repositório.
