/* Consumo por cliente: por conta e período, solicitações, créditos cobrados e custo de IA em entregas e em conversa;
   alertas econômicos com faixas de referência. As faixas são PROPOSTA do protótipo e nada muda automaticamente.
   Cartões, alertas e a linha de total saem das mesmas linhas da tabela (custos arredondados ao centavo antes de somar). */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, D = SA.D, fmt = SA.fmt;
  var useState = React.useState;
  var F = D.faixas, CAMBIO = D.cambio.usdbrl, REF = D.creditoRef;
  var PLANO = {}; D.planos.forEach(function (p) { PLANO[p.id] = p.nome; });
  var PERIODO = { '30': { l: 'Últimos 30 dias', f: 1 }, '7': { l: 'Últimos 7 dias', f: 7 / 30 } };

  function cents(n) { return Math.round(n * 100) / 100; }
  function soma(rows, k) { return rows.reduce(function (s, r) { return s + r[k]; }, 0); }
  function rs3(n) { return 'R$ ' + fmt.dec(n, 3); }
  function varia(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + fmt.dec(Math.abs(n) * 100, 0) + '%'; }
  function pct(n) { return n < 0 ? '−' + fmt.pct(-n) : fmt.pct(n); }
  function duas(a, b) { return h(React.Fragment, null, a, h('br'), b); }
  function mut(t) { return h('span', { className: 'sa-mut' }, t); }

  /* as três leituras econômicas; o mesmo critério vale para o conjunto filtrado e para cada conta */
  var ALERTAS = [
    { k: 'ia', t: 'IA por crédito', curto: 'IA por crédito', fx: F.iaPorCredito, fmt: rs3,
      val: function (x) { return x.ia; }, ok: function (v) { return v <= F.iaPorCredito.ok; },
      como: function (x) { return fmt.brl(x.brl) + ' de IA (entregas e conversa) ÷ ' + fmt.int(x.cred) + ' créditos cobrados.'; } },
    { k: 'margem', t: 'Margem bruta estimada', curto: 'margem', fx: F.margem, fmt: pct,
      val: function (x) { return x.margem; }, ok: function (v) { return v >= F.margem.ok; },
      como: function (x) { return '1 − ' + fmt.brl(x.brl) + ' de IA ÷ ' + fmt.brl(x.cred * REF) + ' em créditos (' + fmt.int(x.cred) + ' a ' + fmt.brl(REF) + ', exemplo).'; } },
    { k: 'tend', t: 'Tendência do custo por turno', curto: 'tendência', fx: F.tendencia, fmt: varia,
      val: function (x) { return x.tend; }, ok: function (v) { return v <= F.tendencia.ok; },
      como: function (x) {
        var base = x.turnos ? ' Custo médio por turno no período: ' + fmt.usd(x.custo / x.turnos, 4) + '.' : '';
        if (x.tendN > 1) return 'Últimos 7 dias contra os 7 anteriores; média de ' + x.tendN + ' contas, ponderada pelo custo.' + base;
        return 'Últimos 7 dias contra os 7 anteriores.' + base;
      } }
  ];
  var CURTO = {}; ALERTAS.forEach(function (a) { CURTO[a.k] = a.curto; });

  /* uma linha por conta, já no período escolhido (7 dias = 30 dias × 7/30, estimativa do protótipo) */
  function linha(c, f) {
    var u = c.uso, r = { id: c.id, c: c, semUso: !u.chamadas };
    r.sol = Math.round(u.trabalhos * f);
    r.cred = Math.round(u.creditos * f);
    r.ent = cents(u.custoEntregas * f);
    r.conv = cents(u.custoConversa * f);
    r.custo = cents(r.ent + r.conv);
    r.brl = r.custo * CAMBIO;
    r.turnos = u.turnos * f;
    r.ia = r.cred ? r.brl / r.cred : null;
    r.margem = r.cred ? 1 - r.brl / (r.cred * REF) : null;
    r.tend = u.tendencia;
    r.tendN = r.tend == null ? 0 : 1;
    r.fora = ALERTAS.filter(function (a) { var v = a.val(r); return v != null && !a.ok(v); }).map(function (a) { return a.k; });
    r.avaliavel = ALERTAS.some(function (a) { return a.val(r) != null; });
    return r;
  }
  function conjunto(rows) {
    var x = { sol: soma(rows, 'sol'), cred: soma(rows, 'cred'), ent: cents(soma(rows, 'ent')), conv: cents(soma(rows, 'conv')), turnos: soma(rows, 'turnos') };
    x.custo = cents(x.ent + x.conv);
    x.brl = x.custo * CAMBIO;
    x.ia = x.cred ? x.brl / x.cred : null;
    x.margem = x.cred ? 1 - x.brl / (x.cred * REF) : null;
    var com = rows.filter(function (r) { return r.tend != null && r.custo > 0; }), peso = soma(com, 'custo');
    x.tend = peso ? com.reduce(function (s, r) { return s + r.tend * r.custo; }, 0) / peso : null;
    x.tendN = com.length;
    return x;
  }

  function Faixa(p) {
    return h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, lineHeight: 1.45 } },
      h(SA.Marker, { kind: 'proposta' }), h('span', { style: { paddingTop: 2 } }, p.children));
  }

  function AlertCard(p) {
    var a = p.a, v = a.val(p.tot), ok = v == null ? null : a.ok(v);
    var fora = p.rows.filter(function (r) { return r.fora.indexOf(a.k) >= 0; });
    var status = v == null ? h('span', { className: 'sa-lbl' }, 'Sem dado')
      : h(SA.Status, { kind: ok ? 'done' : 'you' }, ok ? 'OK' : 'Atenção');
    return h(SA.Card, { id: 'alerta-' + a.k, title: a.t, h3: true, actions: status, style: { height: '100%' } },
      h('div', { className: 'sa-met-v', style: { marginBottom: 6 } }, v == null ? '—' : a.fmt(v)),
      h('p', { style: { fontSize: 12.5, lineHeight: 1.45, color: 'var(--hs-tinta-suave)', marginBottom: 12, minHeight: 36 } },
        v == null ? (a.k === 'tend' ? 'Nenhuma conta do filtro tem duas semanas de uso para comparar.' : 'Nenhum crédito cobrado no filtro.') : a.como(p.tot)),
      h(Faixa, null, a.fx.regra),
      h('div', { style: { marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--hs-l1)' } },
        h('span', { className: 'sa-lbl' }, fora.length ? (fora.length === 1 ? '1 conta em atenção' : fora.length + ' contas em atenção') : 'Contas em atenção'),
        fora.length ? h('ul', { className: 'sa-list', style: { marginTop: 4 } }, fora.map(function (r) {
          return h('li', { key: r.id, className: 'sa-li', style: { padding: '7px 0' } },
            h('span', { style: { flex: 1, minWidth: 0 } }, h('a', { className: 'sa-rowlink', href: 'conta.html?id=' + r.id }, r.c.marca)),
            h('b', { className: 'sa-num' }, a.fmt(a.val(r))));
        })) : h('p', { style: { marginTop: 6, fontSize: 13, color: 'var(--hs-tinta-suave)' } },
          p.rows.some(function (r) { return a.val(r) != null; }) ? 'Nenhuma conta fora da faixa.' : 'Nenhuma conta do filtro com dado para avaliar.')));
  }

  function AlertaCell(r) {
    if (r.semUso) return h('div', { className: 'sa-cell-m' }, mut('—'), h('small', null, 'sem uso'));
    if (!r.avaliavel) return h('div', { className: 'sa-cell-m' }, mut('—'), h('small', null, 'sem crédito cobrado'));
    if (!r.fora.length) return h(SA.Status, { kind: 'done', s: true }, 'OK');
    return h('div', { className: 'sa-cell-m', style: { alignItems: 'flex-start', gap: 4 } },
      h(SA.Status, { kind: 'you', s: true }, 'Atenção'), h('small', null, r.fora.map(function (k) { return CURTO[k]; }).join(' · ')));
  }

  function App() {
    var pS = useState('30'), per = pS[0], setPer = pS[1];
    var plS = useState('todos'), plano = plS[0], setPlano = plS[1];
    var cS = useState('todas'), conta = cS[0], setConta = cS[1];
    var f = PERIODO[per].f;
    var doPlano = D.contas.filter(function (c) { return plano === 'todos' || c.plano === plano; });
    var rows = doPlano.filter(function (c) { return conta === 'todas' || c.id === conta; }).map(function (c) { return linha(c, f); });
    var tot = conjunto(rows);
    var atencao = rows.filter(function (r) { return r.fora.length; });
    var filtrado = plano !== 'todos' || conta !== 'todas';

    function trocaPlano(v) {
      setPlano(v);
      var c = D.contas.filter(function (x) { return x.id === conta; })[0];
      if (c && v !== 'todos' && c.plano !== v) setConta('todas');
    }
    function limpar() { setPlano('todos'); setConta('todas'); }
    function val(r, node) { return r.semUso ? mut('—') : node; }
    function talvez(v, fn) { return v == null ? mut('—') : fn(v); }

    var cols = [
      { k: 'conta', l: 'Conta', render: function (r) {
        return h('div', { className: 'sa-cell-m' }, h('a', { className: 'sa-rowlink', href: 'conta.html?id=' + r.id }, r.c.marca), h('small', null, 'desde ' + fmt.short(r.c.desde)));
      } },
      { k: 'plano', l: 'Plano', nw: true, render: function (r) { return h('span', { className: 'sa-chip' }, PLANO[r.c.plano]); } },
      { k: 'sol', l: 'Solicitações', r: true, render: function (r) { return val(r, fmt.int(r.sol)); } },
      { k: 'cred', l: duas('Créditos', 'cobrados'), r: true, render: function (r) { return val(r, fmt.int(r.cred)); } },
      { k: 'ent', l: duas('IA em', 'entregas'), r: true, render: function (r) { return val(r, fmt.usd(r.ent)); } },
      { k: 'conv', l: duas('IA em', 'conversa'), r: true, render: function (r) { return val(r, fmt.usd(r.conv)); } },
      { k: 'ia', l: duas('IA por', 'crédito'), r: true, render: function (r) { return talvez(r.ia, rs3); } },
      { k: 'margem', l: duas('Margem', 'estimada'), r: true, render: function (r) { return talvez(r.margem, pct); } },
      { k: 'tend', l: duas('Tendência', '7 dias'), r: true, render: function (r) { return talvez(r.tend, varia); } },
      { k: 'alerta', l: 'Alerta', render: AlertaCell }
    ];
    var foot = rows.length ? h('tr', null,
      h('td', null, h('div', { className: 'sa-cell-m' }, h('span', null, 'Total'), h('small', { style: { fontWeight: 500 } }, rows.length === 1 ? '1 conta' : rows.length + ' contas'))),
      h('td', null),
      h('td', { className: 'is-r' }, fmt.int(tot.sol)),
      h('td', { className: 'is-r' }, fmt.int(tot.cred)),
      h('td', { className: 'is-r' }, fmt.usd(tot.ent)),
      h('td', { className: 'is-r' }, fmt.usd(tot.conv)),
      h('td', { className: 'is-r' }, talvez(tot.ia, rs3)),
      h('td', { className: 'is-r' }, talvez(tot.margem, pct)),
      h('td', { className: 'is-r' }, talvez(tot.tend, varia)),
      h('td', null, h('span', { style: { fontSize: 12.5 } }, atencao.length ? (atencao.length === 1 ? '1 em atenção' : atencao.length + ' em atenção') : 'nenhuma em atenção'))) : null;

    var contaOpts = [{ v: 'todas', l: 'Todas' }].concat(doPlano.map(function (c) { return { v: c.id, l: c.marca }; }));
    var planoOpts = [{ v: 'todos', l: 'Todos' }].concat(D.planos.map(function (p) { return { v: p.id, l: p.nome }; }));
    var parteConversa = tot.custo ? tot.conv / tot.custo : null;

    return h(SA.Page, { nav: 'consumo', title: 'Consumo por cliente',
      desc: h(React.Fragment, null, 'Por conta e período: solicitações, créditos cobrados e custo de IA em entregas e em conversa. ',
        h('b', null, 'Conversa não cobra crédito, mas custa:'), ' aparece aqui. Os alertas só avisam; nada muda automaticamente.') },
      h('div', { className: 'sa-tool', style: { marginBottom: 16 } },
        h(SA.Dropdown, { prefix: 'Período', value: per, onChange: setPer, title: 'Período',
          options: [{ v: '30', l: PERIODO['30'].l }, { v: '7', l: PERIODO['7'].l }] }),
        h(SA.Dropdown, { prefix: 'Plano', value: plano, onChange: trocaPlano, title: 'Plano', options: planoOpts }),
        h(SA.Dropdown, { prefix: 'Conta', value: conta, onChange: setConta, title: 'Conta', options: contaOpts }),
        h('span', { className: 'sa-grow' }),
        h('span', { style: { fontSize: 12.5, color: 'var(--hs-tinta-suave)' } }, 'Câmbio de ' + fmt.date(D.cambio.data) + ': US$ 1 = ' + fmt.brl(CAMBIO) + ', ' + D.cambio.fonte)),
      per === '7' ? h(SA.Note, { kind: 'draft', label: 'Estimativa', style: { marginBottom: 16 } },
        'Os últimos 7 dias são os 30 dias × 7/30, arredondados por conta. É uma estimativa do protótipo: no produto, a soma vem das chamadas registradas no período. A tendência já é de 7 dias e não muda.') : null,
      h(SA.Metrics, { items: [
        { l: 'Solicitações', v: fmt.int(tot.sol), d: 'trabalhos pedidos ao squad em ' + (rows.length === 1 ? '1 conta' : rows.length + ' contas') },
        { l: 'Créditos cobrados', v: fmt.int(tot.cred), d: 'equivalem a ' + fmt.brl(tot.cred * REF) + ' com o crédito a ' + fmt.brl(REF) + ' (exemplo)' },
        { l: 'IA em entregas', v: fmt.usd(tot.ent), d: fmt.brl(tot.ent * CAMBIO) + ' ao câmbio do dia' },
        { l: 'IA em conversa', v: fmt.usd(tot.conv), d: 'Conversa não cobra crédito, mas custa' + (parteConversa != null ? ': ' + fmt.pct(parteConversa) + ' do custo de IA.' : '.') },
        { l: 'IA por crédito', v: tot.ia == null ? '—' : rs3(tot.ia), d: tot.ia == null ? 'nenhum crédito cobrado' : 'custo de IA em R$ por crédito cobrado' }
      ] }),
      h('div', { className: 'sa-sec-t' }, h('h2', null, 'Alertas econômicos'),
        h('small', null, 'Faixas de referência propostas pelo protótipo, a definir com o Vic. Nada muda automaticamente: o alerta só avisa.')),
      h('div', { className: 'sa-row c3 is-eq' }, ALERTAS.map(function (a) { return h(AlertCard, { key: a.k, a: a, tot: tot, rows: rows }); })),
      h(SA.Card, { title: 'Por cliente', sub: PERIODO[per].l.toLowerCase() + ' · ' + (filtrado ? rows.length + ' de ' + D.contas.length + ' contas' : D.contas.length + ' contas'), flush: true, style: { marginTop: 16 } },
        h(SA.Table, { cols: cols, rows: rows, caption: 'Consumo por cliente, ' + PERIODO[per].l.toLowerCase(), foot: foot,
          empty: h('span', null, 'Nenhuma conta com esses filtros. ',
            h('button', { type: 'button', className: 'sa-rowlink', style: { border: 0, background: 'none', cursor: 'pointer', padding: 0 }, onClick: limpar }, 'Limpar filtros')) })),
      h(SA.Note, { label: 'Como ler', style: { marginTop: 16 } },
        h('span', null, 'Custo de IA pela tabela de preço por modelo de ', fmt.date(D.cambio.data), ' (', h('a', { href: 'modelos.html' }, 'Modelos e custos'), '), em US$. ',
          h('b', null, 'IA por crédito'), ' = custo de IA em R$, entregas e conversa, ÷ créditos cobrados. ',
          h('b', null, 'Margem estimada'), ' = 1 − custo de IA em R$ ÷ (créditos × ', fmt.brl(REF), ', valor de exemplo do crédito). ',
          h('b', null, 'Tendência'), ' = variação do custo por turno nos últimos 7 dias contra os 7 anteriores; no total, média ponderada pelo custo. ',
          h('b', null, '—'), ' = conta sem uso, sem crédito cobrado ou sem duas semanas de uso para comparar.')));
  }
  SA.render(App);
})();
