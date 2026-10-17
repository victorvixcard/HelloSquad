# SA7a — Correções da H-SA (servidor e infra) · relatório

Stark, 17/10/2026, 01:07–01:26, sozinho em `apps/backend`, `supabase/`, `packages/contracts` (gerado),
`docs/SETUP_LOCAL.md` e documentos da fatia, em paralelo com a SA7b do Aranha em `apps/web`. Sem sub-agentes, sem
`next build` nem `make e2e`. Banco sempre pela trava (`flock -o`), só os containers `supabase_*_hellosquad`. API (8100)
e web (3100) do dono no ar o tempo todo (a API recarregou sozinha com o código novo).

## 1. Achado → o que mudou → prova

| Achado | O que mudou | Commits |
|---|---|---|
| **H-SA-01** motivo interno legível pela Data API | `delivery_prices.note` e `workspaces.suspension_reason` saem das tabelas do produto e vão para `delivery_price_notes` e `workspace_suspension_reasons` (RLS forçada, sem GRANT para `anon`/`authenticated`/`service_role`, só `hellosquad_admin` com o JWT de Super Admin lê). `app.admin_catalog_price` grava o motivo na tabela nova; `app.admin_set_workspace_suspended` passa a devolver `(id, suspended_at, suspension_reason)` e apaga o motivo na reativação. `/admin/accounts` lê o motivo pela tabela do painel: as respostas `/admin/*` não mudam (o contrato não mudou). Privilégio de coluna foi descartado: `app.current_delivery_price` faz `select p.*` como `authenticated` e quebraria. pgTAP `32_sa7a_private_reasons` varre **toda** tabela e view de `public` legível por `authenticated` como Marina e Pedro procurando o motivo; com o GRANT devolvido de propósito (mutação, no mesmo arquivo), a varredura acha o motivo. | `894d310` |
| **H-SA-02** `make seed` quebra com negócio do Vic; Vic cai no onboarding; saldo informado fica | Seed: Pedro e Vic tratados igual: negócio em que só eles são owner sai com a auditoria dele **antes** das memberships (a trava "pelo menos um owner" da S0 não recusa); onde há outro owner, só a membership deles sai. Seed devolve o saldo informado (`provider_balance_reports` vazio, `provider_health` sem saldo e sem limiar); o fixture do `test_admin_sa4` limpa também **antes**. `GET /me` ganha `is_platform_admin` (contrato regenerado, +1 campo). `SETUP_LOCAL.md`: o que o `make seed` apaga e o que preserva do que o painel gravou. | `6db1d8e` (autosave levou seed, `/me` e fixture), `1504e8f`, `da2e744` |
| **H-SA-07** clone limpo não fica verde | `test_email.py` espera o link do `EMAIL_APP_URL` das settings, não a 3100 fixa. Guia do segundo checkout: o `make test` dele lê as URLs do `.env` dele, usa o mesmo banco e a mesma trava e reaplica o seed. | `9fa41a9` |
| **H-SA-09** (ℹ️) API abre sessão de suporte em conta suspensa | `app.admin_support_session_start` recusa conta suspensa com HS423 → 423 `workspace_suspended`, como o SA0 e a tela da SA6b (`9711b69`) já faziam; 423 documentado no OpenAPI da rota. O pgTAP da SA6a reativa a Miolo antes da leitura do suporte (ela abria sessão na conta que tinha acabado de suspender). | `238eec7` |

### Provas coladas

`make test` (árvore do dono, depois de todos os itens; saída em `/tmp/sa7a_make_test.txt`):
```
packages/contracts test:       Tests  9 passed (9)
packages/ui test:       Tests  50 passed (50)
apps/web test:       Tests  491 passed (491)
======================== 330 passed in 80.96s (0:01:20) ========================
Files=33, Tests=879,  1 wallclock secs ( 0.10 usr  0.02 sys +  0.16 cusr  0.15 csys =  0.43 CPU)
Result: PASS
make test exit=0
```

