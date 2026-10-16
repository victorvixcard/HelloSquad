# HelloSquad — Proposta de Arquitetura (infra, multi-acesso, backend)

**Versão:** 0.1 · **Data:** 15/10/2026 · **Autor:** Thor · **Status:** proposta para aprovação do Vic
**Base:** Handoff V4.6, Documento Mestre v1.0, catálogo de 46 deliveries / 23 integrações.

---

## 0. A recomendação em um parágrafo

Vercel serve a web (Next.js, SSR para SEO/GEO). Supabase é o plano de dados único: Auth, Postgres com RLS por workspace, Storage, Realtime, Queues (pgmq), Cron e pgvector. Railway roda o que não pode viver em função serverless: a API (FastAPI, stateless, N réplicas) e os **workers** que executam os agentes, consomem a fila e falam com LLM e integrações externas. Os sete agentes são **um runtime só** com sete personas versionadas em `squad/`, orquestradas pelo Nexo e persistidas como `runs` auditáveis. A memória é o coração: fatos com proveniência e estado de confirmação, histórico episódico completo e aprendizados destilados por cliente, tudo append-only (nada é apagado, só substituído por versão nova). Créditos ficam num ledger com reserva, captura e liberação idempotentes; preços em tabela, não em código.

```
                 ┌──────────────── Vercel ────────────────┐
  Browser ─────▶ │ Next.js (site público SSR + app shell)  │
  Expo (iOS/And) │ metadata, JSON-LD, sitemap, llms.txt    │
                 └───────────────┬─────────────────────────┘
                                 │ HTTPS (JWT Supabase)
                 ┌───────────────▼───────── Railway ───────────────┐
                 │ api  (FastAPI, stateless, réplicas)  SSE p/ chat │
                 │ worker (pool; consome pgmq; roda agentes/LLM)    │
                 │ scheduler (tick 1 min; rotinas → fila)           │
                 └───────┬──────────────┬──────────────────┬────────┘
                         │              │                  │
              ┌──────────▼──────────────▼───────┐   ┌──────▼────────────────┐
              │ Supabase                         │   │ Externos               │
              │ Auth · Postgres+RLS · pgvector   │   │ Anthropic (LLM)        │
              │ Storage · Realtime · pgmq · cron │   │ imagem/vídeo · Meta ·  │
              └──────────────────────────────────┘   │ Google · Stripe · e-mail│
                                                     └────────────────────────┘
```

---

## 1. O que o handoff já fixou e o que está aberto

**Fixo (regra de produto, não discuto aqui):** sete personas com nomes, cores e papéis; conversa como interface principal; trabalho/projeto/responsabilidade como objetos persistentes; memória com proveniência e confirmação; aprovar ≠ publicar/enviar/investir; estados visíveis ao usuário; isolamento por workspace.

**Aberto e tratado como configuração:** preços, créditos, planos, paywall; fornecedor de imagem e vídeo; gateway de pagamento; semântica do botão global de autonomia; viabilidade do Meta Ads MCP multi-tenant.

**Divergência encontrada:** a UI V4.6 rotula Kiwi como "Mídia e Performance"; o Documento Mestre (mais novo) define **Growth Marketing** (inclui SEO, CRO, testes). Adotei o Documento Mestre. A V5 de design precisa alinhar o rótulo.

---

## 2. Topologia e papel de cada serviço

| Camada | Serviço | O que roda | Por que aqui |
|---|---|---|---|
| Web | **Vercel** | Next.js 15 (App Router): site público com SSR/SSG, app autenticado (client components + Realtime), Route Handlers só para coisas leves (OG image, webhooks de baixo risco) | CDN global, preview por PR, Metadata API e renderização no servidor para SEO/GEO. |
| API | **Railway** `api` | FastAPI (Python 3.12), stateless, 2+ réplicas, healthcheck, autoscale por CPU/latência | Execução longa e previsível, sem limite de função serverless; stack que o time já domina. |
| Execução | **Railway** `worker` | Pool de workers Python consumindo filas pgmq; roda agentes (LLM), geração de imagem, integrações, reflexão de memória | Runs de agente duram de 30 s a vários minutos e precisam de retry, pausa e cancelamento. Função serverless não serve. |
| Agendamento | **Railway** `scheduler` (ou `pg_cron`) | Tick a cada minuto: lê `responsibilities` vencidas e publica na fila com chave idempotente | Modo Autônomo precisa de histórico por execução; a fila garante exatamente-uma-vez por janela. |
| Dados | **Supabase** | Auth (e-mail, Google), Postgres 16 com RLS, pgvector, pgmq (Supabase Queues), pg_cron, pg_net, Storage com URLs assinadas, Realtime | Um plano de dados, transações entre domínio e fila, RLS nativa para multi-tenant, pooling gerenciado (Supavisor). |
| Observabilidade | Sentry (erros), Langfuse (traces e custo de LLM por run), PostHog (produto) | | Custo por entrega e taxa de falha são métricas de negócio deste produto. |

