# SA4b — UI de Consumo por cliente, Qualidade das entregas e Saúde das APIs · relatório

Aranha (Frontend & Design), 16/10/2026, 23:04–23:38, em paralelo com a SA6a do Stark (`apps/backend`, `supabase/`), sem sub-agentes. Área tocada: `apps/web` (rotas `/admin/consumo`, `/admin/qualidade`, `/admin/saude`, ação de servidor do saldo, componentes `components/admin/{economics,quality}.ts` e `health/BalanceDialog.tsx`, barra lateral e layout do painel, catálogo `admin` nos 3 idiomas, CSS do painel, testes) e os documentos da fatia. Nada em `apps/backend`, `supabase/`, `packages/contracts` ou `packages/ui`. Skill principal `frontend-vix` e apoio `verification-before-completion` indicados no briefing: **não abri o `SKILL.md` de nenhuma das duas nesta fatia**; o desenho vem inteiro do SA0 e da casca da SA2/SA3b, e a verificação segue a régua do time (evidência colada abaixo).

## 1. Entregue

| # | Item | Onde | Conteúdo | Commits |
|---|---|---|---|---|
| 1 | **Consumo por cliente** + contadores da barra | `app/admin/(painel)/consumo/page.tsx`, `components/admin/economics.ts`, `(painel)/layout.tsx`, `AdminSidebar.tsx`, `nav.ts` | `GET /admin/consumption` com **Período** (seletor do SA0: últimos 30 ou 7 dias, `since`/`until` em dias de Brasília) e **Conta** (`workspace_id`); cartões (solicitações, créditos cobrados com o equivalente ao crédito de exemplo, IA em entregas, IA em conversa com a parte da conversa no custo, IA por crédito); **Alertas econômicos**: um cartão por faixa (`alert_rules`) com o número do conjunto, a conta escrita embaixo, a faixa marcada **Proposta** com o texto do SA0 ("OK até R$ 0,15 por crédito cobrado; acima, atenção.") e as contas fora da faixa com o valor; estado do cartão (**OK / Atenção / Sem dado**) vem do alerta da API (`economics.alerts`), a tela não recalcula a faixa; margem com a etiqueta **Provisória** e a nota **Provisório** (crédito de referência e câmbio de `margin_basis`); tabela **Por cliente** (solicitações, créditos, IA em entregas e em conversa, IA por crédito, margem, tendência 7 dias, alerta com as leituras fora) com linha de total; **Por período** por dia, semana ou mês (`granularity` + `series`); "Como ler". **Contadores da barra** (SA2 §5) de `GET /admin/alerts` no layout: Consumo = contas com leitura fora da faixa, Saúde = saldos abaixo do limiar, desenho `sa-nb is-hot` do SA0, zero não aparece, o nome do link diz o que conta ("Saúde das APIs, 1 saldo abaixo do alerta"). Consumo, Saúde e Qualidade saem de "em breve" | `9e00bc9`, `30a93f0` |
| 2 | **Qualidade das entregas** | `app/admin/(painel)/qualidade/page.tsx`, `components/admin/quality.ts` | `GET /admin/quality` (período 90 dias, 30 dias ou 12 meses; `locale` da tela) e `GET /admin/quality/compare`: o **mês corrente contra o anterior** em seis cartões (aprovadas de primeira, ajustes por entrega, não aprovadas, custo de IA por aprovada, erros do agente, chamadas com falha; contagens com a taxa e "melhorou/piorou/sem mudança"; sem dado diz isso); **Como ler** vindo do catálogo da API nos 3 idiomas; abas **Por tipo** (com total recalculado das somas), **Por mês** (contagem com a taxa embaixo) e **Por versão de prompt** (agente, tipo, hash, origem, fontes `soul/skill vN`, primeiro uso, taxas); **Comparar dois meses** com seletores Antes/Depois (`?a=AAAA-MM&b=AAAA-MM`), taxas e diferença da API, leitura pela diferença arredondada como aparece (regra do SA0), entregas como "volume" e as versões de prompt de cada mês | `2e52612`, `30a93f0` |
| 3 | **Saúde das APIs** + informar saldo | `app/admin/(painel)/saude/{page,actions}.ts(x)`, `components/admin/health/BalanceDialog.tsx` | `GET /admin/providers`: cartões (provedores, funcionando, falhando, sem integração, gasto de IA em 30 dias); um cartão por provedor com **estado** pelo catálogo (`working`, `failing`, `simulated`, `local_only`, `not_integrated`, `account_not_created`, um desenho por estado), **chave só "Configurada/Ausente/Não se aplica"**, chamadas e falhas em 24 h e 7 dias, última falha, **última recusa por saldo**, gasto **24 h / 7 dias / 30 dias / desde o início**, papel e nota de hoje pelo catálogo; **Saldo lido no painel do provedor** (saldo, limiar, lido em, "Saldo abaixo do alerta"/"Acima do alerta", ritmo de 7 dias em dias de duração, histórico dos 5 últimos com motivo e quem informou) com **Informar saldo**: diálogo com valor, moeda, lido em, alertar abaixo de (vazio mantém) e motivo (10 a 500) → `PATCH /admin/providers/{provider}/balance`; validação antes de chamar a API e erro da API por campo (422 `details`); grava, relê a página e avisa. Sem bloco de saldo onde não há conta ou integração | `1801e65`, `4f1ca19` |
| 4 | **Testes, lado a lado, relatório** | `test/SA4b.test.tsx` (15), `test/SuperAdmin.test.tsx` (1 ajustado), `e2e/sa4b-consumo-saude.spec.ts` (2), `docs/parciais/sa4b/` | §2 | `0270c72`, `c38c9b2`, `b042ebb`, `8f4db90`, `ae66125`, este |

