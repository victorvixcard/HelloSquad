# SA0 — Protótipo navegável do Super Admin · relatório

Aranha (Frontend & Design), 16/10/2026, 08:51–10:00. Escopo: `docs/SUPER_ADMIN.md` §2 (todas as telas) e §6 (o que o protótipo precisa provar). Nada em `apps/`, `packages/`, `supabase/` ou `docs/parciais/A1f*` foi tocado; do backend só li `llm/pricing.py`, `squad/prompt.py` e `squad/loader.py` para reproduzir preço e montagem do prompt. Três ajudantes fizeram 12 das 17 telas em paralelo, com a mesma casca; eu fiz a casca, os dados, Contas, Conta, Squad e Agente, e integrei e revisei tudo.

## 1. O que foi feito

Protótipo estático e navegável em `design/super-admin-proto/`, no mesmo formato do handoff do Diogo: páginas HTML com React 18 UMD, `bundle.css` e `bundle.js` do DS (`window.HelloSquad`) e `tokens.json`, copiados byte a byte de `design/handoff-v4.6/product-ui/` para dentro da pasta. Fontes Gabarito e JetBrains Mono via Google Fonts, importadas pelo próprio `bundle.css`.

- **17 páginas, uma rota por tela, com a mesma casca:** barra lateral com os grupos Operação e Squad IA (nas páginas do squad, os sete aparecem como subnavegação com o `Agent` mini do DS); wordmark "HelloSquad" em Gabarito 800 com a etiqueta "Super Admin"; trilha; etiqueta "Dados fictícios"; e a faixa "Verificação em duas etapas desligada" em todas as páginas, que abre o fluxo demonstrativo do código TOTP.
- **Operação:** Contas (cartões, busca, filtros, tabela) e detalhe da conta (membros, extrato que fecha com o saldo, acessos do suporte, uso; "Entrar no ambiente do cliente" com motivo obrigatório e duração; ajuste de crédito com motivo; suspender e reativar); Catálogo (46 deliveries por agente, preço provisório editável, travas "preço aprovado comercialmente" e "à venda", integrações, homologação, salvar como versão nova; aba das 23 integrações); Planos e recargas (cartões editáveis, R$ por crédito com a conta feita, trava de venda); Pagamentos (Asaas e Mercado Pago com "conta não criada"; "Estado atual" vazio e honesto e "Demonstração" com assinaturas, recargas, webhooks idempotentes e conciliação); Auditoria (filtros Tudo, Super Admin, Clientes e Sistema, conta, tipo, período).
- **Squad IA:** Squad (palco do DS com os sete e olhos que acompanham o cursor, mais a lista com cor, forma, papel, modelo e esforço, deliveries, versão do prompt e custo médio); Agente com quatro abas (Alma, Skills, Ferramentas e limites, O que ele lê); Regras de negócio (marcação por parágrafo, flag "entra no prompt"/"referência interna", edição com versão); Referências (brandbooks, fontes e moods, "a IA usa em", estado vazio); Motor de imagem (seis etapas com Pessoa/IA/Código em texto editável, aviso "motor do Vic, em integração"); Modelos e custos (Custos, Regras por tarefa, Preços e câmbio); Consumo por cliente (alertas econômicos com faixas); Saúde das APIs (um cartão por provedor, saldo informado com alerta); Fila de trabalhos (status vivo do squad, reenfileirar, cancelar com motivo, passos do run); Qualidade das entregas (como ler, por tipo, por mês, comparar meses).
- **Fonte real onde ela existe:** `tools/gerar_dados.py` lê `squad/*/agent.yaml` (inclusive os comentários de cada ferramenta), `SOUL.md`, `skills/*.md`, a seção de regras compartilhadas de `squad/README.md` (mesmo recorte do backend) e o CSV do catálogo, e gera `app/data-squad.js`; gera também `app/tokens.css` a partir do `tokens.json`. A Alma mostra as seções reais de cada SOUL, com data do git e contagem de palavras; Skills mostra as duas skills que existem (01.01 e 04.01) e estado vazio honesto nas outras 44.
- **"O que ele lê" reproduz o runtime:** blocos na ordem de `squad/prompt.py` (regras compartilhadas + SOUL; skill em cache; idioma, marca e fatos em cache; mensagem com trabalho, histórico, pedido, briefing e etapa), `{{marca.nome}}` preenchido pela conta de exemplo. O hash do prompt é calculado como no `squad/loader.py` e **confere com o loader do backend**: otto/04.01 `fb290a332565`, nexo/01.01 `b1623f1c52c9`.
- **Custo de IA calculado, não digitado:** o consumo fictício de cada conta está em tokens por modelo; o custo sai da tabela de `llm/pricing.py` (Opus 5.5 US$ 4/20 por milhão, cache lido 0,20; Haiku 4.5 US$ 1/5, cache lido 0,10). Consumo, Modelos e custos, Saúde das APIs e o detalhe da conta usam os mesmos números e os totais batem com as tabelas (verificado no teste).

