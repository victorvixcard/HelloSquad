# S2e — progresso (Cobrança atrás de `PaymentProvider`: Asaas e Mercado Pago)

Disparada às 17:37 de 16/10/2026 pela main (Opus 5.5), em paralelo com a A2b/A2c do Aranha
(`apps/web`, `packages/ui`). Área desta fatia: `apps/backend`, `supabase/`,
`packages/contracts` (gerado), `.env.example` e os documentos da fatia.

| Hora | Item | Commit | Estado |
|---|---|---|---|
| 17:38 | Abertura do progresso; PASSO 0 em leitura (diretrizes, ADR-0007/0008, Arquitetura §6 e §11, Documento Mestre §13, S1e §1/§4/§5, SUPER_ADMIN §2–§3, S1c §1) | este | feito |
| 17:44 | PASSO 0 lido; pesquisa da documentação oficial do Asaas e do Mercado Pago (subagente, 50 fontes com data) | — | feito |
| 17:46 | 1. Migration `20261016210000_billing`: `plan_prices`, `topup_packs` (versionados, provisórios), `billing_customers`, `subscriptions`, `payments`, `payment_events` (`provider` + `event_id` único), RLS forçada, owner lê assinatura e cobranças, máquina de estados da cobrança com efeito no extrato da S1e, papel `hellosquad_billing` só para o webhook | `6f18257` | feito |
| 17:50 | 1–2. Interface `PaymentProvider` com modelo próprio; adaptador Asaas | `dc23009` | feito |
| 17:52 | 2. Adaptador Mercado Pago, provedor simulado, escolha por `PAYMENT_PROVIDER` | `5207e6a` | feito |
| 17:53 | 1. Período do ciclo pelo vencimento do provedor (webhooks fora de ordem): `20261016210100` | `fc38f0f` | feito |
| 17:55 | 3–5. Webhook idempotente, leitura da assinatura e dos pagamentos (owner), renovação no `hellosquad-scheduler` | `2c2e535` (autosave), `4f54c86` | feito |
