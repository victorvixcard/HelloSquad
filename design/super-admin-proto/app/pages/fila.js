/* Fila de trabalhos: os runs das filas pgmq (runs_interactive, com prioridade, e runs_scheduled) com estado, tentativas,
   posse (lease) e último erro. Reenfileirar e cancelar mudam só o estado desta tela e avisam que é demonstração;
   abrir o run mostra os dados e os passos (roteiro de exemplo de SA.D.passosRun, o mesmo para todos os runs). */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, HS = SA.HS, D = SA.D, Q = SA.Q, fmt = SA.fmt;
  var useState = React.useState;
  var MAX = 3;
  var ESTADO = { queued: ['prog', 'Na fila'], running: ['prog', 'Rodando'], waiting_approval: ['you', 'Aguarda aprovação'], failed: ['fail', 'Falhou'], succeeded: ['done', 'Concluído'], cancelled: ['pause', 'Cancelado'] };
  var CARA = { queued: 'oval', running: 'oval', waiting_approval: 'big', failed: 'serio', succeeded: 'happy', cancelled: 'sleep' };
  var TIPO = { interactive: 'interativo', scheduled: 'agendado' };
  var FILA = { interactive: 'runs_interactive', scheduled: 'runs_scheduled' };
  var KIND = { llm_call: 'Chamada de IA', tool_call: 'Ferramenta', check: 'Verificação', wait: 'Espera' };
  var PASSO = { succeeded: ['done', 'Concluído'], running: ['prog', 'Rodando'], failed: ['fail', 'Falhou'], waiting: ['you', 'Aguarda aprovação'], stopped: ['pause', 'Interrompido'] };
  /* fictício: o que o status vivo diz de cada run rodando */
  var FALA = { run_8f2c1a: 'Otto escrevendo as legendas', run_8f2bd4: 'Bia montando o plano do trimestre', run_8f2b77: 'Íris conferindo o relatório' };
  var ABAS = [
    { id: 'tudo', l: 'Tudo', f: function () { return true; } },
    { id: 'fila', l: 'Na fila', f: function (r) { return r.estado === 'queued'; } },
    { id: 'rodando', l: 'Rodando', f: function (r) { return r.estado === 'running'; } },
    { id: 'aprovacao', l: 'Aguardando aprovação', f: function (r) { return r.estado === 'waiting_approval'; } },
    { id: 'falharam', l: 'Falharam', f: function (r) { return r.estado === 'failed'; }, hot: true },
    { id: 'fim', l: 'Concluídos/cancelados', f: function (r) { return r.estado === 'succeeded' || r.estado === 'cancelled'; } }
  ];
  var CONTA = {}; D.contas.forEach(function (c) { CONTA[c.id] = c; });
  var NOME = {}; Q.deliveries.forEach(function (d) { NOME[d.id] = d.nome; });

  function duas(a, b) { return h(React.Fragment, null, a, h('br'), b); }
  function dur(ms) { return ms == null ? '—' : ms < 1000 ? fmt.int(ms) + ' ms' : fmt.dec(ms / 1000, 1) + ' s'; }

  /* passos de exemplo: o roteiro de SA.D.passosRun até a etapa do run, com o último passo no estado do run (fictício).
     Etapas depois do roteiro (revisar, publicar, concluir) ganham um passo final com os dados do próprio run. */
  var ETAPA = { triagem: 1, produzir: 3, autoverificar: 4 };
  function passos(r) {
    if (r.estado === 'queued') return [];
    var base = D.passosRun.map(function (s) { return Object.assign({}, s, { st: 'succeeded', ms: s.ms || 6400 }); }); // 6.400 ms: autoverificação concluída (fictício)
    var i = ETAPA[r.etapa];
    if (i == null) {
      var fim = {
        revisar: { k: 'wait', t: 'aprovação do dono da conta', d: 'só o dono aprova, pede ajuste ou cancela', ms: null, st: 'waiting' },
        publicar: { k: 'tool_call', t: 'publicar no canal', d: r.erro || 'publicação confirmada pela plataforma', ms: null, st: r.estado === 'failed' ? 'failed' : 'succeeded' },
        concluir: { k: 'check', t: 'entrega registrada no trabalho', d: 'versão aprovada guardada', ms: 40, st: 'succeeded' }
      }[r.etapa];
      return fim ? base.concat([fim]) : base;
    }
    var l = base.slice(0, i + 1), ult = l[i];
    if (r.estado === 'running') { ult.st = 'running'; ult.ms = null; }
    else if (r.estado === 'failed') { ult.st = 'failed'; ult.d = r.erro; ult.ms = null; }
    else if (r.estado === 'cancelled') { ult.st = 'stopped'; ult.d = r.erro || 'cancelado'; ult.ms = null; }
    return l;
  }

  function RunDialog(p) {
    var r = p.run, a = SA.ag(r.agente), c = CONTA[r.conta], e = ESTADO[r.estado], ps = passos(r);
    var acao = r.estado === 'failed' ? h(HS.Button, { key: 'a', variant: 'primary', size: 's', icon: null, onClick: function () { p.onRequeue(r); } }, 'Reenfileirar')
      : (r.estado === 'queued' || r.estado === 'running') ? h(HS.Button, { key: 'a', variant: 'soft', size: 's', onClick: function () { p.onCancel(r); } }, 'Cancelar o run') : null;
    var dados = [
      ['Estado', h(SA.Status, { kind: e[0], s: true }, e[1])],
      ['Conta', h('a', { className: 'sa-rowlink', href: 'conta.html?id=' + r.conta }, c.marca)],
      ['Tipo', TIPO[r.tipo] + ' · fila ' + FILA[r.tipo]],
      ['Etapa', r.etapa],
      ['Tentativas', h('span', { className: 'sa-mono' }, r.tentativa + ' de ' + MAX)],
      ['Criado', h('span', { className: 'sa-mono' }, fmt.dt(r.criado))],
      ['Posse até', r.posseAte ? h('span', null, h('span', { className: 'sa-mono' }, fmt.hm(r.posseAte)), ' · o worker renova enquanto roda') : '—'],
      ['Último erro', r.erro || 'Nenhum']
    ];
    if (r.reenfileirado) dados.push(['Reenfileirado', 'às ' + fmt.hm(r.reenfileirado) + ', pelo Super Admin (demonstração)']);
    return h(SA.Dialog, { open: true, wide: true, onClose: p.onClose, agent: a.forma, title: r.trabalho,
      desc: h(React.Fragment, null, h('span', { className: 'sa-mono' }, r.id), ' · ', a.name, ' · ', r.delivery, ' ', NOME[r.delivery]),
      footer: [
        h('span', { key: 'n', className: 'sa-grow' }, 'Demonstração: as ações mudam só esta tela.'),
        h(HS.Button, { key: 'f', variant: 'ghost', size: 's', onClick: p.onClose }, 'Fechar'),
        acao
      ] },
      h('dl', { className: 'sa-kv', style: { gridTemplateColumns: '120px minmax(0,1fr)' } }, dados.map(function (d) {
        return h(React.Fragment, { key: d[0] }, h('dt', null, d[0]), h('dd', null, d[1]));
      })),
      h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, margin: '20px 0 4px' } },
        h('h3', { style: { fontSize: 15, fontWeight: 800 } }, 'Passos'),
        h('small', { style: { fontSize: 12.5, color: 'var(--hs-tinta-suave)' } }, ps.length ? 'tentativa ' + Math.max(r.tentativa, 1) + ' de ' + MAX + ' · roteiro de exemplo, o mesmo para todos os runs; no produto, vem de run_steps' : '')),
      ps.length ? h('ol', { className: 'sa-list' }, ps.map(function (s, i) {
        var ps2 = PASSO[s.st];
        return h('li', { key: i, className: 'sa-li', style: { alignItems: 'flex-start' } },
          h('span', { className: 'sa-chip', style: { flex: 'none', width: 112, justifyContent: 'center' } }, KIND[s.k]),
          h('span', { className: 'sa-li-t' }, h('b', null, s.t), h('small', null, s.d)),
          h('span', { className: 'sa-mono', style: { flex: 'none', width: 64, textAlign: 'right', paddingTop: 4 } }, dur(s.ms)),
          h('span', { style: { flex: 'none', width: 150, display: 'flex', justifyContent: 'flex-end' } }, h(SA.Status, { kind: ps2[0], s: true }, ps2[1])));
      })) : h(SA.Empty, { agent: a.forma, title: r.reenfileirado ? 'De volta à fila' : 'Ainda na fila' },
        'O run começa quando um worker pegar a mensagem em ' + FILA[r.tipo] + '. Na fila desde ' + fmt.hm(r.reenfileirado || r.criado) + '.'));
  }

  function CancelDialog(p) {
    var r = p.run, c = CONTA[r.conta];
    var mS = useState(''), motivo = mS[0], setMotivo = mS[1];
    function confirmar() { if (motivo.trim()) p.onConfirm(r, motivo.trim()); }
    return h(SA.Dialog, { open: true, onClose: p.onClose, title: 'Cancelar o run?',
      desc: h(React.Fragment, null, h('span', { className: 'sa-mono' }, r.id), ' · ' + r.trabalho + ', de ' + c.marca + '. ' +
        (r.estado === 'running' ? 'O run para no passo atual e não volta sozinho para a fila.' : 'O run sai da fila e não volta sozinho.')),
      footer: [
        h('span', { key: 'n', className: 'sa-grow' }, 'Demonstração: muda só esta tela.'),
        h(HS.Button, { key: 'v', variant: 'ghost', size: 's', onClick: p.onClose }, 'Voltar'),
        h(HS.Button, { key: 'c', variant: 'primary', size: 's', icon: null, disabled: !motivo.trim(), onClick: confirmar }, 'Cancelar o run')
      ] },
      h(SA.Field, { id: 'cancelar-motivo', label: 'Motivo', hint: 'Fica na auditoria junto com o run.' },
        h('input', { id: 'cancelar-motivo', className: 'sa-inp', value: motivo, autoComplete: 'off', placeholder: 'Ex.: pedido em duplicidade',
          onChange: function (e) { setMotivo(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); confirmar(); } } })),
      h('p', { style: { marginTop: 12, fontSize: 13, lineHeight: 1.5, color: 'var(--hs-tinta-suave)' } },
        'Cobrar ou não créditos em cancelamento ainda é uma decisão pendente em ', h('a', { href: 'regras.html' }, 'Regras de negócio'), '.'));
  }

  /* Tabela composta: o SA.Table não tem sub-linha. Mesmas classes da casca (sa-tblw, sa-tbl); o último erro vai numa
     linha própria logo abaixo do run, na largura das colunas, para caber a 1280 sem rolagem lateral. As duas linhas
     do mesmo run respondem juntas ao passar o mouse e ao clique. */
  function Erro(p) {
    var r = p.r, falhou = r.estado === 'failed';
    return h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 12.5, lineHeight: 1.45, color: falhou ? 'var(--hs-tinta)' : 'var(--hs-tinta-suave)' } },
      h('span', { className: 'sa-lbl', style: { flex: 'none' } }, r.estado === 'cancelled' ? 'Motivo' : 'Último erro'),
      h('span', null, r.erro || '—', r.reenfileirado ? h('b', { style: { color: 'var(--hs-tinta)' } }, ' Reenfileirado às ' + fmt.hm(r.reenfileirado) + '.') : null));
  }
  function RunsTable(p) {
    var hS = useState(null), hov = hS[0], setHov = hS[1];
    var n = p.cols.length;
    function cls(c) { return [c.r && 'is-r', c.nw && 'is-nw'].filter(Boolean).join(' ') || undefined; }
    /* células internas com 10 px de lado (a casca usa 12): a tabela é densa e precisa caber a 1280 */
    function pad(i, extra) { return Object.assign({ paddingLeft: i === 0 ? 20 : 10, paddingRight: i === n - 1 ? 20 : 10 }, extra); }
    var body = [];
    p.rows.forEach(function (r) {
      var temErro = !!(r.erro || r.reenfileirado);
      var ev = { className: 'is-click', style: hov === r.id ? { background: 'var(--hs-papel)' } : undefined,
        onMouseEnter: function () { setHov(r.id); }, onMouseLeave: function () { setHov(null); },
        onClick: function (e) { if (e.target.closest('a,button')) return; p.onRow(r); } };
      body.push(h('tr', Object.assign({ key: r.id }, ev), p.cols.map(function (c, i) {
        return h('td', { key: c.k, className: cls(c), style: pad(i, temErro ? { borderBottom: 0, paddingBottom: 6 } : null) }, c.render(r));
      })));
      if (temErro) body.push(h('tr', Object.assign({ key: r.id + '-e' }, ev),
        h('td', { style: pad(0, { paddingTop: 0 }) }), h('td', { colSpan: n - 1, style: pad(n - 1, { paddingTop: 0, paddingLeft: 10 }) }, h(Erro, { r: r }))));
    });
    return h('div', { className: 'sa-tblw' }, h('table', { className: 'sa-tbl' },
      h('caption', { className: 'sa-sr' }, p.caption),
      h('thead', null, h('tr', null, p.cols.map(function (c, i) { return h('th', { key: c.k, scope: 'col', className: cls(c), style: pad(i) }, c.l); }))),
      h('tbody', null, body.length ? body : h('tr', null, h('td', { colSpan: n, className: 'sa-tbl-empty' }, p.empty)))));
  }

  function App() {
    var rS = useState(function () { return D.runs.slice(); }), runs = rS[0], setRuns = rS[1];
    var tb = SA.useHashTab('tudo', ABAS.map(function (a) { return a.id; })), aba = tb[0], setAba = tb[1];
    var oS = useState(null), abertoId = oS[0], setAberto = oS[1];
    var cS = useState(null), cancelId = cS[0], setCancel = cS[1];
    function byId(id) { return runs.filter(function (r) { return r.id === id; })[0]; }
    function conta(est) { return runs.filter(function (r) { return r.estado === est; }); }

    function muda(id, patch) {
      var next = runs.map(function (r) { return r.id === id ? Object.assign({}, r, patch) : r; });
      setRuns(next);
      D.runs = next; // a contagem da barra lateral acompanha esta tela durante a visita; nada é gravado
    }
    function reenfileirar(r) {
      muda(r.id, { estado: 'queued', tentativa: 0, posseAte: null, reenfileirado: D.hoje });
      SA.toast('Demonstração: ' + r.id + ' voltou para a fila com ' + MAX + ' tentativas novas.', SA.ag(r.agente).forma);
    }
    function cancelar(r, motivo) {
      muda(r.id, { estado: 'cancelled', posseAte: null, erro: 'Cancelado pelo Super Admin: ' + motivo });
      setCancel(null);
      SA.toast('Demonstração: ' + r.id + ' cancelado. O motivo fica na auditoria.', SA.ag(r.agente).forma);
    }
    function pedirCancelamento(r) { setAberto(null); setCancel(r.id); }

    var fila = conta('queued'), rod = conta('running'), apr = conta('waiting_approval'), fal = conta('failed');
    var lead = rod[0], la = lead && SA.ag(lead.agente);
    var mais = fila.slice().sort(function (a, b) { return (a.reenfileirado || a.criado) < (b.reenfileirado || b.criado) ? -1 : 1; })[0];
    var tab = ABAS.filter(function (a) { return a.id === aba; })[0];
    var rows = runs.filter(tab.f);

    var cols = [
      { k: 'id', l: 'Run', nw: true, render: function (r) {
        return h('div', { className: 'sa-cell-m' }, h('span', { className: 'sa-mono', style: { fontSize: 12 } }, r.id), h('small', null, TIPO[r.tipo]));
      } },
      { k: 'trabalho', l: 'Trabalho', render: function (r) {
        return h('div', { className: 'sa-cell-m', style: { minWidth: 100 } }, h('b', null, r.trabalho),
          h('small', null, h('span', { className: 'sa-mono', style: { fontSize: 11.5 } }, r.delivery), ' ' + NOME[r.delivery]));
      } },
      { k: 'conta', l: 'Conta', render: function (r) { return h('a', { className: 'sa-rowlink', href: 'conta.html?id=' + r.conta }, CONTA[r.conta].marca); } },
      { k: 'agente', l: 'Agente', nw: true, render: function (r) {
        var a = SA.ag(r.agente);
        return h(HS.StatePill, { agent: a.forma, label: a.name, detail: r.etapa, thinking: r.estado === 'running', expression: CARA[r.estado] });
      } },
      { k: 'estado', l: duas('Estado', 'tentativas'), nw: true, render: function (r) {
        var e = ESTADO[r.estado];
        return h('div', { className: 'sa-cell-m', style: { alignItems: 'flex-start', gap: 4 } }, h(SA.Status, { kind: e[0], s: true }, e[1]),
          h('span', { className: 'sa-mono', style: { fontSize: 11.5, color: 'var(--hs-tinta-suave)' } }, r.tentativa + ' de ' + MAX, h('span', { className: 'sa-sr' }, ' tentativas')));
      } },
      { k: 'criado', l: duas('Criado', 'posse até'), nw: true, render: function (r) {
        return h('div', { className: 'sa-cell-m', style: { gap: 4 } }, h('span', { className: 'sa-mono' }, fmt.hm(r.criado)),
          r.posseAte ? h('span', { className: 'sa-mono', style: { fontSize: 11.5, color: 'var(--hs-tinta-suave)' } }, h('span', { className: 'sa-sr' }, 'posse até '), fmt.hm(r.posseAte))
            : h('span', { className: 'sa-mono', style: { fontSize: 11.5, color: 'var(--hs-tinta-suave)' } }, h('span', { 'aria-hidden': true }, '—'), h('span', { className: 'sa-sr' }, 'sem posse')));
      } },
      { k: 'acoes', l: h('span', { className: 'sa-sr' }, 'Ações'), r: true, render: function (r) {
        return h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
          r.estado === 'failed' ? h(HS.Button, { variant: 'soft', size: 's', onClick: function () { reenfileirar(r); } }, 'Reenfileirar') : null,
          r.estado === 'queued' || r.estado === 'running' ? h(HS.Button, { variant: 'ghost', size: 's', onClick: function () { setCancel(r.id); } }, 'Cancelar') : null,
          h(HS.IconButton, { icon: 'right', label: 'Abrir o run ' + r.id, variant: 'ghost', onClick: function () { setAberto(r.id); } }));
      } }
    ];

    var status = lead ? h(HS.SquadStatus, { kind: 'work', lead: la.forma, message: FALA[lead.id] || la.name + ' trabalhando', detail: CONTA[lead.conta].marca + ' · ' + lead.id, time: fmt.hm(D.hoje), minWidth: 480 })
      : h(HS.SquadStatus, { kind: 'idle', message: 'Nenhum run rodando agora', time: fmt.hm(D.hoje), minWidth: 480 });

    return h(SA.Page, { nav: 'fila', title: 'Fila de trabalhos', actions: status,
      desc: 'Os runs das filas: na fila, rodando, aguardando aprovação e os que falharam. Reenfileire, cancele ou abra o run para ver os passos.' },
      h(SA.Metrics, { items: [
        { l: 'Na fila', v: fmt.int(fila.length), d: mais ? 'o mais antigo espera desde ' + fmt.hm(mais.reenfileirado || mais.criado) : 'fila vazia' },
        { l: 'Rodando', v: fmt.int(rod.length), d: rod.length ? (function () { var n = rod.filter(function (r) { return r.tentativa > 1; }).length; return n ? (n === 1 ? '1 em nova tentativa' : n + ' em nova tentativa') : 'todos na primeira tentativa'; })() : 'nenhum agora' },
        { l: 'Aguardando aprovação', v: fmt.int(apr.length), d: apr.length ? 'a decisão é do dono da conta' : 'nenhum' },
        { l: 'Falharam', v: fmt.int(fal.length), kind: fal.length ? 'you' : undefined, d: fal.length ? 'tentativas esgotadas; reenfileire ou abra o run' : 'nenhuma falha' }
      ] }),
      h(SA.Card, { title: 'Runs', sub: 'hoje, ' + fmt.date(D.hoje) + ' · ' + runs.length + ' runs', style: { marginTop: 16 } },
        h('div', { style: { marginBottom: 12 } },
          h(SA.Tabs, { label: 'Filtrar runs por estado', idp: 'fila', panel: 'fila-painel', value: aba, onChange: setAba,
            tabs: ABAS.map(function (a) { var n = runs.filter(a.f).length; return { id: a.id, l: a.l, badge: n, hot: a.hot && n > 0 }; }) })),
        h('div', { style: { margin: '0 -20px -18px' } },
          h(SA.TabPanel, { id: 'fila-painel', idp: 'fila', value: aba },
            h(RunsTable, { cols: cols, rows: rows, caption: 'Runs: ' + tab.l.toLowerCase(), onRow: function (r) { setAberto(r.id); },
              empty: tab.id === 'falharam' ? 'Nenhum run falhou.' : 'Nenhum run neste estado.' })))),
      h(SA.Note, { label: 'Como funciona', style: { marginTop: 16 } },
        h('span', null, 'Cada run entra numa fila pgmq na mesma transação que o cria: ', h('span', { className: 'sa-mono' }, 'runs_interactive'), ' tem prioridade sobre ',
          h('span', { className: 'sa-mono' }, 'runs_scheduled'), '. O worker pega o run e fica com a posse por 120 s, renovada enquanto ele roda; se o worker cai, a posse expira e outro worker retoma. ',
          'Falha passageira volta para a fila: até ', MAX, ' tentativas, com espera crescente entre elas (5 s, depois 10 s). Depois disso, o run falha e fica aqui.')),
      abertoId ? h(RunDialog, { run: byId(abertoId), onClose: function () { setAberto(null); }, onRequeue: reenfileirar, onCancel: pedirCancelamento }) : null,
      cancelId ? h(CancelDialog, { run: byId(cancelId), onClose: function () { setCancel(null); }, onConfirm: cancelar }) : null);
  }
  SA.render(App);
})();
