"use client";

import type { DocProps } from "./DocumentBody";
import { DocSection, str } from "./doc-parts";

/** Leitor provisório (estrutura comum da A2b): só o resumo, até a frente desta família escrever as seções. */
export function ResultsDoc({ content }: DocProps) {
  return (
    <>
      {str(content.resumo) ? (
        <DocSection title="">
          <p className="bd-lead">{str(content.resumo)}</p>
        </DocSection>
      ) : null}
    </>
  );
}
