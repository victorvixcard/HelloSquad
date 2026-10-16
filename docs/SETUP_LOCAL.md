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

cp .env.example .env && chmod 600 .env  # só você lê o .env; ele nunca é commitado; o DATABASE_URL já vem preenchido
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

Conferir: `make status` mostra o Supabase (chaves e senhas mascaradas), a API (`/health`) e a web. `curl http://127.0.0.1:8100/health` responde `{"status":"ok","version":"0.1.0","environment":"local"}`.

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

`make up`, `make migrate` e `make seed` gravam essa senha no banco com hash SCRAM calculado no cliente; o log do Postgres nunca vê a senha em claro. Só gravam quando falta: se a senha do `.env` já vale, nada muda; se o papel já tem **outra** senha, recusam (um segundo checkout nesta máquina, clone ou worktree, usa o mesmo Supabase e o mesmo papel: copie o `API_DATABASE_URL` do `.env` do primeiro). Trocar de propósito, sabendo que derruba a API que usa a senha antiga: `cd apps/backend && uv run hellosquad-local-db roles --rotate`. Ao subir, a API confere que o papel não é superusuário nem ignora a RLS e se recusa a rodar se for.

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
| `make up` | Instala dependências pelos lockfiles, sobe o Supabase local, aplica migrations pendentes e grava a senha do `hellosquad_api` (sem `.env`, só avisa). Com a trava do banco; a saída esconde as chaves. |
| `make down` | Para os containers do HelloSquad. Os dados ficam no volume Docker. |
| `make status` | Estado do Supabase (chaves, segredo do S3 e senha da URL do banco mascarados; os valores, para o `.env`: `pnpm exec supabase status -o env`), da API e da web. |
| `make migrate` | Aplica migrations pendentes de `supabase/migrations/` e grava a senha do `hellosquad_api` (de `API_DATABASE_URL`). Com a trava do banco. |
| `make seed` | Tenants e usuários fictícios de `docs/DADOS_FICTICIOS.md` (idempotente). |
| `make test` | `test-backend` + `test-web` + `test-db` + `test-infra` (guarda de segredo do autosave, num repositório temporário em `/tmp`). O backend inclui testes de integração (marcados `integration`) que exigem Supabase no ar e seed aplicado. Só os unitários: `cd apps/backend && uv run pytest -m "not integration"`. |
| `make test-web` | ESLint do web, `tsc` do web e dos pacotes (`@hellosquad/ui`, `@hellosquad/contracts`) e os testes Vitest do web (componentes, `apps/web/test`) e dos pacotes. Não precisa de Supabase. |
| `make e2e` | Build do web e Playwright (Chromium) contra o ambiente local: Marina entra e vê a casca da Miolo; Pedro cria um workspace de teste; ao vivo (A1a), com o worker do squad em modo simulado: Marina pede uma legenda, vê o Otto escrevendo, recebe a v1 sem recarregar, revisa e aprova, e pede ajuste até a v2. No fim para o worker e reaplica o seed (com a trava do banco). Exige `make up` e `make seed`. |
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

Use sempre o mesmo host no navegador (`127.0.0.1:3100` ou `localhost:3100`): os cookies da sessão são por host. Os cookies da sessão são `httpOnly` (H0-03, A1a): login, cadastro, saída e renovação acontecem no servidor; o Realtime do browser (canal privado `workspace:<id>`) recebe só o token de acesso, pedido ao servidor.

Design System e contrato:

- Tokens, agentes e ícones vêm do handoff (`design/handoff-v4.6/`) por script: `pnpm --filter @hellosquad/ui generate`. Detalhes em `packages/ui/README.md`.
- Tipos da API vêm do `packages/contracts/openapi.json`: depois de `make openapi`, rode `pnpm --filter contracts generate` e commite os dois.

Testes ponta a ponta (`make e2e`):

1. Uma vez por máquina, o navegador do Playwright (só Chromium, uns 120 MB em `~/.cache/ms-playwright`): `pnpm --filter web exec playwright install chromium`.
2. `make up && make seed`, depois `make e2e`. O Playwright sobe a API (`make dev-api`) e o `next start` se eles não estiverem no ar, e reaproveita os que estiverem. **Com `make dev-web` no ar na 3100, pare-o antes**: o Playwright reaproveitaria o `next dev`, e o `next build` do `make e2e` quebra o `next dev` (suba de novo depois).
3. **Worker do squad (fluxos ao vivo, A1a):** o setup do Playwright (`apps/web/e2e/global-setup.ts`) sobe `uv run hellosquad-worker` com `LLM_PROVIDER=simulated` (fixtures, sem custo e sem chave), espera "worker no ar" e grava o log em `/tmp/hellosquad-e2e-worker.log`. Para usar um worker que já está rodando (`make worker`), `E2E_WORKER=off`. O worker simulado termina um run em menos de um segundo: o teste segura os eventos do Realtime depois de "Otto começou a escrever" para conferir "escrevendo…" e depois solta na mesma ordem (só o tempo de entrega muda; os eventos são os do worker).
4. O fluxo do Pedro cria `pedro-teste-<timestamp>` e o ao vivo cria trabalhos, entregas e decisões; o teardown para o worker e reaplica o seed, e o Pedro volta a "sem membership", que o pgTAP e a integração esperam. Dentro do `make e2e` a trava do banco já está com o próprio `make e2e` (`HELLOSQUAD_DB_LOCK_HELD=1`): o teardown roda o seed direto, sem `make seed` (que esperaria pela própria trava até o limite de 10 min e falharia). Rodando o Playwright fora do make, o teardown usa `make seed`, que pega a trava.
5. Só os fluxos ao vivo, contra o que já está no ar (API e web): `flock -o -w 600 /tmp/hellosquad-db.lock env HELLOSQUAD_DB_LOCK_HELD=1 pnpm --filter web exec playwright test e2e/live.spec.ts`.
6. Capturas de tela para relatório: `E2E_SCREENSHOTS=$PWD/docs/parciais/a0 pnpm --filter web e2e` (depois de um `make build`).

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

### Memória da Marca (S1d)

Com as variáveis do bloco acima (`API`, `AUTH`, `JSON`, `field`, `WS` da Miolo). O seed traz 5 conhecimentos "Confirmado", a "Decisão sua" de não usar a palavra 'artesanal', uma sugestão aberta do Otto e duas fontes; `make seed` devolve esse estado. Só o owner decide (Carla, editor da Vitta, recebe 403).

