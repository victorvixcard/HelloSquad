# S2b — Relatório (Stark)

**Fatia:** S2b, Kiwi, Max e Íris completos (Fase 2). **Data:** 16/10/2026, 15:16 → 15:43.
Commits em `main`, todos com push: `85377aa`, `c56d3ca`, `ca2ced7`, `ad291dd`, `c239954`, `ef22a1a`, `e5a982c`,
`e932feb`, `03167b5`, `522ecc3`, `c6453fe`, `cbf5b0d`, `39bc4da`, `cc7c399` e o deste relatório (mais os autosaves
`e669380`, `b125b79`, `b129741`, que levaram parte do trabalho em andamento). Não toquei em `apps/web/` nem em
`packages/ui/`. Skills e fixtures foram escritos por dois sub-agentes meus, com o formato e as regras definidos por mim
e conferidos pela verificação abaixo (validação contra o modelo de cada entrega e varredura de linguagem causal).

## 1. Entregue

| # | Item do briefing | O que existe agora | Onde |
|---|---|---|---|
| 1 | **Kiwi 05.01 e 05.02** | `media_plan`: objetivos, canais (`meta_ads`, `google_ads`), orçamento com `teto_informado` (do pedido), `teto_proposto` (o limite que a pessoa autorizaria; o formato recusa teto acima do informado e distribuição acima do teto ou em canal fora do plano), limites, hipóteses com como medir e critério, o que falta para executar. `ad_tests`: públicos (P…), mensagens (M…), variações (V…, cada uma aponta para público e mensagem que existem), testes com variável, ≥ 2 variações, métrica, critério, duração e verba. O fluxo acrescenta `execucao` (nada investido, conta de anúncios não conectada, anúncios não criados) e, na 05.02, `plano_de_midia` (a 05.01 aprovada e o teto dela). A 05.01 lê a estratégia aprovada da Bia (02.02, 02.03, 02.04); a 05.02 lê 02.02, 02.04 e 05.01 | `squad/deliveries.py`; `squad/flow.py` (`kiwi_content`); `squad/kiwi/skills/`; `llm/fixtures/05.01`, `05.02` |
| 2 | **Max 06.03 + importação de CSV** | Tabelas `contacts` (nome, e-mail, telefone E.164, **origem do dado**, importação, última compra, compras), `consents` (contato, **canal**, `granted`/`revoked`, **base legal**, **data**, origem; **somente inserção** como o extrato: UPDATE, DELETE e TRUNCATE recusados para qualquer papel, revogar é linha nova, sai só junto com o contato) e `contact_imports` (arquivo, origem, contagens e linhas recusadas **sem o dado pessoal**); view `contact_consent_state` (vigente = o registro mais recente). `POST /workspaces/{id}/contacts/imports` (CSV em texto, lido em memória e nunca guardado; owner ou admin): recusa linha **sem consentimento**, consentimento sem endereço ou sem data, data no futuro, **duplicata** no arquivo ou na base e, em `APP_ENV` local/test, **e-mail fora de `.example`**; `app.import_contacts` confere de novo papel e consentimento. `GET …/contacts/summary`. **Nada envia mensagem.** Seed: os 20 contatos de `DADOS_FICTICIOS.md`, 10 com consentimento (e-mail; WhatsApp em 6), 10 sem. 06.03 `customer_segments`: o modelo escolhe entre segmentos de critério fechado (`todos`, `ativos_30`, `esfriando_31_90`, `inativos_90`, `sem_compra`, `recorrentes`); **tamanho, elegíveis por canal e origens saem da base** | `…180000_contacts_and_consents.sql`; `contacts/routes.py`; `squad/data.py`; `squad/max/skills/06.03.md` |
| 2 | **Max 06.01 e 06.02** | `retention_campaign`: tipo, objetivo com indicador e prazo, segmento (com os números da base), oferta, calendário em ordem (e-mail/WhatsApp), como medir; `envio: nao_autorizado`. `message_sequence`: etapas com dia, canal, assunto (só no e-mail), texto, CTA, condição e **descadastro obrigatório**, frequência; `campanha` = a 06.01 aprovada; `envio: nao_autorizado` (só texto; envio é Fase 3/S2f) | `squad/deliveries.py`; `flow.py` (`max_content`); `squad/max/skills/06.01.md`, `06.02.md` |
| 3 | **Métricas fictícias + `metric`** | `metrics_daily` (workspace, canal, métrica, dia, valor, unidade, origem; dia sem linha é dado ausente, nunca zero; RLS forçada, só leitura para o membro). Seed: **Miolo e Vitta**, 90 dias até ontem, sessões no site, seguidores e alcance no Instagram, pedidos; origem `fonte_de_teste`; valores de função determinística (md5, semente fixa); **buraco de 3 dias** nas sessões da Miolo; Trilha sem métrica (primeiro acesso). `metric` como objeto da conversa **aponta para a série** quando a chave é `<canal>.<métrica>`: Íris à frente, período e origem lidos da tabela (chave que não é série segue como antes). `GET /workspaces/{id}/metrics?from&to&channel&metric` com `missing_days` | `…180100_metrics_daily.sql`; `metrics/routes.py`; `supabase/seed.sql` |
| 3 | **Íris 07.02, 07.03, 07.04** | O fluxo calcula as **evidências** (E1 sessões, E2 seguidores, E3 alcance, E4 pedidos): período atual (30 dias até o último dia com dado; "semana" = 7, "trimestre" = 90) contra o anterior, soma e **variação pela média diária dos dias com dado** (estoque: último valor), dias com dado, lacunas, origem. `performance_analysis` (leituras `fato`/`hipotese`, o que os dados não mostram, dados que faltam), `period_report` (destaques, leitura por canal, limitações; `relatorio_anterior` aprovado), `prioritized_recommendations` (ações em ordem, `base` dado/hipótese, responsável, esforço, **com quem discutir**: Nexo e especialistas; `analises` usadas). **Causa**: `fato` sem evidência citada vira `hipotese`; `causa` só fica com teste controlado citado (T…, que a plataforma ainda não tem), senão vira `hipotese`; **teste de fixture** falha se a entrega afirmar causa sem evidência ou usar linguagem causal | `squad/data.py` (`metrics_evidence`, `ground_reading`); `flow.py` (`iris_content`); `squad/iris/skills/`; `llm/fixtures/07.0x` |
| 3 | **Estado vazio honesto** (Documento Mestre §14) | Sem base (06.03, 06.01) ou sem métrica (07.02–07.04), o especialista pergunta na conversa ("Ainda não tenho números da Trilha Urbana para ler. Conecte o Instagram ou envie a planilha de encomendas…"), pendência `respond`, cartão `question`, **nenhuma entrega e nenhum crédito** (reserva liberada) | `flow.py` (`missing_data`); `i18n/pt-BR.json` |
| 4 | **Preços, cartões, status, créditos** | Preços provisórios das 8 já estavam no seed da S1e (10, `provisional`): conferidos pelo teste de cada delivery. Cartão `material`, `status_label` por etapa ("Kiwi · criando a primeira versão" … "Íris · aguarda sua aprovação"), "v1 aguarda sua aprovação", reserva e captura de 10 uma vez; títulos das etapas e perguntas do Nexo por delivery no catálogo | `i18n/pt-BR.json` |
| 5 | **Pedido da A2a** (§5 do `A2a-relatorio.md`) | `GET /me`: `user.locale` (o que a pessoa escolheu, de `user_metadata.locale`) e `memberships[].workspace.locale`; `GET /workspaces` e `GET /workspaces/{id}` com `locale`; **`PATCH /workspaces/{id}`** com `locale` (owner ou admin, `app.set_workspace_locale`, auditoria `workspace.locale_changed`). Seed devolve o idioma dos usuários fictícios ao padrão (§5 item 6) | `…180200_workspace_locale.sql`; `identity/`; `auth.py`; `supabase/seed.sql` |
| 6 | **Testes, contrato, docs** | pytest `test_s2b_deliveries` (21); pgTAP `22_contacts_consents_metrics` (35); `make openapi` + `pnpm --filter contracts generate` (47 → 51 operações, nada removido); `SETUP_LOCAL.md` §"Kiwi, Max e Íris (S2b)"; roteiro `docs/parciais/s2b/curl_kiwi_max_iris.sh` com a saída | `apps/backend/tests/`; `supabase/tests/database/`; `packages/contracts/`; `docs/` |

