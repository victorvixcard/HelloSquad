/* Qualidade das entregas: o mês mais recente contra o anterior (cartões), "Como ler" e duas abas. Por tipo: outubro até 16/10,
   com a linha de total calculada das próprias linhas. Por mês: os meses, o que mudou em cada um e a comparação entre dois
   meses escolhidos (mede se uma mudança de prompt ou modelo melhorou). Contagens viram taxa por entrega na comparação,
   porque os meses têm volumes diferentes e o mês corrente ainda não fechou. */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, HS = SA.HS, D = SA.D, Q = SA.Q, fmt = SA.fmt;
  var useState = React.useState;
  var QD = D.qualidade, MESES = QD.porMes;
  var NOME = {}; Q.deliveries.forEach(function (d) { NOME[d.id] = d.nome; });
  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  function curto(m) { return MES[+m.mes.split('-')[1] - 1]; }
  function rot(m) { return m.rotulo.replace(/\s*\(.*\)$/, ''); }
  function parcial(m) { var x = m.rotulo.match(/\((.*)\)/); return x ? x[1] : null; }
  function duas(a, b) { return h(React.Fragment, null, a, h('br'), b); }
  function soma(rows, k) { return rows.reduce(function (s, r) { return s + r[k]; }, 0); }
  function sinal(n, d) { var r = Number(Math.abs(n).toFixed(d)); return r === 0 ? fmt.dec(0, d) : (n > 0 ? '+' : '−') + fmt.dec(r, d); }

  /* melhor: 1 = maior é melhor, -1 = menor é melhor. Contagens (conta) comparam a taxa: % das entregas ou por 100 entregas.
     A diferença é (depois − antes) × esc, mostrada com dec casas e o sufixo. */
  var MET = [
    { k: 'primeira', l: 'Aprovadas de primeira', melhor: 1, v: function (m) { return m.primeira; }, f: function (x) { return fmt.pct(x); }, esc: 100, dec: 0, suf: ' p.p.' },
    { k: 'ajustes', l: 'Ajustes por entrega', melhor: -1, v: function (m) { return m.ajustes; }, f: function (x) { return fmt.dec(x, 2); }, esc: 1, dec: 2, suf: '' },
    { k: 'naoAprovadas', l: 'Não aprovadas', melhor: -1, conta: true, unid: 'das entregas', v: function (m) { return m.naoAprovadas / m.entregas; }, f: function (x) { return fmt.pct(x, 1); }, esc: 100, dec: 1, suf: ' p.p.' },
    { k: 'custoAprovada', l: 'Custo de IA por aprovada', melhor: -1, v: function (m) { return m.custoAprovada; }, f: function (x) { return fmt.usd(x); }, esc: 1, dec: 2, usd: true },
    { k: 'errosAgente', l: 'Erros do agente', melhor: -1, conta: true, unid: 'por 100 entregas', v: function (m) { return m.errosAgente / m.entregas * 100; }, f: function (x) { return fmt.dec(x, 1); }, esc: 1, dec: 1, suf: ' por 100 entregas' },
    { k: 'falhas', l: 'Chamadas com falha', melhor: -1, conta: true, unid: 'por 100 entregas', v: function (m) { return m.falhas / m.entregas * 100; }, f: function (x) { return fmt.dec(x, 1); }, esc: 1, dec: 1, suf: ' por 100 entregas' }
  ];
  /* a leitura sai da diferença arredondada como é mostrada: se ela aparece como zero, é "sem mudança" */
  function compara(met, a, b) {
    var va = met.v(a), vb = met.v(b), d = (vb - va) * met.esc, r = Number(Math.abs(d).toFixed(met.dec));
    var s = r === 0 ? '' : (d > 0 ? '+' : '−');
    var txt = met.usd ? s + 'US$ ' + fmt.dec(r, 2) : s + fmt.dec(r, met.dec) + met.suf;
    return { va: va, vb: vb, txt: txt, leitura: r === 0 ? 'igual' : (d * met.melhor > 0 ? 'melhorou' : 'piorou') };
  }
  function Leitura(p) {
    if (p.l === 'melhorou') return h(SA.Status, { kind: 'done', s: true }, 'Melhorou');
    if (p.l === 'piorou') return h(SA.Status, { kind: 'you', s: true }, 'Piorou');
    return h('span', { className: 'sa-mut', style: { fontSize: 12.5 } }, p.l === 'igual' ? 'Sem mudança' : 'volume, não é melhor nem pior');
  }

  var COMO = [
    ['Aprovada de primeira', 'Aprovada pelo dono da conta sem nenhum pedido de ajuste.'],
    ['Ajustes por entrega', 'Pedidos de ajuste ÷ entregas.'],
    ['Não aprovada', 'Rejeitada com cancelamento do trabalho.'],
    ['Custo de IA por aprovada', 'Custo de IA das entregas ÷ entregas aprovadas. A conversa fica fora.'],
    ['Erro do agente', 'Entrega reprovada na autoverificação ou fora do formato.'],
    ['Chamada com falha', 'Chamada ao provedor que falhou, inclusive as que deram certo na nova tentativa.']
  ];

  /* ---------- por tipo (outubro, até 16/10: o mesmo período do mês mais recente) */
  function totalTipos(rows) {
    var e = soma(rows, 'entregas'), nao = soma(rows, 'naoAprovadas');
    return {
      entregas: e, naoAprovadas: nao, errosAgente: soma(rows, 'errosAgente'), falhas: soma(rows, 'falhas'),
      primeira: rows.reduce(function (s, r) { return s + r.primeira * r.entregas; }, 0) / e,
      ajustes: rows.reduce(function (s, r) { return s + r.ajustes * r.entregas; }, 0) / e,
      custoAprovada: rows.reduce(function (s, r) { return s + r.custoAprovada * (r.entregas - r.naoAprovadas); }, 0) / (e - nao)
    };
  }
  function PorTipo() {
    var rows = QD.porTipo.slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    var t = totalTipos(rows);
    var cols = [
      { k: 'd', l: 'Tipo de entrega', render: function (r) {
        var a = SA.agentOfDelivery(r.d);
        return h('div', { className: 'sa-cell-a' }, h(HS.Agent, { agent: a.forma, size: 24 }),
          h('div', { className: 'sa-cell-m' }, h('b', null, NOME[r.d]), h('small', null, h('span', { className: 'sa-mono', style: { fontSize: 11.5 } }, r.d), ' · ' + a.name)));
      } },
      { k: 'entregas', l: 'Entregas', r: true, render: function (r) { return fmt.int(r.entregas); } },
      { k: 'primeira', l: duas('Aprovadas', 'de primeira'), r: true, render: function (r) { return fmt.pct(r.primeira); } },
      { k: 'ajustes', l: duas('Ajustes', 'por entrega'), r: true, render: function (r) { return fmt.dec(r.ajustes, 2); } },
      { k: 'naoAprovadas', l: duas('Não', 'aprovadas'), r: true, render: function (r) { return fmt.int(r.naoAprovadas); } },
      { k: 'custoAprovada', l: duas('Custo de IA', 'por aprovada'), r: true, render: function (r) { return fmt.usd(r.custoAprovada); } },
      { k: 'errosAgente', l: duas('Erros', 'do agente'), r: true, render: function (r) { return fmt.int(r.errosAgente); } },
      { k: 'falhas', l: duas('Chamadas', 'com falha'), r: true, render: function (r) { return fmt.int(r.falhas); } }
    ];
    var foot = h('tr', null,
      h('td', null, h('div', { className: 'sa-cell-m' }, h('span', null, 'Total'), h('small', { style: { fontWeight: 500 } }, rows.length + ' tipos'))),
      h('td', { className: 'is-r' }, fmt.int(t.entregas)),
      h('td', { className: 'is-r' }, fmt.pct(t.primeira)),
      h('td', { className: 'is-r' }, fmt.dec(t.ajustes, 2)),
      h('td', { className: 'is-r' }, fmt.int(t.naoAprovadas)),
      h('td', { className: 'is-r' }, fmt.usd(t.custoAprovada)),
      h('td', { className: 'is-r' }, fmt.int(t.errosAgente)),
      h('td', { className: 'is-r' }, fmt.int(t.falhas)));
    return h(SA.Card, { title: 'Por tipo de entrega', sub: 'outubro, até 16/10 · ' + rows.length + ' tipos com entrega; os outros ' + (Q.deliveries.length - rows.length) + ' do catálogo ainda sem entrega no período', flush: true },
      h(SA.Table, { cols: cols, rows: rows, rowKey: 'd', caption: 'Qualidade por tipo de entrega, outubro até 16/10', foot: foot }),
      h('p', { style: { padding: '10px 20px 12px', fontSize: 12.5, color: 'var(--hs-tinta-suave)' } },
        'No total, aprovadas de primeira e ajustes são médias ponderadas pelas entregas; o custo por aprovada é ponderado pelas aprovadas (entregas menos não aprovadas).'));
  }

  /* ---------- por mês, com a comparação entre dois meses */
  function contaETaxa(n, taxa) {
    return h('div', { className: 'sa-cell-m', style: { alignItems: 'flex-end' } }, h('span', null, fmt.int(n)), h('small', null, taxa));
  }
  function PorMes() {
    var pares = [];
    for (var i = MESES.length - 1; i > 0; i--) pares.push({ v: i, l: curto(MESES[i - 1]) + ' × ' + curto(MESES[i]) });
    var pS = useState(MESES.length - 1), par = pS[0], setPar = pS[1];
    var a = MESES[par - 1], b = MESES[par];
    var cols = [
      { k: 'mes', l: 'Mês', nw: true, render: function (m) { return h('div', { className: 'sa-cell-m' }, h('b', null, rot(m)), h('small', null, parcial(m) || 'mês inteiro')); } },
      { k: 'entregas', l: 'Entregas', r: true, render: function (m) { return fmt.int(m.entregas); } },
      { k: 'primeira', l: duas('Aprovadas', 'de primeira'), r: true, render: function (m) { return fmt.pct(m.primeira); } },
      { k: 'ajustes', l: duas('Ajustes', 'por entrega'), r: true, render: function (m) { return fmt.dec(m.ajustes, 2); } },
      { k: 'naoAprovadas', l: duas('Não', 'aprovadas'), r: true, render: function (m) { return contaETaxa(m.naoAprovadas, fmt.pct(m.naoAprovadas / m.entregas, 1)); } },
      { k: 'custoAprovada', l: duas('Custo de IA', 'por aprovada'), r: true, render: function (m) { return fmt.usd(m.custoAprovada); } },
      { k: 'errosAgente', l: duas('Erros', 'do agente'), r: true, render: function (m) { return contaETaxa(m.errosAgente, fmt.dec(m.errosAgente / m.entregas * 100, 1) + ' por 100'); } },
      { k: 'falhas', l: duas('Chamadas', 'com falha'), r: true, render: function (m) { return contaETaxa(m.falhas, fmt.dec(m.falhas / m.entregas * 100, 1) + ' por 100'); } },
      { k: 'nota', l: 'O que mudou', render: function (m) { return h('span', { style: { display: 'block', minWidth: 150, fontSize: 13, lineHeight: 1.4 } }, m.nota); } }
    ];
    var linhas = [{ k: 'entregas', l: 'Entregas', a: fmt.int(a.entregas), b: fmt.int(b.entregas), txt: sinal(b.entregas - a.entregas, 0), leitura: 'volume' }]
      .concat(MET.map(function (met) {
        var c = compara(met, a, b);
        function cel(m, v) { return met.conta ? contaETaxa(m[met.k], met.f(v) + ' ' + met.unid) : met.f(v); }
        return { k: met.k, l: met.l, a: cel(a, c.va), b: cel(b, c.vb), txt: c.txt, leitura: c.leitura };
      }));
    var melhoras = linhas.filter(function (l) { return l.leitura === 'melhorou'; }).length;
    var pioras = linhas.filter(function (l) { return l.leitura === 'piorou'; }).length;
    var colsCmp = [
      { k: 'l', l: 'Métrica', render: function (l) { return h('b', null, l.l); } },
      { k: 'a', l: rot(a), r: true, render: function (l) { return l.a; } },
      { k: 'b', l: rot(b) + (parcial(b) ? ' (' + parcial(b) + ')' : ''), r: true, render: function (l) { return l.b; } },
      { k: 'txt', l: 'Diferença', r: true, render: function (l) { return h('span', { className: 'sa-num', style: { fontWeight: 700 } }, l.txt); } },
      { k: 'leitura', l: 'Leitura', render: function (l) { return h(Leitura, { l: l.leitura }); } }
    ];
    return h(React.Fragment, null,
      h(SA.Card, { title: 'Por mês', sub: rot(MESES[0]) + ' a ' + rot(MESES[MESES.length - 1]) + ' · contagens com a taxa por entrega embaixo', flush: true },
        h(SA.Table, { cols: cols, rows: MESES, rowKey: 'mes', caption: 'Qualidade por mês' })),
      h(SA.Card, { id: 'comparar', title: 'Comparar dois meses', sub: 'mede se uma mudança de prompt ou modelo melhorou', flush: true,
        actions: h(SA.Dropdown, { prefix: 'Comparar', value: par, onChange: setPar, title: 'Meses', right: true, options: pares }) },
        h('div', { style: { padding: '2px 20px 12px', fontSize: 13.5, lineHeight: 1.5 } },
          h('span', { className: 'sa-mut' }, 'O que mudou em ' + rot(b) + ': '), h('b', null, b.nota), '. ',
          h('span', { className: 'sa-mut' }, melhoras + ' de ' + MET.length + ' métricas melhoraram' + (pioras ? ' e ' + pioras + ' piorou' + (pioras > 1 ? 'aram' : '') : '') + ' contra ' + rot(a) + '.')),
        h(SA.Table, { cols: colsCmp, rows: linhas, rowKey: 'k', caption: 'Comparação entre ' + a.rotulo + ' e ' + b.rotulo }),
        h('p', { style: { padding: '10px 20px 12px', fontSize: 12.5, color: 'var(--hs-tinta-suave)' } },
          'Não aprovadas, erros e chamadas com falha são comparados pela taxa, porque os meses têm volumes diferentes' + (parcial(b) ? ' e ' + rot(b) + ' ainda não fechou (' + parcial(b) + ')' : '') + '.')));
  }

  function App() {
    var tb = SA.useHashTab('tipo', ['tipo', 'mes']), aba = tb[0], setAba = tb[1];
    var atual = MESES[MESES.length - 1], ant = MESES[MESES.length - 2];
    var items = MET.map(function (met) {
      var c = compara(met, ant, atual), palavra = h('b', null, c.leitura === 'igual' ? 'sem mudança' : c.leitura);
      if (met.conta) return { l: met.l, v: fmt.int(atual[met.k]), u: met.k === 'naoAprovadas' ? 'de ' + fmt.int(atual.entregas) : null,
        d: h(React.Fragment, null, met.f(c.vb) + ' ' + met.unid + ', contra ' + met.f(c.va) + ' em ' + rot(ant) + ': ', palavra, '.') };
      return { l: met.l, v: met.f(c.vb), d: h(React.Fragment, null, c.txt + ' contra ' + rot(ant) + ': ', palavra, '.') };
    });
    return h(SA.Page, { nav: 'qualidade', title: 'Qualidade das entregas',
      desc: 'Por tipo de entrega e por mês: aprovadas de primeira, ajustes, não aprovadas, custo de IA por aprovada, erros do agente e chamadas com falha. Compare dois meses para saber se uma mudança de prompt ou modelo melhorou o resultado.' },
      h('div', { className: 'sa-sec-t', style: { marginTop: 0 } }, h('h2', null, rot(atual) + (parcial(atual) ? ', ' + parcial(atual) : '')),
        h('small', null, fmt.int(atual.entregas) + ' entregas · variação contra ' + rot(ant) + ', ' + fmt.int(ant.entregas) + ' entregas')),
      h(SA.Metrics, { cols: 3, items: items }),
      h(SA.Card, { id: 'como-ler', title: 'Como ler', sub: 'o que entra em cada conta', style: { marginTop: 16 } },
        h('div', { className: 'sa-row c3', style: { gap: '14px 28px' } }, COMO.map(function (c) {
          return h('div', { key: c[0] }, h('b', { style: { fontSize: 13.5 } }, c[0]),
            h('p', { style: { marginTop: 2, fontSize: 13, lineHeight: 1.45, color: 'var(--hs-tinta-suave)' } }, c[1]));
        })),
        h('p', { style: { marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--hs-l1)', fontSize: 13, lineHeight: 1.45, color: 'var(--hs-tinta-suave)' } },
          'Para comparar meses de volumes diferentes, as contagens viram taxa: não aprovadas em % das entregas; erros e chamadas com falha por 100 entregas.')),
      h('div', { className: 'sa-tabs-w', style: { marginTop: 24 } },
        h(SA.Tabs, { label: 'Ver a qualidade', idp: 'qual', panel: 'qual-painel', value: aba, onChange: setAba,
          tabs: [{ id: 'tipo', l: 'Por tipo' }, { id: 'mes', l: 'Por mês' }] })),
      h(SA.TabPanel, { id: 'qual-painel', idp: 'qual', value: aba }, aba === 'mes' ? h(PorMes) : h(PorTipo)));
  }
  SA.render(App);
})();
