# H2 · Clone limpo seguindo só o `docs/SETUP_LOCAL.md`

Auditor auxiliar do Hulk (QA), 16/10/2026, 18:58 → 19:16.

**Objetivo.** Provar (ou refutar) que um clone limpo sobe e passa seguindo só o `docs/SETUP_LOCAL.md`.

**Veredito.** O clone sobe e passa. Todos os alvos do guia saem com 0 depois de copiar o `API_DATABASE_URL` do primeiro checkout, como manda a linha 68: `make install` 0, `make up` 0, `make migrate` 0, `make seed` 0, `make worker` (sobe, consome, SIGTERM) 0, `make test-infra` 0. O `make test` saiu com 2 nas três rodadas, sempre só no pgTAP e sempre por estado deixado no banco compartilhado por outra sessão (o QA "H2 QA" do Hulk), nunca por algo do clone. Com o banco no estado do seed, o pgTAP do clone dá **700/700 PASS**. ruff ok, pytest **220 passed** (66 unitários + 154 de integração), ESLint ok, `tsc` ok, Vitest **9 + 49 + 327 = 385 passed**, guarda do autosave **8/8**. **H1-09 não reproduz**: depois do `make up`, do `make migrate` e do `make seed` do clone com uma senha diferente, a API do dono seguiu 200 em `/me` e `/workspaces` (7 conferências, 19:00 → 19:12).

**Ambiente.** Clone de verdade do remoto: `git clone https://github.com/victorvixcard/HelloSquad /tmp/h2_clone`, 3 s, HEAD `bc58140`, o mesmo da `main` local (a rede funcionou, sem precisar do clone local). Ferramentas: Node v24.21.0, pnpm 12.11.2 (corepack), uv 0.11.28, Docker 29.7.1, make 4.3, WSL2. O Supabase é o mesmo do projeto `hellosquad` (11 containers `supabase_*_hellosquad`, no ar havia 40 min, intocados). O `project_id`, as portas e o `config.toml` do clone não mudaram. A API do dono (:8100) e a web do dono (:3100) ficaram no ar o tempo todo. A API do clone subiu na 8199 e a web do clone na 3199, só por segundos. Chaves, tokens e senhas não aparecem aqui (mascarados).

Resumo dos comandos e exit codes: `passos.txt` (ao lado). Saídas completas em `/tmp/h2_clone_*.txt` enquanto a máquina não for limpa.

## Passos executados

