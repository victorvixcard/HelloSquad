# Plano de ação — Fase 1 (Núcleo vertical)

Rascunho de Thor em 16/10/2026 03:05, escrito enquanto S0b e A0b fecham a Fase 0. Vale a mesma regra: ler este arquivo → `git log` → `docs/parciais/` → sub-agentes → seguir do disco.

**Decisões do dono em vigor:** `docs/DIRETRIZES_DO_DONO.md` (PASSO 0 de todo briefing). **Critério da fase** (Documento Mestre §16, Plano §4): com a Miolo fictícia, pedido → trabalho → entrega → revisão → aprovação → histórico, crédito debitado uma vez só, tudo visível na conversa e em Projetos.

## Restrição conhecida

A chave da API da Anthropic ainda não foi fornecida. Todo o núcleo (schema, estados, API, Realtime, memória, créditos, UI) não depende dela. O runtime do squad nasce com **adaptador de LLM com modo simulado** (respostas determinísticas de fixtures quando `ANTHROPIC_API_KEY` está vazia), para os testes correrem sem chave e sem custo; a chave real só liga o modo real. Isso também é o que o teste automatizado usará sempre.

## Fila (sequencial; pares só quando as áreas não se tocam)

| # | Fatia | Agente | Estado | Depende de | Critério de pronto |
|---|---|---|---|---|---|
| S1a | **Schema do núcleo**: `conversations` (tipo, objeto de contexto: tipo + id, participantes), `messages` (author_type user/agent/system, agent_id, run_id, conteúdo, anexos), `projects`, `work_items` (estado, responsável principal, colaboradores, origem), `work_item_steps`, `deliveries`, `delivery_versions`, `delivery_files` (Storage), `approvals` (tipo: revisar/aprovar/autorizar/confirmar/reconectar/responder; decisão; prazo), `runs`, `run_steps`, `run_events`. Máquina de estados dos trabalhos em função SQL com transição atômica (`UPDATE … WHERE status = esperado`), estados do Documento Mestre §8. RLS forçada em tudo; pgTAP por tabela e por transição; `run_events` com trigger que publica em Realtime Broadcast no canal `workspace:<id>`. | Stark | ✅ fechada 16/10 04:09 (23 min; 4 migrations, 13 tabelas, matriz de 23 transições, 4 filas pgmq, Realtime no canal privado provado com cliente real; pgTAP 216; `make test` verde conferido por Thor 04:15) | Fase 0 ✅ (16/10 03:50) | `make test` verde; pgTAP cobre isolamento e transições inválidas; `supabase status` mostra Realtime; relatório `S1a-relatorio.md` |
| S1b | **API do núcleo**: criar conversa a partir de um objeto, enviar mensagem, listar conversa com paginação por cursor, criar trabalho a partir de mensagem, listar trabalhos (quadro/lista), detalhe do trabalho com etapas e versões, decidir aprovação (idempotente). Fila pgmq `runs.interactive` enfileirada **na mesma transação** que cria o trabalho. OpenAPI atualizado. | Stark | ✅ fechada 16/10 04:09 (18 min; 16 rotas, `app.create_conversation`, bucket `deliveries`, tabela de erros, 13 testes de integração; pytest 64, pgTAP 241; `make test` verde conferido por Thor 04:40) | S1a ✅ | pytest de integração cobre o caminho pedido → trabalho → aprovação; `make openapi` em dia |
| A1f | **Fidelidade visual à V4.6** (antes de qualquer funcionalidade nova de interface): reproduzir tela por tela o protótipo do Diogo, igual, com os efeitos (borda viva, olhos e expressões, status vivo, animações do DS, `prefers-reduced-motion`): Início (Home V3 congelada), barra lateral exatamente como a V4.6 (reverter as divergências da A0), painel de conversa universal com cartão de contexto, ambiente do Otto/Conteúdo com as quatro camadas, faixa "Precisa de você"; textos em catálogo pt-BR (ADR-0010), nenhum texto fixo; entrega = comparação lado a lado (captura do protótipo × nossa) com tabela do que ainda difere; nada muda sem registrar pergunta. | Aranha | 🟡 em execução (disparada 16/10 ~08:40, Opus 5.5; em paralelo com S1c, áreas disjuntas; sem `make e2e`/`make seed`) | S1b ✅ | Diogo (ou o Vic) aprova a comparação; lint, tipos e Vitest verdes; relatório `A1f-relatorio.md` |
| S1c | **Runtime do squad v0**: adaptador de LLM (SDK oficial `anthropic`, `claude-opus-5-5`, `thinking adaptive`, streaming, `fallbacks: "default"`, prompt caching no prefixo SOUL + skill) com **modo simulado** por fixtures; montagem do system prompt a partir de `squad/<id>/SOUL.md` + `skills/04.01.md` (criar a skill do Otto) + contexto; `agent_prompt_versions`; worker consumindo `runs.interactive` com `run_steps` por chamada e `run_events` de progresso; Nexo classifica a intenção (Haiku 4.5 ou simulado) e delega ao Otto; Otto produz a legenda (04.01) e cria `delivery_version`; passo de autoverificação (checklist do Documento Mestre §8); trabalho vai para "Precisa de você" com `approval` do tipo revisar. Custo (tokens) gravado em `run_steps`. | Stark | 🟡 em execução (disparada 16/10 ~08:40, Opus 5.5; liberada pelo Vic às 08:30) | S1b ✅ | teste ponta a ponta em modo simulado: mensagem da Marina → run → entrega → approval pendente, com eventos no Realtime; `make worker` processa a fila local |
| S1d | **Memória camadas 1 e 2**: `brand_profiles`, `brand_facts` (versão, `supersedes_id`, status hypothesis/observed/confirmed/decision/discarded, origem, validade), `fact_sources`, `memory_suggestions` ("percebeu": confirmar/corrigir/descartar), `memory_conflicts`, `run_context_items`; busca por FTS em português (pgvector fica para a Fase 2, quando o fornecedor de embeddings for escolhido); API de leitura/confirmação; o runtime passa a recuperar fatos confirmados com orçamento de tokens; seed da memória fictícia da Miolo (`DADOS_FICTICIOS.md`). | Stark | ⚪ pendente | S1c | correção de uma preferência → próxima entrega usa a versão nova; sugestão descartada não volta; pgTAP de isolamento |
| S1e | **Créditos**: `credit_accounts`, `credit_grants`, `credit_holds`, `credit_ledger` (append-only, `idempotency_key UNIQUE`), `delivery_prices` versionada com valores **provisórios marcados como provisórios**; reserva ao iniciar o run, captura ao concluir, liberação em falha; endpoint de estimativa; saldo em `GET /me`. Sem gateway de pagamento ainda (Fase 2). | Stark | ⚪ pendente | S1c | teste: run concluído debita uma vez mesmo com retry; falha libera; pgTAP impede UPDATE/DELETE no ledger |
| A1a | **Conversa universal + Início + Sala do Squad**: painel lateral de conversa (380/364 px, sobreposição a 1280) com cartão de contexto do objeto, lista de mensagens com autor (pessoa/agente com `Agent` mini), `CommandField` ativo enviando para a API, assinatura do canal Realtime `workspace:<id>` pelo cliente de browser, progresso do run ("Otto está escrevendo…" com `StatePill` de presença), Início com pedidos recentes e pendências, Sala do Squad. | Aranha | ⚪ pendente | S1b (contrato) | Marina envia um pedido e vê a resposta simulada chegar sem recarregar; Playwright cobre |
| A1b | **Conteúdo/Otto, Projetos e "Precisa de você"**: ambiente do Otto com a entrega em destaque (versões, revisar/aprovar), Projetos em Quadro e Lista com estados da V4.6, faixa "Precisa de você" com tipo de decisão, Memória da Marca (dossiê, sugestões com Confirmar/Corrigir/Descartar, histórico). | Aranha | ⚪ pendente | S1c, S1d, A1a | fluxo completo do critério da fase no Playwright, com dados fictícios |
| H1 | **QA da Fase 1**: teste de aceite do Documento Mestre §16 em modo simulado; idempotência de aprovação e de crédito; isolamento das novas tabelas; Realtime não vaza canal entre tenants; memória respeita confirmação. | Hulk | ⚪ pendente | A1b | `H1-relatorio.md` |