**O que não vai onde:**
- Nenhuma chamada de LLM dentro de função Vercel. Só no `worker` (pesado) ou na `api` via SSE (turno leve de conversa).
- `service_role` do Supabase só em `api`, `worker` e `scheduler`. O browser e o app mobile usam a chave anônima e passam pela RLS.
- Tokens OAuth de clientes (Meta, Google) cifrados em repouso (coluna cifrada via Supabase Vault ou chave KMS na aplicação), nunca em log.

**Ambientes:** `local` (Supabase CLI em Docker + Railway CLI), `staging` e `production` como projetos Supabase separados e ambientes Railway separados. Vercel preview por PR aponta para staging.

---

## 3. Multi-tenant e acesso simultâneo

### 3.1 Modelo de tenant
`workspaces` (um por negócio do cliente) ↔ `memberships` (usuário, papel: owner/admin/editor/viewer) ↔ `users` (Supabase Auth). Toda tabela de domínio carrega `workspace_id NOT NULL` com índice composto e política RLS `workspace_id IN (select workspace_id from memberships where user_id = auth.uid())`. O workspace ativo vai no JWT (custom claim) para evitar subquery em toda leitura.

Storage: bucket por ambiente, caminho `workspace_id/<entidade>/<id>/<versão>`; política RLS espelha a do banco; download só por URL assinada curta.

### 3.2 Onde a concorrência aparece e como absorvemos

| Ponto | Risco | Resposta |
|---|---|---|
| Muitos usuários abrindo o app | Conexões Postgres esgotam | Supavisor em modo transação; `api` com pool pequeno por réplica; leituras de listagem com paginação por cursor. |
| Muitos pedidos ao mesmo tempo | LLM vira gargalo; um cliente sufoca os outros | Toda execução pesada vira job na fila. Cap de **N runs simultâneos por workspace** (configurável por plano) aplicado no dequeue. Token bucket por provedor (Anthropic, Meta, Google) no worker. Excedente fica em "Na fila" visível ao usuário, nunca em erro. |
| Progresso em tempo real | Polling mataria a API | Worker grava `run_events`; trigger publica via Supabase Realtime (Broadcast por canal `workspace:<id>`). Stream token a token só para conversa leve, via SSE direto da `api`. |
| Retry duplicando post, cobrança ou disparo | Dano real ao cliente | Chave de idempotência em `work_items`, `external_actions`, `credit_ledger` e webhooks de pagamento, com `UNIQUE`. Ação externa só confirma depois da resposta da API do canal. |
| Cliques repetidos em "Aprovar" | Estado inconsistente | Transições de estado em função SQL com `UPDATE ... WHERE status = <esperado>`; segunda chamada vira no-op. |
| Pico em dia útil 9h | Worker não acompanha | Autoscale do serviço `worker` por profundidade da fila (métrica exposta pela `api`); filas separadas: `runs.interactive` (prioridade), `runs.scheduled`, `external_actions`, `memory.reflect`. |
| Workspace gigante | Memória vira dossiê de milhares de fatos | Recuperação por relevância com orçamento de tokens (seção 5.4); nunca "despejar o dossiê inteiro". |

**Alvos iniciais (SLO):** p95 de abertura de tela < 800 ms; primeiro evento de progresso de um run < 5 s após o pedido; nenhuma ação externa executada duas vezes; zero vazamento entre workspaces (teste automatizado de RLS em CI com dois tenants).

---

## 4. Backend: módulos, contrato e orquestração

### 4.1 Módulos da API (FastAPI, um pacote `hellosquad` com dois entrypoints: `api` e `worker`)

