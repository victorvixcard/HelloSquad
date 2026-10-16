export type WorkspaceFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "slug", string>>;
  values?: { name: string; slug: string };
};

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

/** Mesmas regras da API (3 a 48 caracteres, a-z, 0-9 e hífen), com mensagens em português. */
export function validateWorkspaceForm(values: { name: string; slug: string }): WorkspaceFormState["fieldErrors"] | null {
  const errors: NonNullable<WorkspaceFormState["fieldErrors"]> = {};
  if (!values.name) errors.name = "Digite o nome do negócio.";
  else if (values.name.length > 120) errors.name = "Use até 120 caracteres.";
  if (!values.slug) errors.slug = "Escolha um endereço.";
  else if (values.slug.length < 3 || values.slug.length > 48) errors.slug = "O endereço precisa ter de 3 a 48 caracteres.";
  else if (!SLUG_PATTERN.test(values.slug)) errors.slug = "Use só letras minúsculas, números e hífen.";
  else if (RESERVED_SLUGS.includes(values.slug)) errors.slug = "Esse endereço é reservado. Escolha outro.";
  return Object.keys(errors).length ? errors : null;
}
