# X1 · Objetos de trabalho e dados seed (Product UI V4.6)

Fonte: extratos de `ProductUIV4.dc.html` em `docs/parciais/x1/out/pui/` (o HTML não foi aberto). `(Lnnnn)` = linha do HTML. Todos os dados são fictícios ("dados ilustrativos"). Hoje do protótipo: segunda, 12/10/2026 (L6374). Dois cenários: `uso` (conta em uso, dados abaixo) e `primeiro` (primeiro acesso: sem post, campanha, rotina nem GEN; L6331, L8027). Marca Miolo, usuária Marina (`ACCOUNT`).

## 0. Camadas que valem (a maior linha vence)

| Método | Camadas (linha) | Final |
|---|---|---|
| `_works` | V3 base L8006 → V4.4 L12485 (só ajusta w-plan/diagnóstico aprovados) → V4.5 L13288 (troca o ciclo para "Plano da semana 44" após o PL-43) | L13288 |
| `_vWork` (detalhe) | V3 L9132 → V4 L10950 (volta para Projetos) → V4.3 L12081 (projeto, tipo da relação, conversa do pedido) | L12081 |
| `_projs` (roadmap) | V4 L10106 → V4.3 L12071 (marcos dos trabalhos pedidos) | L12071 |
| `_vProj` | V4 L10578 → V4.1 L11012 | L11012 |
| `_vWorks`, `_wkLib` | V3 L8827 / L8696 → V4.3 L12056 / L12046 | V4.3 |
| `_calItems` | V4 L10058 → V4.5 L13451 | L13451 |
| `_capWork` (pedido vira trabalho) | V4.2 L11719 → V4.3 L11997 → V4.4 L12430 | L12430 |
| Status/pendência | V4.5 `_vNd5` L13822 → V4.6 L13864 (rosto + nome) ; `_st6` L13875 | V4.6 |

- "Trabalhos" deixou de ser item de menu: `_go('works')` vira `'proj'` (L9725; L9722 "Trabalhos agora vive em Projetos"). `is.works` é `false` (L10479).
- Página Projetos (view `proj`, template L4768–4910): cabeçalho do Nexo, faixa "Precisa de você", "Roadmap de projetos", cartões "Seu Squad está trabalhando" e "Próximos marcos", e a seção "Todos os trabalhos" com Quadro | Lista | Biblioteca (L4833, L9082). O "Panorama" da V3 (`pan`/`pl`, L8888–9060) ainda é calculado mas o template V4.6 não o desenha.
- Menu lateral V4: "Principal" (Início, Sala do Squad) · "Seu squad" (Projetos/Nexo, Estratégia/Bia, Marca & Criação/Kaia, Conteúdo/Otto, Growth/Kiwi, CRM/Max, Resultados/Íris) · "Gestão" (Modo Autônomo, Memória da Marca, Minha Equipe & Conversas) (L10529–10538, L9597–9608, L11318).
- IDs: coord=Nexo, arch=Bia, leaf=Kaia, pill=Otto, hex=Kiwi (Growth Marketing, L11322), funnel=Max, square=Íris (L5627–5684).

## A1. O objeto "trabalho" (campos do estado)

Um só formato sai de `_works` (L8006–8030) a partir de três fontes: (a) estado derivado: `post` → `w-post`, `camp` → `w-camp`, `rot` → `w-rot`; (b) `GEN` fixo da conta em uso; (c) `extraW`, criados na sessão. Lista ordenada por `sort`.

| Campo | Valores / formato | Observação |
|---|---|---|
| `id` | `w-post`, `w-camp`, `w-rot`, `w-aval`…; `w-c{n}` (pedido, L11999); `w-bast` (L7001); `w-a5-43` (L13116); `n-rot` (pseudo, L8831) | |
| `kind` | `'Entrega'` · `'Projeto'` · `'Ciclo'` | UI: "Entrega", "Projeto", "Modo Autônomo" (L8847). Para pedidos (V4.3): "Trabalho", "Trabalho de {projeto}", "Entrega pontual" (L12063) |
| `tag` | `'entrega pontual'`, `'projeto coordenado'`, `'projeto'`, `'trabalho do projeto'` | etiqueta no cabeçalho do detalhe |
| `title`, `sum`, `next`, `status`, `due`, `sort` | texto; `due` = `'qua, 14/10'` ou `'—'`; `sort` numérico (14 = 14/10, 15.1…) | |
| `lead`, `co[]`, `ags[]` | `ags` = `[lead]+co`; `sl` = agente da etapa atual (só `w-camp`) | |
| `g` + `paused` | `'you'`, `'and'`, `'prog'` ou `'done'`; pausa = `paused:true` (sinal `pause`, L8664) | |
| `state`, `stateD` | rótulo e detalhe curto (`'v2'`, `'qui, 9h'`, `'desde 05/10'`) | |
| `x`, `th` | rosto do agente (`big`, `oval`, `happy`, `sleep`) e "pensando" | |
| `pct` | 0–100 | número do protótipo; V3 diz "sem progresso inventado" (L8661); V4.6 tira a barra onde não há medição (L13957) |
| `origin`, `hist[]`, `doc{k,t,bars}` | histórico = `[agente ou null, texto, quando, 'auto' ou 'ok']`; `ok` → "aprovado por você", `auto` → "automático" (L9245) | |
| `proj`, `projL`, `rel`, `capId`, `tid`, `isNew` | pedido do catálogo: projeto (`p-ident`…), relação `proj`, `new` ou `pont`, id do pedido, thread da conversa, destaque "novo" | L12003 |

## A2. Estados do trabalho e o desenho de cada um

Rótulos: `STL` (L8848) para a coluna/etiqueta; colunas `COLS` (L8875); textos de estado vazio entre parênteses.