`identity` (workspaces, memberships, convites) · `conversations` (mensagens, participantes, contexto do objeto) · `work` (projetos, trabalhos, etapas, estados) · `deliveries` (versões, arquivos, revisão) · `approvals` (pendências "Precisa de você", decisões) · `memory` (fatos, fontes, sugestões, conflitos, aprendizados) · `squad` (runtime dos agentes, roteamento, ferramentas) · `autonomy` (responsabilidades, runs, limites) · `permissions` (escopos, tetos, validade, revogação) · `connections` (OAuth, tokens, reconexão) · `billing` (créditos, assinaturas, webhooks) · `audit` (trilha imutável) · `notifications` (in-app, e-mail transacional, push).

Contrato: OpenAPI gerado pelo FastAPI → cliente TypeScript gerado em `packages/contracts`, consumido por web e mobile. A UI V4.6 troca roteiro local por chamada real ambiente por ambiente, sem mudar a experiência (orientação E.1 do handoff).

### 4.2 Como sete agentes rodam como um runtime

O Documento Mestre libera: "não exige sete LLMs independentes". Então:

- **Uma engine, sete personas.** Cada agente é uma pasta em `squad/<id>/` com `agent.yaml` (ferramentas permitidas, deliveries, colaboradores, modelo, nível de autonomia) e `SOUL.md` (identidade, voz, limites). O runtime monta o system prompt = SOUL + skill da delivery + contexto de memória recuperado + contexto do objeto. Prompts são versionados; cada run registra `prompt_version`.
- **Nexo é o planejador e roteador.** Pedido chega → Nexo classifica a intenção (modelo barato), qualifica o briefing (pergunta objetiva se faltar o essencial), cria o trabalho e decide: um especialista resolve, ou vira projeto com etapas e responsáveis. O usuário pode falar direto com qualquer especialista; nesse caso o Nexo só observa e registra.
- **Colaboração é mensagem na mesma conversa.** Agente A chama agente B pela ferramenta `squad.delegar(agente, tarefa, contexto)`; o runtime abre um sub-run de B com o contexto necessário e devolve o resultado como mensagem com `author_type = agent`. Tudo fica visível na conversa, com o responsável principal preservado. Sem "teatro": só delega quando a delivery pede outra especialidade (regra 11 do Documento Mestre).
- **Run = unidade auditável.** `runs` (quem, por quê, estado, custo, prompt_version, modelo) → `run_steps` (cada chamada de LLM, ferramenta ou espera) → `run_events` (progresso para a UI). Pausas de dias para aprovação são um estado do run, não um processo preso em memória. Por isso a máquina de estados é nossa (Postgres), e não o checkpoint de um framework.
- **Autoridade de ferramenta no servidor.** Cada ferramenta exposta ao agente checa permissão no `permissions` antes de executar e recebe `workspace_id` do runtime, nunca do prompt. Analisar e preparar são livres dentro dos créditos; executar exige permissão com escopo, teto e validade; publicar/enviar/investir ainda exigem aprovação específica registrada em `approvals`.
- **Auto-verificação antes de "concluído".** Todo delivery passa por um passo de crítica (checklist de aderência, marca, qualidade, aplicabilidade) antes de ir para revisão do usuário. "Concluído" só depois da verificação, nunca pela frase do modelo.

**Provedor de LLM.** Anthropic como primário via SDK oficial, com camada de adaptador própria (sem proxy) para fallback de provedor. Roteamento inicial por tipo de passo, a validar com eval por delivery:

| Passo | Modelo | Observação |
|---|---|---|
| Classificar intenção, extrair campos, rotear | `claude-haiku-4-5` | barato e rápido; `thinking` com `budget_tokens` |
| Produção padrão das deliveries | `claude-opus-5-5` | padrão de qualidade; `thinking: adaptive`, `effort: medium` |
| Estratégia (Bia), plano de projeto (Nexo), plano de mídia (Kiwi) | `claude-opus-5-5` com `effort: high` | julgamento profundo justifica |
| Candidato a rebaixar após eval | `claude-sonnet-5-5` | só quando o eval provar paridade naquela delivery |

Técnicas obrigatórias: **prompt caching** (SOUL + skill + fatos confirmados estáveis no prefixo; contexto volátil depois do último breakpoint), **streaming** em tudo que pode passar de alguns segundos, `fallbacks: "default"` para recusas de classificador, **Batch API** (50% do custo) para relatórios recorrentes da Íris e reflexão de memória que não tem pressa, e `usage` de cada chamada gravado em `run_steps` para custo por entrega.

