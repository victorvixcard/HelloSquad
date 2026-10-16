# A1c — Relatório (Aranha)

**Fatia:** A1c, correções da H1 no web (fidelidade ao protótipo). **Data:** 16/10/2026, 14:15 → 14:36. **Escopo:**
`apps/web` e docs da fatia; nada em `supabase/`, `apps/backend`, `infra/` ou `Makefile` (S1h em paralelo).
**Resultado:** H1-03, H1-05, H1-10 e H1-11 corrigidos e provados. **H1-04 não foi feito:** depende de mudar o contrato
da API (ver abaixo). `make test-web` e `make e2e` verdes.

## 1. Achado → o que mudou → prova

### H1-03 · sugestões "Pergunte ao Otto" somem na primeira mensagem da pessoa (`141819e`)

- **Mudou:** `ConversationPanel.tsx`, condição da V4.6 `hasSug: !userAfter && !o.typing` (L10898, L10912): as sugestões
  aparecem enquanto a pessoa não escreveu e ninguém está escrevendo; não importa mais se o agente já falou. Se há
  páginas anteriores ainda não carregadas, a conversa já teve mensagem da pessoa e as sugestões não aparecem.
- **Prova:** os dois testes novos falham no código antigo (`2 failed | 13 passed`) e passam no novo. Lado a lado
  (`a1c/proto.json`, `a1c/nosso.json`, capturas `a1c/*-depois-da-mensagem.png`), depois de escrever "obrigada":

  ```
  proto  1-conversa-do-ambiente: sugestoes: ["Como está o plano da próxima semana?", "Que conteúdos funcionaram melhor?", "Quero melhorar meu Instagram."]
  proto  2-depois-da-mensagem:   sugestoes: []   ultimas: [..., "obrigada", "Anotei, sobre Conteúdo. ..."]
  nosso  2-antes-da-mensagem:    sugestoes: ["Como está o plano da próxima semana?", "Que conteúdos funcionaram melhor?", "Quero melhorar meu Instagram."]
  nosso  3-depois-da-mensagem:   sugestoes: []   ultimas: ["obrigada"]
  ✓ sugestões 'Pergunte ao Otto' ficam até a primeira mensagem da pessoa, mesmo depois da fala do agente (V4.6 L10912)
  ✓ conversa com páginas anteriores ainda não carregadas não mostra as sugestões (a pessoa já escreveu antes)
  ```

### H1-05 · textos menores iguais ao protótipo (`501fedc`, `3ca82a7`)

- **Mudou:** (a) papel ao lado do nome no cabeçalho da conversa: a regra exata da V4.6 é "papel em toda conversa
  que não é a Sala (L10894), menos quando o objeto da conversa tem o mesmo nome do papel" (L13880). Na conversa do
  ambiente Conteúdo, o caso da H1, fica só "Otto". Numa conversa sobre uma publicação, a V4.6 mantém "Otto Conteúdo",
  e o nosso também. (b) `home.json`: ". Ver detalhes" / ". Recolher detalhes" (L8356). (c) Sugestões do Início:
  "só a Íris participa" (artigo do agente, `DA`) e "Nexo, Bia e Kaia participam" (`EA`, L8295), em `SuggestionBand.tsx`
  e `chipOnly` do catálogo.
- **Prova:** cabeçalho da conversa do ambiente, lado a lado: `proto head: "Otto"` e `nosso head: "Otto"`
  (`a1c/*-1-conversa-do-ambiente.png`). Testes:

  ```
  ✓ papel ao lado do nome: na direta e no objeto, menos quando o objeto é o próprio ambiente (V4.6 L13880)
  ✓ nomes acessíveis da V4.6: resumos com Ver detalhes/Recolher detalhes e sugestões com o artigo e a lista com vírgula
  ```

### H1-11 · placeholders em `.example` (`63a603b`)

- **Mudou:** `auth.json` `voce@seunegocio.example` e `home.json` `seunegocio.example`. O teste do catálogo recusa
  qualquer e-mail fora de `.example` e qualquer domínio `.com.br`.
