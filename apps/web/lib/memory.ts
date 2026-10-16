import { isApiError, unwrap, type components } from "@hellosquad/contracts";
import { cache } from "react";
import { serverApi } from "./api";

export type MemoryDossier = components["schemas"]["MemoryDossier"];
export type BrandFact = components["schemas"]["BrandFact"];
export type MemorySuggestion = components["schemas"]["MemorySuggestion"];
export type MemoryConflict = components["schemas"]["MemoryConflict"];
export type FactSource = components["schemas"]["FactSource"];
export type BrandFactHistory = components["schemas"]["BrandFactHistory"];

/** O que a página da Memória da Marca lê (S1d): dossiê, todas as sugestões (abertas e decididas) e os conflitos. */
export type MemoryData = {
  dossier: MemoryDossier;
  /** Sugestões em qualquer estado, mais recente primeiro: as abertas vão para "O squad percebeu", as decididas para o histórico. */
  suggestions: MemorySuggestion[];
  conflicts: MemoryConflict[];
};

export type MemoryResult = { ok: true; data: MemoryData } | { ok: false };

/** Leituras da Memória da Marca uma vez por requisição; só GET. Falha da API vira estado de indisponível, nunca dado inventado. */
export const loadMemory = cache(async (workspaceId: string): Promise<MemoryResult> => {
  try {
    const api = await serverApi();
    const path = { workspace_id: workspaceId };
    const [dossier, suggestions, conflicts] = await Promise.all([
      unwrap(api.GET("/workspaces/{workspace_id}/memory", { params: { path } })),
      unwrap(api.GET("/workspaces/{workspace_id}/memory/suggestions", { params: { path, query: { limit: 100 } } })),
      unwrap(api.GET("/workspaces/{workspace_id}/memory/conflicts", { params: { path } })),
    ]);
    return { ok: true, data: { dossier, suggestions: suggestions.items, conflicts: conflicts.items } };
  } catch (error) {
    if (!isApiError(error)) throw error;
    return { ok: false };
  }
});

/** Número suave da barra lateral (V4.6 L10508: `memN` = sugestões abertas, "N informações para confirmar"). Leitura leve. */
export const loadMemoryPending = cache(async (workspaceId: string): Promise<number> => {
  try {
    const api = await serverApi();
    const page = await unwrap(
      api.GET("/workspaces/{workspace_id}/memory/suggestions", {
        params: { path: { workspace_id: workspaceId }, query: { state: "open", limit: 100 } },
      }),
    );
    return page.items.length;
  } catch (error) {
    if (!isApiError(error)) throw error;
    return 0;
  }
});