## 2. Como foi verificado

Build e e2e **só no worktree `/tmp/sa4b-wt`** (último no commit `30a93f0`), web de produção na **3200**; a web do dono na 3100 ficou no ar e só recebeu leituras. Banco pela trava (`flock -o -w 600 /tmp/hellosquad-db.lock`), sem esperar. Saídas completas em `/tmp/sa4b/*.log`.

| Verificação | Comando | Resultado (colado) |
|---|---|---|
| Build de produção | `pnpm --filter web build` (worktree, `30a93f0`) | `build exit=0` · `├ ƒ /admin/consumo 1.61 kB 129 kB` · `├ ƒ /admin/qualidade 2.13 kB 130 kB` · `├ ƒ /admin/saude 1.92 kB 133 kB` |
| e2e do painel (SA2 + SA3b + SA4b) | `flock … env HELLOSQUAD_DB_LOCK_HELD=1 WEB_PORT=3200 E2E_WORKER=off pnpm --filter web exec playwright test e2e/sa4b-consumo-saude.spec.ts e2e/sa2-admin.spec.ts e2e/sa3b-squad.spec.ts --project=chromium` | `✓ 1 … sem sessão, /admin leva ao login …` · `✓ 2 … o Vic fictício entra no /admin e vê as sete telas …` · `✓ 3 … a Marina … 403 honesto …` · `✓ 4 … o Vic abre o Otto, edita uma seção da Alma …` · `✓ 5 … a Marina … 403 honesto no Squad IA` · `✓ 6 … o Vic vê o consumo da Miolo, informa um saldo e vê o alerta mudar (2.3s)` · `✓ 7 … a Marina (owner, sem papel de plataforma) recebe o 403 honesto no Consumo, na Qualidade e na Saúde (441ms)` · `7 passed (12.8s)` · `e2e exit=0` |
| O que o e2e 6 prova | (dentro do spec) | consumo filtrado pela Miolo (tabela com 1 link, `/admin/contas/<id>`), as três faixas com "Proposta", a margem "Provisória"; Qualidade com "Como ler" da API; Saúde com "Ausente" e sem saldo, HTML sem `sb_secret`, `sk-ant-`, `ASAAS_`, `MP_ACCESS`, `service_role`; **saldo 38,00 com limiar 50** → aviso, "Saldo abaixo do alerta", motivo no histórico e o link "Saúde das APIs, 1 saldo abaixo do alerta"; **saldo 80** → "Acima do alerta" e o contador some; `audit_events` com **2** `admin.provider_balance_reported` |
| `make test-web` | `make test-web` (worktree, `30a93f0`) | `make test-web exit=0` · `packages/contracts test: Tests 9 passed (9)` · `packages/ui test: Tests 50 passed (50)` · `apps/web test: Test Files 38 passed (38)` · `Tests 455 passed (455)` (440 da SA3b + 15); ESLint e `tsc --noEmit` dos pacotes sem erro |
| Vitest da fatia | `npx vitest run test/SA4b.test.tsx test/SuperAdmin.test.tsx test/catalog-parity.test.ts test/catalog.test.ts` | `Test Files 4 passed (4)` · `Tests 48 passed (48)` (15 da SA4b) |
| Banco do dono limpo depois do e2e | `psql` no `supabase_db_hellosquad` | `anthropic\|null\|null` · `relatorios de saldo\|0` · `eventos de saldo\|0` · `config\|7\|0` · `shared\|3\|0` · `skill\|19\|0` · `soul\|7\|0` (o `afterAll` apaga só o que o fluxo criou e devolve a Anthropic ao estado de antes) |
| Web do dono na 3100 | `curl` | `3100 /entrar -> 200` · `/admin/consumo` sem sessão: `HTTP/1.1 307` · `location: …/entrar?next=%2Fadmin%2Fconsumo` |
| SA0 capturado para o lado a lado | Playwright 1440×900 em `consumo.html`, `qualidade.html`, `saude-apis.html` (8020) | `erros de console: 0` |
| Lado a lado | SA0 (8020) × e2e (3200, seed), 1440×900 | `docs/parciais/sa4b/lado-a-lado-{consumo,qualidade,saude}.png`; `nosso-saude-acima.png`, `nosso-403-marina.png` |