| `g` | Rótulo do estado | Coluna do Quadro (vazia) | Rosto | Sinal (WK_SG, L6394) |
|---|---|---|---|---|
| `you` | "Aguarda você" (L8848); estado do PL-43: "Precisa de você" (L13118) | "Precisa de você" ("Nenhuma decisão pendente") | `big` | anel com "!" (`M8 4.7v4.2 M8 11.1v.1`); **coral, única cor com significado** (L6393) |
| `and` | "Em andamento"; no cartão, com `th`: "Trabalhando" (L8868) | "Em andamento" ("Nada em produção") | `oval` | ponto (só preenchimento `g-f`) |
| `prog` | "Programado" | "Programados" ("Nada programado") | `oval` | relógio (`M8 4.8V8.2l2.2 1.4`) |
| `done` | "Concluído" | "Concluídos" ("Nada concluído ainda") | `happy` | check (`M5.3 8.2l1.9 1.9 3.6-3.8`) |
| `paused` | "Pausado" (cai na coluna "Em andamento", sempre por último, L8878) | idem | `sleep` | duas barras (`M6.6 5.9v4.2 M9.4 5.9v4.2`) |

- Desenho: `<svg class="wk-sg is-{sk}" viewBox="0 0 16 16">` com `circle.g-o` (anel), `path.g-f` (preenchimento) e `path.g-m` (marca) (L4789). Os caminhos `g-f` de you/and/done aparecem truncados ("M…") no extrato: a forma exata do preenchimento não aparece no extrato. A ordem do comentário (L6393: "anel, ponto, relógio, check, pausa") bate com as chaves you/and/prog/done/pause (dedução).
- V4.6, "um desenho por status": `STK6` (L13857) leva o texto antigo à família única: "Aguarda você", "Aguardando você", "Aguarda aprovação", "Aguarda a sua aprovação" → `you`; "Em andamento", "Em produção" → `and`; "Programado", "Programada", "Planejado" → `prog`; "Concluído", "Concluída", "Aprovado", "Aprovado por você", "Entregue", "Publicado" → `done`; "Pausado", "Pausada" → `pause`. `stk6` (L13859) completa por regex (`aguarda*`, `aprovad*|conclu*|entregue|publicad*`, `paus*`, `program*|agendad*|planejad*`); o resto vira `and`. `_st6` (L13875) monta `stCls` + sinal. Aplicado em Minha Equipe (L13953), Estratégia/Kaia ("Em produção" → "Em andamento", L13889, L13923).
- O comentário de L13856 cita também "Bloqueado, Erro", mas o mapa só tem 5 famílias: não aparece no protótipo um `STK6` para eles. Estados extras existem só fora de trabalho: jornada do CRM (L12620: "Pausada", "Aguardando aprovação", "Aguardando autorização", "Programada (simulação)"; campanha "Rascunho", L12625) e Modo Autônomo: `RST5` (L12878) "Ativa", "Pausada", "Bloqueada por integração", "Falha na execução", "Encerrada", "Aguarda sua confirmação"; execuções `EXST5` (L12876) "Concluída", "Falhou", "Não executada", "Aguarda sua aprovação", "Aprovada por você", "Programada".
- Rótulos fora de `STL` que o código usa: "Em revisão" (w-plan, L12350; doc da Bia "Em revisão" L12549), "Precisa de você" (L13118). `stk6('Precisa de você')` cairia em `and` (dedução da regra).

## A3. Estados derivados do estado global (`_works`, L8007–8029)

**Post** (`post.st` `none|making|review|approved`, `post.pub` `none|ask|yes|no`; base: Entrega, lead leaf, ags leaf+pill, due "sex, 16/10", sort 16):

| Situação | g · state · stateD | status | next | pct |
|---|---|---|---|---|
| `making` (L8010) | and · "Em andamento" · "v{n+1}" (th) | "Kaia criando a primeira versão" / "Kaia ajustando {a data, o título…}" | "Kaia entrega a v{n+1}" | 35 |
| `review` (L8011) | you · "Aguarda você" · "v{n}" (`big`) | "v{n} aguarda sua aprovação" | "Aprovar a v{n} até sex, 16/10" | 60 |
| `approved`+`ask` (L8012) | you · "Aguarda você" · "publicação" | "Aprovado. Falta decidir a publicação." | "Autorizar ou não a publicação" | 75 |
| `approved`+`yes` (L8013) | prog · "Programado" · "sex, 9h" | "Publicação agendada para sex, 16/10, 9h" | "Otto publica sex, 9h" | 90 |
| `approved`+`no` (L8014) | done · "Concluído" · "v{n}" | "v{n} aprovada · publicação não autorizada" | "Publicação quando você quiser" | 100 |

**Campanha** (`camp.st` `none|asking|strategy|concept|production`; base: Projeto, lead coord, ags coord/arch/leaf/pill/hex, due "qui, 15/10", sort 15, pct 30):

| `camp.st` | g · state · stateD | status | next | pct |
|---|---|---|---|---|
| `asking` (L8020) | you · "Aguarda você" | "O Nexo quer saber: site, loja ou os dois?" | "Responder ao Nexo" | 5 |
| `strategy` (L8021) | and · "Em andamento" · "etapa 1 de 5" (sl arch) | "Bia desenvolvendo a estratégia" | "Bia apresenta o conceito" | 12 |
| `concept` (L8022) | you · "Aguarda você" (sl arch) | "Conceito aguarda sua aprovação" | "Aprovar o conceito" | 20 |
| `production` (L8023) | and · "Em andamento" · "etapa 2 de 5" (sl leaf) | "Kaia preparando as peças · {n} de 5 prontas" ou "Peças prontas para a revisão" | "Revisão das peças · qui, 15/10" | 40 |

**Ciclo** `w-rot` (só com `rot.st==='active'` e cenário `uso`, L8026): kind "Ciclo", lead pill, ags pill+leaf, g prog, state "Programado", stateD "{dia}, 9h", status "Otto entrega para sua aprovação", due "qui, 15/10" (dia de `rot.cfg.day`, `ROT_DAY` L5793), sort 15.1, `auto:true`, next "Aprovar o plano na quinta". Após a execução PL-43: title "Plano da semana 44", stateD "qui, 9h", due "qui, 22/10", sort 22.1, next "Aprovar o plano na quinta, 22/10" (L13291). Abrir `w-rot` abre a responsabilidade no Modo Autônomo (`_openAuto('r-plan')`, L9731): o ciclo não tem detalhe próprio.
**Pseudo-trabalho** `n-rot` (L8831): quando `rot.st==='proposed'` aparece na coluna "Precisa de você": kind Ciclo, title "Combinado do planejamento", status "Planejamento semanal de conteúdos · aguarda sua confirmação".
**Cuidado do Nexo** `_care` (L8031) = trabalhos `g==='and'` e não pausados; alimenta "Acompanha {n} trabalho(s)" (L8069).

