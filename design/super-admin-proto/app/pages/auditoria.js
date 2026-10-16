/* Auditoria: tudo o que acontece na plataforma, sem apagar nada. Filtros por quem (Super Admin, clientes,
   sistema), conta, tipo e período; aceita ?quem=, ?conta= e ?tipo= na URL (outras telas linkam já filtrado). */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, HS = SA.HS, D = SA.D, fmt = SA.fmt;
  var useState = React.useState;

  var EV = D.auditoria.map(function (e, i) { return Object.assign({ k: 'ev' + i }, e); }), HOJE = new Date(D.hoje), DIA = D.hoje.slice(0, 10);
  var QUEM = [['Tudo', 'todos'], ['Super Admin', 'admin'], ['Clientes', 'cliente'], ['Sistema', 'sistema']];
  var PERIODOS = [{ v: 'hoje', l: 'Hoje' }, { v: '7d', l: '7 dias', dias: 7 }, { v: '30d', l: '30 dias', dias: 30 }];
  var SIS_IC = { Worker: 'works', Agendador: 'clock', Sistema: 'cog' };
  var CONTA = {}, AG_NOME = {};
  D.contas.forEach(function (c) { CONTA[c.id] = c; });
  SA.agents().forEach(function (a) { AG_NOME[a.name] = a; });
  /* tipos do registro, mais "Cobrança", que só aparece quando os pagamentos entrarem (Fase 2) */
  var TIPOS = EV.map(function (e) { return e.tipo; }).concat(['Cobrança'])
    .filter(function (t, i, l) { return l.indexOf(t) === i; }).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
  var CONTAS_EV = EV.map(function (e) { return e.conta; }).filter(function (c, i, l) { return c && CONTA[c] && l.indexOf(c) === i; })
    .sort(function (a, b) { return CONTA[a].marca.localeCompare(CONTA[b].marca, 'pt-BR'); });
  var AV = { width: 26, height: 26, fontSize: 11.5 };

  function plural(n, s, p) { return n + ' ' + (n === 1 ? s : p); }
  function noPeriodo(e, per) {
    if (per === 'hoje') return e.em.slice(0, 10) === DIA;
    var p = PERIODOS.filter(function (x) { return x.v === per; })[0];
    return HOJE - new Date(e.em) <= p.dias * 864e5;
  }
  function falha(e) { return e.quem === 'sistema' && /falh|\b[45]\d\d\b/i.test(e.acao); }
  function inicial(qs, ok, def) { var v = SA.qs(qs); return v && ok(v) ? v : def; }

  function Quem(p) {
    var e = p.e, a = AG_NOME[e.nome], av, papel;
    if (e.quem === 'admin') { av = h('span', { className: 'sa-me-av', 'aria-hidden': true, style: AV }, e.nome.charAt(0)); papel = 'Super Admin'; }
    else if (a) { av = h(HS.Agent, { agent: a.forma, size: 26 }); papel = 'Agente · ' + a.papel; }
    else if (e.quem === 'sistema') { av = h('span', { className: 'sa-biz', 'aria-hidden': true, style: Object.assign({ borderRadius: 8 }, AV) }, h(SA.Icon, { name: SIS_IC[e.nome] || 'cog', size: 15 })); papel = 'Sistema'; }
    else { av = h('span', { className: 'sa-biz', 'aria-hidden': true, style: Object.assign({ borderRadius: '50%' }, AV) }, e.nome.charAt(0)); papel = 'Cliente'; }
    return h('div', { className: 'sa-cell-a' }, av, h('div', { className: 'sa-cell-m' }, h('b', { style: { fontSize: 13.5 } }, e.nome), h('small', null, papel)));
  }

  function App() {
    var qS = useState(function () { return inicial('quem', function (v) { return ['admin', 'cliente', 'sistema'].indexOf(v) >= 0; }, 'todos'); }), quem = qS[0], setQuem = qS[1];
    var cS = useState(function () { return inicial('conta', function (v) { return v === 'plataforma' || CONTA[v]; }, 'todas'); }), conta = cS[0], setConta = cS[1];
    var tS = useState(function () { return inicial('tipo', function (v) { return TIPOS.indexOf(v) >= 0; }, 'todos'); }), tipo = tS[0], setTipo = tS[1];
    var pS = useState('30d'), per = pS[0], setPer = pS[1];

    var rows = EV.filter(function (e) {
      if (quem !== 'todos' && e.quem !== quem) return false;
      if (conta === 'plataforma' ? e.conta : conta !== 'todas' && e.conta !== conta) return false;
      if (tipo !== 'todos' && e.tipo !== tipo) return false;
      return noPeriodo(e, per);
    });
    var filtrado = quem !== 'todos' || conta !== 'todas' || tipo !== 'todos' || per !== '30d';
    function limpar() { setQuem('todos'); setConta('todas'); setTipo('todos'); setPer('30d'); }

    var hoje = EV.filter(function (e) { return e.em.slice(0, 10) === DIA; });
    function de(l, q) { return l.filter(function (e) { return e.quem === q; }).length; }
    var mes = EV.filter(function (e) { return noPeriodo(e, '30d'); });
    var suporte = mes.filter(function (e) { return e.tipo === 'Acesso do suporte'; });
    var falhas = mes.filter(falha), ult = suporte[0];

    var cols = [
      { k: 'em', l: 'Quando', nw: true, render: function (e) { return h('span', { className: 'sa-mono' }, fmt.dt(e.em)); } },
      { k: 'quem', l: 'Quem', nw: true, render: function (e) { return h(Quem, { e: e }); } },
      { k: 'conta', l: 'Conta', nw: true, render: function (e) {
        return e.conta && CONTA[e.conta] ? h('a', { className: 'sa-rowlink', href: 'conta.html?id=' + e.conta }, CONTA[e.conta].marca) : h('span', { className: 'sa-mut' }, 'Plataforma');
      } },
      { k: 'tipo', l: 'Tipo', nw: true, render: function (e) { return h('span', { className: 'sa-chip' }, e.tipo); } },
      { k: 'acao', l: 'Ação', render: function (e) { return h('div', { className: 'sa-cell-m' }, h('b', null, e.acao), h('small', null, e.det)); } }
    ];

    return h(SA.Page, { nav: 'auditoria', title: 'Auditoria',
      desc: 'Cobrança, extrato, acesso do suporte, memória confirmada, aprovações, configuração e prompts, de quem quer que tenha feito. Filtre por quem, conta, tipo e período.',
      actions: h(HS.Button, { variant: 'ghost', size: 's', onClick: function () { SA.toast('Demonstração: ' + plural(rows.length, 'evento exportado', 'eventos exportados') + ' em CSV, com os filtros atuais.'); } }, 'Exportar CSV') },
      h(SA.Metrics, { items: [
        { l: 'Eventos hoje', v: String(hoje.length), d: de(hoje, 'admin') + ' do Super Admin · ' + de(hoje, 'cliente') + ' de clientes · ' + de(hoje, 'sistema') + ' do sistema' },
        { l: 'Do Super Admin', v: String(de(mes, 'admin')), d: 'em 30 dias · ' + de(hoje, 'admin') + ' hoje' },
        { l: 'Acessos de suporte', v: String(suporte.length), d: ult ? (CONTA[ult.conta] ? CONTA[ult.conta].marca + ', ' : '') + fmt.dt(ult.em) + ' · com motivo' : 'nenhum em 30 dias' },
        { l: 'Falhas do sistema', v: String(falhas.length), d: h(React.Fragment, null, falhas.filter(function (e) { return e.em.slice(0, 10) === DIA; }).length + ' hoje · ', h('a', { href: 'fila.html' }, 'ver a fila de trabalhos')) }
      ] }),
      h(SA.Note, { label: 'Regra', style: { marginTop: 16 } },
        h('b', null, 'Nada é apagado. '), 'Cada ação do Super Admin vira evento, inclusive entrar no ambiente do cliente, sempre com conta e motivo. Clientes e sistema também deixam registro: aprovações, memória, extrato e execuções.'),
      h(SA.Card, { title: 'Eventos', sub: rows.length === EV.length ? plural(EV.length, 'evento', 'eventos') : rows.length + ' de ' + plural(EV.length, 'evento', 'eventos'), flush: true,
        actions: filtrado ? h(HS.Button, { variant: 'ghost', size: 's', onClick: limpar }, 'Limpar filtros') : null },
        h('div', { className: 'sa-tool', style: { padding: '4px 20px 12px' } },
          h(HS.Segmented, { options: QUEM.map(function (q) { return q[0]; }), value: QUEM.filter(function (q) { return q[1] === quem; })[0][0], itemWidth: 116, label: 'Quem',
            onChange: function (l) { setQuem(QUEM.filter(function (q) { return q[0] === l; })[0][1]); } }),
          /* os três seletores andam juntos: se faltar largura, descem como grupo, alinhados à direita */
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' } },
            h(SA.Dropdown, { prefix: 'Conta', value: conta, onChange: setConta, title: 'Conta', right: true,
              options: [{ v: 'todas', l: 'Todas' }, { v: 'plataforma', l: 'Plataforma' }].concat(
              (CONTA[conta] && CONTAS_EV.indexOf(conta) < 0 ? CONTAS_EV.concat([conta]) : CONTAS_EV).map(function (id) { return { v: id, l: CONTA[id].marca }; })) }),
            h(SA.Dropdown, { prefix: 'Tipo', value: tipo, onChange: setTipo, title: 'Tipo', right: true,
              options: [{ v: 'todos', l: 'Todos' }].concat(TIPOS.map(function (t) { return { v: t, l: t }; })) }),
            h(SA.Dropdown, { prefix: 'Período', value: per, onChange: setPer, title: 'Período', right: true,
              options: PERIODOS.map(function (p) { return { v: p.v, l: p.l }; }) }))),
        h(SA.Table, { cols: cols, rows: rows, rowKey: 'k', caption: 'Eventos de auditoria',
          empty: h('span', null, tipo === 'Cobrança' ? 'Nenhum evento de cobrança: os pagamentos entram na Fase 2. ' : 'Nenhum evento com esses filtros. ',
            h('button', { type: 'button', className: 'sa-rowlink', style: { border: 0, background: 'none', cursor: 'pointer', padding: 0, font: 'inherit', fontWeight: 700 }, onClick: limpar }, 'Limpar filtros')) })));
  }
  SA.render(App);
})();
