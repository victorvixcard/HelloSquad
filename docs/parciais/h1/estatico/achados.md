# H1 — Laudo estático e do web em execução (auditoria de QA e segurança)

**Fatia:** H1, parte "estático + web". **Data:** 16/10/2026, 13:30 → 13:53. **Ambiente:** web em `next dev`
(127.0.0.1:3100), API (127.0.0.1:8100) e Supabase local (127.0.0.1:56321). **Método:** atacar o web rodando
(curl e Playwright/Chromium) e varrer a árvore e o histórico do git. Nenhum código de produto foi alterado e nada
foi gravado no banco: só logins pela Auth local, GETs e um PUT na Auth com senha fraca (`"a"`), que a Auth recusa
antes de gravar. Saídas completas ficam em `/tmp/h1_est_*`, e os tokens e chaves aparecem mascarados neste laudo.

**Resultado:** nenhum achado bloqueante. **🔴 0 · 🟡 3 · ℹ️ 6.** O isolamento entre tenants no Realtime, a
proteção do redirecionamento `?next=`, a CSP, o cookie httpOnly e a ausência de segredo e de nuvem resistiram a
todos os ataques.

## Tabela-resumo

| # | Achado | Sev. | Onde | Quebra isolamento, segredo ou redirecionamento? |
|---|---|---|---|---|
| H1E-01 | O "token do Realtime" é o token de sessão completo e troca a senha sem reautenticação | 🟡 | `realtimeTokenAction` + `supabase/config.toml:236` | Não sozinho. Depois de um XSS, a conta é tomada para sempre, não "no máximo 1 h" como diz a A1a §3 |
| H1E-05 | A guarda do autosave não procura JWT nem cookie de sessão nos arquivos novos, e o autosave faz push | 🟡 | `infra/git-autosave.sh:33` | Não hoje: 0 JWT em todo o repositório e histórico |
| H1E-06 | Placeholders do catálogo usam um domínio real (`seunegocio.com.br`), fora do `.example` | 🟡 | `apps/web/messages/pt-BR/auth.json:11`, `home.json:59` | Não (é texto de exemplo, não dado de teste) |
| H1E-02 | O Realtime aceita entrar no canal **público** `workspace:<id de outro tenant>` | ℹ️ | config do Realtime | Não provado. O envio é `private=true`, e conferir a recepção exigiria gravar no banco |
| H1E-03 | Cookie de sessão sem `Secure` e com validade de 400 dias | ℹ️ | `lib/supabase/session-cookie.ts` | Não (local é http; fica para a Fase 5) |
| H1E-04 | A ação do token responde em qualquer rota, inclusive na pública `/` | ℹ️ | Server Actions do Next | Não (devolve só o token do próprio cookie e confere a Origin) |
| H1E-07 | CSP: `'unsafe-eval'` (só em dev) e `'unsafe-inline'` em script na página estática `/` | ℹ️ | `lib/security-headers.ts` | Não (o segundo é pendência conhecida da A0b) |
| H1E-08 | Padrões de segredo em valores fictícios de teste e em documentação | ℹ️ | testes e docs | Não (são falsos positivos esperados) |
| H1E-09 | Marcas de fornecedor num comentário de `squad/` e marca de verificação U+2713 em logs de ferramenta | ℹ️ | `squad/max/agent.yaml:35`, 3 `.txt` | Não |

---

## Achados

### H1E-01 🟡 — O token que o browser recebe "para o Realtime" é o token de sessão completo e troca a senha sem reautenticação

- **O que a fatia afirma (A1a §3):** "o browser recebe só o token de acesso, para o Realtime". Também: "agora leva
  no máximo o token de acesso em memória (vale cerca de 1 h)".
- **O que vi:** a afirmação sobre o refresh token se confirma, porque ele não sai do servidor. Já o token devolvido
  por `realtimeTokenAction` não se limita ao Realtime: é o token de sessão inteiro (`role=authenticated`,
  `aud=authenticated`, `session_id` presente, vale 3600 s). Durante 1 h, ele abre:
  - a API (8100);
  - a Data API local, limitada pela RLS;
  - o Storage;
  - `GET /auth/v1/user`, que devolve e-mail e metadados;
  - `PUT /auth/v1/user` sem reautenticação. Com `secure_password_change = false` no `config.toml:236`, uma senha
    válida seria aceita. Mesmo com o valor `true`, a Auth só exige reautenticação para sessões com mais de 24 h, e o
    próprio comentário do `config.toml` diz "or have logged in recently".
