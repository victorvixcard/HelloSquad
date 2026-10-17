# SA6b — UI das ações de escrita do Super Admin · relatório

Aranha (Frontend & Design), 16–17/10/2026, 23:46–00:20, sozinha na árvore, sem sub-agentes. Área tocada: `apps/web` (ações de servidor, diálogos e páginas de Contas, Catálogo, Planos e recargas, Fila, Pagamentos; casca do painel; `admin.css`; catálogo `admin` nos 3 idiomas; Vitest e e2e) e os documentos da fatia. Nada em `apps/backend`, `supabase/`, `packages/contracts` ou `packages/ui`. Skill principal `frontend-vix` e apoio `verification-before-completion` indicados no briefing: **não abri o `SKILL.md` de nenhuma das duas**; o desenho vem do SA0 e da casca da SA2/SA3b/SA4b, e a verificação segue a régua do time (evidência colada abaixo).

## 1. Entregue

| # | Item | Onde | Conteúdo | Commits |
|---|---|---|---|---|
| 1 | **Detalhe da conta** e lista | `app/admin/(painel)/acoes.ts`, `components/admin/actions/{ActionDialog,AccountActions,RecentAudit}.tsx`, `contas/[id]/page.tsx`, `contas/page.tsx` | **Entrar no ambiente** (primário, como o SA0): diálogo com motivo (10–500, contador "N de 500") e duração 15/30/60 (padrão 30) → `POST …/support-session`; o texto diz que é só leitura e que o titular recebe e-mail. **Sessão ativa** (a de quem está no painel: sem fim, prazo no futuro, `admin_email` = `GET /admin/me`): faixa "Suporte" com "Sessão de suporte ativa até HH:MM", "Faltam N min" (atualiza a cada 15 s; ao vencer relê a página), o motivo e **Encerrar sessão** (confirmação, sem motivo: a API não pede) → `DELETE`; "Entrar" fica desabilitado com o motivo no nome acessível (sessão aberta; conta suspensa, como o SA0; conta excluída). **Ajustar crédito**: valor com sinal e até 2 casas ("-5,50", "+10"), "Saldo: 36 → 41" no rodapé, motivo, `idempotency_key` (UUID) gerada ao abrir; o aviso diz "saldo antes → depois" ou, repetido, "nada mudou"; 409 ("disponível X, débito Y") fica no diálogo. **Suspender / Reativar** com motivo; faixa "Conta suspensa." com o motivo; estado `suspended` (Status "pause" do SA0, motivo no `title`) e o filtro **Suspensas** na lista. **Auditoria desta conta**: as últimas ações do Super Admin aqui (sessão, crédito, suspensão), relida a cada ação, com "Ver tudo na Auditoria" filtrado | `be834c8`, `8b91c14`, `15d9d29`, `cb91bd1`, `9711b69` |
| 2 | **Catálogo** e **Planos e recargas** | `actions/{CatalogActions,OfferActions}.tsx`, `catalogo/page.tsx`, `planos/page.tsx` | Catálogo: coluna **Editar** por delivery → diálogo "{id} · {nome}: preço e venda" com três modos, cada um com motivo: **Preço** (créditos, revisão, Provisório marcado por padrão, Preço aprovado; aprovado e provisório juntos não chegam à API) → `PUT …/price`; **Homologação** (5 estados) → `PUT …/homologation`; **À venda** → `PUT …/for-sale`, e o 409 vira a mensagem do servidor ("Só vai à venda com a homologação concluída."). A nota "Nada está à venda" só aparece enquanto for verdade. Planos e recargas: **Editar como versão nova** em cada cartão → diálogo "{nome}: versão N+1" com créditos, ciclo (plano), validade, preço, moeda, Provisório, Preço aprovado e **À venda travado** até o preço ser aprovado e não provisório (como o `toggleVenda` do SA0); o preço do plano só vai quando muda; "à venda" sempre explícito. **Versões gravadas pelo painel** (da Auditoria, só leitura, "Atual" na versão vigente do plano) | `7f04d82`, `8a1e0dc` |
| 3 | **Fila** e **Pagamentos** | `actions/OpsActions.tsx`, `fila/page.tsx`, `fila/[run]/page.tsx`, `pagamentos/page.tsx` | Fila: coluna **Ações** na lista e no cabeçalho do run, só com a ação que o estado aceita: **Reenfileirar** (falhou, cancelado) e **Cancelar** (na fila, esperando aprovação), com motivo; 409 ("já reservou créditos") fica no diálogo; **Auditoria da fila**. Pagamentos: por webhook, **Reprocessar** (só o que falhou, como o SA0) com o resultado no aviso (aplicado, sem mudança, **duplicado** — mesmo id, nada se repete —, provedor simulado sem estado) e **Marcar conciliação** (some depois de marcada; "Conciliado em …" com o motivo no `title`); **Auditoria de pagamentos** | `2b63d96`, `9711b69` |
| 4 | **Toda ação** | `ActionDialog.tsx`, `(painel)/layout.tsx`, `AdminPage.tsx`, `admin.css`, `messages/*/admin.json` | Confirmação, motivo com contador quando a API pede, validação antes da API, erro da API no diálogo (`role="alert"`, campo marcado no 422), botões pelo `Button` do DS (envio com o estado "loading" do DS, sem clique duplo), aviso do resultado **na casca** (`ActionNoticeHost`, sobrevive à linha que muda de estado), `router.refresh()` (a entrada nova aparece na auditoria da tela sem recarregar; a tela Auditoria é dinâmica e já abre com ela). Etiqueta do topo **"Ações com motivo e auditoria"** nas telas com escrita. Rótulos em **pt-BR, en e es** (`admin.acoes.*`, `codes.accountStatus.suspended`, `codes.homologation.awaiting_integration`, `shell.audited`); chaves sem uso removidas (`conta.act*`, `fila.requeue/cancel`, `pagamentos.reprocess/reconcile`, `catalogo.edit`, `planos.edit`, `common.comesIn`) | `8b91c14`, `cb91bd1`, `954a201`, `7927744`, `9e9df78` |
| 5 | **Testes, lado a lado, relatório** | `test/SA6b.test.tsx` (18), `e2e/sa6b-acoes.spec.ts` (2), `e2e/sa2-admin.spec.ts` (1 linha), `docs/parciais/sa6b/` | §2 | `fe5f9e0`, `b99b233` … `e9d22e5`, `61e5c8e`, este |

