# S1d — Relatório (Stark)

**Fatia:** S1d, Memória da Marca camadas 1 e 2 (Fase 1). **Data:** 16/10/2026, 09:16 → 09:45.
Commits em `main`, todos com push: `678ae53`, `fe11f71`, `6c2b128`, `041ea2a`, `3b09ba3`, `d3e3d0b`, `b209ce2` e o
deste relatório. Não toquei em `apps/web/`, `packages/ui/` nem `design/` (o que mudou lá no disco é da A1f e da SA0).
Não reiniciei a API em :8100 (outra sessão a subiu às 09:34, com reload; as rotas novas já respondem nela).

**Especificação seguida:** `FLUXOS_DA_V46.md` §6 e §8 (rótulos `AREA5`, `KST5`, `SRCST5`), §2.5, §3.4, §9 e §10.3,
Arquitetura §5 e ADR-0009. A diretriz do dono registrada como 16/10 10:20 ("Segue todas as regras do protótipo sempre") chegou
durante a fatia e decidiu dois pontos em que o briefing e o protótipo divergiam (§5).

## 1. O que mudou

| # | Onde | Conteúdo |
|---|---|---|
| 1 | `supabase/migrations/20261016122000_brand_memory.sql` | 9 enums; 5 tabelas com `workspace_id`, FK composta `(workspace_id, id)`, RLS habilitada e forçada, `authenticated` só com SELECT: **`brand_facts`** (área, assunto, chave, `content` + `content_json`, estado, `source_type` + `source_id`, `origin`, `used_by_agents text[]`, `perceived_by_agent_id`, `confidence`, `valid_from`/`valid_until`, `version`, `supersedes_id`, `superseded_at`, `confirmed_by`/`confirmed_at`; `search_vector` gerado com pesos chave › valor › assunto na configuração do idioma do workspace, GIN; trigger recusa UPDATE de conteúdo e qualquer mudança em versão substituída), **`fact_sources`** (tipo, nome, estado, permissões em texto, `last_sync_at`), **`memory_suggestions`** (agente, leitura, explicação, pergunta, origem, área/assunto/chave/conteúdo propostos, quem vai usar, fonte, `run_id`, estado, decisão, conhecimento resultante), **`memory_conflicts`** (dois conhecimentos, resolução, resultado; um conflito aberto por par), **`run_context_items`** (run, fato ou sugestão, motivo `essential`/`search`, relevância, tokens). Funções do owner (SECURITY DEFINER, `42501` "Só o dono da conta toma esta decisão."): `confirm_suggestion`, `correct_suggestion(texto)`, `discard_suggestion`, `correct_fact`, `resolve_conflict`, `mark_fact_outdated`. Agente: `app.suggest_memory` (só o papel privilegiado). Realtime `memory_suggestion.created` e `.decided` no canal `workspace:<id>`. Auditoria em `audit_events` (`memory.*`). |
| 2 | `…124500_memory_correction_source.sql` | Correção do dono conta na fonte "Declarado por você" (o protótipo descreve essa fonte como "Cadastro … e correções nas conversas"). |
| 3 | `apps/backend/src/hellosquad/memory/` (rotas e schemas), `domain.py`, `i18n/pt-BR.json`, `api/main.py` | 9 rotas (§4 do SETUP): dossiê, sugestões, decisão, correção, histórico, busca, fontes, conflitos e resolução. Erros pela tabela da S1b (`P0002`→404, `42501`→403, `22023`/validação→422, `55000`→409). Enums espelhados no `domain.py` e conferidos com `enum_range`. Rótulos exatos da V4.6 no catálogo (`memory.*`). `make openapi`: +9 rotas, +26 schemas, nada removido; `pnpm --filter contracts generate`. |
| 4 | `squad/memory.py`, `prompt.py`, `store.py`, `flow.py`, `schemas.py`, `worker/main.py`, `config.py`, fixture `otto.produce.json`, `.env.example` | O bloco do workspace deixa de ser fixo (§3). `ProductionResult.observacoes` (leitura, explicação, área, assunto, chave) no schema de saída; a fixture da 04.01 traz "Posts com bastidores do forno têm mais salvamentos"; o worker grava cada observação com `app.suggest_memory` na mesma transação da entrega (sugestão "Otto percebeu", evento `memory.suggested`), nunca um conhecimento. `MEMORY_CONTEXT_TOKENS` (padrão 1.500). |
| 5 | `supabase/seed.sql` | Miolo: fontes "Onboarding e o que você contou" (Declarado por você, 01/10) e Instagram (Não conectada, "Ler posts e métricas", "Publicar só com sua autorização"); 5 "Confirmado" de `DADOS_FICTICIOS.md`; a "Decisão sua" "Não usar a palavra 'artesanal' nas legendas" (Minha marca › Tom de voz › "Palavra proibida"); a sugestão aberta do Otto. Vitta e Trilha vazias. Idempotente (ids e horários fixos). |
| 6 | Testes | pgTAP `16_brand_memory` (39); pytest `test_memory_api` (10) e `test_memory_runtime` (4); `test_squad_prompt` atualizado. |
| 7 | `docs/SETUP_LOCAL.md` | Seção "Memória da Marca (S1d)" com curls do dossiê, busca, decisão repetida, correção, histórico, fontes e conflitos, executados contra a API (saída em `docs/parciais/s1d/curl_memoria.txt`). |