- **Cenário:** um XSS na área logada chama a Server Action do token, que é same-origin e por isso passa na checagem
  de Origin. Em seguida faz `PUT /auth/v1/user {"password":"<nova>"}`. O atacante passa a entrar com a nova senha,
  sem prazo, e a dona da conta perde o acesso. O ganho do httpOnly existe (o refresh token não vaza), mas o teto
  "no máximo 1 h" não vale.
- **Mitigação já existente:** CSP com nonce e `'strict-dynamic'` em todas as rotas dinâmicas. Não encontrei nenhum
  XSS.
- **Correção proposta** (envolve o que já foi combinado, então o Thor leva ao Vic antes de qualquer mudança):
  1. corrigir o texto da A1a §3, do tipo "um XSS ainda pode trocar a senha na janela de 1 h";
  2. ligar `secure_password_change = true` no local e na produção;
  3. fazer a troca de senha da UI passar pela nossa API, exigindo a senha atual;
  4. avaliar um token dedicado ao Realtime, de vida curta e com claims mínimas.
- **Prova:** `a2_web.mjs` (com `ONLY_TOKEN=1`, só a parte do token):
  ```
  claims do token: {"role":"authenticated","aud":"authenticated","iss":"http://127.0.0.1:56321/auth/v1","aal":"aal1","ttl_s":3600,"session_id":true,"sub":"f6262f37-c***(36)"}
  authUser: 200 {"id":"f6262f37-…","role":"authenticated","email":"marina@miolo.example",…}
  authTrocaSenhaFraca (PUT /auth/v1/user {"password":"a"}): 422 {"error_code":"weak_password","msg":"Password should be at least 6 characters."}
  apiWorkspaces: 200 {"items":[{"slug":"miolo","role":"owner",…}]} | dataApiWorkspaces: 200 [{"slug":"miolo"}] | storageBuckets: 200 []
  $ sed -n '236p' supabase/config.toml  ->  secure_password_change = false
  ```
  O 422 por senha fraca, e não 401/403 nem `reauthentication_needed`, mostra que o token tem autoridade para trocar
  a senha. Com 6 caracteres ou mais, a troca seria gravada. Não executei a troca porque o banco não pode ser alterado.

### H1E-05 🟡 — A guarda do autosave não procura JWT nem cookie de sessão nos arquivos novos, e o autosave faz push

- **Cenário:** alguém cola um `access_token` ou um `Cookie: sb-127-auth-token=…` num `.txt`, `.json` ou `.har`
  novo em `docs/parciais/**`. A guarda funciona assim:
  - a linha 29 procura JWT, mas só no `git diff HEAD`, que cobre apenas arquivos já rastreados;
  - a linha 33 cobre os arquivos novos, mas só procura `sk-ant-`, `sb_secret_` e `PRIVATE KEY`;
  - depois vêm `git add -A` (linha 37) e `git push` (linha 40) para o repositório público.

  O token iria para o GitHub. Hoje há **0 JWT** na árvore, no histórico e nas evidências.
- **Correção proposta:** na linha 33, acrescentar `eyJ[A-Za-z0-9_-]{20,}\.eyJ`, `sb-[a-z0-9]+-auth-token(\.[0-9]+)?=`
  e `postgres(ql)?://[^:]+:[^@$<{]{8,}@`. Como opcional, comparar o diff e os arquivos novos com os valores do
  `.env` local. A mudança está em `infra/`, então quem decide é o Thor.
- **Prova:** `sed -n '29p;33p' infra/git-autosave.sh`. A linha 29 contém `eyJ[A-Za-z0-9_-]{20,}\.…`; a linha 33
  contém só `sk-ant-…|sb_secret_…|BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY`.

### H1E-06 🟡 — Os placeholders do catálogo usam domínio real registrável, fora da convenção `.example`

