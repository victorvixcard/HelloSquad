# Estado e continuidade — HelloSquad

Handoff versionado. Quem retoma (Thor ou humano) lê este arquivo primeiro, depois `git log --oneline -20`, depois `docs/parciais/`.

## Onde estamos (16/10/2026 20:55 — Fase 2 FECHADA, trilha SA aberta)

- **Fase 2 fechada às 20:55.** Bia, Otto, Kiwi, Max e Íris completos em modo simulado (16 deliveries); Kaia atrás de `ImageEngine` com stub honesto (motor é do Vic); memória camada 3 (a correção da Marina entra na entrega seguinte); projeto coordenado Bia → Kaia → Otto com responsável por etapa, na API e no web; onboarding progressivo; pt-BR/en/es no app, na API, nos e-mails e no site; site público com SEO/GEO (Lighthouse 98–100); cobrança atrás de `PaymentProvider` (Asaas, Mercado Pago) contra mocks; e-mail transacional via Mailpit. QA H2 e correções S2g/A2d: ver `docs/PLANO_DE_ACAO_FASE2.md`.
- **Trilha SA aberta** por `docs/PLANO_DE_ACAO_SA.md`: SA1 (schema + API `/admin/*` de leitura) → SA2 ‖ SA3a → SA3b ‖ SA4a → SA4b → SA6 → H-SA; SA5 aguarda o motor.
- Orquestração: sessão main do Thor; check silencioso a cada 10 min; resumo ao Vic a cada 2 h. Handoff vivo em `memory/caixinhas/hellosquad.md` (workspace do OpenClaw) e aqui.
- Pendências do Vic (não bloqueiam): contas sandbox Asaas/Mercado Pago + endereço HTTPS público para webhook; motor de imagem; chave da Anthropic; escopo `workflow` no token; perguntas por fatia nos relatórios (`S2a..S2g`, `A2a..A2d`, `N2a`, `H2` §e; P1 "Criar conta grátis").

## Onde estamos (16/10/2026 14:50 — Fase 1 FECHADA, Fase 2 aberta)

- **Fase 1 fechada às 14:40.** S1a–S1h, A1f, A1a, A1b, A1c, SA0 e H1 ✅ em `docs/PLANO_DE_ACAO_FASE1.md`. QA H1: 0 bloqueante, 4 atenção (corrigidas em S1h/A1c, exceto H1-01 parcial → checklist da Fase 5 e H1-04 → S2a), 7 notas. Bateria: pytest, pgTAP, Vitest e e2e verdes; clone limpo verde.
- **Fase 2 aberta** por `docs/PLANO_DE_ACAO_FASE2.md` (autorização do Vic 16/10 11:35): S2a ‖ A2a → S2b ‖ N2a → S2c ‖ A2b → S2d ‖ A2c → S2e → S2f → H2 → SA1+.
- Orquestração: sessão main do Thor (desde 11:00); check silencioso a cada 10 min; resumo ao Vic a cada 2 h. Handoff vivo em `memory/caixinhas/hellosquad.md` (workspace do OpenClaw) e aqui.
- Perguntas ao Vic sem resposta (não bloqueiam): `S1e-relatorio.md` §4, `S1f-relatorio.md` §5, `A1b-relatorio.md` §4, `PLANO_DE_ACAO_FASE2.md` "Pendências".

## Onde estamos (15/10/2026, noite)

