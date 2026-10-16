/* Super Admin · SA0 — casca comum (barra lateral, topo, aviso de 2FA) e composições.
   Componentes do DS vêm de window.HelloSquad; o que o DS não tem (tabela, abas, cartão de número,
   diálogo, campo de formulário) é composto aqui com os tokens. Ícones: os mesmos traços da Product UI V4.6. */
(function () {
  'use strict';
  var React = window.React, h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;
  var HS = window.HelloSquad, D = window.SA_DATA, Q = window.SA_SQUAD;

  /* ---------- ícones (grade 18, traço arredondado), copiados do objeto IC da Product UI V4.6 */
  var IC = {
    home: 'M3 8.1 9 3.4l6 4.7v6.1a1.4 1.4 0 0 1-1.4 1.4H4.4A1.4 1.4 0 0 1 3 14.2z M7.3 15.6v-4.1h3.4v4.1',
    team: 'M6.6 8.3a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z M1.9 15.1c.5-2.6 2.3-4.1 4.7-4.1s4.2 1.5 4.7 4.1 M12.1 3.3a2.5 2.5 0 0 1 0 4.8 M13.5 11.1c1.4.6 2.4 2 2.6 4',
    works: 'M9 2.7 2.5 6 9 9.3 15.5 6z M2.5 9.1 9 12.4l6.5-3.3 M2.5 12.2 9 15.5l6.5-3.3',
    mem: 'M9 4.6C7.7 3.5 5.6 3.1 3 3.3v10.5c2.6-.2 4.7.2 6 1.2 1.3-1 3.4-1.4 6-1.2V3.3c-2.6-.2-4.7.2-6 1.3z M9 4.6V15',
    chat: 'M15 8.6c0 3.1-2.7 5.4-6 5.4-.8 0-1.6-.1-2.3-.4l-3.4 1.3 1-2.8C3.5 11.1 3 9.9 3 8.6c0-3.1 2.7-5.4 6-5.4s6 2.3 6 5.4z',
    auto: 'M14.5 7.3A5.7 5.7 0 0 0 4.3 5.5 M3.5 10.7a5.7 5.7 0 0 0 10.2 1.8 M14.8 3.5v3.9h-3.9 M3.2 14.5v-3.9h3.9',
    cog: 'M3 5.2h6.8 M13.2 5.2H15 M3 12.8h1.8 M8.2 12.8H15 M11.5 3.4v3.6 M6.5 11v3.6',
    bell: 'M4.4 12.4h9.2l-1.2-1.7V7.8a3.4 3.4 0 0 0-6.8 0v2.9z M7.6 14.6a1.5 1.5 0 0 0 2.8 0',
    help: 'M9 15.6A6.6 6.6 0 1 0 9 2.4a6.6 6.6 0 0 0 0 13.2z M7.1 7.1a1.95 1.95 0 0 1 3.8.6c0 1.3-1.9 1.7-1.9 2.9 M9 12.7v.1',
    search: 'M8 13.2A5.2 5.2 0 1 0 8 2.8a5.2 5.2 0 0 0 0 10.4z M15.2 15.2l-3.5-3.5',
    spark: 'M9 2.6l1.4 3.9 3.9 1.4-3.9 1.4L9 13.2 7.6 9.3 3.7 7.9l3.9-1.4z M14 12.2l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z',
    pen: 'M11.8 3.8l2.4 2.4L7 13.4l-3.2.8.8-3.2z',
    trash: 'M3.5 5.1h11 M7 5.1V3.6h4v1.5 M5 5.1l.7 9.3h6.6l.7-9.3',
    file: 'M10.5 2.6H5.5a1.8 1.8 0 0 0-1.8 1.8v9.2a1.8 1.8 0 0 0 1.8 1.8h7a1.8 1.8 0 0 0 1.8-1.8V6.4z M10.5 2.6v3.8h3.8',
    image: 'M3 4.6A1.6 1.6 0 0 1 4.6 3h8.8A1.6 1.6 0 0 1 15 4.6v8.8a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 13.4z M3.4 12.6l3.3-3.3 2.4 2.4 1.6-1.6 3.9 3.9 M11.6 7.1a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    list: 'M6.6 4.6H15 M6.6 9H15 M6.6 13.4H15 M3 4.6h.1 M3 9h.1 M3 13.4h.1',
    grid: 'M3 3h5v5H3z M10 3h5v5h-5z M3 10h5v5H3z M10 10h5v5h-5z',
    pause: 'M6.6 4.2v9.6 M11.4 4.2v9.6',
    play: 'M5.6 3.9v10.2L14 9z',
    clock: 'M9 15.6A6.6 6.6 0 1 0 9 2.4a6.6 6.6 0 0 0 0 13.2z M9 5.6V9l2.3 1.5',
    lock: 'M5.4 8V6.2a3.6 3.6 0 0 1 7.2 0V8 M4.2 8h9.6v6.8H4.2z',
    shield: 'M9 2.6l5.4 2v4.2c0 3.3-2.2 5.7-5.4 6.6-3.2-.9-5.4-3.3-5.4-6.6V4.6z M6.8 9l1.6 1.6 3-3.2',
    out: 'M5.6 12.4l6.8-6.8 M6.6 5.6h5.8v5.8',
    hist: 'M3.2 9A5.8 5.8 0 1 0 5 4.8 M3 2.8v2.6h2.6 M9 5.7V9l2.2 1.4',
    dots: 'M4.5 9h.1 M9 9h.1 M13.5 9h.1',
    globe: 'M9 15.5A6.5 6.5 0 1 0 9 2.5a6.5 6.5 0 0 0 0 13z M2.5 9h13 M9 2.5c2 2 2.8 4.2 2.8 6.5S11 13.5 9 15.5C7 13.5 6.2 11.3 6.2 9S7 4.5 9 2.5z',
    sheet: 'M3.4 3h11.2v12H3.4z M3.4 7h11.2 M3.4 11h11.2 M8 3v12',
    mail: 'M3 4.6h12v8.8H3z M3.4 5l5.6 4.6L14.6 5',
    bag: 'M4 6h10l-.8 9H4.8z M6.6 6V5a2.4 2.4 0 0 1 4.8 0v1',
    plus: 'M9 3.6v10.8 M3.6 9h10.8',
    chev: 'M5.2 7.2 9 11l3.8-3.8',
    chevR: 'M7.2 5.2 11 9l-3.8 3.8',
    inbox: 'M2.6 10.2h3.6l1.2 2h3.2l1.2-2h3.6 M4.5 3.8h9l2.3 6.4v3.6a1.5 1.5 0 0 1-1.5 1.5H3.7a1.5 1.5 0 0 1-1.5-1.5v-3.6z',
    pulse: 'M2.2 9.4h3.1l1.8-4.6 3.5 8.6 1.9-4h3.3',
    chart: 'M2.8 12.6l4-4 2.8 2.8 5.4-5.4 M11.6 6h3.4v3.4',
    user: 'M9 8.4a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8z M3.6 15.6c.6-2.9 2.7-4.5 5.4-4.5s4.8 1.6 5.4 4.5',
    logout: 'M7.2 15.2H4.6A1.6 1.6 0 0 1 3 13.6V4.4a1.6 1.6 0 0 1 1.6-1.6h2.6 M11.4 12.2 14.6 9l-3.2-3.2 M14.6 9H7.4',
    squad: 'M9 8.2a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z M4.6 14.6c.4-2.4 2.1-3.8 4.4-3.8s4 1.4 4.4 3.8 M4.2 8.6a1.8 1.8 0 1 1 .6-3.4 M13.8 8.6a1.8 1.8 0 1 0-.6-3.4 M1.6 13c.3-1.6 1.3-2.6 2.8-2.9 M16.4 13c-.3-1.6-1.3-2.6-2.8-2.9',
    up: 'M9 14.2V3.8 M4.6 8.2 9 3.8l4.4 4.4',
    down: 'M9 3.8v10.4 M4.6 9.8 9 14.2l4.4-4.4',
    okc: 'M4.2 9.5l3.1 3.1 6.5-6.7',
    xx: 'M5.6 5.6l6.8 6.8 M12.4 5.6l-6.8 6.8',
    alert: 'M9 15.6A6.6 6.6 0 1 0 9 2.4a6.6 6.6 0 0 0 0 13.2z M9 5.7v3.9 M9 12.3v.1',
    checkc: 'M9 15.6A6.6 6.6 0 1 0 9 2.4a6.6 6.6 0 0 0 0 13.2z M6.1 9.2l2 2 3.9-4.1',
    deliv: 'M9 2.6l5.8 3v6.8L9 15.4l-5.8-3V5.6z M3.2 5.6 9 8.6l5.8-3 M9 8.6v6.8',
    folder: 'M2.6 5.3a1.4 1.4 0 0 1 1.4-1.4h3.2l1.6 1.8H14a1.4 1.4 0 0 1 1.4 1.4v6.5a1.4 1.4 0 0 1-1.4 1.4H4a1.4 1.4 0 0 1-1.4-1.4z',
    filt: 'M2.8 4.6h12.4 M5.2 9h7.6 M7.6 13.4h2.8',
    cal: 'M3.4 4.4h11.2v10.2H3.4z M3.4 7.6h11.2 M6.4 2.8v3 M11.6 2.8v3',
    klib: 'M3.2 3.2h5v6.2h-5z M9.8 3.2h5v4h-5z M3.2 11h5v3.8h-5z M9.8 8.8h5v6h-5z',
    arrowR: 'M3.6 9h10.4 M10.2 5.2 14 9l-3.8 3.8',
    back: 'M14.4 9H4 M7.8 5.2 4 9l3.8 3.8'
  };
  function Icon(p) {
    var d = IC[p.name]; if (!d) return null;
    return h('svg', { className: 'sa-ic' + (p.className ? ' ' + p.className : ''), viewBox: '0 0 18 18', 'aria-hidden': true,
      style: p.size ? { width: p.size, height: p.size } : undefined }, h('path', { d: d }));
  }

  /* ---------- formatos pt-BR */
  var nInt = new Intl.NumberFormat('pt-BR');
  var nBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var nUSD = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' });
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parse(iso) { return iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso) : null; }
  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var fmt = {
    int: function (n) { return nInt.format(Math.round(n)); },
    dec: function (n, d) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }); },
    brl: function (n) { return nBRL.format(n); },
    usd: function (n, d) {
      if (d != null) return 'US$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
      return nUSD.format(n);
    },
    pct: function (n, d) { return fmt.dec(n * 100, d == null ? 0 : d) + '%'; },
    date: function (iso) { var t = parse(iso); return t ? pad(t.getDate()) + '/' + pad(t.getMonth() + 1) + '/' + t.getFullYear() : '—'; },
    short: function (iso) { var t = parse(iso); return t ? pad(t.getDate()) + ' ' + MES[t.getMonth()] : '—'; },
    dt: function (iso) { var t = parse(iso); return t ? pad(t.getDate()) + '/' + pad(t.getMonth() + 1) + ' ' + pad(t.getHours()) + ':' + pad(t.getMinutes()) : '—'; },
    hm: function (iso) { var t = parse(iso); return t ? pad(t.getHours()) + ':' + pad(t.getMinutes()) : '—'; },
    mil: function (n) { return n >= 1000 ? fmt.dec(n / 1000, 1) + ' mil' : fmt.int(n); },
    tok: function (n) { return n >= 1e6 ? fmt.dec(n / 1e6, 1) + ' mi' : (n >= 1000 ? fmt.dec(n / 1000, 1) + ' mil' : fmt.int(n)); }
  };

  /* ---------- squad: dados de squad/ (gerados) + números fictícios do painel */
  var AG = {};
  (Q ? Q.agentes : []).forEach(function (a) { AG[a.id] = Object.assign({}, a, (D.agentesPainel || {})[a.id] || {}); });
  function ag(id) { return AG[id]; }
  function agents() { return (Q ? Q.agentes : []).map(function (a) { return AG[a.id]; }); }
  function agentOfDelivery(did) { var g = did.split('.')[0]; return agents().filter(function (a) { return (a.deliveries || []).indexOf(did) >= 0 || a.deliveries[0].split('.')[0] === g; })[0]; }

  /* ---------- navegação */
  var NAV = [
    { id: 'op', l: 'Operação', items: [
      { id: 'contas', l: 'Contas', href: 'contas.html', ic: 'team' },
      { id: 'catalogo', l: 'Catálogo', href: 'catalogo.html', ic: 'deliv' },
      { id: 'planos', l: 'Planos e recargas', href: 'planos.html', ic: 'bag' },
      { id: 'pagamentos', l: 'Pagamentos', href: 'pagamentos.html', ic: 'sheet' },
      { id: 'auditoria', l: 'Auditoria', href: 'auditoria.html', ic: 'hist' }
    ] },
    { id: 'ia', l: 'Squad IA', items: [
      { id: 'squad', l: 'Squad', href: 'squad.html', ic: 'squad', agents: true },
      { id: 'regras', l: 'Regras de negócio', href: 'regras.html', ic: 'file' },
      { id: 'referencias', l: 'Referências', href: 'referencias.html', ic: 'folder' },
      { id: 'motor', l: 'Motor de imagem', href: 'motor-imagem.html', ic: 'image' },
      { id: 'modelos', l: 'Modelos e custos', href: 'modelos.html', ic: 'spark' },
      { id: 'consumo', l: 'Consumo por cliente', href: 'consumo.html', ic: 'chart' },
      { id: 'saude', l: 'Saúde das APIs', href: 'saude-apis.html', ic: 'pulse' },
      { id: 'fila', l: 'Fila de trabalhos', href: 'fila.html', ic: 'works' },
      { id: 'qualidade', l: 'Qualidade das entregas', href: 'qualidade.html', ic: 'checkc' }
    ] }
  ];
  function navItem(id) { var r = null; NAV.forEach(function (g) { g.items.forEach(function (it) { if (it.id === id) r = { g: g, it: it }; }); }); return r; }
  function badges() {
    var b = {};
    var fail = (D.runs || []).filter(function (r) { return r.estado === 'failed'; }).length;
    if (fail) b.fila = { n: fail, hot: true };
    var down = (D.provedores || []).filter(function (p) { return p.estado === 'falhando'; }).length;
    if (down) b.saude = { n: down, hot: true };
    var pend = 0; (D.regras || []).forEach(function (doc) { doc.paragrafos.forEach(function (p) { if (p.m === 'pendente') pend++; }); });
    if (pend) b.regras = { n: pend };
    return b;
  }

  function Sidebar(p) {
    var bd = badges();
    var showAgents = p.cur === 'squad' || p.cur === 'agente';
    return h('nav', { className: 'sa-sb', 'aria-label': 'Navegação do Super Admin' },
      h('div', { className: 'sa-sb-top' },
        h('a', { className: 'sa-wm', href: 'contas.html', 'aria-label': 'HelloSquad, Super Admin: ir para Contas' }, 'HelloSquad'),
        h('span', { className: 'sa-wm-tag' }, 'Super Admin')),
      h('div', { className: 'sa-sb-scroll' },
        NAV.map(function (g) {
          return h('div', { key: g.id, className: 'sa-g', role: 'group', 'aria-labelledby': 'sa-gl-' + g.id },
            h('div', { className: 'sa-gl', id: 'sa-gl-' + g.id }, g.l),
            g.items.map(function (it) {
              var on = p.cur === it.id || (it.agents && p.cur === 'agente');
              var b = bd[it.id];
              return h(React.Fragment, { key: it.id },
                h('a', { className: 'sa-ni' + (on ? ' is-on' : ''), href: it.href, 'aria-current': p.cur === it.id ? 'page' : undefined },
                  h(Icon, { name: it.ic }), h('span', { className: 'sa-ni-l' }, it.l),
                  b ? h('span', { className: 'sa-nb' + (b.hot ? ' is-hot' : ''), 'aria-label': b.n + (b.hot ? ' com falha' : ' pendentes') }, b.n) : null),
                it.agents && showAgents ? h('div', { className: 'sa-ags' }, agents().map(function (a) {
                  var cur = p.cur === 'agente' && p.agent === a.id;
                  return h('a', { key: a.id, className: 'sa-ag' + (cur ? ' is-on' : ''), href: 'agente.html?a=' + a.id, 'aria-current': cur ? 'page' : undefined },
                    h(HS.Agent, { agent: a.forma, size: 18 }), h('span', null, a.name));
                })) : null);
            }));
        })),
      h('div', { className: 'sa-sb-foot' },
        h('span', { className: 'sa-me-av', 'aria-hidden': true }, D.admin.nome.charAt(0)),
        h('span', { className: 'sa-me-t' }, h('b', null, D.admin.nome), h('small', null, D.admin.email))));
  }

  /* ---------- topo: trilha + dados fictícios; faixa de 2FA; identidade da página */
  function Top(p) {
    var ni = navItem(p.nav === 'agente' ? 'squad' : p.nav);
    var crumbs = [{ l: 'Super Admin' }];
    if (ni) crumbs.push({ l: ni.g.l });
    (p.crumbs || []).forEach(function (c) { crumbs.push(c); });
    return h('div', { className: 'sa-top' },
      h('nav', { className: 'sa-crumb sa-lbl', 'aria-label': 'Trilha' }, crumbs.map(function (c, i) {
        return h(React.Fragment, { key: i }, i ? h('span', { 'aria-hidden': true }, '/') : null, c.href ? h('a', { href: c.href }, c.l) : h('span', null, c.l));
      })),
      h('div', { className: 'sa-crumb' },
        h(Status, { kind: 'draft', s: true }, 'Dados fictícios'),
        h('span', { className: 'sa-lbl' }, 'Protótipo SA0')));
  }

  function TwoFA() {
    var st = useState(false), open = st[0], setOpen = st[1];
    var cd = useState(''), code = cd[0], setCode = cd[1];
    return h(React.Fragment, null,
      h('div', { className: 'sa-band' },
        h('button', { type: 'button', className: 'sa-band-b', onClick: function () { setOpen(true); }, 'aria-haspopup': 'dialog' },
          h('span', { className: 'sa-band-k' }, h('i', { 'aria-hidden': true }), h('span', null, 'Segurança')),
          h('span', { className: 'sa-band-t' }, 'Verificação em duas etapas desligada'),
          h('span', { className: 'sa-band-s' }, 'Obrigatória para o Super Admin antes de abrir ao público. Cada ação aqui fica na auditoria.'),
          h('span', { className: 'sa-band-l' }, 'Ativar agora', h(Icon, { name: 'arrowR' })))),
      h(Dialog, { open: open, onClose: function () { setOpen(false); }, title: 'Ativar a verificação em duas etapas',
        desc: 'Código de 6 dígitos de um app autenticador (TOTP) a cada entrada no painel. Entra na fatia SA6, antes da publicação.',
        footer: [
          h('span', { key: 'n', className: 'sa-grow' }, 'Demonstração: nada é ativado neste protótipo.'),
          h(HS.Button, { key: 'c', variant: 'ghost', size: 's', onClick: function () { setOpen(false); } }, 'Agora não'),
          h(HS.Button, { key: 'a', variant: 'primary', size: 's', icon: null, disabled: code.replace(/\D/g, '').length !== 6,
            onClick: function () { setOpen(false); setCode(''); toast('Demonstração: a 2FA será ativada na SA6.'); } }, 'Confirmar código')
        ] },
        h('ol', { className: 'sa-list' },
          [['1', 'Abra o app autenticador e leia o código da conta', 'O QR aparece aqui; o segredo nunca é exibido de novo.'],
            ['2', 'Digite o código de 6 dígitos', 'Confirma que o app e o painel estão sincronizados.'],
            ['3', 'Guarde os códigos de recuperação', 'Oito códigos de uso único, para perda do celular.']].map(function (s) {
            return h('li', { key: s[0], className: 'sa-li' }, h('span', { className: 'sa-biz', 'aria-hidden': true }, s[0]),
              h('span', { className: 'sa-li-t' }, h('b', null, s[1]), h('small', null, s[2])));
          })),
        h('div', { className: 'sa-fld', style: { marginTop: 12 } },
          h('label', { htmlFor: 'sa-totp' }, 'Código do app'),
          h('input', { id: 'sa-totp', className: 'sa-inp sa-num', inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 6, placeholder: '000000',
            value: code, onChange: function (e) { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); }, style: { width: 160, letterSpacing: '.3em', fontFamily: "'JetBrains Mono', monospace" } }))));
  }

  function Page(p) {
    useEffect(function () { document.title = p.title + ' · Super Admin · HelloSquad'; }, [p.title]);
    return h('div', { className: 'sa' },
      h('a', { className: 'sa-skip', href: '#conteudo' }, 'Pular para o conteúdo'),
      h(Sidebar, { cur: p.nav, agent: p.agent }),
      h('main', { className: 'sa-main' },
        h('div', { className: 'sa-scroll', id: 'sa-scroll' },
          h('div', { className: 'sa-v' },
            h(Top, { nav: p.nav, crumbs: p.crumbs }),
            h(TwoFA),
            h('header', { className: 'sa-head', id: 'conteudo', tabIndex: -1 },
              h('div', { className: 'sa-head-t' },
                p.avatar ? h('span', { className: 'sa-head-av' }, p.avatar) : null,
                h('div', null, h('h1', { className: 'sa-h1' }, p.title), p.desc ? h('p', { className: 'sa-desc' }, p.desc) : null)),
              p.actions ? h('div', { className: 'sa-head-a' }, p.actions) : null),
            p.children))),
      h(ToastHost));
  }

  /* ---------- superfícies e blocos */
  function Card(p) {
    return h('section', { className: 'sa-card' + (p.flat ? ' is-flat' : '') + (p.className ? ' ' + p.className : ''), 'aria-labelledby': p.title && p.id ? p.id + '-t' : undefined, id: p.id, style: p.style },
      p.title || p.actions ? h('div', { className: 'sa-card-h' },
        h('div', { className: 'sa-card-t' }, p.title ? h(p.h3 ? 'h3' : 'h2', { id: p.id ? p.id + '-t' : undefined }, p.title) : null, p.sub ? h('small', null, p.sub) : null),
        p.actions ? h('div', { className: 'sa-card-a' }, p.actions) : null) : null,
      h('div', { className: 'sa-card-b' + (p.flush ? ' is-flush' : '') }, p.children));
  }
  function Metrics(p) {
    return h('div', { className: 'sa-mets', style: p.cols ? { gridTemplateColumns: 'repeat(' + p.cols + ',minmax(0,1fr))' } : undefined },
      p.items.map(function (m, i) {
        return h('div', { key: i, className: 'sa-met' + (m.kind ? ' is-' + m.kind : '') },
          h('div', { className: 'sa-met-l' }, h('span', { className: 'sa-lbl' }, m.l), m.tag || null),
          h('div', { className: 'sa-met-v' }, m.v, m.u ? h('small', null, m.u) : null),
          m.d ? h('div', { className: 'sa-met-d' }, m.d) : null);
      }));
  }
  var ST_GLYPH = { you: 'alert', done: 'okc', fail: 'xx', pause: 'pause', block: 'lock' };
  function Status(p) {
    var g = p.glyph !== undefined ? p.glyph : ST_GLYPH[p.kind];
    return h('span', { className: 'sa-st is-' + (p.kind || 'prog') + (p.s ? ' is-s' : ''), title: p.title },
      g ? h('svg', { viewBox: '0 0 18 18', 'aria-hidden': true }, h('path', { d: IC[g] })) : null, p.children);
  }
  var MK = { decidido: { kind: 'ok', l: 'Decidido' }, base: { kind: 'auto', l: 'Base atual' }, pendente: { kind: 'you', l: 'Pendente' }, proposta: { kind: 'sim', l: 'Proposta' } };
  function Marker(p) { var m = MK[p.kind]; return h('span', { className: 'sa-mk is-' + p.kind }, h(HS.Tag, { kind: m.kind }, m.l)); }
  function Note(p) {
    return h('div', { className: 'sa-note' + (p.kind ? ' is-' + p.kind : ''), role: p.kind === 'warn' ? 'note' : undefined, style: p.style },
      p.label ? h('span', { className: 'sa-lbl' }, p.label) : null, h('div', null, p.children));
  }
  function Empty(p) {
    return h('div', { className: 'sa-empty' }, p.agent ? h(HS.Agent, { agent: p.agent, size: 40, expression: p.expression || 'sleep' }) : null,
      h('b', null, p.title), p.children ? h('span', null, p.children) : null, p.actions ? h('div', { className: 'sa-empty-a' }, p.actions) : null);
  }

  /* ---------- tabela: a célula principal leva o link (teclado); a linha inteira responde ao clique */
  function Table(p) {
    function cls(c) { return [c.r && 'is-r', c.c && 'is-c', c.nw && 'is-nw'].filter(Boolean).join(' ') || undefined; }
    return h('div', { className: 'sa-tblw' }, h('table', { className: 'sa-tbl' },
      p.caption ? h('caption', { className: 'sa-sr' }, p.caption) : null,
      h('thead', null, h('tr', null, p.cols.map(function (c) { return h('th', { key: c.k, scope: 'col', className: cls(c), style: c.w ? { width: c.w } : undefined }, c.l); }))),
      h('tbody', null, p.rows.length ? p.rows.map(function (r, i) {
        var key = r[p.rowKey || 'id'] != null ? r[p.rowKey || 'id'] : i;
        return h('tr', { key: key, className: [p.onRow && 'is-click', p.sel != null && p.sel === key && 'is-sel'].filter(Boolean).join(' ') || undefined,
          onClick: p.onRow ? function (e) { if (e.target.closest('a,button,input,textarea,[role=checkbox]')) return; p.onRow(r); } : undefined },
          p.cols.map(function (c) { return h('td', { key: c.k, className: cls(c) }, c.render ? c.render(r) : r[c.k]); }));
      }) : h('tr', null, h('td', { colSpan: p.cols.length, className: 'sa-tbl-empty' }, p.empty || 'Nada por aqui.'))),
      p.foot ? h('tfoot', null, p.foot) : null));
  }

  /* ---------- abas (role=tab; setas, Home e End) */
  function Tabs(p) {
    var refs = useRef({});
    function go(i) { var t = p.tabs[i]; p.onChange(t.id); var el = refs.current[t.id]; if (el) el.focus(); }
    return h('div', { className: 'sa-tabs' + (p.line ? ' is-line' : ''), role: 'tablist', 'aria-label': p.label },
      p.tabs.map(function (t, i) {
        var on = t.id === p.value;
        return h('button', { key: t.id, ref: function (el) { refs.current[t.id] = el; }, type: 'button', role: 'tab', id: (p.idp || 'tab') + '-' + t.id,
          'aria-selected': on, 'aria-controls': p.panel || undefined, tabIndex: on ? 0 : -1, className: 'sa-tab',
          onClick: function () { p.onChange(t.id); },
          onKeyDown: function (e) {
            var n = p.tabs.length, j = null;
            if (e.key === 'ArrowRight') j = (i + 1) % n; else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n; else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = n - 1;
            if (j !== null) { e.preventDefault(); go(j); }
          } },
          t.agent ? h(HS.Agent, { agent: t.agent, size: 18 }) : null, t.l,
          t.badge != null ? h('span', { className: 'sa-nb' + (t.hot ? ' is-hot' : '') }, t.badge) : null);
      }));
  }
  function TabPanel(p) {
    return h('div', { role: 'tabpanel', id: p.id, 'aria-labelledby': (p.idp || 'tab') + '-' + p.value, tabIndex: 0, style: { outlineOffset: 6 } }, p.children);
  }
  function useHashTab(def, allowed) {
    function read() { var x = decodeURIComponent((location.hash || '').slice(1)); return allowed.indexOf(x) >= 0 ? x : def; }
    var st = useState(read), v = st[0], setV = st[1];
    useEffect(function () { function on() { setV(read()); } window.addEventListener('hashchange', on); return function () { window.removeEventListener('hashchange', on); }; }, []);
    return [v, function (x) { setV(x); history.replaceState(null, '', '#' + x); }];
  }

  /* ---------- seletor: Select + Menu do DS (setas, Esc devolve o foco) */
  function Dropdown(p) {
    var st = useState(false), open = st[0], setOpen = st[1], ref = useRef(null);
    var cur = p.options.filter(function (o) { return o.v === p.value; })[0] || p.options[0];
    function btn() { return ref.current && ref.current.querySelector('.hs-select'); }
    useEffect(function () {
      if (!open) return;
      function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
      document.addEventListener('mousedown', onDoc);
      var t = setTimeout(function () { var el = ref.current && (ref.current.querySelector('.hs-mi[aria-checked="true"]') || ref.current.querySelector('.hs-mi')); if (el) el.focus(); }, 20);
      return function () { document.removeEventListener('mousedown', onDoc); clearTimeout(t); };
    }, [open]);
    function onKey(e) {
      if (!open) return;
      var items = Array.prototype.slice.call(ref.current.querySelectorAll('.hs-mi')), i = items.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); var b = btn(); if (b) b.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Tab') setOpen(false);
    }
    return h('div', { className: 'sa-dd', ref: ref, onKeyDown: onKey },
      h(HS.Select, { open: open, agent: cur.agent, onClick: function () { setOpen(!open); } }, (p.prefix ? p.prefix + ': ' : '') + cur.l),
      open ? h('div', { className: 'sa-dd-pop' + (p.right ? ' is-r' : '') }, h(HS.Menu, {
        title: p.title, items: p.options.map(function (o) { return { label: o.l, agent: o.agent, selected: o.v === p.value }; }),
        onSelect: function (it, k) { p.onChange(p.options[k].v); setOpen(false); var b = btn(); if (b) b.focus(); }
      })) : null);
  }

  /* ---------- busca: o campo de comando do DS, sem o envio (filtra enquanto digita; Esc limpa) */
  function Search(p) {
    return h('div', { className: 'sa-search', style: p.width ? { width: p.width } : { flex: 1, minWidth: 260 } },
      h(HS.CommandField, { value: p.value, onChange: p.onChange, placeholder: p.placeholder, label: p.label || p.placeholder }));
  }

  /* ---------- diálogo: foco preso, Esc fecha e devolve o foco */
  var dlgSeq = 0;
  function Dialog(p) {
    var ref = useRef(null), prev = useRef(null), closeRef = useRef(p.onClose), idRef = useRef('sa-dlg-' + (++dlgSeq));
    closeRef.current = p.onClose;
    useEffect(function () {
      if (!p.open) return;
      prev.current = document.activeElement;
      var t = setTimeout(function () {
        var el = ref.current; if (!el) return;
        var f = el.querySelector('[data-autofocus]') || el.querySelector('.sa-dlg-b input, .sa-dlg-b textarea, .sa-dlg-b button, .sa-dlg-f button');
        if (f) f.focus();
      }, 40);
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); return; }
        if (e.key !== 'Tab' || !ref.current) return;
        var f = Array.prototype.slice.call(ref.current.querySelectorAll('a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])'));
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      document.addEventListener('keydown', onKey, true);
      return function () { clearTimeout(t); document.removeEventListener('keydown', onKey, true); if (prev.current && prev.current.focus) prev.current.focus(); };
    }, [p.open]);
    if (!p.open) return null;
    var id = idRef.current;
    return ReactDOM.createPortal(h('div', { className: 'sa-ovl', onMouseDown: function (e) { if (e.target === e.currentTarget) closeRef.current(); } },
      h('div', { className: 'sa-dlg' + (p.wide ? ' is-w' : ''), role: 'dialog', 'aria-modal': true, 'aria-labelledby': id + '-t', ref: ref },
        h('div', { className: 'sa-dlg-h' },
          p.agent ? h(HS.Agent, { agent: p.agent, size: 32, expression: 'big' }) : null,
          h('div', null, h('h2', { id: id + '-t' }, p.title), p.desc ? h('p', null, p.desc) : null),
          h(HS.IconButton, { icon: 'close', label: 'Fechar', variant: 'ghost', onClick: function () { closeRef.current(); } })),
        h('div', { className: 'sa-dlg-b' }, p.children),
        p.footer ? h('div', { className: 'sa-dlg-f' }, p.footer) : null)), document.body);
  }

  /* ---------- aviso flutuante */
  function toast(msg, agent) { window.dispatchEvent(new CustomEvent('sa-toast', { detail: { msg: msg, agent: agent } })); }
  function ToastHost() {
    var st = useState(null), t = st[0], setT = st[1], tm = useRef(0);
    useEffect(function () {
      function on(e) { clearTimeout(tm.current); setT({ msg: e.detail.msg, agent: e.detail.agent, k: Date.now() }); tm.current = setTimeout(function () { setT(null); }, 3600); }
      window.addEventListener('sa-toast', on);
      return function () { window.removeEventListener('sa-toast', on); };
    }, []);
    return h('div', { role: 'status', 'aria-live': 'polite' }, t ? h('div', { key: t.k, className: 'sa-toast' },
      h(HS.Agent, { agent: t.agent || 'coord', size: 22, expression: 'happy' }), h('span', null, t.msg)) : null);
  }

  /* ---------- campos */
  function Field(p) {
    return h('div', { className: 'sa-fld', style: p.style }, p.label ? h(p.id ? 'label' : 'span', { htmlFor: p.id, className: p.id ? undefined : 'sa-fld-l' }, p.label) : null, p.children, p.hint ? h('small', null, p.hint) : null);
  }
  function qs(name) { return new URLSearchParams(location.search).get(name); }
  function render(App) { ReactDOM.createRoot(document.getElementById('root')).render(h(App)); }

  window.SA = {
    h: h, HS: HS, D: D, Q: Q, IC: IC, Icon: Icon, fmt: fmt, ag: ag, agents: agents, agentOfDelivery: agentOfDelivery, NAV: NAV,
    Page: Page, Card: Card, Metrics: Metrics, Status: Status, Marker: Marker, Note: Note, Empty: Empty, Table: Table,
    Tabs: Tabs, TabPanel: TabPanel, useHashTab: useHashTab, Dropdown: Dropdown, Search: Search, Dialog: Dialog, toast: toast,
    Field: Field, qs: qs, render: render
  };
})();
