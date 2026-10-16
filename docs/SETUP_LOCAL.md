# Setup local — HelloSquad

Como subir o HelloSquad do zero numa máquina limpa. Tudo roda local: Supabase CLI em Docker (Auth, Postgres com RLS, Storage, Realtime), API FastAPI e web Next.js. Nada aqui cria projeto em nuvem, publica ou faz deploy (regra do dono, `docs/DIRETRIZES_DO_DONO.md`).

## Pré-requisitos

| Ferramenta | Versão testada | Observação |
|---|---|---|
| Linux ou WSL2 | WSL2 Ubuntu 24.04 | macOS deve funcionar; não testado. |
| Docker + Compose | Docker 29.7, Compose v5 | O Supabase CLI sobe os serviços em containers. O daemon precisa estar rodando. |
| Node.js | 24 (`.node-version`) | O corepack vem junto com o Node. |
| pnpm | 12.11.2, via corepack | `corepack enable pnpm`. A versão exata vem do campo `packageManager` do `package.json`. |
| uv | 0.11 | Gerencia o Python 3.12 do backend (baixa o interpretador se faltar). |
| git, make, curl | — | `psql` é opcional (útil para inspecionar o banco). |

O Supabase CLI **não** é instalado globalmente: é devDependency da raiz e roda com `pnpm exec supabase`.

## Subir do zero

```bash
git clone https://github.com/victorvixcard/HelloSquad.git
cd HelloSquad
corepack enable pnpm

cp .env.example .env                 # o .env nunca é commitado; o DATABASE_URL já vem preenchido
openssl rand -hex 24                 # senha local do papel da API: monte API_DATABASE_URL no .env (ver "Chaves locais")
make up                              # instala dependências (pnpm + uv), sobe o Supabase local, aplica as migrations
                                     # e grava a senha do hellosquad_api
pnpm exec supabase status -o env     # com o Supabase no ar: copie PUBLISHABLE_KEY e SECRET_KEY para o .env (ver
                                     # "Chaves locais"); a PUBLISHABLE_KEY vai também em NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
make seed                            # tenants e usuários fictícios de docs/DADOS_FICTICIOS.md
make test                            # backend (ruff + pytest), web e pacotes (lint, tipos, Vitest) e banco (pgTAP)
make dev                             # API em http://127.0.0.1:8100 e web em http://127.0.0.1:3100
make e2e                             # opcional: fluxos ponta a ponta no navegador (Playwright); ver "Web"
```

O primeiro `make up` baixa as imagens Docker do Supabase (alguns GB) e leva alguns minutos. Os seguintes sobem em segundos.

O `.env` nasce antes do `make up`, com o `API_DATABASE_URL`; as chaves do Supabase entram logo depois, porque só existem com ele no ar (o CLI vem no `pnpm install` do `make up`). Se o `make up` rodar sem `.env` ou com `DATABASE_URL`/`API_DATABASE_URL` vazios, ele avisa em uma linha e segue sem gravar a senha do papel; preencha o `.env` e rode `make migrate`. Chamados direto, `make migrate` e `make seed` exigem as duas URLs.

Conferir: `make status` mostra o Supabase, a API (`/health`) e a web. `curl http://127.0.0.1:8100/health` responde `{"status":"ok","version":"0.1.0","environment":"local"}`.

## Chaves locais

`pnpm exec supabase status -o env` imprime as chaves do Supabase **local**. Elas só valem nesta máquina.

