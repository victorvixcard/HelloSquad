/* Regras de negócio: documentos de regras operacionais com marcação por parágrafo
   ([DECIDIDO] [BASE ATUAL] [PENDENTE] [PROPOSTA]) e a flag "entra no prompt" ou "referência interna".
   À esquerda, a lista de documentos (abas verticais: setas, Home e End); à direita, o documento escolhido.
   Editar um parágrafo grava uma versão nova do documento (demonstração: muda o estado local e avisa). */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, HS = SA.HS, D = SA.D, Q = SA.Q, fmt = SA.fmt;
  var useState = React.useState, useRef = React.useRef, useEffect = React.useEffect;
  var HOJE = D.hoje.slice(0, 10);
  var OFF = { opacity: 0.45, cursor: 'not-allowed' };

  var MARCAS = [
    { v: 'decidido', l: 'Decidido', s: 'Decisão do Vic registrada.' },
    { v: 'base', l: 'Base atual', s: 'Como o sistema funciona hoje.' },
    { v: 'pendente', l: 'Pendente', s: 'Aguarda decisão do Vic. O painel não aplica.' },
    { v: 'proposta', l: 'Proposta', s: 'Sugestão ainda não aprovada.' }
  ];
  var PLURAL = { decidido: ['decidido', 'decididos'], base: ['de base atual', 'de base atual'], pendente: ['pendente', 'pendentes'], proposta: ['proposta', 'propostas'] };
  var FORMAS = SA.agents().map(function (a) { return a.forma; });
  var NUNCA = 'Preços, planos e catálogo nunca entram no prompt: vêm do banco a cada conversa.';

  /* squad/README.md vira um documento: cada item numerado ("1. …") é um parágrafo de base atual.
     Versão e autor são fictícios (o arquivo não guarda versão); a data é a do último commit dele. */
  function compartilhadas() {
    var md = (Q && Q.regrasCompartilhadas) || '';
    var itens = md.split('\n').map(function (l) { var m = /^\s*\d+\.\s+(.+)$/.exec(l); return m ? m[1].trim() : null; }).filter(Boolean);
    return { id: 'compartilhadas', titulo: 'Regras compartilhadas dos agentes', prompt: true, versao: 1, data: '2026-10-15', autor: 'Thor', arquivo: 'squad/README.md',
      paragrafos: itens.map(function (t) { return { m: 'base', t: t, fonte: 'squad/README.md' }; }) };
  }

  function put(o, k, v) { var r = Object.assign({}, o); r[k] = v; return r; }
  function drop(o, k) { var r = Object.assign({}, o); delete r[k]; return r; }
  function rich(t) { return String(t).split(/\*\*(.+?)\*\*/g).map(function (s, i) { return i % 2 ? h('b', { key: i }, s) : s; }); }
  function contar(doc) { var c = { decidido: 0, base: 0, pendente: 0, proposta: 0 }; doc.paragrafos.forEach(function (p) { c[p.m]++; }); return c; }
  function pl(n, k) { return n + ' ' + PLURAL[k][n === 1 ? 0 : 1]; }
  function resumo(c) { return ['decidido', 'base', 'proposta'].filter(function (k) { return c[k]; }).map(function (k) { return pl(c[k], k); }).join(' · '); }
  function domId(doc, i) { return 'rg-' + doc.id + '-' + i; }
  /* O SA.Dropdown rola só até o item marcado; perto do pé da tela, o resto do menu ficava fora. Rola o mínimo ao abrir. */
  function mostrarMenu(e) {
    var w = e.currentTarget;
    setTimeout(function () { var pop = w.querySelector('.sa-dd-pop'); if (pop) pop.scrollIntoView({ block: 'nearest' }); }, 60);
  }

  /* ---------- lista de documentos: abas verticais (setas para cima e para baixo, Home, End) */
  function DocList(p) {
    var refs = useRef({});
    function go(i) { var d = p.docs[i]; p.onChange(d.id); var el = refs.current[d.id]; if (el) el.focus(); }
    return h('div', { className: 'rg-docs', role: 'tablist', 'aria-orientation': 'vertical', 'aria-label': 'Documentos de regras' },
      p.docs.map(function (d, i) {
        var on = d.id === p.value, c = contar(d);
        return h('button', { key: d.id, ref: function (el) { refs.current[d.id] = el; }, type: 'button', role: 'tab', id: 'rg-doc-' + d.id,
          'aria-selected': on, 'aria-controls': 'rg-panel', tabIndex: on ? 0 : -1, className: 'rg-doc',
          onClick: function () { p.onChange(d.id); },
          onKeyDown: function (e) {
            var n = p.docs.length, j = null;
            if (e.key === 'ArrowDown') j = (i + 1) % n; else if (e.key === 'ArrowUp') j = (i - 1 + n) % n; else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = n - 1;
            if (j !== null) { e.preventDefault(); go(j); }
          } },
          h('span', { className: 'rg-doc-t' }, d.titulo),
          h('span', { className: 'rg-doc-f' }, (d.prompt ? 'Entra no prompt' : 'Referência interna') + ' · versão ' + d.versao),
          h('span', { className: 'rg-doc-c' },
            c.pendente ? h(SA.Status, { kind: 'you', s: true }, pl(c.pendente, 'pendente')) : null,
            h('span', null, resumo(c))));
      }));
  }

  /* ---------- flag do documento: quem lê e o que nunca entra no prompt */
  function Flag(p) {
    var d = p.doc;
    if (!d.prompt) return h(SA.Note, { label: 'Referência interna' }, 'O time consulta este documento aqui; nenhum agente o lê. ' + NUNCA);
    return h(SA.Note, { label: 'Entra no prompt' },
      h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 } },
        h(HS.SquadStack, { agents: FORMAS, label: 'Os sete agentes leem' }),
        h('span', null, d.arquivo
          ? 'Este é o ' + d.arquivo + ': entra no prompt dos sete, junto com a Alma de cada um. ' + NUNCA
          : 'Vai para as regras compartilhadas (squad/README.md), que entram no prompt dos sete. ' + NUNCA)));
  }

  /* ---------- parágrafo: leitura ou edição inline */
  function Paragrafo(p) {
    var par = p.par, dr = p.draft, i = p.i, id = p.domId;
    if (dr) {
      var dirty = dr.t !== par.t || dr.m !== par.m || dr.fonte !== par.fonte;
      var vazio = !dr.t.trim();
      return h('li', { className: 'rg-p' },
        h('div', null, h(SA.Marker, { kind: dr.m })),
        h('div', { className: 'rg-ed' },
          h(SA.Field, { id: id + '-t', label: 'Texto do parágrafo ' + (i + 1), hint: vazio ? 'Escreva o texto do parágrafo.' : fmt.int(dr.t.length) + ' caracteres' },
            h('textarea', { id: id + '-t', className: 'sa-inp', rows: 4, value: dr.t, autoFocus: true, style: { minHeight: 104 },
              onChange: function (e) { p.onChange('t', e.target.value); } })),
          h('div', { className: 'sa-form c2' },
            h('div', { className: 'sa-fld' },
              h('span', { className: 'sa-fld-l', id: id + '-ml' }, 'Marcação'),
              h('div', { role: 'group', 'aria-labelledby': id + '-ml', onClickCapture: mostrarMenu },
                h(SA.Dropdown, { value: dr.m, title: 'Marcação', options: MARCAS.map(function (m) { return { v: m.v, l: m.l }; }),
                  onChange: function (v) { p.onChange('m', v); } }))),
            h(SA.Field, { id: id + '-f', label: 'Fonte' },
              h('input', { id: id + '-f', className: 'sa-inp', value: dr.fonte, onChange: function (e) { p.onChange('fonte', e.target.value); } }))),
          dr.m === 'pendente' ? h('div', null, h(SA.Status, { kind: 'block', s: true }, 'Pendente: o painel não aplica')) : null,
          h('div', { className: 'sa-tool' },
            h(HS.Button, { variant: 'primary', size: 's', icon: null, disabled: !dirty || vazio, onClick: p.onSave }, 'Salvar como versão nova'),
            h(HS.Button, { variant: 'ghost', size: 's', disabled: !dirty, style: dirty ? undefined : OFF, onClick: p.onUndo }, 'Desfazer alterações'),
            h('span', { className: 'sa-grow' }),
            h(HS.Button, { variant: 'ghost', size: 's', onClick: p.onCancel }, 'Cancelar'))));
    }
    return h('li', { className: 'rg-p' },
      h('div', null, h(SA.Marker, { kind: par.m })),
      h('div', { style: { minWidth: 0 } },
        h('p', { className: 'rg-p-t' }, rich(par.t)),
        par.m === 'pendente' ? h('div', { className: 'rg-p-s' }, h(SA.Status, { kind: 'block', s: true }, 'Pendente: o painel não aplica')) : null,
        h('span', { className: 'sa-mono rg-p-f' }, '§' + (i + 1) + ' · ' + par.fonte)),
      h('span', { className: 'rg-p-a', ref: p.btnRef },
        h(HS.Button, { variant: 'ghost', size: 's', onClick: p.onEdit }, 'Editar', h('span', { key: 'sr', className: 'sa-sr' }, ' o parágrafo ' + (i + 1)))));
  }

  function App() {
    var dS = useState(function () { return JSON.parse(JSON.stringify(D.regras)).concat([compartilhadas()]); }), docs = dS[0], setDocs = dS[1];
    var tS = SA.useHashTab(docs[0].id, docs.map(function (d) { return d.id; })), cur = tS[0], setCur = tS[1];
    var rS = useState({}), drafts = rS[0], setDrafts = rS[1]; // "doc:i" → { m, t, fonte } em edição
    var btns = useRef({}), focusNext = useRef(null);
    useEffect(function () { // devolve o foco ao "Editar" depois de salvar ou cancelar
      if (!focusNext.current) return;
      var el = btns.current[focusNext.current]; focusNext.current = null;
      var b = el && el.querySelector('button'); if (b) b.focus();
    });

    var doc = docs.filter(function (d) { return d.id === cur; })[0] || docs[0];
    var tot = { decidido: 0, base: 0, pendente: 0, proposta: 0 }, nPar = 0;
    docs.forEach(function (d) { d.paragrafos.forEach(function (x) { tot[x.m]++; nPar++; }); });
    var nPrompt = docs.filter(function (d) { return d.prompt; }).length;

    function key(d, i) { return d.id + ':' + i; }
    function edit(d, i) { var x = d.paragrafos[i]; setDrafts(function (ds) { return put(ds, key(d, i), { m: x.m, t: x.t, fonte: x.fonte }); }); }
    function change(k, field, v) { setDrafts(function (ds) { return ds[k] ? put(ds, k, put(ds[k], field, v)) : ds; }); }
    function close(k) { focusNext.current = k; setDrafts(function (ds) { return drop(ds, k); }); }
    function save(d, i) {
      var k = key(d, i), dr = drafts[k]; if (!dr) return;
      var v = d.versao + 1;
      setDocs(function (all) {
        return all.map(function (x) {
          if (x.id !== d.id) return x;
          return Object.assign({}, x, { versao: v, data: HOJE, autor: D.admin.nome, paragrafos: x.paragrafos.map(function (y, j) {
            return j === i ? { m: dr.m, t: dr.t.trim(), fonte: dr.fonte.trim() || y.fonte } : y;
          }) });
        });
      });
      close(k);
      SA.toast('Demonstração: versão ' + v + ' de "' + d.titulo + '" salva' + (d.arquivo ? ' para o ' + d.arquivo : '') + '. Fica na auditoria.');
    }

    return h(SA.Page, { nav: 'regras', title: 'Regras de negócio',
      desc: 'Regras operacionais escritas e marcadas parágrafo a parágrafo. O que entra no prompt vai para as regras compartilhadas dos sete agentes; o que está pendente aparece como tal, e o painel não aplica.' },
      h(SA.Metrics, { items: [
        { l: 'Documentos', v: fmt.int(docs.length), d: nPrompt + ' entram no prompt · ' + (docs.length - nPrompt) + ' de referência interna' },
        { l: 'Parágrafos', v: fmt.int(nPar), d: pl(tot.decidido, 'decidido') + ' · ' + pl(tot.base, 'base') },
        { l: 'Pendentes', v: fmt.int(tot.pendente), kind: tot.pendente ? 'you' : undefined, d: tot.pendente ? 'aguardam decisão do Vic; o painel não aplica' : 'nenhuma decisão aguardando' },
        { l: 'Propostas', v: fmt.int(tot.proposta), d: 'sugestões ainda não aprovadas' }
      ] }),
      h(SA.Card, { flat: true, id: 'rg-leg', title: 'Como ler as marcações', sub: 'cada parágrafo leva uma' },
        h('dl', { className: 'sa-row c4' }, MARCAS.map(function (m) {
          return h('div', { key: m.v },
            h('dt', null, h(SA.Marker, { kind: m.v })),
            h('dd', { style: { margin: '8px 0 0', fontSize: 13, lineHeight: 1.45, color: 'var(--hs-tinta-suave)' } }, m.s));
        }))),
      h('div', { className: 'sa-row c12' },
        h('div', { className: 'sa-grp', style: { position: 'sticky', top: 16 } },
          h('div', { className: 'sa-grp-h' }, h('h2', { style: { fontSize: 14, fontWeight: 700 } }, 'Documentos'), h('span', { className: 'sa-lbl' }, docs.length)),
          h(DocList, { docs: docs, value: doc.id, onChange: setCur })),
        h(SA.TabPanel, { id: 'rg-panel', idp: 'rg-doc', value: doc.id },
          h(SA.Card, { id: 'rg-card', title: doc.titulo, sub: 'Versão ' + doc.versao + ' · ' + fmt.date(doc.data) + ' · ' + doc.autor },
            h(Flag, { doc: doc }),
            h('ol', { className: 'rg-ps', 'aria-label': 'Parágrafos' }, doc.paragrafos.map(function (x, i) {
              var k = key(doc, i);
              return h(Paragrafo, { key: k, par: x, i: i, domId: domId(doc, i), draft: drafts[k],
                btnRef: function (el) { btns.current[k] = el; },
                onEdit: function () { edit(doc, i); },
                onChange: function (field, v) { change(k, field, v); },
                onUndo: function () { setDrafts(function (ds) { return put(ds, k, { m: x.m, t: x.t, fonte: x.fonte }); }); },
                onCancel: function () { close(k); },
                onSave: function () { save(doc, i); } });
            }))))));
  }
  SA.render(App);
})();
