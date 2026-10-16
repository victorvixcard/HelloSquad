/**
 * Medidas da casca, como o renderVals() da Product UI V4.6 calcula: barra de 256 px (72 recolhida, e
 * recolhida por padrão abaixo de 1100 px), painel de conversa de 380 px a partir de 1360 px e 364 abaixo,
 * que nos ambientes-piloto abre por cima quando espremer a página deixaria menos de 760 px.
 */
export type ConversationMode = "off" | "panel" | "full";

export type LayoutInput = {
  vw: number;
  vh: number;
  /** Escolha da pessoa (null = automático pela largura). */
  sideMin: boolean | null;
  mode: ConversationMode;
  /** Ambiente-piloto (Projetos, Conteúdo, Resultados): a conversa abre por cima se espremer demais. */
  pilot: boolean;
  pop: boolean;
};

export type Layout = {
  min: boolean;
  sideW: number;
  panelW: number;
  convW: number;
  mainW: number;
  padX: number;
  contentW: number;
  rootClassName: string;
  rootStyle: Record<string, string>;
};

export function isSideMin(vw: number, sideMin: boolean | null): boolean {
  return sideMin === null ? vw < 1100 : sideMin;
}

export function productLayout({ vw, vh, sideMin, mode, pilot, pop }: LayoutInput): Layout {
  const min = isSideMin(vw, sideMin);
  const sideW = min ? 72 : 256;
  const stageW = Math.max(320, vw - sideW - 8);
  const panelW = vw >= 1360 ? 380 : 364;
  const ovp = pilot && stageW - panelW - 8 < 760;
  const ov = mode === "panel" && ovp;
  const convW = mode === "full" ? stageW : mode === "panel" ? panelW : 0;
  const mainW = mode === "full" ? 0 : stageW - (mode === "panel" && !ov ? panelW + 8 : 0);
  const padX = mainW >= 1080 ? 44 : 32;
  const contentW = Math.max(300, Math.min(1120, mainW - padX * 2));
  const visW = ov ? mainW - panelW - 8 : mainW;
  const rootClassName =
    "ps" +
    (min ? " is-min" : "") +
    (mode === "full" ? " is-full" : mode === "panel" ? " is-panel" : "") +
    (ov ? " is-ov" : "") +
    (ovp ? " is-ovp" : "") +
    (pop ? " has-pop" : "") +
    (mainW < 760 ? " is-mw-s is-mw-m" : mainW < 1000 ? " is-mw-m" : "") +
    (vh < 860 ? " is-short" : "");
  const rootStyle = {
    "--sidew": `${sideW}px`,
    "--padx": `${padX}px`,
    "--panelw": `${panelW}px`,
    "--toastx": `${Math.round(sideW + (mode === "full" ? convW : visW) / 2)}px`,
  };
  return { min, sideW, panelW, convW, mainW, padX, contentW, rootClassName, rootStyle };
}