| No `supabase status -o env` | No `.env` | Quem usa |
|---|---|---|
| `PUBLISHABLE_KEY` (`sb_publishable_…`) | `SUPABASE_PUBLISHABLE_KEY` | Web, app e testes. Pública; tudo passa pela RLS. |
| `SECRET_KEY` (`sb_secret_…`) | `SUPABASE_SECRET_KEY` | Só backend, para administração da Auth. Nunca no browser, nunca em log. |
| `DB_URL` | `DATABASE_URL` | Usuário `postgres` (ignora a RLS): só ferramentas locais (seed, testes). A API não usa. Já vem preenchido. |
| — | `API_DATABASE_URL` | A API. Papel `hellosquad_api`, sem `BYPASSRLS`. A senha você gera (abaixo). |
| `API_URL` | `NEXT_PUBLIC_SUPABASE_URL` | Web (browser e servidor do Next). Local: `http://127.0.0.1:56321`. |
| `PUBLISHABLE_KEY` (de novo) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Web. O mesmo valor de `SUPABASE_PUBLISHABLE_KEY`. O web se recusa a subir se receber a `sb_secret_…`. |
| — | `NEXT_PUBLIC_SITE_URL` | Web: canonical, sitemap, robots e Open Graph. Local: `http://127.0.0.1:3100`. |
| — | `API_URL` | Web: a API vista pelo servidor do Next (`http://127.0.0.1:8100`). O browser não chama a API direto. |

O web lê este mesmo `.env` da raiz (`apps/web/next.config.ts`); não existe `.env` dentro de `apps/web`. Variáveis `NEXT_PUBLIC_*` entram no build: depois de mudar uma delas, rode o build de novo (`make build`) ou reinicie o `make dev-web`. Só valores públicos ganham o prefixo `NEXT_PUBLIC_`; a `SUPABASE_SECRET_KEY` nunca.

As chaves legadas `ANON_KEY` e `SERVICE_ROLE_KEY` (JWT) não são usadas pelo código. A chave da Anthropic (`ANTHROPIC_API_KEY`) fica vazia até o dono fornecer; sem ela o worker roda em modo simulado (seção "Worker do squad").

**Papel da API (`hellosquad_api`).** A migration cria o papel sem senha. Gere uma senha local (`openssl rand -hex 24`) e preencha:

```bash
API_DATABASE_URL=postgresql://hellosquad_api:<senha-gerada>@127.0.0.1:56322/postgres
```

`make up`, `make migrate` e `make seed` gravam essa senha no banco com hash SCRAM calculado no cliente; o log do Postgres nunca vê a senha em claro. Ao subir, a API confere que o papel não é superusuário nem ignora a RLS e se recusa a rodar se for.

**Validação do JWT na API.** Padrão: chave pública do JWKS da Auth (`/auth/v1/.well-known/jwks.json`). A Auth local assina os tokens de usuário em **ES256**, então o padrão `AUTH_JWT_ALGORITHMS=ES256` é o caminho usado hoje. Fallback, só se a Auth assinar com segredo compartilhado: `AUTH_JWT_ALGORITHMS=HS256` e `SUPABASE_JWT_SECRET` com o `JWT_SECRET` do `status -o env`.

## Portas

Esta máquina já roda outros Supabase locais (faixas 5432x, 5442x e 5532x) e outros serviços em 3000 e 8000. O HelloSquad usa faixas próprias para conviver com eles.

| Serviço | Porta | Endereço |
|---|---|---|
| Supabase API (Kong: REST, Auth, Storage, Realtime) | 56321 | http://127.0.0.1:56321 |
| Postgres | 56322 | `postgresql://postgres:postgres@127.0.0.1:56322/postgres` |
| Supabase Studio | 56323 | http://127.0.0.1:56323 |
| Mailpit (e-mails de Auth capturados) | 56324 | http://127.0.0.1:56324 |
| SMTP / POP3 do Mailpit | 56325 / 56326 | Reservadas (não expostas). |
| Analytics (logs do Studio) | 56327 | Uso interno do Studio. |
| Inspector do edge runtime | 56328 | Reservada (edge runtime desligado). |
| Pooler | 56329 | Reservada (pooler desligado). |
| Shadow DB | 56320 | Só existe durante `supabase db diff`. |
| API FastAPI | 8100 | http://127.0.0.1:8100/health |
| Web Next.js | 3100 | http://127.0.0.1:3100 |

As portas do Supabase ficam em `supabase/config.toml`; os alvos `make dev-api` e `make dev-web` leem `API_PORT` e `WEB_PORT` do `.env` (padrão 8100 e 3100). Para mudar uma porta, altere o arquivo, atualize esta tabela e confira com `ss -ltn | grep <porta>` que ela está livre.

