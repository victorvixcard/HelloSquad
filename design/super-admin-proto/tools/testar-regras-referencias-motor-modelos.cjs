/* Testes de interação das telas Regras de negócio, Referências, Motor de imagem e Modelos e custos (SA0). Porta 8020 no ar; rodar da raiz do repo.
   Uso, da raiz do repo: node design/super-admin-proto/tools/testar-regras-referencias-motor-modelos.cjs [saida-dir]; SA0_W/SA0_H mudam a janela. */
const path = require('path');
const fs = require('fs');
const ROOT = '/home/vitao/projetos/hellosquad';
const { chromium } = require(path.join(ROOT, 'node_modules/.pnpm/playwright@1.64.1/node_modules/playwright'));
const BASE = 'http://127.0.0.1:8020/';
const out = process.argv[2] || '/tmp/sa0-ia-int';
let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'OK   ' : 'FALHA') + '  ' + msg); if (!cond) falhas++; }

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: Number(process.env.SA0_W || 1440), height: Number(process.env.SA0_H || 900) }, deviceScaleFactor: 1, locale: 'pt-BR', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  const toast = async () => (await page.locator('.sa-toast').last().textContent({ timeout: 2000 }).catch(() => '')) || '';
  const focusInfo = () => page.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, id: a.id, text: (a.textContent || '').trim().slice(0, 60), role: a.getAttribute('role') }; });

  /* ---------------- Regras de negócio */
  await page.goto(BASE + 'regras.html', { waitUntil: 'networkidle' });
  await page.locator('#rg-doc-aprovacoes').focus();
  await page.keyboard.press('ArrowDown');
  ok(await page.locator('#rg-doc-autonomia').getAttribute('aria-selected') === 'true', 'regras: seta para baixo seleciona "Limites de autonomia"');
  ok((await focusInfo()).id === 'rg-doc-autonomia', 'regras: o foco acompanha a aba');
  ok(page.url().endsWith('#autonomia'), 'regras: hash vira #autonomia');
  await page.keyboard.press('End');
  ok(await page.locator('#rg-doc-compartilhadas').getAttribute('aria-selected') === 'true', 'regras: End vai para "Regras compartilhadas"');
  ok((await page.locator('#rg-panel .rg-p').count()) === 8, 'regras: documento compartilhado tem 8 parágrafos (squad/README.md)');
  ok(await page.locator('#rg-panel .hs-stack').count() === 1, 'regras: SquadStack "os sete agentes leem" no documento que entra no prompt');
  await page.keyboard.press('Home');
  ok(await page.locator('#rg-doc-aprovacoes').getAttribute('aria-selected') === 'true', 'regras: Home volta para "Aprovações e autorizações"');
  // editar o parágrafo pendente (6)
  const p6 = page.locator('#rg-panel .rg-p').nth(5);
  await p6.getByRole('button', { name: /Editar/ }).click();
  ok((await focusInfo()).id === 'rg-aprovacoes-5-t', 'regras: "Editar" abre a edição com foco no texto');
  const salvar = p6.getByRole('button', { name: 'Salvar como versão nova' });
  ok(await salvar.isDisabled(), 'regras: "Salvar como versão nova" desabilitado sem mudança');
  await p6.locator('.hs-select').click();
  await page.locator('.hs-mi', { hasText: 'Decidido' }).click();
  await page.locator('#rg-aprovacoes-5-t').fill('Pedido de aprovação sem resposta expira em 7 dias (texto de teste).');
  await page.locator('#rg-aprovacoes-5-f').fill('Vic, 16/10 (teste)');
  ok(!(await salvar.isDisabled()), 'regras: salvar habilita com mudança');
  await page.screenshot({ path: path.join(out, 'regras-edicao.png') });
  await salvar.click();
  const t1 = await toast();
  ok(/Demonstração: versão 5 de "Aprovações e autorizações" salva/.test(t1), 'regras: aviso de demonstração com versão 5 (' + t1.trim() + ')');
  ok((await page.locator('#rg-card .sa-card-t small').textContent()).startsWith('Versão 5'), 'regras: cabeçalho mostra versão 5');
  ok(/decidido/i.test(await page.locator('#rg-panel .rg-p').nth(5).locator('.sa-mk').getAttribute('class')), 'regras: parágrafo 6 passa a "Decidido"');
  ok((await page.locator('.sa-met').nth(2).locator('.sa-met-v').textContent()).trim() === '3', 'regras: cartão Pendentes cai de 4 para 3');
  const f1 = await focusInfo();
  ok(/Editar/.test(f1.text), 'regras: foco volta ao "Editar" do parágrafo (' + f1.text + ')');
  // desfazer alterações em outro parágrafo
  const p1 = page.locator('#rg-panel .rg-p').nth(0);
  await p1.getByRole('button', { name: /Editar/ }).click();
  await page.locator('#rg-aprovacoes-0-t').fill('texto temporário');
  await p1.getByRole('button', { name: 'Desfazer alterações' }).click();
  ok((await page.locator('#rg-aprovacoes-0-t').inputValue()).startsWith('Só o dono da conta'), 'regras: "Desfazer alterações" restaura o texto');
  await p1.getByRole('button', { name: 'Cancelar' }).click();
  ok(await page.locator('#rg-aprovacoes-0-t').count() === 0, 'regras: "Cancelar" fecha a edição');

  /* ---------------- Referências */
  await page.goto(BASE + 'referencias.html', { waitUntil: 'networkidle' });
  const miolo = page.locator('#rf-bb-miolo');
  await miolo.getByRole('button', { name: 'Desativar' }).click();
  ok((await miolo.locator('.sa-st').textContent()).includes('Inativa'), 'referências: "Desativar" leva o guia a Inativa');
  ok(/Demonstração: "Miolo · guia da marca demo" desativada/.test(await toast()), 'referências: aviso de demonstração ao desativar');
  ok((await miolo.getByRole('button', { name: 'Ativar' }).count()) === 1, 'referências: botão vira "Ativar"');
  await miolo.getByRole('button', { name: 'Editar lições' }).click();
  await page.waitForTimeout(150);
  ok((await focusInfo()).id === 'rf-licoes-ed', 'referências: diálogo de lições abre com foco no texto');
  await page.locator('#rf-licoes-ed').press('End');
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\nFoto do pão sempre com luz natural.');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar como versão nova' }).click();
  ok((await miolo.locator('ul.sa-list > li').count()) === 4, 'referências: lição nova aparece no cartão');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Cadastrar referência' }).click();
  await page.waitForTimeout(150);
  const dlg = page.getByRole('dialog');
  ok((await focusInfo()).id === 'rf-nome', 'referências: "Cadastrar referência" abre com foco no nome');
  ok(await dlg.getByRole('button', { name: 'Cadastrar referência' }).isDisabled(), 'referências: cadastrar desabilitado sem nome');
  await dlg.getByRole('radio', { name: 'Fonte' }).click();
  await page.locator('#rf-nome').fill('Grão Miúdo Cafés · fonte de títulos');
  await page.locator('#rf-licoes').fill('Títulos em caixa baixa.\nCorpo sempre em uma família só.');
  await dlg.getByRole('checkbox', { name: /03\.01/ }).click();
  ok(await dlg.getByRole('checkbox', { name: /03\.01/ }).getAttribute('aria-checked') === 'true', 'referências: checkbox de 03.01 marcado');
  await page.screenshot({ path: path.join(out, 'referencias-cadastrar.png') });
  await dlg.getByRole('button', { name: 'Cadastrar referência' }).click();
  ok(await page.locator('#rf-tab-fontes').getAttribute('aria-selected') === 'true', 'referências: aba muda para Fontes');
  ok((await page.locator('#rf-tab-fontes .sa-nb').textContent()) === '1', 'referências: contagem de Fontes vira 1');
  ok((await page.locator('#rf-panel .sa-card').first().textContent()).includes('Rascunho'), 'referências: entra como Rascunho');
  await page.screenshot({ path: path.join(out, 'referencias-fonte.png') });
  ok(errs.length === 0, 'console sem erro até aqui (' + errs.join(' | ') + ')');

  /* ---------------- Motor de imagem */
  await page.goto(BASE + 'motor-imagem.html', { waitUntil: 'networkidle' });
  const salvarM = page.getByRole('button', { name: 'Salvar texto como versão nova' });
  ok(await salvarM.isDisabled(), 'motor: salvar desabilitado sem mudança');
  await page.locator('#mt-variacoes').fill('O motor gera três variações a partir do briefing e das referências aprovadas da marca.');
  ok((await page.locator('#mt-variacoes').locator('xpath=..').locator('.sa-st').textContent()).includes('Alterada'), 'motor: etapa marcada como Alterada');
  ok(!(await salvarM.isDisabled()), 'motor: salvar habilita com mudança');
  ok((await page.locator('[role=status]', { hasText: 'etapa alterada' }).count()) === 1, 'motor: rodapé diz "1 etapa alterada"');
  const pos = await page.evaluate(() => getComputedStyle(document.querySelector('[role=status]').parentElement).position);
  ok(pos === 'sticky', 'motor: rodapé fica preso ao pé da tela com alteração');
  await page.screenshot({ path: path.join(out, 'motor-alterado.png') });
  await page.getByRole('button', { name: 'Desfazer alterações' }).click();
  ok((await page.locator('#mt-variacoes').inputValue()).startsWith('O motor gera variações'), 'motor: "Desfazer alterações" restaura o texto');
  await page.locator('#mt-briefing').fill('A pessoa descreve a peça. A Kaia completa com a Memória da Marca e pergunta só o que falta.');
  await salvarM.click();
  ok(/Demonstração: versão 1 do texto do motor salva/.test(await toast()), 'motor: aviso de demonstração com versão 1');
  ok((await page.locator('#mt-versoes li').count()) === 2, 'motor: histórico ganha a versão 1');
  ok((await page.locator('#mt-versoes li').first().textContent()).includes('Alterou: Briefing'), 'motor: versão nova diz o que mudou');
  await page.locator('#mt-pacote').fill('   ');
  ok(await salvarM.isDisabled(), 'motor: texto vazio impede salvar');

  /* ---------------- Modelos e custos */
  await page.goto(BASE + 'modelos.html', { waitUntil: 'networkidle' });
  const nb = (x) => String(x).replace(/\u00a0/g, ' ').trim();
  const totalBRL1 = nb(await page.locator('.sa-tbl tfoot td').last().textContent());
  await page.locator('#mc-tab-custos').focus();
  await page.keyboard.press('ArrowRight');
  ok(await page.locator('#mc-tab-regras').getAttribute('aria-selected') === 'true', 'modelos: seta para a direita abre "Regras por tarefa"');
  ok(page.url().endsWith('#regras'), 'modelos: hash vira #regras');
  ok((await page.locator('#mc-regras tbody tr').count()) === 10, 'modelos: 10 linhas (7 padrão + triagem, imagem, relatórios)');
  const bia = page.locator('#mc-regras tbody tr').nth(2);
  await bia.locator('td').nth(3).locator('.hs-select').click();
  await page.locator('.hs-mi', { hasText: 'low' }).click();
  ok((await bia.locator('.sa-st').textContent()).includes('Alterado'), 'modelos: linha da Bia marcada como Alterado');
  ok((await page.locator('#mc-tab-regras .sa-nb').textContent()) === '1', 'modelos: aba mostra 1 mudança');
  // menu do último seletor não pode ser cortado
  const iris = page.locator('#mc-regras tbody tr').nth(8);
  await iris.locator('td').nth(2).locator('.hs-select').click();
  await page.waitForTimeout(200);
  const box = await page.locator('.sa-dd-pop .hs-menu').boundingBox();
  const vis = await page.evaluate(() => { const m = document.querySelector('.sa-dd-pop .hs-menu'); const r = m.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.bottom - 8); return m.contains(el); });
  ok(box && vis, 'modelos: menu do modelo da Íris aparece inteiro (sem corte da tabela)');
  await page.screenshot({ path: path.join(out, 'modelos-menu-iris.png') });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Salvar como versão nova' }).click();
  ok(/Demonstração: regras por tarefa salvas como versão 2/.test(await toast()), 'modelos: aviso de demonstração com versão 2');
  ok((await page.locator('#mc-regras .sa-card-t small').textContent()).includes('versão 2'), 'modelos: cartão mostra versão 2');
  // preços e câmbio
  await page.locator('#mc-tab-precos').click();
  await page.locator('#mc-cambio-inp').fill('5,55');
  await page.locator('#mc-cambio').getByRole('button', { name: 'Salvar como versão nova' }).click();
  ok((await page.locator('#mc-cambio .sa-met-v').textContent()).includes('5,55'), 'modelos: câmbio passa a US$ 1 = R$ 5,55');
  ok(/câmbio salvo como versão 2/.test(await toast()), 'modelos: aviso do câmbio com versão 2');
  await page.locator('#mc-cambio-inp').fill('abc');
  ok(await page.locator('#mc-cambio').getByRole('button', { name: 'Salvar como versão nova' }).isDisabled(), 'modelos: câmbio inválido não salva');
  await page.locator('#mc-cambio').getByRole('button', { name: 'Desfazer alterações' }).click();
  ok((await page.locator('#mc-cambio-inp').inputValue()) === '5,55', 'modelos: desfazer volta ao câmbio salvo');
  await page.locator('#mc-precos tbody tr').first().getByRole('button', { name: /Editar/ }).click();
  await page.waitForTimeout(150);
  ok((await focusInfo()).id === 'mc-p-entrada', 'modelos: diálogo de preço abre no campo Entrada');
  await page.locator('#mc-p-entrada').fill('9,99');
  await page.getByRole('dialog').getByRole('button', { name: 'Desfazer alterações' }).click();
  ok((await page.locator('#mc-p-entrada').inputValue()) === '4,00', 'modelos: desfazer no diálogo de preço volta a 4,00');
  await page.locator('#mc-p-entrada').fill('4,50');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar como versão nova' }).click();
  const linhaOpus = nb(await page.locator('#mc-precos tbody tr').first().textContent());
  ok(linhaOpus.includes('US$ 4,50'), 'modelos: preço de entrada do Opus 5.5 vira US$ 4,50 (' + linhaOpus.slice(0, 60) + ')');
  await page.locator('#mc-tab-custos').click();
  const totalBRL2 = nb(await page.locator('.sa-tbl tfoot td').last().textContent());
  ok(totalBRL1 === 'R$ 163,64' && totalBRL2 === 'R$ 168,19', 'modelos: total em reais acompanha o câmbio (' + totalBRL1 + ' → ' + totalBRL2 + ')');
  ok(nb(await page.locator('.sa-tbl tfoot td').nth(5).textContent()) === 'US$ 30,30', 'modelos: custo em dólar não muda com o preço novo (preço da época)');

  ok(errs.length === 0, 'console sem erro no fim (' + errs.join(' | ') + ')');
  await browser.close();
  console.log('falhas:', falhas);
})();