```bash
# 1. Dossiê: por área e assunto, com estado, fonte, quem usa e "O squad percebeu"
curl -s $API/workspaces/$WS/memory -H "$AUTH" | field areas
curl -s $API/workspaces/$WS/memory -H "$AUTH" | field pending          # {"suggestions": 1, ...}

# 2. Busca textual (português, com radical): acha a palavra proibida por "palavra proibida" ou "tom"
curl -s -G $API/workspaces/$WS/memory/search --data-urlencode 'q=palavra proibida' -H "$AUTH" | field items.0.content

# 3. Decidir a sugestão do Otto (200; repetir devolve o mesmo estado, sem criar outro conhecimento)
SUG=$(curl -s "$API/workspaces/$WS/memory/suggestions?state=open" -H "$AUTH" | field items.0.id)
for i in 1 2; do
  curl -s -o /tmp/sug.json -w '%{http_code} ' -X POST $API/memory/suggestions/$SUG/decision -H "$AUTH" -H "$JSON" \
    -d '{"decision":"confirm"}'
  echo "sugestão $(field decision < /tmp/sug.json), conhecimento $(field resulting_fact.id < /tmp/sug.json) $(field resulting_fact.state < /tmp/sug.json)"
done
# Corrigir em vez de confirmar: -d '{"decision":"correct","content":"Bastidores do forno uma vez por semana"}'
# Descartar: -d '{"decision":"discard"}' (não vira conhecimento e o Otto não sugere de novo)

# 4. Corrigir um conhecimento: versão nova Confirmado; a anterior fica no histórico
TOM=$(curl -s $API/workspaces/$WS/memory -H "$AUTH" | field areas.1.topics.0.facts.0.id)  # Tom de voz
curl -s -X POST $API/memory/facts/$TOM/correct -H "$AUTH" -H "$JSON" -d '{"content":"Acolhedor, direto e com humor leve"}' | field version
curl -s $API/memory/facts/$TOM/history -H "$AUTH" | field versions

# 5. Fontes ("De onde vem") e conflitos
curl -s $API/workspaces/$WS/memory/sources -H "$AUTH" | field items
curl -s "$API/workspaces/$WS/memory/conflicts?state=open" -H "$AUTH" | field items
```

O próximo run do worker já recebe a versão nova: os essenciais (decisões, Minha marca, Meu público) vão no bloco cacheado do prompt, a busca pelo pedido completa até `MEMORY_CONTEXT_TOKENS` (1.500) e tudo o que entrou fica em `run_context_items`. Rotas: `GET /workspaces/{id}/memory`, `GET /workspaces/{id}/memory/suggestions?state=`, `POST /memory/suggestions/{id}/decision`, `POST /memory/facts/{id}/correct`, `GET /memory/facts/{id}/history`, `GET /workspaces/{id}/memory/search?q=`, `GET /workspaces/{id}/memory/sources`, `GET /workspaces/{id}/memory/conflicts?state=`, `POST /memory/conflicts/{id}/resolve`.

### Créditos (S1e)

Valores **provisórios** (dono, 16/10: "preço e créditos ficam por último"): plano Free com 20 créditos (migration), 46 preços de delivery no seed (01.01 = 0, as demais = 10, profundidade inferida no SA0) e o plano Squad fictício da Miolo (100 por mês). `make seed` devolve: Miolo com 36 de 100 (64% usados, a barra da V4.6), Vitta com 20 e Trilha com 19,2 de 20 (4%, o primeiro acesso). Com as variáveis do bloco da S1b (`API`, `AUTH`, `JSON`, `field`, `WS` da Miolo):

```bash
# 1. Saldo de cada workspace em GET /me (barra "Plano Squad · créditos do mês")
curl -s $API/me -H "$AUTH" | field memberships.0.credits
# {"plan": "Squad", "provisional": true, "balance": 36.0, "reserved": 0.0, "available": 36.0,
#  "cycle_credits": 100.0, "cycle_used": 64.0, "cycle_ends_at": "2026-11-01T03:00:00Z"}

# 2. Estimativa antes de pedir (o mesmo valor que o worker reserva ao começar o run)
curl -s -X POST $API/credits/estimate -H "$AUTH" -H "$JSON" -d "{\"workspace_id\":\"$WS\",\"delivery_type\":\"04.01\"}"
# {"delivery_type":"04.01","depth":"produzir","credits":10.0,"revision":false,"provisional":true,"available":36.0,"sufficient":true}

# 3. Nova versão de um trabalho já entregue (ajuste ou nova proposta): preço de revisão
curl -s -X POST $API/credits/estimate -H "$AUTH" -H "$JSON" \
  -d "{\"workspace_id\":\"$WS\",\"delivery_type\":\"04.01\",\"work_item_id\":\"5eed0000-0000-4000-8000-000000000301\"}"
```

O worker reserva a estimativa ao começar o run (`credit_holds`, chave `run:<id>`; a retentativa usa a mesma reserva), cobra ao entregar (captura, `runs.credits_charged`) e libera se o run falhar ou se o Nexo só perguntar. Sem saldo, o run termina em `failed` com `insufficient_credits` e nada é cobrado. Erros da estimativa: `price_not_found` 404, `not_found` 404 (workspace alheio), `work_item_not_found` 404, `validation_error` 422. Extrato no banco: `select entry_type, amount, reserved_delta, run_id from credit_ledger order by created_at` (somente inserção). Saída dos curls acima em `docs/parciais/s1e/curl_creditos.txt`.

### Conversa completa (S1f)

Conversa em grupo (2 a 6 especialistas; o mesmo conjunto reabre a mesma conversa), resposta de **um especialista por vez**, contexto de objeto para os tipos do protótipo, não lidas por pessoa, cartão na mensagem do agente e ações da Memória que faltavam. Com as variáveis do bloco da S1b (`API`, `AUTH`, `JSON`, `WS` da Miolo):

