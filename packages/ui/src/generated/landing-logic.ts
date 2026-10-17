// @ts-nocheck
/* eslint-disable */
// Gerado por packages/ui/scripts/extract-landing.ts a partir de landing/LandingPageV1.dc.html (<script data-dc-script>).
// Não edite à mão: rode pnpm --filter @hellosquad/ui extract:landing.
// O código é o do protótipo; o invólucro dá a ele o que o runtime (support.js) dava: DCLogic, React, window e document.
// Trocas: a fonte da medição de texto em canvas usa a Gabarito local (__hsCanvasFont), não o nome do Google Fonts;
// e os nomes de fornecedor dos roteiros viram termos neutros (tabela NEUTRAL do script).
export function createLandingComponent(DCLogic, React, window, document, __hsCanvasFont) {
// ---------------------------------------------------------------- data
const ORDER = ['coord', 'arch', 'leaf', 'pill', 'hex', 'funnel', 'square'];
// official identity layer (internal ids stay the same): name · short role
const NAME = { coord: 'Nexo', arch: 'Bia', leaf: 'Kaia', pill: 'Otto', hex: 'Kiwi', funnel: 'Max', square: 'Íris' };
const ROLE = { coord: 'Coordenador', arch: 'Estratégia', leaf: 'Criação', pill: 'Conteúdo', hex: 'Mídia', funnel: 'CRM', square: 'Dados' };
function NR(n) { return NAME[n] + ' · ' + ROLE[n]; }
const ART = { coord: 'o', arch: 'a', leaf: 'a', pill: 'o', hex: 'o', funnel: 'o', square: 'a' };
// memory panel: what the visitor gave (you), what was confirmed (ok) and what the squad picked up on its own (auto)
const MEM_YOU = { 'enviado por você': 'enviou', 'informado por você': 'informou', 'definido por você': 'definiu', 'definida por você': 'definiu', 'autorizado por você': 'autorizou' };
function memRow(x) {
  const src = x.tag === 'auto' ? 'auto' : (MEM_YOU[x.tl] ? 'you' : 'ok');
  const parts = String(x.v).split(', ');
  const chips = parts.length >= 3 && parts.length <= 5 && parts.every((p) => p.length <= 20 && p.split(' ').length <= 3) ? parts.map((p) => ({ t: p.charAt(0).toUpperCase() + p.slice(1) })) : null;
  const img = /^(\d+) imagens?/.exec(x.v);
  return {
    k: x.k, v: img ? img[1] + ' imagens de referência' : x.v, src: src,
    cls: 'lp-memr is-' + src + (String(x.v).length <= 10 ? ' is-big' : ''), isOk: src === 'ok', isYou: src === 'you',
    tl: src === 'you' ? MEM_YOU[x.tl] : x.tl, chips: chips, plain: !chips,
    thumbs: img ? Array.from({ length: Math.min(4, +img[1]) }, (_, i) => ({ i: i })) : null
  };
}
const COLOR = { coord: '#FF4D1F', arch: '#8A3BFF', leaf: '#FF2E9A', pill: '#FFE11A', hex: '#B6FF2E', funnel: '#00E5C3', square: '#1F5BFF' };
const PERSONA = {
  coord: { tau: 120, sac: 0, hover: 'big', blink: [4, 6] }, arch: { tau: 260, sac: 0, hover: 'slow', blink: [5, 8] },
  leaf: { tau: 90, sac: 0, hover: 'wink', blink: [3.5, 6] }, pill: { tau: 110, sac: 0, hover: 'happy', blink: [3.5, 6] },
  hex: { tau: 70, sac: 0, hover: 'double', blink: [3, 5] }, funnel: { tau: 140, sac: 0, hover: 'happy', blink: [4, 7] },
  square: { tau: 40, sac: 280, hover: 'serio', blink: [5, 8] }
};

// ---------------------------------------------------------------- hero R5
// Suggestions: each one names the specialists who would take it (a temporary squad).
const HCHIPS = [
  { text: 'Criar uma campanha para o fim de semana', ags: ['arch', 'leaf', 'hex'] },
  { text: 'Criar uma identidade visual', ags: ['leaf'] },
  { text: 'Planejar meus próximos conteúdos', ags: ['pill', 'arch'] },
  { text: 'Analisar meus resultados', ags: ['square'] },
  { text: 'Preparar um lançamento', ags: ['arch', 'leaf', 'pill'] },
  { text: 'Entender melhor meus clientes', ags: ['arch', 'square'] },
  { text: 'Criar uma campanha de anúncios', ags: ['hex', 'leaf'] },
  { text: 'Reativar clientes que sumiram', ags: ['funnel', 'pill'] },
  { text: 'Encontrar oportunidades para minha marca', ags: ['arch'] },
  { text: 'Melhorar o relacionamento com clientes', ags: ['funnel'] }
];
// R4 composition (1920x1200 frame): x, y, scale, outer rotation, inner transform. Drawing order = HORDER.
const HORDER = ['arch', 'funnel', 'hex', 'leaf', 'coord', 'square', 'pill'];
const HPOS = {
  arch: [610, 1051, 1.55, -4, ''], funnel: [1215, 1056, 1.38, 0, ' translate(0 6) scale(1.2)'], hex: [1665, 1086, 1.5, 0, ' rotate(-12)'],
  leaf: [205, 1131, 1.55, 0, ''], coord: [905, 1181, 1.55, 0, ''], square: [1425, 1160, 1.32, 0, ''], pill: [1846, 1152, 1.02, 0, '']
};
const HBOTTOM = { coord: 150, arch: 160, leaf: 150, pill: 130, hex: 157, funnel: 138, square: 140 };
const HREST = { coord: 'oval', arch: 'big', leaf: 'wink', pill: 'happy', hex: 'serio', funnel: 'oval', square: 'oval' };
// easing curves (DS: saída .2,.8,.2,1 · mola .34,1.56,.64,1 · precisa .65,0,.35,1) plus rise/fall for jumps
function cbz(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-5) return Y(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 24; i += 1) { const v = X(t); if (Math.abs(v - x) < 1e-5) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t);
  };
}
const HEASE = { out: cbz(0.2, 0.8, 0.2, 1), mola: cbz(0.34, 1.56, 0.64, 1), prec: cbz(0.65, 0, 0.35, 1), io: cbz(0.45, 0, 0.55, 1), up: cbz(0.22, 0.7, 0.36, 1), down: cbz(0.55, 0, 0.9, 0.45), in: cbz(0.5, 0, 0.9, 0.4), lin: (x) => x };
// motion repertoire. Each move is one or more tracks of keys [ms, values, easing into this key]; tracks add up.
// values: tx/ty px at k=1 · r (deg) leans about the agent's base · rc (deg) spins about its centre
// · fx/fy flip about the centre (negative = back side, eyes hidden) · sx/sy squash and stretch from the base
const HMOVES = {
  // Coordenação stands up to take the request
  rise: (d) => [[[0, {}], [180, { sy: 0.94, sx: 1.04 }, 'out'], [520, { ty: -16, sy: 1.06, sx: 0.97 }, 'up'], [900, { ty: -10, sy: 1.02 }, 'io'], [1320, {}, 'mola']]],
  // "here": a specialist answers the call
  perk: (d) => [[[0, {}], [130, { sy: 0.93, sx: 1.05 }, 'out'], [340, { ty: -11, sy: 1.05, sx: 0.975 }, 'up'], [660, {}, 'mola']]],
  // ---- A6 · Motion 07 (approved): each specialist's individual animation, ported 1:1 from the board's loops (25 fps).
  // et/ev turn the face around the vertical/horizontal axis (eyes slide to the edge, the back passes, they return from the other side);
  // lx/ly drive the look while lk = 1; ec closes the eyes (0..1)
  // 01 Coordenação: turns to the left and comes back by the other side, squash, looks right, blinks, back
  m7coord: (d) => [
    [[0, {}], [360, { fx: 0.87, fy: 1.03 }, 'io'], [480, { fx: 0.84, fy: 1.04 }, 'io'], [600, { fx: 1.07, fy: 0.95 }, 'out'], [760, { fx: 1.03, fy: 0.98 }, 'io'], [900, {}, 'mola']],
    [[0, {}], [360, { et: -62 }, 'in'], [440, { et: -90 }, 'lin'], [520, { et: -262 }, 'lin'], [700, { et: -360 }, 'out']],
    [[0, { lk: 1 }], [800, { lk: 1 }], [960, { lk: 1, lx: 0.75 }, 'io'], [1440, { lk: 1, lx: 0.75 }], [1760, { lk: 1, lx: -0.2 }, 'io'], [1960, { lk: 1 }, 'io']],
    [[0, {}], [1460, {}], [1500, { ec: 1 }, 'out'], [1560, {}, 'io']]
  ],
  // 02 Estratégia: crouches, looks up and turns over upward with a little hop, lands leaning, one eye bigger
  m7arch: (d) => [
    [[0, {}], [240, { sx: 1.08, sy: 0.88 }, 'out'], [400, { ty: -34, sx: 0.97, sy: 1.05, rc: 4 }, 'up'], [480, { ty: -36, fx: 1.06, fy: 0.86, rc: -3 }, 'io'], [600, { ty: 0, sx: 1.05, sy: 0.93, rc: -5 }, 'down'], [800, { rc: 3 }, 'io'], [980, {}, 'mola']],
    [[0, {}], [240, { ev: 8 }, 'io'], [400, { ev: 80 }, 'in'], [480, { ev: 180 }, 'lin'], [540, { ev: 280 }, 'lin'], [720, { ev: 360 }, 'out']],
    [[0, { lk: 1 }], [240, { lk: 1, ly: -0.6 }, 'io'], [400, { lk: 1, ly: -0.6 }], [720, { lk: 1 }, 'out'], [1720, { lk: 1, lx: 0.15, ly: -0.1 }, 'io']]
  ],
  // 03 Marca e Criação: leans right, turns right and comes back by the other side, winks with the head tilted
  m7leaf: (d) => [
    [[0, {}], [360, { rc: 12 }, 'io'], [440, { rc: 10, fx: 0.86 }, 'io'], [520, { rc: 2, fx: 0.84 }, 'lin'], [640, { rc: -8, fx: 1.05, fy: 0.96 }, 'out'], [840, {}, 'io'], [1040, {}], [1120, { rc: 6 }, 'io'], [1440, { rc: 6 }], [1600, {}, 'io']],
    [[0, {}], [360, { et: 50 }, 'in'], [440, { et: 90 }, 'lin'], [540, { et: 270 }, 'lin'], [760, { et: 360 }, 'out']],
    [[0, { lk: 1 }], [360, { lk: 1, lx: 0.3 }, 'io'], [760, { lk: 1 }, 'out'], [1680, { lk: 1 }]]
  ],
  // 04 Conteúdo e Comunicação: happy, closes the eyes, compresses and jumps spinning, lands, eyes open, happy
  m7pill: (d) => [
    [[0, {}], [80, {}], [280, { sx: 1.14, sy: 0.8, ty: 2 }, 'io'], [400, { ty: -46, sx: 0.95, sy: 1.06 }, 'up'], [480, { ty: -50 }, 'io'], [640, { ty: 0, sy: 1.02 }, 'down'], [720, { sx: 1.1, sy: 0.86 }, 'out'], [920, {}, 'mola']],
    [[0, {}], [300, {}], [660, { rc: 360 }, 'io']],
    [[0, {}], [120, {}], [240, { ec: 1 }, 'io'], [680, { ec: 1 }], [740, {}, 'out'], [1060, {}], [1090, { ec: 0.85 }, 'io'], [1130, {}, 'io']],
    [[0, { lk: 1 }], [1680, { lk: 1 }]]
  ],
  // 05 Mídia e Performance: turns over downward, arrives serious, looks ahead, relaxes
  m7hex: (d) => [
    [[0, {}], [400, { rc: -12, fx: 1.05, fy: 0.8 }, 'io'], [520, { rc: -14, fx: 1.06, fy: 0.78 }, 'io'], [640, { rc: -4, fy: 0.96 }, 'out'], [820, {}, 'mola']],
    [[0, {}], [400, { ev: -85 }, 'in'], [480, { ev: -180 }, 'lin'], [560, { ev: -270 }, 'lin'], [760, { ev: -360 }, 'out']],
    [[0, { lk: 1 }], [400, { lk: 1, ly: 0.5 }, 'io'], [760, { lk: 1 }, 'out'], [1200, { lk: 1, lx: 0.4 }, 'io'], [1680, { lk: 1, lx: 0.25 }, 'io']]
  ],
  // 06 CRM e Relacionamento: looks aside and turns quickly to the left, back by the other side, happy little hop
  m7funnel: (d) => [
    [[0, {}], [320, { rc: 8 }, 'io'], [400, { rc: 7, fx: 0.84 }, 'io'], [480, { rc: -2, fx: 0.8 }, 'lin'], [600, { rc: -6, fx: 1.06, fy: 0.94 }, 'out'], [800, {}, 'mola'], [1120, { ty: -9, sy: 1.04 }, 'up'], [1300, {}, 'out']],
    [[0, {}], [320, { et: -50 }, 'in'], [400, { et: -90 }, 'lin'], [480, { et: -270 }, 'lin'], [700, { et: -360 }, 'out']],
    [[0, { lk: 1 }], [320, { lk: 1, lx: -0.3 }, 'io'], [700, { lk: 1 }, 'out'], [1680, { lk: 1 }]],
    [[0, {}], [1060, {}], [1090, { ec: 1 }, 'io'], [1130, {}, 'io'], [1380, {}], [1410, { ec: 1 }, 'io'], [1450, {}, 'io']]
  ],
  // 07 Dados e Resultados: looks one way, leans and rolls, back upright, looks to one side and the other, blinks
  m7square: (d) => [
    [[0, {}], [320, { rc: -7 }, 'io'], [400, { rc: 20 }, 'in'], [480, { rc: 62 }, 'lin'], [520, { rc: 90 }, 'out'], [521, { rc: 0 }, 'lin'], [600, { rc: -6 }, 'out'], [700, { rc: 4 }, 'io'], [860, {}, 'io']],
    [[0, {}], [320, { et: 28 }, 'io'], [400, { et: 60 }, 'in'], [460, { et: 90 }, 'lin'], [540, { et: 270 }, 'lin'], [760, { et: 360 }, 'out']],
    [[0, { lk: 1 }], [320, { lk: 1, lx: 0.4 }, 'io'], [760, { lk: 1 }, 'out'], [900, { lk: 1, lx: -0.6 }, 'io'], [1100, { lk: 1, lx: -0.6 }], [1250, { lk: 1, lx: 0.5 }, 'io'], [1380, { lk: 1, lx: 0.5 }], [1560, { lk: 1 }, 'io']],
    [[0, {}], [1380, {}], [1410, { ec: 1 }, 'io'], [1460, {}, 'io']]
  ],
  // squad card opens: the specialist pops up with a squash and stretch, lands and settles (its Motion 07 follows)
  pop: (d) => [[[0, {}], [150, { sy: 0.9, sx: 1.07, ty: 3 }, 'out'], [390, { ty: -24, sy: 1.07, sx: 0.96 }, 'up'], [580, { ty: 0, sy: 0.94, sx: 1.05 }, 'down'], [820, {}, 'mola']]],
  // collective concentration: compress toward the base, hold, release
  focus: (d) => [[[0, {}], [340, { sy: 0.955, sx: 1.03, ty: 2 }, 'prec'], [1000, { sy: 0.95, sx: 1.032, ty: 2 }, 'io'], [1400, {}, 'mola']]],
  // working together: lean toward the partners
  join: (d) => [[[0, {}], [420, { r: 6 * d, ty: -6, sy: 1.02 }, 'io'], [860, { r: 5 * d, ty: -6 }, 'io'], [1260, {}, 'mola']]],
  // agents not involved: a small acknowledgement, then rest
  ack: (d) => [[[0, {}], [300, { ty: 3, sy: 0.985 }, 'io'], [700, {}, 'out']]]
};
// hero · a called specialist answers with a jump of its own: height (frame px at k = 1), anticipation, rise, hang, fall,
// tilt at the top (rc) and on landing (rc2), sideways drift (tx), a second little bounce (bis) or a precise nod (nod)
const HHOP = {
  // R21 · higher still (about 3.2× the R9 height), with a little more time in the air so it still reads as one natural leap
  arch: { h: 205, a: 150, sq: 0.84, up: 370, hang: 110, dn: 310, rc: -3, rc2: 2, land: 0.86 },
  leaf: { h: 190, a: 130, sq: 0.86, up: 350, hang: 100, dn: 300, rc: 10, rc2: -4, land: 0.86 },
  pill: { h: 176, a: 120, sq: 0.82, up: 340, hang: 80, dn: 290, rc: 0, rc2: 0, land: 0.84, bis: 0.3 },
  hex: { h: 218, a: 110, sq: 0.84, up: 340, hang: 90, dn: 280, rc: -11, rc2: 3, land: 0.86 },
  funnel: { h: 185, a: 140, sq: 0.86, up: 360, hang: 110, dn: 310, rc: 5, rc2: -2, land: 0.87, tx: 8 },
  square: { h: 166, a: 100, sq: 0.9, up: 330, hang: 120, dn: 280, rc: 0, rc2: 0, land: 0.9, nod: true }
};
function hopTracks(P, H) {
  // two tracks: the flight (height, tilt, drift) and the body (squash on take-off, stretch while rising and falling, squash on landing).
  // When there is little room above, the stretch and the tilt shrink with the height (f).
  const f = P.h ? Math.max(0, Math.min(1, H / P.h)) : 1;
  const t1 = P.a, t2 = t1 + P.up, t3 = t2 + P.hang, t4 = t3 + P.dn, tx = (P.tx || 0) * f, rc = (P.rc || 0) * f;
  const st = 1 + (1 - P.sq) * 0.35 * f, sxs = 1 - (st - 1) * 0.6;
  const fly = [[0, {}], [t1, { ty: 2 }, 'out'], [t2, { ty: -H, rc: rc, tx: tx }, 'up'], [t3, { ty: -H * 0.95, rc: rc, tx: tx }, 'io'], [t4, { ty: 0, rc: (P.rc2 || 0) * f }, 'down']];
  const body = [[0, {}], [t1, { sy: P.sq, sx: 1 + (1 - P.sq) * 0.6 }, 'out'], [t1 + P.up * 0.35, { sy: st, sx: sxs }, 'out'], [t2, {}, 'io'],
    [t3 + P.dn * 0.6, { sy: 1 + (st - 1) * 0.6, sx: 1 - (st - 1) * 0.36 }, 'in'], [t4, { sy: P.land, sx: 1 + (1 - P.land) * 0.8 }, 'out']];
  let t = t4;
  if (P.bis) {
    const h2 = H * P.bis;
    fly.push([t + 150, { ty: -h2 }, 'up'], [t + 290, { ty: 0 }, 'down']);
    body.push([t + 90, {}, 'out'], [t + 290, { sy: 0.94, sx: 1.05 }, 'out']);
    t += 290;
  }
  if (P.nod) { fly.push([t + 120, { ty: 3 }, 'out']); body.push([t + 120, { sy: 0.97, sx: 1.02 }, 'out']); t += 120; }
  fly.push([t + 320, {}, 'mola']); body.push([t + 320, {}, 'mola']);
  const tracks = [fly, body];
  // no room to jump (a short screen, buttons right above): the excitement goes into a quick lean from the base instead
  if (f < 0.6) {
    const w = 6 * (1 - f);
    tracks.push([[0, {}], [t1 + 80, { r: -w }, 'out'], [t1 + 260, { r: w * 0.8 }, 'io'], [t1 + 430, { r: -w * 0.45 }, 'io'], [t1 + 640, {}, 'mola']]);
  }
  return { tracks: tracks, apex: t2, st: st };
}
// each specialist's signature = its A6 · Motion 07 animation; eye beats [ms, expression, blink]
const HSIG = {
  coord: { mv: 'm7coord', ex: [[0, 'oval', 0]] },
  arch: { mv: 'm7arch', ex: [[0, 'oval', 0], [1000, 'big', 0], [1500, 'oval', 0]] },
  leaf: { mv: 'm7leaf', ex: [[0, 'oval', 0], [1080, 'wink', 0], [1480, 'oval', 0]] },
  pill: { mv: 'm7pill', ex: [[0, 'happy', 0], [700, 'big', 0], [880, 'oval', 0], [1130, 'happy', 0]] },
  hex: { mv: 'm7hex', ex: [[0, 'oval', 0], [540, 'serio', 0], [1240, 'oval', 0]] },
  funnel: { mv: 'm7funnel', ex: [[0, 'oval', 0], [1120, 'happy', 0], [1400, 'oval', 0]] },
  square: { mv: 'm7square', ex: [[0, 'oval', 0]] }
};
// face turn travel in local units: [left, right, up, down] from the eyes to the silhouette's edge
const HTURN = { coord: [147, 147, 122, 178], arch: [116, 104, 98, 232], leaf: [112, 148, 126, 174], pill: [80, 80, 70, 150], hex: [200, 92, 113, 182], funnel: [105, 105, 62, 180], square: [135, 135, 114, 166] };
// Coordination calls the specialists: first call after HCALL0 ms, then one every HCALL ms
const HCALL0 = 700, HCALL = 560;
const HKEYS = {
  arch: /estrat|planej|oportunidad|mercado|concorr|posicion|p[uú]blico|entender|pesquis|lan[cç]amento|campanha|crescer|mais clientes|atrair/,
  leaf: /identidade|visual|logo|marca|criativ|pe[cç]a|arte|design|embalag|campanha/,
  pill: /conte[uú]do|post|legenda|texto|calend[aá]rio|blog|roteiro|reels|v[ií]deo|instagram|redes|lan[cç]amento/,
  hex: /an[uú]ncio|ads|m[ií]dia|tr[aá]fego|verba|impulsion|vender|vendas|fim de semana|promo|mais clientes|novos clientes|atrair/,
  funnel: /client|crm|relacionamento|fideli|e-?mail|whatsapp|reativ|reten/,
  square: /como est[aã]o|quanto|resultado|m[eé]trica|dados|relat[oó]rio|analis|an[aá]lise|n[uú]mero|desempenho|medir/
};
function inferAgents(v) {
  const t = String(v || '').toLowerCase();
  const sc = [];
  ['arch', 'leaf', 'pill', 'hex', 'funnel', 'square'].forEach((n, i) => {
    const m = t.match(new RegExp(HKEYS[n].source, 'g'));
    if (m) sc.push({ n: n, s: m.length, i: i });
  });
  sc.sort((a, b) => b.s - a.s || a.i - b.i);
  const out = sc.slice(0, 3).map((x) => x.n);
  return out.length ? out : ['arch', 'pill'];
}
function hNames(ags) {
  if (ags.length === 1) return NAME[ags[0]] + ' (' + ROLE[ags[0]] + ')';
  const l = ags.map((n) => NAME[n]);
  return l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1];
}
const HERO_DEFAULT = 'Quero criar uma campanha para minha marca.';


// ---------------------------------------------------------------- demo conversations
const SQ_PROMPT = 'Quero uma campanha de fim de ano para o nosso panetone.';
const APPROVALS = {
  main: { ag: 'coord', text: 'Publicar as 3 peças e iniciar os anúncios da campanha de fim de ano.', facts: [['Onde', 'Redes sociais e anúncios de busca'], ['Quando', 'sex, 18h'], ['Verba', 'até R$ 40/dia']], approveLabel: 'Aprovar e publicar', yes: 'yes', adj: 'adj', no: 'no' },
  main2: { ag: 'coord', text: 'Publicar as 3 peças e iniciar os anúncios da campanha de fim de ano.', facts: [['Onde', 'Redes sociais e anúncios de busca'], ['Quando', 'sex, 18h'], ['Verba', 'até R$ 40/dia']], approveLabel: 'Aprovar e publicar', yes: 'yes', adj: null, no: 'no' },
  hex: { ag: 'hex', text: 'Usar R$ 105 de verba em 3 dias na campanha de banho e tosa.', facts: [['Onde', 'Anúncios de busca e redes sociais'], ['Quando', 'sex a dom'], ['Verba', 'R$ 35/dia']], approveLabel: 'Aprovar verba', yes: 'yes', adj: null, no: 'no' }
};
const ST = function (kind, lead, message, detail, extra) { return Object.assign({ kind: kind, lead: lead || null, message: message || '', detail: detail || '' }, extra || {}); };

const CONVS = {
  squad: {
    kind: 'squad', title: 'Squad', sub: 'Miolo · padaria artesanal (fictícia)', preview: 'Peça algo ao squad inteiro', prompt: SQ_PROMPT,
    intro: [{ ag: 'coord', text: 'Oi! Eu sou o Nexo, coordenador do seu squad. Diga o que você precisa e eu organizo o time.' }],
    status0: ST('idle', null, 'Squad pronto', 'aguardando seu pedido'),
    seqs: {
      send: [
        { t: 0, user: SQ_PROMPT, sending: true, status: ST('tech', null, 'Enviando pedido') },
        { t: 800, sending: false, status: ST('ok', 'coord', 'Nexo', 'pedido recebido') },
        { t: 700, typing: 'coord', status: ST('work', 'coord', 'Nexo', 'organizando seu pedido') },
        { t: 1500, typing: null, msg: { ag: 'coord', text: 'Antes de começar: a campanha é para vender na loja, por encomendas no site ou pelos dois canais?' }, choices: [{ label: 'Pelos dois canais', next: 'plan' }, { label: 'Só encomendas no site', next: 'plan' }], status: ST('wait', 'coord', 'Nexo', 'aguarda sua resposta') }
      ],
      plan: [
        { t: 300, typing: 'coord', status: ST('work', 'coord', 'Nexo', 'montando o trabalho') },
        { t: 1300, typing: null, msg: { ag: 'coord', text: 'Combinado. A Bia define o conceito, a Kaia e o Otto preparam as peças e o Kiwi planeja a divulgação. Antes de publicar ou investir, eu chamo você.' }, work: { has: true } },
        { t: 900, typing: 'arch', step: [0, 'work'], status: ST('work', 'arch', 'Bia', 'desenvolvendo o conceito') },
        { t: 2100, typing: null, msg: { ag: 'arch', text: 'Conceito pronto. A fermentação natural vira a prova de cuidado.', card: { type: 'concept' } }, step: [0, 'done'] },
        { t: 600, step: [1, 'work'], typing: 'leaf', status: ST('work', 'leaf', 'Kaia', 'preparando as peças', { collaborators: ['pill'] }) },
        { t: 2400, typing: null, msg: { ag: 'leaf', co: 'Otto', text: 'Três peças para as redes sociais, com textos do Otto.', card: { type: 'pieces', v: 1 } }, step: [1, 'done'] },
        { t: 600, step: [2, 'work'], typing: 'hex', status: ST('work', 'hex', 'Kiwi', 'planejando a divulgação') },
        { t: 1900, typing: null, msg: { ag: 'hex', text: 'Divulgação proposta: posts de sexta a domingo e anúncios de busca e nas redes sociais, com até R$ 40 por dia.' }, step: [2, 'done'] },
        { t: 700, step: [3, 'work'], status: ST('wait', 'coord', 'Nexo', 'aguarda sua aprovação', { actionLabel: 'Revisar' }), approval: 'main' }
      ],
      yes: [
        { t: 0, user: 'Aprovado.', status: ST('work', 'coord', 'Nexo', 'agendando a publicação') },
        { t: 1300, msg: { ag: 'coord', text: 'Agendado para sexta, 18h. O Kiwi acompanha a campanha e a Íris traz a primeira leitura na segunda.' }, step: [3, 'done'], work: { live: true } },
        { t: 500, note: 'nada foi publicado nem investido', status: ST('live', 'hex', 'Campanha em execução', '· simulação'), actions: [{ label: 'Ver resultados', variant: 'soft', go: 'results' }] }
      ],
      adj: [
        { t: 0, user: 'Troque o título da segunda peça. Está longo.', typing: 'leaf', status: ST('work', 'leaf', 'Kaia', 'ajustando a peça 2') },
        { t: 1800, typing: null, msg: { ag: 'leaf', text: 'Feito. Mudei só o título da peça 2; o resto continua como estava.', card: { type: 'pieces', v: 2 } } },
        { t: 600, status: ST('wait', 'coord', 'Nexo', 'aguarda sua aprovação', { actionLabel: 'Revisar' }), approval: 'main2' }
      ],
      no: [
        { t: 0, user: 'Agora não.' },
        { t: 1000, msg: { ag: 'coord', text: 'Tudo bem. As peças ficam salvas no trabalho e nada é publicado sem você.' }, status: ST('pause', 'coord', 'Nexo', 'aguardando sua decisão'), actions: [{ label: 'Rever a aprovação', variant: 'soft', next: 'again', silent: true }] }
      ],
      again: [{ t: 200, status: ST('wait', 'coord', 'Nexo', 'aguarda sua aprovação', { actionLabel: 'Revisar' }), approval: 'main2' }]
    }
  },
  coord: {
    kind: 'agent', ag: 'coord', title: NR('coord'), sub: 'Miolo · padaria artesanal (fictícia)', prompt: 'O que precisa de mim hoje?',
    intro: [{ ag: 'coord', text: 'Bom dia! Aqui é o Nexo. Posso resumir o que precisa de você hoje.' }],
    ctx: [{ k: 'Objetivo do trimestre', v: 'Aumentar as encomendas de fim de ano', tag: 'ok', tl: 'decisão aprovada' }, { k: 'Trabalhos ativos', v: 'Campanha de fim de ano e calendário semanal', tag: 'auto', tl: 'em andamento' }, { k: 'Preferência', v: 'Resumo pela manhã, só com o que precisa de decisão', tag: 'ok', tl: 'confirmado' }],
    seqs: {
      send: [
        { t: 0, user: 'O que precisa de mim hoje?', status: ST('work', 'coord', 'Nexo', 'reunindo o que está pendente'), typing: 'coord' },
        { t: 1700, typing: null, msg: { ag: 'coord', text: 'Duas decisões e uma informação. O resto está andando.', card: { type: 'today' } }, status: ST('done', 'coord', 'Nexo', 'resumo pronto', { time: '09:12' }) }
      ]
    }
  },
  arch: {
    kind: 'agent', ag: 'arch', title: NR('arch'), sub: 'Exemplo · estúdio de pilates (fictício)', prompt: 'Quero atrair mais alunos para o meu estúdio de pilates.',
    intro: [{ ag: 'arch', text: 'Oi, eu sou a Bia. Me conte o objetivo e eu procuro onde está a oportunidade.' }],
    ctx: [{ k: 'Negócio', v: 'Estúdio com duas salas, turmas de até 6 alunos', tag: 'ok', tl: 'confirmado' }, { k: 'Público atual', v: 'Mulheres de 35 a 60 anos, do bairro', tag: 'ok', tl: 'confirmado' }, { k: 'Canais', v: 'Redes sociais e indicação de alunos', tag: 'auto', tl: 'aprendido' }],
    seqs: {
      send: [
        { t: 0, user: 'Quero atrair mais alunos para o meu estúdio de pilates.', status: ST('work', 'arch', 'Bia', 'analisando o estúdio'), typing: 'arch' },
        { t: 2100, typing: null, msg: { ag: 'arch', text: 'Antes de investir em anúncios, eu olharia para três frentes. Ordenei por impacto e esforço.', card: { type: 'opps' } }, status: ST('done', 'arch', 'Bia', 'mapa de oportunidades pronto', { time: '10:04' }), actions: [{ label: 'Transformar em plano', variant: 'primary', next: 'ok' }, { label: 'Pedir ajuste', variant: 'soft', next: 'adj' }] }
      ],
      ok: [
        { t: 200, status: ST('work', 'coord', 'Nexo', 'abrindo um trabalho'), typing: 'coord' },
        { t: 1500, typing: null, msg: { ag: 'coord', text: 'Trabalho aberto. A Bia detalha o plano e o Otto prepara a campanha de indicação.' }, status: ST('done', 'coord', 'Nexo', 'trabalho criado', { time: '10:06' }) }
      ],
      adj: [{ t: 200, typing: 'arch' }, { t: 1300, typing: null, msg: { ag: 'arch', text: 'Claro. O que devo considerar? Orçamento disponível, horários com vagas ou um público específico.' } }]
    }
  },
  leaf: {
    kind: 'agent', ag: 'leaf', title: NR('leaf'), sub: 'Exemplo · marca de velas artesanais (fictícia)', prompt: 'Crie uma identidade visual para minha marca de velas artesanais.',
    intro: [{ ag: 'leaf', text: 'Oi, eu sou a Kaia. Me diga como sua marca deve ser percebida e eu proponho caminhos visuais.' }],
    ctx: [{ k: 'Nome da marca', v: 'Lume', tag: 'ok', tl: 'confirmado' }, { k: 'Percepção desejada', v: 'Calma, cuidado manual, presente especial', tag: 'ok', tl: 'confirmado' }, { k: 'Referências', v: '3 imagens enviadas por você', tag: 'ok', tl: 'enviado por você' }],
    seqs: {
      send: [
        { t: 0, user: 'Crie uma identidade visual para minha marca de velas artesanais.', status: ST('work', 'leaf', 'Kaia', 'explorando direções'), typing: 'leaf' },
        { t: 2200, typing: null, msg: { ag: 'leaf', text: 'Três direções para começar. Escolha uma e eu desenvolvo logo, paleta e aplicações.', card: { type: 'dirs' } }, status: ST('wait', 'leaf', 'Kaia', 'aguarda sua escolha'), actions: [{ label: 'Desenvolver esta direção', variant: 'primary', next: 'ok', dir: true }] }
      ],
      ok: [
        { t: 200, status: ST('work', 'leaf', 'Kaia', 'desenvolvendo a identidade'), typing: 'leaf' },
        { t: 1500, typing: null, msg: { ag: 'leaf', text: 'Ótima escolha. A primeira versão de logo, paleta e tipografia chega com aplicações em rótulo e redes sociais, para você revisar.' } }
      ]
    }
  },
  pill: {
    kind: 'agent', ag: 'pill', title: NR('pill'), sub: 'Exemplo · loja de bicicletas (fictícia)', prompt: 'Planeje os conteúdos da próxima semana da minha loja de bicicletas.',
    intro: [{ ag: 'pill', text: 'Oi, eu sou o Otto. Diga o tema ou o objetivo e eu monto o calendário e escrevo os textos.' }],
    ctx: [{ k: 'Tom de voz', v: 'Direto, animado, sem jargão técnico', tag: 'ok', tl: 'confirmado' }, { k: 'O que funciona', v: 'Reels curtos e carrosséis de dicas', tag: 'auto', tl: 'aprendido' }, { k: 'Agenda', v: 'Passeio da comunidade no domingo', tag: 'ok', tl: 'informado por você' }],
    seqs: {
      send: [
        { t: 0, user: 'Planeje os conteúdos da próxima semana da minha loja de bicicletas.', status: ST('work', 'pill', 'Otto', 'montando o calendário'), typing: 'pill' },
        { t: 2000, typing: null, msg: { ag: 'pill', text: 'Quatro posts para a semana, alternando dica, produto e comunidade.', card: { type: 'cal' } }, status: ST('done', 'pill', 'Otto', 'calendário pronto', { time: '14:20' }), actions: [{ label: 'Aprovar calendário', variant: 'primary', next: 'ok' }, { label: 'Pedir ajuste', variant: 'soft', next: 'adj' }] }
      ],
      ok: [
        { t: 200, typing: 'pill' },
        { t: 1300, typing: null, msg: { ag: 'pill', text: 'Calendário aprovado. A Kaia começa as peças, e eu mostro tudo antes de publicar.' }, status: ST('work', 'leaf', 'Kaia', 'preparando as peças', { collaborators: ['pill'] }) }
      ],
      adj: [{ t: 200, typing: 'pill' }, { t: 1200, typing: null, msg: { ag: 'pill', text: 'Claro. Quer trocar algum tema, mudar o dia ou incluir outro formato?' } }]
    }
  },
  hex: {
    kind: 'agent', ag: 'hex', title: NR('hex'), sub: 'Exemplo · pet shop (fictício)', prompt: 'Quero vender mais banho e tosa neste fim de semana.',
    intro: [{ ag: 'hex', text: 'Oi, eu sou o Kiwi. Me diga o objetivo e quanto pode investir, e eu estruturo a campanha.' }],
    ctx: [{ k: 'Região', v: 'Atende num raio de 5 km', tag: 'ok', tl: 'confirmado' }, { k: 'Limite de verba', v: 'Até R$ 150 por campanha, sempre com aprovação', tag: 'ok', tl: 'definido por você' }, { k: 'Histórico', v: 'Anúncios com foto do pet tiveram mais cliques', tag: 'auto', tl: 'aprendido' }],
    seqs: {
      send: [
        { t: 0, user: 'Quero vender mais banho e tosa neste fim de semana.', status: ST('work', 'hex', 'Kiwi', 'estruturando a campanha'), typing: 'hex' },
        { t: 2000, typing: null, msg: { ag: 'hex', text: 'Campanha curta, para quem mora perto, com duas versões de anúncio em teste.', card: { type: 'plan' } } },
        { t: 600, status: ST('wait', 'hex', 'Kiwi', 'aguarda sua aprovação', { actionLabel: 'Revisar' }), approval: 'hex' }
      ],
      yes: [
        { t: 0, user: 'Aprovado.', typing: 'hex' },
        { t: 1300, typing: null, msg: { ag: 'hex', text: 'Combinado. Eu acompanho os dois anúncios e mantenho o que trouxer mais agendamentos.' } },
        { t: 400, note: 'nenhum anúncio foi publicado', status: ST('live', 'hex', 'Campanha em execução', '· simulação') }
      ],
      no: [
        { t: 0, user: 'Agora não.' },
        { t: 1000, msg: { ag: 'hex', text: 'Tudo bem. A campanha fica pronta, sem gastar nada até você aprovar.' }, status: ST('pause', 'hex', 'Kiwi', 'aguardando sua decisão') }
      ]
    }
  },
  funnel: {
    kind: 'agent', ag: 'funnel', title: NR('funnel'), sub: 'Exemplo · loja de roupas infantis (fictícia)', prompt: 'Quero reativar clientes que não compram há 60 dias.',
    intro: [{ ag: 'funnel', text: 'Oi, eu sou o Max. Me diga quem você quer reconquistar e eu desenho a jornada.' }],
    ctx: [{ k: 'Contatos', v: 'Só clientes que aceitaram receber e-mails', tag: 'ok', tl: 'confirmado' }, { k: 'Benefício permitido', v: 'Até 10% de desconto', tag: 'ok', tl: 'definido por você' }, { k: 'Coleção', v: 'Verão chega em 01/12', tag: 'ok', tl: 'informado por você' }],
    seqs: {
      send: [
        { t: 0, user: 'Quero reativar clientes que não compram há 60 dias.', status: ST('work', 'funnel', 'Max', 'segmentando a base'), typing: 'funnel' },
        { t: 2100, typing: null, msg: { ag: 'funnel', text: 'Encontrei 312 clientes nesse perfil que aceitaram receber e-mails. Proposta de jornada em três mensagens:', card: { type: 'journey' } }, status: ST('done', 'funnel', 'Max', 'jornada proposta', { time: '16:48' }), actions: [{ label: 'Revisar mensagens', variant: 'primary', next: 'ok' }, { label: 'Pedir ajuste', variant: 'soft', next: 'adj' }] }
      ],
      ok: [{ t: 200, typing: 'funnel' }, { t: 1300, typing: null, msg: { ag: 'funnel', text: 'As três mensagens estão prontas para revisão. O envio só acontece depois da sua aprovação.' }, status: ST('wait', 'funnel', 'Max', 'aguarda sua revisão') }],
      adj: [{ t: 200, typing: 'funnel' }, { t: 1200, typing: null, msg: { ag: 'funnel', text: 'Claro. Prefere mudar o benefício, o intervalo entre as mensagens ou o público?' } }]
    }
  },
  square: {
    kind: 'agent', ag: 'square', title: NR('square'), sub: 'Exemplo · restaurante japonês (fictício)', prompt: 'Como foi meu mês?',
    intro: [{ ag: 'square', text: 'Oi, eu sou a Íris. Pergunte sobre qualquer número e eu explico o que mudou e o que fazer.' }],
    ctx: [{ k: 'Fontes', v: 'Site de reservas e app de delivery', tag: 'ok', tl: 'autorizado por você' }, { k: 'Meta do mês', v: '400 reservas pelo site', tag: 'ok', tl: 'definida por você' }, { k: 'Mês anterior', v: '349 reservas pelo site', tag: 'auto', tl: 'histórico' }],
    seqs: {
      send: [
        { t: 0, user: 'Como foi meu mês?', status: ST('work', 'square', 'Íris', 'lendo os indicadores'), typing: 'square' },
        { t: 2000, typing: null, msg: { ag: 'square', text: 'Mês positivo, com uma ressalva.', card: { type: 'kpis' } }, status: ST('done', 'square', 'Íris', 'leitura do mês', { time: '08:30' }), actions: [{ label: 'Criar teste', variant: 'primary', next: 'ok' }, { label: 'Ver por canal', variant: 'soft', next: 'adj' }] }
      ],
      ok: [{ t: 200, typing: 'square' }, { t: 1300, typing: null, msg: { ag: 'square', text: 'Teste criado: dois posts do chef por semana até o fim do mês. Eu comparo com as semanas anteriores e aviso você.' }, status: ST('live', 'square', 'Teste em acompanhamento', '· até dia 30') }],
      adj: [{ t: 200, typing: 'square' }, { t: 1200, typing: null, msg: { ag: 'square', text: 'Das reservas atribuídas, 61% vieram das redes sociais, 27% da busca e 12% de acesso direto. O crescimento veio principalmente das redes sociais.' } }]
    }
  }
};
const CONV_ORDER = ['squad', 'coord', 'arch', 'leaf', 'pill', 'hex', 'funnel', 'square'];

