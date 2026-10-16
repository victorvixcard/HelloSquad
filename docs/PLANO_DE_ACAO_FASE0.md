# Plano de ação — Fase 0 (Fundação local)

Atualizado por Thor a cada entrega. Ao retomar uma sessão: ler este arquivo → `git log` → `docs/parciais/` → estado dos sub-agentes → seguir do disco. Nunca re-disparar do zero.

**Decisões do dono em vigor:** `docs/DIRETRIZES_DO_DONO.md` (PASSO 0 de todo briefing).

## Fila

| # | Fatia | Agente | Estado | Depende de | Critério de pronto |
|---|---|---|---|---|---|
| J0 | Ambiente local: Supabase CLI (Docker, projeto `hellosquad`, portas próprias), pnpm via corepack, uv, estrutura `apps/backend` e `apps/web` mínima, `Makefile` (`up/down/migrate/seed/test/dev`), `.env.example`, GitHub Actions (lint + testes, sem deploy), `docs/SETUP_LOCAL.md` | Jarvis | ✅ fechada 16/10 00:09 (`make test` verde conferido por Thor 00:15; CI escrito em `infra/github/workflows/ci.yml`, ativação pendente do Vic: token sem escopo `workflow`) | — | `supabase status` mostra o projeto nas portas próprias sem derrubar outros containers; `make up && make test` verde (teste placeholder); CI verde no push; relatório em `docs/parciais/J0-relatorio.md` |
| S0 | Identidade e isolamento: migrations `workspaces`, `memberships`, `invitations`, `audit_events`; RLS em tudo; seed dos tenants de `DADOS_FICTICIOS.md`; testes de isolamento (Marina vê Miolo, Pedro não vê nada, Carla editor não administra); FastAPI: `GET /health`, validação do JWT do Supabase, `GET /me`, `GET/POST /workspaces`; OpenAPI exportado para `packages/contracts` | Stark | ✅ fechada 16/10 01:01 (48 min; `make test` verde conferido por Thor 01:10: pytest 45, pgTAP 98; relatório `S0-relatorio.md`) | J0 ✅ | `make migrate && make seed && make test` verde com os testes de RLS; `curl /health` e `/me` com JWT do seed; relatório `S0-relatorio.md` |
| A0 | Design System e casca do app: `packages/ui` com `tokens.css` gerado de `tokens.json` e primitivos (Button, CommandField, Agent, StatePill); `apps/web` Next.js 15 com login e cadastro contra a Auth local, criação de workspace, shell com barra lateral da V4.6 (Principal / Seu squad / Gestão), `/app/*` noindex, página pública `/` mínima com Metadata API | Aranha | ✅ fechada 16/10 02:05 (47 min; relatório `A0-relatorio.md` completo; a sessão terminou com "failed" só por estourar o limite de 20.000 linhas de saída, depois do último commit; verificação de Thor em 02:15) | S0 ✅ | Marina faz login local e vê o shell com o workspace Miolo; Pedro faz login e cai no fluxo de criar workspace; lint e build verdes; relatório `A0-relatorio.md` |
| H0 | QA da Fase 0: rodar o critério de cada fatia, tentar quebrar o isolamento (JWT de um tenant lendo outro), checar que nada aponta para nuvem, nenhum segredo no repo, dados só fictícios | Hulk | ✅ fechada 16/10 02:45 (0 🔴, 5 🟡, 1 ℹ️; isolamento, autorização, forja de token e segredos resistiram; Fase 0 pronta e reprodutível) | A0 ✅ | `docs/parciais/H0-relatorio.md` com achado → severidade → cenário → correção |
| S0b | Correções de backend da H0: slugs reservados na API e em `app.create_workspace` (H0-04); `make up` tolera `.env` ausente e `SETUP_LOCAL` na ordem certa (H0-06); pgTAP falha se `anon`/`service_role` ganharem privilégio (H0-01, defesa em profundidade) | Stark | ✅ fechada 16/10 03:40 (slugs reservados como CHECK no banco + 422 `slug_reserved`; `make up` tolera `.env` ausente; pgTAP recusa privilégio de `anon`/`service_role`; pytest 51, pgTAP 120) | H0 ✅ | `make test` verde; clone limpo seguindo a doc sobe; relatório `S0b-relatorio.md` |
| A0b | Hardening do web da H0: cabeçalhos de segurança com CSP (H0-02); validação das variáveis no boot (H0-05); decisão sobre cookie httpOnly documentada para a Fase 1 (H0-03) | Aranha | ✅ fechada 16/10 03:08 (CSP com nonce nas rotas de sessão, X-Frame-Options, Referrer-Policy, nosniff, Permissions-Policy; build e start abortam com env inválido; httpOnly documentado para a Fase 1) | H0 ✅ | `make test-web` e build verdes; `curl -I` mostra os cabeçalhos; relatório `A0b-relatorio.md` |

