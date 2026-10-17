import { getMessages } from "next-intl/server";
import type { Messages } from "@/messages/pt-BR";

type Namespace = keyof Messages;

/**
 * Áreas do catálogo que vão ao browser em cada parte do site (H2-08). O provider do next-intl serializa no HTML tudo o
 * que recebe; sem a escolha, cada página pública levava o catálogo inteiro, inclusive o da área logada.
 * - `root`: o que os componentes cliente fora da área logada e das telas de entrar usam (as páginas de erro);
 *   o site público só tem componentes de servidor.
 * - `auth`: entrar e criar conta (formulários e campos).
 * - `app`: a área logada, com tudo menos o texto do site público e o do painel do Super Admin.
 * - `admin`: o painel do Super Admin (SA2), com o catálogo dele e o do sistema (erros e falha da API).
 */
const ROOT: readonly Namespace[] = ["system"];
const AUTH: readonly Namespace[] = ["auth", "system"];
const APP_EXCLUDED: readonly Namespace[] = ["site", "admin"];
const ADMIN: readonly Namespace[] = ["admin", "system", "common"];

export type ClientArea = "root" | "auth" | "app" | "admin";

export function pickNamespaces(messages: Messages, area: ClientArea): Partial<Messages> {
  const all = Object.keys(messages) as Namespace[];
  const keep =
    area === "app"
      ? all.filter((ns) => !APP_EXCLUDED.includes(ns))
      : area === "admin"
        ? ADMIN
        : area === "auth"
          ? AUTH
          : ROOT;
  return Object.fromEntries(keep.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]])) as Partial<Messages>;
}

/** Catálogo do idioma da requisição só com as áreas da parte do site (`NextIntlClientProvider messages`). */
export async function clientMessages(area: ClientArea): Promise<Partial<Messages>> {
  return pickNamespaces((await getMessages()) as Messages, area);
}
