# S1e — Relatório (Stark)

**Fatia:** créditos da Fase 1: contas, grants, reservas, extrato somente inserção, preços versionados
provisórios, reserva/captura/liberação no worker, saldo em `GET /me`, estimativa e dado da barra
"Plano Squad · créditos do mês" (FLUXOS_DA_V46.md §1.1). Sem gateway de pagamento (Fase 2).
**Sessões:** 16/10 10:27–10:44 (caiu por cota; migration commitada, seed salvo pelo autosave) e
11:14–11:30 (retomada a partir do disco). Progresso item a item em `S1e-progresso.md`.

## 1. Entregue

| # | Onde | Conteúdo | Commit |
|---|---|---|---|
| 1 | `supabase/migrations/20261016133000_credits.sql` | `plans`, `plan_versions`, `delivery_prices` (versionados: UPDATE recusado; `provisional` e `approved_commercially`), `credit_accounts` (uma por workspace), `credit_grants` (origem, validade; `remaining`/`reserved` são cache do extrato), `credit_holds` (uma reserva por run: `held` → `captured` ou `released`), `credit_ledger` (somente inserção: UPDATE, DELETE e TRUNCATE recusados por trigger para qualquer papel; `idempotency_key` única por workspace; sai só junto com a conta). RLS forçada; `authenticated` só lê. Funções: `credit_balance`, `credit_breakdown`, `current_delivery_price`, `run_credit_estimate`, `grant_credits`, `reserve_credits` (HS001 sem saldo), `capture_credits`, `release_credits`; trigger em `runs` libera a reserva de run que termina sem captura. Plano Free provisório (20 créditos, uma vez) e conta com o grant do Free em `app.create_workspace`. `runs.credits_charged`. | `5b740c8` |
| 2 | `supabase/seed.sql` | 46 preços provisórios (01.01 = 0, as demais = 10; profundidade inferida no SA0), plano Squad fictício (100/mês) para a Miolo, contas e grants com ids fixos (a conta sai em cascata e volta, o extrato não aceita DELETE): Miolo 36 de 100 (64%), Vitta 20, Trilha 19,2 de 20 (4%). O run do seed tem reserva capturada de 10. | `42a056b` (autosave) |
| 3 | `supabase/tests/database/17_credits.test.sql` | pgTAP (48), §2. | `59eafcb` |
| 4 | `apps/backend/src/hellosquad/squad/store.py`, `worker/main.py`, `i18n/pt-BR.json` | `RunStore.begin()` reserva a estimativa (`app.run_credit_estimate`, chave `run:<id>`) na mesma transação que põe o run em execução, num savepoint; a retentativa devolve a mesma reserva. `deliver()` captura antes do `succeeded`. Falha definitiva e pergunta do Nexo: a trigger libera. Reserva recusada (sem saldo, sem preço) vira falha definitiva `insufficient_credits` ou `credit_price_missing`, sem cobrar. | `01a353a` |
| 5 | `apps/backend/src/hellosquad/credits/`, `identity/`, `domain.py`, `api/main.py`; `20261016143000_credits_plan_read.sql` | `GET /me`: cada membership ganha `credits` (plano, `provisional`, saldo, reservado, disponível, `cycle_credits`, `cycle_used`, `cycle_ends_at`). `POST /credits/estimate` (`workspace_id`, `delivery_type`, `work_item_id` opcional para o preço de revisão), mesma regra do worker. Planos legíveis por `authenticated`, como os preços. | `ae1b1e4` |
| 6 | `packages/contracts/openapi.json`, `src/schema.ts` | `make openapi`: +1 rota, +3 schemas (`CreditBalance`, `CreditEstimate`, `CreditEstimateRequest`), `Membership.credits` novo; nada removido. `pnpm --filter contracts generate`. | `ae1b1e4` |
| 7 | `apps/backend/tests/test_credits.py` | pytest (11), §2. | `01a353a`, `ae1b1e4` |
| 8 | `docs/SETUP_LOCAL.md` §"Créditos (S1e)", `docs/parciais/s1e/curl_creditos.txt` | curls do saldo e da estimativa, executados contra a API local. | `739e6c4` |

## 2. Como foi verificado

**pgTAP** (`make test-db`, 11:26):