- **Cenário:** a tela de login e o onboarding mostram `voce@seunegocio.com.br` e `seunegocio.com.br`, que também
  aparecem nas capturas (`a0/01-entrar.png`). A diretriz de 15/10 diz que "e-mails fictícios usam o TLD reservado
  `.example`". Este é o único e-mail fora de `.example` em todo o escopo, e o domínio pode ser de um terceiro. A
  origem é o protótipo V4.6 (`docs/parciais/x1/out/land/land_template.txt:1182`).
- **Correção proposta:** o texto veio do protótipo, que é combinado, então a decisão é do Vic: trocar por
  `voce@seunegocio.example` e `seunegocio.example`, ou registrar a exceção "placeholder de UI" em
  `docs/DADOS_FICTICIOS.md`.
- **Prova:** `grep -rn seunegocio apps/web/messages` encontra `auth.json:11 "emailPlaceholder": "voce@seunegocio.com.br"`
  e `home.json:59 "sitePlaceholder": "seunegocio.com.br"`.

### H1E-02 ℹ️ — O Realtime aceita que Rafael (Vitta) entre no canal público `workspace:<id da Miolo>`

- **Cenário:** no canal privado, Rafael recebe recusa: "Unauthorized: You do not have permissions to read from
  this Channel topic". Mas, com `private:false`, o mesmo tópico responde `ok`. Os eventos do produto saem por
  `realtime.send(…, 'workspace:'||id, true)` (`supabase/migrations/20261016063800_realtime_broadcast.sql:19`), ou
  seja, só para o canal privado. Pelo desenho do Realtime, o assinante público não recebe essas mensagens, mas eu
  **não provei isso ao vivo**: precisaria gerar um evento na Miolo, o que grava no banco.
- **Correção proposta:**
  - na produção, desligar o acesso a canais públicos ("somente canais privados" no Realtime);
  - na suíte de integração do S, que já grava no banco de teste, incluir um caso em que um assinante público do
    tópico de outro tenant não recebe nada.
- **Prova:** `realtime joins` em `/tmp/h1_est_a2_stdout_token.txt`:
  - `marinaPrivadoMiolo` → `ok`;
  - `rafaelPrivadoMiolo` → `error` (Unauthorized);
  - `anonPrivadoMiolo` → `error`;
  - `rafaelPrivadoVitta` → `ok`;
  - `rafaelPublicoMiolo` → `ok`, sem nenhuma mensagem em 6 s.

### H1E-03 ℹ️ — Cookie de sessão sem `Secure` e com validade de 400 dias

- **O que vi:** `sb-127-auth-token` tem `HttpOnly=true` e `SameSite=Lax`, e `document.cookie` vem vazio. Isso
  confere com a A1a §3. Por outro lado, `Secure=false`, o que é esperado em http local, e `expires` é
  2027-11-20 (400 dias, o padrão do `@supabase/ssr`). `SESSION_COOKIE_OPTIONS` só define `httpOnly`.
- **Correção proposta:** na Fase 5, usar `secure: true` sob HTTPS, junto com o HSTS que já está previsto.
- **Prova:** `cookies sb-*: [{"name":"sb-127-auth-token","httpOnly":true,"sameSite":"Lax","secure":false,"path":"/","expires":"2027-11-20T16:46:33Z","len":2541}]`
  e `document.cookie: {"len":0,"hasSb":false,"hasJwt":false}`.

### H1E-04 ℹ️ — A ação do token (Server Action) responde em qualquer rota, inclusive na página pública `/`

- **Como o browser obtém o token:** com `POST` na própria página (por exemplo `/app/miolo`), cabeçalho
  `Next-Action: 001a1c2a…` e corpo `[]`. A resposta é `text/x-component` com `{"ok":true,"data":{"token":"eyJ***","expiresAt":…}}`.
- **O que vi:** o mesmo `POST` em `/`, que fica fora do matcher do middleware, também devolve o token se houver
  cookie. A ação usa `auth.getSession()`, que lê o cookie sem conferir a assinatura. O efeito, porém, é só ecoar o
  token do próprio cookie. A checagem de Origin do Next continua valendo. Não há escalada.
- **Correção proposta:** nenhuma obrigatória. Opcionalmente, trocar por `getClaims()`/`getUser()` antes de
  devolver, para recusar cookie adulterado.