```bash
# 1. Grupo: à frente o Nexo se participa, senão o primeiro na ordem do squad
G=$(curl -s -X POST $API/workspaces/$WS/conversations -H "$AUTH" -H "$JSON" \
  -d '{"kind":"group","agent_ids":["otto","bia","kaia"]}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')

# 2. Mensagem e pedido de resposta: "@Nome" de quem participa direciona; sem menção, o especialista mais
#    ligado ao pedido (palavras do protótipo); sem nenhuma, o Nexo ou o primeiro. 201; repetir → 200 (mesmo run).
M=$(curl -s -X POST $API/conversations/$G/messages -H "$AUTH" -H "$JSON" \
  -d '{"body":"Quero entender o mercado e a concorrência do bairro."}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
curl -s -X POST $API/messages/$M/reply -H "$AUTH"      # {"agent_id":"bia","status":"queued",…}

# 3. make worker (ou uv run hellosquad-worker --drain): a Bia responde; outra resposta na mesma conversa
#    espera a vez ("outro especialista está respondendo nesta conversa; volta em 5s")

# 4. Não lidas da pessoa logada e marcar como lida (qualquer membro, até viewer)
curl -s $API/workspaces/$WS/conversations/unread -H "$AUTH"
# {"conversations":1,"messages":2,"squad_room":{…},"by_agent":[{"conversations":1,"messages":2,"agent_id":"bia"}]}
curl -s -X POST $API/conversations/$G/read -H "$AUTH"   # {"…","unread_count":0}

# 5. Contexto de objeto que ainda não mora no banco: chave + título; período e origem para o cartão
curl -s -X POST $API/workspaces/$WS/conversations -H "$AUTH" -H "$JSON" -d '{"kind":"object","primary_agent_id":"iris",
  "context":{"type":"metric","key":"alcance:semana","title":"Alcance da semana","period":"Semana 42","origin":"Resultados · semana"}}'

# 6. Memória: "Não usar mais" / "Voltar a usar" / "Confirmar" (Da fonte, Observado) / "Continua valendo"
curl -s -X POST $API/memory/facts/5eed0000-0000-4000-8000-000000000813/state -H "$AUTH" -H "$JSON" -d '{"action":"stop_using"}'
curl -s -X POST $API/workspaces/$WS/memory/facts -H "$AUTH" -H "$JSON" \
  -d '{"area":"business","content":"Aos domingos a loja fecha às 13h"}'   # "Adicionar conhecimento"
curl -s -G $API/workspaces/$WS/memory/search --data-urlencode 'q=nao usar' -H "$AUTH"   # acha "Não usar…"
```

**Tipos de contexto** (`context.type`): pelo `id` (o objeto mora no banco; título e estado vêm de lá) `project`, `work_item`, `delivery`, `memory_fact`, `insight` ("<Agente> percebeu"); pela `key`, com `title` obrigatório e `status`/`summary` opcionais, `calendar_post`, `metric`, `opportunity`, `responsibility`, `segment`, `document` e `capability` (a chave é o código da delivery, ex.: `04.01`; abre uma conversa por pedido). `period` e `origin` valem para todos. O cartão de contexto (`GET /conversations/{id}` → `context`) devolve tipo, id ou chave, título, estado, resumo, período e origem.

**Cartão na mensagem do agente** (`GET /conversations/{id}/messages` → `card`): `material` na entrega (ligado a `delivery_version_id`, `approval_id` e `work_item_id`; ações `approve` e `request_changes`) e `question` na pergunta do Nexo (`approval_id`; ação `answer`). O cartão traz o estado atual do objeto (`approval_status`, `decision`, `answer`, `version_status`, `work_item_status`); a decisão continua em `POST /approvals/{id}/decision`. O banco aceita também `work_created`, `approval`, `options`, `team` e `budget`, sempre ligados ao objeto.

**Status por etapa** (`run_events`): `agent.thinking`, o novo `conversation.typing` (`conversation_id`, `agent_id`) e `approval.requested` levam `status_mode`, `status_short` ("escrevendo", "aguarda você") e `status_label` ("Otto · criando a primeira versão", "Bia · escrevendo", "Otto · aguarda sua aprovação").

Rotas novas: `GET /workspaces/{id}/conversations/unread`, `POST /conversations/{id}/read`, `POST /messages/{id}/reply`, `POST /memory/facts/{id}/state`, `POST /workspaces/{id}/memory/facts`, `POST /memory/suggestions/{id}/seen`, `PUT /workspaces/{id}/memory/profile`. Saída de um roteiro completo contra a API local em `docs/parciais/s1f/curl_conversa.txt`.

### Trabalho rico (S1g)

Frase viva, próximo passo, prazo, origem e histórico do trabalho; "Agora não" na autorização; projeto com datas, equipe e marcos; "Precisa de você" com "Em seguida"; status vivo do squad. Com as variáveis do bloco da S1b (`API`, `AUTH`, `JSON`, `WS` da Miolo):

```bash
# 1. O trabalho do seed: frase e próximo passo do estado, origem resolvida e histórico legível
curl -s $API/work-items/5eed0000-0000-4000-8000-000000000301 -H "$AUTH"
# "status_label": "v1 aguarda sua aprovação", "next_step": "Aprovar a v1", "awaiting_you": true,
# "origin": {"type": "message", "conversation_kind": "agent_direct", "agent_id": "otto", …},
# "history": [{"text": "Você pediu na conversa com o Otto", …}, {"text": "v1 entregue", "mark_label": "automático", …}]

# 2. "Precisa de você": count só do que depende da pessoa agora; adiadas e "Em seguida" à parte
curl -s $API/workspaces/$WS/needs -H "$AUTH"          # {"count": 1, "deferred_count": 0, "items": [{"type": "review", …}]}

# 3. "Agora não" numa autorização (owner; só `authorize`): continua pendente, sem decisão, sai da contagem.
#    "Decidir agora" volta a pedir. Nenhum run nasce e nada é cobrado.
curl -s -X POST $API/approvals/<id da autorização>/defer -H "$AUTH" -H "$JSON" -d '{}'
curl -s -X POST $API/approvals/<id da autorização>/resume -H "$AUTH"
curl -s "$API/workspaces/$WS/approvals?status=pending&include_deferred=true" -H "$AUTH"   # as adiadas também

# 4. Projeto com datas e equipe (editor ou acima); quem conduz entra sozinho na equipe
P=$(curl -s -X POST $API/workspaces/$WS/projects -H "$AUTH" -H "$JSON" -d '{"name":"Campanha de Natal",
  "starts_at":"2026-10-05T09:00:00-03:00","ends_at":"2026-12-20T18:00:00-03:00",
  "participants":[{"agent_id":"bia","responsibility":"estratégia e conceito"}]}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
curl -s -X POST $API/projects/$P/milestones -H "$AUTH" -H "$JSON" \
  -d '{"title":"Revisão das peças","agent_id":"kaia","due_at":"2026-10-22T09:00:00-03:00","needs_you":true}'
curl -s -X PATCH $API/projects/$P -H "$AUTH" -H "$JSON" -d '{"ends_at":null}'      # só o que vem muda
curl -s "$API/workspaces/$WS/milestones?days=10" -H "$AUTH"                        # "Próximos marcos"

# 5. Status vivo dos sete (modos da V4.6, mesma regra do status ao vivo do web)
curl -s $API/workspaces/$WS/squad/status -H "$AUTH"
# nexo live "coordenando" · otto wait "Otto · aguarda sua aprovação" · os outros idle "disponível"
```

