# S2c — Relatório (Stark)

**Fatia:** S2c, Memória camada 3: reflexão e aprendizados por cliente (Fase 2). **Data:** 16/10/2026, retomada às
16:14 (a sessão das 15:50 morreu por cota sem commitar nada; árvore limpa na retomada) → fechamento às 16:44 (30 min).
Área: `apps/backend`, `supabase/`, `squad/` (só o arquivo novo `squad/reflexao.md`; nenhuma SOUL ou skill mudou),
`packages/contracts` (gerado) e docs da fatia. Commits em `main`, todos com push: `638fac3`, `d99af6c`, `76def2f`,
`8045cd6`, `a85943c`, `0d110d4`, `136f59c`, `fd9cbbe`, `0659e0a`, `3dfcb74`, `adcda11`, o autosave `f42e64a` (levou o
adaptador de embeddings antes do meu commit), `4a37378` e o deste fechamento.

## 1. Entregue

| # | Item do briefing | O que existe agora | Onde |
|---|---|---|---|
| 1 | **Fila `memory.reflect` ao fechar o trabalho** | Gatilho em `approvals` (decisão de entrega `review`/`approve`): aprovado → `approved` ou `approved_with_edits` (houve pedido de ajuste ou nova proposta antes); recusado → `rejected_revise` ou `rejected_cancel`. Gatilho em `work_items`: cancelado por outro caminho → `cancelled` (a recusa com cancelamento não enfileira duas vezes). `app.enqueue_reflection` grava `memory_reflections` (idempotente por `approval:<id>` / `cancel:<trabalho>`) e manda para a fila pgmq **`memory_reflect`** (o `memory.reflect` da arquitetura; o pgmq não aceita ponto, a fila já existia desde a S1a) a mensagem com `work_item_id`, `outcome` e `refs`: briefing (o que a triagem extraiu, do passo `squad.delegar`), versões, correções da pessoa (notas de ajuste e recusa) e a decisão. O diff entre versões é calculado pelo reflexo e guardado em `memory_reflections.diff`. Pedir ajuste não fecha o trabalho e não enfileira | `supabase/migrations/20261016190100_agent_learnings.sql`, `…190200_reflection_briefing.sql` |
| 2 | **`agent_learnings` + worker `reflect` + promoção** | Tabela com `workspace_id`, `agent_id`, `delivery_type`, `topic`, `learning`, `evidence_refs` (lista: correção, versão, decisão, cada uma com o trabalho), `confidence`, `status` (`candidate`/`promoted`/`discarded`), `promotion_rule`, `version`/`supersedes_id`/`superseded_at`, `created_at`; RLS forçada, membro só lê, isolamento por workspace; **somente inserção com substituição** (gatilho recusa editar texto, evidência e versão; versão substituída não muda de estado). Worker: `hellosquad-worker` consome `memory_reflect` quando sobra vaga (`--drain` esvazia as duas filas); `squad/reflect.py` monta o fechamento com rótulos (`C1`… correções, `V1`… versões, `D` decisão), chama o agente que entregou com o modelo dele (`squad/reflexao.md` no lugar da skill; simulado: `fixtures/<delivery>/<agente>.reflect.json`; real: o mesmo `LLMClient`), **confere a evidência no backend** (rótulo inexistente sai; aprendizado sem evidência não é gravado; "correção explícita" só vale citando uma correção da pessoa com texto) e grava por `app.record_learning`. Promoção automática: correção explícita com confiança ≥ `LEARNING_PROMOTION_CONFIDENCE` (0,7) → promovido; a mesma lição em `LEARNING_PROMOTION_REPEATS` (2) trabalhos → promovido (Arquitetura §5.3); senão candidato. Rotas do owner: `GET /workspaces/{id}/memory/learnings` (filtros `status`, `agent_id`, `delivery_type`; versão em vigor; `stale`) e `POST /memory/learnings/{id}/decision` com `promote`, `discard`, `keep` ("continua valendo"), idempotentes, auditadas (`memory.learning_*`) | `…190100`; `squad/reflect.py`, `worker/main.py`, `memory/learnings.py`, `squad/reflexao.md`, `squad/loader.py`, `domain.py`, `config.py` |
| 3 | **Recuperação com orçamento (§5.4)** | Ordem do contexto do run de delivery: essenciais da Memória da Marca → **aprendizados promovidos do agente com este cliente** (mesma delivery primeiro, motivo `delivery`; depois os que a busca textual acha nas outras deliveries do agente, motivo `search`; até `LEARNING_TOP_K` = 5; no mesmo teto `MEMORY_CONTEXT_TOKENS`) → fatos da busca → histórico do objeto (as últimas `WORKER_HISTORY_MESSAGES`, como já era) → pedido. Busca no idioma do workspace (`app.memory_search_config`, com `unaccent`); embeddings atrás de adaptador e **desligados** (`EMBEDDINGS_PROVIDER=disabled`, qualquer outro valor é recusado: fornecedor não decidido, ADR-0009). No prompt: bloco `<aprendizados>` com `<aprendizado agente delivery assunto [revisar="sim"]>`. `run_context_items` ganha `kind = learning`, `learning_id` e o motivo `delivery` | `…190000_run_context_learning_kind.sql`, `…190100`; `squad/memory.py`, `store.py`, `prompt.py`, `flow.py`; `memory/embeddings.py` |
| 4 | **Teste do critério da fase** | `test_learnings.py`: Marina pede a legenda do pão de abóbora (04.01), o Otto entrega a v1 ("Promoção imperdível… Vocês vão adorar…"), Marina pede ajuste com "Nunca use 'promoção imperdível'; chame o cliente de 'você'.", a v2 sai sem a expressão e falando com você, Marina aprova; a fila recebe `approved_with_edits` com as referências; a reflexão grava **Vocabulário** e **Tratamento** promovidos (`explicit_correction`) e **Abertura** candidata (confiança 0,4; o rótulo inventado `X9` sai; o aprendizado só com evidência inventada não é gravado); o pedido seguinte de 04.01 da Miolo entra com os dois no contexto (`run_context_items`: Tratamento e Vocabulário, motivo `delivery`), cai no caso `abobora_com_aprendizado` da fixture e a v1 nova não tem "imperdível" nem "vocês"; aprovada sem ajuste, a mesma "Abertura" num segundo trabalho vira promovida por repetição (versão 2). **Isolamento:** a Vitta pede o mesmo, não recebe nenhum aprendizado (0 itens de contexto, fixture sem aprendizado, texto com "Promoção imperdível"), a lista dela é vazia e o Rafael recebe 404 na lista da Miolo | `apps/backend/tests/test_learnings.py`; fixtures `04.01/nexo.triage.json`, `otto.produce.json`, `otto.reflect.json` |
| 5 | **Primeira fala do Nexo no negócio novo** | `POST /workspaces` (na mesma transação) abre a conversa direta **"Boas-vindas"** com o Nexo e grava a fala dele como mensagem de agente por `app.start_welcome`: "Oi, {nome}. Eu sou o Nexo e coordeno o squad de {negócio}. Você pode pedir qualquer coisa por aqui ou falar direto com um especialista. Para começar: qual é o objetivo mais importante de {negócio} agora?", no idioma do negócio, pelo catálogo do backend (`i18n/pt-BR.json`, `en.json`, `es.json` novos; en/es alinhados aos textos que o web já usa). `WorkspaceCreate` aceita `locale` opcional (sem ele, pt-BR como antes). A função só funciona na transação que criou o negócio (fora dela, ninguém escreve como o Nexo, nem pela Data API). **A2a §5 item 4:** `POST /workspaces/{id}/memory/facts` aceita `kind: "objective"`: a API nomeia assunto e chave no idioma do negócio ("Objetivos" · "Objetivo atual"; "Goals" · "Current goal"; "Objetivos" · "Objetivo actual") e o Nexo responde nas boas-vindas como a V4.6 ("Anotei na Memória da Marca: “…”. Já dá para pedir a primeira entrega.") | `…190300_welcome_conversation.sql`; `identity/routes.py`, `identity/schemas.py`, `memory/routes.py`, `memory/schemas.py`, `i18n/` |
| 6 | **Testes, contrato, docs** | pgTAP `23_agent_learnings` (39); pytest `test_learnings` (4), `test_welcome` (3), `test_embeddings` (1), `test_memory_api` (espelho dos 3 enums novos) e `test_identity_api` (a criação agora audita também a conversa de boas-vindas); `make openapi` + `pnpm --filter contracts generate` (51 → 53 operações, nada removido, campos novos opcionais); `SETUP_LOCAL.md` §"Aprendizados por cliente e boas-vindas do Nexo (S2c)"; `.env.example`; roteiro `docs/parciais/s2c/curl_aprendizado.sh` com a saída | — |

