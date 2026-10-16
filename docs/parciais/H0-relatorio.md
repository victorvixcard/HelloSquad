# H0 — Relatório de QA adversária (Hulk)

**Fatia:** H0, QA adversária da Fase 0. **Data:** 16/10/2026, 02:16 → 05:50. **Método:** tentar
refutar as entregas de J0, S0 e A0 lendo o código real e atacando o ambiente local; nada de código de
produto foi alterado. Scripts de prova em `docs/parciais/h0/`; saídas longas em `/tmp/h0_*` (lidas só
por `tail`/`grep`). Chaves locais mascaradas aqui (são os defaults públicos do Supabase CLI).

**Veredito em uma linha:** a Fase 0 atende o critério de pronto; **nenhum achado bloqueante (🔴 = 0)**.
Encontrei **5 🟡** (defesa em profundidade / fragilidade / doc) e **1 ℹ️**. Isolamento entre tenants,
autorização, forja de token na API e proteção de segredos **resistiram a todos os ataques**.

## (a) Tabela-resumo

| # | Achado | Sev. | Onde | Quebra isolamento/segredo? |
|---|---|---|---|---|
| H0-01 | Data API aceita HS256 assinado com o `JWT_SECRET` (default público do CLI no local) | 🟡 | stack Supabase (PostgREST/GoTrue) | Não (RLS + zero grants seguram; sem vazamento entre tenants) |
| H0-02 | Sem cabeçalhos de segurança (CSP, X-Frame-Options, Referrer-Policy, X-Content-Type-Options, HSTS) | 🟡 | `apps/web/next.config.ts` | Não (defesa em profundidade; clickjacking/XSS-assist) |
| H0-03 | Cookie de sessão legível por JS (`httpOnly=false`) | 🟡 | `@supabase/ssr` (`apps/web/lib/supabase/*`) | Não isoladamente; um XSS exfiltra o token |
| H0-04 | A API aceita o slug reservado `novo-workspace` (só o web recusa) | 🟡 | `apps/backend/.../identity` vs `apps/web/.../validation.ts` | Não (cria workspace legítimo do próprio usuário) |
| H0-05 | "o web recusa subir com `sb_secret_`" é impreciso (falha por requisição, não no boot) | ℹ️ | `apps/web/lib/env.ts` | Não (chave não vaza ao browser) |
| H0-06 | Ordem do `SETUP_LOCAL.md` quebra: `make up` antes de criar o `.env` | 🟡 | `docs/SETUP_LOCAL.md` | Não (reprodutibilidade) |

Contagem: 🔴 0 · 🟡 5 · ℹ️ 1.

## (b) Achados

### H0-01 — Data API aceita token HS256 do segredo legado (🟡)

- **Cenário concreto de falha.** A Data API do Supabase (`/rest/v1`, porta 56321) valida JWT também
  com o `JWT_SECRET` simétrico, que no ambiente local é o **default público do CLI**
  (`super-secret-jwt-token-...`). Quem alcança a Data API local pode forjar um token
  `role: authenticated` (ou `service_role`) sem logar. Diverge da decisão de arquitetura (§3.1: adotar
  chaves assimétricas ES256/JWKS e abandonar o modelo de segredo compartilhado). Na nuvem, o risco se
  materializa se o segredo legado continuar válido para verificação e for fraco/vazado.
- **O que segura hoje (e precisa continuar segurando).** (1) a API de produto (8100) **não** aceita
  HS256 — só ES256/JWKS; (2) a RLS vale na Data API; (3) `anon` e `service_role` têm **zero grants** em
  `public`, então mesmo um `service_role` forjado (que tem BYPASSRLS) não lê nada; (4) um token com
  `sub` aleatório não enxerga nenhum tenant. Não consegui vazar dado de um tenant para outro por aqui.
- **Correção proposta.** Decidir a exposição da Data API na nuvem (ver perguntas): se o produto só fala
  com a API própria, restringir/desligar a Data API em produção, ou mantê-la só com RLS + garantir que
  `service_role`/`anon` nunca ganhem grant (o teste `01_rls_coverage` já ajuda; sugiro estendê-lo para
  falhar se `service_role` receber qualquer privilégio de tabela). Em produção, usar segredo legado
  forte e, quando 100% em chaves assimétricas, desabilitar a verificação simétrica.