Mutação do H-SA-02 (o `test_sa7a.py` contra o seed de antes, `894d310`), `/tmp/sa7a_mutacao_seed.txt`:
```
E           psycopg.errors.CheckViolation: O workspace precisa de pelo menos um owner.
1 failed, 1 passed in 1.51s
```
Com o seed novo: `test_sa7a.py` 3 passed (no `make test`). Mutação do H-SA-07 (o `test_email.py` antigo com
`EMAIL_APP_URL=http://127.0.0.1:3199`): `1 failed, 1 passed`; o novo: `2 passed` na 3199 e `7 passed` na 3100.

Clone limpo do remoto em `9fa41a9`, `.env` de segundo checkout (8199/3199) e só `make test-backend`
(`/tmp/sa7a_clone.sh`, saída `/tmp/sa7a_clone.txt`; clone e `.env` removidos):
```
clone em 9fa41a9 SA7a: test_email espera o link do EMAIL_APP_URL e o guia do segundo checkout diz como o make test se comporta (H-SA-07)
EMAIL_APP_URL=http://127.0.0.1:3199
======================== 329 passed in 83.16s (0:01:23) ========================
make test-backend exit=0
```

Ao vivo, API do dono (8100) e Data API local (`sa7a/prova_sa7a.sh`, saída inteira em `sa7a/prova_sa7a.txt`):
```
VIC: is_platform_admin = True | memberships = 0
MARINA: is_platform_admin = False | memberships = 1
Pedro delivery_prices?select=note: 400 42703
Pedro delivery_prices?select=credits (o produto lê o preço): 200
Pedro delivery_price_notes: 403 42501
Marina workspaces?select=suspension_reason: 400 42703
Marina workspace_suspension_reasons: 403 42501
anon delivery_price_notes: 401 42501
GET /admin/accounts: 200 | itens com suspension_reason na resposta: 3 de 3
Marina GET /admin/accounts: 403
```

Estado final: 3 negócios, 0 membership do Vic, 0 sessão de suporte aberta, 0 conta suspensa, 0 saldo informado, 04.01
com 1 versão de preço; `/health` 200 e web 3100 200.

## 2. O que fica para a SA7b (web)

- **Destino do Vic no `/entrar`.** O servidor já decide: `GET /me` devolve `is_platform_admin: true` para o Super
  Admin. O web precisa, no destino pós-login (hoje `/app` → primeiro negócio ou `/app/novo-workspace`), mandar quem
  tem `is_platform_admin` e nenhuma membership para `/admin`. Não mexi em `apps/web`. A pergunta 1 do §e da H-SA (o
  Super Admin pode ter negócio de cliente com o mesmo login?) continua com o dono: o `POST /workspaces` segue aberto a
  ele, e o seed agora limpa o que ele criar.
- Conta suspensa na sessão de suporte agora responde **423 `workspace_suspended`** (antes, 201); a tela já bloqueava.

## 3. O que ficou de fora

- **H-SA-08** (escrita por id de objeto durante a sessão de suporte dá 404, não 403): o 403 honesto pede saber o
  negócio do objeto antes da busca em 11 rotas, ou um bloqueio geral de escrita do Super Admin com sessão aberta, que
  também barraria as escritas da própria conta dele (preferências, idioma). Nada é gravado hoje; fica para decidir.
- **H-SA-10** (fontes da Qualidade com a v1 depois de "voltar versão"): muda a chave de `agent_prompt_versions` e a
  atribuição por versão; não é barato. H-SA-11 a H-SA-13 são do web.

## 4. Onde discordei ou li diferente

- O briefing aceitava "RLS por coluna via view"; escolhi tabela própria do painel porque o privilégio de coluna
  quebraria `select p.*` em funções SECURITY INVOKER do produto (`app.current_delivery_price`) e qualquer
  `select *` futuro. Efeito colateral: `delivery_prices` e `workspaces` perderam essas colunas; nenhuma rota do
  produto as lia.
- A regra nova do seed apaga também negócio em que Pedro ou Vic são owner **com** outros membros sem papel de owner
  (antes o seed quebrava nesse caso, como no do Vic). É resíduo de teste manual; o `SETUP_LOCAL.md` diz isso.
