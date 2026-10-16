# S2f — relatório (E-mail transacional atrás de `EmailProvider`, Mailpit local)

Stark, 16/10/2026, 18:15 → 18:47 (32 min; alvo 45). Área: `apps/backend`, `supabase/`, `packages/contracts`
(gerado), `.env.example`, `docs/SETUP_LOCAL.md` e os documentos da fatia. Nada em `apps/web`; nenhum `next build` nem
`make e2e`. Progresso com hora e hash de cada commit: `docs/parciais/S2f-progresso.md`.

## 1. Entregue

| # | Item do briefing | O que existe agora | Onde | Commit |
|---|---|---|---|---|
| 1 | **`EmailProvider` + SMTP do Mailpit + mock + seleção por `.env`** | Interface única `EmailProvider.send(EmailRequest)`: modelo, variáveis, idioma e destinatário → `EmailResult(provider, provider_message_id)`; o texto sai do catálogo e o adaptador só transporta (`deliver`). **Adaptador SMTP** para o Mailpit (`127.0.0.1:56325`, sem autenticação; `Message-ID = <id do e-mail>@hellosquad.example`; id do provedor = `queued as <ID>` da resposta ao DATA, o mesmo id da API do Mailpit; 4xx = passageiro, 5xx = definitivo, rede = passageiro). **Mock** determinístico (`mock-<sha256(id)[:20]>`, guarda o que enviou, `fail_next` para simular falha). `EMAIL_PROVIDER=mailpit\|mock`, `EMAIL_FROM=nao-responda@hellosquad.example`; os dois só valem em `APP_ENV=local/test` (fora disso não há provedor e a fila fica parada, nada se perde) | `apps/backend/src/hellosquad/email/{provider,smtp,mock,factory}.py`, `config.py` | `fef8cb8` |
| 1 | **Fila `email_outbox` + `email_messages` + worker** | Gatilho do domínio → `app.enqueue_email` grava `email_messages` (workspace, destinatário, modelo, idioma, variáveis já resolvidas no negócio do evento, estado `queued/sending/sent/failed/refused`, `provider`, `provider_message_id`, tentativas, erro; idempotente por evento e pessoa) e manda para a fila pgmq `email_outbox`. RLS forçada; a pessoa lê os e-mails que recebeu e o owner os do negócio; ninguém grava pelo papel do usuário. Worker: consome `email_outbox` com vaga sobrando (e no `--drain`), envia com tentativas (`EMAIL_MAX_ATTEMPTS`, backoff `EMAIL_RETRY_BASE_SECONDS × 2^(n-1)`), esgotou → `failed` + `archive`; **em local/test, destinatário fora do TLD `.example` → `refused`, sem tentativa** | `supabase/migrations/20261016220000_transactional_email.sql`, `email/outbox.py`, `worker/main.py` | `b3950e6`, `fef8cb8`, `1345dd1` |
| 2 | **Modelos pt-BR/en/es** | Seis modelos, texto e HTML simples com a marca (HelloSquad em tinta + "Squad" no laranja do Nexo, papel `#F7F7F5`, botão em tinta; sem imagem externa; HTML escapado): **convite**, **"Precisa de você"** (Needs you / Necesita de ti), **entrega pronta**, **pagamento confirmado**, **pagamento com problema** (vencido, recusado, contestado), **senha alterada** (só o aviso; recuperação e troca continuam da Auth). 53 chaves `email.*` por idioma no catálogo do backend (termos do web: "Precisa de você", papéis Titular/Administração/Edição/Leitura). Idioma = da pessoa (`user_metadata.locale`) → do negócio → pt-BR. Sem valor em dinheiro nem créditos | `i18n/{pt-BR,en,es}.json`, `email/templates.py` | `1345dd1` |
| 3 | **Gatilhos + preferência** | Convite criado → o e-mail convidado; aprovação pendente → owners (só o owner decide); versão de entrega feita por agente (`delivery.created`) → membros que não são owner; cobrança `confirmed` → owners; `overdue`/`failed`/`charged_back` → owners; senha trocada **pela Auth** (`session_user = supabase_auth_admin`) → a pessoa (falha no gatilho nunca derruba a Auth). `email_preferences` (pessoa × modelo, sem linha = recebe; convite e senha não são opcionais); `GET /me/email-preferences` e `PUT /me/email-preferences/{template}`. Nada de marketing (Max 06.02 continua só texto) | migration acima, `email/routes.py`, `api/main.py` | `b3950e6`, `e23d4f7` |
| 4 | **Teste de integração + pgTAP** | `tests/test_email.py` (6): Mailpit real nos 3 idiomas para os 3 negócios com isolamento, idempotência, retry e esgotamento, recusa fora de `.example`, preferência, aviso de senha pela API admin da Auth, os 6 modelos nos 3 idiomas sem chave faltando. `supabase/tests/database/26_transactional_email.test.sql` (23) | — | `e4dba64`, `87ce7f6` |
| 5 | **Item extra (A2b §5)** | **§5.1** `WorkItem.current_version` (id, número, estado, data e última decisão da versão mais recente) na lista `GET /workspaces/{id}/work-items` e no detalhe. **§5.2** `CalendarPost.version_no`, `work_item_title` e `objective` (coluna nova `calendar_posts.objective`, gravada pelo Otto na 04.02; a migration preenche as linhas existentes pelo post equivalente da versão). **§5.3** (contatos ativos, inativos e novos) ficou de fora: ver §5 e §6 | `work/{routes,schemas,calendar}.py`, `squad/{flow,store}.py`, `20261016220100_calendar_post_objective.sql` | `0736d6a`, `b49e4f2` |
| 6 | **Contrato, docs** | `make openapi` + `pnpm --filter contracts generate`: 56 → 58 operações, nada removido (schemas novos `EmailPreference*`, `CurrentVersionSummary`; campos novos opcionais). `.env.example` (`EMAIL_*`, sem segredo). `SETUP_LOCAL.md` §"E-mail transacional e o Mailpit (S2f)" (onde ver, quem recebe o quê, roteiro). Roteiro executado: `docs/parciais/s2f/roteiro_mailpit.txt` | — | `8c50146`, `0f318a1`, `70feacd`, `37c2923` |
| — | **Infra** | `[local_smtp] smtp_port = 56325` no `supabase/config.toml`: o SMTP do Mailpit só existia dentro da rede Docker (`172.24.0.7:1025` não responde do host no WSL2). Stack do HelloSquad reiniciado sob a trava (`flock`), 18:20:39 → 18:21:17; só os containers `supabase_*_hellosquad` | `supabase/config.toml` | `2df67dc` |

