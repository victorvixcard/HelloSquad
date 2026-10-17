# SA2 — UI do Super Admin (leitura) · relatório

Aranha (Frontend & Design), 16/10/2026, 21:47–22:20, sozinha na área do web (em paralelo com a SA3a do Stark em `apps/backend`, `supabase/`, `squad/`), sem sub-agentes. Skill principal `frontend-vix`; apoio `verification-before-completion`. Área tocada: `apps/web` (rota `/admin`, middleware, catálogo `admin` nos 3 idiomas, testes), `packages/ui` (CSS do SA0 portado por script) e os documentos da fatia. Nada em `apps/backend`, `supabase/`, `squad/` ou `packages/contracts`.

## 1. Entregue

| # | Item | Onde | Commits |
|---|---|---|---|
| 1 | **Entrada e casca** | `middleware.ts` passa a cobrir `/admin` e `/admin/:path*`; `lib/supabase/middleware.ts` chama `GET /admin/me` com o token da sessão: **200 entra; 403 `platform_admin_only` → reescreve para `/admin/sem-acesso` (página 403 honesta no idioma da pessoa, mesma URL na barra); 401 → `/entrar?sessao=expirada&next=…`**; sem sessão → `/entrar?next=/admin…`; API fora do ar → a casca mostra a falha (`ApiUnavailable`). `safeNext` aceita `/admin` como volta do login. `noindex, nofollow, nocache` na Metadata API (o `X-Robots-Tag` da A2c segue). Casca do SA0: wordmark com a etiqueta **"Super Admin"** no lugar da DEMO; barra com **Operação** (Contas, Catálogo, Planos e recargas, Pagamentos, Auditoria) e **Squad IA** (Modelos e custos e Fila de trabalhos abrem; Squad e Regras de negócio "em breve" até a SA3b, Referências e Motor até a SA5, Consumo, Saúde e Qualidade até a SA4); **faixa de 2FA** em todas as páginas enquanto `mfa_enforced = false`, abrindo o diálogo que explica como vai funcionar; **menu da pessoa** no pé da barra (Ir para o HelloSquad, Sair). CSS do protótipo **portado por script** (`packages/ui/scripts/extract-super-admin-css.ts` → `@hellosquad/ui/super-admin.css`, com teste de defasagem, como a A1f fez com a Product UI); ícones gerados do objeto `IC` do SA0. Catálogo `admin` em **pt-BR, en e es** (só vai ao browser no painel; o produto não o leva). | `0a42d16`, `9416b19`, `892fbf0`, `c3623d9` |
| 2 | **Contas** e **detalhe da conta** | `/admin/contas`: cartões (contas, planos ativos, free, créditos em saldo), busca (campo de comando do DS) e filtros de plano e estado (`Select` + `Menu` do DS) na URL, cursor ("Próxima página"/"Voltar ao início"). `/admin/contas/[id]`: plano, saldo (disponível e reservado), membros (papel, membro desde, último acesso), idioma, desde, extrato (últimos 20), uso em 30 dias, assinatura, acessos do suporte (vazio honesto). "Entrar no ambiente", "Ajustar crédito" e "Suspender" **desenhados e desabilitados** com "Chega na SA6". Cidade, PF/PJ e "suspensa" não aparecem. | `c9d8d26`, `3d6954b` |
| 3 | **Catálogo** e **Planos e recargas** | `/admin/catalogo`: as 46 deliveries, **um cartão por agente** (agente mini + área: Kiwi = Growth Marketing), profundidade com a marca **"Inferida"**, créditos com **"Provisório"**, travas "preço aprovado" e "à venda" como `Checkbox` do DS só de leitura (desmarcadas), integrações, homologação (Não iniciada, Em homologação, Aguarda o motor de imagem), filtro por agente; "Editar preço e venda" desabilitado com aviso. `/admin/planos`: cartões de plano e de recarga com versão, ciclo, créditos, validade, preço, **tudo "Provisório"**, status "Fora de venda" e as duas travas desmarcadas; nota de que bônus, rollover e membros por plano não existem no banco. | `8afeae3` |
| 4 | **Pagamentos**, **Auditoria**, **Fila de trabalhos** | `/admin/pagamentos`: provedores (Asaas e Mercado Pago **"Conta não criada"**, lido de `/admin/providers`; o simulado "Em uso"), chave da API e segredo do webhook **só como Configurada/Ausente/Não se aplica**, assinaturas, cobranças e recargas, webhooks recebidos, falhas; "Reprocessar webhook" e "Marcar conciliação" desabilitados (SA6). `/admin/auditoria`: filtros **quem** (Tudo, Super Admin, Cliente, Sistema), **conta**, **tipo** e **período** (Hoje, 7 dias, 30 dias), cursor; detalhe do payload numa linha. `/admin/fila`: contagem por estado, filas pgmq (na fila, em processamento, mais antiga), runs por estado com tentativas ("0 de 3"), posse e último erro; **abrir o run** (`/admin/fila/[run]`) mostra resumo, passos e eventos; reenfileirar e cancelar desabilitados (SA6). | `97e1746`, `54943a3` |
| 5 | **Modelos e custos** | `/admin/modelos`, abas do SA0 (setas, Home, End, aba no endereço): **Custos** (período, chamadas, custo em US$ e R$, por modelo e por cliente, "como o custo é calculado"), **Regras por tarefa** (agente, tarefa, etapas, modelo, esforço, raciocínio — triagem do Nexo em Haiku com orçamento de 1.024 tokens — e a fonte), **Preços e câmbio** (preço por milhão de tokens, "Provisório", **"Conferido em 16/10/2026"**, fonte; câmbio "Exemplo", informado à mão). Só leitura. | `987cf45` |
| 6 | **Testes, lado a lado, relatório** | Vitest `test/SuperAdmin.test.tsx` (17) e staleness do CSS no `@hellosquad/ui` (+1); e2e `e2e/sa2-admin.spec.ts` (3); `docs/parciais/sa2/lado-a-lado-*.png` (8 telas) e `nosso-403-marina.png`; este relatório e o progresso. | `073b700`, `06c8ff6`, `1f8af8a` |