- Infra aprovada pelo Vic: Vercel + Railway + Supabase (`docs/ARQUITETURA_PROPOSTA.md`).
- Regra nova do Vic: **local primeiro, dados fictícios, publicação só após validação** (`docs/DIRETRIZES_DO_DONO.md`).
- Plano v0.2 em `docs/PLANO_DE_DESENVOLVIMENTO.md`; fila da fase em `docs/PLANO_DE_ACAO_FASE0.md`.
- Sete agentes definidos em `squad/` (aguardando revisão de texto do Vic; não bloqueia).
- **Fase 0 em execução.** J0 (Jarvis) fechada em 16/10 00:09. S0 (Stark) fechada em 16/10 01:01: identidade multi-tenant com RLS forçada, seed fictício, API `/me` e `/workspaces` com JWT por JWKS, OpenAPI em `packages/contracts/openapi.json`; `make test` verde (pytest 45, pgTAP 98) conferido por Thor. A0 (Aranha) fechada em 16/10 02:05: Design System `@hellosquad/ui` (tokens gerados, fontes locais, 7 agentes e ícones extraídos do bundle, primitivos), cliente tipado em `@hellosquad/contracts`, auth web com `@supabase/ssr`, casca `/app/[workspace]` com barra lateral V4.6, `/app/novo-workspace`, página pública com SEO/GEO; 53 testes Vitest e 5 Playwright. Relatórios em `docs/parciais/`. H0 (Hulk) fechada em 16/10 02:45: 0 bloqueante, 5 atenção, 1 nota; isolamento e autorização resistiram. Mini-fatias S0b (Stark) e A0b (Aranha) fechadas às 03:40 e 03:08. **Fase 0 fechada em 16/10 03:50** (verificação de Thor: pytest 51, Vitest 53, pgTAP 120, e2e 5/5, cabeçalhos de segurança no ar).
- **Fase 1 aberta.** S1a (Stark) fechada em 16/10 04:09: 13 tabelas do núcleo com RLS forçada, máquina de estados dos trabalhos (23 transições, erros WI001/WI002), `app.post_message`, `app.create_work_item_from_message` (trabalho + run + fila na mesma transação), `app.decide_approval` idempotente, 4 filas pgmq, Realtime Broadcast no canal privado `workspace:<id>` provado com cliente real, seed da Miolo (2 conversas, 3 mensagens, trabalho 04.01 em revisão); pgTAP 216. S1b (Stark, API do núcleo) fechada em 16/10 04:09: 16 rotas (conversas, mensagens com cursor, trabalhos, aprovações idempotentes, projetos, runs e eventos), `app.create_conversation`, bucket privado `deliveries`, tabela SQLSTATE → HTTP, contrato OpenAPI e tipos regenerados; pytest 64, pgTAP 241; `make test` verde conferido por Thor às 04:40. Exemplos de `curl` do caminho pedido → trabalho → aprovação em `docs/SETUP_LOCAL.md`.
- 16/10 08:30: Vic liberou a fila e respondeu as pendências (`DIRETRIZES_DO_DONO.md`, linhas de 16/10). **S1c (runtime do squad) fechada 09:10**: adaptador de LLM Anthropic + modo simulado, worker pgmq, fluxo Nexo → Otto 04.01 com autoverificação, só o owner decide, rejeição com `cancel`/`revise`; pytest 90, pgTAP 270 (conferido por Thor). **X1 fechada 09:10**: `docs/FLUXOS_DA_V46.md` (especificação derivada do protótipo; PASSO 0 de toda fatia). **Em execução:** S1d (Stark, Memória da Marca), A1f (Aranha, fidelidade visual à V4.6), SA0 (Aranha 2ª sessão, protótipo do Super Admin em `design/super-admin-proto/`, porta 8020). Super Admin planejado em `docs/SUPER_ADMIN.md` (implementação só depois do núcleo). Chave da Anthropic ainda pendente (modo simulado).
- Decisões de acesso ao banco tomadas para a S0 (chaves novas, JWKS, `auto_expose_new_tables = false`, RLS forçada, API sem BYPASSRLS): `docs/ARQUITETURA_PROPOSTA.md` §3.1.

- **16/10 10:55 — troca de orquestrador.** A sessão dashboard do Thor (`d2ccddff`) chegou a 76% de contexto. S1e (Stark, créditos) e A1a (Aranha, ao vivo) seguem rodando e serão conferidas por ela; **as próximas fatias (S1f, A1b, S1g, H1) são disparadas pela sessão main do Thor**, com os briefings prontos em `docs/parciais/briefings/FASE1_PROXIMAS_FATIAS.md`. Automações: check silencioso `f4dafd56` (isolado) e update-2h `3ffac505` (main). Nada para: quem assume lê este arquivo, o plano e a caixinha.

## O que já existe

Monorepo com pnpm e uv; Supabase local `hellosquad` (portas 5632x, Postgres 17.11, extensões vector/pgmq/pg_cron/pg_net); FastAPI com `/health` na 8100; Next.js 15 mínimo na 3100; `make up/down/migrate/seed/test/dev`; `docs/SETUP_LOCAL.md`. CI escrito em `infra/github/workflows/ci.yml`, aguardando o Vic dar escopo `workflow` ao token.

Desde a S0: tabelas `workspaces`, `memberships`, `invitations`, `audit_events` com RLS habilitada e forçada; schema `app` (`current_user_workspace_ids`, `has_role`, `create_workspace`); papel `hellosquad_api` sem BYPASSRLS; seed idempotente dos 5 usuários fictícios; FastAPI com JWT (JWKS ES256, fallback HS256), `/me`, `/workspaces`; contrato OpenAPI; 98 testes pgTAP e 45 pytest. Como obter JWT de teste e chamar a API: `docs/SETUP_LOCAL.md`.

Desde a A0: `packages/ui` e `packages/contracts`; web com `/entrar`, `/criar-conta`, `/sair`, `/app/[workspace]` (Início, Sala do Squad, 7 ambientes, Modo Autônomo, Memória da Marca, Equipe), `/app/novo-workspace`, `/` pública com Metadata, JSON-LD, `sitemap`, `robots`, `llms.txt`; `make test-web` e `make e2e`.

## O que ainda não existe

QA adversária da Fase 0 (H0, em execução); tudo da Fase 1 em diante (conversas, trabalhos, runtime do squad, memória, créditos).

## Como retomar

1. `cat docs/PLANO_DE_ACAO_FASE0.md` para ver a fila e o estado de cada fatia.
2. `git log --oneline -20` e `git status` para ver o que está no disco.
3. `ls docs/parciais/` e ler o `*-progresso.md` da fatia em execução.
4. Se a fatia morreu sem relatório: retomar do disco em modo "continue, não refaça".

## Repositório

`github.com/victorvixcard/HelloSquad` (público). Local: `~/projetos/hellosquad`.
