import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { vi } from "vitest";

// Apoio dos testes do site público (A2c): o next-intl do servidor lê o catálogo real de cada idioma, e os componentes
// assíncronos (Server Components) são resolvidos antes do render do Testing Library, que não sabe esperar por eles.

vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const { loadMessages } = await import("@/i18n/catalogs");
  return {
    getTranslations: async ({ locale, namespace }: { locale: "pt-BR" | "en" | "es"; namespace?: string }) =>
      createTranslator({ locale, messages: await loadMessages(locale), namespace: namespace as never }),
    getLocale: async () => "pt-BR",
  };
});

type AnyProps = { children?: ReactNode };

/** Troca cada componente `async` da árvore pelo que ele devolve, até sobrar só o que o React renderiza sozinho. */
export async function resolveServer(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveServer));
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<AnyProps>;
  if (typeof element.type === "function" && element.type.constructor.name === "AsyncFunction") {
    return resolveServer(await (element.type as (props: AnyProps) => Promise<ReactNode>)(element.props));
  }
  if (element.props && element.props.children !== undefined) {
    return cloneElement(element, undefined, await resolveServer(element.props.children));
  }
  return element;
}
