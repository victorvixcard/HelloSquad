# S1h — Relatório (Stark)

**Fatia:** correções da H1 do lado servidor e infra (H1-01, H1-02, H1-07, H1-08, H1-09). **Data:** 16/10/2026,
14:15 → 14:40. **Commits:** `eb3c4ea` (H1-02), `65c0bbf` (H1-07), `f2e5e3b` (H1-09, senha do papel), `391fc2a`
(autosave das 14:30: levou o `Makefile` e o `infra/mask-keys.sed`), `7de8794` (H1-08 e H1-09, SETUP_LOCAL),
`227e8e6` (H1-01) e o deste relatório. Nenhuma regra de negócio e nenhum contrato de API mudaram.

## 1. Achado → o que mudou → prova

### H1-01 (🟡) Token do Realtime e troca de senha — corrigido em parte

- **Mudou.** `supabase/config.toml`: `secure_password_change = true`; `jwt_expiry = 3600` mantido, com
  comentário amarrando à entrega da A1a. Supabase local reiniciado sob a trava para aplicar (14:32:51 → 14:33:30).
  Novo `apps/backend/tests/test_auth_session_policy.py` (4 testes; usuário fictício `s1h-sessao-*@hellosquad.example`
  criado por cadastro e apagado no fim).
- **Prova.**

```
$ docker exec supabase_auth_hellosquad env | grep -E 'UPDATE_PASSWORD_REQUIRE|JWT_EXP'
GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION=true
GOTRUE_JWT_EXP=3600
token novo: expires_in=3600 exp-iat=3600 s; vence em 60.0 min; role=authenticated; tem session_id=True

antes do restart (Auth ainda com false):
FAILED tests/test_auth_session_policy.py::test_password_change_on_old_session_requires_reauthentication
E       assert 200 == 400        <- sessão de 25 h trocou a senha só com o token
depois do restart:
test_config_keeps_short_token_and_secure_password_change PASSED
test_access_token_lives_at_most_one_hour PASSED
test_password_change_on_old_session_requires_reauthentication PASSED   (400 reauthentication_needed)
test_fresh_session_still_changes_password_inside_the_24h_window PASSED
4 passed in 0.73s
```

- **O que ainda fica (por isso "parcial").** Na Auth local (GoTrue v2.197.0, `internal/api/user.go:154-165`),
  `secure_password_change` só pede reautenticação quando a sessão tem **mais de 24 h**. Um XSS que pegue o token
  nas primeiras 24 h da sessão ainda troca a senha; o último teste acima registra isso de propósito. Duas saídas,
  as duas fora desta fatia:
  1. **Nuvem (Fase 5):** `security_update_password_require_current_password = true` exige a senha atual na troca.
     Só existe na configuração da nuvem; o CLI 2.121.0 não repassa ao container local (conferido no binário: ele
     mapeia só `secure_password_change`). Quando houver tela de troca de senha, ela manda `current_password`.
  2. **Token próprio do Realtime:** o Supabase não emite token de escopo reduzido, e a Auth local assina em ES256
     com chave que fica no container. O caminho é a nossa API emitir um JWT curto (`sub`, `role`, minutos de
     validade, sem `session_id`, `aud` próprio que a nossa API recuse) com uma chave que o Realtime aceite. Isso
     põe uma chave de assinatura no nosso servidor (`signing_keys_path` no local, chave importada na nuvem), cria
     rota nova e muda `apps/web/app/app/[workspace]/actions.ts` (área do Aranha). É decisão de arquitetura (custódia
     de chave) para o Thor levar; não fiz.
- **A1a §3** ("leva no máximo o token de acesso, cerca de 1 h"): vale para a API, a Data API e o Storage (provado
  acima); para a conta, vale só com sessão de mais de 24 h. Não editei o relatório do Aranha.

### H1-02 (🟡) Guarda do autosave — corrigido

- **Mudou.** `infra/git-autosave.sh`: um padrão só (`SECRET_RE`) para as linhas novas do diff **e** para os
  arquivos novos: `sk-ant-`, `sb_secret_` com valor, `sb_publishable_` com valor (20+; o fictício
  `sb_publishable_ci_ficticia` do CI não conta), JWT, cookie `sb-…-auth-token(.N)=valor`, `base64-eyJ…` (valor do
  cookie do `@supabase/ssr` num JSON), `ANTHROPIC_API_KEY=` preenchida e chave privada. O nome do cookie sem valor
  não conta (aparece nos relatórios de QA). Recusa com mensagem no log **e** no stderr, listando os arquivos e
  nunca o valor. Teste `infra/tests/git-autosave-guard.sh` (repositório e remoto temporários em `/tmp`, valores
  gerados de bytes aleatórios) no `make test-infra`, que entrou no `make test`.