## Comandos do dia a dia

| Comando | O que faz |
|---|---|
| `make up` | Instala dependências pelos lockfiles, sobe o Supabase local, aplica migrations pendentes e grava a senha do `hellosquad_api` (sem `.env`, só avisa). |
| `make down` | Para os containers do HelloSquad. Os dados ficam no volume Docker. |
| `make status` | Estado do Supabase, da API e da web. |
| `make migrate` | Aplica migrations pendentes de `supabase/migrations/` e grava a senha do `hellosquad_api` (de `API_DATABASE_URL`). |
| `make seed` | Tenants e usuários fictícios de `docs/DADOS_FICTICIOS.md` (idempotente). |
| `make test` | `test-backend` + `test-web` + `test-db`. O backend inclui testes de integração (marcados `integration`) que exigem Supabase no ar e seed aplicado. Só os unitários: `cd apps/backend && uv run pytest -m "not integration"`. |
| `make test-web` | ESLint do web, `tsc` do web e dos pacotes (`@hellosquad/ui`, `@hellosquad/contracts`) e os testes Vitest dos pacotes. Não precisa de Supabase. |
| `make e2e` | Build do web e Playwright (Chromium) contra o ambiente local: Marina entra e vê a casca da Miolo; Pedro cria um workspace de teste. No fim reaplica o seed. Exige `make up` e `make seed`. |
| `make openapi` | Exporta o contrato da API para `packages/contracts/openapi.json`. |
| `make build` | Build de produção do web (o mesmo do CI). |
| `make dev` | API e web juntas; Ctrl+C encerra as duas. Separadas: `make dev-api`, `make dev-web`. |
| `make worker` | Worker do squad: consome a fila `runs_interactive` e leva o pedido até "Precisa de você" (seção "Worker do squad"). Ctrl+C encerra. |
| `make scheduler` | Processo de rotinas (placeholder até o Modo Autônomo). |

Banco:

- Nova migration: `pnpm exec supabase migration new <nome>`, editar o SQL, `make migrate`. Toda tabela nova em `public` precisa de `ENABLE` e `FORCE ROW LEVEL SECURITY`, políticas e `GRANT` explícito para `authenticated`; nada para `anon`. O teste `01_rls_coverage` falha se alguma escapar.
- Testes do banco: arquivos pgTAP em `supabase/tests/database/*.test.sql`, rodados por `make test-db`. Usam os usuários do seed: rode `make seed` antes.
- Recriar o banco local do zero (apaga os dados locais e reaplica migrations e seed): `pnpm exec supabase db reset`, depois `make seed` (o reset recria o `hellosquad_api` sem senha).
- Contrato da API: `make openapi` regrava `packages/contracts/openapi.json`. O teste `test_openapi.py` falha se o arquivo commitado ficar defasado.

## Web (Next.js)

`make dev-web` sobe o web em http://127.0.0.1:3100 (`make dev` sobe API e web juntas). A área logada chama a API, então a API precisa estar no ar.

| Rota | O que é |
|---|---|
| `/` | Página pública (SEO: Metadata API, JSON-LD, `sitemap.xml`, `robots.txt`, `llms.txt`). |
| `/entrar`, `/criar-conta`, `/sair` | Login, cadastro (grava o nome em `user_metadata.full_name`) e saída (sempre por POST). Confirmação de e-mail desligada no local (`supabase/config.toml`). |
| `/app` | Depois do login: lê `GET /me` e vai para o primeiro workspace ou para `/app/novo-workspace`. |
| `/app/<slug>` | Casca do app: barra lateral da V4.6 (Principal, Seu squad, Gestão), negócio e menu da pessoa no cabeçalho. Todo `/app/*` é `noindex`. |

Use sempre o mesmo host no navegador (`127.0.0.1:3100` ou `localhost:3100`): os cookies da sessão são por host.

Design System e contrato:

- Tokens, agentes e ícones vêm do handoff (`design/handoff-v4.6/`) por script: `pnpm --filter @hellosquad/ui generate`. Detalhes em `packages/ui/README.md`.
- Tipos da API vêm do `packages/contracts/openapi.json`: depois de `make openapi`, rode `pnpm --filter contracts generate` e commite os dois.

Testes ponta a ponta (`make e2e`):

1. Uma vez por máquina, o navegador do Playwright (só Chromium, uns 120 MB em `~/.cache/ms-playwright`): `pnpm --filter web exec playwright install chromium`.
2. `make up && make seed`, depois `make e2e`. O Playwright sobe a API (`make dev-api`) e o `next start` se eles não estiverem no ar, e reaproveita os que estiverem.
3. O fluxo do Pedro cria `pedro-teste-<timestamp>`; o teardown roda `make seed` e o Pedro volta a "sem membership", que o pgTAP e a integração esperam.
4. Capturas de tela para relatório: `E2E_SCREENSHOTS=$PWD/docs/parciais/a0 pnpm --filter web e2e` (depois de um `make build`).

## Seed e usuários de teste

`make seed` aplica `supabase/seed.sql` (o mesmo que o `supabase db reset` aplica). É idempotente: rodar de novo devolve o mesmo estado. Recusa banco que tenha usuário com e-mail fora de `.example`, e a ferramenta recusa `DATABASE_URL` fora desta máquina.

| Usuário | Senha (só local) | Workspace e papel |
|---|---|---|
| `marina@miolo.example` | `Senha!Teste123` | Miolo, owner |
| `rafael@vitta.example` | `Senha!Teste123` | Vitta Estética, owner |
| `carla@vitta.example` | `Senha!Teste123` | Vitta Estética, editor |
| `juliana@trilha.example` | `Senha!Teste123` | Trilha Urbana, owner |
| `pedro@semconta.example` | `Senha!Teste123` | nenhum (testes negativos) |

Fonte: `docs/DADOS_FICTICIOS.md`. Workspace criado por teste manual só com o Pedro como membro é removido pelo próximo `make seed`, para ele voltar a "sem membership".

## JWT de teste e chamadas à API

Login pela Auth local com a chave publicável, depois chamada à API com o `access_token` (vale 1 hora):

```bash
PK=$(sed -n 's/^SUPABASE_PUBLISHABLE_KEY=//p' .env)
JWT=$(curl -s -X POST 'http://127.0.0.1:56321/auth/v1/token?grant_type=password' \
  -H "apikey: $PK" -H 'Content-Type: application/json' \
  -d '{"email":"marina@miolo.example","password":"Senha!Teste123"}' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])')

curl -s http://127.0.0.1:8100/me -H "Authorization: Bearer $JWT"
curl -s http://127.0.0.1:8100/workspaces -H "Authorization: Bearer $JWT"
curl -s -X POST http://127.0.0.1:8100/workspaces -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' -d '{"name":"Teste","slug":"teste-local"}'
```

Rotas da S0: `GET /health`, `GET /me`, `GET /workspaces`, `POST /workspaces`, `GET /workspaces/{id}`. Documentação interativa em http://127.0.0.1:8100/docs com a API no ar. Erros vêm sempre como `{"error": {"code", "message", "details"}}`, com a mensagem em português.

### Pedido → trabalho → aprovação (S1b)

Com o `JWT` da Marina (bloco acima). `field` lê um campo do JSON (`items.0.id` = primeiro item). O run fica em `queued` até um worker consumir a fila (`make worker`, seção seguinte); a aprovação decidida no fim é a do seed (`make seed` a devolve para pendente).