## A4. Entrega, peça, versão e etapa

- **Peça** (`PIECES`): `{bg, fg, acc, top, badge, title, sub, il, band, cta}`; `il` ∈ `loaf|panetone|jar|pumpkin|none`.
- **Versão** `post.vs[]` = `{p: peça, d: 'dd/mm'|'hoje', chg: ''|'data'|'curto'|'verde'|'sabado'|'abord'}`. Cada ajuste (`ADJ`, L5783) copia a peça atual e aplica `d`. Outros campos de `post`: `tid` (thread), `st`, `view` (versão em tela), `cmp` (comparar), `pub`, `apprAt` ("hoje, HH:MM"), `mk` (`{kind:'first'}`|`{kind:'adj',adj}`), `hist[{ag,t,at,tag}]` (tag `auto`|`ok`).
- Estado inicial em `uso` (L6343): `st:'review'`, `view:1`, `pub:'none'`, `vs:[v1 '10/10', v2 'hoje' chg 'data']`, `hist` 4 itens ("Você pediu na conversa com a Kaia", "v1 entregue", "Você pediu: “Deixa a data mais visível.”", "v2 entregue · só a data mudou").
- Rótulos de versão: "v1/v2" + data; "Comparar"; "Você está vendo a v1 · versão anterior" (L9181); selo na peça "mudou: data em destaque" (L9176); `ADJ.chg` ∈ "data em destaque", "título mais curto", "fundo verde", "fornada em destaque", "nova abordagem" (L5784–5787, L9637).
- **Etapas do post** (`life`, L9149; classes `ps-step is-{todo|now|done|you}`): "Preparação" ("Kaia cria a peça" → "Kaia criou" / "Kaia criou e ajustou"); "Sua aprovação" ("você aprova a versão" → "v{n} aguarda você" → "v{n} aprovada"; "nova versão a caminho" se há ajuste); "Publicação" ("só com autorização sua" → "precisa da sua autorização" → "autorizada · sex, 9h"); "Confirmação" ("quando o canal confirmar" / "quando o Instagram confirmar"), sempre `todo`: nenhum gatilho a conclui (não aparece no protótipo).
- **Etapas da campanha** (`stages`, L9202): "Estratégia" (Bia: "Bia define o conceito" / "Conceito aguarda você" / "Conceito aprovado"), "Peças" (Kaia: "5 peças" / "{n} de 5 prontas"), "Textos" (Otto: "Legendas e e-mail"), "Divulgação" (Kiwi: "Verba depende de você"), "Acompanhamento" (Íris: "A partir de 26/10"); `k` `todo|now|done`; `pc` 0–100. V4.6: etapa `now` que não é "Peças" fica indeterminada (`is-ind`, largura 100%, L13958).
- Abas do detalhe: post "Legenda | Briefing | Histórico"; campanha "Entregas | Decisões | Squad | Histórico" (L9161, L9209). Decisões da campanha (L9227): "Aprovar o conceito"/"Conceito aprovado", "Revisão das peças", "Verba de anúncios", "Publicação".
- Detalhe genérico (L9239): título, `tag`, `origin`, resumo, "Próximo passo", arquivo ("Arquivo final na Biblioteca" se `done`, senão "Arquivo final depois da sua aprovação", L12090), time (`lead`+`co`), histórico, botão "Conversar" ou "Abrir a conversa do pedido", link do projeto.
- Responsáveis: cartão do Quadro mostra o líder e até 2 colaboradores ("{Lead} está trabalhando nisso" se `g==='and'` e `th`, senão "{Lead} responde", + " · com {co}", L8867). Detalhe genérico: `team` = `[lead]+co` com nome e papel. Campanha, aba "Squad" (L9233): coord "coordena e acompanha", arch "estratégia e conceito", leaf "peças da campanha", pill "legendas e e-mail", hex "anúncios, se você liberar verba", cada um com a situação curta de `_shortNow` ("criando", "escrevendo", "pesquisando", "coordenando", "acompanhando", "aguarda você", "pausado", "disponível").
- Histórico da campanha em `uso` (L9234, `[agente|null, texto, quando, tag]`, mais recente primeiro): "3 de 5 peças prontas" (hoje · 08:05), "Kaia e Otto começaram a produção" (08/10 · 09:13), "Você aprovou o conceito" (08/10 · 09:12, ok), "Bia apresentou o conceito" (05/10 · 15:05), "Nexo montou o squad" (05/10 · 11:22). Em `primeiro`: só "Nexo montou o squad" ("hoje").
- Documentos da Bia: `DX_SEP` (st `done`, "Aprovado por você em 18/09"), `DX_OCT` (st `you`, "v1 · aguarda a sua leitura"), `PLAN` (v1 09/10, v2 hoje). Estante (L12547–12552): "Aguarda leitura"/"Aprovado", "Em revisão"/"Aprovado", "Em produção".

## A5. Projeto (roadmap)

`_projs` (L10106) devolve 5 projetos em `uso` (campanha só se `camp.st!=='none'`; `p-cont` se `rot.st!=='none'`):

| id | título | lead | `sk` | `stL` (exato) | prazo |
|---|---|---|---|---|---|
| `w-camp` | "Campanha de Natal" | coord | you (asking/concept) ou and | "Em produção · etapa 2 de 5", "Em estratégia · etapa 1 de 5", "O conceito aguarda você", "Uma pergunta aguarda você" | "20/12" · "meta: 400 panetones" |
| `p-cont` | "Planejamento de conteúdos" | pill | and/pause/you | "Ativo no Modo Autônomo · desde 28/09", "Pausado no Modo Autônomo", "O combinado aguarda você" | "Contínuo" |
| `p-ident` | "Identidade visual da Miolo" | leaf | and | "2 de 3 etapas concluídas · a última ainda sem data" | "Sem prazo" |
| `p-perf` | "Acompanhamento de performance" | square | and/pause | "Ativo · leitura toda segunda, 9h" / "Pausado no Modo Autônomo" | "Contínuo" |
| `w-reat` | "Reativação de clientes" | funnel | pause | "Pausado por você desde 05/10" | "Sem data" |