**Frase viva e próximo passo**: o worker escreve a do agente em cada etapa ("Nexo organizando seu pedido", "Otto criando a primeira versão" · "Otto entrega a v1"); quando o trabalho muda de estado sem o agente reescrever, as colunas voltam a nulo e a API devolve a do estado, pelo catálogo do backend no idioma do workspace ("v2 aguarda sua aprovação" · "Aprovar a v2 até sex, 16/10"; "Aprovado. Falta decidir a publicação." · "Autorizar ou não a publicação"; "v2 aprovada · publicação não autorizada" · "Publicação quando você quiser").

**Origem** (`origin.type`): `message` (pedido na conversa), `insight` (pedido na conversa de um "<Agente> percebeu"), `project` (pedido na conversa do projeto: o trabalho entra no projeto, o especialista na equipe e o trabalho vira marco) e `routine_run` (código da execução, Fase 3).

**Realtime**: além de `approval.created` e `approval.<status>`, o canal do workspace recebe `approval.deferred` (`status: deferred`; a faixa tira o item) e `approval.resumed` (`status: pending`; volta).

Rotas novas: `GET /workspaces/{id}/needs`, `GET /workspaces/{id}/squad/status`, `POST /approvals/{id}/defer`, `POST /approvals/{id}/resume`, `POST /workspaces/{id}/projects`, `PATCH /projects/{id}`, `PUT /projects/{id}/participants`, `POST /projects/{id}/milestones`, `PATCH /milestones/{id}`, `GET /workspaces/{id}/milestones`. Saída de um roteiro completo contra a API local em `docs/parciais/s1g/curl_trabalho_rico.txt`.

### Bia e Otto (S2a)

Sete deliveries novas, todas pelo mesmo caminho da 04.01: pedido na conversa → `POST /messages/{id}/work-items` com o `delivery_type` → o worker (Nexo faz a triagem e delega) → entrega revisável (versão, cartão `material`, pendência `review`, 10 créditos provisórios capturados) → decisão da dona da conta em `POST /approvals/{id}/decision`. O agente sai do código da delivery (`02.xx` = Bia, `04.xx` = Otto).

| Delivery | Pedido de exemplo (conversa direta) | Entrega (`kind`) e o que ela traz |
|---|---|---|
| 02.01 | "Bia, quero um diagnóstico do marketing da Miolo. O objetivo é vender mais até o Natal." | `diagnosis`: resumo, lacunas, oportunidades com prioridade, premissas, dados que faltam |
| 02.02 | "Bia, documente o posicionamento, o público e os objetivos da Miolo." | `positioning`: posicionamento, diferenciais, públicos, objetivos com indicador e prazo |
| 02.03 | "Bia, preciso de um plano de marketing com prioridades para vender mais até o Natal." | `marketing_plan`: horizonte e ações em ordem, com porquê e responsável no squad |
| 02.04 | "Bia, quero a estratégia da campanha de Natal para vender encomendas antecipadas." | `campaign_strategy`: conceito, público, mensagens-chave, período, frentes por especialista |
| 02.07 | "Bia, pesquise os concorrentes do bairro e as tendências de fim de ano." | `market_research`: achados `pesquisa` (com fonte) ou `sugestao`, fontes com link e datas |
| 04.02 | "Otto, monte o calendário editorial da próxima semana, de 19 a 25/10." | `editorial_calendar`: período e posts; grava `calendar_posts` (rascunho → pauta na aprovação) |
| 04.03 | "Otto, quero um reels para o Instagram e um status de WhatsApp sobre os bastidores da fornada de sábado." | `multichannel_posts`: uma versão por canal (texto, roteiro, hashtags, CTA), pedido para a Kaia |

Com as variáveis do bloco da S1b (`API`, `AUTH`, `JSON`, `field`, `WS` da Miolo):

```bash
pedir() {  # agente, delivery, título, pedido → id do trabalho (run na fila)
  local conv msg
  conv=$(curl -s -X POST $API/workspaces/$WS/conversations -H "$AUTH" -H "$JSON" \
    -d "{\"kind\":\"agent_direct\",\"primary_agent_id\":\"$1\"}" | field id)
  msg=$(curl -s -X POST $API/conversations/$conv/messages -H "$AUTH" -H "$JSON" -d "{\"body\":\"$4\"}" | field id)
  curl -s -X POST $API/messages/$msg/work-items -H "$AUTH" -H "$JSON" \
    -d "{\"delivery_type\":\"$2\",\"title\":\"$3\"}" | field id
}
WI=$(pedir bia 02.04 "Estratégia de Natal" "Bia, quero a estratégia da campanha de Natal para vender encomendas antecipadas.")
(cd apps/backend && LLM_PROVIDER=simulated uv run hellosquad-worker --drain)          # ou make worker no ar
curl -s $API/work-items/$WI -H "$AUTH" | field status_label                            # v1 aguarda sua aprovação
curl -s $API/work-items/$WI -H "$AUTH" | field deliveries.0.versions.0.content.conceito
AP=$(curl -s $API/work-items/$WI -H "$AUTH" | field pending_approval.id)
curl -s -X POST $API/approvals/$AP/decision -H "$AUTH" -H "$JSON" -d '{"decision":"approved"}' | field status

# Calendário editorial (04.02): propostas (draft) e pauta aprovada (planned), sem os cancelados
curl -s "$API/workspaces/$WS/calendar?from=2026-10-19&to=2026-10-25" -H "$AUTH"
# Um post do calendário como objeto da conversa (pelo id; o post fora do banco segue pela chave)
curl -s -X POST $API/workspaces/$WS/conversations -H "$AUTH" -H "$JSON" \
  -d '{"kind":"object","context":{"type":"calendar_post","id":"<id do post>"}}'

# Conversa do ambiente ("Conversar com <Nome>"): uma por ambiente; 201 na primeira vez, 200 depois
curl -s -X POST $API/workspaces/$WS/conversations -H "$AUTH" -H "$JSON" \
  -d '{"kind":"object","context":{"type":"environment","key":"bia","title":"Estratégia"}}' | field opening
# {"agent_id": "bia", "message": "Oi, eu sou a Bia. Disponível. O que você precisa?",
#  "suggestions": ["Onde a Miolo pode crescer até o Natal?", "Crie uma promoção para esta semana", …]}
```

