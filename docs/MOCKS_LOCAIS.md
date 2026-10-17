# Mocks locais dos provedores (Fase 3)

Os conectores da onda 1 (Meta: Instagram e Páginas; GA4; Search Console; Google Business Profile) rodam **só contra estes mocks** até a Fase 5. Nenhuma conta real de Meta ou Google é criada, nenhuma chave real entra no `.env` e **nada sai para a internet**: o processo dos mocks tem uma guarda de rede que bloqueia qualquer conexão ou resolução de nome fora do loopback (seção 8).

Código: `infra/mocks/` (FastAPI + uv, Python 3.12, o mesmo stack do backend). Estado em memória, zerado por `POST /_mock/reset` ou ao reiniciar. Dados fictícios só de `docs/DADOS_FICTICIOS.md` (Miolo, Vitta, Trilha).

## 1. Subir, parar e testar

```bash
make mocks        # sobe em background em http://127.0.0.1:8300 e espera o health (log: /tmp/hellosquad-mocks.log, pid: /tmp/hellosquad-mocks.pid)
make mocks-stop   # para só esse processo (web :3100 e API :8100 continuam no ar)
make status       # inclui "Mocks dos provedores no ar em http://127.0.0.1:8300"
make test-infra   # guarda do autosave + ruff e pytest dos mocks (infra/mocks/tests)
```

Porta: `MOCKS_PORT` do `.env` (padrão **8300**; a faixa 8300–8309 fica reservada ao HelloSquad). Um processo só serve os quatro provedores, cada um num prefixo que espelha o host real. Os mocks rodam como processo, não como container. Contrato das rotas: `http://127.0.0.1:8300/_mock/openapi.json`. Não há Swagger UI, porque a página buscaria arquivos num CDN externo.

## 2. Endereços e variáveis

As variáveis ficam no `.env.example` (seção "Integrações da onda 1"), já apontando para o mock. Trocar para o real é só trocar a base, na Fase 5.

| Variável | Mock | Real |
|---|---|---|
| `META_OAUTH_BASE_URL` | `http://127.0.0.1:8300/meta/www` | `https://www.facebook.com` (diálogo `/{versão}/dialog/oauth`) |
| `META_GRAPH_BASE_URL` | `http://127.0.0.1:8300/meta/graph` | `https://graph.facebook.com` |
| `META_GRAPH_VERSION` | `v26.0` (o mock aceita qualquer `vNN.N`) | a vigente na Fase 5 |
| `META_APP_ID` / `META_APP_SECRET` | `999000000000001` / vazio | do app da Meta (Fase 5) |
| `GOOGLE_OAUTH_AUTH_URL` | `…/google/accounts/o/oauth2/v2/auth` | `https://accounts.google.com/o/oauth2/v2/auth` |
| `GOOGLE_OAUTH_TOKEN_URL` | `…/google/oauth2/token` | `https://oauth2.googleapis.com/token` |
| `GOOGLE_OAUTH_REVOKE_URL` | `…/google/oauth2/revoke` | `https://oauth2.googleapis.com/revoke` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `000000000000-hellosquadlocal.apps.googleusercontent.com` / vazio | do projeto Google (Fase 5) |
| `GOOGLE_GA4_DATA_BASE_URL` | `…/google/analyticsdata` | `https://analyticsdata.googleapis.com` |
| `GOOGLE_GA4_ADMIN_BASE_URL` | `…/google/analyticsadmin` | `https://analyticsadmin.googleapis.com` |
| `GOOGLE_SEARCH_CONSOLE_BASE_URL` | `…/google/searchconsole` | `https://searchconsole.googleapis.com` |
| `GOOGLE_BUSINESS_ACCOUNTS_BASE_URL` | `…/google/mybusinessaccountmanagement` | `https://mybusinessaccountmanagement.googleapis.com` |
| `GOOGLE_BUSINESS_INFO_BASE_URL` | `…/google/mybusinessbusinessinformation` | `https://mybusinessbusinessinformation.googleapis.com` |
| `GOOGLE_BUSINESS_V4_BASE_URL` | `…/google/mybusiness` | `https://mybusiness.googleapis.com` |