## Decisões que preciso tomar ou pedir ao Vic antes/durante a fase

1. **Fornecedor de embeddings** (a Anthropic não oferece embeddings): Voyage AI (parceiro recomendado pela Anthropic) ou OpenAI. Fase 1 usa FTS; a decisão entra na Fase 2. Proposta: ADR-0009.
2. **Chave da API da Anthropic** para ligar o modo real em S1c (o modo simulado não depende dela).
3. **Cookie httpOnly** (H0-03): definido em A1a quando o Realtime no browser existir.
4. **Preços provisórios** em `delivery_prices`: Thor define valores de desenvolvimento (por exemplo, 10 créditos por 04.01) marcados como provisórios; o Vic decide os reais.

## Perguntas da S1a para o Vic (Thor aceitou provisoriamente a leitura conservadora do Stark)

1. Conversa direta com um agente é visível para todos os membros do workspace (hoje sim) ou só para quem a abriu?
2. Viewer só lê (hoje não envia mensagem, não cria trabalho e não decide)?
3. Autorizar ação externa exige admin ou owner (hoje sim)?
4. "Rejeitar" uma revisão cancela o trabalho ou pede outra proposta? Hoje só registra e o trabalho fica em "Precisa de você".
5. `scheduled → done` (execução confirmada pela API do canal) conta como a verificação explícita que libera o Concluído?
6. Estados de projeto (`draft`, `active`, `paused`, `done`, `cancelled`) servem?

