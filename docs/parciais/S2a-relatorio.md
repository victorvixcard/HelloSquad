# S2a — Relatório (Stark)

**Fatia:** S2a, Bia e Otto completos (Fase 2). **Data:** 16/10/2026, 14:46 → 15:14.
Commits em `main`, todos com push: `a972ff1`, `3a831ce`, `33a0b3b`, `ca96004`, `cb17d52`, `4e91b9b`, `c259727`,
`f1f8044`, `57517f4`, `490c4e9` e o deste relatório (mais os autosaves `55e0d5c`, `2b6d9c8`, `d045de0`, que levaram
parte do meu trabalho em andamento). Não toquei em `apps/web/` nem em `packages/ui/` (área da A2a).

## 1. Entregue

| # | Item do briefing | O que existe agora | Onde |
|---|---|---|---|
| 0 | **H1-04 (API)**: `environment` | `ContextType` ganha `environment` (contrato e `app.create_conversation`): chave = agente do ambiente (`nexo`…`iris`), título obrigatório (o nome do ambiente, que vira o título da conversa), agente do ambiente à frente (outro agente → 422), **uma por ambiente e workspace** (201 na primeira vez, 200 depois, pelo índice único que já existia), separada da conversa direta. `ConversationDetail.opening` (só nela): **primeira fala do agente e sugestões do ambiente** como `_cx('env')`/`_cxEnvFirst`: Nexo pelas decisões pendentes ("Hoje tem uma decisão sua: …" / "Nada esperando por você agora."), Otto pela pauta do calendário ("Ainda não cuido do calendário da Miolo…" ou "A próxima publicação no calendário é …"), Íris sem números ("Ainda não tenho números da Miolo para ler…"), os outros com saudação + o que estão fazendo + "O que você precisa?"; sugestões do protótipo (Nexo, Otto, Íris) ou os três primeiros `pedidos_sugeridos` do `agent.yaml` | `…170000_environment_conversation.sql`; `conversations/opening.py`, `routes.py`, `schemas.py`; `domain.py`; `i18n/pt-BR.json` |
| 1 | **Bia 02.01 e 02.02** | Skills no modelo da 04.01 (`squad/bia/skills/02.01.md`, `02.02.md`); formato de cada entrega com Pydantic + JSON Schema em `squad/deliveries.py` (`diagnosis`: resumo, lacunas, oportunidades com prioridade, premissas, dados que faltam; `positioning`: posicionamento, diferenciais, públicos, objetivos com indicador e prazo); **fluxo roteado por `delivery_type`** (o mesmo `run_flow`: triagem → produzir → autoverificar → uma revisão → entrega; muda o formato e o contexto); documento revisável igual à 04.01 (versão, cartão, revisar/aprovar/pedir ajuste); fixtures da Miolo fictícia; Memória da Marca no prompt (a mesma recuperação da S1d) | `squad/bia/skills/`; `squad/deliveries.py`, `flow.py`, `prompt.py`; `llm/fixtures/02.01`, `02.02` |
| 2 | **Bia 02.03 e 02.04** | `marketing_plan` (horizonte, ações em ordem com porquê e responsável no squad) e `campaign_strategy` (conceito, público, mensagens-chave, período, frentes por especialista). **A 02.04 aprovada é o documento reutilizável do projeto**: a última versão aprovada do mesmo projeto (sem projeto, do workspace) entra no contexto da 04.02 e da 04.03 (`<documento_aprovado delivery="02.04">`), e a 04.03 registra qual versão seguiu (`content.estrategia`). A 02.03 lê o diagnóstico e o posicionamento aprovados; a 02.04, o posicionamento e o plano. Data de hoje no contexto das deliveries com datas | `RunStore.approved_documents`; `flow.py` (`PRIOR_DOCUMENTS`, `DATED`); `llm/fixtures/02.03`, `02.04` |
| 3 | **Bia 02.07 + `WebSearch`** | `research/websearch.py`: interface `WebSearch`; `DisabledWebSearch` (**padrão**), `MockWebSearch` (três resultados fictícios fixos, `.example`), `BraveWebSearch` (real, só com `WEB_SEARCH_PROVIDER=brave` + `WEB_SEARCH_API_KEY`; só link `http(s)`; falha → indisponível). Etapa `pesquisa.web` (ferramenta checada no `agent.yaml`, `run_step` com provedor, consulta, estado e contagem; status "Bia · pesquisando na web"). **A entrega distingue pesquisa real de sugestão**: as fontes saem da busca feita (id, título, link, trecho, data de publicação, data de coleta), nunca do modelo; achado `pesquisa` que não cita fonte coletada vira `sugestao`; busca desligada → `pesquisa.estado = indisponivel`, sem fontes, tudo sugestão, e o resumo diz isso. Sem rede nos testes | `research/`; `flow.py` (`web_research`, `research_content`); `config.py`; `worker/main.py`; `.env.example`; `llm/fixtures/02.07` |
| 4 | **Otto 04.02 e 04.03** | Tabela **`calendar_posts`** (data, horário, canal, formato, tema, responsável, estado, notas, trabalho e versão de origem; RLS forçada, leitura do membro, escrita só do worker): a 04.02 grava os posts como **rascunho** na mesma transação da versão; versão nova troca os rascunhos; **aprovar a versão põe na pauta** (`planned`, gatilho) e tira os de outra versão aprovada antes; trabalho cancelado cancela as propostas. `GET /workspaces/{id}/calendar?from&to` (até 92 dias, sem cancelados). **Post como objeto da conversa pelo id** (`calendar_post` + `id`: título e estado lidos do banco, responsável à frente); a chave continua valendo. Ferramentas `calendario.ler` e `calendario.agendar_rascunho` checadas. 04.03 `multichannel_posts`: uma versão por canal (texto, roteiro em trechos com o visual, hashtags, CTA), `pedido_para_kaia`, coerente com a 02.04 aprovada | `…165900_calendar_posts.sql`; `work/calendar.py`; `store.py` (`_calendar`, `calendar_window`); `squad/otto/skills/04.02.md`, `04.03.md`; `llm/fixtures/04.02`, `04.03` |
| 5 | **Preços, cartões, status, créditos** | Preços provisórios das 7 já estavam no seed da S1e (10, `provisional = true`): conferidos por teste. Cartão `material` (e `question` na pergunta do Nexo) igual à 04.01; `status_label` por etapa ("Bia · criando a primeira versão", "Bia · pesquisando na web", "… · aguarda sua aprovação") e frase do trabalho ("v1 aguarda sua aprovação"); reserva no início e captura na entrega (10 créditos uma vez) | sem mudança de regra; `i18n/pt-BR.json` (frases e perguntas por delivery) |
| 6 | **Testes, contrato, docs** | pytest `test_s2a_deliveries` (12), `test_environment_conversation` (3), `test_websearch` (5); pgTAP `21_environment_and_calendar` (30); `make openapi` + `pnpm --filter contracts generate` (46 → 47 operações, +3 schemas, nada removido, nenhum campo novo obrigatório); `SETUP_LOCAL.md` §"Bia e Otto (S2a)"; roteiro `docs/parciais/s2a/curl_bia_otto.sh` com a saída | `apps/backend/tests/`; `supabase/tests/database/`; `packages/contracts/`; `docs/` |

