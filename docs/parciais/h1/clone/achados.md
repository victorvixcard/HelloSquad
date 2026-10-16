# H1 — Reprodutibilidade do `SETUP_LOCAL.md` num clone limpo

Auditoria de QA para a fatia H1 (Hulk), 16/10/2026, 13:29 às 13:59. Clone em `/tmp/h1_clone`, seguindo
`docs/SETUP_LOCAL.md` ("Subir do zero") contra o **mesmo** Supabase local do projeto `hellosquad` que já estava
no ar. Nada foi alterado no repositório principal além desta pasta. Sem commit, sem push. Chaves e senhas
mascaradas em todos os anexos (conferido com `grep` por `sb_secret_`, `eyJ`, pelo JWT secret padrão do CLI
e pela senha do papel: 0 ocorrências).

- **Clone:** `git clone https://github.com/victorvixcard/HelloSquad /tmp/h1_clone` (GitHub público, 2 s,
  exit 0). Commit `b090f2e` ("H1: abre o progresso da QA adversária da Fase 1"), o mesmo `HEAD` do
  repositório principal.
- **Ambiente compartilhado:** os 11 containers `supabase_*_hellosquad` seguiram no ar o tempo todo; o
  `supabase start` do clone reaproveitou-os (nenhum container novo, nenhuma porta nova). API do dono em
  `:8100` e web em `:3100` intocadas (só GETs de leitura na API, ver afirmação 3).
- **Desvios deliberados do documento (restrição do ambiente):**
  1. Passo da senha: rodei `openssl rand -hex 24` (exit 0, 48 caracteres), mas **não** usei a senha gerada.
     O `API_DATABASE_URL` do clone recebeu o mesmo valor do `.env` principal (lido sem imprimir; sha256 igual),
     porque o papel `hellosquad_api` é um só para os dois checkouts (achado H1-C01).
  2. `make up` e `make migrate` rodaram dentro de `flock -w 1800 /tmp/hellosquad-db.lock`, porque mexem no
     banco e não pegam a trava sozinhos (achado H1-C03).

## Passos executados

