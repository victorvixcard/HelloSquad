import type { WorkItem, WorkItemDetail } from "@/lib/core";
import { loadWorkItem } from "@/lib/core";

/**
 * Leitura segura do conteúdo no servidor (as mesmas regras de `docs/doc-parts.tsx`, que é módulo de cliente e não pode
 * ser chamado por um server component).
 */
export const str = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
export const list = (v: unknown): Array<Record<string, unknown>> => (Array.isArray(v) ? (v as Array<Record<string, unknown>>) : []);
export const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
export const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

/** Estado de um trabalho na legenda da V4.6 (`mx.states`, L12659), mais "Aguardando autorização" (aprovado, não enviado). */
export type WorkState = "draft" | "you" | "auth" | "prog" | "act" | "pause" | "done";

export function workState(status: WorkItem["status"]): WorkState {
  switch (status) {
    case "needs_you":
      return "you";
    case "approved":
      return "auth";
    case "scheduled":
      return "prog";
    case "done":
      return "done";
    case "paused":
    case "blocked":
    case "failed":
      return "pause";
    default:
      return "draft";
  }
}

/** O conteúdo da versão mais recente do trabalho (como o worker gravou), ou null sem versão. */
export function latestVersion(detail: WorkItemDetail | null): { no: number; content: Record<string, unknown> } | null {
  const versions = (detail?.deliveries ?? []).flatMap((d) => d.versions);
  if (!versions.length) return null;
  const last = versions.reduce((a, b) => (b.version_no > a.version_no ? b : a));
  return { no: last.version_no, content: last.content };
}

/** Trabalhos de um tipo de entrega (sem os cancelados), do mais recente ao mais antigo, com o conteúdo da última versão. */
export async function worksWithContent(workItems: WorkItem[], types: readonly string[], limit = 6) {
  const mine = workItems
    .filter((w) => w.status !== "cancelled" && w.delivery_type !== null && types.includes(w.delivery_type))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
  return Promise.all(mine.map(async (w) => ({ work: w, version: latestVersion(await loadWorkItem(w.id)) })));
}