| Hora | Passo do guia (linha) | Comando | Exit | Tempo | Saída relevante |
|---|---|---|---|---|---|
| 18:58:59 | Subir do zero (21) | `git clone https://github.com/victorvixcard/HelloSquad /tmp/h2_clone` | 0 | 3 s | HEAD `bc58140` |
| 19:00:24 | — (linha de base) | token da Marina + `GET :8100/me` e `GET :8100/workspaces` na API do dono | — | — | 200 (`marina@miolo.example`, 1 membership) · 200 (`miolo`) |
| 19:00:30 | 25 | `cp .env.example .env && chmod 600 .env` | 0 | 0 s | `.env` com modo 600; `DATABASE_URL` já preenchido (confere com a linha 25) |
| 19:00:30 | 26, 62–65 | `openssl rand -hex 24` → `API_DATABASE_URL=postgresql://hellosquad_api:<senha-gerada>@127.0.0.1:56322/postgres` | 0 | 0 s | senha nova, **diferente** da do dono (é o que o guia manda) |
| 19:00:35 | 23 | `corepack enable pnpm` | 0 | 0 s | — |
| 19:00:35 | 27 (pré-requisito do `up`) | `make install` | 0 | 1 s | `pnpm install --frozen-lockfile`: +459 pacotes, `supabase 2.121.0` (CLI responde `pnpm exec supabase --version`); `uv sync --locked`: CPython 3.12.3, 46 pacotes. Rápido porque o store do pnpm e o cache do uv já existem nesta máquina |
| 19:00:58 | 27 | `make up` (senha do clone ≠ do dono) | **2** | 3 s | `supabase start` vê o stack no ar e só imprime o status (mascarado: `sb_publishable_***`, `sb_secret_***`, `JWT_SECRET ***`, `postgres:***`); `{"applied":[],"message":"Migrations applied"}`; `erro: o papel hellosquad_api já tem outra senha (outro checkout nesta máquina?)…` (C-01) |
| 19:01:07 | — | API do dono | — | — | 200 · 200 |
| 19:01:16 | 29–30, 47–54 | `pnpm exec supabase status -o env` → `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 0 | — | `API_URL` = `http://127.0.0.1:56321` (confere com a linha 53) |
| 19:01:20 | 39, 99 | `make migrate` (senha do clone ≠ do dono) | **2** | 2 s | 0 migrations; `erro: o papel hellosquad_api já tem outra senha…` (recusa, nada gravado) |
| 19:01:23 | — (**H1-09**) | API do dono logo depois do `make migrate` do clone | — | — | **200 · 200**: a senha do dono continua valendo |
| 19:01:33 | 31, 68 | `make seed` (senha do clone ≠ do dono) | **2** | 1 s | lista os 5 usuários e `seed aplicado: ../../supabase/seed.sql` **e** `erro: … já tem outra senha` (C-02) |
| 19:01:35 | — | API do dono | — | — | 200 · 200 |
| 19:01:42 | 68, 601 | `API_DATABASE_URL` copiado do `.env` do primeiro checkout (sem imprimir) | 0 | 0 s | igual ao do dono |
| 19:01:42 | 99 | `make migrate` | 0 | 1 s | `senha do papel hellosquad_api já confere com API_DATABASE_URL; nada gravado` |
| 19:01:44 | — | API do dono | — | — | 200 · 200 |
| 19:01:48 | 27 | `make up` | 0 | 9 s | 0 migrations; `já confere…; nada gravado`; "Supabase local no ar. Chaves locais: …" |
| 19:01:57 | 31 | `make seed` | 0 | 0 s | `miolo owner marina@…`, `trilha owner juliana@…`, `vitta editor carla@…`, `vitta owner rafael@…`, `- sem membership pedro@…`; `já confere…; nada gravado` |
| 19:02:39 | 32 | `make test` (1ª) | **2** | 88 s | tudo verde até o pgTAP: **FAIL 14/700** (C-03) |
| 19:07:08 | 549–567, 179–202, 163–169 | dentro da trava: `API_PORT=8199 make dev-api`, pedido S1b (passos 1 a 3) pela API do clone, `make worker`, SIGTERM no grupo | 0 | 5 s | ver "Worker" abaixo |
| 19:07:26 | — | API do dono | — | — | 200 · 200 |
| 19:07:34 | 32 | `make test` (2ª, banco recém-reaplicado por outra sessão) | **2** | 67 s | pytest 220, Vitest 385, pgTAP **FAIL 8/700** (C-03) |
| 19:09:26 | 31–32 | trava exclusiva: `make seed DB_LOCK= && make test DB_LOCK=` | **2** | 66 s | seed ok, pytest `220 passed in 51.10s`, Vitest 385, pgTAP **FAIL 2/700**: só os convites (C-04) |
| 19:11:22 | 113 | trava exclusiva: convites guardados e apagados, seed, `make test-db DB_LOCK=`, convites devolvidos | **0** | 3 s | **`Files=27, Tests=700` · `Result: PASS`**; os 2 convites voltaram idênticos (`cmp` com o backup) |
| 19:11:29 | 101 | `make test-infra` | 0 | 0 s | `guarda do autosave: 8/8` |
| 19:11:30 | — | API do dono | — | — | 200 · 200 |
| 19:11:44 | 41, 98 | `make status` | 0 | — | Supabase com `postgres:***`, `sb_publishable_***`, `sb_secret_***` (0 linhas com chave em claro); `{"status":"ok","version":"0.1.0","environment":"local"}`; "Web no ar em http://127.0.0.1:3100" (lê as portas do `.env`: as do dono) |
| 19:11:52 | 33, 58, 119–127 | `WEB_PORT=3199 make dev-web` | — | 4 s | "Environments: .env" (lê o `.env` da raiz), "Ready in 1154ms"; `GET /` 200, `GET /entrar` 200, `GET /app` sem sessão 307 → `/entrar?next=%2Fapp`; parada às 19:12:11 (3199 livre; web do dono 200) |
| 19:12:29 | 39, 599 | `API_DATABASE_URL` vazio: `make migrate` e `make up` | 2 · 0 | — | migrate: `erro: API_DATABASE_URL vazio no .env (papel hellosquad_api; ver docs/SETUP_LOCAL.md).`; up: uma linha `aviso: .env ausente ou sem API_DATABASE_URL; a senha do hellosquad_api não foi gravada…` e exit 0 (confere com a linha 39). `.env` devolvido em seguida |
| 19:12:55 | 101 | `cd apps/backend && uv run pytest -m "not integration"` | 0 | 2 s | `66 passed, 154 deselected in 1.29s` |