**Migrations novas:** `20261016165900_calendar_posts.sql` (tabela, RLS, gatilhos de aprovação e cancelamento) e
`20261016170000_environment_conversation.sql` (`app.create_conversation` com `environment` e `calendar_post` pelo id).
**Seed:** passa a apagar `calendar_posts` junto com o núcleo (o post sobreviveria ao trabalho apagado).

## 2. Como foi verificado (evidência)

**`make test-backend`** (ruff check + format + pytest, com o banco; `docs/parciais/s2a/make_test_backend.txt`):

```
============================= 159 passed in 29.68s =============================
backend exit=0
```

Última rodada, depois do ajuste do adaptador (`490c4e9`): ver §2.1.

**`make test-db`** (pgTAP, `docs/parciais/s2a/make_test_db.txt`):

```
/home/vitao/projetos/hellosquad/supabase/tests/database/21_environment_and_calendar.test.sql .. ok
Files=22, Tests=519,  1 wallclock secs
Result: PASS
```

O `01_rls_coverage` cobre `calendar_posts` (RLS forçada) sem ajuste. O `21` prova: RLS forçada; Marina vê só a Miolo;
Rafael (Vitta) não vê nem abre conversa sobre post da Miolo; membro não insere, altera nem apaga post (42501);
rascunho → pauta na aprovação, a versão aprovada antes sai, a Vitta não muda; trabalho cancelado cancela a proposta;
post abre conversa pelo id com o responsável à frente e reabre a mesma; a chave segue valendo; ambiente: chave = agente
à frente com o nome do ambiente, participantes certos, uma por ambiente, outro ambiente é outra conversa, a direta
continua separada, ambiente fora do squad / sem nome / outro agente à frente recusados, cada workspace com a sua,
Rafael não vê a da Miolo.

