/* Testes de interação do protótipo (teclado, diálogos, filtros, movimento reduzido) com o Playwright do repo.
   Uso, da raiz do repo, com a porta 8020 no ar: node design/super-admin-proto/tools/testar.cjs */
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { chromium } = require(path.join(ROOT, 'node_modules/.pnpm/playwright@1.64.1/node_modules/playwright'));
const BASE = process.env.SA0_BASE || 'http://127.0.0.1:8020/';
const results = [];
function ok(name, cond, extra) { results.push([cond ? 'ok ' : 'FALHOU', name, extra || '']); }

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

  // Contas: busca filtra, Esc limpa; seletor de plano por teclado
  await page.goto(BASE + 'contas.html', { waitUntil: 'networkidle' });
  const rows = () => page.locator('.sa-tbl tbody tr').count();
  ok('contas: 12 linhas', (await rows()) === 12, String(await rows()));
  await page.getByRole('textbox', { name: 'Buscar contas' }).fill('vitória');
  ok('contas: busca "vitória" (sem acento também casa) → 1 linha', (await rows()) === 1, String(await rows()));
  await page.keyboard.press('Escape');
  ok('contas: Esc limpa a busca', (await rows()) === 12, String(await rows()));
  await page.getByRole('button', { name: 'Plano: Todos' }).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(80);
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const planoBtn = await page.locator('.sa-dd .hs-select').first().textContent();
  ok('contas: seletor por teclado (Enter, setas, Enter)', /Pro mensal/.test(planoBtn), planoBtn + ' · ' + (await rows()) + ' linhas');
  ok('contas: foco volta ao seletor', await page.evaluate(() => document.activeElement.classList.contains('hs-select')));

  // Faixa de 2FA: abre diálogo, Esc fecha e devolve o foco
  await page.locator('.sa-band-b').click();
  await page.waitForTimeout(150);
  ok('2FA: diálogo abre', await page.getByRole('dialog').isVisible());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  ok('2FA: Esc fecha', (await page.getByRole('dialog').count()) === 0);
  ok('2FA: foco volta à faixa', await page.evaluate(() => document.activeElement.classList.contains('sa-band-b')));

  // Conta: entrar no ambiente pede motivo
  await page.goto(BASE + 'conta.html?id=miolo', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Entrar no ambiente do cliente' }).click();
  const dlg = page.getByRole('dialog');
  await page.waitForTimeout(150);
  ok('conta: diálogo de acesso abre', await dlg.isVisible());
  ok('conta: foco no motivo', await page.evaluate(() => document.activeElement.id === 'ent-motivo'));
  const btnEntrar = dlg.getByRole('button', { name: 'Entrar com o motivo registrado' });
  ok('conta: sem motivo, botão desabilitado', await btnEntrar.isDisabled());
  await page.keyboard.type('Conferir o erro de publicação pedido pela dona.');
  ok('conta: com motivo, botão habilitado', await btnEntrar.isEnabled());
  await btnEntrar.click({ timeout: 3000 });
  ok('conta: sessão de suporte aparece', await page.getByText('Sessão de suporte ativa até 09:36').isVisible());
  ok('conta: acesso entra na lista', (await page.locator('.sa-card').filter({ hasText: 'Acessos do suporte' }).locator('li').count()) === 2);

  // Agente: abas com setas e hash; editar seção gera rascunho e o cartão de aprovação do DS
  await page.goto(BASE + 'agente.html?a=otto', { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Alma' }).focus();
  await page.keyboard.press('ArrowRight');
  ok('agente: seta muda para Skills', (await page.getByRole('tablist', { name: 'Partes do agente' }).getByRole('tab', { selected: true }).textContent()).startsWith('Skills'));
  ok('agente: hash #skills', page.url().endsWith('#skills'));
  await page.keyboard.press('End');
  ok('agente: End vai para O que ele lê', (await page.getByRole('tablist', { name: 'Partes do agente' }).getByRole('tab', { selected: true }).textContent()) === 'O que ele lê');
  ok('agente: prompt montado tem os 4 blocos', (await page.locator('.sa-blk').count()) === 4);
  await page.getByRole('tab', { name: 'Alma' }).click();
  await page.locator('.sa-sec-card').first().getByRole('button', { name: 'Editar' }).click();
  await page.locator('#ed-0').fill('Você é o Otto. Texto de teste.');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  ok('agente: rascunho mostra o ApprovalCard do DS', await page.locator('.hs-approve').isVisible());
  await page.getByRole('button', { name: 'Publicar versão 2' }).click();
  ok('agente: publicar cria a versão 2 ativa', await page.getByText('Versão 2 · ativa').isVisible());

  // Catálogo: "à venda" travado sem "preço aprovado"; mudança de crédito abre a barra de alterações
  await page.goto(BASE + 'catalogo.html', { waitUntil: 'networkidle' });
  const venda = page.getByRole('checkbox', { name: /À venda: 02\.03/ });
  await venda.click();
  ok('catálogo: à venda travado sem preço aprovado', (await venda.getAttribute('aria-checked')) === 'false');
  await page.getByRole('checkbox', { name: /Preço aprovado comercialmente: 02\.03/ }).click();
  await venda.click();
  ok('catálogo: com preço aprovado, à venda liga', (await venda.getAttribute('aria-checked')) === 'true');
  ok('catálogo: barra de alterações aparece', await page.getByRole('region', { name: 'Alterações não salvas' }).isVisible());

  // Planos: "Salvar como versão nova" só com mudança
  await page.goto(BASE + 'planos.html', { waitUntil: 'networkidle' });
  const salvar = page.getByRole('button', { name: 'Salvar como versão nova' }).nth(1);
  ok('planos: salvar desabilitado sem mudança', await salvar.isDisabled());
  const preco = page.locator('.sa-card').nth(1).locator('input').first();
  await preco.fill('159');
  ok('planos: salvar habilitado com mudança', await salvar.isEnabled());

  // Pagamentos: estado atual vazio; demonstração mostra assinaturas
  await page.goto(BASE + 'pagamentos.html', { waitUntil: 'networkidle' });
  ok('pagamentos: estado atual sem linhas', (await page.locator('.sa-tbl tbody tr').count()) === 0);
  await page.getByRole('radio', { name: 'Demonstração' }).click();
  ok('pagamentos: demonstração mostra as 7 assinaturas', (await page.locator('.sa-tbl tbody tr').count()) === 7, String(await page.locator('.sa-tbl tbody tr').count()));

  // Auditoria: filtro "Super Admin"
  await page.goto(BASE + 'auditoria.html', { waitUntil: 'networkidle' });
  const antes = await page.locator('.sa-tbl tbody tr').count();
  await page.getByRole('radio', { name: 'Super Admin' }).click();
  const depois = await page.locator('.sa-tbl tbody tr').count();
  ok('auditoria: filtro Super Admin reduz a lista', depois > 0 && depois < antes, antes + ' → ' + depois);

  // Movimento reduzido: transições zeradas
  const dur = await page.evaluate(() => getComputedStyle(document.querySelector('.sa-ni')).transitionDuration);
  ok('prefers-reduced-motion: transição da navegação zerada', /^0(\.0+1)?s|1e-05s/.test(dur), dur);

  ok('sem erro de console', errs.length === 0, errs.slice(0, 3).join(' | '));
  await browser.close();
}
(async () => {
  try { await main(); } catch (e) { ok('execução', false, String(e.message || e).split('\n')[0]); }
  for (const r of results) console.log(r.join('\t'));
  const bad = results.filter((r) => r[0] !== 'ok ').length;
  console.log(bad ? bad + ' falha(s)' : 'todos os ' + results.length + ' passaram');
  process.exit(bad ? 1 : 0);
})();
