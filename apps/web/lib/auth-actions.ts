"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authErrorKey } from "./auth-errors";
import { safeNext } from "./safe-next";
import { createSupabaseServerClient } from "./supabase/server";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "password", string>>;
  values?: { name?: string; email?: string };
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6; // auth.minimum_password_length do supabase/config.toml

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const t = await getTranslations("auth.errors");
  const email = text(formData, "email").trim().toLowerCase();
  const password = text(formData, "password");
  const values = { email };
  const fieldErrors: AuthFormState["fieldErrors"] = {};
  if (!EMAIL.test(email)) fieldErrors.email = t("emailRequired");
  if (!password) fieldErrors.password = t("passwordRequired");
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: t(authErrorKey(error, "signInFailed"), { min: MIN_PASSWORD }), values };
  redirect(safeNext(text(formData, "next")) ?? "/app");
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const t = await getTranslations("auth.errors");
  const name = text(formData, "name").trim().replace(/\s+/g, " ");
  const email = text(formData, "email").trim().toLowerCase();
  const password = text(formData, "password");
  const values = { name, email };
  const fieldErrors: AuthFormState["fieldErrors"] = {};
  if (name.length < 2) fieldErrors.name = t("nameRequired");
  else if (name.length > 120) fieldErrors.name = t("nameTooLong");
  if (!EMAIL.test(email)) fieldErrors.email = t("emailInvalid");
  if (password.length < MIN_PASSWORD) fieldErrors.password = t("passwordTooShort", { min: MIN_PASSWORD });
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createSupabaseServerClient();
  // O /me da API lê o nome de user_metadata.full_name.
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
  if (error) return { error: t(authErrorKey(error, "signUpFailed"), { min: MIN_PASSWORD }), values };
  if (!data.session) {
    // Só acontece se a confirmação de e-mail estiver ligada (no ambiente local, está desligada).
    return { error: t("confirmEmail"), values };
  }
  redirect("/app");
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  // Sai só deste navegador; as outras sessões da pessoa continuam.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/entrar");
}
