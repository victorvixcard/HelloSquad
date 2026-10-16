# Notas de extração · Conversa e "Precisa de você" · Product UI V4.6

Fonte: extratos em `docs/parciais/x1/out/pui/` (HTML original `design/handoff-v4.6/product-ui/ProductUIV4.dc.html`). `(Lnnnn)` = linha do HTML original. Texto entre aspas = literal do código. Protótipo com roteiros de exemplo, sem IA real: nada é publicado, enviado ou investido (L9593, L5612 "Nada é publicado, enviado ou pago.").
IDs: coord=Nexo, arch=Bia, leaf=Kaia, pill=Otto, hex=Kiwi (ambiente `media`, rótulo "Growth" / "Growth Marketing", L11318-11319), funnel=Max (CRM), square=Íris. Ordem: `ORDER` (L5626).

## 0. Camadas e quem vence
| Camada | Linhas | Snapshot declarado nesta camada (guarda os métodos da camada anterior) |
|---|---|---|
| V3 (classe base) | L6408-9587 | `V3P` (L9713) = métodos V3 |
| V4 | L9589-10963 | `V4P` (L10969) |
| V4.1 | L10964-11309 | `V41P` (L11599) |
| V4.2 | L11310-11770 | `V42P` (L11875) |
| V4.3 | L11771-12217 | `V43P` (L12395) |
| V4.4 | L12218-12694 | `V44P` (L12926) |
| V4.5 | L12695-13840 | `V45P` (L13766, só renderVals) |
| V4.6 | L13841-13962 | `V46P` (L13860) |

Regra: `VxP` guarda os métodos da camada x antes de a seguinte sobrescrever (p.ex. `V41P`, declarado na V4.2, tem os métodos da V4.1). Quase todo override chama o anterior.
| Método | Definições (linha) | Final | Chama o anterior? |
|---|---|---|---|
| `_openConv` | V3 6519; V4 9770 | V4 | sim, `V3P.openConv`; antes zera `_cxTrig` |
| `_closeConv` | V3 6534; V4 9764 | V4 | sim, `V3P.closeConv`; depois devolve o foco |
| `_agentThread` | V3 6518; V4 9736 | V4 | não; ignora threads com `cx` |
| `_route` | V3 6606; V4 9871; V4.4 12492; V4.5 13394 | V4.5 | sim, em cadeia (`V44P.route`, `V43P.route`, `V3P.route`) |
| `_intent` | V3 6647; V4 9876 | V4 | sim, `V3P.intent` |
| `_act` | V3 7025; V4 9882; V4.2 11685; V4.3 11966; V4.4 12409; V4.5 13411 | V4.5 | sim, todos |
| `_cx` | V4 9772; V4.2 11652; V4.3 11932; V4.5 13295 | V4.5 | sim, `V44P.cx` |
| `_cxFallback` | V4 9935; V4.2 11755; V4.3 12019 | V4.3 | sim, `V42P.fallback` |
| `_cxRoute` | V4 9909; V4.5 13324 | V4.5 | sim, `V44P.cxRoute` |
| `_cxGo` | V4 9851; V4.3 12015; V4.5 13319 | V4.5 | sim |
| `_openCap` | V4.2 11658; V4.3 11938; V4.4 12404 | V4.4 | sim, `V43P.openCap` |
| `_capWork` / `_capAskWork` | V4.2 11719/11713; V4.3 11997/11979; V4.4 12430 (só `_capWork`) | V4.4 / V4.3 | `_capWork` V4.4 chama `V43P.capWork` |
| `_vConv` / `_vRail` | V3 8500/8551; V4 10891/10916; V4.1 11268/11280 | V4.1 | sim, `V4P.vConv` / `V4P.vRail` |
| `_vMsg` | V3 8597; V4 10928; V4.3 12028; V4.4 12507; V4.5 13709 | V4.5 | sim, em cadeia |
| `_vChats` | V3 9569; V4 10873; V4.2 11646 | V4.2 | sim |
| `_j3Start` | V3 6883; V4.5 13275 | V4.5 | não: passa a chamar `_d5Start('plan', ...)` |
| `_vNd5` (faixa) | V4.5 13822; V4.6 13864 | V4.6 | sim, `V46P.vNd5` |
| `_needs` | só V3 8033 | V3 | sem override |

## A. CONVERSA

### A1. Tipos de conversa (cada uma é uma "thread" em `state.th`)
| Tipo | Id da thread | Como nasce | Observações |
|---|---|---|---|
| Sala do Squad | `squad` (`room: true`, `ag: 'coord'`) | item "Sala do Squad" da barra (L10532); Início com os 7 selecionados (L7063); "Abrir a Sala do Squad" (template L4724); `_needGo` de pergunta/conceito | título "Sala do Squad"; subtítulo = `topic` ou "Pedidos grandes" (L8523); `peopleN` "7 especialistas"; status "todos os especialistas · o Nexo coordena" (L8511); placeholder "Escreva para o squad…" (L8543); dica "O Nexo distribui para quem precisa" (L8546). Quem fala: Nexo; os demais entram na conversa |
| Conversa direta com um especialista | `coord`,`arch`,`leaf`,`pill`,`hex`,`funnel`,`square`; `ident` (Kaia, "Identidade da Miolo"); `n<base36>` (nova) | Início com 1 selecionado (L7064); botões "Conversar com X"; `_openAgent` (L6532) | placeholder "Mensagem para a Kaia…" (PARA(ag), L8543); dica "Conversa direta com a Kaia" (COM(ag), L8546); papel = nome do ambiente (`ENVN`, L10894) |
| Conversa em grupo (2 a 6) | `g-<ids em ORDER>` (L7131) | Início com 2 a 6 selecionados (`_groupThread`, L7130) | título `EA(G)`; nota "Conversa em grupo demonstrativa: aqui, responde um especialista por vez." (L7136); dica "Conversa em grupo · demonstração: responde um especialista por vez" (L8546); placeholder "Escreva para …" |
| Contextual por objeto (V4+) | `x-<kind>-<id>` (`key = kind + '-' + id`, L9774) | `_openCtx(kind, id, opt)` (L9831): botões "Conversar com X sobre …", "Analisar com Íris" etc. | uma thread por objeto; ver tabela abaixo |
| Pedido do catálogo | `x-cap-<id>` ou `x-cap-<id>-<n>` (L11935) | `_openCap` (botão "O que pedir à/ao X" ou item do catálogo) | tipo "Pedido" ou "Conversa sobre" quando `hid` (L11936); ver A11 |
| Delegação (Modo Autônomo) | `x-d5-<n>` (L13148) | `_d5Start` / `_setupStart` (L13276) | `cx.kind='resp'`, id "new" |
| Entrega em contexto (V3) | reaproveita a thread da Kaia (`post.tid`) ou `squad` | "Conversar com a Kaia" na página do post (L9165); "Pedir ajuste" (L6761); "Conversar na Sala do Squad" (L9213) | não cria thread nova: guarda `cv.ctx = {l, ag, w}`; faixa "Sobre" + "Remover o contexto" (template L5522) |

