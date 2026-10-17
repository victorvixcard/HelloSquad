# H-SA — Relatório de QA adversária da trilha Super Admin (Hulk)

**Fatia:** H-SA, QA adversária da trilha SA (SA1, SA2, SA3a, SA3b, SA4a, SA4b, SA6a, SA6b). **Data:** 17/10/2026, 00:14 →
00:58. **Método:** tentar refutar cada entrega lendo o código real e atacando o ambiente local (API 8100, web 3100 com
`/admin`, Supabase `hellosquad`, worker do produto em modo simulado com `--drain`, Mailpit 56324), sozinho, sem
sub-agentes. Nenhum código de produto foi alterado. Roteiros e provas em `docs/parciais/hsa/` (um par roteiro + saída
por bloco); saídas longas em `/tmp/hsa_*`. Toda operação que muda o banco rodou dentro da trava
`flock -o /tmp/hellosquad-db.lock`, com a medição **dentro** da mesma trava, e cada bloco devolveu o banco ao seed
(versões criadas pelos testes removidas com a mesma limpeza que o pytest e os roteiros da SA3a/SA6a usam; a auditoria
dos testes fica).

**Veredito em uma linha:** a trilha **passa sem 🔴**. Escalonamento (48 operações `/admin/*` × 4 personas, 7 tipos de
token forjado ou errado, Data API e GraphQL), papel privilegiado fora de `/admin/*`, sessão de suporte (só leitura,
encerrada e vencida = 403 na hora), auditoria de cada escrita, créditos (idempotência e débitos em paralelo), "à venda",
versões do squad × runtime e os números de Consumo/Qualidade/Saúde **resistiram a todos os ataques**. Encontrei
**7 🟡** e **6 ℹ️**: o motivo interno do Super Admin legível pela Data API, o `make seed` que quebra quando o Vic cria um
negócio (e ele cai no onboarding ao entrar), um texto de Pagamentos que promete o que já existe, três telas com
diferenças do SA0 não registradas e o clone limpo que não fica verde seguindo o SETUP.

## (a) Tabela-resumo

| # | Achado | Sev. | Onde | Quebra isolamento/segredo/combinado? |
|---|---|---|---|---|
| H-SA-01 | Motivo interno do Super Admin legível pela Data API: `delivery_prices.note` (qualquer autenticado, até o Pedro sem negócio) e `workspaces.suspension_reason` (membros do negócio) | 🟡 | `supabase/migrations/20261017030000_sa6a_admin_writes.sql:514-515`; `20261016133000_credits.sql:289-290` | Contradiz "nenhuma tabela do painel com GRANT para `authenticated`" (SA1) e "nunca pela Data API" (SUPER_ADMIN §3); em produção a Data API fica desligada (ADR-0011) | → corrigido em SA7a (894d310)
| H-SA-02 | `make seed` quebra (exit 2, "O workspace precisa de pelo menos um owner") quando o Vic cria um negócio pelo produto, e o Vic, ao entrar pelo `/entrar`, cai em `/app/novo-workspace`; o saldo informado pela tela Saúde também fica fora do seed e derruba `test_admin_sa4` | 🟡 | `supabase/seed.sql:152-154` (×127-143 do Pedro); `apps/backend/tests/test_admin_sa4.py:395-407,467` | Não; quebra `make seed`/`make test`/e2e até limpeza à mão | → corrigido em SA7a (6db1d8e, 1504e8f, da2e744)
| H-SA-03 | Pagamentos diz "reprocessar webhook e conciliar chegam na SA6" nos três idiomas, mas a SA6b já entregou as duas ações nessa tela | 🟡 | `apps/web/messages/{pt-BR,en,es}/admin.json` (`pagamentos.desc`); `app/admin/(painel)/pagamentos/page.tsx:57` | Texto falso na tela (estado honesto) |
| H-SA-04 | Catálogo: cinco diferenças visíveis do SA0 não registradas (chips por agente → menu; cabeçalho do agente sem contagem, homologação e "Abrir o agente"; cartões sem linha de apoio; integrações sem etiquetas; sem "Versão N · Ver histórico") | 🟡 | `app/admin/(painel)/catalogo/page.tsx` | Diverge do protótipo (não registrado) |
| H-SA-05 | Pagamentos: abas do SA0 viraram seções empilhadas e o cartão do provedor perdeu cinco linhas, sem registro | 🟡 | `app/admin/(painel)/pagamentos/page.tsx` | Diverge do protótipo (não registrado) |
| H-SA-06 | Auditoria sem o "Exportar CSV" do SA0, sem registro | 🟡 | `app/admin/(painel)/auditoria/page.tsx` | Diverge do protótipo (não registrado) |
| H-SA-07 | Clone limpo seguindo o SETUP não fica verde: `test_email.py:246` fixa a porta 3100 no link, o SETUP manda trocar `EMAIL_APP_URL` no segundo checkout | 🟡 | `apps/backend/tests/test_email.py:246`; `docs/SETUP_LOCAL.md` ("Segundo checkout") | Não; critério do clone limpo | → corrigido em SA7a (9fa41a9)
| H-SA-08 a H-SA-13 | Notas (§b) | ℹ️ | vários | Não | → H-SA-09 corrigido em SA7a (238eec7)

