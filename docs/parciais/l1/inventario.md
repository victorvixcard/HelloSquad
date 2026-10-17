# L1 — Inventário por script: Landing V1 (R32) × nosso `/` (A2c)

Gerado por `/tmp/l1/inventory.mjs` (só regex sobre `design/handoff-v4.6/landing/LandingPageV1.dc.html`; o arquivo de 600 KB não foi lido inteiro). 17/10/2026 07:53.

## 1. O que existe no protótipo

| # | Seção (R32) | id / classe | template | título | interativos |
|---|---|---|---|---|---|
| 1 | header | `-` / `{{barCls}}` | 0.8 KB | - | 8 cliques, 0 sc-if, 0 sc-for, 1 DS |
| 2 | section | `topo` / `{{hero.secCls}}` | 26.0 KB | Você cuida do seu negócio. Seu squad de IA assume o marketing. | 7 cliques, 0 sc-if, 7 sc-for, 7 DS |
| 3 | section | `demo` / `lp-sec lp-demo-sec` | 27.0 KB | Do pedido à entrega. Tudo em uma conversa. | 15 cliques, 40 sc-if, 21 sc-for, 32 DS |
| 4 | section | `squad` / `lp-sec lp-squad` | 29.6 KB | Sete especialistas disponíveis 24 horas por dia, 7 dias por semana. | 7 cliques, 0 sc-if, 0 sc-for, 7 DS |
| 5 | section | `autonomo` / `lp-sec lp-autosec` | 85.3 KB | Seu marketing, em modo autônomo. | 10 cliques, 3 sc-if, 1 sc-for, 28 DS |
| 6 | section | `memoria` / `lp-memsec` | 19.7 KB | Um Squad que conhece sua marca. E aprende a cada nova interação. | 5 cliques, 2 sc-if, 3 sc-for, 2 DS |
| 7 | section | `resultados` / `lp-sec lp-ressec` | 8.5 KB | Seus resultados revelam oportunidades. Seu Squad transforma em ação. | 1 cliques, 9 sc-if, 7 sc-for, 8 DS |
| 8 | section | `porque` / `lp-sec` | 11.3 KB | Mais do que ferramentas. Um Squad trabalhando por você. | 1 cliques, 0 sc-if, 0 sc-for, 8 DS |
| 9 | section | `faq` / `lp-faq` | 3.1 KB | Dúvidas antes de começar? A gente responde. | 1 cliques, 0 sc-if, 2 sc-for, 0 DS |
| 10 | section | `comecar` / `lp-close` | 0.9 KB | - | 1 cliques, 0 sc-if, 0 sc-for, 1 DS |
| 11 | footer | `-` / `lp-foot` | 0.6 KB | - | 6 cliques, 0 sc-if, 0 sc-for, 0 DS |

