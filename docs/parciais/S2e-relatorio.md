# S2e — Relatório (Stark)

**Fatia:** cobrança atrás de `PaymentProvider` (Fase 2, ADR-0008): interface única, adaptadores Asaas e
Mercado Pago contra mocks fiéis à documentação oficial, webhooks idempotentes com efeito no extrato de
créditos da S1e, renovação mensal no `hellosquad-scheduler` e leitura mínima para o menu da conta. Sem tela
de preço, paywall, compra ou cobrança real (dono, 16/10).
**Sessão:** 16/10 17:37–18:11. Progresso item a item em `S2e-progresso.md`.

## 1. Entregue

| # | Onde | Conteúdo | Commit |
|---|---|---|---|
| 1 | `supabase/migrations/20261016210000_billing.sql`, `20261016210100_billing_cycle_due_date.sql` | `plan_prices` e `topup_packs` (preço em dinheiro, versionados: UPDATE recusado; `provisional`, `approved_commercially`), `billing_customers` (só o id do provedor), `subscriptions` (uma aberta por workspace; `pending` → `active` → `past_due`/`cancelled`; período pago), `payments` (ciclo ou recarga, `pending`/`confirmed`/`overdue`/`failed`/`refunded`/`charged_back`/`cancelled`, `grant_id`, `credits_revoked`), `payment_events` (`UNIQUE (provider, event_id)`, payload sem dado de cartão nem pessoal). RLS forçada nas seis; `authenticated` lê só `subscriptions` e `payments`, e só como **owner**. Funções: `billing_register_customer/_subscription/_topup`, `billing_open_cycle_payment` (período pelo vencimento do provedor), `billing_payment_transition_allowed`, `billing_set_payment_status` (efeito no extrato), `billing_apply_event` (SECURITY DEFINER, grava o evento antes do efeito), `billing_due_subscriptions`, `billing_settle_due_subscription`. Papel `hellosquad_billing` (NOLOGIN; a API assume só com SET ROLE, sem herdar) que executa só `billing_apply_event`. | `6f18257`, `fc38f0f` |
| 2 | `apps/backend/src/hellosquad/billing/provider.py` | Interface `PaymentProvider` (criar cliente, criar assinatura, cobrar recarga por cartão e Pix, cancelar, consultar assinatura e cobrança, listar ciclos, verificar e interpretar webhook) e modelo próprio (`ProviderCustomer`, `ProviderSubscription`, `ProviderPayment`, `WebhookEvent`, `CardToken` só com token), `scrub` do payload. | `dc23009` |
| 3 | `billing/asaas.py`, `billing/mercadopago.py`, `billing/mock.py`, `billing/factory.py`, `config.py` | Adaptador **Asaas** (API v3, `access_token`, `User-Agent`, `remoteIp` no cartão, QR Pix, webhook por `asaas-access-token`), adaptador **Mercado Pago** (Bearer, `X-Idempotency-Key`, cliente repetido pela busca, assinatura `preapproval` só com cartão, ciclo = `authorized_payment`, webhook por `x-signature` HMAC-SHA256 do manifesto e consulta do recurso), **simulado** (só local/test, `x-mock-signature`). `PAYMENT_PROVIDER=asaas\|mercadopago\|mock`. | `dc23009`, `5207e6a`, `9b63813` |
| 4 | `billing/routes.py`, `billing/schemas.py`, `db.py`, `api/main.py` | `POST /billing/webhooks/{provider}` (sem usuário; assinatura obrigatória; 200 com `duplicate` e `outcome`; 401 sem assinatura válida; 503 se o provedor não responde à consulta), `GET /workspaces/{id}/billing/subscription` e `GET /workspaces/{id}/billing/payments` (só owner, sem dinheiro, paginado). | `4f54c86`, `6a0ffe0` |
| 5 | `billing/service.py`, `billing/renewal.py`, `scheduler/main.py`, `runtime.py` | Serviço de abertura (cliente, assinatura, recarga, cancelamento) para a Fase 4; renovação mensal no `hellosquad-scheduler` (`--once` para um tick): concilia ciclos e estado com o provedor, ciclo novo só com pagamento confirmado, senão `past_due`. O placeholder `idle_loop` da J0 saiu. | `4f54c86` |
| 6 | `supabase/seed.sql` | Squad 99,00 e `recarga-50` (50 créditos, 49,00), provisórios; Miolo com assinatura simulada (ciclo do mês pago = grant `…0921`) e recarga Pix pendente. | `564c70e` |
| 7 | `apps/backend/tests/billing_fakes.py`, `test_billing_providers.py` (10), `test_billing.py` (7); `supabase/tests/database/25_billing.test.sql` (36) | Servidor falso em processo com as rotas, códigos, erros, estados e o webhook de cada provedor; testes no §2. | `dd13106`, `849317b`, `bce677e`, `436f00b` |
| 8 | `packages/contracts/openapi.json`, `src/schema.ts` | 53 → 56 operações, nada removido; schemas novos `PaymentItem`, `PaymentPage`, `SubscriptionState`, `WebhookReceipt`. | `6a0ffe0` |
| 9 | `.env.example`, `Makefile`, `docs/SETUP_LOCAL.md` §"Cobrança (S2e)", `docs/parciais/s2e/curl_cobranca.sh` (`.txt`) | Variáveis com chaves vazias; como simular um webhook; roteiro executado. | `47ef190`, `a163585`, `e630992` |