- **Estratégia aprovada alimenta o Otto.** A última 02.04 aprovada do mesmo projeto (sem projeto, do workspace) entra no contexto da 04.02 e da 04.03; a 04.03 registra qual versão seguiu em `content.estrategia`. Do mesmo jeito, a 02.03 lê o diagnóstico e o posicionamento aprovados.
- **Busca web da 02.07** (`WEB_SEARCH_PROVIDER`): `disabled` (padrão) não busca nada e a entrega diz que tudo é sugestão sem validação; `mock` devolve três resultados fictícios fixos (`.example`), bom para ver a entrega com fontes (`env WEB_SEARCH_PROVIDER=mock uv run hellosquad-worker --drain`); `brave` faz a busca real com `WEB_SEARCH_API_KEY`. As fontes da entrega saem da busca, com link, data de publicação e data de coleta; achado marcado como pesquisa sem fonte coletada vira sugestão.
- **Créditos.** Cada pedido reserva 10 créditos provisórios e cobra ao entregar. A Miolo do seed tem 36: o quarto pedido seguido termina em `failed` com `insufficient_credits`, sem cobrar. O roteiro completo `docs/parciais/s2a/curl_bia_otto.sh` (nove pedidos) concede antes um bônus local de 100 pelo papel privilegiado; a saída está em `docs/parciais/s2a/curl_bia_otto.txt`. `make seed` devolve o saldo.

### Kiwi, Max e Íris (S2b)

Oito deliveries novas pelo mesmo caminho da S2a (`05.xx` = Kiwi, `06.xx` = Max, `07.xx` = Íris), com `pedir` do bloco acima. Os números das entregas saem do banco, nunca do modelo: a base de contatos (`contacts` + `consents`) para o Max e a série diária (`metrics_daily`) para a Íris. Nada é investido, criado na conta de anúncios ou enviado.

| Delivery | Pedido de exemplo | Entrega (`kind`) e o que o fluxo acrescenta |
|---|---|---|
| 05.01 | "Kiwi, quanto investir em anúncios no Natal? Quero mais encomendas pelo site e tenho até R$ 1.500 por mês." | `media_plan`: objetivos, canais, teto proposto (≤ o informado; verba é do cliente, não crédito), limites, hipóteses; `execucao` = nada investido, conta não conectada |
| 05.02 | "Kiwi, quero testar dois anúncios das encomendas de Natal no Instagram." | `ad_tests`: públicos, mensagens, variações e testes; `plano_de_midia` = a 05.01 aprovada e o teto dela |
| 06.03 | "Max, organize minha base de clientes em segmentos." | `customer_segments`: `base` (total, consentimento por canal, origens) e, em cada segmento, tamanho e elegíveis por canal |
| 06.01 | "Max, quero reativar os clientes que sumiram, com uma oferta para as encomendas de Natal." | `retention_campaign`: objetivo, segmento com os números, oferta, calendário; `envio` = `nao_autorizado` |
| 06.02 | "Max, escreva a sequência de e-mails e mensagens da reativação." | `message_sequence`: etapas com descadastro; `campanha` = a 06.01 aprovada; `envio` = `nao_autorizado` |
| 07.02 | "Íris, analise meus últimos resultados." | `performance_analysis`: leituras `fato` (com evidência) ou `hipotese`; `dados` (períodos, lacunas, fontes) e `evidencias` (E1…E4 calculadas) |
| 07.03 | "Íris, compare o último mês com o anterior e monte o relatório." | `period_report`: destaques e leitura por canal sobre a tabela de evidências; `relatorio_anterior` aprovado |
| 07.04 | "Íris, o que devemos fazer primeiro a partir dos números?" | `prioritized_recommendations`: ações em ordem, `base` dado/hipótese, com quem discutir; `analises` aprovadas usadas |

```bash
# Importação de contatos (owner ou admin): CSV em texto, nada é guardado além das linhas aceitas
python3 -c 'import json, sys; print(json.dumps({"file_name": "clientes.csv", "source": "Planilha do balcão", "csv": open(sys.argv[1]).read()}))' clientes.csv \
  | curl -s -X POST $API/workspaces/$WS/contacts/imports -H "$AUTH" -H "$JSON" -d @-
# {"total_rows": 4, "accepted_rows": 1, "refused": [{"line": 3, "reason": "no_consent"}, …]}
curl -s $API/workspaces/$WS/contacts/summary -H "$AUTH"      # total, consentimento por canal, origens
curl -s "$API/workspaces/$WS/metrics?from=2026-07-18&to=2026-10-15&channel=site" -H "$AUTH"   # pontos e dias sem dado
# Conversa sobre uma série: a chave <canal>.<métrica> põe a Íris à frente, com período e origem da tabela
curl -s -X POST $API/workspaces/$WS/conversations -H "$AUTH" -H "$JSON" \
  -d '{"kind":"object","context":{"type":"metric","key":"site.sessions","title":"Sessões no site"}}'
# Idioma do negócio (owner ou admin); o da pessoa vem do cadastro e sai no GET /me
curl -s -X PATCH $API/workspaces/$WS -H "$AUTH" -H "$JSON" -d '{"locale":"en"}'
```