const CARD = {
  today: {
    needs: [{ ag: 'leaf', t: 'Aprovar 3 peças da campanha de fim de ano', s: 'Kaia · Criação · desde ontem', act: 'Revisar', go: 'squad' }, { ag: 'coord', t: 'Confirmar o horário da loja na véspera de Natal', s: 'afeta posts e anúncios', act: 'Confirmar' }],
    running: [{ ag: 'pill', t: 'Calendário da semana', s: 'pronto seg, 9h' }, { ag: 'square', t: 'Relatório semanal', s: 'sex, 17h' }]
  },
  opps: [
    { n: '01', t: 'Programa de indicação com aula experimental', why: 'Seus alunos atuais já são o canal mais confiável.', imp: 3, eff: 1 },
    { n: '02', t: 'Perfil na busca com avaliações recentes', why: 'Quem procura pilates por perto decide por ali.', imp: 2, eff: 1 },
    { n: '03', t: 'Parceria com clínicas de fisioterapia', why: 'Público com indicação de exercício e alta permanência.', imp: 3, eff: 2 }
  ],
  dirs: [
    { name: 'Terroso', words: 'calmo · artesanal · quente', bg: '#EFE6D8', fg: '#5B3F2E', pal: ['#5B3F2E', '#B98B63', '#EFE6D8', '#2B2420'] },
    { name: 'Botânico', words: 'fresco · natural · leve', bg: '#E4EADD', fg: '#2F4A38', pal: ['#2F4A38', '#93A986', '#F2F0E6', '#1F2A22'] },
    { name: 'Noturno', words: 'íntimo · elegante · sereno', bg: '#1D2238', fg: '#E8DCC8', pal: ['#1D2238', '#4B4F7A', '#E8DCC8', '#C8A35A'] }
  ],
  cal: [
    { d: 'Seg', f: 'Reels', t: '3 ajustes antes de pedalar', c: 'Redes sociais' }, { d: 'Qua', f: 'Carrossel', t: 'Como escolher o tamanho do quadro', c: 'Redes sociais' },
    { d: 'Sex', f: 'Post', t: 'Passeio de domingo: inscrições abertas', c: 'Redes sociais' }, { d: 'Dom', f: 'Stories', t: 'Enquete: qual trilha na próxima?', c: 'Redes sociais' }
  ],
  plan: [['Canais', 'Anúncios de busca e redes sociais'], ['Público', 'Tutores de cães num raio de 5 km'], ['Período', 'sex a dom'], ['Teste', 'Foto do pet × antes e depois']],
  journey: [
    { d: 'Dia 1', t: 'Sentimos sua falta', s: 'Novidades da coleção e 10% na próxima compra' },
    { d: 'Dia 4', t: 'Lembrete gentil', s: 'Peças mais vistas por famílias com filhos da mesma idade' },
    { d: 'Dia 10', t: 'Última chamada', s: 'O benefício vale até domingo' }
  ],
  kpis: [{ l: 'Reservas pelo site', v: '412', d: '+18% vs mês anterior' }, { l: 'Pedidos de delivery', v: '1.280', d: '+4%' }, { l: 'Avaliação média', v: '4,7', d: 'estável' }]
};

// ---------------------------------------------------------------- memória do squad (R17 → R19)
// One shared memory about Miolo (fictional). The seven specialists take the same place, one at a time, as the page scrolls,
// larger and partly hidden by the bottom of the stage. Between two of them, the A9 · Hello Animation R2 language: the face turns
// away, the silhouette turns into the next one (outline and colour), whose face turns in from the other side. While one is
// there, concentrated, pieces of context keep arriving from around it and are incorporated into its head.
const M3_ORDER = ['coord', 'arch', 'leaf', 'pill', 'hex', 'funnel', 'square'];
const M3_ROLE = { coord: 'Coordenação de Marketing', arch: 'Estratégia e Inteligência', leaf: 'Marca e Criação', pill: 'Conteúdo e Comunicação', hex: 'Mídia e Performance', funnel: 'CRM e Relacionamento', square: 'Dados e Resultados' };
// pieces of context: [kind, value] (the kind shows on the nearer pieces)
const M3_ITEMS = {
  pos: ['Negócio', 'Padaria artesanal'], dif: ['Diferencial', 'Fermentação natural'], pub: ['Público', 'Clientes do bairro'],
  tom: ['Tom de voz', 'Acolhedor'], obj: ['Objetivo comercial', 'Encomendas de fim de ano'], hdec: ['Histórico de decisões', 'Sem promoções agressivas'],
  prio: ['Prioridade', 'Vendas pelo site'], trab: ['Em andamento', '3 trabalhos'],
  conc: ['Concorrência', 'Foco em desconto'], posi: ['Posicionamento', 'Artesanal e próximo'],
  idv: ['Marca', 'Identidade visual'], cor: ['Cores', 'Paleta da Miolo'], ref: ['Preferências criativas', 'Fotos com luz natural'],
  prod: ['Produtos', 'Pães e panetones'], pauta: ['Pauta', 'Bastidores do forno'],
  camp: ['Campanha', 'Fim de ano'], can: ['Canais', 'Redes sociais e busca'], meta: ['Meta', '300 encomendas'],
  cli: ['Base', 'Clientes de encomendas'], ina: ['Segmento', 'Sem comprar há 60 dias'], vol: ['Recorrência', 'Voltam todo Natal'],
  ind: ['Indicador', 'Encomendas pelo site'], hist: ['Histórico', 'Resultados de 2025'], vid: ['Aprendizado', 'Vídeo curto custa menos']
};
const M3_SW = { cor: ['#24402F', '#6E3A1C', '#F4E9D4', '#D45A26'] };
// what each specialist draws from the memory (some pieces are shared between specialists)
const M3_INFO = {
  coord: ['obj', 'prio', 'trab', 'hdec', 'pos'], arch: ['pub', 'dif', 'conc', 'posi', 'pos'], leaf: ['idv', 'cor', 'ref', 'dif', 'tom'],
  pill: ['tom', 'prod', 'pauta', 'hdec', 'pub'], hex: ['camp', 'can', 'meta', 'obj', 'pub'], funnel: ['cli', 'ina', 'vol', 'tom', 'pub'],
  square: ['ind', 'hist', 'vid', 'meta', 'hdec']
};
// the memory already knows a few things when the visitor arrives (it is not empty), and keeps growing
const M3_KNOWN0 = ['pos', 'obj'];
const M3_BASE = 16;
// stage geometry (SVG units, 640 × 520): every specialist sits at the same place, ~40% hidden by the bottom edge;
// pieces of context are incorporated around one point of the head that lies inside every silhouette
const M3_GEO = { cx: 320, cy: 455, sc: 1.72 };
const M3_HEAD = { x: 320, y: 288, jx: 62, jy: 24 };
// the flow of context: a piece every gap[0..1] ms, at three depths (near pieces show their kind; far ones are small and faint),
// each with its own flight time; at most `live` at once. Swap (A9): eyes open (pre), face turns away (out), silhouette morph,
// face turns in (in); a quicker version when the visitor is scrolling fast.
const M3_T = { gap: [340, 640], fly: [[2000, 2700], [2600, 3400], [3300, 4300]], live: 9, pre: 110, out: 230, morph: 330, in: 560, fpre: 0, fout: 120, fmorph: 200, fin: 320, look: 650 };
// A9 · the turn between each specialist and the next (backwards, the same turn mirrored):
// h = around the vertical axis (s: −1 the face leaves by the left), v = around the horizontal axis (s: +1 by the top),
// spin = turns on itself with the eyes closed; tilt = lean (deg) while turning
const M3_A9 = [{ k: 'h', s: -1 }, { k: 'v', s: 1 }, { k: 'h', s: 1, tilt: -10 }, { k: 'spin', s: 1 }, { k: 'v', s: -1 }, { k: 'h', s: -1 }];
// R23 · REDE DE MEMÓRIA VIVA. Six pieces of Miolo's context around the specialist, linked to its head by thin curved lines;
// now and then a small luminous pulse leaves a piece and travels to the head. Slots are stage fractions (s: −1 left of the
// agent, +1 right; x is the port, on the side of the card that faces the agent, kept clear of every silhouette).
const M3_SLOTS = [{ s: -1, x: 0.235, y: 0.25 }, { s: -1, x: 0.19, y: 0.475 }, { s: -1, x: 0.215, y: 0.70 }, { s: 1, x: 0.765, y: 0.285 }, { s: 1, x: 0.80, y: 0.50 }, { s: 1, x: 0.775, y: 0.715 }];
// where the lines reach the silhouette: rays from a point inside every head (svg units), angles in degrees
// (upper-left, left, upper-right, right); the line stops `gap` px short of the outline
const M3_ANC = { c: [320, 360], a: [-124, -164, -56, -16], gap: 10 };
// route i = [slot, junction (0 left · 1 right · −1 none), anchor]: the two upper-left pieces meet and reach the head together,
// the lower-left one reaches the left side, the upper-right one the upper-right, the two lower-right ones meet and reach the right
const M3_ROUTES = [[0, 0, 0], [1, 0, 0], [2, -1, 1], [3, -1, 2], [4, 1, 3], [5, 1, 3]];
// what sits in each slot for each specialist, and which of them it is using most (its colour; the others stay as shared,
// grey context). About half the pieces carry over from one specialist to the next: the base of the network stays.
const M3_NET = {
  coord: [['pos', 'prio', 'tom', 'obj', 'pub', 'hdec'], [1, 3, 5]],
  arch: [['pos', 'dif', 'posi', 'obj', 'pub', 'conc'], [1, 2, 4, 5]],
  leaf: [['idv', 'dif', 'posi', 'cor', 'pub', 'ref'], [0, 3, 5]],
  pill: [['idv', 'prod', 'tom', 'cor', 'pub', 'pauta'], [1, 2, 5]],
  hex: [['idv', 'camp', 'tom', 'meta', 'pub', 'can'], [1, 3, 4, 5]],
  funnel: [['cli', 'camp', 'tom', 'meta', 'vol', 'ina'], [0, 2, 4, 5]],
  square: [['ind', 'camp', 'hist', 'meta', 'vol', 'vid'], [0, 2, 3, 5]]
};
// what the shared memory holds (fixed: the motion never changes the count)
const M3_COUNT = 24;
// deeper shades of the light colours, for lines and trails on the light surface
const M3_INK = { pill: '#D4B000', hex: '#6FBF00', funnel: '#00AE93' };
// R23b · more intense and constant: a light keeps running along every wire (CSS dash flow), and pulses leave one after the
// other (a new one every rest[0..1] ms, up to `max` on the way). When a specialist arrives, the whole network surges in its
// colour and every piece sends one pulse at once (staggered by `burst` ms) — visible even when scrolling fast. During a
// turn the pulses on their way only slow down a little (slow) and dim (dim); the head reacts at most every `react` ms.
const M3_P = { hot: 220, fly: [900, 1250], rest: [260, 520], max: 4, pool: 6, burst: 85, slow: 0.6, dim: 0.75, trail: 92, first: 60, react: 950 };
// "O que o Squad sabe?" — R26 · a short summary: each piece is only its category (the names the memory network uses) and the
// memory itself; the suggestion stays apart, dashed, until the visitor confirms or corrects it
const M3_KNOW = [
  { c: 'Negócio', t: 'Padaria artesanal de fermentação natural' },
  { c: 'Público', t: 'Famílias do bairro e empresas no fim de ano' },
  { c: 'Tom de voz', t: 'Acolhedor, sem exagero' },
  { c: 'Objetivo comercial', t: 'Encomendas de fim de ano' },
  { c: 'Aprendizado', t: 'Vídeos curtos custam menos por clique' }
];
const M3_HYPO = 'Posts de bastidores trazem mais encomendas';

// ---------------------------------------------------------------- resultados (R21 · one story, dashboard and conversation in step)
// Miolo · Campanha de fim de ano (fictional data). 14 observed days (23/11 → 06/12) + 5 days after the approved adjustment
// (07/12 → 11/12), shown only when Íris reports back. Five moments: 1 Íris spots the cheaper format · 2 Nexo proposes moving
// R$ 120 (nothing changes yet) · 3 you decide · 4 Kiwi applies it · 5 five days later, Íris reports and the dashboard updates.
// Coherent figures (same 5-day windows): orders 116 → 149 (+28%) · average CPC R$ 0,74 → R$ 0,64 (−14%) · CPC by format
// R$ 0,62 (short videos) vs R$ 1,05 (static) · budget split 60/40 → 92/8 (R$ 120 moved, same total) → blended CPC 0,74 → 0,64.
const DAYS = ['23/11', '24/11', '25/11', '26/11', '27/11', '28/11', '29/11', '30/11', '01/12', '02/12', '03/12', '04/12', '05/12', '06/12', '07/12', '08/12', '09/12', '10/12', '11/12'];
const WD = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom', 'seg', 'ter', 'qua', 'qui', 'sex'];
const RES_N0 = 14, RES_N = 19;
const RES_V = [6, 7, 5, 8, 9, 15, 17, 13, 16, 19, 18, 25, 28, 26];
const RES_AFTER = [26, 29, 31, 30, 33];
const RES_MAX = 40;
// the conversation sets the pace; `stage` moves the dashboard with it
const RES_CHAT = {
  intro: [
    { t: 0, typing: 'square' },
    { t: 850, msg: { ag: 'square', text: 'Os vídeos curtos estão saindo bem mais baratos por clique que os anúncios estáticos.', foot: 'Tendência de poucos dias, ainda não uma conclusão.' }, stage: 1 },
    { t: 1800, typing: 'coord' },
    { t: 850, msg: { ag: 'coord', text: 'Proponho mover **R$ 120** dos estáticos para os vídeos. A verba total não muda.' }, stage: 2 },
    { t: 500, appr: true, stage: 3 }
  ],
  yes: [
    { t: 0, user: 'Aprovado.' },
    { t: 400, typing: 'hex' },
    { t: 800, msg: { ag: 'hex', text: 'Feito. Verba redistribuída nos anúncios.' }, stage: 4 },
    { t: 1400, note: '5 dias depois' },
    { t: 350, typing: 'square' },
    { t: 900, msg: { ag: 'square', text: 'As encomendas pelo site subiram em relação aos 5 dias anteriores, e o clique ficou mais barato. Sigo acompanhando.' }, stage: 5 },
    { t: 900, done: true }
  ],
  adj: [
    { t: 0, user: 'Quero ajustar.' },
    { t: 400, typing: 'coord' },
    { t: 800, msg: { ag: 'coord', text: 'Combinado. Me diga o que mudar e eu refaço a proposta. Nada muda até lá.' } },
    { t: 600, done: true }
  ],
  later: [
    { t: 0, user: 'Agora não.' },
    { t: 400, typing: 'coord' },
    { t: 800, msg: { ag: 'coord', text: 'Tudo bem. Nada muda na campanha; a proposta fica guardada.' } },
    { t: 600, done: true }
  ]
};
const RES_TYPING = { square: 'Íris está analisando…', coord: 'Nexo está organizando…', hex: 'Kiwi está aplicando o ajuste…' };

// ---------------------------------------------------------------- modo autônomo (R18 · one routine, four steps)
// The right column explains, the scene on the left shows. One example only: a weekly look at what the competition does in public
// (Miolo, fictional; no real data is collected). Request → Nexo organises Bia, Íris and Otto → findings of week 1 gather into a
// short summary while week 2 starts on its own → a summary with one opportunity; the next step stays yours.
// R31 · modo autônomo: five routines on one scene (Instagram opens). Each one: the request, the specialists who work it (Nexo always
// receives and coordinates), the texts of the four steps, its step-3 cycle in phases (ph[k] = ms from phase k to k+1; the last
// phase is ph.length), who is busy in each phase, who reacts when a phase starts ([agent, expression or null, delay]) and who
// presents the delivery. Everything is fictional and illustrative: nothing is published, sent or invested.
const SX_T = ['Você delega uma rotina.', 'Seu Squad entra em ação.', '', 'Você acompanha e decide.'];
const SX_R = [
  { id: 'ig', req: 'Publicar 3x por semana nas redes sociais.', sp: ['arch', 'pill', 'leaf'], k: true,
    t3: 'Toda semana, um novo ciclo.',
    p: ['Diga o que publicar e em quais dias. O Nexo recebe e organiza a semana.',
      'Bia define os temas, Otto escreve as legendas e Kaia cria as artes, juntos.',
      'Os três posts da semana ficam prontos e o próximo ciclo já fica agendado.',
      'Revise os posts da semana. Só depois da sua aprovação eles são programados.'],
    note: 'Nada é publicado sem a sua aprovação.',
    ph: [700, 1500, 1500, 1500, 900],
    busy: [['arch'], [], [], [], [], []],
    beat: [null, [['arch', 'happy', 0], ['leaf', 'wink', 300], ['pill', 'happy', 700]], [['arch', 'happy', 0], ['leaf', 'wink', 300], ['pill', 'happy', 700]],
      [['arch', 'happy', 0], ['leaf', 'wink', 300], ['pill', 'happy', 700]], [['coord', 'happy', 0]], [['coord', null, 0], ['arch', 'happy', 380], ['pill', 'happy', 560], ['leaf', 'happy', 740]]],
    s4: ['pill', 'leaf'],
    alt: ['Você pede: publicar 3x por semana nas redes sociais, segunda, quarta e sexta. O Nexo recebe o pedido.',
      'O Nexo organiza o trabalho: a Bia define os temas, o Otto escreve as legendas e a Kaia cria as artes.',
      'Semana 1: os posts de segunda, quarta e sexta ficam prontos, um de cada vez. A semana 2 já fica agendada.',
      'Os três posts estão prontos para a sua revisão. Você pode aprovar ou pedir ajuste. Nada é publicado sem aprovação.'] },
  { id: 'cc', req: 'Analisar a concorrência toda semana.', sp: ['arch', 'square'], k: false,
    t3: 'Toda semana, um novo ciclo.',
    p: ['Defina o que precisa acompanhar e com qual frequência. O Squad organiza o trabalho.',
      'Bia e Íris assumem o acompanhamento e trabalham juntas, sem você precisar coordená-las.',
      'O Squad acompanha as movimentações, prepara a análise e repete o processo na frequência combinada.',
      'Receba os principais aprendizados e escolha quais oportunidades vale transformar em ação.'],
    note: 'A análise acontece sozinha. Publicar ou investir continua pedindo sua autorização.',
    ph: [900, 620, 520, 620, 520, 620, 700, 820],
    busy: [['square'], [], ['arch'], [], ['arch'], [], [], [], []],
    beat: [null, [['square', 'happy', 0]], null, [['arch', 'happy', 0]], null, [['arch', 'happy', 0]], null, [['coord', 'happy', 0]],
      [['coord', null, 0], ['square', 'happy', 560], ['arch', 'happy', 1120]]],
    s4: ['arch', 'square'],
    alt: ['Você pede: analisar a concorrência toda semana. O Nexo recebe o pedido.',
      'O Nexo organiza o trabalho com a Bia, na estratégia, e a Íris, nos dados.',
      'Semana 1: nova promoção, campanha lançada e mudança na comunicação viram um resumo. A semana 2 começa sem um novo pedido.',
      'Resumo da semana: 3 movimentos identificados, uma oportunidade para a Miolo e um próximo passo sugerido. Você decide.'] },
  { id: 'rs', req: 'Acompanhar meus resultados diariamente.', sp: ['square'], k: true,
    t3: 'Todos os dias, uma nova análise.',
    p: ['Diga quais resultados quer acompanhar. O Nexo organiza a rotina diária.',
      'Íris escolhe os indicadores que importam para o seu negócio e começa a acompanhá-los.',
      'Os números são atualizados todos os dias e a Íris aponta o que mudou.',
      'Receba o que mudou e uma recomendação clara para o próximo passo.'],
    note: 'O Squad analisa e recomenda. A decisão continua sendo sua.',
    ph: [700, 1200, 1200, 1100, 900],
    busy: [['square'], ['square'], ['square'], [], [], []],
    beat: [null, [['square', 'happy', 0]], [['square', 'happy', 0]], [['square', 'happy', 0]], [['square', 'big', 0], ['coord', 'happy', 320]], [['coord', null, 0], ['square', 'happy', 380]]],
    s4: ['square'],
    alt: ['Você pede: acompanhar seus resultados diariamente. O Nexo recebe o pedido.',
      'O Nexo passa a rotina para a Íris, que escolhe três indicadores: visitas, pedidos e alcance.',
      'Segunda, terça e quarta: os números são atualizados todo dia e as visitas têm a maior alta. A análise de quinta já fica agendada.',
      'Análise de hoje: as visitas ao site subiram 35%, com uma recomendação para esta semana. Você decide.'] },
  { id: 'cp', req: 'Monitorar minhas campanhas todos os dias.', sp: ['hex', 'square'], k: true,
    t3: 'Acompanhamento todos os dias.',
    p: ['Diga quais campanhas quer acompanhar. O Nexo organiza o monitoramento diário.',
      'Kiwi acompanha as campanhas e Íris lê os números, os dois juntos, todos os dias.',
      'O desempenho é checado diariamente e as oportunidades aparecem cedo.',
      'Receba uma proposta de otimização e decida se ela segue em frente.'],
    note: 'Mudar verba ou anúncios sempre depende da sua autorização.',
    ph: [700, 1200, 1200, 1100, 900],
    busy: [['hex'], ['square'], ['hex'], ['square'], [], []],
    beat: [null, [['hex', 'serio', 0]], [['square', 'happy', 0]], [['hex', 'serio', 0]], [['square', 'big', 0], ['hex', 'happy', 340]], [['coord', null, 0], ['hex', 'happy', 380]]],
    s4: ['hex', 'square'],
    alt: ['Você pede: monitorar suas campanhas todos os dias. O Nexo recebe o pedido.',
      'O Nexo organiza o trabalho: o Kiwi acompanha as campanhas e a Íris lê os números.',
      'Segunda, terça e quarta: a Fornada de sábado rende mais e o Café da manhã rende menos. A checagem de quinta já fica agendada.',
      'Proposta de otimização: reforçar a Fornada de sábado. A verba só muda com a sua autorização.'] },
  { id: 'cl', req: 'Identificar oportunidades com meus clientes.', sp: ['funnel', 'arch', 'pill'], k: true,
    t3: 'Toda semana, novas oportunidades.',
    p: ['Diga o que quer descobrir sobre seus clientes. O Nexo organiza o acompanhamento.',
      'Max analisa sua base, Bia entende o contexto e Otto prepara a abordagem.',
      'O Squad separa quem vale reativar e quem vale fidelizar, toda semana.',
      'Receba a ação sugerida com a mensagem pronta. Você decide se ela segue.'],
    note: 'Nenhuma mensagem é enviada sem a sua aprovação.',
    ph: [700, 1400, 1300, 900],
    busy: [['funnel'], ['funnel'], ['arch'], ['pill'], []],
    beat: [null, [['funnel', 'happy', 0]], [['arch', 'big', 0]], [['arch', 'happy', 0], ['pill', 'happy', 320]], [['coord', 'happy', 0], ['funnel', 'happy', 300]]],
    s4: ['funnel', 'pill'],
    alt: ['Você pede: identificar oportunidades com seus clientes. O Nexo recebe o pedido.',
      'O Nexo organiza o trabalho: o Max analisa a base, a Bia entende o contexto e o Otto prepara a abordagem.',
      'Os clientes se dividem em dois grupos: 18 sem comprar há mais de 30 dias, para reativar, e 42 que compram toda semana, para fidelizar. A semana 2 já fica agendada.',
      'Ação sugerida: reativar 18 clientes, com uma mensagem pronta. Nenhuma mensagem é enviada sem você.'] }
];
const SX_RM = {};
SX_R.forEach((r) => { SX_RM[r.id] = r; });
// step 2: the specialists spread under Nexo; steps 3–4: everyone in one row (11% apart)
const SX_X2 = { 1: [50], 2: [32, 68], 3: [20, 50, 80] };
// who finds what at Concorrência (public moves only, fictional): Íris a promotion, Bia a campaign and a change of tone
const SX_FIND = [['square', 'Nova promoção'], ['arch', 'Campanha lançada'], ['arch', 'Mudança na comunicação']];
// scroll: one step every --sx-step px while the scene is pinned; steps 2, 3, 4 start at these progressions; a click goes to SX_GO
const SX_CUT = [0.8, 1.7, 2.6];
const SX_GO = [0.3, 1.2, 2.1, 3.0];
const SX_PIN = 68;
// C5 · Autonomous Mode (DS, institutional piece): the knob turns, one by one, into the seven agents until it becomes
// the Coordinator, who switches the mode on. Order follows the board's animation; R32 · about a third faster than the board.
const C5_ORDER = ['arch', 'leaf', 'pill', 'hex', 'funnel', 'square', 'coord'];
const C5_T = { morph: 85, hold: 115, press: 120, slide: 240, happy: 560 };