Contagem: 🔴 0 · 🟡 7 · ℹ️ 6.

## (b) Achados

### H-SA-01 — Motivo interno do Super Admin legível pela Data API (🟡)

- **Cenário concreto.** O Vic grava um preço novo na 04.01 com motivo ("Teste da H-SA com motivo registrado",
  `PUT /admin/catalog/04.01/price`). A função `app.admin_catalog_price` grava a versão nova em `delivery_prices` com
  `note = v_reason` (migration SA6a, linhas 514-515), e `delivery_prices` tem `GRANT SELECT` e política de leitura para
  todo `authenticated` desde a S1e (`20261016133000_credits.sql:289-290`). O Pedro, que não tem negócio nenhum, chama
  `GET /rest/v1/delivery_prices?delivery_type=eq.04.01` e recebe **200** com `"note":"Teste da H-SA com motivo
  registrado"`. Na suspensão, a Marina (titular da conta suspensa) lê `GET /rest/v1/workspaces?select=suspension_reason`
  e recebe o motivo interno; o `GET /me` da API, de propósito, não o mostra (só `workspace_status: suspended`). A SA1
  afirma "nenhuma tabela ou view do painel tem GRANT para `anon`, `authenticated`" e o §3 do `SUPER_ADMIN.md` diz
  "leitura só pelo papel de Super Admin via API privilegiada, nunca pela Data API": o dado é do painel, a tabela é do
  produto. Em produção a Data API fica desligada (ADR-0011), então o risco de hoje é local; mas qualquer leitura futura
  da API com `select *` em `delivery_prices` leva o motivo junto ao cliente.
- **Correção proposta.** O motivo já está em `audit_events` (`admin.catalog_price_versioned`, `payload.reason`): a
  versão de preço grava `note` nula ou neutra; para a suspensão, tirar `suspension_reason` do alcance dos membros
  (privilégio de coluna ou leitura pela API). pgTAP: `authenticated` não lê o motivo do Super Admin em nenhuma tabela.
