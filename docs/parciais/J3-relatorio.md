# J3 — relatório (mocks locais dos provedores)

Jarvis, 17/10/2026, das 07:33 às 08:06 (alvo: 70 min). Fatia da Fase 3 em paralelo com a S3b (Stark). Não toquei em `apps/` nem em `supabase/`. Os mocks rodam como processo (não como container), na porta 8300. Web (:3100) e API (:8100) seguiram no ar o tempo todo.

## 1. Entregue

| # | Item | Arquivos | Estado |
|---|---|---|---|
| 1 | Servidor de mocks: um processo FastAPI (uv, Python 3.12) com os quatro provedores em prefixos que espelham os hosts reais. Estado em memória com `POST /_mock/reset`. Gravação das chamadas em `GET /_mock/calls` (filtros: provedor, serviço, método, caminho, workspace, `since_seq`; `client_secret` mascarado). Health geral e por provedor. `make mocks` sobe em background (log em `/tmp/hellosquad-mocks.log`, pid em `/tmp/hellosquad-mocks.pid`) e `make mocks-stop` para | `infra/mocks/` (`app.py`, `state.py`, `main.py`), `Makefile` | ✅ |
| 2 | OAuth fiel. Meta: diálogo → code → token curto (1 h) → troca `fb_exchange_token` por token longo (60 dias), tokens de Página por `/me/accounts`, revogação (`DELETE /me/permissions`), `debug_token` e `/me/permissions`. Google: `authorize` → `token` (access + refresh, com `expires_in` configurável), refresh, `revoke`, `tokeninfo` e PKCE. Expiração forçável por workspace ou por token (`POST /_mock/expire`, tipos `access` e `grant`), com o erro real de cada provedor. Escopos ler × agir | `meta.py`, `google_oauth.py`, `auth.py`, `errors.py` | ✅ |
| 3 | Leituras. Instagram: perfil, mídia com métricas, insights da conta e da mídia, comentários. Páginas: contas e feed. GA4: `runReport` e `accountSummaries`. Search Console: `sites` e `searchAnalytics/query`. GBP: contas, locais, `localPosts` e `reviews`. Dados fictícios só da Miolo, da Vitta e da Trilha; o GA4 e o Instagram reproduzem o `metrics_daily` do seed | `fixtures.py`, `ga4.py`, `search_console.py`, `gbp.py` | ✅ |
| 4 | Escritas. Instagram: contêiner → `media_publish`, com id estável por `creation_id`, republicação recusada, vídeo em processamento, vencimento em 24 h e cota de 100 em 24 h. Páginas: `feed`, com agendamento. GBP: `localPosts` (criar e apagar) e `reviews/{id}/reply` (PUT/DELETE). Rate limit com 429, `Retry-After` e corpo do provedor, em janela configurável. Falhas por `X-Mock-Fail: 500\|503\|429\|timeout\|expired` ou pela fila `POST /_mock/fail`. Timeout simulado. Relógio do mock (`POST /_mock/clock`). Guarda de rede no processo | `meta.py`, `gbp.py`, `app.py`, `netguard.py` | ✅ |
| 5 | 31 testes em `infra/mocks/tests`: roteiro OAuth → leitura → escrita → 429 → expiração → refresh → reset por provedor, além de Meta, Google, falhas, prova de rede e publicação concorrente. `make test-infra` roda ruff e pytest dos mocks. `docs/MOCKS_LOCAIS.md`, variáveis `META_*`/`GOOGLE_*` no `.env.example`, roteiros curl em `infra/mocks/roteiros/` | `tests/`, `docs/MOCKS_LOCAIS.md`, `.env.example`, `docs/SETUP_LOCAL.md` (linha da porta 8300) | ✅ |
| extra | A guarda do autosave passou a recusar os segredos novos (`META_*`/`GOOGLE_*` com valor, `GOCSPX-…`) e tokens reais longos (`EAA…`, `ya29.…`, `1//0…`). Os tokens curtos dos mocks não contam | `infra/git-autosave.sh`, `infra/tests/git-autosave-guard.sh` | ✅ |