## 2. Como abrir

```bash
cd design/super-admin-proto && python3 -m http.server 8020 --bind 0.0.0.0
```

http://localhost:8020/ (redireciona para Contas). O servidor ficou no ar (`nohup`, log em `/tmp/sa0_http.log`), com o mesmo bind da 8010.

## 3. O que do DS foi reaproveitado e o que foi composto

| Do DS (`window.HelloSquad`), sem recriar | Onde |
|---|---|
| `Agent` | barra lateral, Squad, Agente, Catálogo, Fila, Qualidade, Referências, Motor, Regras, avisos |
| `SquadStage` | Squad (os sete como squad, olhos vivos; o próprio componente respeita movimento reduzido) |
| `ApprovalCard` | Agente › Alma: "Versão N pronta para publicar" (Publicar · Comparar versões · Descartar) |
| `StatePill`, `SquadStatus`, `SquadStack` | Agente e Fila (agente e etapa), topo da Fila (run vivo), Regras e Ferramentas (quem lê, colaboradores) |
| `Button` (primary, soft, ghost, s), `IconButton` (com o `Icon` do DS) | todas as ações |
| `CommandField` | buscas (sem o envio: filtra enquanto digita, Esc limpa) |
| `Select` + `Menu` | seletores (setas, Esc devolve o foco) |
| `Segmented`, `Checkbox`, `Tag`, `Kbd` | filtros, travas "preço aprovado"/"à venda", "entra no prompt", etiquetas Pessoa/IA/Código, marcações |

| Composto com tokens (o DS não tem) | Base visual |
|---|---|
| Casca, barra lateral, trilha | barra lateral da Product UI V4.6 (mesmas medidas e estados) |
| Aviso de 2FA | faixa "Precisa de você" da V4.6 (Tinta, uma linha, ação à direita) |
| Cartão (superfície A), grupo (superfície B), cartão de número | superfícies A/B da V4.6; número em Gabarito 800 |
| Tabela | cabeçalho em mono 10 px (`hs-kbd`), linhas separadas por L1, hover em Papel |
| Abas | segmentado da V4.6 com papel de aba (`role=tab`, setas, Home e End) |
| Status | "um desenho por estado" da V4.6: Tinta = precisa de você; contorno = em andamento; Névoa com check = ok; hachura = bloqueado; coral claro = erro; tracejado = rascunho/provisório |
| Marcações `[DECIDIDO] [BASE ATUAL] [PENDENTE] [PROPOSTA]` | `Tag` do DS: ok, auto, you (com "!" coral), sim tracejada |
| Diálogo, campo, aviso flutuante | contorno E1 do campo, E2 flutuante, halo de foco, toast da V4.6 |

**Sem cor nova:** as únicas cores escritas no código das telas e da casca são alfas de Tinta `rgba(15,13,34,…)`, de Papel `rgba(247,247,245,…)` e do coral `rgba(255,77,31,…)`, os mesmos que a Product UI V4.6 usa; o resto vem de `var(--hs-*)`. Cor de agente só onde o agente está (`Agent`, e a amostra de cor na lista do Squad). Ícones de navegação: os traços do objeto `IC` da Product UI V4.6 (mesma grade 18 e traço arredondado), porque o `Icon` do DS tem 11 glifos e nenhum de navegação.