- **CSV** (vírgula ou ponto e vírgula): `nome`, `email` e/ou `telefone`, `consentimento_email` e `consentimento_whatsapp` (sim/não), `data_consentimento` (AAAA-MM-DD ou DD/MM/AAAA), opcionais `ultima_compra` e `compras`. Linha recusada (número e motivo, sem o dado): sem consentimento, consentimento sem endereço ou sem data, data no futuro, duplicata no arquivo ou na base e, em `APP_ENV=local`/`test`, e-mail fora de `.example`. O consentimento é somente inserção: revogar é uma linha nova.
- **Estado vazio.** Sem base (06.03, 06.01) ou sem métrica (07.02–07.04), o especialista pergunta na conversa ("Ainda não tenho números da Trilha Urbana para ler…") e nada é cobrado. A Trilha do seed serve para ver isso.
- **Causa.** Leitura `fato` sem evidência citada e `causa` sem teste controlado (que a plataforma ainda não tem) viram `hipotese` no fluxo; o pytest varre as fixtures da Íris atrás de linguagem causal.
- Roteiro completo: `docs/parciais/s2b/curl_kiwi_max_iris.sh` (bônus local de 100, as oito deliveries, importação, métricas, idioma e a Trilha), saída em `curl_kiwi_max_iris.txt`; termina com `make seed`.

### Aprendizados por cliente e boas-vindas do Nexo (S2c)

**Reflexão.** Quando um trabalho fecha (aprovado, aprovado depois de ajuste, recusado com nova proposta ou com cancelamento, cancelado), o banco grava a reflexão em `memory_reflections` e manda a mensagem para a fila `memory_reflect` (o `memory.reflect` da arquitetura; o pgmq não aceita ponto), com o trabalho, o desfecho e as referências (briefing da triagem, versões, correções da pessoa, decisão). Pedir ajuste não fecha o trabalho. O mesmo `make worker` consome a fila quando sobra vaga (e o `--drain` esvazia as duas): o agente que entregou relê o fechamento, com o que mudou entre as versões, e anota aprendizados em `agent_learnings`. A evidência é conferida no backend (rótulo inventado sai; aprendizado sem evidência não é gravado). Promoção: correção explícita da pessoa com confiança ≥ `LEARNING_PROMOTION_CONFIDENCE` → promovido; a mesma lição em `LEARNING_PROMOTION_REPEATS` trabalhos → promovido; o resto fica candidato. Aprendizado nunca vira regra da Memória da Marca. A reflexão não é run do agente: não aparece no status do squad, não conta no teto e não cobra crédito; o custo do modelo fica na própria reflexão.

**Contexto do run** (Arquitetura §5.4): essenciais da Memória da Marca → aprendizados promovidos deste cliente com o agente (os da mesma delivery primeiro, depois os que a busca acha; até `LEARNING_TOP_K`, no mesmo teto `MEMORY_CONTEXT_TOKENS`) → fatos da busca → histórico → pedido. Tudo que entra fica em `run_context_items` (`kind = learning`, motivo `delivery` ou `search`).

```bash
# Ciclo da correção (Marina, Miolo): pedido → v1 → ajuste → v2 aprovada → reflexão → próximo pedido
curl -s -X POST $API/approvals/$APPROVAL/decision -H "$AUTH" -H "$JSON" \
  -d '{"decision":"changes_requested","note":"Nunca use '"'"'promoção imperdível'"'"'; chame o cliente de '"'"'você'"'"'."}'
# … worker entrega a v2; aprovar fecha o trabalho e enfileira a reflexão
curl -s $API/workspaces/$WS/memory/learnings -H "$AUTH"                       # versão em vigor de cada assunto
curl -s "$API/workspaces/$WS/memory/learnings?status=candidate&agent_id=otto&delivery_type=04.01" -H "$AUTH"
curl -s -X POST $API/memory/learnings/$LEARNING/decision -H "$AUTH" -H "$JSON" -d '{"action":"promote"}'  # ou discard, keep
# Negócio novo: conversa "Boas-vindas" com a primeira fala do Nexo, no idioma escolhido (pt-BR se omitido)
curl -s -X POST $API/workspaces -H "$AUTH" -H "$JSON" -d '{"name":"Padaria do Pedro","slug":"padaria-do-pedro","locale":"es"}'
# Objetivo contado ao Nexo: a API nomeia assunto e chave no idioma do negócio e o Nexo responde nas boas-vindas
curl -s -X POST $API/workspaces/$WS/memory/facts -H "$AUTH" -H "$JSON" \
  -d '{"area":"business","content":"Vender mais encomendas","kind":"objective"}'
```

- Só o owner promove, descarta ou diz que continua valendo (403 para os outros papéis); repetir devolve o mesmo estado. `keep` só vale para promovido (senão 409) e renova a revisão: promovido sem isso há `LEARNING_REVIEW_DAYS` entra no contexto marcado para o agente revisar.
- Texto e evidência de um aprendizado nunca mudam; evidência nova sobre o mesmo assunto cria versão nova e a anterior fica no histórico. Descartado não volta com a mesma lição; um palpite do agente não derruba o que a pessoa corrigiu.
- A fala de boas-vindas (pt-BR, en, es) vem do catálogo do backend (`apps/backend/src/hellosquad/i18n/`) e só nasce na mesma transação que cria o negócio: depois disso ninguém escreve como o Nexo.
- Modo simulado: as fixtures da 04.01 com o pão de abóbora (`otto.produce.json`, `otto.reflect.json`) reproduzem o ciclo; o pytest `test_learnings` prova o critério da fase.

### Projeto coordenado e etapas por agente (S2d)

**Coordenação (01.02).** Pedido de campanha vira um trabalho do Nexo com `delivery_type = "01.02"`. O run do Nexo qualifica o pedido (falta tema ou objetivo → pergunta, sem montar nada), monta a equipe e grava, numa transação: o projeto (se o trabalho ainda não tem), os participantes com a responsabilidade de cada um, as etapas em `work_item_steps` (ordem, agente responsável, `delivery_type`, `depends_on`, entrada com a instrução e o recorte do briefing), um marco por etapa em `project_milestones` (`step_id`), o histórico "Nexo montou a equipe: Bia, Kaia e Otto" e a mensagem do Nexo com o cartão `team` (`agent_ids`, `members` com a responsabilidade, `project_id`). O plano é conferido no backend contra o `agent.yaml` e as skills de `squad/` (agente, delivery e dependências só para trás). A coordenação não entrega versão: a reserva dela é liberada.