Objetos que abrem conversa contextual (`cx.kind`, rótulo `cx.type`):
- `env` "Ambiente" (L9777); `proj` "Projeto" (L9783); `pjcard` "Resumo" com ids `needs` "Precisa de você" / `working` "Seu Squad está trabalhando" / `next` "Próximos marcos" (L9788-9789).
- `post` (calendário): "Publicação", "Plano semanal", "Data da campanha", "Espaço no calendário" (L9796); `kpi` "Indicador" (L9803-9806); `chan` "Canal" (L9814); `an` "Análise da Íris" (L9820); `opp` "Oportunidade" (L9825).
- `cap` "Pedido" / "Conversa sobre" (V4.3 L11936); `mem` "Conhecimento" (L13301); `resp` "Responsabilidade" e "Nova responsabilidade" (L13308, L13313).
- Kiwi, Bia e Max têm conversas sobre objetos (`hid: true`), p.ex. `gx-teste` "Teste perto da loja" (L11800), buscas, testes, hipóteses (L11798-11845); as da Bia/Max em L12250, L12298.

### A2. Modelo de dados (referência para o backend)
Thread `state.th[id]` (V3 `mk`, L6277): `{ id, t (título), ag (agente dono), room (bool), topic, msgs[], input (rascunho), unread (int), at (rótulo "08:40" | "hoje" | "23/09" | "agora"), act (bool: aparece no histórico) }`.
Extras por camada: `group[]` (ids; L7135) · `cx` (objeto de contexto) · `part[]` (participantes; começa `[cx.ag]`) · `sugFrom` (índice a partir do qual mensagem do usuário esconde as sugestões; 99 em pedidos) · `capSt` (`brief`|`confirm`|`adj`|`created`|`done`) · `capPick` · `d5` `{step: pick|q|sum|done, tpl, cfg, qi, edit, fix, rid}`.
Mensagem (`M`, L6265-6270; id `m<n>`): `day {k:'day', t}` · `note {k:'note', t, sim}` · `u {k:'u', t, at, atts[nomes]}` · `a {k:'a', f (agente autor), t, at, card}` · `sys {k:'sys', t, ags[]}`.
Cartão (`msg.card.type`): `choices` `{opts:[{l, act}], picked}` · `adj` `{picked, snap}` · `work {wid}` · `mat {vi}` · `team` · `concept {which: a|b, st: pending|approved|other}` · `proposal {st: pending|active|adjust}` · `pub {st: pending|yes|no}` · `kpi {per}` · `kpi1 {k, per}` · `pill` · `brand` · `pieces` · `budget` · `opts {cid, items[], picked}` · `story {cid, pk}` · `alt {p, l}` · `wreq {cap, n, st: pending|created|adj, wid}` · `bdoc {wid}` · `msgs {st: pending|ok|adj}` · `send` · `d5sum {tpl, cfg, edit, st: pending|adjust|done}` · `m5pc` · `m5learn {id}` · `m5plan {wid, used, skipped, open}`.
Ação de botão (`act`, "verbo:valor"): `open:<wid>` · `go:<tela>` · `say:<texto>` · `camp:<o site|a loja|os dois>` · `rot:<vol|day|auto>` · `adj:<chave>` · `obj:<texto>` · `j1:` · `auto:<tpl>` · `th:<tid>` · `mem:<aba>` · `rec:<id>` · `ask:<ag>:<texto>` · `noop:` · `v4:<...>` · `cx:<kind>:<id>[@período]` · `cap:o|w|adj|again:...` · `crm:seg:<id>` · `d5:`/`m5:`/`a5:` (L7025-7048, L9882, L11685, L11966, L12409, L13411).
Estado global da conversa: `cv {mode: 'off'|'panel'|'full', to: tid, ctx: {l, ag, w}|null, rail: bool}` (L6337) · `rec[]` (tids por recência) · `typing {to, ag}|null` · `stat[tid] {kind: work|wait|done|live|idle, lead, cos[], m, d, time}` · `att {home[], conv[]}` com item `{id, k, t, d}` · `chats {q, ag}` · `capRun {idCap: n}` · `capSeq` · `extraW[]` (trabalhos criados) · `toast` · `flash`.
`cx` (objeto de contexto, L9774): `{ ws ("Miolo · <lugar>"), kind, id, key, ag, env, type, name, meta, sig (assinatura: muda → "Contexto atualizado"), filters, period, p (peça), big, bigD, bigUp, ic, sug[], first, firstCard, kpi, cal, w, sub, run, wid }`.
Relógio: `now()` devolve "HH:MM" fictício a partir de 10:25, +1 min por chamada (L6404-6405).