## 2. Como foi verificado (evidência)

**`make test-backend`** (ruff check + format + pytest com o banco; `docs/parciais/s2b/make_test_backend.txt`):

```
All checks passed!
============================= 185 passed in 38.12s =============================
backend exit=0
```

**`make test-db`** (pgTAP; `docs/parciais/s2b/make_test_db.txt`):

```
/home/vitao/projetos/hellosquad/supabase/tests/database/01_rls_coverage.test.sql ............... ok
/home/vitao/projetos/hellosquad/supabase/tests/database/22_contacts_consents_metrics.test.sql .. ok
Files=23, Tests=554,  1 wallclock secs
Result: PASS
```

O `01_rls_coverage` cobre as quatro tabelas novas sem ajuste. O `22` prova: RLS forçada em `contacts`, `consents`,
`contact_imports` e `metrics_daily`; Marina vê 20 contatos, 16 consentimentos, 10 com e-mail vigente e só as métricas
da Miolo; Rafael não vê contato nem consentimento da Miolo e vê só as métricas da Vitta; Pedro não vê métrica; membro
não insere contato nem consentimento e não altera métrica (42501); importação com um aceito, a duplicata da base e a
recusa da API no relatório; contato com origem, base legal, data e canal; o banco recusa contato sem consentimento,
data no futuro, WhatsApp sem telefone e contagem que não fecha; editor não importa (42501); outro workspace não
importa na Miolo (P0002) nem vê a importação; **consentimento não se altera, não se apaga sozinho e não se trunca
nem pelo papel privilegiado**; revogar é linha nova e vira o vigente, com o histórico; o consentimento sai junto com
o contato; métrica negativa recusada; `metric` com a chave da série põe a Íris à frente com período e origem da
tabela, chave sem série segue com o Nexo, a Vitta abre a série dela.