- Campos: `id, w, t, lead, ags, own[[ag, papel]], obj, sk, stL, stS, due, dueS, segs[], marks[], nx, tbd, note, open, openL, need`. `PJ_OF` (L11782) liga nome → id: 'Campanha de Natal'→`w-camp`, 'Planejamento de conteúdos'→`p-cont`, 'Identidade visual da Miolo'→`p-ident`, 'Acompanhamento de performance'→`p-perf`, 'Reativação de clientes'→`w-reat`.
- `segs`: `{a,b}` faixa; `done` concluída; `dash` pausa tracejada; `rail` contínua (rotina). `marks[{d,k,ag,t,s,you?,plan?}]`: `k` ∈ `done`, `av` (a vir; com `you` = "decisão sua", com `plan` = "previsto"), `goal` ("Meta da campanha", "400 panetones vendidos"), `cyc`/`cycd` (ciclo futuro/feito), `pause`. Legenda do roadmap: "projeto", "marco", "previsto", "decisão sua" (L4779). Janela: `RM_A` 21/09 a `RM_B` 27/12 (L9676).
- Cabeçalho de status do roadmap: "{n} ativo(s) · {n} pausado(s) · {n} decisão(ões) sua(s) por perto" (L11115). Detalhe do projeto: "Objetivo", "Responsáveis", "Status", "Próximo marco", "Prazo", "Trabalhos pedidos neste projeto · {n}" (L4799–4805).
- Vazio: "Nenhum projeto ainda" + "Começar pela Campanha de Natal" (L4812).
- Trabalho pedido dentro de projeto vira marco `av` com `s:'novo trabalho · {agente}'` e entra em `ags` do projeto (L12076).

## A6. Aprovação e pendência

`_needs` (L8033–8040) lista decisões; formato `{kind, id, ag, p (peça), t, s, cta}`:

| kind | Quando | `t` | `s` | `cta` (exato) | Selo V4.5 (`NDK5`) |
|---|---|---|---|---|---|
| `post` | `post.st==='review'` | "Post do Dia do Pão · v{n}" | "primeira versão" ou "{ADJ.chg}, como você pediu" | "Revisar entrega" (L8035) | "Para você revisar" |
| `pub` | `approved` + `pub==='ask'` | "Publicação do post" | "v{n} aprovada · o Otto pode publicar sex, 9h" | "Decidir publicação" (L8036) | "Para você autorizar" |
| `campask` | `camp.st==='asking'` | "Uma pergunta do Nexo" | "Campanha de Natal · site, loja ou os dois?" | "Responder" | "Para você responder" |
| `concept` | `camp.st==='concept'` | "Conceito da campanha" | "Campanha de Natal · proposta da Bia" | "Revisar conceito" | "Para você aprovar" |
| `rot` | `rot.st==='proposed'` | "Combinado do planejamento" | "Modo Autônomo · aguarda sua confirmação" | "Revisar combinado" | "Para você confirmar" |

- Outros selos `NDK5` (L13765): `decide` "Para você decidir", `fix` "Para você reconectar", `next` "Em seguida" (nunca abre a faixa sozinho, L13824). A faixa chama-se "Precisa de você" (+ ": n"), mostra a primeira pendência e "+n" / "Ver mais n pendência(s)" / "Recolher as outras pendências" (L13830). V4.6 mostra o agente (rosto + nome), não só a cor (L13863).
- Pendências locais por ambiente (L13776–13819): Bia "Revisar o plano", "Ler o diagnóstico"; Kaia `N.goL` ("Revisar e aprovar a v{n}"); Otto "Revisar a peça", "Revisar o plano" (Plano da semana 43); Kiwi "Ver a proposta" (teste até R$ 40 por dia, 7 dias), "Reconectar (simulação)" (Google Perfil); Max "Revisar as mensagens", "Ver a autorização"; Íris "Ver na Memória"; Memória "Revisar".
- Navegação (`_needGo`, L8457): `campask`/`concept` → conversa da Sala do Squad; `rot` → conversa com o Nexo (se o cartão `proposal` está pendente) ou Sala; demais → detalhe do trabalho.
- Aprovar nunca executa: "Aprovar a peça não publica nada sozinho" (L6800); "Aprovar o texto não envia nada" (L12443); campanha "Nenhuma verba de anúncio sem a sua autorização" (L5060). Publicar, enviar e gastar são autorizações separadas.

## A7. Origem do trabalho (campo `origin`, literal)

| Tipo | Valor | Linha |
|---|---|---|
| Conversa com um agente | "pedido na conversa com a Kaia · 10/10" (`primeiro`: "· hoje") | L9164 |
| Sala do Squad | "pedido na Sala do Squad · 05/10" | L9211 |
| Pedido a agente | "pedido pelo Nexo · 08/10", "pedido ao Max · 28/09", "pedido ao Otto · 19/09", "pedido à Kaia · 26/09", "pedido à Bia · 05/10" | L6212–6236, L12351 |
| Combinado/rotina agendada | "combinado com a Íris · 01/10" | L6218 |
| Primeiro pedido | "primeiro pedido da conta · 14/09" | L6230 |
| Etapa de projeto | "Identidade visual da Miolo · etapa 1" | L11856 |
| Catálogo de pedidos | "pedido em {Ambiente} · {assunto} · hoje" | L12005 |
| Conversa sobre objeto (`hid`) | "conversa sobre {assunto} · hoje" | L12005 |
| Insight da Íris | "criado a partir de um insight da Íris · hoje" (w-bast) | L7002 |
| Execução de rotina | "Modo Autônomo · Planejar conteúdos toda semana · execução PL-43 (simulação)" | L13119 |

Execuções (`EX5`, L12866; 8 itens, ids `RS-42`, `BL-42`, `PL-42.1`, `PL-42`, `RS-41`, `BL-41`, `RC-10`, `PL-41`) têm `{id, rid, when, d, t, st, m, go, goL, fix}`; o PL-43 cria `w-a5-43` (g `you`, state "Precisa de você", status "Aguarda a sua aprovação", sort 15.25, `rel:'proj'`, `proj:'p-cont'`).

