/* Teste de interação das 4 telas do grupo Squad IA (consumo, saúde, fila, qualidade). */
const path = require('path');
const { chromium } = require(path.join('/home/vitao/projetos/hellosquad', 'node_modules/.pnpm/playwright@1.64.1/node_modules/playwright'));
const BASE = 'http://127.0.0.1:8020/';
const OUT = '/tmp/sa0-int';
const res = [];
function ok(n, c, x) { res.push([c ? 'ok ' : 'FALHOU', n, x == null ? '' : String(x)]); }
const num = (s) => Number(String(s).replace(/[^\d,-]/g, '').replace(',', '.'));

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  try {
    /* ---------------- Consumo */
    await p.goto(BASE + 'consumo.html', { waitUntil: 'networkidle' });
    const rows = () => p.locator('.sa-tbl tbody tr').count();
    ok('consumo: 12 linhas', (await rows()) === 12, await rows());
    // total de solicitações e de custo em entregas batem com a soma das linhas
    const somaCol = async (i) => (await p.locator(`.sa-tbl tbody tr td:nth-child(${i})`).allTextContents()).map(num).filter((n) => !isNaN(n)).reduce((s, n) => s + n, 0);
    const foot = async (i) => num(await p.locator(`.sa-tbl tfoot td:nth-child(${i})`).textContent());
    ok('consumo: total de solicitações = soma das linhas', (await somaCol(3)) === (await foot(3)), (await somaCol(3)) + ' / ' + (await foot(3)));
    ok('consumo: total de créditos = soma das linhas', (await somaCol(4)) === (await foot(4)), (await somaCol(4)) + ' / ' + (await foot(4)));
    ok('consumo: total de IA em entregas = soma das linhas', Math.abs((await somaCol(5)) - (await foot(5))) < 0.001, (await somaCol(5)).toFixed(2) + ' / ' + (await foot(5)));
    ok('consumo: total de IA em conversa = soma das linhas', Math.abs((await somaCol(6)) - (await foot(6))) < 0.001, (await somaCol(6)).toFixed(2) + ' / ' + (await foot(6)));
    const metSol = num(await p.locator('.sa-met').nth(0).locator('.sa-met-v').textContent());
    ok('consumo: cartão de solicitações = total da tabela', metSol === (await foot(3)), metSol);
    // período por teclado: 7 dias
    await p.getByRole('button', { name: 'Período: Últimos 30 dias' }).focus();
    await p.keyboard.press('Enter'); await p.waitForTimeout(80);
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
    ok('consumo: período 7 dias pelo teclado', (await p.locator('.sa-dd .hs-select').first().textContent()).includes('Últimos 7 dias'));
    ok('consumo: aviso de estimativa aparece', await p.getByText('É uma estimativa do protótipo').isVisible());
    ok('consumo: 7 dias, solicitações = soma das linhas', (await somaCol(3)) === (await foot(3)), (await somaCol(3)) + ' / ' + (await foot(3)));
    await p.screenshot({ path: path.join(OUT, 'consumo-7dias.png') });
    // plano Free restringe as contas; conta Grão
    await p.getByRole('button', { name: /^Plano: / }).click(); await p.waitForTimeout(60);
    await p.getByRole('menuitemradio', { name: 'Free' }).click(); await p.waitForTimeout(60);
    ok('consumo: plano Free → 5 contas', (await rows()) === 5, await rows());
    await p.getByRole('button', { name: /^Conta: / }).click(); await p.waitForTimeout(60);
    const nOpc = await p.getByRole('menuitemradio').count();
    ok('consumo: seletor de conta só com as contas do plano (Todas + 5)', nOpc === 6, nOpc);
    await p.getByRole('menuitemradio', { name: 'Grão Miúdo Cafés' }).click(); await p.waitForTimeout(60);
    ok('consumo: conta Grão → 1 linha', (await rows()) === 1, await rows());
    const st = await p.locator('#alerta-ia .sa-card-a').textContent();
    ok('consumo: alerta IA por crédito em atenção para Grão', /Atenção/.test(st), st);
    await p.getByRole('button', { name: /^Plano: / }).click(); await p.waitForTimeout(60);
    await p.getByRole('menuitemradio', { name: 'Pro mensal' }).click(); await p.waitForTimeout(60);
    ok('consumo: trocar para plano sem a conta volta a conta para Todas', (await p.locator('.sa-dd .hs-select').nth(2).textContent()).includes('Todas'));

    /* ---------------- Saúde das APIs */
    await p.goto(BASE + 'saude-apis.html', { waitUntil: 'networkidle' });
    ok('saúde: 6 cartões de provedor', (await p.locator('section[id^="pv-"]').count()) === 6, await p.locator('section[id^="pv-"]').count());
    ok('saúde: começa com saldo abaixo do alerta', await p.getByText('Saldo abaixo do alerta').isVisible());
    const saldo = p.getByLabel('Saldo', { exact: true });
    await saldo.fill('60');
    ok('saúde: saldo 60 → acima do alerta', await p.getByText('Acima do alerta').isVisible());
    ok('saúde: recalcula a duração (60 ÷ 1,02 por dia ≈ 58 dias)', await p.getByText('duram cerca de 58 dias').isVisible());
    await saldo.fill('abc');
    ok('saúde: valor inválido mostra a dica', await p.getByText('Informe um valor em dólares, por exemplo 38,50.').isVisible());
    ok('saúde: valor inválido desabilita Registrar', await p.getByRole('button', { name: 'Registrar saldo' }).isDisabled());
    await saldo.fill('45,5');
    await p.getByLabel('Alertar abaixo de').fill('40');
    ok('saúde: alerta 40 com saldo 45,50 → acima', await p.getByText('Acima do alerta').isVisible());
    await p.getByLabel('Alertar abaixo de').fill('50');
    await p.getByRole('button', { name: 'Registrar saldo' }).click(); await p.waitForTimeout(120);
    ok('saúde: registrar mostra o aviso de demonstração', await p.getByText('Demonstração: saldo de US$ 45,50 e alerta de US$ 50,00 registrados.').isVisible());
    ok('saúde: lido em atualiza', await p.getByText('lido em 16/10 09:06').isVisible());
    ok('saúde: nenhum segredo na tela', !(await p.locator('body').textContent()).match(/sk-ant|api[_-]?key|secret/i));
    await p.screenshot({ path: path.join(OUT, 'saude-registrado.png') });

    /* ---------------- Fila */
    await p.goto(BASE + 'fila.html', { waitUntil: 'networkidle' });
    const metF = async (i) => (await p.locator('.sa-met').nth(i).locator('.sa-met-v').textContent()).trim();
    ok('fila: 3 falharam', (await metF(3)) === '3');
    const linha = (id) => p.locator('tr', { hasText: id }).first();
    await linha('run_8f2611').getByRole('button', { name: 'Reenfileirar' }).click(); await p.waitForTimeout(120);
    ok('fila: reenfileirar → Na fila', (await linha('run_8f2611').textContent()).includes('Na fila'));
    ok('fila: tentativas zeradas (0 de 3)', (await linha('run_8f2611').textContent()).includes('0 de 3'));
    ok('fila: cartão Falharam = 2', (await metF(3)) === '2', await metF(3));
    ok('fila: barra lateral acompanha (2)', (await p.locator('a.sa-ni[href="fila.html"] .sa-nb').textContent()) === '2');
    ok('fila: aviso de demonstração', await p.getByText('Demonstração: run_8f2611 voltou para a fila com 3 tentativas novas.').isVisible());
    // cancelar pede confirmação com motivo
    await linha('run_8f2e10').getByRole('button', { name: 'Cancelar' }).click(); await p.waitForTimeout(150);
    ok('fila: cancelar abre diálogo', await p.getByRole('dialog').isVisible());
    ok('fila: foco no motivo', await p.evaluate(() => document.activeElement.id === 'cancelar-motivo'));
    const conf = p.getByRole('dialog').getByRole('button', { name: 'Cancelar o run' });
    ok('fila: sem motivo, confirmar desabilitado', await conf.isDisabled());
    await p.screenshot({ path: path.join(OUT, 'fila-cancelar.png') });
    await p.keyboard.type('Pedido em duplicidade, teste.');
    await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    ok('fila: Enter confirma e fecha', (await p.getByRole('dialog').count()) === 0);
    ok('fila: run cancelado', (await linha('run_8f2e10').textContent()).includes('Cancelado'));
    ok('fila: motivo aparece na linha do run', await p.getByText('Cancelado pelo Super Admin: Pedido em duplicidade, teste.').isVisible());
    // abrir o run (teclado) e Esc devolve o foco
    const ib = p.getByRole('button', { name: 'Abrir o run run_8f2b77' });
    await ib.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    const dlg = p.getByRole('dialog');
    ok('fila: abrir o run mostra o diálogo', await dlg.isVisible());
    const passos = await dlg.locator('ol.sa-list > li').count();
    ok('fila: 5 passos (até autoverificar)', passos === 5, passos);
    ok('fila: último passo rodando', (await dlg.locator('ol.sa-list > li').last().textContent()).includes('Rodando'));
    await p.screenshot({ path: path.join(OUT, 'fila-run.png') });
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    ok('fila: Esc fecha', (await p.getByRole('dialog').count()) === 0);
    ok('fila: foco volta ao botão do run', await p.evaluate(() => (document.activeElement.getAttribute('aria-label') || '') === 'Abrir o run run_8f2b77'));
    // abas por teclado e hash
    await p.getByRole('tab', { name: /^Tudo/ }).focus();
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(80);
    ok('fila: seta muda para Na fila', p.url().endsWith('#fila'), p.url());
    const nFila = await p.locator('#fila-painel tbody tr.is-click').count();
    ok('fila: aba Na fila mostra os da fila (inclui o reenfileirado)', nFila >= 4, nFila);
    await p.keyboard.press('End'); await p.waitForTimeout(80);
    ok('fila: End vai para Concluídos/cancelados', p.url().endsWith('#fim'));
    // cancelar o run rodando de Otto troca o status vivo
    await p.goto(BASE + 'fila.html#rodando', { waitUntil: 'networkidle' });
    await p.reload({ waitUntil: 'networkidle' });
    await linha('run_8f2c1a').getByRole('button', { name: 'Cancelar' }).click(); await p.waitForTimeout(120);
    await p.keyboard.type('Teste do status vivo'); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
    const live = await p.locator('.hs-live .hs-live-t.is-on').textContent();
    ok('fila: status vivo passa para o próximo run rodando (Bia)', /Bia/.test(live), live);

    /* ---------------- Qualidade */
    await p.goto(BASE + 'qualidade.html', { waitUntil: 'networkidle' });
    ok('qualidade: por tipo, 8 linhas', (await p.locator('#qual-painel tbody tr').count()) === 8);
    const tot = await p.locator('#qual-painel tfoot td:nth-child(2)').textContent();
    ok('qualidade: total de entregas por tipo = 229', tot.trim() === '229', tot);
    await p.getByRole('tab', { name: 'Por mês' }).click(); await p.waitForTimeout(80);
    ok('qualidade: hash #mes', p.url().endsWith('#mes'));
    ok('qualidade: por mês, 3 meses', (await p.locator('#qual-painel .sa-tbl').first().locator('tbody tr').count()) === 3);
    await p.getByRole('button', { name: 'Comparar: set × out' }).click(); await p.waitForTimeout(60);
    await p.getByRole('menuitemradio', { name: 'ago × set' }).click(); await p.waitForTimeout(80);
    ok('qualidade: comparar ago × set', await p.getByText('O que mudou em set/2026:').isVisible());
    const dif = await p.locator('#comparar tbody tr', { hasText: 'Aprovadas de primeira' }).textContent();
    ok('qualidade: ago → set, +9 p.p. melhorou', /\+9 p\.p\./.test(dif) && /Melhorou/.test(dif), dif);
    await p.screenshot({ path: path.join(OUT, 'qualidade-ago-set.png'), fullPage: false });
  } catch (e) { ok('execução', false, String(e.message || e).split('\n')[0]); }
  ok('sem erro de console', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close();
  for (const r of res) console.log(r.join('\t'));
  const bad = res.filter((r) => r[0] !== 'ok ').length;
  console.log(bad ? bad + ' falha(s)' : 'todos os ' + res.length + ' passaram');
})();
