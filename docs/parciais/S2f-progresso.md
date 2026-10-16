# S2f — progresso (E-mail transacional atrás de `EmailProvider`, Mailpit local)

Disparada às 18:15 de 16/10/2026 pela main (Opus 5.5), em paralelo com a A2c do Aranha
(`apps/web`). Área desta fatia: `apps/backend`, `supabase/`, `packages/contracts` (gerado),
`.env.example` e os documentos da fatia.

| Hora | Item | Commit | Estado |
|---|---|---|---|
| 18:17 | Abertura do progresso; PASSO 0 lido (diretrizes, plano da Fase 2, `config.toml` `[local_smtp]`/`[auth.email]`, S2e §1, S1b §1, S1c §2, S2c §1, S0 §1, A2b §5) | este | feito |
| 18:21 | Infra: SMTP do Mailpit exposto em `127.0.0.1:56325` (`[local_smtp] smtp_port`); stack do HelloSquad reiniciado sob a trava (18:20:39 → 18:21:17, dados do volume preservados, chaves iguais); sonda SMTP respondeu `250 Ok: queued as <ID>` e a mensagem apareceu em `GET /api/v1/messages`; web 200 e API ok depois | este | feito |
| 18:30 | 1. Migration `20261016220000_transactional_email`: fila pgmq `email_outbox`, `email_messages` (workspace, destinatário, modelo, idioma, variáveis, estado, `provider_message_id`, tentativas; idempotente) e `email_preferences` (receber ou não por modelo) com RLS forçada; `app.enqueue_email` (preferência e idioma pessoa → negócio → pt-BR); gatilhos: convite criado, aprovação pendente (owners), versão de entrega do agente (membros que não são owner), cobrança confirmada ou com problema (owners), senha trocada pela Auth; aplicada com `make migrate` | este | feito |
| 18:38 | 1. `email/`: interface `EmailProvider` (modelo + variáveis + idioma + destinatário → id do provedor), adaptador SMTP do Mailpit (id = `queued as`), mock determinístico, escolha por `EMAIL_PROVIDER` (só local/test), fila `email_outbox` no worker com tentativas e recusa fora de `.example`; `config.py` | este | em andamento |
| 19:00 | 4. `tests/test_email.py` (6): e-mails no Mailpit nos 3 idiomas para os 3 negócios (convites, "Needs you" ao Rafael em en, "Entrega lista" à Carla em es pelo idioma dela, Pix vencido da Miolo em pt-BR), sem citar outro negócio, sem valor em dinheiro; retry depois de falha simulada e esgotamento (`failed` + `archive`); `.test` recusado sem envio; preferência da Marina desliga o aviso; troca de senha pela Auth (API admin) gera o aviso; os 6 modelos nos 3 idiomas sem chave faltando. 6/6 duas vezes seguidas | este | feito |
| 19:06 | 4. pgTAP `26_transactional_email` (23): RLS forçada, idioma pessoa → negócio, variáveis do negócio do evento, fila, um aviso por evento e pessoa, sem dinheiro, Marina não vê a Vitta, Carla só o dela, usuário não grava nem enfileira, preferência só da própria pessoa e só dos opcionais, aviso desligado não gera e-mail, aprovação só ao owner | este | feito |
