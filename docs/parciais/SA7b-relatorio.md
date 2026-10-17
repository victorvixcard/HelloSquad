# SA7b — Correções da H-SA (web, fidelidade ao SA0) · relatório

Aranha (Frontend & Design), 17/10/2026, 01:08–01:30, sozinha, sem sub-agentes, em paralelo com a SA7a (Stark). Área
tocada: `apps/web` (Catálogo, Pagamentos, Auditoria, `AdminTabs`, `BalanceDialog`, `/app`, `admin.css`, catálogo `admin`
nos 3 idiomas, Vitest e e2e) e `docs/parciais/sa7b/`. Nada em `apps/backend`, `supabase/`, `packages/`. Skill principal
`frontend-vix` e apoio `verification-before-completion` indicadas: **não abri o `SKILL.md` de nenhuma das duas**; o
desenho vem do SA0 (`catalogo.js`, `pagamentos.js`, `auditoria.js`, `saude-apis.js`) e a verificação está colada abaixo.

## 1. Achado → o que mudou → prova

| Achado | O que mudou | Commits | Prova |
|---|---|---|---|
| **H-SA-03** Pagamentos promete o que já existe | `pagamentos.desc` = texto do SA0 sem a fase: "Assinaturas, recargas, webhooks e conciliação, por provedor. As contas no Asaas e no Mercado Pago ainda não existem." (en, es). Teste: nenhum texto do catálogo `admin` (3 idiomas) cita código de fatia (`/\bSA\d/`). Varredura: sobram `nav.soon` ("em breve": Referências e Motor de imagem, não entregues) e `common.editLater` (Modelos, edição não entregue), os dois verdadeiros | `a3477e6` | Vitest `H-SA-03` (4); e2e: `.sa-desc` com o texto exato |
| **H-SA-04** Catálogo diverge do SA0 | (e) **"Versão N"** + **"Ver histórico"** no topo (Auditoria, Super Admin, configuração); (c) **linha de apoio** nos 5 números ("7 agentes", "nenhuma: falta preço aprovado", "0 de 46 · decisão comercial pendente", "N em homologação", "**Aguardando**: N pelo motor · M por integração"); (a) **chips por agente** com o mini e a contagem ("Todos 46", "Nexo 4" …) no lugar do menu, com "Preço em créditos · Provisório" à direita; (b) cabeçalho do agente com "**Projetos · 4 deliveries**", resumo da homologação ("2 em homologação · 2 não iniciadas") e **"Abrir o agente"** (`/admin/squad/<id>`); (d) integrações em **etiquetas** pelas palavras-chave do SA0 (`LLM`, `Supabase`, `Motor de imagem` …), texto completo no `title`; sem palavra-chave, o texto fica | `8fedfae` | Vitest `H-SA-04` (5); e2e (Versão 1, histórico, linhas, chips, filtro Otto); `lado-a-lado-catalogo.png`, `-catalogo-otto.png` |
| **H-SA-05** Pagamentos sem abas e cartão do provedor curto | Cartão do provedor como o SA0: sub "Assinaturas e recargas", **Conta no provedor**, Chave da API, **Webhook**, **Ambiente**, **Integração** (`PaymentProvider`, ADR-0008) e **A validar** (Pix e cartão recorrentes, só Asaas e Mercado Pago). **Abas** Assinaturas / Recargas / Webhooks (com a nota "Idempotência" do SA0) / Conciliação (Falhas), com o contador do SA0 (atrasadas, webhooks com falha, cobranças que falharam; `AdminTabs.badge`) e a aba no endereço (`#webhooks`). Provedor simulado local: conta "Não se aplica", ambiente "Local, simulado" | `02d5fc6`, `191ce21` | Vitest `H-SA-05` (2); e2e (linhas do Asaas, simulado, 4 abas, `#webhooks`); `lado-a-lado-pagamentos.png`, `-pagamentos-webhooks.png` |
| **H-SA-06** Auditoria sem "Exportar CSV" | **"Exportar CSV"** no topo, como o SA0: gera no navegador a página carregada (as 6 colunas da tabela, BOM, CRLF, RFC 4180, célula com `= + - @` neutralizada), arquivo `auditoria-AAAA-MM-DD.csv`; aviso "N eventos desta página exportados em CSV, com os filtros atuais."; `title` "Exporta o filtro atual: os eventos carregados nesta página." Nada vai à API | `02d5fc6` | Vitest `H-SA-06` (3); e2e (download: cabeçalho, linhas = linhas da tabela, todas do Super Admin com o filtro); `lado-a-lado-auditoria.png` |
| **H-SA-02** (web) Vic sem negócio cai no onboarding | A SA7a devolve `is_platform_admin` no `GET /me` (`1504e8f`, contrato em `packages/contracts`). `/app`: Super Admin **sem negócio** → `/admin`; com negócio, o negócio; cliente sem negócio ou API sem o campo, a criação, como hoje | `fb7d801` | Vitest (4 casos); e2e: `/entrar` sem `next` → `/admin/contas` |
| **H-SA-13** "Informar saldo" como texto | `hs-btn--primary` → `hs-btn--pri` (classe do DS; o SA0 usa `variant: 'primary'`) nos dois botões do saldo; teste recusa `hs-btn--primary` no painel | `fb7d801` | Vitest; e2e: `background-color` `rgb(15, 13, 34)`; `lado-a-lado-saude.png` |

## 2. Como foi verificado

Build e e2e **só no worktree `/tmp/sa7b-wt`** (web de produção na **3200**, encerrada no fim); banco pela trava
`flock -o -w 600 /tmp/hellosquad-db.lock`; só `supabase_db_hellosquad`. A web do dono na 3100 ficou no ar (só `curl`).

