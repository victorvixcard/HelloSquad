import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountMenu } from "@/components/product/AccountMenu";
import { renderWithShell } from "./render";

const nav = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: nav.refresh }),
  usePathname: () => "/app/miolo",
}));
vi.mock("@/lib/auth-actions", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/locale-actions", () => ({ setUserLocaleAction: vi.fn() }));

const BASE = {
  name: "Marina",
  role: "owner" as const,
  business: { slug: "miolo", name: "Miolo" },
  businesses: [{ slug: "miolo", name: "Miolo" }],
};

async function openMenu(props: Partial<Parameters<typeof AccountMenu>[0]> = {}) {
  const onUnavailable = vi.fn();
  const onNotice = vi.fn();
  const setLocale = vi.fn().mockResolvedValue({ ok: true });
  const user = userEvent.setup();
  renderWithShell(<AccountMenu {...BASE} onUnavailable={onUnavailable} onNotice={onNotice} setLocale={setLocale} {...props} />);
  await user.click(screen.getByRole("button", { name: "Conta, negócio e configurações. Marina, Miolo" }));
  return { user, onUnavailable, onNotice, setLocale: (props.setLocale as typeof setLocale) ?? setLocale };
}

describe("idioma da tela no menu da conta (ADR-0010)", () => {
  it("lista pt-BR, en e es pelo nome no próprio idioma, com o atual marcado", async () => {
    await openMenu();
    const group = screen.getByRole("group", { name: "Idioma" });
    const options = Array.from(group.querySelectorAll("button"));
    expect(options.map((b) => b.textContent)).toEqual(["PTPortuguês (Brasil)", "ENEnglish", "ESEspañol"]);
    expect(options.map((b) => b.getAttribute("lang"))).toEqual(["pt-BR", "en", "es"]);
    expect(screen.getByRole("button", { name: "Português (Brasil), idioma da tela" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "English, idioma da tela" })).toHaveAttribute("aria-pressed", "false");
  });

  it("escolher English guarda na conta e relê a página no servidor", async () => {
    nav.refresh.mockClear();
    const { user, setLocale, onNotice } = await openMenu();
    await user.click(screen.getByRole("button", { name: "English, idioma da tela" }));
    expect(setLocale).toHaveBeenCalledWith("en");
    await waitFor(() => expect(nav.refresh).toHaveBeenCalledTimes(1));
    expect(onNotice).not.toHaveBeenCalled();
  });

  it("escolher o idioma que já está na tela não faz nada", async () => {
    const { user, setLocale } = await openMenu();
    await user.click(screen.getByRole("button", { name: "Português (Brasil), idioma da tela" }));
    expect(setLocale).not.toHaveBeenCalled();
  });

  it("se a conta não guardar, avisa e não relê", async () => {
    nav.refresh.mockClear();
    const setLocale = vi.fn().mockResolvedValue({ ok: false });
    const { user, onNotice } = await openMenu({ setLocale });
    await user.click(screen.getByRole("button", { name: "Español, idioma da tela" }));
    await waitFor(() => expect(onNotice).toHaveBeenCalledWith("Não deu para trocar o idioma. Tente de novo."));
    expect(nav.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Português (Brasil), idioma da tela" })).toHaveAttribute("aria-pressed", "true");
  });

  it("idioma do negócio fica no grupo Negócio e, sem a API, dá o aviso padrão", async () => {
    const { user, onUnavailable } = await openMenu();
    await user.click(screen.getByRole("button", { name: /^Idioma do negócio/ }));
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });
});