- **Como provei.** `docs/parciais/h0/04_tokens_forjados.py` (API: 10/10 tokens → 401; Data API:
  `service_role` forjado → 403, `sub` aleatório → `200 []`) e verificação de grants:
  ```
  API /me — HS256 válido/aud errado/role service_role/sub de outro/alg none → 401 em todos
  Data API: service_role forjado → 403 (sem grant); sub aleatório → 200 []
  grants em public: anon/service_role = (nenhum);  service_role bypassrls=true
  ```

### H0-02 — Sem cabeçalhos de segurança no web (🟡)

- **Cenário concreto de falha.** Nenhuma resposta do web envia `Content-Security-Policy`,
  `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options` nem HSTS. A área
  logada (`/app/*`) pode ser colocada em `<iframe>` de terceiro (clickjacking); sem CSP, qualquer XSS
  roda sem contenção. (`X-Powered-By` corretamente ausente.) A0 §6 já declarou o CSP pendente.
- **Correção proposta.** Adicionar em `next.config.ts` `headers()`: `Content-Security-Policy`
  (começar em `frame-ancestors 'none'; default-src 'self'` e ajustar para as fontes/inline do Next),
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Content-Type-Options: nosniff`; HSTS só sob HTTPS (Fase 5).
- **Como provei.** `docs/parciais/h0/06_web_http.sh`:
  ```
  == Cabeçalhos de segurança na página pública (/)
  (nenhum dos listados presente; ausência = não enviado)
  ```

### H0-03 — Cookie de sessão legível por JavaScript (🟡)

- **Cenário concreto de falha.** O cookie `sb-127-auth-token` (`@supabase/ssr`) tem `httpOnly=false` e
  aparece em `document.cookie`. Combinado com a ausência de CSP (H0-02), um único XSS exfiltra o
  `access_token` (vale 1 h) e permite impersonar a pessoa na API. A0 §6.6 já declarou.
- **Correção proposta.** É o padrão da biblioteca (o cliente de browser lê a sessão). Enquanto o browser
  não precisar do token (A0 decisão 11: só o servidor do Next chama a API), avaliar cookies `httpOnly`
  no fluxo SSR; no mínimo, mitigar com CSP forte (H0-02) e manter o token fora do browser. Decisão
  consciente, a documentar.
- **Como provei.** `docs/parciais/h0/07_web_sessao.mjs`:
  ```
  sb-127-auth-token: httpOnly=false secure=false sameSite=Lax
  visíveis em document.cookie (JS): sb-127-auth-token
  ```

### H0-04 — A API aceita o slug reservado `novo-workspace` (🟡)

- **Cenário concreto de falha.** O web recusa `novo-workspace` (`RESERVED_SLUGS`), mas a API aceita:
  `POST /workspaces {"slug":"novo-workspace"}` → 201. Um workspace com esse slug sombrearia a rota
  `/app/novo-workspace`. Já apontado por A0 §5.3 e S0 (pendência "slugs reservados na API").
- **Correção proposta.** Lista de reservados no backend (`novo-workspace` e as rotas fixas de `/app`),
  recusando com 409/422 antes de criar. Enquanto não houver, o web é a única barreira.
- **Como provei.** `docs/parciais/h0/08_slug_e_cadastro_api.sh` (criado com o Pedro e removido depois):
  ```
  slug=novo-workspace -> HTTP 201 {"slug":"novo-workspace","role":"owner"...}
  (limpeza) workspaces no banco: 3 | Pedro memberships: 0
  ```

### H0-05 — "o web recusa subir com `sb_secret_`" é impreciso (ℹ️)

- **Cenário concreto.** A0 §2.7 diz que o web "recusa subir" se `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  receber uma `sb_secret_`. Na prática, `next build` e `next start` **passam**, a home pública serve
  200, e só as rotas que passam pelo middleware (`/entrar`, `/app`) devolvem **500** em runtime, com a
  mensagem apenas no log do servidor. O guard protege: a chave secreta **não** vai para o bundle do
  browser (0 arquivos em `.next/static`). O risco é operacional: subir achando que está tudo bem porque
  a home responde 200, com a autenticação quebrada.
