# H2 — Varredura estática e site público (auditor auxiliar do Hulk)

Rascunho em andamento (16/10/2026, a partir de 18:59). Árvore auditada: `main` em `bc58140` (a varredura de segredos
e de dados rodou na árvore principal; o site rodou num build de produção separado, no worktree `/tmp/h2_web`).
Nada em `apps/`, `packages/`, `squad/`, `supabase/`, `infra/` ou `Makefile` foi alterado.

Seções a completar: i18n (item 1) e site em produção (parte 2).

## Achados da parte 1 (itens 2 a 5), já provados

### E-01 🟡 — "grátis" / "free" / "gratis" no site público e no cadastro indexado, contra a regra escrita do dono

- **Onde:** `apps/web/messages/pt-BR/site.json:115` (`home.signUp` = "Criar conta grátis"), `en/site.json:115`
  ("Create a free account"), `es/site.json:115` ("Crear cuenta gratis"), usado no botão do Hero em
  `apps/web/components/site/Landing.tsx:61-63`; e no catálogo `auth` dos três idiomas, linhas 25, 28, 30 e 32
  (`signUpLink`, `metaTitle`, `title`, `submit`), usado em `apps/web/app/(auth)/entrar/page.tsx:40` e
  `apps/web/app/(auth)/criar-conta/page.tsx:10,24` e `SignupForm.tsx:51`. `/criar-conta` está no `sitemap.xml` (`apps/web/app/sitemap.ts:22`),
  então o `<title>` "Criar conta grátis" vai para o buscador.
- **Regra:** `docs/conteudo/site/README.md:10`: "Nenhum preço, plano, crédito, "grátis" ou condição comercial. Sem
  rota /precos." (decisão do Vic, 16/10). A A2c (§5 item 1) e a N2a (P1) deixaram a troca do botão para o dono e
  afirmam que o Hero é "o único lugar do site público com grátis"; não é: o `<title>`, o `h1` e o botão de
  `/criar-conta` e o link de `/entrar` também dizem "grátis".
- **Cenário:** o buscador indexa `/criar-conta` com o título "Criar conta grátis" (e en/es); quando o preço vier, o
  site já prometeu gratuidade em 4 pontos por idioma.
- **Correção proposta:** decidir a P1; se valer a regra do README, trocar `home.signUp` e `auth.signUp.*`/`auth.signIn.signUpLink`
  por "Começar com o squad" / "Start with the squad" / "Empezar con el squad" nos três catálogos.
- **Prova:** `grep -rnoiE '.{0,30}(gr[aá]tis|\bfree\b).{0,30}' apps/web/messages apps/web/content` → 15 linhas, todas
  `site.json:115` e `auth.json:25,28,30,32` nos três idiomas (ex.: `messages/pt-BR/auth.json:28: "metaTitle": "Criar conta grátis"`).

### E-02 🟡 — A guarda do autosave não reconhece chave do Asaas, do Mercado Pago nem segredo de webhook