## 2. Como foi verificado

**pytest da fatia** (`pytest tests/test_billing_providers.py tests/test_billing.py -v`, 18:09):

```
test_billing_providers.py::test_asaas_subscription_pix_and_card_topup PASSED
test_billing_providers.py::test_asaas_errors_follow_the_documented_envelope PASSED
test_billing_providers.py::test_asaas_webhook_needs_the_registered_token PASSED
test_billing_providers.py::test_asaas_refused_card_and_partial_refund_events PASSED
test_billing_providers.py::test_mercadopago_customer_payments_and_idempotency PASSED
test_billing_providers.py::test_mercadopago_subscription_is_card_only_and_cancels PASSED
test_billing_providers.py::test_mercadopago_webhook_signature_and_resource_lookup PASSED
test_billing_providers.py::test_scrub_drops_card_and_personal_data PASSED
test_billing_providers.py::test_mock_provider_signs_the_body PASSED
test_billing_providers.py::test_provider_comes_from_the_env PASSED
test_billing.py::test_pix_topup_goes_from_pending_to_confirmed_once PASSED
test_billing.py::test_webhook_without_valid_signature_is_refused_and_not_recorded PASSED
test_billing.py::test_mercadopago_cycle_grants_the_plan_credits_until_the_period_ends PASSED
test_billing.py::test_chargeback_and_refund_take_back_only_unused_credits PASSED
test_billing.py::test_renewal_grants_only_with_confirmed_payment_otherwise_past_due PASSED
test_billing.py::test_billing_reads_are_owner_only_and_carry_no_money PASSED
test_billing.py::test_mock_webhook_confirms_the_seed_pix_topup PASSED
============================== 17 passed in 2.64s ==============================
```