| Motor (métodos da classe `Component`) | qtd | métodos |
|---|---|---|
| Hero (digitação, envio, sequência, palco, faixa) | 34 | _apply _savePrompt _heroLayout _heroFitSoon _heroFit _heroGeo _bandEl _bandAnim _bandInit _bandHold _bandSync _bandEase _bandReveal _bandDragInit _hLater _hClear _agBy _heroCancel _typeHero _heroIntro _focusField _heroPick _heroSubmit _heroSend _apClear _apNext _apVis _apUserEdit _apResume _ctaRun _ctaStop _heroPts _caretPt _heroAim |
| Demonstração do squad (#demo) | 23 | _later _ctLater _ctClear _freshConv _play _patchConv _send _choose _decide _resetConv _pickConv _dLater _demoStop _demoStart _demoType _demoTarget _demoNext _isVis _demoEnd _demoLoop _cursorHide _demoClick _goDemo |
| Especialistas (#squad) | 6 | _pickAg _sqSig _settleSet _cycleSquad _talkTo _scrollToWin |
| Modo Autônomo (#autonomo) | 38 | _autoActivate _autoScan _autoReset _autoToggle _aLater _sxR _sxLater _sxDirty _sxLook _sxMove _sxSync _sxSyncSoon _sxRun _sxBeat _sxSetStep _sxEnter _sxPick _sxDecide _sxFocus _sxX _sxSize _sxProg _sxScan _sxGo _sxTick _c5El _c5Init _c5Show _c5Off _c5On _sxDirtyMem _a9Els _a9Layout _a9Render _a9End _a9Play _a9Reset _a9Relayout |
| Memória da Marca (#memoria) | 29 | _m3Tick _m3Later _m3sLater _m3Mode _m3Els _m3Show _m3Push _m3Size _m3Scan _m3Jump _m3Shapes _m3Go _m3XTick _m3Fin _m3Hush _m3NetBuild _m3NetLayout _m3Anchors _m3Attr _m3NetDraw _m3Route _m3At _m3NetTick _m3Fire _m3Burst _m3Arrive _m3NetSet _m3Stream _m3Vis |
| Resultados (#resultados) | 10 | _rLater _resRun _resPlay _resApply _resDecide _resCurPlan _resCurStop _resCurClick _resReset _rvRearm |
| FAQ | 3 | _faqToggle _faqHold _faqLook |
| Motor comum (movimento, olhar, piscadas, reações, scroll) | 22 | constructor _scrollTo _openModal _closeModal _move _mvVal _hop _settle _motionTick _stripeTick _flash _blink _react _toLocal _engineInit _kick _tick componentDidMount _onSec componentDidUpdate componentWillUnmount renderVals |
| (outros) | 0 |  |

CSS (<style> do <helmet>): 152 KB, 48 @keyframes, 11 @media, 1 prefers-reduced-motion, Google Fonts: sim (trocar por locais).
Template: 220 KB; classe Component: 165 métodos; 88 constantes de roteiro antes da classe (ORDER, NAME, ROLE, NR, ART, MEM_YOU, memRow, COLOR, PERSONA, HCHIPS, HORDER, HPOS, HBOTTOM, HREST, cbz, HEASE, HMOVES, HHOP, hopTracks, HSIG, HTURN, HCALL0, HKEYS, inferAgents, hNames, HERO_DEFAULT, SQ_PROMPT, APPROVALS, ST, CONVS, CONV_ORDER, CARD, M3_ORDER, M3_ROLE, M3_ITEMS, M3_SW, M3_INFO, M3_KNOWN0, M3_BASE, M3_GEO, M3_HEAD, M3_T, M3_A9, M3_SLOTS, M3_ANC, M3_ROUTES, M3_NET, M3_COUNT, M3_INK, M3_P, M3_KNOW, M3_HYPO, DAYS, WD, RES_N0, RES_V, RES_AFTER, RES_MAX, RES_CHAT, RES_TYPING, SX_T, SX_R, SX_RM, SX_X2, SX_FIND, SX_CUT, SX_GO, SX_PIN, C5_ORDER, C5_T, HINTRO_CUT, HINTRO_ORDER, hIdle, hCut, DPACE, DLEAD, DLOOP, DSCRIPT, dWords, dRead, FAQ, A9_TL, A9_L, CLOCK0, R_GRP, STEPS0, rnd, hhmm).
Componentes do DS usados (x-import): Button, CommandField, Agent, SquadStatus, Tag, ApprovalCard, Icon, StatePill, IconButton.

O template usa a linguagem do runtime do protótipo (`support.js`): `{{caminho}}` (716 lacunas, todas caminhos simples), `<sc-if value>`,
`<sc-for list as>` e `<x-import component-from-global-scope="HelloSquad.X">` (componentes do `bundle.js` do DS, o mesmo arquivo da Product UI).
A classe `Component` move a página **pelo DOM** (179 referências a `window`/`document`): ela acha os elementos pelas classes do template.
Por isso o motor só funciona igual se o DOM for o mesmo do template.

## 2. O que existe hoje em `/` (A2c) e o veredito

| Seção R32 | Nosso `/` hoje | Veredito |
|---|---|---|
| Barra (`lp-bar`, navegação por âncora, Entrar, Criar conta grátis) | `SiteHeader` da A2c, só "Entrar" | defeito: trocar pela barra da R32 |
| Hero `#topo` (palco dos sete, campo que digita e envia sozinho, faixa de sugestões, sequência pedido → coordenação → especialistas → CTA) | Hero estático da A0 (H1, definição, botão, fileira de agentes) | defeito: portar template + motor |
| Demonstração `#demo` ("Do pedido à entrega", conversa simulada com cursor) | 4 cartões citáveis da N2a | defeito: portar |
| Especialistas `#squad` (sete agentes que reagem, "conversar com") | cartões do catálogo | defeito: portar |
| Modo Autônomo `#autonomo` (rotinas interativas em 4 etapas, cena rolada) | faixa escura com resumo | defeito: portar |
| Memória da Marca `#memoria` (rede animada, hipóteses) | cartão | defeito: portar |
| Resultados `#resultados` (gráfico com hover, conversa, aprovação) | cartão | defeito: portar |
| Comparativo `#porque` (ícones próprios) | `<table>` com ✓ ½ – | defeito: portar |
| FAQ `#faq` (acordeão animado) | 6 `<details>` | defeito: portar |
| Encerramento `#comecar` (logotipo animado) | "Começar com o squad" | defeito: portar |
| Rodapé `lp-foot` | `SiteFooter` da A2c | portar o da R32 (troca de idioma da A2c fica, é SEO/i18n) |
| Modais de cadastro/login | não há (`/criar-conta`, `/entrar`) | briefing: botões levam às telas reais; `hs-landing-pedido` no `sessionStorage` |

## 3. Como portar (decisão técnica, mesma linha da A1f)

Reescrever 165 métodos à mão não dá "igual". O caminho é o da A1f, por script, levado ao fim:

1. `packages/ui/scripts/extract-landing.ts` gera, a partir do `.dc.html` e do `bundle.js` do DS:
   - `landing.css` (o `<style>` inteiro, na ordem, com as fontes locais);
   - `landing-template.ts` (o template do `<x-dc>` já analisado em árvore, sem o `<helmet>`);
   - `landing-logic.ts` (constantes + `class Component` como estão, só com o invólucro de módulo);
   - `ds-bundle.ts` (o `bundle.js` do DS como fábrica de componentes, sem `window.React`).
2. Um interpretador do template em React (`LandingRuntime`), com a mesma semântica do `support.js` (lacunas, `sc-if`, `sc-for`,
   `x-import`, estilos em texto, `<span class="sc-interp">`), que roda no servidor (HTML com o texto das seções, para SEO/GEO) e
   no cliente (os motores ligam no `componentDidMount`, como no protótipo).
3. en/es: a cópia passa por um dicionário pt-BR → idioma no momento da interpolação (texto do template e textos da classe).