- **Prova.** `hsa/03_escritas_auditoria.txt` ("Data API: o Pedro (sem negócio) lê a versão nova de preço com o motivo
  do Super Admin: 200 …" e "Data API: a Marina lê o motivo da suspensão? 200 …"); `hsa/01_escalonamento.txt`
  (`delivery_prices` 200 para Marina, Pedro e Vic; as outras 23 tabelas e views do SA 401/403).

### H-SA-02 — `make seed` quebra com um negócio do Vic; o Vic cai no onboarding ao entrar (🟡)

- **Cenário concreto.** O Vic entra pelo `/entrar` sem `next` e cai em **`/app/novo-workspace`, "Comece pelo seu
  negócio."** (o produto manda quem não tem membership criar um). Criar o negócio é o `POST /workspaces` de qualquer
  autenticado: 201, o Vic vira owner. O próximo `make seed` termina com **exit 2**: `erro: O workspace precisa de pelo
  menos um owner` em `delete from public.memberships … email = 'vic@hellosquad.example'` (`seed.sql:152-154`), porque o
  seed tira as memberships do Vic sem tirar antes os negócios que só ele integra (o que ele já faz com o Pedro, linhas
  127-143). Até alguém limpar à mão, `make seed`, `make test` e o teardown do `make e2e` falham. Segundo caso do mesmo
  tipo: um saldo informado pela tela Saúde (uso normal do painel) fica em `provider_health`/`provider_balance_reports`,
  o seed não o devolve, e `test_admin_sa4.py:467` assume "sem saldo informado" (o fixture limpa só **depois**): no clone,
  com o saldo que eu tinha informado no bloco 3, `assert 3 == 2`; o próprio fixture limpou e a reexecução passou.
- **Correção proposta.** O seed trata o Vic como o Pedro (apaga primeiro os negócios só dele, com a trilha deles, e
  depois as memberships) e devolve `provider_health`/`provider_balance_reports` ao estado que os testes esperam (ou o
  fixture prepara o estado antes do teste). Se o dono quiser o Super Admin longe do onboarding de cliente, é a pergunta
  do §e.
- **Prova.** `hsa/06_web_admin.txt` (última linha: destino do login do Vic) e `hsa/06e_vic_login.mjs`;
  `hsa/02_suporte.txt` (`POST /workspaces` 201 como Vic); `hsa/02b_suporte_escritas.txt` ("make seed: exit 2") e
  `hsa/02c_seed_quebra.txt` (erro completo e a limpeza); `hsa/10_clone_limpo.txt` (`assert 3 == 2` e a reexecução de `test_admin_sa4.py` +
  `test_email.py`: `1 failed, 18 passed`, a falha só a do e-mail, H-SA-07).

### H-SA-03 — Pagamentos promete o que já existe (🟡)

- **Cenário concreto.** O subtítulo de `/admin/pagamentos` é `pagamentos.desc`: "… As contas no Asaas e no Mercado Pago
  ainda não existem; **reprocessar webhook e conciliar chegam na SA6**." (en "arrive in SA6", es "llegan en la SA6").
  A SA6b entregou "Reprocessar" e "Marcar conciliação" por webhook nessa mesma tela (SA6b §1 item 3; o código está em
  `pagamentos/page.tsx:22-38`). O Vic lê que a função ainda não existe; com o seed, que não tem webhook, a tela não
  mostra nenhum botão que desminta o texto. O SA0 diz "Entra na Fase 2, com sandbox; hoje as contas no Asaas e no
  Mercado Pago ainda não existem."
- **Correção proposta.** Tirar a promessa nos três catálogos (voltar ao texto do SA0 sem a fase, ou dizer o que já dá
  para fazer) e um teste do catálogo que recuse "SA\d"/"Fase" em texto de tela já entregue.
- **Prova.** `apps/web/messages/*/admin.json` (`pagamentos.desc`, saída no §(c) bloco 6), captura
  `hsa/web/vic-pagamentos.png` × `hsa/web/sa0-pagamentos.png`.

### H-SA-04 a H-SA-06 — Diferenças do SA0 não registradas (🟡)

Lado a lado das 14 telas pela estrutura (título, abas, seções e botões de cada página do SA0 × a nossa, com o Vic) e
pelas capturas a 1440 (`hsa/06b_lado_a_lado_sa0.txt`, `hsa/web/sa0-*.png` × `hsa/web/vic-*.png`). Tudo o que aparece
nas tabelas §4 da SA2, SA3b, SA4b e SA6b ou nas decisões delas ficou de fora; sobraram estas:

- **H-SA-04, Catálogo** (SA2 §4 registra só a edição e a aba Integrações; SA6b §4, a edição por delivery):
  (a) o filtro por agente do SA0 são **chips com o agente mini e a contagem** ("Todos 46", "Nexo 4", "Bia 7" …); o
  nosso é um menu "Todos os agentes"; (b) o cabeçalho do cartão do agente perdeu "Projetos e coordenação · **4
  deliveries**", "**3 homologadas · 1 não iniciada**" e o link **"Abrir o agente"**; (c) os cartões de número perderam
  as linhas de apoio ("7 agentes · 23 integrações", "nenhuma: falta preço aprovado", "decisão comercial pendente", "7
  pelo motor · 15 por integração"); (d) integrações em texto corrido ("LLM API (escolher) + Supabase Auth/Postgres +
  Memória") em vez das etiquetas `LLM`, `Supabase`; (e) "Versão 3 · Ver histórico" no topo não existe.
- **H-SA-05, Pagamentos** (SA2 §4 registra só "Demonstração", conciliação por dia e chargebacks): as abas
  **Assinaturas / Recargas / Webhooks / Conciliação** viraram quatro seções empilhadas (Assinaturas, Cobranças e
  recargas, Webhooks recebidos, Falhas); o cartão do provedor perdeu "Conta no provedor", "Webhook", "Ambiente",
  "Integração (Adaptador único PaymentProvider, ADR-0008)" e "A validar (Pix recorrente e cartão recorrente)" e ganhou
  um terceiro cartão "Simulado (local)".
- **H-SA-06, Auditoria** (SA2 §4 registra cartões e filtro "Plataforma"): o botão **"Exportar CSV"** do SA0 não existe
  (0 ocorrência de CSV ou export em `app/admin` e `components/admin`).

**Correção proposta.** Registrar cada uma no relatório da fatia dona (SA2/SA6b) como pergunta ao Vic e ao Diogo, ou
voltar ao SA0 onde não depende de dado que falta (chips com contagem, cabeçalho do agente com contagem e link,
etiquetas de integração, abas de Pagamentos). Regra do dono: o combinado é o protótipo, tela por tela.

### H-SA-07 — Clone limpo seguindo o SETUP não fica verde (🟡)

- **Cenário concreto.** Clone do remoto (`4c21986`), `.env` de segundo checkout exatamente como o SETUP manda (o
  `API_DATABASE_URL` do dono; `API_PORT`/`API_URL` 8199, `WEB_PORT`/`NEXT_PUBLIC_SITE_URL`/`EMAIL_APP_URL`/
  `PAYMENT_BACK_URL` 3199), `make up`, `make migrate`, `make seed` exit 0. `make test`: web 473, ui 50, contracts 9,
  ruff ok, **pytest 323 de 325**. Uma das duas falhas era minha (H-SA-02, segundo caso). A outra é
  `test_events_reach_mailpit_in_three_languages_for_three_tenants`: `assert 'http://127.0.0.1:3100/app/vitta' in …`
  (`test_email.py:246`), porque o e-mail do clone sai, corretamente, com `http://127.0.0.1:3199/app/vitta` (conferido no
  Mailpit). Na árvore do dono (3100) o mesmo teste passa. Como o `make test` para no backend, o pgTAP nem roda (rodei à
  parte: `Files=32, Tests=862, Result: PASS`).
- **Correção proposta.** O teste monta o link esperado a partir de `EMAIL_APP_URL` das settings (como a renderização
  já faz), ou o SETUP avisa que o segundo checkout roda o `make test` com a URL do primeiro.
- **Prova.** `hsa/10_clone_limpo.txt` (os dois passos, a reexecução dos dois arquivos de teste, o link 3199 no Mailpit,
  o teste verde na árvore do dono e o pgTAP do clone); `hsa/10_clone_limpo.sh`.

### H-SA-08 a H-SA-13 (ℹ️)

- **H-SA-08.** Durante a sessão de suporte, escrita do produto por **id de objeto** (conversa, mensagem, aprovação,
  fato, sugestão: 11 das 18 rotas) responde **404 `not_found`**, não o 403 `support_session_read_only` que a SA6a §3.3
  promete ao Super Admin; as rotas por negócio dão o 403 certo (7). Nada é gravado em nenhum caso (Miolo idêntica antes
  e depois). Prova: `hsa/02b_suporte_escritas.txt`.
- **H-SA-09.** A API abre sessão de suporte em conta **suspensa** (201); só a tela da SA6b bloqueia ("como o SA0",
  commit `9711b69`). Se a regra do SA0 vale, ela pertence também à API. Prova: `hsa/03_escritas_auditoria.txt`.
- **H-SA-10.** Depois de "voltar versão", o run usa a v3 (conteúdo da v1, hash `fb290a332565` igual), mas
  `agent_prompt_versions.sources` aponta a **v1**, porque a tabela tem uma linha por hash (SA3a, decisão 4). A Qualidade
  "por versão de prompt" atribui à v1 o que rodou na v3. Prova: `hsa/04_squad_runtime.txt` ("v3 em sources: False").
- **H-SA-11.** Em `next dev` (a web do dono, 3100), o HTML de cada página logada leva no payload RSC a **sessão inteira
  do Supabase** (`access_token`, `refresh_token`, `user`), num chunk de depuração do React para `await cookies()`,
  legível por qualquer JS da página (`self.__next_f`), apesar do cookie httpOnly (H0-03, A1a); no `/admin` é o refresh
  token do Super Admin. No build de produção (`next build` + `next start` num worktree em `/tmp`, porta 3198) **não
  aparece**. Prova: `hsa/06c_sessao_no_html.txt` e `.mjs`.
- **H-SA-12.** Com o Vic em en ou es, todo o painel traduz (faixa de 2FA 16/16 telas), menos nome, resultado e
  integrações das deliveries do Catálogo, que vêm de `delivery_catalog` em pt-BR (um idioma só no banco). Prova:
  `hsa/06_web_admin.txt`, `hsa/web/vic-en-contas.png`, `vic-es-contas.png`.
- **H-SA-13.** "Informar saldo" (SA4b) usa `hs-btn--primary`, classe que o DS não tem (o primário é `hs-btn--pri`,
  `packages/ui/src/styles.css:42`): o botão aparece como texto. Registrado pela SA6b §7 e ainda aberto
  (`components/admin/health/BalanceDialog.tsx:105,119`).

## (c) O que tentei e NÃO quebrou

**1. Escalonamento** (`hsa/01_escalonamento.py`/`.txt`, `01b_user_metadata.*`). As **48 operações** `/admin/*` do
OpenAPI vivo, leitura e escrita, com **corpo válido** (a guarda tem de ser exercida, não um 422): Marina (owner), Carla
(editora), Pedro (sem negócio) e Juliana (owner) → **403 `platform_admin_only` nas 192**; sem token, chave publicável,
chave `anon` legada (JWT `role=anon`) e chave `service_role` legada como bearer → **401** nas 48 cada; tokens forjados:
payload da Marina com `platform_admin` e `app_metadata.role`, `sub` do Vic na assinatura da Marina, `alg: none`, HS256
assinado com o segredo padrão do Supabase local → **401** (a API só aceita ES256 pelo JWKS). A Marina grava no próprio
`user_metadata` `platform_admin: true`, `role: platform_admin`, `is_super_admin: true` (a Auth deixa; o token novo,
válido, carrega os campos) → 403 em leitura e escrita, porque `app.is_platform_admin()` lê `platform_admins` por
`auth.uid()`. Impressão digital do banco (17 contagens: auditoria, versões, preços, extrato, sessões, suspensões, "à
venda", runs) **idêntica antes e depois**. Data API: 23 de 24 tabelas e views do SA 401 (anon) / 403 (Marina, Pedro e
até o Vic); escrita direta (Marina e Pedro se pondo em `platform_admins`, Vic inserindo sessão sem motivo, ativando
versão, apagando auditoria, pondo à venda, reabrindo sessão) → 403 `42501` nas 7; GraphQL: 0 campo de consulta para
anon, Marina e Vic. Web: Marina, Carla e Pedro nas 16 telas do painel → só a página 403 honesta, nenhum nome de conta,
e-mail do Vic ou delivery; sem sessão → `/entrar` nas 16 (`hsa/06_web_admin.txt`).

**2. Papel privilegiado e sessão de suporte** (`hsa/02_suporte.*`, `02b_*`). Sem sessão, o Vic nas 30 rotas GET do
produto com os ids reais da Miolo e da Vitta: 17 × 403 `support_session_required`, 7 × 404, 200 só em `/me`
(memberships `[]`), `/workspaces` (`[]`) e as próprias preferências. Com sessão de 15 min na Miolo: 24 de 30 GET 200
(conteúdo real: 2 conversas), a Vitta continua fechada (mesmo resultado de sem sessão), cobrança 403 `owner_only`,
`/workspaces/{id}` 404 (registrado na SA6a §4.3); motivo curto, só espaços, 501 caracteres e duração 0/120 → 422;
segunda sessão → 409; 18 escritas com corpo válido → recusadas e a Miolo idêntica (15 tabelas, estados de aprovação e
de fatos). Encerrar → a leitura seguinte já é 403; `DELETE` de novo → 404. Vencer (prazo no passado, gatilhos
desligados só nesse UPDATE de simulação) → 403 na hora; reabrir depois → 201. Seis aberturas em paralelo → 1 × 201 e
5 × 409, 1 aberta no banco. Auditoria: `support.session_started`/`_ended` com autor, motivo, minutos, prazo e
`platform_admin`; `support_access_log` só cresce.

**3. Auditoria de cada escrita** (`hsa/03_escritas_auditoria.*`, `04_*`). Ajuste de crédito, suspender, reativar,
preço, homologação, à venda, plano, recarga, reenfileirar, cancelar, reprocessar, conciliar, saldo informado, regra de
negócio, rascunho, publicar e voltar versão do squad, sessão de suporte: **cada uma com evento**, autor = Vic,
`platform_admin: true`, motivo em `payload.reason` (regra de negócio e squad em `payload.note`, opcional — pergunta 2
da SA3b §6, não achado). Recusas (409/422) não gravam evento. `DELETE` em `audit_events` como `authenticated` →
`permission denied`.

**4. Versões do squad × runtime** (`hsa/04_squad_runtime.*`, worker simulado). Rascunho com marcador na seção "como
fala" do Otto: fora do preview ativo e do run seguinte (hash `fb290a332565` da v1; rascunho fora de `sources`), dentro
do preview com rascunho; publicar → run com hash novo `0fff429cb033` = preview publicado, versão nova em `sources`;
voltar à v1 → run com o hash da v1; ferramenta desconhecida → 422 `unknown_tool`; `agent.yaml` sem
`entregas.criar_versao` publicado → run **`failed tool_not_allowed`**, 0 versão de entrega; `agent.yaml` de volta →
run entrega. `make squad-export`: vazio sem mudança, só a frase do marcador com a v2, vazio depois de voltar e no fim;
no clone, "0 arquivo(s) regravado(s)".

**5. Cobrança e créditos.** `idempotency_key` repetida (até com valor 999) e 5 ajustes paralelos com a mesma chave → 1
lançamento; débito de disponível + 0,01 → 409 e nada muda; 5 débitos paralelos de metade + 1 → 1 × 201, 4 × 409, 0
grant negativo; zero, 3 casas, não numérico, motivo curto → 422. Suspender → assinatura `active`, sai da renovação
(`app.billing_due_subscriptions` de 1 para 0), rotina `scheduled` recusada com `HS423`, a Marina vê
`workspace_status: suspended`; reativar → volta à renovação e a rotina entra na fila; suspender/reativar duas vezes →
409. Reprocessar com o provedor simulado → `provider_unknown`, grants iguais; conciliar 201 e de novo 409. A
idempotência do grant está no banco (`billing:payment:<id>` e `grant_id is null`, `20261016210000_billing.sql:502-516`)
e no pytest da SA6a com o provedor dizendo "confirmed".

**6. Valores e segredos.** Catálogo 46/46 com preço provisório e profundidade inferida, 0 à venda; à venda sem
homologação → 409, homologada com preço provisório → 409, aprovado e provisório juntos → 422, homologada com preço
aprovado → 200; reabrir homologação ou pôr preço provisório numa delivery à venda → 409; plano e recarga à venda com
preço provisório → 409; versão antiga do plano intacta; faixas dos alertas todas `proposal: true`. Em 28 respostas GET
de `/admin/*` (217 KB, com o Vic): **0** ocorrência de `sb_`, `eyJ`, `ASAAS`, `MP_`, `ANTHROPIC`, `sk-ant` ou do valor
de qualquer segredo do `.env`; nenhum domínio de nuvem; chaves só `missing`/`not_applicable`.

**7. Consumo, qualidade e saúde** (`hsa/05_consumo_email.*`, Trilha, hoje). Duas legendas do Otto, uma aprovada de
primeira e outra com ajuste: `/admin/consumption` = SQL nas tabelas cruas nas 7 grandezas (2 pedidos, 30 créditos, 9
chamadas, US$ 0,102580, 11.090/2.650 tokens, 3 turnos); Qualidade 2/1/1/0 e custo por aprovada 0,051290 iguais à conta
à mão; Modelos por modelo = SQL; Saúde Anthropic 0 → 9 chamadas e US$ 0,102580 em 24 h. Etapa fictícia de US$ 5 →
IA por crédito R$ 0,9185, alertas de IA por crédito e margem marcados proposta, a Trilha em `/admin/alerts`, e nada
mudou (saldo, estado, planos, provedores); sem a etapa, o alerta some.

**8. E-mail da sessão de suporte** (Mailpit). Marina (pt-BR) "O suporte do HelloSquad entrou em Miolo" / "Olá,
Marina."; Rafael (en) "HelloSquad support entered Vitta Estética" / "Hi Rafael,"; Juliana (es) "El soporte de
HelloSquad entró en Trilha Urbana" / "Hola, Juliana:"; motivo no corpo nos três.

**9. Web `/admin`** (`hsa/06_web_admin.*`). Vic nas 16 telas: 200, `<meta name="robots" content="noindex…">` 16/16,
`X-Robots-Tag: noindex, nofollow` 16/16, faixa de 2FA 16/16, nenhum erro de console. Catálogos `admin.json` com as
mesmas **1.122 chaves** em pt-BR, en e es, nenhum valor vazio; varredura de texto fixo em 40 arquivos do painel: 0
(fora "HelloSquad" e um nome de arquivo); formatação de número e data pelo idioma da pessoa. Vic em en e es: faixa
traduzida 16/16 (as palavras pt-BR que sobraram são "Catálogo", correta em espanhol, e o nome de uma delivery, H-SA-12).

**10. Clone limpo** (`hsa/10_clone_limpo.*`): ver H-SA-07; com o banco no seed, só o teste da porta falha; pgTAP do
clone `Files=32, Tests=862, PASS`.

## (d) Veredito por fatia e da trilha

| Fatia | Veredito | Base |
|---|---|---|
| SA1 schema e leitura | ✅ com 🟡 H-SA-02 (seed) | 48 operações × 4 personas 403; tokens forjados 401; 23/24 tabelas fechadas na Data API; GraphQL vazio |
| SA2 UI de leitura | ✅ com 🟡 H-SA-04, H-SA-05, H-SA-06 | 403 honesto, noindex, 2FA; três telas com diferenças do SA0 não registradas |
| SA3a squad versionado | ✅ (ℹ️ H-SA-10) | rascunho fora, publicar e voltar mudam o run seguinte; `tool_not_allowed`; export limpo |
| SA3b UI Squad IA | ✅ | diferenças da Alma, Skills e Regras estão registradas |
| SA4a consumo, qualidade, saúde | ✅ | números = SQL; alerta cruza e só avisa; saldo auditado |
| SA4b UI | ✅ (ℹ️ H-SA-13, registrado) | telas lidas com o Vic nos três idiomas |
| SA6a escrita e suporte | ✅ com 🟡 H-SA-01 (ℹ️ H-SA-08, H-SA-09) | só leitura, prazo e encerramento na hora; créditos e "à venda" resistiram |
| SA6b UI de escrita | ✅ com 🟡 H-SA-03 | ações com motivo; texto de Pagamentos defasado |
| **Trilha SA** | ✅ **sem 🔴** | segurança, auditoria, cobrança e runtime resistiram; 7 🟡 de higiene, texto e protótipo |

Como QA sou consultivo: recomendo tratar **H-SA-01** e **H-SA-02** já (pequenos, mecânicos e com teste), **H-SA-03**
junto (uma linha em três catálogos), levar **H-SA-04 a H-SA-06** ao Vic e ao Diogo como diferenças a decidir, e
**H-SA-07** como ajuste de teste. Quem aceita ou devolve é o Thor.

## (e) Perguntas ao dono

1. **O Super Admin pode ter negócio de cliente com o mesmo login?** O `SUPER_ADMIN.md` §1 fala em "papel de
   plataforma, não de workspace" e "login próprio"; hoje o `/entrar` é o mesmo do produto, leva o Vic ao onboarding
   ("Comece pelo seu negócio.") e o produto deixa criar (H-SA-02). Nem o plano SA nem as diretrizes respondem.

As demais dúvidas que encontrei já têm resposta no plano (leitura conservadora das 8 perguntas) ou estão registradas
como perguntas nas fatias (motivo opcional no squad, efeito da suspensão no trabalho interativo, run agendado já na
fila, "ver como o cliente").

## (f) Estado em que deixei a máquina

- Banco no estado do seed: `make seed` às 00:54 e conferido (`/tmp/hsa_estado_final.txt`): saldos Miolo 36, Trilha
  19,20, Vitta 20, as três ativas; só os três negócios do seed; 0 membership do Vic e 1 Super Admin; 0 sessão de
  suporte aberta; 0 saldo informado e 0 relatório de saldo; squad, planos e diretrizes na versão 1; 04.01 com uma versão
  de preço provisória; 0 à venda e 0 homologada; filas `runs_interactive`, `email_outbox` e `memory_reflect` vazias;
  `user_metadata` das seis pessoas sem `locale` e sem campo de Super Admin; 0 resíduo meu (evento de webhook, run,
  negócio `suporte-hsa`). A auditoria dos meus testes ficou (1.526 eventos; nada da auditoria foi apagado por mim).
- API (8100) e web (3100) do dono **no ar o tempo todo**, nunca parados nem reiniciados (`/health` ok e web 200 às
  00:55). O `next build` rodou num worktree em `/tmp/hsa_web` com `next start` na 3198, parado e removido; o clone em
  `/tmp/hsa_clone` (8199/3199, nunca subiu servidor) também removido, com o `.env`. `git status squad/` vazio.
- Nenhum worker, scheduler, servidor ou browser meu no ar. Só os containers `supabase_*_hellosquad` foram usados.
- O Mailpit guarda os e-mails dos testes (fictícios, `.example`); não apaguei.
- Lições de método: (1) **resíduo meu derrubou um teste do clone** (saldo informado do bloco 3, H-SA-02): bloco que
  grava pelo painel precisa devolver também o que o seed não devolve; (2) `flock … make seed` de fora **trava em si
  mesmo** (o `make seed` pede a mesma trava): dentro da trava, `HELLOSQUAD_DB_LOCK_HELD=1`; matei o meu processo às
  00:54, sem efeito no banco.