**Pytest da fatia** (`tests/test_s2b_deliveries.py`, 21): cada uma das 8 deliveries ponta a ponta (pedido da Marina na
conversa direta → trabalho com o agente certo → worker simulado → v1 do `kind` esperado, validada pelo modelo da
entrega → cartão `material` ligado à versão e à pendência → "<Agente> · criando a primeira versão" … "· aguarda sua
aprovação" → "v1 aguarda sua aprovação" → 10 créditos provisórios reservados e capturados uma vez → aprovação da dona
deixa trabalho e versão `approved`). Mais: Kiwi nunca investe (teto ≤ informado = 1500; nenhuma ferramenta `ads.*`
no run) e a 05.02 segue o teto da 05.01 aprovada (sem plano aprovado, `plano_de_midia` nulo); Max com os números da
base (total 20, 10/6 por canal, 10 sem consentimento, cada segmento com tamanho e elegíveis do seed), a 06.02 segue a
06.01 aprovada, **nenhum envio** e nenhum consentimento novo; Trilha sem base e sem métrica: pergunta do especialista,
nenhuma entrega, reserva `released`; Íris com as evidências calculadas (atualizado até ontem, período de 30 dias,
E1 sessões em queda com 30/27 dias de dado e variação pela média diária, E2 e E3 em alta, E4 quase estável, a lacuna
de 3 dias); **teste de fixture da causalidade**; unitários do rebaixamento (causa sem T → hipótese; fato sem
evidência → hipótese; recomendação "dado" sem evidência → hipótese) e da lacuna (dia ausente não vira zero); conversa
sobre `site.sessions` e `GET …/metrics` (87 pontos e os 3 dias sem dado; Rafael 404); importação com 8 linhas (2
aceitas; recusadas: sem consentimento, duplicata no arquivo, duplicata na base, e-mail `.test` fora de `.example`,
consentimento sem data, WhatsApp sem telefone; relatório sem `@` nem nome; resumo 22/11/8/12; auditoria sem dado
pessoal); editor 403, outro workspace 404, cabeçalho incompleto 422; cabeçalho com acento e vírgula; idioma no
`/me` e no `PATCH` (owner muda, editor 403, outro workspace 404, `fr` 422).

