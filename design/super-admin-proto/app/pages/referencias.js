/* Referências: repertório que os agentes consultam (brandbooks, fontes, moods), cada item com lições e
   "a IA usa em" (agente e delivery do catálogo). Fase 2+, com o motor de imagem (SA5). Só guias das contas
   fictícias; nada de marca real de terceiros. Cadastrar, ativar, desativar e editar lições: demonstração. */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, HS = SA.HS, D = SA.D, Q = SA.Q, fmt = SA.fmt;
  var useState = React.useState;
  var HOJE = D.hoje.slice(0, 10);
  var OFF = { opacity: 0.45, cursor: 'not-allowed' };
  var TIPOS = [
    { id: 'brandbooks', l: 'Brandbooks', um: 'Brandbook' },
    { id: 'fontes', l: 'Fontes', um: 'Fonte' },
    { id: 'moods', l: 'Moods', um: 'Mood' }
  ];
  var VAZIO = {
    brandbooks: ['Nenhum brandbook cadastrado', 'Os guias de marca das contas aparecem aqui quando cadastrados.', 'Cadastrar brandbook'],
    fontes: ['Nenhuma fonte cadastrada', 'As peças usam as fontes da Memória da Marca de cada cliente. O repertório de fontes entra com o motor de imagem (SA5).', 'Cadastrar fonte'],
    moods: ['Nenhum mood cadastrado', 'As peças seguem o tom da Memória da Marca de cada cliente. O repertório de moods entra com o motor de imagem (SA5).', 'Cadastrar mood']
  };
  var ESTADO = { ativa: ['done', 'Ativa'], rascunho: ['draft', 'Rascunho'], inativa: ['pause', 'Inativa'] };
  var NOME = {}; (Q ? Q.deliveries : []).forEach(function (d) { NOME[d.id] = d.nome; });
  var USA = ['kaia', 'otto']; // agentes cujas deliveries consultam referências neste protótipo

  function put(o, k, v) { var r = Object.assign({}, o); r[k] = v; return r; }
  function tipo(id) { return TIPOS.filter(function (t) { return t.id === id; })[0]; }
  function linhas(s) { return String(s).split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
  function contaDe(r) { var id = String(r.id).replace(/^bb-/, ''); return D.contas.filter(function (c) { return c.id === id; })[0]; }

  /* ---------- "a IA usa em": agente (mini) + delivery do catálogo */
  function Uso(p) {
    var a = SA.ag(p.ag), txt = a.name + ' · ' + p.d + ' ' + (NOME[p.d] || '');
    return h('span', { className: 'sa-chip', title: txt, style: { maxWidth: '100%', paddingLeft: 5 } },
      h(HS.Agent, { agent: a.forma, size: 18 }),
      h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' } }, txt));
  }

  function RefCard(p) {
    var r = p.item, e = ESTADO[r.estado] || ESTADO.rascunho, conta = contaDe(r);
    return h(SA.Card, { id: 'rf-' + r.id, title: r.nome, sub: 'desde ' + fmt.date(r.desde) + (conta ? ' · conta ' + conta.marca : ''),
      actions: h(SA.Status, { kind: e[0] }, e[1]) },
      h('div', { className: 'sa-lbl' }, 'Lições'),
      r.licoes.length
        ? h('ul', { className: 'sa-list', style: { marginTop: 2 } }, r.licoes.map(function (l, i) { return h('li', { key: i, className: 'sa-li', style: { padding: '9px 0', lineHeight: 1.45 } }, l); }))
        : h('p', { className: 'sa-mut', style: { margin: '8px 0 0', fontSize: 13.5 } }, 'Nenhuma lição registrada.'),
      h('div', { className: 'sa-lbl', style: { margin: '14px 0 8px' } }, 'A IA usa em'),
      r.usaEm.length
        ? h('div', { className: 'sa-chips' }, r.usaEm.map(function (u) { return h(Uso, { key: u[0] + u[1], ag: u[0], d: u[1] }); }))
        : h('p', { className: 'sa-mut', style: { margin: 0, fontSize: 13.5 } }, 'Nenhuma delivery marcada.'),
      h('div', { className: 'sa-tool', style: { marginTop: 16 } },
        h(HS.Button, { variant: 'soft', size: 's', onClick: p.onToggle }, r.estado === 'ativa' ? 'Desativar' : 'Ativar'),
        h(HS.Button, { variant: 'ghost', size: 's', onClick: p.onEdit }, 'Editar lições')));
  }

  function App() {
    var tS = SA.useHashTab('brandbooks', TIPOS.map(function (t) { return t.id; })), tab = tS[0], setTab = tS[1];
    var rS = useState(function () { return JSON.parse(JSON.stringify(D.referencias)); }), refs = rS[0], setRefs = rS[1];
    var eS = useState(null), ed = eS[0], setEd = eS[1];       // { tipo, id, nome, orig, texto }
    var nS = useState(null), novo = nS[0], setNovo = nS[1];   // { tipo, nome, licoes, usa: { "kaia:03.01": true } }

    function update(t, id, fn) { setRefs(function (all) { var r = Object.assign({}, all); r[t] = all[t].map(function (x) { return x.id === id ? fn(x) : x; }); return r; }); }
    function toggle(t, x) {
      var on = x.estado !== 'ativa';
      update(t, x.id, function (y) { return Object.assign({}, y, { estado: on ? 'ativa' : 'inativa' }); });
      SA.toast(on ? 'Demonstração: "' + x.nome + '" ativada. A IA passa a consultar nas próximas peças.'
        : 'Demonstração: "' + x.nome + '" desativada. A IA deixa de consultar; nada é apagado.', 'leaf');
    }
    function abrirEd(t, x) { var txt = x.licoes.join('\n'); setEd({ tipo: t, id: x.id, nome: x.nome, orig: txt, texto: txt }); }
    function salvarEd() {
      var l = linhas(ed.texto);
      update(ed.tipo, ed.id, function (y) { return Object.assign({}, y, { licoes: l }); });
      SA.toast('Demonstração: lições de "' + ed.nome + '" salvas como versão nova. Ficam na auditoria.', 'leaf');
      setEd(null);
    }
    function abrirNovo(t) { setNovo({ tipo: t || tab, nome: '', licoes: '', usa: {} }); }
    function cadastrar() {
      var usaEm = [];
      USA.forEach(function (id) { SA.ag(id).deliveries.forEach(function (d) { if (novo.usa[id + ':' + d]) usaEm.push([id, d]); }); });
      var item = { id: 'ref-' + Date.now(), nome: novo.nome.trim(), estado: 'rascunho', desde: HOJE, licoes: linhas(novo.licoes), usaEm: usaEm };
      setRefs(function (all) { var r = Object.assign({}, all); r[novo.tipo] = all[novo.tipo].concat([item]); return r; });
      setTab(novo.tipo); setNovo(null);
      SA.toast('Demonstração: "' + item.nome + '" cadastrada como rascunho. Fica na auditoria.', 'leaf');
    }

    var lista = refs[tab] || [], vz = VAZIO[tab];
    var edDirty = ed && ed.texto !== ed.orig;

    return h(SA.Page, { nav: 'referencias', title: 'Referências',
      desc: 'Repertório que os agentes consultam: brandbooks, fontes e moods, cada um com as lições e onde a IA usa. Desativar não apaga nada.',
      actions: h(HS.Button, { variant: 'primary', size: 's', icon: null, onClick: function () { abrirNovo(); } }, 'Cadastrar referência') },
      h(SA.Note, { kind: 'draft', label: 'Fase 2+', style: { marginBottom: 16 } },
        'Referências entram com o motor de imagem (SA5). Os guias abaixo são das contas fictícias; nada de marca real de terceiros.'),
      h('div', { className: 'sa-tabs-w' },
        h(SA.Tabs, { label: 'Tipos de referência', value: tab, onChange: setTab, idp: 'rf-tab', panel: 'rf-panel',
          tabs: TIPOS.map(function (t) { return { id: t.id, l: t.l, badge: (refs[t.id] || []).length }; }) })),
      h(SA.TabPanel, { id: 'rf-panel', idp: 'rf-tab', value: tab },
        lista.length
          ? h('div', { className: 'sa-row c2' }, lista.map(function (x) {
            return h(RefCard, { key: x.id, item: x, onToggle: function () { toggle(tab, x); }, onEdit: function () { abrirEd(tab, x); } });
          }))
          : h(SA.Card, null, h(SA.Empty, { agent: 'leaf', title: vz[0],
            actions: h(HS.Button, { variant: 'soft', size: 's', onClick: function () { abrirNovo(tab); } }, vz[2]) }, vz[1]))),

      /* editar lições */
      h(SA.Dialog, { open: !!ed, onClose: function () { setEd(null); }, title: 'Editar lições', desc: ed ? ed.nome : '',
        footer: [
          h(HS.Button, { key: 'u', variant: 'ghost', size: 's', disabled: !edDirty, style: edDirty ? undefined : OFF, onClick: function () { setEd(put(ed, 'texto', ed.orig)); } }, 'Desfazer alterações'),
          h('span', { key: 'g', className: 'sa-grow' }),
          h(HS.Button, { key: 'c', variant: 'ghost', size: 's', onClick: function () { setEd(null); } }, 'Cancelar'),
          h(HS.Button, { key: 's', variant: 'primary', size: 's', icon: null, disabled: !edDirty, onClick: salvarEd }, 'Salvar como versão nova')
        ] },
        ed ? h(SA.Field, { id: 'rf-licoes-ed', label: 'Lições', hint: 'Uma por linha. Salvar grava uma versão nova, que fica na auditoria.' },
          h('textarea', { id: 'rf-licoes-ed', className: 'sa-inp', rows: 6, value: ed.texto, onChange: function (e) { setEd(Object.assign({}, ed, { texto: e.target.value })); } })) : null),

      /* cadastrar referência */
      h(SA.Dialog, { open: !!novo, wide: true, onClose: function () { setNovo(null); }, title: 'Cadastrar referência',
        desc: 'Entra como rascunho. Só material das contas ou criado para o HelloSquad; nada de marca real de terceiros.',
        footer: [
          h('span', { key: 'n', className: 'sa-grow' }, 'Demonstração: fica só nesta página.'),
          h(HS.Button, { key: 'c', variant: 'ghost', size: 's', onClick: function () { setNovo(null); } }, 'Cancelar'),
          h(HS.Button, { key: 'a', variant: 'primary', size: 's', icon: null, disabled: !(novo && novo.nome.trim()), onClick: cadastrar }, 'Cadastrar referência')
        ] },
        novo ? h('div', { className: 'sa-form' },
          h('div', { className: 'sa-form c2' },
            h('div', { className: 'sa-fld' },
              h('span', { className: 'sa-fld-l' }, 'Tipo'),
              h('div', null, h(HS.Segmented, { label: 'Tipo de referência', itemWidth: 108, options: TIPOS.map(function (t) { return t.um; }), value: tipo(novo.tipo).um,
                onChange: function (v) { setNovo(put(novo, 'tipo', TIPOS.filter(function (t) { return t.um === v; })[0].id)); } }))),
            h(SA.Field, { id: 'rf-nome', label: 'Nome' },
              h('input', { id: 'rf-nome', className: 'sa-inp', 'data-autofocus': true, value: novo.nome, placeholder: 'Ex.: Grão Miúdo Cafés · guia visual',
                onChange: function (e) { setNovo(put(novo, 'nome', e.target.value)); } }))),
          h(SA.Field, { id: 'rf-licoes', label: 'Lições', hint: 'Uma por linha. Ex.: Título curto, em duas linhas.' },
            h('textarea', { id: 'rf-licoes', className: 'sa-inp', rows: 3, value: novo.licoes, style: { minHeight: 80 },
              onChange: function (e) { setNovo(put(novo, 'licoes', e.target.value)); } })),
          h('div', { className: 'sa-fld' },
            h('span', { className: 'sa-fld-l' }, 'A IA usa em'),
            h('div', { className: 'sa-row c2', style: { gap: 20, marginTop: 4 } }, USA.map(function (id) {
              var a = SA.ag(id);
              return h('div', { key: id, role: 'group', 'aria-labelledby': 'rf-g-' + id },
                h('div', { id: 'rf-g-' + id, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13.5, fontWeight: 700 } },
                  h(HS.Agent, { agent: a.forma, size: 20 }), a.name + ' · ' + a.papel),
                h('div', { className: 'sa-checks', style: { gap: 6 } }, a.deliveries.map(function (d) {
                  var k = id + ':' + d;
                  return h(HS.Checkbox, { key: d, checked: !!novo.usa[k], onChange: function (v) { setNovo(put(novo, 'usa', put(novo.usa, k, v))); } },
                    h('span', { style: { textAlign: 'left', lineHeight: 1.35 } }, h('span', { className: 'sa-mono' }, d), ' ', NOME[d] || ''));
                })));
            })))) : null));
  }
  SA.render(App);
})();
