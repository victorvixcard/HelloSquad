# H2 · Clone limpo seguindo só o `docs/SETUP_LOCAL.md`

Auditor auxiliar do Hulk (QA), 16/10/2026, a partir de 18:58. Em andamento.

**Objetivo.** Provar (ou refutar) que um clone limpo sobe e passa seguindo só o `docs/SETUP_LOCAL.md`.

**Ambiente.** Clone de verdade do remoto (`git clone https://github.com/victorvixcard/HelloSquad /tmp/h2_clone`, 3 s, HEAD `bc58140`, o mesmo da `main` local). Ferramentas: Node v24.21.0, pnpm 12.11.2, uv 0.11.28, Docker 29.7.1, make 4.3, WSL2. O Supabase é o mesmo do projeto `hellosquad` (11 containers `supabase_*_hellosquad`, no ar há 40 min, intocados); a API do dono (:8100) e a web do dono (:3100) ficaram no ar o tempo todo. Chaves, tokens e senhas não aparecem aqui (mascarados).

Resumo dos comandos e exit codes: `passos.txt` (ao lado).

## Passos executados

| Hora | Passo do guia (linha) | Comando | Exit | Tempo | Saída relevante |
|---|---|---|---|---|---|
| 18:58:59 | Subir do zero (21) | `git clone https://github.com/victorvixcard/HelloSquad /tmp/h2_clone` | 0 | 3 s | HEAD `bc58140` |
| 19:00:24 | — (linha de base) | token da Marina + `GET :8100/me` e `GET :8100/workspaces` na API do dono | — | — | 200 (`marina@miolo.example`, 1 membership) · 200 (`miolo`) |
| 19:00:30 | 25 | `cp .env.example .env && chmod 600 .env` | 0 | 0 s | `.env` com modo 600; `DATABASE_URL` já preenchido (confere com a linha 25) |
| 19:00:30 | 26, 62–65 | `openssl rand -hex 24` → `API_DATABASE_URL=postgresql://hellosquad_api:<senha-gerada>@127.0.0.1:56322/postgres` | 0 | 0 s | senha nova, **diferente** da do dono (o guia manda gerar) |
| 19:00:35 | 23 | `corepack enable pnpm` | 0 | 0 s | — |
| 19:00:35 | 27 (pré-requisito do `up`) | `make install` | 0 | 1 s | `pnpm install --frozen-lockfile`: +459 pacotes, `supabase 2.121.0`; `uv sync --locked`: CPython 3.12.3, 46 pacotes. Rápido porque o store do pnpm e o cache do uv já existem nesta máquina |
| 19:00:58 | 27 | `make up` (senha do clone ≠ do dono) | **2** | 3 s | `supabase start` vê o stack no ar e só imprime o status (chaves mascaradas: `sb_publishable_***`, `sb_secret_***`, `JWT_SECRET ***`); `{"applied":[],"message":"Migrations applied"}`; `erro: o papel hellosquad_api já tem outra senha (outro checkout nesta máquina?)…` |
| 19:01:07 | — | API do dono | — | — | 200 · 200 |
| 19:01:16 | 29–30 | `pnpm exec supabase status -o env` → `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 0 | — | `API_URL` = `http://127.0.0.1:56321` (confere com a linha 53) |
| 19:01:20 | 39, 99 | `make migrate` (senha do clone ≠ do dono) | **2** | 2 s | 0 migrations; `erro: o papel hellosquad_api já tem outra senha…` (recusa, nada gravado) |
| 19:01:23 | — (**H1-09**) | API do dono logo depois do `make migrate` do clone | — | — | **200 · 200**: a senha do dono continua valendo. H1-09 não reproduz |
| 19:01:33 | 31, 68 | `make seed` (senha do clone ≠ do dono) | **2** | 1 s | lista os 5 usuários, `seed aplicado: ../../supabase/seed.sql` **e** `erro: … já tem outra senha` (ver C-02) |
| 19:01:35 | — | API do dono | — | — | 200 · 200 |
| 19:01:42 | 68, 601 | `API_DATABASE_URL` copiado do `.env` do primeiro checkout (sem imprimir) | 0 | 0 s | igual ao do dono |
| 19:01:42 | 99 | `make migrate` | 0 | 1 s | `senha do papel hellosquad_api já confere com API_DATABASE_URL; nada gravado` |
| 19:01:44 | — | API do dono | — | — | 200 · 200 |
| 19:01:48 | 27 | `make up` | 0 | 9 s | 0 migrations; `já confere…; nada gravado`; "Supabase local no ar. Chaves locais: …" |
| 19:01:57 | 31 | `make seed` | 0 | 0 s | `miolo owner marina@…`, `trilha owner juliana@…`, `vitta editor carla@…`, `vitta owner rafael@…`, `- sem membership pedro@…`; `já confere…; nada gravado` |
| 19:02:39 | 32 | `make test` | **2** | 88 s | ver abaixo |

### `make test` (19:02:39 → 19:04:07, exit 2)