```
$ uv run pytest tests/test_s2b_deliveries.py -q
.....................                                                    [100%]
21 passed in 8.67s
```

**Pela API no ar (:8100, recarregou sozinha) e o worker simulado** (`docs/parciais/s2b/curl_kiwi_max_iris.txt`, trechos):

```
== 1. Importação de CSV (Max): linha sem consentimento, duplicata e e-mail fora de .example recusados
  total 4 aceitas 1 recusadas [{'line': 3, 'reason': 'no_consent'}, {'line': 4, 'reason': 'duplicate_existing'}, {'line': 5, 'reason': 'email_not_fictitious'}]
  base: {"total": 21, "consented": {"email": 11, "whatsapp": 7, "any_channel": 11}, "without_consent": 10, …}
  05.01 | needs_you | v1 aguarda sua aprovação | media_plan v1
      execucao = {"investimento": "nao_executado", "conta_de_anuncios": "nao_conectada"}
      orcamento.teto_informado = 1500
      orcamento.teto_proposto = 1200
  06.03 | needs_you | v1 aguarda sua aprovação | customer_segments v1
      base.total = 21
      segmentos.0.id = "ativos_30"
      segmentos.0.tamanho = 7
  07.02 | needs_you | v1 aguarda sua aprovação | performance_analysis v1
      dados.lacunas.0 = {"de": "2026-09-01", "ate": "2026-09-03", "canal": "site", "metrica": "sessions"}
      evidencias.0.variacao_pct = -13.9
      evidencias.0.dias_com_dado = {"atual": 30, "anterior": 27}
  05.02 | needs_you | v1 aguarda sua aprovação | ad_tests v1
      plano_de_midia = {"versao": 1, "teto_proposto": 1200, "delivery_version_id": "5e3ed0e7-…"}
  06.01 | needs_you | v1 aguarda sua aprovação | retention_campaign v1
      segmento = {"id": "inativos_90", …, "tamanho": 7, "elegiveis": {"email": 3, "whatsapp": 2}}
      envio = "nao_autorizado"
  07.04 | needs_you | v1 aguarda sua aprovação | prioritized_recommendations v1
      recomendacoes.0.base = "dado"
      recomendacoes.0.discutir_com = ["nexo", "max"]
  06.02 | needs_you | v1 aguarda sua aprovação | message_sequence v1
      envio = "nao_autorizado"
      campanha = {"versao": 1, "delivery_version_id": "67efa4a2-…"}
   site sessions sessões ['fonte_de_teste'] 87 pontos; sem dado: ['2026-09-01', '2026-09-02', '2026-09-03']
  conversa: iris {"type": "metric", "key": "site.sessions", …, "period": "2026-07-18/2026-10-15", "origin": "fonte_de_teste"}
  idioma do negócio: miolo en
  /me: pt-BR ['en']
== 6. Trilha (primeiro acesso, sem números): a Íris pede conexão, sem cobrar
   07.02 needs_you | Uma pergunta aguarda você | entregas: 0
   Ainda não tenho números da Trilha Urbana para ler. Conecte o Instagram ou envie a planilha de encomendas e me avise por aqui. Nada aparece antes de existir um dado real.
== seed reaplicado
```

Na importação pela API, a soma da Miolo com a linha nova mostra o caminho completo: o contato importado com
consentimento entra na base e já muda os números da segmentação (21 contatos, 7 ativos).

**Contrato** (`docs/parciais/s2b/contrato.txt`, `openapi.json` antes × depois):