- **Prova:** `grep -rn seunegocio apps/web/messages` →
  `home.json:59 "sitePlaceholder": "seunegocio.example"` e `auth.json:11 "emailPlaceholder": "voce@seunegocio.example"`;
  `✓ e-mail e site de exemplo usam o TLD reservado .example (diretriz de 15/10, H1-11)`.

### H1-10 · cookie da sessão e ação do token do Realtime (`95c5e3d`, `33eb522`)

O que decidi e por quê:

- **`Secure`:** ligado sempre, menos em http no `127.0.0.1`, `localhost` ou `[::1]` (decidido por requisição, pelo
  `Host` e pelo `X-Forwarded-Proto`). Na nuvem (HTTPS) sai `Secure` sem depender de variável de ambiente; o local em
  http continua funcionando. Outro endereço em http (IP da rede) não guarda a sessão: use 127.0.0.1, localhost ou https.
- **Validade: 7 dias sem uso, renovada a cada renovação do token** (cerca de 1 h). O `@supabase/ssr` 0.12.7 grava
  `maxAge` de 400 dias por cima de `cookieOptions` (`dist/main/cookies.js`, `setCookieOptions`), por isso a regra fica
  nos `setAll` (`lib/supabase/server.ts` e `lib/supabase/middleware.ts`), por `sessionCookieOptions`. A Auth local não tem
  fim de sessão configurado (`[auth.sessions]` comentado), então "alinhada à sessão" virou uma janela explícita: quem
  usa o produto toda semana não cai, e o refresh token esquecido num navegador deixa de valer 400 dias. Não usei 1 h
  (`jwt_expiry`): derrubaria quem fecha a aba por uma hora. **Para o Stark, na Fase 5:** espelhar em
  `[auth.sessions] inactivity_timeout = "168h"`, para a Auth encerrar a sessão no mesmo momento que o cookie.
- **Token só na área logada:** o middleware grava o caminho real de toda Server Action num cabeçalho próprio
  (`x-hellosquad-action-path`), por cima do que vier do browser. O matcher novo só pega POST com `Next-Action`, e `/`
  continua estática (`○ /` no build). A ação recusa (a) caminho fora de `/app…` e (b) chamada encaminhada pelo Next
  (`x-action-forwarded`). A primeira versão só tinha (a) e falhou na prova: o POST em `/` ou `/sair` com o id da ação
  é encaminhado pelo Next para `app/app/[workspace]/page`, que tem a ação, e passa de novo pelo middleware como
  `/app/[workspace]`. Daí veio (b). A ação existe só nas páginas `app/app/[workspace]/*` (manifesto do build), então
  chamada legítima nunca é encaminhada. **Limite:** um XSS na mesma origem ainda chama a ação a partir de uma página
  do app. Isso é o H1-01 (S1h/Thor), não esta fatia.
- **Prova** (build de produção, `node ../../docs/parciais/a1c/prova_h1_10.mjs`, token mascarado):

  ```
  cookies: [{"name":"sb-127-auth-token","httpOnly":true,"secure":false,"sameSite":"Lax","path":"/","diasDeValidade":7}]
  acaoDoToken: {"id":"00dbc286…","chamadaEm":"/app/miolo"}
  /app/miolo                    200 devolveToken: true  {"ok":true,"data":{"token":"eyJ***","expiresAt":1792175543}}
  /                             200 devolveToken: false {"ok":false,"code":"not_found","message":""}
  / com o cabeçalho forjado     200 devolveToken: false {"ok":false,"code":"not_found","message":""}
  /sair                         200 devolveToken: false {"ok":false,"code":"not_found","message":""}
  /sair com o cabeçalho forjado 200 devolveToken: false {"ok":false,"code":"not_found","message":""}
  ```

  Antes da correção (b), a mesma prova deu `devolveToken: true` em `/` e `/sair`. O `Secure` fora do local está provado
  só por teste de unidade, porque não há HTTPS local: `isLocalHttp("app.hellosquad.example","https") = false` e
  `sessionCookieOptions(…, false)` dá `secure: true, maxAge: 604800`. Testes: 5 em `test/session-cookie.test.ts`.

## 2. Verificação geral