## A8. Transições (gatilho → mudança)

| Gatilho | Efeito |
|---|---|
| Pedido J1 na conversa com a Kaia (`_j1Start`, L6733) | `post`: `making`, `vs:[]`, hist "Você pediu na conversa com a Kaia"; ~4,6 s depois (timer) → `review` com v1, hist "v1 entregue" (auto), `_notifyIfAway` "A Kaia entregou a v1 do post" |
| "Pedir ajuste" (`_postAdjAsk`) → escolher ajuste (`_postAdjust`) | `review` → `making` (`mk.adj`), hist "Você pediu: “…”"; ~3,8 s → `review` com nova versão, hist "v{n} entregue · só {o que} mudou" |
| "Aprovar v{n}" (`_postApprove`, L6791) | `approved` + `pub:'ask'`, `apprAt`, hist "Você aprovou a v{n}" (ok); toast "v{n} aprovada. A Kaia foi avisada."; vira pendência `pub` |
| "Autorizar publicação" / "Agora não" (`_postPub`) | `pub:'yes'` (hist "Publicação autorizada para sex, 16/10, 9h"; toast "Publicação agendada · simulação") / `pub:'no'`; "Decidir agora" volta a `ask` |
| Pedido J2 na Sala do Squad (`_j2Start`, L6820) | `camp.st` `asking`; resposta (`_campWhere`) → `strategy` (toast "Projeto criado: Campanha de Natal"); pouco depois → `concept` (Bia propõe, card `pending`) |
| "Aprovar" o conceito (`_campConcept(true)`) | `production`, `pieces:0` → depois `pieces:3`; "Quero ver outra direção" propõe o conceito `b`. Nada leva `pieces` a 5: "Peças prontas para a revisão" não é alcançável |
| Ativar rotina (J3, `_rotActivate`) | `rot` `proposed` → `active` (`since:'hoje'`); `_rotPause(false)` → `paused` (some `w-rot`) |
| "Simular a execução de quinta" (botão, L13604; função L13109–13128) | cria `w-a5-43` (g `you`) e a execução `PL-43`; `_a5Approve43` (L13130) → g `done`, state "Concluído", stateD "hoje", status "Aprovado por você" |
| "Transformar em trabalho" (Resultados `RECS`/oportunidades, `_recDo`, L6997) | cria `w-bast` (g `and`, "Em andamento", stateD "novo", pct 10); toast "Virou trabalho do Otto: bastidores semanais" |
| Pedido do catálogo → confirmar "Criar o trabalho" (`_capWork`, L11997) | `capSt` `brief` → `confirm` (card `wreq`) → `created`; cria `w-c{n}`: g `and`, status "{Agente} preparando", state "Em andamento", stateD "novo", th, pct 8, `isNew`, 3 itens de hist |
| Diagnóstico da Bia (`deliver:'dx'`, L12433) | após 1,2 s: status "v1 aguarda a sua leitura", stateD "v1", pct 70; aprovar → `done`, status "Diagnóstico aprovado por você" |
| Reativação do Max (`deliver:'reat'`, L12440) | `crm.reat`: `review` ("Mensagens aguardam a sua aprovação") → `approved` ("Mensagens aprovadas · envio não autorizado") → `scheduled` (g `prog`, state "Programado", stateD "seg, 9h", "Programada para seg, 19/10, 9h (simulação)"); exige e-mail conectado (simulação) |
| Entrega GEN (`w-aval` etc.) | não há gatilho: são dados fixos; só `w-plan`/diagnóstico mudam via `bia.planOk`/`dxOk` |

## A9. Onde o trabalho aparece nas outras telas

- **Início** (cartão "Trabalhos", L8362): "{n} em andamento"/"Nada em andamento", "1 aguarda você"/"{n} aguardam você", "Hoje, uma decisão é sua"/"Hoje, {N} decisões são suas"; até 3 linhas de `_care` (título, status, barra `pct`, prazo) e até 3 pendências com a 1ª palavra do `cta`; "Ver todos os trabalhos".
- **Menu**: "Projetos" com contador e "{n} aguarda você/aguardam você" (L10533). **Minha Equipe** (L9397): por agente, `g!=='done'`, até 4, com `st/stD/x/th`; aba "Entregas" = `_made` (até 4 peças/documentos).
- **Conversa**: card `{type:'work', wid}` leva ao detalhe (L6302); linha de status do agente `_status` (`work|wait|done|live`); contexto `{l, ag, w}`.
- **Conteúdo** (`_calItems`, L10064): rótulos do post de sexta: "Em criação", "Aguarda você", "Agendado", "Aprovado"; demais: "Publicado hoje", "Publicado", "Agendado"; eventos "Plano da semana {n}" ("aprovado por você", "o Otto entrega às 9h", "previsto · 9h"; semana 43 após PL-43: "entregue · aguarda você").
- **Biblioteca** (`_wkLib`): peça/doc com tag `[sk, rótulo]`: "Aguarda você", "Falta autorizar", "Agendado · sex", "Aprovado", "Em criação", "Para revisão", "Publicado", "Agendado · qua", "Entregue"; filtros "Tudo | Peças | Documentos".
- **Quadro/Lista**: filtros de tipo "Todos os tipos", "Entregas pontuais", "Projetos"; filtro por especialista; vazios "Nenhum trabalho ainda" e "Nenhum trabalho com esses filtros" + "Limpar filtros" (L9103).
- **Kaia** (prod): "Em produção" (V4.6: "Em andamento"), "Planejado" ("Materiais da loja"). **Kiwi**: `extraW` com `capId` e lead `hex`/`gx-*`. **Bia**: lista de análises (3) e estante. **Max**: campanhas "Pausada", "Aguardando aprovação", "Aguardando autorização", "Programada (simulação)", "Rascunho".
- **Notificações** (`NOTIFS.go`): `work:{id}`, `auto:r-plan`, `res`.

## B. Seed (dados da Miolo, cenário `uso`)