O que eles provam, nominalmente: Pix pendente (`PAYMENT_CREATED` não muda nada) → `PAYMENT_RECEIVED` aplicado → o mesmo evento de novo volta `duplicate: true` → `PAYMENT_CONFIRMED` atrasado dá `no_change`; o saldo sobe 50 **uma vez**, o grant é `topup` sem validade, há **um** lançamento com a chave `billing:payment:<id>` e o payload gravado não tem `creditCard`. Token do Asaas errado, assinatura do Mercado Pago com outro segredo, `x-signature` adulterado, sem cabeçalho, corpo com outro `data.id` e assinatura do simulado forjada: recusados, e `payment_events` não muda. Ciclo do Mercado Pago: `subscription_authorized_payment` cria a cobrança do ciclo (`ap:<id>`), concede 100 `plan_cycle` com `starts_at` = início e `expires_at` = fim do período, assinatura `active` e conta no plano Squad; cancelar mantém os créditos do ciclo pago. Contestação depois de 20 créditos usados retira só 30 (`adjustment`), contestação revertida devolve 30 (`refund`), estorno retira 30 de novo: extrato `grant 50, adjustment −20, adjustment −30, refund 30, adjustment −30`. Renovação: assinatura Pix do Asaas com o segundo ciclo pago no provedor e o webhook perdido é conciliada e renovada (grant do novo período); a assinatura simulada da Miolo sem pagamento fica `past_due`, `GET /me` segue 200 e a leitura mostra `past_due`; um segundo tick no mesmo instante não confere de novo. Leitura: Marina vê assinatura e pagamentos da Miolo sem `amount`, `price` nem `pix_payload`; Carla (editor da Vitta) recebe 403 `owner_only`; Marina na Vitta, 404; Rafael sem assinatura, `none`.

**Suíte inteira do backend** (`make test-backend`, 18:08): `ruff check` e `ruff format --check` limpos; `214 passed in 48.97s` (197 da S2d + 17).

**pgTAP** (`make test-db`, 18:08):

```
/home/vitao/projetos/hellosquad/supabase/tests/database/24_coordinated_work.test.sql ........... ok
/home/vitao/projetos/hellosquad/supabase/tests/database/25_billing.test.sql .................... ok
All tests successful.
Files=26, Tests=677,  1 wallclock secs ( 0.08 usr  0.02 sys +  0.14 cusr  0.10 csys =  0.34 CPU)
Result: PASS
```

O `25_billing` (36) prova: RLS forçada nas seis tabelas; `authenticated` lê só `payments` e `subscriptions`, não escreve, não executa função de cobrança; `anon` não toca em nada; `hellosquad_billing` executa só `billing_apply_event`, não lê tabela, não faz login, e a API o assume só por SET ROLE (sem herdar); nenhuma coluna de cartão ou documento; preços provisórios e UPDATE recusado (42501); Marina vê 1 assinatura e 2 cobranças da Miolo e nada da Vitta, Rafael vê a da Vitta, Carla (editor) e Pedro não veem nada; usuário não grava evento (42501); `(provider, event_id)` repetido recusado (23505) e, pela função, devolvido como repetido sem lançamento novo; pendente depois de confirmado não muda nada; cobrança alheia ignorada sem workspace; estorno lança `adjustment −50.00` e o saldo volta; estorno é final e contestação revertida volta a confirmada; uma assinatura aberta por workspace (23505); ciclo pago concede 100 com a validade do período e estende a assinatura; vencida sem ciclo confirmado vira `past_due`.

**API no ar** (`docs/parciais/s2e/curl_cobranca.txt`; API própria na porta 8199 com o segredo do simulado só no ambiente do processo, para não tocar o `.env` nem a 8100; JWT da Marina):

```
{"status":"active","plan":"Squad","provisional":true,"provider":"mock","method":"pix","current_period_start":"2026-10-01T03:00:00Z","current_period_end":"2026-11-01T03:00:00Z","next_cycle_at":"2026-11-01T03:00:00Z","past_due_since":null,"cancelled_at":null}
# 2. Saldo antes
{'plan': 'Squad', 'balance': 36.0, 'available': 36.0, 'cycle_credits': 100.0, 'cycle_used': 64.0}
# 3. Webhook simulado: a recarga Pix pendente do seed foi paga
{"received":true,"result":"SUCCESS","duplicate":false,"outcome":"applied"}
# 4. O mesmo evento de novo: repetido, sem efeito
{"received":true,"result":"SUCCESS","duplicate":true,"outcome":"applied"}
# 5. Assinatura errada: recusado, nada gravado
{"error":{"code":"invalid_signature","message":"Assinatura do webhook inválida.","details":[]}} HTTP 401
# 6. Cobrança que não é desta plataforma: 200 e ignorada (o provedor não reenvia)
{"received":true,"result":"SUCCESS","duplicate":false,"outcome":"ignored"}
# 7. Saldo depois (+50 da recarga) e histórico
{'plan': 'Squad', 'balance': 86.0, 'available': 86.0, 'cycle_credits': 100.0, 'cycle_used': 64.0}
2026-10-16 18:06:47,426 INFO hellosquad.scheduler: renovação: 0 vencidas, 0 renovadas, 0 em atraso, 0 falhas de conciliação
```