```
operações: 47 -> 51 | novas: [('get', '/workspaces/{workspace_id}/contacts/summary'), ('get', '/workspaces/{workspace_id}/metrics'), ('patch', '/workspaces/{workspace_id}'), ('post', '/workspaces/{workspace_id}/contacts/imports')] | removidas: []
schemas: 121 -> 131 | novos: ['ConsentCounts', 'ContactImport', 'ContactImportRequest', 'ContactSource', 'ContactSummary', 'MetricPoint', 'MetricSeries', 'MetricsPage', 'RefusedLine', 'WorkspaceUpdate'] | removidos: []
campos removidos: []
obrigatórios novos (resposta): ['Workspace.locale', 'WorkspaceSummary.locale']
```

Os dois obrigatórios novos são campos de **resposta** (a API sempre manda), pedidos pela A2a; nenhum campo novo
obrigatório em requisição já existente.

**`make test-web`** com o contrato novo (`docs/parciais/s2b/make_test_web.txt`): ESLint e `tsc` verdes; contracts 9/9,
ui 49/49, web 181/181. **`make test-infra`**: guarda do autosave 8/8.

## 3. Decisões técnicas (não mudam o combinado)

- **Números saem do banco, nunca do modelo** (o padrão das fontes da 02.07): o fluxo calcula base e evidências e manda
  ao modelo com ids (`<base_de_contatos>`, `<metricas>` com E1…); o modelo escolhe ids e escreve a leitura; o fluxo
  põe os números na versão. Id que não existe é descartado.
- **Variação pela média diária** dos dias com dado nas métricas de fluxo: com o buraco de 3 dias, a soma daria −4,4% nas
  sessões; a média diária dá −13,9%, que é o que o dado mostra. Soma e dias com dado vão juntos na evidência.
- **Correlação não é causa**: `causa` exige um teste controlado citado; enquanto a plataforma não registra testes (05.09
  e a leitura da Íris, Fase 3), toda explicação fica como hipótese. O teste de fixture varre as fixtures da Íris atrás de
  "por causa de", "causou", "devido a", "graças a", "fez cair/subir"… e de `causa`/`fato` sem evidência.
- **Estado vazio pergunta, não falha**: pendência `respond` do especialista (o mesmo caminho da pergunta do Nexo), sem
  entrega e sem cobrança; quando a pessoa responde, o run roda de novo e, sem dado, pergunta de novo.
- **Consentimento somente inserção** com histórico (revogar = linha nova) e saída só com o contato: direito de exclusão
  preservado sem permitir reescrever o registro.
- **CSV em memória, por JSON** (não multipart nem Storage): o arquivo nunca é guardado; o relatório guarda número da
  linha e motivo, sem nome nem endereço das linhas recusadas. O banco confere de novo (defesa em profundidade).
- **`.example` só em `APP_ENV` local/test** (a regra de dados fictícios do dono); nos testes, o e-mail "fora" usa o TLD
  reservado `.test`, para nenhum endereço com cara de real entrar no repositório.
- **Segmentos por critério fechado** (recência e frequência), calculados pelo fluxo; o modelo não inventa segmento.
- **Ferramentas do `agent.yaml`** checadas no fluxo: `segmentos.criar` (Max lê a base), `dados.ler_series_historicas`
  (Íris), `memoria.ler` (documentos aprovados), `conversas.perguntar` (estado vazio). Nenhuma mudança em `agent.yaml`
  nem em `SOUL.md` (mudança ali gera versão nova).
- **Seed relativo ao dia** (base e série sempre atuais; "Não apresenta dado desatualizado como atual") e determinístico
  pelo deslocamento do dia (mesmos números a cada `make seed`).

## 4. Onde discordei do briefing ou interpretei

