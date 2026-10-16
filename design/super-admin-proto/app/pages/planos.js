/* Planos e recargas: Free e assinaturas (mensal e anual) com créditos por ciclo, bônus, validade e rollover;
   recargas avulsas (SPOT) com validade. Valores de EXEMPLO. "Preço aprovado comercialmente" é a trava de
   "à venda"; cada gravação vira versão nova e vai para a auditoria. */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, HS = SA.HS, D = SA.D, fmt = SA.fmt;
  var useState = React.useState;

  var CAMPOS = {
    plano: [
      { k: 'creditos', l: 'Créditos por ciclo', t: 'int', min: 0 },
      { k: 'bonus', l: 'Bônus (%)', t: 'int', min: 0, max: 100 },
      { k: 'validade', l: 'Validade (dias)', t: 'int', min: 1 },
      { k: 'rollover', l: 'Rollover (% do ciclo)', t: 'int', min: 0, max: 100 },
      { k: 'membros', l: 'Membros incluídos', t: 'int', min: 1 }
    ],
    recarga: [
      { k: 'creditos', l: 'Créditos', t: 'int', min: 1 },
      { k: 'validade', l: 'Validade (dias)', t: 'int', min: 1 }
    ]
  };
  var F_PRECO = { k: 'preco', t: 'brl', min: 0 };
  var NOME = { preco: 'preço', creditos: 'créditos', bonus: 'bônus', validade: 'validade', rollover: 'rollover', membros: 'membros', nota: 'nota', aprovado: 'preço aprovado', aVenda: 'à venda' };
  var ROW = { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 4 };
  var BTN_LINK = { border: 0, background: 'none', padding: 0, margin: 0, cursor: 'pointer', fontSize: 12.5 };

  function plural(n, s, p) { return n + ' ' + (n === 1 ? s : p); }
  /* número digitado: inteiro, ou reais com vírgula (aceita 1.490,00) */
  function num(v, t) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return NaN;
    if (t === 'brl') {
      s = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(',', '.');
      return /^\d+(\.\d{1,2})?$/.test(s) ? Number(s) : NaN;
    }
    return /^\d+$/.test(s) ? Number(s) : NaN;
  }
  function erroDe(f, v) {
    var n = num(v, f.t);
    if (isNaN(n)) return f.t === 'brl' ? 'Use só números, com até duas casas decimais.' : 'Use um número inteiro.';
    if (f.min != null && n < f.min) return 'O mínimo é ' + f.min + '.';
    if (f.max != null && n > f.max) return 'O máximo é ' + f.max + '.';
    return null;
  }
  function valores(x, tipo) {
    var o = { preco: String(x.preco).replace('.', ','), aprovado: !!x.aprovado, aVenda: !!x.aVenda };
    CAMPOS[tipo].forEach(function (f) { o[f.k] = String(x[f.k]); });
    if (tipo === 'plano') o.nota = x.nota || '';
    return o;
  }
  function alterados(a, b, tipo) {
    var out = [];
    if (num(a.preco, 'brl') !== num(b.preco, 'brl')) out.push('preco');
    CAMPOS[tipo].forEach(function (f) { if (num(a[f.k], f.t) !== num(b[f.k], f.t)) out.push(f.k); });
    if (tipo === 'plano' && a.nota.trim() !== b.nota.trim()) out.push('nota');
    if (a.aprovado !== b.aprovado) out.push('aprovado');
    if (a.aVenda !== b.aVenda) out.push('aVenda');
    return out;
  }
  /* R$ por crédito: preço do ciclo de cobrança ÷ créditos entregues nele (anual = 12 ciclos de créditos; bônus somado) */
  function porCredito(v, item, tipo) {
    var p = num(v.preco, 'brl'), c = num(v.creditos, 'int'), b = tipo === 'plano' ? num(v.bonus, 'int') : 0;
    if (isNaN(p) || isNaN(c) || isNaN(b) || c <= 0) return null;
    var meses = tipo === 'plano' && item.ciclo === 'anual' ? 12 : 1, total = c * meses * (1 + b / 100);
    return { v: p / total, total: total, meses: meses, p: p, c: c, b: b };
  }
  function formula(pc) {
    var txt = fmt.brl(pc.p) + ' ÷ ' + fmt.int(pc.total) + ' créditos';
    if (pc.meses === 1 && !pc.b) return txt;
    return txt + ' (' + fmt.int(pc.c) + (pc.meses > 1 ? ' × ' + pc.meses + ' meses' : '') + (pc.b ? ' + ' + pc.b + '% de bônus' : '') + ')';
  }
  function comparar(pc, ref) {
    if (!pc || !ref || !ref.pc || !ref.pc.v) return null;
    var d = pc.v / ref.pc.v - 1;
    if (Math.abs(d) < 0.005) return 'igual ao ' + ref.nome + ' (' + fmt.brl(ref.pc.v) + ')';
    return fmt.pct(Math.abs(d)) + (d > 0 ? ' acima' : ' abaixo') + ' do ' + ref.nome + ' (' + fmt.brl(ref.pc.v) + ')';
  }

  /* ---------- um cartão por plano ou recarga: rascunho local, trava de venda e "Salvar como versão nova" */
  function Oferta(p) {
    var it = p.item, tipo = p.tipo, salvo = p.salvo, pid = (tipo === 'plano' ? 'pl-' : 'rc-') + it.id;
    var dS = useState(salvo.v), v = dS[0], setV = dS[1];
    var muds = alterados(salvo.v, v, tipo), erros = {};
    [F_PRECO].concat(CAMPOS[tipo]).forEach(function (f) { var e = erroDe(f, v[f.k]); if (e) erros[f.k] = e; });
    var temErro = Object.keys(erros).length > 0;
    var gratis = tipo === 'plano' && it.preco === 0; // Free: preço fixo em zero
    var art = tipo === 'recarga' ? 'a' : 'o'; // o Pro mensal, a Recarga 100
    var pc = porCredito(v, it, tipo), cmp = tipo === 'recarga' ? comparar(pc, p.refPreco) : null;
    var rotulo = tipo === 'recarga' ? 'Preço' : it.ciclo === 'anual' ? 'Preço por ano' : 'Preço por mês';
    var contas = tipo === 'plano' ? D.contas.filter(function (c) { return c.plano === it.id; }) : null;

    function set(k, x) { setV(function (o) { var n = Object.assign({}, o); n[k] = x; return n; }); }
    function toggleAprov() {
      if (v.aprovado && v.aVenda) { setV(Object.assign({}, v, { aprovado: false, aVenda: false })); SA.toast('À venda desligado junto: sem preço aprovado, ' + art + ' ' + it.nome + ' sai da venda.'); }
      else set('aprovado', !v.aprovado);
    }
    function toggleVenda() {
      if (!v.aprovado && !v.aVenda) { SA.toast('À venda fica travado até o preço ' + (art === 'a' ? 'da ' : 'do ') + it.nome + ' ser aprovado comercialmente.'); return; }
      set('aVenda', !v.aVenda);
    }
    function salvar() {
      var n = Object.assign({}, v, { preco: String(num(v.preco, 'brl')).replace('.', ',') }); // grava normalizado: "0159" vira "159"
      CAMPOS[tipo].forEach(function (f) { n[f.k] = String(num(v[f.k], f.t)); });
      if (tipo === 'plano') n.nota = v.nota.trim();
      setV(n); p.onSave(n); SA.toast('Demonstração: ' + it.nome + (art === 'a' ? ' salva' : ' salvo') + ' como versão ' + (salvo.versao + 1) + '. A mudança entra na auditoria.'); }

    var sub = (tipo === 'recarga' ? 'Recarga avulsa (SPOT)' : gratis ? 'Grátis, ciclo mensal' : it.ciclo === 'anual' ? 'Assinatura anual' : 'Assinatura mensal') + ' · versão ' + salvo.versao;
    return h(SA.Card, { id: pid, title: it.nome, className: 'pl-oferta',
      actions: salvo.v.aVenda ? h(SA.Status, { kind: 'done', s: true }, 'À venda') : h(SA.Status, { kind: 'pause', s: true }, 'Fora de venda') },
      h('p', { className: 'sa-mut', style: { margin: '-6px 0 14px', fontSize: 12.5 } }, sub),
      /* preço em destaque, com o cálculo por crédito logo abaixo */
      h(SA.Field, { id: pid + '-preco', label: h(React.Fragment, null, rotulo, ' ', h(HS.Tag, { kind: 'sim' }, 'Exemplo')) },
        h('div', { className: 'sa-inp-w' }, h('span', { 'aria-hidden': true }, 'R$'),
          h('input', { id: pid + '-preco', className: 'sa-inp sa-num', inputMode: 'decimal', value: v.preco, readOnly: gratis,
            'aria-invalid': erros.preco ? true : undefined, 'aria-describedby': pid + '-preco-d',
            onChange: function (e) { set('preco', e.target.value); }, style: { height: 48, fontSize: 20, fontWeight: 700 } })),
        h('small', { id: pid + '-preco-d', style: erros.preco ? { color: 'var(--hs-coord-labio)' } : undefined },
          erros.preco || (gratis ? 'Plano grátis: o preço fica em zero.' : tipo === 'recarga' ? 'Cobrado uma vez, na compra.' : it.ciclo === 'anual' ? 'Cobrado uma vez por ano.' : 'Cobrado todo mês.'))),
      h('div', { style: { marginTop: 10, padding: '10px 12px', borderRadius: 'var(--r-acao)', background: 'var(--hs-papel)' } },
        h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 } },
          h('span', { className: 'sa-lbl' }, 'R$ por crédito'),
          h('b', { className: 'sa-num', style: { fontSize: 16 } }, gratis ? 'Grátis' : pc ? fmt.brl(pc.v) : '—')),
        h('small', { className: 'sa-mut', style: { display: 'block', marginTop: 2, fontSize: 12, lineHeight: 1.4, minHeight: tipo === 'plano' ? '2.8em' : undefined } },
          gratis ? fmt.int(num(v.creditos, 'int') || 0) + ' créditos por ciclo, sem cobrança' : pc ? formula(pc) : 'Use números válidos em preço, créditos' + (tipo === 'plano' ? ' e bônus' : '') + ' para calcular.'),
        cmp ? h('small', { style: { display: 'block', marginTop: 2, fontSize: 12, lineHeight: 1.4, fontWeight: 600 } }, cmp) : null),
      h('div', { style: { display: 'grid', gap: 10, marginTop: 14 } }, CAMPOS[tipo].map(function (f) {
        var id = pid + '-' + f.k, e = erros[f.k];
        return h(SA.Field, { key: f.k, id: id, label: f.l, style: ROW },
          h('input', { id: id, className: 'sa-inp sa-num', inputMode: 'numeric', value: v[f.k], 'aria-invalid': e ? true : undefined, 'aria-describedby': e ? id + '-e' : undefined,
            onChange: function (ev) { set(f.k, ev.target.value); }, style: { width: 96, height: 38, marginLeft: 'auto', textAlign: 'right' } }),
          e ? h('small', { id: id + '-e', style: { flexBasis: '100%', textAlign: 'right', color: 'var(--hs-coord-labio)' } }, e) : null);
      })),
      tipo === 'plano' ? h(SA.Field, { id: pid + '-nota', label: 'Nota', style: { marginTop: 14 } },
        h('textarea', { id: pid + '-nota', className: 'sa-inp', rows: 2, value: v.nota, onChange: function (e) { set('nota', e.target.value); }, style: { minHeight: 68 } })) : null,
      contas ? h('div', { style: { marginTop: 14, fontSize: 13, lineHeight: 1.5 } },
        h('span', { className: 'sa-lbl', style: { display: 'block', marginBottom: 2 } }, 'Contas neste plano'),
        contas.length ? h('span', null, h('b', null, plural(contas.length, 'conta', 'contas')), ': ',
          contas.map(function (c, k) { return h(React.Fragment, { key: c.id }, k ? (k === contas.length - 1 ? ' e ' : ', ') : null, h('a', { href: 'conta.html?id=' + c.id }, c.marca)); }), '.') :
          h('span', { className: 'sa-mut' }, 'Nenhuma conta neste plano.')) : null,
      h('div', { className: 'sa-checks', style: { marginTop: 16 } },
        h(HS.Checkbox, { checked: v.aprovado, onChange: toggleAprov }, 'Preço aprovado comercialmente'),
        h('span', { className: v.aprovado ? undefined : 'sa-cb-off', title: v.aprovado ? undefined : 'Travado até o preço ser aprovado' },
          h(HS.Checkbox, { checked: v.aVenda, onChange: toggleVenda }, 'À venda', v.aprovado ? null : h('span', { className: 'sa-sr' }, ' (travado até o preço ser aprovado)'))),
        h('small', { className: 'sa-mut', style: { fontSize: 12.5, lineHeight: 1.4 } }, 'À venda só liga com o preço aprovado comercialmente. Sem a trava marcada, nada é vendido.')),
      h('div', { style: { flex: 1 } }),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--hs-l1)' } },
        h('small', { className: 'sa-mut', style: { flex: '1 1 100%', fontSize: 12.5, lineHeight: 1.4 } },
          temErro ? 'Corrija os campos marcados para salvar.' :
            muds.length ? h(React.Fragment, null, plural(muds.length, 'alteração', 'alterações') + ': ' + muds.map(function (k) { return NOME[k]; }).join(', ') + '. ',
              h('button', { type: 'button', className: 'sa-rowlink', style: BTN_LINK, onClick: function () { setV(salvo.v); } }, 'Descartar')) :
              'Sem alterações. Vale a versão ' + salvo.versao + '.'),
        h(HS.Button, { variant: 'primary', size: 's', icon: null, disabled: !muds.length || temErro, onClick: salvar }, 'Salvar como versão nova')));
  }

  function App() {
    var sS = useState(function () {
      var o = {};
      D.planos.forEach(function (x) { o['plano:' + x.id] = { v: valores(x, 'plano'), versao: x.versao }; });
      D.recargas.forEach(function (x) { o['recarga:' + x.id] = { v: valores(x, 'recarga'), versao: x.versao }; });
      return o;
    }), salvos = sS[0], setSalvos = sS[1];
    function onSave(key) { return function (v) { setSalvos(function (o) { var n = Object.assign({}, o); n[key] = { v: v, versao: o[key].versao + 1 }; return n; }); }; }
    var proMensal = D.planos.filter(function (x) { return x.id === 'pro-mensal'; })[0];
    var ref = proMensal ? { nome: proMensal.nome, pc: porCredito(salvos['plano:pro-mensal'].v, proMensal, 'plano') } : null;
    var todos = Object.keys(salvos), aVenda = todos.filter(function (k) { return salvos[k].v.aVenda; }).length;

    return h(SA.Page, { nav: 'planos', title: 'Planos e recargas',
      desc: 'Free e assinaturas com créditos por ciclo, bônus, validade e rollover; recargas avulsas com validade própria. Cada gravação vira versão nova e entra na auditoria.' },
      h(SA.Note, { kind: 'draft', label: 'Exemplo' },
        h('b', null, 'Valores de exemplo. '), aVenda ? plural(aVenda, 'oferta marcada', 'ofertas marcadas') + ' à venda nesta demonstração. ' : 'Nenhum plano nem recarga está à venda. ',
        'O Documento Mestre (§13) deixa planos, preços e créditos pendentes de decisão; até o Vic definir, a trava "Preço aprovado comercialmente" fica desmarcada e nada é cobrado.'),
      h('div', { className: 'sa-sec-t' }, h('h2', null, 'Assinaturas'), h('small', null, 'Free, Pro mensal e Pro anual · no anual, os créditos do ciclo entram todo mês')),
      h('div', { className: 'sa-row c3', style: { alignItems: 'stretch' } }, D.planos.map(function (x) {
        return h(Oferta, { key: x.id, tipo: 'plano', item: x, salvo: salvos['plano:' + x.id], onSave: onSave('plano:' + x.id) });
      })),
      h('div', { className: 'sa-sec-t' }, h('h2', null, 'Recargas avulsas'), h('small', null, 'SPOT: créditos extras com validade própria, comprados no mobile e na web')),
      h('div', { className: 'sa-row c3', style: { alignItems: 'stretch' } }, D.recargas.map(function (x) {
        return h(Oferta, { key: x.id, tipo: 'recarga', item: x, salvo: salvos['recarga:' + x.id], refPreco: ref, onSave: onSave('recarga:' + x.id) });
      })));
  }
  SA.render(App);
})();
