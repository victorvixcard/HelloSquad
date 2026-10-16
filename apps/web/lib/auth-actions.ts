"use server";

import { redirect } from "next/navigation";
import { authErrorMessage } from "./auth-errors";
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
  const email = text(formData, "email").trim().toLowerCase();
  const password = text(formData, "password");
  const values = { email };
  const fieldErrors: AuthFormState["fieldErrors"] = {};
  if (!EMAIL.test(email)) fieldErrors.email = "Digite o seu e-mail.";
  if (!password) fieldErrors.password = "Digite a sua senha.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorMessage(error, "Não foi possível entrar agora. Tente de novo."), values };
  redirect(safeNext(text(formData, "next")) ?? "/app");
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = text(formData, "name").trim().replace(/\s+/g, " ");
  const email = text(formData, "email").trim().toLowerCase();
  const password = text(formData, "password");
  const values = { name, email };
  const fieldErrors: AuthFormState["fieldErrors"] = {};
  if (name.length < 2) fieldErrors.name = "Digite o seu nome.";
  else if (name.length > 120) fieldErrors.name = "Use até 120 caracteres.";
  if (!EMAIL.test(email)) fieldErrors.email = "Digite um e-mail válido.";
  if (password.length < MIN_PASSWORD) fieldErrors.password = `A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`;
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createSupabaseServerClient();
  // O /me da API lê o nome de user_metadata.full_name.
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
  if (error) return { error: authErrorMessage(error, "Não foi possível criar a sua conta agora. Tente de novo."), values };
  if (!data.session) {
    // Só acontece se a confirmação de e-mail estiver ligada (no ambiente local, está desligada).
    return { error: "Conta criada. Confirme o seu e-mail para entrar.", values };
  }
  redirect("/app");
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  // Sai só deste navegador; as outras sessões da pessoa continuam.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/entrar");
}
