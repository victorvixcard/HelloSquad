/* Squad: os sete agentes como squad (palco do DS, olhos que acompanham), depois a lista com modelo,
   deliveries, versão do prompt e custo médio. Identidade e contrato vêm de squad/ (data-squad.js). */
(function () {
  'use strict';
  var SA = window.SA, h = SA.h, HS = SA.HS, D = SA.D, fmt = SA.fmt;
  var MODELO = { 'claude-opus-5-5': 'Opus 5.5', 'claude-haiku-4-5': 'Haiku 4.5', 'claude-sonnet-5-5': 'Sonnet 5.5' };
  var AUTON = { analisar: 'Analisa', preparar: 'Prepara', executar: 'Executa' };
  var SIZE = 88, GAP = 30;

  function App() {
    var ags = SA.agents();
    var total = ags.reduce(function (s, a) { return s + a.deliveries.length; }, 0);
    var entregas = ags.reduce(function (s, a) { return s + (a.entregas30 || 0); }, 0);
    var skills = ags.reduce(function (s, a) { return s + Object.keys(a.skills).length; }, 0);
    var cols = [
      { k: 'nome', l: 'Agente', render: function (a) {
        return h('div', { className: 'sa-cell-a' }, h(HS.Agent, { agent: a.forma, size: 34 }),
          h('div', { className: 'sa-cell-m' }, h('a', { className: 'sa-rowlink', href: 'agente.html?a=' + a.id }, a.name), h('small', null, a.papel_completo)));
      } },
      { k: 'cor', l: 'Cor e forma', nw: true, render: function (a) {
        return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } },
          h('span', { 'aria-hidden': true, style: { width: 14, height: 14, flex: 'none', borderRadius: 5, background: a.cor, boxShadow: 'inset 0 0 0 1px var(--hs-l1)' } }),
          h('span', { className: 'sa-cell-m' }, h('span', { className: 'sa-mono' }, a.cor.toUpperCase()), h('small', { className: 'sa-mono' }, 'forma ' + a.forma)));
      } },
      { k: 'modelo', l: 'Modelo e esforço', render: function (a) {
        return h('div', { className: 'sa-cell-m' }, h('span', null, MODELO[a.modelo.padrao] + ' · ' + a.modelo.effort),
          h('small', null, a.modelo.triagem ? 'triagem: ' + MODELO[a.modelo.triagem] : (a.modelo.imagem ? 'imagem: a homologar' : (a.modelo.relatorios_recorrentes ? 'relatórios: Batch API' : 'thinking ' + a.modelo.thinking))));
      } },
      { k: 'deliveries', l: 'Deliveries', r: true, render: function (a) {
        var n = Object.keys(a.skills).length;
        return h('div', { className: 'sa-cell-m', style: { alignItems: 'flex-end' } }, h('b', { className: 'sa-num' }, a.deliveries.length), h('small', null, n ? n + ' com skill' : 'sem skill'));
      } },
      { k: 'prompt', l: 'Prompt', nw: true, render: function (a) {
        return h('div', { className: 'sa-cell-m' }, h('span', { className: 'sa-mono' }, 'v1 · ' + a.soul.hash), h('small', null, 'SOUL de ' + fmt.date(a.soul.data)));
      } },
      { k: 'custo', l: 'Custo médio', r: true, render: function (a) {
        return a.custoMedio == null ? h(SA.Status, { kind: 'block', s: true }, 'aguarda motor') :
          h('div', { className: 'sa-cell-m', style: { alignItems: 'flex-end' } }, h('b', { className: 'sa-num' }, fmt.usd(a.custoMedio)), h('small', null, fmt.int(a.entregas30) + ' entregas em 30 dias'));
      } },
      { k: 'auto', l: 'Autonomia', nw: true, render: function (a) { return h(HS.Tag, { kind: a.autonomia_maxima === 'executar' ? 'you' : 'auto' }, AUTON[a.autonomia_maxima]); } }
    ];
    return h(SA.Page, { nav: 'squad', title: 'Squad',
      desc: 'Os sete agentes do HelloSquad. A identidade e o contrato vêm de squad/: abra um agente para ver a alma, as skills, as ferramentas e o que ele lê antes de cada trabalho.' },
      h('section', { className: 'sa-grp', 'aria-label': 'O squad', style: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '26px 20px 18px' } },
        h(HS.SquadStage, { size: SIZE, gap: GAP, showNames: false }),
        h('ul', { style: { display: 'grid', gridTemplateColumns: 'repeat(7,' + SIZE + 'px)', columnGap: GAP, marginTop: 14, textAlign: 'center' } },
          ags.map(function (a) {
            return h('li', { key: a.id, style: { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 } },
              h('a', { className: 'sa-rowlink', href: 'agente.html?a=' + a.id, style: { fontSize: 15 } }, a.name),
              h('small', { style: { fontSize: 12, color: 'var(--hs-tinta-suave)', lineHeight: 1.3 } }, a.area_ui));
          }))),
      h(SA.Metrics, { items: [
        { l: 'Agentes', v: '7', d: 'Nexo coordena; os outros seis executam' },
        { l: 'Deliveries', v: fmt.int(total), d: skills + ' com skill escrita em squad/' },
        { l: 'Entregas em 30 dias', v: fmt.int(entregas), d: 'cenário fictício' },
        { l: 'Prompts', v: 'v1', d: 'todas as SOULs de ' + fmt.date(ags[0].soul.data) }
      ] }),
      h(SA.Card, { title: 'Os sete', sub: 'cor, forma e nome são oficiais (DS); o resto vem do agent.yaml. Quem executa, executa só com permissão registrada.', style: { marginTop: 16 } },
        h('div', { style: { margin: '0 -20px -18px' } }, h(SA.Table, { caption: 'Agentes do squad', cols: cols, rows: ags, onRow: function (a) { location.href = 'agente.html?a=' + a.id; } }))),
      h(SA.Note, { label: 'Regra', style: { marginTop: 16 } }, 'Mudança em SOUL, skill ou agent.yaml gera versão nova, nunca edição silenciosa. Cada run registra a versão que usou; voltar versão é trocar a versão ativa.'));
  }
  SA.render(App);
})();