**Mapeamento rótulo da V4.6 ↔ valor no código** (rótulo exato no catálogo `i18n/pt-BR.json`):

| Objeto | V4.6 (chave do protótipo) → valor |
|---|---|
| Área (`AREA5`) | "Meu negócio" (`neg`) → `business` · "Minha marca" (`marca`) → `brand` · "Meu público" (`pub`) → `audience` · "Conhecimento e aprendizados" (`con`) → `knowledge` |
| Estado do conhecimento (`KST5`) | "Confirmado" (`ok`) → `confirmed` · "Decisão sua" (`dec`) → `decision` · "Da fonte" (`src`) → `from_source` · "Observado" (`learn`) → `observed` · "Sugerido" (`hypo`) → `suggested` · "Desatualizado" (`old`) → `outdated` · "Descartado" (`rej`) → `discarded` · "Em conflito" (`conf`) → `conflicting` · "Não usado" (`off`) → `unused` |
| Estado da fonte (`SRCST5`) | "Declarado por você" (`decl`) → `declared` · "Conectada" (`ok`) → `connected` · "Desatualizada" (`old`) → `outdated` · "Precisa reconectar" (`exp`) → `needs_reconnect` · "Não conectada" (`off`) → `not_connected` · "Indisponível" (`na`) → `unavailable` |
| "<Agente> percebeu" | aberto → `open` · visto → `seen` · feito → `done`; "Confirmar" → `confirm` · "Corrigir" → `correct` · "Descartar" → `discard` |
| Conflito | "Vale este" → `keep_a`/`keep_b` · "Nenhum dos dois: corrigir" → `corrected` |

## 2. Como foi verificado

**Do zero ao teste:** `make up && make migrate && make seed && make test` (16/10, 09:42), **exit 0**, log filtrado
em `docs/parciais/s1d/make_test.txt` (128 linhas; tirei só a linha do `supabase start` com as chaves locais). Trechos:

```
{"applied":[],"message":"Migrations applied"}
seed aplicado: ../../supabase/seed.sql
All checks passed!                                    (ruff)
61 files already formatted
============================= 105 passed in 13.38s ==== (pytest; era 91)
packages/contracts test:       Tests  9 passed (9)
packages/ui test:       Tests  49 passed (49)
apps/web test:       Tests  37 passed (37)
…/16_brand_memory.test.sql ........... ok
Files=17, Tests=309 …                                 (pgTAP; era 270)
Result: PASS
```

As duas migrations entraram por `make migrate` sobre o banco em uso (`Applying migration 20261016122000_brand_memory.sql`,
depois `…124500_memory_correction_source.sql`); não rodei `supabase db reset`. **Estado final:** banco no seed
(Miolo 6 conhecimentos, 1 sugestão aberta, 2 fontes, 0 itens de contexto; Vitta e Trilha 0) e nenhum
`hellosquad-worker` rodando (os testes rodam o worker no processo e o seed é reaplicado ao fim de cada um).