### A3. Abrir, fechar, expandir, retomar
- Modos: `off` | `panel` (à direita) | `full` (L6526; `convW`: full = área toda, panel = 380 px se vw ≥ 1360, senão 364, L10444). Nos ambientes-piloto o painel abre por cima da página quando espremeria o conteúdo (L10447).
- `_openConv(tid, {mode, prefill, ctx})`: `unread = 0`; modo padrão `full`; mantém `ctx` se já for a mesma thread; fecha popover e guia; foca o campo após 420 ms (L6533).
- `_openCtx` / `_openCap` abrem em `panel` se `vw >= 1080` e o modo atual não for `full`; senão `full` (L9841, L11951). `_openThread` idem (L12449).
- Botões do cabeçalho (template L5515-5518): "Mostrar o contexto" (title "Contexto", só se `canRail`), "Expandir a conversa" (title "Expandir", só em panel → `_expandConv`), "Abrir ao lado da tela" (title "Abrir ao lado", só em full → `_collapseConv`), "Fechar a conversa" (title "Fechar" → `_closeCtx` → `_closeConv`, `mode:'off'`).
- Esc (V4, L9747-9758): com popover aberto, fecha o popover; em `panel`, fecha a conversa e devolve o foco ao elemento que a abriu (`_cxTrig`, após 60 ms, L9767); em `full` não fecha. Depois, o tratador V3 (L6427-6440).
- Retomar: `_openCtx` usa `tid = 'x-' + cx.key`. Se a thread existe, reabre a mesma (histórico intacto, `unread = 0`); se `cx.sig` mudou, empurra `sys` "Contexto atualizado: <meta>" e nova primeira mensagem (820 ms) (L9846). Se é nova, cria `msgs:[day('Hoje')]` e a primeira mensagem do especialista (720 ms) (L9845).
- Pedido concluído não reabre: novo pedido da mesma capacidade vira outra thread `…-<n+1>` e outro trabalho (L11943-11944); abre com "Mais um, separado do anterior. " + pergunta (L11959).
- Não lida: `_push` soma 1 se a thread não está aberta (L6555); toast se o usuário está fora dela (`_notifyIfAway`, L6591); ponto na barra (`udot`).

### A4. Cartão de contexto
Não há cartão na linha de mensagens; o contexto aparece em três lugares:
1. Cabeçalho: "Conversando sobre" + botão com `cx.name` (template L5506); aria/title = `goL`: "Ver no calendário" (post), "Ver no roadmap" (proj), "Ver <Ambiente>" (env, pjcard, opp), senão "Ver em Resultados" (L10901; vale também para cap/mem/resp, ver C).
2. Faixa de período (L5521): `updT` "A página está em outro período." (L11274) + botão `"Atualizar para " + período` (L10900), só para kpi/chan fora do período da página.
3. Coluna lateral `<aside>` "Contexto da conversa" (template L5571; só em `full` com largura ≥ 940 e `cv.rail`, L8508-8509). Kicker `kind`: "Contexto da conversa" (L10923). Título `cx.name`, subtítulo `cx.meta`. Campos (L10920-10922): "Ambiente" · "Tipo" · "Período" (só se há) · "Negócio" · "Origem" (= `cx.filters`, p.ex. "Calendário · semana", "Resultados · mês"). Pessoas: "responde · <Ambiente>" e "participa · <Ambiente>" (L10925). Ação: "Voltar para <Ambiente>" (L10926). Sem `cx` (V3): kinds "Entrega em contexto", "Projeto em contexto", "Conversa em grupo", "Sala do Squad", "Indicador em contexto", "Resultados", "Modo Autônomo", "Trabalho em contexto", "Especialista" (L8558-8595).
Faixa "Sobre" (V3, template L5522) só quando há `cv.ctx` sem `cx`.
O `cx` calculado em `_vConv` (k, m, ws, big…) é pouco usado: o template só lê `n`, `go`, `goL`, `hasUpd`, `upd`, `updT`, `updGo`. Campo `cxWho` ("Conversa sobre esta publicação"…, L10907) não é renderizado.
Sugestões: rótulo "Pergunte à Kaia"/"Pergunte ao Nexo" (L11276); somem após a 1ª mensagem do usuário (L10912).

### A5. Histórico e "Nova conversa"
- Página "Minha Equipe & Conversas" (template L4724), aba "Conversas" com contagem e ponto de não lida (L10884); subtítulo "Tudo o que você conversou com o squad, por assunto e por contexto." (L10885). Busca "Buscar conversas"; filtros: Sala do Squad + 7 avatares (L9581); vazio "Nenhuma conversa com esse filtro." + "Limpar filtros" (template L4761).
- Linhas (V3 L9574-9577): título (`t`, ou "Sala do Squad" + " · " + tópico), `who`, última mensagem ("Você: " / "<Nome>: " + texto, ou "enviou um material"), hora, ponto não lida. Só threads com `act` ou `room`. `who` (V4 L10875): "<Nome> · <Ambiente>" + " · sobre uma publicação|um projeto|um indicador|o ambiente|um contexto"; para pedidos "pedido: <nome>" (V4.2 L11648).
- Clique na linha: `_openConv(id, {mode:'full'})`.
- "Nova conversa": no seletor de threads do cabeçalho (só conversa direta sem `cx`, L10896) o botão "Nova conversa" (template L5507) chama `_newThread(ag)` (L6537): id `n<base36>`, título "Nova conversa", `at:'agora'`, `act:false`, vai ao topo de `rec`, `ctx:null`. Na 1ª mensagem do usuário o título vira o texto (corta em 32 + "…" se > 34, L6600) e `act` vira true (`_bump`). O cabeçalho do seletor renderiza `Conversas {newL}` com `newL = 'Nova conversa ' + COM(ag)` (L8531), isto é, "Conversas Nova conversa com a Kaia".
- Lista do seletor = threads do mesmo especialista com `act` (ou a atual), inclusive as contextuais (L8512).

### A6. Primeiras mensagens do especialista
- Conta em uso (L6286-6326): seeds por thread, p.ex. Nexo (L6299) "Bom dia, Marina. Hoje tem uma decisão sua: a v2 do post do Dia do Pão. A campanha de Natal segue no prazo e o Otto fecha o plano da semana 43 na quinta." com "Revisar o post" (`open:w-post`) e "Ver a campanha" (`open:w-camp`). Títulos em `TH_META` (L6250-6259). `rec` inicial: leaf, squad, pill, square, ident, arch, coord, hex, funnel.
- Primeiro acesso (L6279-6284): Nexo (t "Boas-vindas", não lida): "Oi, Marina. Eu sou o Nexo e coordeno o squad da Miolo. Você pode pedir qualquer coisa por aqui ou falar direto com um especialista. Para começar: qual é o objetivo mais importante da Miolo agora?" com "Vender mais encomendas", "Trazer gente nova para a loja", "Fortalecer a marca" (`obj:`). Sala: "Esta é a Sala do Squad. Use para pedidos maiores, como uma campanha: eu organizo quem entra, cada especialista contribui na sua parte e eu te chamo quando a decisão for sua." Cada especialista (t "Apresentação"): `AG.hi + ' ' + frase` + 2 primeiras `asks`; Kaia: "Oi, eu sou a Kaia. Me diga o que precisa e eu crio com a cara da Miolo." (L6282).
- `_newThread`: `AG.hi + ' ' + AG.pitch + ' O que você precisa?'` + todas as `asks` (L6542).
- Contextual: `cx.first` (+ `firstCard`): ambiente (`_cxEnvFirst`, L10195: Nexo "Hoje tem uma decisão sua: …"; Otto "Esta semana tem três publicações…"; Íris; demais `AG.hi + _longNow + ' O que você precisa?'`), projeto (`_pjFirst`, L10212), resumo (`_pjCardFirst`, L10215), post do calendário (`_ctFirst`, L10232), indicador/canal/análise/oportunidade (L9804-9827), conhecimento (L13303), responsabilidade (L13315). Pedido: `C.q` + opções (L11673).

