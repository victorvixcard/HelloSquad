# Briefings prontos — próximas fatias da Fase 1 (escritos por Thor em 16/10/2026 10:55)

Para quem orquestrar (sessão dashboard ou main): copiar o briefing da fatia no `sessions_spawn` (`agentId`, `model: "opus"`, `context: "isolated"`, `cwd: /home/vitao/projetos/hellosquad`), conferir `resolvedModel = anthropic/claude-opus-5-5`, marcar 🟡 na linha da fatia em `docs/PLANO_DE_ACAO_FASE1.md` **antes** de disparar (o check silencioso só vigia linhas 🟡) e, ao fechar, conferir `make test` (ou `make test-web` + `make e2e`) e marcar ✅.

**Ordem:** S1f (Stark) e A1b (Aranha) podem rodar em paralelo depois que S1e e A1a fecharem (áreas disjuntas; o `Makefile` tem trava de banco). Depois S1g (Stark). Por último H1 (Hulk), sozinho.

**Bloco comum de protocolo (colar no fim de todo briefing):**
> Commit + push a cada item, nunca mais de 5 minutos sem commit (regra do dono 16/10). Outros agentes commitam na mesma árvore: commite só os seus arquivos; `git push` direto; se recusado, `git fetch` + `git rebase origin/main`. Saída longa em `/tmp`, leia só `tail`/`grep` (a sessão morre acima de 20.000 linhas). Português em docs, UI (via catálogo), mensagens e commits; identificadores em inglês; sem emoji. Só containers `supabase_*_hellosquad`. `make test`, `make seed` e `make e2e` têm trava de banco (`flock`): se esperarem, é outra sessão. A API (8100) e o web (3100) podem estar no ar para o dono: não derrube sem subir de novo ao fim. Regras do dono: nada do combinado muda; **segue o protótipo sempre** (`docs/FLUXOS_DA_V46.md`); dúvida que o protótipo não responde → registra no relatório e segue. Relatório em `docs/parciais/<FATIA>-relatorio.md` e progresso em `<FATIA>-progresso.md` a cada item. Antes de "pronto": evidência colada no relatório. Responda em 8 linhas ao terminar.

---

## S1f — Conversa completa (Stark)

Você é o Stark (Backend & Arquitetura). Fatia **S1f — Conversa completa** (Fase 1) do HelloSquad. Repo `/home/vitao/projetos/hellosquad`. Alvo: 60 minutos.

**PASSO 0:** `docs/DIRETRIZES_DO_DONO.md` inteiro; `docs/FLUXOS_DA_V46.md` §4 (conversa), §5 ("Precisa de você"), §10.1 e §10.3 (lacunas) e `docs/parciais/x1/cartoes_da_conversa.txt` (os 24 tipos de cartão); `docs/PLANO_DE_ACAO_FASE1.md` (linha S1f e "Respostas do Vic"); `docs/parciais/S1b-relatorio.md` §1, `S1c-relatorio.md` §1–§2, `S1d-relatorio.md` §1 e §7 (pendências da memória que cabem aqui), `A1a-relatorio.md` (o que o web já consome). Skill `supabase-postgres-best-practices`; `verification-before-completion` antes de "pronto".