## 2. Como foi verificado (evidência)

**Suítes** (16/10, 16:37–16:39; saídas em `/tmp/s2c_*.txt`, só o `tail` lido):

```
make test-backend   → All checks passed! (ruff) · 66 files already formatted
                      ============================= 192 passed in 42.68s =============================   (era 185)
make test-db        → …/23_agent_learnings.test.sql ............ ok
                      All tests successful.  Files=24, Tests=593   Result: PASS                         (era 554)
make test-web       → packages/ui Tests 49 passed (49) · apps/web Tests 181 passed (181) · EXIT 0      (lint + tipos + Vitest, com o contrato novo)
```

Depois dessas rodadas entraram `test_embeddings` (1) e o caso do cancelamento sem recusa em `test_learnings`; a rodada
final (193/193) e o e2e (13/13) estão no §8.

**Ponta a ponta contra a API no ar (8100) com o worker real em `--drain`** (`docs/parciais/s2c/curl_aprendizado.txt`, trechos):

```
== 1. Marina pede a legenda do pão de abóbora; o Otto entrega a v1
  v1 | needs_you | Promoção imperdível: pão de abóbora saindo do forno. / Vocês vão adorar a casca dourada e o miolo macio. / Passem na Miolo e garantam o de vocês.
== 2. Marina pede ajuste com uma correção concreta; nada entra na fila de reflexão (ajuste não fecha)
  reflexões na fila: 0
  v2 | needs_you | Pão de abóbora saindo do forno, com casca dourada e miolo macio. / Você sente o perfume da fermentação natural já na porta. / Passe na Miolo e leve o seu.
== 3. Marina aprova a v2: o trabalho fecha e a fila memory_reflect recebe o fechamento
  desfecho: approved_with_edits | versões: 2 | correção: Nunca use 'promoção imperdível'; chame o cliente de 'você'.
== 4. O worker reflete: aprendizados do Otto com a Miolo (versão em vigor)
  … reflexão … do trabalho …: 3 aprendizado(s) gravado(s)
  Tratamento   promoted  explicit_correction  Chamar o cliente de “você”, no singular, nunca de “vocês”.
  Vocabulário  promoted  explicit_correction  Nunca usar a expressão “promoção imperdível” nas legendas.
  Abertura     candidate -                    Abrir a legenda pelo produto, não pela oferta.
== 5. Próximo pedido de 04.01 da Miolo: o aprendizado entra no contexto e a entrega o respeita
  v1 | needs_you | Sexta tem pão de abóbora quentinho saindo do forno. / Você vai sentir a casca dourada e o miolo macio. / Passe na Miolo e leve o seu.
  run_context_items: Tratamento (delivery, 46 tokens), Vocabulário (delivery, 46 tokens)
== 6. Isolamento: a Vitta pede o mesmo e não recebe nada da Miolo
  v1 | needs_you | Promoção imperdível: pão de abóbora saindo do forno. / Vocês vão adorar …
  aprendizados no contexto da Vitta: 0
  GET learnings da Miolo pelo Rafael: 404
== 7. Pedro cria um negócio em espanhol: conversa de boas-vindas com a primeira fala do Nexo
  conversa: Bienvenida
  nexo: Hola, Pedro. Soy Nexo y coordino el squad de Panadería Pedro. Puedes pedir cualquier cosa por aquí o hablar directo con un especialista. Para empezar: ¿cuál es el objetivo más importante de Panadería Pedro ahora?
  objetivo guardado: Objetivos · Objetivo actual = Conseguir más pedidos (confirmed)
  nexo: Anotado en la Memoria de Marca: “Conseguir más pedidos”. Ya puedes pedir la primera entrega.
== 8. make seed (banco local de volta ao estado do seed)
```