**Cada delivery ponta a ponta no modo simulado** (`tests/test_s2a_deliveries.py`): para 02.01, 02.02, 02.03, 02.04,
02.07, 04.02 e 04.03, o pedido da Marina na conversa direta vira trabalho com o agente certo; o worker entrega a v1 do
`kind` esperado (conteúdo validado pelo modelo da delivery); a mensagem do especialista traz o cartão `material` ligado
à versão e à pendência; os eventos têm "<Agente> · criando a primeira versão" e terminam em "· aguarda sua aprovação";
o trabalho mostra "v1 aguarda sua aprovação"; o crédito é o preço provisório (10, `provisional`) reservado e capturado
uma vez; a aprovação da dona deixa trabalho e versão `approved`. Mais: 02.07 sem busca (só sugestões, fontes vazias,
`pesquisa.web` registrada como `disabled`/`indisponivel`); 02.07 com a busca mock (F1–F3 `.example` com datas, três
achados de pesquisa com fonte, sugestão sem fonte, "Bia · pesquisando na web"); unitário do rebaixamento (fonte
inventada → sugestão); 04.02 grava três rascunhos, o ajuste pedido gera a v2 e troca os rascunhos, a aprovação põe
tudo em `planned`, o post abre conversa pelo id e `GET …/calendar` devolve a pauta; 02.04 aprovada → a 04.03 registra a
estratégia seguida ("Natal de forno aceso") e a 04.02 inclui o post da campanha.

```
$ uv run pytest tests/test_s2a_deliveries.py -q
............                                                             [100%]
12 passed in 5.52s
$ uv run pytest tests/test_environment_conversation.py -q
...                                                                      [100%]
3 passed in 1.23s
$ uv run pytest tests/test_websearch.py -q
.....                                                                    [100%]
5 passed in 0.01s
```

**Pela API no ar (:8100, recarregada sozinha com `API_RELOAD=true`) e o worker simulado** (`curl_bia_otto.txt`):