Formato de cada item: lista (n itens, linha de origem): campos. Exemplos literais.

### B1. Conta, conversas, estado inicial
- **ACCOUNT** (1, L5819): `name, ini, role, biz, bizIni, bizSub, place`. `{name:'Marina', ini:'M', role:'dona da Miolo', biz:'Miolo', bizIni:'M', bizSub:'Padaria · Pinheiros', place:'Pinheiros'}`.
- **TH_META** (9 conversas, L6250): `{t, ag, room?, topic?}`. `squad` "Sala do Squad" (tópico "Campanha de Natal", `room:true`); `leaf` "Post do Dia do Pão"; `ident` "Identidade da Miolo" (ag leaf). Os outros: coord "Organização da semana", arch "O que os clientes dizem", pill "Planejamento semanal", hex "Anúncios de Natal", funnel "Reativação de clientes", square "Análise de resultados".
- **Mensagem** (`M`, L6265): `{id, k:'day'|'note'|'u'|'a'|'sys', t, at, f (agente), card}`; cartões que tocam trabalho: `work{wid}`, `mat{vi}`, `pieces`, `concept{which,st}`, `proposal`, `pub`, `adj`, `wreq` (confirmar trabalho), `bdoc`, `msgs`, `send`.
- **Prompts** (L5800–5802): `J1_PROMPT` "Cria um post para o Dia Mundial do Pão, nesta sexta. Quero chamar o pessoal para a fornada especial de sábado."; `J2_PROMPT` "Quero uma campanha de Natal para vender mais panetones."; `J3_PROMPT` "Quero que vocês cuidem do planejamento dos meus conteúdos toda semana."
- **initState `uso`** (L6330): `post` (A4); `camp {st:'production', concept:'a', pieces:3, where:'os dois'}`; `rot {st:'active', since:'28/09', cfg:{day:'quinta', vol:'3 posts por semana', auto:false}, hist:[]}`; `auto.extra` = 1 responsabilidade `{id:'r-res', tpl:'res', st:'active', since:'01/10', cfg:{freq:'Toda segunda', src:'Instagram, site e Google'}, pub:false}`; `ins {bast:'open', panet:'open'}`; `works {view:'Quadro', kind:'Todos', ag:null, plan:false, per:'30', off:0, sel:null}`; `libFilter:'Tudo'`; `workTab:'Entregas'`; `res {period:'Mês', tab:'Resumo', kpi:'orders'}`; `cont {view:'Semana', ...}`; `mem.files` 4 itens (`{t:'Guia da marca', d:'PDF · 14/09', k:'file'}`, `{t:'Logo Miolo', d:'SVG', k:'image'}`).
- Em `primeiro`: `post.st/camp.st/rot.st = 'none'`, `GEN` fora da lista (L8027), Quadro vazio: "Nenhum trabalho ainda" + "Peça algo ao squad em Novo pedido. O Nexo organiza quem faz, e o que precisar de você aparece aqui primeiro." (L9103).

### B2. Trabalhos (GEN) e projetos
- **GEN** (11 chaves; 9 em `GEN_ORDER`, L6247 + L11861; `w-plan` e `w-conc` ficam fora da lista). Campos em A1. Quadro inicial = 12 trabalhos (w-post, w-camp, w-rot + 9 GEN): "Precisa de você" 1, "Em andamento" 3 (um pausado), "Programados" 2, "Concluídos" 6.
  - `w-aval` "O que os clientes dizem da Miolo" (L6210): Entrega, arch+[square], `and`, "Bia lendo as 126 avaliações do Google", "Em andamento", "até qua", due "qua, 14/10", sort 14, pct 55, origin "pedido pelo Nexo · 08/10", doc `{k:'Análise · em produção', t:'O que os clientes dizem', bars:false}`.
  - `w-reat` "Reativação de clientes inativos" (L6222): Projeto, funnel+[pill], `and` + `paused`, "Pausado por você · falta a lista com consentimento", "Pausado", "desde 05/10", x `sleep`, due "—", sort 40, pct 20, origin "pedido ao Max · 28/09".
  - `w-diag` "Diagnóstico de marketing" (L6228): arch+[square], `done`, "Entregue e aprovado por você", "Concluído", "18/09", sort 50, pct 100, origin "primeiro pedido da conta · 14/09", hist `[['arch','Bia entregou o diagnóstico','18/09 · 11:40','auto'],[null,'Você aprovou','18/09 · 15:02','ok']]`.
  - Os outros: `w-relat` "Relatório de outubro" (square, `prog`, "Programado", "02/11", sort 33); `w-tom` "Guia de tom de voz" (pill+leaf, 23/09, sort 51); `w-dest` "Capas dos destaques do Instagram" (leaf, 29/09, sort 52, `proj:null`); `w-car` "Carrossel: Do levain ao forno" (30/09, sort 53); `w-ident` "Identidade visual e guia da marca" (tag "trabalho do projeto", `proj:'p-ident'`, 23/09, sort 51); `w-img` "Fotos dos pães para o site" (02/10, sort 54); `w-plan` "Plano de marketing · outubro a dezembro" (`and`, state "Em revisão", stateD "v2", due "sex, 16/10", sort 16.3, pct 80); `w-conc` "Análise de concorrentes do bairro" (`and`, th, stateD "até seg", due "seg, 19/10", sort 19.2, pct 40).
- **Projetos** (5, `_projs` L10106): tabela em A5. Exemplo `p-ident`: `obj` "Renovar a identidade sem perder o que a Miolo já tem e levar a marca a todos os pontos de contato.", `own` `[['leaf','identidade e peças'],['pill','guia de tom de voz'],['arch','posicionamento']]`, marcos "Identidade e tom de voz aprovados" (23/09) e "Capas dos destaques" (29/09), próximo "Materiais da loja" sem data.
- **Execuções** `EX5` (8, L12866): ver A7. **TPL** (8 responsabilidades: `plan, posts, res, opp, reat, reviews` L6078 + `seo, crm` L12808): `{t, s, ags, lead, sch, toks, def, seg, does, asks, never, pubOpt}`; `plan` = "Planejar meus conteúdos toda semana" (asks "O plano de cada semana", "Cada publicação no Instagram"; never "Investir em anúncios", "Responder mensagens de clientes", "Mudar preços ou ofertas"). **ROT_DAY** (3, L5793): `segunda {s:'seg', d:'19/10'}`, `quinta {s:'qui', d:'15/10'}`, `sexta {s:'sex', d:'16/10'}`.

