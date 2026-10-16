import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { parseInline, type InlineNode } from "@/lib/inline-markdown";
import type { SiteBlock } from "@/lib/site-content";

function render(nodes: InlineNode[]): ReactNode {
  return nodes.map((node, i) => {
    if (node.kind === "text") return <Fragment key={i}>{node.text}</Fragment>;
    if (node.kind !== "link") {
      const Tag = node.kind;
      return <Tag key={i}>{render(node.children)}</Tag>;
    }
    return node.href.startsWith("/") ? (
      <Link key={i} href={node.href}>
        {render(node.children)}
      </Link>
    ) : (
      <a key={i} href={node.href} rel="noopener">
        {render(node.children)}
      </a>
    );
  });
}

/** Uma linha do conteúdo da N2a com negrito, itálico e link. */
export function Inline({ text }: { text: string }) {
  return <>{render(parseInline(text))}</>;
}

/**
 * Blocos do conteúdo: parágrafo, listas, tabela (em `<table>`, que os assistentes de IA citam) e pergunta com resposta.
 * `label` vira a legenda da tabela (o título da seção), lida pelo leitor de tela e escondida na tela.
 */
export function Blocks({ blocks, label }: { blocks: SiteBlock[]; label?: string }) {
  return blocks.map((block, i) => {
    switch (block.type) {
      case "p":
        return (
          <p key={i}>
            <Inline text={block.text} />
          </p>
        );
      case "ul":
      case "ol": {
        const List = block.type;
        return (
          <List key={i}>
            {block.items.map((item, j) => (
              <li key={j}>
                <Inline text={item} />
              </li>
            ))}
          </List>
        );
      }
      case "table":
        return (
          // Foco de teclado para rolar a tabela no celular; o nome vem da seção (o <section> com o título já é a região).
          <div key={i} className="st-table" tabIndex={0}>
            <table>
              {label ? <caption className="sr-only">{label}</caption> : null}
              <thead>
                <tr>
                  {block.head.map((cell, j) => (
                    <th key={j} scope="col">
                      <Inline text={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, j) => (
                  <tr key={j}>
                    {row.map((cell, k) =>
                      k === 0 ? (
                        <th key={k} scope="row">
                          <Inline text={cell} />
                        </th>
                      ) : (
                        <td key={k}>
                          <Inline text={cell} />
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "qa":
        return (
          <div key={i} className="st-qa">
            <h3>
              <Inline text={block.question} />
            </h3>
            <Blocks blocks={block.answer} label={label} />
          </div>
        );
    }
  });
}