```
  02.01 | needs_you | v1 aguarda sua aprovação | diagnosis v1 | dados_que_faltam, lacunas, oportunidades, premissas, resumo, titulo
  02.02 | needs_you | v1 aguarda sua aprovação | positioning v1 | diferenciais, objetivos, posicionamento, premissas, publicos, resumo, titulo
  02.03 | needs_you | v1 aguarda sua aprovação | marketing_plan v1 | acoes, horizonte, premissas, resumo, titulo
  02.04 | needs_you | v1 aguarda sua aprovação | campaign_strategy v1 | conceito, mensagens_chave, periodo, premissas, prioridades, publico, resumo, titulo
  04.03 | needs_you | v1 aguarda sua aprovação | multichannel_posts v1 | estrategia, notas, objetivo, pedido_para_kaia, tema, titulo, versoes
  04.02 | needs_you | v1 aguarda sua aprovação | editorial_calendar v1 | notas, periodo, posts, titulo
{"versao": 1, "conceito": "Natal de forno aceso", "delivery_version_id": "1b57db50-…"}
    2026-10-19 09:00 instagram post otto draft · Fornada de segunda
    2026-10-21 18:00 instagram reels kaia draft · Bastidores da fermentação longa
    2026-10-23 08:00 whatsapp status otto draft · Encomendas do fim de semana
    2026-10-24 10:00 instagram carousel kaia draft · Natal de forno aceso: as encomendas abrem em novembro
  calendário (depois da aprovação): ['planned']
  pesquisa: indisponivel | fontes: 0 | achados: ['sugestao', 'sugestao']
  pesquisa: realizada mock | achados: [('pesquisa', ['F1']), ('pesquisa', ['F2']), ('pesquisa', ['F3']), ('sugestao', [])]
    F1 https://noticias-do-bairro.example/forno-do-largo-panetone publicado 2026-10-09 coletado 2026-10-16
  HTTP 201 f8b6e159-…   HTTP 200 f8b6e159-…   (conversa do ambiente da Bia, reaberta)
{"agent_id": "bia", "message": "Oi, eu sou a Bia. Aguarda a sua aprovação na v1 de “Concorrentes e tendências”. O que você precisa?", "suggestions": ["Onde a Miolo pode crescer até o Natal?", "Crie uma promoção para esta semana", "Analisar os concorrentes do bairro"]}
A próxima publicação no calendário é “Fornada de segunda”, seg, 19/10.
```

Na primeira tentativa do roteiro, o quarto pedido seguido falhou com `insufficient_credits` (a Miolo do seed tem 36
créditos; 4 × 10 = 40): é a regra da S1e funcionando, sem cobrança. O roteiro concede um bônus local de 100 pelo papel
privilegiado antes dos nove pedidos (só no banco local; `make seed` devolve).

**Contrato** (`openapi.json` antes da fatia × agora): `operações: 46 -> 47 | novas: [('get', '/workspaces/{workspace_id}/calendar')] | removidas: []`;
`schemas: 118 -> 121 | novos: ['CalendarPage', 'CalendarPost', 'ConversationOpening'] | removidos: []`; nenhum campo
removido, nenhum obrigatório novo; `ContextType` termina em `document`, `capability`, `environment`.

**`make test-web`** (`docs/parciais/s2a/make_test_web.txt`): ESLint e `tsc` de `packages/contracts`, `packages/ui` e
`apps/web` verdes com o contrato novo; contracts 9/9; o Vitest do web tem 160/172: **as 12 falhas são todas de
`test/catalog-parity.test.ts`** ("messages/en/index.ts não existe"), o teste dos catálogos en/es que a A2a está
escrevendo agora; nada ligado a esta fatia. **`make test-infra`**: guarda do autosave 8/8.

### 2.1 Última rodada do backend

Depois do `490c4e9` (link só `http(s)` e o adaptador real testado sem rede), `make test-backend` de novo:

```
tests/test_worker.py ...........                                         [100%]

============================= 164 passed in 30.59s =============================
backend exit=0
```

## 3. Decisões técnicas (não mudam o combinado)

- **Um fluxo só, roteado por `delivery_type`.** O formato da entrega e o JSON Schema de cada delivery ficam num
  registro (`squad/deliveries.py`); o fluxo da S1c continua o mesmo (a 04.01 usa o mesmo schema de antes, conferido
  por igualdade). Delivery sem formato registrado ou sem skill → `delivery_not_supported`, como antes.
- **Chaves do conteúdo em português, valores de lista fechada como ids** (canal, formato, prioridade, responsável),
  como a 04.01; o web traduz.
- **Primeira fala do ambiente calculada pela API a cada leitura** (`opening`), não gravada como mensagem: nenhuma
  função do banco aceita texto de agente vindo do usuário (`app.post_agent_message` é só do worker), e a fala fica
  sempre atual. Ver pergunta 2.
- **Estratégia como documento do projeto, não como fato da Memória**: a versão aprovada da 02.04 é lida pelo projeto
  (sem tabela nova). Virar fato exigiria a confirmação da pessoa (regra 3 do Documento Mestre) e misturaria campanha
  com marca.
