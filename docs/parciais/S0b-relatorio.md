# S0b — Relatório (Stark)

**Fatia:** S0b, correções de backend da QA H0 (H0-04, H0-06, H0-01). **Data:** 16/10/2026, 02:55 → 03:40.
Commits em `main`, todos com push: `b53ef6c`, `4b40438`, `f0be2d4`, `72a167e` e o deste relatório.

## 1. O que mudou

1. **H0-04, slugs reservados.** Migration `20261016060245_reserved_workspace_slugs.sql`: a lista única
   fica em `app.reserved_workspace_slugs()` (EXECUTE revogado de todos) e a CHECK
   `workspaces_slug_not_reserved` na tabela `workspaces` a aplica. Vale para `app.create_workspace` e
   para qualquer outra escrita, inclusive a do dono das tabelas: a regra vale fora da API. A API
   (`POST /workspaces`) traduz a constraint para **422 `slug_reserved`**, "Esse endereço é reservado.
   Escolha outro." (a mesma frase do web). A API não guarda cópia da lista. Testes: pgTAP
   `07_reserved_slugs` (21 asserções: a lista combinada, cada slug recusado, maiúscula/espaço,
   `equipe-azul` passa, INSERT e UPDATE diretos recusados) e pytest
   `test_reserved_slugs_are_refused` (cada slug da lista do banco → 422 pela API). Contrato:
   `make openapi` e `pnpm --filter contracts generate` mudaram só a descrição do campo `slug`.
2. **H0-06, `make up` antes do `.env`.** O `make up` agora roda `hellosquad-local-db roles --optional`:
   sem `.env`, ou com `DATABASE_URL`/`API_DATABASE_URL` vazios, avisa em uma linha e sai 0.
   `make migrate` e `make seed` chamados direto exigem as duas URLs e validam antes de conectar.
   **Mudança de comportamento:** antes, `API_DATABASE_URL` vazio só gerava aviso no migrate e no seed.
   Agora é erro (exit 1), como pediu o briefing. URL vazia (`API_DATABASE_URL=`, como vem do
   `.env.example`) passa a contar como ausente. `SETUP_LOCAL.md`: o `.env` é criado com o
   `API_DATABASE_URL` antes do `make up`, e as chaves entram logo depois. Também entraram uma linha
   em "Problemas comuns" e a tabela de comandos atualizada. Testes unitários novos em
   `tests/test_local_db.py` (5; rodam no CI, sem banco).
3. **H0-01, defesa em profundidade.** `01_rls_coverage` agora reprova **qualquer** privilégio de `anon`
   ou `service_role` em tabela/view (incluindo `MAINTAIN`), sequência ou função de `public` e `app`.
   São 8 asserções; antes eram 7 e só cobriam `anon` em `public`. A configuração da Auth e do
   PostgREST ficou como estava.

## 2. Como foi verificado

`make test` no repositório (16/10, ~03:35), exit 0. Trechos do log (`/tmp/s0b_make_test.log`, 65 linhas):

```
All checks passed!                                                     (ruff)
============================== 51 passed in 1.01s ==============================   (pytest; era 45)
packages/contracts test:       Tests  9 passed (9)
packages/ui test:       Tests  44 passed (44)
Files=8, Tests=120 ...                                                 (pgTAP; era 98)
Result: PASS
```

Clone limpo do GitHub em `/tmp`, seguindo a doc nova (`docs/parciais/s0b/clone_limpo.sh`, saída resumida):

```
clone: f0be2d4 S0b: make up tolera .env ausente; SETUP_LOCAL cria o .env antes do make up
== ordem antiga (H0-06): sem .env
up_sem_env exit=0
aviso: .env ausente ou sem DATABASE_URL e API_DATABASE_URL; a senha do hellosquad_api não foi gravada. Preencha o .env (docs/SETUP_LOCAL.md) e rode make migrate.
migrate_sem_env exit=2
erro: DATABASE_URL vazio no .env (usuário postgres do Supabase local).
== ordem nova do SETUP_LOCAL
up exit=0
senha do papel hellosquad_api definida a partir de API_DATABASE_URL
seed exit=0
test exit=0      (ruff ok, pytest 51, Vitest 9 + 44, pgTAP 120 PASS)
== API do clone (porta 8100) com o .env novo
{"status":"ok","version":"0.1.0","environment":"local"}
/me: marina@miolo.example ['miolo']
{"error":{"code":"slug_reserved","message":"Esse endereço é reservado. Escolha outro.","details":[]}} HTTP 422
clone apagado: sim
```