Depois do roteiro, `make seed` devolveu a Miolo a 36.

**Seed** (`make seed` duas vezes, 18:08): estado da cobrança idêntico (`diff` vazio):

```
events=0
mock_pay_miolo_ciclo|confirmed|100.00|5eed0000-0000-4000-8000-000000000921
mock_pay_miolo_recarga|pending|50.00|-
mock_sub_miolo|active|2026-11-01 03:00:00+00
prices=1,packs=1
IDENTICO
```

**Contrato e web**: `make openapi` + `pnpm --filter contracts generate`: 53 → 56 operações, nada removido, 4 schemas novos; `pnpm --filter contracts test` 9/9; `pnpm -r --if-present typecheck` (contracts, ui, web) sem erro. Nada rodado em `apps/web` além do `tsc --noEmit` (nenhum `next build`, nenhum `make e2e`).

## 3. Decisões técnicas (não mudam o combinado)

1. **Webhook sem usuário, sem privilégio novo na API.** A API continua conectando como `hellosquad_api`; na transação do webhook assume `hellosquad_billing`, que só executa `app.billing_apply_event` (SECURITY DEFINER, `search_path` vazio). A assinatura é verificada no adaptador antes de tocar o banco; segredo vazio = webhook recusado.
2. **Evento gravado antes do efeito, na mesma transação.** Falha no efeito desfaz o evento e o provedor reenvia. Idempotência em dois níveis: `(provider, event_id)` e o grant por cobrança (`billing:payment:<id>`), então eventos diferentes do mesmo fato (Asaas `CONFIRMED` e depois `RECEIVED` no cartão) não concedem duas vezes.
3. **Transições permitidas** (`billing_payment_transition_allowed`): evento fora de ordem não rebaixa (pendente depois de confirmado = `no_change`); estorno é final; contestação revertida volta a confirmada.
4. **Período do ciclo pelo vencimento do provedor** (`dueDate` do Asaas, `debit_date` do Mercado Pago). O Asaas gera a cobrança do ciclo até 40 dias antes e não garante ordem sem envio sequencial; "próximo período sem cobrança" trocaria ciclos. Sem vencimento (simulado), vale o próximo período sem cobrança.
5. **Mercado Pago: ciclo = `authorized_payment`** (id guardado como `ap:<id>`), porque as retentativas são do mesmo ciclo. Notificação `payment` de cobrança de assinatura fica `ignored` (o ciclo chega pelo `subscription_authorized_payment`). A notificação não traz estado: a API consulta o recurso; o id usado é o `data.id` assinado da query (corpo com outro id é recusado).
6. **Efeito no extrato da S1e:** confirmação → `grant` (ciclo: `plan_cycle` com a validade do período e início no começo do período; recarga: `topup`, validade da recarga, nula = não vence). Estorno e contestação → `adjustment` só do que não foi usado nem está reservado (o resto vai em `metadata.not_recovered`). Contestação revertida → `refund`. Estorno parcial → `needs_review`, sem efeito.
7. **`past_due`:** quando o período pago acaba sem o próximo ciclo confirmado (scheduler ou webhook de falha depois do fim do período). Nada é bloqueado; pagar depois reativa e concede o ciclo.
8. **A assinatura guarda a versão do plano vendida** (créditos por ciclo); quando o primeiro ciclo é pago, a conta de créditos passa ao plano da assinatura (é o que `GET /me` mostra).
9. **Dinheiro só no banco.** `plan_prices` e `topup_packs` sem leitura pelo usuário; as rotas não devolvem valor. Preço só no seed (provisório): banco sem seed não abre cobrança (`price_not_defined`).
10. **Nenhum dado de cartão no banco nem no backend.** A interface recebe só o token gerado pelo provedor no cliente; o payload do evento passa por `scrub` (sem cartão, documento, e-mail, telefone, endereço, nome, IP).
11. **Resposta do webhook com `"result": "SUCCESS"`**: a documentação do Asaas se contradiz (só 200 conta, ou qualquer 2xx com `SUCCESS` no corpo em `apiVersion` antiga); a resposta atende os dois.
12. **Conciliação no scheduler** só das assinaturas vencidas, cada uma no máximo a cada `BILLING_RECHECK_MINUTES` (padrão 60), para não gastar a cota do provedor (Asaas: 25 mil requisições a cada 12 h).

