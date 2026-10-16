/* Mede transbordo horizontal a 1440×900 e 1280×800. Uso, da raiz do repo, com a 8020 no ar:
   node design/super-admin-proto/tools/medir-larguras.cjs contas.html catalogo.html …  (rotas relativas) */
const path = require('path');
const { chromium } = require(path.join(path.resolve(__dirname, '../../..'), 'node_modules/.pnpm/playwright@1.64.1/node_modules/playwright'));
const pages = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  for (const [w, hgt] of [[1440, 900], [1280, 800]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: hgt }, reducedMotion: 'reduce' })).newPage();
    for (const u of pages) {
      await p.goto('http://127.0.0.1:8020/' + u, { waitUntil: 'networkidle' });
      await p.waitForTimeout(300);
      const r = await p.evaluate(() => {
        const sc = document.querySelector('.sa-scroll');
        const over = [];
        document.querySelectorAll('.sa-v *').forEach((el) => {
          const rc = el.getBoundingClientRect(); const box = sc.getBoundingClientRect();
          if (rc.width > 0 && rc.right > box.right + 1 && !el.closest('.sa-tblw') && getComputedStyle(el).position !== 'fixed') over.push(el.className || el.tagName);
        });
        const tbl = [...document.querySelectorAll('.sa-tblw')].filter((t) => t.scrollWidth > t.clientWidth + 1).length;
        return { docOver: document.documentElement.scrollWidth > innerWidth, scrollOver: sc.scrollWidth > sc.clientWidth + 1, over: [...new Set(over)].slice(0, 5), tablesScrolling: tbl };
      });
      console.log(w + 'x' + hgt, u, JSON.stringify(r));
    }
  }
  await b.close();
})();