**Segredos vazios.** O mock aceita qualquer `client_secret` (inclusive vazio). Modo estrito, para testar `invalid_client`: `POST /_mock/config {"meta": {"app_secret": "x"}}` ou `{"google": {"client_secret": "x"}}` (ou as variáveis `MOCK_META_APP_SECRET`/`MOCK_GOOGLE_CLIENT_SECRET` do processo do mock). O `client_id` é conferido sempre. `redirect_uri` só é aceito se começar por `http://127.0.0.1:` ou `http://localhost:` (`MOCK_ALLOWED_REDIRECT_PREFIXES`): nenhum redirecionamento sai da máquina.

## 3. Contas fictícias

`GET /_mock/fixtures` devolve os ids. Resumo:

| Workspace | Quem conecta | Meta (Página · Instagram) | Google (GA4 · Search Console · GBP) |
|---|---|---|---|
| `miolo` | `marina@miolo.example` | `100000000000101` "Miolo" · `17841400000000101` @miolo.padaria, 6 posts com métricas e comentários | `properties/400000001` · `sc-domain:miolo.example` · `accounts/1000000000000000001/locations/2000000000000000001` "Miolo · Pinheiros", 12 avaliações (3 sem resposta), 2 posts |
| `vitta` | `rafael@vitta.example` | `100000000000102` · `17841400000000102` @vitta.estetica, 3 posts | `properties/400000002` · `https://vitta.example/` · `…0002/locations/…0002`, 4 avaliações |
| `trilha` | `juliana@trilha.example` | `100000000000103` · `17841400000000103` @trilha.urbana, **sem posts** | `properties/400000003` (sem dado) · `sc-domain:trilha.example` (sem dado) · local sem avaliações nem posts |

A Trilha é o primeiro acesso: as contas existem e conectam, mas não têm dado. É o estado vazio honesto, e nada é inventado para preencher. Cada token só enxerga as contas do próprio usuário. Pedir a conta de outro dá o erro real do provedor: na Meta, `100/33` ("Object with ID … does not exist, cannot be loaded due to missing permissions"); no Google, `403 PERMISSION_DENIED`.

**Coerência com o seed.** As sessões do GA4 e o alcance e os seguidores do Instagram saem da mesma função determinística do `metrics_daily` (`supabase/seed.sql`, mesma semente). No mesmo dia do `make seed`, os números batem um a um com o banco, inclusive o buraco de 3 dias nas sessões da Miolo (43 a 45 dias atrás). Os demais números (usuários, páginas, canais, consultas, avaliações) derivam desses com pesos fixos.

**Quem "faz login" no diálogo simulado.** Os mocks não têm tela: o `authorize` responde 302 na hora. O usuário padrão é a Marina. Para outro usuário, recusa de escopo ou cancelamento:

- só em teste, na URL do diálogo: `mock_user=rafael` (ou o e-mail, ou o slug do workspace), `mock_decline=instagram_content_publish`, `mock_deny=1`. No Google também vale o `login_hint` real (`login_hint=rafael@vitta.example`);
- sem mexer na URL do adaptador (e2e pelo browser): `POST /_mock/config {"consent": {"meta": {"user": "rafael", "decline": [], "deny": false}}}` (idem `"google"`).

## 4. OAuth por provedor

### Meta (Login do Facebook)