## 2. Como verifiquei (saídas coladas)

**`make test-infra`** (17/10 08:00, saída completa em `/tmp/j3-test-infra.log`, 29 linhas; depois da mudança na guarda, a guarda sozinha deu 26/26):

```text
bash infra/tests/git-autosave-guard.sh
ok   recusou: JWT em arquivo novo
…
ok   commitou e enviou: nome do cookie sem valor, ANTHROPIC_API_KEY vazia, chave fictícia curta
cd infra/mocks && uv sync --locked -q && uv run --locked ruff check . && uv run --locked ruff format --check . \
	&& uv run --locked pytest -q
All checks passed!
19 files already formatted
...............................                                          [100%]
31 passed in 1.83s
exit=0
```

```text
$ bash infra/tests/git-autosave-guard.sh   (depois de estender a guarda)
ok   recusou: segredo de cliente OAuth do Google (GOCSPX-) em JSON
ok   recusou: token de acesso da Meta (EAA…) em roteiro
ok   recusou: tokens do Google (ya29. e 1//0) em notas
ok   recusou: META_APP_SECRET preenchida em arquivo novo
ok   recusou: GOOGLE_CLIENT_SECRET preenchida em arquivo novo
ok   commitou e enviou: nome do cookie sem valor, ANTHROPIC_API_KEY vazia, chave fictícia curta, segredos Meta/Google vazios e tokens dos mocks
guarda do autosave: 26/26
```

Também varri o repositório com os padrões novos (arquivos versionados e não versionados, inclusive os da S3b em andamento): nenhuma ocorrência. O autosave não vai travar por falso positivo.

**`make mocks` / `make mocks-stop`** (idempotentes; o pid gravado é o do processo que escuta):

```text
Mocks já no ar (pid 1481, porta 8300)
{"status":"ok","providers":{"meta":{"status":"ok","base_path":"/meta/graph"},"google_oauth":{…},"ga4":{…},"search_console":{…},"gbp":{…}},"network_guard":true,…}
Mocks parados (pid 1481)
Mocks não estavam no ar pelo make mocks
{"status":"ok",…,"network_guard":true,…}
$ ss -ltnp | grep ':8300 '  →  127.0.0.1:8300 users:(("hellosquad-mock",pid=4563,fd=6))   (pid 4563 = /tmp/hellosquad-mocks.pid)
API 8100: 200 · Web 3100: 200
$ make status (fim)  →  Web no ar em http://127.0.0.1:3100 / Mocks dos provedores no ar em http://127.0.0.1:8300
```

**Roteiros curl** (`infra/mocks/roteiros/meta.sh` e `google.sh`, contra o processo do `make mocks`):

```text
1 troca longa: {"access_token":"EAAMock…… expires_in=5184000
2 contêiner: 17900010000000001 status=FINISHED
3 publicar: {"id":"17958441076078862"}
4 publicar de novo: {"error":{"message":"(#9007) The media container 17900010000000001 has already been published.","type":"OAuthException","code":9007,…}} HTTP 400
5 feed da Página: {"id":"100000000000101_910000000002"}
7 429: HTTP/1.1 429 Too Many Requests retry-after: 30  {"error":{"message":"(#4) Application request limit reached","type":"OAuthException","code":4,"is_transient":true,…}}
8 expirado: {"error":{"message":"Error validating access token: Session has expired on Saturday, 17-Oct-26 03:57:18 PDT. …","code":190,"error_subcode":463,…}} HTTP 400
10 chamadas de media_publish: 2
---
1 token: expires_in=3599 refresh=1//mock-……
3 GSC: {"rows":[{"keys":["miolo padaria"],"clicks":84,"impressions":248,"ctr":0.33871,"position":1.29},…
5 responder: {"comment":"Obrigada, Larissa!","updateTime":"2026-10-17T10:57:18.309178Z"}
7 agendar (campo inexistente): {"error":{"code":400,"message":"Invalid JSON payload received. Unknown name \"scheduleTime\" at 'local_post': Cannot find field.","status":"INVALID_ARGUMENT"}}
8 429 janela: {"error":{"code":429,"message":"Quota exceeded for quota metric 'Requests' …"}} retry-after: 60
9 expirado: {"error":{"code":401,"message":"Request had invalid authentication credentials. …
10 refresh: ya29.mock-…… leitura=200
11 grant expirado: {"error":"invalid_grant","error_description":"Token has been expired or revoked."} HTTP 400
12 rede: {"guard":true,"blocked":[]} selftest={"blocked":true,"detail":"rede externa bloqueada nos mocks: socket.getaddrinfo graph.facebook.com"}
```