- **Prova:** `viaPaginaPublica: 200 … {"ok":true,"data":{"token":"eyJ***"…}}`.

### H1E-07 ℹ️ — CSP: `'unsafe-eval'` só em dev, e `'unsafe-inline'` em script na página estática `/`

- O `'unsafe-eval'` aparece porque o servidor no ar é `next dev`, como o código previa (`dev: true`). Não testei o
  build de produção.
- O `'unsafe-inline'` em `script-src` de `/` (página estática, sem nonce) é a pendência já registrada pela A0b.
- **Prova:** a CSP de `/` termina em `script-src 'self' 'unsafe-inline' 'unsafe-eval'`. A de `/app/miolo` contém
  `script-src 'self' 'nonce-***' 'strict-dynamic' 'unsafe-eval'`.

### H1E-08 ℹ️ — Padrões de segredo que casam com valores fictícios de teste ou com documentação (sem segredo real)

- `sk-ant-tes***` e `sk-ant-seg***` em `apps/backend/tests/test_llm.py:73,235`: são chaves fictícias que o teste
  usa para conferir que a chave não aparece no log.
- `sb_publishable_ci_ficticia` em `infra/github/workflows/ci.yml:55`.
- `https://abc.supabase.co` em `apps/web/test/security-headers.test.ts:15`: é o teste da CSP de nuvem, e `abc` não é
  um ref válido.
- `api.anthropic.com` aparece só em `apps/backend/tests/test_llm.py:157`, como objeto de requisição simulado. Há 0
  ocorrências no adaptador, que usa a URL padrão do SDK.
- `postgres:postgres` (o padrão do CLI, em 127.0.0.1:56322) aparece 17 vezes. A senha real da role `hellosquad_api`
  que está no `.env` tem 0 ocorrências na árvore, no histórico e nas evidências; comparei pelo valor, sem imprimi-lo.

### H1E-09 ℹ️ — Marcas de fornecedor num comentário de `squad/` e marca de verificação U+2713 em logs de ferramenta

- `squad/max/agent.yaml:35` traz o comentário `# conector a definir (RD Station, HubSpot)`. É fornecedor de CRM a
  avaliar, não cliente de teste.
- A marca de verificação U+2713 aparece 25 vezes em `docs/parciais/s1f/make_e2e.txt`, `s1g/make_e2e.txt` e `s1d/make_test.txt`.
  É a saída do Playwright e do Vitest, não texto escrito por alguém.

---

## Comparação com o que as fatias afirmam

| Afirmação | Onde | Situação |
|---|---|---|
| Cookie da sessão `httpOnly`; `document.cookie` sem o token | A1a §3 | **Confere.** `HttpOnly`, `SameSite=Lax`, `document.cookie` vazio |
| O refresh token nunca sai do servidor | A1a §3 | **Confere.** A resposta da ação não contém `refresh_token` (`refresh:false` em todas as chamadas) |
| Um XSS leva "no máximo o token de acesso em memória (vale cerca de 1 h)" | A1a §3 | **Não confere por inteiro**: o token troca a senha (H1E-01) |
| "Incluir ws://127.0.0.1:56321 (local) e wss:// (nuvem) no connect-src" | pendência do Plano | **Atendida.** Local: `ws://127.0.0.1:56321` e `ws://localhost:56321`. Nuvem: `wss://` é derivado de uma URL `https://`, com teste unitário em `apps/web/test/security-headers.test.ts` |
| CSP com nonce nas rotas do middleware, cabeçalhos fixos em todas (H0-02) | A0b | **Confere** em 15 rotas, inclusive nos redirecionamentos 307 e na rota funda |

## O que ataquei e NÃO quebrou

**1. CSP e cabeçalhos** (`a1_cabecalhos.sh`, `a2_web.mjs`, `a3_rota_funda.mjs`)
- Testei 15 rotas: `/`, `/entrar`, `/criar-conta`, `/sair`, `/app`, as 7 rotas da Fase 1 em `/app/miolo/*`, a rota
  funda `trabalho/<id>` (anônimo 307 e logado 200), `/app/inexistente/a/b/c`, `robots.txt` e `sitemap.xml`. Todas
  têm:
  - CSP;
  - `frame-ancestors 'none'`;
  - `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`
    e `Permissions-Policy`;
  - `connect-src` com `ws://127.0.0.1:56321`;
  - **nenhum host de nuvem**.