1. `GET /meta/www/v26.0/dialog/oauth?client_id&redirect_uri&state&scope=instagram_basic,instagram_content_publish,…` → `302 redirect_uri?code=…&state=…`. Se a pessoa cancela: `?error_reason=user_denied&error=access_denied&error_description=Permissions+error.&state=…`.
2. `GET /meta/graph/v26.0/oauth/access_token?client_id&client_secret&redirect_uri&code` → `{"access_token","token_type":"bearer","expires_in":3600}`. É o token **curto**. O code vale 10 min e só uma vez: reusado dá `100/36009`, vencido dá `100/36007`, e `redirect_uri` diferente dá `100/36008`.
3. **Não existe refresh token na Meta.** A troca por token longo é `GET …/oauth/access_token?grant_type=fb_exchange_token&client_id&client_secret&fb_exchange_token=<curto>`, que devolve `expires_in: 5184000` (60 dias). Vencido o token (curto ou longo), a troca falha com `190/463` e **só reconectando**. O caminho é "Precisa reconectar".
4. `GET /me/accounts` (escopo `pages_show_list`) traz a Página com o **token de Página** (`access_token`). Publicar no feed exige esse token; com o de usuário, a resposta é `(#200)`. O token de Página morre junto com o do usuário (expiração forçada ou revogação).
5. Revogação: `DELETE /me/permissions` revoga tudo (`190/458` nas chamadas seguintes); `DELETE /me/permissions/{escopo}` tira um escopo. `GET /me/permissions` lista `granted` e `declined`; `GET /debug_token?input_token=…&access_token=…` mostra validade, expiração e escopos.

Escopos **ler × agir** (conectar não autoriza publicar): ler usa `instagram_basic`, `pages_show_list`, `pages_read_engagement` e `instagram_manage_insights`; agir usa `instagram_content_publish` (publicar no Instagram), `pages_manage_posts` (feed da Página) e `instagram_manage_comments` (responder comentário). Sem o escopo de agir, a escrita dá `403` com `(#10) Application does not have permission for this action`. A autorização do dono por ação continua sendo do HelloSquad: o escopo só diz que o provedor deixaria.

### Google (OAuth 2.0 para servidor web)

1. `GET /google/accounts/o/oauth2/v2/auth?client_id&redirect_uri&response_type=code&scope=<espaço>&state&access_type=offline&prompt=consent` → `302 redirect_uri?state&code=4/…&scope=<concedidos>&authuser=0&prompt=consent`. Cancelado: `?error=access_denied&state`. Aceita PKCE (`code_challenge`, `S256` ou `plain`) e `include_granted_scopes=true`.
2. `POST /google/oauth2/token` (formulário) com `grant_type=authorization_code` → `{"access_token":"ya29.…","expires_in":3599,"refresh_token":"1//…","scope","token_type":"Bearer"}`. Como no Google real, o **refresh token só vem com `access_type=offline` e só no primeiro consentimento ou com `prompt=consent`**: o "Reconectar" precisa pedir `prompt=consent`, senão volta sem refresh.
3. Refresh: `grant_type=refresh_token` → access novo (sem refresh novo). Grant vencido ou revogado → `400 {"error":"invalid_grant","error_description":"Token has been expired or revoked."}`.
4. `POST /google/oauth2/revoke?token=…` → `200 {}`. Revogar um access revoga o grant inteiro (refresh e os outros access). `GET /google/oauth2/tokeninfo?access_token=…` mostra os escopos e o `expires_in`.

Escopos: GA4 `analytics.readonly`; Search Console `webmasters.readonly`; GBP `business.manage` (o Google tem um escopo só para ler e responder; a separação ler × agir no GBP é da permissão da conexão no HelloSquad). Sem o escopo, a resposta é `403 PERMISSION_DENIED` com `ACCESS_TOKEN_SCOPE_INSUFFICIENT`.

## 5. Leituras e escritas

