"use server";

import { isApiError, unwrap, type Workspace } from "@hellosquad/contracts";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { serverApi } from "@/lib/api";
import { validateWorkspaceForm, type WorkspaceFormState } from "./validation";

export async function createWorkspace(_prev: WorkspaceFormState, formData: FormData): Promise<WorkspaceFormState> {
  const t = await getTranslations("onboarding.errors");
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const values = { name, slug };
  const invalid = validateWorkspaceForm(values);
  if (invalid) {
    const fieldErrors: WorkspaceFormState["fieldErrors"] = {};
    if (invalid.name) fieldErrors.name = t(invalid.name);
    if (invalid.slug) fieldErrors.slug = t(invalid.slug);
    return { fieldErrors, values };
  }

  let created: Workspace | null = null;
  let sessionExpired = false;
  try {
    const api = await serverApi();
    created = await unwrap(api.POST("/workspaces", { body: { name, slug } }));
  } catch (error) {
    if (!isApiError(error)) throw error;
    if (error.code === "slug_taken") {
      return { fieldErrors: { slug: t("slugTaken") }, values };
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