## 4. Onde discordei do briefing (ou li diferente)

1. **"Falha/estorno → `refund`/`adjustment`".** No extrato da S1e, `refund` é crédito que **volta** ao cliente (valor positivo) e `adjustment` é crédito que **sai** (negativo). Estorno e contestação de pagamento tiram créditos: viraram `adjustment`. Falha de pagamento não mexe no extrato (nada tinha sido concedido; a cobrança fica `failed`/`overdue` e a assinatura, `past_due`). `refund` aparece quando a contestação é revertida. Se a intenção era outra, é uma linha na função.
2. **Mercado Pago sem Pix recorrente.** Pela documentação atual, a assinatura (`preapproval`) pela API só aceita cartão (`card_token_id`); Pix aparece só no checkout do próprio Mercado Pago, sem confirmação de recorrência. O adaptador recusa assinatura Pix com `method_not_supported`. O Asaas faz Pix recorrente (uma cobrança Pix por ciclo, e há o Pix Automático, não implementado). Pergunta 1.
3. **`/v1/payments` é "legado"** na referência do Mercado Pago (recomenda a Orders API). Usei `/v1/payments` porque é o que a documentação de Pix e de assinaturas descreve hoje; a troca é decisão do sandbox.
4. **Incidente de índice compartilhado:** o commit `fc38f0f` (minha migration) levou junto 13 arquivos da A2c que o Aranha tinha posto no índice. O conteúdo está certo e o Aranha registrou no progresso dele (`259d2c7`); daqui em diante commito com caminho explícito.

## 5. Perguntas ao dono (não decidi; segui a leitura mais conservadora)

1. **Pix recorrente:** pelo Asaas (o cliente paga um Pix por mês, ou Pix Automático com débito autorizado) e cartão pelos dois? O Mercado Pago só faz assinatura por cartão pela API.
2. **Contestação (chargeback):** retirar os créditos já no pedido de contestação (como está) ou só quando ela for perdida?
3. **Estorno parcial:** qual regra (proporcional?). Hoje fica para conciliação à mão.
4. **Atraso:** por quanto tempo a assinatura `past_due` segue sem bloqueio e quando é cancelada? (paywall é decisão sua; hoje nada bloqueia nem cancela sozinho).
5. **Mudança de preço ou de créditos do plano** para quem já assina: mantém a versão vendida (como está) ou passa para a nova?
6. **Cancelamento:** os créditos do ciclo pago valem até o fim do período (como está)? Depois a conta volta ao Free?
7. **Quem vê assinatura e pagamentos:** só o owner (como está) ou o admin também?
8. **Recarga SPOT:** sem validade (como está, "sem validade curta") ou validade longa (por exemplo, 12 meses)?
9. **CPF/CNPJ:** o Asaas exige para criar o cliente; não guardamos no banco. Coletamos no cadastro do negócio ou na hora da compra (Fase 4)?
10. **Registros financeiros na exclusão do workspace:** hoje a cobrança sai junto (LGPD); há obrigação fiscal de guardar?