| # | Passo (ordem do documento) | Exit | Tempo | Observação |
|---|---|---|---|---|
| 1 | `git clone …` | 0 | 2 s | commit `b090f2e` |
| 2 | `corepack enable pnpm` | 0 | <1 s | pnpm 12.11.2, igual ao `packageManager` |
| 3 | `cp .env.example .env` | 0 | <1 s | `DATABASE_URL` já vem preenchido; o arquivo nasce `664` (H1-C05) |
| 4 | `openssl rand -hex 24` + montar `API_DATABASE_URL` | 0 | <1 s | senha do `.env` principal (desvio 1) |
| 5 | `make up` (sob `flock`) | 0 | 4 s | pnpm 459 pacotes reaproveitados do store, uv criou `.venv` (46 pacotes), `supabase start` já no ar, `migration up` → `"applied":[]`, `roles --optional` gravou a senha (a mesma) |
| 6 | `pnpm exec supabase status -o env` → `.env` | 0 | 1 s | `PUBLISHABLE_KEY` (`sb_publishable_`, 46 car.) em `SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `SECRET_KEY` (`sb_secret_`, 41 car.) em `SUPABASE_SECRET_KEY`; os três iguais aos do `.env` principal (sha256) |
| 7 | `make migrate` (sob `flock`) | 0 | 1 s | redundante nesta ordem (`"applied":[]`); o bloco "Subir do zero" não o pede porque o `.env` nasce antes do `make up` (H0-06 corrigido) |
| 8 | `make seed` | 0 | 1 s | 5 usuários (miolo/trilha/vitta, Pedro sem membership) |
| 9 | `make test` | **0** | **41 s** | contagens abaixo; trava livre na hora (13:31:17) |
| 10 | `make status` | 0 | 1 s | Supabase, API e web no ar (afirmação 2) |
| 11 | `flock -w 1800 … timeout -s TERM 25 make -C /tmp/h1_clone worker` | 124 (timeout) | 914 s | ~889 s esperando a trava presa por um worker órfão (H1-C02) + 25 s de worker; subiu, avisou o simulado e saiu limpo no SIGTERM |
| 12 | `make -C /tmp/h1_clone seed` final | 0 | <1 s | 13:48:12; estado do seed (ver "Estado final") |
| 13 | Repo principal: `flock … uv run hellosquad-local-db roles` e `curl :8100/health` | 0 | 1 s | senha do papel = `.env` principal; `{"status":"ok",…}` |

Anexos: `passos.txt`, `make_up.txt`, `migrate_seed.txt`, `make_test.txt`, `make_status.txt`,
`roles_sem_env.txt`, `s1g_leitura.txt`, `worker.txt`, `trava.txt`.

## `make test` no clone

`make test` exit **0** em **41 s** (13:31:20 → 13:32:01). Igual à conferência da main às 13:24.

| Bloco | Resultado |
|---|---|
| `ruff check` / `ruff format --check` | limpo / 71 arquivos já formatados |
| pytest (unitários + integração) | **133 passed** em 25,86 s |
| ESLint do web | limpo |
| `tsc` (web, `@hellosquad/ui`, `@hellosquad/contracts`) | ok |
| Vitest | web **121** (16 arquivos), ui **49** (5), contracts **9** (1) |
| pgTAP (`supabase test db`) | **21 arquivos, 489 testes, PASS** |

Nada falhou, então não houve reprodução para intermitência.

## Worker

`flock -w 1800 /tmp/hellosquad-db.lock timeout -s TERM 25 make -C /tmp/h1_clone worker` (13:32:22). A trava
estava presa por um worker órfão da outra auditoria (H1-C02) e só foi liberada às 13:47:11; daí em diante
o worker do clone fez exatamente o que o documento promete (`worker.txt`):

```
13:47:11,707 WARNING hellosquad.llm: LLM_PROVIDER=anthropic sem ANTHROPIC_API_KEY: usando o modo simulado (fixtures, sem custo)
13:47:11,713 INFO hellosquad.worker: worker no ar: fila runs_interactive, concorrência 4, teto por workspace 3, LLM simulated
13:47:36,088 INFO hellosquad.worker: sinal de encerramento recebido: parando de ler a fila
13:47:36,088 INFO hellosquad.worker: worker encerrado
```

Exit 124 é o código do `timeout` ao expirar; o worker saiu sozinho no SIGTERM, sem traceback. Fila
`pgmq.q_runs_interactive`: 0 antes e 0 depois.

## Cinco afirmações do `SETUP_LOCAL.md` contra o comportamento real

| # | Afirmação | Resultado | Prova |
|---|---|---|---|
| 1 | Tabela "Portas": Kong 56321, Postgres 56322, Studio 56323, Mailpit 56324, Analytics 56327; 56325/56326 não expostas; 56328/56329 reservadas (edge runtime e pooler desligados); 56320 só no `db diff`; API 8100; web 3100 | **Confere** | `supabase/config.toml` tem exatamente esses valores (smtp/pop3 comentados, `[db.pooler] enabled = false`, `[edge_runtime] enabled = false`); `ss -ltn` mostra escutando 56321, 56322, 56323, 56324, 56327, 8100 (127.0.0.1) e 3100, e nada em 56320/56325/56326/56328/56329 |
| 2 | "`make status` mostra o Supabase, a API (`/health`) e a web" | **Confere**, com ressalva (H1-C04) | exit 0; `{"status":"ok","version":"0.1.0","environment":"local"}` e `Web no ar em http://127.0.0.1:3100`; o bloco do Supabase sai em JSON numa linha, com as chaves (`make_status.txt`, mascarado) |
| 3 | Roteiro "Trabalho rico (S1g)", passos 1, 2 e 5 (só leitura; 3 e 4 escrevem no banco e ficaram de fora no ambiente compartilhado) | **Confere** literalmente | trabalho 301: `status_label` "v1 aguarda sua aprovação", `next_step` "Aprovar a v1", `awaiting_you` true, origem `message`/`agent_direct`/`otto`, histórico "Você pediu na conversa com o Otto" → "v1 entregue" (automático); `needs`: `count 1, deferred_count 0, [review]`; `squad/status`: nexo live "coordenando", otto wait "Otto · aguarda sua aprovação", os outros cinco idle "disponível" (`s1g_leitura.txt`) |
| 4 | Seção "Worker do squad": sobe com "worker no ar", avisa o modo simulado sem `ANTHROPIC_API_KEY`, SIGTERM encerra limpo | **Confere** literalmente | as duas primeiras linhas do log são idênticas às do exemplo do documento; SIGTERM → "parando de ler a fila" → "worker encerrado" no mesmo milissegundo (`worker.txt`) |
| 5 | "Problemas comuns" / "Subir do zero": sem `.env`, o `make up` "avisa em uma linha e segue"; chamados direto, `make migrate`/`make seed` exigem as duas URLs | **Confere** (H0-06 corrigido) | sem `.env` no clone: `roles --optional` → `aviso: .env ausente ou sem DATABASE_URL e API_DATABASE_URL; …` exit 0; `roles` → `erro: DATABASE_URL vazio no .env …` exit 1 (nenhuma conexão com o banco; `roles_sem_env.txt`) |

