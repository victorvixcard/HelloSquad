/* Motor de imagem: como o motor do Vic funciona, escrito em texto editável (etapas, quem faz cada uma,
   custo e preço). Rascunho até o motor chegar (SA5); nenhum fornecedor escolhido. Gravar o texto cria uma
   versão nova (demonstração: muda o estado local e avisa). */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, HS = SA.HS, D = SA.D, fmt = SA.fmt;
  var useState = React.useState;
  var HOJE = D.hoje.slice(0, 10);
  var OFF = { opacity: 0.45, cursor: 'not-allowed' };
  var QUEM = { pessoa: ['you', 'Pessoa'], ia: ['auto', 'IA'], codigo: ['sim', 'Código'] };
  var QUEM_S = {
    pessoa: 'Quem pediu a peça: descreve, escolhe e aprova.',
    ia: 'O motor de imagem e a Kaia.',
    codigo: 'Regra fixa do sistema, sem IA: créditos, arquivos e versões.'
  };

  function pl(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

  function App() {
    var etapas = D.motor.etapas, kaia = SA.ag('kaia'), dels = kaia.deliveries;
    var base = {}; etapas.forEach(function (e) { base[e.id] = e.texto; });
    var sS = useState(base), salvo = sS[0], setSalvo = sS[1];
    var tS = useState(base), txt = tS[0], setTxt = tS[1];
    /* histórico fictício: só a versão 0, rascunho do Thor */
    var vS = useState([{ v: D.motor.versao, data: '2026-10-16', autor: 'Thor', nota: 'Texto ilustrativo para o Vic corrigir.' }]), versoes = vS[0], setVersoes = vS[1];

    var mudou = etapas.filter(function (e) { return txt[e.id] !== salvo[e.id]; });
    var vazia = etapas.filter(function (e) { return !txt[e.id].trim(); });
    var total = etapas.reduce(function (s, e) { return s + txt[e.id].length; }, 0);
    var atual = versoes[0].v, preco = D.catalogo['03.01'][0];

    function salvar() {
      var v = atual + 1;
      setVersoes([{ v: v, data: HOJE, autor: D.admin.nome, nota: 'Alterou: ' + mudou.map(function (e) { return e.titulo; }).join(', ') + '.' }].concat(versoes));
      setSalvo(Object.assign({}, txt));
      SA.toast('Demonstração: versão ' + v + ' do texto do motor salva. Fica na auditoria; o runtime lê daqui quando o motor chegar.', 'leaf');
    }
    function desfazer() { setTxt(Object.assign({}, salvo)); }

    var estado = vazia.length ? 'Escreva o texto de todas as etapas antes de salvar.'
      : mudou.length ? pl(mudou.length, 'etapa alterada', 'etapas alteradas') + '. Salvar cria a versão ' + (atual + 1) + '.'
        : 'Sem alterações. Versão ' + atual + ', rascunho.';

    return h(SA.Page, { nav: 'motor', title: 'Motor de imagem', avatar: h(HS.Agent, { agent: kaia.forma, size: 38 }),
      desc: 'Como o motor de imagem funciona, em texto que você edita: etapas, quem faz cada uma, custo e preço. Vale para as peças da Kaia.' },
      h(SA.Note, { kind: 'draft', label: 'Rascunho' },
        'Motor do Vic, em integração. Texto ilustrativo para o Vic corrigir; o runtime vai ler daqui quando o motor chegar. Nenhum fornecedor escolhido.'),
      h('div', { style: { marginTop: 16 } }, h(SA.Metrics, { items: [
        { l: 'Preço', v: fmt.int(preco), u: preco === 1 ? 'crédito' : 'créditos', d: 'por peça estática (03.01)', tag: h(HS.Tag, { kind: 'sim' }, 'Provisório') },
        { l: 'Pedidos', v: '0', d: 'motor em integração' },
        { l: 'Custo médio', v: '—', d: 'sem dados: nenhuma peça gerada' },
        { l: 'Pacote', v: 'PNG e PDF', d: 'etapa 5, pacote final', tag: h(HS.Tag, { kind: 'sim' }, 'Rascunho') }
      ] })),
      h('div', { className: 'sa-row c2-1', style: { marginTop: 16 } },

        /* etapas: número, título, quem faz e o texto editável */
        h('div', { style: { minWidth: 0 } },
          h('div', { className: 'sa-sec-t', style: { marginTop: 4 } }, h('h2', null, 'Etapas'), h('small', null, etapas.length + ' etapas · ' + fmt.int(total) + ' caracteres')),
          h('ol', { className: 'sa-list', style: { gap: 12 } }, etapas.map(function (e, i) {
            var id = 'mt-' + e.id, t = txt[e.id], alterada = t !== salvo[e.id];
            return h('li', { key: e.id, className: 'sa-card is-flat', style: { padding: '16px 20px 14px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 } },
                h('span', { className: 'sa-biz', 'aria-hidden': true }, i + 1),
                h('div', { style: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 10px' } },
                  h('h3', { id: id + '-h', style: { fontSize: 15.5, fontWeight: 800, letterSpacing: '-.01em' } }, h('span', { className: 'sa-sr' }, 'Etapa ' + (i + 1) + ': '), e.titulo),
                  h('span', { className: 'sa-chips' }, h('span', { className: 'sa-sr' }, 'Quem faz: '),
                    e.quem.map(function (q) { return h(HS.Tag, { key: q, kind: QUEM[q][0] }, QUEM[q][1]); }))),
                alterada ? h(SA.Status, { kind: 'draft', s: true }, 'Alterada') : null),
              h('label', { className: 'sa-sr', htmlFor: id }, 'Texto da etapa ' + (i + 1) + ', ' + e.titulo),
              h('textarea', { id: id, className: 'sa-inp', rows: 3, value: t, 'aria-describedby': id + '-n', style: { minHeight: 92 },
                onChange: function (ev) { var v = ev.target.value; setTxt(function (o) { var r = Object.assign({}, o); r[e.id] = v; return r; }); } }),
              h('div', { id: id + '-n', className: 'sa-mono', style: { marginTop: 7, textAlign: 'right', color: t.trim() ? 'var(--hs-kbd)' : 'var(--hs-tinta)' } },
                t.trim() ? fmt.int(t.length) + ' caracteres' : 'Texto vazio: escreva a etapa'));
          })),
          /* rodapé: fica preso ao pé da tela só enquanto houver alteração sem salvar */
          h('div', { style: { position: mudou.length ? 'sticky' : 'static', bottom: 14, zIndex: 3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 16,
            padding: '10px 10px 10px 18px', borderRadius: 'var(--r-menu)', background: 'var(--hs-branco)', boxShadow: 'var(--e1-apoiado)' } },
            h('span', { role: 'status', style: { flex: '1 1 0', minWidth: 150, fontSize: 13.5, lineHeight: 1.4, color: 'var(--hs-tinta-suave)' } }, estado),
            h(HS.Button, { variant: 'ghost', size: 's', disabled: !mudou.length, style: mudou.length ? undefined : OFF, onClick: desfazer }, 'Desfazer alterações'),
            h(HS.Button, { variant: 'primary', size: 's', icon: null, disabled: !mudou.length || vazia.length > 0, onClick: salvar }, 'Salvar texto como versão nova'))),

        /* lateral: como o runtime usa e histórico de versões */
        h('div', { style: { minWidth: 0 } },
          h(SA.Card, { id: 'mt-runtime', title: 'Como o runtime usa este texto' },
            h(HS.StatePill, { agent: kaia.forma, label: kaia.name, detail: 'aguarda o motor', expression: 'sleep' }),
            h('p', { style: { margin: '12px 0 0', fontSize: 13.5, lineHeight: 1.5, color: 'var(--hs-tinta-suave)' } },
              'Quando o motor chegar, o runtime lê a versão ativa deste texto em cada peça da Kaia (' + dels[0] + ' a ' + dels[dels.length - 1] + ') e segue as etapas na ordem. ' +
              'Preço e créditos não ficam no texto: vêm do catálogo a cada pedido. Cada gravação vira uma versão nova e fica na auditoria.'),
            h('dl', { className: 'sa-kv', style: { marginTop: 14, alignItems: 'center' } }, ['pessoa', 'ia', 'codigo'].map(function (q) {
              return [h('dt', { key: q + '-t' }, h(HS.Tag, { kind: QUEM[q][0] }, QUEM[q][1])),
                h('dd', { key: q + '-d', style: { fontSize: 13, fontWeight: 500, color: 'var(--hs-tinta-suave)' } }, QUEM_S[q])];
            }))),
          h(SA.Card, { id: 'mt-versoes', title: 'Versões', sub: pl(versoes.length, 'versão', 'versões') },
            h('ol', { className: 'sa-list' }, versoes.map(function (v, i) {
              return h('li', { key: v.v, className: 'sa-li', style: { alignItems: 'flex-start' } },
                h('span', { className: 'sa-biz', 'aria-hidden': true, style: { width: 34, height: 34, fontSize: 13 } }, 'v' + v.v),
                h('span', { className: 'sa-li-t' },
                  h('b', null, 'Versão ' + v.v + (i === 0 ? ' · atual' : '')),
                  h('small', null, fmt.date(v.data) + ' · ' + v.autor),
                  h('small', null, v.nota)),
                h(SA.Status, { kind: 'draft', s: true }, 'Rascunho'));
            }))))));
  }
  SA.render(App);
})();