### A7. Como o agente responde
Fluxo: `_send` (L6593) → `M.u(texto, hora, nomes dos anexos)` → limpa `att[w]` → `_bump` → `_route`. Vazio sem anexo não envia.
Cadeia de `_route` (topo vence): V4.5 (L13394): Kaia + "preço" → `_m5Price`; delegação em curso (`d5`) casa texto com a pergunta atual · V4.4 (L12492): Max + "não compraram há 60 dias…" → "Criar a reativação" / "Ver o público"; Bia + "posicionamento" → `CAPX['bx-pos'].q` · V4 (L9871): thread com `cx`, sem anexo, e `_cxIntent` reconhece (cap, alt, story, more, appr, left, next, now, who, camp, why, improve, when, plan, slot; L9891) → `_cxRoute` → `_ctReply`/`_pjReply`/`_rsReply`/`_oppReply`/`_m5Reply`/`_a5Reply` · V3 (L6606): grupo → `_routeGroup`; "post|peça|arte" + "pão|mundial|fornada|sexta" → Jornada 1 (se não é a Kaia, passa o pedido a ela: "Isso a Kaia resolve direto, sem reunir o squad. Passei o seu pedido para ela."); na thread do post em revisão: "aprov|perfeit|pode seguir|está ótimo|fechado" → aprova, senão ajuste (`_adjFromText`); "campanha" → Sala do Squad (Jornada 2); "toda semana|semanal|…" → Nexo (Jornada 3); senão `_intent`.
`_intent` (L6647): anexo; Íris (indicadores); Bia (promoção, crescer/Natal, clientes); Kiwi (anúncios: card `budget`); Max (reativação); Otto (Instagram, plano); Nexo (organizar, promoção, lançamento, "precisa/resumo", "sabem/memória"); Kaia (identidade, post). Em thread `cx` (não `env`) vai direto a `_cxFallback`.
Resposta-padrão para texto livre fora do roteiro:
- Conversa comum (L6727-6728): "Anotei" + ", sobre <ctx.l>" + ". Neste protótipo eu respondo a alguns roteiros de exemplo. Experimente:" + 2 primeiras `asks` do especialista (`say:`), 1000 ms.
- Contextual (L9942): "Anotei, sobre “<cx.name>”. Neste protótipo eu respondo a alguns roteiros de exemplo; experimente um destes:" + até 3 `cx.sug`, 1000 ms.
- Pedido (V4.2/V4.3, L11759-11767, L12023): anexo "Recebi. Guardei junto com o pedido “<k>” e já considero no que vou preparar." · em `brief`: "Anotei. Para eu começar do jeito certo, me ajuda a escolher um destes caminhos?" · em `adj`/`confirm`: "Anotado: “<texto 80>”. Ajustei o pedido com isso." e reabre a confirmação · senão "Anotado. Levo isso em conta no pedido “<k>” e te aviso quando tiver novidade."
- Anexo: "Recebi o anexo" + ", sobre <ctx.l>" + ". " + ("Vou usar como referência visual." só para a Kaia | "Vou considerar no que estou preparando.") + " Ele fica guardado com a conversa." (L6650); contextual: "Recebi o anexo e guardei junto com “<cx.name>”. Vou considerar no que estou preparando." (L9937).
- Grupo (L5876-5884, L7141): `GKEYS` por regex; responde quem tem mais ocorrências; empate/nenhuma → Nexo se participa, senão o 1º. `@Nome` não é interpretado: "Chamar" só preenche o campo com "@<Nome> " (L8514).
Tempos de "digitando" (`_say`, L6576): `typing = {to, ag}` por `delay` ms (padrão 1100); depois empurra a mensagem. Visível como "<Nome> está escrevendo" + pontos (L8540, template L5567) e status "escrevendo…" (L8511). Valores usados: 700-900 confirmações curtas; 1000 padrão fora de roteiro; 1100-1300 respostas de roteiro e cartão `pub` (1200, L6800); 1400 conceito (L6845); 1600 proposta (L6892); 2200 "outra direção" (L6875); 2400 documento da Bia (L12437); 720/820 primeira mensagem contextual (L9845-9846). Jornada 1: digita 1200 ms; v1 chega 4600 ms depois (L6748); ajuste: 800 ms + v(n+1) em 3800 ms (L6788). Só existe um `typing` global.

### A8. Colaboração entre agentes na mesma conversa
- `_cxJoin(tid, ags, by)` (L9862): acrescenta a `part` e empurra `sys`: `DAC(by) + ' chamou ' + EL(DA…) + ' para esta conversa'` (avatares `ags`). Depois o convidado fala com `_say` (`jt`/`jby`, L11700-11701; p.ex. "Aqui é a Bia. …"). Catálogo: `j0` entram ao abrir (300 ms, L11957), `j` por opção.
- Cabeçalho: avatares pequenos dos participantes e "com Kaia e Otto" (`cxWith`, L11273); coluna lateral mostra "responde" × "participa".
- Sala do Squad: `sys` "O Nexo chamou a Bia, a Kaia, o Otto e o Kiwi" (L6838); botões do popover de pessoas "Chamar" / "Conversar" (template L5509) e "Chamar alguém" (L5595). Grupo: `sys` "Conversa em grupo com <nomes>" (L7136).
- Nenhum trabalho é duplicado: o convidado age na mesma thread (rodapé do catálogo: "Quando o pedido envolve outra especialidade, <o Nexo> chama quem precisa na mesma conversa.", L11896).