// ---------------------------------------------------------------- hero intro: each agent's Motion 07, trimmed to its main beat
const HINTRO_CUT = 980;
const HINTRO_ORDER = ['coord', 'arch', 'funnel', 'leaf', 'square', 'hex', 'pill'];
function hIdle(v) {
  return Object.keys(v).every((p) => {
    const x = v[p];
    if (p === 'sx' || p === 'sy' || p === 'fx' || p === 'fy') return Math.abs(x - 1) < 1e-6;
    if (p === 'et' || p === 'ev' || p === 'rc' || p === 'r') return Math.abs(((x % 360) + 360) % 360) < 1e-6;
    return Math.abs(x) < 1e-6;
  });
}
function hCut(tracks, T) {
  return tracks.map((kf) => {
    const out = kf.filter((k) => k[0] <= T);
    const last = out[out.length - 1];
    if (out.length > 1 && !hIdle(last[1])) out.push([T + 280, {}, 'out']);
    return out;
  }).filter((kf) => kf.length > 1);
}

// ---------------------------------------------------------------- demo · guided playback
// The visitor picks a conversation; the request is typed and sent, and a demo cursor makes the decisions the story needs.
const DPACE = 1.15;
// the cursor sets off this long before a decision's reading time ends (glide + a short hover)
const DLEAD = 2000;
// when a conversation's story is over, it starts again after this pause (plus the reading time of the last message)
const DLOOP = 4200;
const DSCRIPT = {
  squad: ['choice:0', 'approval:adjust', 'approval:approve'],
  coord: ['today:Confirmar'],
  arch: ['action:0'],
  leaf: ['dir:1', 'action:0'],
  pill: ['action:0'],
  hex: ['approval:approve'],
  funnel: ['action:0'],
  square: ['action:0']
};
function dWords(s) { return String(s || '').split(/\s+/).filter(Boolean).length; }
function dRead(op) {
  if (!op) return 0;
  const t = op.msg ? op.msg.text : (op.user || op.note || '');
  return 900 + dWords(t) * 150 + (op.msg && op.msg.card ? 1600 : 0);
}

// ---------------------------------------------------------------- R22 · perguntas frequentes (#faq)
// Nine questions a business owner may have before creating an account. Answers stay short and do not promise anything the
// product has not confirmed (no prices, credit amounts, plans or integrations). One answer open at a time.
const FAQ = [
  { q: 'O que é a HelloSquad?', a: ['A HelloSquad reúne sete agentes de IA especializados em diferentes áreas do marketing.', 'Eles conhecem o contexto do seu negócio, colaboram entre si e ajudam a transformar suas necessidades em trabalhos e entregas.'] },
  { q: 'Preciso entender de marketing para usar?', a: ['Não. Você pode explicar o que precisa com suas próprias palavras.', 'O Squad ajuda a organizar suas ideias, identificar os especialistas necessários e desenvolver o trabalho com você.'] },
  { q: 'Posso conversar diretamente com cada agente?', a: ['Sim. Você pode falar com o Nexo, conversar diretamente com um especialista ou usar a Sala do Squad.', 'Quando um trabalho exige diferentes competências, os agentes podem colaborar entre si.'] },
  { q: 'O que os agentes podem fazer pelo meu negócio?', a: ['O Squad foi pensado para ajudar com estratégia, identidade visual, conteúdos, campanhas, relacionamento com clientes e análise de resultados.', 'As entregas disponíveis dependem das funcionalidades e do plano contratado.'] },
  { q: 'Como funciona o Modo Autônomo?', a: ['Você pode delegar responsabilidades recorrentes, como preparar conteúdos toda semana ou acompanhar resultados.', 'O Squad organiza os próximos ciclos dentro do escopo combinado. Você acompanha o andamento e participa das decisões necessárias.'] },
  { q: 'O Squad pode publicar ou investir sem minha aprovação?', a: ['Conectar uma conta ou pedir um trabalho não significa autorizar qualquer ação.', 'Publicações, envios e investimentos dependem das permissões e aprovações correspondentes. Você mantém o controle sobre os limites da operação.'] },
  { q: 'Como os agentes conhecem minha marca?', a: ['A Memória do Squad reúne informações sobre seu negócio, identidade, objetivos, preferências e decisões anteriores.', 'Esse conhecimento pode ser compartilhado entre os especialistas e complementado ou corrigido ao longo do tempo.'] },
  { q: 'Preciso conectar minhas redes sociais para começar?', a: ['Não. Você pode começar compartilhando as informações que já tem. Site, arquivos e canais podem ajudar o Squad a entender melhor seu negócio.', 'As conexões disponíveis podem ser configuradas conforme as integrações oferecidas pela plataforma.'] },
  { q: 'Posso começar gratuitamente? Como funcionam os créditos?', a: ['Criar uma conta é gratuito. Algumas entregas podem usar créditos, conforme o plano e o tipo de trabalho.', 'As condições e os custos aplicáveis devem ser apresentados com clareza antes da execução.'] }
];

// ---------------------------------------------------------------- encerramento (R25) · the A9 signature, typing only
// From the A9 · Hello Animation R2 board (a GIF, no source code): its last part, without the agents. "Hello," is there with a
// blinking cursor; the cursor types "Squad" (the cadence of the reference); the comma fades; the two words join into the
// HelloSquad wordmark; then "Criar conta grátis" appears under it. Times in ms from the start.
const A9_TL = { cur: [[0, 1], [420, 0], [720, 1], [1140, 0], [1400, 1], [2260, 0]], keys: [1520, 1640, 1720, 1840, 1920], comma: [2260, 2400], join: [2460, 2980], cta: 3140, end: 3600 };
// layout (em of the line): cursor width; gap from the baseline to the button
const A9_L = { cw: 0.062, gap: 0.42 };

// ---------------------------------------------------------------- helpers
const CLOCK0 = { squad: 550, coord: 548, arch: 600, leaf: 680, pill: 855, hex: 930, funnel: 1005, square: 505 };
const R_GRP = { hero: 360, glow: 260, auto: 420, mem: 300, faq: 460 };
const STEPS0 = function () {
  return [
    { label: 'Conceito e público', ags: ['arch'], st: 'todo', done: 'Conceito definido' },
    { label: 'Peças e textos', ags: ['leaf', 'pill'], st: 'todo', done: 'Peças prontas' },
    { label: 'Plano de divulgação', ags: ['hex'], st: 'todo', done: 'Divulgação planejada' },
    { label: 'Sua aprovação', ags: [], you: true, st: 'todo', done: 'Aprovado por você' }
  ];
};
function rnd(a, b) { return a + Math.random() * (b - a); }
function hhmm(m) { const h = Math.floor(m / 60), mm = m % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; }

class Component extends DCLogic {
  constructor(props) {
    super(props);
    const cv = {};
    CONV_ORDER.forEach((id) => { cv[id] = this._freshConv(id); });
    this.state = {
      prompt: '', heroTouched: false, chipSel: -1, heroSending: false,
      hL: { W: 1440, H: 900, k: 1, sx: 1, ok: false, cw: 262, ch: 52, tagW: 104 }, heroPhase: null, heroAgs: [], heroSlot: 'band', relay: { m: 0, ags: [], called: 0 }, ctaLive: false,
      modal: null, email: '', signup: 'rest', saved: '', demoPanel: false,
      hdr: false,
      conv: 'squad', cv: cv, demoTouched: false,
      sq: 'coord', sqTouched: false, sqHover: false, helloPrev: '',
      autoOn: false, autoVis: false,
      sxStep: 1, sxPh: 0, sxR: 'ig', sxTxt: 'ig', sxPrev: '', sxPrevSt: 0, sxPrevPh: 0, sxDec: '', sxCut: false, sxSw: false,
      m3Ag: null, m3Learn: [], m3Open: false, m3Hypo: null,
      faqOpen: -1,
      resHover: -1, resDec: null, resMsgs: [], resTyping: null, resAppr: false, resDone: false, resStage: 0,
      m3: false
    };
    this._ct = {}; this._timers = []; this._intervals = []; this._ht = []; this._htok = 0;
    this._vis = {}; this._whenVis = {};
    this._mv = {}; HORDER.forEach((n) => { this._mv[n] = { tracks: [], lift: 0, on: false, eyes: 1 }; });
    this._smv = {}; ORDER.forEach((n) => { this._smv[n] = { tracks: [], lift: 0, on: false }; });
    this._mmv = {}; ORDER.forEach((n) => { this._mmv[n] = { tracks: [], lift: 0, on: false }; });
    this._amv = {}; ORDER.forEach((n) => { this._amv[n] = { tracks: [], lift: 0, on: false }; });
  }

  // ------------------------------------------------------------ timers
  _later(fn, ms) { const id = setTimeout(fn, ms); this._timers.push(id); return id; }
  _ctLater(cid, fn, ms) { const id = setTimeout(fn, ms); (this._ct[cid] = this._ct[cid] || []).push(id); return id; }
  _ctClear(cid) { (this._ct[cid] || []).forEach(clearTimeout); this._ct[cid] = []; }

  // ------------------------------------------------------------ demo engine
  _freshConv(id) {
    const d = CONVS[id];
    return {
      msgs: d.intro.map((m, i) => Object.assign({ k: id + '-i' + i, time: hhmm(CLOCK0[id]) }, m)),
      typing: null,
      status: d.status0 || { kind: 'idle', lead: null, message: NAME[d.ag], detail: 'aguardando seu pedido' },
      choices: null, approval: null, actions: null, input: '', sending: false, started: false,
      work: { has: false, live: false, steps: STEPS0() }, dir: 1, confirmed: false, n: 0
    };
  }
  _apply(id, op) {
    this.setState((s) => {
      const c = Object.assign({}, s.cv[id]);
      const push = (m) => { c.n = c.n + 1; c.msgs = c.msgs.concat([Object.assign({ k: id + '-' + c.n, time: hhmm(CLOCK0[id] + c.n) }, m)]); };
      if (op.user) push({ user: true, text: op.user });
      if (op.msg) push(op.msg);
      if (op.note) push({ note: true, text: op.note });
      if ('typing' in op) c.typing = op.typing;
      if (op.status) c.status = op.status;
      if ('sending' in op) c.sending = op.sending;
      if ('choices' in op) c.choices = op.choices;
      if ('actions' in op) c.actions = op.actions;
      if ('approval' in op) c.approval = op.approval;
      if (op.work) c.work = Object.assign({}, c.work, op.work);
      if (op.step) {
        const steps = c.work.steps.map((x, i) => (i === op.step[0] ? Object.assign({}, x, { st: op.step[1] }) : x));
        c.work = Object.assign({}, c.work, { steps: steps });
      }
      const cv = Object.assign({}, s.cv); cv[id] = c;
      return { cv: cv };
    });
  }
  _play(id, name) {
    const seq = CONVS[id].seqs[name];
    if (!seq) return;
    // paced so each message can be read before the next one lands; the typing indicator fills the wait
    let acc = 0, lastAt = 0, lastOp = null;
    seq.forEach((op) => {
      acc += Math.round((op.t || 0) * DPACE);
      const says = op.msg || op.user || op.note;
      if (says && lastOp) acc = Math.max(acc, lastAt + Math.round(dRead(lastOp) * (lastOp.user ? 0.45 : 1)));
      this._ctLater(id, () => this._apply(id, op), acc);
      if (says) { lastAt = acc; lastOp = op; }
    });
    const tail = lastOp ? Math.max(acc + 400, lastAt + dRead(lastOp)) : acc + 600;
    // the demo cursor sets off toward the next decision while the last message is still being read (once its button exists);
    // the click itself waits until that reading time is over
    const t0 = performance.now(), lead = this._rm ? 0 : DLEAD;
    this._ctLater(id, () => { if (this._dPlay === id) this._demoNext(id, t0 + tail + 200); }, Math.max(acc + 160, tail - lead));
  }
  _patchConv(id, patch) {
    this.setState((s) => { const cv = Object.assign({}, s.cv); cv[id] = Object.assign({}, s.cv[id], patch); return { cv: cv }; });
  }
  _send(id, value) {
    const d = CONVS[id], c = this.state.cv[id];
    if (!c || c.sending) return;
    const v = String(value || '').trim();
    if (!v) return;
    if (!c.started && v === d.prompt) {
      this._patchConv(id, { started: true, input: '', choices: null, actions: null });
      this._play(id, 'send');
      return;
    }
    const ag = d.ag || 'coord';
    this._savePrompt(v);
    this._patchConv(id, { input: '', actions: null, choices: null });
    this._apply(id, { user: v, typing: ag });
    const acts = [];
    if (!c.started) acts.push({ label: 'Ver o exemplo', variant: 'soft', next: '__example', silent: true });
    acts.push({ label: 'Criar conta grátis', variant: 'primary', signup: true, silent: true });
    this._ctLater(id, () => this._apply(id, { typing: null, msg: { ag: ag, text: 'Nesta demonstração as respostas são pré-definidas. Seu pedido fica guardado para quando você criar sua conta.' }, actions: acts }), 1300);
  }
  _choose(id, item) {
    const cc = this.state.cv[id];
    if (!cc || (!cc.choices && !cc.actions)) return;
    if (item.go === 'results') { this._scrollTo('resultados'); return; }
    if (item.signup) { this._openModal('signup'); return; }
    const c = this.state.cv[id];
    let label = item.label;
    if (item.dir) label = 'Desenvolver a direção ' + CARD.dirs[c.dir].name + '.';
    this._patchConv(id, { choices: null, actions: null });
    if (item.next === '__example') {
      this._patchConv(id, { started: true });
      this._play(id, 'send');
      return;
    }
    if (!item.silent) this._apply(id, { user: label });
    this._play(id, item.next);
  }
  _decide(id, which) {
    const c = this.state.cv[id], ap = APPROVALS[c.approval];
    if (!ap) return;
    this._patchConv(id, { approval: null });
    this._play(id, ap[which]);
  }
  _resetConv(id) {
    this._ctClear(id);
    this.setState((s) => { const cv = Object.assign({}, s.cv); cv[id] = this._freshConv(id); return { cv: cv }; });
  }
  _pickConv(id) { this._demoStart(id, 260); }

