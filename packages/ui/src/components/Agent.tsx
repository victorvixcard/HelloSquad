import type { CSSProperties } from "react";
import { cx } from "../cx";
import { AGENT_SHAPES, getAgent, type AgentExpression, type AgentId } from "../squad";

/** mini = 16 px (barra lateral, listas), padrao = 24 px (tamanho padrão do DS). */
export const AGENT_SIZES = { mini: 16, padrao: 24 } as const;
export type AgentSize = keyof typeof AGENT_SIZES | number;

export type AgentProps = {
  agent: AgentId;
  size?: AgentSize;
  expression?: AgentExpression;
  /** Olhos trabalhando (olhar e piscada animados). Respeita prefers-reduced-motion. */
  thinking?: boolean;
  /** Contorno branco, para sobrepor agentes (pilha). */
  outline?: boolean;
  /** Nome acessível. Sem ele, o desenho é decorativo (aria-hidden). */
  title?: string;
  className?: string;
  style?: CSSProperties;
};

/** Corte óptico dos olhos: o DS desenha olhos maiores nos tamanhos pequenos. */
function optical(px: number): "o135" | "o118" | "o1" {
  if (px <= 24) return "o135";
  if (px <= 48) return "o118";
  return "o1";
}

/**
 * Um agente do squad em qualquer tamanho. Desenho oficial do bundle do Design System
 * (extraído por script para src/generated/agents.ts), nunca redesenhado.
 */
export function Agent({
  agent,
  size = "padrao",
  expression = "oval",
  thinking = false,
  outline = false,
  title,
  className,
  style,
}: AgentProps) {
  const member = getAgent(agent);
  const shape = AGENT_SHAPES[member.shape];
  const px = typeof size === "number" ? size : AGENT_SIZES[size];
  const eyes = shape.eyes[expression][optical(px)];
  let inner =
    (outline ? shape.ring : "") +
    shape.body +
    `<g class="hs-eyes"><g class="hs-lids">${eyes}</g></g>`;
  if (shape.inner) inner = `<g transform="${shape.inner}">${inner}</g>`;
  return (
    <svg
      className={cx("hs-mini", thinking && "hs-think", className)}
      width={px}
      height={px}
      viewBox="-170 -170 340 340"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      data-agent={agent}
      style={{ display: "block", flexShrink: 0, overflow: "visible", ...style }}
      // Conteúdo estático e confiável: vem do bundle oficial do DS, nunca de entrada do usuário.
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