## 4. Decisões tomadas onde o SUPER_ADMIN.md não define (nada do combinado foi mudado)

1. **Etiqueta "Super Admin" ao lado do wordmark**, no lugar onde a Product UI põe a etiqueta DEMO. O wordmark continua o texto vivo provisório do DS.
2. **Faixa de 2FA em todas as páginas**, porque o §1 pede o aviso "enquanto estiver desligada".
3. **Kiwi aparece como Growth Marketing** (decisão de 15/10): o `SquadStage` é usado sem os nomes embutidos do DS, que ainda dizem "Mídia".
4. **Cenário fictício de operação** (12 contas: as três de `DADOS_FICTICIOS.md` e nove inventadas, e-mails `.example`, sem CPF/CNPJ) para as telas aparecerem cheias. Onde o estado real é conhecido e diferente, a tela diz: Asaas e Mercado Pago "conta não criada"; motor de imagem "em integração"; Anthropic com a nota "hoje o runtime está em modo simulado"; Catálogo com a nota de que só 01.01 e 04.01 têm skill escrita.
5. **Preço e créditos sempre marcados** "Provisório" ou "Exemplo"; nada está "à venda", porque a trava "preço aprovado comercialmente" está desmarcada em tudo (Documento Mestre §13). Os preços por modelo levam "Conferida em 16/10/2026", porque são os reais do provedor.
6. **Sessão de suporte** com duração (15, 30 ou 60 min) e motivo de 10 caracteres ou mais; neste protótipo não abre o produto.
7. **Motivo também em cancelar run e em marcar conciliação**, seguindo "sempre com motivo e auditoria".
8. **Esforço por agente** (como no `agent.yaml`): em Regras por tarefa o seletor de esforço fica só na linha "Padrão"; a triagem do Nexo usa Haiku, que não recebe esforço, e mostra o orçamento de thinking de `flow.py`.
9. **Faixas dos alertas econômicos** são proposta do protótipo e aparecem marcadas assim; nada muda automaticamente.

## 5. Perguntas para o Vic

**Contas e suporte**
1. A sessão de suporte é só leitura ou o suporte pode agir pela conta (aprovar, editar)? Duração padrão? O dono da conta é avisado na hora?
2. Quem mais é Super Admin, e se há papéis dentro do painel (só leitura × edição). Quem pode marcar um parágrafo como "Decidido": só você?
3. Ajuste manual de crédito tem limite por ajuste ou pede segundo aprovador?
4. Ao suspender uma conta, o que acontece com a assinatura no Asaas/Mercado Pago e com as rotinas agendadas?

**Catálogo, planos e créditos**
5. "À venda" deve exigir também a homologação concluída, além do preço aprovado?
6. A profundidade de cada delivery (orientar, produzir, executar, otimizar) foi inferida do catálogo: confirma?
7. As deliveries de coordenação do Nexo (01.01 a 01.03) ficam sem custo em crédito ("incluído")?
8. Os campos do plano bastam (preço, créditos por ciclo, bônus, validade, rollover em % do ciclo, membros)? No anual, os créditos entram por mês e o bônus incide sobre cada mês?
9. Uma versão nova de plano vale para quem já assina, na renovação, ou só para assinaturas novas?
10. Nos valores de exemplo, a Recarga 1.000 sai ~10% mais barata por crédito que o Pro mensal. É o que você quer?

**Custos e alertas**
11. As faixas propostas valem? IA por crédito até R$ 0,15; margem bruta estimada a partir de 65% com o crédito a R$ 0,50; custo por turno até +10% em 7 dias. E o alerta do conjunto deve virar "Atenção" quando alguma conta sai da faixa (hoje o conjunto fica OK com 3 contas em atenção)?
12. Conta Free que só gera custo de conversa, sem crédito cobrado, deve gerar alerta?
13. Câmbio informado à mão (como está) ou lido de uma API de cotação?
14. O alerta de saldo do provedor deve ser em US$ ou em dias de duração no ritmo atual?