| Provedor | Leitura | Escrita |
|---|---|---|
| Instagram | `GET /{ig}` (`username,followers_count,media_count,…`), `GET /{ig}/media` (`caption,like_count,comments_count,timestamp,media_url,permalink`, paginado), `GET /{mídia}/insights?metric=reach,likes,comments,saved,shares,views,total_interactions`, `GET /{ig}/insights?metric=reach,follower_count&period=day&since&until`, `GET /{mídia}/comments`, `GET /{ig}/content_publishing_limit` | `POST /{ig}/media` (contêiner: `image_url`, `caption`; `media_type=REELS` + `video_url`; `CAROUSEL` + `children`), `GET /{contêiner}?fields=status_code`, `POST /{ig}/media_publish?creation_id=`, `POST /{comentário}/replies` |
| Páginas | `GET /me/accounts`, `GET /{página}?fields=instagram_business_account`, `GET /{página}/feed`, `GET /{página}/scheduled_posts` | `POST /{página}/feed` (`message`, `link`; agendar com `published=false&scheduled_publish_time=<unix>`, entre 10 min e 30 dias) |
| GA4 | `POST /v1beta/properties/{id}:runReport` (dimensões `date`, `sessionDefaultChannelGroup`, `pagePath`; métricas `sessions`, `activeUsers`, `totalUsers`, `newUsers`, `screenPageViews`, `keyEvents`, `engagementRate`; datas relativas `today`/`yesterday`/`NdaysAgo`; `orderBys`, `limit`, `offset`, `metricAggregations: ["TOTAL"]`, `returnPropertyQuota`), `GET /v1beta/accountSummaries` | — |
| Search Console | `GET /webmasters/v3/sites`, `POST /webmasters/v3/sites/{site}/searchAnalytics/query` (dimensões `query`, `page`, `date`, `country`, `device`; `rowLimit`, `startRow`, `dataState`) | — |
| GBP | `GET mybusinessaccountmanagement/v1/accounts`, `GET mybusinessbusinessinformation/v1/accounts/{a}/locations?readMask=…` (o `readMask` é obrigatório), `GET mybusiness/v4/…/localPosts`, `GET …/reviews` (`averageRating`, `totalReviewCount`, `nextPageToken`), `GET …/reviews/{id}` | `POST …/localPosts` (`summary`, `topicType` `STANDARD`/`EVENT`/`OFFER`, `callToAction`), `DELETE …/localPosts/{id}`, `PUT …/reviews/{id}/reply` (`comment`), `DELETE …/reviews/{id}/reply` |

Fidelidades que o adaptador precisa respeitar:

- **Publicar duas vezes.** O id da mídia é derivado do `creation_id` (`stable_media_id`), então o mesmo contêiner tem sempre o mesmo id. Publicar o mesmo contêiner de novo falha (`9007`), e o contêiner passa a `PUBLISHED`. Depois de um timeout no `media_publish`, o adaptador consulta `GET /{contêiner}?fields=status_code` antes de tentar de novo. Dois contêineres para o mesmo post viram dois posts: a idempotência é do `external_actions`, e o `GET /_mock/calls` prova quantas vezes cada escrita chegou ao provedor.
- Um contêiner de vídeo (`REELS`) fica `IN_PROGRESS` na primeira verificação (consulta de status ou tentativa de publicar; `meta.video_processing_polls`); publicar nesse estado dá `9007/2207027`. Um contêiner vence em 24 h (`2207020`). A cota é de 100 publicações em 24 h (`9/2207042`; ajuste com `{"meta": {"ig_publish_quota": N}}`).
- **O GBP não agenda post.** Campo desconhecido no corpo (ex.: `scheduleTime`) dá `400 Unknown name … Cannot find field`. Quem agenda é o scheduler do HelloSquad, que cria o post na hora. No Instagram também não existe agendamento pela API; só a Página aceita `scheduled_publish_time`.
- Responder avaliação é `PUT` (idempotente: responder de novo substitui a resposta).
- Search Console: dado final só até 3 dias atrás (`dataState: "all"` vai até ontem), linhas por cliques decrescentes e, sem dado, **sem a chave `rows`**. No GA4, sem dado, faltam `rows` e `rowCount`.

## 6. Erros (corpos dos provedores reais)

