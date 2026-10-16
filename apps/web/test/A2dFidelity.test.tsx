import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GrowthEnvironment } from "@/components/env/growth/GrowthEnvironment";
import { makeShell, renderWithShell } from "./render";

/** A2d · correções da H2 contra a Product UI V4.6 (lado web). */
describe("A2d · H2-31 (P-08): o objeto da conversa do ambiente da Kiwi é Growth", () => {
  it("o título da tela segue Growth Marketing; o botão e o objeto da conversa usam o rótulo curto Growth (V4.6 ENVS.media.l)", async () => {
    const user = userEvent.setup();
    const { shell } = renderWithShell(<GrowthEnvironment business="Miolo" needs={[]} />, makeShell());
    expect(screen.getByRole("heading", { level: 1, name: "Growth Marketing" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Growth Marketing, ao lado/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Conversar com Kiwi sobre Growth, ao lado" }));
    expect(shell.openConversation).toHaveBeenCalledWith({
      conversationId: null,
      agent: "kiwi",
      context: {
        kind: "env",
        label: "Growth",
        href: "/app/miolo/squad/kiwi",
        meta: "Kiwi cuida do crescimento de Miolo: busca, anúncios e mais visitas virando encomendas.",
        ref: { type: "environment", key: "kiwi", title: "Growth" },
      },
    });
  });
});