### A9. Cartões dentro da conversa (rótulos do template L5538-5561 e da `_vMsg`)
| Tipo | Conteúdo / botões |
|---|---|
| `work` | kicker "Projeto criado · Sala do Squad" ou "Trabalho criado · entrega pontual" (L8607); link "Abrir" |
| `mat` (peça) | "Material · v{n}"; estados "Aguarda sua aprovação" / "Aprovada por você" / "Nova versão a caminho" / "Substituída pela v{n+1}" (L8615); botões "Aprovar v{n}" (L8616) e "Pedir ajuste" |
| `choices` / `adj` | botões `ps-choice`; ao escolher, todos ficam desabilitados e o escolhido marcado; `adj` lista os ajustes ainda não usados (`ADJ_ORDER`, L5789): "Deixar a data mais visível", "Título mais curto", "Fundo verde da Miolo", "Destacar a fornada de sábado" (L5784-5787). "Outra abordagem" (L9637) só entra por `v4:abord`, no fluxo do Otto/Kaia (L9947) |
| `team` | "Squad da campanha · o Nexo coordena"; link "Abrir o projeto" |
| `concept` | aspas do conceito; "Aprovar conceito" / "Outra direção"; resolvido: "Conceito aprovado por você" / "Você pediu outra direção" (L8629) |
| `proposal` | "Modo Autônomo · planejamento semanal"; "Faz sozinho / Pede sua aprovação / Nunca faz"; "Ativar" / "Ajustar"; link "Configurar em detalhe no Modo Autônomo" |
| `pub` | "Autorizar publicação" / "Agora não"; texto "Publicar o post aprovado com a legenda do Otto."; fatos "Onde Instagram · feed", "Quando sex, 16/10 · 9h", "Custo sem custo" (L8640) |
| `kpi`, `kpi1` | 3 indicadores com "dados ilustrativos"; um indicador com sparkline |
| `bdoc` (documento) | "Diagnóstico · v1 · para a sua leitura", "Diagnóstico da Miolo", link "Abrir o diagnóstico" (L12511) |
| `msgs` | "Mensagem 1 · Dia 0", "Mensagem 2 · Dia 5 · só para quem não comprou"; "Aprovar as mensagens" / "Pedir ajuste"; depois "Mensagens aprovadas · isso não autoriza o envio" (template L5556) |
| `send` | "Autorização de envio" com 4 checagens: "Mensagens aprovadas" (por você, hoje), "Público com consentimento" (23 de 138 inativos), "Canal de envio" (e-mail conectado (simulação) / e-mail não conectado), "Sua autorização de envio" (pendente / autorizado para seg, 19/10, 9h); botões "Conectar o e-mail (simulação)", "Autorizar envio para seg, 19/10, 9h"; avisos "Sem canal conectado, não há envio." e "Programada · simulação, nada é enviado" (L12520-12522) |
| `wreq` | ver A11 |
| `d5sum` | "Responsabilidade" ou "Mudança no combinado"; linhas Responsável, Colaboração, Coordenação, Frequência, Entrega, Aprovação, Primeira execução / "Vale a partir de"; "Faz sozinho", "Só com a sua autorização", "Nunca"; "Confirmar a delegação" (ou "Confirmar a mudança") / "Ajustar"; final "Delegado · ativo no Modo Autônomo" e "Ver no Modo Autônomo" (L13720-13724) |
| `opts`, `story`, `alt`, `budget` | legendas "Usar esta"/"Escolhida"; "Rascunho em 9:16 · nada é publicado sem você"; "Só um rascunho: a peça só muda com a sua aprovação."; "Proposta de teste" + tag "sem verba liberada", "Teto sugerido R$ 40 por dia" (L8652) |
| `pill`, `brand`, `pieces`, `m5pc`, `m5learn`, `m5plan` | pílula do Modo Autônomo; paleta ("Ver em Minha marca"); "Peças de Natal · 3 de 5"; antes/agora; "Memória da Marca · sugestão"; plano com "Abrir o plano" e "Aprovar o plano" |

### A10. Anexos
Botão "Anexar" (aria/title) abre menu "Anexar à conversa" com `attItems`: "Foto ou vídeo", "Arquivo", "Da Memória da Marca", "Peça da Biblioteca" (L10478). Simulados (`_attach`, L7052): `foto-fornada-sabado.jpg` (2,1 MB), `cardapio-outubro.pdf` (340 KB), `Tom de voz` (Memória da Marca), `Fornada de segunda` (Biblioteca). Um por tipo (repetir substitui). Chip com botão "Remover anexo". Pode enviar só anexo (L6598). Na bolha do usuário só vão os nomes. Anexo no Início passa para a conversa em `_homeSend` (L7069). Com anexo, o roteiro não trata como ajuste de peça nem como roteiro de contexto: responde "Recebi o anexo…".

### A11. Como um pedido vira trabalho
1. Entrega pontual (post): pedido à Kaia (ou texto sobre post) → Jornada 1 (L6733): cartão `work` "Trabalho criado · entrega pontual"; estado `post {st:'making'}`; trabalho `w-post` kind "Entrega", líder Kaia, com Otto; origem "pedido na conversa com a Kaia · 10/10" (L9164); `_works` (L8008-8015): "Kaia criando a primeira versão" / "Em andamento"; v1 → "v{n} aguarda sua aprovação" / "Aguarda você".
2. Projeto (campanha): "campanha" → Sala do Squad (L6820-6829): Nexo pergunta "site, loja ou os dois" (botões "Pelo site", "Na loja", "Nos dois"); monta o squad; toast "Projeto criado: Campanha de Natal"; cartão `work` "Projeto criado · Sala do Squad"; `w-camp` kind "Projeto". Bia propõe conceito.
3. Rotina: V4.5 em diante o pedido semanal abre a delegação `d5` (cartão `d5sum`, "Confirmar a delegação"); cria responsabilidade ativa no Modo Autônomo, não um trabalho (L13223-13245).
4. Catálogo (V4.2-V4.4): escolha de opção `cap:o:<id>:<i>` → resposta com `r` → `_capAskWork` (L11979): Especialista "Antes de começar, confere o trabalho:" + cartão `wreq` (kicker "Confirmar o trabalho"; relação "Projeto novo" | "Entrega pontual" | "Trabalho do projeto <nome>"; campos Responsável, Com, "Próximo passo", Prazo; botões "Criar o trabalho" / "Ajustar", template L5554).
   - "Criar o trabalho" → `_capWork` (L11997): cria `extraW` `{ id 'w-c<seq>', capId, tid, title, kind ('Projeto' se projeto novo, senão 'Entrega'), tag ('projeto' | 'entrega pontual' | 'trabalho do projeto'), rel, proj/projL, lead, co[], g:'and', status '<Líder> preparando', state 'Em andamento', stateD 'novo', due, pct 8, isNew, origin ('pedido em <Ambiente> · <k> · hoje' ou 'conversa sobre <k> · hoje' se `hid`), sum, next ('<passo>, até <prazo>.'), doc {k '<k> · em produção'}, hist [Você pediu…, "Você confirmou o trabalho", "<Líder> assumiu o trabalho, com …"] }`. Thread: `capSt:'created'`, `cx.wid`. Mensagem do líder: "Pronto. Está em Projetos, dentro de <projeto>." (ou "Está em Projetos, em Todos os trabalhos.") + " Te chamo quando tiver a primeira versão." + botão "Fazer outro pedido assim" (ou rótulo próprio `CAP_AGAIN`; `cap:again:` abre nova thread). Toast "Trabalho criado · <título>". Cartão vira "Trabalho criado" com "Abrir o trabalho" e "Ver o projeto".
   - "Ajustar" → cartão "Ajustando o pedido"; especialista: "Claro. Me diga aqui o que mudar (prazo, projeto, formato) e eu ajusto antes de criar." (L11995); o texto livre reabre a confirmação.
   - V4.2 usava "Criar o trabalho"/"Ajustar o pedido" em `choices` (L11717) e `sys` "Trabalho criado: …" (L11730); a V4.3 substituiu por `wreq`.
   - Pedidos de Bia e Max seguem depois da confirmação: diagnóstico (`bdoc` após 1200 ms + 2400 ms, status "v1 aguarda a sua leitura") e reativação (`msgs`) (L12430-12445).