**Squad, regras e motor**
15. Parágrafo marcado como "Proposta" entra no prompt? Hoje só "Pendente" fica de fora com garantia.
16. Esforço continua por agente ou passa a ser por etapa?
17. Motor de imagem: as seis etapas e quem faz cada uma (Pessoa, IA, Código) são rascunho; quantas variações por peça e qual o limite de ajustes que não cobram de novo?
18. Referências são repertório da plataforma (curadoria sua) ou material de cada cliente (como no exemplo)?

**Fila, segurança e idioma**
19. Reenfileirar zera as tentativas? E a cobrança de crédito num run cancelado?
20. 2FA só com TOTP ou também chave de segurança (WebAuthn)?
21. Os dois provedores de pagamento ficam ativos ao mesmo tempo? Qual é o padrão para cartão, Pix e boleto?
22. O Super Admin fica só em pt-BR, mesmo com contas em inglês e espanhol?

## 6. Como foi verificado

Rodado no estado final, com a porta 8020 no ar (saídas completas em `/tmp/sa0_*.log`):

| Verificação | Comando | Resultado |
|---|---|---|
| Capturas 1440×900, uma por tela (19 PNG, o Agente com as 4 abas) | `node design/super-admin-proto/tools/capturar.cjs` | 19/19 com `erros=0`; "total de erros de console: 0" |
| Mesmas telas a 1280×800 | `SA0_W=1280 SA0_H=800 node …/capturar.cjs /tmp/sa0-1280` | 19/19 com `erros=0` |
| Transbordo horizontal (22 rotas × 2 larguras) | `node …/tools/medir-larguras.cjs <rotas>` | 44/44 sem transbordo na página nem nas tabelas |
| Interação: busca, seletor por teclado, Esc devolvendo o foco, 2FA, motivo obrigatório, abas com setas e hash, rascunho → `ApprovalCard` → versão 2, trava de venda, salvar só com mudança, demonstração de pagamentos, filtro da auditoria, movimento reduzido | `node design/super-admin-proto/tools/testar.cjs` | 30/30 |
| Interação: Consumo, Saúde, Fila, Qualidade (totais = soma das linhas, saldo e alerta, reenfileirar, cancelar, abas, comparar meses) | `node …/tools/testar-consumo-saude-fila-qualidade.cjs` | 52/52 |
| Interação: Regras, Referências, Motor, Modelos (editar com versão, ativar/desativar, cadastrar, câmbio recalculando os reais) | `node …/tools/testar-regras-referencias-motor-modelos.cjs` | 57/57 |
| DS e React iguais ao handoff | `sha256sum -c` contra `design/handoff-v4.6/product-ui/` | 6/6 OK |
| Hash do prompt igual ao do backend | `SquadLoader().prompt('otto','04.01').content_hash` | `fb290a332565` e `b1623f1c52c9`, iguais aos da tela |
| Sem emoji; e-mails só `.example`; cores só tokens e alfas da V4.6 | `grep` no código do protótipo | 0 emoji; 0 e-mail fora de `.example`; nenhuma cor nova |

Contraste: o texto de apoio usa `hs-tinta-suave` e `hs-kbd` (≥ 4,8:1 sobre Branco e Papel); o status de erro, `hs-coord-labio` sobre coral 10% (4,57:1). Os rótulos dos grupos da barra lateral usam `hs-rotulo` (≈ 3,3:1), como a barra lateral aprovada da V4.6; fica para a revisão do Diogo.

## 7. O que ficou de fora

- **Estado é só da página:** recarregar desfaz; o que se salva em uma tela não vira evento na Auditoria nem altera as outras telas.
- "Exportar CSV" e "Começar rascunho" de skill só mostram o aviso de demonstração. Chargebacks não aparecem em Pagamentos (não há dado).
- Comparar e voltar versão existem na Alma; nas Regras de negócio e nas Skills, só rascunho e versão nova.
- Mobile não foi feito (fora do escopo); larguras validadas: 1440 e 1280.
- A skill de apoio `ui-ux-pro-max` não foi aberta: o DS do Diogo já decide paleta, tipografia e estilo; abri só a principal (`frontend-vix`) e a de verificação.
