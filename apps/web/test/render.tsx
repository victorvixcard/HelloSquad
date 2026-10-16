import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { ShellContext, type ShellApi } from "@/components/product/shell-context";
import { productLayout } from "@/lib/product-layout";
import messages from "@/messages/pt-BR";

export function makeShell(overrides: Partial<ShellApi> = {}): ShellApi {
  return {
    workspace: { id: "ws-1", slug: "miolo", name: "Miolo" },
    layout: productLayout({ vw: 1440, vh: 900, sideMin: null, mode: "off", pilot: false, pop: false }),
    conversation: { mode: "off", target: null },
    openConversation: vi.fn(),
    closeConversation: vi.fn(),
    conversationIds: { room: "room-1", direct: { otto: "otto-1" } },
    toast: vi.fn(),
    ...overrides,
  };
}

export function renderWithShell(ui: ReactElement, shell: ShellApi = makeShell()) {
  return {
    shell,
    ...render(
      <NextIntlClientProvider locale="pt-BR" timeZone="America/Sao_Paulo" messages={messages}>
        <ShellContext.Provider value={shell}>{ui}</ShellContext.Provider>
      </NextIntlClientProvider>,
    ),
  };
}
