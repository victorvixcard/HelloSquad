import type { Messages } from "@/messages/pt-BR";

export type WorkspaceFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "slug", string>>;
  values?: { name: string; slug: string };
};

/** Chave da mensagem de validação em onboarding.errors do catálogo. */
export type WorkspaceErrorKey = keyof Messages["onboarding"]["errors"];

/** Endereços que a área logada usa como rota própria e não podem virar workspace. */
export const RESERVED_SLUGS = ["novo-workspace"];

export const SLUG_PATTERN = /^[a-z0-9-]{3,48}$/;

/** Sugestão de endereço a partir do nome: sem acento, minúsculas, números e hífen. */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 48)
    .replace(/-+$/, "");
}

/** Mesmas regras da API (3 a 48 caracteres, a-z, 0-9 e hífen); devolve a chave da mensagem de cada campo. */
export function validateWorkspaceForm(values: {
  name: string;
  slug: string;
}): Partial<Record<"name" | "slug", WorkspaceErrorKey>> | null {
  const errors: Partial<Record<"name" | "slug", WorkspaceErrorKey>> = {};
  if (!values.name) errors.name = "nameRequired";
  else if (values.name.length > 120) errors.name = "nameTooLong";
  if (!values.slug) errors.slug = "slugRequired";
  else if (values.slug.length < 3 || values.slug.length > 48) errors.slug = "slugLength";
  else if (!SLUG_PATTERN.test(values.slug)) errors.slug = "slugPattern";
  else if (RESERVED_SLUGS.includes(values.slug)) errors.slug = "slugReserved";
  return Object.keys(errors).length ? errors : null;
}