Preços de referência (API Anthropic, 15/10/2026): Opus 5.5 US$ 4 / 20 por milhão de tokens (entrada/saída); Sonnet 5.5 US$ 2 / 10; Haiku 4.5 US$ 1 / 5. É isso que define o custo real de cada delivery e, portanto, o preço em créditos.

**Motor de imagem e vídeo:** pendente de homologação (Documento Mestre). Proposta: bancada de teste com 3 fornecedores (qualidade, consistência de marca, texto em imagem, licença comercial, custo) antes de fechar. O adaptador de imagem nasce atrás de interface própria para trocar fornecedor sem tocar nas deliveries da Kaia.

---

## 5. Memória: o que faz o produto valer

Requisito do Vic: os agentes se aperfeiçoam sempre, nunca esquecem o contexto de cada cliente e aprendem com cada entrega. Requisito do Documento Mestre: proveniência, confirmação, isolamento, versões e recuperação só do que é útil.

### 5.1 Quatro camadas

| Camada | O que guarda | Escopo | Quem grava |
|---|---|---|---|
| **1. Memória da Marca** | Fatos e decisões do negócio: identidade, público, canais, objetivos, tom, preferências, permissões | workspace | onboarding, usuário, confirmação de sugestão de agente |
| **2. Episódica** | Tudo que aconteceu: conversas, trabalhos, versões de entrega, correções, aprovações, recusas, resultados medidos | workspace | sistema, automaticamente |
| **3. Aprendizados por cliente** | O que funcionou e o que o cliente corrige, destilado por agente ("Otto: este cliente corta adjetivos; prefere CTA direto") | workspace × agente | job de reflexão após cada entrega fechada |
| **4. Aprendizados da plataforma** | Melhorias de skill e prompt que valem para todos (sem dado de cliente) | global, por agente e delivery | eval + versionamento de prompt, revisão humana |

### 5.2 Modelo de um fato (camada 1)
`brand_facts`: `content`, `category`, `status` (`hypothesis` → `observed` → `confirmed` | `decision` | `discarded`), `source_type` (onboarding, conversation, correction, approval, file, connection, agent_observation), `source_ref`, `observed_at`, `confidence`, `valid_from`, `valid_until`, `version`, `supersedes_id`, `used_by_agents[]`, `embedding`. Correção não edita: cria versão nova e marca a anterior como `superseded`. Conflito entre dois fatos confirmados abre item em "Precisa de você".

"<Agente> percebeu" é uma `memory_suggestions` ligada ao run que a gerou. Só vira `brand_fact` confirmado com Confirmar; Corrigir cria o fato com o texto do usuário; Descartar fica registrado para não voltar a ser sugerido.

### 5.3 Aprendizado por entrega (camadas 2 → 3)
Quando um trabalho fecha (aprovado, aprovado com edições, recusado, ou cancelado), a fila `memory.reflect` recebe um job. O reflexo lê o briefing, as versões, o diff das correções do usuário e o resultado; produz candidatos a `agent_learnings` (`workspace_id`, `agent_id`, `delivery_type`, `learning`, `evidence_refs[]`, `confidence`, `status`). Promoção: um aprendizado entra no contexto do agente quando confirmado pelo usuário **ou** quando a mesma evidência se repete em N entregas (configurável). Nunca vira regra de marca sem confirmação (isso continua sendo a camada 1).

Resultado prático: a terceira legenda que o Otto escreve para o cliente já não comete o erro que ele corrigiu na primeira.

### 5.4 Recuperação com orçamento
Para cada run, o runtime monta o contexto em ordem: (1) fatos confirmados essenciais da marca (sempre, poucos, estáveis, cacheados); (2) busca híbrida (pgvector + FTS) de fatos e aprendizados relevantes à delivery e ao briefing, com `top_k` e teto de tokens; (3) histórico do objeto (conversa/trabalho) resumido se longo; (4) pedido atual. Tudo que entrou fica registrado em `run_context_items` para explicar "por que o agente achou isso" e para medir quais memórias ajudam.

### 5.5 Nunca esquecer, com LGPD
Append-only: nada é apagado por fluxo normal, só substituído. A única exclusão real é a do titular (encerramento do workspace ou pedido LGPD), que apaga a árvore inteira do workspace, inclusive embeddings e arquivos, e registra o evento. Camada 4 nunca contém dado identificável de cliente.

