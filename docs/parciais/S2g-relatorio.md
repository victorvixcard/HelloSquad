# S2g — Relatório (correções da H2: servidor e infra)

**Fatia:** S2g. **Data:** 16/10/2026, 19:45 → 20:12. **Quem:** Stark e cinco auxiliares (sub-agentes), cada um num
worktree próprio em `/tmp/s2g-*` (nunca na árvore do dono, de onde rodam a API 8100 e a web 3100). Toda migration, seed,
pytest e pgTAP rodou dentro de `flock -o /tmp/hellosquad-db.lock`; publicação direta em `main` com rebase. Progresso em
`S2g-progresso.md`.

## 1. Achado → o que mudou → prova

| Achado | O que mudou | Prova |
|---|---|---|
| H2-02 | 13 fixtures `*.reflect.json` novas: as 16 deliveries com fluxo têm `produce`, `check` e `reflect`, com o caso honesto "nada a aprender" (02.04 e 04.03 ganharam o mesmo caso neutro). O fechamento do 01.02 não faz o Nexo refletir e a 03.01 da Kaia não gera versão: só as etapas decididas refletem | `ls llm/fixtures/*/*.reflect.json \| wc -l` → `16`; `test_reflection_fixtures.py` → `18 passed` (aprova as 16, reflexão `succeeded`; sem a fixture da 02.01 o teste dá `['failed']`) |
| H2-03 | `SEARCH_LEARNINGS` deixa de exigir a busca: entram os da mesma delivery, depois os que a busca acha, depois os gerais do agente, dentro do top_k e do orçamento; motivo novo `agent` em `run_context_items` (migration `20261016230000`) | `test_correction_on_caption_reaches_other_deliveries_of_the_agent`: a 04.03 do Otto recebe `("Tratamento", "04.01", "agent")` e `("Vocabulário", "04.01", "agent")`; a 04.03 da Vitta, `[]` → `2 passed` |
| H2-05 | Catálogo do backend completo (290/81/81 → 377/377/377) com teste de chaves e placeholders; 68 chaves `error.*` (as 37 chamadas de `ApiError`, mensagens dos handlers, SQLSTATE, tipos do Pydantic e validadores), no idioma da pessoa → do negócio da rota → pt-BR, com o pt-BR idêntico e o `code` estável; saudação `agent.<id>.greeting` nos três idiomas, com teste que falha se o pt-BR divergir do `agent.yaml`; prova do `<idioma>en/es</idioma>` no system do run | contagem `pt-BR 377 / en 377 / es 377`; `ApiError(` com texto literal no código: `0`; `test_i18n_catalog`, `test_api_errors_locale`, `test_squad_speech`, `test_run_locale` → `17 passed` |
| H2-07 | `SECRET_RE` reconhece `$aact_` (40+), `APP_USR-`/`TEST-` e `ASAAS_*`, `MERCADOPAGO_*`, `MP_*`, `PAYMENT_*` terminadas em KEY/TOKEN/SECRET **com valor**; vazias, URL e `$VAR` passam; `sk-ant-` passou a exigir 20+ (a guarda antiga acusava o `sk-ant-segredo-de-teste` de `test_llm.py`) | `make test-infra` → `guarda do autosave: 21/21` (a guarda antiga: 12 falhas em 21); arquivos versionados acusados: `0` |
| H2-13 | `WorkspaceCreate.name` recusa caracteres de controle, marcas de direção do texto e `< >` (422 com mensagem do catálogo); `ValueError` no envio do e-mail vira `failed` definitivo `invalid_message` com o motivo, na 1ª tentativa | `2 passed`: 5 nomes → 422 e nada criado; nome com CR/LF já no banco → `failed`, 1 tentativa, arquivado, 0 mensagem no Mailpit para o convidado e 0 para o `Bcc` |
| H2-14 | Fixture 01.02 procura o tema no pedido **e** na resposta da pessoa; "fim de ano" tem plano | `test_coordinated_project.py` → `5 passed`: sem tema → pergunta; "Fim de ano. Quero vender mais encomendas de presente." → Bia 02.04 → Kaia 03.01 → Otto 04.03 (com a fixture antiga: `['asked']`) |
| H2-15 | `ts` fora de ±5 min → 401, nada gravado (`SIGNATURE_TOLERANCE_SECONDS`; aceita segundos ou milissegundos); docstring e `SETUP_LOCAL.md` | `test_billing*.py` → `19 passed` (2020, ±6 min e texto recusados; agora e ±4 min aceitos; pela API, 401 `invalid_signature` sem `payment_events` novo) |
| H2-16 | `pg_try_advisory_lock(RENEWAL_LOCK_KEY)` na rodada de renovação, liberada no `finally`; quem não pega devolve `skipped` | mesmo `19 passed`: duas rodadas em `asyncio.gather` → uma pula, a outra renova 1; ciclo renovado uma vez |
| H2-17 | `POST /workspaces/{id}/contacts/consents/revocations` (owner ou admin; contato pelo e-mail ou telefone; um canal ou todos): linha nova `revoked` (o registro segue somente inserção) e auditoria `contacts.consent_revoked` com canais e origem, sem dado pessoal; reimportar o contato da base com "não" explícito e nenhum "sim" revoga em vez de recusar (`revoked_rows` na importação); contato novo com "não" continua `no_consent`; migration `20261016230100`; pgTAP `27` | `test_contacts_consent.py` → `4 passed` (owner revoga e repete sem duplicar; editora 403; outro negócio 404; sem endereço 422; reimportação `(4, 0, 1, 3)`); pgTAP `27_consent_revocation` 12/12 |
| H2-18 | Nome e origem que começam com `=`, `+`, `-` ou `@` ganham um apóstrofo na importação (e-mail e telefone já são validados) | mesmo arquivo: `=HYPERLINK(…)`, `+5511…`, `-1+2`, `@SOMA(A1)` gravados com `'`; "Ana Lima" intacta |
| H2-20 | Telefones 0101/0102 do teste de CSV → 0021/0022 (o seed usa 0001 a 0020) | `grep` sem outro fora da convenção em `tests`, `supabase/`, `squad/`; `test_s2b_deliveries.py` + `test_local_db.py` → `29 passed` |
| H2-21 | "CRM externo" no comentário do Max (a versão do prompt é o hash dos arquivos: o próximo run grava versão nova) | `grep -rniE "rd station\|hubspot" squad/ \| wc -l` → `0` |
| H2-27 | O seed apaga os convites dos três negócios | convites 2 → `make seed` → 0; `make test-db` → `Tests=700 … PASS` |
| H2-28 | `make test`: infra e web fora da trava; backend e pgTAP numa trava só (`HELLOSQUAD_DB_LOCK_HELD=1` deixa o `DB_LOCK` no-op nos filhos); `make seed` confere a senha do `hellosquad_api` **antes** de aplicar; guia do 2º checkout (C-01, C-02, C-03, C-05) e "Problemas comuns" | `make -n test` mostra um único `flock … env HELLOSQUAD_DB_LOCK_HELD=1 make … test-backend test-db`; teste novo em `test_local_db.py` |
| H2-29 | Sugestões de Bia, Kaia, Kiwi e Max pelos `asks` da V4.6 (Kiwi com o ajuste V4.2), com `{brand}`, nos três idiomas | `test_environment_conversation.py` → `4 passed` (os 7 ambientes em pt-BR e en) |
| Contrato | `make openapi` + `pnpm --filter contracts generate` | 58 → 59 operações (+ revogação), `revoked_rows`, descrições; nada removido (`efe6e1f`) |

