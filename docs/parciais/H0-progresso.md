# H0 — Progresso (Hulk)

**Fatia:** H0, QA adversária da Fase 0. **Início:** 16/10/2026, 02:16. Método: tentar refutar cada entrega lendo o código real e atacando o ambiente local; nada de código de produto alterado. Provas e scripts em `docs/parciais/h0/`.

## Estado

| Bloco | Alvos | Estado |
|---|---|---|
| 0 | Leitura do PASSO 0 (diretrizes, plano, relatórios J0/S0/A0, setup, dados fictícios, arquitetura §3.1) | ✅ |
| 1 | Isolamento e autorização (alvos 1 a 5) | ✅ nada quebrou |
| 2 | Web (alvos 6 e 7) | ✅ 4 achados (3🟡 1ℹ️), núcleo resistiu |
| 3 | Diretrizes do dono (alvos 8 a 11) | ✅ conforme, sem achado |
| 4 | Reprodutibilidade (alvos 12 e 13) | 🟡 em andamento |
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

## Bloco 2 — Web (alvos 6 e 7)

Scripts: `06_web_http.sh`, `07_web_sessao.mjs`, `08_slug_e_cadastro_api.sh`, `09_cadastro_web.mjs` e teste unitário do `safeNext` (inline). Web buildado (`make build`) e servido com `next start` na 3100.

Resistiu: `safeNext` bloqueia todos os vetores de `?next=` (`//site`, `https://`, `/apple`, `\`, `%2F%2F` literal e decodificado, `/app//evil`, `/APP`, `/app@evil`, `javascript:`, espaço à frente) e só deixa passar `/app`, `/app/…`, `/app?`, `/app#`; `/sair` por GET não encerra sessão (com e sem sessão); `/app/vitta` e `/app/trilha` como Marina → 404 sem vazar dado; sessão adulterada → `/entrar` sem vazar; `noindex`/`X-Robots-Tag: noindex, nofollow` em `/app`, `/app/<inexistente>` e `/app/<rota funda>`; host preservado (127.0.0.1 não vira localhost, sem perder sessão); cadastro valida nome/e-mail/senha em pt-BR sem emoji e **não cria usuário** (auth.users=5); duplicado → "Já existe uma conta com esse e-mail."; slug rejeita curto/longo/acento/espaço/`--`/vazio e **injeção SQL** no slug (422) e no nome (armazenado literal, tabela intacta); maiúscula é normalizada (MIOLO→409 slug_taken).

Achados:
- **H0-02 (🟡):** nenhum cabeçalho de segurança em nenhuma rota — sem CSP, X-Frame-Options, Referrer-Policy, X-Content-Type-Options, HSTS. `X-Powered-By` corretamente ausente. A0 §6 já declarou CSP pendente. Clickjacking possível na área logada (sem `frame-ancestors`/X-Frame-Options).
- **H0-03 (🟡):** cookie de sessão `sb-127-auth-token` é legível por JS (`httpOnly=false`), visível em `document.cookie`. Padrão do `@supabase/ssr`, já declarado pela A0. Um XSS exfiltra o access_token; agravado pela ausência de CSP (H0-02).
- **H0-04 (🟡):** a API aceita o slug reservado `novo-workspace` (201, cria workspace); só o web recusa. Gap já apontado por A0 §5.3 e S0. Provado com o Pedro (criado e removido; Pedro volta a 0 memberships).
- **H0-05 (ℹ️):** a defesa da chave secreta funciona (middleware recusa com 500 e a chave **não** vaza para o bundle do browser — 0 arquivos em `.next/static`), mas "o web recusa subir" (A0 §2.7) é impreciso: build e boot passam, a home pública serve 200, e a falha é um 500 opaco só nas rotas de auth/app, com a mensagem apenas no log do servidor.

## Bloco 3 — Diretrizes do dono (alvos 8 a 11): conforme, sem achado

- **Alvo 8 (nuvem).** `git grep` por `supabase.co|vercel|railway|.com.br` fora de design/docs: só `.gitignore` do create-next-app (`.vercel`), placeholder de UI `voce@seunegocio.com.br` e um comentário de link para a doc do Supabase. Varredura de URLs http(s) fora de design/docs/lockfiles: todas 127.0.0.1/localhost, fora refs de licença de fonte (github.com/JetBrains, naipefoundry) e comentários. CI sem passo de deploy/publish. `site_url`, `API_URL`, `NEXT_PUBLIC_SITE_URL` todos locais. Nada aponta para nuvem.
- **Alvo 9 (segredos no histórico).** `git log -p --all` (36 commits, 48.8k linhas): 0 de `eyJ…`, `sb_secret_…`, `sb_publishable_…`, `sk-ant-…`, `super-secret-jwt-token`, chave privada. `service_role` (24x) é nome de papel; `Senha!Teste123` (17x) é a senha fictícia documentada. `.env` nunca foi commitado e está em `.gitignore:2`. `.env.example` com chaves sensíveis vazias (só `DATABASE_URL` traz o default local público `postgres:postgres`, documentado — ℹ️, local).
- **Alvo 10 (dados fictícios).** Seed só com e-mails `.example`. Sem CPF/CNPJ, sem telefone real em código. Únicos e-mails fora de `.example`: `admin@email.com` **comentado** (template do CLI) e o placeholder `seunegocio.com.br`. Captura `02-marina-shell.png` conferida: Miolo, Marina Costa, marina@miolo.example — tudo fictício.
- **Alvo 11 (pt-BR, sem emoji, identificadores em inglês).** 0 emoji em `apps/**` e `packages/**/src`. Códigos de erro da API em inglês (`workspace_not_found`, `validation_error`, `forbidden`…) com mensagem em pt-BR; `VALIDATION_MESSAGES` em pt-BR; UI em pt-BR. Observação: "Disponível na Fase 1." (jargão interno) é a pergunta aberta A0 §6.2.