---

## 6. Créditos e cobrança

Regra do Documento Mestre: regras comerciais pendentes. Então o **mecanismo** nasce agora e os **valores** ficam em tabela.

- `credit_accounts` (por workspace) · `credit_grants` (origem: assinatura do ciclo com validade, ou SPOT sem validade curta) · `credit_holds` (reserva do custo estimado ao iniciar um run) · `credit_ledger` (append-only: `grant`, `hold`, `capture`, `release`, `refund`, `adjustment`, com `idempotency_key UNIQUE`). Saldo = soma do ledger, cacheado por conta.
- Consumo: primeiro o que vence antes (assinatura), depois SPOT. Falha de provedor libera a reserva, não cobra. Reexecução pedida pelo usuário cobra; nova versão por correção pontual tem preço próprio (menor), configurável.
- `delivery_prices` versionada: `delivery_type` × `depth` (orientar/produzir/executar/otimizar) → créditos. Antes de qualquer run pesado o usuário vê a estimativa ("isto custa X créditos"); conversa leve não cobra por mensagem (evita o taxímetro).
- Separar dois dinheiros: créditos de IA (nossos) e verba de mídia (do cliente, em Meta Ads). Teto de mídia é permissão, não crédito.
- **Pagamento:** Stripe como padrão para assinatura por cartão, recarga SPOT por cartão e **Pix avulso** (Stripe Brasil aceita Pix só em pagamento único, não recorrente; verificado em 15/10/2026). Se Pix recorrente for requisito comercial, avaliar Pagar.me, Mercado Pago ou Asaas. Webhooks com `event_id` único gravado antes de processar; conciliação diária.

---

## 7. SEO e GEO desde o primeiro commit

- **Site público em Next.js com SSR/SSG:** `/`, `/como-funciona`, `/squad` e `/squad/[agente]` (sete páginas de entidade, uma por especialista: ótimo para busca generativa), `/precos`, `/faq`, `/blog`, `/sobre`. O app autenticado (`/app/...`) é `noindex`.
- **Metadata API** por rota: title, description, canonical, Open Graph e Twitter com imagem gerada por rota, `lang="pt-BR"`, `hreflang` preparado para expansão.
- **Dados estruturados (JSON-LD):** `Organization`, `SoftwareApplication` com `Offer`, `FAQPage`, `BreadcrumbList`, `Article` no blog, `Service` para cada agente.
- **Infra de rastreio:** `sitemap.xml` gerado, `robots.txt` permitindo GPTBot, ClaudeBot, PerplexityBot e Google-Extended, `llms.txt` descrevendo o produto e os sete agentes em texto citável.
- **GEO na redação:** respostas diretas em parágrafos curtos e autocontidos, definição explícita do que é a HelloSquad na primeira dobra, FAQ com perguntas como as pessoas fazem para a IA, consistência de entidade (sempre "HelloSquad", nunca HelloOtto).
- **Performance:** a landing do handoff tem 600 KB de HTML com React embutido. Vira componentes Next com o Design System portado de `tokens.json`; meta de Core Web Vitals verde no mobile.

---

## 8. Apps Android e iOS

Expo (React Native) em `apps/mobile`, reaproveitando `packages/contracts` (cliente da API), `packages/ui` (tokens e primitivos compartilháveis) e Supabase Auth. Push via Expo Notifications para "Precisa de você", entrega pronta e falha de integração. Deep links para abrir o objeto certo. Exigências de loja já previstas na arquitetura: exclusão de conta pelo app, política de privacidade pública, compra de créditos no app passa pelas regras de In-App Purchase (ou compra só na web, decisão comercial). Entra na Fase 4; a API nasce agnóstica de cliente desde a Fase 0 para isso não custar retrabalho.

---

## 9. Segurança, LGPD e governança

- RLS em toda tabela, testada em CI com dois tenants e um usuário sem membership.
- Permissões executáveis no backend (`permissions`: escopo, ação, teto, validade, revogação), não no prompt.
- Ações externas idempotentes com confirmação da API do canal; log em `external_actions` e `audit_events` (imutável).
- OAuth com privilégio mínimo; tokens cifrados; renovação, expiração e reconexão com estado visível ao usuário.
- Consentimento e opt-out operacionais para contatos (Max); origem de cada contato registrada.
- Separação de ambientes; segredos em Railway/Vercel/Supabase, nunca no repo.
- Antes do lançamento: revisão de segurança dedicada (IDOR, RLS, escopo de tenant, injeção via conteúdo de cliente nos prompts).