**GA4 do mock igual ao `metrics_daily` do banco** (seed aplicado hoje; leitura no `supabase_db_hellosquad`):

```text
banco (miolo, sessions)          GA4 do mock (properties/400000001)
2026-10-16 | 118                 20261016 118
2026-10-15 | 120                 20261015 120
2026-10-14 | 124                 20261014 124
2026-10-13 | 103                 20261013 103
2026-10-12 | 126                 20261012 126
2026-10-11 | 117                 20261011 117
2026-10-10 | 137                 20261010 137
```

O teste `test_seed_value_reproduz_o_sql` fixa esses sete valores. Outro teste prova que o buraco de 3 dias do seed (43 a 45 dias atrás) também falta no GA4: 57 linhas em 60 dias.

**Sem rede.** `test_no_network.py` faz três checagens. Uma varredura por AST confirma que o código dos mocks não importa cliente HTTP. No processo de teste, a guarda bloqueia `create_connection(("192.0.2.10", 443))` e `getaddrinfo("oauth2.googleapis.com")`. Por fim, o processo real sobe numa porta livre e roda OAuth da Meta, publicação, OAuth do Google e GA4 por sockets de verdade; ao final, `GET /_mock/network == {"guard": true, "blocked": []}` e o autoteste bloqueia. O teste de concorrência manda 20 `media_publish` simultâneos do mesmo contêiner: o resultado é `[200] + [400] * 19` e um post só no feed.

## 3. Decisões

- **Porta 8300**, faixa 8300–8309 reservada (livre no `ss -ltn`), lida de `MOCKS_PORT`. Um processo só, com prefixos por host real (`/meta/www`, `/meta/graph`, `/google/accounts`, `/google/oauth2`, `/google/analyticsdata`, `/google/analyticsadmin`, `/google/searchconsole`, `/google/mybusiness*`). Para ir ao real, o adaptador troca só a base URL.
- **Meta: Instagram com Login do Facebook** (o fluxo do `/me/accounts` e dos escopos `instagram_basic`/`instagram_content_publish` do briefing), não o "Instagram com Login do Instagram". Graph `v26.0` no `.env.example`; o mock aceita qualquer `vNN.N`.
- **Segredos vazios no `.env.example`**: o mock aceita qualquer `client_secret`, e o modo estrito existe para testar `invalid_client`. IDs de app e de cliente são fictícios e não são segredo. `redirect_uri` só é aceito para `127.0.0.1`/`localhost`.
- **Consentimento sem tela**: o diálogo responde 302 na hora (Playwright segue o redirecionamento). Quem "loga" sai de `mock_user`/`login_hint` ou de `POST /_mock/config {"consent": …}`, e as recusas de `mock_decline`/`mock_deny`.
- **A Trilha conecta, mas não tem dado** (estado vazio honesto); nada é inventado.
- **Mídia local**: `media_url`, `permalink` e a foto de perfil apontam para `/_mock/media/*.svg` no próprio mock, para que nem o browser saia para buscar imagem. Pelo mesmo motivo tirei o Swagger UI, que carregaria JS de CDN; fica só `/_mock/openapi.json`.
- **Rotas assíncronas**: todo o estado é mexido num só laço de eventos, sem threads, então a checagem e a marcação de "publicado" são atômicas. Testado com 20 chamadas simultâneas.
- **Guarda do autosave estendida** (fora da lista de arquivos do briefing). As variáveis `META_APP_SECRET`/`GOOGLE_CLIENT_SECRET` nasceram nesta fatia, e o repositório é público. A mudança é só aditiva no regex, com 5 casos novos no teste (26/26) e varredura sem falso positivo. Se o Thor preferir, reverto.

