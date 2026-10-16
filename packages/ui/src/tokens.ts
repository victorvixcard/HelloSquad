// Gerado por packages/ui/scripts/build-tokens.ts a partir de design/handoff-v4.6/product-ui/ds/hellosquad/tokens.json. Não edite à mão: rode pnpm --filter @hellosquad/ui build:tokens.

export const tokens = {
  name: "HelloSquad",
  version: 1,
  /** Cores com apelidos já resolvidos (no CSS, o apelido vira var()). */
  color: {
    "hs-papel": "#F7F7F5",
    "hs-tinta": "#0F0D22",
    "hs-branco": "#FFFFFF",
    "hs-tinta-suave": "#4A4760",
    "hs-nevoa": "#EEEEEC",
    "hs-tinta-hover": "#1E1B36",
    "hs-fundo": "#05040C",
    "hs-rotulo": "#8A8799",
    "hs-ph": "#726F84",
    "hs-indisponivel": "#DEDDE0",
    "hs-kbd": "#6E6B80",
    "hs-envio-inativo": "#A6A4B0",
    "hs-l1": "rgba(15, 13, 34, 0.09)",
    "hs-l2": "rgba(15, 13, 34, 0.15)",
    "hs-l3": "rgba(15, 13, 34, 0.28)",
    "hs-lip": "rgba(15, 13, 34, 0.07)",
    "hs-coord": "#FF4D1F",
    "hs-coord-sombra": "#E83A0E",
    "hs-coord-labio": "#C9380F",
    "hs-coral": "#FF4D1F",
    "hs-estrategia": "#8A3BFF",
    "hs-estrategia-sombra": "#7A2EF0",
    "hs-marca": "#FF2E9A",
    "hs-marca-sombra": "#EC1F89",
    "hs-conteudo": "#FFE11A",
    "hs-conteudo-sombra": "#EED00C",
    "hs-midia": "#B6FF2E",
    "hs-midia-sombra": "#A2EA1A",
    "hs-crm": "#00E5C3",
    "hs-crm-sombra": "#00CFB0",
    "hs-dados": "#1F5BFF",
    "hs-dados-sombra": "#1747E0",
  },
  font: {
    "display": "'Gabarito', sans-serif",
    "mono": "'JetBrains Mono', monospace",
  },
  type: {
    "logotipo": { family: "display", fontSize: "108px", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 },
    "display": { family: "display", fontSize: "128px", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 },
    "manchete": { family: "display", fontSize: "84px", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.04 },
    "titulo-landing": { family: "display", fontSize: "54px", fontWeight: 700, letterSpacing: "-0.032em", lineHeight: 1.04 },
    "titulo": { family: "display", fontSize: "60px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 },
    "subtitulo": { family: "display", fontSize: "34px", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 },
    "destaque": { family: "display", fontSize: "26px", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.25 },
    "corpo-grande": { family: "display", fontSize: "24px", fontWeight: 400, letterSpacing: "normal", lineHeight: 1.45 },
    "campo": { family: "display", fontSize: "19px", fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.3 },
    "botao": { family: "display", fontSize: "16px", fontWeight: 600, letterSpacing: "-0.005em", lineHeight: 1 },
    "status": { family: "display", fontSize: "15px", fontWeight: 500, letterSpacing: "-0.005em", lineHeight: 1.3 },
    "menu": { family: "display", fontSize: "14.5px", fontWeight: 500, letterSpacing: "normal", lineHeight: 1.3 },
    "sugestao": { family: "display", fontSize: "13.5px", fontWeight: 500, letterSpacing: "-0.003em", lineHeight: 1.3 },
    "rotulo": { family: "mono", fontSize: "15px", fontWeight: 400, letterSpacing: "0.08em", lineHeight: 1.3 },
    "rotulo-ui": { family: "mono", fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", lineHeight: 1.3 },
    "codigo": { family: "mono", fontSize: "17px", fontWeight: 500, letterSpacing: "normal", lineHeight: 1.4 },
  },
  spacing: {
    "s-1": "4px",
    "s-2": "8px",
    "s-3": "12px",
    "s-4": "16px",
    "s-5": "20px",
    "s-6": "24px",
    "s-8": "32px",
    "s-10": "40px",
    "s-12": "48px",
    "s-14": "56px",
    "s-16": "64px",
    "s-20": "80px",
    "s-26": "104px",
  },
  radius: {
    "r-pilula": "999px",
    "r-painel": "28px",
    "r-painel-s": "24px",
    "r-campo": "20px",
    "r-menu": "16px",
    "r-acao": "12px",
    "r-item": "10px",
    "r-dica": "9px",
    "r-caixa": "7px",
    "r-kbd": "6px",
  },
  shadow: {
    "e1-apoiado": "inset 0 0 0 1.5px rgba(15, 13, 34, 0.15), 0 3px 0 0 rgba(15, 13, 34, 0.07)",
    "e1-tecla": "0 3px 0 0 #05040C, inset 0 1px 0 rgba(255, 255, 255, 0.09)",
    "e1-tecla-hover": "0 4px 0 0 #05040C, inset 0 1px 0 rgba(255, 255, 255, 0.12)",
    "e1-tecla-toque": "0 1px 0 0 #05040C, inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    "e2-flutuante": "inset 0 0 0 1px rgba(15, 13, 34, 0.09), 0 2px 0 0 rgba(15, 13, 34, 0.07), 0 22px 44px -20px rgba(15, 13, 34, 0.3)",
    "halo-campo": "0 0 0 4px rgba(15, 13, 34, 0.055)",
  },
  duration: {
    "t-toque": "90ms",
    "t-rapido": "160ms",
    "t-base": "240ms",
    "t-fluido": "420ms",
    "t-piscar": "140ms",
    "t-piscar-lento": "240ms",
    "t-retorno": "700ms",
    "t-respirar": "4s",
    "t-ponto": "2.4s",
    "t-anel": "1.6s",
  },
  easing: {
    "e-saida": "cubic-bezier(0.2, 0.8, 0.2, 1)",
    "e-mola": "cubic-bezier(0.34, 1.56, 0.64, 1)",
    "e-precisa": "cubic-bezier(0.65, 0, 0.35, 1)",
  },
} as const;

export type ColorToken = keyof typeof tokens.color;
export type TypeStyleName = keyof typeof tokens.type;
export type TokenName =
  | ColorToken
  | keyof typeof tokens.spacing
  | keyof typeof tokens.radius
  | keyof typeof tokens.shadow
  | keyof typeof tokens.duration
  | keyof typeof tokens.easing;

/** Referência CSS de um token: cssVar("hs-papel") === "var(--hs-papel)". */
export function cssVar(name: TokenName): string {
  return `var(--${name.startsWith("hs-") ? name : `hs-${name}`})`;
}

export const tokenNames = ["hs-papel","hs-tinta","hs-branco","hs-tinta-suave","hs-nevoa","hs-tinta-hover","hs-fundo","hs-rotulo","hs-ph","hs-indisponivel","hs-kbd","hs-envio-inativo","hs-l1","hs-l2","hs-l3","hs-lip","hs-coord","hs-coord-sombra","hs-coord-labio","hs-coral","hs-estrategia","hs-estrategia-sombra","hs-marca","hs-marca-sombra","hs-conteudo","hs-conteudo-sombra","hs-midia","hs-midia-sombra","hs-crm","hs-crm-sombra","hs-dados","hs-dados-sombra","s-1","s-2","s-3","s-4","s-5","s-6","s-8","s-10","s-12","s-14","s-16","s-20","s-26","r-pilula","r-painel","r-painel-s","r-campo","r-menu","r-acao","r-item","r-dica","r-caixa","r-kbd","e1-apoiado","e1-tecla","e1-tecla-hover","e1-tecla-toque","e2-flutuante","halo-campo","t-toque","t-rapido","t-base","t-fluido","t-piscar","t-piscar-lento","t-retorno","t-respirar","t-ponto","t-anel","e-saida","e-mola","e-precisa"] as const;