## 2. Verificação final (colada)

```
$ make test-infra
guarda do autosave: 21/21
$ flock -o -w 600 /tmp/hellosquad-db.lock env HELLOSQUAD_DB_LOCK_HELD=1 make test-backend test-db
All checks passed!
124 files already formatted
======================== 267 passed in 64.76s (0:01:04) ========================
Files=27, Tests=700,  2 wallclock secs
Result: PASS
$ supabase test db   (depois do pgTAP 27, com a trava)
Files=28, Tests=712,  1 wallclock secs
Result: PASS
```

`make test` inteiro (no worktree, rebaseado em `main`): **vermelho no `test-web`**, em 3 testes do `apps/web`, área da
A2d do Aranha em andamento (nenhum arquivo da S2g): `A2bConversation` ("Coordenar uma campanha (Nexo) vira a estratégia
de campanha da Bia (02.04)": a A2d passou o pedido para o 01.02), `SitePage` (JSON-LD com um terceiro tipo) e
`catalog-parity` (apóstrofo reto no catálogo `en`). ESLint, tipos, `packages/contracts` (9) e `packages/ui` (49)
passaram. Como o `test-web` para o `make`, rodei a parte de banco exatamente como o alvo `test` faz (acima).

## 3. Decisões técnicas (nenhuma regra de produto)

- **H2-03:** a busca continua ordenando os de outras deliveries; os que ela não acha entram depois, com motivo `agent`.
- **H2-17:** não existe lista de contatos na API, por isso a rota acha o contato pelo e-mail ou telefone. Na
  reimportação, só o "não" explícito revoga (célula vazia não é "não") e só quando a linha não tem nenhum "sim"; linha
  que não muda nada (já revogado) sai como `duplicate_existing`. A reimportação com "sim" não reativa consentimento
  revogado (não foi pedido).
- **H2-13:** além de CR/LF e `< >`, recusa as marcas de direção do texto (U+200E/F, U+202A–202E, U+2066–2069).

## 4. Para o Thor levar ao Vic (riscos e pendências)

1. **Pooler (H2-16):** a trava é de sessão; em produção a conexão do scheduler precisa ser direta ou pooler em modo
   sessão (no modo transação a liberação pode cair em outra sessão e a renovação para). Anotado no código; Fase 5.
2. **Reenvio do Mercado Pago (H2-15):** ele reenvia a cada 15 min e a documentação não diz se o reenvio traz `ts` novo.
   Se trouxer o original, a tolerância de 5 min recusa as retentativas: conferir no sandbox antes de ligar.
3. O roteiro da H2 `docs/parciais/h2/04_cobranca_test.py` (caso `mp_ts_de_2020_reenviado`) passa a dar 401: esperado.
4. **Web:** a revogação e o `revoked_rows` não têm tela (o `ImportPanel` mostra aceitas e recusadas).
5. Em en/es, a mensagem que vem de `RAISE` das funções `app.*` sai pela mensagem genérica do SQLSTATE (o pt-BR mantém
   a específica); en mostra a hora em 24h.

## 5. O que ficou de fora

- `test-web` vermelho (A2d, acima). O seed não apaga e-mails de convite já gravados em `email_messages` (histórico).
  No modo simulado, temas de campanha além de Natal e fim de ano ainda caem no plano do Natal.

## 6. Estado da máquina

- API 8100 (`/health` ok) e web 3100 (200) do dono no ar o tempo todo; nada rodou em `apps/web` da árvore principal
  (o `make test` rodou no worktree `/tmp/s2g-stark`).
- Banco com as migrations `20261016230000` e `20261016230100` e no estado do seed (20 contatos na Miolo, 0 revogações,
  0 convites, 0 aprendizados, 0 reflexões, três negócios em pt-BR). Só containers `supabase_*_hellosquad`.
- Worktrees `/tmp/s2g-*` (com as cópias do `.env`) removidos no fim; nenhum worker, scheduler ou servidor meu no ar.
