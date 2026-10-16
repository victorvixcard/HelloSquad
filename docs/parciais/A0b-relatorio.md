# A0b — Relatório (Aranha): hardening do web apontado pela H0

Fatia de 02:56 a 03:08 de 16/10/2026. Commits: `2d350f8` (progresso), `476373b` (H0-02), `dc239f8` (H0-05)
e o deste relatório. Não toquei `apps/backend`, `supabase/` nem `docs/SETUP_LOCAL.md`; não rodei `make test`
nem `make e2e`.

## 1. O que mudou

- **H0-02, cabeçalhos.** `apps/web/lib/security-headers.ts` (novo) monta a CSP e os cabeçalhos fixos.
  `next.config.ts` aplica em `/:path*`: `X-Frame-Options: DENY`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` (câmera,
  microfone, localização, pagamento e USB desligados) e a CSP sem nonce. O `middleware.ts` gera um nonce
  de 128 bits por requisição e põe a CSP com `'nonce-…' 'strict-dynamic'` na requisição (o Next lê dali e
  marca os próprios scripts) e na resposta, onde ela substitui a do `next.config.ts` (sai um cabeçalho só).
  `connect-src` sai de `NEXT_PUBLIC_SUPABASE_URL` (local: `127.0.0.1` e `localhost`). `'unsafe-eval'` só
  no `next dev`. Sem HSTS. `/criar-conta` e `/sair` viraram dinâmicas: passam pelo middleware e, estáticas,
  não recebem o nonce.
- **H0-05, boot.** `webEnvProblems()` em `lib/env.ts` confere `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  (`sb_publishable_…`; a `sb_secret_` tem mensagem própria), `NEXT_PUBLIC_SUPABASE_URL` e `API_URL`
  (`http(s)://`). O `next.config.ts` lança erro em português e o build e o start abortam; o valor nunca é
  impresso. O guard por requisição (`supabasePublicEnv()`) continua. `API_URL` passou a ser obrigatória
  (antes caía em `127.0.0.1:8100` em silêncio). O job web do CI (`infra/github/workflows/ci.yml`) ganhou
  as três variáveis com valores públicos fictícios, senão o build do CI quebraria.
- **H0-03, cookie.** Não alterado; decisão proposta na §4.

## 2. Como verifiquei

### 2.1 `curl -I` (`next start` na 3101), íntegra em `a0b/curl-cabecalhos.txt`

```text
$ curl -sI http://127.0.0.1:3101/
HTTP/1.1 200 OK
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' http://127.0.0.1:56321 http://localhost:56321

$ curl -sI http://127.0.0.1:3101/entrar
HTTP/1.1 200 OK
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
content-security-policy: default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; script-src 'self' 'nonce-GkZxOwrzG+2JBAQEXMMoRQ==' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' http://127.0.0.1:56321 http://localhost:56321

$ curl -sI http://127.0.0.1:3101/app
HTTP/1.1 307 Temporary Redirect
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
content-security-policy: default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; script-src 'self' 'nonce-ePEuL8yAi30H+3lr6BXdXQ==' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' http://127.0.0.1:56321 http://localhost:56321
X-Robots-Tag: noindex, nofollow
location: /entrar?next=%2Fapp
```

Nas quatro rotas (incluindo um 404): 1 cabeçalho `Content-Security-Policy` e 0 `Strict-Transport-Security`.

### 2.2 Browser: `node docs/parciais/a0b/csp-check.mjs` (Chromium, sem login, saída em `a0b/csp-check.txt`)

```text
OK   / status=200 csp=estática violações=0 console_csp=0 erros=0 hidratada=true scripts=23 com_nonce=0
      controle XSS: <script> RODOU, onerror= RODOU
OK   /entrar status=200 csp=nonce violações=0 console_csp=0 erros=0 hidratada=true scripts=18 com_nonce=18
      controle XSS: <script> barrado, onerror= barrado
OK   /criar-conta status=200 csp=nonce violações=0 console_csp=0 erros=0 hidratada=true scripts=17 com_nonce=17
      controle XSS: <script> barrado, onerror= barrado
OK   /sair status=200 csp=nonce violações=0 console_csp=0 erros=0 hidratada=true scripts=17 com_nonce=17
      controle XSS: <script> barrado, onerror= barrado
controle: iframe de /entrar recusado; Framing 'http://127.0.0.1:3101/' violates the following Content Security Policy directive: "frame-ancestors 'none'".
csp-check: 0 violação, todas hidratadas
```

"Hidratada" = o React marcou o `<main>` (o JS da página rodou). O controle XSS reentrega o mesmo HTML com
`<script>` e `onerror=` sem nonce, mantidos os cabeçalhos. Contra o `next dev` na 3101: o mesmo resultado
(0 violação, tudo hidratado).

### 2.3 Boot (íntegra em `a0b/boot-validacao.txt`; valores fictícios)

```text
$ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_secret_<ficticia> pnpm --filter web build   -> exit 1
 ⨯ Failed to load next.config.ts, see more info here https://nextjs.org/docs/messages/next-config-error
Error: Configuração do web inválida no .env da raiz (docs/SETUP_LOCAL.md):
  - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY recebeu a chave secreta (sb_secret_…), que ignora a RLS e nunca pode ir para o browser. Use a publicável (sb_publishable_…).
$ (mesma chave) next start --port 3101   -> exit 1, a porta nunca escutou
$ NEXT_PUBLIC_SUPABASE_URL=ftp://… API_URL=nao-e-url NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=chave-qualquer … build   -> exit 1, três itens listados
$ (sem .env, só as variáveis do CI) pnpm --filter web build   -> exit 0
```