## 6. O que falta para o sandbox real (quando o Vic criar as contas)

**Asaas**
- Conta sandbox e chave de API (`$aact_hmlg_…`) em `ASAAS_API_KEY`; `ASAAS_BASE_URL` já aponta para `https://api-sandbox.asaas.com/v3`.
- Webhook cadastrado (painel ou `POST /v3/webhooks`) para `https://<endereço público>/billing/webhooks/asaas`, com `authToken` de 32 a 255 caracteres em `ASAAS_WEBHOOK_TOKEN`, eventos de cobrança e de assinatura, envio **sequencial**.
- **Endereço HTTPS público** para receber webhook: local exige túnel, e nuvem é Fase 5. Decisão do dono.
- Cartão: a tokenização do Asaas (`POST /v3/creditCard/tokenizeCreditCard`) é no servidor e recebe o cartão inteiro (escopo PCI). Alternativa: link/checkout do Asaas. Decisão da Fase 4; em produção a tokenização depende de habilitação.
- Conferir no sandbox o que a documentação não fecha: se o primeiro ciclo de assinatura por cartão é cobrado na criação; o corpo do 404; os códigos exatos de erro de `cpfCnpj` e `remoteIp` (no falso são inferidos).
- Pix Automático (`/v3/pix/automatic/authorizations`, eventos `PIX_AUTOMATIC_*`): não implementado; depende da pergunta 1.

**Mercado Pago**
- Aplicação em "Suas integrações", credenciais de teste (Access Token) em `MERCADOPAGO_ACCESS_TOKEN`, usuários de teste comprador e vendedor.
- Webhook para `https://<endereço público>/billing/webhooks/mercadopago` com os tópicos `payment`, `subscription_preapproval` e `subscription_authorized_payment`; a assinatura secreta em `MERCADOPAGO_WEBHOOK_SECRET`. A documentação avisa que credenciais de teste não disparam notificação: usar o simulador do painel.
- Cartão: token gerado no navegador e no app (MP.js/Card Payment Brick com a chave pública), com a bandeira (`payment_method_id`). Fase 4.
- Conferir no sandbox: `GET /authorized_payments/search?preapproval_id=` (usado na conciliação; não confirmado na documentação atual; alternativa `GET /preapproval/search`), o status HTTP de sucesso de `POST /preapproval` e de `POST /v1/customers`, e as `action` dos tópicos de assinatura.
- Avaliar a Orders API (`/v1/orders`) no lugar de `/v1/payments`.

**Geral**
- A guarda de segredo do autosave (`infra/git-autosave.sh`) não reconhece chave do Asaas (`$aact_prod_`/`$aact_hmlg_`) nem do Mercado Pago (`APP_USR-`): sugiro ao Jarvis/Thor incluir antes de qualquer chave real existir na máquina.
- Conciliação diária das recargas pendentes antigas (Pix expirado) e tela de Pagamentos do Super Admin (reprocessar webhook): SA6.
- Compra pela web e pelo app (rotas que chamam `billing/service.py`): Fase 4.

## 7. Fontes consultadas (todas acessadas em 16/10/2026)

