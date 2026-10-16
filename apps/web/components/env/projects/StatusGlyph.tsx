import { glyphOf, type Family } from "./board";

/** Sinal de situação da V4.6 (`wk-sg`): anel, preenchimento e marca, a mesma forma em todo o produto. */
export function StatusGlyph({ family }: { family: Family }) {
  const g = glyphOf(family);
  return (
    <svg className={`wk-sg is-${family}`} viewBox="0 0 16 16" aria-hidden="true">
      <circle className="g-o" cx="8" cy="8" r="6.2" />
      <path className="g-f" d={g.fill} />
      <path className="g-m" d={g.mark} />
    </svg>
  );
}