---

## 10. Observabilidade

Trace ID por pedido atravessando api → fila → worker → LLM. Sentry para exceções. Langfuse para cada chamada de LLM (tokens, custo, latência, prompt_version, workspace anonimizado). PostHog para funil e uso. Painéis mínimos: custo por delivery, taxa de primeira entrega aprovada sem correção, falhas de integração por canal, profundidade da fila, p95 de latência.

---

## 11. Modelo de dados v1 (agrupado por domínio)

| Domínio | Tabelas |
|---|---|
| Identidade | `workspaces`, `users` (Auth), `memberships`, `invitations` |
| Marca e memória | `brand_profiles`, `brand_facts`, `fact_sources`, `memory_suggestions`, `memory_conflicts`, `agent_learnings`, `run_context_items` |
| Conversa | `conversations` (tipo, objeto, participantes), `messages` (author_type: user/agent/system, agent_id, run_id) |
| Trabalho | `projects`, `work_items`, `work_item_steps`, `work_item_assignments`, `deliveries`, `delivery_versions`, `delivery_files` |
| Decisão | `approvals` (tipo: revisar/aprovar/autorizar/confirmar/reconectar/responder), `permissions` |
| Execução | `runs`, `run_steps`, `run_events`, `external_actions` |
| Autonomia | `responsibilities`, `responsibility_runs` |
| Conexões | `connected_accounts`, `oauth_tokens` (cifrado), `connection_health` |
| Dados do cliente | `contacts`, `segments`, `consents`, `metrics_snapshots` (fonte, período, unidade) |
| Billing | `billing_accounts`, `subscriptions`, `credit_accounts`, `credit_grants`, `credit_holds`, `credit_ledger`, `delivery_prices`, `payment_events` |
| Plataforma | `audit_events`, `notifications`, `agent_prompt_versions`, `feature_flags` |

Convenções: `id uuid`, `workspace_id` em tudo, `created_at`/`updated_at`, soft-supersede em vez de delete, enums de estado em tabela de domínio, migrations via Supabase CLI versionadas no repo.

---

## 12. Estrutura do monorepo

```
ottodois/
├── apps/
│   ├── web/          Next.js 15 (site público + app)        → Vercel
│   ├── backend/      Python: pacote hellosquad; entrypoints api | worker | scheduler → Railway
│   └── mobile/       Expo (Fase 4)
├── packages/
│   ├── ui/           Design System HelloSquad (tokens.json → tokens.css, componentes React)
│   └── contracts/    OpenAPI → cliente TypeScript
├── squad/            7 agentes: agent.yaml + SOUL.md + skills/ (fonte dos prompts, versionada)
├── supabase/         migrations, policies RLS, seed, config
├── infra/            railway.toml, vercel.json, docker-compose.local.yml
├── design/           handoff-v4.6 (referência)
└── docs/             arquitetura, plano, ADRs, regras de negócio
```

---

## 13. Decisões propostas (ADRs em `docs/adr/`) e perguntas para o Vic

**Decisões que estou propondo fechar agora:** ADR-0001 Vercel + Railway + Supabase · ADR-0002 Next.js no front, FastAPI no back · ADR-0003 fila Postgres-nativa (pgmq) antes de Redis · ADR-0004 um runtime, sete personas, orquestração própria · ADR-0005 Anthropic primário com adaptador · ADR-0006 memória em quatro camadas append-only · ADR-0007 ledger de créditos com reserva/captura · ADR-0008 Stripe (cartão + Pix avulso).

**Perguntas que só o Vic responde:**
1. Pix recorrente é requisito do lançamento? Define o gateway.
2. Compra de créditos dentro do app mobile ou só na web? Define a relação com as lojas.
3. Idioma: só pt-BR no lançamento? Define `hreflang` e o esforço de conteúdo.
4. Há orçamento para Langfuse Cloud e Sentry pagos, ou começamos nos planos gratuitos?
5. O domínio hellosquad já existe? Define quando ligamos SEO de verdade.
