// Marcação de linha do conteúdo do site (N2a): **negrito**, *itálico* e [texto](/caminho). Nada além disso: o texto
// vem do repositório, mas nunca vira HTML cru.

export type InlineNode =
  | { kind: "text"; text: string }
  | { kind: "strong" | "em"; children: InlineNode[] }
  | { kind: "link"; href: string; children: InlineNode[] };

const TOKEN = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index > last) nodes.push({ kind: "text", text: text.slice(last, m.index) });
    if (m[1] !== undefined) nodes.push({ kind: "strong", children: parseInline(m[1]) });
    else if (m[2] !== undefined) nodes.push({ kind: "em", children: parseInline(m[2]) });
    else nodes.push({ kind: "link", href: m[4], children: parseInline(m[3]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push({ kind: "text", text: text.slice(last) });
  return nodes;
}

/** O mesmo texto sem marcação (JSON-LD, title de imagem): o que a pessoa lê, palavra por palavra. */
export function plainText(text: string): string {
  const walk = (nodes: InlineNode[]): string =>
    nodes.map((node) => (node.kind === "text" ? node.text : walk(node.children))).join("");
  return walk(parseInline(text));
}