### B3. Peças e calendário
- **PIECES** (9: `v1, natal1, natal2, natal3, forn, bast, abob, focc` L5772 + `levain` L9635): `{bg, fg, acc, top, badge, title, sub, il, band, cta}`. `v1` = `{bg:'#F4E9D4', fg:'#6E3A1C', acc:'#D45A26', top:'16 de outubro', title:'Hoje é Dia\nMundial do Pão.', sub:'Sábado tem fornada especial. Encomende pelo site.', il:'loaf'}`; `natal3` = `{bg:'#D45A26', title:'Feito à mão,\ndevagar.', sub:'Retire na loja ou receba em casa.', il:'none', cta:'Encomendar'}`; `levain` = `{bg:'#E6CFA2', top:'Bastidores', title:'Como nasce\no levain.', il:'jar'}`.
- **ADJ** (5, L5783 + L9637): `{l, chg, what, d}`; `data` "Deixar a data mais visível" (`d:{top:'', badge:'SEX · 16/10'}`); `curto` "Título mais curto" (`title:'Dia de pão.'`); `verde` "Fundo verde da Miolo"; `sabado` "Destacar a fornada de sábado"; `abord` "Outra abordagem". `ADJ_ORDER` tem os 4 primeiros; `CHG_POS` posiciona o selo.
- **CAL_POSTS** (6, L9639): `{id, d, t, fmt, pk, st:'pub'|'sched'|'post', clk?, plan, today?, w?}`. `c-1005` 05/10 "Fornada de segunda" Post `pub` clk 148 plan 41; `c-1014` 14/10 "36 horas de paciência" `sched` plan 42; `c-1016` 16/10 "Dia Mundial do Pão" `st:'post'`, `w:'w-post'` (segue o estado do post). Os outros: `c-1007` "Como nasce o levain" Reels clk 71; `c-1009` "Focaccia de alecrim" clk 96; `c-1012` 12/10 `today:true`.
- **CAPS** (6, L9647) `{id: legenda}`; `c-1014`: "36 horas. É o tempo que a nossa massa descansa antes de ir ao forno. Sem pressa, do jeito certo.". **CAP_ALT** (6 ids × 2 versões, L9656); `c-1014`: "Sem pressa, do jeito certo. A nossa massa descansa 36 horas antes do forno." / "36 horas de fermentação natural. É isso que você sente na casca.". **MORE_LINE** (6 ids × 3 temas, L9665); `c-1016`: "A fornada de sábado, do forno à mesa", "Quem faz o pão: a equipe às 5h da manhã", "Levain: as perguntas que vocês mandam". **CAL_PLANS** (6, L9673): `{d, wk}` semanas 41 a 46 (quintas 01/10, 08/10, 15/10, 22/10, 29/10, 05/11).

### B4. Resultados e notificações
- **WK** (12 semanas, L6028): "20/07" … "05/10"; `WEEK_MARK = 7` (primeiro post de bastidores).
- **KPIS** (4, L6030): `{id, l, sl, s[12], fmt, max, step}`. `orders` "Encomendas pelo site" ("encomendas por semana") `[18,19,20,24,22,21,21,29,32,35,32,34]`, max 40; `visits` "Visitas vindas do Instagram" (…530, 512; max 600); `reach` "Alcance no Instagram" (mil contas; 8,4); `reviews` "Nota no Google" ("avaliações novas por semana").
- **RES** (3 períodos "Semana" | "Mês" | "Trimestre", L6036): `{l, cmp, band, read, readN, kpis{id:[valor, delta, 'up'|'down']}, chans[[canal,n]], top[[pk, título, 'dd/mm · post|reels', cliques]]}`. "Mês": `l:'setembro'`, `cmp:'vs agosto'`, `orders:['128','+18%','up']`, chans Instagram 54, "Busca no Google" 31, "Direto no site" 27, WhatsApp 16; top `bast` "36 horas de paciência" 412. "Semana": `l:'semana de 05 a 11/10'`, `orders:['34','+6%','up']`.
- **RS_KPIS** (3, L9679) `{id, l, s, unit}` (orders, visits, reach); **RS_PREV** (3), **RS_PER** (3), **RS_SAY** (3×3 leituras, L9688), **RS_SAYN** (3), **RS_AN** (3, L9706): `{id, t, d, s, k, per}`, ex. `an-week` "Leitura da semana" ("seg, 12/10 · 9h"), `an-sep` "Setembro na Miolo" ("qui, 01/10"), `an-bast` "Bastidores levam mais gente ao site".
- **RECS** (3, L6063) `{id, ag, t, s, act, done}`: `bast` "Manter um post de bastidores por semana" (square; act "Transformar em trabalho"; done "Virou trabalho do Otto"); `panet` "Abrir as encomendas de panetone em 26/10" (arch; "Levar para a campanha"; "Levado ao Nexo"); `sab` "Reforçar o sábado, dia com mais encomendas" (hex; "Conversar com o Kiwi"; done ""). **Oportunidades** `_opps` (6, L10175): `{id, env, ag, t, s, act, done, doneL, first}`: `bast, panet, sab, c-bast, c-abob, c-natal`.
- **NOTIFS** (4, L6070) `{id, ag, t, s, at, go}`: `n1` leaf "A Kaia entregou a v2 do post" / "Post do Dia do Pão · aguarda você" 08:40 `work:w-post`; `n2` pill "“Fornada de segunda” foi publicado" / "O Instagram confirmou às 09:01" 09:01 `auto:r-plan`; `n3` square "Leitura semanal pronta" 09:00 `res`; `n4` arch "A Bia começou a ler as avaliações" 08:12 `work:w-aval`.

