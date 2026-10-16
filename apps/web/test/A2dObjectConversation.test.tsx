import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConversationPanel, type ConversationActions } from "@/components/product/ConversationPanel";
import type { MetricFigure } from "@/components/product/conversation-format";
import type { ConversationContextRef } from "@/components/product/shell-context";
import { productLayout } from "@/lib/product-layout";
import { makeShell, renderWithShell } from "./render";

/** Conversas de objeto (A2d, P-09 e P-10): "Hoje", sugestões do tipo, cartão do indicador e a coluna "Contexto". */
const NOW = new Date("2026-10-16T11:00:00-03:00");

function actions(): ConversationActions {
  return {
    load: vi.fn(async () => ({ ok: true as const, data: { detail: { context: null, opening: null } as never, messages: [], older: null } })),
    older: vi.fn(async () => ({ ok: true as const, data: { messages: [], older: null } })),
    send: vi.fn(),
    create: vi.fn(),
    createWork: vi.fn(),
    decide: vi.fn(),
  } as unknown as ConversationActions;
}

const PERIOD = "Últimos 30 dias · 17/09 a 16/10";
const FIGURE: MetricFigure = { value: "128", delta: "+18%", up: true, points: [90, 96, 110, 128], period: "17/09 a 16/10", previous: "18/08 a 16/09" };

function shellFor(context: ConversationContextRef & { figure?: MetricFigure }, agent: "iris" | "otto" | "bia", mode: "panel" | "full" = "panel") {
  return makeShell({
    layout: productLayout({ vw: 1440, vh: 900, sideMin: null, mode, pilot: false, pop: false }),
    conversation: { mode, target: { conversationId: "c-obj", agent, context } },
  });
}

const metric = (figure?: MetricFigure): ConversationContextRef & { figure?: MetricFigure } => ({
  kind: "metric",
  label: "Pedidos",
  href: "/app/miolo/squad/iris",
  period: PERIOD,
  origin: "Resultados · mês",
  ref: { type: "metric", key: "store.orders", title: "Pedidos", period: PERIOD, origin: "Resultados · mês" },
  ...(figure ? { figure } : {}),
});

describe("conversa de objeto (A2d)", () => {
  it("P-09: indicador abre com 'Hoje' e as três sugestões da V4.6 com a linha de apoio; sem status 'disponível'", async () => {
    const { container } = renderWithShell(<ConversationPanel actions={actions()} now={NOW} />, shellFor(metric(), "iris"));
    expect(await screen.findByText("Hoje")).toBeInTheDocument();
    const sug = screen.getByRole("group", { name: "Pergunte à Íris" });
    const items = within(sug).getAllByRole("button");
    expect(items.map((b) => b.querySelector("b")?.textContent)).toEqual([
      "Por que esse indicador mudou?",
      "O que podemos melhorar?",
      "Isso está relacionado à campanha?",
    ]);
    expect(within(sug).getByText("Quando a mudança começou e o que coincide com ela.")).toBeInTheDocument();
    expect(container.querySelector(".ps-cvh-st")?.textContent).toBe("");
    // Sem o número da série, nada de cartão nem de curva: o web não inventa número.
    expect(container.querySelector(".cx-kpi")).toBeNull();
  });

  it("P-09: publicação e oportunidade com as sugestões do tipo", async () => {
    const post: ConversationContextRef = {
      kind: "calendar_post",
      label: "Bastidores da fermentação longa",
      ref: { type: "calendar_post", id: "p-2", title: "Bastidores da fermentação longa" },
    };
    const { unmount } = renderWithShell(<ConversationPanel actions={actions()} now={NOW} />, shellFor(post, "otto"));
    const sug = await screen.findByRole("group", { name: "Pergunte ao Otto" });
    expect(within(sug).getAllByRole("button")).toHaveLength(4);
    expect(within(sug).getByText("Quero mudar a legenda.")).toBeInTheDocument();
    unmount();
    const opp: ConversationContextRef = {
      kind: "opportunity",
      label: "Encomenda antecipada de Natal",
      ref: { type: "opportunity", key: "dx-1:o1", title: "Encomenda antecipada de Natal" },
    };
    renderWithShell(<ConversationPanel actions={actions()} now={NOW} />, shellFor(opp, "bia"));
    const sugB = await screen.findByRole("group", { name: "Pergunte à Bia" });
    expect(within(sugB).getAllByRole("button").map((b) => b.querySelector("b")?.textContent)).toEqual([
      "Por que essa oportunidade?",
      "O que podemos melhorar?",
      "Isso está relacionado à campanha?",
    ]);
  });

  it("P-09/P-10: com o número da série, o cartão no histórico e a coluna trazem número, variação, curva e a comparação", async () => {
    const { container } = renderWithShell(<ConversationPanel actions={actions()} now={NOW} />, shellFor(metric(FIGURE), "iris", "full"));
    expect(await screen.findByText("Hoje")).toBeInTheDocument();
    const card = container.querySelector(".ps-msgs .cx-kpi") as HTMLElement;
    expect(within(card).getByText("128")).toBeInTheDocument();
    expect(within(card).getByText("+18%")).toHaveClass("ps-delta", "is-up");
    expect(within(card).getByText("17/09 a 16/10 · vs 18/08 a 16/09")).toBeInTheDocument();
    expect(card.querySelector("svg.cx-kpi-sp path")?.getAttribute("d")).toMatch(/^M0\.0 /);
    expect(card.textContent).not.toMatch(/ilustrativos/);
    const rail = screen.getByRole("complementary", { name: "Contexto da conversa" });
    expect(rail.querySelector(".ps-rail-kpi .ps-big")?.textContent).toBe("128");
    expect(rail.querySelector(".ps-rail-kpi svg.ps-spk")).not.toBeNull();
    expect(within(rail).getByText("17/09 a 16/10 · comparado com 18/08 a 16/09")).toHaveClass("ps-rail-s");
    // "Voltar para Resultados" logo abaixo dos fatos: a coluna tem a altura do conteúdo (V4.6 `.is-cx .ps-rail`).
    expect(rail).toHaveStyle({ alignSelf: "flex-start" });
    expect(within(rail).getByRole("button", { name: "Voltar para Resultados" })).toBeInTheDocument();
  });
});