**O que os testes novos provam**

| Teste | Cobre |
|---|---|
| `test_marina_correction_is_applied_in_the_next_otto_delivery` | o critério da fase inteiro (§1 item 4): fila com desfecho e referências (também a mensagem em `pgmq.q_memory_reflect`), diff `-versoes[0].texto: Promoção imperdível…`, modelo do agente na reflexão, promoção por correção explícita, candidato por confiança baixa, evidência inventada descartada, contexto do próximo run, texto que respeita, promoção por repetição (versão 2 substitui a 1), isolamento da Vitta na API, no contexto e no texto |
| `test_owner_promotes_discards_and_keeps_learnings` | lista com filtros; `keep` em candidato → 409; promover (regra `owner`), repetir devolve o mesmo `decided_at`; `keep` renova `reviewed_at`; descartar; 3 eventos de auditoria; descartado sai do contexto do run seguinte e o promovido pelo owner entra; Carla (de fora) → 404; ação desconhecida → 422 |
| `test_rejection_and_cancellation_feed_the_reflection_queue` | recusa com nova proposta → `rejected_revise`; recusa com cancelamento → `rejected_cancel` uma vez só e nenhum run novo do agente; cancelamento sem recusa → `cancelled` (`cancel:<trabalho>`) |
| `test_diff_and_evidence_labels` | linhas do diff; rótulos sem caixa, inexistentes fora, "explícita" só com correção que tem texto |
| `test_welcome.py` (3) | boas-vindas em pt-BR (sem `locale`), en e es com título, autor Nexo, sem run, texto exato; objetivo nomeado em en e a resposta do Nexo; `kind: objective` fora de Meu negócio → 422; conhecimento comum não aciona o Nexo; repetir `start_welcome` na transação devolve a mesma conversa |
| `test_embeddings.py` | adaptador desligado por padrão; `embed` recusa; fornecedor desconhecido recusado no código e na configuração |
| pgTAP `23_agent_learnings` (39) | RLS forçada e só leitura nas duas tabelas; funções internas fora do alcance de `authenticated`; decisão repetida não duplica a reflexão; referências e mensagem na fila; regras de promoção e substituição (mesma evidência não cria versão, repetição promove, palpite não derruba correção, correção nova substitui, descartado não volta); imutabilidade até para o papel privilegiado; isolamento Marina/Rafael/Pedro; editor recebe 42501; `keep` só em promovido; idempotência; `run_context_items` com aprendizado; ninguém fala como o Nexo depois da criação (55000), nem anota objetivo antigo; editor não abre boas-vindas |