### B5. Kaia, Kiwi, Bia, Max
- **KA_*** (L11863): `KA_CAR` (3 telas) `{bg:'#6E3A1C', top:'1/5', title:'Do levain\nao forno.', sub:'36 horas, tela por tela.', il:'jar'}`; `KA_IMG` (4: `loaf, jar, pumpkin, panetone`); `KA_COV` (5 `[nome, cor]`: `['Fornadas','#6E3A1C']`, `['Encomendas','#D45A26']`, … "Onde estamos"); `KA_CATS` (7 `[id, rótulo]`: `['all','Todas']`, `['social','Redes sociais']`, `['car','Carrosséis']`, `['brand','Identidade']`, `['promo','Promocionais']`, `['img','Imagens']`, `['vid','Vídeo e motion']`); `KA_CAP` e `KA_OF_CAP` (6, categoria ↔ pedido `k-post, k-car, k-id, k-promo, k-img, k-vid`); `KA_NEW` (6; `social` "Nova peça para as redes", `brand` "Revisar a identidade"). **CAP_NX** (11, L11847): próximo passo por pedido, ex. `'k-post'` "Kaia mostra a primeira versão para você aprovar".
- **GX** do Kiwi (11, L11799): `{id, ag:'hex', k, hid:true, q, o[{l, r, fx?, j?, jt?, w?}]}`. `gx-teste` "Teste perto da loja": q "…anúncios só para quem mora até 3 km da loja, com teto de R$ 40 por dia, durante 7 dias…", opções "Autorizar o teste" (`fx:'auth:yes'`), "Ajustar o teto", "Agora não" (`fx:'auth:no'`). `gx-q2` "Busca: panetone artesanal": opção "Transformar em trabalho" com `w:{t:'Página do panetone no site', p:'Campanha de Natal', due:'qui, 22/10', nx:'Otto escreve; Kaia prepara as fotos; você aprova antes de publicar'}`. `gx-t2` "Teste: bastidores toda semana" ("semana 2 de 4"). Outros: `gx-natal, gx-q1, gx-q3, gx-q4, gx-t1, gx-t3, gx-h1, gx-h2`. `w.p` ∈ nome de projeto | 'novo projeto' | 'trabalho avulso' (decide `rel`, L11964).
- **BX** da Bia (11, L12251): `bx-pos` "Posicionamento da Miolo", `bx-o1` a `bx-o5` (oportunidades), `bx-r2`, `bx-dx` "Diagnóstico estratégico", `bx-plan` "Plano de marketing", `bx-i1`, `bx-i3`. `bx-o1` "Oportunidade: buscas locais" → `w:{t:'SEO local: aparecer nas buscas do bairro', p:'Acompanhamento de performance', due:'ter, 20/10', lead:'hex', nx:'Kiwi entrega o diagnóstico de SEO local'}`.
- **DX_SEP** (L12358, `st:'done'`, `stL:'Aprovado por você em 18/09'`, stats `[['108','encomendas em agosto'],['4,8','nota no Google'],['1x','post por semana']]`); **DX_OCT** (L12368, `st:'you'`, `stL:'v1 · aguarda a sua leitura'`, stats 310 / 27% / 4,8, 3 recs → `bx-o1`, `bx-r2`, `bx-o5`); **PLAN** (L12380): `ver [['v1','09/10',false],['v2','hoje',true]]`, `obj` "Vender 400 panetones até 20/12 e depender menos do Instagram…", `pos` "Ser reconhecida como a padaria de fermentação natural do bairro.", 3 `prios`, 4 `inits` `{t, s, ag, ags, pj, m, cap?, live?, cond?}` (ex. "Página do panetone e busca de Natal", pj "Campanha de Natal", `cap:'bx-i1'`).
- **MX_SEG** (5, L12299) `{id, l, n, ok, crit, src, act, cap}`: `freq` "Clientes frequentes" 62/31; `inat` "Inativos há 60 dias" 138/23 (`cap:'m-reat'`); `novos` "Novos clientes" 41/22; `rec` 18/12; `leads` 27/27. **MX** (12 = 7 literais `mx-c-pos, mx-c-nat, mx-email, mx-wa, mx-imp, mx-j1, mx-j2` + 5 gerados `mx-s-{seg}`, L12306), mesmo formato do GX; `mx-c-pos` com `w:{t:'Jornada pós-compra: agradecimento e avaliação', p:'trabalho avulso', due:'qua, 21/10'}`. **M_REAT** (L12238): `{id:'m-reat', ag:'funnel', l:'Reativar clientes inativos', o:[{l:'Saudade, sem desconto'},{l:'Convite para a fornada de sábado'},{l:'Cupom de 10% na volta'}], w:{t:'Campanha de reativação de clientes', p:'Reativação de clientes', due:'sex, 16/10'}, deliver:'reat'}`. **RE_MSG** (L12342): `[0]` = 3 variantes da mensagem 1 (`sub` "Faz tempo que a gente não se vê" / "Convite para a fornada de sábado" / "Um presente para você voltar"), `[1]` = mensagem 2 `{sub:'Sábado tem fornada especial', body:…}`.
- Outras listas: **SUGG** (9 sugestões do Início, L5805) `{agent, text}`; **SUG_D** (16 frases de roteiro, L10982).

## C. Lacunas e atenções

- Não aparece no protótipo: estado "Bloqueado"/"Erro" para trabalho (só em responsabilidades e execuções); post "Publicado" depois de agendado (a etapa "Confirmação" nunca conclui); `camp.pieces` = 5; cancelar, excluir ou reatribuir trabalho; editar prazo; persistência (tudo é `setState` e `setTimeout`). "Encerrar" existe só para responsabilidades do Modo Autônomo (`RST5` "Encerrada", L12878; L13359).
- `w-plan`/`w-conc` existem em GEN, mas ficam fora do Quadro/Lista e da contagem do Início (L12356); abrem pela estante da Bia.
- Rótulos de estado divergem: "Aguarda você" × "Aguardando você" (L13857), "Em produção" × "Em andamento", "Em revisão" e "Precisa de você" fora de `STL` (L8848).
- Glifo `g-f` de you/and/done truncado no extrato ("M…"): confirmar no HTML se precisar do desenho exato.
- Datas são texto PT-BR (`'qua, 14/10'`) e `sort` é um número ad hoc; converter para data real é decisão de modelagem, não está no protótipo. `pct` não é medição.