| Alvo | Início | Resultado |
|---|---|---|
| `test-backend` · ruff | 19:02:39 | `All checks passed!` · `118 files already formatted` |
| `test-backend` · pytest (com a trava) | 19:02:39 | `220 passed in 54.67s` |
| `test-web` · ESLint do web | 19:03:35 | sem erro |
| `test-web` · `tsc` (contracts, ui, web) | 19:03:37 | 3 × `Done` |
| `test-web` · Vitest | 19:03:43 | contracts 9 passed (1 arquivo) · ui 49 passed (5) · web 327 passed (28) |
| `test-db` · pgTAP (com a trava) | 19:03:52 | **`Files=27, Tests=700` · `Result: FAIL`**: 14 falhas em 4 arquivos (`16_brand_memory` #11, `17_credits` #9–10, 16, 29, 35–36, 38, 47, `20_rich_work` #42, `23_agent_learnings` #16–18, 25) |
| `test-infra` | — | não rodou (o `make` para no primeiro alvo que falha) |

Causa das falhas do pgTAP: outra sessão (o roteiro "H2 QA") mexia no banco fora da trava enquanto o pgTAP rodava (C-03). Prova no banco (consulta só de leitura às 19:04): `credit_grants` com `note = 'H2 QA'`, `origin = bonus`, 300 créditos na Miolo e 300 na Vitta às 19:03:40; 12 trabalhos, 17 runs e 29 mensagens novos até 19:04:03. As falhas batem com isso: `17_credits` "Miolo: 100 do ciclo, 64 usados, saldo 36" → `have: 266.00`; "Vitta: Free com 20" → `have: 260.00`; as de isolamento ("Rafael não vê…", "Carla não vê…") contam linhas a mais criadas no meio do teste. Nenhum processo segurava a trava nesse intervalo (`lsof /tmp/hellosquad-db.lock` vazio às 19:04:21), então o `test-db` do clone pegou a trava sem esperar, e o roteiro não a usa. Repetição do `make test-db` com o banco quieto: abaixo.

## Achados

### C-01 ℹ️ "Subir do zero" num segundo checkout: a senha gerada na linha 26 faz o `make up` falhar

- **Afirmação do guia.** Linha 26: `openssl rand -hex 24  # senha local do papel da API: monte API_DATABASE_URL no .env`; linha 27: `make up … e grava a senha do hellosquad_api`.
- **O que aconteceu.** Nesta máquina já existe o checkout do dono, então o papel `hellosquad_api` já tem senha. Com a senha nova, `make up` sai com 2 (`erro: o papel hellosquad_api já tem outra senha (outro checkout nesta máquina?)…`) e `make migrate` também. Nada é gravado e a API do dono segue 200.
- **Por que é só higiene.** O guia cobre o caso na linha 68 ("um segundo checkout nesta máquina, clone ou worktree, usa o mesmo Supabase e o mesmo papel: copie o `API_DATABASE_URL` do `.env` do primeiro") e na linha 601 (Problemas comuns), e a própria mensagem de erro diz o que fazer. Copiado o `API_DATABASE_URL`, `make migrate`, `make up` e `make seed` saem com 0. Melhoria possível: uma nota na própria sequência "Subir do zero" (linhas 25–27) para o segundo checkout.
- **Reproduzir.** Com o stack do dono no ar: `cp .env.example .env`, `API_DATABASE_URL` com `openssl rand -hex 24`, `make up` → exit 2.
- **Prova.** `/tmp/h2_clone_up1.txt` e `/tmp/h2_clone_migrate1.txt` (tail na tabela acima).

### C-02 ℹ️ `make seed` com a senha errada aplica o seed e só depois recusa (exit 2)

- **Afirmação do guia.** Linha 68: "`make up`, `make migrate` e `make seed` gravam essa senha… se o papel já tem **outra** senha, recusam".
- **O que aconteceu.** `make seed` com o `API_DATABASE_URL` diferente imprimiu `seed aplicado: ../../supabase/seed.sql` e a lista dos 5 usuários **e** `erro: o papel hellosquad_api já tem outra senha…`, exit 2. O seed entra no banco (o `seed` roda antes da conferência da senha em `hellosquad-local-db`); só a gravação da senha é recusada. Como o `stderr` sai antes do `stdout`, o `erro:` aparece acima da lista, o que confunde quem lê. Não quebra nada (o seed é idempotente e a senha do dono fica), mas "recusam" sugere que nada aconteceu.
- **Reproduzir.** `.env` com `API_DATABASE_URL` diferente do do dono → `make seed`.
- **Prova.** `/tmp/h2_clone_seed1.txt`; API do dono 200/200 às 19:01:35.

### C-03 ℹ️ `make test` do clone falha no pgTAP quando outra sessão roda um roteiro fora da trava

- **Afirmação do guia.** Linhas 101 e 602: os alvos que mexem no banco esperam a trava (`flock`), para duas sessões não colidirem; linha 597: pgTAP falha em "seed presente" quando o seed foi "alterado por teste manual".
- **O que aconteceu.** O `make test` do clone deu `pgTAP Result: FAIL` (14 de 700) porque um roteiro de QA de outra sessão ("H2 QA": bônus de 300 créditos na Miolo e na Vitta, 12 trabalhos novos) rodou entre 19:03:40 e 19:04:03, fora da trava, exatamente durante o `test-db` (19:03:52–19:04:05). A trava só serializa alvos do `make`; os roteiros `curl` do guia e chamadas à API não a pegam. Não é defeito do clone nem do guia; é coordenação entre sessões nesta máquina.
- **Reproduzir.** Rodar `make test-db` enquanto outra sessão executa um roteiro que concede bônus ou cria trabalhos pela API.
- **Prova.** `/tmp/h2_clone_test.txt` (Test Summary Report) e as consultas de leitura acima.