## 2. Como foi verificado

Build e e2e **só no worktree `/tmp/sa2-wt`** (no commit `c3623d9`, igual ao `origin/main` naquele momento, com a SA3a do Stark dentro), web de produção na **3200**; a web do dono na 3100 ficou no ar e só recebeu leituras (`curl` e capturas). Banco pela trava (`flock -o -w 600 /tmp/hellosquad-db.lock`), sem esperar. Saídas completas em `/tmp/sa2/*.log`.

| Verificação | Comando | Resultado (colado) |
|---|---|---|
| Build de produção | `pnpm --filter web build` (worktree) | `exit=0`; `ƒ /admin`, `ƒ /admin/auditoria`, `ƒ /admin/catalogo`, `ƒ /admin/contas`, `ƒ /admin/contas/[id]`, `ƒ /admin/fila`, `ƒ /admin/fila/[run]`, `ƒ /admin/modelos`, `ƒ /admin/pagamentos`, `ƒ /admin/planos`, `ƒ /admin/sem-acesso` (todas dinâmicas: o nonce da CSP chega por requisição) |
| e2e da fatia | `flock … env HELLOSQUAD_DB_LOCK_HELD=1 WEB_PORT=3200 E2E_WORKER=off pnpm --filter web exec playwright test e2e/sa2-admin.spec.ts --project=chromium` | `✓ sem sessão, /admin leva ao login e o painel não entra em buscador` · `✓ o Vic fictício entra no /admin e vê as sete telas com os dados do seed (2.6s)` · `✓ a Marina (owner, sem papel de plataforma) recebe o 403 honesto, sem a casca do painel` · `3 passed (5.2s)`; o teardown reaplicou o seed |
| `make test-web` | `make test-web` (worktree) | `exit=0`; `apps/web test: Test Files 36 passed (36)` · `Tests 423 passed (423)` (406 da SA1 + 17); `packages/ui test: Tests 50 passed (50)` (49 + 1); `packages/contracts test: Tests 9 passed (9)`; ESLint e `tsc` de todos os pacotes sem erro |
| Vitest da fatia | `npx vitest run test/SuperAdmin.test.tsx` | `Tests 17 passed (17)` |
| Paridade dos catálogos | `test/catalog-parity.test.ts` (dentro do `make test-web`) | en e es com as mesmas chaves, argumentos e formato do pt-BR; nenhum texto em português nos outros dois |
| Roteiro real na 3100 (Vic) | `curl` com a sessão do Vic nas 8 rotas | `vic /admin/contas -> 200 robots:"noindex, nofollow, nocache" segredo:0` (o mesmo para `contas/<Miolo>`, `catalogo`, `planos`, `pagamentos`, `auditoria`, `fila`, `modelos`; `segredo` = `grep -cE 'sb_secret\|ASAAS_\|MP_ACCESS\|service_role'` no HTML) |
| Roteiro real na 3100 (Marina) | `curl` com a sessão da Marina | `marina /admin/contas -> 200 403 honesto:1 barra-lateral:0 dados-da-Miolo:0` |
| Sem sessão | `curl -D - /admin` | `HTTP/1.1 307 Temporary Redirect` · `X-Robots-Tag: noindex, nofollow` · `location: http://127.0.0.1:3100/entrar?next=%2Fadmin` |
| Lado a lado | capturas 1440×900 do SA0 (8020) × e2e (3200, seed) | 8 pares em `docs/parciais/sa2/`; 0 erro de console nas capturas |