**Um especialista por vez.** Só a primeira etapa vai para a fila. Cada etapa é um run próprio (`runs.step_id`), sem nova triagem: o Nexo delega (`squad.delegar` com a etapa) e o especialista recebe a instrução da etapa e a saída das etapas de que depende (handoff: a versão que fechou a etapa entra como `<documento_aprovado>`, a frente da estratégia dele como `<sua_frente>`, e o registro fica em `run_context_items` com `kind = step`, motivo `handoff`). A reserva e a captura usam o preço da delivery da etapa. A entrega e a pendência levam `step_id`; "Precisa de você" só aparece quando a etapa espera a decisão do dono. Aprovar fecha a etapa e o marco e põe a próxima na fila; ajuste ou nova proposta roda a mesma etapa de novo com o mesmo agente; cancelar cancela o trabalho (as etapas concluídas ficam; as abertas viram `skipped`). Falha numa etapa marca só ela e o trabalho como `failed`; as anteriores e as versões aprovadas continuam. Quando a última etapa fecha, o trabalho fica `done` e o projeto `done`.

**Kaia sem motor.** O motor de imagem é do dono (`IMAGE_ENGINE_PROVIDER=pending`, o único valor aceito). A etapa 03.01 chama o adaptador `ImageEngine` (`apps/backend/src/hellosquad/creative/image_engine.py`); o stub responde "aguardando o motor": a etapa fica `waiting_engine` (motivo `image_engine_pending`), a Kaia avisa na conversa, nada é cobrado e a próxima etapa que não depende da peça segue. A que depende fica `blocked` com o motivo ("Depende da etapa 2 · Peças, que aguarda o motor de imagem"); sem mais nada para rodar, o trabalho fica `blocked`. O contrato que o motor precisa cumprir está em `squad/kaia/skills/03.01.md`.

```bash
# Campanha na Sala do Squad: o Nexo monta Bia (02.04) → Kaia (03.01) → Otto (04.03)
ROOM=$(curl -s -X POST $API/workspaces/$WS/conversations -H "$AUTH" -H "$JSON" -d '{"kind":"squad_room"}' | jq -r .id)
MSG=$(curl -s -X POST $API/conversations/$ROOM/messages -H "$AUTH" -H "$JSON" \
  -d '{"body":"Quero uma campanha de Natal para vender mais panetones."}' | jq -r .id)
WORK=$(curl -s -X POST $API/messages/$MSG/work-items -H "$AUTH" -H "$JSON" \
  -d '{"delivery_type":"01.02","title":"Campanha de Natal"}' | jq -r .id)
make worker   # ou: cd apps/backend && uv run hellosquad-worker --drain
curl -s $API/work-items/$WORK -H "$AUTH" | jq '{status, step_label, steps: [.steps[] | {seq, agent_id, delivery_type, status, status_reason_label}]}'
curl -s $API/projects/$(curl -s $API/work-items/$WORK -H "$AUTH" | jq -r .project_id) -H "$AUTH" | jq '{status, owner, milestones: [.milestones[] | {title, agent_id, done}]}'
```

- Roteiro completo com a saída: `docs/parciais/s2d/curl_projeto_coordenado.sh` (`.txt` ao lado). pytest `test_coordinated_project` e pgTAP `24_coordinated_work` provam o critério da fase.
- `GET /work-items/{id}` traz `step_label` ("etapa 1 de 3") e, em cada etapa, responsável, delivery, dependências, responsabilidade, instrução, motivo (`status_reason` e o texto no idioma do negócio) e a versão de saída; o histórico tem "Bia começou a etapa 1 · Estratégia", "Etapa 2 · Peças: aguardando o motor de imagem" e "Etapa 3 · Textos concluída". `GET /projects/{id}` traz `owner` (o dono da conta, que decide cada entrega) e os marcos com `step_id`, na ordem das etapas.

### Cobrança (S2e)

Pagamento recorrente atrás de uma interface única (`PaymentProvider`, ADR-0008) com dois adaptadores, **Asaas** e **Mercado Pago**, e um **simulado** para quem não tem conta em provedor. O provedor das cobranças novas vem de `PAYMENT_PROVIDER` (`asaas`, `mercadopago` ou `mock`; o simulado só funciona em `APP_ENV=local`/`test`). Não há tela de preço, paywall nem compra: a compra pela web e pelo app é da Fase 4 (dono, 16/10). Preço em dinheiro só existe no seed, provisório (`plan_prices`: Squad 99,00; `topup_packs`: `recarga-50`, 50 créditos por 49,00); sem preço cadastrado nenhuma cobrança abre no provedor.

O `make seed` dá à Miolo uma assinatura simulada do Squad (Pix), com o ciclo do mês pago (os 100 créditos do bloco da S1e) e uma **recarga Pix pendente** (`mock_pay_miolo_recarga`). Para simular o pagamento:

```bash
# 1. Segredo do webhook simulado no .env (só local) e a API recarregada (make dev-api)
echo "PAYMENT_MOCK_WEBHOOK_SECRET=$(openssl rand -hex 24)" >> .env
export PAYMENT_MOCK_WEBHOOK_SECRET=$(sed -n 's/^PAYMENT_MOCK_WEBHOOK_SECRET=//p' .env)

# 2. Webhook assinado: x-mock-signature = sha256=<HMAC-SHA256 do corpo com o segredo>
BODY='{"id":"evt-local-1","type":"payment.confirmed","payment":{"id":"mock_pay_miolo_recarga","status":"confirmed"}}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$PAYMENT_MOCK_WEBHOOK_SECRET" | sed 's/^.* //')"
curl -s -X POST http://127.0.0.1:8100/billing/webhooks/mock -H 'Content-Type: application/json' \
  -H "x-mock-signature: $SIG" -d "$BODY"
# {"received":true,"result":"SUCCESS","duplicate":false,"outcome":"applied"}   (de novo: "duplicate":true)

# 3. Saldo (+50) e histórico, como owner (variáveis do bloco "JWT de teste")
curl -s http://127.0.0.1:8100/workspaces/$WS/billing/subscription -H "$AUTH"
curl -s "http://127.0.0.1:8100/workspaces/$WS/billing/payments?limit=5" -H "$AUTH"
```