## B. "Precisa de você"

### B1. Tipos e rótulos (V4.5 `NDK5`, L13765; fonte do tipo: `NK` L13771)
| Chave | Rótulo exato | Origem (kind em `_needs`) |
|---|---|---|
| `review` | "Para você revisar" | `post` (peça em revisão); Bia (plano, diagnóstico); Kaia |
| `approve` | "Para você aprovar" | `concept`; plano da semana 43; mensagens da reativação; itens `appr` do Modo Autônomo |
| `auth` | "Para você autorizar" | `pub` (publicação); teste de anúncios; envio da reativação |
| `decide` | "Para você decidir" | só o padrão quando o tipo não está mapeado (L13774, L13813) |
| `confirm` | "Para você confirmar" | `rot` (combinado); Memória; Íris (hipótese) |
| `answer` | "Para você responder" | `campask` (pergunta do Nexo) |
| `fix` | "Para você reconectar" | Google Perfil expirado |
| `next` | "Em seguida" | não depende de você ainda |

Nota: os tipos não têm botão próprio; o botão de cada linha é sempre o `l` do item (B4).

### B2. De onde vem e onde aparece
`_needs(s)` (V3 L8033, sem override) devolve até 5 decisões: `post` (revisar), `pub` (decidir publicação), `campask` (responder), `concept` (revisar conceito), `rot` (combinado). `_needGo` (L8457): `campask`/`concept` → Sala do Squad em `full`; `rot` → thread com o cartão `proposal`; demais → `_openWork('w-post')`.
| Lugar | O que mostra |
|---|---|
| Início (V3, não tocado pela V4.6, L13845) | Cartão "Trabalhos": linha "N aguarda você" / "N aguardam você" (L8365) e ponto; ao abrir, "Hoje, uma decisão é sua" / "Hoje, <número por extenso> decisões são suas" (L8368); até 3 itens (L8369); botão = 1ª palavra do `cta` ("Revisar", "Decidir", "Responder"); título sem trocar o nome ("Post do Dia do Pão · v2"). Sem faixa |
| Barra lateral | Selo no item "Projetos" = nº de decisões; dica "N aguarda você" / "N aguardam você" (L10534) |
| Projetos | Faixa (`nd`) com as globais + "Em seguida" (marco seguinte que é seu); no roadmap, botão do projeto = `need.cta` (L10657) ao lado de "Conversar com Nexo sobre este projeto"; coluna "Precisa de você" / "Nenhuma decisão pendente" no quadro de todos os trabalhos (L8875); resumo `pjcard needs` conversa com o Nexo |
| Conteúdo (Otto) | `post`→ título "Peça de sexta: Dia Mundial do Pão", subtítulo "A publicação de sex, 16/10, 9h, depende da sua aprovação da v{n}", botão "Revisar a peça" (L13793); `pub`; `rot`; "Plano da semana 43" (approve, "Revisar o plano") |
| Marca & Criação (Kaia) | `review` "Post do Dia Mundial do Pão · v{n}", botão "Revisar e aprovar a v{n}" (L12123, L13790) |
| Estratégia (Bia) | `review` "Plano de marketing · outubro a dezembro" / "A v2 está pronta: as prioridades mudaram com o Natal." / "Revisar o plano" (L12559, L13784); `review` "Diagnóstico da Miolo · v1" / "A Bia entregou a leitura do negócio. Aprovar não cria trabalhos." / "Ler o diagnóstico" (L13786) |
| Growth (Kiwi) | `auth` "Teste de anúncios perto da loja" / "Até R$ 40 por dia, 7 dias. Nada é investido sem a sua autorização." / "Ver a proposta" (L13798); `fix` "Google Perfil" / "A consulta das buscas falhou hoje: o acesso expirou" / "Reconectar (simulação)" (L13799); `next` "Plano de anúncios de Natal" / "Chega em 20/10. A verba será decisão sua." / "Conversar sobre o plano" (L13800) |
| CRM (Max) | `approve` "Mensagens da reativação" / "O Otto escreveu duas mensagens para 23 clientes · aprovar não envia" / "Revisar as mensagens" (L13804); `auth` "Envio da reativação" / "23 contatos com consentimento · seg, 19/10, 9h" ou "Mensagens aprovadas · falta conectar o e-mail para poder autorizar" / "Ver a autorização" (L13805) |
| Resultados (Íris) | `confirm` "<hipótese>?" / "A Íris observou na planilha de encomendas · só vira orientação com o seu ok" / "Ver na Memória" (L13809) |
| Modo Autônomo | itens `appr`→approve "Revisar o plano" / "Revisar a peça"; `auth`→"Decidir" ("Publicação de sexta": "…a peça foi aprovada; publicar é outra autorização", L13521); `fix`→"Reconectar (simulação)"; `mem`→confirm "Ver na Memória" (L13519-13524, mapa L13812) |
| Memória da Marca | `confirm` "N sugestões, N em conflito e N desatualizado" / "Nada vira orientação do squad sem o seu ok." / "Revisar" (L13818); quem pede aparece como "Squad" (L13868) |
| Conversa | Nexo: "Hoje tem uma decisão sua: …" / "Hoje tem N decisões suas: …" (L10219); catálogo n-appr "Hoje uma coisa depende de você" … "Abra uma para decidir:" com botões `<cta>: <título>` (L11680); vazio "Nada depende de você agora. Quando algo precisar da sua decisão, aparece em “Precisa de você” e eu te chamo." (L11679) |

