# H0 — Progresso (Hulk)

**Fatia:** H0, QA adversária da Fase 0. **Início:** 16/10/2026, 02:16. Método: tentar refutar cada entrega lendo o código real e atacando o ambiente local; nada de código de produto alterado. Provas e scripts em `docs/parciais/h0/`.

## Estado

| Bloco | Alvos | Estado |
|---|---|---|
| 0 | Leitura do PASSO 0 (diretrizes, plano, relatórios J0/S0/A0, setup, dados fictícios, arquitetura §3.1) | ✅ |
| 1 | Isolamento e autorização (alvos 1 a 5) | ✅ nada quebrou |
| 2 | Web (alvos 6 e 7) | 🟡 em andamento |
| 3 | Diretrizes do dono (alvos 8 a 11) | ⏳ |
| 4 | Reprodutibilidade (alvos 12 e 13) | ⏳ |
| 5 | Relatório `H0-relatorio.md` e limpeza (seed, portas, containers) | ⏳ |

## Ambiente no início

- `docker ps`: 46 containers, 11 `*_hellosquad`.
- Portas do Supabase do HelloSquad no ar: 56321, 56322, 56323, 56324, 56327. Portas 3100 e 8100 livres.

## Bloco 1 — isolamento e autorização (alvos 1 a 5): resistiu

Scripts: `docs/parciais/h0/01_isolamento.sh`, `02_papeis.sh`, `02b_admin_e_corrida.sh`, `03_auditoria_e_funcoes.sh`, `04_tokens_forjados.py`, `05_concorrencia.sh`. Saídas em `/tmp/h0_01..05`.

- **Alvo 1 (Marina lê Vitta).** API `GET /workspaces/{vitta}` → 404 igual a inexistente. Data API `/rest/v1/workspaces|memberships|invitations` com filtros `id=eq`, `slug=eq`, `or=(...)` e joins `select=*,memberships(*)` → 200 só com a Miolo; 0 ocorrências do id da Vitta/Trilha em qualquer resposta. `audit_events` → 403. anon (só chave publicável) → 401 em tudo. GraphQL desligado (`pg_graphql not enabled`). Cabeçalho `count=exact` só revela o tamanho do próprio tenant.
- **Alvo 2 (Carla escala / Rafael se rebaixa).** Carla editor: UPDATE do próprio papel e do Rafael → 200 **[]** (RLS não deixa a linha ser afetada, 0 linhas); INSERT de membership/convite → 403; UPDATE/DELETE de workspace → 403. Promovida a admin: ainda não vira owner, não cria owner, não insere membership de owner, não cria convite de owner (403); só mexe em não-owner, como o plano define. Rafael (único owner) rebaixando-se por UPDATE, DELETE ou UPDATE em lote → 400 `23514` "O workspace precisa de pelo menos um owner." Corrida de dois owners se rebaixando ao mesmo tempo (via `for no key update`): uma transação comita, a outra aborta; sempre sobra 1 owner.
- **Alvo 3 (escrita direta / RPC).** `audit_events` INSERT/UPDATE/DELETE como authenticated → 403; `workspaces` INSERT direto → 403. RPC: schema `app` não exposto (`PGRST106`), `public.create_workspace` não existe (`PGRST202`); anon sem USAGE em `app`; authenticated sem sub → "Usuário não autenticado". 0 funções de public/app executáveis por anon. Contagem audit_events/workspaces inalterada (0/3).
- **Alvo 4 (tokens forjados).** API (8100): **todos os 10 tokens → 401** (HS256, aud errado, exp vencido, iss errado, kid inexistente, sem role, alg none, segredo errado, service_role forjado, sub de outro). Data API: HS256 com o segredo local é aceito (ver achado H0-01), mas service_role forjado → 403 (sem grant) e sub aleatório → 200 **[]** (RLS). alg none e segredo errado → 401.
- **Alvo 5 (concorrência).** 180 requisições concorrentes (30 rodadas x 3 tenants x /me+/workspaces): 0 divergências, 0 mistura. Conexão volta ao pool sem claims.

Postura de papéis conferida no banco: anon/service_role **sem nenhum grant** em `public`; service_role tem BYPASSRLS mas não lê nada por falta de grant; authenticated só SELECT (+DELETE em memberships/invitations). hellosquad_api sem BYPASSRLS/SUPERUSER.

## Achados até agora

- **H0-01 (ℹ️/🟡 a decidir):** a Data API local aceita token HS256 assinado com o `JWT_SECRET`, que é o **default público do Supabase CLI** (55 bytes, contém "at-least-32"). Quem alcança a Data API local pode forjar um token `authenticated`/`service_role`. Barreiras que seguram: RLS + zero grants para anon/service_role; a API de produto (8100) só aceita ES256/JWKS. Local-only (nuvem usa segredo real e chaves assimétricas). Detalhe e correção no relatório.
- Falso alarme registrado: token "expirado" só passou na Data API quando dentro da folga de relógio padrão do PostgREST (~30s); expirado de verdade (2h, 30d) → 401 `PGRST303`. Não é achado.
