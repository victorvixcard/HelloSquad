/* Pagamentos (Fase 2, fatia SA6): Asaas e Mercado Pago atrás do adaptador único PaymentProvider (ADR-0008).
   "Estado atual" mostra a verdade de hoje: contas dos provedores não criadas, nada a listar.
   "Demonstração" mostra dados de exemplo para ver a tela funcionando, sem nenhuma cobrança real. */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, HS = SA.HS, D = SA.D, fmt = SA.fmt;
  var useState = React.useState;

  var PG = D.pagamentos, HOJE = D.hoje.slice(0, 10);
  var MODOS = ['Estado atual', 'Demonstração'];
  var PLANO = { free: 'Free', 'pro-mensal': 'Pro mensal', 'pro-anual': 'Pro anual' };
  var EST_PROV = { 'conta-nao-criada': ['block', 'Conta não criada'] };
  var CHAVE = { ausente: 'Ausente', configurada: 'Configurada' };
  var EST_ASS = { ativa: ['done', 'Ativa'], atrasada: ['you', 'Atrasada'] };
  var EST_REC = { paga: ['done', 'Paga'], pendente: ['prog', 'Pendente'], estornada: ['pause', 'Estornada', 'back'] };
  var EST_WH = { processado: ['done', 'Processado'], 'duplicado ignorado': ['pause', 'Duplicado ignorado', null], falhou: ['fail', 'Falhou'], fila: ['prog', 'Na fila'] };
  var PROV = {}, CONTA = {}, RECARGA = {};
  D.provedores.forEach(function (p) { PROV[p.id] = p; });
  D.contas.forEach(function (c) { CONTA[c.id] = c; });
  D.recargas.forEach(function (r) { RECARGA[r.id] = r; });
  var PROVS = ['asaas', 'mercadopago'].map(function (id) { return PROV[id]; }).filter(Boolean);
  var BTN_LINK = { border: 0, background: 'none', padding: 0, margin: 0, cursor: 'pointer', font: 'inherit' };

  function plural(n, s, p) { return n + ' ' + (n === 1 ? s : p); }
  function marca(id) { return CONTA[id] ? CONTA[id].marca : id; }
  function negocio(id) { return CONTA[id] ? CONTA[id].negocio : ''; }
  function dias(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }
  function St(p) { var e = p.map[p.v] || ['prog', p.v]; return h(SA.Status, { kind: e[0], glyph: e.length > 2 ? e[2] : undefined, s: p.s }, e[1]); }
  function Conta(p) {
    var c = CONTA[p.id];
    if (!c) return h('span', { className: 'sa-mut' }, '—');
    return h('a', { className: 'sa-rowlink', href: 'conta.html?id=' + c.id }, c.marca);
  }
  function Exemplo() { return h(HS.Tag, { kind: 'sim' }, 'Exemplo'); }
  /* o que explica a divergência do dia: assinatura atrasada ou recarga não paga naquela data */
  function divergenciasDe(dia) {
    var out = [];
    PG.assinaturas.forEach(function (a) { if (a.proxima === dia && a.estado === 'atrasada') out.push(PLANO[a.plano] + ' de ' + marca(a.conta) + ' em atraso'); });
    PG.recargas.forEach(function (r) { if (r.em.slice(0, 10) === dia && r.estado !== 'paga') out.push((RECARGA[r.pacote] || { nome: r.pacote }).nome + ' de ' + marca(r.conta) + ' ' + r.estado); });
    return out;
  }

  function ProvedorCard(p) {
    var pv = p.pv, st = EST_PROV[pv.estado] || ['block', pv.estado];
    return h(SA.Card, { id: 'pv-' + pv.id, title: pv.nome, sub: 'Assinaturas e recargas', actions: h(SA.Status, { kind: st[0] }, st[1]) },
      h('dl', { className: 'sa-kv' },
        h('dt', null, 'Conta no provedor'), h('dd', null, 'Ainda não criada'),
        h('dt', null, 'Chave de API'), h('dd', null, CHAVE[pv.chave] || pv.chave, h('small', { className: 'sa-mut', style: { fontWeight: 500 } }, ' · o painel mostra só configurada ou ausente, nunca o segredo')),
        h('dt', null, 'Webhook'), h('dd', null, 'Não configurado'),
        h('dt', null, 'Ambiente'), h('dd', null, 'Sandbox na Fase 2'),
        h('dt', null, 'Integração'), h('dd', null, 'Adaptador único ', h('span', { className: 'sa-mono' }, 'PaymentProvider'), ' (ADR-0008)'),
        h('dt', null, 'A validar'), h('dd', null, 'Pix recorrente e cartão recorrente')));
  }

  function App() {
    var tabS = SA.useHashTab('assinaturas', ['assinaturas', 'recargas', 'webhooks', 'conciliacao']), tab = tabS[0], setTab = tabS[1];
    var mS = useState(MODOS[0]), modo = mS[0], setModo = mS[1];
    var pvS = useState('todos'), prov = pvS[0], setProv = pvS[1];
    var ctS = useState('todas'), conta = ctS[0], setConta = ctS[1];
    var whS = useState(function () { return PG.webhooks.map(function (w, i) { return Object.assign({ k: 'wh' + i }, w); }); }), whs = whS[0], setWhs = whS[1];
    var ccS = useState({}), conc = ccS[0], setConc = ccS[1];
    var dgS = useState(null), dlg = dgS[0], setDlg = dgS[1];
    var moS = useState(''), motivo = moS[0], setMotivo = moS[1];
    var demo = modo === MODOS[1];

    function filtra(r) { return (prov === 'todos' || r.provedor === prov) && (conta === 'todas' || r.conta === conta); }
    var ass = PG.assinaturas.filter(filtra), recs = PG.recargas.filter(filtra), whf = whs.filter(filtra);
    var atrasadas = PG.assinaturas.filter(function (a) { return a.estado === 'atrasada'; }).length;
    var falhas = whs.filter(function (w) { return w.estado === 'falhou'; }).length;
    var abertas = PG.conciliacao.filter(function (c) { return c.divergencias > 0 && !conc[c.dia]; }).length;
    var contasPg = [];
    PG.assinaturas.concat(PG.recargas, PG.webhooks).forEach(function (r) { if (contasPg.indexOf(r.conta) < 0) contasPg.push(r.conta); });
    contasPg.sort(function (a, b) { return marca(a).localeCompare(marca(b), 'pt-BR'); });

    function reprocessar(w) {
      setWhs(function (l) { return l.map(function (x) { return x.k === w.k ? Object.assign({}, x, { estado: 'fila' }) : x; }); });
      SA.toast('Demonstração: ' + w.id + ' voltou para a fila com o mesmo id do evento.');
    }
    function conciliar() {
      var d = dlg;
      setConc(function (o) { var n = Object.assign({}, o); n[d.dia] = { motivo: motivo.trim() }; return n; });
      setDlg(null); setMotivo('');
      SA.toast('Demonstração: ' + fmt.date(d.dia) + ' marcado como conciliado. O motivo vai para a auditoria.');
    }

    var filtros = h('div', { className: 'sa-tool', style: { marginBottom: 12 } },
      h(SA.Dropdown, { prefix: 'Provedor', value: prov, onChange: setProv, title: 'Provedor',
        options: [{ v: 'todos', l: 'Todos' }].concat(PROVS.map(function (p) { return { v: p.id, l: p.nome }; })) }),
      h(SA.Dropdown, { prefix: 'Conta', value: conta, onChange: setConta, title: 'Conta',
        options: [{ v: 'todas', l: 'Todas' }].concat(contasPg.map(function (id) { return { v: id, l: marca(id) }; })) }),
      prov !== 'todos' || conta !== 'todas' ? h(HS.Button, { variant: 'ghost', size: 's', onClick: function () { setProv('todos'); setConta('todas'); } }, 'Limpar filtros') : null);
    var vazioFiltro = h('span', null, 'Nada com esses filtros. ', h('button', { type: 'button', className: 'sa-rowlink', style: BTN_LINK, onClick: function () { setProv('todos'); setConta('todas'); } }, 'Limpar filtros'));
    function verDemo() { return h(HS.Button, { variant: 'soft', size: 's', onClick: function () { setModo(MODOS[1]); } }, 'Ver a demonstração'); }

    var colsAss = [
      { k: 'conta', l: 'Conta', render: function (a) { return h('div', { className: 'sa-cell-m' }, h(Conta, { id: a.conta }), h('small', null, negocio(a.conta))); } },
      { k: 'plano', l: 'Plano', nw: true, render: function (a) { return h('span', { className: 'sa-chip' }, PLANO[a.plano]); } },
      { k: 'provedor', l: 'Provedor', nw: true, render: function (a) { return (PROV[a.provedor] || { nome: a.provedor }).nome; } },
      { k: 'estado', l: 'Estado', nw: true, render: function (a) { return h(St, { map: EST_ASS, v: a.estado }); } },
      { k: 'proxima', l: 'Próxima cobrança', nw: true, render: function (a) {
        var atraso = a.estado === 'atrasada' ? dias(a.proxima, HOJE) : 0;
        return h('div', { className: 'sa-cell-m' }, h('span', { className: 'sa-mono' }, fmt.date(a.proxima)), atraso > 0 ? h('small', null, plural(atraso, 'dia', 'dias') + ' de atraso') : null);
      } },
      { k: 'valor', l: 'Valor', r: true, render: function (a) { return h('b', { className: 'sa-num' }, fmt.brl(a.valor)); } },
      { k: 'metodo', l: 'Método', nw: true, render: function (a) { return a.metodo; } }
    ];
    var colsRec = [
      { k: 'conta', l: 'Conta', render: function (r) { return h('div', { className: 'sa-cell-m' }, h(Conta, { id: r.conta }), h('small', null, negocio(r.conta))); } },
      { k: 'pacote', l: 'Pacote', nw: true, render: function (r) { return h('span', { className: 'sa-chip' }, (RECARGA[r.pacote] || { nome: r.pacote }).nome); } },
      { k: 'provedor', l: 'Provedor', nw: true, render: function (r) { return (PROV[r.provedor] || { nome: r.provedor }).nome; } },
      { k: 'em', l: 'Quando', nw: true, render: function (r) { return h('span', { className: 'sa-mono' }, fmt.dt(r.em)); } },
      { k: 'valor', l: 'Valor', r: true, render: function (r) { return h('b', { className: 'sa-num' }, fmt.brl(r.valor)); } },
      { k: 'estado', l: 'Estado', nw: true, render: function (r) { return h(St, { map: EST_REC, v: r.estado }); } }
    ];
    var colsWh = [
      { k: 'em', l: 'Quando', nw: true, render: function (w) { return h('span', { className: 'sa-mono' }, fmt.dt(w.em)); } },
      { k: 'provedor', l: 'Provedor', nw: true, render: function (w) { return (PROV[w.provedor] || { nome: w.provedor }).nome; } },
      { k: 'evento', l: 'Evento e id do evento', render: function (w) {
        return h('div', { className: 'sa-cell-m' }, h('span', { className: 'sa-mono', style: { fontWeight: 500, color: 'var(--hs-tinta)' } }, w.evento),
          h('small', { className: 'sa-mono', style: { fontSize: 11.5 } }, w.id), w.erro && w.estado === 'falhou' ? h('small', null, w.erro) : null);
      } },
      { k: 'conta', l: 'Conta', nw: true, render: function (w) { return h(Conta, { id: w.conta }); } },
      { k: 'tentativas', l: 'Tentativas', r: true, render: function (w) { return h('span', { className: 'sa-num' }, w.tentativas); } },
      { k: 'estado', l: 'Estado', nw: true, render: function (w) {
        return h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 } }, h(St, { map: EST_WH, v: w.estado }),
          w.estado === 'falhou' ? h(HS.Button, { variant: 'soft', size: 's', onClick: function () { reprocessar(w); } }, 'Reprocessar') : null);
      } }
    ];
    var colsConc = [
      { k: 'dia', l: 'Dia', nw: true, render: function (c) { return h('span', { className: 'sa-mono' }, fmt.date(c.dia)); } },
      { k: 'esperado', l: 'Esperado', r: true, render: function (c) { return h('span', { className: 'sa-num' }, fmt.brl(c.esperado)); } },
      { k: 'recebido', l: 'Recebido', r: true, render: function (c) { return h('b', { className: 'sa-num' }, fmt.brl(c.recebido)); } },
      { k: 'dif', l: 'Diferença', r: true, render: function (c) { var d = c.recebido - c.esperado; return h('span', { className: 'sa-num' + (d ? '' : ' sa-mut') }, d ? fmt.brl(d) : '—'); } },
      { k: 'div', l: 'Divergências', render: function (c) {
        var feito = conc[c.dia];
        if (!c.divergencias) return h(SA.Status, { kind: 'done', s: true }, 'Conciliado');
        if (feito) return h('div', { className: 'sa-cell-m', style: { alignItems: 'flex-start', gap: 4 } }, h(SA.Status, { kind: 'done', s: true }, 'Conciliado à mão'), h('small', null, 'Motivo: ' + feito.motivo));
        return h('div', { className: 'sa-cell-m', style: { alignItems: 'flex-start', gap: 4 } }, h(SA.Status, { kind: 'you', s: true }, plural(c.divergencias, 'divergência', 'divergências')),
          h('small', null, divergenciasDe(c.dia).join(' · ') || 'Sem explicação automática'));
      } },
      { k: 'acao', l: 'Ação', nw: true, r: true, render: function (c) {
        if (!c.divergencias || conc[c.dia]) return null;
        return h(HS.Button, { variant: 'soft', size: 's', onClick: function () { setMotivo(''); setDlg(c); } }, 'Marcar como conciliado');
      } }
    ];

    var painel;
    if (tab === 'assinaturas') {
      painel = h(SA.Card, { title: 'Assinaturas', sub: demo ? plural(PG.assinaturas.length, 'assinatura', 'assinaturas') + ' · ' + plural(atrasadas, 'atrasada', 'atrasadas') : 'nenhuma ainda', actions: demo ? h(Exemplo) : null, flush: demo },
        demo ? h(React.Fragment, null, h('div', { style: { padding: '4px 20px 0' } }, filtros),
          h(SA.Table, { cols: colsAss, rows: ass, rowKey: 'conta', caption: 'Assinaturas (demonstração)', empty: vazioFiltro })) :
          h(SA.Empty, { title: 'Nenhuma assinatura ainda', actions: verDemo() },
            'As contas no Asaas e no Mercado Pago não existem, então nenhuma assinatura foi criada nem cobrada. Os planos que as contas usam hoje são simulados, sem cobrança.'));
    } else if (tab === 'recargas') {
      painel = h(SA.Card, { title: 'Recargas avulsas', sub: demo ? plural(PG.recargas.length, 'compra', 'compras') : 'nenhuma ainda', actions: demo ? h(Exemplo) : null, flush: demo },
        demo ? h(React.Fragment, null, h('div', { style: { padding: '4px 20px 0' } }, filtros),
          h(SA.Table, { cols: colsRec, rows: recs, rowKey: 'em', caption: 'Recargas avulsas (demonstração)', empty: vazioFiltro })) :
          h(SA.Empty, { title: 'Nenhuma recarga paga', actions: verDemo() },
            'Recarga avulsa só é vendida com o preço aprovado e o provedor ligado. Até lá, crédito extra entra por ajuste manual na conta, sempre com motivo.'));
    } else if (tab === 'webhooks') {
      painel = h(React.Fragment, null,
        h(SA.Note, { label: 'Idempotência' }, 'Cada evento é aplicado uma vez só, pela chave ', h('b', null, 'id do evento'), '. Se o mesmo id chega de novo, fica registrado como duplicado ignorado e não credita nem cobra outra vez. Reprocessar usa o mesmo id: o que já foi aplicado não se repete.'),
        h(SA.Card, { title: 'Webhooks recebidos', sub: demo ? plural(whs.length, 'evento', 'eventos') + ' · ' + plural(falhas, 'com falha', 'com falha') : 'nenhum ainda', actions: demo ? h(Exemplo) : null, flush: demo },
          demo ? h(React.Fragment, null, h('div', { style: { padding: '4px 20px 0' } }, filtros),
            h(SA.Table, { cols: colsWh, rows: whf, rowKey: 'k', caption: 'Webhooks recebidos (demonstração)', empty: vazioFiltro })) :
            h(SA.Empty, { title: 'Nenhum webhook recebido', actions: verDemo() },
              'O endereço de webhook é configurado no provedor depois de criar a conta. Cada evento vai ficar registrado aqui com o id do provedor e o número de tentativas.')));
    } else {
      painel = h(SA.Card, { title: 'Conciliação por dia', sub: demo ? (abertas ? plural(abertas, 'dia com divergência', 'dias com divergência') : 'tudo conciliado') : 'nada para conciliar', actions: demo ? h(Exemplo) : null, flush: demo },
        demo ? h(SA.Table, { cols: colsConc, rows: PG.conciliacao, rowKey: 'dia', caption: 'Conciliação por dia (demonstração)' }) :
          h(SA.Empty, { title: 'Nada para conciliar', actions: verDemo() },
            'A conciliação compara, por dia, o que era esperado (assinaturas e recargas) com o que o provedor confirmou. Começa com o primeiro pagamento real.'));
    }

    return h(SA.Page, { nav: 'pagamentos', title: 'Pagamentos',
      desc: 'Assinaturas, recargas, webhooks e conciliação, por provedor. Entra na Fase 2, com sandbox; hoje as contas no Asaas e no Mercado Pago ainda não existem.' },
      h('div', { className: 'sa-row c2' }, PROVS.map(function (pv) { return h(ProvedorCard, { key: pv.id, pv: pv }); })),
      h('div', { className: 'sa-tabs-w', style: { marginTop: 22 } },
        h(SA.Tabs, { label: 'Pagamentos', idp: 'pg', panel: 'pg-painel', value: tab, onChange: setTab, tabs: [
          { id: 'assinaturas', l: 'Assinaturas', badge: demo && atrasadas ? atrasadas : null, hot: true },
          { id: 'recargas', l: 'Recargas' },
          { id: 'webhooks', l: 'Webhooks', badge: demo && falhas ? falhas : null, hot: true },
          { id: 'conciliacao', l: 'Conciliação', badge: demo && abertas ? abertas : null, hot: true }] }),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          h('span', { className: 'sa-lbl', 'aria-hidden': true }, 'Dados'),
          h(HS.Segmented, { options: MODOS, value: modo, onChange: setModo, itemWidth: 132, label: 'Dados mostrados' }))),
      demo ? h(SA.Note, { kind: 'draft', label: 'Demonstração', style: { marginBottom: 16 } },
        h('b', null, 'Nenhuma cobrança real. '), 'Dados de exemplo para ver a tela funcionando; as contas dos provedores ainda não existem e os valores não são preços aprovados.') : null,
      h(SA.TabPanel, { id: 'pg-painel', idp: 'pg', value: tab }, painel),
      h(SA.Dialog, { open: !!dlg, onClose: function () { setDlg(null); }, title: dlg ? 'Marcar ' + fmt.date(dlg.dia) + ' como conciliado' : '',
        desc: 'Use quando a divergência já foi explicada fora do painel. O motivo fica na auditoria com o seu nome.',
        footer: [
          h('span', { key: 'n', className: 'sa-grow' }, 'Demonstração: nada é gravado neste protótipo.'),
          h(HS.Button, { key: 'c', variant: 'ghost', size: 's', onClick: function () { setDlg(null); } }, 'Cancelar'),
          h(HS.Button, { key: 's', variant: 'primary', size: 's', icon: null, disabled: motivo.trim().length < 5, onClick: conciliar }, 'Marcar como conciliado')
        ] },
        dlg ? h(React.Fragment, null,
          h('dl', { className: 'sa-kv', style: { marginBottom: 14 } },
            h('dt', null, 'Esperado'), h('dd', { className: 'sa-num' }, fmt.brl(dlg.esperado)),
            h('dt', null, 'Recebido'), h('dd', { className: 'sa-num' }, fmt.brl(dlg.recebido)),
            h('dt', null, 'Divergência'), h('dd', null, divergenciasDe(dlg.dia).join(' · ') || plural(dlg.divergencias, 'item', 'itens'))),
          h(SA.Field, { id: 'pg-motivo', label: 'Motivo', hint: 'Obrigatório. Ex.: recarga paga fora do provedor, conferida no extrato.' },
            h('textarea', { id: 'pg-motivo', className: 'sa-inp', rows: 3, value: motivo, onChange: function (e) { setMotivo(e.target.value); }, style: { minHeight: 88 } }))) : null));
  }
  SA.render(App);
})();