Também confere: "os seguintes [`make up`] sobem em segundos" (4 s com caches quentes) e o formato das
chaves da tabela "Chaves locais" (`sb_publishable_…`, `sb_secret_…`, `API_URL` = `http://127.0.0.1:56321`,
`DB_URL` igual ao `DATABASE_URL` do `.env.example`).

## Achados

### H1-C01 — Segundo checkout na mesma máquina troca a senha do `hellosquad_api` e derruba a API do primeiro (🟡)

- **Cenário concreto.** O `supabase/config.toml` fixa `project_id = "hellosquad"`, então todo checkout da
  máquina usa os mesmos containers e o mesmo banco (provado: o `supabase start` do clone reaproveitou os 11
  containers e as chaves do `status -o env` são idênticas às do `.env` principal). Quem segue o "Subir do
  zero" num segundo checkout (worktree, clone de auditoria, outra sessão) gera uma senha nova com
  `openssl rand` e o `make up` a grava no papel (`local_db.py`, `set_api_role_password`: `alter role … password`
  sempre, sem conferir a atual). A API que já está no ar com o `.env` antigo passa a falhar nas conexões novas
  com `password authentication failed for user "hellosquad_api"`. Não reproduzi de propósito (derrubaria a API
  do dono); é dedução direta do código e do Makefile.
- **Correção proposta.** No `SETUP_LOCAL.md`, um parágrafo "Outro checkout na mesma máquina": reaproveitar o
  `API_DATABASE_URL` (e as chaves) do `.env` existente, nunca `make down`/`db reset` a partir dele. No código,
  `roles` pode conferir antes se a senha do `.env` já autentica e só gravar quando o papel não tem senha, com
  um `--rotate` explícito para trocar.
- **Prova.** `make_up.txt`: `senha do papel hellosquad_api definida a partir de API_DATABASE_URL` contra
  `supabase_db_hellosquad`; `passos.txt`: valores do `.env` do clone iguais aos do principal (sha256).

### H1-C02 — Worker órfão segura a trava do banco e para todo mundo (🟡)

- **Cenário concreto (observado nesta auditoria).** Das 13:32:07 às 13:47:11 (15 min) um `hellosquad-worker`
  do repositório principal (pid 88195/88201, `setsid`, pai morto e re-pendurado no `systemd --user`, log
  `/tmp/h1_worker_aceite.log`, ocioso desde 13:33:11) manteve aberto o descritor de `/tmp/hellosquad-db.lock`
  herdado do `flock`. Enquanto ele vive, `make test`, `make seed`, `make e2e` e qualquer `flock` esperam até
  30 min e falham. Às 13:46 esperavam: o meu passo do worker (desde 13:32:22) e o
  `02_idempotencia_creditos_worker.py` da outra auditoria (desde 13:36:39, `-w 900`). A trava só voltou
  quando alguém mandou SIGTERM ao órfão (log dele: "worker encerrado" às 13:47:11,006). O mesmo padrão existe
  no fluxo oficial: `apps/web/e2e/global-setup.ts` sobe o worker com `detached: true` e `unref()` dentro do
  `make e2e`, que segura a trava; se o Playwright morrer antes do teardown, o worker sobrevive com a trava.
- **Correção proposta.** Usar `flock -o` (fecha o descritor antes de executar o comando: a trava fica só com o
  processo `flock`, e filhos órfãos não a herdam) no `DB_LOCK` do Makefile e nos scripts; ou fechar o fd da
  trava ao subir o worker. No `SETUP_LOCAL.md`, linha em "Problemas comuns": "`make test`/`make seed` parados
  esperando a trava → `fuser -v /tmp/hellosquad-db.lock` mostra quem a segura".
- **Prova.** `trava.txt`: `fuser -v /tmp/hellosquad-db.lock` lista `uv` 88195 e `hellosquad-work` 88201
  além dos dois `flock` em espera; `/proc/88201/fd/3 -> /tmp/hellosquad-db.lock`.

### H1-C03 — `make up` e `make migrate` mexem no banco sem a trava (ℹ️)

- **Cenário concreto.** `seed`, `test-backend`, `test-db` e `e2e` usam `$(DB_LOCK)`, mas `up` e `migrate`
  rodam `supabase migration up --local` e `hellosquad-local-db roles` (`ALTER ROLE`) fora dela. Uma
  migration nova aplicada no meio do `make test` de outra sessão muda o schema sob os testes.
