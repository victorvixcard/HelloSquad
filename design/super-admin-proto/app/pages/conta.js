/* Conta: detalhe de um cliente. Entrar no ambiente do cliente (motivo obrigatório, tempo limitado, auditado),
   ajustar crédito com motivo, suspender ou reativar. Tudo aqui é demonstração: muda o estado da página. */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, HS = SA.HS, D = SA.D, fmt = SA.fmt;
  var useState = React.useState;
  var PLANO = { free: 'Free', 'pro-mensal': 'Pro mensal', 'pro-anual': 'Pro anual' };
  var PAPEL = { owner: 'Dono', admin: 'Admin', editor: 'Editor', viewer: 'Leitura' };
  var IDIOMA = { 'pt-BR': 'Português (BR)', es: 'Espanhol', en: 'Inglês' };
  var ESTADO = { ativa: ['done', 'Ativa'], 'primeiro-acesso': ['prog', 'Primeiro acesso'], suspensa: ['pause', 'Suspensa'] };

  /* extrato fictício: itemizado para a Miolo (fecha com o saldo); para as outras, ciclo + entregas dos últimos 30 dias */
  function extrato(c) {
    var plano = D.planos.filter(function (p) { return p.id === c.plano; })[0];
    var L;
    if (c.id === 'miolo') {
      L = [
        { em: '2026-10-16T08:41', t: 'Legendas do Dia Mundial do Pão', s: 'Otto · 04.01', v: -3 },
        { em: '2026-10-15T17:20', t: 'Roteiro de reels: fornada de sexta', s: 'Otto · 04.03', v: -6 },
        { em: '2026-10-15T10:05', t: 'Pauta da semana 42', s: 'Otto · 04.02', v: -10 },
        { em: '2026-10-14T16:12', t: 'Indicadores da semana', s: 'Íris · 07.01', v: -4 },
        { em: '2026-10-13T09:30', t: 'Plano de marketing de outubro', s: 'Bia · 02.03', v: -15 },
        { em: '2026-10-12T18:00', t: '33 entregas de 01/10 a 12/10', s: 'Otto, Bia e Íris', v: -176 },
        { em: '2026-10-08T11:14', t: 'Recarga 100 (simulada, sem cobrança)', s: 'Asaas · demonstração', v: 100 },
        { em: '2026-10-01T00:05', t: 'Créditos do ciclo · Pro mensal', s: 'ciclo de outubro', v: 300 }
      ];
    } else if (c.estado === 'suspensa') {
      L = [];
    } else {
      L = [];
      if (c.uso.creditos) L.push({ em: D.hoje, t: c.uso.trabalhos + ' entregas nos últimos 30 dias', s: 'consumo agregado', v: -c.uso.creditos });
      var dia = c.desde.slice(8, 10);
      var ciclo = c.desde > '2026-09-16' ? c.desde : (Number(dia) <= 16 ? '2026-10-' : '2026-09-') + dia;
      L.push({ em: ciclo + 'T00:05', t: 'Créditos do ciclo · ' + plano.nome, s: 'provisório', v: plano.creditos });
    }
    var saldo = c.creditos;
    return L.map(function (x) { var r = Object.assign({ saldo: saldo }, x); saldo -= x.v; return r; }).concat(L.length ? [{ em: null, t: 'Saldo anterior', s: '', v: null, saldo: saldo }] : []);
  }

  function App() {
    var id = SA.qs('id') || 'miolo';
    var base = D.contas.filter(function (x) { return x.id === id; })[0] || D.contas[0];
    var cS = useState(function () { return Object.assign({}, base); }), c = cS[0], setC = cS[1];
    var lS = useState(function () { return extrato(base); }), ledger = lS[0], setLedger = lS[1];
    var acc = D.auditoria.filter(function (e) { return e.conta === c.id && e.tipo === 'Acesso do suporte'; });
    var aS = useState(acc), acessos = aS[0], setAcessos = aS[1];
    var sS = useState(null), sessao = sS[0], setSessao = sS[1];
    var dS = useState(null), dlg = dS[0], setDlg = dS[1];
    var mS = useState(''), motivo = mS[0], setMotivo = mS[1];
    var tS = useState('30'), dur = tS[0], setDur = tS[1];
    var vS = useState('10'), qtd = vS[0], setQtd = vS[1];
    var u = c.uso, plano = D.planos.filter(function (p) { return p.id === c.plano; })[0];
    var owner = c.membros.filter(function (m) { return m.papel === 'owner'; })[0];
    var est = ESTADO[c.estado];
    function open(k) { setMotivo(''); setDlg(k); }
    function close() { setDlg(null); }
    var motivoOk = motivo.trim().length >= 10;

    function entrar() {
      var fim = new Date(new Date(D.hoje).getTime() + Number(dur) * 60000);
      var ate = (fim.getHours() < 10 ? '0' : '') + fim.getHours() + ':' + (fim.getMinutes() < 10 ? '0' : '') + fim.getMinutes();
      var ev = { em: D.hoje, quem: 'admin', nome: 'Vic', conta: c.id, tipo: 'Acesso do suporte', acao: 'Entrou no ambiente do cliente', det: 'Motivo: ' + motivo.trim() + ' Sessão de ' + dur + ' min.' };
      setAcessos([ev].concat(acessos)); setSessao({ ate: ate, motivo: motivo.trim() }); close();
      SA.toast('Sessão de suporte na ' + c.marca + ' aberta por ' + dur + ' min. Registrada na auditoria.');
    }
    function ajustar() {
      var n = parseInt(qtd, 10) || 0;
      setC(Object.assign({}, c, { creditos: c.creditos + n }));
      setLedger([{ em: D.hoje, t: 'Ajuste manual: ' + motivo.trim(), s: 'Vic · Super Admin', v: n, saldo: c.creditos + n }].concat(ledger)); close();
      SA.toast('Crédito ajustado em ' + (n > 0 ? '+' : '') + n + '. Registrado na auditoria.');
    }
    function suspender() {
      var on = c.estado !== 'suspensa';
      setC(Object.assign({}, c, { estado: on ? 'suspensa' : 'ativa', suspensa: on ? { em: D.hoje, motivo: motivo.trim() } : null })); close();
      SA.toast(on ? 'Conta suspensa. Os dados ficam preservados.' : 'Conta reativada.');
    }

    var n = parseInt(qtd, 10) || 0;
    return h(SA.Page, { nav: 'contas', crumbs: [{ l: 'Contas', href: 'contas.html' }, { l: c.marca }], title: c.marca,
      avatar: h('span', { className: 'sa-biz is-l', 'aria-hidden': true }, c.marca.charAt(0)),
      desc: c.negocio + ' · ' + c.cidade + ' · cliente desde ' + fmt.date(c.desde),
      actions: [
        h(HS.Button, { key: 'a', variant: 'ghost', size: 's', onClick: function () { open('ajuste'); } }, 'Ajustar crédito'),
        h(HS.Button, { key: 's', variant: 'ghost', size: 's', onClick: function () { open('suspender'); } }, c.estado === 'suspensa' ? 'Reativar conta' : 'Suspender conta'),
        h(HS.Button, { key: 'e', variant: 'primary', size: 's', disabled: c.estado === 'suspensa' || !!sessao, onClick: function () { open('entrar'); } }, 'Entrar no ambiente do cliente')
      ] },
      sessao ? h(SA.Note, { kind: 'warn', label: 'Suporte', style: { marginBottom: 16, alignItems: 'center' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' } },
          h('span', null, h('b', null, 'Sessão de suporte ativa até ' + sessao.ate + '. '), 'Motivo: ' + sessao.motivo + ' Neste protótipo, a sessão não abre o produto.'),
          h(HS.Button, { variant: 'soft', size: 's', onClick: function () { setSessao(null); SA.toast('Sessão encerrada. Registrada na auditoria.'); } }, 'Encerrar sessão'))) : null,
      c.estado === 'suspensa' && c.suspensa ? h(SA.Note, { kind: 'warn', label: 'Suspensa', style: { marginBottom: 16 } },
        h('span', null, h('b', null, 'Conta suspensa em ' + fmt.date(c.suspensa.em) + '. '), 'Motivo: ' + c.suspensa.motivo + ' Ninguém da conta acessa os agentes; nada foi apagado.')) : null,
      h(SA.Metrics, { items: [
        { l: 'Plano', v: PLANO[c.plano], d: plano.creditos + ' créditos por ciclo', tag: h(HS.Tag, { kind: 'sim' }, 'Provisório') },
        { l: 'Saldo de créditos', v: fmt.int(c.creditos), d: u.creditos ? fmt.int(u.creditos) + ' cobrados em 30 dias' : 'nenhum crédito cobrado em 30 dias' },
        { l: 'Membros', v: fmt.int(c.membros.length), d: owner ? owner.nome + ' é quem decide' : '' },
        { l: 'Idioma', v: c.idioma, d: IDIOMA[c.idioma] },
        { l: 'Estado', v: est[1], d: c.tipo === 'PF' ? 'Pessoa física' : 'Pessoa jurídica' }
      ] }),
      h('div', { className: 'sa-row c21', style: { marginTop: 16 } },
        h('div', null,
          h(SA.Card, { title: 'Membros', sub: 'só o dono aprova entregas e autoriza ações externas' },
            h('div', { style: { margin: '0 -20px -18px' } }, h(SA.Table, { caption: 'Membros da conta', rowKey: 'email', rows: c.membros, cols: [
              { k: 'nome', l: 'Pessoa', render: function (m) { return h('div', { className: 'sa-cell-m' }, h('b', null, m.nome), h('small', null, m.email)); } },
              { k: 'papel', l: 'Papel', nw: true, render: function (m) { return m.papel === 'owner' ? h(HS.Tag, { kind: 'you' }, 'Dono · decide') : h(HS.Tag, { kind: 'auto' }, PAPEL[m.papel]); } },
              { k: 'ultimo', l: 'Último acesso', nw: true, render: function (m) { return h('span', { className: 'sa-mono' }, fmt.dt(m.ultimo)); } }
            ] }))),
          h(SA.Card, { title: 'Extrato de créditos', sub: 'nada é apagado; ajuste manual leva motivo' },
            ledger.length ? h('div', { style: { margin: '0 -20px -18px' } }, h(SA.Table, { caption: 'Extrato de créditos', rowKey: 't', rows: ledger.map(function (x, i) { return Object.assign({ k: i }, x); }), cols: [
              { k: 'em', l: 'Quando', nw: true, render: function (x) { return h('span', { className: 'sa-mono' }, x.em ? fmt.dt(x.em) : '—'); } },
              { k: 't', l: 'Lançamento', render: function (x) { return h('div', { className: 'sa-cell-m' }, h('b', { style: { fontWeight: x.v == null ? 500 : 700 } }, x.t), x.s ? h('small', null, x.s) : null); } },
              { k: 'v', l: 'Créditos', r: true, render: function (x) { return x.v == null ? '' : h('b', { className: 'sa-num' }, (x.v > 0 ? '+' : '') + fmt.int(x.v)); } },
              { k: 'saldo', l: 'Saldo', r: true, render: function (x) { return h('span', { className: 'sa-num' }, fmt.int(x.saldo)); } }
            ] })) : h(SA.Empty, { title: 'Sem lançamentos no período' }, 'A conta está suspensa desde ' + fmt.date(c.suspensa && c.suspensa.em) + '; o ciclo não renova enquanto isso.'))),
        h('div', null,
          h(SA.Card, { title: 'Acessos do suporte', sub: acessos.length ? acessos.length + ' registro' + (acessos.length > 1 ? 's' : '') : 'nenhum' },
            acessos.length ? h('ul', { className: 'sa-list' }, acessos.map(function (e, i) {
              return h('li', { key: i, className: 'sa-li' }, h('span', { className: 'sa-me-av', 'aria-hidden': true, style: { width: 28, height: 28, fontSize: 12 } }, 'V'),
                h('span', { className: 'sa-li-t' }, h('b', null, e.nome + ' · ' + fmt.dt(e.em)), h('small', null, e.det)));
            })) : h('p', { className: 'sa-mut', style: { fontSize: 13.5 } }, 'Ninguém do suporte entrou no ambiente desta conta.')),
          h(SA.Card, { title: 'Uso nos últimos 30 dias', actions: h('a', { className: 'sa-rowlink', href: 'consumo.html', style: { fontSize: 13 } }, 'Ver consumo') },
            h('dl', { className: 'sa-kv' },
              h('dt', null, 'Trabalhos'), h('dd', { className: 'sa-num' }, fmt.int(u.trabalhos)),
              h('dt', null, 'Turnos de conversa'), h('dd', { className: 'sa-num' }, fmt.int(u.turnos)),
              h('dt', null, 'Chamadas de IA'), h('dd', { className: 'sa-num' }, fmt.int(u.chamadas)),
              h('dt', null, 'Custo de IA'), h('dd', { className: 'sa-num' }, fmt.usd(u.custo) + ' · ' + fmt.brl(u.custoBRL)),
              h('dt', null, 'Parte da conversa'), h('dd', { className: 'sa-num' }, u.custo ? fmt.pct(u.conversa) + ' do custo' : '—'),
              h('dt', null, 'IA por crédito'), h('dd', { className: 'sa-num' }, u.iaPorCredito != null ? fmt.brl(u.iaPorCredito) : '—'))),
          c.teste ? h(SA.Note, { label: 'Teste', style: { marginTop: 16 } }, c.teste + ' (docs/DADOS_FICTICIOS.md)') : null)),

      /* entrar no ambiente do cliente: motivo obrigatório e tempo limitado */
      h(SA.Dialog, { open: dlg === 'entrar', onClose: close, title: 'Entrar no ambiente da ' + c.marca,
        desc: 'Abre uma sessão de suporte com tempo limitado. Conta, motivo e duração ficam na auditoria, e o dono da conta vê o registro.',
        footer: [
          h('span', { key: 'n', className: 'sa-grow' }, motivoOk ? 'Pronto para registrar.' : 'Escreva o motivo (10 caracteres ou mais).'),
          h(HS.Button, { key: 'c', variant: 'ghost', size: 's', onClick: close }, 'Cancelar'),
          h(HS.Button, { key: 'e', variant: 'primary', size: 's', disabled: !motivoOk, onClick: entrar }, 'Entrar com o motivo registrado')
        ] },
        h('div', { className: 'sa-form' },
          h(SA.Field, { id: 'ent-motivo', label: 'Motivo do acesso', hint: 'Exemplo: conferir o erro de publicação no Instagram pedido pela dona da conta.' },
            h('textarea', { id: 'ent-motivo', className: 'sa-inp', rows: 3, value: motivo, 'data-autofocus': true, onChange: function (e) { setMotivo(e.target.value); }, style: { minHeight: 92 } })),
          h(SA.Field, { label: 'Duração da sessão' },
            h(HS.Segmented, { label: 'Duração da sessão', options: ['15', '30', '60'], value: dur, onChange: setDur, itemWidth: 64 }),
            h('small', null, 'minutos; a sessão fecha sozinha no fim')))),

      h(SA.Dialog, { open: dlg === 'ajuste', onClose: close, title: 'Ajustar crédito da ' + c.marca,
        desc: 'Use para devolver crédito de uma falha ou corrigir um lançamento. O ajuste entra no extrato com o motivo.',
        footer: [
          h('span', { key: 'n', className: 'sa-grow sa-num' }, 'Saldo: ' + fmt.int(c.creditos) + ' → ' + fmt.int(c.creditos + n)),
          h(HS.Button, { key: 'c', variant: 'ghost', size: 's', onClick: close }, 'Cancelar'),
          h(HS.Button, { key: 'e', variant: 'primary', size: 's', icon: null, disabled: !motivoOk || !n, onClick: ajustar }, 'Lançar ajuste')
        ] },
        h('div', { className: 'sa-form c2' },
          h(SA.Field, { id: 'aj-qtd', label: 'Créditos', hint: 'Negativo para retirar.' },
            h('input', { id: 'aj-qtd', className: 'sa-inp is-num', type: 'number', step: 1, value: qtd, 'data-autofocus': true, onChange: function (e) { setQtd(e.target.value); } })),
          h('div'),
          h(SA.Field, { id: 'aj-motivo', label: 'Motivo', style: { gridColumn: '1 / -1' } },
            h('textarea', { id: 'aj-motivo', className: 'sa-inp', rows: 2, value: motivo, onChange: function (e) { setMotivo(e.target.value); }, style: { minHeight: 76 } })))),

      h(SA.Dialog, { open: dlg === 'suspender', onClose: close, title: (c.estado === 'suspensa' ? 'Reativar a ' : 'Suspender a ') + c.marca,
        desc: c.estado === 'suspensa' ? 'Os membros voltam a acessar os agentes e o ciclo de créditos volta a renovar.' : 'Os membros perdem o acesso aos agentes e as rotinas param. Nada é apagado; dá para reativar depois.',
        footer: [
          h(HS.Button, { key: 'c', variant: 'ghost', size: 's', onClick: close }, 'Cancelar'),
          h(HS.Button, { key: 'e', variant: 'primary', size: 's', icon: null, disabled: !motivoOk, onClick: suspender }, c.estado === 'suspensa' ? 'Reativar conta' : 'Suspender conta')
        ] },
        h(SA.Field, { id: 'sus-motivo', label: 'Motivo', hint: 'Fica na auditoria e no histórico da conta.' },
          h('textarea', { id: 'sus-motivo', className: 'sa-inp', rows: 3, value: motivo, 'data-autofocus': true, onChange: function (e) { setMotivo(e.target.value); }, style: { minHeight: 92 } }))));
  }
  SA.render(App);
})();
