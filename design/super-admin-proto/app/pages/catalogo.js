/* Catálogo: as 46 deliveries dos sete agentes, com preço em créditos (provisório), travas de venda,
   integrações necessárias e homologação do cenário fictício; segunda aba com as 23 integrações.
   Mudanças ficam no rascunho até "Salvar como versão nova" (versionado; vai para a auditoria). */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, HS = SA.HS, D = SA.D, Q = SA.Q;
  var useState = React.useState;

  var VERSAO = 3; // fictício: a auditoria registra a versão 3 do catálogo em 15/10, 11:20
  var PROF = { orientar: 'Orientar', produzir: 'Produzir', executar: 'Executar', otimizar: 'Otimizar' };
  var HOMOL = { // kind do status, rótulo, singular e plural para o resumo do agente
    homologada: ['done', 'Homologada', 'homologada', 'homologadas'],
    'em-homologacao': ['prog', 'Em homologação', 'em homologação', 'em homologação'],
    'aguarda-motor': ['block', 'Aguarda motor', 'aguarda o motor', 'aguardam o motor'],
    'aguarda-integracao': ['block', 'Aguarda integração', 'aguarda integração', 'aguardam integração'],
    'nao-iniciada': ['pause', 'Não iniciada', 'não iniciada', 'não iniciadas']
  };
  var GRUPO = { BASE: 'Base', CANAIS: 'Canais', COMPLEMENTARES: 'Complementares' };
  /* integrações necessárias, lidas por palavra-chave do texto do catálogo; o texto completo fica no detalhe.
     As específicas vêm antes de LLM e Supabase (a base de quase todas), para o que trava a delivery aparecer primeiro. */
  var INTEG = [
    ['Motor de imagem', /imagem|motor visual/], ['Vídeo', /v[ií]deo/], ['Meta', /\bmeta\b|instagram|facebook/],
    ['Google', /google|ga4|search console|\bgbp\b/], ['E-mail', /e-mail/], ['WhatsApp', /whatsapp/],
    ['CRM/CSV', /\bcrm\b|\bcsv\b/], ['Busca web', /busca web|pesquisa web/], ['CMS', /\bcms\b|blog/],
    ['LLM', /\bllm\b/], ['Supabase', /supabase|postgres|storage|cron|\brls\b/]
  ];
  var CAMPO = { creditos: 'Créditos', aprovado: 'Preço aprovado', aVenda: 'À venda' };
  var BTN_LINK = { border: 0, background: 'none', padding: 0, margin: 0, cursor: 'pointer', textAlign: 'left', fontSize: 14, lineHeight: 1.3 };
  var CLAMP2 = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };
  var CHIP_S = { height: 22, padding: '0 8px', fontSize: 11.5 };

  var AGS = SA.agents();
  var POR_AG = {};
  AGS.forEach(function (a) { POR_AG[a.id] = []; });
  Q.deliveries.forEach(function (d) { var a = SA.agentOfDelivery(d.id); if (a) POR_AG[a.id].push(d); });
  var COM_SKILL = Q.deliveries.filter(temSkill).map(function (d) { return d.id; });

  function cat(id) { return D.catalogo[id] || [0, 'produzir', 'nao-iniciada']; }
  function temSkill(d) { var a = SA.agentOfDelivery(d.id); return !!(a && a.skills && a.skills[d.id]); }
  function chipsOf(txt) { var t = String(txt || '').toLowerCase(); return INTEG.filter(function (x) { return x[1].test(t); }).map(function (x) { return x[0]; }); }
  function plural(n, s, p) { return n + ' ' + (n === 1 ? s : p); }
  function doAg(a) { return (a.artigo === 'a' ? 'da ' : 'do ') + a.name; }
  function inicial() {
    var o = {};
    Q.deliveries.forEach(function (d) { o[d.id] = { creditos: String(cat(d.id)[0]), aprovado: false, aVenda: false }; });
    return o;
  }
  function mudancas(base, rasc) {
    var out = [];
    Q.deliveries.forEach(function (d) {
      ['creditos', 'aprovado', 'aVenda'].forEach(function (k) {
        if (String(base[d.id][k]) !== String(rasc[d.id][k])) out.push({ d: d, k: k, de: base[d.id][k], para: rasc[d.id][k] });
      });
    });
    return out;
  }
  function txtValor(k, v) { return k === 'creditos' ? (v === '' ? 'vazio' : v) : (v ? 'sim' : 'não'); }
  function contar(o, k) { return Object.keys(o).filter(function (id) { return o[id][k]; }).length; }
  function lblN(t, n) { return h(React.Fragment, null, t, ' ', h('span', { style: { opacity: 0.6, fontVariantNumeric: 'tabular-nums' } }, n)); }

  function Chips(p) {
    var cs = chipsOf(p.txt);
    if (!cs.length) return h('span', { className: 'sa-mut' }, '—');
    return h('div', { className: 'sa-chips', style: { gap: 4, minWidth: p.max ? 0 : 140, maxWidth: p.max || 180 } },
      cs.map(function (c) { return h('span', { key: c, className: 'sa-chip', style: CHIP_S }, c); }));
  }
  function Homol(p) { var s = HOMOL[p.v]; return h(SA.Status, { kind: s[0], s: true }, s[1]); }
  function CsvStatus(p) {
    var m = /(\d+)\s*\/\s*(\d+)/.exec(p.v || '');
    if (!m) return h(SA.Status, { kind: 'draft', s: true }, p.v || '—');
    var a = Number(m[1]), b = Number(m[2]);
    return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' } },
      h('span', { className: 'sa-bar', style: { width: 48 }, 'aria-hidden': true }, h('i', { style: { width: (b ? a / b * 100 : 0) + '%' } })),
      h('span', { className: 'sa-num', style: { fontSize: 12.5, fontWeight: 600 } }, a + ' de ' + b + ' concluídos'));
  }

  /* ---------- células editáveis */
  function Creditos(p) {
    var mudou = String(p.value) !== String(p.base), vazio = p.value === '';
    return h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 } },
      h('input', { className: 'sa-inp sa-num', type: 'text', inputMode: 'numeric', maxLength: 4, value: p.value,
        'aria-label': 'Créditos de ' + p.d.id + ', ' + p.d.nome + ' (provisório)', 'aria-invalid': vazio || undefined,
        onChange: function (e) { var v = e.target.value.replace(/\D/g, ''); p.onChange(v === '' ? '' : String(Number(v))); },
        style: { width: 64, height: 34, padding: '0 10px', borderRadius: 10, textAlign: 'right', fontSize: 14 } }),
      h('small', { className: 'sa-mut', style: { fontSize: 11, lineHeight: 1.2, whiteSpace: 'nowrap' } }, vazio ? 'preencha' : 'provisório'),
      mudou && !vazio ? h('small', { style: { fontSize: 11, lineHeight: 1.2, fontWeight: 700, whiteSpace: 'nowrap' } }, 'era ' + p.base) : null);
  }
  function Trava(p) { // p.on, p.locked, p.label, p.onChange
    var cb = h(HS.Checkbox, { checked: p.on, onChange: p.onChange }, h('span', { className: 'sa-sr' }, p.label + (p.locked ? ' (travado até o preço ser aprovado)' : '')));
    return p.locked ? h('span', { className: 'sa-cb-off', title: 'Travado até o preço ser aprovado' }, cb) : cb;
  }

  /* ---------- um cartão por agente: cabeçalho com o agente e a tabela das deliveries dele */
  function AgenteCard(p) {
    var a = p.a, idt = 'ag-' + a.id + '-t', cont = {};
    p.rows.forEach(function (d) { var s = cat(d.id)[2]; cont[s] = (cont[s] || 0) + 1; });
    var resumo = Object.keys(HOMOL).filter(function (k) { return cont[k]; }).map(function (k) { return plural(cont[k], HOMOL[k][2], HOMOL[k][3]); }).join(' · ');
    return h('section', { className: 'sa-card', 'aria-labelledby': idt },
      h('div', { className: 'sa-card-h' },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 } },
          h(HS.Agent, { agent: a.forma, size: 28 }),
          h('div', { className: 'sa-card-t' }, h('h2', { id: idt }, a.name), h('small', null, a.papel + ' · ' + plural(p.rows.length, 'delivery', 'deliveries')))),
        h('div', { className: 'sa-card-a' },
          h('small', { className: 'sa-mut', style: { fontSize: 12.5, textAlign: 'right' } }, resumo),
          h(HS.Button, { variant: 'ghost', size: 's', href: 'agente.html?a=' + a.id }, 'Abrir o agente'))),
      h('div', { className: 'sa-card-b is-flush' },
        h(SA.Table, { cols: p.cols, rows: p.rows, caption: 'Deliveries ' + doAg(a) + ': preço provisório, venda, integrações e homologação', onRow: p.onRow })));
  }

  /* ---------- detalhe de uma delivery ou integração */
  function Detalhe(p) {
    var it = p.item, open = !!it, body = null, title = '', desc = '', agent = null, extra = null;
    if (it && it.t === 'd') {
      var d = it.x, a = SA.agentOfDelivery(d.id), c = cat(d.id), r = p.draft[d.id];
      title = d.id + ' · ' + d.nome; desc = a.name + ' · ' + a.papel; agent = a.forma;
      extra = h(HS.Button, { key: 'sk', variant: 'soft', size: 's', href: 'agente.html?a=' + a.id + '#skills' }, 'Abrir as skills ' + doAg(a));
      body = h(React.Fragment, null,
        h('p', { style: { fontSize: 15, lineHeight: 1.5, marginBottom: 16 } }, d.resultado),
        h('dl', { className: 'sa-kv' },
          h('dt', null, 'Profundidade'), h('dd', null, h(HS.Tag, { kind: 'auto' }, PROF[c[1]])),
          h('dt', null, 'Créditos'), h('dd', { style: { display: 'flex', alignItems: 'center', gap: 8 } }, h('span', { className: 'sa-num' }, r.creditos === '' ? '—' : r.creditos), h(HS.Tag, { kind: 'sim' }, 'Provisório')),
          h('dt', null, 'Venda'), h('dd', null, (r.aprovado ? 'Preço aprovado' : 'Preço ainda não aprovado') + ' · ' + (r.aVenda ? 'à venda' : 'fora de venda')),
          h('dt', null, 'Homologação'), h('dd', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } }, h(Homol, { v: c[2] }), h('small', { className: 'sa-mut', style: { fontWeight: 500 } }, 'cenário fictício')),
          h('dt', null, 'Skill'), h('dd', null, temSkill(d) ? h('span', { className: 'sa-mono' }, 'squad/' + a.id + '/skills/' + d.id + '.md') : h('span', { className: 'sa-mut' }, 'Ainda não escrita no repositório')),
          h('dt', null, 'Integrações'), h('dd', null, h('div', { style: { marginBottom: 6 } }, d.integracoes), h(Chips, { txt: d.integracoes, max: 'none' })),
          h('dt', null, 'Pré-requisitos'), h('dd', null, d.prerequisitos),
          h('dt', null, 'Dono'), h('dd', null, d.dono),
          h('dt', null, 'No catálogo (CSV)'), h('dd', null, h(CsvStatus, { v: d.status }))));
    } else if (it) {
      var i = it.x;
      title = i.id + ' · ' + i.nome; desc = 'Integração · grupo ' + GRUPO[i.grupo];
      extra = h(HS.Button, { key: 'sa', variant: 'soft', size: 's', href: 'saude-apis.html' }, 'Ver em Saúde das APIs');
      body = h(React.Fragment, null,
        h('p', { style: { fontSize: 15, lineHeight: 1.5, marginBottom: 16 } }, i.resultado),
        h('dl', { className: 'sa-kv' },
          h('dt', null, 'O que usa'), h('dd', null, i.integracoes),
          h('dt', null, 'Pré-requisitos'), h('dd', null, i.prerequisitos),
          h('dt', null, 'Dono'), h('dd', null, i.dono),
          h('dt', null, 'No catálogo (CSV)'), h('dd', null, h(CsvStatus, { v: i.status }))));
    }
    return h(SA.Dialog, { open: open, onClose: p.onClose, title: title, desc: desc, agent: agent, wide: true,
      footer: [extra, h('span', { key: 'g', className: 'sa-grow' }),
        h(HS.Button, { key: 'f', variant: 'ghost', size: 's', onClick: p.onClose }, 'Fechar')] }, body);
  }

  function App() {
    var tabS = SA.useHashTab('deliveries', ['deliveries', 'integracoes']), tab = tabS[0], setTab = tabS[1];
    var agS = useState('todos'), agF = agS[0], setAgF = agS[1];
    var svS = useState(inicial), saved = svS[0], setSaved = svS[1];
    var drS = useState(inicial), draft = drS[0], setDraft = drS[1];
    var vS = useState(VERSAO), versao = vS[0], setVersao = vS[1];
    var selS = useState(null), sel = selS[0], setSel = selS[1];
    var cfS = useState(false), confirmar = cfS[0], setConfirmar = cfS[1];
    var ntS = useState(''), nota = ntS[0], setNota = ntS[1];

    var muds = mudancas(saved, draft);
    var vazios = Q.deliveries.filter(function (d) { return draft[d.id].creditos === ''; }).map(function (d) { return d.id; });
    var idsMud = muds.map(function (m) { return m.d.id; }).filter(function (id, k, arr) { return arr.indexOf(id) === k; });

    function patch(id, ch) { setDraft(function (o) { var n = Object.assign({}, o); n[id] = Object.assign({}, o[id], ch); return n; }); }
    function toggleAprov(d) {
      var r = draft[d.id];
      if (r.aprovado && r.aVenda) { patch(d.id, { aprovado: false, aVenda: false }); SA.toast('À venda desligado junto: sem preço aprovado, ' + d.id + ' sai da venda.'); }
      else patch(d.id, { aprovado: !r.aprovado });
    }
    function toggleVenda(d) {
      var r = draft[d.id];
      if (!r.aprovado && !r.aVenda) { SA.toast('À venda fica travado até o preço de ' + d.id + ' ser aprovado comercialmente.'); return; }
      patch(d.id, { aVenda: !r.aVenda });
    }
    function descartar() { setDraft(saved); SA.toast('Alterações descartadas. Vale a versão ' + versao + '.'); }
    function salvar() {
      var n = muds.length, v = versao + 1;
      setSaved(draft); setVersao(v); setConfirmar(false); setNota('');
      SA.toast('Demonstração: catálogo salvo como versão ' + v + ', com ' + plural(n, 'alteração', 'alterações') + '. Entra na auditoria.');
    }
    function abrir(t, x) { setSel({ t: t, x: x }); }

    /* números do topo: da versão salva, não do rascunho */
    var hc = {};
    Q.deliveries.forEach(function (d) { var s = cat(d.id)[2]; hc[s] = (hc[s] || 0) + 1; });
    var nVenda = contar(saved, 'aVenda'), nAprov = contar(saved, 'aprovado'), total = Q.deliveries.length;
    var nMotor = hc['aguarda-motor'] || 0, nInteg = hc['aguarda-integracao'] || 0;

    var cols = [
      { k: 'id', l: 'ID', nw: true, w: 68, render: function (d) { return h('span', { className: 'sa-mono' }, d.id); } },
      { k: 'nome', l: 'Delivery', render: function (d) {
        return h('div', { className: 'sa-cell-m', style: { minWidth: 170 } },
          h('button', { type: 'button', className: 'sa-rowlink', style: BTN_LINK, onClick: function () { abrir('d', d); } }, d.nome),
          h('small', { style: CLAMP2, title: d.resultado }, d.resultado));
      } },
      { k: 'prof', l: 'Profundidade', nw: true, w: 112, render: function (d) { return h(HS.Tag, { kind: 'auto' }, PROF[cat(d.id)[1]]); } },
      { k: 'integ', l: 'Integrações', w: 170, render: function (d) { return h(Chips, { txt: d.integracoes }); } },
      { k: 'homol', l: 'Homologação', nw: true, w: 164, render: function (d) { return h(Homol, { v: cat(d.id)[2] }); } },
      { k: 'creditos', l: 'Créditos', r: true, w: 88, render: function (d) {
        return h(Creditos, { d: d, value: draft[d.id].creditos, base: saved[d.id].creditos, onChange: function (v) { patch(d.id, { creditos: v }); } });
      } },
      { k: 'aprov', l: h(React.Fragment, null, 'Preço', h('br'), 'aprovado'), c: true, w: 84, render: function (d) {
        return h(Trava, { on: draft[d.id].aprovado, label: 'Preço aprovado comercialmente: ' + d.id + ', ' + d.nome, onChange: function () { toggleAprov(d); } });
      } },
      { k: 'venda', l: 'À venda', c: true, w: 84, render: function (d) {
        var r = draft[d.id];
        return h(Trava, { on: r.aVenda, locked: !r.aprovado, label: 'À venda: ' + d.id + ', ' + d.nome, onChange: function () { toggleVenda(d); } });
      } }
    ];
    var colsI = [
      { k: 'id', l: 'ID', nw: true, w: 64, render: function (i) { return h('span', { className: 'sa-mono' }, i.id); } },
      { k: 'grupo', l: 'Grupo', nw: true, render: function (i) { return h('span', { className: 'sa-chip' }, GRUPO[i.grupo]); } },
      { k: 'nome', l: 'Integração', render: function (i) {
        return h('div', { className: 'sa-cell-m' },
          h('button', { type: 'button', className: 'sa-rowlink', style: BTN_LINK, onClick: function () { abrir('i', i); } }, i.nome),
          h('small', null, i.resultado));
      } },
      { k: 'status', l: 'No catálogo (CSV)', nw: true, render: function (i) { return h(CsvStatus, { v: i.status }); } }
    ];

    var agTabs = [{ id: 'todos', l: lblN('Todos', total) }].concat(AGS.map(function (a) { return { id: a.id, agent: a.forma, l: lblN(a.name, POR_AG[a.id].length) }; }));
    var visiveis = AGS.filter(function (a) { return agF === 'todos' || agF === a.id; });

    var porId = {};
    muds.forEach(function (m) { (porId[m.d.id] = porId[m.d.id] || []).push(m); });

    return h(SA.Page, { nav: 'catalogo', title: 'Catálogo',
      desc: 'As 46 deliveries dos sete agentes: profundidade, preço em créditos, venda, integrações necessárias e homologação. Preço e disponibilidade mudam por versão, e cada versão fica na auditoria.',
      actions: h(React.Fragment, null,
        h('span', { className: 'sa-chip is-mono' }, 'Versão ' + versao),
        h(HS.Button, { variant: 'ghost', size: 's', href: 'auditoria.html?tipo=' + encodeURIComponent('Catálogo') }, 'Ver histórico')) },
      h(SA.Metrics, { cols: 5, items: [
        { l: 'Deliveries', v: String(total), d: AGS.length + ' agentes · ' + Q.integracoes.length + ' integrações' },
        { l: 'À venda', v: String(nVenda), d: nVenda ? 'com preço aprovado' : 'nenhuma: falta preço aprovado' },
        { l: 'Preço aprovado', v: String(nAprov), u: 'de ' + total, d: nAprov ? 'trava de venda liberada' : 'decisão comercial pendente' },
        { l: 'Homologadas', v: String(hc.homologada || 0), d: 'neste cenário fictício', tag: h(HS.Tag, { kind: 'sim' }, 'Cenário') },
        { l: 'Aguardando', v: String(nMotor + nInteg), d: nMotor + ' pelo motor · ' + nInteg + ' por integração' }
      ] }),
      h(SA.Note, { kind: 'draft', label: 'Provisório', style: { marginTop: 16 } },
        h('b', null, 'Preço em créditos é provisório.'), ' Decisão do Vic: preço e créditos ficam por último; até lá, nada é vendido de verdade. ',
        'A homologação mostrada é do cenário fictício: no repositório, hoje, só ',
        COM_SKILL.map(function (id, k) { return h(React.Fragment, { key: id }, k ? (k === COM_SKILL.length - 1 ? ' e ' : ', ') : null, h('span', { className: 'sa-mono' }, id)); }),
        ' têm skill escrita.'),
      h('div', { className: 'sa-tabs-w', style: { marginTop: 22 } },
        h(SA.Tabs, { label: 'Catálogo', idp: 'cat', panel: 'cat-painel', value: tab, onChange: setTab, tabs: [
          { id: 'deliveries', l: 'Deliveries', badge: total }, { id: 'integracoes', l: 'Integrações', badge: Q.integracoes.length }] })),
      h(SA.TabPanel, { id: 'cat-painel', idp: 'cat', value: tab },
        tab === 'deliveries' ? h(React.Fragment, null,
          h('div', { className: 'sa-tool' },
            h(SA.Tabs, { line: true, label: 'Filtrar por agente', idp: 'ag', panel: 'ag-painel', value: agF, onChange: setAgF, tabs: agTabs }),
            h('span', { className: 'sa-grow' }),
            h('span', { className: 'sa-mut', style: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 } }, 'Preço em créditos', h(HS.Tag, { kind: 'sim' }, 'Provisório'))),
          h(SA.TabPanel, { id: 'ag-painel', idp: 'ag', value: agF },
            h('div', { style: { marginTop: 16 } }, visiveis.map(function (a) {
              return h(AgenteCard, { key: a.id, a: a, rows: POR_AG[a.id], cols: cols, onRow: function (d) { abrir('d', d); } });
            })))) :
        h(React.Fragment, null,
          h(SA.Note, null, 'As 23 integrações do catálogo do handoff, com o estado registrado lá: "A validar" ou o checklist de 8 itens dos canais. Se a conexão funciona hoje, com chamadas e falhas, está em ',
            h('a', { href: 'saude-apis.html' }, 'Saúde das APIs'), '.'),
          h(SA.Card, { title: 'Integrações do catálogo', sub: Q.integracoes.length + ' itens · base, canais e complementares', flush: true },
            h(SA.Table, { cols: colsI, rows: Q.integracoes, caption: 'Integrações do catálogo', onRow: function (i) { abrir('i', i); } })))),
      muds.length ? h('div', { role: 'region', 'aria-label': 'Alterações não salvas',
        style: { position: 'sticky', bottom: 16, zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, padding: '8px 8px 8px 20px', borderRadius: 'var(--r-pilula)', background: 'var(--hs-branco)', boxShadow: 'var(--e2-flutuante)' } },
        h('b', { className: 'sa-num', style: { whiteSpace: 'nowrap' } }, plural(muds.length, 'alteração', 'alterações')),
        h('span', { className: 'sa-mut', style: { flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
          vazios.length ? 'Preencha os créditos de ' + vazios.join(', ') + ' para salvar.' :
            'em ' + idsMud.slice(0, 5).join(', ') + (idsMud.length > 5 ? ' e mais ' + (idsMud.length - 5) : '') + ' · a versão ' + versao + ' vale até você salvar'),
        h(HS.Button, { variant: 'ghost', size: 's', onClick: descartar }, 'Descartar'),
        h(HS.Button, { variant: 'primary', size: 's', icon: null, disabled: vazios.length > 0, onClick: function () { setConfirmar(true); } }, 'Salvar como versão nova')) : null,
      h(Detalhe, { item: sel, draft: draft, onClose: function () { setSel(null); } }),
      h(SA.Dialog, { open: confirmar, onClose: function () { setConfirmar(false); }, title: 'Salvar o catálogo como versão ' + (versao + 1),
        desc: 'A versão ' + versao + ' fica no histórico. A gravação entra na auditoria com o seu nome e a nota abaixo.',
        footer: [
          h('span', { key: 'n', className: 'sa-grow' }, 'Demonstração: nada é gravado neste protótipo.'),
          h(HS.Button, { key: 'c', variant: 'ghost', size: 's', onClick: function () { setConfirmar(false); } }, 'Cancelar'),
          h(HS.Button, { key: 's', variant: 'primary', size: 's', icon: null, onClick: salvar }, 'Salvar como versão nova')
        ] },
        h('ul', { className: 'sa-list', 'aria-label': 'Alterações' }, Object.keys(porId).map(function (id) {
          var ms = porId[id];
          return h('li', { key: id, className: 'sa-li' },
            h('span', { className: 'sa-mono', style: { width: 44, flex: 'none' } }, id),
            h('span', { className: 'sa-li-t' }, h('b', null, ms[0].d.nome),
              h('small', null, ms.map(function (m) { return CAMPO[m.k] + ': ' + txtValor(m.k, m.de) + ' → ' + txtValor(m.k, m.para); }).join(' · '))),
            ms.some(function (m) { return m.k === 'creditos'; }) ? h(HS.Tag, { kind: 'sim' }, 'Provisório') : null);
        })),
        h('div', { style: { marginTop: 14 } },
          h(SA.Field, { id: 'cat-nota', label: 'Nota da versão (opcional)', hint: 'Aparece na auditoria junto com as alterações.' },
            h('input', { id: 'cat-nota', className: 'sa-inp', value: nota, onChange: function (e) { setNota(e.target.value); }, placeholder: 'Ex.: preço revisado depois da homologação' })))));
  }
  SA.render(App);
})();
