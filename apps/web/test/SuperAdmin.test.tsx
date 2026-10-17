import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { FilterSelect } from "@/components/admin/Filters";
import { ADMIN_NAV, adminNavOf } from "@/components/admin/nav";
import { TwoFactorBand } from "@/components/admin/TwoFactorBand";
import { DataTable, LockedCheck, Status } from "@/components/admin/ui";
import { pickNamespaces } from "@/i18n/client-messages";
import { adminFormat } from "@/lib/admin-format";
import { codeLabel, hrefWith } from "@/lib/admin-labels";
import { safeNext } from "@/lib/safe-next";
import { adminGateOf } from "@/lib/supabase/middleware";
import { ADMIN_FORBIDDEN_PATH, isAdminPath } from "@/lib/supabase/session-cookie";
import en from "@/messages/en";
import es from "@/messages/es";
import messages from "@/messages/pt-BR";

const nav = vi.hoisted(() => ({ path: "/admin/contas", query: "", push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.path,
  useRouter: () => ({ push: nav.push, replace: nav.push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.query),
}));

function renderAdmin(ui: ReactElement, catalog = messages, locale: "pt-BR" | "en" | "es" = "pt-BR") {
  return render(
    <NextIntlClientProvider locale={locale} timeZone="America/Sao_Paulo" messages={catalog}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const vic = { name: "Vic", email: "vic@hellosquad.example" };

beforeEach(() => {
  nav.path = "/admin/contas";
  nav.query = "";
  nav.push.mockReset();
  window.history.replaceState(null, "", "/");
});

describe("entrada do /admin (SA2)", () => {
  it("o middleware deixa a API decidir: 200 entra, 403 página honesta, 401 login, o resto passa para a casca", () => {
    expect(adminGateOf(200)).toBe("admin");
    expect(adminGateOf(403)).toBe("forbidden");
    expect(adminGateOf(401)).toBe("login");
    expect(adminGateOf(500)).toBe("unknown");
    expect(adminGateOf(null)).toBe("unknown");
  });

  it("/admin e o que vem abaixo são do painel; /administrar não", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/contas/1")).toBe(true);
    expect(isAdminPath("/administrar")).toBe(false);
    expect(isAdminPath("/app/admin")).toBe(false);
    expect(ADMIN_FORBIDDEN_PATH.startsWith("/admin/")).toBe(true);
  });

  it("depois do login volta ao painel, sem abrir redirecionamento para fora", () => {
    expect(safeNext("/admin")).toBe("/admin");
    expect(safeNext("/admin/contas?q=miolo")).toBe("/admin/contas?q=miolo");
    expect(safeNext("/app/miolo")).toBe("/app/miolo");
    expect(safeNext("/administrador")).toBeNull();
    expect(safeNext("//evil.example/admin")).toBeNull();
    expect(safeNext("https://evil.example/admin")).toBeNull();
  });

  it("o catálogo do painel vai ao browser só no painel; o produto não leva o texto do Super Admin", () => {
    expect(Object.keys(pickNamespaces(messages, "admin")).sort()).toEqual(["admin", "common", "system"]);
    expect(Object.keys(pickNamespaces(messages, "app"))).not.toContain("admin");
    expect(Object.keys(pickNamespaces(messages, "root"))).not.toContain("admin");
  });
});

describe("casca do Super Admin", () => {
  it("wordmark com a etiqueta Super Admin, os dois grupos e Contas ativo também no detalhe da conta", () => {
    nav.path = "/admin/contas/6bcdc5bd-3c9a-4a7a-bb83-22b2ba88edc2";
    renderAdmin(<AdminSidebar person={vic} />);
    const sidebar = screen.getByRole("navigation", { name: "Navegação do Super Admin" });
    expect(within(sidebar).getByText("Super Admin")).toBeInTheDocument();
    expect(within(sidebar).getByRole("group", { name: "Operação" })).toBeInTheDocument();
    expect(within(sidebar).getByRole("group", { name: "Squad IA" })).toBeInTheDocument();
    expect(within(sidebar).getByRole("link", { name: "Contas" })).toHaveAttribute("aria-current", "page");
    expect(within(sidebar).getByRole("link", { name: "Catálogo" })).not.toHaveAttribute("aria-current");
  });

  it("no Squad IA só Modelos e custos e Fila de trabalhos abrem; o resto aparece desabilitado, em breve", () => {
    renderAdmin(<AdminSidebar person={vic} />);
    const ia = screen.getByRole("group", { name: "Squad IA" });
    const links = within(ia).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toEqual(["/admin/modelos", "/admin/fila"]);
    for (const label of ["Squad", "Regras de negócio", "Referências", "Motor de imagem", "Consumo por cliente", "Saúde das APIs", "Qualidade das entregas"]) {
      const item = within(ia).getByText(label).closest(".sa-ni")!;
      expect(item).toHaveAttribute("aria-disabled", "true");
      expect(item.tagName).toBe("SPAN");
      expect(item).toHaveTextContent("em breve");
    }
    expect(ADMIN_NAV.flatMap((g) => g.items).filter((it) => it.href)).toHaveLength(7);
  });

  it("o menu da pessoa abre com teclado, leva ao produto e a Sair, e Esc devolve o foco", async () => {
    const user = userEvent.setup();
    renderAdmin(<AdminSidebar person={vic} />);
    const button = screen.getByRole("button", { name: "Menu de Vic" });
    expect(button).toHaveTextContent("vic@hellosquad.example");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "Sair" })).toHaveAttribute("href", "/sair");
    expect(screen.getByRole("menuitem", { name: "Ir para o HelloSquad" })).toHaveAttribute("href", "/app");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(button).toHaveFocus();
  });

  it("a faixa de 2FA abre o diálogo com os três passos; Esc fecha e devolve o foco à faixa", async () => {
    const user = userEvent.setup();
    renderAdmin(<TwoFactorBand />);
    const band = screen.getByRole("button", { name: /Verificação em duas etapas desligada/ });
    await user.click(band);
    const dialog = await screen.findByRole("dialog", { name: "Verificação em duas etapas" });
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(3);
    expect(dialog).toHaveTextContent("nada é gravado nesta fase");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(band).toHaveFocus();
  });

  it("fala inglês e espanhol pelo catálogo, sem texto fixo", () => {
    const { unmount } = renderAdmin(<AdminSidebar person={vic} />, en, "en");
    expect(screen.getByRole("group", { name: "Operations" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Job queue" })).toBeInTheDocument();
    unmount();
    renderAdmin(<AdminSidebar person={vic} />, es, "es");
    expect(screen.getByRole("link", { name: "Cuentas" })).toBeInTheDocument();
    expect(screen.getAllByText("pronto").length).toBeGreaterThan(0);
  });
});

describe("composições das telas", () => {
  it("a trava de venda é o Checkbox do DS só de leitura, com o motivo no nome acessível", () => {
    renderAdmin(<LockedCheck checked={false} label="À venda: Qualificar pedido" title="Travado até o preço ser aprovado" />);
    const box = screen.getByRole("checkbox", { name: /À venda: Qualificar pedido \(Travado até o preço ser aprovado\)/ });
    expect(box).toHaveAttribute("aria-checked", "false");
    expect(box).toHaveAttribute("aria-disabled", "true");
  });

  it("tabela vazia diz que está vazia (estado honesto), com legenda para leitor de tela", () => {
    renderAdmin(
      <DataTable<{ id: string }>
        caption="Webhooks recebidos"
        columns={[{ key: "id", label: "Evento", cell: (r) => r.id }]}
        rows={[]}
        rowKey={(r) => r.id}
        empty="Nenhum webhook recebido."
      />,
    );
    expect(screen.getByRole("table", { name: "Webhooks recebidos" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Nenhum webhook recebido." })).toBeInTheDocument();
  });

  it("um desenho por estado: falha em coral claro, ok com check", () => {
    const { container } = renderAdmin(
      <>
        <Status kind="fail">Falhou</Status>
        <Status kind="done">Concluído</Status>
      </>,
    );
    expect(container.querySelector(".sa-st.is-fail svg")).not.toBeNull();
    expect(container.querySelector(".sa-st.is-done svg")).not.toBeNull();
  });

  it("rótulos por código: código conhecido vira texto do catálogo; desconhecido aparece como veio; vazio vira —", async () => {
    const { createTranslator } = await import("next-intl");
    const t = createTranslator({ locale: "pt-BR", messages, namespace: "admin" });
    expect(codeLabel(t, "providerStatus", "account_not_created")).toBe("Conta não criada");
    expect(codeLabel(t, "homologation", "awaiting_engine")).toBe("Aguarda o motor de imagem");
    expect(codeLabel(t, "actor", "platform_admin")).toBe("Super Admin");
    expect(codeLabel(t, "category", "support_access")).toBe("Acesso do suporte");
    expect(codeLabel(t, "secret", "configured")).toBe("Configurada");
    expect(codeLabel(t, "run", "estado_novo")).toBe("estado_novo");
    expect(codeLabel(t, "run", null)).toBe("—");
  });

  it("formatos no idioma da tela e no fuso de Brasília (data só com dia não volta um dia)", () => {
    const f = adminFormat("pt-BR");
    expect(f.credits("19.20")).toBe("19,2");
    expect(f.signed("-10.00")).toBe("−10");
    expect(f.signed("100.00")).toBe("+100");
    expect(f.date("2026-10-16")).toBe("16/10/2026");
    expect(f.date("2026-10-17T00:46:26Z")).toBe("16/10/2026");
    expect(f.usd("4.0000").replace(/\s/g, " ")).toBe("US$ 4,00");
    expect(f.money("99.00", "BRL").replace(/\s/g, " ")).toBe("R$ 99,00");
    expect(adminFormat("en").credits("19.20")).toBe("19.2");
  });

  it("filtro na URL: escolher no Select + Menu do DS troca o parâmetro e volta à primeira página", async () => {
    const user = userEvent.setup();
    nav.query = "plan=free&cursor=abc&q=mio";
    renderAdmin(
      <FilterSelect
        name="plan"
        title="Plano"
        prefix="Plano"
        options={[
          { value: "", label: "Todos" },
          { value: "free", label: "Free" },
          { value: "squad", label: "Squad" },
        ]}
      />,
    );
    const select = screen.getByRole("button", { name: "Plano: Free" });
    await user.click(select);
    expect(screen.getByRole("menuitemradio", { name: "Free" })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("menuitemradio", { name: "Squad" }));
    expect(nav.push).toHaveBeenCalledWith("/admin/contas?plan=squad&q=mio");
    expect(select).toHaveFocus();
  });

  it("abas do SA0: setas, Home e End trocam a aba, e a aba aberta fica no endereço", async () => {
    renderAdmin(
      <AdminTabs
        idPrefix="mc"
        label="Seções de Modelos e custos"
        tabs={[
          { id: "custos", label: "Custos", panel: <p>painel custos</p> },
          { id: "regras", label: "Regras por tarefa", panel: <p>painel regras</p> },
          { id: "precos", label: "Preços e câmbio", panel: <p>painel preços</p> },
        ]}
      />,
    );
    const custos = screen.getByRole("tab", { name: "Custos" });
    expect(custos).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("painel regras").closest("[role=tabpanel]")).toHaveAttribute("hidden");
    act(() => custos.focus());
    fireEvent.keyDown(custos, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Regras por tarefa" })).toHaveAttribute("aria-selected", "true");
    expect(window.location.hash).toBe("#regras");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Regras por tarefa" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "Preços e câmbio" })).toHaveFocus();
    expect(screen.getByText("painel preços").closest("[role=tabpanel]")).not.toHaveAttribute("hidden");
  });

  it("endereço do filtro só leva os parâmetros com valor; o item ativo vem da rota", () => {
    expect(hrefWith("/admin/fila", { estado: "failed", cursor: undefined })).toBe("/admin/fila?estado=failed");
    expect(hrefWith("/admin/fila", {})).toBe("/admin/fila");
    expect(adminNavOf("/admin/fila/5eed0000-0000-4000-8000-000000000401")).toBe("fila");
    expect(adminNavOf("/admin/modelos")).toBe("modelos");
    expect(adminNavOf("/admin/sem-acesso")).toBeNull();
  });
});
