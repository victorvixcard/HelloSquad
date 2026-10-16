# H2 — Varredura estática e site público em build de produção (auditor auxiliar do Hulk)

16/10/2026, 18:59–19:20. Árvore auditada: `main` em `bc58140` (o código de `apps/web` não mudou até `69a73c6`).
A parte 1 rodou na árvore principal, sem banco. A parte 2 rodou num build de produção separado: worktree destacado
`/tmp/h2_web`, `pnpm install --frozen-lockfile` e `pnpm --filter web build` com exit 0 (o build inclui "Linting and
checking validity of types"), `next start` em `127.0.0.1:3198`. A web do dono (3100) e a API (8100) ficaram no ar o
tempo todo. Nada em `apps/`, `packages/`, `squad/`, `supabase/`, `infra/` ou `Makefile` foi alterado. Ids provisórios.

## Tabela-resumo

| Id | Sev. | Achado | Onde (principal) |
|---|---|---|---|
| E-01 | 🔴 | "grátis" / "free" / "gratis" no site público e no `<title>` de `/criar-conta` (no sitemap), contra a regra escrita do dono | `apps/web/messages/*/site.json:115`, `messages/*/auth.json:25,28,30,32`, `components/site/Landing.tsx:62` |
| E-02 | 🟡 | A guarda do autosave não reconhece chave do Asaas, do Mercado Pago nem segredo de webhook (repositório público) | `infra/git-autosave.sh:32` |
| E-05 | 🟡 | Catálogo do backend: en e es sem 209 das 290 chaves; a falta cai calada no pt-BR | `apps/backend/src/hellosquad/i18n/__init__.py:24`, `en.json`, `es.json` |
| E-06 | 🟡 | Saudação e pedidos sugeridos dos especialistas fixos em pt-BR no `agent.yaml` | `apps/backend/src/hellosquad/conversations/opening.py:81,123`, `squad/*/agent.yaml:10` |
| E-07 | 🟡 | 37 mensagens de erro da API em pt-BR no código, mostradas na tela em en/es | `apps/backend/src/hellosquad/**` (`ApiError`), `api/errors.py`, `components/env/crm/ImportPanel.tsx:54` |
| E-08 | 🟡 | Objetivo do primeiro acesso gravado com assunto e chave fixos em pt-BR | `apps/web/lib/onboarding.ts:10`, `app/app/[workspace]/memory-actions.ts:94` |
| E-09 | 🟡 | Memória da Marca ordena e acha os "Principais conhecimentos" comparando texto pt-BR | `apps/web/components/memory/memory-model.ts:16-32` |
| E-12 | 🟡 | O catálogo inteiro (inclusive o da área logada) vai serializado no HTML de cada página pública: 73% do HTML, com Instagram, Facebook, Google Ads, WhatsApp e "grátis" no código-fonte | `apps/web/app/layout.tsx:36`, `apps/web/i18n/request.ts:11` |
| E-03 | ℹ️ | Telefones de teste fora da convenção `+55 11 99999-00NN` | `apps/backend/tests/test_s2b_deliveries.py:607,612,658,665` |
| E-04 | ℹ️ | RD Station e HubSpot num comentário de `squad/` (reincidente da H1E-09) | `squad/max/agent.yaml:35` |
| E-10 | ℹ️ | Sem `error.tsx`, `global-error.tsx` nem `loading.tsx`: erro de execução mostra a página padrão do Next em inglês | `apps/web/app/` |
| E-11 | ℹ️ | `home.hello` = "Hello, {name}." nos três idiomas | `apps/web/messages/*/home.json:3` |
| E-13 | ℹ️ | `/favicon.ico` 404 no site todo (best-practices 96 em `/como-funciona`) | `apps/web/app/` (sem ícone; não há `public/`) |
| E-14 | ℹ️ | CSP do site público (pt-BR estático e também `/en/**` e `/es/**`, que são dinâmicos) com `script-src 'unsafe-inline'`, sem nonce; sem HSTS em nenhuma rota | `apps/web/middleware.ts:18-22`, `lib/security-headers.ts:27-29` |
| E-15 | ℹ️ | JSON-LD das páginas internas aponta para `@id` que só existe no grafo da home; meta robots duplicada nos 404 | `apps/web/lib/site-seo.ts:84,169,195-196`, `app/not-found.tsx:7` |

**Contagem: 🔴 1 · 🟡 7 · ℹ️ 7.** Nenhum segredo real no repositório nem no histórico; nenhum dado real de terceiro;
nenhum fornecedor de IA, infraestrutura ou pagamento citado no site (nem no HTML bruto); nenhuma rota de preço.

## Achados

### E-01 🔴 — "grátis" / "free" / "gratis" no site público e no cadastro indexado

- **Onde:** botão do Hero de `/`, `/en` e `/es`: `apps/web/components/site/Landing.tsx:62` (`t("home.signUp")`), textos em
  `apps/web/messages/pt-BR/site.json:115` ("Criar conta grátis"), `en/site.json:115` ("Create a free account"),
  `es/site.json:115` ("Crear cuenta gratis"). Página `/criar-conta`, que está no sitemap (`apps/web/app/sitemap.ts:23`) e
  é indexável (sem meta robots nem `X-Robots-Tag`): `<title>`, `h1` e botão de `messages/*/auth.json:28,30,32`, usados em
  `apps/web/app/(auth)/criar-conta/page.tsx:10,24` e `SignupForm.tsx:51`; link de `/entrar` (`auth.json:25`,
  `app/(auth)/entrar/page.tsx:40`). Por causa do E-12, a palavra também está no código-fonte de todas as páginas: "grátis"
  em 13 páginas pt-BR (5 vezes cada, 10 em `/criar-conta`), "free" nas 12 en e "gratis" nas 12 es.
- **Regra:** `docs/conteudo/site/README.md:10`: "Nenhum preço, plano, crédito, "grátis" ou condição comercial. Sem
  rota /precos." (decisão do Vic, 16/10, "preço e créditos ficam por último"). É a P1 da N2a, pendente com o dono; a A2c
  (§5 item 1) afirma que o Hero é "o único lugar do site público com grátis", mas não é.
- **Cenário:** o buscador indexa `/criar-conta` com o título "Criar conta grátis · HelloSquad" (e en/es); quando o preço
  vier, o site já prometeu gratuidade em quatro superfícies por idioma. Se o dono mantiver o botão da R32 na P1, este
  achado cai para ℹ️; o que muda o quadro é o `<title>` indexado, que a P1 não mencionava.
- **Correção proposta:** decidir a P1; valendo o README, trocar `home.signUp`, `auth.signUp.metaTitle/title/submit` e
  `auth.signIn.signUpLink` por "Começar com o squad" / "Start with the squad" / "Empezar con el squad". Enquanto isso,
  avaliar tirar `/criar-conta` do sitemap ou pôr noindex nela.
- **Prova:**
  - `grep -rnoiE '.{0,30}(gr[aá]tis|\bfree\b).{0,30}' apps/web/messages apps/web/content` → 15 linhas, todas
    `site.json:115` e `auth.json:25,28,30,32` nos três idiomas (ex.: `messages/pt-BR/auth.json:28: "metaTitle": "Criar conta grátis"`).
  - `bash docs/parciais/h2/estatico/p2_com_servidor.sh 'node docs/parciais/h2/estatico/p2_seo.mjs'` →
    `/ | V:…Criar conta grátis Carregando Pronto…` e `grátis 13 páginas … free 12 páginas … gratis 12 páginas`;
    no HTML de `/criar-conta`: `<title>Criar conta grátis · HelloSquad</title>` e `<h1 id="criar-titulo">Crie sua conta grátis.</h1>`.

### E-02 🟡 — A guarda do autosave não reconhece chave do Asaas, do Mercado Pago nem segredo de webhook

- **Onde:** `infra/git-autosave.sh:32` (`SECRET_RE`). O repositório é público (comentário da linha 28) e o
  `.env.example:69-80` já tem `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `MERCADOPAGO_ACCESS_TOKEN`,
  `MERCADOPAGO_WEBHOOK_SECRET` e `PAYMENT_MOCK_WEBHOOK_SECRET` (vazios). A S2e sugeriu incluir os padrões
  (`docs/parciais/S2e-relatorio.md:151`); não foi feito, e `infra/tests/git-autosave-guard.sh` tem 0 casos de pagamento.
  Mesma classe da H1E-05 (🟡 na H1), corrigida para JWT e cookie.
- **Cenário:** quem colar a chave de produção do Asaas (`$aact_prod_…`) ou o token `APP_USR-…` do Mercado Pago num `.md`
  de evidência ou num arquivo fora do `.gitignore` tem o arquivo commitado e enviado ao repositório público pelo autosave.
- **Correção proposta:** acrescentar ao `SECRET_RE` `\$aact_(prod|hmlg)_[A-Za-z0-9_-]{10,}`, `APP_USR-[0-9a-f-]{20,}`,
  `TEST-[0-9]{6,}-[0-9a-f-]{10,}` e `(ASAAS_API_KEY|ASAAS_WEBHOOK_TOKEN|MERCADOPAGO_ACCESS_TOKEN|MERCADOPAGO_WEBHOOK_SECRET|PAYMENT_MOCK_WEBHOOK_SECRET)=["']?[^[:space:]"']{8,}`,
  com um caso por padrão no teste da guarda.
- **Prova** (regex extraída do próprio `infra/git-autosave.sh`, valores fictícios):
  ```text
  ASAAS_API_KEY                      -> passa (nao detecta)
  MERCADOPAGO_ACCESS_TOKEN           -> passa (nao detecta)
  MERCADOPAGO_WEBHOOK_SECRET         -> passa (nao detecta)
  ASAAS_WEBHOOK_TOKEN                -> passa (nao detecta)
  ANTHROPIC_API_KEY                  -> BLOQUEIA
  ```

### E-05 🟡 — Catálogo do backend: en e es sem 209 das 290 chaves; a falta cai calada no pt-BR

- **Onde:** `apps/backend/src/hellosquad/i18n/en.json` e `es.json` (81 chaves cada) × `pt-BR.json` (290). A queda está
  em `apps/backend/src/hellosquad/i18n/__init__.py:24` (`catalog(locale).get(key) or catalog(DEFAULT_LOCALE).get(key) or key`),
  assumida na docstring (`:3`, "o resto cai no pt-BR"). Faltam, iguais em en e es: `agent` 28, `data` 2, `date` 10,
  `delivery_version` 4, `environment` 23, `history` 28, `memory` 28, `run_error` 11, `status` 22, `triage` 17,
  `work` 19, `work_item_step` 17. As 53 `email.*` estão completas nos três (confere com a S2f).
- **Cenário (rastreado no código):** num workspace en ou es, a primeira fala de cada ambiente sai de
  `conversations/opening.py:142` com `environment.first.specialist` em pt-BR ("… O que você precisa?", "Disponível."),
  a data de `date.day` sai "sex, 16/10" (`opening.py:64-72`), o conhecimento adicionado na Memória da Marca ganha a chave
  "Contado por você" e o assunto padrão "História"/"Posicionamento" (`memory/routes.py:506-507`), mostrados em
  `apps/web/components/memory/MemoryView.tsx:410`. Status, histórico, triagem e nomes de etapa (`work_item_step.*`) idem
  (não rastreei tela a tela esses prefixos).
- **Correção proposta:** traduzir as 209 chaves em en e es e pôr no backend um teste de paridade de chaves (o web já
  tem `apps/web/test/catalog-parity.test.ts`).
- **Prova:** `python3 docs/parciais/h2/estatico/i18n_catalogos.py backend` →
  `pt-BR: 290 chaves; email.*=53 | en: 81 chaves; email.*=53 | es: 81 chaves; email.*=53` e
  `{'FALTA[en]': 209, 'FALTA[es]': 209, 'IDENTICO[es]': 6}` (os 6 idênticos são espanhol válido).

### E-06 🟡 — Saudação e pedidos sugeridos dos especialistas fixos em pt-BR no `agent.yaml`

- **Onde:** `apps/backend/src/hellosquad/conversations/opening.py:123` lê `config.get("saudacao")` e `:81` lê
  `pedidos_sugeridos` de `squad/<agente>/agent.yaml` (ex.: `squad/bia/agent.yaml:10` "Oi, eu sou a Bia."). Não passam
  pelo catálogo; aparecem em `apps/web/components/product/ConversationPanel.tsx:300-301` (botões) e `:698` (fala).
- **Cenário:** em en/es o cliente abre o ambiente da Bia e lê "Oi, eu sou a Bia. Disponível. O que você precisa?" e
  botões em português. Continua assim mesmo depois do E-05, porque o texto nem está no catálogo.
- **Correção proposta:** chaves `agent.<id>.greeting` e `environment.suggestion.<id>.<n>` no catálogo (ou campos por
  idioma no YAML), lidas com o idioma do workspace.
- **Prova:** `grep -rn "saudacao" squad --include=*.yaml` → 7 linhas "Oi, eu sou …";
  `grep -n "saudacao\|pedidos_sugeridos" apps/backend/src/hellosquad/conversations/opening.py` → `:81` e `:123`.

### E-07 🟡 — Mensagens de erro da API em pt-BR no código, mostradas na tela em en/es

- **Onde:** 37 `ApiError(status, code, "mensagem")` com texto pt-BR literal (5 em `memory/routes.py`, 5 em
  `billing/routes.py`, 4 em `work/projects.py`, `contacts/routes.py` e `api/deps.py`, 3 em `identity/routes.py`, 2 em
  `work/routes.py`, `credits/routes.py` e `conversations/routes.py`, 1 em `work/calendar.py`, `metrics/routes.py` e
  `memory/learnings.py`), mais `api/errors.py:74` (`VALIDATION_MESSAGES`), `:109` ("Dados inválidos."), `:113-117`,
  `:121-133` (`SQLSTATE_ERRORS`) e `:148` (repassa o RAISE do banco). Nenhuma usa `t(locale, …)`. O web interpola o
  `message`: `apps/web/components/env/crm/ImportPanel.tsx:54` (`t("failed", { message: res.message })`),
  `components/memory/MemoryView.tsx:95,119`, `components/product/ConversationPanel.tsx:462`.
- **Cenário:** em en, importar um CSV vazio mostra "Could not import: O arquivo está vazio." (`contacts/routes.py:192`).
- **Correção proposta:** o web traduz pelo `code`, que já é estável (`errors.<code>` nos catálogos), e usa o `message`
  só como reserva; ou o backend localiza a mensagem pelo idioma do workspace.
- **Prova:** `grep -rnE "ApiError\(" --include=*.py apps/backend/src/hellosquad | grep -v "class ApiError" | wc -l` → `37`;
  `grep -rn "O arquivo está vazio" apps/backend/src/hellosquad` → `contacts/routes.py:192: raise ApiError(422, "invalid_csv", "O arquivo está vazio.")`.

### E-08 🟡 — Objetivo do primeiro acesso gravado com assunto e chave fixos em pt-BR

- **Onde:** `apps/web/lib/onboarding.ts:10` (`OBJECTIVE_FACT = { area: "business", topic: "Objetivos", key: "Objetivo atual" }`),
  enviado por `apps/web/app/app/[workspace]/memory-actions.ts:94,105` sem `kind`. A API só traduz assunto e chave quando
  recebe `kind: "objective"` (`apps/backend/src/hellosquad/memory/routes.py:497-499`; en "Goals"/"Current goal", es
  "Objetivos"/"Objetivo actual"), campo que o contrato aceita.
- **Cenário:** um dono en conta o objetivo no primeiro acesso e a Memória da Marca mostra "Objetivos · Objetivo atual";
  em es aparece "Objetivo atual" (português) no lugar de "Objetivo actual".
- **Correção proposta:** enviar `{ area: "business", kind: "objective", content }` e trocar `isObjective`
  (`apps/web/lib/onboarding.ts:37`, que compara `f.topic === "Objetivos"`) por um critério que não dependa do texto.
- **Prova:** `sed -n 8,12p apps/web/lib/onboarding.ts` → a linha 10 acima; `sed -n 90,106p apps/web/app/app/[workspace]/memory-actions.ts`
  → corpo `{ area: fact.area, content: fact.content, topic: …, key: … }`, sem `kind`.

### E-09 🟡 — Memória da Marca ordena e acha os "Principais conhecimentos" comparando texto pt-BR

- **Onde:** `apps/web/components/memory/memory-model.ts:16-21` (`TOPIC_ORDER`, 21 assuntos em pt-BR) e `:24-32`
  (`KEY_TOPICS`, 7), usados por `groupItems` e `keyFact` (chamado em `MemoryView.tsx:178`). O comentário da linha 15 diz
  que "o assunto é texto do idioma do workspace".
- **Cenário:** hoje funciona por acaso, porque en/es recebem os assuntos padrão em pt-BR (efeito do E-05). Corrigidos o
  E-05 e o E-08, um workspace en terá "Goals" e "Value proposition": a ordenação manda tudo para o fim e o dossiê não acha
  nenhum dos 7 "Principais conhecimentos".
- **Correção proposta:** identificar o assunto por um id estável vindo da API e traduzir só o rótulo no catálogo.
- **Prova:** `sed -n 15,32p apps/web/components/memory/memory-model.ts`.

### E-12 🟡 — O catálogo inteiro (inclusive o da área logada) vai serializado no HTML de cada página pública

- **Onde:** `apps/web/app/layout.tsx:36` usa `<NextIntlClientProvider>{children}</NextIntlClientProvider>` sem a prop
  `messages`; o next-intl herda o catálogo completo que `apps/web/i18n/request.ts:11` carrega (`loadMessages(locale)`,
  23 áreas, 1779 chaves).
- **Cenário:** em `/sobre`, um único bloco RSC de 81.695 bytes carrega o catálogo (73% dos 112.349 bytes do HTML), com
  textos da área logada: `"meta_ads":"Meta Ads (Instagram e Facebook)"`, "Google Ads", "Conecte o Instagram" (2),
  "WhatsApp" (10), "TikTok", "LinkedIn", "Sala do Squad" (14) e "grátis" (5). O texto visível, as meta e o JSON-LD das 37
  páginas têm 0 desses termos (a N2a evitou de propósito), mas os robôs de IA liberados no `robots.txt` leem o HTML bruto.
  O peso também conta no celular (HTML 3 a 4 vezes maior que o necessário).
- **Correção proposta:** passar ao provider só os namespaces que os componentes cliente usam, com um provider por
  segmento (site × `/app`), ou `messages={pick(messages, [...])}`.
- **Prova** (HTML do build de produção salvo em `/tmp/h2_est_p2_html_sobre.html`):
  ```text
  scripts RSC 17 bytes 101060 | com o catalogo 1 bytes 81695 | html 112349
  Conecte o Instagram 2 · Sala do Squad 14 · WhatsApp 10 · TikTok 1 · LinkedIn 1 · grátis 5
  anthropic|claude|openai|supabase|vercel|railway|asaas|mercado pago|stripe|mailpit|fastapi|next.js → 0
  ```

### E-03 ℹ️ — Telefones de teste fora da convenção `+55 11 99999-00NN`

- **Onde:** `apps/backend/tests/test_s2b_deliveries.py:607` (`+55 11 99999-0101`), `:612` (`(11) 99999-0102`), `:658` e
  `:665` (`+5511999990101`, `+5511999990102`), commit `ef22a1a` (S2b). Regra: `docs/DADOS_FICTICIOS.md:5`.
- **Cenário:** `99999-0101` é um celular de São Paulo bem formado; se o teste algum dia passar por envio real (WhatsApp),
  o número pode existir. Hoje é só importação de CSV.
- **Correção proposta:** `+55 11 99999-0021` e `-0022` (faixa da convenção, fora das 20 do seed).
- **Prova:** `python3 docs/parciais/h2/estatico/varredura_dados_idioma.py` → `[7] telefones fora do padrao ficticio: 4 {'teste': 4}`.

### E-04 ℹ️ — RD Station e HubSpot num comentário de `squad/` (reincidente da H1E-09)

- **Onde:** `squad/max/agent.yaml:35`: `- contatos.ler_crm   # conector a definir (RD Station, HubSpot)`. É comentário
  (não chega ao cliente), mas vive na pasta que vira prompt do agente; `docs/DADOS_FICTICIOS.md:5` pede marcas de
  terceiros inventadas.
- **Correção proposta:** "conector de CRM a definir".
- **Prova:** `/tmp/h2_est_dados_marcas.txt`: `squad  squad/max/agent.yaml:35  RD Station` e `HubSpot` (únicas marcas
  não-canal em `squad/`).

### E-10 ℹ️ — Sem `error.tsx`, `global-error.tsx` nem `loading.tsx`

- **Cenário:** num erro de execução, o cliente pt-BR ou es vê a página padrão do Next, em inglês.
- **Correção proposta:** páginas de erro com o catálogo (`system.json` já existe).
- **Prova:** `find apps/web/app -name 'error.tsx' -o -name 'global-error.tsx' -o -name 'loading.tsx' | wc -l` → `0`.

### E-11 ℹ️ — `home.hello` é "Hello, {name}." nos três idiomas

- **Onde:** `apps/web/messages/pt-BR/home.json:3`, `es/home.json:3`, `en/home.json:3`. Parece intencional (eco da marca),
  mas é inglês na tela pt-BR e es. Confirmar com o dono; se não for, "Olá, {name}." / "Hola, {name}.".
- **Prova:** `grep -n '"hello"' apps/web/messages/*/home.json` → 3 linhas iguais.

### E-13 ℹ️ — `/favicon.ico` 404 no site todo

- **Onde:** não há `icon`/`favicon` em `apps/web/app/` nem pasta `apps/web/public/`; `/icon.png` e `/apple-icon.png` também 404.
- **Cenário:** o navegador registra erro em toda página; Lighthouse best-practices 96 em `/como-funciona` (auditoria
  `errors-in-console`); resultado de busca no celular sem ícone.
- **Correção proposta:** `apps/web/app/icon.png` (ou `favicon.ico`) a partir do logo.
- **Prova:** `curl -s -o /dev/null -w "favicon %{http_code}" http://127.0.0.1:3198/favicon.ico` → `favicon 404`; no
  JSON do Lighthouse: `"Failed to load resource: the server responded with a status of 404 (Not Found)" … /favicon.ico`.

### E-14 ℹ️ — CSP do site público com `'unsafe-inline'` em script (também nas páginas dinâmicas en/es) e sem HSTS

- **Onde:** `apps/web/middleware.ts:18-22` devolve antes de montar a CSP com nonce quando a rota é `/en/**` ou `/es/**`;
  vale então a CSP estática de `lib/security-headers.ts:27-29` (`script-src 'self' 'unsafe-inline'`), pendência da A0b
  (reincidente da H1E-07, que só via o `/`). Nenhuma das 44 respostas tem `Strict-Transport-Security`, e não há HSTS no
  código; em produção depende da hospedagem.
- **Cenário:** as páginas públicas não recebem entrada de usuário, então o risco é baixo; mas en/es já são dinâmicas e
  poderiam ter nonce como `/entrar`.
- **Correção proposta:** aplicar a CSP com nonce também no ramo `publicLocale` do middleware; HSTS no `next.config.ts`
  (só em produção) ou registrar que vem da hospedagem.
- **Prova:** `script-src` servido: `/en`, `/es/squad/kiwi`, `/como-funciona` → `'self' 'unsafe-inline'`; `/entrar`,
  `/app/miolo` → `'self' 'nonce-***' 'strict-dynamic'` (`/tmp/h2_est_p2_cab_anon.txt`, 22 rotas).

### E-15 ℹ️ — JSON-LD das páginas internas aponta para `@id` que só existe no grafo da home; robots duplicada nos 404

- **Onde:** `apps/web/lib/site-seo.ts:84` define `#organization`, `#website` e `#app`, que só entram no grafo da home;
  27 páginas apontam para eles (21 `Service.provider` em `:169`, 3 `AboutPage` e 3 `WebPage` em `:195-196`). É válido
  em schema.org, mas um validador por página vê o `provider` sem nome. E `apps/web/app/not-found.tsx:7` põe
  `robots: { index: false }` além do noindex que o Next já põe: duas `<meta name="robots" content="noindex"/>` em
  `/admin`, `/admin/usuarios` e `/app/inexistente` (inofensivo).
- **Correção proposta:** nó Organization mínimo (`@id`, `name`, `url`) em cada grafo; tirar o `robots` do not-found.
- **Prova:** `p2_seo.mjs` → 27 observações `jsonld-id-externo` (ex.: `/squad/nexo … http://127.0.0.1:3100/#organization`);
  `curl -s -A "GPTBot/1.2" http://127.0.0.1:3198/admin | grep -o '<meta name="robots"[^>]*>'` → 2 linhas.

## O que conferi e passou

### Item 1 — i18n

- **Texto fixo no web:** 157 arquivos `.ts/.tsx` de `app/`, `components/`, `lib/`, `i18n/` e `middleware.ts`
  (`docs/parciais/h2/estatico/i18n_texto_fixo.py`). 75 candidatos em 29 arquivos; na revisão manual sobraram 19, todos
  nos E-08 e E-09. Descartados 56: 45 código TS (genéricos, comparações, `case`), 6 erros de configuração só de dev
  em `lib/env.ts`, `shell-context.tsx:80` (erro de dev), `site-content.ts:44` (erro de build), `ProjectsView.tsx:243`
  (comentário JSX) e 2 moldes `%s · HelloSquad`. Nenhum `aria-label`, `placeholder`, `title`, `alt` ou `label` com
  literal; nenhum `>Texto<` além de "HelloSquad"; nenhum `toast`/`setError`/`error:` com literal; `metadata`, os 2
  `not-found.tsx` e a rota de OG usam o catálogo ou o conteúdo; `<html lang={locale}>`.
- **Catálogos do web:** 23 JSON por idioma; os três `index.ts` importam as mesmas 23 áreas. **1779 chaves em cada
  idioma**, por arquivo iguais nos três: auth 50, auto 35, caps 163, common 53, content 74, conversation 71, crm 116,
  docs 12, editorial 81, envs 98, growth 70, home 103, live 18, memory 168, onboarding 20, pages 47, projects 136,
  results 116, shell 56, site 103, strategy 65, system 6, team 118. 0 chaves faltando ou sobrando, 0 arquivos ausentes,
  0 valores vazios; placeholders e tags iguais (a única diferença é `{article, select}` em 19 chaves só no pt-BR, para
  concordância de gênero). Valores idênticos ao pt-BR revisados um a um: en 38 (ids de agente, nomes de idioma, Growth,
  Reels, Google Ads), es 210 (ids e palavras iguais e válidas em espanhol); 0 português não traduzido. As chaves do web
  são tipadas (`apps/web/global.d.ts:4`) e o build de produção passou na checagem de tipos: toda chave literal usada existe.
- **Catálogo do backend:** 290 / 81 / 81 chaves (E-05); **`email.*` = 53 em cada idioma** (confere com a S2f); nas 81
  comuns, placeholders iguais, 0 vazios, 0 português em en/es. As 104 chaves literais e os 31 padrões dinâmicos de
  `t(locale, …)` existem no pt-BR. `email/templates.py` só usa `t(locale, "email.*")` e `lang={locale}`.

### Item 2 — segredos (árvore inteira, `docs/parciais/**` e histórico)

Comando: `bash docs/parciais/h2/estatico/varredura_nuvem_segredos.sh > /tmp/h2_est_seg_saida.txt` (cópia da H1 com
Asaas, Mercado Pago, webhook, `service_role` e senha literal). Universo: 1195 arquivos da árvore (`ls-files -co
--exclude-standard`, sem `node_modules/.venv/.next`), 547 evidências txt/log/json/har/md de `docs/parciais` (857 arquivos
em disco; uma busca extra pegou também `.mjs/.py/.sh`) e o histórico inteiro (`git log -p --all`: 508 commits, 227.019
linhas em `/tmp/h2_est_seg.hist.txt`). Contagens árvore · histórico · evidências:

| Padrão | Resultado |
|---|---|
| JWT `eyJ….eyJ….` (3 partes) | 0 · 0 · 0 (nenhum JWT distinto em lugar nenhum, nem os legados de demo do CLI) |
| `sb_secret_` com valor | 0 · 0 · 0 |
| `sb_publishable_` com valor | 4 · 4 · 2, todos o fictício `sb_publishable_ci_ficticia` (`infra/github/workflows/ci.yml:55`) ou texto sobre ele |
| `sk-ant-` | só chaves fictícias de teste (`apps/backend/tests/test_llm.py:74,289,293`), a regex do autosave e relatos |
| `$aact_` (Asaas) | só fictícias: `$aact_hmlg_0…0_ficticia` (`apps/backend/tests/billing_fakes.py:24`), `$aact_hmlg_outra` e `$aact_prod_x` (`test_billing_providers.py:130,436`); prefixo sem valor no relato da S2e |
| `APP_USR-` (Mercado Pago) | 0 valores (só o prefixo em `S2e-relatorio.md:151`) |
| `TEST-` + dígitos | 1, fictício: `TEST-0000…-ficticio` (`billing_fakes.py:26`) |
| segredo de webhook | só fictícios: `token-ficticio-do-webhook-asaas-0001`, `segredo-ficticio-do-webhook-mp` (`billing_fakes.py:25,27`), `segredo-local` (`test_billing_providers.py:414`); o resto é nome de campo `SecretStr` |
| `service_role` | 123 linhas na árvore, todas `revoke … service_role` em migrações, `config.toml` e docs; nenhum valor |
| chave privada, `ghp_`, `AKIA`, `xox*`, `sk-proj-`, `whsec_`, `SG.`, `re_…`, `AIza…`, `Bearer` com valor ≥ 24 | 0 fora de regex e relatos (histórico: 0) |
| `base64-eyJ` (cookie de sessão), `access_token`/`refresh_token` com valor | 0 nos 857 arquivos de `docs/parciais` e 0 no histórico |
| senhas literais | `Senha!Teste123` (a fictícia oficial) e três só de teste, não segredos: `Senha!Antiga123`/`Senha!Nova12345` do usuário temporário de `apps/backend/tests/test_email.py:372,379` e `outra-senha` (errada de propósito, `test_local_db.py:91`) |
| `.env` versionado | nunca: o único `.env*` adicionado em algum commit é `.env.example`; `.env`, `.env.local`, `apps/web/.env.local`, `apps/backend/.env`, `.env.production` e `chave.pem` ignorados |

**Demo × segredo real** (o `.env` local, não rastreado):
- **Públicas, padrão do Supabase CLI local (iguais em toda máquina, não são segredo):** `SUPABASE_PUBLISHABLE_KEY` e
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…` padrão, sha256 `9705102d…`), `SUPABASE_SECRET_KEY`
  (`sb_secret_N7UN…`, padrão, sha256 `c85debb5…`: secreta no nome, mas é a chave de demo do CLI), a senha `postgres` do
  `DATABASE_URL` e o `JWT_SECRET` de demo (`super-secret-jwt-token-…`, só no histórico, como regex do script da H1).
  Ocorrências fora do `.env`: 0 · 0 · 0.
- **Segredo real da máquina:** a senha do papel `hellosquad_api` em `API_DATABASE_URL` (não padrão, 48 caracteres):
  0 ocorrências na árvore, no histórico e nas evidências. `ANTHROPIC_API_KEY` e `SUPABASE_JWT_SECRET` vazios; o `.env`
  não tem chave de Asaas, Mercado Pago nem SMTP.
- Nada aponta para nuvem: `<ref>.supabase.co`, `railway.app`, `vercel.app` 0; `api.anthropic.com` só no teste simulado.

### Item 3 — só dados fictícios

Comando: `python3 docs/parciais/h2/estatico/varredura_dados_idioma.py` (cópia da H1 com conteúdo do site, CSV, catálogo
do backend e módulo de e-mail). 750 arquivos: seed 1, fixtures do LLM 54, catálogos do web 72, conteúdo do site 4,
catálogo do backend 3, e-mail 8, CSV 1, `squad/` 36, testes 106, `.txt` de `docs/parciais` 465.
- E-mails fora de `.example`: 5, nenhum defeito: `fora.s2f@miolo.test` (`test_email.py:320`, o teste que prova que o
  worker **recusa** domínio fora de `.example`), `pessoa@exemplo.test` (`test_s2b_deliveries.py:611`, a linha "Fora do
  Domínio" que a importação recusa) e `voce@seunegocio.com.br` num `.txt` não rastreado da X1. Catálogos e conteúdo do
  site: só `voce@seunegocio.example`, `you@yourbusiness.example`, `tu@tunegocio.example` (a H1E-06 foi corrigida).
  Seed, fixtures e `squad/`: só `@miolo/vitta/trilha/semconta/contatos.example`.
- CPF/CNPJ: 5 candidatos, todos com dígito verificador inválido: `00000000000` (documento zerado) em 4 linhas dos testes
  de cobrança e o prefixo `55119999900` do seed (`supabase/seed.sql:530`, que gera `+55 11 99999-0001…0020`).
- Telefones fora da convenção: 4, todos no E-03.
- Marcas: só canais (Instagram, WhatsApp, Facebook, Google, Meta, TikTok, LinkedIn, YouTube) nos catálogos, fixtures e
  seed; "Avon" é a chave `avOn` e "Vale"/"Claro" são palavras do português (falsos positivos); fornecedores (Asaas,
  Mercado Pago, Supabase, Anthropic, OpenAI) só nos testes dos adaptadores e num comentário de `email/smtp.py:1`;
  RD Station/HubSpot no E-04. CSV `apps/web/e2e/fixtures/contatos-a2b.csv`: 3 e-mails `@contatos.example`.
- Capturas: 85 `.png` novas desde a H1; abri `sa0/02-conta-miolo.png` (Super Admin, a de nome mais sensível): só Miolo,
  `marina@miolo.example` e `vic@hellosquad.example`.

### Item 4 — pt-BR sem emoji no produto

339 arquivos (catálogos do web 72, fixtures 54, conteúdo do site 4, catálogo do backend 4, e-mail 8, `squad/` 36 com
`SOUL.md` e skills, seed 1, `apps/web/app` 54, `components` 76, `lib` 30), faixas U+1F000–1FAFF, U+2600–27BF,
U+2300–23FF, U+2B00–2BFF, U+FE0F e bandeiras: **0 emoji**. Único acerto de faixa: U+2713 "✓" em
`apps/web/components/site/Landing.tsx:29`, glifo da tabela comparativa (sem a propriedade Emoji do Unicode; o leitor de
tela lê o rótulo `compareYes` do catálogo). Commits desde 16/10: 503, 0 com emoji. Trechos com cara de inglês em
fixtures, `squad/` e seed: só SQL do seed (26 falsos positivos).

### Item 5 — nenhum fornecedor no site

- **Fonte** (`bash docs/parciais/h2/estatico/fornecedor_site.sh`): 44 arquivos (`content/site/*.json` e `llms.json`,
  `messages/*/site.json` e `common.json`, `llms.txt`, `robots.txt`, `sitemap.ts`, `layout.tsx`, OG, `lib/site*.ts`,
  `components/site/*`, páginas públicas), 60 termos da N2a §2.2. 8 acertos, nenhum visível: `React.ReactNode`
  (`app/layout.tsx:30`), nomes de robôs do `robots.txt` (`lib/site-crawl.ts:13-17`), comentário sobre o
  `urllib.robotparser` do Python (`:24`) e "Twitter" em dois comentários. Comercial: 55 "plan" (entrega, como a N2a
  classificou), 6 "offer" (5 no sentido da oferta do negócio do cliente em `content/site/en.json`, 1 comentário "Sem
  Offer" em `site-seo.ts:10`), "créditos" num comentário de `Landing.tsx:32`; "grátis/free" é o E-01.
- **Servido** (37 páginas do build de produção): 0 ocorrências de Anthropic, Claude, OpenAI, GPT, Supabase, Vercel,
  Railway, Asaas, Mercado Pago, Stripe, Mailpit, Next.js, FastAPI e mais ~40 nomes no texto visível, meta, alt/title/aria
  e JSON-LD; 0 desses também no HTML bruto. Redes sociais e Google Ads só no catálogo serializado (E-12). "llama" em es
  é o verbo; os 10 trechos en/es com cara de pt-BR são "São Paulo".

### Parte 2 — build de produção na 3198

- **Cabeçalhos** (22 rotas × anônimo/logado = 44 respostas, `p2_cabecalhos.sh`): 44/44 com CSP (`frame-ancestors
  'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `connect-src` só local), `X-Frame-Options:
  DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff` e `Permissions-Policy`
  (camera, microphone, geolocation, payment, usb vazios). CSP com nonce e `'strict-dynamic'` em `/entrar`,
  `/criar-conta`, `/sair` e `/app/**`. `Cache-Control: private, no-cache, no-store…` em `/entrar`, `/sair`, `/app/miolo`
  (logado) e `/admin`. Sem HSTS (E-14).
- **Cookie de sessão** (login de `marina@miolo.example` pela tela `/entrar`, `p2_login.mjs`): `sb-127-auth-token`
  (valor `base64-eyJ***`, 2541 caracteres), gravado pelo POST `/entrar` (303) com `Path=/; Expires=Fri, 23 Oct 2026
  22:03:14 GMT; Max-Age=604800; HttpOnly; SameSite=lax`: **7 dias** (a H1E-03 via 400; corrigido), `HttpOnly` sim,
  `SameSite=Lax`, `Secure` ausente em http local por desenho (`secure: !local`, `apps/web/lib/supabase/session-cookie.ts:31`).
  `document.cookie` vazio. O login termina em `/app` → `/app/miolo`.
- **noindex:** logado, 6/6 rotas de `/app/**` com `X-Robots-Tag: noindex, nofollow` e meta `noindex, nofollow, nocache`;
  `/admin` e `/admin/usuarios` 404 com `X-Robots-Tag` e meta noindex (anônimo e logado); anônimo, `/app/**` responde 307
  (já com `X-Robots-Tag`) para `/entrar`, que tem meta `noindex, follow`; `/sair` meta `noindex, nofollow`.
- **robots.txt** (498 bytes): `Disallow: /app`, `/app/`, `/admin`, `/admin/`, `/sair` antes de `Allow: /`, para `*` e
  para 10 robôs de IA nomeados (nomes de user-agent, não citação de fornecedor); igual ao `docs/conteudo/site/robots.txt`
  da N2a, exceto a caixa de "User-Agent" e o `{{SITE_URL}}` preenchido.
- **Preço:** `/precos`, `/pricing`, `/precios`, `/en/pricing`, `/es/precios`, `/planos`, `/assinatura` → 404 (anônimo e
  logado); 0 links de preço nas 37 páginas; 0 R$, US$, "$" + número, "free trial", paywall ou assinatura no texto
  visível; 0 `offers`/`Offer`/`price` nos 36 blocos JSON-LD; as 79 ocorrências de "plano/plan" são entrega.
- **Sitemap:** 37 URLs (36 páginas + `/criar-conta`), 37/37 com 200, sem `/app`, `/admin`, `/sair` nem `/precos`; os 144
  alternates do sitemap iguais aos hreflang das páginas.
- **hreflang e idioma:** `<html lang>` certo em 37/37 (13 pt-BR, 12 en, 12 es); 36/36 páginas com pt-BR, en, es e
  x-default (x-default no pt-BR); **96/96 pares recíprocos** e do mesmo grupo, todas as alternativas em 200; canônico
  autorreferente em 37/37. `/criar-conta` não tem hreflang, JSON-LD nem og:image, coerente com página única
  (`/en/criar-conta` e `/es/criar-conta` dão 404).
- **JSON-LD:** 36 blocos, 36/36 com parse válido e `@context` `https://schema.org`; por `@type`: Organization 3, WebSite
  3, SoftwareApplication 3 (as três home), BreadcrumbList 33 (todas as internas), Service 21 (7 agentes × 3 idiomas),
  FAQPage 3 (57 pares Question/Answer), ItemList 3, WebPage 3, AboutPage 3; 0 campos vazios; 15 `inLanguage` iguais ao
  idioma da página; 0 trechos em pt-BR no JSON-LD das 24 páginas en/es.
- **llms.txt** (10.436 bytes): 36 links, todos 200; igual ao da N2a, exceto links relativos que viraram absolutos; 0
  fornecedores.
- **URLs citadas no head e no JSON-LD:** 75 únicas, 75/75 com 200 (37 `image/png`: 36 og:image e o logo).
- **Host (observação):** sitemap, canônico, hreflang, JSON-LD, `llms.txt` e a linha `Sitemap:` usam
  `http://127.0.0.1:3100`, o `NEXT_PUBLIC_SITE_URL` do `.env` (o build foi servido na 3198 só para a auditoria).
- **Lighthouse mobile** (13.5.0, Chrome 156.0.8078.4 headless do Playwright `chromium-1248`, Moto G Power emulado,
  rotas que a A2c não mediu; JSON em `docs/parciais/h2/estatico/lighthouse-mobile-h2.json`):

| rota | perf | a11y | seo | best-practices | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| /como-funciona | 99 | 100 | 100 | 96 | 1.1 s | 2.0 s | 70 ms | 0 |
| /es/squad/kiwi | 99 | 100 | 100 | 100 | 1.1 s | 2.0 s | 50 ms | 0 |

Única auditoria que falhou: `errors-in-console` em `/como-funciona`, pelo favicon (E-13).

## Scripts e saídas

Em `docs/parciais/h2/estatico/`: `varredura_nuvem_segredos.sh` e `varredura_dados_idioma.py` (cópias adaptadas da H1),
`fornecedor_site.sh`, `i18n_texto_fixo.py` (`--resumo`), `i18n_catalogos.py` (`web`, `backend` ou ambos),
`p2_com_servidor.sh` (sobe o `next start` na 3198, roda o comando e derruba), `p2_cabecalhos.sh`, `p2_login.mjs`,
`p2_seo.mjs`, `p2_urls.mjs`, `p2_lighthouse.sh`, `lighthouse-mobile-h2.json`, `p2_resumo.json` (cookie mascarado).
Saídas longas em `/tmp/h2_est_*` (`seg_saida.txt`, `seg.hist.txt`, `dados_*`, `forn/`, `i18n_*`, `p2_*`).

## Estado em que deixei a máquina

`next start` da 3198 parado (nada escuta na porta, nenhum Chromium sobrando); `/tmp/h2_web/.env` apagado e worktree
removido com `git worktree remove --force` (`git worktree list` mostra só a árvore principal); arquivo de cookie com o
token apagado. Web do dono na 3100 e API na 8100 no ar, sem reinício.