## 2. Como foi verificado (evidência)

**Mailpit recebeu, pela API HTTP (`GET /api/v1/messages`), última rodada do `test_email.py` (18:46):**

```
21:46:38 | senha.s2f@semconta.example | Sua senha do HelloSquad foi alterada
21:46:37 | retry.s2f@miolo.example | Marina Costa convidou você para Miolo no HelloSquad
21:46:37 | marina@miolo.example | Pagamento com problema em Miolo
21:46:37 | rafael@vitta.example | Needs you: Legenda do pão de abóbora
21:46:37 | carla@vitta.example | Entrega lista: Legenda do pão de abóbora
21:46:37 | convite.s2f@trilha.example | Juliana Prado te invitó a Trilha Urbana en HelloSquad
21:46:37 | convite.s2f@vitta.example | Rafael Nunes invited you to Vitta Estética on HelloSquad
21:46:37 | convite.s2f@miolo.example | Marina Costa convidou você para Miolo no HelloSquad
```

(hora do Mailpit em UTC.) A Carla recebe em es porque escolheu es para si, mesmo com a Vitta em en; o Rafael, owner,
recebe o "Needs you" e não o "Entrega lista" da mesma entrega.

**`uv run pytest tests/test_email.py -v` (18:46):**

```
tests/test_email.py::test_events_reach_mailpit_in_three_languages_for_three_tenants PASSED
tests/test_email.py::test_transient_failure_retries_and_then_reaches_mailpit PASSED
tests/test_email.py::test_recipient_outside_example_is_refused_without_sending PASSED
tests/test_email.py::test_preference_turns_off_an_optional_email PASSED
tests/test_email.py::test_password_changed_by_auth_sends_the_notice PASSED
tests/test_email.py::test_every_template_renders_in_the_three_languages_without_missing_keys PASSED
============================== 6 passed in 2.80s ===============================
```