## 4. Onde discordei do briefing (seguindo o provedor real; nada combinado com o Vic foi mudado)

1. **"token (code → access + refresh)" na Meta.** A Meta não emite refresh token. O mock segue o real: token curto do code, troca por token longo via `fb_exchange_token` e, vencido, só reconectando. No Google o refresh existe como pedido. A S3a precisa tratar os dois caminhos.
2. **"chamadas seguintes 401" na Meta.** A Graph API responde **400** com `OAuthException` 190/463 e `WWW-Authenticate: OAuth "Facebook Platform" "invalid_token"` (conferido em relatos com o cabeçalho real). O Google responde 401 como o briefing diz. O adaptador deve classificar pelo corpo.
3. **"429 com Retry-After" na Meta.** Mantive 429 + `Retry-After` como padrão (pedido do briefing), com o corpo real (`(#4)`, `is_transient`, `X-App-Usage`). Na Meta real, o rate limit costuma vir como 400/403 com código 4/17/32/613 e sem `Retry-After`; `{"meta": {"rate_limit_status": 400}}` reproduz isso.
4. **"GBP localPosts (criar/agendar)".** A API do GBP não tem agendamento: `scheduleTime` no corpo dá 400 "Unknown name", como no real. O Instagram também não agenda pela API. Agendar é papel do scheduler do HelloSquad (S3b/S3a); só a Página do Facebook aceita `scheduled_publish_time`.
5. **"escopos ler × agir (… `business.manage`)".** O GBP tem um escopo só para ler e responder. A separação ler × agir no GBP fica na permissão da conexão no HelloSquad (`connection_permissions`), não no escopo.
6. **"id estável por `creation_id`".** O id é estável (derivado do `creation_id`, igual em qualquer ordem e depois de reset), mas republicar o mesmo contêiner **falha** (9007), em vez de devolver 200 com o mesmo id. É o comportamento do real e mais útil para provar que nada publica duas vezes.

## 5. Fontes consultadas (17/10/2026)

- Meta, Content Publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/ (limite de 100 posts em 24 h, aplicado no `media_publish`; carrossel conta como 1). A página não renderiza por fetch: li pelo trecho do buscador, confirmado por postproxy.dev (28/02/2026) e postzen.dev (03/09/2026).
- Meta, versões: https://developers.facebook.com/docs/graph-api/changelog/versions/ e https://developers.facebook.com/docs/graph-api/changelog/version26.0/ (v26.0 vigente; v25.0 de 18/02/2026, https://developers.facebook.com/blog/post/2026/02/18/introducing-graph-api-v25-and-marketing-api-v25).
- Meta, erros: https://developers.facebook.com/docs/graph-api/guides/error-handling/ (sem render por fetch). Corpo `190/463` "Session has expired" pelo trecho de upload-post.com (28/09/2026). Transitórios 1, 2, 4, 17 e terminais 10, 200–299 e 190 por bundle.social (04/08/2026). HTTP 400 + `WWW-Authenticate: OAuth "Facebook Platform" "invalid_token"` por https://stackoverflow.com/questions/51728611 e https://stackoverflow.com/questions/16316296.
- Google OAuth para servidor web: https://developers.google.com/identity/protocols/oauth2/web-server (endpoint `accounts.google.com/o/oauth2/v2/auth`, resposta do token com `expires_in`/`refresh_token`/`refresh_token_expires_in`, `access_type=offline`, `error=access_denied`, `invalid_grant`, revogação em `oauth2.googleapis.com/revoke`).
- GA4 Data API: https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport (`POST analyticsdata.googleapis.com/v1beta/{property=properties/*}:runReport`, escopos `analytics.readonly`/`analytics`).
- Business Profile, avaliações: https://developers.google.com/my-business/content/review-data (list/get em `mybusiness.googleapis.com/v4/accounts/{a}/locations/{l}/reviews`, resposta e remoção da resposta).
- Pelo conhecimento de referência, sem nova consulta hoje (conferir na Fase 5): Search Console `searchAnalytics.query` (atraso de 2–3 dias, `rows` ausente sem dado), GBP `localPosts` v4 e Business Information v1 (`readMask` obrigatório), códigos 36007/36008/36009 do code da Meta, subcódigos 2207020/2207027/2207042 do Content Publishing e a janela de 10 min a 30 dias do `scheduled_publish_time`. A doc chama de "aproximação" a mensagem exata da republicação (9007).

