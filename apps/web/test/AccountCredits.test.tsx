import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountMenu, creditsPercent } from "@/components/product/AccountMenu";
import { renderWithShell } from "./render";

vi.mock("@/lib/auth-actions", () => ({ signOut: vi.fn() }));

const BASE = {
  name: "Marina",
  role: "owner" as const,
  business: { slug: "miolo", name: "Miolo" },
  businesses: [{ slug: "miolo", name: "Miolo" }],
  onUnavailable: vi.fn(),
};

describe("Plano Squad · créditos do mês (V4.6 L4559, dados de GET /me da S1e)", () => {
  it("a barra fica no menu da conta, entre os negócios e Minha conta, com o ciclo usado em %", async () => {
    const user = userEvent.setup();
    const { container } = renderWithShell(<AccountMenu {...BASE} credits={{ plan: "Squad", used: 64, total: 100 }} />);
    await user.click(screen.getByRole("button", { name: "Conta, negócio e configurações. Marina, Miolo" }));
    const cred = container.querySelector(".sb-pop-acct .sb-cred") as HTMLElement;
    expect(cred).toBeInTheDocument();
    expect(cred).toHaveTextContent("Plano Squad · créditos do mês64%");
    expect(cred.querySelector(".sb-cred-bar > i")).toHaveStyle({ width: "64%" });
    // Ordem do template: lista de negócios → créditos → Minha conta, Configurações, Sair.
    const order = Array.from(container.querySelector(".sb-pop-acct")!.children).map((el) => el.className);
    expect(order.indexOf("sb-biz-l")).toBeLessThan(order.indexOf("sb-cred"));
    expect(order.indexOf("sb-cred")).toBeLessThan(order.indexOf("sb-acc-l"));
    // Sem preço: só o plano e a parte usada do ciclo.
    expect(cred.textContent).not.toMatch(/R\$|crédito(s)? disponíveis|\d+ créditos/);
  });

  it("primeiro acesso (Trilha 0,8 de 20) mostra 4%; sem ciclo, 0%; sem dado, sem barra", async () => {
    expect(creditsPercent(0.8, 20)).toBe(4);
    expect(creditsPercent(0, 0)).toBe(0);
    expect(creditsPercent(130, 100)).toBe(100);
    const user = userEvent.setup();
    const { container } = renderWithShell(<AccountMenu {...BASE} credits={null} />);
    await user.click(screen.getByRole("button", { name: "Conta, negócio e configurações. Marina, Miolo" }));
    expect(container.querySelector(".sb-cred")).toBeNull();
  });
});