O que cada um prova: (1) seis e-mails enfileirados com negócio, modelo, destinatário e idioma exatos; os seis
`sent` com `provider = mailpit`, `provider_message_id` presente na listagem do Mailpit, `To`, `Subject` e `MessageID`
conferidos, `lang` certo no HTML, nenhum `<img`, e **nenhum e-mail cita outro negócio** (nem no texto nem no HTML);
o aviso de cobrança não tem `R$` nem o valor; o mesmo evento repetido não duplica. (2) primeira tentativa falha
(simulada), o e-mail volta a `queued`, a segunda sai: `["retry", "sent"]`, `attempts = 2`, e o Mailpit recebe;
com três falhas, `["retry", "retry", "failed"]` e a mensagem vai para `pgmq.a_email_outbox`. (3) `fora.s2f@miolo.test`
→ `["refused"]`, `error = {"code": "recipient_domain_not_allowed"}`, nada enviado, busca no Mailpit vazia.
(4) Marina desliga `payment_problem` pela API e o Pix vencido não gera e-mail; `password_changed` → 422; o Rafael
continua com tudo ligado. (5) usuário criado e com a senha trocada pela API admin da Auth: aviso em pt-BR no
Mailpit; nada antes da troca. (6) os 6 modelos × 3 idiomas sem chave faltando, data e fuso (`18:30 (UTC-03:00)`,
`10/23/2026` em en), HTML escapado.

**Suítes completas (18:44–18:45):**

```
make test-backend   → All checks passed! · 118 files already formatted
                      ============================= 220 passed in 49.69s =============================   (214 antes + 6)
make test-db        → 26_transactional_email.test.sql ........ ok
                      All tests successful. Files=27, Tests=700 · Result: PASS                           (677 antes + 23)
pnpm -r --if-present typecheck → packages/contracts, packages/ui, apps/web: tsc --noEmit Done
```

O primeiro `make test-db` da rodada final falhou em `02_workspace_isolation` #7 e `04_invitations` #10 ("Marina não
vê convites…: Unexpected records (1)"): era o convite `nova.pessoa@miolo.example` que o roteiro do `SETUP_LOCAL` deixou
na Miolo (o seed não apaga convites). Apaguei, o roteiro ganhou a linha de limpeza, e o `make test-db` seguinte deu
700/700 (acima).

**Worker de verdade (roteiro do `SETUP_LOCAL`, 18:40; `docs/parciais/s2f/roteiro_mailpit.txt`):** convite inserido →
`hellosquad-worker --drain` → `e-mails: 50 mensagem(ns) tratada(s)`, 50 `sent` no banco (o convite e os e-mails que a
suíte de testes de outras fatias tinha enfileirado) → Mailpit `3z4cG8JG4V7bTFiunRoBa5 | nova.pessoa@miolo.example |
Marina Costa convidou você para Miolo no HelloSquad` → `email_messages`: `invitation | pt-BR | sent | 1 | mailpit |
3z4cG8JG4V7bTFiunRoBa5`.

**Infra:** sonda SMTP antes de qualquer código (`250 2.0.0 Ok: queued as 5bZZ8nMl5rOHd0fW8grbXs`, a mesma id em
`GET /api/v1/messages`; apagada depois); web `GET /entrar` 200 e API `/health` ok depois do reinício; a API do dono
(8100) recarregou sozinha e já serve `/me/email-preferences`.

**Item extra:** `pytest tests/test_s2a_deliveries.py tests/test_core_api.py tests/test_rich_work.py` → 31 passed, com
as asserções novas: o calendário devolve `(version_no, work_item_title) = (2, "Calendário da semana 43")` e `objective`
em todos os posts; a lista de trabalhos devolve `current_version` com a versão 1 `approved` / decisão `approved`.

## 3. Decisões técnicas (não mudam o combinado)

- **Texto fora do banco.** O banco guarda modelo + variáveis; o texto sai do catálogo do backend no idioma gravado no
  e-mail. Trocar uma frase não exige migration, e o mesmo e-mail renderiza igual em qualquer provedor.
- **Variáveis resolvidas no gatilho, no negócio do evento** (nome do negócio, quem convidou, título do trabalho, agente).
  O worker não consulta outras tabelas: um e-mail só carrega o que é do próprio negócio, por construção.
- **Idempotência por evento e pessoa** (`invitation:<id>`, `approval:<id>:<pessoa>`, `delivery_version:<id>:<pessoa>`,
  `payment:<id>:<estado>:<pessoa>`): repetir o webhook ou voltar e repetir o estado não reenvia.
- **Aviso de senha só quando quem troca é a Auth** (`session_user = supabase_auth_admin`): o `make seed` reescreve o
  hash com outro sal e não é troca de senha. O gatilho em `auth.users` engole o próprio erro (`raise warning`) para
  nunca derrubar uma troca de senha.
- **Fora de local/test não há provedor**: `EMAIL_PROVIDER` só aceita `mailpit` e `mock`; em staging/produção o worker
  avisa no log e deixa `email_outbox` parada até o provedor da Fase 5 existir (os e-mails ficam `queued`, nada se perde).
