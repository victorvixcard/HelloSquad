import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => cleanup());

// Navegação do Next: nos testes de componente, o roteador é um espião e o Link é um <a>.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/app/miolo",
}));
vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
      React.createElement("a", { href, ...rest }, children),
  };
});
// Server Actions só existem no servidor do Next; os testes passam as suas por props ou espiam estas.
vi.mock("@/app/app/[workspace]/actions", () => ({
  loadConversationAction: vi.fn(),
  sendMessageAction: vi.fn(),
  decideApprovalAction: vi.fn(),
  createDirectConversationAction: vi.fn(),
}));
vi.mock("@/lib/auth-actions", () => ({ signOut: vi.fn() }));

// jsdom não tem ResizeObserver (o Início mede a composição como o protótipo).
if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