**O que o Vitest prova (17):** o mapa 200/403/401/outro → entra/403 honesto/login/passa; `/admin` e abaixo são do painel e `/administrar` não; a volta do login aceita `/admin…` e recusa `//…` e `https://…`; o catálogo `admin` vai ao browser só no painel; a casca tem a etiqueta, os dois grupos e Contas ativo no detalhe; no Squad IA só Modelos e Fila são links, os outros sete são `aria-disabled` com "em breve"; menu da pessoa por teclado (Esc devolve o foco), com Sair em `/sair`; faixa de 2FA abre o diálogo com três passos e Esc devolve o foco; en e es pelo catálogo; trava de venda como `checkbox` só leitura com o motivo no nome acessível; tabela vazia com estado honesto e legenda; status com glifo; rótulos por código (conhecido, desconhecido como veio, vazio "—"); formatos pt-BR no fuso de Brasília (data só com dia não volta um dia); filtro troca o parâmetro e tira o cursor; abas com setas/End e hash.

## 3. Decisões (onde o briefing e o SA0 não definem; nada do combinado foi mudado)

1. **403 com status HTTP 200.** O middleware reescreve para `/admin/sem-acesso` e a página diz o motivo no idioma da pessoa; o Next 15 não leva o status do `NextResponse.rewrite` para a resposta (em `resolve-routes.js` o ramo de rewrite não devolve `statusCode`), e `forbidden()` exige `experimental.authInterrupts` no `next.config` (não mexi). Quem não é Super Admin não vê nada do painel (provado no e2e e no `curl`); quem decide é a API (`/admin/me` e cada rota `/admin/*` respondem 403).
2. **"Só leitura" no lugar de "Dados fictícios · Protótipo SA0"** no topo: o painel real não sabe se o dado é fictício; o que é verdade nesta fase é que tudo é leitura.
3. **CTA da faixa de 2FA "Como vai funcionar"** (o SA0 diz "Ativar agora"): não há o que ativar até a Fase 5; o diálogo explica os três passos e diz que nada é gravado.
4. **Filtros na URL** (`?q=`, `?plan=`, `?status=`, `?agente=`, `?quem=`, `?conta=`, `?tipo=`, `?periodo=`, `?estado=`, `?cursor=`): a API filtra e pagina; trocar filtro volta à primeira página. Quem e período da Auditoria e o estado da Fila são links segmentados (navegação), não rádios.
5. **Links para fora do painel com navegação inteira** (`/app`, `/sair`): o CSS do SA0 tem regras globais (`html, body`); com navegação do cliente ele seguiria para o produto.
6. **Idioma** pela ordem do ADR-0010 (o da pessoa; sem negócio na rota, pt-BR). O painel fala os três idiomas pelo catálogo; a pergunta 22 do SA0 segue aberta.

## 4. Divergências do SA0 (registradas, para o Vic e o Diogo)

