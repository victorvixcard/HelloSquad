"use server";

import { isApiError, unwrap } from "@hellosquad/contracts";
import { serverApi } from "@/lib/api";
import type { PromptPreview, RuleParagraph, RuleDocEdit, SoulSection, VersionDiff, VersionRef } from "@/lib/admin";

/** Resultado de uma ação do painel: o dado, ou o código e a mensagem da API (409 com rascunho pendente, 422...). */
export type AdminActionResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string; status: number };

async function run<T>(call: (api: Awaited<ReturnType<typeof serverApi>>) => Promise<T>): Promise<AdminActionResult<T>> {
  try {
    return { ok: true, data: await call(await serverApi()) };
  } catch (error) {
    if (isApiError(error)) return { ok: false, code: error.code, message: error.message, status: error.status };
    throw error;
  }
}

const note = (value: string | undefined) => (value && value.trim() ? value.trim() : null);

/** Editar uma seção da Alma: grava no rascunho da SOUL (cria a versão N+1 em rascunho se ainda não houver). */
export async function saveSoulSectionAction(
  agentId: string,
  section: SoulSection["section"],
  edit: { heading: string; body: string; inPrompt: boolean; note?: string },
): Promise<AdminActionResult<VersionRef>> {
  return run((api) =>
    unwrap(
      api.PUT("/admin/squad/agents/{agent_id}/soul/sections/{section}", {
        params: { path: { agent_id: agentId, section } },
        body: { heading: edit.heading, body: edit.body, in_prompt: edit.inPrompt, note: note(edit.note) },
      }),
    ),
  );
}

/** Skill inteira (com o front matter) → rascunho da skill. */
export async function saveSkillAction(agentId: string, delivery: string, content: string, why?: string): Promise<AdminActionResult<VersionRef>> {
  return run((api) =>
    unwrap(
      api.PUT("/admin/squad/agents/{agent_id}/skills/{delivery_type}", {
        params: { path: { agent_id: agentId, delivery_type: delivery } },
        body: { content, note: note(why) },
      }),
    ),
  );
}

/** Ferramentas e autonomia máxima → rascunho do agent.yaml (o resto do arquivo, com os comentários, fica como está). */
export async function saveConfigAction(
  agentId: string,
  edit: { tools: string[]; maxAutonomy: "analisar" | "preparar" | "executar"; note?: string },
): Promise<AdminActionResult<VersionRef>> {
  return run((api) =>
    unwrap(
      api.PUT("/admin/squad/agents/{agent_id}/config", {
        params: { path: { agent_id: agentId } },
        body: { tools: edit.tools, max_autonomy: edit.maxAutonomy, note: note(edit.note) },
      }),
    ),
  );
}

/** Documento compartilhado (README.md, conversa.md, reflexao.md) inteiro → rascunho. */
export async function saveSharedAction(
  doc: "README.md" | "conversa.md" | "reflexao.md",
  content: string,
  why?: string,
): Promise<AdminActionResult<VersionRef>> {
  return run((api) =>
    unwrap(api.PUT("/admin/squad/shared/{doc}", { params: { path: { doc } }, body: { content, note: note(why) } })),
  );
}

export async function publishVersionAction(versionId: string): Promise<AdminActionResult<VersionRef>> {
  return run((api) =>
    unwrap(api.POST("/admin/squad/versions/{version_id}/publish", { params: { path: { version_id: versionId } } })),
  );
}

export async function discardVersionAction(versionId: string): Promise<AdminActionResult<VersionRef>> {
  return run((api) =>
    unwrap(api.POST("/admin/squad/versions/{version_id}/discard", { params: { path: { version_id: versionId } } })),
  );
}

/** Voltar para uma versão substituída: a API cria a versão nova, já ativa, com o conteúdo dela. */
export async function restoreVersionAction(versionId: string, why?: string): Promise<AdminActionResult<VersionRef>> {
  return run((api) =>
    unwrap(
      api.POST("/admin/squad/versions/{version_id}/restore", {
        params: { path: { version_id: versionId } },
        body: { note: note(why) },
      }),
    ),
  );
}

/** Comparar duas versões da mesma unidade (`GET /admin/squad/diff`). */
export async function diffVersionsAction(from: string, to: string): Promise<AdminActionResult<VersionDiff>> {
  return run((api) => unwrap(api.GET("/admin/squad/diff", { params: { query: { from, to } } })));
}

/** O que ele lê: o system prompt montado para uma rota (delivery, conversa, reflexão), ativo ou com os rascunhos. */
export async function promptPreviewAction(agentId: string, route: string, draft: boolean): Promise<AdminActionResult<PromptPreview>> {
  return run((api) =>
    unwrap(
      api.GET("/admin/squad/agents/{agent_id}/prompt", {
        params: { path: { agent_id: agentId }, query: { route, draft } },
      }),
    ),
  );
}

/** Regras de negócio: grava uma versão nova do documento com todos os parágrafos (a mais recente vale). */
export async function saveRuleDocAction(
  docId: string,
  edit: { paragraphs: RuleParagraph[]; inPrompt: boolean; note?: string },
): Promise<AdminActionResult<{ version: number; sharedDraft: VersionRef | null }>> {
  const body: RuleDocEdit = { paragraphs: edit.paragraphs, in_prompt: edit.inPrompt, note: note(edit.note) };
  return run(async (api) => {
    const saved = await unwrap(api.POST("/admin/rules/{doc_id}/versions", { params: { path: { doc_id: docId } }, body }));
    return { version: saved.version.version, sharedDraft: saved.shared_rules_draft };
  });
}
