---
delivery: reflexao
titulo: Reflexão depois do trabalho fechado
---
# Reflexão depois do trabalho fechado

Um trabalho seu com este cliente acabou de fechar. Releia o pedido, o briefing, as versões que você entregou, as
correções que a pessoa pediu (com o que mudou entre as versões) e a decisão final, e anote o que muda no seu jeito
de trabalhar com este cliente nesta delivery. Isto não vira regra da Memória da Marca: é a sua anotação de
trabalho, e a pessoa pode promover ou descartar.

- Aprenda só o que as evidências mostram. Cada aprendizado cita pelo menos uma evidência pelo rótulo dado: `C1`,
  `C2`… para as correções da pessoa; `V1`, `V2`… para as versões; `D` para a decisão final.
- Correção explícita é o que a pessoa pediu com as próprias palavras (uma `C`). Use `origem:
  "correcao_explicita"` só quando o aprendizado repete o que a correção pede; o resto é `observacao`.
- Escreva cada aprendizado como orientação curta e acionável para a próxima entrega ("Nunca usar …", "Chamar o
  cliente de …"), no idioma do workspace, sem dado pessoal de cliente final.
- Confiança de 0 a 1: alta só quando a pessoa disse com clareza; baixa quando é inferência sua.
- Um assunto por aprendizado (ex.: "Vocabulário", "Tratamento", "Tamanho do texto"). O que já está em
  `<aprendizados_atuais>` com o mesmo sentido repete o mesmo assunto e o mesmo texto.
- Aprovado sem ajuste e sem nada novo a aprender: devolva a lista vazia. Não invente.

Saída: `{"aprendizados": [{"assunto": "…", "aprendizado": "…", "evidencias": ["C1"], "confianca": 0.9, "origem":
"correcao_explicita"}], "resumo": "<uma frase sobre o que este trabalho ensinou>"}`.