**O que os testes novos provam**

| Teste | Cobre |
|---|---|
| `test_corrected_preference_reaches_the_next_run` | Marina corrige o tom pela API → o run seguinte (simulado) recebe no system `<fato estado="Confirmado" assunto="Tom de voz">Tom de voz: Acolhedor, direto e com humor leve</fato>`, não recebe o texto antigo, recebe a decisão do 'artesanal'; `run_context_items` tem a versão nova (`essential`) e não tem a antiga |
| `test_search_fills_the_budget_and_skips_what_is_not_in_use` | busca pelo pedido traz "Produto âncora" e um "Da fonte" em `<memoria_relevante>`; Descartado e Em conflito ficam de fora; com orçamento 0 só os 4 essenciais entram |
| `test_production_observation_becomes_an_otto_suggestion` | `observacoes` da produção vira sugestão do Otto (`open`, `run_id` do run) e evento `memory.suggested`; nenhum conhecimento com esse texto |
| `test_discarded_suggestion_stays_out_of_context_and_does_not_return` | sugestão descartada não aparece em nenhum prompt, não vira conhecimento e o Otto percebendo de novo não cria outra |
| `test_dossier_groups_by_area_and_topic` | dossiê por área e assunto na ordem da V4.6, 6 confirmados, pendências, fontes com contagem e permissões, "O squad percebeu" |
| `test_text_search_finds_the_forbidden_word` | "palavra proibida", "palavras proibidas", "tom" e "artesanal" acham a decisão; "bicicleta" não acha nada |
| `test_confirming_is_idempotent_and_creates_one_fact` · `test_decision_payload_errors` | confirmar duas vezes (e descartar depois) responde 200 com o mesmo estado, um conhecimento e uma auditoria; corrigir sem texto, texto fora de corrigir e decisão desconhecida → 422 |
| `test_only_the_owner_decides_on_memory` | Carla (editor) recebe 403 "Só o dono da conta toma esta decisão." e a sugestão continua aberta; Carla lê; Rafael (owner) corrige |
| `test_correcting_a_fact_creates_a_version_and_keeps_history` | v2 Confirmado que substitui a v1, na fonte declarada; repetir o mesmo texto devolve a v2; outro texto sobre a v1 → 409; histórico com as duas; UPDATE de conteúdo recusado até para o papel privilegiado |
| `test_memory_is_isolated_by_workspace` · `test_conflict_stops_both_versions_until_the_owner_decides` | Pedro e Marina fora do workspace → 404 em todas as rotas; "Da fonte" contraditório põe as duas versões Em conflito; "Vale este" resolve e a outra vira Descartado; repetir devolve o mesmo |
| pgTAP `16_brand_memory` (39) | RLS forçada e só SELECT nas 5 tabelas; `suggest_memory` fora do alcance de `authenticated`; sugestão não é conhecimento e não duplica; isolamento Marina/Rafael/Pedro; Carla não confirma, descarta, corrige nem marca desatualizado; confirmação idempotente; descartada não volta; versão, histórico e imutabilidade; desatualizado idempotente; conflito; busca em português; FK do contexto entre workspaces; Realtime criada e decidida. A varredura de RLS (`01_rls_coverage`) segue verde |

## 3. Como o runtime monta o contexto

`squad/memory.py`, chamado no começo do run (`store.recall_memory`), numa transação com o registro em `run_context_items`:

1. **Essenciais, sempre**, no bloco do workspace (cacheado): "Decisão sua" de qualquer área e "Confirmado" de Minha marca e Meu público (tom, público, canais, decisões).
2. **Busca** com o texto do pedido, o título do trabalho, o briefing e o título da skill (radicais do idioma do workspace, consulta OR ordenada por `ts_rank_cd`), até completar `MEMORY_CONTEXT_TOKENS` (tokens estimados a 3 caracteres; os essenciais contam no teto), no turno do usuário em `<memoria_relevante>`.
3. **Estados**, pela coluna "O squad usa?" do `KST5`: Confirmado e Decisão sua orientam (essenciais e busca); Da fonte, Observado e Desatualizado entram só pela busca, cada fato marcado no prompt com o rótulo do estado (no protótipo: "em uso, sem confirmação sua", "usado como contexto, não como regra", "o squad avisa quando usar"); Sugerido, Em conflito, Descartado e Não usado nunca entram.