## 3. Decisões técnicas (não mudam o combinado)

- **A reflexão não é um run do agente.** A S1a deixou `run_kind = 'reflection'` apontando para `memory_reflect`; usar `runs` mudaria o que já está combinado e testado: o Otto apareceria "trabalhando" no status do squad (S1g), a reflexão entraria na lista de runs do trabalho, contaria no teto de 3 por workspace e quebraria "rejeitar e cancelar: nenhum run novo". A reflexão vive em `memory_reflections`, com tentativas, modelo, tokens e custo próprios (auditável como pede a §5.3). O valor de enum fica reservado, sem uso.
- **Fila `memory_reflect`**: é a da S1a (pgmq aceita só letras, números e sublinhado).
- **Briefing nas referências**: o que a triagem do Nexo extraiu (passo `squad.delegar` do run mais recente); sem triagem, o briefing do trabalho.
- **Evidência conferida no backend**, como a S2b faz com números: o modelo cita rótulos; o backend resolve para ids e notas e decide se é correção explícita.
- **Substituição**: mesmo assunto (sem caixa e espaço extra) e mesma lição acumulam evidência numa versão nova; mesmo assunto e lição nova substituem; um candidato do agente não derruba um promovido (a correção da pessoa vale mais que um palpite); descartado não volta com a mesma lição. Um assunto em vigor por agente e delivery (índice único parcial).
- **Orçamento**: aprendizados e fatos da busca dividem o mesmo `MEMORY_CONTEXT_TOKENS`; os aprendizados vêm antes da busca de fatos (são da mesma delivery). O Nexo vê o bloco `<aprendizados>` na triagem (o mesmo turno de contexto); a resposta solta na conversa (`run_reply`) continua só com a Memória da Marca.
- **Boas-vindas sem run**: é texto do catálogo, não do modelo; a guarda `created_at = now()` impede escrever como o Nexo fora da criação do negócio. Idempotente por índice único (`conversations.welcome`).
- **Catálogos en/es do backend** só com as falas novas; o resto cai no pt-BR (como antes, ADR-0010).
- **Fixtures**: os casos novos da 04.01 (pão de abóbora) entram depois do primeiro caso, para não mudar o índice que o `test_worker` lê.