- **Prova.**

```
$ make test-infra
ok   recusou: JWT em arquivo novo
ok   recusou: cookie de sessão em arquivo novo (subpasta)
ok   recusou: valor do cookie em JSON (nome e valor separados)
ok   recusou: sb_secret_ com valor
ok   recusou: sb_publishable_ com valor
ok   recusou: ANTHROPIC_API_KEY preenchida
ok   recusou: JWT em linha nova de arquivo versionado
ok   commitou e enviou: nome do cookie sem valor, ANTHROPIC_API_KEY vazia, chave fictícia curta
guarda do autosave: 8/8
$ AUTOSAVE=<script de antes: git show 8b7685e:infra/git-autosave.sh> bash infra/tests/git-autosave-guard.sh
guarda do autosave: 7 falha(s)      <- JWT, cookie, publishable e ANTHROPIC em arquivo novo passavam (saída 0)
```

  O autosave real das 14:30 e das 14:35 já rodou com a guarda nova e commitou normalmente (sem falso positivo).

### H1-07 (ℹ️) Fixture do Otto — corrigido

- **Mudou.** `otto.produce.json` (e `otto.revise.json`, que tinha o mesmo "duas versões") entregam **uma** versão e
  a mensagem diz isso ("Escrevi a legenda…"). "Sábado" só aparece quando o pedido fala em sábado (caso
  `legenda_instagram_sem_dia`, `when.tag = pedido`); no retorno, quando a conversa fala (`nova_versao_com_retorno`,
  agora com lookahead). A ordem preserva o que os testes do worker usam: retorno com sábado no índice 0, caso
  padrão por último. O web mostra `versoes[0]`; com uma versão, texto e cartão batem.
- **Prova.**

```
antes:  caso=legenda_instagram versoes=2 sabado=True  | Escrevi duas versões da legenda de sábado para o Instagram…
depois: caso=legenda_instagram_sem_dia versoes=1 sabado=False | Escrevi a legenda para o Instagram: destaca a fermentação…
(pedido: "Legenda para o Instagram do pão de centeio da semana")
tests/test_llm.py: 6 testes novos (produce e revise × com/sem sábado; retorno com/sem sábado) -> 15 passed
worker, LLM, créditos, memória, conversa e core: 62 passed; make e2e (fluxos ao vivo com o worker simulado): 10 passed
```

### H1-08 (ℹ️) Trava do banco — corrigido

- **Mudou.** `DB_LOCK := flock -o -w 600 /tmp/hellosquad-db.lock`: o descritor não passa aos filhos; a trava acaba
  com o alvo mesmo que sobre um órfão. `make up` e `make migrate` passaram a pegar a trava (uma vez para a
  sequência inteira). Espera máxima de 10 min (ver §4). SETUP_LOCAL: linha em "Problemas comuns" com
  `lsof /tmp/hellosquad-db.lock` e como achar um worker órfão.
- **Prova.**

```
== sem -o (como era): o alvo sobe um filho e termina
  filho órfão pid 16417
  trava PRESA pelo órfão: sleep
== com -o (agora): o mesmo alvo
  filho órfão pid 16431
  trava livre depois do alvo; órfão ainda vivo: 1

make e2e e make test concorrente (worktree em /tmp no HEAD a86a88d, portas 8200/3200; o web do dono na 3100 intocado):
14:35:54 [e2e]  flock -o -w 600 /tmp/hellosquad-db.lock env HELLOSQUAD_DB_LOCK_HELD=1 pnpm --filter web e2e
14:35:55 == make e2e pegou a trava; quem a segura: 17939 flock;      <- só o flock, não o pnpm/Playwright
14:35:55 [test] flock -o -w 600 /tmp/hellosquad-db.lock bash -c 'cd apps/backend && uv run pytest'   (espera)
14:36:15 [e2e]  seed aplicado: ../../supabase/seed.sql
14:36:15 [e2e]    10 passed (20.0s)                                   saída 0
14:36:16 [test] ============================= test session starts ==   <- seguiu 1 s depois
14:36:54 == make test terminou: saída 0; workers órfãos depois: 0
```

### H1-09 (ℹ️) Higiene do SETUP_LOCAL — corrigido