- **Correção proposta.** `$(DB_LOCK) bash -c '$(SUPABASE) migration up --local && cd $(BACKEND_DIR) && uv run
  hellosquad-local-db roles …'` nos dois alvos (o `supabase start` pode ficar fora).
- **Prova.** `Makefile` linhas `up:` e `migrate:` sem `$(DB_LOCK)`; nesta auditoria os dois foram envolvidos à
  mão.

### H1-C04 — `make status` e o log do `make up` despejam as chaves locais (ℹ️)

- **Cenário concreto.** Com a saída redirecionada (log, CI, relatório), o Supabase CLI 2.121.0 imprime o
  status em JSON numa linha com `SECRET_KEY`, `SERVICE_ROLE_KEY`, `JWT_SECRET` e o segredo S3. O próprio
  documento diz que a secret "nunca [vai] em log"; quem colar o `make status` ou o log do `make up` num
  relatório vaza a chave local.
- **Correção proposta.** No `status`, filtrar: `$(SUPABASE) status -o env | grep -E
  '^(API_URL|DB_URL|STUDIO_URL|MAILPIT_URL)='`; no `up`, mandar a saída do `supabase start` para
  `/dev/null` e imprimir só a linha final que já existe. Ou avisar no documento.
- **Prova.** `make_status.txt` e `make_up.txt` (já mascarados): a linha JSON traz os campos
  `PUBLISHABLE_KEY`, `SECRET_KEY`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY` preenchidos.

### H1-C05 — `.env` nasce legível por qualquer usuário da máquina (ℹ️)

- **Cenário concreto.** `cp .env.example .env` herda o umask (002 no Ubuntu): o `.env` do clone ficou
  `-rw-rw-r--` com `SUPABASE_SECRET_KEY` e a senha do papel; o `.env` principal está `-rw-------`.
- **Correção proposta.** No "Subir do zero": `install -m 600 .env.example .env` (ou `chmod 600 .env`).
- **Prova.** `ls -la`: clone `-rw-rw-r--`, principal `-rw-------`.

### H1-C06 — Tabela de comandos descreve `make test-web` sem o Vitest do web; aviso do Vite no log (ℹ️)

- **Cenário concreto.** A tabela diz "os testes Vitest dos pacotes", mas `pnpm -r --if-present test` roda
  também o Vitest do `apps/web` (16 arquivos, 121 testes, o maior bloco). O log traz ainda o aviso do Vite
  "ESM syntax in a file loaded as CommonJS (vitest.config.ts)", ruído que esconde avisos reais.
- **Correção proposta.** "os testes Vitest do web e dos pacotes"; renomear para `vitest.config.mts` (ou
  `"type": "module"` no `apps/web/package.json`).
- **Prova.** `make_test.txt`: `apps/web test: Tests 121 passed (121)` e a linha do aviso.

### Registro: H0-06 corrigido

O "Subir do zero" agora cria o `.env` antes do `make up`, as chaves entram depois (só existem com o Supabase
no ar) e o `make up` sem `.env` só avisa (afirmação 5). Seguido ao pé da letra, o bloco funciona sem
`make migrate` extra.

## Estado final

- `make -C /tmp/h1_clone seed` (com a trava) às 13:48:12, exit 0: miolo/owner Marina, trilha/owner Juliana,
  vitta/editor Carla, vitta/owner Rafael, Pedro sem membership. Workspaces no banco: `miolo,trilha,vitta`
  (nenhum `pedro-teste-*`); `pgmq.q_runs_interactive` = 0.
- Repo principal: `flock -w 1800 /tmp/hellosquad-db.lock uv run hellosquad-local-db roles` (em
  `apps/backend`) exit 0, "senha do papel hellosquad_api definida a partir de API_DATABASE_URL"; conexão como
  `hellosquad_api` com a URL do `.env` principal OK (`rolsuper` e `rolbypassrls` falsos).
- `curl -s http://127.0.0.1:8100/health` → `{"status":"ok","version":"0.1.0","environment":"local"}`
  (também conferido às 13:30 e 13:46, depois do `make up`/`make migrate` do clone).
- 11 containers `*_hellosquad` no ar; nenhum `make down`, `supabase stop` ou `db reset`; nada em 3100/8100
  além de leituras.
- Clone mantido em `/tmp/h1_clone` com `.env` completo (mesmas chaves e senha do principal) e dependências
  instaladas, pronto para o `make e2e` do Hulk (o Chromium do Playwright já está em `~/.cache/ms-playwright`).
