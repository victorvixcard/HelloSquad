/* Captura as telas do protótipo com o Playwright do repositório (1440×900 por padrão).
   Uso, da raiz do repo: node design/super-admin-proto/tools/capturar.cjs [saida] [nome=url ...]
   Sem pares nome=url, captura a lista padrão. O servidor da porta 8020 precisa estar no ar.
   SA0_W e SA0_H mudam o tamanho da janela (ex.: 1280×800). */
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../../..');
const { chromium } = require(path.join(ROOT, 'node_modules/.pnpm/playwright@1.64.1/node_modules/playwright'));
const BASE = process.env.SA0_BASE || 'http://127.0.0.1:8020/';
const out = path.resolve(process.argv[2] || path.join(ROOT, 'docs/parciais/sa0'));
const pairs = process.argv.slice(3).map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]);
const LIST = pairs.length ? pairs : [
  ['01-contas', 'contas.html'], ['02-conta-miolo', 'conta.html?id=miolo'], ['03-catalogo', 'catalogo.html'],
  ['04-planos', 'planos.html'], ['05-pagamentos', 'pagamentos.html'], ['06-auditoria', 'auditoria.html'],
  ['07-squad', 'squad.html'], ['08-agente-alma', 'agente.html?a=otto#alma'], ['09-agente-skills', 'agente.html?a=otto#skills'],
  ['10-agente-ferramentas', 'agente.html?a=otto#ferramentas'], ['11-agente-o-que-le', 'agente.html?a=otto#le'],
  ['12-regras', 'regras.html'], ['13-referencias', 'referencias.html'], ['14-motor-imagem', 'motor-imagem.html'],
  ['15-modelos', 'modelos.html'], ['16-consumo', 'consumo.html'], ['17-saude-apis', 'saude-apis.html'],
  ['18-fila', 'fila.html'], ['19-qualidade', 'qualidade.html']
];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: Number(process.env.SA0_W || 1440), height: Number(process.env.SA0_H || 900) },
    deviceScaleFactor: 1, locale: 'pt-BR', reducedMotion: process.env.SA0_MOTION === 'full' ? 'no-preference' : 'reduce'
  });
  const page = await ctx.newPage();
  let errors = 0;
  for (const [name, url] of LIST) {
    const errs = [];
    const onC = (m) => { if (m.type() === 'error') errs.push(m.text()); };
    const onE = (e) => errs.push(String(e));
    page.on('console', onC); page.on('pageerror', onE);
    await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 20000 }).catch((e) => errs.push('goto: ' + e.message));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, name + '.png') });
    const h1 = await page.locator('h1').first().textContent({ timeout: 2000 }).catch(() => '(sem h1)');
    console.log(`${name}\t${url}\th1=${h1}\terros=${errs.length}${errs.length ? '\t' + errs.slice(0, 3).join(' | ').slice(0, 400) : ''}`);
    errors += errs.length;
    page.off('console', onC); page.off('pageerror', onE);
  }
  await browser.close();
  console.log('total de erros de console:', errors);
})();
