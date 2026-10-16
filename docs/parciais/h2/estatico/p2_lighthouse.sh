#!/usr/bin/env bash
# H2 estático P2: Lighthouse mobile (perfil padrão) em rotas que a A2c não mediu, contra o `next start` da 3198
# (rodar dentro de p2_com_servidor.sh). Como a A2c: Chromium do Playwright headless com --remote-debugging-port e o
# Lighthouse de /tmp/lh com --port (no WSL o chrome-launcher tenta a pasta temporária do Windows).
# Uso: bash docs/parciais/h2/estatico/p2_lighthouse.sh /como-funciona /es/squad/kiwi
# Relatórios completos: /tmp/h2_est_p2_lh_<rota>.json; resumo: docs/parciais/h2/estatico/lighthouse-mobile-h2.json
set -u
BASE="${BASE:-http://127.0.0.1:3198}"
LH=/tmp/lh/node_modules/.bin/lighthouse
CHROME="${CHROME:-$(ls -d "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux*/chrome | sort -V | tail -1)}"
DBG=9333
while ss -ltn | grep -qE ":${DBG}\b"; do DBG=$((DBG+1)); done
PROF=$(mktemp -d /tmp/h2_est_p2_chrome_XXXX)
"$CHROME" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --no-first-run --no-default-browser-check \
  --remote-debugging-port="$DBG" --user-data-dir="$PROF" about:blank > /tmp/h2_est_p2_chrome.log 2>&1 &
CPID=$!
trap 'kill $CPID 2>/dev/null; sleep 0.5; kill -9 $CPID 2>/dev/null; rm -rf "$PROF"' EXIT
for _ in $(seq 1 60); do curl -s -o /dev/null "http://127.0.0.1:${DBG}/json/version" && break; sleep 0.3; done
CHROME_VER=$(curl -s "http://127.0.0.1:${DBG}/json/version" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).Browser)}catch{console.log("?")}})')
echo "Chromium: $CHROME ($CHROME_VER) porta $DBG; Lighthouse $($LH --version)"
FILES=()
for r in "$@"; do
  slug=$(echo "$r" | sed 's#^/##; s#/#_#g'); [ -z "$slug" ] && slug=raiz
  out="/tmp/h2_est_p2_lh_${slug}.json"
  "$LH" "${BASE}${r}" --port="$DBG" --output=json --output-path="$out" --quiet \
    --only-categories=performance,accessibility,seo,best-practices > "/tmp/h2_est_p2_lh_${slug}.log" 2>&1
  echo "lighthouse $r exit $? -> $out"
  FILES+=("$r=$out")
done
CHROME_VER="$CHROME_VER" node -e '
const fs=require("fs"); const out=[];
for (const a of process.argv.slice(1)) { const [rota,f]=a.split("="); const j=JSON.parse(fs.readFileSync(f,"utf8"));
  const c=j.categories, au=j.audits, sc=(k)=>Math.round(c[k].score*100);
  const fail=(k)=>c[k].auditRefs.filter(r=>r.weight>0||true).map(r=>au[r.id]).filter(x=>x&&x.score!==null&&x.score<1&&x.scoreDisplayMode!=="informative"&&x.scoreDisplayMode!=="notApplicable"&&x.scoreDisplayMode!=="manual").map(x=>x.id);
  out.push({rota, url:j.finalDisplayedUrl, perf:sc("performance"), a11y:sc("accessibility"), seo:sc("seo"), bestPractices:sc("best-practices"),
    FCP:au["first-contentful-paint"].displayValue, LCP:au["largest-contentful-paint"].displayValue, TBT:au["total-blocking-time"].displayValue, CLS:au["cumulative-layout-shift"].displayValue,
    falhas:{a11y:fail("accessibility"), seo:fail("seo"), bestPractices:fail("best-practices")}, formFactor:j.configSettings.formFactor, relatorio:f}); }
const res={quando:new Date().toISOString(), lighthouse:JSON.parse(fs.readFileSync(out[0].relatorio,"utf8")).lighthouseVersion, chromium:process.env.CHROME_VER, perfil:"mobile padrão (Moto G Power emulado, throttling simulado)", base:"next start do build de bc58140 em 127.0.0.1:3198", rotas:out};
fs.writeFileSync("/home/vitao/projetos/hellosquad/docs/parciais/h2/estatico/lighthouse-mobile-h2.json", JSON.stringify(res,null,1));
console.log(JSON.stringify(res,null,1));
' "${FILES[@]}"