## 4. Onde discordei do briefing ou interpretei

| Ponto | Combinado / briefing | O que fiz | Por quê |
|---|---|---|---|
| Promoção por correção explícita | Briefing: "correção explícita da pessoa → promovido". Arquitetura §5.3: "quando confirmado pelo usuário **ou** quando a mesma evidência se repete em N entregas". Protótipo (jornada 4, FLUXOS §3.4): o ajuste pedido à Kaia vira **sugestão** na Memória da Marca e "não vira regra sozinho" | Segui o briefing e li a correção com as palavras da pessoa como a confirmação dela (§5.3); implementei também a regra de repetição. Aprendizado da camada 3 **não** vira conhecimento da Memória da Marca nem sugestão "<Agente> percebeu" | O critério da fase exige a correção aplicada na entrega seguinte sem passo extra. A jornada 4 é da camada 1 (regra da marca); a camada 3 não aparece no protótipo. Pergunta 1 abaixo |
| "Aprovado com edições" | Arquitetura §5.3 | `approved_with_edits` = aprovado depois de pedido de ajuste ou nova proposta | Nenhuma rota deixa a pessoa editar a versão (`created_by_type = user` não é usado) |
| "Continua valendo" para aprendizado | Briefing pede a rota; o protótipo só tem "Continua valendo" para conhecimento Desatualizado | Renova a revisão (`reviewed_at`); promovido sem isso há `LEARNING_REVIEW_DAYS` (90) entra marcado `revisar="sim"` e sai com `stale: true` na lista. Só vale para promovido (409) | Documento Mestre §9: "contexto obsoleto não pode continuar orientando o produto silenciosamente". Pergunta 3 |
| Histórico "resumido" (§5.4 item 3) | Arquitetura: resumido se longo | Mantive o que já existia: as últimas `WORKER_HISTORY_MESSAGES` mensagens, sem resumo por modelo | Resumo por modelo custa uma chamada por run; fica para quando houver conversa longa de verdade |
| Texto das boas-vindas | V4.6: "…coordeno o squad da Miolo…" | "…squad **de** {negócio}…" em pt-BR | É a forma que o web (A2a) já usa no catálogo para qualquer nome de negócio; "da" só vale para nome feminino |

## 5. Perguntas ao dono (o protótipo não responde; segui a leitura mais literal do briefing)