```bash
API=http://127.0.0.1:8100; AUTH="Authorization: Bearer $JWT"; JSON='Content-Type: application/json'
field() { python3 -c 'import json, sys
d = json.load(sys.stdin)
for k in sys.argv[1].split("."): d = d[int(k)] if k.isdigit() else d[k]
print(d if isinstance(d, str) else json.dumps(d, ensure_ascii=False))' "$1"; }
WS=$(curl -s $API/workspaces -H "$AUTH" | field items.0.id)                             # Miolo

# 1. Conversa direta com o Otto (201; Sala do Squad e conversa de objeto são reutilizadas: 200)
CONV=$(curl -s -X POST $API/workspaces/$WS/conversations -H "$AUTH" -H "$JSON" \
  -d '{"kind":"agent_direct","primary_agent_id":"otto"}' | field id)

# 2. Pedido na conversa (201)
MSG=$(curl -s -X POST $API/conversations/$CONV/messages -H "$AUTH" -H "$JSON" \
  -d '{"body":"Otto, uma legenda para o post de sábado sobre o pão de fermentação longa."}' | field id)

# 3. Mensagem → trabalho 04.01 com run na fila runs_interactive (201; repetir a chave: 200, o mesmo)
for i in 1 2; do
  curl -s -o /tmp/wi.json -w '%{http_code} ' -X POST $API/messages/$MSG/work-items -H "$AUTH" -H "$JSON" \
    -d '{"delivery_type":"04.01","title":"Legenda do pão de sábado","briefing":{"canal":"instagram"},"idempotency_key":"curl-1"}'
  echo "trabalho $(field id < /tmp/wi.json) $(field status < /tmp/wi.json), run $(field run_id < /tmp/wi.json)"
done

# 4. Quadro/lista, mensagens (cursor) e "Precisa de você"
curl -s "$API/workspaces/$WS/work-items?status=draft&status=needs_you" -H "$AUTH" | field items
curl -s "$API/conversations/$CONV/messages?limit=50" -H "$AUTH" | field items.0.body
APPROVAL=$(curl -s "$API/workspaces/$WS/approvals?status=pending" -H "$AUTH" | field items.0.id)

# 5. Decisão (200; repetir devolve o mesmo estado) e o trabalho com as versões
for i in 1 2; do
  curl -s -o /tmp/ap.json -w '%{http_code} ' -X POST $API/approvals/$APPROVAL/decision -H "$AUTH" -H "$JSON" \
    -d '{"decision":"approved"}'
  echo "aprovação $(field status < /tmp/ap.json) $(field decision < /tmp/ap.json) em $(field decided_at < /tmp/ap.json), trabalho $(field work_item.status < /tmp/ap.json)"
done
curl -s $API/work-items/$(field work_item.id < /tmp/ap.json) -H "$AUTH" | field deliveries.0.versions.0.status
```

Rotas da S1b: `GET|POST /workspaces/{id}/conversations`, `GET /conversations/{id}`, `GET|POST /conversations/{id}/messages`, `POST /messages/{id}/work-items`, `GET /workspaces/{id}/work-items`, `GET /work-items/{id}`, `GET /workspaces/{id}/approvals`, `POST /approvals/{id}/decision`, `GET /workspaces/{id}/projects`, `GET /projects/{id}`, `GET /runs/{id}`, `GET /runs/{id}/events?after=`. Erros das funções do banco: `not_found` 404, `forbidden` 403, `invalid_parameter`/`invalid_value` 422, `invalid_state` 409, `transition_not_allowed`/`status_changed` 409.

## Worker do squad (S1c)

`make worker` sobe o `hellosquad-worker`: lê a fila `runs_interactive` (pgmq), reivindica cada run e executa o fluxo v0. O Nexo qualifica o pedido (triagem, `claude-haiku-4-5`). Se faltar o essencial da delivery, ele pergunta na conversa e o trabalho vai para "Precisa de você" com uma pendência `respond`. Se o briefing basta, o Nexo delega ao Otto (`squad.delegar`), que escreve a 04.01 (`claude-opus-5-5`), se autoverifica (uma revisão no máximo) e entrega: versão da entrega, mensagem do Otto na conversa, pendência `review` e trabalho em `needs_you`. Cada chamada vira uma linha de `run_steps` (tokens, custo, latência) e o progresso vai para `run_events` (Realtime no canal `workspace:<id>`).

