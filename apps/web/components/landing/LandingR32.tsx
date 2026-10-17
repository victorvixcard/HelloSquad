"use client";

// Landing V1 (R32) do handoff, portada por script (packages/ui/scripts/extract-landing.ts): o template, o CSS, a classe
// Component com os motores (Hero que digita e envia sozinho, faixa de sugestões, sequência pedido → coordenação →
// especialistas → CTA, demonstração do squad, Modo Autônomo, Memória, Resultados, FAQ, encerramento) e o bundle do DS
// são os do protótipo; o interpretador (DCHost) reproduz o runtime dele. O servidor renderiza o estado inicial (o texto
// de todas as seções vai no HTML); no cliente, o componentDidMount liga os motores, como no protótipo.
import * as React from "react";
import {
  createHelloSquad,
  createLandingComponent,
  DCHost,
  DCLogic,
  identity,
  LANDING_TEMPLATE,
  type LogicClass,
  type RenderCtx,
} from "@hellosquad/ui/landing";
import "@hellosquad/ui/ds-bundle.css";
import "@hellosquad/ui/landing.css";

const isServer = typeof window === "undefined";
const HS = createHelloSquad(React) as Record<string, React.ComponentType<Record<string, unknown>>>;

// No servidor só o construtor e o renderVals rodam: o renderVals lê window.HelloSquad (os componentes do DS) e mais nada
// do navegador no estado inicial. Os motores (window, document, timers) só existem no cliente.
const ssrDocument = {
  createElement: () => ({ getContext: () => ({ font: "", measureText: (s: string) => ({ width: s.length * 8 }) }) }),
  querySelector: () => null,
  querySelectorAll: () => [],
};

/** A Gabarito local (next/font) para a medição de texto em canvas que o protótipo faz com o nome do Google Fonts. */
function canvasFont(): string {
  if (isServer) return "sans-serif";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--hs-font-display").trim();
  return v || "sans-serif";
}

if (!isServer) (window as unknown as { HelloSquad: unknown }).HelloSquad = HS;

const Prototype = createLandingComponent(
  DCLogic,
  React,
  isServer ? { HelloSquad: HS } : window,
  isServer ? ssrDocument : document,
  canvasFont,
) as LogicClass;

/**
 * Única mudança de comportamento, pedida no briefing da L1: "Criar conta grátis" e "Entrar" levam às telas reais
 * (/criar-conta e /entrar) em vez dos modais demonstrativos. O pedido do Hero já foi para o sessionStorage
 * (hs-landing-pedido) pelo próprio protótipo (_savePrompt).
 */
class LandingLogic extends (Prototype as unknown as new (p: Record<string, unknown>) => DCLogic & Record<string, unknown>) {
  _openModal(mode: string) {
    window.location.assign(mode === "signin" ? "/entrar" : "/criar-conta");
  }
}

export function LandingR32({ dictionary }: { dictionary?: Record<string, string> }) {
  const ctx = React.useMemo<RenderCtx>(() => {
    const dict = dictionary && Object.keys(dictionary).length ? dictionary : null;
    return { components: HS, tr: dict ? (s: string) => dict[s] ?? s : identity };
  }, [dictionary]);
  return (
    <div id="dc-root">
      <DCHost name="LandingPageV1" Logic={LandingLogic as unknown as LogicClass} template={LANDING_TEMPLATE} ctx={ctx} />
    </div>
  );
}