```
make test-web (14:33, depois da última mudança de código):
  packages/contracts  Test Files 1 passed · Tests 9 passed
  packages/ui         Test Files 5 passed · Tests 49 passed
  apps/web            Test Files 17 passed · Tests 131 passed      EXIT=0
make e2e (14:31:44 → 14:32:16, build de produção, worker simulado):
  10 passed (17.2s)   EXIT=0   (a1b 3, auth-shell 5, live 2: o Realtime pega o token em /app)
```

Depois da correção do teste do papel (só o teste), `vitest run test/ConversationPanel.test.tsx` deu 16 de 16, sem
aviso de `act`. O `next dev` da 3100 foi derrubado para o `make e2e` e subiu de novo às 14:33 com `setsid make dev-web`,
desacoplado da minha sessão (log em `/tmp/hellosquad-dev-web.log`, `GET /entrar` 200). A API da 8100 não foi tocada.

## 3. O que ficou de fora

### H1-04 · "Conversar com <Nome>" no ambiente: **parado, depende da API**

- **Combinado (V4.6):** `talk: () => this._openCtx('env', env)` (L10572) abre a conversa de objeto "Ambiente", uma por
  ambiente, separada da direta, com a primeira fala do agente e as sugestões do ambiente (`_cx`, L9775). Na lista, ela
  aparece como "Conteúdo · Otto · Conteúdo · sobre o ambiente". Captura: `a1c/proto-1-conversa-do-ambiente.png`.
- **Hoje:** abre a conversa direta do seed com o cartão "Conteúdo" (`a1c/nosso-1-conversa-do-ambiente.png`).
- **Por que parei:** a API não tem como guardar uma conversa do ambiente. O `ContextType` do contrato
  (`apps/backend/src/hellosquad/domain.py`, `packages/contracts`) e `app.create_conversation`
  (`supabase/migrations/20261016150100_complete_conversation.sql`, linhas 142–197) aceitam 12 tipos de objeto, e nenhum
  é o ambiente; qualquer outro tipo devolve "Tipo de objeto não aceito.". Separar a conversa exige um tipo novo no
  contrato, no backend e numa migration. Essa é a área do Stark, que está na S1h agora, e contrato de API é
  combinado: pela regra do dono, só o Vic decide mudá-lo. Usar outro tipo (por exemplo `document`) ou uma conversa
  direta com título especial seria contornar, então não fiz.
- **Proposta (Thor → Vic/Stark):** tipo `environment` pela chave, como `metric`: `context_key` = id do agente do
  ambiente (`nexo`…`iris`), título obrigatório (o nome do ambiente), agente à frente = a chave (como `capability`
  deriva o agente) e uma por ambiente, pelo índice único que já existe. Depois disso, o web leva uns 20 minutos
  (Aranha): `EnvIdentity` abre a conversa do ambiente (a que existe ou uma nova criada na primeira mensagem, com
  `kind: "object"`), o envio cria a conversa de objeto quando o contexto é `env`, a lista mostra "· sobre o ambiente",
  e entram os testes e o lado a lado. A A1b #19 ("Resumo" dos cartões de Projetos) tem a mesma lacuna; dá para entrar
  junto, se o Vic quiser.
- **Nota para quem mantém o FLUXOS:** a tabela da §4.1 (linha da conversa direta) lista "'Conversar com…' na identidade
  do ambiente" como conversa direta. Isso contradiz a §1.2 (linha 74) e o código do protótipo (L10572). O H1 está certo.

### Resto da linha H1-10, fora do briefing

`'unsafe-eval'` só em dev, `'unsafe-inline'` na `/` estática (pendência da A0b) e o comentário de fornecedores em
`squad/max/agent.yaml`: não estavam no pedido desta fatia, e o `squad/` não é área minha.

## 4. Onde discordei ou interpretei

- **H1-05, papel no cabeçalho:** a H1 diz "a V4.6 põe o papel só na direta (L5504)". O código da V4.6 põe o papel também
  na conversa de objeto e só tira quando o objeto tem o nome do papel (L13880). Segui o código: no caso da H1 (conversa
  do ambiente), o resultado é o mesmo.
- **H1-11:** a H1 sugeria manter o texto do protótipo. O briefing pediu `.example` (diretriz de 15/10), e segui o
  briefing.
- **H1-10:** os 7 dias são decisão minha, registrada acima; a A1a não tinha fixado validade.