| Situação | Meta (HTTP · corpo) | Google (HTTP · corpo) |
|---|---|---|
| Token vencido | `400` · `OAuthException` `190`, subcódigo `463` ("Session has expired on …"), cabeçalho `WWW-Authenticate: OAuth "Facebook Platform" "invalid_token" …` | `401` · `UNAUTHENTICATED`, `ErrorInfo.reason = ACCESS_TOKEN_EXPIRED`, `WWW-Authenticate: Bearer … error="invalid_token"` |
| Token revogado | `400` · `190/458` | `401` nas APIs; `invalid_grant` no refresh |
| Grant vencido (reconectar) | igual ao vencido (não há refresh) | `400 {"error":"invalid_grant","error_description":"Token has been expired or revoked."}` no `/token` |
| Sem permissão / escopo | `403` · `(#10)` ou `(#200)` | `403` · `ACCESS_TOKEN_SCOPE_INSUFFICIENT` |
| Conta de outro | `400` · `100/33` | `403 PERMISSION_DENIED` |
| Rate limit | `429` + `Retry-After` + `X-App-Usage` · `(#4) Application request limit reached`, `is_transient: true` | `429` + `Retry-After` · `RESOURCE_EXHAUSTED`, `reason = RATE_LIMIT_EXCEEDED` |
| 5xx | `500`/`503` · código `2`, `is_transient: true` | `500 INTERNAL` / `503 UNAVAILABLE` |
| Timeout simulado | espera N s e responde `504` · código `1` | espera N s e responde `504 DEADLINE_EXCEEDED` |

O adaptador classifica pelo **corpo**, não só pelo status. Na Meta real, o rate limit costuma vir como `400`/`403` com código `4`, `17`, `32` ou `613`, e não como `429`. Para reproduzir isso: `POST /_mock/config {"meta": {"rate_limit_status": 400}}`. Transitórios na Meta: códigos `1`, `2`, `4` e `17`. Terminais: `10`, `200` e todo `190`.

## 7. Controle (`/_mock/*`)

| Rota | Efeito |
|---|---|
| `GET /_mock/health` · `GET /_mock/health/{meta,google_oauth,ga4,search_console,gbp}` | Saúde geral e por provedor (inclui `network_guard: true`) |
| `POST /_mock/reset` | Zera tokens, códigos, chamadas, falhas, configuração, relógio e dados (volta às fixtures) |
| `GET /_mock/calls?provider=&service=&method=&path_contains=&workspace=&since_seq=` · `DELETE /_mock/calls` | Chamadas gravadas: método, caminho, query, corpo (`client_secret` mascarado), token, usuário, workspace, status, falha injetada, duração. É a base das asserções da S3a |
| `POST /_mock/expire` `{"provider": "meta"\|"google", "workspace": "miolo", "kind": "access"\|"grant"}` ou `{"token": "…"}` | Vence tokens na hora. `access`: só os de acesso (no Google, o refresh recupera). `grant`: também o refresh (Google Perfil expirado: precisa reconectar). Na Meta os dois são iguais (sem refresh) e levam junto os tokens de Página |
| `POST /_mock/fail` `{"mode": "500"\|"503"\|"429"\|"timeout"\|"expired", "provider": "google", "path_contains": "/reviews", "method": "GET", "count": 2}` · `GET /_mock/fail` | Enfileira falhas para as próximas chamadas que casarem com o filtro |
| `POST /_mock/config` (merge parcial) · `GET /_mock/config` | Validades (`meta.short_ttl`, `meta.long_ttl`, `google.access_ttl`, `google.refresh_ttl`), rate limit (`rate_limit.meta`/`rate_limit.google` = `{"limit": N, "window_seconds": S}` ou `null`), `timeout_seconds`, consentimento, cota e processamento de vídeo do Instagram, segredo estrito |
| `POST /_mock/clock` `{"advance_seconds": 3600}` · `{"reset": true}` | Avança o relógio do mock (validade de token, de code, de contêiner, janelas, agendamento) sem `sleep` |
| `GET /_mock/network` · `POST /_mock/network/selftest` | Tentativas de rede bloqueadas (tem de ser `[]`) e autoteste da guarda |
| `GET /_mock/fixtures` | Ids das contas fictícias por workspace |