Itens globais (`_needs` L8035-8039 + subtítulos de faixa `SUB`, L13772-13773), com o agente que pede: `post` (Kaia) título "Post do Dia do Pão · v{n}" (a faixa troca por "Post do Dia Mundial do Pão"), subtítulo "primeira versão" ou "<ajuste>, como você pediu" (faixa: "Kaia ajustou: …" + " · sai sex, 16/10, 9h, se você aprovar"); `pub` (Otto) "Publicação do post" / "v{n} aprovada · o Otto pode publicar sex, 9h" (faixa: "v2 aprovada · o Otto pode publicar sex, 16/10, 9h"); `campask` (Nexo) "Uma pergunta do Nexo" / "Campanha de Natal · site, loja ou os dois?"; `concept` (Bia) "Conceito da campanha" / "Campanha de Natal · proposta da Bia" (faixa: "Campanha de Natal · a produção começa depois do seu ok"); `rot` (Nexo) "Combinado do planejamento" / "Modo Autônomo · aguarda sua confirmação".

### B3. A faixa (V4.5 L13760-13831; V4.6 L13863-13873; template L4776, L4920, L5110, L5199, L5304, L5388, L5409, L5431, L5452)
- Está em: Projetos, Conteúdo, Modo Autônomo, Memória da Marca, Resultados, Marca & Criação, Growth, Estratégia, CRM. Não está no Início.
- Regras (comentários L13761-13763, L13824): faixa horizontal logo abaixo do cabeçalho; uma pendência por faixa (a primeira aparece, as demais abrem abaixo, no mesmo formato); "Sem pendência, sem faixa"; "em seguida" nunca abre a faixa sozinho; ordem: o que é agora, depois `next`.
- Cada linha: rosto do agente + `<Nome>` (V4.6, L13869) + " · " + rótulo (B1), título, subtítulo, botão com seta (`l`). Acessibilidade: `aria-label` da seção = "Precisa de você" + (": N" se há itens agora) (L13831); linha = "<Nome> · <Rótulo>: <título>. <botão>". O texto "Precisa de você" não é impresso por nenhuma linha do template; título visível pode vir do CSS (fora dos extratos).
- "+N": botão `'+' + restantes` (L13828); aberto vira "Fechar"; aria "Ver mais N pendência(s)" / "Recolher as outras pendências" (L13830). Estado em `x41['nd-<view>']`. Classe `is-tight` em Modo Autônomo e Memória.
- Cor do ponto por agente: `NDC5` (L13764); V4.6 acrescenta nome e rosto "não só a cor" (L13863).

### B4. Botões por tipo (rótulo = `l` do item)
review: "Revisar entrega" (L8035), "Revisar a peça", "Revisar e aprovar a v{n}", "Revisar o plano", "Ler o diagnóstico". approve: "Revisar conceito" (L8038), "Revisar o plano", "Revisar as mensagens". auth: "Decidir publicação" (L8036), "Ver a proposta", "Ver a autorização", "Decidir". confirm: "Revisar combinado" (L8039), "Ver na Memória", "Revisar". answer: "Responder" (L8037). fix: "Reconectar (simulação)". next: "Ver no roadmap" (L13781), "Conversar sobre o plano". Os botões da faixa levam ao objeto (trabalho, conversa, documento, Memória) e não decidem por você; exceções: "Reconectar (simulação)" executa a reconexão simulada (L13079, L13799) e o "Revisar" da Memória só rola a página até `#me-pend` (L13818).

### B5. O que acontece ao aprovar, rejeitar ou pedir ajuste
| Decisão | Aprovar / autorizar | Rejeitar / pedir ajuste |
|---|---|---|
| Peça do post (página do trabalho, cartão `mat`, coluna lateral) | "Aprovar v{n}" (L9185, L8616): `post {st:'approved', pub:'ask'}`, nota "Você aprovou a v{n} · hh:mm", status "v{n} aprovada", toast "v{n} aprovada. A Kaia foi avisada." (L6799). Gera nova pendência `pub` | "Pedir ajuste" (L5539, L5012): abre a conversa com a Kaia (ctx do post), usuário "Quero pedir um ajuste nesta versão.", Kaia "Claro. O que você quer mudar? Eu mudo só isso e mantenho o resto." + `adj`. Escolhido o ajuste: "Mudo só <o quê>. O resto fica igual."; a v{n+1} chega em 3800 ms e volta como pendência. Texto livre também ajusta |
| Publicação (`pub`) | "Autorizar publicação" (template L5015, L5544): `pub:'yes'`, status "publicação agendada" sex 9h, Kaia "Combinado: o Otto agendou para sexta, às 9h, com a legenda dele. Ele te avisa quando o Instagram confirmar.", toast "Publicação agendada · simulação" | "Agora não": `pub:'no'`; "Sem problema. A peça fica pronta em Trabalhos; você autoriza a publicação quando quiser."; página: "Publicação ainda não autorizada." + "Decidir agora" (volta a `ask`) |
| Conceito da campanha | "Aprovar conceito" (template L5542; ação L6855): `camp.st='production'`; nota "Você aprovou o conceito · hh:mm"; toast "Conceito aprovado. Kaia e Otto começaram."; Nexo "…a revisão das peças fica para quinta, 15/10. Nenhuma verba é usada sem a sua autorização." | "Outra direção": usuário "Quero ver outra direção."; Bia propõe o conceito B em 2200 ms |
| Pergunta do Nexo (`campask`) | opção "Pelo site" / "Na loja" / "Nos dois" → `_campWhere` | não há recusa |
| Combinado semanal (`rot`) | "Ativar" (template L5543; ação L8637) → `_rotActivate` (L6896). Na V4.5+ o fluxo é `d5sum`: "Confirmar a delegação" | "Ajustar": "Só posts, sem stories", "Receber o plano na sexta", "Publicar sozinho o que eu aprovar" (L6908); na `d5`, "O objetivo" / "A frequência" / "O que é entregue" / "As aprovações" (L13205) |
| Plano da semana 43 | "Aprovar o plano" (template L5561): `approved43`, trabalho "Concluído" / "Aprovado por você", toast "Plano da semana 43 aprovado. Nada é publicado sem a sua aprovação de cada post." (L13135) | não há botão de ajuste no cartão |
| Mensagens da reativação | "Aprovar as mensagens" / "Aprovar esta mensagem" (CRM): `reat:'approved'`, status "Mensagens aprovadas · envio não autorizado", Max "Mensagens aprovadas. Isso não autoriza o envio: para enviar, confira o que falta." (L12458) | "Pedir ajuste": Otto "Claro. Me diga aqui o que mudar em cada mensagem; a versão nova volta para a sua aprovação." (L12462) |
| Envio da reativação | "Autorizar envio para seg, 19/10, 9h" (só com e-mail conectado e mensagens aprovadas): `reat:'scheduled'`, "Programada para seg, 19/10, 9h (simulação)" (L12478-12483) | sem botão de recusa; sem canal: "Sem canal conectado, não há envio." |
| Bia: plano / diagnóstico | "Aprovar o direcionamento" / "Aprovar o diagnóstico" (L12604); toast "Direcionamento aprovado · o Nexo organiza a execução" / "Diagnóstico aprovado" | "Pedir ajuste" abre conversa com a Bia (cap `bx-plan` / `bx-dx`, L12607) |
| Teste de anúncios (Kiwi) | "Autorizar o teste" (`kwAuth:'yes'`): "Autorizado por você. Eu preparo os anúncios e te mostro antes de ativar. Neste protótipo, nada é ativado e nenhum valor é gasto." (L11802) | "Ajustar o teto"; "Agora não" (`kwAuth:'no'`): "Sem problema. A proposta fica guardada e nada muda." |
| Reconectar | "Reconectar (simulação)" (L13079): `gp:'ok'`, toast "Google Perfil reconectado · simulação. Nova tentativa às 11h." | — |
| Hipótese da Memória | confirmar na Memória | descartar/fora de uso na Memória |