**O que o Vitest prova (15):** formatos do SA0 (R$ com três casas, margem em %, tendência "+10%", "−5%", "0%"); o estado do cartão vem do alerta da API e leitura nula é "sem dado"; a leitura da comparação sai da diferença arredondada; o total por tipo recalcula as taxas das somas; mês corrente termina hoje e a virada do ano; o dia de Brasília às 23h30 não pula; o saldo aceita "38,50", "1.234,56", "US$ 40"; **Consumo** chama a API com conta, período e agrupamento, mostra a faixa "Proposta" com o texto do SA0, a Miolo em atenção com o valor, a margem "Provisória", a tendência "Sem dado", a linha da Miolo com "IA por crédito · margem", o total "1 em atenção" e a nota da margem; em inglês, o mesmo pelo catálogo; **Qualidade** pede `locale`, compara o mês corrente com o anterior (uma chamada) ou também os dois meses da URL (duas), mostra o "como ler" da API, a versão de prompt com origem e fontes, e "+25 p.p. Melhorou", "Piorou", "Sem mudança"; **Saúde** com estado e chave pelo catálogo, "Saldo abaixo do alerta", ritmo de 38 dias, gasto, histórico, sem botão de saldo na Asaas (conta não criada) e sem segredo no HTML; **diálogo**: motivo curto não chega à API e marca o campo; o válido chama a ação com valor, moeda, data ISO, motivo e limiar, relê a página e avisa; erro 422 da API aparece no diálogo com o campo marcado; **barra**: Consumo, Saúde e Qualidade abrem, o contador diz o que conta, zero não aparece.

## 3. Decisões (onde o briefing e o SA0 não definem; nada do combinado foi mudado)

1. **Quem decide o alerta é a API** (`economics.alerts` de cada conta e do conjunto); a tela só formata. A faixa aparece sempre com a marcação **Proposta** (a mesma `[PROPOSTA]` das Regras de negócio) e o texto do SA0; o valor de R$ da faixa com duas casas, como no SA0.
2. **Período do Consumo calculado pela API** (`since`/`until` em dias de Brasília), no lugar da estimativa "30 × 7/30" do SA0.
3. **Por período** (dia, semana ou mês; padrão semana) como **tabela**, não gráfico: o briefing pede o período por dia/semana/mês e o SA0 não tem gráfico; não inventei um.
4. **Contadores da barra** lidos de `/admin/alerts` uma vez por página no layout; se a leitura falhar, a barra fica sem contador e a página diz o que houve.
5. **Informar saldo em diálogo** (briefing), com moeda e data; moeda padrão a do último saldo (ou USD); a data não pode ser no futuro; limiar vazio mantém o atual (como a API). O aviso depois de gravar é neutro ("Saldo de Anthropic registrado."): quem diz se está abaixo é o cartão relido da API.
6. **Bloco de saldo** em todo provedor em uso ou simulado (Anthropic, E-mail); nunca em "conta não criada" ou "não integrado", onde não há painel de provedor para ler.
7. **Papel e nota do provedor pelo catálogo do web** (por provedor e por estado), para a tela falar os três idiomas; nota que o catálogo não conhece aparece como veio da API.
8. **Qualidade**: lista no período escolhido (padrão 90 dias, para o "por mês" ter meses); cartões sempre mês corrente × anterior (SA0); comparação fora das abas, com Antes/Depois na URL (trocar o mês recarrega a página e a aba voltaria à primeira).
9. **Teste da SA2 ajustado**: no Squad IA abrem também Consumo, Saúde e Qualidade (12 itens com endereço); só Referências e Motor de imagem ficam "em breve".

## 4. Divergências do SA0 (registradas, para o Vic e o Diogo)

