# S2f — progresso (E-mail transacional atrás de `EmailProvider`, Mailpit local)

Disparada às 18:15 de 16/10/2026 pela main (Opus 5.5), em paralelo com a A2c do Aranha
(`apps/web`; fechada pela main às 18:16). Área desta fatia: `apps/backend`, `supabase/`,
`packages/contracts` (gerado), `.env.example` e os documentos da fatia.

Horas = hora do commit (`git log --date=format:%H:%M`). Até o commit `8c50146` eu anotei horas
estimadas, adiantadas em até 31 minutos; corrigi às 18:38 pelas horas reais dos commits.

| Hora | Item | Commit | Estado |
|---|---|---|---|
| 18:18 | Abertura do progresso; PASSO 0 lido (diretrizes, plano da Fase 2, `config.toml` `[local_smtp]`/`[auth.email]`, S2e §1, S1b §1, S1c §2, S2c §1, S0 §1, A2b §5) | `d4a0453` | feito |
| 18:21 | Infra: SMTP do Mailpit exposto em `127.0.0.1:56325` (`[local_smtp] smtp_port`); stack do HelloSquad reiniciado sob a trava (18:20:39 → 18:21:17, dados do volume preservados, chaves iguais); sonda SMTP respondeu `250 Ok: queued as <ID>` e a mensagem apareceu em `GET /api/v1/messages`; web 200 e API ok depois | `2df67dc` | feito |
| 18:26 | 1. Migration `20261016220000_transactional_email`: fila pgmq `email_outbox`, `email_messages` (workspace, destinatário, modelo, idioma, variáveis, estado, `provider_message_id`, tentativas; idempotente) e `email_preferences` (receber ou não por modelo) com RLS forçada; `app.enqueue_email` (preferência e idioma pessoa → negócio → pt-BR); gatilhos: convite criado, aprovação pendente (owners), versão de entrega do agente (membros que não são owner), cobrança confirmada ou com problema (owners), senha trocada pela Auth; aplicada com `make migrate` | `b3950e6` | feito |
| 18:29 | 1. `email/`: interface `EmailProvider` (modelo + variáveis + idioma + destinatário → id do provedor), adaptador SMTP do Mailpit (id = `queued as`), mock determinístico, escolha por `EMAIL_PROVIDER` (só local/test), fila `email_outbox` com tentativas e recusa fora de `.example`; `config.py` | `fef8cb8` | feito |
| 18:31 | 2. Modelos dos 6 e-mails em pt-BR, en e es no catálogo do backend (`i18n/*.json`, 53 chaves `email.*` por idioma); worker consome `email_outbox` com vaga sobrando e no `--drain` | `1345dd1` | feito |
| 18:33 | 3. Preferência mínima por pessoa: `GET /me/email-preferences`, `PUT /me/email-preferences/{template}` (só os 4 opcionais) | `e23d4f7` | feito |
| 18:36 | 4. `tests/test_email.py` (6): e-mails no Mailpit nos 3 idiomas para os 3 negócios (convites, "Needs you" ao Rafael em en, "Entrega lista" à Carla em es pelo idioma dela, Pix vencido da Miolo em pt-BR), sem citar outro negócio, sem valor em dinheiro; retry depois de falha simulada e esgotamento (`failed` + `archive`); `.test` recusado sem envio; preferência da Marina desliga o aviso; troca de senha pela Auth (API admin) gera o aviso; os 6 modelos nos 3 idiomas sem chave faltando. 6/6 duas vezes seguidas (o autosave `8fed585` pegou o arquivo no meio) | `e4dba64` | feito |
| 18:37 | 4. pgTAP `26_transactional_email` (23): RLS forçada, idioma pessoa → negócio, variáveis do negócio do evento, fila, um aviso por evento e pessoa, sem dinheiro, Marina não vê a Vitta, Carla só o dela, usuário não grava nem enfileira, preferência só da própria pessoa e só dos opcionais, aviso desligado não gera e-mail, aprovação só ao owner | `87ce7f6` | feito |
| 18:37 | 6. `make openapi` + `pnpm --filter contracts generate`: 56 → 58 operações, nada removido | `8c50146` | feito |
| 18:40 | 6. `.env.example` (`EMAIL_*`, sem segredo) e `SETUP_LOCAL.md` §"E-mail transacional e o Mailpit (S2f)"; verificação completa: `make test-backend` 220 passed, `make test-db` 700/700 | `0f318a1` | feito |
| 18:40 | Roteiro do `SETUP_LOCAL` executado (convite → `hellosquad-worker --drain` → Mailpit), saída em `docs/parciais/s2f/roteiro_mailpit.txt` | `70feacd` | feito |
| 18:42 | 5. Item extra (A2b §5.2): `CalendarPost` com `version_no`, `work_item_title` e `objective` (coluna nova `calendar_posts.objective`, migration `20261016220100` preenche as linhas existentes pelo post equivalente da versão); asserção no `test_calendar_is_persisted_and_planned_on_approval`; contrato regenerado (campos novos opcionais) | `0736d6a` | feito |
| 18:44 | 5. Item extra (A2b §5.1): `WorkItem.current_version` (id, número, estado, data e última decisão da versão mais recente) na lista e no detalhe; asserção no `test_delivery_end_to_end`; work/core/rich 31 passed; contrato regenerado (schema novo `CurrentVersionSummary`, campo opcional) | `b49e4f2` | feito |
| 18:45 | Verificação final: `make test-backend` 220 passed (ruff limpo); `make test-db` falhou em 02/04 por um convite que o meu roteiro deixou na Miolo (`nova.pessoa@miolo.example`; o seed não apaga convites); apagado, `SETUP_LOCAL` ganhou a linha de limpeza; `make test-db` 700/700 | `37c2923` | feito |
| 18:48 | `S2f-relatorio.md` (entregue, verificação colada, decisões, onde discordei, perguntas ao dono, o que ficou de fora, estado da máquina) | este | feito |

**Fatia fechada às 18:48.** Relatório: `docs/parciais/S2f-relatorio.md`.