## 8. Injetar falha

```bash
B=http://127.0.0.1:8300
# Só esta chamada: cabeçalho X-Mock-Fail (500 | 503 | 429 | timeout | expired)
curl -s -H 'X-Mock-Fail: 503' -H "Authorization: Bearer $AT" "$B/google/mybusiness/v4/$LOC/reviews"
# Timeout: espera X-Mock-Timeout-Seconds (padrão timeout_seconds = 5) e responde 504
curl -s -H 'X-Mock-Fail: timeout' -H 'X-Mock-Timeout-Seconds: 2' -H "Authorization: Bearer $AT" "$B/google/mybusiness/v4/$LOC/reviews"
# Próximas N chamadas que casarem (sem mexer no adaptador): duas falhas de 500 no publicar
curl -s -X POST $B/_mock/fail -H 'content-type: application/json' -d '{"provider":"meta","mode":"500","path_contains":"media_publish","count":2}'
# "Falhou nas duas tentativas" do §7 da V4.6: duas falhas de token vencido na consulta do Google Perfil
curl -s -X POST $B/_mock/fail -H 'content-type: application/json' -d '{"provider":"google","mode":"expired","path_contains":"/reviews","count":2}'
# Janela de rate limit: 3 chamadas por minuto no Google; a quarta dá 429 com Retry-After até a janela virar
curl -s -X POST $B/_mock/config -H 'content-type: application/json' -d '{"rate_limit":{"google":{"limit":3,"window_seconds":60}}}'
# Token vencido de verdade (persistente) e grant vencido (refresh falha: reconectar)
curl -s -X POST $B/_mock/expire -H 'content-type: application/json' -d '{"provider":"google","workspace":"miolo","kind":"grant"}'
```

**Sem rede.** O `hellosquad-mocks` instala um audit hook do Python antes de subir. Toda tentativa de `connect`, `getaddrinfo`, `gethostbyname` ou `sendto` para fora do loopback é registrada e abortada antes de sair. O código dos mocks não importa cliente HTTP (teste por AST). O teste `test_no_network.py` sobe o processo real numa porta livre, roda OAuth, publicação e GA4 por sockets de verdade e confere `GET /_mock/network == {"guard": true, "blocked": []}`. As URLs de mídia (`media_url`, `permalink`, foto de perfil) apontam para `/_mock/media/*.svg` no próprio mock, para nem o browser buscar imagem fora.

## 9. Roteiro curl por provedor

Os roteiros completos (zeram o mock no começo) ficam em `infra/mocks/roteiros/meta.sh` e `infra/mocks/roteiros/google.sh`. Abaixo, a saída de 17/10/2026, cortada:

```text
$ bash infra/mocks/roteiros/meta.sh
1 troca longa: {"access_token":"EAAMock…… expires_in=5184000
2 contêiner: 17900010000000001 status=FINISHED
3 publicar: {"id":"17958441076078862"}
4 publicar de novo: {"error":{"message":"(#9007) The media container 17900010000000001 has already been published.","type":"OAuthException","code":9007,…}} HTTP 400
5 feed da Página: {"id":"100000000000101_910000000002"}
6 comentários: {"data":[{"id":"18000000001010102","username":"bruno.exemplo","text":"Tem integral também?"},…
7 429: HTTP/1.1 429 Too Many Requests retry-after: 30  {"error":{"message":"(#4) Application request limit reached","type":"OAuthException","code":4,"is_transient":true,…}}
8 expirado: {"error":{"message":"Error validating access token: Session has expired on Saturday, 17-Oct-26 …","type":"OAuthException","code":190,"error_subcode":463,…}} HTTP 400
10 chamadas de media_publish: 2

$ bash infra/mocks/roteiros/google.sh
1 token: expires_in=3599 refresh=1//mock-……
2 GA4: {"dimensionHeaders":[{"name":"date"}],"metricHeaders":[{"name":"sessions","type":"TYPE_INTEGER"},…],"rows":[{"dimensionValues":[{"value":"20261010"}],"metricValues":[{"value":"137"},{"value":"107"}]},…
3 GSC: {"rows":[{"keys":["miolo padaria"],"clicks":84,"impressions":248,"ctr":0.33871,"position":1.29},{"keys":["padaria pinheiros"],…
4 GBP reviews: {"reviews":[{"name":"accounts/1000000000000000001/locations/2000000000000000001/reviews/AbFvOq…","reviewer":{"displayName":"Larissa G.",…},"starRating":"FIVE",…
5 responder: {"comment":"Obrigada, Larissa!","updateTime":"2026-10-17T10:57:09.798559Z"}
6 localPost: {"name":"accounts/…/localPosts/2000000000000000001","languageCode":"pt-BR","summary":"Fornada de sábado às 8h.","state":"LIVE",…
7 agendar (campo inexistente): {"error":{"code":400,"message":"Invalid JSON payload received. Unknown name \"scheduleTime\" at 'local_post': Cannot find field.","status":"INVALID_ARGUMENT"}}
8 429 janela: {"error":{"code":429,"message":"Quota exceeded for quota metric 'Requests' …"}} retry-after: 60
9 expirado: {"error":{"code":401,"message":"Request had invalid authentication credentials. …
10 refresh: ya29.mock-…… leitura=200
11 grant expirado: {"error":"invalid_grant","error_description":"Token has been expired or revoked."} HTTP 400
12 rede: {"guard":true,"blocked":[]} selftest={"blocked":true,…}
```

Trechos mínimos, para colar:

```bash
B=http://127.0.0.1:8300; R=http://127.0.0.1:3100/oauth/callback
# Meta: diálogo → code → token
curl -s -o /dev/null -w '%{redirect_url}\n' "$B/meta/www/v26.0/dialog/oauth?client_id=999000000000001&redirect_uri=$R&state=abc&scope=instagram_basic,instagram_content_publish,pages_show_list"
curl -s "$B/meta/graph/v26.0/oauth/access_token?client_id=999000000000001&client_secret=x&redirect_uri=$R&code=<code>"
curl -s "$B/meta/graph/v26.0/17841400000000101/media?fields=caption,like_count,timestamp&access_token=<token>"
# GA4
curl -s -X POST "$B/google/analyticsdata/v1beta/properties/400000001:runReport" -H "Authorization: Bearer <token>" \
  -H 'content-type: application/json' -d '{"dateRanges":[{"startDate":"28daysAgo","endDate":"yesterday"}],"dimensions":[{"name":"date"}],"metrics":[{"name":"sessions"}]}'
# Search Console
curl -s -X POST "$B/google/searchconsole/webmasters/v3/sites/sc-domain%3Amiolo.example/searchAnalytics/query" -H "Authorization: Bearer <token>" \
  -H 'content-type: application/json' -d '{"startDate":"2026-09-17","endDate":"2026-10-16","dimensions":["query"],"rowLimit":10}'
# GBP: avaliações e resposta
curl -s "$B/google/mybusiness/v4/accounts/1000000000000000001/locations/2000000000000000001/reviews" -H "Authorization: Bearer <token>"
curl -s -X PUT "$B/google/mybusiness/v4/accounts/1000000000000000001/locations/2000000000000000001/reviews/<reviewId>/reply" \
  -H "Authorization: Bearer <token>" -H 'content-type: application/json' -d '{"comment":"Obrigada pela visita!"}'
```

## 10. Fora destes mocks

Meta Ads/Marketing API (Fase 4); webhooks da Meta e notificações Pub/Sub do GBP; Business Profile Performance API (métricas do perfil); Stories e insights de Reels além dos listados; tela HTML de consentimento (o diálogo responde 302 direto). Cada um entra quando a fatia que o consome pedir.