## 4. Decisões técnicas (não mudam a experiência)

- **Sugestão não é conhecimento** (Arquitetura §5.2): mora em `memory_suggestions` até Confirmar ou Corrigir; Descartar não cria conhecimento e fica registrado. Se o mesmo assunto e chave já está em uso, a sugestão aceita vira a versão nova dele (o squad não segue duas orientações sobre a mesma coisa).
- **Idempotência** igual à de `app.decide_approval`: a primeira decisão vale; repetir devolve o estado atual, sem erro. "Não volta" compara o texto sem caixa e sem espaço extra.
- **Conflito** nasce quando o agente grava "Da fonte" com a mesma área, assunto e chave de um conhecimento em uso e outro valor; resolver com "Vale este" confirma a versão e a outra vira "Descartado".
- **Assunto** é texto no idioma do workspace (como no protótipo); a área é enum.
- "Recusar" do Início apaga a sugestão no protótipo e "Descartar" da Memória guarda (`FLUXOS` §11, decisão técnica): o banco sempre guarda.
- Rótulos no catálogo do backend; a API devolve os valores e a interface traduz pelo catálogo dela.

## 5. Onde discordei do briefing (resolvido pela diretriz do dono registrada como 16/10 10:20)

| Briefing | Protótipo (V4.6) | O que fiz |
|---|---|---|
| Três áreas: "Meu negócio", "Minha marca", "Conhecimento" (vem do resumo da §10.3, com os nomes das abas da V3) | `AREA5` (camada V4.5, a que vale): "Meu negócio", "Minha marca", "Meu público", "Conhecimento e aprendizados" | Quatro áreas com os rótulos da V4.6. "Público" e "Canais" do seed ficam em Meu público |
| Contexto do run: só fatos confirmados; "nunca … Desatualizado" | `KST5`: Da fonte "sim, sem confirmação", Observado "só como contexto", Desatualizado "com aviso" | Segui o `KST5` (§3, item 3). Os essenciais continuam só Confirmado e Decisão sua |

Se o Thor ou o Vic preferirem a leitura do briefing, são duas linhas em `squad/memory.py` (estados da busca) e um valor de enum a menos.

## 6. Perguntas ao dono

Nenhuma nova. O que ficou aberto aqui o protótipo já responde (vai como pendência) ou já está na §11 do
`FLUXOS_DA_V46.md` (o que admin, editor e viewer veem na Memória: item 1).

## 7. Pendências

- **Ações do protótipo fora do briefing desta fatia:** "Não usar mais" e "Voltar a usar", "Confirmar" de um "Da fonte" ou "Observado", "Continua valendo" do desatualizado, "Adicionar conhecimento" (entra como declarado e confirmado), marcar a sugestão como vista (aberto → visto), "Alterações recentes" (os eventos `memory.*` já estão em `audit_events`), "como cada agente usa" (`how`) e a escolha de quem usa. O banco já tem os estados; faltam funções e rotas.
- **Dossiê:** descrição do negócio e a síntese do squad (`SUM5`) não têm onde morar (o plano citava `brand_profiles`, que o briefing não pediu).
- **Busca:** a configuração `portuguese` não ignora acento ("decisao" não acha "decisão"); proposta para quando o Thor quiser: configuração com `unaccent`. Sugestões abertas não entram na busca.
- **Camada 3** (reflexão por entrega, `memory.reflect`) e embeddings (ADR-0009, Fase 2) seguem fora.
- **A1b:** os rótulos da tabela do §1 precisam ir para o catálogo do web; o Realtime `memory_suggestion.*` chega no mesmo canal das aprovações.
- O `pt-BR.json` foi regravado com `json.dumps`: uma linha antiga ganhou só um espaço depois dos dois-pontos.
