import { STATUS_GLYPHS, type AgentId } from "@hellosquad/ui";
import type { WorkItem } from "@/lib/core";

/** Família de situação da V4.6 (`STK6`, L13856): um desenho por status, forma e não cor. */
export type Family = "you" | "and" | "prog" | "done" | "pause";
/** Colunas do Quadro (`COLS`, L8875); os pausados ficam em "Em andamento", por último. */
export type Column = "you" | "and" | "prog" | "done";
export const COLUMNS: readonly Column[] = ["you", "and", "prog", "done"];

export type KindFilter = "all" | "deliveries" | "projects";
export const KIND_FILTERS: readonly KindFilter[] = ["all", "deliveries", "projects"];
export type View = "board" | "list" | "library";
export const VIEWS: readonly View[] = ["board", "list", "library"];
export type Format = "all" | "pieces" | "documents";
export const FORMATS: readonly Format[] = ["all", "pieces", "documents"];

/** Um trabalho no Quadro e na Lista (o que o servidor leu da API, sem texto: o texto sai do catálogo). */
export type BoardWork = {
  id: string;
  title: string;
  status: WorkItem["status"];
  lead: AgentId;
  co: AgentId[];
  /** Nome do projeto, quando o trabalho é de um projeto (V4.3: "Trabalho de <projeto>"). */
  project: string | null;
  href: string;
  /** Pendência aberta deste trabalho ("Precisa de você"): a ação, a versão e o prazo, quando há. */
  need: { cta: string; title: string; href: string; version: number | null; due: string | null } | null;
};

/**
 * Mapa da FLUXOS §10.2: needs_you → "Aguarda você"; in_progress → "Em andamento"; paused → "Pausado";
 * scheduled → "Programado"; approved e done → "Concluído". draft, blocked, failed e cancelled não têm
 * desenho de trabalho na V4.6 (FLUXOS §11 item 3): ficam fora do Quadro até o dono e o Diogo decidirem.
 */
export function familyOf(status: WorkItem["status"]): Family | null {
  switch (status) {
    case "needs_you":
      return "you";
    case "in_progress":
      return "and";
    case "paused":
      return "pause";
    case "scheduled":
      return "prog";
    case "approved":
    case "done":
      return "done";
    default:
      return null;
  }
}

export function columnOf(family: Family): Column {
  return family === "pause" ? "and" : family;
}

/** Sinal da situação (WK_SG, L6394): anel, ponto, relógio, check, pausa. */
export function glyphOf(family: Family) {
  const g = STATUS_GLYPHS[family];
  return { fill: g.fill, mark: g.mark };
}

export function agentsOf(w: Pick<BoardWork, "lead" | "co">): AgentId[] {
  return [w.lead, ...w.co.filter((a) => a !== w.lead)];
}

/** Filtro de tipo (L8846): entregas pontuais são os trabalhos fora de projeto; "Projetos", os de um projeto. */
export function kindOk(w: Pick<BoardWork, "project">, kind: KindFilter): boolean {
  return kind === "all" || (kind === "deliveries" && !w.project) || (kind === "projects" && !!w.project);
}

export function agentOk(w: Pick<BoardWork, "lead" | "co">, agent: AgentId | null): boolean {
  return !agent || agentsOf(w).includes(agent);
}

/** Os trabalhos que têm desenho na V4.6, já com a família de situação. */
export function visibleWorks(works: BoardWork[]): Array<BoardWork & { family: Family }> {
  return works.flatMap((w) => {
    const family = familyOf(w.status);
    return family ? [{ ...w, family }] : [];
  });
}

/** Itens de uma coluna, na ordem da API, com os pausados por último (L8878). */
export function columnItems<T extends { family: Family }>(items: T[], col: Column): T[] {
  const inCol = items.filter((w) => columnOf(w.family) === col);
  return [...inCol.filter((w) => w.family !== "pause"), ...inCol.filter((w) => w.family === "pause")];
}