### `make test`: tempos e contagens por alvo (rodada 3, com a trava só do clone)

| Alvo | Tempo | Resultado |
|---|---|---|
| `test-backend` · ruff | 1 s | `All checks passed!` · `118 files already formatted` |
| `test-backend` · pytest | 51 s | `220 passed in 51.10s` (as 3 rodadas: 54.67 s, 50.05 s, 51.10 s; sempre 220) |
| `test-web` · ESLint do web | 2 s | sem erro |
| `test-web` · `tsc` (contracts, ui, web) | 2–6 s | 3 × `Done` |
| `test-web` · Vitest | 7 s | contracts 9 passed (1 arquivo) · ui 49 passed (5) · web 327 passed (28) |
| `test-db` · pgTAP | 1–13 s | 1ª `FAIL` 14/700 · 2ª `FAIL` 8/700 · 3ª `FAIL` 2/700 · com os convites alheios fora: **`PASS` 700/700** |
| `test-infra` | 0 s | `guarda do autosave: 8/8` (rodado à parte: o `make` para no primeiro alvo que falha) |

### Worker (19:07, dentro da trava, modo simulado)

API do clone: `make dev-api` com `API_PORT=8199` → `/health` `{"status":"ok","version":"0.1.0","environment":"local"}` em 1 s; `GET /me` 200. Pedido da S1b: conversa 201, mensagem 201, `POST /messages/{id}/work-items` 201 (trabalho `draft`, run na fila; fila `runs_interactive` = 1). `make worker`:

```
WARNING hellosquad.llm: LLM_PROVIDER=anthropic sem ANTHROPIC_API_KEY: usando o modo simulado (fixtures, sem custo)
INFO hellosquad.worker: worker no ar: fila runs_interactive, concorrência 4, teto por workspace 3, LLM simulated
INFO hellosquad.worker: run 6fd03e74-… (workspace 6bcdc5bd-…, otto): tentativa 1 de 3
INFO hellosquad.worker: run 6fd03e74-… concluído: entrega v1; revisão pedida, trabalho em needs_you; 10.00 créditos cobrados; 3470 tokens de entrada, 880 de saída, 2900 lidos e 2900 gravados no cache, US$ 0.037860
INFO hellosquad.email: e-mail … (approval_pending, pt-BR) enviado: EmailResult(provider='mailpit', …)
INFO hellosquad.worker: sinal de encerramento recebido: parando de ler a fila
INFO hellosquad.worker: worker encerrado
```

Bate com o log das linhas 561–564 do guia. SIGTERM no grupo do processo (o mesmo que o Ctrl+C) → `make worker` exit 0 em menos de 1 s, nenhum worker do clone sobrou. Trabalho depois: `needs_you`, "v1 aguarda sua aprovação"; run `succeeded`. API do clone parada (8199 livre). O trabalho de teste sumiu no `make seed` seguinte.

## Achados

### C-04 🟡 `make seed` não apaga convites, e convite que sobra quebra o pgTAP; o guia manda rodar `make seed`, que não resolve

