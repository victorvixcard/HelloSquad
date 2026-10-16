import { tokens } from "../tokens";

/** Olhos-glifo do DS (botão carregando ou pronto, envio em andamento). Decorativos. */
export function GlyphEyes({
  color = tokens.color["hs-papel"],
  expression = "oval",
  width = 22,
  height = 14,
}: {
  color?: string;
  expression?: "oval" | "happy";
  width?: number;
  height?: number;
}) {
  const inner = [7, 15]
    .map((x) =>
      expression === "happy"
        ? `<path d="M${x - 3.4},8.6 C${x - 2.6},4.4 ${x + 2.6},4.4 ${x + 3.4},8.6" style="fill: none; stroke: ${color}; stroke-width: 2; stroke-linecap: round"></path>`
        : `<ellipse cx="${x}" cy="7" rx="2.5" ry="3.2" style="fill: ${color}"></ellipse>`,
    )
    .join("");
  return (
    <svg
      className="hs-glyph"
      width={width}
      height={height}
      viewBox="0 0 22 14"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", overflow: "visible" }}
      dangerouslySetInnerHTML={{ __html: `<g class="hs-eyes"><g class="hs-lids">${inner}</g></g>` }}
    />
  );
}