- Abri `/app/miolo` logado no Chromium e percorri mais 9 rotas. Houve **0 violações de CSP**, tanto pelo evento
  `securitypolicyviolation` quanto no console.
- O websocket `ws://127.0.0.1:56321/realtime/v1/websocket` abriu, o `phx_join` em
  `realtime:workspace:<miolo>` (`private:true`, com token) recebeu `phx_reply ok`, e o HMR do Next também conecta.

**2. Cookie e rota do token**
- Sem sessão, o `POST` da ação recebe **307 para `/entrar`**, sem token.
- Com Origin `http://evil.example`, `http://localhost:3100` e `null`, a resposta é **500 "Invalid Server Actions
  request."**, sem token.
- O preflight `OPTIONS` vindo de `evil.example` recebe **400**, sem `Access-Control-Allow-Origin`.
- Nenhuma resposta traz `Access-Control-Allow-Origin`. O `Cache-Control` é **`no-store, must-revalidate`**, e não
  há `Set-Cookie` na resposta da ação.
- Rafael, chamando a ação na URL `/app/miolo`, recebe **o próprio token**, não o da Miolo. Com esse token:
  - o canal privado da Miolo é **recusado** (Unauthorized);
  - o da Vitta é aceito;
  - a API devolve `GET /workspaces/<vitta>` com o token da Marina como **404**, igual a inexistente;
  - a Data API devolve só `[{"slug":"miolo"}]`.

**3. `?next=`** (pelo formulário real de `/entrar`, 14 variações mais 5 com o campo oculto adulterado no DOM)
- **Todas terminam em `http://127.0.0.1:3100`:** `//evil.example`, `https://evil.example`, `/\evil.example`,
  `%2F%2Fevil.example`, `%252F%252F…`, `/app@evil.example`, `javascript:alert(1)`, `/app//evil.example`,
  `/app?x=https://evil.example`, `%09//evil.example`, `/app\@evil.example`, `/app/%2F%2Fevil.example` e
  `/app/..%2F..%2Fevil`.
- Os valores aceitos ficam só em caminhos internos de `/app`. O servidor revalida o `next` que vem no POST
  (`safeNext` em `auth-actions.ts:36`), então nenhum dos 5 adulterados escapa.
- `/app/vitta` como Marina **não vaza nada**: 0 ocorrências do id da Vitta e 0 nomes de membros (Rafael, Carla) no
  HTML.
- `/sair?next=https://evil.example`: depois do POST de saída, a pessoa vai para `/entrar`, porque o `signOut` ignora
  o `next`.
- O `grep` em `apps/web` não encontrou `returnTo`, `redirect_to`, `redirect` ou `callbackUrl` aceitos em outra rota.
  Só existem o `next` do login e o `sessao=expirada`, que é comparado por igualdade e não refletido.

**4. noindex**
- `X-Robots-Tag: noindex, nofollow` aparece em `/app` e `/app/*`, inclusive no 307 anônimo, no 404 e na rota funda.
- O meta `robots` vale `noindex, nofollow, nocache` em todas as páginas de `/app` (Início, Equipe, Modo Autônomo,
  Memória da Marca, Sala do Squad, Squad/Nexo, trabalho, novo-workspace e 404).
- `/entrar` tem `noindex, follow` e `/sair` tem `noindex, nofollow`.
- `robots.txt` bloqueia `/app` e `/sair`, também para GPTBot, ClaudeBot, PerplexityBot e Google-Extended. O
  `sitemap.xml` lista só `/` e `/criar-conta`.

**5. Nuvem** (`varredura_nuvem_segredos.sh`). Contagens no formato árvore / histórico / evidências, sobre 702
arquivos, 236 commits e 476 arquivos de evidência:
- `railway.app` 0/0/0, `vercel.app` 0/0/0, `<ref>.supabase.co` real 0/0/0;
- `supabase.com` só no link de documentação em `config.toml:2`;
- `next.config.ts` não tem nenhuma URL; nas outras configs, as URLs são todas 127.0.0.1 ou localhost;
- não existe `.github/`, e o `infra/github/workflows/ci.yml` não tem deploy nem `secrets.`.

