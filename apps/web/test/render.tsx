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
    directThreads: {
      otto: [
        { id: "otto-1", title: "Conversa com o Otto", at: "2026-10-16T09:10:00-03:00" },
        { id: "otto-0", title: "Ideias para o Dia do Pão", at: "2026-09-23T15:00:00-03:00" },
      ],
    },
    rememberThread: vi.fn(),
    canDecide: true,
    toast: vi.fn(),
    workConversations: {},
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