## 2. Como foi verificado

Build e e2e **só no worktree `/tmp/sa6b-wt`** (último no commit `9711b69`), web de produção na **3200**; a web do dono na 3100 ficou no ar e só recebeu leitura (`curl`). Banco pela trava (`flock -o -w 600 /tmp/hellosquad-db.lock`), sem esperar; só o container `supabase_db_hellosquad`. Saídas completas em `/tmp/sa6b/*.log`.

EVIDENCIA_AQUI

## 3. Decisões (onde o briefing e o SA0 não definem; nada do combinado foi mudado)

1. **Um diálogo para toda ação** (`ActionDialog`): o mesmo desenho do SA0 (título, descrição, campos, motivo, rodapé com resumo à esquerda, Cancelar e a ação), motivo validado na tela pela mesma regra do banco (`app.admin_reason`: 10 a 500 depois de tirar os espaços).
2. **Aviso do resultado na casca**, não no botão: depois do `router.refresh()` a linha pode mudar de estado (run reenfileirado sai do filtro "Falhou") e o botão que abriu o diálogo some; o aviso continua.
3. **"Entrada nova na Auditoria sem recarregar"**: cada tela de escrita ganhou um cartão de auditoria da tela (últimas 5 ações do Super Admin daquela tela, de `GET /admin/audit?actor=platform_admin`, filtradas pelos códigos de ação da tela), relido junto com a página a cada ação, com link para a Auditoria filtrada. A tela Auditoria não mudou.
4. **Sessão ativa derivada do detalhe da conta** (`support_accesses` + e-mail do `GET /admin/me`), porque a API não tem leitura da sessão aberta (§5.4).
5. **Chave de idempotência gerada ao abrir** o diálogo de crédito; reenviar depois de um erro usa a mesma chave (nada foi lançado), reabrir gera outra.
6. **Preço do plano só é enviado quando muda** (senão a API criaria linha nova em `plan_prices` sem mudança) e **"à venda" sempre explícito** com o valor atual (a SA6a §5.6 avisa que omitir tira de venda).
7. **Etiqueta "Ações com motivo e auditoria"** no lugar de "Só leitura" nas telas com escrita (a SA2 escolheu "Só leitura" porque tudo era leitura; deixou de ser verdade nessas telas).
8. **Seis tokens do SA0** (`--e1-apoiado`, `--e2-flutuante`, `--halo-campo`, `--r-acao`, `--r-caixa`, `--r-painel-s`) eram usados pelo CSS portado e não estavam declarados no painel: campos sem contorno, inclusive nos diálogos. Declarei no `admin.css` (`.sa, .sa-ovl`) apontando para os tokens do DS com os mesmos valores do `app/tokens.css` do SA0. Vale para todo o painel (o campo de busca de Contas e o "Informar saldo" da SA4b também ganham o contorno do SA0).

## 4. Divergências do SA0 (lado a lado em `docs/parciais/sa6b/lado-a-lado-*.png`)

