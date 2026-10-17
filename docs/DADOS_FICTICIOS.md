# Dados fictícios para desenvolvimento e testes

Regra do Vic (15/10/2026): **todo dado de teste é fictício.** Este arquivo é a única fonte de clientes, usuários e marcas usados em seeds, testes automatizados e demonstrações locais. Nada aqui existe no mundo real; qualquer semelhança é coincidência a corrigir.

Convenções: e-mails no TLD reservado `.example` (nunca entrega); telefones no formato `+55 11 99999-00NN`; sem CPF ou CNPJ em lugar nenhum; nomes de marcas de terceiros (concorrentes, fornecedores) também inventados.

## Workspaces (tenants) de teste

| Slug | Marca | Negócio | Cidade | Uso nos testes |
|---|---|---|---|---|
| `miolo` | **Miolo** | Padaria de fermentação natural (marca demo do protótipo V4.6) | Pinheiros, São Paulo/SP | Conta "em uso": histórico, trabalhos, memória preenchida, rotinas. |
| `vitta` | **Vitta Estética** | Clínica de estética e bem-estar | Vitória/ES | Conta com dois membros (owner + editor); testes de papéis e aprovações. |
| `trilha` | **Trilha Urbana** | Loja de bikes urbanas e e-bikes | Curitiba/PR | Conta "primeiro acesso": estado vazio honesto, onboarding. |

## Usuários de teste

| E-mail | Nome | Workspace | Papel | Senha (só local) |
|---|---|---|---|---|
| `marina@miolo.example` | Marina Costa | miolo | owner | `Senha!Teste123` |
| `rafael@vitta.example` | Rafael Nunes | vitta | owner | `Senha!Teste123` |
| `carla@vitta.example` | Carla Dias | vitta | editor | `Senha!Teste123` |
| `juliana@trilha.example` | Juliana Prado | trilha | owner | `Senha!Teste123` |
| `pedro@semconta.example` | Pedro Teste | nenhum | sem membership | `Senha!Teste123` |
| `vic@hellosquad.example` | Vic | nenhum | Super Admin local (`platform_admins`, SA1) | `Senha!Teste123` |

`pedro@semconta.example` existe para os testes negativos de RLS: autenticado, mas sem acesso a nenhum workspace.

`vic@hellosquad.example` é o Super Admin fictício do painel `/admin` (SA1): papel de plataforma, fora de `memberships`; não é o Vic de verdade nem tem conta em produção.

## Memória da Marca fictícia (seed da Miolo)

- Fatos confirmados: "Padaria de fermentação natural, aberta em 2019"; "Público: moradores de Pinheiros e Vila Madalena, 28 a 45 anos"; "Tom de voz: acolhedor, direto, sem gíria"; "Canais: Instagram e WhatsApp"; "Produto âncora: pão de fermentação longa".
- Decisão aprovada: "Não usar a palavra 'artesanal' nas legendas".
- Sugestão pendente ("Otto percebeu"): "Posts com bastidores do forno têm mais salvamentos".
- Fonte: onboarding fictício em 01/10/2026.

## Contatos fictícios (seed do Max, Miolo)

Vinte contatos gerados com nomes brasileiros comuns, e-mails `cliente01@contatos.example` a `cliente20@contatos.example`, telefones `+55 11 99999-0001` a `-0020`, origem "importação CSV de teste", consentimento marcado em 10 deles e ausente nos outros 10 (para testar elegibilidade de envio).

## Métricas fictícias (seed da Íris, Miolo)

Séries diárias de 60 dias para "sessões no site", "seguidores", "alcance" e "pedidos", com origem `fonte_de_teste`, unidade declarada e um buraco de 3 dias para testar "dado ausente". Valores gerados por função determinística (semente fixa) para os testes serem reproduzíveis.

## O que nunca entra

Dados de clientes reais do Vic ou de qualquer empresa do ecossistema; marcas, fornecedores ou pessoas reais; chaves de API; capturas de tela de contas reais.