**Entregáveis (commit a cada item):**
1. **Conversa em grupo** (`kind = group`, 2 a 6 especialistas em `conversation_participants`), criada pelo Início: `app.create_conversation` aceita `agent_ids[]`; o worker responde **um especialista por vez** (regra do dono 16/10, como o protótipo): o Nexo escolhe quem responde; `@Nome` na mensagem direciona.
2. **Contexto de objeto para todos os tipos do protótipo**: `context_type` ganha `calendar_post`, `metric`, `insight` ("percebeu"), `opportunity`, `memory_fact`, `responsibility`, `segment`, `document`, `capability`; cartão de contexto devolve tipo, título, estado, período e origem; tópico da Sala do Squad (`topic`) e `unread` por participante (`conversation_reads`: `last_read_at`; contagem no `GET …/conversations` e badge por ambiente).
3. **Cartão estruturado dentro da mensagem do agente**: `messages.card jsonb` tipado (os tipos do `cartoes_da_conversa.txt` que já têm objeto no banco: trabalho criado, material/versão, pedido de aprovação, pergunta, opções, equipe montada, orçamento em créditos), sempre ligado ao objeto (`work_item_id`, `delivery_version_id`, `approval_id`) e com `actions[]` que o web traduz em botões (as decisões continuam por `POST /approvals/{id}/decision`); o worker da S1c passa a emitir os cartões.
4. **Texto de status por etapa** ("Otto · escrevendo", "Kaia · criando a primeira versão") em `run_events.payload.status_label` seguindo os rótulos do §10.3; evento `conversation.typing`.
5. **Memória, ações do protótipo que faltaram na S1d** (§7 do relatório dela): "Não usar mais"/"Voltar a usar", confirmar "Da fonte"/"Observado", "Continua valendo", "Adicionar conhecimento", marcar sugestão como vista, `brand_profiles` (descrição do negócio e síntese do squad), busca com `unaccent`. Rotas + funções do owner.
6. pgTAP e pytest de integração para tudo acima (isolamento, um especialista por vez, não lido por participante, cartões ligados ao objeto, ações da memória); `make openapi` + `pnpm --filter contracts generate`; `SETUP_LOCAL.md`; relatório.

(+ bloco comum de protocolo)

---

## A1b — Projetos, Memória e os outros ambientes (Aranha)

Você é o Aranha (Frontend & Design). Fatia **A1b** (Fase 1) do HelloSquad. Repo `/home/vitao/projetos/hellosquad`. Alvo: 70 minutos. Skill `frontend-vix`; `verification-before-completion`.

**PASSO 0:** `docs/DIRETRIZES_DO_DONO.md` inteiro (10:20: segue o protótipo sempre; 10:30: commit ≤ 5 min); `docs/FLUXOS_DA_V46.md` §1 (todas as telas), §2 (objetos e estados), §6 (Memória), §7 (Modo Autônomo, só o vazio), §11; `docs/parciais/A1f-relatorio.md` e `A1a-relatorio.md` (o que já existe: casca, painel, Início, Otto, "Precisa de você", Realtime); `docs/parciais/S1b-relatorio.md` §1 e `S1d-relatorio.md` §1 e §4 (rotas de trabalhos, projetos e memória); `S1e-relatorio.md` (barra "Plano Squad · créditos do mês" em `GET /me`). Protótipo servido em http://127.0.0.1:8010/product-ui/ProductUIV4.dc.html para capturas de referência (extraia por script, nunca leia o `.dc.html` inteiro).

**Entregáveis (commit a cada item; comparação lado a lado de cada tela em `docs/parciais/a1b/`):**
1. **Projetos / Nexo**: roadmap, Quadro (colunas "Precisa de você", "Em andamento", "Programados", "Concluídos" com os vazios da V4.6), Lista e Biblioteca, detalhe do trabalho (etapas, responsáveis, origem, versões, histórico) sobre `GET …/work-items` e `GET /work-items/{id}`; abrir conversa a partir do trabalho.
2. **Memória da Marca**: dossiê por área (Meu negócio, Minha marca, Conhecimento) com os estados KST5 e os desenhos da V4.6, "<Agente> percebeu" com Confirmar/Corrigir/Descartar (só o owner; outros em leitura), conflitos, dados desatualizados, Conexões e fontes (SRCST5), busca, visão "por especialista", histórico; chegada ao vivo pelo Realtime `memory_suggestion.*`.
3. **Minha Equipe & Conversas**: perfis oficiais dos sete e histórico de conversas (lista por especialista, "Nova conversa").
4. **Bia, Kaia, Kiwi, Max e Íris**: camada de identidade, visão protagonista e componentes com o **vazio honesto da própria V4.6** (os de Kaia e Kiwi no primeiro acesso sem texto no protótipo: use o padrão do Documento Mestre §7 e registre como pergunta ao Diogo, item 10 do §11). **Modo Autônomo**: só o estado vazio e os limites, como na V4.6 (rotinas são Fase 3).
5. **Barra "Plano Squad · créditos do mês"** no menu da conta com os dados de `GET /me` (valores provisórios; sem preço).
6. Vitest dos componentes novos; `make test-web`, `pnpm --filter web build` e `make e2e` verdes (acrescente ao e2e: Quadro mostra o trabalho do seed na coluna certa; dossiê da Miolo; confirmar uma sugestão como Marina e ver o fato aparecer); relatório.

