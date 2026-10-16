import { cx } from "../cx";
import { STATUS_GLYPHS } from "../generated/product-ui";
import type { AgentExpression, AgentId } from "../squad";
import { Agent } from "./Agent";

/**
 * Estados do produto, "um desenho por estado" da V4.6. A forma do glifo e o texto dizem o estado;
 * a cor nunca é o único sinal. Coral só no que precisa de você.
 */
export const PRODUCT_STATES = {
  awaiting_you: { glyph: "you", label: "Aguardando você" },
  in_progress: { glyph: "and", label: "Em andamento" },
  scheduled: { glyph: "prog", label: "Programado" },
  done: { glyph: "done", label: "Concluído" },
  paused: { glyph: "pause", label: "Pausado" },
  blocked: { glyph: "block", label: "Bloqueado" },
  failed: { glyph: "fail", label: "Erro" },
} as const satisfies Record<string, { glyph: keyof typeof STATUS_GLYPHS; label: string }>;

export type ProductState = keyof typeof PRODUCT_STATES;

type StateProps = {
  /** Um dos estados do produto. */
  state: ProductState;
  /** Texto do status; o padrão é o rótulo do estado ("Aguardando você"...). */
  label?: string;
  className?: string;
};

type PresenceProps = {
  /** Presença de um agente (StatePill do DS): agente, ação e detalhe. */
  agent: AgentId;
  label: string;
  detail?: string;
  expression?: AgentExpression;
  thinking?: boolean;
  className?: string;
};

export type StatePillProps = StateProps | PresenceProps;

function StatusGlyph({ glyph }: { glyph: keyof typeof STATUS_GLYPHS }) {
  const g = STATUS_GLYPHS[glyph];
  return (
    <svg className={`hs-sg is-${glyph}`} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {g.ring ? <circle className="g-o" cx="8" cy="8" r="6.2" /> : null}
      {g.fill ? <path className="g-f" d={g.fill} /> : null}
      {g.mark ? <path className="g-m" d={g.mark} /> : null}
    </svg>
  );
}

export function StatePill(props: StatePillProps) {
  if ("state" in props) {
    const meta = PRODUCT_STATES[props.state];
    return (
      <span className={cx("hs-st", `hs-st--${meta.glyph}`, props.className)} data-state={props.state}>
        <StatusGlyph glyph={meta.glyph} />
        <span>{props.label ?? meta.label}</span>
      </span>
    );
  }
  const { agent, label, detail, expression = "oval", thinking = false, className } = props;
  return (
    <span className={cx("hs-state", className)} data-agent={agent}>
      <Agent agent={agent} size={20} expression={expression} thinking={thinking} />
      {label}
      {detail ? (
        <>
          {" "}
          <i>{detail}</i>
        </>
      ) : null}
    </span>
  );
}