- **Afirmação do guia.** Linha 146: "`make seed` … É idempotente: rodar de novo devolve o mesmo estado". Linha 597 (Problemas comuns): "Teste pgTAP falha em 'seed presente'… | Seed não aplicado ou alterado por teste manual | `make seed`". Linha 545 (S2f): "O make seed não apaga convites e os testes pgTAP esperam **a Miolo** sem nenhum: remova o do exemplo".
- **O que aconteceu.** Com a trava só do clone, `make seed` seguido de `make test` deu pgTAP `FAIL` em 2 testes: `02_workspace_isolation` #16 "Rafael (owner) vê o convite da Vitta" (`have: (fulano.real@gmail.com)`, `want: (convidada@vitta.example)`) e `04_invitations` #11 "Carla (admin) vê os convites da Vitta" (`have: 4`, `want: 2`). Os dois convites que sobravam na Vitta (`fulano.real@gmail.com`, `quase@contatos.example.com`, 19:08:46) vieram do bloco de e-mail do QA, e o `supabase/seed.sql` não toca em `invitations` (`grep invitations supabase/seed.sql`: nada). Guardados e apagados os dois, o mesmo pgTAP deu 700/700 PASS (e eles voltaram idênticos). Quem convida alguém pelo app ou roda um roteiro que cria convite fica com o `make test` vermelho; a tabela de problemas manda `make seed`, que não limpa convite. A linha 545 cobre só o convite do próprio exemplo e fala só da Miolo; a Vitta também é conferida.
- **Reproduzir.** Criar um convite em qualquer negócio do seed (o `insert` da linha 539, ou na Vitta), rodar `make seed` e depois `make test-db` → `02_workspace_isolation` #16 e `04_invitations` #11 falham. Apagar o convite → passa.
- **Prova.** `/tmp/h2_clone_test3.txt` (rodada 3) e `/tmp/h2_clone_testdb4.txt` (`Result: PASS`).
- **Para o Hulk.** Os dois convites do bloco de e-mail **continuam na Vitta** (o `make seed` final não os apaga). Enquanto estiverem lá, todo `make test-db` desta máquina falha nesses 2 testes.

### C-03 ℹ️ `make test` larga a trava entre o pytest e o pgTAP; outra sessão que entra no meio e deixa o banco fora do seed derruba o pgTAP

- **Afirmação do guia.** Linhas 101 e 602 e o comentário do `Makefile`: os alvos que mexem no banco esperam a trava, para duas sessões não colidirem.
- **O que aconteceu.** Cada alvo pega e solta a trava sozinho (`test-backend`, depois `test-db`). Nas duas primeiras rodadas outra sessão (o QA "H2 QA", que roda os scripts dentro da trava mas só reaplica o seed ao fim de cada bloco) pegou a trava exatamente nesse intervalo e deixou bônus e dados no banco:
  - rodada 1: o pytest soltou a trava às 19:03:34 e o pgTAP a pegou às 19:03:52. No meio, `credit_grants` com `note = 'H2 QA'` deu 300 créditos à Miolo e à Vitta às 19:03:40. Resultado: 14 falhas, por exemplo "Miolo: 100 do ciclo, 64 usados, saldo 36" → `have: 266.00`;
  - rodada 2: a trava ficou livre de 19:08:25 a 19:08:36, e o bônus de 300 da Vitta entrou às 19:08:34. Resultado: 8 falhas, por exemplo "Vitta: Free com 20, nada usado" → `have: 300.00`.
  
  O `make test` não reaplica o seed antes do pgTAP (a linha 113 pede `make seed` antes). Não é defeito do clone nem do guia; é coordenação entre sessões numa máquina compartilhada. Segurando a trava do `make seed` até o fim do `make test` (rodada 3), sobrou só o C-04.
- **Reproduzir.** Rodar `make test` numa sessão e, na outra, um script sob `flock` que conceda bônus logo depois do pytest da primeira terminar.
- **Prova.** `/tmp/h2_clone_test.txt` e `/tmp/h2_clone_test2.txt` (Test Summary Report). Consultas só de leitura: `select … from credit_grants where note = 'H2 QA'` (19:04 e 19:08).

### C-01 ℹ️ "Subir do zero" num segundo checkout: a senha gerada na linha 26 faz o `make up` falhar

- **Afirmação do guia.** Linha 26: `openssl rand -hex 24  # senha local do papel da API: monte API_DATABASE_URL no .env`. Linha 27: `make up … e grava a senha do hellosquad_api`.
- **O que aconteceu.** Nesta máquina já existe o checkout do dono, então o papel `hellosquad_api` já tem senha. Com a senha nova, `make up` sai com 2 (`erro: o papel hellosquad_api já tem outra senha (outro checkout nesta máquina?)…`), e `make migrate` também. Nada é gravado, e a API do dono segue 200 (H1-09 corrigido).
- **Por que é só higiene.** O guia cobre o caso na linha 68 ("um segundo checkout nesta máquina… copie o `API_DATABASE_URL` do `.env` do primeiro") e na linha 601, e a própria mensagem de erro diz o que fazer. Copiado o `API_DATABASE_URL`, `make migrate`, `make up` e `make seed` saem com 0. Melhoria possível: uma nota na própria sequência "Subir do zero" (linhas 25–27).
- **Reproduzir.** Com o stack do dono no ar: `cp .env.example .env`, `API_DATABASE_URL` com `openssl rand -hex 24`, `make up` → exit 2.
- **Prova.** `/tmp/h2_clone_up1.txt` e `/tmp/h2_clone_migrate1.txt`.

