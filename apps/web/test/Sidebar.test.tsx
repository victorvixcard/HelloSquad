import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Sidebar, type SidebarProps } from "@/components/product/Sidebar";
import { renderWithShell } from "./render";

function props(over: Partial<SidebarProps> = {}): SidebarProps {
  return {
    slug: "miolo",
    current: "cont",
    min: false,
    onToggle: vi.fn(),
    needsCount: 1,
    agentExpression: (a) => (a === "otto" ? "big" : "oval"),
    account: {
      name: "Marina",
      role: "owner",
      business: { slug: "miolo", name: "Miolo" },
      businesses: [{ slug: "miolo", name: "Miolo" }],
      onUnavailable: vi.fn(),
    },
    ...over,
  };
}

describe("barra lateral V4.6", () => {
  it("tem os três grupos e os doze destinos, na ordem do protótipo", () => {
    renderWithShell(<Sidebar {...props()} />);
    const nav = screen.getByRole("navigation", { name: "HelloSquad" });
    expect(within(nav).getAllByRole("group").map((g) => g.getAttribute("aria-label"))).toEqual(["Principal", "Seu squad", "Gestão"]);
    const labels = [...nav.querySelectorAll(".sb-nl")].map((n) => n.textContent);
    expect(labels).toEqual([
      "Início",
      "Sala do Squad",
      "Projetos",
      "Estratégia",
      "Marca & Criação",
      "Conteúdo",
      "Growth Marketing",
      "CRM",
      "Resultados",
      "Modo Autônomo",
      "Memória da Marca",
      "Minha Equipe & Conversas",
    ]);
  });

  it("cada ambiente do squad traz o agente mini (não uma bolinha) e o nome do especialista", () => {
    const { container } = renderWithShell(<Sidebar {...props()} />);
    const squad = container.querySelectorAll(".sb-g.is-squad .sb-ni");
    expect(squad).toHaveLength(7);
    for (const item of squad) {
      expect(item.querySelector(".sb-who-av svg.hs-mini")).not.toBeNull();
      expect(item.querySelector(".sb-who-n")?.textContent).toBeTruthy();
    }
    expect(container.querySelector(".hs-dot, .hs-agent-dot")).toBeNull();
  });

  it("o item ativo tem aria-current e o agente com a expressão de quem espera", () => {
    const { container } = renderWithShell(<Sidebar {...props()} />);
    const on = screen.getByRole("link", { name: "Conteúdo, com Otto" });
    expect(on).toHaveAttribute("aria-current", "page");
    expect(on.className).toContain("is-on");
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it("Projetos mostra o badge das decisões pendentes", () => {
    renderWithShell(<Sidebar {...props()} />);
    const proj = screen.getByRole("link", { name: "Projetos, com Nexo, 1 aguarda você" });
    expect(proj.querySelector(".sb-nb")?.textContent).toBe("1");
  });

  it("Modo Autônomo usa o interruptor do DS (o Coordenador dormindo), não um ícone", () => {
    const { container } = renderWithShell(<Sidebar {...props()} />);
    const auto = container.querySelector('[data-nav="auto"]');
    expect(auto?.querySelector(".sb-sw.is-nav .sb-knob .hs-k-sleep")).not.toBeNull();
    expect(auto?.querySelector("svg.sb-ic")).toBeNull();
  });

  it("a conta da pessoa fica no pé da barra e abre o menu de negócio", async () => {
    const user = userEvent.setup();
    const { container } = renderWithShell(<Sidebar {...props()} />);
    const me = screen.getByRole("button", { name: "Conta, negócio e configurações. Marina, Miolo" });
    expect(container.querySelector(".sb-foot")?.contains(me)).toBe(true);
    await user.click(me);
    const dialog = screen.getByRole("dialog", { name: "Conta, negócio e configurações" });
    expect(within(dialog).getByText("Adicionar um negócio")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Sair" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Conta, negócio e configurações" })).toBeNull();
    expect(me).toHaveFocus();
  });

  it("recolher: o botão diz o que faz e chama onToggle", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    renderWithShell(<Sidebar {...props({ onToggle })} />);
    await user.click(screen.getByRole("button", { name: "Recolher a barra lateral" }));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