```bash
make worker                                   # fica no ar; Ctrl+C (ou SIGTERM) encerra limpo
cd apps/backend && uv run hellosquad-worker --drain   # processa o que estiver na fila e sai
```

Com o `make dev-api` no ar, o pedido do bloco anterior (passos 1 a 3) entra na fila e o worker o leva até a revisão. O log mostra cada run:

```
LLM_PROVIDER=anthropic sem ANTHROPIC_API_KEY: usando o modo simulado (fixtures, sem custo)
worker no ar: fila runs_interactive, concorrência 4, teto por workspace 3, LLM simulated
run <id> (workspace <id>, otto): tentativa 1 de 3
run <id> concluído: entrega v1; revisão pedida, trabalho em needs_you; … US$ 0.037860
```

Depois, pela API: `GET /work-items/<id>` (entrega e versões), `GET /workspaces/<id>/approvals?status=pending` (a revisão), `GET /conversations/<id>/messages` (a mensagem do Otto) e `GET /runs/<id>/events`.

**Decisões da pessoa** (diretriz do dono, 16/10 08:55): só o **owner** decide (`POST /approvals/{id}/decision`; admin, editor e viewer recebem 403). Rejeitar uma entrega exige `follow_up`: `cancel` cancela o trabalho; `revise` devolve ao agente para nova proposta. Pedir ajuste (`changes_requested`), nova proposta e responder a pergunta (`answered`) põem um run novo na fila: com o worker no ar, chega a próxima versão (ou o trabalho segue) sem outra ação.

**Modo simulado e modo real.** Sem `ANTHROPIC_API_KEY`, o worker responde com as fixtures de `apps/backend/src/hellosquad/llm/fixtures/<delivery>/<etapa>.json` (determinísticas, com `usage` fictício para o custo) e avisa no log. Para o modo real, sem mudar código: preencha `ANTHROPIC_API_KEY` no `.env`, deixe `LLM_PROVIDER=anthropic` e reinicie o worker; o log passa a dizer `LLM em modo real: Anthropic (chave configurada)`. `LLM_PROVIDER=simulated` força o simulado mesmo com chave. A chave nunca aparece em log, em `run_steps` nem em `runs.error`. No modo real cada run custa de verdade (preços em `LLM_PRICES`, padrão em `apps/backend/src/hellosquad/llm/pricing.py`).

**Configuração** (`.env`): `WORKER_CONCURRENCY` (runs simultâneos no processo, padrão 4), `WORKER_WORKSPACE_CAP` (runs simultâneos por workspace, padrão 3; o excedente volta à fila em 5 s, sem erro), `WORKER_MAX_ATTEMPTS` (padrão 3) e `WORKER_RETRY_BASE_SECONDS` (backoff 5 s, 10 s, 20 s) para falhas passageiras do provedor; `WORKER_VISIBILITY_TIMEOUT_SECONDS` (padrão 120; o batimento estende enquanto o run roda; run sem batimento além disso é retomado por outro worker). Falha definitiva (ou tentativas esgotadas): run `failed` com `error` legível, trabalho em `failed`, mensagem arquivada (`pgmq.a_runs_interactive`). Encerramento por sinal: para de ler, espera até `WORKER_SHUTDOWN_GRACE_SECONDS` (30) e devolve à fila o run que não terminou, sem gastar tentativa.

## Como parar

- Servidores de desenvolvimento: Ctrl+C no terminal do `make dev`.
- Supabase: `make down`. Para apagar também os dados locais: `pnpm exec supabase stop --no-backup`.
- **Nunca use `supabase stop --all`**: ele derruba os Supabase de todos os projetos da máquina, não só o do HelloSquad.

## CI

O workflow está pronto em `infra/github/workflows/ci.yml`: em push na `main` e em PR, roda `ruff` + `pytest -m "not integration"` no backend (o runner não tem Supabase; integração e pgTAP rodam no `make test`) e, no web, `lint`, `tsc` do web e dos pacotes, os testes Vitest dos pacotes e o `build`. O Playwright (`make e2e`) fica fora do CI porque precisa do Supabase local. Sem deploy, sem segredo, sem passo de nuvem.

