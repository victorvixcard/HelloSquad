/* Saúde das APIs: um cartão por provedor, com estado, chave (só "configurada" ou "ausente", nunca o segredo),
   chamadas e falhas em 24 h, gasto por janela e última recusa por saldo. Só a Anthropic tem o saldo lido no painel
   do provedor, com alerta abaixo de X: editar recalcula na hora; registrar é demonstração (estado local + aviso). */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, HS = SA.HS, D = SA.D, fmt = SA.fmt;
  var useState = React.useState;
  var ESTADO = { funcionando: ['done', 'Funcionando'], falhando: ['fail', 'Falhando'], 'nao-integrado': ['block', 'Em integração'], 'conta-nao-criada': ['block', 'Conta não criada'] };
  var LIDO_EM = '2026-10-16T08:15'; // fictício: quando o saldo atual foi lido no painel da Anthropic

  function integrado(p) { return p.estado === 'funcionando' || p.estado === 'falhando'; }
  function cents(n) { return Math.round(n * 100) / 100; }
  function lista(nomes) { return nomes.length < 2 ? nomes.join('') : nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1]; }
  /* gasto de IA em 30 dias: a mesma conta de Consumo por cliente (entregas e conversa, ao centavo, por conta) */
  var GASTO_30 = cents(D.contas.reduce(function (s, c) { return s + cents(c.uso.custoEntregas) + cents(c.uso.custoConversa); }, 0));
  var ORDEM = D.provedores.filter(integrado).concat(D.provedores.filter(function (p) { return !integrado(p); }));

  /* aceita 38,50 · 38.50 · 1.234,56 · US$ 40 */
  function num(s) {
    var t = String(s || '').replace(/[^\d,.]/g, '');
    if (!/\d/.test(t)) return null;
    if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
    else if (!/^\d+(\.\d{1,2})?$/.test(t)) t = t.replace(/\./g, '');
    var n = Number(t);
    return isFinite(n) ? n : null;
  }

  function Kv(p) {
    return h('dl', { className: 'sa-kv', style: { gridTemplateColumns: '150px minmax(0,1fr)' } }, p.items.map(function (it) {
      return h(React.Fragment, { key: it[0] }, h('dt', null, it[0]), h('dd', null, it[1]));
    }));
  }

  function Gastos(p) {
    var g = p.pr.gasto;
    var cel = [['24 h', g.h24], ['7 dias', g.d7], ['30 dias', GASTO_30], ['Desde o início', g.inicio]];
    return h('div', { style: { marginTop: 16 } },
      h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8 } },
        h('span', { className: 'sa-lbl' }, 'Gasto'),
        h('a', { className: 'sa-rowlink', href: 'modelos.html#regras', style: { fontSize: 13 } }, 'Ver custos por tarefa')),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 } }, cel.map(function (c) {
        return h('div', { key: c[0], style: { padding: '9px 12px 10px', borderRadius: 'var(--r-acao)', background: 'var(--hs-papel)', minWidth: 0 } },
          h('div', { style: { fontSize: 12, color: 'var(--hs-tinta-suave)', whiteSpace: 'nowrap' } }, c[0]),
          h('div', { className: 'sa-num', style: { marginTop: 2, fontSize: 16, fontWeight: 800, letterSpacing: '-.01em', whiteSpace: 'nowrap' } }, fmt.usd(c[1])));
      })),
      h('p', { style: { marginTop: 6, fontSize: 12, color: 'var(--hs-tinta-suave)' } },
        '30 dias: soma do consumo das ', D.contas.length, ' contas, em ', h('a', { href: 'consumo.html' }, 'Consumo por cliente'), '.'));
  }

  /* saldo informado à mão (o painel do provedor é a fonte); alerta quando fica abaixo do valor escolhido */
  function Saldo(p) {
    var pr = p.pr;
    var sS = useState(fmt.dec(pr.saldo, 2)), saldoTxt = sS[0], setSaldoTxt = sS[1];
    var aS = useState(fmt.dec(pr.alerta, 2)), alertaTxt = aS[0], setAlertaTxt = aS[1];
    var lS = useState(LIDO_EM), lido = lS[0], setLido = lS[1];
    var saldo = num(saldoTxt), alerta = num(alertaTxt);
    var porDia = pr.gasto.d7 / 7;
    var dias = saldo != null && porDia ? saldo / porDia : null;
    var ritmo = dias == null ? '' : 'No ritmo dos últimos 7 dias, ' + fmt.usd(porDia) + ' por dia, ' + fmt.usd(saldo) + (dias < 1 ? ' não duram um dia.' : ' duram cerca de ' + fmt.int(Math.floor(dias)) + (Math.floor(dias) === 1 ? ' dia.' : ' dias.'));
    var abaixo = saldo != null && alerta != null && saldo < alerta;

    function registrar() {
      setLido(D.hoje);
      setSaldoTxt(fmt.dec(saldo, 2)); setAlertaTxt(fmt.dec(alerta, 2));
      SA.toast('Demonstração: saldo de ' + fmt.usd(saldo) + ' e alerta de ' + fmt.usd(alerta) + ' registrados.');
    }
    function campo(id, label, txt, set, ok, dica) {
      return h(SA.Field, { id: id, label: label },
        h('div', { className: 'sa-inp-w' }, h('span', { 'aria-hidden': true }, 'US$'),
          h('input', { id: id, className: 'sa-inp is-num', inputMode: 'decimal', autoComplete: 'off', value: txt,
            'aria-invalid': ok ? undefined : true, 'aria-describedby': id + '-d', onChange: function (e) { set(e.target.value); } })),
        h('small', { id: id + '-d' }, ok ? dica : 'Informe um valor em dólares, por exemplo 38,50.'));
    }

    return h('div', { className: 'sa-grp', style: { marginTop: 16 } },
      h('div', { className: 'sa-grp-h' }, h('h3', null, 'Saldo lido no painel do provedor'),
        h('span', { style: { fontSize: 12.5, color: 'var(--hs-tinta-suave)' } }, 'lido em ' + fmt.dt(lido))),
      h('div', { style: { padding: '0 6px' } },
        h('div', { className: 'sa-form c2' },
          campo('saldo-anthropic', 'Saldo', saldoTxt, setSaldoTxt, saldo != null, 'O que o painel da Anthropic mostra agora.'),
          campo('alerta-anthropic', 'Alertar abaixo de', alertaTxt, setAlertaTxt, alerta != null, 'Abaixo disso, o painel avisa.')),
        h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 14 } },
          /* só o estado do alerta é anunciado (muda ao cruzar o limite); a frase de duração muda a cada tecla e não é */
          h('span', { role: 'status', 'aria-live': 'polite', style: { flex: 'none' } }, saldo == null || alerta == null ? null :
            abaixo ? h(SA.Status, { kind: 'you' }, 'Saldo abaixo do alerta') : h(SA.Status, { kind: 'done' }, 'Acima do alerta')),
          h('p', { style: { fontSize: 13, lineHeight: 1.5, color: 'var(--hs-tinta-suave)', paddingTop: 2 } },
            saldo == null || alerta == null ? 'Preencha os dois valores para ver o alerta.' :
              abaixo ? h(React.Fragment, null, h('b', { style: { color: 'var(--hs-tinta)' } }, 'Recarregue no painel da Anthropic e informe o saldo novo aqui. '), ritmo, ' Sem saldo, as chamadas são recusadas e os trabalhos param.')
                : ritmo)),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 } },
          h(HS.Button, { variant: 'primary', size: 's', icon: null, disabled: saldo == null || alerta == null, onClick: registrar }, 'Registrar saldo'),
          h('span', { style: { fontSize: 12.5, color: 'var(--hs-tinta-suave)' } }, 'Nada muda sozinho: o alerta só avisa.'))));
  }

  function Provedor(p) {
    var pr = p.pr, st = ESTADO[pr.estado], on = integrado(pr), ehIA = pr.id === 'anthropic';
    var falhas = on ? (pr.falhas24 ? fmt.int(pr.falhas24) + (pr.falhas24 === 1 ? ' falha' : ' falhas') + ' (' + fmt.pct(pr.falhas24 / pr.chamadas24, 1) + ')' : 'nenhuma falha') : null;
    var items = [
      ['Chave', pr.chave === 'configurada' ? 'Configurada' : 'Ausente'],
      ['Últimas 24 h', on ? fmt.int(pr.chamadas24) + ' chamadas · ' + falhas : '—'],
      ['Última falha', pr.ultimaFalha ? h(React.Fragment, null, h('span', { className: 'sa-mono' }, fmt.dt(pr.ultimaFalha)), ' · ', h('span', { style: { fontWeight: 500 } }, pr.ultimaFalhaTxt)) : (on ? 'Nenhuma' : '—')],
      ['Recusa por saldo', on ? (pr.ultimaRecusaSaldo ? fmt.dt(pr.ultimaRecusaSaldo) : 'Nenhuma') : '—']
    ];
    if (!ehIA) items.push(['Gasto', pr.semCusto ? h('span', { style: { fontWeight: 500 } }, pr.semCusto) : '—']);
    return h(SA.Card, { id: 'pv-' + pr.id, title: pr.nome, sub: pr.papel, h3: true, actions: h(SA.Status, { kind: st[0] }, st[1]), style: p.style },
      h(Kv, { items: items }),
      ehIA ? h(Gastos, { pr: pr }) : null,
      ehIA ? h(Saldo, { pr: pr }) : null,
      pr.hoje ? h('p', { style: { marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--hs-l1)', fontSize: 12.5, lineHeight: 1.45, color: 'var(--hs-tinta-suave)' } }, pr.hoje) : null);
  }

  function App() {
    var P = D.provedores;
    var ok = P.filter(function (p) { return p.estado === 'funcionando'; });
    var mal = P.filter(function (p) { return p.estado === 'falhando'; });
    var fora = P.filter(function (p) { return !integrado(p); });
    function nomes(l) { return lista(l.map(function (p) { return p.nome; })); }
    return h(SA.Page, { nav: 'saude', title: 'Saúde das APIs',
      desc: 'Por provedor: se está funcionando, chamadas e falhas, gasto e última recusa por saldo. Chaves nunca aparecem aqui, só se estão configuradas. O saldo da Anthropic é informado à mão, com alerta.' },
      h(SA.Metrics, { items: [
        { l: 'Provedores', v: fmt.int(P.length), d: (P.length - fora.length) + ' integrados · ' + fora.length + ' a integrar' },
        { l: 'Funcionando', v: fmt.int(ok.length), d: ok.length ? nomes(ok) : 'nenhum' },
        { l: 'Falhando', v: fmt.int(mal.length), kind: mal.length ? 'you' : undefined,
          d: mal.length ? mal.map(function (p) { return p.nome + ': ' + fmt.int(p.falhas24) + ' falhas em 24 h'; }).join(' · ') : 'nenhum' },
        { l: 'Sem integração', v: fmt.int(fora.length), d: fora.length ? [['nao-integrado', 'em integração'], ['conta-nao-criada', 'sem conta']].map(function (e) {
          var l = fora.filter(function (p) { return p.estado === e[0]; });
          return l.length ? nomes(l) + ' ' + e[1] : null;
        }).filter(Boolean).join('; ') : 'nenhum' },
        { l: 'Gasto de IA em 30 dias', v: fmt.usd(GASTO_30), d: 'soma do consumo das ' + D.contas.length + ' contas · ' + fmt.brl(GASTO_30 * D.cambio.usdbrl) }
      ] }),
      /* grade de 2 colunas: a Anthropic (com o saldo) à esquerda e os três seguintes empilhados à direita; o resto em pares */
      h('div', { className: 'sa-row c2 is-eq', style: { marginTop: 16 } },
        h(Provedor, { pr: ORDEM[0] }),
        h('div', { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } }, ORDEM.slice(1, 4).map(function (pr, i, l) {
          return h(Provedor, { key: pr.id, pr: pr, style: i === l.length - 1 ? { flex: 1 } : undefined });
        }))),
      h('div', { className: 'sa-row c2 is-eq' }, ORDEM.slice(4).map(function (pr) { return h(Provedor, { key: pr.id, pr: pr }); })),
      h(SA.Note, { label: 'Como ler', style: { marginTop: 16 } },
        h('span', null, 'O gasto de IA vem dos passos de cada run (run_steps), pelo preço da época; os 30 dias da Anthropic são a soma do consumo das contas. ',
          'O saldo vem do painel do provedor, informado à mão: o painel avisa abaixo do alerta e nada muda sozinho. ',
          'Segredos de provedor nunca aparecem no painel: só ', h('b', null, 'configurada'), ' ou ', h('b', null, 'ausente'), '.')));
  }
  SA.render(App);
})();