Asaas: autenticação https://docs.asaas.com/docs/autenticação-1 · comece por aqui https://docs.asaas.com/reference/comece-por-aqui · códigos HTTP https://docs.asaas.com/reference/codigos-http-das-respostas · criar cliente https://docs.asaas.com/reference/criar-novo-cliente · criar assinatura https://docs.asaas.com/reference/criar-nova-assinatura · assinatura com cartão https://docs.asaas.com/reference/criar-assinatura-com-cartao-de-credito · remover assinatura https://docs.asaas.com/reference/remover-assinatura · recuperar assinatura https://docs.asaas.com/reference/recuperar-uma-unica-assinatura · cobranças da assinatura https://docs.asaas.com/reference/listar-cobrancas-de-uma-assinatura · FAQ de assinaturas https://docs.asaas.com/docs/faq-assinaturas · Pix Automático x assinaturas https://docs.asaas.com/docs/diferença-entre-pix-automático-e-assinaturas-1 · autorização Pix Automático https://docs.asaas.com/reference/criar-uma-autorizacao-pix-automatico · QR Code Pix https://docs.asaas.com/reference/obter-qr-code-para-pagamentos-via-pix · criar cobrança https://docs.asaas.com/reference/criar-nova-cobranca · eventos Pix Automático https://docs.asaas.com/docs/eventos-para-pix-automático · cobrança com cartão https://docs.asaas.com/reference/criar-cobranca-com-cartao-de-credito · recuperar cobrança https://docs.asaas.com/reference/recuperar-uma-unica-cobranca · cobranças via Pix https://docs.asaas.com/docs/cobrancas-via-pix · estornar https://docs.asaas.com/reference/estornar-cobranca · tokenização https://docs.asaas.com/reference/tokenizacao-de-cartao-de-credito · webhook de cobranças https://docs.asaas.com/docs/webhook-para-cobrancas · eventos de assinatura https://docs.asaas.com/docs/eventos-para-assinaturas · sobre os webhooks https://docs.asaas.com/docs/sobre-os-webhooks · criar webhook https://docs.asaas.com/docs/criar-novo-webhook-pela-api · fila pausada https://docs.asaas.com/docs/fila-pausada · FAQ de webhooks https://docs.asaas.com/docs/faq-de-webhooks · penalização de filas (atualizada em 13/10/2026) https://docs.asaas.com/docs/penalização-de-filas · idempotência em webhooks https://docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks · tipos de envio https://docs.asaas.com/docs/tipos-de-envio · Pix Automático https://docs.asaas.com/docs/pix-automatico

Mercado Pago: índice da referência https://www.mercadopago.com.br/developers/pt/reference/llms.txt · criar pagamento https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api-payments/create-payment/post.md · criar cliente https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api-payments/customers/create-customer/post.md · obter pagamento https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api-payments/get-payment/get.md · reembolso https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api-payments/create-refund/post.md · integrar Pix https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix.md · meios disponíveis https://www.mercadopago.com.br/developers/pt/docs/automatic-payments-orders/resources/available-payment-methods.md · resultados de cobrança https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/response-handling/collection-results/introduction.md · criar preapproval https://www.mercadopago.com.br/developers/en/reference/online-payments/subscriptions/create-preapproval/post.md · webhooks https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks.md · obter preapproval https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/get-preapproval/get.md · atualizar preapproval https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/update-preapproval/put.md · gestão de assinaturas https://www.mercadopago.com.br/developers/pt/docs/subscriptions/subscription-management.md · assinatura com plano https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-associated-plan.md · pagamentos autorizados https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan/authorized-payments.md · obter pagamento autorizado https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/get-authorized-payment/get.md · visão geral de assinaturas https://www.mercadopago.com.br/developers/pt/docs/subscriptions/overview.md · notificações de assinaturas https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/additional-info.md · notificações (Orders) https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications.md · índice da documentação https://www.mercadopago.com.br/developers/pt/docs/llms.txt

Nenhuma chave real e nenhuma chamada real a provedor: os testes falam com o servidor falso em processo.

## 8. Estado em que deixei a máquina

API (:8100) e web (:3100) no ar, sem reinício (a API recarregou sozinha). A API auxiliar da porta 8199 foi encerrada. Banco com as migrations até `20261016210100` e o seed reaplicado (Miolo em 36). `.env` do dono intocado. Nenhum arquivo meu fora de commit.