  // ------------------------------------------------------------ demo · guided playback
  // The visitor only chooses the conversation. The request is typed and sent, the story plays at reading pace,
  // and a demo cursor makes the decisions the story needs (nothing is published, sent or spent).
  _dLater(fn, ms) { return this._ctLater('_demo', fn, ms); }
  _demoStop() {
    this._dTok = (this._dTok || 0) + 1; this._dPlay = null;
    if (this._whenVis) this._whenVis.demo = null;
    this._ctClear('_demo');
    if (this._curAnim) { try { this._curAnim.cancel(); } catch (e) { } this._curAnim = null; }
    this._curPos = null;
    document.querySelectorAll('.lp-dhover, .lp-dpress').forEach((e) => e.classList.remove('lp-dhover', 'lp-dpress'));
    this._cursorHide();
  }
  _demoStart(id, delay) {
    const prev = this.state.conv;
    this._demoStop();
    CONV_ORDER.forEach((k) => this._ctClear(k));
    this._dPlay = id; this._dStep = 0;
    const tok = this._dTok;
    this.setState((s) => {
      const cv = Object.assign({}, s.cv);
      if (prev && prev !== id) cv[prev] = this._freshConv(prev);
      const f = this._freshConv(id); f.input = ''; cv[id] = f;
      return { cv: cv, conv: id, demoTouched: true };
    });
    this._dLater(() => this._demoType(id, tok), delay == null ? 360 : delay);
  }
  _demoType(id, tok) {
    if (tok !== this._dTok) return;
    const text = CONVS[id].prompt;
    // the send click waits until the whole request is in the field (never sends half a sentence)
    const full = () => { const c = this.state.cv[id]; return !!c && c.input === text && !!document.querySelector('.lp-chat-f .hs-send.is-ready'); };
    const send = () => this._demoClick(tok, () => document.querySelector('.lp-chat-f .hs-send'), null, { fast: true, ready: full });
    if (this._rm) { this._patchConv(id, { input: text }); this._dLater(send, 400); return; }
    const gaps = [];
    for (let i = 1; i < text.length; i += 1) gaps.push(rnd(22, 40) + (text[i - 1] === ' ' ? 18 : 0));
    const total = gaps.reduce((a, b) => a + b, 0);
    let k = 0;
    const step = () => {
      if (tok !== this._dTok) return;
      k += 1;
      this._patchConv(id, { input: text.slice(0, k) });
      if (k < text.length) this._dLater(step, gaps[k - 1]);
    };
    step();
    // the cursor already glides toward "send" while the last words are typed, and presses it right after
    this._dLater(send, Math.max(0, total + 240 - 1340));
  }
  _demoTarget(st) {
    const p = st.split(':'), kind = p[0], arg = p[1];
    const q = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));
    return () => {
      if (kind === 'choice') return q('.lp-scroll .lp-choices .lp-choice')[+arg] || null;
      if (kind === 'action') return q('.lp-scroll .lp-actions .hs-btn')[+arg] || null;
      if (kind === 'dir') return q('.lp-scroll .lp-dirs .lp-dir')[+arg] || null;
      if (kind === 'approval') return document.querySelector('.lp-scroll .hs-approve ' + (arg === 'adjust' ? '.hs-btn--soft' : '.hs-btn--pri'));
      if (kind === 'today') return q('.lp-scroll .lp-minibtn').find((b) => b.textContent.trim() === arg) || null;
      return null;
    };
  }
  _demoNext(id, nb, tries) {
    if (this._dPlay !== id) return;
    const script = DSCRIPT[id] || [], tok = this._dTok;
    while (this._dStep < script.length) {
      const st = script[this._dStep], get = this._demoTarget(st);
      // the button may land a frame later than the cursor sets off: wait a little for it before moving on
      if (!get() && (tries || 0) < 20) { this._dLater(() => this._demoNext(id, nb, (tries || 0) + 1), 80); return; }
      this._dStep += 1;
      tries = 0;
      if (get()) {
        const chain = /^(dir|today):/.test(st);
        this._demoClick(tok, get, chain ? () => this._dLater(() => this._demoNext(id, performance.now() + 520), 380) : null, { notBefore: nb });
        return;
      }
    }
    this._dPlay = null;
    this._demoEnd(id, nb);
  }
  _isVis(k) { return !this._io6 || !!this._vis[k]; }
  _demoEnd(id, nb) {
    const tok = this._dTok, wait = Math.max(0, (nb || 0) - performance.now()) + DLOOP;
    this._dLater(() => this._demoLoop(id, tok), wait);
  }
  _demoLoop(id, tok) {
    if (tok !== this._dTok || this.state.conv !== id) return;
    // the visitor is writing or has the sign-up open: wait for them
    const a = document.activeElement, c = this.state.cv[id];
    if (this.state.modal || (c && c.input) || (a && a.closest && a.closest('.lp-chat-f'))) { this._dLater(() => this._demoLoop(id, tok), 3000); return; }
    if (!this._isVis('demo')) { this._whenVis.demo = () => this._demoLoop(id, tok); return; }
    this._demoStart(id, 300);
  }
  _cursorHide() { const c = document.querySelector('.lp-dcur'); if (c) c.classList.remove('is-on', 'is-down'); }
  // move the demo cursor to the target, hover, press, click (the real handler runs), then fade
  _demoClick(tok, getEl, after, o) {
    if (tok !== this._dTok) return;
    o = o || {};
    const D0 = o.fast ? 100 : 220, DUR = o.fast ? 760 : 860;
    const el0 = getEl();
    if (!el0) { if (after) after(); return; }
    const sc = el0.closest('.lp-scroll');
    if (sc) { const r = el0.getBoundingClientRect(), sr = sc.getBoundingClientRect(); if (r.bottom > sr.bottom - 16) sc.scrollTop += r.bottom - sr.bottom + 48; }
    this._dLater(() => {
      if (tok !== this._dTok) return;
      const el = getEl(), win = document.querySelector('.lp-demo-win'), cur = document.querySelector('.lp-dcur');
      if (!el || !win || !cur) { if (after) after(); return; }
      const W = win.getBoundingClientRect(), r = el.getBoundingClientRect();
      const x = r.left - W.left + Math.min(r.width * 0.5, 54), y = r.top - W.top + r.height * 0.56;
      const from = cur.classList.contains('is-on') && this._curPos ? this._curPos : { x: Math.max(40, x - 120), y: Math.min(W.height - 40, y + 150) };
      const dur = this._rm ? 0 : DUR;
      if (this._curAnim) { try { this._curAnim.cancel(); } catch (e) { } }
      cur.style.transform = 'translate(' + from.x + 'px, ' + from.y + 'px)';
      cur.classList.add('is-on');
      if (dur && cur.animate) {
        this._curAnim = cur.animate([
          { transform: 'translate(' + from.x + 'px, ' + from.y + 'px)' },
          { transform: 'translate(' + ((from.x + x) / 2 + 18) + 'px, ' + (Math.min(from.y, y) - 26) + 'px)', offset: 0.55 },
          { transform: 'translate(' + x + 'px, ' + y + 'px)' }
        ], { duration: dur, delay: D0, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'backwards' });
      }
      cur.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
      this._curPos = { x: x, y: y };
      const t1 = D0 + dur, wait = o.notBefore ? Math.max(0, o.notBefore - performance.now()) : 0;
      this._dLater(() => { if (tok === this._dTok && document.body.contains(el)) el.classList.add('lp-dhover'); }, t1 - 140);
      this._dLater(() => { if (tok !== this._dTok) return; cur.classList.add('is-down'); el.classList.add('lp-dpress'); }, Math.max(t1 + 300, wait - 140));
      const release = () => {
        if (tok !== this._dTok) return;
        if (o.ready && !o.ready()) { this._dLater(release, 60); return; }
        cur.classList.remove('is-down', 'is-click'); void cur.offsetWidth; cur.classList.add('is-click');
        el.classList.remove('lp-dpress', 'lp-dhover');
        if (document.body.contains(el)) el.click();
        if (after) after();
        this._dLater(() => { if (tok === this._dTok) cur.classList.remove('is-on'); }, 1260);
      };
      this._dLater(release, Math.max(t1 + 440, wait));
    }, sc ? 380 : (o.fast ? 40 : 120));
  }

  // ------------------------------------------------------------ navigation & signup
  _scrollTo(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: this._rm ? 'auto' : 'smooth', block: 'start' });
  }
  _savePrompt(v) {
    this.setState({ saved: v });
    try { window.sessionStorage.setItem('hs-landing-pedido', v); } catch (e) { }
  }
  _openModal(mode) {
    this.setState({ modal: mode, signup: 'rest' });
    if (this._eng) this._eng.modes.hero.coord = 'attend';
    this._later(() => { const i = document.querySelector('.lp-in'); if (i) i.focus(); }, 80);
  }
  _closeModal() {
    this.setState({ modal: null, heroSending: false });
    if (this._eng) this._eng.modes.hero.coord = 'idle';
  }

  // ------------------------------------------------------------ hero · fluid layout
  // The section takes the real viewport height (canvas: the visible part of the frame). Text spacing follows --hh in CSS;
  // the squad is scaled (k) to fit between the CTAs and the bottom edge, and spread (sx) to keep filling wide screens.
  _heroLayout() {
    const hero = document.querySelector('.lp-hero');
    if (!hero) return;
    const W = Math.round(hero.clientWidth || window.innerWidth || 1440);
    const ih = window.innerHeight || 900;
    let H = ih <= 1400 ? ih : (this._frameVH || 900);
    H = Math.round(Math.max(620, Math.min(1080, H)));
    const L = this.state.hL;
    if (W !== L.W || H !== L.H) this.setState({ hL: Object.assign({}, L, { W: W, H: H }) });
    this._heroFitSoon();
  }
  _heroFitSoon() {
    if (this._fitRaf) cancelAnimationFrame(this._fitRaf);
    this._fitRaf = requestAnimationFrame(() => { this._fitRaf = requestAnimationFrame(() => { this._fitRaf = 0; this._heroFit(); }); });
  }
  _heroFit() {
    const hero = document.querySelector('.lp-hero'), ctas = document.querySelector('.lp-hero-ctas');
    if (!hero || !ctas || !this._eng) return;
    const L = this.state.hL;
    const cb = ctas.getBoundingClientRect().bottom - hero.getBoundingClientRect().top;
    const we = Math.max(1024, Math.min(2560, L.W));
    let k = Math.min(we / 1440, (L.H - cb - 22) / 309);
    k = Math.max(0.6, Math.min(1.22, k));
    const sx = Math.max(1, Math.min(1.38, (we / 1440) / k));
    const b = document.querySelector('.lp-hero .lp-cta .hs-btn');
    const cw = b ? Math.round(b.offsetWidth) : L.cw, ch = b ? Math.round(b.offsetHeight) : L.ch;
    const tg = document.querySelector('.lp-hero .lp-rl-pill .hs-tag'), tagW = tg && tg.offsetWidth ? tg.offsetWidth : L.tagW;
    if (Math.abs(k - L.k) > 0.002 || Math.abs(sx - L.sx) > 0.002 || !L.ok || cw !== L.cw || ch !== L.ch || tagW !== L.tagW) {
      this.setState({ hL: Object.assign({}, L, { k: k, sx: sx, ok: true, cw: cw, ch: ch, tagW: tagW }) });
      if (!L.ok) this._later(() => this._heroIntro(), 40);
    }
    this._eng.dirty = true;
    this._later(() => { if (this._eng) this._eng.dirty = true; }, 60);
  }
  _heroGeo() {
    const L = this.state.hL, key = L.W + ':' + L.H + ':' + L.k.toFixed(4) + ':' + L.sx.toFixed(4);
    if (this._geoKey === key) return this._geo;
    const u = 0.75 * L.k, cx = L.W / 2, pos = {};
    HORDER.forEach((n) => { const p = HPOS[n]; pos[n] = { X: cx + (p[0] - 960) * u * L.sx, Y: L.H - (1200 - p[1]) * u, S: p[2] * u, r: p[3], inner: p[4] }; });
    // R30 · Marca e Criação sits against Estratégia (a slight overlap, its flat shadow on the arch) instead of drifting away when the
    // composition widens on large screens: its distance follows the arch with almost none of the horizontal stretch
    pos.leaf.X = pos.arch.X - 375 * u * (1 + (L.sx - 1) * 0.1);
    const tr = (q, dx, dy) => 'translate(' + (q.X + dx).toFixed(2) + ' ' + (q.Y + dy).toFixed(2) + ')' + (q.r ? ' rotate(' + q.r + ')' : '') + ' scale(' + q.S.toFixed(4) + ')' + q.inner;
    const t = {}, sh = {}, org = {}, rank = {};
    HORDER.slice().sort((a, b) => pos[a].X - pos[b].X).forEach((n, i) => { rank[n] = i; });
    HORDER.forEach((n, i) => {
      t[n] = tr(pos[n], 0, 0);
      org[n] = 'transform-origin: ' + pos[n].X.toFixed(1) + 'px ' + (pos[n].Y + HBOTTOM[n] * pos[n].S).toFixed(1) + 'px';
      HORDER.slice(i + 1).forEach((f) => { sh[n + '_' + f] = tr(pos[f], Math.sign(pos[n].X - pos[f].X) * 15 * u, 5 * u); });
    });
    this._geoKey = key;
    this._geo = { w: L.W, h: L.H, t: t, sh: sh, org: org, rank: rank, pos: pos };
    return this._geo;
  }

  // ------------------------------------------------------------ hero · suggestion band (DS SuggestionBand behaviour, squad chips, drag)
  // One position source: the CSS marquee animation. Hover/keyboard/sequence ease its playbackRate; dragging writes its currentTime.
  _bandEl() { return document.querySelector('.lp-hband .hs-viewport'); }
  _bandAnim() {
    if (this._bA) return this._bA;
    const tr = document.querySelector('.lp-hband .hs-track');
    const l = tr && tr.getAnimations ? tr.getAnimations() : [];
    this._bA = l.length ? l[0] : null;
    return this._bA;
  }
  _bandInit() {
    const tr = document.querySelector('.lp-hband .hs-track'), set = document.querySelector('.lp-hband .hs-set:not(.hs-dup)');
    if (!tr || !set || !set.offsetWidth) return;
    const a0 = this._bandAnim(), keep = a0 ? a0.currentTime / a0.effect.getTiming().duration : 0;
    tr.style.animationDuration = (set.offsetWidth / 28).toFixed(2) + 's';
    tr.setAttribute('data-run', '1');
    this._bA = null;
    const a = this._bandAnim();
    if (a && keep) a.currentTime = keep * a.effect.getTiming().duration;
    this._bandSync(true);
    this._bandDragInit();
  }
  _bandHold(k, v, now) {
    this._bHold = this._bHold || {};
    if (!!this._bHold[k] === !!v) return;
    this._bHold[k] = !!v;
    this._bandSync(now);
  }
  _bandSync(now) {
    const h = this._bHold || {}, hold = !!(h.hover || h.kbd || h.seq || h.off || h.press);
    if (now) { const a = this._bandAnim(); if (this._bRaf) { cancelAnimationFrame(this._bRaf); this._bRaf = 0; } if (a) a.playbackRate = hold ? 0 : 1; return; }
    this._bandEase(hold ? 0 : 1, hold ? 520 : 820);
  }
  _bandEase(target, ms) {
    const a = this._bandAnim();
    if (!a) return;
    if (this._bRaf) cancelAnimationFrame(this._bRaf);
    const from = a.playbackRate, t0 = performance.now();
    const step = (now) => {
      const q = Math.min(1, (now - t0) / ms), e = target < from ? 1 - Math.pow(1 - q, 3) : q * q * (3 - 2 * q);
      a.playbackRate = from + (target - from) * e;
      this._bRaf = q < 1 ? requestAnimationFrame(step) : 0;
    };
    this._bRaf = requestAnimationFrame(step);
  }
  _bandReveal(chip) {
    const a = this._bandAnim(), el = this._bandEl(), set = el && el.querySelector('.hs-set:not(.hs-dup)');
    if (!a || !set || !chip) return;
    const sw = set.offsetWidth, dur = a.effect.getTiming().duration, BW = el.clientWidth, X0 = 240 - sw, fade = 120;
    const now = a.currentTime || 0, m = ((now % dur) + dur) % dur;
    const L = chip.offsetLeft, w = chip.offsetWidth, pos = L + X0 - (m / dur) * sw;
    if (pos >= fade + 8 && pos + w <= BW - fade - 8) return;
    const X = Math.min(X0, Math.max(X0 - sw + 1, BW / 2 - L - w / 2)), target = ((X0 - X) / sw) * dur, t0 = performance.now();
    if (this._bRaf) cancelAnimationFrame(this._bRaf);
    a.playbackRate = 0;
    const step = (tt) => {
      const k = Math.min(1, (tt - t0) / 520), e2 = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      a.currentTime = m + (target - m) * e2; el.scrollLeft = 0;
      this._bRaf = k < 1 ? requestAnimationFrame(step) : 0;
    };
    this._bRaf = requestAnimationFrame(step);
  }
  // drag: a 6px threshold separates a click (selects the prompt) from a drag (moves the band); a drag never selects
  _bandDragInit() {
    const vp = this._bandEl();
    if (!vp || vp.getAttribute('data-drag')) return;
    vp.setAttribute('data-drag', '1');
    let st = null;
    const end = (e, cancel) => {
      if (!st || (e && e.pointerId !== st.id)) return;
      const was = st.on; st = null;
      vp.classList.remove('is-drag');
      if (was) {
        this._bandDragged = !cancel;
        setTimeout(() => { this._bandDragged = false; }, 0);
        try { vp.releasePointerCapture(e.pointerId); } catch (er) { }
      }
      if (this._bDragT) clearTimeout(this._bDragT);
      this._bDragT = setTimeout(() => this._bandHold('press', false), was ? 650 : 0);
    };
    this._bandDown = (e) => {
      if ((e.pointerType === 'mouse' && e.button !== 0) || this._rm) return;
      const a = this._bandAnim(), set = vp.querySelector('.hs-set:not(.hs-dup)');
      if (!a || !set || !set.offsetWidth) return;
      if (this._bDragT) clearTimeout(this._bDragT);
      st = { id: e.pointerId, x0: e.clientX, y0: e.clientY, m0: a.currentTime || 0, sw: set.offsetWidth, dur: a.effect.getTiming().duration, on: false };
      this._bandHold('press', true, true);
    };
    this._bandMove = (e) => {
      if (!st || e.pointerId !== st.id) return;
      const dx = e.clientX - st.x0;
      if (!st.on) {
        if (Math.abs(dx) < 6) return;
        if (e.pointerType !== 'mouse' && Math.abs(e.clientY - st.y0) > Math.abs(dx)) { end(e, true); return; }
        st.on = true; st.x0 = e.clientX; st.m0 = this._bandAnim().currentTime || 0;
        try { vp.setPointerCapture(e.pointerId); } catch (er) { }
        vp.classList.add('is-drag');
        return;
      }
      const a = this._bandAnim();
      if (!a) return;
      const d = st.dur, tt = st.m0 - ((e.clientX - st.x0) / st.sw) * d;
      a.currentTime = ((tt % d) + d) % d;
      vp.scrollLeft = 0;
      e.preventDefault();
    };
    this._bandUp = (e) => end(e, false);
    this._bandCancel = (e) => end(e, true);
    this._bandClick = (e) => { if (this._bandDragged) { e.stopPropagation(); e.preventDefault(); this._bandDragged = false; } };
    vp.addEventListener('pointerdown', this._bandDown);
    vp.addEventListener('pointermove', this._bandMove);
    vp.addEventListener('pointerup', this._bandUp);
    vp.addEventListener('pointercancel', this._bandCancel);
    vp.addEventListener('click', this._bandClick, true);
    vp.addEventListener('dragstart', (e) => e.preventDefault());
  }

  // ------------------------------------------------------------ hero · agent motion
  // Bodies move from JS (not CSS) so each flat shadow can follow the agent that casts it while staying clipped to the one it falls on.
  _move(n, name, delay, dir, set) {
    if (this._rm || !HMOVES[name]) return;
    const m = (set || this._mv)[n], t0 = performance.now() + (delay || 0);
    HMOVES[name](dir || 1).forEach((kf) => m.tracks.push({ t0: t0, kf: kf, end: kf[kf.length - 1][0] }));
  }
  _mvVal(m, t) {
    const v = { tx: 0, ty: 0, r: 0, rc: 0, sx: 1, sy: 1, fx: 1, fy: 1, et: 0, ev: 0, lx: 0, ly: 0, lk: 0, ec: 0 };
    m.tracks = m.tracks.filter((tr) => t < tr.t0 + tr.end + 34);
    const add = ['tx', 'ty', 'r', 'rc', 'et', 'ev', 'lx', 'ly'], mul = ['sx', 'sy', 'fx', 'fy'], mx = ['lk', 'ec'];
    m.tracks.forEach((tr) => {
      const el = t - tr.t0;
      if (el <= 0) return;
      const kf = tr.kf;
      let i = 1;
      while (i < kf.length - 1 && el > kf[i][0]) i += 1;
      const A = kf[i - 1], B = kf[i], span = Math.max(1, B[0] - A[0]);
      const q = Math.max(0, Math.min(1, (el - A[0]) / span)), e = (HEASE[B[2]] || HEASE.io)(q);
      const a = A[1], b = B[1];
      add.forEach((p) => { v[p] += (a[p] || 0) + ((b[p] || 0) - (a[p] || 0)) * e; });
      mul.forEach((p) => { const x = a[p] == null ? 1 : a[p], y = b[p] == null ? 1 : b[p]; v[p] *= x + (y - x) * e; });
      mx.forEach((p) => { const x = a[p] || 0, y = b[p] || 0; v[p] = Math.max(v[p], x + (y - x) * e); });
    });
    return v;
  }
  // hero · a called specialist jumps (its own height and style). R21: a big jump; it may pass behind the buttons and the
  // status line (they stay on top) but never reaches the request field
  _hop(a, delay) {
    if (this._rm) return 0;
    const P = HHOP[a];
    if (!P) { this._move(a, 'perk', delay); return 0; }
    const k = this.state.hL.k || 1;
    let H = P.h;
    const body = document.querySelector('.lp-hero-ags [data-hn="' + a + '"]'), lim = document.querySelector('.lp-hero-field') || document.querySelector('.lp-hero-slot');
    if (body && lim) {
      const b = body.getBoundingClientRect(), c = lim.getBoundingClientRect();
      // apex + stretch + tilt must stay under the request field; stretch and tilt scale with the height (see hopTracks)
      const room = b.top - c.bottom - 14;
      const extra = ((1 - P.sq) * 0.35 * b.height + Math.abs(Math.sin((P.rc || 0) * Math.PI / 180)) * b.width / 2) / P.h;
      H = Math.max(0, Math.min(H, room / (k + extra)));
    }
    const hp = hopTracks(P, H), m = this._mv[a], t0 = performance.now() + (delay || 0);
    hp.tracks.forEach((kf) => m.tracks.push({ t0: t0, kf: kf, end: kf[kf.length - 1][0] }));
    return (delay || 0) + hp.apex;
  }
  _settle() {
    const t = performance.now();
    HORDER.forEach((n) => {
      const m = this._mv[n];
      if (!m.tracks.length) return;
      const v = this._mvVal(m, t);
      v.rc = ((v.rc % 360) + 540) % 360 - 180;
      v.et = ((v.et % 360) + 540) % 360 - 180; v.ev = ((v.ev % 360) + 540) % 360 - 180; v.lk = 0;
      v.r = ((v.r % 360) + 540) % 360 - 180;
      m.tracks = [{ t0: t, kf: [[0, v], [380, {}, 'out']], end: 380 }];
    });
  }
  _motionTick(t) {
    const G = this._geo;
    if (!G || !this._hagEls) return;
    const k = this.state.hL.k, E = this._eng, M = {};
    const about = (px, py, a, b, c, d) => [a, b, c, d, px - (a * px + c * py), py - (b * px + d * py)];
    const mul = (p, q) => [p[0] * q[0] + p[2] * q[1], p[1] * q[0] + p[3] * q[1], p[0] * q[2] + p[2] * q[3], p[1] * q[2] + p[3] * q[3], p[0] * q[4] + p[2] * q[5] + p[4], p[1] * q[4] + p[3] * q[5] + p[5]];
    const rot = (px, py, deg) => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return about(px, py, c, s, -s, c); };
    const fix = (x) => (Math.abs(x) < 0.03 ? (x < 0 ? -0.03 : 0.03) : x);
    let any = false;
    HORDER.forEach((n) => {
      const m = this._mv[n], P = G.pos[n];
      m.lift += ((E.lift || 0) - m.lift) * (1 - Math.exp(-16 / 140));
      if (Math.abs(m.lift - (E.lift || 0)) < 0.01) m.lift = E.lift || 0;
      const v = this._mvVal(m, t);
      m.v = v;
      v.tx *= k; v.ty = v.ty * k + m.lift * k;
      const idle = Math.abs(v.tx) < 0.01 && Math.abs(v.ty) < 0.01 && Math.abs(v.r) < 0.005 && Math.abs(((v.rc % 360) + 360) % 360) < 0.005 &&
        Math.abs(v.sx - 1) < 0.0005 && Math.abs(v.sy - 1) < 0.0005 && Math.abs(v.fx - 1) < 0.0005 && Math.abs(v.fy - 1) < 0.0005;
      const hg = this._hgEls[n];
      const eyes = Math.max(0, Math.min(1, Math.min(v.fx, v.fy) * 3));
      if (hg && eyes !== m.eyes) { hg.style.opacity = eyes >= 1 ? '' : eyes.toFixed(3); m.eyes = eyes; }
      if (idle) { M[n] = null; if (m.on) { this._hagEls[n].removeAttribute('transform'); m.on = false; } return; }
      any = true;
      // squash from the base, flip and spin about the centre, lean about the base, then travel
      const cx = P.X, cy = P.Y, ox = P.X, oy = P.Y + HBOTTOM[n] * P.S;
      let mx = about(ox, oy, v.sx, 0, 0, v.sy);
      if (v.fx !== 1 || v.fy !== 1) mx = mul(about(cx, cy, fix(v.fx), 0, 0, fix(v.fy)), mx);
      if (v.rc) mx = mul(rot(cx, cy, v.rc), mx);
      if (v.r) mx = mul(rot(ox, oy, v.r), mx);
      mx[4] += v.tx; mx[5] += v.ty;
      M[n] = mx;
      this._hagEls[n].setAttribute('transform', 'matrix(' + mx.map((x) => x.toFixed(5)).join(' ') + ')');
      m.on = true;
    });
    if (!any && !this._shwOn) return;
    const I = [1, 0, 0, 1, 0, 0];
    const inv = (p) => { const dt = p[0] * p[3] - p[1] * p[2]; return [p[3] / dt, -p[1] / dt, -p[2] / dt, p[0] / dt, (p[2] * p[5] - p[3] * p[4]) / dt, (p[1] * p[4] - p[0] * p[5]) / dt]; };
    let on = false;
    this._shwEls.forEach((w) => {
      const A = M[w.a], F = M[w.f];
      if (!A && !F) { if (w.on) { w.el.removeAttribute('transform'); w.on = false; } return; }
      const r = mul(A ? inv(A) : I, F || I);
      w.el.setAttribute('transform', 'matrix(' + r.map((x) => x.toFixed(5)).join(' ') + ')');
      w.on = true; on = true;
    });
    this._shwOn = on;
  }

  // squad stripes: the selected specialist plays its Motion 07 (no shadows to carry there)
  _stripeTick(t) {
    if (!this._sagEls) { this._sagEls = {}; document.querySelectorAll('.lp-sag').forEach((g) => { this._sagEls[g.getAttribute('data-sag')] = g; }); }
    const about = (px, py, a, b, c, d) => [a, b, c, d, px - (a * px + c * py), py - (b * px + d * py)];
    const mul = (p, q) => [p[0] * q[0] + p[2] * q[1], p[1] * q[0] + p[3] * q[1], p[0] * q[2] + p[2] * q[3], p[1] * q[2] + p[3] * q[3], p[0] * q[4] + p[2] * q[5] + p[4], p[1] * q[4] + p[3] * q[5] + p[5]];
    const rot = (px, py, deg) => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return about(px, py, c, s, -s, c); };
    ORDER.forEach((n) => {
      const m = this._smv[n], el = this._sagEls[n];
      if (!el || (!m.tracks.length && !m.on)) { m.v = null; return; }
      const v = this._mvVal(m, t);
      m.v = v;
      if (hIdle({ tx: v.tx, ty: v.ty, r: v.r, rc: v.rc, sx: v.sx, sy: v.sy, fx: v.fx, fy: v.fy })) { if (m.on) { el.removeAttribute('transform'); m.on = false; } return; }
      const cx = 320, cy = 470, oy = 470 + HBOTTOM[n] * 1.32;
      let mx = about(cx, oy, v.sx, 0, 0, v.sy);
      if (v.fx !== 1 || v.fy !== 1) mx = mul(about(cx, cy, v.fx, 0, 0, v.fy), mx);
      if (v.rc) mx = mul(rot(cx, cy, v.rc), mx);
      if (v.r) mx = mul(rot(cx, oy, v.r), mx);
      mx[4] += v.tx; mx[5] += v.ty;
      el.setAttribute('transform', 'matrix(' + mx.map((x) => x.toFixed(5)).join(' ') + ')');
      m.on = true;
    });
  }

  // memória (R17): the specialist in the place plays its moves about its base (same geometry as the stage SVG)
  _m3Tick(t) {
    if (!this._magEls) this._m3Els();
    const about = (px, py, a, b, c, d) => [a, b, c, d, px - (a * px + c * py), py - (b * px + d * py)];
    const mul = (p, q) => [p[0] * q[0] + p[2] * q[1], p[1] * q[0] + p[3] * q[1], p[0] * q[2] + p[2] * q[3], p[1] * q[2] + p[3] * q[3], p[0] * q[4] + p[2] * q[5] + p[4], p[1] * q[4] + p[3] * q[5] + p[5]];
    const rot = (px, py, deg) => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return about(px, py, c, s, -s, c); };
    const fix = (x) => (Math.abs(x) < 0.03 ? (x < 0 ? -0.03 : 0.03) : x);
    ORDER.forEach((n) => {
      const m = this._mmv[n], el = this._magEls[n];
      if (!el || (!m.tracks.length && !m.on)) { m.v = null; m.mx = null; return; }
      const v = this._mvVal(m, t);
      m.v = v;
      if (hIdle({ tx: v.tx, ty: v.ty, r: v.r, rc: v.rc, sx: v.sx, sy: v.sy, fx: v.fx, fy: v.fy })) { m.mx = null; if (m.on) { el.removeAttribute('transform'); m.on = false; } return; }
      const cx = M3_GEO.cx, cy = M3_GEO.cy, oy = M3_GEO.cy + HBOTTOM[n] * M3_GEO.sc;
      let mx = about(cx, oy, v.sx, 0, 0, v.sy);
      if (v.fx !== 1 || v.fy !== 1) mx = mul(about(cx, cy, fix(v.fx), 0, 0, fix(v.fy)), mx);
      if (v.rc) mx = mul(rot(cx, cy, v.rc), mx);
      if (v.r) mx = mul(rot(cx, oy, v.r), mx);
      mx[4] += v.tx; mx[5] += v.ty;
      m.mx = mx;
      el.setAttribute('transform', 'matrix(' + mx.map((x) => x.toFixed(5)).join(' ') + ')');
      m.on = true;
    });
  }

  // ------------------------------------------------------------ hero · choreography
  // suggestion → typing (eyes read the caret) → send → collective focus → "Pedido recebido" → Coordination assembles the squad
  // → specialists step forward → "… a postos" → one quiet lap around "Veja o Squad trabalhando"
  _hLater(fn, ms) { const id = setTimeout(fn, ms); this._ht.push(id); return id; }
  _hClear() { this._ht.forEach(clearTimeout); this._ht = []; }
  _agBy(grp, n) { return this._ags ? this._ags.find((a) => a.grp === grp && a.n === n) : null; }
  _heroCancel() {
    this._hClear(); this._apClear();
    this._htok += 1; this._hp = null; this._hx = null; this._hTyping = false; this._hRun = false;
    if (this._eng) { this._eng.lift = 0; this._eng.dirty = true; }
    this._settle();
    this._ctaStop();
    this.setState({ heroPhase: null, heroSending: false, heroSlot: 'band', ctaLive: false, relay: { m: 0, ags: this.state.relay.ags, called: 0 } });
    this._bandHold('seq', false);
  }
  // R32 · the hero starts on its own: once the squad has said hello, the first suggestion ("Criar uma campanha para o fim de
  // semana") is typed and played, and R27's continuous play takes over from there. Nothing starts if the visitor has already
  // typed or picked; off screen or in a hidden tab it waits for the hero. Reduced motion keeps a static example in the field.
  _typeHero() {
    if (this.state.heroTouched) return;
    if (this._rm) { this.setState({ prompt: HERO_DEFAULT }); return; }
    this._hLater(() => {
      if (this.state.heroTouched || this._hRun || this._hTyping || (this._hp && !this._hp.init)) return;
      if (this._heroVis === false || document.hidden) { this._apOn = true; this._apUser = false; this._apLast = -1; this._apWait = true; return; }
      this._heroPick(0, true);
    }, 2900);
  }
  // first visit: the squad rises into place from the centre out, then each agent says hello with its Motion 07 beat
  _heroIntro() {
    if (this._rm || this._introDone || !this._geo) return;
    this._introDone = true;
    const G = this._geo, mid = this.state.hL.W / 2, t0 = performance.now();
    HORDER.slice().sort((a, b) => Math.abs(G.pos[a].X - mid) - Math.abs(G.pos[b].X - mid)).forEach((n, i) => {
      const d = 80 + i * 70;
      this._mv[n].tracks.push({ t0: t0, kf: [[0, { ty: 90 }], [d, { ty: 90 }], [d + 820, {}, 'mola']], end: d + 820 });
    });
    HINTRO_ORDER.forEach((n, i) => this._hLater(() => {
      if (this._hp && !this._hp.init) return;
      const tt = performance.now();
      hCut(HMOVES['m7' + n](1), HINTRO_CUT).forEach((kf) => this._mv[n].tracks.push({ t0: tt, kf: kf, end: kf[kf.length - 1][0] }));
      const g = this._agBy('hero', n); if (g) this._hLater(() => this._blink(g), 900);
    }, 1050 + i * 300));
  }
  _focusField() {
    const inp = document.querySelector('.lp-hero .hs-input');
    if (!inp) return;
    try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
  }
  _heroPick(i, auto) {
    const c = HCHIPS[i];
    if (!c || this._bandDragged) return;
    if (this._hp && (this._hp.ph === 'expect' || this._hp.ph === 'focus' || this._hp.ph === 'coord')) return;
    this._heroCancel();
    this._apOn = !this._rm; this._apUser = false; this._apLast = i; this._apWait = false;
    if (this._apIdleT) { clearTimeout(this._apIdleT); this._apIdleT = 0; }
    const tok = this._htok;
    this._hTyping = true;
    this._bandHold('seq', true);
    this._hp = { ph: 'read', ags: c.ags, t0: performance.now() };
    this.setState({ chipSel: i, heroTouched: true, prompt: '', heroPhase: 'read', heroAgs: c.ags });
    if (auto) { const chip = document.querySelectorAll('.lp-hband .hs-set:not(.hs-dup) .hs-chip')[i]; if (chip) this._bandReveal(chip); }
    c.ags.forEach((n, j) => this._hLater(() => this._flash('hero', n, 'happy', 650), 90 + j * 90));
    this._focusField();
    if (this._rm) {
      this.setState({ prompt: c.text });
      this._hTyping = false;
      this._hLater(() => this._heroSend(c.text, c.ags, tok, false), 300);
      return;
    }
    let k = 0;
    const step = () => {
      if (tok !== this._htok) return;
      k += 1;
      this.setState({ prompt: c.text.slice(0, k) });
      if (k < c.text.length) this._hLater(step, rnd(34, 60) + (c.text[k - 1] === ' ' ? 26 : 0));
      else { this._hTyping = false; this._hLater(() => this._heroSend(c.text, c.ags, tok, false), 420); }
    };
    this._hLater(step, 260);
  }
  _heroSubmit(v) {
    const val = String(v || '').trim();
    if (!val || this._hTyping) return;
    if (this._hp && (this._hp.ph === 'expect' || this._hp.ph === 'focus' || this._hp.ph === 'coord')) return;
    if (performance.now() - (this._hSentAt || 0) < 700) return;
    const sel = this.state.chipSel, c = sel >= 0 ? HCHIPS[sel] : null;
    const ags = c && c.text === val ? c.ags : inferAgents(val);
    this._heroCancel();
    this._heroSend(val, ags, this._htok, true);
  }
  _heroSend(v, ags, tok, manual) {
    if (tok !== this._htok) return;
    const rm = this._rm, o = manual ? -420 : 0, n = ags.length;
    const byX = ags.slice().sort((p, q) => this._geo.pos[p].X - this._geo.pos[q].X);
    let cx = 0; ags.forEach((a) => { cx += this._geo.pos[a].X; }); cx /= n;
    const dirOf = (a) => (n > 1 ? (this._geo.pos[a].X < cx ? 1 : -1) : (this._geo.pos[a].X < this.state.hL.W / 2 ? 1 : -1));
    // timeline (ms after the expectation beat); each status holds long enough to be read, with a breath between them
    const T = {};
    T.press = 480 + o; T.send = 620 + o; T.focus = T.send + 120; T.m1 = T.send + 280;
    T.m2 = T.m1 + 1650; T.call = T.m2 + HCALL0; T.m3 = T.call + (n - 1) * HCALL + 1000;
    T.join = T.m3 + (n > 1 ? 2500 : 2200); T.cta = T.m3 + (n > 1 ? 3300 : 2700); T.end = T.cta + 2900;
    if (rm) { T.press = 0; T.send = 0; T.focus = 0; T.m1 = 200; T.m2 = 1800; T.call = 1800; T.m3 = 4000; T.join = 4000; T.cta = 4000; T.end = 9500; }
    this._hRun = true; this._hSentAt = performance.now(); this._hLast = ags;
    this._savePrompt(v);
    this._bandHold('seq', true);
    this._hp = { ph: 'expect', ags: ags, t0: performance.now() };
    this._hx = {}; HORDER.forEach((a) => { this._hx[a] = 'big'; });
    if (this._eng) this._eng.lift = -5;
    this.setState({ heroPhase: 'expect', heroAgs: ags, heroTouched: true, relay: { m: 0, ags: ags, called: 0 } });
    const at = (ms, fn) => this._hLater(() => { if (tok === this._htok) fn(); }, Math.max(0, ms));
    const ph = (name) => { this._hp = { ph: name, ags: ags, byX: byX, t0: performance.now() }; this.setState({ heroPhase: name }); if (this._eng) this._eng.dirty = true; };
    const eye = (a, x, bl) => { this._hx[a] = x; const g = this._agBy('hero', a); if (!g || !bl) return; if (bl === 2) this._blink(g, 260); else { this._blink(g); if (bl === 3) this._hLater(() => this._blink(g), 220); } };
    at(T.press, () => {
      const b = document.querySelector('.lp-hero .hs-send');
      if (b && !rm) { b.classList.add('is-press'); this._hLater(() => b.classList.remove('is-press'), 170); }
    });
    // 1 · the request leaves the field (the band steps aside first); the squad concentrates on it
    at(T.send, () => this.setState({ heroSending: true, heroSlot: 'status' }));
    at(T.m1, () => this.setState((s) => ({ relay: Object.assign({}, s.relay, { m: 1 }) })));
    at(T.focus, () => {
      ph('focus');
      if (this._eng) this._eng.lift = 0;
      HORDER.forEach((a) => { this._hx[a] = 'serio'; });
      const order = HORDER.slice().sort((p, q) => this._geo.pos[p].X - this._geo.pos[q].X);
      order.forEach((a, i) => { this._move(a, 'focus', i * 50); this._hLater(() => { const g = this._agBy('hero', a); if (g) this._blink(g, 170); }, 160 + i * 60); });
    });
    // 2 · Coordination takes the request and calls each specialist, one at a time
    at(T.m2, () => {
      ph('coord');
      HORDER.forEach((a) => { this._hx[a] = HREST[a]; });
      this._hx.coord = 'big';
      this.setState((s) => ({ relay: Object.assign({}, s.relay, { m: 2 }) }));
      this._move('coord', 'rise', 140);
      const g = this._agBy('hero', 'coord'); if (g) this._hLater(() => this._blink(g), 160);
    });
    ags.forEach((a, j) => at(T.call + j * HCALL, () => {
      const apex = this._hop(a, 40 + Math.round(rnd(0, 70)));
      eye(a, 'big', 1);
      if (apex) this._hLater(() => { if (tok === this._htok) eye(a, 'happy', 0); }, apex);
      this.setState((s) => ({ relay: Object.assign({}, s.relay, { called: j + 1 }) }));
    }));
    // 3 · the specialists take the spotlight, each with its signature move, slightly out of step; then together
    at(T.m3, () => {
      ph('present');
      this.setState((s) => ({ heroSending: false, relay: Object.assign({}, s.relay, { m: 3, called: n }) }));
      this._hx.coord = HREST.coord;
      const offs = [0, 190, 350];
      byX.forEach((a, j) => {
        const sig = HSIG[a], dl = 160 + offs[j] + (j ? Math.round(rnd(-30, 40)) : 0);
        this._hLater(() => this._move(a, sig.mv, 0, 1), dl);
        sig.ex.forEach((b) => this._hLater(() => eye(a, b[1], b[2]), dl + b[0]));
      });
      HORDER.forEach((a, i) => { if (ags.indexOf(a) < 0 && a !== 'coord') this._move(a, 'ack', 420 + i * 60); });
    });
    at(T.join, () => {
      ags.forEach((a, j) => this._hLater(() => eye(a, 'happy', 1), j * 90));
    });
    // 4 · everyone turns to the demo CTA; one quiet lap around it
    at(T.cta, () => {
      ph('cta');
      ags.forEach((a) => { this._hx[a] = 'happy'; });
      this._ctaRun();
    });
    at(T.end, () => {
      this._hp = null; this._hx = null; this._hRun = false;
      this.setState((s) => ({ heroPhase: null, heroSending: false, relay: Object.assign({}, s.relay, { m: 0 }) }));
      if (this._eng) { this._eng.dirty = true; this._hLater(() => { if (this._eng) this._eng.dirty = true; }, 1000); }
    });
    // the pill closes before the suggestions come back
    at(T.end + (rm ? 0 : 900), () => { this.setState({ heroSlot: 'band' }); this._bandHold('seq', false); this._apNext(); });
  }
  // R27 · continuous play. Once a suggestion has played, the hero moves on to the next one in the band (last → first), only after
  // the previous sequence has fully finished (pill closed, band back) and a 1.5 s breath. One timer at most (_apT); every pick or
  // cancel clears it, and it re-checks on firing that nothing is running. A manual pick restarts the cycle from that chip. Typing
  // in the field suspends it and the visitor's text is never replaced or sent; it resumes once the field is empty and the visitor
  // has stopped editing (left the field, or 4 s without typing). Off screen or in a hidden tab the next step waits until the hero
  // is back. Reduced motion: no autoplay (manual picks still play).
  _apClear() { if (this._apT) { clearTimeout(this._apT); this._apT = 0; } }
  _apNext(ms) {
    this._apClear();
    if (!this._apOn || this._apUser || this._rm) return;
    this._apT = setTimeout(() => {
      this._apT = 0;
      if (!this._apOn || this._apUser || this._hRun || this._hTyping || this._hp) return;
      if (this._heroVis === false || document.hidden) { this._apWait = true; return; }
      this._heroPick(((this._apLast == null ? -1 : this._apLast) + 1) % HCHIPS.length, true);
    }, ms == null ? 1500 : ms);
  }
  _apVis(v) {
    this._heroVis = v;
    if (!v || !this._apOn || this._apUser) return;
    if (this._apWait || (!this._apT && !this._hRun && !this._hTyping && !this._hp)) { this._apWait = false; this._apNext(); }
  }
  _apUserEdit(v) {
    this._apUser = true; this._apClear(); this._apWait = false;
    if (this._apIdleT) { clearTimeout(this._apIdleT); this._apIdleT = 0; }
    if (this._apOn && !String(v || '').trim()) this._apIdleT = setTimeout(() => this._apResume(), 4000);
  }
  _apResume() {
    if (this._apIdleT) { clearTimeout(this._apIdleT); this._apIdleT = 0; }
    if (!this._apUser || String(this.state.prompt || '').trim()) return;
    this._apUser = false;
    this._apNext();
  }
  // the CTA lap: a hairline on the button's real outline and a short signal travelling it once
  _ctaRun() {
    const b = document.querySelector('.lp-hero .lp-cta .hs-btn'), L = this.state.hL;
    if (b && (b.offsetWidth !== L.cw || b.offsetHeight !== L.ch)) {
      this.setState({ hL: Object.assign({}, L, { cw: b.offsetWidth, ch: b.offsetHeight }) });
      this._hLater(() => this._ctaRun(), 40);
      return;
    }
    this._ctaStop();
    this.setState({ ctaLive: true });
    const tok = this._htok;
    this._hLater(() => {
      if (tok !== this._htok) return;
      const svg = document.querySelector('.lp-hero .lp-cta-trace');
      if (!svg) return;
      const head = svg.querySelector('.lp-cta-head'), tail = svg.querySelector('.lp-cta-tail');
      const len = head.getTotalLength ? head.getTotalLength() : 0;
      if (!len) return;
      this._ctaAnims = [];
      if (this._rm) return;
      [[head, 26], [tail, 70]].forEach((p) => {
        const el = p[0], dl = p[1];
        el.style.strokeDasharray = dl + ' ' + (len + dl);
        if (el.animate) {
          this._ctaAnims.push(el.animate([{ strokeDashoffset: dl }, { strokeDashoffset: dl - len }], { duration: 2500, delay: 260, easing: 'cubic-bezier(.42,0,.32,1)', fill: 'both' }));
          this._ctaAnims.push(el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }], { duration: 2500, delay: 260, easing: 'linear', fill: 'both' }));
        }
      });
    }, 40);
    this._hLater(() => { if (tok === this._htok) this.setState({ ctaLive: false }); }, 2900);
  }
  _ctaStop() {
    (this._ctaAnims || []).forEach((an) => { try { an.cancel(); } catch (e) { } });
    this._ctaAnims = [];
  }
  _goDemo() {
    const sel = this.state.chipSel;
    const ags = this._hLast || (sel >= 0 ? HCHIPS[sel].ags : null);
    const conv = ags && ags.length === 1 && ags[0] !== 'coord' ? ags[0] : 'squad';
    this._heroCancel();
    if (this._eng) this._eng.force.hero = { x: 0, y: 1, until: performance.now() + 900 };
    this._later(() => this._scrollTo('demo'), this._rm ? 0 : 260);
    this._later(() => this._demoStart(conv, 300), this._rm ? 0 : 1000);
  }

  // ------------------------------------------------------------ conheça
  _pickAg(n, auto) {
    if (n === this.state.sq) return;
    const prev = this.state.sq;
    this.setState((s) => ({ sq: n, helloPrev: s.sq, sqTouched: s.sqTouched || !auto }));
    this._settleSet(this._smv, prev);
    this._sqSig(n);
  }
  // the card opens: the specialist pops up with a squash and a look of surprise, then plays its own Motion 07, then rests
  _sqSig(n) {
    if (this._sqT) this._sqT.forEach(clearTimeout);
    this._sqT = [];
    if (this._rm) return;
    const m = this._smv[n];
    if (m) m.tracks = [];
    const sig = HSIG[n], d0 = 700;
    this._move(n, 'pop', 60, 1, this._smv);
    this._sqT.push(setTimeout(() => this._flash('glow', n, 'big', 520), 300));
    this._move(n, sig.mv, d0, 1, this._smv);
    sig.ex.forEach((b, i) => {
      const nx = sig.ex[i + 1], dur = nx ? nx[0] - b[0] : 700;
      this._sqT.push(setTimeout(() => { this._flash('glow', n, b[1], dur); if (b[2]) { const g = this._agBy('glow', n); if (g) this._blink(g); } }, d0 + b[0]));
    });
  }
  _settleSet(set, n) {
    const m = set && set[n];
    if (!m || !m.tracks.length) return;
    const t = performance.now(), v = this._mvVal(m, t);
    v.rc = ((v.rc % 360) + 540) % 360 - 180; v.et = ((v.et % 360) + 540) % 360 - 180; v.ev = ((v.ev % 360) + 540) % 360 - 180; v.lk = 0;
    m.tracks = [{ t0: t, kf: [[0, v], [380, {}, 'out']], end: 380 }];
  }
  _cycleSquad() {
    if (this._rm) return;
    const id = setInterval(() => {
      const s = this.state;
      if (s.sqTouched) { clearInterval(id); return; }
      if (s.sqHover || !this._sqVisible) return;
      const i = ORDER.indexOf(s.sq);
      this._pickAg(ORDER[(i + 1) % ORDER.length], true);
    }, 8200);
    this._intervals.push(id);
  }
  // manifesto minis: one gesture glides to the demo window itself and plays that specialist's conversation
  _talkTo(n) {
    const s = this.state, c = s.cv[n];
    const already = s.conv === n && (this._dPlay === n || (c && c.started));
    this.setState({ demoTouched: true });
    this._scrollToWin();
    if (already) return;
    this._later(() => this._demoStart(n, 120), this._rm ? 0 : 620);
  }
  _scrollToWin() {
    const win = document.querySelector('.lp-demo-win');
    if (!win) return;
    const r = win.getBoundingClientRect(), bar = 68, room = (window.innerHeight || 0) - bar;
    const y = (window.scrollY || 0) + r.top - bar - Math.max(12, (room - r.height) / 2);
    window.scrollTo({ top: Math.max(0, y), behavior: this._rm ? 'auto' : 'smooth' });
  }

  // ------------------------------------------------------------ autonomy (R18)
  // The switch in the title presents the feature. It arrives OFF and plays the official C5 activation (off → on) only when the
  // section has taken the whole screen (its top under the 68px bar, title still in view). R26 · it replays: once the section has
  // fully left the screen downwards (the visitor went back to the fold above) it returns to OFF, and arrives again next time.
  // Leaving it downwards (going on to Memória) keeps it on. It is not a control: the scene below always shows the mode at work.
  _autoActivate() {
    if (this._autoDone) return;
    this._autoDone = true;
    const tok = this._autoTok = (this._autoTok || 0) + 1;
    this._later(() => { if (this._autoUser || tok !== this._autoTok) return; this.setState({ autoOn: true }); this._c5On(); }, this._rm ? 0 : 180);
  }
  _autoScan() {
    this._auRaf = 0;
    const sec = document.getElementById('autonomo'), st = document.querySelector('.lp-auto-stmt');
    if (!sec || !st) return;
    const vh = window.innerHeight || 0, r = sec.getBoundingClientRect(), t = st.getBoundingClientRect(), bar = 68;
    if (this._autoDone) { if (r.top >= vh) this._autoReset(); return; }
    if (r.top <= bar + 12 && t.bottom > bar + 40) this._autoActivate();
  }
  _autoReset() {
    this._autoTok = (this._autoTok || 0) + 1;
    this._autoDone = false; this._autoUser = false;
    this._c5Off();
    this.setState({ autoOn: false, autoVis: false });
  }
  // the visitor may switch it off and on again: off greys "autônomo.", on replays the C5 activation; the scene below is not affected
  _autoToggle() {
    this._autoUser = true; this._autoDone = true;
    const on = !this.state.autoOn;
    this.setState((s) => ({ autoOn: on, autoVis: on ? s.autoVis : false }));
    if (on) this._c5On(); else this._c5Off();
  }
  _aLater(fn, ms) { return this._ctLater('_auto', fn, ms); }

  // ------------------------------------------------------------ modo autônomo · scrollytelling (R16 → R18 → R31)
  // One state for the story: the routine (sxR, picked from the chips), the active step (from the scroll while the scene is pinned,
  // or a click on a step) and, in step 3, the phase of the routine's cycle. Only the '_sxc' bucket moves the cycle: it runs at
  // step 3 while on screen, is cleared on every change and, once finished, stays finished. Step entrances use the '_auto' bucket,
  // the review demo '_sxd' and a routine switch '_sxw'; all are cleared on every switch, so nothing from a routine survives it.
  _sxR() { return SX_RM[this.state.sxR] || SX_R[0]; }
  _sxLater(fn, ms) { return this._ctLater('_sxc', fn, ms); }
  _sxDirty() { if (this._eng) { this._eng.dirty = true; this._later(() => { if (this._eng) this._eng.dirty = true; }, 820); } }
  _sxLook(y, ms) { if (this._eng && !this._rm) this._eng.force.auto = { x: 0, y: y, until: performance.now() + (ms || 900) }; }
  _sxMove(n, name, delay, cut) {
    if (this._rm || !HMOVES[name] || !this._amv[n]) return;
    const m = this._amv[n], t0 = performance.now() + (delay || 0);
    (cut ? hCut(HMOVES[name](1), cut) : HMOVES[name](1)).forEach((kf) => m.tracks.push({ t0: t0, kf: kf, end: kf[kf.length - 1][0] }));
  }
  _sxSync() {
    this._ctClear('_sxc');
    const s = this.state, n = this._sxR().ph.length;
    if (s.sxStep >= 4) { if (s.sxPh < n) this.setState({ sxPh: n }); return; }
    if (s.sxStep === 3 && this._isVis('sx')) this._sxRun();
  }
  _sxSyncSoon() { this._later(() => this._sxSync(), 0); }
  _sxRun() {
    const R = this._sxR(), ph = this.state.sxPh, n = R.ph.length, id = R.id;
    if (ph >= n) return;
    if (this._rm) { this.setState({ sxPh: n }); return; }
    this._sxLater(() => {
      if (this.state.sxStep !== 3 || this.state.sxR !== id) return;
      const nx = this.state.sxPh + 1;
      this.setState({ sxPh: nx });
      this._sxBeat(R, nx);
      this._later(() => { if (this.state.sxStep === 3 && this.state.sxR === id && this._isVis('sx')) this._sxRun(); }, 0);
    }, R.ph[ph]);
  }
  // who reacts when a phase starts (the one who finds or makes something perks up; the next cycle starts with nobody asking again)
  _sxBeat(R, ph) {
    const b = R.beat[ph];
    if (b) {
      b.forEach((x) => {
        const f = () => { if (x[1]) this._flash('auto', x[0], x[1], 700); this._sxMove(x[0], 'perk'); };
        if (x[2]) this._sxLater(f, x[2]); else f();
      });
      this._sxLook(0.8, 700);
    }
    this._sxDirty();
  }
  _sxSetStep(i) {
    const prev = this.state.sxStep;
    if (i === prev) return;
    this._ctClear('_sxc'); this._ctClear('_auto'); this._ctClear('_sxd');
    const patch = { sxStep: i, sxDec: '' };
    if (i <= 2) patch.sxPh = 0;
    if (i >= 4) patch.sxPh = this._sxR().ph.length;
    this.setState(patch);
    this._sxDirty();
    this._sxEnter(i);
    this._sxSyncSoon();
  }
  // each step's entrance: the specialists who come in play their own A6 · Motion 07 beat, once
  _sxEnter(i) {
    if (this._rm) return;
    const R = this._sxR();
    if (i === 1) {
      this._sxLook(-0.9, 1500);
      this._aLater(() => { this._flash('auto', 'coord', 'big', 900); this._sxMove('coord', 'm7coord', 0, HINTRO_CUT); }, 760);
    }
    if (i === 2) {
      this._sxMove('coord', 'perk', 160);
      R.sp.forEach((n, k) => this._aLater(() => this._sxMove(n, 'm7' + n, 0, HINTRO_CUT), 620 + k * 220));
    }
    if (i === 3) this._sxLook(0.6, 800);
    if (i === 4) {
      this._sxLook(0.8, 1400);
      R.s4.forEach((n, k) => this._aLater(() => { this._flash('auto', n, 'big', 800); this._sxMove(n, 'perk'); }, 900 + k * 160));
    }
  }
  // R31 → R32 · a routine chip: the new routine starts over at step 1. Everything pending is cancelled (cycle, entrances, review,
  // moves, expressions); the old layer fades out frozen, the texts swap softly. If the visitor had scrolled past step 1, the page
  // goes back to the start of the track at once: the scene is pinned there, so nothing on screen jumps, the story just restarts.
  _sxPick(id) {
    const s = this.state;
    if (id === s.sxR || !SX_RM[id]) return;
    ['_sxc', '_auto', '_sxd', '_sxw'].forEach((b) => this._ctClear(b));
    ORDER.forEach((n) => { if (this._amv[n]) this._amv[n].tracks = []; });
    if (this._ags) this._ags.forEach((a) => { if (a.grp === 'auto') a.fxUntil = 0; });
    const st = s.sxStep, old = this._sxR();
    this.setState({
      sxPrev: old.id, sxPrevSt: st, sxPrevPh: st >= 4 ? old.ph.length : (st === 3 ? Math.min(s.sxPh, old.ph.length) : 0),
      sxR: id, sxStep: 1, sxPh: 0, sxDec: '', sxCut: false, sxSw: true
    });
    const P = this._sxProg();
    if (this._sxSticky && P && P.p >= SX_CUT[0]) {
      this._sxLock = performance.now() + 260;
      window.scrollTo(0, Math.max(0, window.scrollY + P.r.top - SX_PIN + SX_GO[0] * this._sxStepPx));
      this._later(() => this._sxScan(), 300);
    }
    this._sxDirty();
    this._ctLater('_sxw', () => this.setState({ sxTxt: id, sxSw: false }), 170);
    this._ctLater('_sxw', () => this.setState({ sxPrev: '' }), 460);
    this._sxEnter(1);
    this._sxSyncSoon();
  }
  // R31 · Instagram, step 4: a demo decision. Approving only schedules the posts for the agreed days (nothing is published);
  // asking for a change has Otto and Kaia adjust, then the posts come back to review.
  _sxDecide(k) {
    if (this.state.sxR !== 'ig' || this.state.sxStep < 4) return;
    this._ctClear('_sxd');
    if (k === 'adj') {
      this.setState({ sxDec: 'adj' });
      this._sxFocus('card');
      if (!this._rm) {
        this._flash('auto', 'pill', 'big', 800); this._sxMove('pill', 'perk');
        this._ctLater('_sxd', () => { this._flash('auto', 'leaf', 'wink', 700); this._sxMove('leaf', 'perk'); }, 520);
      }
      this._ctLater('_sxd', () => { this.setState({ sxDec: 'rev2' }); this._sxFocus('ok'); if (!this._rm) { this._flash('auto', 'pill', 'happy', 700); this._flash('auto', 'leaf', 'happy', 700); } }, this._rm ? 700 : 1900);
    } else if (k === 'ok') {
      this.setState({ sxDec: 'ok' });
      this._sxFocus('undo');
      if (!this._rm) { this._flash('auto', 'coord', 'happy', 900); this._sxMove('coord', 'perk'); this._ctLater('_sxd', () => { ['pill', 'leaf'].forEach((n) => { this._flash('auto', n, 'happy', 700); this._sxMove(n, 'perk'); }); }, 260); }
    } else {
      this.setState({ sxDec: '' });
      this._sxFocus('ok');
    }
    this._sxDirty();
  }
  _sxFocus(which) {
    this._ctLater('_sxd', () => {
      const card = document.querySelector('.sx-igr');
      if (!card) return;
      const el = which === 'card' ? card : card.querySelector('[data-b="' + which + '"] button');
      if (el && el.focus) el.focus({ preventScroll: true });
    }, 60);
  }
  // per-routine element states, for one layer at (step, phase)
  _sxX(id, st, ph) {
    const b = (v) => (v ? 'true' : 'false');
    if (id === 'ig') {
      const o = { ok: b(st === 3 && ph >= 4), nx: b(st === 3 && ph >= 5) };
      [0, 1, 2].forEach((k) => { o['p' + k] = st !== 3 ? 'off' : (ph >= k + 1 ? 'on' : 'wait'); o['c' + k] = b(st === 3 && ph === k + 1); });
      return o;
    }
    if (id === 'cc') {
      const fs = {};
      SX_FIND.forEach((f, k) => { fs['f' + k] = st >= 4 ? 'sum' : (st === 3 ? (ph >= 2 * k + 2 ? 'row' : (ph === 2 * k + 1 ? 'pop' : 'hid')) : 'hid'); });
      return { fs: fs };
    }
    if (id === 'cl') return { s: String(st === 3 ? Math.min(ph, 3) : 0), nx: b(st === 3 && ph >= 4) };
    return { d: String(st === 3 ? Math.min(ph, 3) : 0), hi: b(st === 3 && ph >= 4), nx: b(st === 3 && ph >= 5) };
  }
  // scroll → step. No hijacking: the track only gives the pinned scene some room; each step lasts --sx-step px of scroll
  _sxSize() {
    const tr = document.querySelector('.lp-sx'), pin = document.querySelector('.lp-sx-pin');
    this._sxSticky = !!pin && window.getComputedStyle(pin).position === 'sticky';
    this._sxStepPx = Math.max(210, Math.min(260, Math.round((window.innerHeight || 800) * 0.26)));
    if (tr) tr.style.setProperty('--sx-step', this._sxStepPx + 'px');
  }
  _sxProg() {
    const tr = document.querySelector('.lp-sx');
    if (!tr) return null;
    const r = tr.getBoundingClientRect();
    return { r: r, p: (SX_PIN - r.top) / (this._sxStepPx || 230) };
  }
  _sxScan() {
    this._sxRaf = 0;
    if (!this._sxSticky || performance.now() < (this._sxLock || 0)) return;
    const P = this._sxProg();
    if (!P || P.r.bottom < -200 || P.r.top > window.innerHeight + 200) return;
    let act = 1;
    SX_CUT.forEach((c, k) => { if (P.p >= c) act = k + 2; });
    if (act !== this.state.sxStep) this._sxSetStep(act);
  }
  // a click (or Enter) on a step opens it right away and scrolls to where the scroll would have opened it
  _sxGo(i) {
    this._sxSetStep(i);
    const P = this._sxProg();
    if (!this._sxSticky || !P) return;
    const y = window.scrollY + P.r.top - SX_PIN + SX_GO[i - 1] * this._sxStepPx;
    this._sxLock = performance.now() + (this._rm ? 80 : 950);
    window.scrollTo({ top: Math.max(0, y), behavior: this._rm ? 'auto' : 'smooth' });
    this._later(() => this._sxScan(), this._rm ? 100 : 1000);
  }
  // the scene's specialists play their moves about their base (mini drawings centred on 0,0)
  _sxTick(t) {
    if (!this._amvEls) { this._amvEls = {}; document.querySelectorAll('.sx-mv').forEach((g) => { this._amvEls[g.getAttribute('data-sxm')] = g; }); }
    const about = (px, py, a, b, c, d) => [a, b, c, d, px - (a * px + c * py), py - (b * px + d * py)];
    const mul = (p, q) => [p[0] * q[0] + p[2] * q[1], p[1] * q[0] + p[3] * q[1], p[0] * q[2] + p[2] * q[3], p[1] * q[2] + p[3] * q[3], p[0] * q[4] + p[2] * q[5] + p[4], p[1] * q[4] + p[3] * q[5] + p[5]];
    const rot = (px, py, deg) => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return about(px, py, c, s, -s, c); };
    const fix = (x) => (Math.abs(x) < 0.03 ? (x < 0 ? -0.03 : 0.03) : x);
    ORDER.forEach((n) => {
      const m = this._amv[n], el = this._amvEls[n];
      if (!el || (!m.tracks.length && !m.on)) { m.v = null; return; }
      const v = this._mvVal(m, t);
      m.v = v;
      if (hIdle({ tx: v.tx, ty: v.ty, r: v.r, rc: v.rc, sx: v.sx, sy: v.sy, fx: v.fx, fy: v.fy })) { if (m.on) { el.removeAttribute('transform'); m.on = false; } return; }
      const cx = 0, cy = 0, oy = HBOTTOM[n];
      let mx = about(cx, oy, v.sx, 0, 0, v.sy);
      if (v.fx !== 1 || v.fy !== 1) mx = mul(about(cx, cy, fix(v.fx), 0, 0, fix(v.fy)), mx);
      if (v.rc) mx = mul(rot(cx, cy, v.rc), mx);
      if (v.r) mx = mul(rot(cx, oy, v.r), mx);
      mx[4] += v.tx; mx[5] += v.ty;
      el.setAttribute('transform', 'matrix(' + mx.map((x) => x.toFixed(5)).join(' ') + ')');
      m.on = true;
    });
  }

  // ------------------------------------------------------------ C5 · Autonomous Mode (DS institutional piece) on the switch
  // The knob turns, one by one, into the seven agents (official Agent drawings) until it becomes the Coordinator,
  // who is pressed and slides the switch on. Between two agents the silhouettes morph (sampled outlines) with eyes shut.
  _c5El() { return document.querySelector('.lp-c5sw'); }
  _c5Init() {
    if (this._c5) return this._c5;
    const btn = this._c5El(); if (!btn) return null;
    const morph = btn.querySelector('.lp-c5-morph'); if (!morph) return null;
    const M = morph.getScreenCTM(); if (!M) return null;
    const inv = M.inverse(), N = 96;
    const toM = (x, y) => { const p = morph.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(inv); };
    const norm = (pts) => {
      // clockwise, starting at the point straight above the centre, so two outlines pair up point by point
      let cx = 0, cy = 0; pts.forEach((p) => { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
      let area = 0; for (let i = 0; i < pts.length; i += 1) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
      if (area < 0) pts.reverse();
      let best = 0, bd = 1e9;
      pts.forEach((p, i) => { const ang = Math.atan2(p[1] - cy, p[0] - cx), d = Math.abs(ang + Math.PI / 2); if (d < bd) { bd = d; best = i; } });
      return pts.slice(best).concat(pts.slice(0, best));
    };
    const shapes = {};
    const sample = (el) => {
      const pts = [], C = el.getScreenCTM();
      let len = 0; try { len = el.getTotalLength(); } catch (e) { len = 0; }
      for (let i = 0; i < N; i += 1) {
        let q;
        if (len) { const pt = el.getPointAtLength(len * i / N); const sp = morph.createSVGPoint(); sp.x = pt.x; sp.y = pt.y; q = sp.matrixTransform(C); }
        else { const r = +el.getAttribute('r') || 150, a = i / N * Math.PI * 2; const sp = morph.createSVGPoint(); sp.x = Math.cos(a) * r; sp.y = Math.sin(a) * r; q = sp.matrixTransform(C); }
        const m = toM(q.x, q.y); pts.push([m.x, m.y]);
      }
      return norm(pts);
    };
    const eyesOf = (svg) => {
      const es = Array.prototype.slice.call(svg.querySelectorAll('ellipse'));
      const out = es.slice(0, 2).map((e) => { const r = e.getBoundingClientRect(), m = toM(r.left + r.width / 2, r.top + r.height / 2); return [m.x, m.y]; });
      return out.length === 2 ? out : [[24, 26], [36, 26]];
    };
    let ok = true;
    C5_ORDER.forEach((n) => {
      const wrap = btn.querySelector('.lp-c5-ag[data-a="' + n + '"]'), svg = wrap && wrap.querySelector('svg');
      const body = svg && Array.prototype.slice.call(svg.querySelectorAll('path, circle')).find((e) => !e.closest('.hs-eyes, .hs-eyes-alt'));
      if (!body) { ok = false; return; }
      shapes[n] = { pts: sample(body), eyes: eyesOf(svg), col: COLOR[n] };
    });
    const base = btn.querySelector('.lp-c5-base circle');
    if (!ok || !base) return null;
    shapes.off = { pts: sample(base), eyes: [[22.6, 23.4], [33.4, 23.4]], col: '#FFFFFF' };
    this._c5 = { btn: btn, path: btn.querySelector('.lp-c5-p'), shut: btn.querySelector('.lp-c5-shut path'), shapes: shapes };
    return this._c5;
  }
  _c5Show(C, who) {
    C.btn.querySelectorAll('.lp-c5-ag').forEach((e) => e.classList.toggle('is-show', e.getAttribute('data-a') === who));
  }
  _c5Off() {
    if (this._c5Raf) cancelAnimationFrame(this._c5Raf);
    this._c5Raf = 0; this._c5Tok = (this._c5Tok || 0) + 1;
    const btn = this._c5El(); if (!btn) return;
    btn.classList.remove('is-seq', 'is-press', 'is-morph', 'is-on');
    if (this._c5) this._c5Show(this._c5, null);
  }
  _c5On() {
    const btn = this._c5El(); if (!btn) return;
    if (this._c5Raf) cancelAnimationFrame(this._c5Raf);
    const tok = this._c5Tok = (this._c5Tok || 0) + 1;
    const C = this._rm ? null : this._c5Init();
    if (!C) { btn.classList.add('is-on'); this.setState({ autoVis: true }); return; }
    // timeline: off → arch → leaf → pill → hex → funnel → square → coord, then press, slide, a happy beat
    const seg = []; let t = 0, prev = 'off';
    C5_ORDER.forEach((n) => { seg.push({ k: 'm', a: prev, b: n, t0: t, t1: t + C5_T.morph }); t += C5_T.morph; seg.push({ k: 'h', a: n, t0: t, t1: t + C5_T.hold }); t += C5_T.hold; prev = n; });
    const tPress = t, tSlide = t + C5_T.press, tHappy = tSlide + C5_T.slide, tEnd = tHappy + C5_T.happy;
    const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const lerpC = (c1, c2, q) => { const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16); const ch = (sh) => Math.round(((a >> sh) & 255) + (((b >> sh) & 255) - ((a >> sh) & 255)) * q); return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')'; };
    btn.classList.add('is-seq'); btn.classList.remove('is-on', 'is-press');
    const t0 = performance.now();
    let last = '';
    const frame = (now) => {
      if (tok !== this._c5Tok) return;
      const e = now - t0;
      if (e < tPress) {
        const sg = seg.find((x) => e < x.t1) || seg[seg.length - 1];
        if (sg.k === 'm') {
          const A = C.shapes[sg.a], B = C.shapes[sg.b], q = ease(Math.max(0, Math.min(1, (e - sg.t0) / (sg.t1 - sg.t0))));
          let d = '';
          for (let i = 0; i < A.pts.length; i += 1) { const x = A.pts[i][0] + (B.pts[i][0] - A.pts[i][0]) * q, y = A.pts[i][1] + (B.pts[i][1] - A.pts[i][1]) * q; d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2); }
          C.path.setAttribute('d', d + 'Z'); C.path.style.fill = lerpC(A.col, B.col, q);
          let sd = '';
          for (let k = 0; k < 2; k += 1) { const x = A.eyes[k][0] + (B.eyes[k][0] - A.eyes[k][0]) * q, y = A.eyes[k][1] + (B.eyes[k][1] - A.eyes[k][1]) * q; sd += 'M' + (x - 2.6).toFixed(2) + ' ' + y.toFixed(2) + 'H' + (x + 2.6).toFixed(2); }
          C.shut.setAttribute('d', sd);
          if (last !== 'm') { btn.classList.add('is-morph'); this._c5Show(C, null); last = 'm'; }
        } else if (last !== 'h' + sg.a) { btn.classList.remove('is-morph'); this._c5Show(C, sg.a); last = 'h' + sg.a; }
      } else if (e < tSlide) { if (last !== 'press') { btn.classList.remove('is-morph'); this._c5Show(C, 'coord'); btn.classList.add('is-press'); last = 'press'; } }
      else if (e < tHappy) { if (last !== 'slide') { btn.classList.remove('is-press'); btn.classList.add('is-on'); this.setState({ autoVis: true }); last = 'slide'; } }
      else if (e < tEnd) { if (last !== 'happy') { this._c5Show(C, 'coord-happy'); last = 'happy'; } }
      else if (e < tEnd + 160) { if (last !== 'fade') { btn.classList.remove('is-seq'); last = 'fade'; } }  // the DS knob fades in under the agent: no dip
      else { this._c5Show(C, null); btn.classList.remove('is-seq'); this._c5Raf = 0; return; }
      this._c5Raf = requestAnimationFrame(frame);
    };
    this._c5Raf = requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------ resultados · one story, two views (R12 → R21)
  // Íris spots the cheaper format → Nexo proposes moving R$ 120 → you decide (a demo cursor approves if you don't; your own
  // click wins) → Kiwi applies it → five days later Íris reports back. The conversation sets the pace: each step carries a
  // `stage` and the dashboard only answers it (nothing animates on its own). Replay resets both. All simulated.
  _rLater(fn, ms) { return this._ctLater('_res', fn, ms); }
  _resRun(replay) {
    this._ctClear('_res'); this._resCurStop();
    this._rTok = (this._rTok || 0) + 1;
    this.setState({ resMsgs: [], resTyping: null, resAppr: false, resDone: false, resDec: null, resStage: 0, resHover: -1 });
    this._resPlay('intro', replay ? 300 : (this._rm ? 300 : 700));
  }
  _resPlay(name, delay) {
    const tok = this._rTok, k = this._rm ? 0.3 : 1;
    let acc = delay || 0;
    RES_CHAT[name].forEach((op) => {
      acc += Math.round((op.t || 0) * k);
      this._rLater(() => { if (tok === this._rTok) this._resApply(op); }, acc);
    });
  }
  _resApply(op) {
    this.setState((s) => {
      const o = {};
      let list = s.resMsgs;
      const push = (m) => { list = list.concat([Object.assign({ k: 'r' + list.length }, m)]); o.resMsgs = list; };
      if ('typing' in op) o.resTyping = op.typing;
      if (op.msg) { o.resTyping = null; push(op.msg); }
      if (op.user) push({ user: true, text: op.user });
      if (op.note) push({ note: true, text: op.note });
      if (op.appr) o.resAppr = true;
      if (op.stage != null) o.resStage = op.stage;
      if (op.done) o.resDone = true;
      return o;
    });
    if (op.appr) this._resCurPlan();
  }
  _resDecide(v) {
    if (this.state.resDec || !this.state.resAppr) return;
    if (!this._rcClicking) this._resCurStop();
    this._ctClear('_res');
    this.setState({ resDec: v, resAppr: false });
    this._resPlay(v, 0);
  }
  _resCurPlan() {
    const tok = this._rTok;
    const go = () => {
      if (tok !== this._rTok || this.state.resDec) return;
      if (!this._isVis('res')) { this._whenVis.res = go; return; }
      this._resCurClick(tok);
    };
    this._rLater(go, this._rm ? 1000 : 1300);
  }
  _resCurStop() {
    if (this._rcAnim) { try { this._rcAnim.cancel(); } catch (e) { } this._rcAnim = null; }
    if (this._whenVis) this._whenVis.res = null;
    const cur = document.querySelector('.lp-rcur');
    if (cur) cur.classList.remove('is-on', 'is-down');
    document.querySelectorAll('.lp-rchat .lp-dhover, .lp-rchat .lp-dpress').forEach((e) => e.classList.remove('lp-dhover', 'lp-dpress'));
  }
  _resCurClick(tok) {
    const box = document.querySelector('.lp-rchat'), cur = document.querySelector('.lp-rcur');
    const get = () => document.querySelector('.lp-rchat .hs-approve .hs-btn--pri');
    let el = get();
    if (!box || !cur || !el) return;
    const sc = box.querySelector('.lp-rc-scroll');
    if (sc) { const r0 = el.getBoundingClientRect(), sr = sc.getBoundingClientRect(); if (r0.bottom > sr.bottom - 12) sc.scrollTop += r0.bottom - sr.bottom + 40; }
    const B = box.getBoundingClientRect(), r = el.getBoundingClientRect();
    const x = r.left - B.left + Math.min(r.width * 0.5, 54), y = r.top - B.top + r.height * 0.56;
    const from = { x: Math.min(B.width - 36, x + 150), y: Math.min(B.height - 30, y + 130) };
    const dur = this._rm ? 0 : 700, D0 = 80;
    cur.style.transform = 'translate(' + from.x + 'px, ' + from.y + 'px)';
    cur.classList.add('is-on');
    if (dur && cur.animate) {
      this._rcAnim = cur.animate([
        { transform: 'translate(' + from.x + 'px, ' + from.y + 'px)' },
        { transform: 'translate(' + ((from.x + x) / 2 + 16) + 'px, ' + (Math.min(from.y, y) - 22) + 'px)', offset: 0.55 },
        { transform: 'translate(' + x + 'px, ' + y + 'px)' }
      ], { duration: dur, delay: D0, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'backwards' });
    }
    cur.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    const t1 = D0 + dur;
    this._rLater(() => { el = get(); if (tok === this._rTok && el) el.classList.add('lp-dhover'); }, t1 - 140);
    this._rLater(() => { el = get(); if (tok !== this._rTok || !el) return; cur.classList.add('is-down'); el.classList.add('lp-dpress'); }, t1 + 180);
    this._rLater(() => {
      el = get();
      if (tok !== this._rTok || this.state.resDec || !el) { this._resCurStop(); return; }
      cur.classList.remove('is-down', 'is-click'); void cur.offsetWidth; cur.classList.add('is-click');
      el.classList.remove('lp-dpress', 'lp-dhover');
      this._rcClicking = true; el.click(); this._rcClicking = false;
      this._rLater(() => cur.classList.remove('is-on'), 900);
    }, t1 + 320);
  }

  // ------------------------------------------------------------ memória do squad (R17 → R19)
  // One place, seven specialists: the scroll picks who is there (sticky stage, no hijacking). Between two of them, the A9 ·
  // Hello Animation R2 turn: the face of the one who leaves turns away, its silhouette turns into the next one's (outline and
  // colour), whose face turns in from the other side; then it concentrates (eyes closed). Pieces of Miolo's context keep
  // arriving from around it, at different depths and speeds, and are incorporated into its head; new ones join the shared
  // memory (the dark pill above). During a turn the flow slows down and dims; it picks up again when the next one is there.
  _m3Later(fn, ms) { return this._ctLater('_m3', fn, ms); }
  _m3sLater(fn, ms) { return this._ctLater('_m3s', fn, ms); }
  _m3Mode(n, md) { if (this._eng && this._eng.modes.mem) { this._eng.modes.mem[n] = md; this._eng.dirty = true; } }
  _m3Els() { this._magEls = {}; document.querySelectorAll('.lp-mag').forEach((g) => { this._magEls[g.getAttribute('data-mag')] = g; }); }
  _m3Show(n, on) { if (!this._magEls) this._m3Els(); const g = this._magEls[n]; if (g) g.style.opacity = on ? '1' : '0'; }
  _m3Push(n, kf, delay) { this._mmv[n].tracks.push({ t0: performance.now() + (delay || 0), kf: kf, end: kf[kf.length - 1][0] }); }
  _m3Size() {
    this._m3Step = Math.round(Math.max(240, Math.min(320, window.innerHeight * 0.32)));
    const tr = document.querySelector('.lp-m3-track');
    if (tr) tr.style.setProperty('--m3-step', this._m3Step + 'px');
  }
  // scroll position → which specialist is in the place
  _m3Scan() {
    this._m3Raf = 0;
    const tr = document.querySelector('.lp-m3-track'), M = this._m3;
    if (!tr || !M) return;
    const r = tr.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    const p = (68 - r.top) / (this._m3Step || 280);
    const n = M3_ORDER[Math.max(0, Math.min(M3_ORDER.length - 1, Math.floor(p)))];
    if (n !== M.tgt) { M.tgt = n; if (this._isVis('m3') || M.cur) this._m3Go(); }
  }
  _m3Jump(i) {
    const tr = document.querySelector('.lp-m3-track');
    if (!tr) return;
    const y = window.scrollY + tr.getBoundingClientRect().top - 68 + i * (this._m3Step || 280) + (this._m3Step || 280) * 0.4;
    window.scrollTo({ top: Math.max(0, y), behavior: this._rm ? 'auto' : 'smooth' });
  }
  // A9 · the outlines of the seven silhouettes in stage units, sampled once (clockwise from the top, so two of them pair up point by point)
  _m3Shapes() {
    if (this._m3Sh) return this._m3Sh;
    const svg = document.querySelector('.lp-m3-ag'), SC = svg && svg.getScreenCTM();
    if (!SC) return null;
    if (!this._magEls) this._m3Els();
    const inv = SC.inverse(), N = 120, out = {};
    const norm = (pts) => {
      let cx = 0, cy = 0; pts.forEach((p) => { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
      let area = 0; for (let i = 0; i < pts.length; i += 1) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
      if (area < 0) pts.reverse();
      let best = 0, bd = 1e9;
      pts.forEach((p, i) => { const d = Math.abs(Math.atan2(p[1] - cy, p[0] - cx) + Math.PI / 2); if (d < bd) { bd = d; best = i; } });
      return pts.slice(best).concat(pts.slice(0, best));
    };
    let ok = true;
    M3_ORDER.forEach((n) => {
      const g = this._magEls[n], el = g && g.querySelector('.lp-mag-b [data-hg="mem"]');
      if (!el) { ok = false; return; }
      const tr = g.getAttribute('transform');
      if (tr) g.removeAttribute('transform');
      let len = 0; try { len = el.getTotalLength(); } catch (e) { len = 0; }
      const C = el.getScreenCTM();
      if (C && len) {
        const pts = [];
        for (let i = 0; i < N; i += 1) { const p = el.getPointAtLength(len * i / N), sp = svg.createSVGPoint(); sp.x = p.x; sp.y = p.y; const q = sp.matrixTransform(C).matrixTransform(inv); pts.push([q.x, q.y]); }
        out[n] = norm(pts);
      } else ok = false;
      if (tr) g.setAttribute('transform', tr);
    });
    if (!ok) return null;
    this._m3Sh = out;
    return out;
  }
  // one turn at a time; if the visitor scrolled on meanwhile, the next turn goes straight to where they are now (and is quicker)
  _m3Go() {
    const M = this._m3;
    if (!M || M.busy || M.cur === M.tgt) return;
    const A = M.cur, B = M.tgt;
    if (this._rm || !this._eng || !A || !this._m3Shapes()) {
      // first arrival, reduced motion or no outlines: the specialist simply takes the place
      if (A) { this._m3Show(A, false); this._mmv[A].tracks = []; this._m3Mode(A, 'sleep'); }
      this._mmv[B].tracks = [];
      this._m3Show(B, true);
      M.cur = B;
      this.setState({ m3Ag: B });
      this._m3NetSet(B, !!A && !this._rm);
      if (this._rm || !this._eng) { this._m3Mode(B, 'medit'); return; }
      M.busy = true;
      this._m3Mode(B, 'idle');
      this._m3Later(() => { M.busy = false; M.tLast = performance.now(); if (M.cur === B) this._m3Mode(B, 'medit'); this._m3Go(); }, M3_T.look);
      return;
    }
    const ia = M3_ORDER.indexOf(A), ib = M3_ORDER.indexOf(B), fwd = ib > ia;
    const P = fwd ? M3_A9[ib - 1] : M3_A9[ib], s = fwd ? P.s : -P.s, tilt = (P.tilt || 0) * (fwd ? 1 : -1);
    const fast = M.queued || performance.now() - M.tLast < 700;
    M.queued = false;
    const T = fast ? { pre: M3_T.fpre, out: M3_T.fout, morph: M3_T.fmorph, in: M3_T.fin } : { pre: M3_T.pre, out: M3_T.out, morph: M3_T.morph, in: M3_T.in };
    // where the face goes (A) and where it comes back from (B); the body narrows across the turn axis
    let aEnd, bStart, bMid, bEnd;
    if (P.k === 'h') { aEnd = { et: 90 * s, fx: 0.84, rc: tilt }; bStart = { et: 270 * s, fx: 0.84, rc: -tilt / 2 }; bMid = { et: 345 * s, fx: 1.05 }; bEnd = { et: 360 * s }; }
    else if (P.k === 'v') { aEnd = { ev: 90 * s, fy: 0.84, rc: tilt }; bStart = { ev: 270 * s, fy: 0.84 }; bMid = { ev: 345 * s, fy: 1.05 }; bEnd = { ev: 360 * s }; }
    else { aEnd = { rc: -24 * s, fx: 0.94, fy: 0.94, ec: 1 }; bStart = { rc: 20 * s, fx: 0.94, fy: 0.94, ec: 1 }; bMid = { rc: -4 * s, fx: 1.03, fy: 0.98, ec: 1 }; bEnd = { ec: 1 }; }
    const tA = T.pre + T.out, tB = tA + T.morph, tE = tB + T.in;
    M.busy = true; M.cur = B;
    this._m3Hush(true);
    const X = { A: A, B: B, k: P.k, s: s, aEnd: aEnd, bStart: bStart, t0: performance.now(), T: T, ph: 0 };
    this._m3X = X;
    // A opens its eyes and turns its face away
    this._mmv[A].tracks = [];
    this._m3Mode(A, 'idle');
    this._m3Push(A, [[0, {}], [T.pre, P.k === 'spin' ? { ec: 1 } : {}], [tA, aEnd, 'in'], [tA + 160, aEnd]]);
    // B turns its face in from the other side, then settles
    this._mmv[B].tracks = [];
    this._m3Mode(B, 'idle');
    const kb = [[0, bStart], [24, bStart], [24 + T.in * 0.5, bMid, 'out'], [24 + T.in * 0.78, Object.assign({}, bEnd, P.k === 'spin' ? {} : { fx: P.k === 'h' ? 0.99 : 1, fy: P.k === 'v' ? 0.99 : 1 }), 'io'], [24 + T.in, bEnd, 'mola']];
    if (P.k === 'spin') kb.push([24 + T.in + 240, {}, 'io']);
    this._m3Push(B, kb, tB - 24);
    this._m3Later(() => this._m3Fin(X), tE + 160);
  }
  // drawn from the motion loop: between the two faces, one silhouette turns into the other
  _m3XTick(t) {
    const X = this._m3X;
    if (!X) return;
    const e = t - X.t0, T = X.T, tA = T.pre + T.out, tB = tA + T.morph;
    if (e < tA) return;
    const path = this._m3Mph || (this._m3Mph = document.querySelector('.lp-m3-mph'));
    if (e < tB) {
      if (X.ph < 1) { X.ph = 1; this._m3Show(X.A, false); if (path) path.style.opacity = '1'; this.setState({ m3Ag: X.B }); this._m3NetSet(X.B, true); }
      if (!path || !this._m3Sh) return;
      const q0 = (e - tA) / T.morph, q = q0 < 0.5 ? 2 * q0 * q0 : 1 - Math.pow(-2 * q0 + 2, 2) / 2;
      const PA = this._m3Sh[X.A], PB = this._m3Sh[X.B];
      let d = '';
      for (let i = 0; i < PA.length; i += 1) d += (i ? 'L' : 'M') + (PA[i][0] + (PB[i][0] - PA[i][0]) * q).toFixed(1) + ' ' + (PA[i][1] + (PB[i][1] - PA[i][1]) * q).toFixed(1);
      path.setAttribute('d', d + 'Z');
      const ca = parseInt(COLOR[X.A].slice(1), 16), cb = parseInt(COLOR[X.B].slice(1), 16);
      const ch = (sh) => Math.round(((ca >> sh) & 255) + (((cb >> sh) & 255) - ((ca >> sh) & 255)) * q);
      path.style.fill = 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')';
      // the turn itself: narrower across the axis halfway through, with the lean or the spin
      const A0 = X.aEnd, B0 = X.bStart, mid = Math.sin(Math.PI * q0);
      const fx = (A0.fx || 1) + ((B0.fx || 1) - (A0.fx || 1)) * q - (X.k === 'h' ? 0.14 * mid : (X.k === 'spin' ? 0.03 * mid : 0));
      const fy = (A0.fy || 1) + ((B0.fy || 1) - (A0.fy || 1)) * q - (X.k === 'v' ? 0.14 * mid : (X.k === 'spin' ? 0.03 * mid : 0));
      const rc = (A0.rc || 0) + ((B0.rc || 0) - (A0.rc || 0)) * q;
      const cx = M3_GEO.cx, cy = M3_GEO.cy, ra = rc * Math.PI / 180, ma = Math.cos(ra) * fx, mb = Math.sin(ra) * fx, mc = -Math.sin(ra) * fy, md = Math.cos(ra) * fy;
      X.mmx = [ma, mb, mc, md, cx - (ma * cx + mc * cy), cy - (mb * cx + md * cy)];
      path.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') rotate(' + rc.toFixed(2) + ') scale(' + fx.toFixed(4) + ' ' + fy.toFixed(4) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
      return;
    }
    if (X.ph < 2) { X.ph = 2; if (path) path.style.opacity = '0'; this._m3Show(X.B, true); }
  }
  _m3Fin(X) {
    if (this._m3X !== X) return;
    this._m3X = null;
    const M = this._m3, path = document.querySelector('.lp-m3-mph');
    if (path) path.style.opacity = '0';
    this._m3Show(X.A, false); this._mmv[X.A].tracks = []; this._m3Mode(X.A, 'sleep');
    this._m3Show(X.B, true);
    if (this.state.m3Ag !== X.B) this.setState({ m3Ag: X.B });
    this._m3NetSet(X.B, true);
    this._m3Burst();
    M.busy = false; M.tLast = performance.now();
    this._m3Hush(false);
    this._sxDirtyMem();
    if (M.tgt !== X.B) { M.queued = true; this._m3Go(); return; }
    // it is there: a short look, then concentration while the pulses start again
    const B = X.B;
    this._m3Later(() => { if (this._m3.cur === B && !this._m3.busy) this._m3Mode(B, 'medit'); }, X.T.in > 400 ? M3_T.look - 280 : 140);
  }
  // ------------------------------------------------------------ R23 · rede de memória viva
  // Six pieces of Miolo's context sit around the specialist (HTML cards, above it), linked to its head by thin curved lines
  // (one SVG behind it, in stage px, rebuilt from the stage size: no fixed coordinates). The lines stop a little short of the
  // silhouette, so they never cross the face. The pieces stay when the specialist changes: some carry over, some swap, the
  // ones it is using most take its colour. One small pulse at a time (now and then two, from opposite sides) leaves a piece
  // and travels to the head, which reacts a little. During an A9 turn the lines follow the outline from one silhouette to
  // the next, no new pulse leaves, and the ones on their way slow down and dim.
  _m3Hush(on) {
    const w = document.querySelector('.lp-m3-netw');
    if (w) w.classList.toggle('is-hush', on);
    if (this._m3N) this._m3N.hush = on;
  }
  _sxDirtyMem() { if (this._eng) this._eng.dirty = true; }
  _m3NetBuild() {
    if (this._m3N) return this._m3N;
    const w = document.querySelector('.lp-m3-netw'), fl = document.querySelector('.lp-m3-flow'), st = document.querySelector('.lp-m3-stage');
    if (!w || !fl || !st) return null;
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, at, par) => { const e = document.createElementNS(NS, tag); Object.keys(at).forEach((k) => e.setAttribute(k, at[k])); par.appendChild(e); return e; };
    const svg = mk('svg', { class: 'lp-m3-net', width: '100%', height: '100%' }, w), defs = mk('defs', {}, svg);
    const N = {
      svg: svg, seg: {}, sd: {}, live: {}, jn: [], end: [], pz: [], nodes: [], ids: [], pri: [], ag: null, ports: null, anc: null,
      spd: 1, dim: 1, hush: false, lastR: -1, nArr: 0, calm: 0,
      // route → the line pieces it runs along (piece → junction → head, or piece → head)
      R: [['b0', 'tL'], ['b1', 'tL'], ['r2'], ['r3'], ['b4', 'tR'], ['b5', 'tR']]
    };
    N.fl = {};
    ['b0', 'b1', 'tL', 'r2', 'r3', 'b4', 'b5', 'tR'].forEach((k) => { N.seg[k] = mk('path', { class: 'lp-m3-ln', d: 'M0 0' }, svg); N.live[k] = 0; });
    // R23b · a light that keeps running along every wire, toward the head
    ['b0', 'b1', 'tL', 'r2', 'r3', 'b4', 'b5', 'tR'].forEach((k) => { N.fl[k] = mk('path', { class: 'lp-m3-fl', d: 'M0 0' }, svg); });
    [0, 1].forEach(() => N.jn.push(mk('circle', { class: 'lp-m3-jn', r: '3', cx: '-20', cy: '-20' }, svg)));
    [0, 1, 2, 3].forEach(() => N.end.push(mk('circle', { class: 'lp-m3-end', r: '2.3', cx: '-20', cy: '-20' }, svg)));
    for (let i = 0; i < M3_P.pool; i += 1) {
      const lg = mk('linearGradient', { id: 'lpm-pg' + i, gradientUnits: 'userSpaceOnUse' }, defs);
      const s0 = mk('stop', { offset: '0', 'stop-opacity': '0' }, lg), s1 = mk('stop', { offset: '1', 'stop-opacity': '0.9' }, lg);
      const rg = mk('radialGradient', { id: 'lpm-ph' + i }, defs);
      const h0 = mk('stop', { offset: '0', 'stop-opacity': '0.62' }, rg), h1 = mk('stop', { offset: '1', 'stop-opacity': '0' }, rg);
      const ring = mk('circle', { class: 'lp-m3-arr', r: '9', cx: '-40', cy: '-40' }, svg);
      const g = mk('g', { class: 'lp-m3-pz', style: 'opacity: 0' }, svg);
      const tr = mk('path', { class: 'lp-m3-ptr', d: 'M0 0', stroke: 'url(#lpm-pg' + i + ')' }, g);
      const ha = mk('circle', { class: 'lp-m3-pha', r: '22', fill: 'url(#lpm-ph' + i + ')' }, g);
      const co = mk('circle', { class: 'lp-m3-pco', r: '4.6' }, g);
      N.pz.push({ i: i, lg: lg, st: [s0, s1, h0, h1], ring: ring, g: g, tr: tr, ha: ha, co: co, on: false });
    }
    M3_SLOTS.forEach((S) => {
      const el = document.createElement('div');
      el.className = 'lp-m3-node ' + (S.s < 0 ? 'is-l' : 'is-r');
      el.innerHTML = '<i class="lp-m3-np"></i><span class="lp-m3-nc"><i class="lp-m3-nd"></i><span class="lp-m3-nt"><small></small><b></b></span></span>';
      fl.appendChild(el);
      N.nodes.push(el);
    });
    this._m3N = N;
    if (window.ResizeObserver) { this._m3RO = new ResizeObserver(() => this._m3NetLayout()); this._m3RO.observe(st); }
    return N;
  }
  // stage px: where the agent's drawing sits and where each piece's port is (kept clear of all seven silhouettes at its height)
  _m3NetLayout() {
    const N = this._m3N, st = document.querySelector('.lp-m3-stage'), ag = document.querySelector('.lp-m3-ag');
    if (!N || !st || !ag) return;
    const sr = st.getBoundingClientRect(), ar = ag.getBoundingClientRect();
    if (!sr.width || !ar.width) return;
    N.W = sr.width; N.H = sr.height; N.ox = ar.left - sr.left; N.oy = ar.top - sr.top; N.k = ar.width / 640;
    const Sh = this._m3Shapes();
    N.ports = M3_SLOTS.map((S, i) => {
      const y = Math.round(S.y * N.H);
      let x = S.x * N.W;
      if (Sh) {
        let e = S.s < 0 ? 1e9 : -1e9;
        M3_ORDER.forEach((n) => Sh[n].forEach((p) => {
          const py = N.oy + p[1] * N.k;
          if (Math.abs(py - y) < 34) { const px = N.ox + p[0] * N.k; e = S.s < 0 ? Math.min(e, px) : Math.max(e, px); }
        }));
        if (Math.abs(e) < 1e8) {
          // clear of the silhouettes by 56px; on a narrow stage, closer (down to 24px) so the piece keeps room to read
          const at = (c) => (S.s < 0 ? Math.min(x, e - c) : Math.max(x, e + c)), rm = (xx) => (S.s < 0 ? xx - 16 : N.W - xx - 16);
          const r0 = rm(at(56));
          x = at(r0 < 176 ? Math.max(24, 56 - (176 - r0)) : 56);
        }
      }
      x = Math.round(x);
      const el = N.nodes[i];
      // little room (large agent on a narrow stage): the value may take two lines instead of being cut
      const room = Math.max(118, S.s < 0 ? x - 16 : N.W - x - 16);
      el.classList.toggle('is-tight', room < 236);
      if (S.s < 0) { el.style.left = 'auto'; el.style.right = (N.W - x) + 'px'; }
      else { el.style.right = 'auto'; el.style.left = x + 'px'; }
      el.style.maxWidth = room + 'px';
      el.style.top = y + 'px';
      return { x: x, y: y, s: S.s };
    });
    this._m3NetDraw(performance.now());
  }
  // where the lines reach each silhouette (svg units): the outermost crossing of a ray from inside the head with its outline;
  // the line arrives along a blend of the ray and the outline's normal (organic, never grazing the outline)
  _m3Anchors() {
    if (this._m3A) return this._m3A;
    const Sh = this._m3Shapes();
    if (!Sh) return null;
    const C = M3_ANC.c, out = {};
    M3_ORDER.forEach((n) => {
      const P = Sh[n];
      out[n] = M3_ANC.a.map((deg) => {
        const a = deg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
        let best = null;
        for (let i = 0; i < P.length; i += 1) {
          const p = P[i], q = P[(i + 1) % P.length], ex = q[0] - p[0], ey = q[1] - p[1], den = dx * ey - dy * ex;
          if (Math.abs(den) < 1e-9) continue;
          const wx = p[0] - C[0], wy = p[1] - C[1], t = (wx * ey - wy * ex) / den, u = (wx * dy - wy * dx) / den;
          if (t > 0 && u >= 0 && u <= 1 && (!best || t > best.t)) {
            const L = Math.hypot(ex, ey) || 1;
            let nx = ey / L, ny = -ex / L;
            if (nx * dx + ny * dy < 0) { nx = -nx; ny = -ny; }
            best = { t: t, x: C[0] + dx * t, y: C[1] + dy * t, nx: nx, ny: ny };
          }
        }
        if (!best) best = { x: C[0] + dx * 160, y: C[1] + dy * 160, nx: dx, ny: dy };
        const bx = best.nx + dx, by = best.ny + dy, bl = Math.hypot(bx, by) || 1;
        return { x: best.x, y: best.y, nx: bx / bl, ny: by / bl };
      });
    });
    this._m3A = out;
    return out;
  }
  _m3Attr(el, x, y) { const sx = x.toFixed(1), sy = y.toFixed(1); if (el._x !== sx || el._y !== sy) { el._x = sx; el._y = sy; el.setAttribute('cx', sx); el.setAttribute('cy', sy); } }
  // the network as it is now: anchors (blended across a turn, following the visible silhouette's own small motions) → curves
  _m3NetDraw(t) {
    const N = this._m3N, M = this._m3;
    if (!N || !N.ports || !M || !M.cur) return;
    const A = this._m3Anchors();
    if (!A) return;
    const X = this._m3X, mv = (n) => (this._mmv[n] && this._mmv[n].mx) || null;
    let a0 = A[M.cur], a1 = null, q = 0, mx;
    if (X) {
      const e = t - X.t0, T = X.T, tA = T.pre + T.out, tB = tA + T.morph, r0 = tA - T.out * 0.6, r1 = tB + T.in * 0.35;
      const u = Math.max(0, Math.min(1, (e - r0) / (r1 - r0)));
      q = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      a0 = A[X.A]; a1 = A[X.B];
      mx = e < tA ? mv(X.A) : (e < tB ? X.mmx : mv(X.B));
    } else mx = mv(M.cur);
    const gp = M3_ANC.gap;
    const anc = a0.map((p, i) => {
      let x = p.x, y = p.y, nx = p.nx, ny = p.ny;
      if (a1) { const b = a1[i]; x += (b.x - x) * q; y += (b.y - y) * q; nx += (b.nx - nx) * q; ny += (b.ny - ny) * q; }
      if (mx) { const x2 = mx[0] * x + mx[2] * y + mx[4], y2 = mx[1] * x + mx[3] * y + mx[5], nx2 = mx[0] * nx + mx[2] * ny, ny2 = mx[1] * nx + mx[3] * ny; x = x2; y = y2; nx = nx2; ny = ny2; }
      const l = Math.hypot(nx, ny) || 1;
      nx /= l; ny /= l;
      return { x: N.ox + x * N.k + nx * gp, y: N.oy + y * N.k + ny * gp, nx: nx, ny: ny };
    });
    const P = N.ports, f = (v) => v.toFixed(1);
    // each curve leaves its card level, and arrives along the anchor's normal
    const appr = (a, from) => { const d = Math.hypot(a.x - from.x, a.y - from.y), L = Math.max(26, Math.min(80, d * 0.34)); return { x: a.x + a.nx * L, y: a.y + a.ny * L }; };
    const junc = (i0, i1, a) => {
      const mxp = (P[i0].x + P[i1].x) / 2, myp = (P[i0].y + P[i1].y) / 2, c = appr(a, { x: mxp, y: myp });
      const J = { x: mxp + (c.x - mxp) * 0.46, y: myp + (c.y - myp) * 0.34, c: c };
      const tx = c.x - J.x, ty = c.y - J.y, tl = Math.hypot(tx, ty) || 1;
      J.tx = tx / tl; J.ty = ty / tl; J.tl = tl;
      return J;
    };
    const JL = junc(0, 1, anc[0]), JR = junc(4, 5, anc[3]);
    const branch = (p, J) => { const d = Math.hypot(J.x - p.x, J.y - p.y); return [[p.x, p.y], [p.x - p.s * d * 0.45, p.y], [J.x - J.tx * d * 0.42, J.y - J.ty * d * 0.42], [J.x, J.y]]; };
    const trunk = (J, a) => [[J.x, J.y], [J.x + J.tx * J.tl * 0.42, J.y + J.ty * J.tl * 0.42], [J.c.x, J.c.y], [a.x, a.y]];
    const direct = (p, a) => { const c = appr(a, p), d = Math.hypot(c.x - p.x, c.y - p.y); return [[p.x, p.y], [p.x - p.s * d * 0.5, p.y], [c.x, c.y], [a.x, a.y]]; };
    const G = { b0: branch(P[0], JL), b1: branch(P[1], JL), tL: trunk(JL, anc[0]), r2: direct(P[2], anc[1]), r3: direct(P[3], anc[2]), b4: branch(P[4], JR), b5: branch(P[5], JR), tR: trunk(JR, anc[3]) };
    Object.keys(G).forEach((k) => {
      const c = G[k], d = 'M' + f(c[0][0]) + ' ' + f(c[0][1]) + 'C' + f(c[1][0]) + ' ' + f(c[1][1]) + ' ' + f(c[2][0]) + ' ' + f(c[2][1]) + ' ' + f(c[3][0]) + ' ' + f(c[3][1]);
      if (N.sd[k] !== d) { N.sd[k] = d; N.seg[k].setAttribute('d', d); N.fl[k].setAttribute('d', d); }
    });
    this._m3Attr(N.jn[0], JL.x, JL.y); this._m3Attr(N.jn[1], JR.x, JR.y);
    anc.forEach((a, i) => this._m3Attr(N.end[i], a.x, a.y));
    N.G = G; N.anc = anc;
  }
  // a route as a small arc-length table (from the curves as they are this frame)
  _m3Route(r) {
    const N = this._m3N, pts = [];
    N.R[r].forEach((k, si) => {
      const c = N.G[k];
      for (let j = si ? 1 : 0; j <= 20; j += 1) {
        const s = j / 20, m = 1 - s;
        pts.push([m * m * m * c[0][0] + 3 * m * m * s * c[1][0] + 3 * m * s * s * c[2][0] + s * s * s * c[3][0], m * m * m * c[0][1] + 3 * m * m * s * c[1][1] + 3 * m * s * s * c[2][1] + s * s * s * c[3][1]]);
      }
    });
    const acc = [0];
    for (let i = 1; i < pts.length; i += 1) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts: pts, acc: acc, len: acc[acc.length - 1] };
  }
  _m3At(T, s) {
    s = Math.max(0, Math.min(T.len, s));
    let i = 1;
    while (i < T.acc.length - 1 && T.acc[i] < s) i += 1;
    const a = T.acc[i - 1], b = T.acc[i], k = b > a ? (s - a) / (b - a) : 0, p = T.pts[i - 1], q = T.pts[i];
    return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  }
  // from the motion loop: lines follow the silhouette; pulses travel (slower and dimmer while a turn is on)
  _m3NetTick(t, dt) {
    const N = this._m3N;
    if (!N || !N.ports) return;
    this._m3NetDraw(t);
    const k = Math.min(1, dt / 220);
    N.spd += ((N.hush ? M3_P.slow : 1) - N.spd) * k;
    N.dim += ((N.hush ? M3_P.dim : 1) - N.dim) * k;
    N.pz.forEach((z) => {
      if (!z.on) return;
      if (z.wait > 0) { z.wait -= dt * N.spd; return; }
      z.u = Math.min(1, z.u + dt * N.spd / z.dur);
      const T = this._m3Route(z.r), e = 0.5 - Math.cos(Math.PI * z.u) / 2, s = e * T.len, h = this._m3At(T, s);
      const tl = M3_P.trail * Math.min(1, z.u * 5), tail = [];
      for (let j = 5; j >= 0; j -= 1) tail.push(this._m3At(T, s - tl * j / 5));
      z.tr.setAttribute('d', 'M' + tail.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L'));
      z.lg.setAttribute('x1', tail[0][0].toFixed(1)); z.lg.setAttribute('y1', tail[0][1].toFixed(1));
      z.lg.setAttribute('x2', h[0].toFixed(1)); z.lg.setAttribute('y2', h[1].toFixed(1));
      this._m3Attr(z.co, h[0], h[1]); this._m3Attr(z.ha, h[0], h[1]);
      const op = Math.min(1, z.u / 0.08) * (z.u > 0.9 ? 0.35 + 0.65 * (1 - z.u) / 0.1 : 1);
      z.g.style.opacity = (op * N.dim).toFixed(3);
      if (!z.cool && z.u > 0.4) { z.cool = true; N.nodes[M3_ROUTES[z.r][0]].classList.remove('is-hot'); }
      if (z.u >= 1) this._m3Arrive(z);
    });
  }
  // one pulse (r ≥ 0: from that piece; otherwise mostly from a piece this specialist is using, never the same route twice in a row)
  _m3Fire(r) {
    const N = this._m3N, M = this._m3;
    if (!N || !N.ports || !M.cur) return 0;
    const z = N.pz.find((p) => !p.on);
    if (!z) return 0;
    const flying = N.pz.filter((p) => p.on).map((p) => p.r);
    if (r == null || r < 0) {
      const cand = [0, 1, 2, 3, 4, 5].filter((i) => i !== N.lastR && flying.indexOf(i) < 0);
      if (!cand.length) return 0;
      const pri = cand.filter((i) => N.pri[M3_ROUTES[i][0]]), pool = pri.length && Math.random() < 0.7 ? pri : cand;
      r = pool[Math.floor(Math.random() * pool.length)];
      N.lastR = r;
    } else if (flying.indexOf(r) >= 0) return 0;
    const col = COLOR[M.cur], ink = M3_INK[M.cur] || col;
    z.st[0].setAttribute('stop-color', ink); z.st[1].setAttribute('stop-color', ink);
    z.st[2].setAttribute('stop-color', col); z.st[3].setAttribute('stop-color', col);
    z.co.style.fill = col;
    z.on = true; z.r = r; z.wait = M3_P.hot; z.u = 0; z.cool = false; z.ag = M.cur;
    z.dur = M3_P.fly[0] + Math.random() * (M3_P.fly[1] - M3_P.fly[0]);
    z.g.style.opacity = '0';
    N.nodes[M3_ROUTES[r][0]].classList.add('is-hot');
    N.R[r].forEach((k) => { N.live[k] += 1; N.seg[k].classList.add('is-live'); });
    return M3_P.hot + z.dur;
  }
  // a specialist arrives: the whole network surges in its colour and every piece sends a pulse (staggered)
  _m3Burst() {
    const N = this._m3N;
    if (!N || !N.ports || this._rm) return;
    const w = document.querySelector('.lp-m3-netw');
    if (w) { w.classList.remove('is-surge'); void w.getBoundingClientRect(); w.classList.add('is-surge'); }
    this._ctClear('_m3g');
    this._ctLater('_m3g', () => { const w2 = document.querySelector('.lp-m3-netw'); if (w2) w2.classList.remove('is-surge'); }, 520);
    const order = [0, 3, 1, 4, 2, 5];
    order.forEach((r, i) => this._m3sLater(() => this._m3Fire(r), i * M3_P.burst));
  }
  // it reaches the head: a ring where the line meets the silhouette; now and then the specialist leans a little toward it and
  // its eyes change; the matching dot of the shared memory answers (the count does not change)
  _m3Arrive(z) {
    const N = this._m3N, M = this._m3, r = z.r;
    z.on = false; z.g.style.opacity = '0';
    N.nodes[M3_ROUTES[r][0]].classList.remove('is-hot');
    N.R[r].forEach((k) => { N.live[k] = Math.max(0, N.live[k] - 1); if (!N.live[k]) N.seg[k].classList.remove('is-live'); });
    const a = N.anc && N.anc[M3_ROUTES[r][2]];
    if (a && z.ring.animate) {
      z.ring.setAttribute('cx', a.x.toFixed(1)); z.ring.setAttribute('cy', a.y.toFixed(1));
      z.ring.style.stroke = M3_INK[z.ag] || COLOR[z.ag];
      z.ring.animate([{ transform: 'scale(.4)', opacity: 0.9 * N.dim }, { transform: 'scale(2.9)', opacity: 0 }], { duration: 760, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    if (!M.cur || M.busy || M.cur !== z.ag) return;
    const now = performance.now();
    const dot = document.querySelectorAll('.lp-m3-dots i')[M3_ORDER.indexOf(M.cur)];
    if (dot && dot.animate) dot.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(2.1)', offset: 0.35 }, { transform: 'scale(1.35)' }], { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    if (now - (N.lastReact || 0) < M3_P.react) return;
    N.lastReact = now;
    const s = M3_SLOTS[M3_ROUTES[r][0]].s;
    this._m3Push(M.cur, [[0, {}], [170, { rc: 1.6 * s, sy: 0.99, sx: 1.006 }, 'out'], [720, {}, 'mola']]);
    N.nArr += 1;
    const ex = [null, 'oval', 'happy'][N.nArr % 3];
    if (ex) this._flash('mem', M.cur, ex, ex === 'happy' ? 560 : 640);
  }
  // the pieces for this specialist: unchanged ones stay put, the others swap with a short crossfade
  _m3NetSet(n, anim) {
    const N = this._m3NetBuild();
    if (!N) return;
    if (!N.ports) this._m3NetLayout();
    if (N.ag === n) return;
    const first = !N.ag;
    N.ag = n;
    const w = document.querySelector('.lp-m3-netw'), fl = document.querySelector('.lp-m3-flow');
    [w, fl].forEach((e) => { if (e) { e.style.setProperty('--c', COLOR[n]); e.style.setProperty('--k', M3_INK[n] || COLOR[n]); } });
    if (first && w) w.classList.add('is-on');
    const D = M3_NET[n];
    N.nodes.forEach((el, i) => {
      const id = D[0][i], p = D[1].indexOf(i) >= 0;
      N.pri[i] = p; N.ids[i] = id;
      const fill = () => {
        if (N.ids[i] !== id) return;
        const it = M3_ITEMS[id], b = el.querySelector('b');
        el.querySelector('small').textContent = it[0];
        b.textContent = it[1];
        if (M3_SW[id]) {
          const sw = document.createElement('span'); sw.className = 'lp-m3-sw';
          M3_SW[id].forEach((c) => { const d = document.createElement('i'); d.style.background = c; sw.appendChild(d); });
          b.appendChild(sw);
        }
        el.dataset.id = id;
        el.classList.toggle('is-pri', N.pri[i]);
        el.classList.remove('is-swap');
      };
      if (el.dataset.id === id) { el.classList.remove('is-swap'); el.classList.toggle('is-pri', p); return; }
      if (!anim || !el.dataset.id) { if (first) el.style.animationDelay = (160 + i * 80) + 'ms'; fill(); return; }
      el.classList.add('is-swap');
      this._ctLater('_m3n', fill, 170 + i * 30);
    });
    this._m3NetDraw(performance.now());
  }
  // the pulses: one after the other while the stage is on screen (up to M3_P.max on the way); none leaves mid-turn,
  // but the ones on their way keep going, and every arrival brings a burst
  _m3Stream() {
    this._ctClear('_m3s');
    if (this._rm || !this._isVis('m3')) return;
    const next = (d) => this._m3sLater(() => {
      const M = this._m3, N = this._m3N;
      if (M && N && N.ports && M.cur && !M.busy && !document.hidden && N.pz.filter((p) => p.on).length < M3_P.max) this._m3Fire(-1);
      next(M3_P.rest[0] + Math.random() * (M3_P.rest[1] - M3_P.rest[0]));
    }, d);
    next(M3_P.first);
  }
  _m3Vis(on) {
    if (!this._m3) return;
    if (on) {
      if (!this._m3.cur || this._m3.cur !== this._m3.tgt) this._m3Go();
      if (this._m3N) this._m3NetLayout();
      this._m3Stream();
      this._m3Burst();
    } else this._ctClear('_m3s');
    const w = document.querySelector('.lp-m3-netw');
    if (w) w.classList.toggle('is-off', !on);
  }

  // ------------------------------------------------------------ encerramento (R25) · the A9 signature, typing only
  // One deterministic timeline (the picture is a function of the elapsed time), drawn from its own animation frame only while
  // it plays: it starts when the closing is well in view, types, joins into the wordmark, shows the button and rests there.
  // When the closing has fully left the screen it goes back to "Hello," so coming back plays it again. Reduced motion: the
  // wordmark and the button, still.
  _a9Els() {
    if (this._a9E) return this._a9E;
    const st = document.querySelector('.lp-a9');
    if (!st) return null;
    const E = {
      st: st, line: st.querySelector('.a9-line'), comma: st.querySelector('.a9-comma'), sq: st.querySelector('.a9-sq'),
      keys: Array.prototype.slice.call(st.querySelectorAll('.a9-k')), base: st.querySelector('.a9-base'), wm: st.querySelector('.a9-wm'),
      wms: st.querySelector('.a9-wm-s'), cur: st.querySelector('.a9-cur'), cta: st.querySelector('.a9-cta'), c: {}
    };
    if (!E.line || !E.cta) return null;
    this._a9E = E;
    return E;
  }
  // where everything sits: measured from the live type (Gabarito 800), so the join lands exactly on the wordmark
  _a9Layout() {
    const E = this._a9Els();
    if (!E) return false;
    const sr = E.st.getBoundingClientRect();
    if (!sr.width || !sr.height) return false;
    E.sq.style.transform = ''; E.line.style.transform = '';
    const lr = E.line.getBoundingClientRect(), F = parseFloat(window.getComputedStyle(E.line).fontSize) || 120;
    const off = (el) => { const r = el.getBoundingClientRect(); return [r.left - lr.left, r.right - lr.left]; };
    const sq = off(E.sq), keys = E.keys.map((k) => off(k)[1]);
    const baseY = E.base.getBoundingClientRect().top - lr.top;
    let capH = 0.7 * F;
    try {
      const cv = this._a9cv || (this._a9cv = document.createElement('canvas')), ctx = cv.getContext('2d');
      ctx.font = '800 ' + F + 'px Gabarito, sans-serif';
      const m = ctx.measureText('H');
      if (m && m.actualBoundingBoxAscent > F * 0.4) capH = m.actualBoundingBoxAscent;
    } catch (e) { /* keep the estimate */ }
    const wmr = E.wm.getBoundingClientRect(), wW = wmr.width, offS = E.wms.getBoundingClientRect().left - wmr.left;
    const W = sr.width, H = sr.height, gap = Math.max(40, A9_L.gap * F), bh = E.cta.getBoundingClientRect().height || 52;
    // "Hello, Squad" is centred as a whole: the typing fills the line to the right, the join closes it on the centre
    const L1 = Math.round(W / 2 - sq[1] / 2);
    const baseline = Math.round(H / 2 + capH / 2 - (gap + bh) / 2);
    const cw = Math.max(6, A9_L.cw * F), ch = capH + 0.11 * F, cTop = baseline - capH - 0.065 * F;
    E.L = { L1: L1, top: baseline - baseY, cw: cw, ch: ch, cTop: cTop, cur0: L1 + sq[0] - cw * 0.35, curAfter: keys.map((x) => L1 + x + 0.035 * F), dxLine: (W / 2 - wW / 2) - L1, dxSq: offS - sq[0] };
    E.line.style.top = E.L.top + 'px';
    E.cur.style.width = cw.toFixed(1) + 'px'; E.cur.style.height = ch.toFixed(1) + 'px';
    E.cta.style.top = (baseline + gap) + 'px';
    E.c = {};
    return true;
  }
  _a9Render(t) {
    const E = this._a9Els();
    if (!E || !E.L) return;
    this._a9Now = t;
    const L = E.L, X = A9_TL;
    const set = (key, v, fn) => { if (E.c[key] !== v) { E.c[key] = v; fn(v); } };
    let cv = 0;
    X.cur.forEach((c) => { if (t >= c[0]) cv = c[1]; });
    let typed = 0;
    X.keys.forEach((k) => { if (t >= k) typed += 1; });
    const cx = typed ? L.curAfter[typed - 1] : L.cur0;
    set('co', String(cv), (v) => { E.cur.style.opacity = v; });
    set('ct', 'translate(' + cx.toFixed(1) + 'px, ' + L.cTop.toFixed(1) + 'px)', (v) => { E.cur.style.transform = v; });
    E.keys.forEach((el, j) => set('k' + j, j < typed ? '1' : '0', (v) => { el.style.opacity = v; }));
    const cq = Math.max(0, Math.min(1, (t - X.comma[0]) / (X.comma[1] - X.comma[0])));
    set('cm', (1 - cq).toFixed(3), (v) => { E.comma.style.opacity = v; });
    const jq = Math.max(0, Math.min(1, (t - X.join[0]) / (X.join[1] - X.join[0]))), j3 = jq < 0.5 ? 4 * jq * jq * jq : 1 - Math.pow(-2 * jq + 2, 3) / 2;
    set('ln', 'translateX(' + (L.L1 + L.dxLine * j3).toFixed(2) + 'px)', (v) => { E.line.style.transform = v; });
    set('sq', 'translateX(' + (L.dxSq * j3).toFixed(2) + 'px)', (v) => { E.sq.style.transform = v; });
    set('cta', t >= X.cta ? '1' : '0', (v) => { E.cta.classList.toggle('is-on', v === '1'); });
  }
  _a9End() { return A9_TL.end; }
  _a9Play() {
    if (!this._a9E || !this._a9E.L) { if (!this._a9Layout()) return; }
    if (this._a9Raf) cancelAnimationFrame(this._a9Raf);
    this._a9On = true;
    if (this._rm) { this._a9Raf = 0; this._a9Render(this._a9End()); return; }
    this._a9T0 = performance.now();
    const loop = () => {
      const t = performance.now() - this._a9T0;
      this._a9Render(Math.min(t, this._a9End()));
      this._a9Raf = t < this._a9End() ? requestAnimationFrame(loop) : 0;
    };
    this._a9Raf = requestAnimationFrame(loop);
  }
  _a9Reset() {
    if (this._a9Raf) cancelAnimationFrame(this._a9Raf);
    this._a9Raf = 0; this._a9On = false;
    this._a9Render(this._rm ? this._a9End() : 0);
  }
  _a9Relayout() {
    if (!this._a9Layout()) return;
    this._a9Render(this._rm ? this._a9End() : (this._a9Now || 0));
  }

  // R24 · when Resultados has fully left the screen, its story goes back to the start (dashboard, chart, conversation,
  // proposal, approval, marker, after-results), so coming back plays it again; a small scroll inside it never resets it
  _resReset() {
    this._resArmed = false;
    this._ctClear('_res'); this._ctClear('_resv'); this._resCurStop();
    this._rTok = (this._rTok || 0) + 1;
    this.setState({ resMsgs: [], resTyping: null, resAppr: false, resDone: false, resDec: null, resStage: 0, resHover: -1 });
    const res = document.querySelector('.lp-res');
    if (res) { res.classList.remove('is-deep', 'is-settled'); if (this._io5) this._io5.observe(res); }
    const sc = document.querySelector('.lp-rc-scroll'); if (sc) sc.scrollTop = 0;
    const cur = document.querySelector('.lp-rcur'); if (cur) cur.classList.remove('is-click');
    this._rvRearm('#resultados');
  }
  // the reveal of a section (title, comparison rows) plays again next time it comes into view
  _rvRearm(sel) {
    if (!this._io || this._rm) return;
    document.querySelectorAll(sel + ' .rv.is-in').forEach((el) => { el.classList.remove('is-in'); this._io.observe(el); });
  }

  // ------------------------------------------------------------ perguntas frequentes (R22)
  // One answer open at a time; clicking the open one closes it. When one above closes while a lower one opens, the page
  // follows so the question that was clicked stays where it was (no jump). Nexo, at the end of the title, glances at it.
  _faqToggle(i) {
    const btn = document.getElementById('lp-faq-q' + (i + 1)), prev = this.state.faqOpen, open = prev === i ? -1 : i;
    const top0 = btn ? btn.getBoundingClientRect().top : 0;
    this.setState({ faqOpen: open });
    if (btn && open === i && prev >= 0 && prev < i) this._faqHold(btn, top0);
    if (open >= 0) this._faqLook(btn);
  }
  _faqHold(btn, top0) {
    if (this._faqStop) this._faqStop();
    const t0 = performance.now(), dur = this._rm ? 120 : 720;
    const stop = () => { if (this._faqRaf) cancelAnimationFrame(this._faqRaf); this._faqRaf = 0; window.removeEventListener('wheel', stop); window.removeEventListener('touchmove', stop); this._faqStop = null; };
    window.addEventListener('wheel', stop, { passive: true }); window.addEventListener('touchmove', stop, { passive: true });
    this._faqStop = stop;
    const f = () => {
      const d = btn.getBoundingClientRect().top - top0;
      if (Math.abs(d) > 0.5) window.scrollTo({ top: window.scrollY + d, behavior: 'instant' });
      if (performance.now() - t0 < dur) this._faqRaf = requestAnimationFrame(f); else stop();
    };
    this._faqRaf = requestAnimationFrame(f);
  }
  _faqLook(btn) {
    const E = this._eng, a = this._agBy('faq', 'coord');
    if (!E || !a || this._rm || !btn) return;
    const lr = a.lids.getBoundingClientRect(), r = btn.getBoundingClientRect();
    const dx = r.left + 60 - (lr.left + lr.width / 2), dy = r.bottom - (lr.top + lr.height / 2), d = Math.hypot(dx, dy) || 1;
    E.force.faq = { x: dx / d, y: dy / d, until: performance.now() + 1800 };
    this._blink(a);
    this._kick();
  }

  // ------------------------------------------------------------ gaze engine (C1 rules on the approved drawings)
  _flash(grp, n, x, ms) {
    if (!this._ags) return;
    const now = performance.now();
    this._ags.forEach((a) => { if (a.grp === grp && a.n === n) { a.fx = x; a.fxUntil = now + (ms || 900); this._blink(a); } });
  }
  _blink(a, d) { if (this._rm) return; a.blinkT = performance.now(); a.blinkDur = d || (a.n === 'arch' ? 240 : 140); }
  _react(a) {
    if (this._rm) return;
    const P = PERSONA[a.n];
    this._blink(a);
    const map = { big: 'big', wink: 'wink', happy: 'happy', serio: 'serio' };
    if (map[P.hover]) { a.fx = map[P.hover]; a.fxUntil = performance.now() + (P.hover === 'serio' ? 600 : 900); }
    if (P.hover === 'double') this._later(() => this._blink(a), 230);
    if (P.hover === 'slow') this._blink(a, 260);
  }
  _toLocal(a, ux, uy) {
    let X = ux * 12, Y = uy * 9.6;
    if (a.rot) { const r = -a.rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); const x2 = X * c - Y * s, y2 = X * s + Y * c; X = x2; Y = y2; }
    return [X / a.kk, Y / a.kk];
  }
  _engineInit() {
    const now = performance.now();
    this._ags = Array.prototype.map.call(document.querySelectorAll('.hg'), (el) => {
      const n = el.getAttribute('data-n'), P = PERSONA[n];
      const bx = parseFloat(el.getAttribute('data-bx')) || 0, by = parseFloat(el.getAttribute('data-by')) || 0;
      return {
        el: el, n: n, grp: el.getAttribute('data-grp'), gaze: el.querySelector('.hs-ag-gaze'), lids: el.querySelector('.hs-ag-lids'),
        rest: el.getAttribute('data-rest') || 'oval', bx: bx, by: by, ux: 0, uy: -1, rot: parseFloat(el.getAttribute('data-rot')) || 0, kk: parseFloat(el.getAttribute('data-kk')) || 1,
        gx: bx, gy: by, x: el.getAttribute('data-x'), fx: null, fxUntil: 0, held: 0, hx: 0, hy: 0, sx: bx, sy: by, sacT: 0,
        blinkAt: now + rnd(P.blink[0], P.blink[1]) * 1000, blinkT: -1, blinkDur: 140, cx: -9999, cy: -9999, ix: 0, iy: 0, idleUntil: 0
      };
    });
    this._eng = {
      ptr: null, hov: null, chip: null, chipFocus: false, modes: { hero: {}, glow: {}, auto: { coord: 'idle', arch: 'idle', leaf: 'idle', pill: 'idle', hex: 'idle', funnel: 'idle', square: 'idle' }, mem: { coord: 'sleep', arch: 'sleep', leaf: 'sleep', pill: 'sleep', hex: 'sleep', funnel: 'sleep', square: 'sleep' }, faq: { coord: 'idle' } }, force: {},
      vis: { hero: true, glow: false, auto: false, mem: false, faq: false }, dirty: true, idleBusy: {}, typeT: -1e9, scr: 0, upUntil: 0, pts: {}, inp: null, inR: null, caretKey: null
    };
    const E = this._eng;
    E.lift = 0;
    this._hagEls = {};
    document.querySelectorAll('.lp-hero-ags .lp-hag').forEach((g) => { this._hagEls[g.getAttribute('data-hag')] = g; });
    this._hgEls = {};
    this._ags.forEach((a) => { if (a.grp === 'hero') this._hgEls[a.n] = a.el; });
    this._shwEls = Array.prototype.map.call(document.querySelectorAll('.lp-hero-ags .lp-shw'), (g) => ({ el: g, a: g.getAttribute('data-a'), f: g.getAttribute('data-f'), on: false }));
    const chipOf = (c) => { const r = c.getBoundingClientRect(); return { ns: (c.getAttribute('data-ags') || '').split(' '), x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    this._onMove = (e) => {
      E.ptr = { x: e.clientX, y: e.clientY };
      const t = e.target;
      const hit = t && t.closest ? t.closest('[data-hn]') : null;
      const key = hit ? hit.getAttribute('data-hg') + ':' + hit.getAttribute('data-hn') : null;
      if (key !== (E.hov ? E.hov.g + ':' + E.hov.n : null)) {
        E.hov = hit ? { g: hit.getAttribute('data-hg'), n: hit.getAttribute('data-hn') } : null;
        if (E.hov && !(E.hov.g === 'hero' && this._hp && !this._hp.init)) this._ags.forEach((a) => { if (a.grp === E.hov.g && a.n === E.hov.n) this._react(a); });
      }
      const c = t && t.closest ? t.closest('.lp-hero [data-ags]') : null;
      if (c) E.chip = chipOf(c);
      else if (!E.chipFocus) E.chip = null;
    };
    this._onLeave = () => { E.ptr = null; E.hov = null; if (!E.chipFocus) E.chip = null; };
    this._onFocusIn = (e) => {
      const c = e.target && e.target.closest ? e.target.closest('.lp-hero [data-ags]') : null;
      if (c && e.target.matches && e.target.matches(':focus-visible')) { E.chipFocus = true; E.chip = chipOf(c); }
    };
    this._onFocusOut = () => { E.chipFocus = false; E.chip = null; };
    document.addEventListener('pointermove', this._onMove);
    document.documentElement.addEventListener('pointerleave', this._onLeave);
    document.addEventListener('focusin', this._onFocusIn);
    document.addEventListener('focusout', this._onFocusOut);
    this._tick = this._tick.bind(this);
    this._kick();
  }
  _kick() { if (!this._raf && this._eng && !document.hidden) { this._last = performance.now(); this._raf = requestAnimationFrame(this._tick); } }
  _heroPts() {
    const E = this._eng;
    const q = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    E.pts.send = q('.lp-hero .hs-send'); E.pts.field = q('.lp-hero .hs-field'); E.pts.cta = q('.lp-hero .lp-cta .hs-btn');
    const inp = document.querySelector('.lp-hero .hs-input');
    E.inp = inp; E.caretKey = null;
    if (inp) {
      E.inR = inp.getBoundingClientRect();
      const cs = window.getComputedStyle(inp);
      E.inFont = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; E.inLs = parseFloat(cs.letterSpacing) || 0;
    }
    const f = E.pts.field;
    this._ags.forEach((a) => {
      if (a.grp !== 'hero' || !f) return;
      const dx = f.x - a.cx, dy = f.y - a.cy, d = Math.hypot(dx, dy) || 1;
      a.ux = dx / d; a.uy = dy / d;
      const v = this._toLocal(a, a.ux * 0.9, a.uy * 0.9); a.bx = v[0]; a.by = v[1];
    });
  }
  _caretPt() {
    const E = this._eng, inp = E.inp, r = E.inR;
    if (!inp || !r) return null;
    const v = inp.value || '';
    let pos = v.length;
    if (document.activeElement === inp && inp.selectionEnd != null) pos = inp.selectionEnd;
    const key = v + '|' + pos + '|' + inp.scrollLeft;
    if (key !== E.caretKey) {
      if (!this._mctx) this._mctx = document.createElement('canvas').getContext('2d');
      this._mctx.font = E.inFont;
      const w = this._mctx.measureText(v.slice(0, pos)).width + pos * E.inLs;
      E.caretX = Math.max(r.left, Math.min(r.right - 2, r.left + w - inp.scrollLeft));
      E.caretKey = key;
    }
    return { x: E.caretX, y: r.top + r.height / 2 };
  }
  // where a hero agent looks during the choreography (null = not driven by the sequence)
  _heroAim(a, t) {
    const E = this._eng, hp = this._hp, Q = E.pts, tau = PERSONA[a.n].tau;
    const to = (px, py, w, tt) => { const dx = px - a.cx, dy = py - a.cy, d = Math.hypot(dx, dy) || 1; return [dx / d * w, dy / d * w, tt]; };
    const atAg = (n, w, tt) => { const b = this._agBy('hero', n); return b ? to(b.cx, b.cy, w, tt) : null; };
    if (hp) {
      const inv = hp.ags || [], j = inv.indexOf(a.n), el = t - hp.t0;
      if (hp.ph === 'read') { const c = this._caretPt(); if (c) return to(c.x, c.y, 0.95, tau + 30); }
      else if (hp.ph === 'expect' && Q.send) return to(Q.send.x, Q.send.y, 1, 110);
      else if (hp.ph === 'focus' && Q.field) return to(Q.field.x + 40, Q.field.y, 0.85, 170);
      else if (hp.ph === 'coord') {
        const byX = inv;
        if (a.n === 'coord') {
          if (el < HCALL0 - 160 || !byX.length) return [0, 0.1, 180];
          const k = Math.min(byX.length - 1, Math.floor((el - HCALL0 + 160) / HCALL));
          return atAg(byX[k], 0.95, 120);
        }
        const jx = byX.indexOf(a.n);
        if (jx >= 0) return el >= HCALL0 - 40 + jx * HCALL ? atAg('coord', 0.95, tau + 20) : (Q.field ? to(Q.field.x, Q.field.y, 0.7, 220) : null);
        return atAg('coord', 0.75, 260);
      } else if (hp.ph === 'present') {
        if (j >= 0) {
          if (inv.length > 1 && el > 2350 && el < 3250) {
            let sx = 0, sy = 0, c = 0;
            inv.forEach((m) => { if (m === a.n) return; const b = this._agBy('hero', m); if (b) { sx += b.cx; sy += b.cy; c += 1; } });
            if (c) return to(sx / c, sy / c, 0.9, 140);
          }
          return [0, 0.12, 200];
        }
        if (a.n === 'coord') {
          if (el < 1900) { let sx = 0, sy = 0, c = 0; inv.forEach((m) => { const b = this._agBy('hero', m); if (b) { sx += b.cx; sy += b.cy; c += 1; } }); if (c) return to(sx / c, sy / c, 0.85, 160); }
          return [0, 0.12, 220];
        }
        let best = null, bd = 1e9;
        inv.forEach((m) => { const b = this._agBy('hero', m); if (!b) return; const d = Math.hypot(b.cx - a.cx, b.cy - a.cy); if (d < bd) { bd = d; best = b; } });
        if (best) return to(best.cx, best.cy, 0.7, 280);
      } else if (hp.ph === 'cta' && Q.cta) return to(Q.cta.x, Q.cta.y, 1, tau + 70);
    }
    if (t < E.typeT + 1400) { const c = this._caretPt(); if (c) return to(c.x, c.y, 0.9, tau + 30); }
    return null;
  }
  _tick(t) {
    const E = this._eng;
    this._raf = 0;
    if (!E) return;
    const dt = Math.min(64, t - (this._last || t)); this._last = t;
    const any = E.vis.hero || E.vis.glow || E.vis.auto || E.vis.mem || E.vis.faq;
    if (!any || document.hidden) return;
    if (E.dirty) {
      this._ags.forEach((a) => { if (!E.vis[a.grp]) return; const r = a.lids.getBoundingClientRect(); a.cx = r.left + r.width / 2; a.cy = r.top + r.height / 2; });
      if (E.vis.hero) this._heroPts();
      E.dirty = false;
    }
    const attn = {};
    ['hero', 'glow', 'auto', 'mem', 'faq'].forEach((g) => {
      if (!E.vis[g]) return;
      if (E.hov && E.hov.g === g) { attn[g] = E.hov.n; return; }
      if (g === 'hero' && E.chip) return;
      if (!E.ptr || this._rm) return;
      let best = R_GRP[g], who = null;
      this._ags.forEach((a) => {
        if (a.grp !== g) return;
        const md = E.modes[g][a.n];
        if (md === 'sleep' || md === 'attend' || md === 'medit') return;
        const d = Math.hypot(E.ptr.x - a.cx, E.ptr.y - a.cy);
        if (d < best) { best = d; who = a.n; }
      });
      attn[g] = who;
    });
    if (E.vis.hero) this._motionTick(t);
    if (E.vis.glow) this._stripeTick(t);
    if (E.vis.mem) { this._m3Tick(t); this._m3XTick(t); this._m3NetTick(t, dt); }
    if (E.vis.auto) this._sxTick(t);
    const scrolled = E.scr > 0.02 || t < E.upUntil;
    this._ags.forEach((a) => {
      if (!E.vis[a.grp]) return;
      const P = PERSONA[a.n], md = E.modes[a.grp][a.n] || 'idle', f = E.force[a.grp], hero = a.grp === 'hero';
      const MS = hero ? this._mv[a.n] : (a.grp === 'glow' ? this._smv[a.n] : (a.grp === 'mem' ? this._mmv[a.n] : (a.grp === 'auto' ? this._amv[a.n] : null)));
      let tx = a.bx, ty = a.by, tau = P.tau, aim = null;
      const hovMe = !!(E.hov && E.hov.g === a.grp && E.hov.n === a.n);
      const look = (px, py, w) => { const dx = px - a.cx, dy = py - a.cy, d = Math.hypot(dx, dy) || 1; const v = this._toLocal(a, dx / d * w, dy / d * w); tx = v[0]; ty = v[1]; a.held = t + 400; a.hx = tx; a.hy = ty; };
      if (this._rm) { tx = a.bx; ty = a.by; }
      else if (md === 'sleep' || md === 'medit') { tx = 0; ty = 0; tau = 320; }
      else if (md === 'attend') { const v = this._toLocal(a, 0, 0.15); tx = v[0]; ty = v[1]; tau = 140; }
      else if (f && t < f.until) { const v = this._toLocal(a, f.x, f.y); tx = v[0]; ty = v[1]; tau = 150; }
      else if (MS && MS.v && MS.v.lk > 0.5) { const V = MS.v, w = this._toLocal(a, V.lx, V.ly); tx = w[0]; ty = w[1]; tau = 45; a.held = 0; }
      else if (hero && (aim = this._heroAim(a, t))) { const v = this._toLocal(a, aim[0], aim[1]); tx = v[0]; ty = v[1]; tau = aim[2]; a.held = 0; }
      else if (hovMe && E.ptr) { look(E.ptr.x, E.ptr.y, 1); }
      else if (hero && scrolled) {
        const up = t < E.upUntil, sc = Math.min(1, E.scr / 0.45);
        const v = this._toLocal(a, up ? a.ux * 0.2 : a.ux * 0.35 * (1 - sc), up ? -0.85 : 0.55 + 0.45 * sc);
        tx = v[0]; ty = v[1]; tau = up ? 140 : 210; a.held = 0;
      }
      else if (hero && E.chip && E.chip.ns.indexOf(a.n) >= 0) { look(E.chip.x, E.chip.y, 1); }
      else if (attn[a.grp] === a.n && E.ptr) {
        const d = Math.hypot(E.ptr.x - a.cx, E.ptr.y - a.cy) || 1;
        look(E.ptr.x, E.ptr.y, Math.min(1, 1.35 * (1 - Math.pow(d / R_GRP[a.grp], 2)) + 0.25));
      } else if (t < a.held) { tx = a.hx; ty = a.hy; }
      else {
        if (t > a.idleUntil) {
          a.ix = 0; a.iy = 0;
          if (!(E.idleBusy[a.grp] > t) && Math.random() < 0.0022) {
            a.ix = rnd(-5, 5); a.iy = rnd(-2.5, 2.5); a.idleUntil = t + rnd(1400, 2600); E.idleBusy[a.grp] = a.idleUntil + rnd(4000, 8000);
          }
        }
        tx = a.bx + a.ix; ty = a.by + a.iy; tau = 230;
      }
      if (P.sac && !this._rm && md !== 'sleep' && md !== 'medit') { if (t > a.sacT) { a.sx = tx; a.sy = ty; a.sacT = t + P.sac; } tx = a.sx; ty = a.sy; tau = 40; }
      const k = 1 - Math.exp(-dt / tau);
      a.gx += (tx - a.gx) * k; a.gy += (ty - a.gy) * k;
      // face turn (A6 · Motion 07): the eyes slide to the silhouette's edge, flatten, pass the back and return by the other side
      let ox = 0, oy = 0; a.tsx = 1; a.tsy = 1; a.tcl = 0;
      const V = MS ? MS.v : null;
      if (V) {
        const R = HTURN[a.n];
        if (V.et) { const q = V.et * Math.PI / 180, sn = Math.sin(q); ox = (sn > 0 ? R[1] : R[0]) * sn; a.tsx = Math.max(0, Math.cos(q)); }
        if (V.ev) { const q = V.ev * Math.PI / 180, sn = Math.sin(q); oy = -(sn > 0 ? R[2] : R[3]) * sn; a.tsy = Math.max(0, Math.cos(q)); }
        a.tcl = V.ec || 0;
      }
      const gs = 'translate(' + (a.gx + ox).toFixed(2) + ' ' + (a.gy + oy).toFixed(2) + ')';
      if (gs !== a.gs) { a.gs = gs; a.gaze.setAttribute('transform', gs); }
      // concentration (R17): eyes closed, still; a flash (a piece absorbed) may show briefly
      let x = (md === 'sleep' || md === 'medit') ? 'sleep' : (md === 'attend' ? 'big' : a.rest);
      if (hero && this._hx && this._hx[a.n] && md !== 'attend') x = this._hx[a.n];
      if (a.fx && t < a.fxUntil && md !== 'sleep') x = a.fx;
      if (x !== a.x) { a.el.setAttribute('data-x', x); a.x = x; }
      if (!this._rm && md !== 'sleep' && md !== 'medit' && t > a.blinkAt) { this._blink(a); a.blinkAt = t + rnd(P.blink[0], P.blink[1]) * 1000; }
      let sY = 1;
      if (a.blinkT >= 0) {
        const q = (t - a.blinkT) / a.blinkDur;
        if (q >= 1) a.blinkT = -1; else sY = q < 0.5 ? 1 - 0.88 * (q / 0.5) : 0.12 + 0.88 * ((q - 0.5) / 0.5);
      }
      if (a.tcl) sY = Math.min(sY, 1 - 0.88 * a.tcl);
      const lsx = a.tsx == null ? 1 : a.tsx, lsy = (a.tsy == null ? 1 : a.tsy) * sY;
      const ls = (lsx === 1 && lsy === 1) ? '' : 'scale(' + lsx.toFixed(3) + ',' + lsy.toFixed(3) + ')';
      if (ls !== a.ls) { a.ls = ls; a.lids.style.transform = ls; }
    });
    this._raf = requestAnimationFrame(this._tick);
  }

  // ------------------------------------------------------------ lifecycle
  componentDidMount() {
    this._rm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    try { const sv = window.sessionStorage.getItem('hs-landing-pedido'); if (sv) this.setState({ saved: sv }); } catch (e) { }
    const root = document.querySelector('.lp');
    const hasIO = 'IntersectionObserver' in window;
    if (root && hasIO && !this._rm) root.classList.add('is-rv');
    if (hasIO) {
      this._io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); this._io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      document.querySelectorAll('.rv').forEach((el) => this._io.observe(el));
      this._io2 = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) { this._io2.unobserve(e.target); this._onSec(e.target.getAttribute('data-sec')); } }); }, { threshold: 0.3 });
      document.querySelectorAll('[data-sec]').forEach((el) => this._io2.observe(el));
      // the autonomy board tells its story in order once its top reaches the reading zone, not when its edge peeks in
      this._io5 = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-deep'); this._io5.unobserve(e.target);
          if (e.target.classList.contains('lp-res')) { this._resArmed = true; this._resRun(); this._ctLater('_resv', () => e.target.classList.add('is-settled'), 3600); }
        });
      }, { threshold: 0, rootMargin: '0px 0px -38% 0px' });
      document.querySelectorAll('.lp-res').forEach((el) => this._io5.observe(el));
      this._io6 = new IntersectionObserver((es) => {
        es.forEach((e) => {
          const k = e.target.getAttribute('data-vis');
          this._vis[k] = e.isIntersecting;
          if (e.isIntersecting && this._whenVis[k]) { const f = this._whenVis[k]; this._whenVis[k] = null; f(); }
          if (k === 'sx') {
            this._sxSync();
            if (e.isIntersecting && !this._sxSeen) { this._sxSeen = true; this._sxEnter(this.state.sxStep); }
          }
          if (k === 'm3') this._m3Vis(e.isIntersecting);
        });
      }, { threshold: 0.3 });
      [['demo', '.lp-demo-win'], ['res', '.lp-rchat'], ['sx', '.lp-sx-vis'], ['m3', '.lp-m3-stage']].forEach((p) => { const el = document.querySelector(p[1]); if (el) { el.setAttribute('data-vis', p[0]); this._io6.observe(el); } });
      // R24 · replay rule for the last folds: a section that has fully left the screen starts over when it comes back
      this._ioR = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (e.isIntersecting) return;
          if (e.target.id === 'resultados' && this._resArmed) this._resReset();
          if (e.target.id === 'porque') this._rvRearm('#porque');
        });
      }, { threshold: 0 });
      ['#resultados', '#porque'].forEach((s) => { const el = document.querySelector(s); if (el) this._ioR.observe(el); });
      // the closing (A9): plays once when half of it is in view; back to its first frame once it has fully left
      this._ioA9 = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (e.intersectionRatio >= 0.5 && !this._a9On) this._a9Play();
          else if (!e.isIntersecting && this._a9On) this._a9Reset();
        });
      }, { threshold: [0, 0.5] });
      const a9 = document.querySelector('.lp-a9'); if (a9) this._ioA9.observe(a9);
    } else {
      ['demo', 'squad', 'close'].forEach((n) => this._onSec(n));
      this._later(() => this._a9Play(), 0);
      this._autoActivate();
      this._resRun();
      this._vis.m3 = true; this._later(() => this._m3Vis(true), 0);
    }
    const inFrame = (window.innerHeight || 0) > 1400;
    this._onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0, H = this.state.hL.H;
      const on = y > H - 140;
      if (on !== this.state.hdr) this.setState({ hdr: on });
      const E = this._eng;
      if (E) {
        E.dirty = true;
        if (!inFrame) { const f = Math.min(1, y / H); if (y < (this._lastSY || 0) - 2 && f < 1) E.upUntil = performance.now() + 450; E.scr = f; }
      }
      this._lastSY = y;
    };
    this._onResize = () => {
      if (this._eng) this._eng.dirty = true;
      if (this._rzT) clearTimeout(this._rzT);
      this._rzT = setTimeout(() => { this._heroLayout(); this._bandInit(); }, 140);
    };
    this._onVis = () => { if (!document.hidden) { this._kick(); if (this._apWait && this._heroVis !== false) { this._apWait = false; this._apNext(); } } };
    // leaving the hero field empty resumes the suggestions right away
    this._onApBlur = (e) => { const t = e.target; if (t && t.classList && t.classList.contains('hs-input') && t.closest('.lp-hero') && this._apUser) this._apResume(); };
    document.addEventListener('focusout', this._onApBlur, true);
    // while the request is being handed over the field is read-only; a space there must not scroll the page
    this._onKeyRO = (e) => { const t = e.target; if ((e.key === ' ' || e.key === 'Spacebar') && t && t.readOnly && t.classList && t.classList.contains('hs-input') && t.closest('.lp-hero')) e.preventDefault(); };
    document.addEventListener('keydown', this._onKeyRO, true);
    window.addEventListener('scroll', this._onScroll, { passive: true });
    this._onSxScroll = () => { if (!this._sxRaf) this._sxRaf = requestAnimationFrame(() => this._sxScan()); };
    this._onSxResize = () => { this._sxSize(); this._onSxScroll(); };
    window.addEventListener('scroll', this._onSxScroll, { passive: true });
    window.addEventListener('resize', this._onSxResize);
    this._onAuScroll = () => { if (!this._auRaf) this._auRaf = requestAnimationFrame(() => this._autoScan()); };
    window.addEventListener('scroll', this._onAuScroll, { passive: true });
    window.addEventListener('resize', this._onAuScroll);
    this._onAuScroll();
    this._onSxResize();
    this._m3 = { cur: null, tgt: 'coord', busy: false, queued: false, tLast: 0, ptr: {}, slot: 0 };
    this._m3An = new Set();
    this._m3Known = new Set(M3_KNOWN0);
    this._onM3Scroll = () => { if (!this._m3Raf) this._m3Raf = requestAnimationFrame(() => this._m3Scan()); };
    this._onM3Resize = () => { this._m3Size(); this._onM3Scroll(); this._m3NetLayout(); this._a9Relayout(); };
    const a9init = () => { if (this._a9Layout()) this._a9Render(this._rm ? this._a9End() : (this._a9On ? (this._a9Now || 0) : 0)); };
    a9init();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (this._a9E && this._a9E.L) this._a9Relayout(); else a9init(); });
    window.addEventListener('scroll', this._onM3Scroll, { passive: true });
    window.addEventListener('resize', this._onM3Resize);
    this._m3Size();
    this._onKeyM3 = (e) => { if (e.key === 'Escape' && this.state.m3Open) { this.setState({ m3Open: false }); const bt = document.querySelector('.lp-m3-shelf'); if (bt) bt.focus({ preventScroll: true }); } };
    document.addEventListener('keydown', this._onKeyM3);
    window.addEventListener('resize', this._onResize);
    document.addEventListener('visibilitychange', this._onVis);
    this._engineInit();
    if (hasIO) {
      const groups = [['hero', '.lp-hero'], ['glow', '.lp-stripes'], ['auto', '.lp-sx-vis'], ['mem', '.lp-m3-stage'], ['faq', '.lp-faq']];
      this._io3 = new IntersectionObserver((es) => {
        es.forEach((e) => {
          const g = e.target.getAttribute('data-eng');
          this._eng.vis[g] = e.isIntersecting; this._eng.dirty = true;
          if (g === 'hero') { this._bandHold('off', !e.isIntersecting); this._apVis(e.isIntersecting); }
          if (g === 'glow') this._sqVisible = e.isIntersecting;
        });
        this._kick();
      });
      groups.forEach((p) => { const el = document.querySelector(p[1]); if (el) { el.setAttribute('data-eng', p[0]); this._io3.observe(el); } });
    } else { this._eng.vis = { hero: true, glow: true, auto: true, mem: true, faq: true }; this._sqVisible = true; }
    // hero R5: size the first fold to the visible viewport, then start the band
    const heroEl = document.querySelector('.lp-hero');
    if (inFrame && hasIO) {
      let done = false;
      const io = new IntersectionObserver((es) => {
        const e = es[es.length - 1]; io.disconnect();
        if (done) return; done = true;
        const v = e && e.intersectionRect ? e.intersectionRect.height : 0;
        if (v > 300 && v < window.innerHeight - 1) this._frameVH = v;
        this._heroLayout();
      });
      io.observe(document.querySelector('.lp') || document.body);
      this._later(() => { if (!done) { done = true; io.disconnect(); this._heroLayout(); } }, 500);
      if (heroEl) {
        const th = []; for (let i = 0; i <= 50; i += 1) th.push(i / 50);
        this._io4 = new IntersectionObserver((es) => {
          const e = es[es.length - 1], E = this._eng; if (!E) return;
          const H = Math.min(this.state.hL.H, this._frameVH || this.state.hL.H);
          const f = Math.max(0, Math.min(1, 1 - e.intersectionRect.height / H));
          if (f < E.scr - 0.004) E.upUntil = performance.now() + 450;
          E.scr = f; this._kick();
        }, { threshold: th });
        this._io4.observe(heroEl);
      }
    } else this._heroLayout();
    this._bandInit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (this._eng) { this._heroLayout(); this._bandInit(); } });
    this._typeHero();
  }
  _onSec(n) {
    if (n === 'demo') {
      this._later(() => { if (!this.state.demoTouched) this._demoStart('squad', 120); }, 300);
    } else if (n === 'squad') { this._later(() => this._sqSig(this.state.sq), 500); this._cycleSquad(); }
    else if (n === 'close') { this.setState({ m3: true }); }
  }
  componentDidUpdate() {
    const c = this.state.cv[this.state.conv];
    const sig = this.state.conv + ':' + c.msgs.length + ':' + (c.typing || '') + ':' + (c.choices ? 1 : 0) + (c.actions ? 1 : 0) + (c.approval ? 1 : 0);
    if (sig !== this._chatSig) {
      this._chatSig = sig;
      const el = document.querySelector('.lp-scroll');
      if (el) this._later(() => { el.scrollTop = el.scrollHeight; }, 30);
    }
    const st = this.state, rsig = st.resMsgs.length + ':' + (st.resTyping || '') + ':' + (st.resAppr ? 1 : 0) + (st.resDone ? 1 : 0);
    if (rsig !== this._resSig) {
      this._resSig = rsig;
      const rs = document.querySelector('.lp-rc-scroll');
      if (rs) this._later(() => { if (rs.scrollTo) rs.scrollTo({ top: rs.scrollHeight, behavior: this._rm ? 'auto' : 'smooth' }); else rs.scrollTop = rs.scrollHeight; }, 40);
    }
  }
  componentWillUnmount() {
    this._timers.forEach(clearTimeout); this._intervals.forEach(clearInterval); this._hClear();
    if (this._rzT) clearTimeout(this._rzT);
    if (this._fitRaf) cancelAnimationFrame(this._fitRaf);
    if (this._bRaf) cancelAnimationFrame(this._bRaf);
    if (this._io4) this._io4.disconnect();
    Object.keys(this._ct).forEach((k) => this._ctClear(k));
    if (this._weekT) clearTimeout(this._weekT);
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._rcAnim) { try { this._rcAnim.cancel(); } catch (e) { } }
    if (this._c5Raf) cancelAnimationFrame(this._c5Raf); this._c5Tok = (this._c5Tok || 0) + 1;
    [this._io, this._io2, this._io3, this._io4, this._io5, this._io6].forEach((o) => { if (o) o.disconnect(); });
    window.removeEventListener('scroll', this._onScroll); window.removeEventListener('resize', this._onResize);
    window.removeEventListener('scroll', this._onSxScroll); window.removeEventListener('resize', this._onSxResize);
    window.removeEventListener('scroll', this._onAuScroll); window.removeEventListener('resize', this._onAuScroll); if (this._auRaf) cancelAnimationFrame(this._auRaf);
    window.removeEventListener('scroll', this._onM3Scroll); window.removeEventListener('resize', this._onM3Resize);
    document.removeEventListener('keydown', this._onKeyM3);
    if (this._m3Raf) cancelAnimationFrame(this._m3Raf);
    document.querySelectorAll('.lp-m3-flow > *, .lp-m3-netw > *').forEach((c) => { c.getAnimations && c.getAnimations().forEach((x) => x.cancel()); c.remove(); });
    if (this._m3RO) this._m3RO.disconnect();
    if (this._faqStop) this._faqStop();
    if (this._a9Raf) cancelAnimationFrame(this._a9Raf);
    [this._ioR, this._ioA9].forEach((o) => { if (o) o.disconnect(); });
    this._m3N = null; this._m3A = null;
    if (this._sxRaf) cancelAnimationFrame(this._sxRaf);
    document.removeEventListener('visibilitychange', this._onVis);
    document.removeEventListener('focusout', this._onApBlur, true); this._apClear(); if (this._apIdleT) clearTimeout(this._apIdleT); this._apOn = false;
    if (this._onKeyRO) document.removeEventListener('keydown', this._onKeyRO, true);
    if (this._onMove) {
      document.removeEventListener('pointermove', this._onMove); document.documentElement.removeEventListener('pointerleave', this._onLeave);
      document.removeEventListener('focusin', this._onFocusIn); document.removeEventListener('focusout', this._onFocusOut);
    }
    this._eng = null;
  }

  // ------------------------------------------------------------ view model
  renderVals() {
    const s = this.state;
    const HS = window.HelloSquad;
    const h = React.createElement;

    // hero
    const L = s.hL, G = this._heroGeo(), hph = s.heroPhase;
    // status relay: one pill in one place; the responsible party moves in and out of it
    const R = s.relay, rmm = s.heroSlot === 'status' ? R.m : 0, rags = R.ags || [];
    const TX = {
      1: { b: 'Pedido recebido', d: '' },
      2: { b: 'Nexo', d: 'está montando seu squad' },
      3: { b: rags.length ? hNames(rags) : '', d: rags.length > 1 ? 'estão a postos' : 'está a postos' }
    };
    const tw = (str, wt) => { if (!str) return 0; if (!this._mtx) this._mtx = document.createElement('canvas').getContext('2d'); this._mtx.font = wt + " 15px " + __hsCanvasFont(); return this._mtx.measureText(str).width; };
    const PADL = 7, AV = 28, STEP = 17, headW = (m) => (m === 2 ? AV : (m === 3 ? AV + Math.max(0, rags.length - 1) * STEP : 0));
    const dotsOn = (m) => m === 1 || m === 2;
    const textX = (m) => PADL + (headW(m) ? headW(m) + 9 : 9) + (dotsOn(m) ? 29 : 0);
    const textW = (m) => Math.ceil(tw(TX[m].b, 600) + (TX[m].d ? 5 + tw(TX[m].d, 500) : 0)) + 4;
    const pillW = (m) => (m ? textX(m) + textW(m) + 20 : 46);
    const RW = pillW(rmm), x0 = -RW / 2;
    const avs = HORDER.slice().sort((p, q) => ORDER.indexOf(p) - ORDER.indexOf(q)).map((n) => {
      let x = x0 + PADL + AV / 2, sc = 0.4, op = 0, z = 1, dl = 0, ex = 'oval', th = false;
      const j = rags.indexOf(n);
      if (n === 'coord' && j < 0) {
        if (rmm === 2) { sc = 1; op = 1; z = 3; th = true; dl = 260; }
        else if (rmm === 3) { x = x0 - 8 - 12; sc = 0.86; op = 1; z = 2; dl = 300; }
      } else if (j >= 0) {
        if (rmm === 2) { x = RW / 2 + 8 + 12 + j * 26; if (j < R.called) { sc = 0.86; op = 1; } else { sc = 0.4; } dl = 0; }
        else if (rmm === 3) { x = x0 + PADL + AV / 2 + j * STEP; sc = 1; op = 1; z = 10 - j; dl = 260 + j * 110; ex = 'happy'; }
      }
      return { a: n, x: ex, th: th, st: 'transform: translate(' + x.toFixed(1) + 'px, 0px) scale(' + sc + '); opacity: ' + op + '; z-index: ' + z + '; transition-delay: ' + dl + 'ms, ' + dl + 'ms' };
    });
    const layer = (m) => ({ b: TX[m].b, d: TX[m].d, cls: 'lp-rl-t ' + (rmm === m ? 'is-on' : (rmm > m ? 'is-past' : 'is-next')), st: 'left: ' + textX(m) + 'px; --td: ' + [0, 380, 460, 820][m] + 'ms' });
    const rl = {
      pillCls: 'lp-rl-pill' + (rmm ? ' is-on' : ''), pillSt: 'width: ' + RW.toFixed(0) + 'px',
      dotsCls: 'lp-rl-dots' + (dotsOn(rmm) ? ' is-on' : '') + (rmm === 2 ? ' is-coord' : ''), dotsSt: 'left: ' + (PADL + (headW(rmm) ? headW(rmm) + 9 : 9)) + 'px',
      t1: layer(1), t2: layer(2), t3: layer(3), avs: avs,
      sr: rmm ? (TX[rmm].b + (TX[rmm].d ? ' ' + TX[rmm].d : '') + '.') : ''
    };
    // CTA lap: the button's real outline (a stadium), inset half a stroke
    const cw = L.cw, ch = L.ch, ins = 0.75, rr = (ch - 2 * ins) / 2;
    const tr = {
      w: cw, h: ch,
      d: 'M' + (cw / 2).toFixed(2) + ' ' + ins + ' H' + (cw - ins - rr).toFixed(2) + ' A' + rr.toFixed(2) + ' ' + rr.toFixed(2) + ' 0 0 1 ' + (cw - ins - rr).toFixed(2) + ' ' + (ch - ins).toFixed(2) +
        ' H' + (ins + rr).toFixed(2) + ' A' + rr.toFixed(2) + ' ' + rr.toFixed(2) + ' 0 0 1 ' + (ins + rr).toFixed(2) + ' ' + ins + ' Z'
    };
    const hero = {
      secCls: 'lp-hero' + (L.ok ? ' is-sized' : '') + (hph ? ' is-ph-' + hph : '') + (s.heroSlot === 'status' ? ' is-status' : ''),
      secSt: 'height: ' + L.H + 'px; --hh: ' + L.H + 'px; --k: ' + L.k.toFixed(3),
      g: { w: G.w, h: G.h, t: G.t, sh: G.sh },
      chips: HCHIPS.map((c, i) => ({
        cls: 'hs-chip lp-sqchip' + (c.ags.length > 1 ? ' is-multi' : '') + (s.chipSel === i ? ' is-sel' : ''),
        ags: c.ags.join(' '), title: c.ags.map((n) => NR(n)).join(', '), text: c.text,
        minis: c.ags.map((a) => ({ a: a, ol: c.ags.length > 1 })),
        pick: () => this._heroPick(i)
      })),
      bandEnter: () => this._bandHold('hover', true), bandLeave: () => this._bandHold('hover', false),
      bandFocus: (e) => { const t = e.target; if (t && t.matches && t.matches(':focus-visible')) { this._bandHold('kbd', true); this._bandReveal(t); } },
      bandBlur: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) this._bandHold('kbd', false); },
      rl: rl, tr: tr,
      ctaCls: 'lp-cta' + (s.ctaLive ? ' is-live' : ''),
      onPrompt: (v) => {
        if (this._hTyping) this._heroCancel();
        if (this._hp && this._hp.init) this._hp = null;
        if (this._eng) this._eng.typeT = performance.now();
        const sel = this.state.chipSel;
        this.setState({ prompt: v, heroTouched: true, chipSel: sel >= 0 && HCHIPS[sel].text === v ? sel : -1 });
        this._apUserEdit(v);
      },
      onSend: (v) => this._heroSubmit(v)
    };

    // demo
    const cur = s.cv[s.conv], def = CONVS[s.conv];
    const convList = CONV_ORDER.map((id) => {
      const c = s.cv[id], d = CONVS[id];
      const last = c.msgs[c.msgs.length - 1];
      const working = c.status && c.status.kind === 'work';
      return {
        cls: 'lp-cv' + (d.kind === 'squad' ? ' is-squad' : '') + (id === s.conv ? ' is-on' : ''), sel: id === s.conv ? 'true' : 'false', pick: () => this._pickConv(id),
        isSquad: d.kind === 'squad', isAgent: d.kind !== 'squad', agent: d.ag || 'coord',
        expr: c.status && c.status.kind === 'wait' ? 'big' : (c.status && c.status.kind === 'done' ? 'happy' : 'oval'), thinking: !!working,
        name: d.kind === 'squad' ? 'Sala do Squad' : NAME[d.ag], role: d.kind === 'squad' ? '' : ' · ' + ROLE[d.ag], time: last ? last.time : '',
        preview: c.typing ? NAME[c.typing] + ' está escrevendo' : (last ? (last.user ? 'Você: ' + last.text : (last.text || '')) : d.preview)
      };
    });
    const msgs = cur.msgs.map((m) => {
      const card = m.card || {};
      const o = {
        k: m.k, text: m.text || '', time: m.time, isUser: !!m.user, isNote: !!m.note, isAgent: !m.user && !m.note,
        ag: m.ag || 'coord', name: m.ag ? NR(m.ag) : '', co: m.co ? 'com ' + m.co : '',
        isConcept: card.type === 'concept', isPieces: card.type === 'pieces', v1: card.v === 1, v2: card.v === 2,
        isToday: card.type === 'today', isOpps: card.type === 'opps', isDirs: card.type === 'dirs', isCal: card.type === 'cal',
        isPlan: card.type === 'plan', isJourney: card.type === 'journey', isKpis: card.type === 'kpis'
      };
      return o;
    });
    const today = {
      needs: CARD.today.needs.map((n) => {
        const done = n.act === 'Confirmar' && cur.confirmed;
        return Object.assign({}, n, {
          label: done ? 'Confirmado' : n.act, cls: 'lp-minibtn' + (done ? ' is-done' : ''),
          go: () => { if (n.go) this._pickConv(n.go); else this._patchConv('coord', { confirmed: true }); }
        });
      }),
      running: CARD.today.running
    };
    const opps = CARD.opps.map((o) => ({ n: o.n, t: o.t, why: o.why, imp: [1, 2, 3].map((i) => ({ c: i <= o.imp ? 'on' : '' })), eff: [1, 2, 3].map((i) => ({ c: i <= o.eff ? 'on' : '' })) }));
    const dirs = CARD.dirs.map((d, i) => ({
      name: d.name, words: d.words, pal: d.pal.map((c) => ({ c: c })), art: 'background: ' + d.bg + '; color: ' + d.fg,
      cls: 'lp-dir' + (s.cv.leaf.dir === i ? ' is-on' : ''), pressed: s.cv.leaf.dir === i ? 'true' : 'false', pick: () => this._patchConv('leaf', { dir: i })
    }));
    const ap = cur.approval ? APPROVALS[cur.approval] : null;
    const approval = ap ? {
      ag: ap.ag, text: ap.text, facts: ap.facts, approveLabel: ap.approveLabel,
      onApprove: () => this._decide(s.conv, 'yes'), onAdjust: ap.adj ? () => this._decide(s.conv, 'adj') : null, onDismiss: () => this._decide(s.conv, 'no')
    } : null;
    const mkActs = (arr) => (arr ? arr.map((a) => ({ label: a.label, variant: a.variant || 'soft', go: () => this._choose(s.conv, a) })) : null);
    const st = cur.status || {};
    const steps = cur.work.steps.map((x) => ({
      cls: 'lp-step' + (x.st === 'todo' ? ' is-todo' : ''), label: x.st === 'done' ? x.done : x.label,
      done: x.st === 'done', todo: x.st === 'todo', work: x.st === 'work', you: !!x.you,
      ags: x.ags.map((a) => ({ a: a, x: x.st === 'done' ? 'happy' : 'oval', th: x.st === 'work' })),
      ckStyle: 'background: ' + (x.you ? '#0F0D22' : COLOR[x.ags[0]]) + '; color: ' + (x.you ? '#F7F7F5' : '#0F0D22')
    }));
    const demo = {
      convList: convList, msgs: msgs, title: def.kind === 'squad' ? 'Sala do Squad' : def.title, sub: def.sub,
      isSquad: def.kind === 'squad', isAgent: def.kind !== 'squad', ag: def.ag || 'coord',
      typing: cur.typing ? { ag: cur.typing, text: NAME[cur.typing] + ' está escrevendo' } : null,
      choices: cur.choices ? cur.choices.map((c) => ({ label: c.label, go: () => this._choose(s.conv, c) })) : null,
      actions: mkActs(cur.actions), approval: approval,
      input: cur.input, sending: !!cur.sending, hint: !cur.started,
      onInput: (v) => { const id = s.conv; this.setState({ demoTouched: true }); this._patchConv(id, { input: v }); },
      onSend: (v) => {
        // the guided story continues when its own request is sent; anything the visitor writes takes over
        if (String(v || '').trim() !== CONVS[s.conv].prompt) this._demoStop();
        this.setState({ demoTouched: true }); this._send(s.conv, v);
      },
      reset: () => this._demoStart(s.conv, 400),
      panelOpen: s.demoPanel ? 'true' : 'false', panelHidden: s.demoPanel ? 'false' : 'true',
      panelBtnCls: 'lp-ptog' + (s.demoPanel ? ' is-on' : ''),
      panelLabel: (s.demoPanel ? 'Ocultar ' : 'Mostrar ') + (def.kind === 'squad' ? 'o trabalho' : 'a memória usada'),
      togglePanel: () => this.setState((st) => ({ demoPanel: !st.demoPanel })),
      st: { kind: st.kind || 'idle', lead: st.lead || null, message: st.message || '', detail: st.detail || '', collaborators: st.collaborators || null, time: st.time || null, actionLabel: st.actionLabel || null, onAction: () => { const el = document.querySelector('.lp-scroll'); if (el) el.scrollTop = el.scrollHeight; } },
      work: { none: !cur.work.has, has: !!cur.work.has, live: !!cur.work.live, steps: steps },
      mem: (() => {
        const rows = (def.ctx || []).map(memRow), main = rows.filter((r) => r.src !== 'auto'), learned = rows.filter((r) => r.src === 'auto');
        return { main: main, learned: learned, hasLearned: learned.length > 0, count: rows.length + ' itens', who: def.ag ? 'O que ' + ART[def.ag] + ' ' + NAME[def.ag] + ' consulta neste pedido' : '' };
      })(),
      today: today, opps: opps, dirs: dirs, cal: CARD.cal, plan: CARD.plan.map((f) => ({ k: f[0], v: f[1] })), journey: CARD.journey, kpis: CARD.kpis,
      goResults: () => this._scrollTo('resultados')
    };

    // conheça
    const sel = s.sq;
    const stripes = {}, labels = {}, hello = {};
    ORDER.forEach((n) => {
      stripes[n] = { cls: 'lp-stripe' + (n === sel ? ' is-on' : '') + (n === 'arch' || n === 'square' ? ' is-light-text' : ''), pressed: n === sel ? 'true' : 'false', pick: () => this._pickAg(n) };
      labels[n] = 'lp-stripe-l' + (n === sel ? ' is-on' : '');
      hello[n] = 'lp-hello-ag' + (n === sel ? ' is-on' : (n === s.helloPrev ? ' is-out' : ''));
    });
    const manif = {};
    ORDER.forEach((n) => { manif[n] = () => this._talkTo(n); });
    const squad = { stripes: stripes, labels: labels, hello: hello, enter: () => this.setState({ sqHover: true }), leave: () => this.setState({ sqHover: false }) };

    // autonomy (R18): the title is static; the switch plays C5 once on arrival; the visitor can switch it off and on
    const auto = { wordCls: 'lp-sw-word' + (s.autoVis ? '' : ' is-off'), onStr: s.autoOn ? 'true' : 'false', toggle: () => this._autoToggle() };
    // modo autônomo · scrollytelling (R18 → R31): one scene, five routines; the cycle phase only matters at step 3
    const XR = this._sxR(), rn = XR.ph.length, sst = s.sxStep, sph = sst >= 4 ? rn : (sst === 3 ? Math.min(s.sxPh, rn) : 0);
    const T = SX_RM[s.sxTxt] || XR;
    const scs = {}, sxx = {};
    SX_R.forEach((q) => {
      const cur = q.id === XR.id, prv = !cur && q.id === s.sxPrev;
      const st = cur ? sst : (prv ? s.sxPrevSt : 0), ph = cur ? sph : (prv ? s.sxPrevPh : 0);
      scs[q.id] = { on: cur ? 'true' : (prv ? 'out' : 'false'), st: String(st), ph: String(ph), cls: 'sx-sc' + (q.k ? ' is-k' : '') + (cur && s.sxCut ? ' is-cut' : '') };
      sxx[q.id] = this._sxX(q.id, st, ph);
    });
    const ags = ['coord'].concat(XR.sp), on = {}, ast = {}, busy = {};
    ORDER.forEach((a) => {
      const i = ags.indexOf(a);
      const x2 = i <= 0 ? 50 : SX_X2[XR.sp.length][i - 1], x3 = i < 0 ? 50 : 50 + (i - (ags.length - 1) / 2) * 11;
      on[a] = i >= 0 ? 'true' : 'false';
      busy[a] = 'false';
      ast[a] = '--c: ' + COLOR[a] + '; --x2: ' + x2 + '%; --x3: ' + x3 + '%; --d2: ' + (i > 0 ? 140 + (i - 1) * 120 : 0) + 'ms; --dg: ' + (i > 0 ? 900 + (i - 1) * 140 : 0) + 'ms';
    });
    if (sst === 3 && XR.busy[sph]) XR.busy[sph].forEach((a) => { busy[a] = 'true'; });
    const chip = {};
    SX_R.forEach((q) => { chip[q.id] = { cls: 'lp-sx-chip' + (q.id === XR.id ? ' is-on' : ''), pressed: q.id === XR.id ? 'true' : 'false', pick: () => this._sxPick(q.id) }; });
    const dec = s.sxDec;
    const igr = {
      on: XR.id === 'ig' && sst >= 4 ? 'true' : 'false', dec: dec || 'rev',
      title: dec === 'ok' ? '3 posts programados' : (dec === 'adj' ? 'Ajustando os posts' : (dec === 'rev2' ? 'Ajustes feitos, revise de novo' : '3 posts prontos para revisar')),
      st: dec === 'ok' ? 'Programados' : (dec === 'adj' ? 'Ajustando' : 'Aguardando você'),
      ps: dec === 'ok' ? 'Programado' : (dec === 'adj' ? 'Ajustando' : (dec === 'rev2' ? 'Ajustado' : 'Para revisar')),
      note: dec === 'ok' ? 'Programados para segunda, quarta e sexta. Publicação só nos dias combinados.' : (dec === 'adj' ? 'Otto e Kaia estão ajustando textos e artes.' : 'Você revisa antes de qualquer publicação.'),
      ask: dec === '' || dec === 'rev2', done: dec === 'ok',
      ok: () => this._sxDecide('ok'), adj: () => this._sxDecide('adj'), undo: () => this._sxDecide('')
    };
    const decSr = XR.id === 'ig' && sst >= 4 ? (dec === 'ok' ? ' Posts programados para segunda, quarta e sexta.' : (dec === 'adj' ? ' Otto e Kaia estão ajustando os posts.' : (dec === 'rev2' ? ' Ajustes feitos: os posts voltaram para a sua revisão.' : ''))) : '';
    const sx = {
      r: XR.id, stepStr: String(sst), phStr: String(sph), sc: scs, x: sxx, on: on, st: ast, busy: busy, chip: chip, igr: igr,
      stepsCls: 'lp-sx-steps' + (s.sxSw ? ' is-sw' : ''),
      steps: SX_T.map((t0, i) => ({
        n: String(i + 1), t: i === 2 ? T.t3 : t0, p: T.p[i], note: i === 3 ? T.note : '', hasNote: i === 3,
        cls: 'lp-sx-step' + (sst === i + 1 ? ' is-on' : '') + (i === 2 && s.sxSw && T.t3 !== XR.t3 ? ' is-swt' : ''), exp: sst === i + 1 ? 'true' : 'false',
        bid: 'lp-sx-b' + (i + 1), pid: 'lp-sx-d' + (i + 1), go: () => this._sxGo(i + 1)
      })),
      sr: 'Rotina: ' + XR.req + ' Etapa ' + sst + ' de 4. ' + XR.alt[sst - 1] + decSr
    };

    // memória (R17)
    const m3n = s.m3Ag || 'coord';
    // one dot per specialist (the one in the place is lit); the count is what the memory holds, the motion never changes it
    const m3Dots = M3_ORDER.map((n) => ({ st: 'background: ' + COLOR[n] + '; opacity: ' + (n === m3n ? '1' : '.34') + '; transform: scale(' + (n === m3n ? '1.35' : '1') + ')' }));
    const m3Hy = s.m3Hypo;
    const m3 = {
      ag: m3n, name: NAME[m3n], role: M3_ROLE[m3n], count: String(M3_COUNT), dots: m3Dots,
      nav: M3_ORDER.map((n, i) => ({ a: n, label: 'Ver ' + NAME[n] + ', ' + M3_ROLE[n], cls: 'lp-m3-dot' + (n === m3n ? ' is-on' : ''), cur: n === m3n ? 'true' : 'false', x: n === m3n ? 'sleep' : 'oval', go: () => this._m3Jump(i) })),
      open: s.m3Open, openStr: s.m3Open ? 'true' : 'false', toggle: () => this.setState({ m3Open: !s.m3Open }), close: () => { this.setState({ m3Open: false }); const bt = document.querySelector('.lp-m3-shelf'); if (bt) bt.focus({ preventScroll: true }); },
      know: M3_KNOW,
      hypoT: M3_HYPO, hypoAsk: !m3Hy,
      hypoS: m3Hy === 'ok' ? 'Sugestão confirmada' : (m3Hy === 'no' ? 'Sugestão corrigida · o Squad não usa' : 'Sugestão do Squad'),
      hypoCls: 'lp-m3-hypo' + (m3Hy ? ' is-' + m3Hy : ''),
      confirm: () => this.setState({ m3Hypo: 'ok' }), reject: () => this.setState({ m3Hypo: 'no' }),
      sr: NAME[m3n] + ', ' + M3_ROLE[m3n] + ', usa da memória do Squad: ' + M3_NET[m3n][1].map((i) => M3_ITEMS[M3_NET[m3n][0][i]][1].toLowerCase()).join(', ') + '.'
    };

    // perguntas frequentes (R22)
    const fo = s.faqOpen;
    const faq = {
      items: FAQ.map((f, i) => ({
        q: f.q, a: f.a.map((t) => ({ t: t })), bid: 'lp-faq-q' + (i + 1), pid: 'lp-faq-a' + (i + 1),
        exp: fo === i ? 'true' : 'false', cls: 'lp-faq-it' + (fo === i ? ' is-on' : ''), toggle: () => this._faqToggle(i)
      }))
    };

    // resultados (R21): one chart (orders per day), three indicators, one conversation, all driven by resStage
    const rs = s.resStage, rdec = s.resDec, aft = rs >= 5;
    const W0 = 760, H0 = 250, ml = 34, mr = 8, mt = 30, mb = 30;
    const pw = W0 - ml - mr, ph = H0 - mt - mb, stp = pw / RES_N;
    const X = (i) => ml + (i + 0.5) * stp, Y = (v) => mt + ph * (1 - v / RES_MAX);
    const all = RES_V.concat(RES_AFTER), shown = aft ? RES_N : RES_N0;
    const pts = all.map((v, i) => [X(i), Y(v)]);
    const pathOf = (a) => a.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const areaOf = (a) => pathOf(a) + ' L' + a[a.length - 1][0].toFixed(1) + ' ' + (mt + ph) + ' L' + a[0][0].toFixed(1) + ' ' + (mt + ph) + ' Z';
    const p0 = pts.slice(0, RES_N0), p1 = pts.slice(RES_N0 - 1);
    const hv = s.resHover >= 0 && s.resHover < shown ? s.resHover : -1;
    const px = (x) => (x / W0 * 100).toFixed(2) + '%', py = (y) => (y / H0 * 100).toFixed(2) + '%';
    const xa = X(8.5), xm = X(13.5), xb = Math.min(W0 - mr, X(18.5)), y0 = mt - 22, bh = ph + 22;
    const chart = {
      line0: pathOf(p0), area0: areaOf(p0), line1: pathOf(p1), area1: areaOf(p1),
      d0: { x: X(13).toFixed(1), y: Y(RES_V[13]).toFixed(1) }, d1: { x: X(18).toFixed(1), y: Y(RES_AFTER[4]).toFixed(1) },
      ticks: [0, 20, 40].map((t) => ({ y: Y(t).toFixed(1), x1: ml, x2: W0 - mr, l: String(t), st: 'top: ' + py(Y(t)) })),
      xl: [0, 4, 13, 18].map((i) => ({ l: DAYS[i], cls: 'lp-mono lp-cxl' + (i === 18 ? ' is-end' : ''), st: 'left: ' + px(X(i)) })),
      fz: { x: (xm + 6).toFixed(1), y: y0, w: (xb - xm - 6).toFixed(1), h: bh, st: 'left: ' + px((xm + xb) / 2) + '; top: ' + py(mt + ph * 0.5) },
      b0: { x: xa.toFixed(1), y: y0, w: (xm - xa - 3).toFixed(1), h: bh, st: 'left: ' + px(xa + 12) },
      b1: { x: (xm + 3).toFixed(1), y: y0, w: (xb - xm - 3).toFixed(1), h: bh, st: 'left: ' + px(xm + 15) },
      mk: { x: xm.toFixed(1), y1: y0 + 2, y2: mt + ph, st: 'left: ' + px(xm) },
      hits: all.slice(0, shown).map((v, i) => ({ x: (X(i) - stp / 2).toFixed(1), w: stp.toFixed(1), y: mt, h: ph, enter: () => this.setState({ resHover: i }) })),
      hover: hv >= 0, hx: hv >= 0 ? pts[hv][0].toFixed(1) : 0, hy: hv >= 0 ? pts[hv][1].toFixed(1) : 0, hy1: mt, hy2: mt + ph,
      tipStyle: hv >= 0 ? 'left: ' + px(pts[hv][0]) + '; top: ' + py(pts[hv][1]) : '',
      tipDay: hv >= 0 ? WD[hv] + ', ' + DAYS[hv] + (hv >= RES_N0 ? ' · após o ajuste' : '') : '', tipVal: hv >= 0 ? all[hv] + ' encomendas' : '',
      leave: () => this.setState({ resHover: -1 }), endDay: DAYS[shown - 1],
      alt: 'Encomendas pelo site por dia, de 23/11 a ' + DAYS[shown - 1] + '.' + (rs >= 4 && rdec === 'yes' ? ' Ajuste aplicado em 06/12.' : '') + (aft ? ' 116 encomendas nos 5 dias antes do ajuste e 149 nos 5 dias depois, 28% a mais.' : ''),
      table: all.slice(0, shown).map((v, i) => ({ d: DAYS[i], v: String(v) }))
    };
    const bold = (t) => String(t || '').split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((x) => (/^\*\*/.test(x) ? { t: x.slice(2, -2), c: 'lp-b' } : { t: x, c: '' }));
    const ST = rdec === 'later' ? { kind: 'live', lead: 'square', m: 'Íris', d: 'nada mudou', time: '06/12' }
      : (rdec === 'adj' ? { kind: 'wait', lead: 'coord', m: 'Nexo', d: 'refazendo a proposta', time: '' }
        : [{ kind: 'live', lead: 'square', m: 'Íris', d: 'acompanhando', time: '06/12' },
          { kind: 'work', lead: 'square', m: 'Íris', d: 'comparando formatos', time: '' },
          { kind: 'wait', lead: 'coord', m: 'Nexo', d: 'aguardando você', time: '' },
          { kind: 'wait', lead: 'coord', m: 'Nexo', d: 'aguardando você', time: '' },
          { kind: 'done', lead: 'hex', m: 'Kiwi', d: 'ajuste aplicado', time: '' },
          { kind: 'live', lead: 'square', m: 'Íris', d: '5 dias depois', time: '11/12' }][rs]);
    const res = {
      sStr: String(rs), decStr: rdec || 'none', st: ST, chart: chart,
      h5a: aft ? 'true' : 'false', h5b: aft ? 'false' : 'true', h4a: rs >= 4 && rdec === 'yes' ? 'true' : 'false', h4b: rs >= 4 && rdec === 'yes' ? 'false' : 'true',
      mixAlt: rs >= 4 && rdec === 'yes' ? 'Distribuição da verba: vídeos curtos 92%, estáticos 8%. Verba total mantida.'
        : (rs >= 2 && rdec !== 'later' ? 'Distribuição da verba: vídeos curtos 60%, estáticos 40%. Proposta: 92% e 8%, mesma verba total.' : 'Distribuição da verba: vídeos curtos 60%, estáticos 40%.'),
      msgs: s.resMsgs.map((m) => ({
        isUser: !!m.user, isNote: !!m.note, isAg: !!m.ag, ag: m.ag || 'coord', name: NAME[m.ag] || '', role: ROLE[m.ag] || '',
        text: m.text, parts: bold(m.text), foot: m.foot || ''
      })),
      typing: s.resTyping ? { ag: s.resTyping, text: RES_TYPING[s.resTyping] } : null,
      appr: s.resAppr, done: s.resDone, replay: () => this._resRun(true),
      onYes: () => this._resDecide('yes'), onAdj: () => this._resDecide('adj'), onLater: () => this._resDecide('later'),
      facts: [['Verba total', 'sem aumento'], ['Onde', 'Redes sociais']]
    };

    // modal
    const modal = {
      open: !!s.modal, signupAny: s.modal === 'signup', signupSaved: s.modal === 'signup' && !!s.saved, signupEmpty: s.modal === 'signup' && !s.saved, signin: s.modal === 'signin', hasSaved: !!s.saved, saved: s.saved,
      email: s.email, onEmail: (e) => this.setState({ email: e.target.value }),
      state: s.signup, done: s.signup === 'done',
      submit: () => { if (s.signup !== 'rest') return; this.setState({ signup: 'loading' }); this._later(() => this.setState({ signup: 'done' }), 1000); },
      close: () => this._closeModal(),
      key: (e) => { if (e.key === 'Escape') this._closeModal(); },
      backdrop: (e) => { if (e.target === e.currentTarget) this._closeModal(); },
      stop: (e) => { if (e && e.preventDefault) e.preventDefault(); }
    };

    return {
      hero: hero, prompt: s.prompt, chipSel: s.chipSel, heroSending: s.heroSending,
      n18: 18, n28: 28, n980: 980, n120: 120, n240: 240, n30: 30, n34: 34, n22: 22, n20: 20, n24: 24, n14: 14, n36: 36, n44: 44, n60: 60, n40: 40, n128: 128, n300: 300, n280: 280, n112: 112, n120w: 120, pct100: '100%', yes: true, no: false, nil: null,
      openSignup: () => this._openModal('signup'), openSignin: (e) => { if (e && e.preventDefault) e.preventDefault(); this._openModal('signin'); },
      goDemo: () => this._goDemo(),
      nav: (id) => (e) => { if (e && e.preventDefault) e.preventDefault(); this._scrollTo(id); },
      navDemo: (e) => { if (e && e.preventDefault) e.preventDefault(); this._scrollTo('demo'); },
      navSquad: (e) => { if (e && e.preventDefault) e.preventDefault(); this._scrollTo('squad'); },
      navAuto: (e) => { if (e && e.preventDefault) e.preventDefault(); this._scrollTo('autonomo'); },
      navMem: (e) => { if (e && e.preventDefault) e.preventDefault(); this._scrollTo('memoria'); },
      navRes: (e) => { if (e && e.preventDefault) e.preventDefault(); this._scrollTo('resultados'); },
      navTop: (e) => { if (e && e.preventDefault) e.preventDefault(); this._scrollTo('topo'); },
      barCls: 'lp-bar' + (s.hdr ? ' is-on' : ''),
      demo: demo, squad: squad, manif: manif, auto: auto, sx: sx, m3: m3, res: res, faq: faq, modal: modal,
      m3Cls: 'lp-m3' + (s.m3 ? ' is-on' : ''),
      saved: s.saved, hasSaved: !!s.saved
    };
  }
}
  return Component;
}