## Perguntas da S1b para o Vic e para a A1a

1. O painel da conversa abre pelas mensagens mais recentes? Hoje a primeira página é a das mais antigas; um `before=` resolve sem quebrar o contrato (decisão da A1a).
2. Conversa direta com um agente: uma nova a cada clique (hoje) ou uma por agente e por pessoa, reutilizada? Thor recomenda **reutilizar** (a V4.6 diz "reabrir sobre o mesmo objeto retoma o histórico").
3. Os três tipos de objeto de conversa (`project`, `work_item`, `delivery`) bastam para a Fase 1? Thor: sim.

## Respostas do Vic (16/10 08:30)

1. Fila liberada (S1c + A1f em paralelo). 2. Acesso do Diogo: depois. 3. Chave da Anthropic: fica pendente, runtime simulado. 4. Regras de identidade da S0: ficam como estão; o Stark não altera mais nada sem perguntar. 5. Preço e créditos por último; agora é teste. 6. As perguntas de produto do núcleo serão reapresentadas em linguagem simples (Thor). 7. Escopo `workflow` do token: explicação devida (Thor); CI pode esperar. 8. Pagamento recorrente é requisito: Asaas e Mercado Pago (ADR-0008). 9. Motor de imagem é do Vic; Kaia espera. 10. Embeddings: explicação devida (ADR-0009). 11. Idiomas pt-BR, en, es (ADR-0010). 12. Data API desligada em produção (ADR-0011). 13. Domínio: depois. 14. Créditos no mobile e na web.

## Decisão de ritmo (Thor, 16/10 04:20; cumprida 04:40)

De madrugada rodei só até a S1b (banco + API do núcleo prontos, 241 testes pgTAP e 64 pytest verdes). **A fila está pausada em S1c** até o primeiro sinal do Vic, para ele acompanhar o desenho do runtime do squad e para não consumir a cota semanal sem supervisão. Ao retomar: S1c (Stark) e A1a (Aranha) podem rodar em paralelo, porque não se tocam (worker e `squad/` × `apps/web`), desde que a A1a não rode `make e2e` enquanto a S1c usa o banco.

## Pendências herdadas da Fase 0

- Para a **A1a**: espelhar os 14 slugs reservados do banco em `apps/web/app/app/novo-workspace/validation.ts` (lista em `S0b-relatorio.md` §3) e tratar 422 `slug_reserved`; incluir `ws://127.0.0.1:56321` (local) e `wss://` (nuvem) no `connect-src` da CSP (`apps/web/lib/security-headers.ts`) quando o Realtime entrar; decidir `cookieOptions.httpOnly` (A0b §4).
- Para a **S1a**: corrigir a linha velha de "Problemas comuns" do `SETUP_LOCAL.md` (A0b §3 item 6).
- Para a **Fase 5**: `'unsafe-inline'` em `script-src` das páginas estáticas e em `style-src`; HSTS; Data API em produção (decisão do Vic).
- Para o **Vic**: ver `PLANO_DE_ACAO_FASE0.md` → "Pendências para o Vic".
