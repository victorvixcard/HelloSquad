# Registro de Decisões de Arquitetura (ADR)

Formato curto: contexto → decisão → consequências. Status `proposto` até o Vic aprovar.

## ADR-0001 · Vercel + Railway + Supabase — `proposto`
**Contexto:** contas já existentes; produto com site público (SEO), API com execução longa e dados multi-tenant.
**Decisão:** Vercel para a web, Railway para `api`/`worker`/`scheduler`, Supabase para Auth, Postgres, Storage, Realtime, Queues e Cron.
**Consequências:** três fornecedores, cada um no que faz melhor; nenhuma chamada de LLM em função serverless; `service_role` só no Railway.

## ADR-0002 · Next.js no front, FastAPI no back — `proposto`
**Contexto:** SEO/GEO pedem SSR; o time (Stark) domina FastAPI + Postgres; mobile virá em Expo.
**Decisão:** Next.js 15 (App Router) em `apps/web`; Python 3.12 + FastAPI em `apps/backend` com entrypoints `api`, `worker`, `scheduler`; contrato OpenAPI → TypeScript.
**Consequências:** duas linguagens no monorepo; o contrato gerado evita divergência; mobile consome a mesma API.

## ADR-0003 · Fila Postgres-nativa (pgmq) antes de Redis — `proposto`
**Contexto:** jobs longos, retry, idempotência, pausa; volume inicial de centenas a poucos milhares de jobs por hora.
**Decisão:** Supabase Queues (pgmq) com filas `runs.interactive`, `runs.scheduled`, `external_actions`, `memory.reflect`; enfileirar na mesma transação que cria o trabalho.
**Consequências:** um plano de dados, sem job perdido entre banco e fila; Redis entra só se a métrica de profundidade de fila ou de rate limit justificar.

## ADR-0004 · Um runtime, sete personas, orquestração própria — `proposto`
**Contexto:** o Documento Mestre libera orquestração híbrida; aprovações duram dias; tudo precisa ser auditável em tabelas de domínio.
**Decisão:** engine única sobre o SDK oficial da Anthropic; personas em `squad/`; estado do run em `runs`/`run_steps`/`run_events` no Postgres; sem framework de grafo na v1.
**Consequências:** mais código nosso na máquina de estados, menos abstração escondendo estado; framework pode entrar depois se o grafo crescer.

## ADR-0005 · Anthropic como provedor primário com adaptador próprio — `proposto`
**Contexto:** qualidade em português, caching, streaming, fallback de recusa e Batch API; necessidade de trocar provedor sem reescrever deliveries.
**Decisão:** SDK oficial `anthropic`; adaptador interno com interface única; roteamento por passo (Haiku 4.5 para triagem, Opus 5.5 padrão, Sonnet 5.5 só após eval).
**Consequências:** custo por run medido desde o início; segundo provedor plugável sem proxy externo.

## ADR-0006 · Memória em quatro camadas, append-only — `proposto`
**Contexto:** exigência de nunca esquecer, aprender com cada entrega, proveniência e confirmação.
**Decisão:** Memória da Marca (fatos versionados), Episódica (tudo), Aprendizados por cliente (reflexão pós-entrega), Aprendizados da plataforma (sem dado de cliente). Correção cria versão; nada é apagado fora do fluxo LGPD.
**Consequências:** pgvector + FTS para recuperação com orçamento; job de reflexão por fila; storage cresce e é aceito.

## ADR-0007 · Ledger de créditos com reserva, captura e liberação — `proposto`
**Contexto:** cobrança por delivery, falhas de provedor, retries, decisão comercial pendente.
**Decisão:** `credit_ledger` append-only com idempotência; `credit_holds` no início do run; preços em `delivery_prices` versionada; estimativa antes de gastar.
**Consequências:** nenhuma cobrança dupla; valores podem mudar sem deploy; conciliação simples.

## ADR-0008 · Cobrança via Asaas ou Mercado Pago, atrás de interface única — `decidido pelo Vic em 16/10/2026` (substitui a proposta Stripe)
**Contexto:** pagamento recorrente é requisito; o Vic quer Asaas e Mercado Pago mapeados (contas ainda não criadas). Stripe Brasil não faz Pix recorrente.
**Decisão:** módulo `billing` com interface `PaymentProvider` (assinatura, recarga avulsa, webhook, conciliação) e dois adaptadores, `asaas` e `mercadopago`, escolhidos por configuração. Implementação na Fase 2 com sandbox; preços e planos só quando o Vic definir.
**Consequências:** nenhuma dependência de Stripe; webhooks idempotentes por `event_id`; validar na Fase 2 o suporte de cada um a Pix recorrente e cartão recorrente.

## ADR-0009 · Memória semântica: FTS primeiro, embeddings atrás de adaptador — `proposto`
**Contexto:** a memória precisa achar fatos por significado, não só por palavra. Embeddings são vetores guardados no nosso Postgres (pgvector); o que falta é o modelo que transforma texto em vetor.
**Decisão:** Fase 1 usa busca textual do Postgres (configuração `portuguese`, depois `english`/`spanish`). Fase 2 avalia dois caminhos atrás de um adaptador: modelo open-source multilíngue rodando no nosso worker (sem custo por uso, dado não sai de casa) ou API paga (custo na casa de centavos por milhão de tokens). O Vic escolhe com os números na mão.
**Consequências:** nada sai do nosso banco; trocar de modelo é reindexar.

## ADR-0010 · Internacionalização desde a Fase 1 (pt-BR, en, es) — `decidido pelo Vic em 16/10/2026`
**Contexto:** lançamento em vários países; desenvolver primeiro em pt-BR.
**Decisão:** `next-intl` (ou equivalente) com catálogo de mensagens por idioma; nenhum texto fixo em componente; rota por idioma (`/` = pt-BR, `/en`, `/es`) com `hreflang`; `locale` em `workspaces` e `users`; mensagens de erro da API por idioma via código estável; os agentes recebem o idioma do workspace no contexto e respondem nele; SOULs traduzidas depois.
**Consequências:** a fatia de fidelidade visual já nasce com catálogo pt-BR; en e es entram como tradução, não como refatoração.

## ADR-0011 · Data API do Supabase desligada em produção — `decidido pelo Vic em 16/10/2026`
**Contexto:** a Data API (`/rest/v1`) expõe o banco a quem tiver a chave publicável, protegido só por RLS. O Vic quer o sistema só para nós.
**Decisão:** em produção, nenhum schema exposto na Data API; a única porta é a API FastAPI. Local mantém a Data API para os testes pgTAP e PostgREST. Auth, Storage e Realtime continuam.
**Consequências:** o web e o mobile nunca falam com o banco diretamente; qualquer leitura passa pela nossa API.
