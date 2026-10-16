"use server";

import { isLocale } from "@/i18n/config";
import { createSupabaseServerClient } from "./supabase/server";

export type LocaleActionResult = { ok: true } | { ok: false };

/**
 * Guarda o idioma da pessoa na conta da Auth (`user_metadata.locale`, ADR-0010), sem passar pela API: a tabela de
 * usuários ainda não tem `locale` (pedido à S2b). O middleware lê o idioma das claims do token de acesso; por isso a
 * sessão é renovada aqui, para o próximo token já levar a escolha.
 */
export async function setUserLocaleAction(locale: string): Promise<LocaleActionResult> {
  if (!isLocale(locale)) return { ok: false };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ data: { locale } });
  if (error) return { ok: false };
  const refreshed = await supabase.auth.refreshSession();
  return refreshed.error ? { ok: false } : { ok: true };
}