Mutação do H0-01 (GRANTs indevidos numa transação desfeita e o `01_rls_coverage` rodado dentro dela):

```
not ok 5 - anon e service_role não têm privilégio em nenhuma tabela ou view de public nem de app
 #         (service_role,workspaces,SELECT)
not ok 6 - anon e service_role não têm privilégio em nenhuma sequência de public nem de app
 #         (anon,s0b_mutacao_seq,USAGE)
not ok 7 - anon e service_role não executam nenhuma função de public nem de app
 #         (service_role,"app.role_rank(workspace_role)")
# Looks like you failed 3 tests of 8
```

Depois do rollback não sobrou nada (sequência inexistente, privilégios `f|f`).

## 3. Lista final de slugs reservados (para o Aranha)

`novo-workspace`, `sala-do-squad`, `squad`, `modo-autonomo`, `memoria-da-marca`, `equipe`, `entrar`,
`criar-conta`, `sair`, `api`, `app`, `admin`, `www`, `hellosquad` (14, só a forma exata: `equipe-azul` passa).

O web tem a própria lista em `apps/web/app/app/novo-workspace/validation.ts` (hoje só
`["novo-workspace"]`) e precisa espelhar estas 14. Não editei o web. A API responde 422 `slug_reserved`
de qualquer forma, então o web pode tratar esse código com a mesma mensagem.

## 4. Onde discordei do briefing

- **"Criar e preencher o `.env` antes do `make up`"** só funciona em parte. `PUBLISHABLE_KEY` e
  `SECRET_KEY` saem do `supabase status -o env`, que precisa do Supabase no ar, e o próprio CLI só
  existe depois do `pnpm install` do `make up`. A doc manda criar o `.env` e montar o `API_DATABASE_URL`
  antes do `make up`, e copiar as chaves logo depois. O `make migrate` que vinha depois saiu do bloco:
  o `make up` já grava a senha. A H0 sugeria o contrário (chaves antes), mas isso não roda.
- **Regra na tabela, além da função.** Pus a recusa numa CHECK da tabela, que cobre
  `app.create_workspace` sem reescrevê-la, e não um `raise` dentro da função. É o mesmo lugar da
  regra de formato e vale também para INSERT/UPDATE do dono. Um custo conhecido: a CHECK executa a
  função com o papel de quem escreve. Se algum papel ganhar INSERT/UPDATE em `workspaces`, vai
  precisar de EXECUTE nela (está anotado na migration; testei com `permission denied` provocado de
  propósito).

## 5. Pendências

1. **Dono, H0-01:** a exposição da Data API (`/rest/v1`) em produção (manter só com RLS ou
   restringir/desligar) continua sem decisão. Nada foi mudado na Auth nem no PostgREST.
2. **Aranha:** espelhar as 14 em `validation.ts` (§3).
3. **Observação:** às ~03:10, um `make migrate` leu o `.env` sem `DATABASE_URL`. Não se repetiu e o
   mtime do `.env` não mudou. Se a A0b mexe no `.env` da raiz durante testes, vale combinar.
4. Não rodei `make dev` nem `make e2e` no clone, porque o web é do Aranha e está em uso na A0b. A API
   do clone subiu sozinha e respondeu `/health`, `/me` e o 422 acima.

## 6. Estado em que deixei a máquina

- Banco no estado do seed (`make seed`): 3 workspaces, 4 memberships, 0 convites, 0 eventos, Pedro
  sem membership; última migration `20261016060245`; `hellosquad_api` com a senha do `.env` do repo
  (o clone trocou a senha e o `make seed` a devolveu).
- Porta 8100 livre. `docker ps`: 11 `*_hellosquad` + 35 de terceiros, a mesma contagem do início.
- Clone em `/tmp/s0b_clone` apagado. Os logs do clone, que tinham as chaves locais impressas pelo
  `supabase start`, também foram apagados. Não toquei em `apps/web/`. O arquivo
  `docs/parciais/a0b/curl-cabecalhos.txt` modificado no disco é do Aranha e ficou fora dos meus commits.