| Verificação | Comando | Resultado (colado) |
|---|---|---|
| `make test-web` | `make test-web` (árvore principal, sem build; HEAD `cb7bd53`) | `packages/contracts test: Tests 9 passed (9)` · `packages/ui test: Tests 50 passed (50)` · `apps/web test: Test Files 40 passed (40)` · `Tests 491 passed (491)` (473 + 18 da SA7b) · `make test-web exit=0` |
| Vitest da fatia | `npx vitest run test/SA7b.test.tsx` | `Tests 18 passed (18)` |
| Build de produção | `pnpm --filter web build` (worktree, `7bec10d`) | `build exit=0` · `├ ƒ /admin/auditoria 3.07 kB 131 kB` · `├ ƒ /admin/catalogo 200 B 135 kB` · `├ ƒ /admin/pagamentos 3.13 kB 134 kB` |
| e2e do painel | `flock -o -w 600 /tmp/hellosquad-db.lock env HELLOSQUAD_DB_LOCK_HELD=1 WEB_PORT=3200 E2E_WORKER=off E2E_SCREENSHOTS=/tmp/sa7b/shots pnpm exec playwright test e2e/sa7b-fidelidade.spec.ts e2e/sa2-admin.spec.ts e2e/sa6b-acoes.spec.ts e2e/sa4b-consumo-saude.spec.ts --project=chromium` | `✓ 1 … sem sessão, /admin leva ao login …` · `✓ 2 … o Vic fictício entra no /admin e vê as sete telas …` · `✓ 3 … a Marina … 403 honesto …` · `✓ 4 … informa um saldo e vê o alerta mudar` · `✓ 5 … 403 honesto no Consumo …` · `✓ 6 … sessão de suporte, ajusta crédito, suspende e reativa …` · `✓ 7 … 403 honesto nas telas de escrita` · `✓ 8 [chromium] › e2e/sa7b-fidelidade.spec.ts:9:5 › o Vic entra pelo /entrar e cai no painel; Catálogo, Pagamentos, Auditoria e Saúde como o SA0 (2.2s)` · `8 passed (18.2s)` · `e2e exit=0` |
| SA0 capturado | `node docs/parciais/sa7b/lado_a_lado.mjs` (file://, 1440×900) | `catalogo: abas abertas=["Deliveries 46","Todos 46"]` · `catalogo-otto: … "Otto 7"` · `pagamentos: ["Assinaturas"]` · `pagamentos-webhooks: ["Webhooks"]` · `erros de console: 0` |
| Lado a lado | `python3 docs/parciais/sa7b/lado_a_lado.py` | `docs/parciais/sa7b/lado-a-lado-{catalogo,catalogo-otto,pagamentos,pagamentos-webhooks,auditoria,saude}.png` (1452×474, SA0 à esquerda); capturas nossas `sa7b-*.png` |
| Banco depois do e2e | `psql` no `supabase_db_hellosquad` | `memberships do Vic\|0` · `trilha suspensa\|false` · `preços (linhas/deliveries)\|46/46` · sessões de suporte com prazo no futuro e sem fim: 0 (as 16 sem `ended_at` já venceram) |
| Web do dono | `curl` | `3100 /entrar -> 200`; `3200 depois -> 000` |

## 3. Decisões onde o SA0 não define (nada do combinado mudou; perguntas no §5)

1. **"Versão N"**: o catálogo versiona hoje só o preço (`delivery_prices`); N = 1 + preços novos gravados (seed = 46
   linhas para 46 deliveries = **Versão 1**). Homologação e "à venda" mudam no lugar e ficam no histórico (`title` do chip).
2. **Chips como links** (`?agente=`, `aria-current`), não `role=tab`: o filtro é do servidor e o endereço já era usado
   (`e2e/sa6b`); visual igual ao `is-line` do SA0.
3. **Linhas de apoio com dado real**: "Homologadas" diz "N em homologação" (o SA0 diz "neste cenário fictício"; o nosso
   dado é do banco); "Deliveries" diz "7 agentes" sem "· 23 integrações" (a aba Integrações segue registrada na SA2 §4).
4. **Aba Conciliação** = cartão Falhas + uma nota: a conciliação é por webhook (SA6a/SA6b), a conciliação por dia segue
   registrada na SA2 §4. **Webhook** do cartão diz o que a API sabe (segredo configurado ou não). **Ambiente** sem "Fase 2".

## 4. O que ficou de fora

- **Terceiro cartão "Simulado (local)"** em Pagamentos (H-SA-05 cita): mantido, é dado real do ambiente local; pergunta abaixo.
- "Dados: Estado atual / Demonstração" de Pagamentos e as abas Deliveries/Integrações do Catálogo: registradas na SA2 §4.
- **H-SA-12** (nome e resultado das deliveries em pt-BR em en/es): depende de dado no banco; as integrações, agora
  etiquetas do catálogo, passam a traduzir. **H-SA-11** (sessão no HTML só em `next dev`): fora do escopo barato.
- Cabeçalho do agente com mini 18 e área ("Projetos"), decisão da SA2; o SA0 usa mini 28 e papel ("Projetos e coordenação").

## 5. Perguntas ao dono (Vic e Diogo)

1. O cartão "Simulado (local)" fica em Pagamentos (o SA0 tem só Asaas e Mercado Pago)?
2. "Versão N" do Catálogo contando só preço novo está bom, ou homologação e "à venda" também devem abrir versão (API)?