O build que falha não toca o `.next` anterior (`BUILD_ID` com o mesmo horário antes e depois).

### 2.4 `pnpm --filter web build` (03:05) e `make test-web` (03:07), depois da última mudança de código

```text
make test-web exit=0
$ eslint
packages/contracts typecheck: Done
packages/ui typecheck: Done
apps/web typecheck: Done
packages/contracts test:       Tests  9 passed (9)
packages/ui test:       Tests  44 passed (44)

pnpm --filter web build exit=0
 ✓ Compiled successfully in 5.2s
 ✓ Generating static pages (9/9)
┌ ○ /    ├ ○ /_not-found    ├ ƒ /app …    ├ ƒ /criar-conta    ├ ƒ /entrar    ├ ○ /robots.txt    ├ ƒ /sair    └ ○ /sitemap.xml
ƒ Middleware                             95.1 kB
```

## 3. Pendências

1. **`'unsafe-inline'` em `script-src` nas páginas estáticas** (`/`, 404, `robots.txt`, `sitemap.xml`): o
   HTML sai do build, sem nonce por requisição. O controle da §2.2 mostra que um script injetado rodaria em
   `/`. Hoje `/` não tem por onde injetar (HTML fixo do build, JSON-LD escapado). Saídas: `/` e o 404
   dinâmicos com o middleware em todas as rotas (desfaz a decisão 8 da A0, página pública estática), ou
   hashes dos scripts inline gerados no build. Para a Fase 5.
2. **`'unsafe-inline'` em `style-src`:** `AgentDot`, `Agent`, `GlyphEyes` e `CommandField` usam `style=""`,
   e nonce não cobre atributo. Sair disso pede trocar `style=` por classe ou variável CSS no DS.
3. **Realtime (Fase 1):** o WebSocket da Supabase entra no `connect-src` (`ws://127.0.0.1:56321` local,
   `wss://` na nuvem), em `lib/security-headers.ts`.
4. **HSTS** (e `upgrade-insecure-requests`) na Fase 5, sob HTTPS.
5. **`/app/*` com sessão não abri no browser:** precisa da API na 8100, em uso pela S0b. É o mesmo mecanismo
   do `/entrar` (página dinâmica, nonce lido da requisição); o `make e2e` do Thor cobre: recolher a barra, a
   gaveta e o Esc só funcionam com a página hidratada.
6. **`docs/SETUP_LOCAL.md` linha 200** ("Web responde 500 com 'Faltam NEXT_PUBLIC_SUPABASE_URL…'") ficou
   velha: agora build e start abortam. Não editei (o briefing libera o arquivo só para variável nova, e a S0b
   está nele). Texto proposto: `| next build ou next start abortam com "Configuração do web inválida…" |
   Variável do web ausente ou errada no .env da raiz | Corrija o item que a mensagem lista (ver "Chaves
   locais") e rode de novo. |`. A linha 52 ("o web se recusa a subir com a sb_secret_") passou a ser verdade.
7. A URL da Supabase entra na CSP no build (NEXT_PUBLIC_* são embutidas): trocar a URL pede rebuild, como já
   era para as NEXT_PUBLIC_*.

## 4. H0-03: decisão proposta para a Fase 1 (não implementada)

Como o browser hoje não chama a API nem lê a sessão (A0 decisão 11; `lib/supabase/client.ts` sem uso), a
proposta é ligar `cookieOptions: { httpOnly: true }` no `createServerClient` do `@supabase/ssr` (servidor e
middleware) assim que a Fase 1 definir se o Realtime no browser precisa do token; se precisar, o cookie
segue legível e a defesa fica com a CSP com nonce desta fatia.

## 5. Onde divergi do briefing

1. **`'unsafe-inline'` não ficou só em `style-src`:** fiz o nonce nas rotas do middleware (sessão e entrada
   de usuário); nas estáticas, `script-src` mantém `'unsafe-inline'` para não desfazer a página pública
   estática da A0 (pendência 1, reversível).
2. **`/criar-conta` e `/sair` deixaram de ser estáticas**, exigência do nonce. Custo pequeno: as duas já
   passavam pelo middleware com `getClaims()` a cada requisição.
3. **Editei `infra/github/workflows/ci.yml`** (só o `env` do job web), fora da lista do briefing: sem isso a
   validação no boot quebraria o build do CI.

## 6. Estado em que deixei a máquina

- Porta 3101 livre, nenhum `next` rodando; 3100 e 8100 não usadas por mim. Containers e banco intocados.
- `apps/web/.next`: build de produção desta fatia (o `next dev` reescreveu o `.next`; apaguei e refiz).
- **`.env` da raiz:** às 03:04, por cerca de 30 s, movi o arquivo para `/tmp` para simular o build do CI
  sem `.env` e o devolvi (mesmo tamanho, permissão 600). Se a S0b viu falha ao ler o `.env` nesse minuto, foi
  isso. Da próxima vez simulo num clone temporário.
- Logs em `/tmp/a0b_*`: 0 chave (conferido com `grep`).
