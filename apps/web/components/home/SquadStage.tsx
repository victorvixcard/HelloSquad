"use client";

import { SQUAD_STAGE_SVG, SquadStageEngine } from "@hellosquad/ui";
import { useEffect, useRef } from "react";

export type StageState = { view: "home"; cv: { mode: "off" | "panel" | "full" }; homeSel: string[] | null; homeMin: boolean };

/**
 * Palco do Início V3: os sete agentes no agrupamento oficial. O SVG e o motor (corpos, sombras, olhar,
 * piscadas, entrada e queda ao recolher) vêm do protótipo por extração; aqui só se liga o estado.
 * Respeita prefers-reduced-motion (o próprio motor desliga entrada, reações e piscadas).
 * O SVG entra só no cliente: o motor mexe nele direto, e o React nunca o reconcilia.
 */
export function SquadStage({ state, engineRef }: { state: StageState; engineRef?: React.RefObject<SquadStageEngine | null> }) {
  const stateRef = useRef(state);
  stateRef.current = state;
  const local = useRef<SquadStageEngine | null>(null);
  const ref = engineRef ?? local;
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    // SVG estático e confiável, extraído do protótipo oficial (nunca entrada de usuário).
    if (!el.querySelector(".hm-squad")) el.innerHTML = SQUAD_STAGE_SVG;
    const engine = new SquadStageEngine(() => stateRef.current);
    ref.current = engine;
    engine._sqSync();
    return () => {
      engine._sqStop();
      ref.current = null;
    };
  }, [ref]);

  useEffect(() => {
    ref.current?._sqSync();
  }, [state.cv.mode, state.homeMin, state.homeSel, ref]);

  return <div className="hm-stage" aria-hidden="true" ref={host} />;
}
