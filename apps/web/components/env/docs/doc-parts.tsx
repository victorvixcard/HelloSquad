"use client";

import type { ReactNode } from "react";

/** Leitura segura do conteúdo da versão: o formato vem do worker, mas a tela nunca quebra com um campo ausente. */
export function str(value: unknown): string {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}

export function list<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * Seção do documento em leitura editorial (V4.4 "Documento da Bia", template L5069: `bd-s` com o título `bd-sk`).
 * Sem conteúdo, a seção não aparece: nada é completado na tela.
 */
export function DocSection({ title, children, empty, className }: { title: string; children: ReactNode; empty?: boolean; className?: string }) {
  if (empty) return null;
  return (
    <section className={`bd-s${className ? ` ${className}` : ""}`}>
      <h2 className="bd-sk">{title}</h2>
      {children}
    </section>
  );
}

/** Lista de itens com título e apoio (`bd-ul`, como "Principais forças" e "Pontos de atenção"). */
export function DocList({ items, tone }: { items: Array<{ t: string; s?: string; hint?: string }>; tone?: "plus" | "warn" }) {
  return (
    <ul className={`bd-ul${tone ? ` is-${tone}` : ""}`}>
      {items.map((x, i) => (
        <li key={i}>
          <b>{x.t}</b>
          {x.s ? <span>{x.s}</span> : null}
          {x.hint ? <em className="bi-hint">{x.hint}</em> : null}
        </li>
      ))}
    </ul>
  );
}