| Briefing | O que fiz | Por quê |
|---|---|---|
| `metrics_daily` "para os 3 tenants, 90 dias" | **Miolo e Vitta**, 90 dias; **Trilha sem métrica** | `DADOS_FICTICIOS.md` (fonte única dos dados) põe as métricas só na Miolo, 60 dias, e a Trilha como "primeiro acesso: estado vazio honesto"; o §14 exige testar o estado vazio da Íris. A Vitta dá o isolamento entre dois tenants com dados. Pergunta 1 |
| "recusa contato sem consentimento" × seed com "consentimento ausente nos outros 10" | importação recusa; o seed segue o `DADOS_FICTICIOS.md` (10 sem consentimento) | o seed é a base de teste de elegibilidade que o dono descreveu; a regra nova vale para o que entra pela importação. Pergunta 2 |
| "vinte contatos fictícios de `DADOS_FICTICIOS.md`" | os 20 do arquivo, **mais última compra e número de compras fictícios** | sem compra não há reativação nem segmento por recência; não editei o `DADOS_FICTICIOS.md`. Pergunta 4 |
| "CSV em memória/Storage" | só memória | Storage guardaria dado pessoal de linhas recusadas |
| A2a §5 itens 3 e 4 (fala de boas-vindas do Nexo no negócio novo; assunto do objetivo no idioma do negócio) | não feitos | mudam comportamento combinado (texto de agente gravado, chave da Memória); ficam para o Thor levar. Item 2: o idioma da pessoa fica no cadastro da Auth (`auth.users`, que é banco) e sai no `/me`. Item 5: a API já manda `error.code` estável em todo erro; o web pode traduzir pelo código |

## 5. Perguntas ao dono (o protótipo não responde; segui a leitura mais conservadora)

1. **Métricas de teste:** o briefing pede os 3 tenants e 90 dias; o `DADOS_FICTICIOS.md` diz Miolo e 60 dias e a Trilha
   vazia. Fiz Miolo e Vitta com 90 dias e a Trilha vazia. Atualizo o `DADOS_FICTICIOS.md` assim?
2. **Base sem consentimento de marketing:** o protótipo mostra "Aceitam receber mensagens: 123 de 439 contatos" (a base
   tem quem não aceita). A importação recusa hoje toda linha sem consentimento. Contato de cliente sem consentimento de
   mensagem (base legal de contrato, por exemplo) pode entrar na base, só sem receber mensagem?
3. **Quem importa e quem vê a base:** importar é do owner e do admin; ver é de todo membro (como o resto do workspace).
   Restringir a leitura de contatos ao owner e ao admin (LGPD, menor privilégio)?
4. **Atributos de compra** (última compra, número de compras) nos 20 contatos fictícios: acrescento a linha ao
   `DADOS_FICTICIOS.md`?
5. **Teto da Kiwi:** o formato recusa teto proposto acima do valor que a pessoa informou. A Kiwi pode recomendar mais do
   que a pessoa disse ter, como sugestão separada?
6. **Preço das 8** segue 10 créditos provisórios (S1e). O estado vazio não cobra nada. Algum ajuste?

## 6. O que ficou de fora

- **Telas** (importação, base, segmentos, relatórios, cartão de métrica): A2b; o contrato já tem tudo.
- **Envio, jornadas e captação** (06.04–06.06), **conta de anúncios** (05.03–05.06), conexões reais (GA4, Instagram,
  pedidos): Fase 3. 07.01, 07.05 e 07.06: fora desta fatia.
- **Rotas de contato** (listar, corrigir, excluir, revogar consentimento pela API): não pedidas; o banco já suporta
  exclusão (com o consentimento) e revogação (linha nova).
- `segment` como objeto da conversa apontando para a base: não pedido (só `metric`).
- **en/es** dos textos novos do backend: caem no pt-BR, como o resto do catálogo do backend.
- O log do worker chama a pergunta de dado faltante de "briefing incompleto (metrics)": só a frase do log.

## 7. Estado em que deixei a máquina

Migrations `…180000`, `…180100` e `…180200` aplicadas (`make migrate`); seed reaplicado no fim (`make seed`: Miolo com 36
créditos, 20 contatos, métricas da Miolo e da Vitta até ontem, idioma `pt-BR` nos negócios e nenhum idioma nos
usuários fictícios). API em :8100 no mesmo processo de antes (recarregou sozinha com as rotas novas; `/health` ok);
web em :3100 intocado (200); nenhum worker deixado no ar. Só os containers `supabase_*_hellosquad`.