- **Calendário**: post nasce rascunho (material produzido não é aprovado, §8); a aprovação da versão é o que põe na
  pauta. Aprovar não autoriza publicar (`scheduled`/`published` ficam para a Fase 3). Post fora do período pedido é
  erro de formato da etapa.
- **Busca**: consulta = tema · objetivo do briefing do Nexo; as fontes da entrega são as da busca, com data de coleta
  sempre e data de publicação quando a fonte informa; falha da busca não derruba o run.
- **Pergunta do Nexo por delivery**: o texto do campo que falta pode ser da delivery (`triage.field.02.07.tema` = "o que
  pesquisar…"), com o geral como reserva.

## 4. Onde discordei do briefing ou interpretei

| Briefing | O que fiz | Por quê |
|---|---|---|
| "grave como fato/documento reutilizável pelo projeto" (02.04) | documento: a 02.04 aprovada é lida pelo projeto (e pelo workspace, sem projeto) | fato da Memória precisa de confirmação da pessoa e é da marca, não da campanha; o documento aprovado já é a decisão dela |
| "com a primeira fala do agente do ambiente" | `opening` calculado, não mensagem gravada | segurança (nenhuma rota escreve fala de agente em nome do usuário) e fala sempre atual; o web mostra como primeira mensagem (A2b). Pergunta 2 |
| "a conversa pode abrir um post como objeto" | `calendar_post` aceita também o `id`; a chave continua | contrato da S1f não muda: só ganha o caminho pelo id |
| "implementação real atrás de env" | Brave, desligado por padrão | o catálogo deixa o fornecedor "a escolher"; Brave dá a data da página. Trocar é outro adaptador com a mesma interface. Pergunta 1 |

## 5. Perguntas ao dono (o protótipo não responde; segui a leitura mais conservadora)

1. **Fornecedor da busca web** da Bia (catálogo: Tavily, Brave ou SerpAPI). Implementei o Brave como referência,
   desligado; falta escolher e criar a chave. A busca real envia o tema do pedido ao provedor (LGPD: só o tema, nada de
   contato ou cliente).
2. **Primeira fala do ambiente**: calculada a cada abertura (hoje: sempre atual, não aparece como "última mensagem"
   na lista enquanto a pessoa não escreve) ou gravada como mensagem do agente na criação (fica no histórico e na lista,
   mas congela)? 
3. As falas do Otto e da Íris no ambiente seguem o protótipo ao pé da letra ("…no Modo Autônomo…", "…a planilha de
   encomendas…"), e o Modo Autônomo ainda não existe (Fase 3). Ficam assim até lá?
4. **Preço das sete deliveries**: seguem 10 créditos provisórios (seed da S1e). A pesquisa com busca real tem custo
   extra de API; o preço dela deve ser diferente?

## 6. O que ficou de fora

- **Telas** das entregas novas, do calendário e o "Conversar com <Nome>" no web: A2b (o contrato já tem tudo).
- **en/es** dos textos novos do backend: caem no pt-BR, como todo o catálogo do backend até a tradução.
- **Kaia**: `pedido_para_kaia` é texto; a colaboração real (etapa da Kaia, `ImageEngine`) é S2d.
- **04.02 recorrente** (pauta semanal no Modo Autônomo), publicar e agendar: Fase 3. GBP e GA4 no diagnóstico
  (quando conectados): Fase 3.
- **Editar post do calendário pela pessoa**: não pedido; hoje muda pelo pedido de ajuste da versão.
- **Consulta da busca escrita pela Bia** (em vez de tema · objetivo): fica para o modo real, com a chave da Anthropic.

## 7. Estado em que deixei a máquina

Migrations `…165900` e `…170000` aplicadas (`make migrate`); seed reaplicado no fim (`make seed`: Miolo com 36
créditos, sem os dados da demonstração). API em :8100 no mesmo processo de antes (recarregou sozinha com as rotas
novas); web em :3100 intocado; nenhum worker deixado no ar. Só os containers `supabase_*_hellosquad`.
