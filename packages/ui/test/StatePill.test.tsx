import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommandField, PRODUCT_STATES, StatePill, type ProductState } from "../src";

const STATES = Object.keys(PRODUCT_STATES) as ProductState[];

describe("StatePill", () => {
  it.each(STATES)("estado %s tem texto e glifo próprios (nunca só cor)", (state) => {
    const { container } = render(<StatePill state={state} />);
    const pill = container.querySelector(".hs-st");
    const meta = PRODUCT_STATES[state];
    expect(pill).toHaveAttribute("data-state", state);
    expect(pill).toHaveClass(`hs-st--${meta.glyph}`);
    expect(screen.getByText(meta.label)).toBeInTheDocument();
    const glyph = container.querySelector("svg.hs-sg");
    expect(glyph).toHaveClass(`is-${meta.glyph}`);
    expect(glyph).toHaveAttribute("aria-hidden", "true");
    expect(glyph?.querySelector("path")).not.toBeNull();
  });

  it("os sete estados têm desenhos diferentes", () => {
    const drawings = STATES.map((state) => {
      const { container, unmount } = render(<StatePill state={state} />);
      const html = container.querySelector("svg")?.innerHTML;
      unmount();
      return html;
    });
    expect(new Set(drawings).size).toBe(STATES.length);
  });

  it("rótulos em português", () => {
    expect(STATES.map((s) => PRODUCT_STATES[s].label)).toEqual([
      "Aguardando você", "Em andamento", "Programado", "Concluído", "Pausado", "Bloqueado", "Erro",
    ]);
  });

  it("aceita rótulo próprio mantendo o desenho do estado", () => {
    const { container } = render(<StatePill state="awaiting_you" label="Aguarda a sua aprovação" />);
    expect(screen.getByText("Aguarda a sua aprovação")).toBeInTheDocument();
    expect(container.querySelector(".hs-st")).toHaveClass("hs-st--you");
  });

  it("presença: agente, ação e detalhe (StatePill do DS)", () => {
    const { container } = render(
      <StatePill agent="bia" label="Estratégia" detail="desenvolvendo o plano" thinking />,
    );
    const pill = container.querySelector(".hs-state");
    expect(pill).toHaveTextContent("Estratégia desenvolvendo o plano");
    expect(pill?.querySelector('svg[data-agent="bia"]')).toHaveClass("hs-think");
  });
});

describe("CommandField", () => {
  it("Enter envia o texto e Esc limpa", () => {
    const onSend = vi.fn();
    render(<CommandField onSend={onSend} />);
    const input = screen.getByRole("textbox", { name: "Converse com o seu squad" });
    expect(input).toHaveAttribute("placeholder", "Peça algo ao seu squad");
    fireEvent.change(input, { target: { value: "Vender mais neste fim de semana" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("Vender mais neste fim de semana");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("");
  });

  it("vazio não envia: o botão fica indisponível", () => {
    render(<CommandField />);
    expect(screen.getByRole("button", { name: "Enviar pedido" })).toBeDisabled();
  });

  it("indisponível explica o motivo pela nota ligada ao campo", () => {
    render(<CommandField disabled note="Disponível na Fase 1." />);
    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
    expect(input).toHaveAccessibleDescription("Disponível na Fase 1.");
    expect(screen.getByRole("button", { name: "Enviar pedido" })).toBeDisabled();
  });
});