- **Correção proposta.** Validar a chave no boot (ex.: no `next.config.ts`/`instrumentation`) e abortar
  o processo com mensagem clara; ou ajustar a redação da A0 para "falha nas rotas de sessão".
- **Como provei.** Build com `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_secret_...`: `build exit=0`;
  `start` → `home=200 entrar=500 app=500`; log: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY recebeu a chave
  secreta...`; `.next/static` com a chave: **0 arquivos**. Build bom restaurado em seguida.

### H0-06 — Ordem do `SETUP_LOCAL.md` quebra na máquina limpa (🟡)

- **Cenário concreto de falha.** O bloco "Subir do zero" manda `make up` **antes** de `cp .env.example
  .env`. Mas `make up` chama `make migrate` → `hellosquad-local-db roles`, que lê `DATABASE_URL`/
  `API_DATABASE_URL` do `.env`. Quem segue a doc ao pé da letra quebra no primeiro `make up`.
- **Correção proposta.** Reordenar: `cp .env.example .env` e preencher as chaves (`supabase status
  -o env`, `openssl rand`) **antes** de `make up`; ou fazer o passo `roles` tolerar `.env` ausente no
  `up` inicial (só avisar), já que as migrations em si aplicam sem `.env`.
- **Como provei.** No clone, sem `.env`:
  ```
  make migrate -> exit 2
  cd apps/backend && uv run hellosquad-local-db roles
  erro: DATABASE_URL vazio no .env (usuário postgres do Supabase local).
  ```

## (c) O que tentei e NÃO quebrou

**Isolamento e autorização (alvos 1–5).**
- Marina (owner Miolo) lendo a Vitta: API `GET /workspaces/{vitta}` → 404 (igual a inexistente);
  Data API `workspaces|memberships|invitations` com filtros `id=eq`, `slug=eq`, `or=(…)` e joins
  `select=*,memberships(*)` → só a Miolo, **0 ocorrências** do id de outro tenant; `audit_events` → 403;
  `anon` → 401; GraphQL desligado; `count=exact` só revela o tamanho do próprio tenant.
- Carla (editor) escalando: UPDATE do próprio papel/do Rafael → `200 []` (RLS não afeta linha);
  INSERT de membership/convite → 403. Promovida a admin: não vira owner, não cria owner, não insere
  membership de owner, não cria convite de owner (403). Rafael (único owner) se rebaixando por UPDATE,
  DELETE e UPDATE em lote → 400 `23514`. Corrida de dois owners se rebaixando ao mesmo tempo: uma
  comita, a outra aborta; sempre sobra 1 owner.
- Escrita direta: `audit_events` INSERT/UPDATE/DELETE e `workspaces` INSERT como `authenticated` → 403.
  RPC de `app`/`public` como `anon`: schema `app` não exposto, função não encontrada, sem USAGE.
- Forja de token na API (8100): HS256, `aud` errado, `exp` vencido, `iss` errado, `kid` inexistente,
  sem `role`, `alg: none`, segredo errado, `role: service_role` forjado, `sub` de outro → **401 em todos**.
- Concorrência: 180 requisições de 3 tenants em paralelo (30 rodadas) → 0 mistura; a conexão volta ao
  pool sem claims.

**Web (alvos 6–7).**
- `safeNext` bloqueia `//site`, `https://…`, `/apple`, `\`, `%2F%2F` (literal e decodificado),
  `/app//evil`, `/APP`, `/app@evil`, `javascript:`, espaço à frente; só `/app`, `/app/…`, `/app?`,
  `/app#` passam.
- `/sair` por GET não encerra sessão (com e sem sessão). `/app/vitta` e `/app/trilha` como Marina →
  404 sem vazar dado. Sessão adulterada → `/entrar`, sem vazar. `noindex`/`X-Robots-Tag` em `/app`,
  `/app/<inexistente>` e rota funda. Host preservado (127.0.0.1 não vira localhost).