```
/home/vitao/projetos/hellosquad/supabase/tests/database/16_brand_memory.test.sql ........... ok
/home/vitao/projetos/hellosquad/supabase/tests/database/17_credits.test.sql ................ ok
Files=18, Tests=357,  1 wallclock secs ( 0.05 usr  0.04 sys +  0.12 cusr  0.05 csys =  0.26 CPU)
Result: PASS
```

O `17_credits` (48) prova: RLS habilitada e forçada nas 7 tabelas; `authenticated` só com SELECT e sem
EXECUTE em reservar, capturar, liberar e conceder; todo preço provisório e sem aprovação comercial; 46
deliveries com preço; Free vigente = 20; UPDATE em preço recusado; saldos do seed (36, 20, 19,2); todo
workspace com conta; Marina só vê o extrato da Miolo, saldo da Vitta lido por ela = 0, não escreve no
extrato nem executa a reserva; Rafael só vê a Vitta; Pedro (sem workspace) não vê nada e o workspace que
ele cria nasce com 20 do Free; **UPDATE, DELETE e TRUNCATE no extrato recusados (42501)**;
**`idempotency_key` repetida recusada (23505)**; conceder de novo com a mesma chave devolve o mesmo grant;
reserva ao iniciar, retentativa devolve a mesma reserva sem lançamento novo, outra chave recusada; sem
saldo, HS001 com "Créditos insuficientes: esta entrega precisa de 10 e o saldo disponível é 5."; captura
uma vez só (soma −10 depois de capturar duas vezes); falha libera e reserva liberada não é cobrada (55000);
run concluído sem captura (pergunta) libera; apagar a conta leva o extrato junto.

**pytest** (`make test`, 11:26): `ruff check` e `ruff format --check` limpos; `116 passed in 19.13s`.
Os de créditos, nominalmente (`pytest tests/test_credits.py -v`, 11:27):

```
test_delivered_run_is_charged_once_even_after_a_transient_retry PASSED [  9%]
test_definitive_failure_releases_the_hold PASSED  [ 18%]
test_question_from_nexo_is_not_charged PASSED     [ 27%]
test_without_credits_the_run_fails_without_charging PASSED [ 36%]
test_me_brings_the_credit_bar_of_each_workspace PASSED [ 45%]
test_me_shows_what_a_running_run_reserved PASSED  [ 54%]
test_estimate_before_asking PASSED                [ 63%]
test_estimate_errors_use_the_error_envelope[sem-preco] PASSED [ 72%]
test_estimate_errors_use_the_error_envelope[formato] PASSED [ 81%]
test_estimate_errors_use_the_error_envelope[trabalho-alheio] PASSED [ 90%]
test_estimate_errors_use_the_error_envelope[workspace-alheio] PASSED [100%]
============================== 11 passed in 4.27s ==============================
```

O primeiro é o critério do plano: o worker (simulado) falha de forma passageira na produção do Otto,
devolve o run a `queued`, retoma (`["retry", "delivered"]`, `attempts = 2`) e o run tem **uma** reserva,
lançamentos `["hold", "capture"]`, débito −10, `credits_charged = 10`; a Miolo vai de 36 para 26, nada
reservado. O segundo: duas falhas (`["retry", "failed"]`) deixam `["hold", "release"]`, débito 0, saldo 36.

**Seed** (`make seed` duas vezes, 11:25): estado dos créditos idêntico (`diff` vazio):

```
miolo|5eed…0911|36.00|5eed…0921=100.00/36.00/0.00|4|1
trilha|5eed…0913|19.20|5eed…0923=20.00/19.20/0.00|2|0
vitta|5eed…0912|20.00|5eed…0922=20.00/20.00/0.00|1|0
IDENTICO
```

**API no ar** (`docs/parciais/s1e/curl_creditos.txt`, contra :8100 com o JWT da Marina):

```
{"plan": "Squad", "provisional": true, "balance": 36.0, "reserved": 0.0, "available": 36.0, "cycle_credits": 100.0, "cycle_used": 64.0, "cycle_ends_at": "2026-11-01T03:00:00Z"}
{"delivery_type":"04.01","depth":"produzir","credits":10.0,"revision":false,"provisional":true,"available":36.0,"sufficient":true}
{"error":{"code":"price_not_found","message":"Esta entrega ainda não tem preço em créditos.","details":[]}} HTTP 404
```