### B6. Onde o protótipo separa aprovar de publicar / enviar / investir (textos exatos)
- Publicar: Kaia após aprovar, "Obrigada! Quer que o Otto publique no Instagram na sexta, às 9h? Aprovar a peça não publica nada sozinho." (L6800). Cartão de decisão: fato "Publicação" = "não incluída" (L9184). Etapas: "Sua aprovação" e "Publicação" ("só com autorização sua" / "precisa da sua autorização" / "autorizada · sex, 9h", L9156-9157); "Confirmação" "quando o canal confirmar". Fato na coluna lateral: "Publicação" = "só com sua autorização" (L8559). Pergunta: "Publicar a peça aprovada, com a legenda do Otto?" (template L5015); "Publicação autorizada · sex, 16/10, 9h" + tag "simulação" + "Confirmada só quando o Instagram confirmar." (L5016). Modo Autônomo: "Planejar conteúdos · a peça foi aprovada; publicar é outra autorização" (L13521); "Nada é publicado antes" (L13519); "Cada publicação continua pedindo a sua aprovação." (L13121, L13132); "Plano aprovado por você · cada publicação ainda pede a sua aprovação" (L13738); "Sem a sua aprovação, nada é publicado. Você pode pausar quando quiser." (template L5543); "Nunca faz: Anúncios, respostas, preços" (L5543); "Se você não aprovar, nada é publicado: o plano fica esperando por você." (L6904). Otto sobre stories: "Eles seguem a mesma regra: só saem com a sua autorização." (L9967).
- Enviar: "Aprovar o texto não envia nada." (L12443); "Mensagens aprovadas. Isso não autoriza o envio: para enviar, confira o que falta." (L12458); "Mensagens aprovadas · isso não autoriza o envio" (template L5556); "Aprovada por você · aprovar não envia" (template L5458); "aprovar não envia" (L13804); "Mensagem {n} aprovada · envio não autorizado" (L12469); "Mensagens aprovadas · envio não autorizado" (L12457). Mensagens só a quem deu consentimento ("23 de 138 inativos").
- Investir: "Nenhuma verba é usada sem a sua autorização." (L6294, L6863); "Nada é investido sem a sua autorização." (L9981, L13798, L11801, L6678); tag "sem verba liberada" e fato "proposta · sem verba liberada" (L8652); "Nenhum real é investido sem a sua autorização." (L11324). Delegação: "Isso não autoriza anúncios, envio de mensagens nem investimento." (L13216).
- Aprovar ≠ criar trabalhos: "Aprovar o plano define a direção. Cada iniciativa vira trabalho só quando você pedir." e "Aprovar o diagnóstico não cria trabalhos: cada recomendação vira ação quando você pedir." (L12605); "Aprovar não cria trabalhos." (L13786).

## C. Lacunas e inconsistências observadas no código
- Rótulo visível "Precisa de você" na faixa: só em `aria-label`; título visível não aparece no template (CSS fora dos extratos).
- `NK.rot`/"Revisar combinado" e `proposal` ficaram sem gatilho na V4.5+: só a `_j3Start` da V3 (L6890) põe `rot.st='proposed'`, e a V4.5 (L13275) a substituiu por `d5`.
- Início mostra "Post do Dia do Pão · v2" (sem "Mundial") e o botão curto "Revisar"; as faixas trocam por "Post do Dia Mundial do Pão" e "Revisar a peça"/"Revisar e aprovar a v{n}".
- `goL` cai em "Ver em Resultados" para `cap`, `mem` e `resp` (L10901). Seletor de threads renderiza "Conversas Nova conversa com a Kaia" (template L5507 + L8531).
- `@Nome` e a escolha de quem responde na Sala não têm roteamento: só preenchem o campo (L8514). Nada no protótipo mostra: persistência real, exclusão/arquivamento de conversa, envio real de anexo, regras de expiração de pedido, notificação fora da tela além de toast e ponto.
- `ApprovalCard` é componente externo (`HelloSquad.ApprovalCard`): só os rótulos passados por atributo aparecem nos extratos ("Autorizar publicação", "Agora não", "Aprovar conceito", "Outra direção", "Ativar", "Ajustar").
