import type { ReactNode } from "react";

/*
 * Markdown mínimo do SA0 (`agente.js`): blocos de código, listas, títulos como negrito, parágrafos, **negrito**,
 * `código` e {{variável}} (preenchida na hora da conversa). Texto vira nó React, nunca HTML.
 */
function inline(text: string, key: string, varTitle: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\{\{[^}]+\}\})/g;
  let last = 0;
  let i = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${key}-${i++}`;
    if (tok.startsWith("**")) out.push(<b key={k}>{tok.slice(2, -2)}</b>);
    else if (tok.startsWith("`")) out.push(<code key={k}>{tok.slice(1, -1)}</code>);
    else
      out.push(
        <span key={k} className="sa-var" title={varTitle}>
          {tok}
        </span>,
      );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Md({ text, varTitle }: { text: string; varTitle: string }) {
  const blocks: ReactNode[] = [];
  String(text)
    .split(/(```[\s\S]*?```)/g)
    .forEach((seg, si) => {
      if (seg.startsWith("```")) {
        blocks.push(
          <pre key={`c${si}`} className="sa-pre">
            {seg.replace(/^```\w*\n?/, "").replace(/\n?```$/, "")}
          </pre>,
        );
        return;
      }
      seg.split(/\n\s*\n/).forEach((raw, bi) => {
        const b = raw.trim();
        if (!b) return;
        const lines = b.split("\n");
        const key = `${si}-${bi}`;
        if (lines.every((l) => /^\s*[-*] /.test(l)))
          blocks.push(
            <ul key={key}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*] /, ""), `${key}${j}`, varTitle)}</li>
              ))}
            </ul>,
          );
        else if (lines.every((l) => /^\s*\d+\. /.test(l)))
          blocks.push(
            <ol key={key}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*\d+\. /, ""), `${key}${j}`, varTitle)}</li>
              ))}
            </ol>,
          );
        else if (/^#+ /.test(b))
          blocks.push(
            <p key={key}>
              <b>{b.replace(/^#+ /, "")}</b>
            </p>,
          );
        else blocks.push(<p key={key}>{inline(b.replace(/\n/g, " "), key, varTitle)}</p>);
      });
    });
  return <div className="sa-md">{blocks}</div>;
}