**🏁 Fase 0 fechada em 16/10/2026 03:50.** Verificação final de Thor: `make test` exit 0 (pytest 51, Vitest 53, pgTAP 120), `make e2e` 5/5, cabeçalhos de segurança presentes em `curl -I`, portas livres, banco no seed. Pendências herdadas pela Fase 1: espelhar os 14 slugs reservados em `apps/web/app/app/novo-workspace/validation.ts` (A1a); `ws://` do Realtime no `connect-src` (A1a); `'unsafe-inline'` em `script-src` das páginas estáticas e `style-src` (Fase 5); linha velha do `SETUP_LOCAL.md` sobre o web (S1a).

## Decisões tomadas durante a fase

- 16/10: Postgres local é 17 (Supabase só oferece 15 e 17); a arquitetura dizia 16. Nuvem da Fase 5 nasce em 17.
- 16/10: perguntas abertas da J0 para a S0 decidir: chaves novas (`sb_publishable/sb_secret`) ou legadas (JWT anon/service_role); `auto_expose_new_tables` ligado ou GRANT explícito (J0-relatorio §5).

- 15/10: portas do Supabase local do HelloSquad serão próprias (não as padrão 54321–54323, que já estão ocupadas por outro projeto nesta máquina). Jarvis escolhe a faixa e documenta em `SETUP_LOCAL.md`.
- 15/10: API local na porta 8100 e web na 3100 (8000 e 3000 estão ocupadas por outros projetos).

- 16/10 (Stark, S0, fora do briefing, **aguardando confirmação do Vic**): regra do último owner (não dá para rebaixar ou remover o único owner); admin não cria, promove nem mexe em owner; slug de workspace excluído nunca é reaproveitado; membro não sai sozinho do workspace; owner/admin inclui membro direto sem convite; `POST /workspaces` com slug em uso responde 409 (revela que o endereço existe). Detalhe e mais 3 perguntas em `S0-relatorio.md` §6. Thor aceitou provisoriamente todas como estão; mudar é barato.

- 16/10 (Aranha, A0, **aguardando o Vic**): workspace aparece como "negócio" na interface; nome do agente na barra em cor com contraste AA (`hs-kbd`) em vez do `#A6A4B0` da V4.6; token oficial `hs-rotulo` fica abaixo de AA (3,26:1) e não foi alterado; copy "Criar conta grátis" mantida embora preço seja decisão pendente; JSON-LD sem `offers`. Perguntas completas em `A0-relatorio.md` §6 (8 itens). Thor aceitou provisoriamente.
- 16/10 (A0, para fatia de backend futura): lista de slugs reservados na API (`novo-workspace` e rotas fixas de `/app`); hoje só o web recusa.

- 16/10 03:00 (Thor, a partir da H0): corrigir agora H0-04, H0-06, H0-02, H0-05 e a extensão do pgTAP de H0-01 (mini-fatias S0b e A0b). H0-03 (cookie legível por JS) fica para a Fase 1, quando o Realtime no browser definir se o token precisa estar acessível. H0-01 (Data API aceita HS256 do segredo legado) não tem ação local além do teste; a exposição da Data API em produção é decisão do Vic antes da Fase 5.

## Pendências para o Vic

- **Data API em produção** (H0-01): manter `/rest/v1` exposta só com RLS, ou restringir/desligar, já que o produto fala só com a API própria? Thor recomenda **desligar a Data API pública na nuvem** e manter só Auth, Storage e Realtime; decidir antes da Fase 5.
- Confirmar (ou mudar) as 7 regras de identidade da S0 (`docs/parciais/S0-relatorio.md` §6) e as 8 perguntas de interface da A0 (`docs/parciais/A0-relatorio.md` §6).
- Assets oficiais quando existirem: favicon, imagem de Open Graph, SVG do wordmark (A0 §5.1).
- Dar escopo `workflow` ao token do GitHub e mover `infra/github/workflows/ci.yml` para `.github/workflows/` (J0-relatorio §3). Não bloqueia a S0.

- Chave da API da Anthropic (Fase 1).
- Acesso do Diogo ao repositório.
