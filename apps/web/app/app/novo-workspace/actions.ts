"use server";

import { isApiError, unwrap, type Workspace } from "@hellosquad/contracts";
import { redirect } from "next/navigation";
import { serverApi } from "@/lib/api";
import { validateWorkspaceForm, type WorkspaceFormState } from "./validation";

export async function createWorkspace(_prev: WorkspaceFormState, formData: FormData): Promise<WorkspaceFormState> {
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const values = { name, slug };
  const fieldErrors = validateWorkspaceForm(values);
  if (fieldErrors) return { fieldErrors, values };

  let created: Workspace | null = null;
  let sessionExpired = false;
  try {
    const api = await serverApi();
    created = await unwrap(api.POST("/workspaces", { body: { name, slug } }));
  } catch (error) {
    if (!isApiError(error)) throw error;
    if (error.code === "slug_taken") {
      return { fieldErrors: { slug: "Esse endereço já está em uso. Escolha outro." }, values };
    }
    if (error.code === "validation_error") {
      const byField: WorkspaceFormState["fieldErrors"] = {};
      for (const detail of error.details) {
        if (detail.field === "name" || detail.field === "slug") byField[detail.field] = detail.message;
      }
      return Object.keys(byField).length ? { fieldErrors: byField, values } : { error: error.message, values };
    }
    if (error.code === "not_authenticated" || error.code === "invalid_token") sessionExpired = true;
    else return { error: error.message, values };
  }
  if (sessionExpired) redirect("/entrar?sessao=expirada");
  redirect(`/app/${created!.slug}`);
}