- **Onde:** `infra/git-autosave.sh:32` (`SECRET_RE`). O repositório é público (comentário da linha 28) e o
  `.env.example:73-80` já tem `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `MERCADOPAGO_ACCESS_TOKEN` e
  `MERCADOPAGO_WEBHOOK_SECRET` (vazios). A S2e sugeriu incluir os padrões (`docs/parciais/S2e-relatorio.md:151`); não foi feito.
  Mesma classe da H1E-05 (🟡 na H1), que foi corrigida para JWT e cookie.
- **Cenário:** quem colar a chave de produção do Asaas (`$aact_prod_…`) ou o token `APP_USR-…` do Mercado Pago num
  `.md` de evidência ou num `.env.local` fora do `.gitignore` tem o arquivo commitado e enviado pelo autosave.
- **Correção proposta:** acrescentar ao `SECRET_RE` `\$aact_(prod|hmlg)_[A-Za-z0-9_-]{10,}`, `APP_USR-[0-9a-f-]{20,}`,
  `TEST-[0-9]{6,}-[0-9a-f-]{10,}` e `(ASAAS_WEBHOOK_TOKEN|MERCADOPAGO_WEBHOOK_SECRET|PAYMENT_MOCK_WEBHOOK_SECRET|ASAAS_API_KEY|MERCADOPAGO_ACCESS_TOKEN)=["']?[^[:space:]"']{8,}`,
  com caso no `infra/tests/git-autosave-guard.sh` (hoje 0 menções a Asaas/Mercado Pago lá).
- **Prova** (regex extraída do próprio script, valores fictícios):
  ```text
  ASAAS_API_KEY                      -> passa (nao detecta)
  MERCADOPAGO_ACCESS_TOKEN           -> passa (nao detecta)
  MERCADOPAGO_WEBHOOK_SECRET         -> passa (nao detecta)
  ASAAS_WEBHOOK_TOKEN                -> passa (nao detecta)
  ANTHROPIC_API_KEY                  -> BLOQUEIA
  ```

### E-03 ℹ️ — Telefones de teste fora da convenção `+55 11 99999-00NN`

- **Onde:** `apps/backend/tests/test_s2b_deliveries.py:607` (`+55 11 99999-0101`), `:612` (`(11) 99999-0102`),
  `:658` e `:665` (`+5511999990101`, `+5511999990102`), commit `ef22a1a` (S2b).
- **Regra:** `docs/DADOS_FICTICIOS.md:5`: telefones no formato `+55 11 99999-00NN`.
- **Cenário:** `99999-0101` é um celular de São Paulo bem formado; se o teste algum dia passar por um envio real
  (WhatsApp), o número pode existir. Hoje é só teste de importação de CSV.
- **Correção proposta:** usar `+55 11 99999-0021` e `-0022` (faixa reservada, fora das 20 do seed).
- **Prova:** `python3 docs/parciais/h2/estatico/varredura_dados_idioma.py` → `[7] telefones fora do padrao ficticio: 4 {'teste': 4}`.

### E-04 ℹ️ — Marcas reais de terceiros num comentário de `squad/` (reincidente da H1E-09)

- **Onde:** `squad/max/agent.yaml:35`: `- contatos.ler_crm   # conector a definir (RD Station, HubSpot)`.
- **Regra:** `docs/DADOS_FICTICIOS.md:5` (marcas de terceiros inventadas). É comentário (não chega ao cliente), mas
  vive na pasta que vira prompt do agente.
- **Correção proposta:** "conector de CRM a definir".
- **Prova:** `marcas.txt` da varredura: `squad  squad/max/agent.yaml:35  RD Station` e `HubSpot` (únicas marcas não-canal em `squad/`).

## Parte 1 — o que conferi e passou (itens 2 a 5)

### Item 2 — segredos (árvore inteira, `docs/parciais/**` e histórico)

Comando: `bash docs/parciais/h2/estatico/varredura_nuvem_segredos.sh > /tmp/h2_est_seg_saida.txt` (cópia da H1 com
Asaas, Mercado Pago, webhook, `service_role` e senha literal acrescentados). Universo: 1195 arquivos da árvore
(`ls-files -co --exclude-standard`, sem `node_modules/.venv/.next`), 547 evidências txt/log/json/har/md em
`docs/parciais` (857 arquivos em disco, 415 rastreados na hora) e o histórico inteiro (`git log -p --all`: 508 commits,
227.019 linhas em `/tmp/h2_est_seg.hist.txt`). Contagens árvore | histórico | evidências:

| Padrão | Resultado |
|---|---|
| JWT `eyJ….eyJ….` (3 partes) | 0 · 0 · 0 (nenhum JWT distinto em lugar nenhum, nem os legados de demo do CLI) |
| `sb_secret_` com valor | 0 · 0 · 0 |
| `sb_publishable_` com valor | 4 · 4 · 2, todos o fictício `sb_publishable_ci_ficticia` (`infra/github/workflows/ci.yml:55`) ou texto sobre ele |
| `sk-ant-` | só chaves fictícias de teste (`apps/backend/tests/test_llm.py:74,289,293`), regex do autosave e relatos |
| `$aact_` (Asaas) | só fictícias: `$aact_hmlg_0…0_ficticia` (`apps/backend/tests/billing_fakes.py:24`), `$aact_hmlg_outra` e `$aact_prod_x` (`test_billing_providers.py:130,436`) e o prefixo sem valor no relato da S2e |
| `APP_USR-` (Mercado Pago) | 0 valores (só o prefixo citado em `S2e-relatorio.md:151`) |
| `TEST-` + dígitos | 1, fictício: `TEST-0000…-ficticio` (`billing_fakes.py:26`) |
| segredo de webhook | só fictícios: `token-ficticio-do-webhook-asaas-0001`, `segredo-ficticio-do-webhook-mp` (`billing_fakes.py:25,27`), `segredo-local` (`test_billing_providers.py:414`); o resto é nome de campo `SecretStr` |
| `service_role` | 123 linhas na árvore, todas `revoke … service_role` em migrações, `config.toml` e docs; nenhum valor |
| chave privada, `ghp_`, `AKIA`, `xox*`, `sk-proj-`, `whsec_`, `SG.`, `re_…`, `AIza…`, `Bearer` com valor ≥ 24 | 0 fora de regex/relato (histórico: 0) |
| `base64-eyJ`, `access_token`/`refresh_token` com valor em evidência | 0 nos 857 arquivos de `docs/parciais` (inclui `.mjs/.py/.sh`) |
| senhas literais | `Senha!Teste123` (fictícia oficial) e três senhas só de teste, não segredos: `Senha!Antiga123`/`Senha!Nova12345` do usuário temporário de `apps/backend/tests/test_email.py:372,379` e `outra-senha` (senha errada de propósito, `test_local_db.py:91`) |
| `.env` versionado | nunca: o único `.env*` adicionado em algum commit é `.env.example`; `.env`, `.env.local`, `apps/web/.env.local`, `apps/backend/.env`, `.env.production` e `chave.pem` ignorados |

**Demo × segredo real (o `.env` local, não rastreado):**
- **Públicas, padrão do Supabase CLI (iguais em toda máquina, não são segredo):** `SUPABASE_PUBLISHABLE_KEY` e
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…` padrão, conferida por sha256 `9705102d…`),
  `SUPABASE_SECRET_KEY` (`sb_secret_N7UN…` padrão, sha256 `c85debb5…`; secreta só no nome: é a chave de demo do CLI
  local), a senha `postgres` do `DATABASE_URL` e o `JWT_SECRET` de demo (`super-secret-jwt-token-…`, só no histórico
  como regex do script da H1). Ocorrências fora do `.env`: 0 · 0 · 0.
- **Segredo real da máquina:** a senha do papel `hellosquad_api` em `API_DATABASE_URL` (não padrão, 48 caracteres),
  0 ocorrências na árvore, no histórico e nas evidências. `ANTHROPIC_API_KEY` e `SUPABASE_JWT_SECRET` vazios; o `.env`
  não tem chave de Asaas, Mercado Pago nem SMTP.
- Nada aponta para nuvem: `<ref>.supabase.co`, `railway.app`, `vercel.app` 0; `api.anthropic.com` só no teste simulado.

### Item 3 — só dados fictícios

Comando: `python3 docs/parciais/h2/estatico/varredura_dados_idioma.py` (cópia da H1 com escopo ampliado: conteúdo do
site, CSV, catálogo do backend e módulo de e-mail). 750 arquivos: seed 1, fixtures do LLM 54, catálogos do web 72,
conteúdo do site 4, catálogo do backend 3, e-mail 8, CSV 1, `squad/` 36, testes 106, `.txt` de `docs/parciais` 465.
- E-mails fora de `.example`: 5, nenhum defeito: `fora.s2f@miolo.test` (`test_email.py:320`, o teste que prova que o
  worker **recusa** domínio fora de `.example`), `pessoa@exemplo.test` (`test_s2b_deliveries.py:611`, a linha "Fora do
  Domínio" que a importação de CSV recusa) e `voce@seunegocio.com.br` num `.txt` não rastreado da X1. Catálogos e
  conteúdo do site: só `voce@seunegocio.example`, `you@yourbusiness.example`, `tu@tunegocio.example` (a H1E-06 foi
  corrigida). Seed, fixtures e `squad/`: só `@miolo/vitta/trilha/semconta/contatos.example`.
- CPF/CNPJ: 5 candidatos, todos com dígito verificador inválido: `00000000000` (documento zerado) em 4 linhas dos
  testes de cobrança e o prefixo de telefone `55119999900` do seed (`supabase/seed.sql:530`, que gera `+55 11 99999-0001…0020`).
- Telefones fora da convenção: 4, todos em `test_s2b_deliveries.py` (E-03).
- Marcas: só canais (Instagram, WhatsApp, Facebook, Google, Meta, TikTok, LinkedIn, YouTube) nos catálogos, fixtures
  e seed; "Avon" é a chave `avOn` e "Vale"/"Claro" são palavras do português (falsos positivos); fornecedores
  (Asaas, Mercado Pago, Supabase, Anthropic) só em testes dos adaptadores e num comentário de `email/smtp.py:1`;
  RD Station/HubSpot em `squad/max/agent.yaml:35` (E-04). CSV `apps/web/e2e/fixtures/contatos-a2b.csv`: 3 e-mails `@contatos.example`.
- Capturas: 85 `.png` novas desde a H1; olhei `sa0/02-conta-miolo.png` (Super Admin, a de nome mais sensível): só Miolo, `marina@miolo.example` e `vic@hellosquad.example`.

### Item 4 — pt-BR sem emoji no produto

339 arquivos (catálogos do web 72, fixtures 54, conteúdo do site 4, catálogo do backend 4, e-mail 8, `squad/` 36
incluindo `SOUL.md` e skills, seed 1, `apps/web/app` 54, `components` 76, `lib` 30), faixas U+1F000–1FAFF,
U+2600–27BF, U+2300–23FF, U+2B00–2BFF, U+FE0F e bandeiras: **0 emoji**. Único acerto da faixa: U+2713 "✓" em
`apps/web/components/site/Landing.tsx:29`, glifo tipográfico da tabela comparativa (não tem a propriedade Emoji do
Unicode; o leitor de tela lê o rótulo do catálogo `compareYes`). Commits desde 16/10: 503, 0 com emoji. Trechos com
cara de inglês em fixtures/`squad/`/seed: só SQL do seed (26 falsos positivos).

### Item 5 — nenhum fornecedor no site (fonte)

Comando: `bash docs/parciais/h2/estatico/fornecedor_site.sh` sobre 44 arquivos (conteúdo `content/site/*.json` e
`llms.json`, `messages/*/site.json` e `common.json`, `llms.txt`, `robots.txt`, `sitemap.ts`, `layout.tsx`, OG,
`lib/site*.ts`, `components/site/*`, páginas públicas), 60 termos da N2a §2.2 (IA, imagem/mídia, pagamento,
infraestrutura, redes sociais, buscadores). 8 acertos, nenhum visível: `React.ReactNode` (`app/layout.tsx:30`),
nomes de robôs no `robots.txt` (`lib/site-crawl.ts:13-17`: `Google-Extended`, `ChatGPT-User`, `Claude-SearchBot`,
`Claude-User`, user-agents obrigatórios), comentário sobre o `urllib.robotparser` do Python (`site-crawl.ts:24`) e
"Twitter" em dois comentários sobre o cartão de compartilhamento. Comercial: 55 "plan" (entrega, como a N2a
classificou), 6 "offer" (5 em `content/site/en.json` no sentido de "oferta do negócio do cliente" e 1 comentário
"Sem Offer" em `site-seo.ts:10`), "créditos" num comentário de `Landing.tsx:32`; "grátis/free" é o E-01. Nenhuma rota
`/precos`, `/pricing` ou `/precios` em `apps/web/app` nem link para ela no código.