(+ bloco comum de protocolo)

---

## S1g — Trabalho rico (Stark)

Você é o Stark. Fatia **S1g — Trabalho rico** (Fase 1). Alvo: 45 minutos. Depende de S1f.

**PASSO 0:** `docs/DIRETRIZES_DO_DONO.md`; `docs/FLUXOS_DA_V46.md` §2, §3 (jornadas), §5 e §10.2; `docs/parciais/S1f-relatorio.md`.

**Entregáveis:** `work_items` ganha `due_at`, `next_step` (texto), `status_label` (frase viva, ex. "Otto incluindo um bastidor no plano"), `origin_type`/`origin_ref` tipados (mensagem, insight, execução de rotina, projeto), histórico legível (`work_item_history` com agente, texto, hora, marca automática/ok); `projects` com `starts_at`, `ends_at`, marcos (`project_milestones`) e participantes (`project_participants`); pendências `decide` ("Para você decidir") e `next` ("Em seguida", marco que ainda não depende da pessoa) como tipos de `approvals`/marcos sem decisão; **"Agora não"** = adiar a autorização sem rejeitar (`approvals.deferred_until`, trabalho mostra "Publicação ainda não autorizada" e "Decidir agora"); status vivo do squad derivado (`GET /workspaces/{id}/squad/status`: modos e rótulos do §10.3). pgTAP + pytest; `make openapi`; relatório.

(+ bloco comum de protocolo)

---

## H1 — QA da Fase 1 (Hulk)

Você é o Hulk (QA & Validação). Fatia **H1 — QA adversária da Fase 1**. Alvo: 60 minutos. Só depois de S1f, S1g e A1b fechadas; ninguém mais no ambiente.

**PASSO 0:** `docs/DIRETRIZES_DO_DONO.md`; `docs/PLANO_DE_ACAO_FASE1.md` (critérios de pronto de cada fatia e o critério da fase); `docs/FLUXOS_DA_V46.md` (§3 jornadas e §5: é contra isso que você compara); relatórios S1a–S1g, A1f, A1a, A1b (inteiros) e `H0-relatorio.md` (método e formato).

**Alvos obrigatórios:** (1) **teste de aceite do Documento Mestre §16** em modo simulado, pelo browser: pedido → trabalho → entrega → revisão → aprovação → histórico, com crédito debitado **uma vez**; (2) idempotência: decidir duas vezes, processar o run duas vezes, retry do worker, reenfileirar; (3) isolamento das tabelas novas (memória, créditos, conversas em grupo, cartões) por API e Data API; **Realtime não vaza canal entre tenants** (cliente de Rafael no canal da Miolo); (4) owner-only em aprovações e memória; editor e viewer; (5) memória respeita confirmação: sugestão descartada não entra no contexto (ler `run_context_items`); correção gera versão nova no próximo run; (6) créditos: saldo nunca negativo, ledger imutável, falha libera, `respond` não cobra, estimativa igual ao cobrado; (7) worker: concorrência, teto por workspace, SIGTERM no meio do run; (8) web: CSP com `ws://`, cookie, `?next=`, noindex; comparação lado a lado A1f/A1b contra o protótipo (aponte diferenças não registradas); (9) nada aponta para nuvem, nenhum segredo (inclusive em `docs/parciais/**/*.txt`), só dados fictícios, pt-BR sem emoji; (10) clone limpo seguindo `SETUP_LOCAL.md` com `make up/migrate/seed/test/e2e` e o worker.

**Entregável:** `docs/parciais/H1-relatorio.md` no formato da H0 (achado → severidade 🔴/🟡/ℹ️ → cenário → correção → prova), veredito por fatia e da Fase 1, perguntas ao dono só do que nem o protótipo nem as diretrizes respondem. Não altere código de produto; provas em `docs/parciais/h1/`. Deixe o banco no seed e as portas livres.

(+ bloco comum de protocolo)
