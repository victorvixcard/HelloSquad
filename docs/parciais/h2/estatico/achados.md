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