- Roteiro completo com a saída: `docs/parciais/s2e/curl_cobranca.sh` (`.txt` ao lado). `make seed` devolve a Miolo ao estado do seed.
- **Webhooks** (`POST /billing/webhooks/{asaas|mercadopago|mock}`, sem token de usuário): a assinatura é obrigatória e o segredo de cada provedor precisa estar no `.env` (Asaas: cabeçalho `asaas-access-token` igual a `ASAAS_WEBHOOK_TOKEN`; Mercado Pago: `x-signature` com HMAC-SHA256 do manifesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` e `MERCADOPAGO_WEBHOOK_SECRET`; simulado: `x-mock-signature`). Sem assinatura válida: 401 e nada gravado. Cada evento é gravado em `payment_events`, único por `(provider, event_id)`, antes do efeito e na mesma transação: repetido responde 200 com `duplicate: true` e não repete efeito. Cobrança que não é desta plataforma: 200 com `outcome: ignored`. No Mercado Pago a notificação só traz o id, então a API consulta o recurso no provedor (503 se ele não responder; o provedor reenvia).
- **Efeito no extrato** (S1e): pagamento confirmado vira `credit_grants` uma vez só (chave `billing:payment:<id>`): ciclo da assinatura com a validade do período, recarga sem validade curta. Estorno ou contestação retiram o que ainda não foi usado (`adjustment`); contestação revertida devolve (`refund`); estorno parcial fica para conciliação à mão (`needs_review`).
- **Renovação** (`make scheduler`, ou um tick: `cd apps/backend && uv run hellosquad-scheduler --once`): a assinatura com o período pago vencido é conciliada com o provedor (ciclos e estado); ciclo novo só com pagamento confirmado; sem ele, `past_due`, e nada é bloqueado (paywall é decisão do dono). A mesma assinatura vencida é conferida de novo a cada `BILLING_RECHECK_MINUTES`.
- **Leitura** (só o owner; admin e editor recebem 403): `GET /workspaces/{id}/billing/subscription` (estado, plano, próximo ciclo) e `GET /workspaces/{id}/billing/payments` (créditos e estado de cada cobrança). Nenhum valor em dinheiro sai da API.
- **Provedor real** (quando o dono criar as contas sandbox): preencha `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN` ou `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET`, troque `PAYMENT_PROVIDER` e reinicie a API e o scheduler. O que falta para o sandbox está em `docs/parciais/S2e-relatorio.md`.

### E-mail transacional e o Mailpit (S2f)

Todo e-mail que o HelloSquad manda sai por uma interface única (`EmailProvider`) e, no ambiente local, cai no **Mailpit** do Supabase CLI: nada sai da máquina. A caixa de entrada fica em **http://127.0.0.1:56324** (interface web; a API HTTP do Mailpit responde no mesmo endereço, por exemplo `GET /api/v1/messages`). O SMTP do Mailpit fica exposto em `127.0.0.1:56325` (`[local_smtp] smtp_port` no `supabase/config.toml`; se o seu stack subiu antes dessa linha, rode `make down && make up` uma vez). Os e-mails da própria Auth (recuperação de senha, troca de e-mail) já caíam lá e continuam iguais.

| E-mail | Quando | Quem recebe |
|---|---|---|
| Convite | convite criado (`invitations`) | o e-mail convidado |
| Precisa de você | aprovação pendente | owners do negócio (só o owner decide) |
| Entrega pronta | versão de entrega feita por agente | membros que não são owner (o owner já recebe o "Precisa de você" da mesma entrega) |
| Pagamento confirmado / com problema | cobrança confirmada; vencida, recusada ou contestada (S2e) | owners |
| Senha alterada | a Auth trocou a senha (recuperação ou troca pela pessoa) | a própria pessoa |

- **Idioma:** o da pessoa (`user_metadata.locale`) → o do negócio → pt-BR. Os textos ficam no catálogo do backend (`apps/backend/src/hellosquad/i18n/<idioma>.json`, chaves `email.*`), em pt-BR, en e es. Valor em dinheiro e créditos não aparecem no e-mail (preço ainda provisório).
- **Fila:** o gatilho grava o e-mail em `email_messages` e manda para a fila pgmq `email_outbox`; o worker (`make worker`, ou `cd apps/backend && uv run hellosquad-worker --drain` para esvaziar as filas uma vez) envia, grava o id do Mailpit em `provider_message_id` e tenta de novo com espera crescente se o SMTP falhar (`EMAIL_MAX_ATTEMPTS`). Em local/test, destinatário fora do TLD `.example` é recusado sem envio (`status = refused`).
- **Preferência:** `GET /me/email-preferences` e `PUT /me/email-preferences/{template}` com `{"enabled": false}` desligam um aviso opcional (`approval_pending`, `delivery_ready`, `payment_confirmed`, `payment_problem`); convite e aviso de senha não são opcionais.

```bash
# Um convite na Miolo (como a Marina, owner) e o worker esvaziando as filas uma vez
psql "$DATABASE_URL" -c "insert into public.invitations (workspace_id, email, role, token_hash, expires_at, invited_by)
  select w.id, 'nova.pessoa@miolo.example', 'editor', md5(random()::text) || md5(random()::text), now() + interval '7 days', u.id
  from public.workspaces w, auth.users u where w.slug = 'miolo' and u.email = 'marina@miolo.example'"
(cd apps/backend && uv run hellosquad-worker --drain)
curl -s 'http://127.0.0.1:56324/api/v1/messages?limit=5' | python3 -m json.tool | grep -E '"(Subject|Address)"'
psql "$DATABASE_URL" -c "select template, locale, status, attempts, provider_message_id from public.email_messages order by created_at desc limit 5"
# O make seed não apaga convites e os testes pgTAP esperam a Miolo sem nenhum: remova o do exemplo
psql "$DATABASE_URL" -c "delete from public.invitations where email = 'nova.pessoa@miolo.example'"
```

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
| `erro: o papel hellosquad_api já tem outra senha` | Segundo checkout nesta máquina com outro `API_DATABASE_URL` (o papel é um só) | Copie o `API_DATABASE_URL` do `.env` do outro checkout. Trocar de propósito derruba a API do outro: `uv run hellosquad-local-db roles --rotate` em `apps/backend`. |
| `make test`, `make seed` ou `make e2e` param esperando e saem com erro do `flock` depois de 10 min | Outro alvo está com a trava do banco (outra sessão rodando `make test`/`make e2e`) ou travou | `lsof /tmp/hellosquad-db.lock` mostra quem está com ela; com `flock -o` é só o `flock` do alvo (um worker órfão do `make e2e` não a segura mais). Worker órfão consumindo a fila: `pgrep -af hellosquad-worker` e `kill <pid>`. |
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