Ele ainda não está em `.github/workflows/` porque o token de push desta máquina não tem o escopo `workflow` (o GitHub recusa o arquivo sem ele). Para ativar, alguém com esse escopo roda `git mv infra/github/workflows/ci.yml .github/workflows/ci.yml`, commita e faz push, ou cria o arquivo pela interface do GitHub.

O mesmo conjunto de verificações roda local com `make test` e `make build`.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `make up` falha com porta em uso | Outro serviço pegou uma porta da tabela | `ss -ltnp \| grep <porta>`; troque a porta em `supabase/config.toml` e nesta página. |
| `ERR_PNPM_IGNORED_BUILDS` no `pnpm install` | Dependência nova com script de instalação | Decida pacote a pacote em `allowBuilds` no `pnpm-workspace.yaml` (`true` roda, `false` nega). Não libere tudo. |
| `make up` para em "Applying migration" | Erro no SQL de uma migration | Leia o erro, corrija a migration e rode `pnpm exec supabase db reset`. |
| `make test-db` falha com conexão recusada | Supabase local parado | `make up`. |
| Teste pgTAP falha em "seed presente" ou "Pedro sem membership" | Seed não aplicado ou alterado por teste manual | `make seed`. |
| API não sobe: `API_DATABASE_URL vazio` | Falta a URL do papel da API no `.env` | Gere a senha e preencha (seção "Chaves locais"), depois `make migrate`. |
| `make up` termina com `aviso: .env ausente ou sem …` | `.env` criado depois do `make up` ou com as URLs vazias | Crie e preencha o `.env` ("Subir do zero"), depois `make migrate`. |
| `password authentication failed for user "hellosquad_api"` | Senha do `.env` ainda não gravada no banco (ou `db reset` recente) | `make migrate`. |
| Login de teste responde 429 | Limite de login da Auth local (300 a cada 5 min por IP) | Esperar alguns minutos. |
| `Seed fictício recusado` | Há usuário com e-mail fora de `.example` no banco local | Remover esse usuário (dados de teste são só fictícios) ou `pnpm exec supabase db reset`. |
| Página em branco ou erro estranho no `make dev` depois de `make build` | `next build` e `next dev` dividem a pasta `.next` | Pare o `make dev`, rode o build, suba de novo. |
| next build ou next start abortam com "Configuração do web inválida…" | Variável do web ausente ou errada no .env da raiz | Corrija o item que a mensagem lista (ver "Chaves locais") e rode de novo. |
| Login volta sempre para `/entrar` | Navegador alternando entre `127.0.0.1` e `localhost` (cookies por host) | Use um host só. |
| Área logada mostra "Não deu para carregar o seu squad agora." | API fora do ar | `make dev-api` e "Tentar de novo". |
| `make e2e` falha com "Executable doesn't exist" | Chromium do Playwright não instalado | `pnpm --filter web exec playwright install chromium`. |
| `make test-db` falha em "Pedro sem membership" depois de testar o cadastro de workspace à mão | Workspace de teste do Pedro | `make seed`. |
| Quer ver o que está nas filas de execução (pgmq: `runs_interactive`, `runs_scheduled`, `external_actions`, `memory_reflect`) | Só o papel privilegiado lê as filas; a Data API e o usuário logado não enxergam o schema `pgmq` | `docker exec -it supabase_db_hellosquad psql -U postgres -c "select * from pgmq.metrics_all()"` (tamanho de cada fila) e `... -c "select msg_id, read_ct, message from pgmq.q_runs_interactive"` (mensagens). `make seed` esvazia as quatro e os arquivos (`pgmq.a_*`). |
| Run parado em `queued` | Nenhum worker no ar | `make worker` (ou `uv run hellosquad-worker --drain` em `apps/backend`). |
| Worker avisa `sem ANTHROPIC_API_KEY: usando o modo simulado` | Chave vazia no `.env` | Esperado até o dono fornecer a chave; ver "Worker do squad". |