### C-02 ℹ️ `make seed` com a senha errada aplica o seed e só depois recusa (exit 2)

- **Afirmação do guia.** Linha 68: "`make up`, `make migrate` e `make seed` gravam essa senha… se o papel já tem **outra** senha, recusam".
- **O que aconteceu.** Com o `API_DATABASE_URL` diferente, o `make seed` imprimiu `seed aplicado: ../../supabase/seed.sql` e a lista dos 5 usuários **e** `erro: o papel hellosquad_api já tem outra senha…`, com exit 2. O seed entra no banco, porque o `hellosquad-local-db seed` aplica o seed antes de conferir a senha; só a gravação da senha é recusada. O `stderr` sai antes do `stdout`, então o `erro:` aparece acima da lista e confunde quem lê. Não quebra nada (o seed é idempotente e a senha do dono fica), mas "recusam" dá a entender que nada aconteceu.
- **Reproduzir.** `.env` com `API_DATABASE_URL` diferente do do dono → `make seed`.
- **Prova.** `/tmp/h2_clone_seed1.txt`; API do dono 200/200 às 19:01:35.

### C-05 ℹ️ Segundo checkout: `make dev` colide com as portas do primeiro, e as URLs do `.env` continuam apontando para 8100/3100

- **Afirmação do guia.** Linha 33: `make dev  # API em http://127.0.0.1:8100 e web em http://127.0.0.1:3100`. Linha 90: "os alvos `make dev-api` e `make dev-web` leem `API_PORT` e `WEB_PORT` do `.env`".
- **O que aconteceu.** Num segundo checkout, as portas 8100 e 3100 já são do primeiro. `API_PORT=8199`/`WEB_PORT=3199` resolvem a subida (a API do clone respondeu na 8199 e a web na 3199), mas o `.env.example` traz `API_URL=http://127.0.0.1:8100`, `NEXT_PUBLIC_SITE_URL`, `EMAIL_APP_URL` e `PAYMENT_BACK_URL` em 3100. Sem trocar essas URLs, a web do clone fala com a API do outro checkout. O guia não diz que esses pares andam juntos. O `make status` do clone também confere a API e a web do dono, porque lê as portas do `.env`.
- **Reproduzir.** No clone, `WEB_PORT=3199 make dev-web` e entrar: as chamadas do servidor do Next vão para `API_URL` (8100).
- **Prova.** `/tmp/h2_clone_web.txt`, `/tmp/h2_clone_status.txt`.

## Estado final (19:15)

- `make seed` final pelo `Makefile` do clone, com a trava: exit 0 às 19:15:32. Levou 23 s porque esperou a trava de outra sessão. Saiu "seed aplicado" e "já confere com API_DATABASE_URL; nada gravado".
- Banco: 3 negócios do seed; nenhum bônus "H2 QA"; filas `runs_interactive`, `runs_scheduled`, `external_actions`, `memory_reflect` e `email_outbox` vazias. **Ficaram 2 convites na Vitta** (`fulano.real@gmail.com`, `quase@contatos.example.com`), do bloco de e-mail do QA. O seed não os apaga (C-04). Não são do clone e não foram removidos, mas enquanto estiverem lá o `make test-db` desta máquina falha em `02_workspace_isolation` #16 e `04_invitations` #11.
- API do dono: `GET :8100/me` 200 e `GET :8100/workspaces` 200 às 19:15:33; web do dono `:3100` 200. Os 11 containers `supabase_*_hellosquad` não foram tocados.
- Processos do clone: nenhum. O worker saiu com 0 no SIGTERM, a API (8199) e a web (3199) foram paradas e as duas portas estão livres. Nenhum processo tem o diretório de trabalho no clone.
- `/tmp/h2_clone/.env` apagado às 19:15:46, depois o diretório `/tmp/h2_clone` inteiro. As saídas em `/tmp/h2_clone_*.txt` não têm chave nem token em claro (conferido com `grep`).
