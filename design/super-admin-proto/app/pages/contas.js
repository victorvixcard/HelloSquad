/* Contas: quem usa o HelloSquad. Cartões, busca e filtros, tabela; a linha abre o detalhe (conta.html). */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, HS = SA.HS, D = SA.D, fmt = SA.fmt;
  var useState = React.useState;
  var PLANO = { free: 'Free', 'pro-mensal': 'Pro mensal', 'pro-anual': 'Pro anual' };
  var ESTADO = { ativa: ['done', 'Ativa'], 'primeiro-acesso': ['prog', 'Primeiro acesso'], suspensa: ['pause', 'Suspensa'] };
  var IDIOMA = { 'pt-BR': 'Português (BR)', es: 'Espanhol', en: 'Inglês' };

  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function App() {
    var qS = useState(''), q = qS[0], setQ = qS[1];
    var pS = useState('todos'), plano = pS[0], setPlano = pS[1];
    var eS = useState('todos'), estado = eS[0], setEstado = eS[1];
    var contas = D.contas;
    var pagos = contas.filter(function (c) { return c.plano !== 'free'; });
    var mensal = pagos.filter(function (c) { return c.plano === 'pro-mensal'; }).length;
    var free = contas.filter(function (c) { return c.plano === 'free'; });
    var saldo = contas.reduce(function (s, c) { return s + c.creditos; }, 0);
    var baixos = pagos.filter(function (c) { return c.creditos < 30; });

    var rows = contas.filter(function (c) {
      if (plano !== 'todos' && c.plano !== plano) return false;
      if (estado !== 'todos' && c.estado !== estado) return false;
      if (!q.trim()) return true;
      var hay = norm([c.marca, c.negocio, c.cidade, c.id].concat(c.membros.map(function (m) { return m.nome + ' ' + m.email; })).join(' '));
      return hay.indexOf(norm(q.trim())) >= 0;
    });

    var cols = [
      { k: 'marca', l: 'Negócio', render: function (c) {
        return h('div', { className: 'sa-cell-a' }, h('span', { className: 'sa-biz', 'aria-hidden': true }, c.marca.charAt(0)),
          h('div', { className: 'sa-cell-m' }, h('a', { className: 'sa-rowlink', href: 'conta.html?id=' + c.id }, c.marca), h('small', null, c.negocio + ' · ' + c.cidade)));
      } },
      { k: 'tipo', l: 'Tipo', nw: true, render: function (c) { return h('span', { className: 'sa-mono' }, c.tipo); } },
      { k: 'plano', l: 'Plano', nw: true, render: function (c) { return h('span', { className: 'sa-chip' }, PLANO[c.plano]); } },
      { k: 'creditos', l: 'Créditos', r: true, render: function (c) {
        var low = c.plano !== 'free' && c.creditos < 30;
        return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, low ? h(SA.Status, { kind: 'you', s: true, title: 'Saldo baixo para um plano pago' }, 'baixo') : null, h('b', { className: 'sa-num' }, fmt.int(c.creditos)));
      } },
      { k: 'desde', l: 'Desde', nw: true, render: function (c) { return h('span', { className: 'sa-mono' }, fmt.date(c.desde)); } },
      { k: 'membros', l: 'Membros', render: function (c) {
        var owner = c.membros.filter(function (m) { return m.papel === 'owner'; })[0];
        return h('div', { className: 'sa-cell-m' }, h('span', null, c.membros.length === 1 ? '1 membro' : c.membros.length + ' membros'), owner ? h('small', null, owner.nome + ' (dono)') : null);
      } },
      { k: 'idioma', l: 'Idioma', nw: true, render: function (c) { return h('span', { className: 'sa-mono', title: IDIOMA[c.idioma] }, c.idioma); } },
      { k: 'estado', l: 'Estado', nw: true, render: function (c) { var e = ESTADO[c.estado]; return h(SA.Status, { kind: e[0] }, e[1]); } }
    ];

    return h(SA.Page, { nav: 'contas', title: 'Contas',
      desc: 'Quem usa o HelloSquad: negócio, plano, saldo de créditos, membros e idioma. Abra a conta para ajustar crédito, suspender ou entrar no ambiente do cliente, sempre com motivo e auditoria.' },
      h(SA.Metrics, { items: [
        { l: 'Contas', v: fmt.int(contas.length), d: '3 da base de testes e ' + (contas.length - 3) + ' inventadas' },
        { l: 'Planos ativos', v: fmt.int(pagos.length), d: mensal + ' Pro mensal · ' + (pagos.length - mensal) + ' Pro anual' },
        { l: 'Free', v: fmt.int(free.length), d: free.filter(function (c) { return c.estado === 'suspensa'; }).length + ' suspensa · ' + free.filter(function (c) { return c.estado === 'primeiro-acesso'; }).length + ' em primeiro acesso' },
        { l: 'Créditos em saldo', v: fmt.int(saldo), d: baixos.length ? baixos.length + ' plano pago com saldo baixo' : 'nenhum saldo baixo', tag: h(HS.Tag, { kind: 'sim' }, 'Provisório') }
      ] }),
      h(SA.Card, { title: 'Todas as contas', sub: rows.length === contas.length ? contas.length + ' contas' : rows.length + ' de ' + contas.length + ' contas', style: { marginTop: 16 } },
        h('div', { className: 'sa-tool', style: { marginBottom: 12 } },
          h(SA.Search, { value: q, onChange: setQ, placeholder: 'Buscar por negócio, cidade, pessoa ou e-mail', label: 'Buscar contas' }),
          h(SA.Dropdown, { prefix: 'Plano', value: plano, onChange: setPlano, title: 'Plano',
            options: [{ v: 'todos', l: 'Todos' }, { v: 'free', l: 'Free' }, { v: 'pro-mensal', l: 'Pro mensal' }, { v: 'pro-anual', l: 'Pro anual' }] }),
          h(SA.Dropdown, { prefix: 'Estado', value: estado, onChange: setEstado, title: 'Estado', right: true,
            options: [{ v: 'todos', l: 'Todos' }, { v: 'ativa', l: 'Ativa' }, { v: 'primeiro-acesso', l: 'Primeiro acesso' }, { v: 'suspensa', l: 'Suspensa' }] })),
        h('div', { style: { margin: '0 -20px -18px' } },
          h(SA.Table, { cols: cols, rows: rows, caption: 'Contas do HelloSquad', onRow: function (c) { location.href = 'conta.html?id=' + c.id; },
            empty: h('span', null, 'Nenhuma conta com esses filtros. ', h('button', { type: 'button', className: 'sa-rowlink', style: { border: 0, background: 'none', cursor: 'pointer', padding: 0 }, onClick: function () { setQ(''); setPlano('todos'); setEstado('todos'); } }, 'Limpar filtros')) }))));
  }
  SA.render(App);
})();
