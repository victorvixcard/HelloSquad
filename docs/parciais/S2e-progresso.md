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
| 17:56 | Seed: preço provisório do Squad, `recarga-50` provisória, assinatura simulada da Miolo com o ciclo pago e uma recarga Pix pendente | `564c70e` | feito |
| 17:58 | 2. Servidores falsos do Asaas e do Mercado Pago (rotas, erros, estados, assinatura do webhook) | `dd13106` | feito |
| 18:00 | 6. pytest dos adaptadores (10) | `849317b` | feito |
| 18:02 | 6. pytest de integração (7): Pix pendente → confirmado, repetido, assinatura inválida, ciclo, estorno, renovação, leitura do owner | `bce677e`, `0d17dab` | feito |
| 18:04 | 6. pgTAP `25_billing` (36) | `436f00b` | feito |
| 18:04 | 6. `make openapi` + `pnpm --filter contracts generate` (53 → 56 operações) | `6a0ffe0` | feito |
| 18:05 | `.env.example` (chaves vazias) e alvo `make scheduler` | `47ef190` | feito |
| 18:06 | Roteiro curl contra a API (porta 8199, segredo só no processo) e o scheduler `--once` | `e630992` | feito |
| 18:07 | 6. `SETUP_LOCAL.md` (simular webhook) | `a163585` | feito |
| 18:08 | Verificação: backend 214/214, pgTAP 677/677, seed idêntico, `tsc` de contracts/ui/web ok; webhook do Mercado Pago usa o `data.id` assinado | `9b63813` | feito |
| 18:10 | `S2e-relatorio.md` | este | feito |

**Fatia fechada às 18:10.** Relatório: `docs/parciais/S2e-relatorio.md`.