**6. Segredos**, no mesmo formato árvore / histórico / evidências:
- JWT `eyJ…\.eyJ` 0/0/0; `sb_secret_` com valor 0/0/0;
- `access_token` e `refresh_token` com valor 0/0/0;
- `ghp_`, `AKIA` e `xox*` 0/0/0;
- `BEGIN … PRIVATE KEY` só na regex do autosave;
- nenhum `.env` real em commit algum; `.env`, `.env.*` e `*.pem` estão ignorados;
- o `.env` local usa as chaves padrão do CLI, conferidas por sha256, e as chaves completas aparecem 0 vezes no repo.
- Capturas: 157 PNG, 9 com nome suspeito. Abri 6 (`a0/01-entrar`, `sa0/01-contas`, `sa0/02-conta-miolo`,
  `a1b/nosso-conta-creditos`, `a1f/nosso-08-envio-uma-mensagem`, `h1/aceite/02-conversa-entrega-v1`) e nenhuma
  mostra chave, token, cookie ou dado real.

**7. Dados fictícios** (`varredura_dados_idioma.py`, 535 arquivos):
- e-mails fora de `.example` em seed, fixtures, squad e testes: 0 (só o placeholder do H1E-06);
- CPF/CNPJ, com dígito verificador: 0;
- telefone fora de `+55 11 99999-00NN`: 0;
- marca real como cliente: 0. Instagram, WhatsApp e similares aparecem só como canal;
- o `seed.sql:19` aborta se houver e-mail fora de `.example`.

**8. pt-BR sem emoji:**
- emoji em `apps/`, `packages/`, `supabase/`, `squad/`, `infra/`, catálogo e fixtures: 0;
- **230 commits desde 16/10 00:00**, 0 com emoji e 0 com assunto em inglês;
- catálogo com 1006 chaves, 0 valores em inglês e 0 chaves sem tradução;
- literais de UI fixos fora do catálogo: 0. Restam só "HelloSquad", que é a marca, e 2 `throw new Error` de
  proteção para quem desenvolve.

## Scripts (todos em `docs/parciais/h1/estatico/`)

| Script | O que prova | Como rodar |
|---|---|---|
| `a1_cabecalhos.sh` | Itens 1 e 4 sem sessão: cabeçalhos, CSP, robots e sitemap | `bash docs/parciais/h1/estatico/a1_cabecalhos.sh` → `/tmp/h1_est_a1_anon.txt` |
| `a2_web.mjs` | Itens 1 a 4 logado: CSP no console, websocket, cookie, ação do token (sem sessão, outra origem, outro tenant, cache, alcance), canais do Realtime, noindex, `?next=` e `/sair` | `cd apps/web && node ../../docs/parciais/h1/estatico/a2_web.mjs` (`ONLY_TOKEN=1` roda só a parte do token) → `/tmp/h1_est_a2_result.json` |
| `a3_rota_funda.mjs` | Itens 1 e 4 numa rota funda real (`squad/<agente>/trabalho/<id>`), logado | `cd apps/web && node ../../docs/parciais/h1/estatico/a3_rota_funda.mjs` |
| `varredura_nuvem_segredos.sh` | Itens 5 e 6: árvore, `git log -p --all`, evidências e `.gitignore` | `bash docs/parciais/h1/estatico/varredura_nuvem_segredos.sh > /tmp/h1_est_b1_saida.txt` |
| `varredura_dados_idioma.py` | Itens 7 e 8: e-mail, CPF/CNPJ, telefone, marcas, emoji, inglês e literais fora do catálogo | `python3 docs/parciais/h1/estatico/varredura_dados_idioma.py` → `/tmp/h1_est_b2_saida.txt` |

**Limites:**
- Rodei contra `next dev`, sem testar o build de produção.
- A recepção no canal público (H1E-02) não foi provada ao vivo, porque exigiria gravar no banco.
- A detecção de literais de UI é heurística, por linha.
- A lista de marcas é finita, com cerca de 90 nomes.