| SA0 | SA4b | Por quê |
|---|---|---|
| Consumo: filtro **Plano** e coluna Plano | sem filtro nem coluna de plano | `/admin/consumption` não traz plano nem filtra por plano; filtrar na tela deixaria total e alertas do conjunto diferentes dos da API |
| Consumo: as 12 contas, inclusive "— sem uso" | só as contas com uso no período | é o que a API devolve; sem dado inventado |
| Consumo: 7 dias = 30 dias × 7/30 com a nota "Estimativa" | período somado pela API, sem a nota | a API calcula o período de verdade |
| Consumo: sem série | + "Por período" (dia/semana/mês) e a linha "De … a …" | briefing |
| Consumo: margem sem etiqueta | etiqueta **Provisória** no cartão e nota **Provisório** | briefing (margem provisória, marcada) |
| Saúde: Meta e Google | não aparecem | sem integração (SA4a §6) |
| Saúde: saldo editado nos campos do cartão, "Registrar saldo" de demonstração | diálogo "Informar saldo" (valor, moeda, lido em, limiar, motivo), gravado pela API, histórico no cartão | briefing; a API exige data e motivo |
| Saúde: Anthropic "Funcionando", chave "Configurada", gasto | "Simulado", "Ausente", US$ 0 | estado real (runtime simulado até a chave chegar) |
| Saúde: Anthropic à esquerda e três empilhados à direita | pares em duas colunas | cinco provedores reais, não seis |
| Saúde: "30 dias = soma do consumo das contas" | soma do gasto em 30 dias dos provedores com gasto | é o que `/admin/providers` manda por provedor |
| Barra: contador de provedores falhando (Saúde), de runs com falha (Fila) e de pendentes (Regras) | Consumo = contas em alerta; Saúde = saldos abaixo do limiar; sem Fila e Regras | o briefing manda `/admin/alerts`; os outros pediriam mais leituras por página |
| Qualidade: só o mês corrente × anterior; abas Por tipo e Por mês | + seletor de período, aba Por versão de prompt, Comparar dois meses fora das abas com Antes/Depois | briefing (por versão de prompt, comparação entre dois períodos) |
| Qualidade: "O que mudou" (texto livre do mês) | as versões de prompt de cada mês | o texto livre não existe no banco (SA4a §6) |
| Qualidade: "Como ler" escrito na página | o da API, nos 3 idiomas (com "rejeitar pedindo nova proposta também conta como ajuste" e o mês da primeira decisão) | catálogo da SA4a |

## 5. O que a API precisa (próximas fatias)

- **Plano por conta no consumo** (campo ou filtro `plan`) para o filtro e a coluna do SA0; e, se o dono quiser a lista completa, as contas **sem uso** no período.
- **Contadores que faltam** numa leitura leve (provedores falhando, runs com falha, parágrafos pendentes): `/admin/alerts` com esses números ou um `/admin/summary`.
- **Nome da delivery** na Qualidade (`by_type`/`by_prompt_version`): o catálogo do web só tem as que o squad executa; as outras aparecem pelo código.
- **Recusa por saldo** detectável (SA4a §4.1) e **Meta/Google** quando houver integração.
- **"O que mudou" do mês** (nota livre), se o dono quiser o campo do SA0.

## 6. Perguntas ao dono

1. **As faixas** (SA0 §5 pergunta 11; SA4a §5 pergunta 1): IA por crédito até **R$ 0,15**; margem a partir de **65%** com o crédito a **R$ 0,50**; custo por turno até **+10% em 7 dias**. Confirma, muda os números ou quer faixa por plano?
2. O cartão do conjunto deve virar **"Atenção" quando alguma conta sai da faixa**? Hoje (como o SA0 e a API) o conjunto pode estar OK com contas em atenção.
3. Conta **Free só com custo de conversa** (sem crédito cobrado) deve gerar alerta? Hoje aparece "sem crédito cobrado", sem alerta.
4. Alerta de saldo em **US$** (como está) ou em **dias de duração** no ritmo atual (a tela já mostra os dias)?
5. **Contadores da barra**: além de contas em alerta e saldos baixos, quer provedores falhando, runs com falha e pendentes, como no SA0?
6. **Comparar** meses (como está, SA0) ou datas livres?
7. Seguem abertas as do SA0 §5, da SA2 §6, da SA3b §6 e da SA4a §5.

## 7. O que ficou de fora

- **Mobile**: só 1440 (como o SA0, a SA2 e a SA3b).
- Filtro e coluna **Plano**, contas sem uso, **Meta/Google**, contadores da Fila e das Regras (§5).
- **Gráfico** da série (o SA0 não tem; a skill `dataviz` não foi aberta porque não há gráfico).
- **`make e2e` inteiro**: rodei os três specs do painel (7 testes) com a trava; o `make test-web` inteiro está verde.
