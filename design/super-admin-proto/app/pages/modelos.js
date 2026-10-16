/* Modelos e custos: Custos (30 dias, por cliente), Regras por tarefa (modelo e esforço por etapa, lidos do
   agent.yaml de cada agente) e Preços e câmbio (tabela de pricing.py e cotação do dólar).
   Abas com hash: modelos.html#custos, #regras, #precos. Gravar é demonstração: muda o estado local e avisa. */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, HS = SA.HS, D = SA.D, fmt = SA.fmt;
  var useState = React.useState;
  var HOJE = D.hoje.slice(0, 10);
  var OFF = { opacity: 0.45, cursor: 'not-allowed' };
  var PLANO = { free: 'Free', 'pro-mensal': 'Pro mensal', 'pro-anual': 'Pro anual' };
  var TABS = [{ id: 'custos', l: 'Custos' }, { id: 'regras', l: 'Regras por tarefa' }, { id: 'precos', l: 'Preços e câmbio' }];
  var ETAPAS = [['triagem', 'Triagem'], ['padrao', 'Padrão'], ['imagem', 'Imagem'], ['relatorios_recorrentes', 'Relatórios recorrentes']];
  var EDITAVEIS = ['triagem', 'padrao', 'effort'];
  var ESFORCO = ['low', 'medium', 'high'].map(function (v) { return { v: v, l: v }; });
  /* Como MODEL_PROFILES (apps/backend/src/hellosquad/llm/anthropic_client.py): o Haiku 4.5 não aceita esforço e
     pensa por orçamento; a triagem passa TRIAGE_THINKING_BUDGET = 1024 (squad/flow.py). Os outros: adaptive. */
  var POR_ORCAMENTO = { 'claude-haiku-4-5': true };
  var CAMPOS = [['entrada', 'Entrada'], ['saida', 'Saída'], ['cacheLido', 'Cache lido'], ['cacheEscrito', 'Cache escrito']];

  function put(o, k, v) { var r = Object.assign({}, o); r[k] = v; return r; }
  function pl(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
  /* número digitado em pt-BR ("5,40"; aceita "5.40" sem vírgula) */
  function num(s) {
    var t = String(s).trim().replace(/\s/g, '');
    t = t.indexOf(',') >= 0 ? t.replace(/\./g, '').replace(',', '.') : t;
    return /^\d+(\.\d+)?$/.test(t) ? parseFloat(t) : NaN;
  }
  function nomeModelo(precos, id) { var p = precos.filter(function (x) { return x.id === id; })[0]; return p ? p.nome : id; }
  /* O SA.Dropdown rola só até o item marcado; perto do pé da tela, o resto do menu ficava fora. Rola o mínimo ao abrir. */
  function mostrarMenu(e) {
    var w = e.currentTarget;
    setTimeout(function () { var pop = w.querySelector('.sa-dd-pop'); if (pop) pop.scrollIntoView({ block: 'nearest' }); }, 60);
  }

  /* ================================================= Custos */
  function Custos(p) {
    var cb = p.cambio.usdbrl;
    var contas = D.contas.slice().sort(function (a, b) { return b.uso.custo - a.uso.custo; });
    var t = { chamadas: 0, entrada: 0, cache: 0, saida: 0, custo: 0 };
    contas.forEach(function (c) { var u = c.uso; t.chamadas += u.chamadas; t.entrada += u.entrada; t.cache += u.cache; t.saida += u.saida; t.custo += u.custo; });
    var cols = [
      { k: 'conta', l: 'Conta', render: function (c) {
        return h('div', { className: 'sa-cell-a' }, h('span', { className: 'sa-biz', 'aria-hidden': true }, c.marca.charAt(0)),
          h('div', { className: 'sa-cell-m' }, h('a', { className: 'sa-rowlink', href: 'conta.html?id=' + c.id }, c.marca),
            h('small', null, PLANO[c.plano] + (c.estado === 'suspensa' ? ' · suspensa' : ''))));
      } },
      { k: 'chamadas', l: 'Chamadas', r: true, render: function (c) { return fmt.int(c.uso.chamadas); } },
      { k: 'entrada', l: 'Entrada', r: true, render: function (c) { return fmt.tok(c.uso.entrada); } },
      { k: 'cache', l: 'Cache lido', r: true, render: function (c) { return fmt.tok(c.uso.cache); } },
      { k: 'saida', l: 'Saída', r: true, render: function (c) { return fmt.tok(c.uso.saida); } },
      { k: 'usd', l: 'Custo US$', r: true, render: function (c) { return h('b', null, fmt.usd(c.uso.custo)); } },
      { k: 'brl', l: 'Custo R$', r: true, render: function (c) { return fmt.brl(c.uso.custo * cb); } }
    ];
    var foot = h('tr', null,
      h('td', null, 'Total · ' + pl(contas.length, 'conta', 'contas')),
      h('td', { className: 'is-r' }, fmt.int(t.chamadas)),
      h('td', { className: 'is-r' }, fmt.tok(t.entrada)),
      h('td', { className: 'is-r' }, fmt.tok(t.cache)),
      h('td', { className: 'is-r' }, fmt.tok(t.saida)),
      h('td', { className: 'is-r' }, fmt.usd(t.custo)),
      h('td', { className: 'is-r' }, fmt.brl(t.custo * cb)));
    return h(React.Fragment, null,
      h(SA.Metrics, { items: [
        { l: 'Chamadas', v: fmt.int(t.chamadas), d: 'últimos 30 dias · ' + pl(contas.length, 'conta', 'contas') },
        { l: 'Custo total', v: fmt.usd(t.custo), d: fmt.brl(t.custo * cb) + ' pelo câmbio de ' + fmt.date(p.cambio.data), tag: h(HS.Tag, { kind: 'sim' }, 'Exemplo') },
        { l: 'Tokens de entrada', v: fmt.tok(t.entrada), d: 'fora do cache' },
        { l: 'Cache lido', v: fmt.tok(t.cache), d: fmt.pct(t.cache / (t.cache + t.entrada)) + ' da entrada veio do cache' },
        { l: 'Saída', v: fmt.tok(t.saida), d: 'tokens gerados pelos agentes' }
      ] }),
      h(SA.Card, { id: 'mc-clientes', title: 'Custo por cliente', sub: 'últimos 30 dias, pelo preço da época; reais pelo câmbio de exemplo', actions: h(HS.Tag, { kind: 'sim' }, 'Exemplo') },
        h('div', { style: { margin: '0 -20px -18px' } },
          h(SA.Table, { cols: cols, rows: contas, caption: 'Custo de IA por cliente nos últimos 30 dias', foot: foot,
            onRow: function (c) { location.href = 'conta.html?id=' + c.id; } }))),
      h(SA.Note, { label: 'Como ler' },
        'Cada chamada guarda modelo, esforço, tokens e o custo pelo preço da época. O valor em reais usa o câmbio da aba Preços e câmbio. O cliente nunca vê esta tela: crédito é trabalho entregue, nunca token.'));
  }

  /* ================================================= Regras por tarefa */
  function Regras(p) {
    var dr = p.draft, sv = p.salvo, rows = [];
    SA.agents().forEach(function (a) {
      var steps = ETAPAS.filter(function (e) { return sv[a.id][e[0]] != null; });
      steps.forEach(function (e, i) { rows.push({ a: a, k: e[0], l: e[1], first: i === 0, last: i === steps.length - 1 }); });
    });
    var opts = p.precos.map(function (x) { return { v: x.id, l: x.nome }; });

    function modelo(r, m) {
      var val = m[r.k];
      if (r.k === 'imagem') return val === 'a_homologar' ? h(SA.Status, { kind: 'block' }, 'A homologar') : h('span', { className: 'sa-mono' }, val);
      if (r.k === 'relatorios_recorrentes') return val === 'batch' ? h('span', { className: 'sa-chip' }, 'Batch API (50% do custo)') : h('span', { className: 'sa-mono' }, val);
      var o = opts.some(function (x) { return x.v === val; }) ? opts : opts.concat([{ v: val, l: val }]);
      return h('div', { role: 'group', 'aria-label': 'Modelo: ' + r.a.name + ', ' + r.l, onClickCapture: mostrarMenu },
        h(SA.Dropdown, { value: val, options: o, title: 'Modelo', onChange: function (v) { p.set(r.a.id, r.k, v); } }));
    }
    function esforco(r, m) {
      if (r.k !== 'padrao') return h('span', { className: 'sa-mut', title: r.k === 'triagem' ? 'A triagem não usa esforço.' : undefined }, '—', h('span', { className: 'sa-sr' }, ' não se aplica'));
      return h('div', { role: 'group', 'aria-label': 'Esforço: ' + r.a.name, onClickCapture: mostrarMenu },
        h(SA.Dropdown, { value: m.effort, options: ESFORCO, title: 'Esforço', right: true, onChange: function (v) { p.set(r.a.id, 'effort', v); } }),
        POR_ORCAMENTO[m.padrao] ? h('small', { style: { display: 'block', marginTop: 4, fontSize: 12, whiteSpace: 'normal', color: 'var(--hs-tinta-suave)' } }, nomeModelo(p.precos, m.padrao) + ' não aceita esforço.') : null);
    }
    function thinking(r, m) {
      if (r.k === 'triagem') return h('span', { className: 'sa-mono' }, POR_ORCAMENTO[m.triagem] ? 'budget · 1.024 tokens' : 'adaptive');
      if (r.k === 'padrao') return h('span', { className: 'sa-mono' }, POR_ORCAMENTO[m.padrao] ? 'desligado' : m.thinking);
      return h('span', { className: 'sa-mut' }, '—', h('span', { className: 'sa-sr' }, ' não se aplica'));
    }

    return h(SA.Card, { id: 'mc-regras', title: 'Modelo e esforço por etapa', sub: 'lidos do agent.yaml de cada agente · versão ' + p.versao, flush: true },
      /* tabela composta aqui (não SA.Table): o .sa-tblw rola na horizontal e cortaria o menu dos seletores */
      h('div', { className: 'sa-tblw', style: { overflow: 'visible' } },
        h('table', { className: 'sa-tbl' },
          h('caption', { className: 'sa-sr' }, 'Modelo, esforço e thinking por etapa de cada agente'),
          h('thead', null, h('tr', null, ['Agente', 'Etapa', 'Modelo', 'Esforço', 'Thinking'].map(function (c) { return h('th', { key: c, scope: 'col' }, c); }))),
          h('tbody', null, rows.map(function (r) {
            var m = dr[r.a.id], s = sv[r.a.id];
            var mudou = r.k === 'padrao' ? (m.padrao !== s.padrao || m.effort !== s.effort) : m[r.k] !== s[r.k];
            var bd = r.last ? undefined : { borderBottomColor: 'transparent' };
            var nota = r.a.notas && r.a.notas[r.k];
            return h('tr', { key: r.a.id + ':' + r.k },
              h('td', { style: bd }, r.first
                ? h('div', { className: 'sa-cell-a' }, h(HS.Agent, { agent: r.a.forma, size: 24 }), h('b', null, r.a.name))
                : h('span', { className: 'sa-sr' }, r.a.name)),
              h('td', { style: bd }, h('div', { className: 'sa-cell-m' },
                h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } }, h('b', null, r.l), mudou ? h(SA.Status, { kind: 'draft', s: true }, 'Alterado') : null),
                nota ? h('small', null, nota) : null)),
              h('td', { style: bd, className: 'is-nw' }, modelo(r, m)),
              h('td', { style: bd, className: 'is-nw' }, esforco(r, m)),
              h('td', { style: bd, className: 'is-nw' }, thinking(r, m)));
          })))),
      h('div', { className: 'sa-tool', style: { padding: '14px 20px 12px', borderTop: '1px solid var(--hs-l1)' } },
        h('span', { className: 'sa-grow', role: 'status', style: { fontSize: 13.5, color: 'var(--hs-tinta-suave)' } },
          p.mudancas ? pl(p.mudancas, 'mudança sem salvar', 'mudanças sem salvar') + '. Salvar cria a versão ' + (p.versao + 1) + '.' : 'Sem mudanças. Mudar modelo ou esforço grava uma versão nova, que fica na auditoria.'),
        h(HS.Button, { variant: 'ghost', size: 's', disabled: !p.mudancas, style: p.mudancas ? undefined : OFF, onClick: p.desfazer }, 'Desfazer alterações'),
        h(HS.Button, { variant: 'primary', size: 's', icon: null, disabled: !p.mudancas, onClick: p.salvar }, 'Salvar como versão nova')));
  }

  /* ================================================= Preços e câmbio */
  function Precos(p) {
    var eS = useState(null), ed = eS[0], setEd = eS[1]; // { id, nome, vals: { campo: texto } }
    var cb = p.cambio, v = num(p.cambioTxt);
    var valido = !isNaN(v) && v > 0 && v < 100;
    var mudouCb = valido && v !== cb.usdbrl, sujoCb = p.cambioTxt !== fmt.dec(cb.usdbrl, 2);

    function abrir(x) { var vals = {}; CAMPOS.forEach(function (c) { vals[c[0]] = fmt.dec(x[c[0]], 2); }); setEd({ id: x.id, nome: x.nome, vals: vals }); }
    var atual = ed && p.precos.filter(function (x) { return x.id === ed.id; })[0];
    var edVal = ed ? CAMPOS.every(function (c) { var n = num(ed.vals[c[0]]); return !isNaN(n) && n >= 0; }) : false;
    var edMudou = ed && edVal && CAMPOS.some(function (c) { return num(ed.vals[c[0]]) !== atual[c[0]]; });
    var edSujo = ed && CAMPOS.some(function (c) { return ed.vals[c[0]] !== fmt.dec(atual[c[0]], 2); });
    function salvarPreco() {
      var novo = {}; CAMPOS.forEach(function (c) { novo[c[0]] = num(ed.vals[c[0]]); });
      p.setPrecos(p.precos.map(function (x) { return x.id === ed.id ? Object.assign({}, x, novo, { versao: x.versao + 1, desde: HOJE }) : x; }));
      SA.toast('Demonstração: preço do ' + ed.nome + ' salvo como versão nova, a partir de ' + fmt.date(HOJE) + '. Chamadas antigas mantêm o preço da época.');
      setEd(null);
    }
    function salvarCambio() {
      p.setCambio({ usdbrl: v, data: HOJE, fonte: 'informado à mão (exemplo)', versao: cb.versao + 1 });
      p.setCambioTxt(fmt.dec(v, 2));
      SA.toast('Demonstração: câmbio salvo como versão ' + (cb.versao + 1) + ' (US$ 1 = ' + fmt.brl(v) + '). Fica na auditoria.');
    }

    var cols = [
      { k: 'nome', l: 'Modelo', render: function (x) { return h('div', { className: 'sa-cell-m' }, h('b', null, x.nome), h('small', { className: 'sa-mono' }, x.id)); } }
    ].concat(CAMPOS.map(function (c) { return { k: c[0], l: c[1], r: true, render: function (x) { return fmt.usd(x[c[0]], 2); } }; }), [
      { k: 'uso', l: 'Uso', render: function (x) { return h('span', { className: 'sa-mut' }, x.uso); } },
      { k: 'acao', l: h('span', { className: 'sa-sr' }, 'Ações'), r: true, render: function (x) {
        return h(HS.Button, { variant: 'ghost', size: 's', onClick: function () { abrir(x); } }, 'Editar', h('span', { key: 'sr', className: 'sa-sr' }, ' o preço do ' + x.nome));
      } }
    ]);

    return h(React.Fragment, null,
      h(SA.Card, { id: 'mc-precos', title: 'Preço por modelo', sub: 'US$ por milhão de tokens', actions: h(HS.Tag, { kind: 'sim' }, 'Conferida em 16/10/2026') },
        h('div', { style: { margin: '0 -20px' } }, h(SA.Table, { cols: cols, rows: p.precos, caption: 'Preço por modelo, em dólar por milhão de tokens' })),
        h(SA.Note, { label: 'Fonte', style: { marginTop: 12 } },
          'Mesma tabela de apps/backend/src/hellosquad/llm/pricing.py, conferida em 16/10/2026. Editar grava uma versão nova, válida dali em diante.')),
      h('div', { className: 'sa-row c2' },
        h(SA.Card, { id: 'mc-cambio', title: 'Câmbio', sub: 'para mostrar o custo em reais', actions: h(HS.Tag, { kind: 'sim' }, 'Exemplo') },
          h('div', { className: 'sa-met-v', style: { margin: '2px 0 14px' } }, 'US$ 1 = ' + fmt.brl(cb.usdbrl)),
          h('dl', { className: 'sa-kv' },
            h('dt', null, 'Data'), h('dd', null, fmt.date(cb.data)),
            h('dt', null, 'Fonte'), h('dd', null, cb.fonte),
            h('dt', null, 'Versão'), h('dd', null, cb.versao)),
          h(SA.Field, { id: 'mc-cambio-inp', label: 'Nova cotação (R$ por US$ 1)', style: { marginTop: 16 },
            hint: valido || !p.cambioTxt.trim() ? 'O custo em reais passa a usar esta cotação; o custo em dólar não muda.' : 'Use um número maior que zero, com vírgula nos centavos.' },
            h('div', { className: 'sa-inp-w', style: { maxWidth: 220 } },
              h('span', { 'aria-hidden': true }, 'R$'),
              h('input', { id: 'mc-cambio-inp', className: 'sa-inp is-num', inputMode: 'decimal', autoComplete: 'off', value: p.cambioTxt,
                'aria-invalid': !valido || undefined, onChange: function (e) { p.setCambioTxt(e.target.value); } }))),
          h('div', { className: 'sa-tool', style: { marginTop: 14 } },
            h(HS.Button, { variant: 'primary', size: 's', icon: null, disabled: !mudouCb, onClick: salvarCambio }, 'Salvar como versão nova'),
            h(HS.Button, { variant: 'ghost', size: 's', disabled: !sujoCb, style: sujoCb ? undefined : OFF, onClick: function () { p.setCambioTxt(fmt.dec(cb.usdbrl, 2)); } }, 'Desfazer alterações'))),
        h(SA.Card, { id: 'mc-conta', title: 'Como o custo é calculado', sub: 'por chamada, em dólar' },
          h('pre', { className: 'sa-pre' },
            '( entrada × preço de entrada\n+ saída × preço de saída\n+ cache lido × preço do cache lido\n+ cache escrito × preço do cache escrito )\n÷ 1.000.000'),
          h('ul', { className: 'sa-list', style: { marginTop: 10 } },
            ['Cada chamada guarda o preço da época: mudar a tabela vale daqui em diante.',
              'Cache escrito dura 5 minutos e custa 1,25× a entrada.',
              'Relatórios recorrentes da Íris pela Batch API: 50% do custo.',
              'Modelo sem preço na tabela tem o custo registrado como zero, com aviso no log.'].map(function (t, i) {
              return h('li', { key: i, className: 'sa-li', style: { padding: '8px 0', lineHeight: 1.45 } }, t);
            })))),

      h(SA.Dialog, { open: !!ed, onClose: function () { setEd(null); }, title: ed ? 'Editar o preço do ' + ed.nome : '',
        desc: atual ? 'US$ por milhão de tokens. Versão ' + atual.versao + ', desde ' + fmt.date(atual.desde) + '. A versão nova vale a partir de hoje; as chamadas antigas mantêm o preço da época.' : '',
        footer: [
          h(HS.Button, { key: 'u', variant: 'ghost', size: 's', disabled: !edSujo, style: edSujo ? undefined : OFF, onClick: function () { abrir(atual); } }, 'Desfazer alterações'),
          h('span', { key: 'g', className: 'sa-grow' }),
          h(HS.Button, { key: 'c', variant: 'ghost', size: 's', onClick: function () { setEd(null); } }, 'Cancelar'),
          h(HS.Button, { key: 's', variant: 'primary', size: 's', icon: null, disabled: !edMudou, onClick: salvarPreco }, 'Salvar como versão nova')
        ] },
        ed ? h('div', { className: 'sa-form c2' }, CAMPOS.map(function (c) {
          var id = 'mc-p-' + c[0], n = num(ed.vals[c[0]]), ok = !isNaN(n) && n >= 0;
          return h(SA.Field, { key: c[0], id: id, label: c[1] + ' (US$)', hint: ok ? undefined : 'Use um número, com vírgula nos centavos.' },
            h('input', { id: id, className: 'sa-inp is-num', inputMode: 'decimal', autoComplete: 'off', value: ed.vals[c[0]], 'aria-invalid': !ok || undefined,
              onChange: function (e) { setEd(put(ed, 'vals', put(ed.vals, c[0], e.target.value))); } }));
        })) : null));
  }

  /* ================================================= página */
  function App() {
    var tS = SA.useHashTab('custos', TABS.map(function (t) { return t.id; })), tab = tS[0], setTab = tS[1];
    /* versões iniciais do câmbio, da tabela de preço e das regras por tarefa: fictícias (o protótipo começa na versão 1) */
    var cS = useState({ usdbrl: D.cambio.usdbrl, data: D.cambio.data, fonte: D.cambio.fonte, versao: 1 }), cambio = cS[0], setCambio = cS[1];
    var xS = useState(fmt.dec(D.cambio.usdbrl, 2)), cambioTxt = xS[0], setCambioTxt = xS[1];
    var pS = useState(function () { return D.precos.map(function (x) { return Object.assign({ versao: 1, desde: '2026-10-16' }, x); }); }), precos = pS[0], setPrecos = pS[1];
    var base = {}; SA.agents().forEach(function (a) { base[a.id] = Object.assign({}, a.modelo); });
    var sS = useState(base), salvo = sS[0], setSalvo = sS[1];
    var dS = useState(base), draft = dS[0], setDraft = dS[1];
    var vS = useState(1), versao = vS[0], setVersao = vS[1];

    var mudancas = 0;
    Object.keys(salvo).forEach(function (id) { EDITAVEIS.forEach(function (k) { if (draft[id][k] !== salvo[id][k]) mudancas++; }); });

    var corpo;
    if (tab === 'regras') corpo = h(Regras, { precos: precos, draft: draft, salvo: salvo, versao: versao, mudancas: mudancas,
      set: function (id, k, v) { setDraft(function (d) { return put(d, id, put(d[id], k, v)); }); },
      desfazer: function () { setDraft(salvo); },
      salvar: function () {
        setSalvo(draft); setVersao(versao + 1);
        SA.toast('Demonstração: regras por tarefa salvas como versão ' + (versao + 1) + '. O runtime passa a usar nas próximas chamadas; fica na auditoria.');
      } });
    else if (tab === 'precos') corpo = h(Precos, { precos: precos, setPrecos: setPrecos, cambio: cambio, setCambio: setCambio, cambioTxt: cambioTxt, setCambioTxt: setCambioTxt });
    else corpo = h(Custos, { cambio: cambio });

    return h(SA.Page, { nav: 'modelos', title: 'Modelos e custos',
      desc: 'Quanto a IA custa e qual modelo cada etapa usa. O custo de cada chamada fica com o preço da época; o cliente nunca vê esta tela.' },
      h('div', { className: 'sa-tabs-w' },
        h(SA.Tabs, { label: 'Seções de Modelos e custos', value: tab, onChange: setTab, idp: 'mc-tab', panel: 'mc-panel',
          tabs: TABS.map(function (t) { return t.id === 'regras' && mudancas ? Object.assign({ badge: mudancas }, t) : t; }) })),
      h(SA.TabPanel, { id: 'mc-panel', idp: 'mc-tab', value: tab }, corpo));
  }
  SA.render(App);
})();