- Cadastro valida nome/e-mail/senha em pt-BR, sem emoji, **sem criar usuário** (auth.users=5);
  duplicado → "Já existe uma conta com esse e-mail." Slug rejeita curto/longo/acento/espaço/`--`/vazio
  e **injeção SQL** (no slug → 422; no nome → gravado literal, tabela intacta); maiúscula normalizada.

**Diretrizes do dono (alvos 8–11).** Nada aponta para nuvem (CI sem deploy; URLs de config locais).
Histórico do git sem segredos (`eyJ…`, `sb_secret_…`, `sk-ant-…`, chave privada = 0); `.env` nunca
commitado. Só dados fictícios (seed `.example`; sem CPF/CNPJ/telefone/marca real; captura conferida).
UI em pt-BR, 0 emoji; códigos de erro em inglês, mensagens em pt-BR.

**Reprodutibilidade (alvos 12–13).** Clone limpo do GitHub + `.env` → `make up/seed/test/e2e` todos
exit 0 (pytest 45, Vitest 53, pgTAP 98, Playwright 5/5). 15/15 afirmações de J0/S0/A0 conferem no disco.

## (d) Veredito sobre o critério de pronto

- **J0 (ambiente local).** ✅ atendido no que é local: `supabase status` nas portas próprias sem
  derrubar outros containers (11 `*_hellosquad`, 35 de terceiros intactos); `make up && make test`
  verde. **Aberto (dono):** "CI verde no push" — o workflow está em `infra/github/workflows/` e não em
  `.github/` porque o token não tem escopo `workflow`. Não é defeito da entrega; é ação do Vic.
- **S0 (identidade e isolamento).** ✅ atendido e **confirmado adversarialmente**: `make migrate &&
  make seed && make test` verde com os testes de RLS; `/health` e `/me` com JWT do seed; isolamento,
  escalada de papel, forja de token e imutabilidade da auditoria resistiram. As 7 regras de identidade
  seguem aguardando confirmação do dono (S0 §6), aceitas provisoriamente.
- **A0 (Design System e casca).** ✅ atendido: Marina entra e vê a casca com a Miolo; Pedro entra e cai
  na criação de workspace; lint e build verdes; clone roda o e2e. Os achados do web (H0-02/03/04/05) são
  defesa em profundidade/hardening, não bloqueiam o critério.
- **Fase 0 (fundação local).** ✅ **pronta e reprodutível. Nenhum achado bloqueante.** Como QA sou
  consultivo: recomendo ao Thor tratar **H0-06 agora** (correção de doc, barata) e decidir quando
  entram H0-02/H0-03 (hardening do web) e H0-04 (slug reservado na API); **H0-01 precisa de decisão do
  dono antes da nuvem** (exposição da Data API). Quem aceita ou devolve é o Thor.

## (e) Perguntas para o dono (novas da H0; as de S0 §6 e A0 §6 seguem abertas)

1. **Data API em produção.** O produto só fala com a API própria (8100); o browser não usa a Data API
   (A0 decisão 11). Na nuvem, mantemos a Data API (`/rest/v1`) exposta (protegida só por RLS) ou a
   restringimos/desligamos? (Ver H0-01.)
2. **Cabeçalhos de segurança e cookie httpOnly.** Entram ainda como hardening tardio da Fase 0, ou
   ficam para a Fase 5 (produção/HTTPS)? (Ver H0-02 e H0-03.)
3. **Slug reservado na API.** Confirmar a lista de reservados no backend (`novo-workspace` + rotas
   fixas de `/app`) para a próxima fatia de backend. (Ver H0-04.)

## (f) Estado em que deixei a máquina

- Banco no estado do seed (`make seed`): 3 workspaces, 4 memberships, 0 convites, 0 eventos, Pedro sem
  membership. Workspaces e eventos de teste da H0 removidos.
- API e web parados (portas 8100 e 3100 livres). `docker ps`: 11 `*_hellosquad` + 35 de terceiros,
  a mesma contagem do início. Só mexi no Supabase do HelloSquad.
- Scripts de prova em `docs/parciais/h0/`. Logs com chaves locais em `/tmp/h0_*` removidos ao fim.