| Tela | SA0 | Nosso | Por quê |
|---|---|---|---|
| Suspender | "Os membros perdem o acesso aos agentes e as rotinas param." | "A renovação da assinatura e as rotinas agendadas param; a assinatura não é cancelada e nada é apagado. Os membros veem o aviso de conta suspensa." | O texto diz o que a API da SA6a faz (leitura conservadora da pergunta 4 do SA0); a faixa diz "Renovação e rotinas pausadas; nada foi apagado." |
| Sessão ativa | "Neste protótipo, a sessão não abre o produto." | "Só leitura: as telas do produto ainda não abrem para o suporte; a API do produto já responde à leitura." | É o estado real (§5.1). |
| Catálogo | Edição da tabela inteira e "Salvar o catálogo como versão N" | "Editar" por delivery, com Preço / Homologação / À venda, cada um com motivo | A API grava cada mudança por delivery, com motivo próprio (SA6a). |
| Ajustar crédito | Créditos inteiros (`step 1`) | Até 2 casas | A API aceita 2 casas. |
| Reenfileirar | Sem diálogo (aviso) | Diálogo com motivo | A API pede motivo. |
| Conciliação | Por dia (esperado × recebido) | Por webhook | A API concilia por webhook. |
| Rótulos dos botões do cabeçalho da conta | "Suspender conta", "Reativar conta", "Entrar no ambiente do cliente" | "Suspender", "Reativar", "Entrar no ambiente" | Mantive os rótulos que a SA2 já tinha na tela; os botões de confirmação dos diálogos são os do SA0 ("Suspender conta", "Reativar conta", "Entrar com o motivo registrado", "Lançar ajuste"). |
| Duração | `Segmented` do DS | Rádios no desenho `sq-seg` (o mesmo da autonomia na SA3b) | Mesmo componente que o painel já usa para escolha única em formulário. |

## 5. O que a API precisa (para a próxima fatia do Stark)

1. **Histórico de versões**: `GET /admin/plans/{slug}/versions`, `GET /admin/topups/{slug}/versions` e `GET /admin/catalog/{tipo}/prices`. Hoje o histórico vem da Auditoria (`admin.plan_versioned`/`admin.topup_versioned`): a versão 1 do seed não aparece e o "Atual" só dá para marcar no plano (o evento da recarga não traz versão).
2. **`suspended_at` no resumo da conta** (`AccountSummary`): a faixa diz "Conta suspensa." sem a data.
3. **Filtro por ação em `GET /admin/audit`** (`action=` ou lista): a auditoria da conta lê 100 itens do Super Admin e filtra na tela; `support.account_viewed` (gravado a cada abertura do detalhe) disputa essa janela.
4. **Leitura da sessão aberta** (`GET /admin/accounts/{id}/support-session` de quem pergunta).
5. **Mensagens de 409/404 no idioma da tela**: hoje vêm em pt-BR do banco (en e es recebem a padrão do catálogo do backend).

## 6. Perguntas ao dono (segui a leitura conservadora)

1. **"Ver como o cliente"**: o produto resolve o negócio pelos memberships de `GET /me` (`app/app/[workspace]/layout.tsx` → `notFound()`), então não abre para o Super Admin em sessão. Abrir as telas do produto em modo leitura para o suporte muda o produto (layout, barra, ações escondidas). Autoriza essa fatia?
2. **Catálogo por delivery** (três ações com motivo cada) no lugar do "salvar o catálogo como versão N" do SA0: confirma?
3. **Cartão de auditoria no pé das telas de escrita** (§3.3): fica?
4. **Reprocessar só webhook que falhou** (SA0); o "recusado" entrou junto. Quer também para "ignorado"?
5. **Tokens do SA0 declarados no painel** (§3.8): ok? Muda o contorno dos campos em todo o painel, para o desenho do SA0.
6. (Da SA6a, seguem abertas) duração e aviso da sessão de suporte; ajuste de crédito sem limite; efeito da suspensão; "à venda" exige homologação e preço aprovado.

## 7. O que ficou de fora

- **"Ver como o cliente"** (§6.1): não há link; a faixa diz o estado real.
- **Rótulo por código das ações na Auditoria** (a SA6a sugeriu `support.session_started` etc. no catálogo): a tela Auditoria mostra o código como a SA2 combinou; não mudei.
- **Botões `hs-btn--primary`** de outras fatias (o "Informar saldo" da SA4b, links "Voltar à lista"): essa classe não existe no DS (o primário é `hs-btn--pri`); não mexi fora do apontado. Os desta fatia usam o `Button` do DS.
- **Edição de regras por tarefa e de preços de modelos** (Modelos e custos): fora do briefing; o botão segue "em breve".