## 6. O que a S3a precisa saber

1. Suba com `make mocks`. Para isolar cada teste: `POST /_mock/reset` no início e `GET /_mock/calls?path_contains=media_publish` (ou `service=gbp&method=PUT`) para provar quantas escritas chegaram ao provedor. "Publicar duas vezes é impossível" se prova pelo `count`.
2. Ids das contas: `GET /_mock/fixtures`. Na Miolo: IG `17841400000000101`, Página `100000000000101`, GA4 `properties/400000001`, GSC `sc-domain:miolo.example`, GBP `accounts/1000000000000000001/locations/2000000000000000001`.
3. Quem conecta: por padrão a Marina. Para Vitta ou Trilha sem mudar o adaptador, `POST /_mock/config {"consent": {"google": {"user": "rafael"}}}` (ou `login_hint`, que é real, no Google).
4. "Precisa reconectar". Google: `POST /_mock/expire {"provider":"google","workspace":"miolo","kind":"grant"}`, e o refresh dá `invalid_grant`. Meta: `{"provider":"meta","workspace":"miolo"}`, e tudo dá 190/463, inclusive o token de Página. Só `kind: "access"` no Google é recuperável por refresh.
5. "Falhou nas duas tentativas" (§7): `POST /_mock/fail {"provider":"google","mode":"expired","path_contains":"/reviews","count":2}`. Rate limit e 5xx recuperáveis: `{"mode":"503","count":1}` ou a janela `{"rate_limit":{"google":{"limit":N,"window_seconds":S}}}` com `Retry-After`; `POST /_mock/clock {"advance_seconds": S}` vira a janela sem `sleep`.
6. Reconectar no Google precisa de `access_type=offline&prompt=consent`, senão não vem refresh novo (como no real).
7. Timeout no `media_publish`: antes de tentar de novo, consulte `GET /{creation_id}?fields=status_code` (`PUBLISHED` → já foi). Persista o `creation_id` antes de publicar.
8. Classifique o erro pelo corpo (código da Meta, `status`/`reason` do Google), não só pelo HTTP.
9. Tokens do mock são fictícios (`EAAMock…`, `ya29.mock-…`, `1//mock-…`), mas o código da S3a deve cifrá-los no banco como se fossem reais. A guarda do autosave recusa tokens reais.

## 7. Fora / pendências

- **CI**: `infra/github/workflows/ci.yml` (inativo, fora de `.github/`) não roda os mocks. Quando o CI for ligado, basta um passo `make test-infra` (precisa só de uv; sem banco nem rede).
- Fora dos mocks, até alguma fatia pedir: Meta Ads/Marketing API (Fase 4), webhooks da Meta e Pub/Sub do GBP, Business Profile Performance API, Stories e insights de Reels além dos listados, e tela HTML de consentimento.
- Três `wip:` do autosave levaram arquivos meus no meio do trabalho (`07be2e1` `fixtures.py`, `b689c50` `google_oauth.py`, `46ed3a3` `test_meta.py`). Não desfiz nada; os commits `J3:` seguintes têm o estado final.