- **Recusa do `.example` no worker, não no gatilho**: o registro do e-mail recusado fica (`refused`, com o motivo), para
  a auditoria mostrar a tentativa.
- **Links**: `EMAIL_APP_URL` (local `http://127.0.0.1:3100`) + `/app/<slug>` (Início, com o "Precisa de você"),
  `/entrar` ou `/criar-conta` (convite: conforme o e-mail já tem conta), `/entrar` (senha). Datas no fuso
  `EMAIL_TIMEZONE` (America/Sao_Paulo), com o deslocamento explícito.
- **Teste e fila**: o `test_email.py` esvazia `email_outbox` antes de cada teste (o que a suíte inteira enfileirou não
  entra na conta) e apaga, ao fim, os `email_messages` que criou; o seed é reaplicado.

## 4. Onde discordei do briefing (ou li diferente)

1. **Porta SMTP.** O briefing diz "SMTP interno do stack"; do host ele não é alcançável (só a 8025 do Mailpit era
   publicada, como 56324). Expus `smtp_port = 56325` (a linha que o próprio `config.toml` traz comentada) e reiniciei o
   stack do HelloSquad. Custou ~40 s de Supabase fora do ar; web e API voltaram sozinhos. Quem subiu o stack antes
   desse commit precisa de `make down && make up` uma vez (está no `SETUP_LOCAL`).
2. **"Entrega pronta" não vai ao owner.** Lido ao pé da letra, o owner receberia dois e-mails a cada entrega
   (`delivery.created` e `approval.requested` acontecem juntos no mesmo run). Como só o owner decide (Vic, 08:55) e o
   "Precisa de você" da revisão já diz que a entrega está pronta, mandei "Entrega pronta" só a quem não é owner. Está
   no §5 como pergunta; mudar é trocar uma condição no gatilho.
3. **Convite sem link de aceite.** O token do convite nunca é gravado em claro (S0) e ainda não existe rota de criar
   nem de aceitar convite; o e-mail leva a `/criar-conta` ou `/entrar` e diz o negócio, o papel e a validade. O link
   com o token entra quando a rota de convite existir (quem cria o convite tem o token e pode passá-lo à fila).
4. **Item 5.3 da A2b (contatos ativos, inativos e novos)** não foi feito: "ativo", "inativo" e "novo" são regra de
   negócio que ninguém combinou (por compra? por consentimento? em quantos dias?). Pergunta no §5.

## 5. Perguntas ao dono (não decidi; segui a leitura mais conservadora)

1. **Provedor de e-mail de produção** (Resend, Postmark, SES…): decisão da Fase 5. O adaptador novo é um `deliver`
   (ou o mesmo SMTP com usuário e senha); remetente, domínio e SPF/DKIM vêm junto.
2. **"Entrega pronta" também para o owner?** Hoje: owner recebe só o "Precisa de você"; os outros membros recebem
   "Entrega pronta".
3. **Valor em dinheiro no e-mail de pagamento**: hoje não aparece (preço e créditos são provisórios). Quando o preço
   for definido, entra o valor?
4. **Contatos "ativos, inativos e novos"** (A2b §5.3): qual a definição de cada um?
5. **Preferências na tela**: a API existe (`/me/email-preferences`); a tela de preferências é do Aranha quando o
   protótipo tiver o lugar.

## 6. O que ficou de fora

- A2b §5.3 (contatos), §5.4 (métricas por canal), §5.5 ("<Agente> percebeu"), §5.6 (briefing do catálogo), §5.7 (Kaia
  em `DELIVERY_OWNER`): fora do item extra pedido (5.1–5.3) ou dependem de regra não combinada.
- Link de aceite do convite (depende da rota de convite, §4.3).
- Tela de preferências (web) e e-mail de troca de e-mail (continua o da Auth, como está).
- Provedor de produção, domínio de envio, descadastro por link (List-Unsubscribe): Fase 5.

## 7. Estado em que deixei a máquina

- Supabase do HelloSquad no ar com o SMTP do Mailpit em `127.0.0.1:56325` e a caixa em `http://127.0.0.1:56324`;
  migrations `20261016220000` e `20261016220100` aplicadas; seed reaplicado pelos testes; Miolo sem convites.
- `email_outbox` com 51 mensagens enfileiradas pela suíte de testes das outras fatias (convites, aprovações e entregas
  dos usuários fictícios, todos `.example`): o próximo `make worker` as entrega ao Mailpit.
- API (8100) do dono no ar, recarregada; web (3100) 200; nenhum processo meu ficou rodando.
- Todos os commits no `origin/main`; árvore limpa.