| SA0 | SA2 | Por quê |
|---|---|---|
| Contas: coluna Tipo (PF/PJ), "negócio · cidade", estados "Suspensa" e "Primeiro acesso" | sem Tipo; embaixo do nome, o e-mail do dono; só Ativa/Excluída | não existem no banco (SA1 §6); não inventar dado |
| Contas: filtros "Pro mensal/Pro anual" | os planos que existem (Free, Squad) | vêm de `/admin/plans` |
| Detalhe: "Entrar no ambiente do cliente" ativo, ajuste com motivo, suspender | os três desenhados e desabilitados ("Chega na SA6") + nota "Só leitura" | escrita e sessão de suporte são da SA6 |
| Detalhe: coluna "Saldo" no extrato e "DONO · DECIDE" | coluna "Nota"; papel "Dono" | a API manda os 20 últimos lançamentos sem saldo corrente (calcular de 20 lançamentos daria número errado) |
| Barra: contadores de falha e de pendência; Squad IA navegável | sem contadores; 7 itens "em breve" | os números do Squad IA são da SA3a/SA4; contador da Fila custaria uma leitura a mais por página (fica para a SA4, com a Saúde) |
| Catálogo: edição com versão, aba Integrações | só leitura; sem a aba das 23 integrações | escrita fica para depois do preço; a API não tem a lista de integrações separada |
| Planos: bônus, rollover, membros, R$ por crédito, "Exemplo" | só os campos do banco, "Provisório" | SA1 §5 pergunta 3 |
| Pagamentos: aba "Demonstração", conciliação por dia, chargebacks | dados reais do seed (simulado), vazios honestos | conciliação e chargebacks são da SA6 |
| Auditoria: cartões (eventos hoje, do Super Admin, acessos, falhas); filtro "Plataforma" | sem cartões; conta = Todas ou uma conta | a API não tem agregados; `workspace_id` não expressa "sem conta" |
| Fila: status vivo do squad no topo, cancelar com motivo | cartões por estado; reenfileirar e cancelar desabilitados | escrita na SA6 |
| Modelos: editar regra e preço, câmbio recalculando | só leitura | edição versionada fica para depois |

## 5. O que a API precisa para as próximas fatias

- **SA3b (UI Squad IA):** as rotas `/admin/squad/*` da SA3a (lista dos 7 com modelo, esforço, versão do prompt e custo médio; Alma por seção; Skills; Ferramentas; "o que ele lê" com tokens; regras de negócio com marcação por parágrafo; diff e voltar versão). A casca já tem os itens no lugar, desabilitados.
- **SA4 (Consumo, Qualidade, Saúde):** as rotas já existem (`/admin/consumption`, `/admin/quality`, `/admin/providers`); faltam os alertas econômicos com faixas marcadas como proposta e o saldo informado por provedor. Para os contadores da barra (runs com falha, provedores falhando), um `GET /admin/summary` leve evitaria uma leitura de fila por página.
- **SA6 (escrita e suporte):** sessão de suporte (motivo, duração, fim), ajuste de crédito com motivo, suspender/reativar (precisa do estado "suspensa" no banco), reenfileirar/cancelar run com motivo, reprocessar webhook e marcar conciliação; saldo corrente no extrato (ou o lançamento já com o saldo depois dele); filtro "sem conta" (plataforma) na auditoria; agregados da auditoria (eventos hoje, do Super Admin, acessos, falhas).

## 6. Perguntas ao dono

1. **403 com status 200** (decisão 1): aceita a página honesta com status 200 ou quer o status 403 de verdade (ligar `experimental.authInterrupts` no `next.config` e usar `forbidden()`)? Não muda nada para quem vê a tela.
2. **"Só leitura" no topo** no lugar de "Dados fictícios" (decisão 2): fica assim?
3. **Squad IA desabilitado com "em breve"**: prefere esconder os itens até a fatia chegar?
4. Seguem abertas as do SA0 §5 e do plano SA (sessão de suporte, quem mais é Super Admin, ajuste de crédito, suspender, "à venda" com homologação, profundidade inferida, campos do plano, idioma do painel).

## 7. O que ficou de fora

- **Mobile**: só 1440 e 1280 (como o SA0); abaixo de 1360 vale o recolhimento do CSS do SA0, sem desenho próprio.
- **Clique na linha inteira** da tabela (o SA0 abre a conta clicando em qualquer ponto da linha): aqui o link é a célula principal (teclado e leitor de tela).
- **Contadores na barra lateral** e cartões da Auditoria (§4).
- Rodar o `make e2e` inteiro: rodei só o spec da fatia (3 testes, com a trava e o teardown do seed); o `make test-web` inteiro está verde.
