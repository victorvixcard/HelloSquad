# A2c — Progresso (Aranha)

**Fatia:** site público completo com SEO/GEO (Fase 2). **Início:** 16/10/2026 17:38. **Alvo:** 70 min.
**Escopo:** `apps/web`, `packages/ui` e docs da fatia. Stark em paralelo na S2e (`apps/backend`, `supabase/`): não toco.

## PASSO 0 (lido)

- `DIRETRIZES_DO_DONO.md`: preço por último (sem `/precos`, sem valor, sem "grátis" novo); pt-BR/en/es com `hreflang`;
  SEO aponta para o endereço local (`NEXT_PUBLIC_SITE_URL`, padrão `http://127.0.0.1:3100`) até a Fase 5; nenhum
  fornecedor citado; entidade sempre "HelloSquad"; nada combinado muda (Landing R32 e V4.6 são o combinado).
- `PLANO_DE_ACAO_FASE2.md` linha A2c: rotas do §7 com o conteúdo do N2a, JSON-LD, sitemap, robots, `llms.txt`,
  `hreflang`, Core Web Vitals; critério: Lighthouse local verde no mobile, `make test-web` + e2e.
- `ARQUITETURA_PROPOSTA.md` §7: SSR/SSG, Metadata API por rota, JSON-LD, sitemap, robots com os quatro robôs de IA,
  `llms.txt`, Core Web Vitals; `/precos` e `/blog` ficam fora (preço por último; blog sem pauta).
- `docs/conteudo/site/README.md` (N2a): mapa de rotas (pt-BR na raiz, en e es com prefixo e slug traduzido), metadados
  por rota, JSON-LD por rota (§5), termos por idioma (§6). Arquivos `pt-BR|en|es/*.md`, `llms.txt`, `robots.txt`.
- `N2a-relatorio.md` §5–§6: P1 (botão "Criar conta grátis" × "Começar com o squad") e P2 (pergunta de créditos) são do
  dono; pedidos técnicos: `/admin` no robots, trocar o `public/llms.txt`, string es "¿Qué necesitas…?".
- `A2a-relatorio.md` §1 e §3: `/` estática em pt-BR; `/en` e `/es` dinâmicas pelo middleware (`X-NEXT-INTL-LOCALE`);
  canônico próprio e `alternates` pt-BR/en/es/x-default; sitemap com alternativas.

## Decisões iniciais (técnicas, não mudam o combinado)

1. **URL por idioma = prefixo** (o que a A2a e o README do N2a já fazem): pt-BR na raiz, `/en/...` e `/es/...` com os
   slugs traduzidos do README §2. O middleware estende o `publicLocaleOf` para os subcaminhos.
2. **Conteúdo fora do catálogo de mensagens:** o catálogo é carregado inteiro e vai para o cliente em toda tela; o texto
   longo das páginas fica em `apps/web/content/site/<idioma>.json`, gerado por script a partir dos `.md` do N2a e lido só
   no servidor. Rótulos de interface (navegação, migalhas, botões) ficam no catálogo `site.json` nos três idiomas.
3. **CTA:** o briefing pede "Começar com o squad" → `/criar-conta`; o README do N2a marca como proposta (P1). Ver
   pergunta no relatório; o Hero aprovado não muda.

## Itens

| # | Item | Estado | Commit |
|---|---|---|---|
| 0 | PASSO 0 e progresso aberto | feito | — |
