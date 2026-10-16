import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Agent, AGENT_IDS, AgentDot, getAgent } from "../src";

describe("Agent", () => {
  it("renderiza os sete agentes com a cor oficial de cada um", () => {
    const { container } = render(
      <div>
        {AGENT_IDS.map((id) => (
          <Agent key={id} agent={id} title={getAgent(id).name} />
        ))}
      </div>,
    );
    const svgs = container.querySelectorAll("svg[data-agent]");
    expect(svgs).toHaveLength(7);
    for (const id of AGENT_IDS) {
      const svg = screen.getByRole("img", { name: getAgent(id).name });
      expect(svg).toHaveAttribute("data-agent", id);
      expect(svg.innerHTML).toContain(`fill: ${getAgent(id).color}`);
      expect(svg.querySelector(".hs-eyes .hs-lids")).not.toBeNull();
    }
  });

  it("os nomes acessíveis usam os nomes do squad", () => {
    render(
      <div>
        {AGENT_IDS.map((id) => (
          <Agent key={id} agent={id} title={getAgent(id).name} />
        ))}
      </div>,
    );
    expect(screen.getAllByRole("img").map((el) => el.getAttribute("aria-label"))).toEqual([
      "Nexo", "Bia", "Kaia", "Otto", "Kiwi", "Max", "Íris",
    ]);
  });

  it("sem título é decorativo", () => {
    const { container } = render(<Agent agent="bia" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
  });

  it("tamanhos mini (16) e padrão (24), com corte óptico diferente em tamanho grande", () => {
    const { container } = render(
      <div>
        <Agent agent="nexo" size="mini" />
        <Agent agent="nexo" />
        <Agent agent="nexo" size={96} />
      </div>,
    );
    const [mini, padrao, grande] = Array.from(container.querySelectorAll("svg"));
    expect(mini).toHaveAttribute("width", "16");
    expect(padrao).toHaveAttribute("width", "24");
    expect(grande).toHaveAttribute("width", "96");
    expect(mini.innerHTML).toBe(padrao.innerHTML);
    expect(grande.innerHTML).not.toBe(padrao.innerHTML);
  });

  it("expressão troca os olhos e thinking anima", () => {
    const { container } = render(
      <div>
        <Agent agent="otto" expression="oval" />
        <Agent agent="otto" expression="happy" thinking />
      </div>,
    );
    const [oval, happy] = Array.from(container.querySelectorAll("svg"));
    expect(oval.innerHTML).not.toBe(happy.innerHTML);
    expect(happy).toHaveClass("hs-think");
    expect(oval).not.toHaveClass("hs-think");
  });

  it("Kiwi tem a forma girada do hexágono, como no DS", () => {
    const { container } = render(<Agent agent="kiwi" />);
    expect(container.querySelector('g[transform="rotate(-12)"]')).not.toBeNull();
  });
});

describe("AgentDot", () => {
  it("pinta a cor do agente e é decorativo sem rótulo", () => {
    const { container } = render(<AgentDot agent="max" />);
    const dot = container.querySelector("span");
    expect(dot).toHaveStyle({ background: "#00E5C3" });
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  it("com rótulo vira imagem acessível", () => {
    render(<AgentDot agent="iris" label="Íris" />);
    expect(screen.getByRole("img", { name: "Íris" })).toBeInTheDocument();
  });
});
