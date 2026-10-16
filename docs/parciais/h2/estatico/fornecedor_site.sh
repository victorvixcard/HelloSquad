#!/usr/bin/env bash
# H2 estático, item 5: nenhum fornecedor citado no site público (fonte). Somente leitura.
# Escopo: conteúdo do site (apps/web/content/site/*.json), catálogo do site (apps/web/messages/*/site.json e
# common.json), llms.txt, robots.txt, sitemap, JSON-LD/metadados (lib/site-*.ts, app/layout.tsx), OG, componentes
# do site e páginas públicas. Saída completa em /tmp/h2_est_forn/; imprime contagens e arquivo:linha.
# Termos: lista da N2a §2.2 (pagamento, IA, imagem/mídia, redes sociais, buscadores, infraestrutura) + comercial.
set -u
cd /home/vitao/projetos/hellosquad/apps/web || exit 1
O=/tmp/h2_est_forn
FILES=$(ls content/site/*.json messages/*/site.json messages/*/common.json app/llms.txt/route.ts app/robots.txt/route.ts \
  app/sitemap.ts app/layout.tsx app/page.tsx app/not-found.tsx lib/site*.ts components/site/*.tsx 2>/dev/null; \
  find app/og app/como-funciona app/faq app/sobre app/squad app/en app/es app/logo-hellosquad.png -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null)
echo "arquivos no escopo: $(echo "$FILES" | wc -l)"
VEND='Anthropic|Claude|OpenAI|ChatGPT|GPT(-?[0-9])?|Gemini|Llama|Mistral|Midjourney|DALL-?E|Stable Diffusion|Flux|Runway|ElevenLabs|Ideogram|Leonardo|Supabase|Vercel|Railway|Asaas|Mercado ?Pago|Stripe|PagSeguro|PayPal|Mailpit|Next\.?js|React|FastAPI|Python|Postgres(QL)?|Node\.?js|Tailwind|Docker|AWS|Amazon|Azure|Cloudflare|Instagram|Facebook|Meta|TikTok|LinkedIn|WhatsApp|YouTube|Google|Bing|Pinterest|Twitter|Threads|Canva|HubSpot|RD Station|Mailchimp|Shopify|Nuvemshop|Hotmart|Kiwify|Pix'
COM='pre[cç]o|precos|pricing|precios|price|plano(s)? (b[aá]sico|pro|premium|gr[aá]tis|mensal|anual)|planos|plans?\b|R\$|US\$|gr[aá]tis|gratuit[oa]|free trial|trial|assinatura|subscription|suscripci[oó]n|paywall|checkout|cr[eé]ditos?|credits?|cobran[cç]a|billing|pagamento|payment|desconto|discount|Offer'
echo "$FILES" | xargs grep -HnowE "$VEND" > $O/vend_bruto.txt 2>/dev/null
echo "$FILES" | xargs grep -HnoiE "$COM" > $O/com_bruto.txt 2>/dev/null
echo "== fornecedor (palavra inteira, sensível a maiúscula): $(wc -l < $O/vend_bruto.txt) ocorrências"
awk -F: '{print $1": "$3}' $O/vend_bruto.txt | sort | uniq -c | sort -rn | head -40
echo "== comercial (insensível a maiúscula): $(wc -l < $O/com_bruto.txt) ocorrências; por termo:"
cut -d: -f3 $O/com_bruto.txt | tr 'A-Z' 'a-z' | sort | uniq -c | sort -rn | head -30
echo "== comercial por arquivo:"
cut -d: -f1 $O/com_bruto.txt | sort | uniq -c | sort -rn | head -20
