/* Agente: Alma (SOUL por seção, editável com versão), Skills (uma aba por delivery), Ferramentas e limites
   (agent.yaml) e O que ele lê (o prompt montado na mesma ordem de apps/backend/.../squad/prompt.py).
   Texto e contrato vêm de squad/ via data-squad.js; edição aqui é demonstração (estado da página). */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, HS = SA.HS, D = SA.D, Q = SA.Q, fmt = SA.fmt;
  var useState = React.useState;
  var MODELO = { 'claude-opus-5-5': 'Opus 5.5', 'claude-haiku-4-5': 'Haiku 4.5', 'claude-sonnet-5-5': 'Sonnet 5.5' };
  var TABS = ['alma', 'skills', 'ferramentas', 'le'];

  /* ---------- markdown mínimo: blocos de código, listas, parágrafos, **negrito**, `código` e {{variável}} */
  function inline(s, key) {
    var out = [], re = /(\*\*[^*]+\*\*|`[^`]+`|\{\{[^}]+\}\})/g, last = 0, m, i = 0;
    while ((m = re.exec(s))) {
      if (m.index > last) out.push(s.slice(last, m.index));
      var t = m[0], k = key + '-' + (i++);
      if (t.charAt(0) === '*') out.push(h('b', { key: k }, t.slice(2, -2)));
      else if (t.charAt(0) === '`') out.push(h('code', { key: k }, t.slice(1, -1)));
      else out.push(h('span', { key: k, className: 'sa-var', title: 'Variável preenchida na hora da conversa' }, t));
      last = re.lastIndex;
    }
    if (last < s.length) out.push(s.slice(last));
    return out;
  }
  function Md(p) {
    var segs = String(p.text).split(/(```[\s\S]*?```)/g), blocks = [];
    segs.forEach(function (seg, si) {
      if (/^```/.test(seg)) { blocks.push(h('pre', { key: 'c' + si, className: 'sa-pre' }, seg.replace(/^```\w*\n?/, '').replace(/\n?```$/, ''))); return; }
      seg.split(/\n\s*\n/).forEach(function (b, bi) {
        b = b.trim(); if (!b) return;
        var lines = b.split('\n'), key = si + '-' + bi;
        if (lines.every(function (l) { return /^\s*[-*] /.test(l); })) blocks.push(h('ul', { key: key }, lines.map(function (l, j) { return h('li', { key: j }, inline(l.replace(/^\s*[-*] /, ''), key + j)); })));
        else if (lines.every(function (l) { return /^\s*\d+\. /.test(l); })) blocks.push(h('ol', { key: key }, lines.map(function (l, j) { return h('li', { key: j }, inline(l.replace(/^\s*\d+\. /, ''), key + j)); })));
        else if (/^#+ /.test(b)) blocks.push(h('p', { key: key }, h('b', null, b.replace(/^#+ /, ''))));
        else blocks.push(h('p', { key: key }, inline(b.replace(/\n/g, ' '), key)));
      });
    });
    return h('div', { className: 'sa-md' }, blocks);
  }
  function words(s) { return (String(s).match(/\S+/g) || []).length; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function pyJson(o) { // json.dumps(sort_keys=True, ensure_ascii=False) do backend: separadores ", " e ": "
    if (Array.isArray(o)) return '[' + o.map(pyJson).join(', ') + ']';
    if (o && typeof o === 'object') return '{' + Object.keys(o).sort().map(function (k) { return JSON.stringify(k) + ': ' + pyJson(o[k]); }).join(', ') + '}';
    return JSON.stringify(o);
  }
  function deliveryName(id) { var d = Q.deliveries.filter(function (x) { return x.id === id; })[0]; return d ? d.nome : id; }

  /* ================================================= Alma */
  function Alma(p) {
    var a = p.a;
    var sS = useState(function () { return a.soul.secoes.map(function (s) { return Object.assign({ inc: true, orig: s.texto }, s); }); }), secs = sS[0], setSecs = sS[1];
    var vS = useState([{ v: 1, data: a.soul.data, hash: a.soul.hash, autor: 'squad/' + a.id + '/SOUL.md', ativa: true }]), vers = vS[0], setVers = vS[1];
    var eS = useState(null), edit = eS[0], setEdit = eS[1];
    var dS = useState(''), draft = dS[0], setDraft = dS[1];
    var cS = useState(false), cmp = cS[0], setCmp = cS[1];
    var ativa = vers.filter(function (v) { return v.ativa; })[0];
    var inc = secs.filter(function (s) { return s.inc; });
    var chars = inc.reduce(function (n, s) { return n + s.texto.length; }, a.soul.titulo.length + 2);
    var changed = secs.filter(function (s) { return s.texto !== s.orig; });
    var excl = secs.filter(function (s) { return !s.inc; });
    var dirty = changed.length + excl.length > 0;
    var next = vers.reduce(function (m, v) { return Math.max(m, v.v); }, 0) + 1;
    function set(i, patch) { setSecs(secs.map(function (s, j) { return j === i ? Object.assign({}, s, patch) : s; })); }
    function publicar() {
      setSecs(secs.map(function (s) { return Object.assign({}, s, { orig: s.texto, ver: next }); }));
      setVers([{ v: next, data: '2026-10-16', hash: 'rascunho', autor: 'Vic · painel', ativa: true }].concat(vers.map(function (v) { return Object.assign({}, v, { ativa: false }); })));
      setCmp(false);
      SA.toast('Versão ' + next + ' da Alma ' + (a.artigo === 'a' ? 'da ' : 'do ') + a.name + ' publicada. Registrada na auditoria.', a.forma);
    }
    function descartar() { setSecs(secs.map(function (s) { return Object.assign({}, s, { texto: s.orig, inc: true }); })); setCmp(false); SA.toast('Rascunho descartado.'); }
    function voltar(v) { setVers(vers.map(function (x) { return Object.assign({}, x, { ativa: x.v === v }); })); SA.toast('Versão ' + v + ' ativa de novo. Os próximos runs usam esta versão.', a.forma); }

    return h('div', null,
      h('div', { className: 'sa-tool', style: { justifyContent: 'space-between', marginBottom: 14 } },
        h('p', { style: { fontSize: 15 } }, h('b', null, inc.length + ' de ' + secs.length + ' seções entram no prompt'), ', cerca de ' + fmt.mil(chars) + ' caracteres'),
        h('span', { className: 'sa-mono sa-mut' }, 'versão ativa v' + ativa.v + ' · ' + ativa.hash + ' · ' + fmt.date(ativa.data) + ' · squad/' + a.id + '/SOUL.md')),
      dirty ? h('div', { style: { marginBottom: 16 } }, h(HS.ApprovalCard, {
        agent: a.forma, approveLabel: 'Publicar versão ' + next, adjustLabel: 'Comparar versões', dismissLabel: 'Descartar',
        onApprove: publicar, onAdjust: function () { setCmp(true); }, onDismiss: descartar,
        facts: [['Seções alteradas', String(changed.length)], ['Fora do prompt', String(excl.length)], ['Tamanho', fmt.mil(chars) + ' caracteres']]
      }, 'Versão ' + next + ' da Alma ' + (a.artigo === 'a' ? 'da ' : 'do ') + a.name + ' pronta para publicar. Confira em "O que ele lê" antes.')) : null,
      h('div', { className: 'sa-row c2 is-eq' }, secs.map(function (s, i) {
        var ed = edit === i, mudou = s.texto !== s.orig;
        return h('section', { key: s.titulo, className: 'sa-card sa-sec-card', 'aria-labelledby': 'sec-' + i, style: s.inc ? undefined : { opacity: .72 } },
          h('div', { className: 'sa-card-h' },
            h('div', { className: 'sa-card-t' }, h('h3', { id: 'sec-' + i }, s.titulo),
              h('small', { className: 'sa-mono' }, 'v' + (s.ver || ativa.v) + ' · ' + fmt.date(a.soul.data) + ' · ' + words(s.texto) + ' palavras')),
            mudou ? h(SA.Status, { kind: 'draft', s: true }, 'Rascunho') : null),
          h('div', { className: 'sa-card-b' }, ed ? h(SA.Field, { id: 'ed-' + i, label: 'Texto da seção (markdown)' },
            h('textarea', { id: 'ed-' + i, className: 'sa-inp', 'data-autofocus': true, value: draft, rows: 10, onChange: function (e) { setDraft(e.target.value); }, style: { minHeight: 200, fontSize: 14 } })) : h(Md, { text: s.texto })),
          h('div', { className: 'sa-sec-f' },
            h(HS.Checkbox, { checked: s.inc, onChange: function (v) { set(i, { inc: v }); } }, 'Entra no prompt'),
            ed ? h('span', { style: { display: 'flex', gap: 8 } },
              h(HS.Button, { variant: 'ghost', size: 's', onClick: function () { setEdit(null); } }, 'Cancelar'),
              h(HS.Button, { variant: 'primary', size: 's', icon: null, disabled: draft === s.texto, onClick: function () { set(i, { texto: draft }); setEdit(null); } }, 'Salvar rascunho'))
              : h(HS.Button, { variant: 'soft', size: 's', onClick: function () { setDraft(s.texto); setEdit(i); } }, 'Editar')));
      })),
      h(SA.Card, { title: 'Versões', sub: 'voltar versão é trocar a versão ativa; nada é apagado', style: { marginTop: 16 } },
        h('ul', { className: 'sa-list' }, vers.map(function (v) {
          return h('li', { key: v.v, className: 'sa-li' }, h('span', { className: 'sa-biz', 'aria-hidden': true }, 'v' + v.v),
            h('span', { className: 'sa-li-t' }, h('b', null, 'Versão ' + v.v + (v.ativa ? ' · ativa' : '')), h('small', null, fmt.date(v.data) + ' · ' + v.autor + ' · ' + v.hash)),
            v.ativa ? h(SA.Status, { kind: 'done' }, 'Em uso') : h(HS.Button, { variant: 'soft', size: 's', onClick: function () { voltar(v.v); } }, 'Voltar para esta versão'));
        }))),
      h(SA.Dialog, { open: cmp, wide: true, onClose: function () { setCmp(false); }, agent: a.forma, title: 'Comparar: versão ' + ativa.v + ' e rascunho',
        desc: changed.length ? changed.length + ' seção alterada' + (changed.length > 1 ? 's' : '') + (excl.length ? '; ' + excl.length + ' fora do prompt' : '') : 'Nenhum texto mudou; ' + excl.length + ' seção fora do prompt.',
        footer: [h(HS.Button, { key: 'd', variant: 'ghost', size: 's', onClick: descartar }, 'Descartar rascunho'), h(HS.Button, { key: 'p', variant: 'primary', size: 's', icon: null, onClick: publicar }, 'Publicar versão ' + next)] },
        changed.concat(excl.filter(function (s) { return changed.indexOf(s) < 0; })).map(function (s) {
          return h('div', { key: s.titulo, style: { marginBottom: 14 } }, h('p', { className: 'sa-lbl', style: { marginBottom: 6 } }, s.titulo + (s.inc ? '' : ' · sai do prompt')),
            h('div', { className: 'sa-row c2' },
              h('div', null, h('p', { style: { fontSize: 12.5, fontWeight: 700, marginBottom: 4 } }, 'Versão ' + ativa.v), h('pre', { className: 'sa-pre', style: { maxHeight: 220 } }, s.orig)),
              h('div', null, h('p', { style: { fontSize: 12.5, fontWeight: 700, marginBottom: 4 } }, 'Rascunho'), h('pre', { className: 'sa-pre', style: { maxHeight: 220, background: 'var(--hs-branco)', boxShadow: 'inset 0 0 0 1.5px var(--hs-tinta)' } }, s.inc ? s.texto : '(fora do prompt)'))));
        })));
  }

  /* ================================================= Skills */
  function skillSections(corpo) {
    var parts = corpo.split(/^## +(.+)$/m), head = parts[0], out = [];
    for (var i = 1; i < parts.length; i += 2) out.push({ t: parts[i].replace(/`/g, '').trim(), x: parts[i + 1].trim() });
    return { head: head.replace(/^# .+\n?/, '').trim(), secs: out };
  }
  function Skills(p) {
    var a = p.a;
    var first = a.deliveries.filter(function (d) { return a.skills[d]; })[0] || a.deliveries[0];
    var cS = useState(first), cur = cS[0], setCur = cS[1];
    var rS = useState({}), rasc = rS[0], setRasc = rS[1];
    var eS = useState(null), edit = eS[0], setEdit = eS[1];
    var dS = useState(''), draft = dS[0], setDraft = dS[1];
    var sk = a.skills[cur], cat = Q.deliveries.filter(function (d) { return d.id === cur; })[0], pr = D.catalogo[cur];
    var tabs = a.deliveries.map(function (d) {
      var n = deliveryName(d).split(' ').slice(0, 3).join(' ');
      return { id: d, l: d + ' · ' + n + (a.skills[d] ? '' : ' (sem skill)') };
    });
    var body;
    if (sk) {
      var parsed = skillSections(sk.corpo);
      body = h('div', null,
        h(SA.Card, { title: cur + ' · ' + sk.meta.titulo, sub: 'squad/' + a.id + '/skills/' + cur + '.md',
          actions: h(SA.Status, { kind: 'done' }, 'Escrita') },
          h('dl', { className: 'sa-kv', style: { marginBottom: 12 } },
            h('dt', null, 'Versão'), h('dd', { className: 'sa-mono' }, 'v1 · ' + sk.hash + ' · ' + fmt.date(sk.data)),
            h('dt', null, 'Hash do prompt'), h('dd', { className: 'sa-mono' }, sk.promptHash.slice(0, 12) + ' (o mesmo que o runtime grava em agent_prompt_versions)'),
            h('dt', null, 'Tipo de entrega'), h('dd', { className: 'sa-mono' }, sk.meta.entrega_kind || '—'),
            h('dt', null, 'Briefing essencial'), h('dd', null, (sk.meta.essenciais || []).join(', ') || '—'),
            h('dt', null, 'Tamanho'), h('dd', { className: 'sa-num' }, fmt.mil(sk.caracteres) + ' caracteres')),
          parsed.head ? h(Md, { text: parsed.head }) : null),
        h('div', { className: 'sa-row c2 is-eq', style: { marginTop: 16 } }, parsed.secs.map(function (s, i) {
          var key = cur + ':' + i, txt = rasc[key] != null ? rasc[key] : s.x, ed = edit === key;
          return h('section', { key: key, className: 'sa-card sa-sec-card', 'aria-labelledby': 'sk-' + i },
            h('div', { className: 'sa-card-h' }, h('div', { className: 'sa-card-t' }, h('h3', { id: 'sk-' + i }, s.t), h('small', { className: 'sa-mono' }, words(txt) + ' palavras')),
              rasc[key] != null ? h(SA.Status, { kind: 'draft', s: true }, 'Rascunho') : null),
            h('div', { className: 'sa-card-b' }, ed ? h(SA.Field, { id: 'ske-' + i, label: 'Texto da seção (markdown)' },
              h('textarea', { id: 'ske-' + i, className: 'sa-inp', value: draft, 'data-autofocus': true, rows: 10, onChange: function (e) { setDraft(e.target.value); }, style: { minHeight: 200, fontSize: 13.5 } })) : h(Md, { text: txt })),
            h('div', { className: 'sa-sec-f', style: { justifyContent: 'flex-end' } }, ed ? h('span', { style: { display: 'flex', gap: 8 } },
              h(HS.Button, { variant: 'ghost', size: 's', onClick: function () { setEdit(null); } }, 'Cancelar'),
              h(HS.Button, { variant: 'primary', size: 's', icon: null, onClick: function () { var r = Object.assign({}, rasc); r[key] = draft; setRasc(r); setEdit(null); SA.toast('Rascunho salvo. Publicar gera a versão 2 da skill ' + cur + '.', a.forma); } }, 'Salvar rascunho'))
              : h(HS.Button, { variant: 'soft', size: 's', onClick: function () { setDraft(txt); setEdit(key); } }, 'Editar')));
        })));
    } else {
      body = h(SA.Card, { title: cur + ' · ' + (cat ? cat.nome : ''), sub: 'squad/' + a.id + '/skills/' + cur + '.md não existe ainda' },
        h(SA.Empty, { agent: a.forma, title: 'Skill ainda não escrita',
          actions: h(HS.Button, { variant: 'soft', size: 's', onClick: function () { SA.toast('Demonstração: o rascunho começa com briefing mínimo, etapas, formato da entrega e critérios de aceite.', a.forma); } }, 'Começar rascunho') },
          'Cada delivery do catálogo ganha uma skill na Fase 1: procedimento, formato da entrega e critérios de aceite. Até lá, ' + (a.artigo === 'a' ? 'a ' : 'o ') + a.name + ' não executa esta delivery.'),
        cat ? h('dl', { className: 'sa-kv', style: { maxWidth: 820, margin: '0 auto 6px' } },
          h('dt', null, 'Resultado verificável'), h('dd', null, cat.resultado),
          h('dt', null, 'Integrações'), h('dd', null, cat.integracoes),
          h('dt', null, 'Pré-requisitos'), h('dd', null, cat.prerequisitos),
          h('dt', null, 'Profundidade'), h('dd', null, pr ? pr[1] : '—'),
          h('dt', null, 'Preço'), h('dd', null, pr ? (pr[0] ? pr[0] + ' créditos · provisório' : 'incluído · provisório') : '—')) : null);
    }
    return h('div', null,
      h('div', { style: { marginBottom: 14 } }, h(SA.Tabs, { line: true, idp: 'sk', tabs: tabs, value: cur, onChange: setCur, label: 'Deliveries ' + (a.artigo === 'a' ? 'da ' : 'do ') + a.name, panel: 'sk-panel' })),
      h(SA.TabPanel, { id: 'sk-panel', idp: 'sk', value: cur }, body));
  }

  /* ================================================= Ferramentas e limites */
  function Ferramentas(p) {
    var a = p.a;
    var todas = []; SA.agents().forEach(function (x) { x.ferramentas.forEach(function (f) { if (todas.indexOf(f) < 0) todas.push(f); }); });
    todas.sort();
    var fS = useState(a.ferramentas), sel = fS[0], setSel = fS[1];
    var eS = useState(false), edit = eS[0], setEdit = eS[1];
    var uS = useState(a.autonomia_maxima), auto = uS[0], setAuto = uS[1];
    var dirty = auto !== a.autonomia_maxima || sel.length !== a.ferramentas.length || sel.some(function (f) { return a.ferramentas.indexOf(f) < 0; });
    function sens(f) { var n = a.notas[f] || ''; return /exige|só após|permiss/i.test(n) || /^(ads\.|envios\.|jornadas\.ativar|canais\.publicar|canais\.responder|cms\.publicar)/.test(f); }
    var etapas = [];
    if (a.modelo.triagem) etapas.push(['Triagem', MODELO[a.modelo.triagem], a.notas.triagem || '']);
    etapas.push(['Padrão', MODELO[a.modelo.padrao] + ' · esforço ' + a.modelo.effort + ' · thinking ' + a.modelo.thinking, a.notas.padrao || '']);
    if (a.modelo.imagem) etapas.push(['Imagem', 'a homologar', a.notas.imagem || 'motor de imagem do Vic']);
    if (a.modelo.relatorios_recorrentes) etapas.push(['Relatórios recorrentes', 'Batch API', a.notas.relatorios_recorrentes || '']);
    return h('div', null,
      h('p', { className: 'sa-mono sa-mut', style: { marginBottom: 12 } }, 'squad/' + a.id + '/agent.yaml · v1 · ' + a.yaml.hash + ' · ' + fmt.date(a.yaml.data)),
      dirty ? h(SA.Note, { kind: 'draft', label: 'Rascunho', style: { marginBottom: 14, alignItems: 'center' } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 } },
          h('span', null, 'Mudanças no contrato do agente. Ferramenta fora da lista é recusada pelo runtime.'),
          h('span', { style: { display: 'flex', gap: 8 } },
            h(HS.Button, { variant: 'ghost', size: 's', onClick: function () { setSel(a.ferramentas); setAuto(a.autonomia_maxima); } }, 'Desfazer'),
            h(HS.Button, { variant: 'primary', size: 's', icon: null, onClick: function () { SA.toast('Demonstração: versão 2 do agent.yaml registrada na auditoria.', a.forma); } }, 'Salvar como versão nova')))) : null,
      h('div', { className: 'sa-row c21' },
        h(SA.Card, { title: 'Ferramentas permitidas', sub: sel.length + ' de ' + todas.length + ' do catálogo de ferramentas',
          actions: h(HS.Button, { variant: edit ? 'primary' : 'soft', size: 's', icon: null, onClick: function () { setEdit(!edit); } }, edit ? 'Concluir' : 'Editar lista') },
          edit ? h('div', { className: 'sa-checks', style: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '10px 18px' } }, todas.map(function (f) {
            var on = sel.indexOf(f) >= 0;
            return h(HS.Checkbox, { key: f, checked: on, onChange: function (v) { setSel(v ? sel.concat([f]) : sel.filter(function (x) { return x !== f; })); } }, h('span', { className: 'sa-mono' }, f));
          })) : h('ul', { className: 'sa-list' }, sel.map(function (f) {
            return h('li', { key: f, className: 'sa-li' }, h('span', { className: 'sa-li-t' }, h('b', { className: 'sa-mono', style: { fontSize: 12.5 } }, f), a.notas[f] ? h('small', null, a.notas[f]) : null),
              sens(f) ? h(HS.Tag, { kind: 'you' }, 'Pede autorização') : h(HS.Tag, { kind: 'auto' }, 'Autônoma'));
          }))),
        h('div', null,
          h(SA.Card, { title: 'Autonomia máxima', sub: 'teto; cada ação externa ainda pede autorização' },
            h(HS.Segmented, { label: 'Autonomia máxima', options: ['analisar', 'preparar', 'executar'], value: auto, onChange: setAuto, itemWidth: 96 }),
            h('p', { className: 'sa-mut', style: { fontSize: 13, marginTop: 10 } }, a.notas.autonomia_maxima && a.notas.autonomia_maxima.indexOf('|') < 0 ? a.notas.autonomia_maxima : 'Analisar e preparar são autônomos; executar só com permissão registrada.')),
          h(SA.Card, { title: 'Modelo por etapa', actions: h('a', { className: 'sa-rowlink', href: 'modelos.html#regras', style: { fontSize: 13 } }, 'Regras por tarefa') },
            h('ul', { className: 'sa-list' }, etapas.map(function (e) {
              return h('li', { key: e[0], className: 'sa-li' }, h('span', { className: 'sa-li-t' }, h('b', null, e[0]), h('small', null, e[1] + (e[2] ? ' · ' + e[2] : ''))));
            }))),
          h(SA.Card, { title: 'Colabora com' },
            h(HS.SquadStack, { agents: a.colabora_com.map(function (id) { return SA.ag(id).forma; }), label: a.colabora_com.map(function (id) { return SA.ag(id).name; }).join(', ') })))),
      h('div', { className: 'sa-row c2', style: { marginTop: 16 } },
        h(SA.Card, { title: 'Nunca faz', sub: 'limites do contrato' },
          h('ul', { className: 'sa-list' }, a.nunca.map(function (n) { return h('li', { key: n, className: 'sa-li' }, h(SA.Icon, { name: 'xx', size: 16 }), h('span', { className: 'sa-li-t' }, n)); }))),
        h(SA.Card, { title: 'Memória', sub: 'o que lê e o que pode sugerir (sugestão só vira regra com confirmação)' },
          h('p', { className: 'sa-lbl', style: { marginBottom: 6 } }, 'Lê'),
          h('div', { className: 'sa-chips' }, a.memoria.le.map(function (m) { return h('span', { key: m, className: 'sa-chip is-mono' }, m); })),
          h('p', { className: 'sa-lbl', style: { margin: '14px 0 6px' } }, 'Sugere'),
          h('div', { className: 'sa-chips' }, a.memoria.sugere.map(function (m) { return h('span', { key: m, className: 'sa-chip is-mono', style: { boxShadow: 'none', outline: '1.2px dashed rgba(15,13,34,.45)', outlineOffset: '-1.2px' } }, m); })))));
  }

  /* ================================================= O que ele lê */
  var CONTAS = {
    miolo: { marca: 'Miolo', idioma: 'pt-BR', fatos: ['Padaria de fermentação natural, aberta em 2019', 'Público: moradores de Pinheiros e Vila Madalena, 28 a 45 anos', 'Tom de voz: acolhedor, direto, sem gíria', 'Canais: Instagram e WhatsApp', 'Produto âncora: pão de fermentação longa', 'Decisão: não usar a palavra "artesanal" nas legendas'] },
    vitta: { marca: 'Vitta Estética', idioma: 'pt-BR', fatos: ['Clínica de estética e bem-estar em Vitória/ES', 'Público principal: mulheres de 30 a 50 anos em Vitória'] },
    trilha: { marca: 'Trilha Urbana', idioma: 'pt-BR', fatos: [] }
  };
  var EXEMPLO = {
    '04.01': { titulo: 'Legendas da fornada de sábado', pedido: 'Quero legendas para a fornada especial de sábado', briefing: { canal: 'instagram', objetivo: 'encomendas até sexta', tema: 'fornada especial de sábado' }, resumo: 'Duas versões de legenda para o Instagram, no tom confirmado da marca.' },
    '01.01': { titulo: 'Novo pedido', pedido: 'Quero vender mais neste fim de semana', briefing: {}, essenciais: 'objetivo, contexto, restrições' }
  };
  function Le(p) {
    var a = p.a, comSkill = Object.keys(a.skills);
    var dS = useState(comSkill[0] || a.deliveries[0]), del = dS[0], setDel = dS[1];
    var cS = useState('miolo'), conta = cS[0], setConta = cS[1];
    var ct = CONTAS[conta], sk = a.skills[del];
    var ex = EXEMPLO[del] || { titulo: deliveryName(del), pedido: (a.pedidos_sugeridos[0] || '').split('{{marca.nome}}').join(ct.marca), briefing: { objetivo: 'a definir na triagem' }, resumo: 'Encaminhado pelo Nexo.' };
    var b1 = Q.regrasCompartilhadas + '\n\n' + a.soul.texto.split('{{marca.nome}}').join(ct.marca);
    var b2 = sk ? sk.corpo : '';
    var b3 = ['<idioma>' + esc(ct.idioma) + '</idioma>', '<marca>' + esc(ct.marca) + '</marca>',
      ct.fatos.length ? '<fatos_da_marca>' + ct.fatos.map(function (f) { return '<fato>' + esc(f) + '</fato>'; }).join('\n') + '</fatos_da_marca>' : '<fatos_da_marca/>'].join('\n');
    var ctx = ['<trabalho delivery="' + esc(del) + '">' + esc(ex.titulo) + '</trabalho>', '<historico/>', '<pedido>' + esc(ex.pedido) + '</pedido>', '<briefing>' + esc(pyJson(ex.briefing)) + '</briefing>'];
    var msg = (a.id === 'nexo' ? ctx.concat(['<essenciais>' + esc(ex.essenciais || '') + '</essenciais>', '<etapa>triagem</etapa>']) : ctx.concat(['<resumo_do_nexo>' + esc(ex.resumo || '') + '</resumo_do_nexo>', '<etapa>produzir</etapa>'])).join('\n');
    var blocos = [
      { t: 'System · bloco 1', s: 'regras compartilhadas + SOUL · prefixo estável', x: b1 },
      { t: 'System · bloco 2', s: sk ? 'skill ' + del + ' · em cache' : 'skill ' + del + ' ainda não escrita', x: sk ? b2 : '', vazio: !sk },
      { t: 'System · bloco 3', s: 'idioma, marca e fatos confirmados · em cache', x: b3 },
      { t: 'Mensagem do usuário', s: 'muda a cada chamada: trabalho, histórico, pedido e etapa', x: msg }
    ];
    var total = blocos.reduce(function (n, b) { return n + b.x.length; }, 0);
    var sys = blocos.slice(0, 3).reduce(function (n, b) { return n + b.x.length; }, 0);
    return h('div', null,
      h('div', { className: 'sa-tool', style: { marginBottom: 14 } },
        h(SA.Dropdown, { prefix: 'Skill', value: del, onChange: setDel, title: 'Delivery', options: a.deliveries.map(function (d) { return { v: d, l: d + (a.skills[d] ? '' : ' (sem skill)') }; }) }),
        h(SA.Dropdown, { prefix: 'Conta de exemplo', value: conta, onChange: setConta, title: 'Conta de exemplo', options: [{ v: 'miolo', l: 'Miolo' }, { v: 'vitta', l: 'Vitta Estética' }, { v: 'trilha', l: 'Trilha Urbana (sem memória)' }] }),
        h('span', { className: 'sa-grow' }),
        h(HS.Button, { variant: 'soft', size: 's', onClick: function () { if (navigator.clipboard) navigator.clipboard.writeText(blocos.map(function (b) { return b.x; }).join('\n\n')).catch(function () {}); SA.toast('Prompt montado copiado.', a.forma); } }, 'Copiar o prompt')),
      h(SA.Metrics, { items: [
        { l: 'System', v: fmt.mil(sys), u: 'caracteres', d: '≈ ' + fmt.int(sys / 4) + ' tokens' },
        { l: 'Mensagem', v: fmt.mil(msg.length), u: 'caracteres', d: '≈ ' + fmt.int(msg.length / 4) + ' tokens' },
        { l: 'Total estimado', v: '≈ ' + fmt.int(total / 4), u: 'tokens', d: 'caracteres ÷ 4; a conta exata vem da API' },
        { l: 'Hash do prompt', v: sk ? sk.promptHash.slice(0, 7) : '—', d: sk ? 'igual ao do runtime (agent_prompt_versions)' : 'sem skill, sem versão de prompt' }
      ] }),
      h(SA.Note, { label: 'Só leitura', style: { margin: '16px 0' } }, 'Montado na mesma ordem do runtime (apps/backend, squad/prompt.py). Preço, plano e catálogo nunca entram aqui: vêm do banco a cada conversa. A variável ', h('span', { className: 'sa-var' }, '{{marca.nome}}'), ' já aparece preenchida com a conta de exemplo.'),
      blocos.map(function (b) {
        return h('section', { key: b.t, className: 'sa-blk', 'aria-label': b.t },
          h('div', { className: 'sa-blk-h' }, h('b', null, b.t + ' · ' + b.s), h('span', { className: 'sa-mono sa-mut' }, fmt.int(b.x.length) + ' caracteres')),
          b.vazio ? h('p', { className: 'sa-mut', style: { padding: '8px 16px 14px', fontSize: 13.5 } }, 'squad/' + a.id + '/skills/' + del + '.md não existe. Sem skill, o runtime não executa esta delivery.') :
            h('pre', { className: 'sa-pre', tabIndex: 0 }, b.x));
      }));
  }

  /* ================================================= página */
  function App() {
    var id = SA.qs('a'); var a = SA.ag(id) || SA.ag('nexo');
    var tv = SA.useHashTab('alma', TABS), tab = tv[0], setTab = tv[1];
    var ags = SA.agents(), i = ags.indexOf(a);
    var nSkills = Object.keys(a.skills).length;
    var tabs = [
      { id: 'alma', l: 'Alma' },
      { id: 'skills', l: 'Skills', badge: nSkills + '/' + a.deliveries.length },
      { id: 'ferramentas', l: 'Ferramentas e limites' },
      { id: 'le', l: 'O que ele lê' }
    ];
    return h(SA.Page, { nav: 'agente', agent: a.id, crumbs: [{ l: 'Squad', href: 'squad.html' }, { l: a.name }], title: a.name,
      avatar: h(HS.Agent, { agent: a.forma, size: 44, title: a.name }),
      desc: [a.papel_completo + ' · ' + a.area_ui + '. ', h('b', { key: 'p' }, inline(a.pitch, 'pt'))],
      actions: [
        h(HS.IconButton, { key: 'p', icon: 'left', label: 'Agente anterior: ' + ags[(i + 6) % 7].name, onClick: function () { location.href = 'agente.html?a=' + ags[(i + 6) % 7].id + location.hash; } }),
        h(HS.IconButton, { key: 'n', icon: 'right', label: 'Próximo agente: ' + ags[(i + 1) % 7].name, onClick: function () { location.href = 'agente.html?a=' + ags[(i + 1) % 7].id + location.hash; } })
      ] },
      h('div', { className: 'sa-tabs-w' },
        h(SA.Tabs, { tabs: tabs, value: tab, onChange: setTab, label: 'Partes do agente', panel: 'ag-panel', idp: 'ag' }),
        h(HS.StatePill, { agent: a.forma, label: MODELO[a.modelo.padrao], detail: 'esforço ' + a.modelo.effort })),
      h(SA.TabPanel, { id: 'ag-panel', idp: 'ag', value: tab },
        tab === 'alma' ? h(Alma, { key: a.id, a: a }) : tab === 'skills' ? h(Skills, { key: a.id, a: a }) : tab === 'ferramentas' ? h(Ferramentas, { key: a.id, a: a }) : h(Le, { key: a.id, a: a })));
  }
  SA.render(App);
})();