**Web** (`make test`, mesma rodada): ESLint e `tsc --noEmit` de `packages/contracts`, `packages/ui` e
`apps/web` passam com o contrato novo. O Vitest do web falhou em `test/ConversationPanel.test.tsx`
(`No "deliveryCardAction" export is defined on the "@/app/app/[workspace]/actions" mock`): é a A1a em
andamento (`ConversationPanel.tsx` e `actions.ts` modificados e não commitados pelo Aranha), não toca
créditos. Como o `make test` para no primeiro alvo vermelho, o pgTAP foi rodado à parte (`make test-db`, acima).

## 3. Decisões técnicas (não mudam o combinado)

1. **Reserva no claim.** O run só vira `running` com a reserva feita, na mesma transação; a recusa fica num
   savepoint e o run termina como falha definitiva (trabalho em `failed`, como qualquer falha definitiva da
   S1c), com o motivo em `runs.error`. Nada é cobrado.
2. **Captura = estimativa inteira**, antes de o run virar `succeeded`. Run que conclui sem captura (pergunta do
   Nexo) ou falha tem a reserva liberada pela trigger: não há reserva presa.
3. **Retentativa** (passageira, encerramento do worker) mantém o run com a mesma reserva (`run:<id>`).
4. **Nova versão de um trabalho já entregue** (ajuste, nova proposta) usa `revision_credits`; nulo = mesmo
   preço. No seed, todos nulos: o ajuste custa o mesmo que a primeira versão.
5. **Saldo** = soma do extrato dos grants válidos; reservado e ciclo vêm do cache dos grants, mantido pelas
   funções na mesma transação. A barra é `cycle_used / cycle_credits` (Miolo 64/100; Trilha 0,8/20).
6. **Preços no seed, plano Free na migration.** O Free é o que todo cadastro precisa; os 46 preços são
   placeholder com profundidade inferida, e o Catálogo do Super Admin é onde o preço real entra (versionado).
   Consequência: banco sem seed não tem preço e todo run termina em `credit_price_missing` (pergunta 6).
7. Créditos saem como número JSON (`float`), como `confidence` na Memória.

## 4. Perguntas ao dono (não decidi; segui a leitura mais conservadora)

1. **Profundidade por delivery** (orientar, produzir, executar, otimizar): só existe na inferência do SA0
   (`design/super-admin-proto/app/data.js`, pergunta 6 do SA0, aberta). O seed usa essa inferência.
2. **Valores**: Free 20 (uma vez, não vence), Squad 100 por mês, 10 por delivery, 01.01 (Nexo) = 0, revisão
   pelo mesmo preço. Todos provisórios e marcados (`provisional = true`, `approved_commercially = false`).
3. **Sem saldo**: o protótipo não mostra esse estado e não há paywall por decisão sua. Hoje o pedido vira
   trabalho, o run termina em falha com "Não há créditos disponíveis para esta entrega. Nada foi cobrado." e
   o trabalho fica em `failed`. Prefere recusar já no pedido (a estimativa traz `sufficient`)? Texto e
   desenho: dono + Diogo.
4. **Pergunta do Nexo não cobra** (conversa leve não cobra, Arquitetura §6). Confirma?
5. **Ajuste e nova proposta**: Arquitetura §6 prevê "preço próprio (menor)" para correção pontual; hoje é o
   mesmo preço (`revision_credits` nulo). Qual valor?
6. **Preço em produção**: entra pelo Catálogo do Super Admin (SA) ou vira migration antes da Fase 5?

## 5. O que ficou de fora

- Renovação mensal do ciclo do Squad (grant novo a cada mês): depende de assinatura e scheduler (Fase 2).
- A barra na interface: é do Aranha; o dado está em `GET /me` → `memberships[].credits`.
- Telas de Catálogo, Planos e Consumo: trilha SA, depois do núcleo.
- Pagamento (Asaas, Mercado Pago): Fase 2, ADR-0008.

## 6. Onde discordei do briefing

Em nada. O nome `POST /credits/estimate` é o do briefing (não havia rota prevista no OpenAPI); o saldo foi
para `GET /me` por workspace, porque a conta de créditos é do workspace e a pessoa pode estar em vários.

## 7. Estado em que deixei a máquina

API (:8100) e web (:3100) no ar, sem reinício (a API recarregou sozinha). Banco com as migrations até
`20261016143000` e o seed aplicado. Nenhum arquivo meu fora de commit.