- **`.env` 600:** "Subir do zero" passou a `cp .env.example .env && chmod 600 .env`.
- **Chaves fora da saída:** `make status` e `make up` passam por `infra/mask-keys.sed` (chaves `sb_*`, JWT, segredo
  do S3, segredo JWT e senha na URL do banco). Os valores para o `.env` continuam em `pnpm exec supabase status -o env`.

```
$ make status
│ URL │ postgresql://postgres:***@127.0.0.1:56322/postgres │
│ Publishable │ sb_publishable_*** │
│ Secret      │ sb_secret_***      │
│ Access Key │ ***                                 │
│ Secret Key │ *** │
saída pretty e json mascaradas: 0 linha com cara de chave em cada uma
```

- **`make test-web`:** conferido, ele **já** roda o Vitest do web (`pnpm -r --if-present test` inclui `apps/web`,
  que tem `"test": "vitest run"`: 131 testes no `make test` abaixo). Errada estava a descrição; corrigida no
  `Makefile` e no `SETUP_LOCAL.md`. Não existe outro alvo que rode esse Vitest.
- **Segundo checkout:** `hellosquad-local-db` (usado por `make up`, `make migrate`, `make seed` e o teardown do
  e2e) não regrava a senha do `hellosquad_api` que já vale e **recusa** trocar uma senha diferente sem `--rotate`,
  com mensagem que manda copiar o `API_DATABASE_URL` do outro checkout. Documentado em "Chaves locais" e
  "Problemas comuns".

```
tests/test_local_db.py::test_roles_keeps_the_password_that_already_works PASSED            (hash SCRAM igual antes e depois)
tests/test_local_db.py::test_roles_refuses_to_rotate_the_password_another_checkout_uses PASSED  (saída 1, hash igual)
7 passed; API da 8100 seguiu respondendo /health durante e depois
```

## 2. `make test`

Rodado no worktree do HEAD `a86a88d` (todos os commits da S1h; sem o trabalho não commitado do Aranha), em
paralelo com o `make e2e` acima:

```
14:35:55 All checks passed!                                   (ruff check e ruff format)
14:36:39 ============================= 144 passed in 23.84s ======
14:36:47 packages/contracts test:       Tests  9 passed (9)
14:36:47 packages/ui test:       Tests  49 passed (49)
14:36:51 apps/web test:       Tests  131 passed (131)
14:36:52 Files=21, Tests=489 … Result: PASS                    (pgTAP)
14:36:54 guarda do autosave: 8/8
saída 0
```

## 3. O que ficou de fora

- **Token próprio do Realtime** e **senha atual na troca** (H1-01, §1): decisão de arquitetura e configuração da
  nuvem; recomendo entrar no checklist da Fase 5 (Jarvis).
- **Comentário de 30 min** em `apps/web/e2e/global-teardown.ts:36`: o limite agora é 10 min; arquivo do web, não
  mexi.
- **Worker órfão do e2e:** com `-o` ele não segura mais a trava, mas, vivo, ainda consumiria a fila. Ficou
  documentado como achar e parar; não mudei o setup do Playwright (web).

## 4. Onde discordei ou decidi algo técnico

- **Espera de 10 min, não os 30 min sugeridos na H1.** Com `-o`, só o alvo segura a trava, e os alvos levam de
  segundos a meio minuto (Playwright 20 s, pytest 24 s, pgTAP 1 s). Dez minutos cobrem a fila de várias sessões;
  mais que isso é trava presa, e o erro aparece antes.
- **H1-01 marcado "parcial" na tabela da H1**, em vez de só "corrigido": a janela de 24 h é real e está provada.
- **`otto.revise.json`** entrou junto com o `otto.produce.json`: tinha o mesmo "Escrevi duas versões".

## 5. Estado em que deixei a máquina

- Supabase local reiniciado uma vez (14:32:51 → 14:33:30) para aplicar o `config.toml`; dados preservados no
  volume. Só containers `supabase_*_hellosquad`.
- API (8100, o `make dev-api` da H1) e web (3100) seguiram no ar sem religar: `/health` ok, `/me` 200 com token
  novo, `/entrar` 200.
- Banco no estado do seed (teardown do e2e às 14:36:15 e pgTAP "seed presente" verde depois). Usuários `s1h-*`:
  0; usuários fora de `.example`: 0. Nenhum worker no ar.
- Worktree `/tmp/s1h_wt` removido, com o `.env` que tinha. Saídas em `/tmp/s1h_*`.