1. **Correção vira orientação sem clique?** Hoje a correção explícita da pessoa (ex.: "nunca use 'promoção imperdível'") passa a valer para o agente naquela delivery na entrega seguinte, sem pedir confirmação; o resto fica candidato até o owner promover. Prefere que até a correção explícita espere um "Confirmar" (como a jornada 4 faz com a Memória da Marca)? Isso adiaria o critério da fase por um clique.
2. **Onde a pessoa vê os aprendizados?** O protótipo não tem tela para a camada 3. A API está pronta (listar, promover, descartar, continua valendo). Sugestão para o Diogo: dentro de "Conhecimento e aprendizados" da Memória, ou no ambiente de cada especialista ("O que o Otto aprendeu com a Miolo").
3. **Validade de um aprendizado**: 90 dias sem "continua valendo" para ser marcado para revisão é um valor provisório (configurável). Qual prazo faz sentido?
4. **Escolhas de objetivo na boas-vindas**: a API manda só a fala; as três escolhas ("Vender mais encomendas"…) continuam no web (A2a §4 item 3: as mesmas para todo negócio).
5. **Embeddings** (ADR-0009): o adaptador existe e está desligado; a busca por significado entra quando o fornecedor for escolhido (modelo aberto no worker ou API paga).

## 6. O que ficou de fora

- **Tela** dos aprendizados e o `locale` no "Criar negócio" do web (A2b ou fatia do Aranha; a API aceita os dois).
- **Busca híbrida** com pgvector: sem fornecedor de embeddings não há vetor; o adaptador desligado é a costura (ADR-0009).
- **Realtime** de aprendizado novo (nenhuma tela escuta ainda); os eventos estão em `audit_events` (`memory.learning_*`).
- **Resumo do histórico por modelo** (§4).
- **e2e no diretório do repositório**: ver §7.

## 7. Incidente: web do dono fora do ar por ~4 minutos (16:39 → 16:43)

O `make e2e` roda `pnpm --filter web build`, que escreve em `apps/web/.next`, o mesmo diretório do `next dev` do dono em
:3100. O build apagou os arquivos de desenvolvimento e o web passou a responder 500 (log
`/tmp/hellosquad-dev-web.log`: `ENOENT … .next/static/development/_buildManifest.js.tmp…`). Restaurei do mesmo jeito que
estava: parei a árvore do `make dev-web` (já quebrada), limpei `apps/web/.next` e subi `make dev-web` de novo em segundo
plano, com a saída no mesmo log; `/entrar` e `/` voltaram a 200 às 16:43. O e2e foi rodado num worktree separado em
`/tmp/hs-e2e` (o `.next` dele é outro), com o web na porta 3199 e a API do dono reaproveitada (resultado no §8).
**Recomendação para o Thor/Jarvis:** o `make e2e` não pode rodar no mesmo checkout com o `make dev-web` no ar; ou o e2e
usa um `distDir` próprio, ou roda em worktree/clone, como fiz.

## 8. Estado em que deixei a máquina

**Rodada final** (16:42–16:43):

```
make test-backend                       → All checks passed! · 92 files already formatted
                                          ============================= 193 passed in 41.50s =============================
e2e (worktree /tmp/hs-e2e, web :3199)   → ✓ 10 … Pedro entra sem negócio, cria o negócio e faz o onboarding inteiro em pt-BR até o primeiro pedido ao Nexo (4.0s)
                                          13 passed (22.7s) · EXIT 0
make test-db (16:38, sem mudança de banco depois) → Files=24, Tests=593  Result: PASS
make test-web (16:38)                   → apps/web Tests 181 passed (181) · EXIT 0
```

- Banco no estado do seed: 0 reflexões, 0 aprendizados, filas `memory_reflect` e `runs_interactive` vazias, nenhuma
  conversa de boas-vindas (os negócios do seed são "conta em uso"; a boas-vindas nasce só em negócio novo).
- Migrations novas aplicadas por `make migrate` sobre o banco em uso (sem `db reset`): `20261016190000`, `…190100`,
  `…190200`, `…190300`.
- API (:8100) no ar desde 13:55, recarregou sozinha com as rotas novas (53 operações no `/openapi.json`); não reiniciei.
- Web (:3100) no ar, reiniciado por mim às 16:43 depois do incidente do §7 (`make dev-web`, saída em
  `/tmp/hellosquad-dev-web.log`), respondendo 200.
- Nenhum `hellosquad-worker` rodando; worktree `/tmp/hs-e2e` removido (com a cópia do `.env`).
- `docs/parciais/A2b-progresso.md` está solto no disco e não é meu (A2b do Aranha); não commitei.
