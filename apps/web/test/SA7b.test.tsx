import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionNoticeHost } from "@/components/admin/actions/ActionDialog";
import { catalogVersion, integrationTags } from "@/components/admin/catalog";
import { csvCell, toCsv } from "@/components/admin/csv";
import type { CatalogItem } from "@/lib/admin";
import en from "@/messages/en";
import es from "@/messages/es";
import messages from "@/messages/pt-BR";

// SA7b: correções da H-SA no painel (fidelidade ao SA0). As páginas são renderizadas com o catálogo de verdade e a API
// do painel simulada (respostas no formato do contrato).

const state = vi.hoisted(() => ({
  locale: "pt-BR" as "pt-BR" | "en" | "es",
  catalog: null as unknown,
  calls: [] as { path: string; query: Record<string, unknown> }[],
  data: {} as Record<string, unknown>,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/catalogo",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  return {
    getTranslations: async (namespace?: string) =>
      createTranslator({ locale: state.locale, messages: state.catalog as never, namespace: namespace as never, timeZone: "America/Sao_Paulo" }),
    getLocale: async () => state.locale,
  };
});
vi.mock("@/components/admin/AdminPage", () => ({
  AdminPage: (p: { title: string; desc?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) => (
    <div>
      <h1>{p.title}</h1>
      <p data-testid="desc">{p.desc}</p>
      <div data-testid="actions">{p.actions}</div>
      {p.children}
    </div>
  ),
}));
vi.mock("@/lib/admin", () => ({
  adminRead: async (read: (api: unknown) => Promise<unknown>) => {
    const api = {
      GET: (path: string, opts?: { params?: { query?: Record<string, unknown> } }) => {
        state.calls.push({ path, query: opts?.params?.query ?? {} });
        return Promise.resolve({ data: state.data[path], response: { ok: true } });
      },
    };
    return { ok: true, data: await read(api) };
  },
  loadAdminMe: async () => ({ ok: true, data: { user_id: "u-vic", email: "vic@hellosquad.example", full_name: "Vic", mfa_enforced: false } }),
}));
vi.mock("@/components/admin/actions/RecentAudit", () => ({
  RecentAudit: (p: { title: string }) => <div data-testid="recent">{p.title}</div>,
}));
vi.mock("@/app/admin/(painel)/acoes", () => ({
  catalogPriceAction: vi.fn(),
  catalogHomologationAction: vi.fn(),
  catalogForSaleAction: vi.fn(),
  webhookReprocessAction: vi.fn(),
  webhookReconcileAction: vi.fn(),
}));

function renderAdmin(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale={state.locale} timeZone="America/Sao_Paulo" messages={state.catalog as never}>
      {ui}
      <ActionNoticeHost />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  state.calls = [];
  state.data = {};
  state.locale = "pt-BR";
  state.catalog = messages;
});

/** Todos os textos de um nó do catálogo, com o caminho de cada um. */
function texts(node: unknown, path = ""): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (Array.isArray(node)) return node.flatMap((v, i) => texts(v, `${path}.${i}`));
  if (node && typeof node === "object") return Object.entries(node).flatMap(([k, v]) => texts(v, path ? `${path}.${k}` : k));
  return [];
}

describe("H-SA-03: texto de tela do painel não promete fatia", () => {
  it.each([
    ["pt-BR", messages],
    ["en", en],
    ["es", es],
  ])("nenhum texto do catálogo admin (%s) cita código de fatia (SA1, SA6…)", (_locale, catalog) => {
    const hits = texts((catalog as Record<string, unknown>).admin).filter(([, v]) => /\bSA\d/.test(v));
    expect(hits).toEqual([]);
  });

  it("Pagamentos diz o que existe hoje, como o SA0, sem a promessa de reprocessar e conciliar", () => {
    expect(messages.admin.pagamentos.desc).toBe("Assinaturas, recargas, webhooks e conciliação, por provedor. As contas no Asaas e no Mercado Pago ainda não existem.");
    expect(en.admin.pagamentos.desc).not.toMatch(/arrive/);
    expect(es.admin.pagamentos.desc).not.toMatch(/llegan/);
  });
});

const price = (versions: number): CatalogItem["price"] => ({
  credits: "4.00",
  revision_credits: null,
  provisional: true,
  approved_commercially: false,
  valid_from: "2026-10-16T12:00:00Z",
  versions,
});
const item = (p: Partial<CatalogItem> & Pick<CatalogItem, "delivery_type" | "agent_id" | "name">): CatalogItem => ({
  result: "Resultado de teste",
  depth: "produzir",
  depth_source: "confirmed",
  integrations: null,
  prerequisites: null,
  catalog_status: "A validar",
  homologation_status: "not_started",
  for_sale: false,
  price: price(1),
  ...p,
});
const CATALOG = {
  items: [
    item({ delivery_type: "01.01", agent_id: "nexo", name: "Plano do mês", homologation_status: "homologated", integrations: "LLM API (escolher) + Supabase Auth/Postgres + Memória", price: price(2) }),
    item({ delivery_type: "01.02", agent_id: "nexo", name: "Status semanal", homologation_status: "not_started" }),
    item({ delivery_type: "04.01", agent_id: "otto", name: "Post de blog", homologation_status: "awaiting_engine", integrations: "Motor de imagem + CMS do blog" }),
    item({ delivery_type: "04.02", agent_id: "otto", name: "Roteiro", homologation_status: "in_homologation", integrations: "Planilha do cliente", price: null }),
  ],
};

describe("H-SA-04: Catálogo como o SA0", () => {
  async function renderCatalog(search: Record<string, string> = {}) {
    state.data["/admin/catalog"] = CATALOG;
    const { default: Page } = await import("@/app/admin/(painel)/catalogo/page");
    return renderAdmin(await Page({ searchParams: Promise.resolve(search) }));
  }

  it("integrações viram etiquetas pelas palavras-chave do SA0; a versão conta os preços novos gravados", () => {
    expect(integrationTags("LLM API (escolher) + Supabase Auth/Postgres + Memória")).toEqual(["llm", "supabase"]);
    expect(integrationTags("Instagram e Facebook (Meta) + GA4 + e-mail")).toEqual(["meta", "google", "email"]);
    expect(integrationTags(null)).toEqual([]);
    expect(catalogVersion(CATALOG.items)).toBe(2);
    expect(catalogVersion(CATALOG.items.map((d) => ({ ...d, price: d.price ? { ...d.price, versions: 1 } : null })))).toBe(1);
  });

  it("topo com versão e histórico, números com a linha de apoio, chips por agente com a contagem", async () => {
    await renderCatalog();
    expect(state.calls).toEqual([{ path: "/admin/catalog", query: {} }]);
    const actions = screen.getByTestId("actions");
    expect(actions).toHaveTextContent("Versão 2");
    expect(within(actions).getByRole("link", { name: "Ver histórico" })).toHaveAttribute("href", "/admin/auditoria?quem=platform_admin&tipo=configuration");
    const mets = document.querySelectorAll(".sa-met");
    expect([...mets].map((m) => m.querySelector(".sa-met-d")?.textContent)).toEqual([
      "2 agentes",
      "nenhuma: falta preço aprovado",
      "decisão comercial pendente",
      "1 em homologação",
      "1 pelo motor · 0 por integração",
    ]);
    expect(mets[2]).toHaveTextContent("0de 4");
    expect(mets[4]).toHaveTextContent("Aguardando");
    const chips = screen.getByRole("navigation", { name: "Filtrar por agente" });
    const links = within(chips).getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["Todos 4", "Nexo 2", "Bia 0", "Kaia 0", "Otto 2", "Kiwi 0", "Max 0", "Íris 0"]);
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(links[4]).toHaveAttribute("href", "/admin/catalogo?agente=otto");
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("cartão do agente: área e contagem, resumo da homologação, \"Abrir o agente\" e integrações em etiquetas", async () => {
    await renderCatalog();
    const nexo = document.getElementById("cat-nexo")!;
    expect(nexo.querySelector(".sa-card-t small")).toHaveTextContent("Projetos · 2 deliveries");
    expect(nexo.querySelector(".sa-card-sum")).toHaveTextContent("1 homologada · 1 não iniciada");
    expect(within(nexo).getByRole("link", { name: "Abrir o agente" })).toHaveAttribute("href", "/admin/squad/nexo");
    const integ = within(nexo).getByRole("row", { name: /01\.01/ }).querySelector(".sa-integ")!;
    expect([...integ.querySelectorAll(".sa-chip")].map((c) => c.textContent)).toEqual(["LLM", "Supabase"]);
    expect(integ).toHaveAttribute("title", "LLM API (escolher) + Supabase Auth/Postgres + Memória");
    const otto = document.getElementById("cat-otto")!;
    expect(otto.querySelector(".sa-card-sum")).toHaveTextContent("1 em homologação · 1 aguarda o motor");
    // sem palavra-chave conhecida, o texto do catálogo fica como está (nada some)
    expect(within(otto).getByRole("row", { name: /04\.02/ })).toHaveTextContent("Planilha do cliente");
  });

  it("o chip do agente filtra pelo endereço e marca o atual; en traduz versão, histórico e etiquetas", async () => {
    await renderCatalog({ agente: "otto" });
    expect(document.getElementById("cat-nexo")).toBeNull();
    expect(document.getElementById("cat-otto")).not.toBeNull();
    const links = within(screen.getByRole("navigation", { name: "Filtrar por agente" })).getAllByRole("link");
    expect(links[4]).toHaveAttribute("aria-current", "page");
    expect(links[0]).not.toHaveAttribute("aria-current");
    // os números do topo não dependem do filtro
    expect(document.querySelector(".sa-met .sa-met-v")).toHaveTextContent("4");

    document.body.innerHTML = "";
    state.locale = "en";
    state.catalog = en;
    await renderCatalog();
    expect(screen.getByTestId("actions")).toHaveTextContent("Version 2");
    expect(screen.getByRole("link", { name: "See history" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open the agent" })).toHaveLength(2);
    expect(document.querySelector("#cat-otto .sa-integ")).toHaveTextContent("Image engine");
  });
});

const PAYMENTS = {
  providers: [
    { provider: "asaas", selected: false, api_key: "missing", webhook_secret: "missing" },
    { provider: "mercadopago", selected: false, api_key: "missing", webhook_secret: "missing" },
    { provider: "mock", selected: true, api_key: "not_applicable", webhook_secret: "not_applicable" },
  ],
  subscriptions: [
    { id: "s1", workspace_id: "w1", workspace_name: "Miolo", plan: "Squad", provisional: true, provider: "mock", method: "pix", status: "past_due", current_period_end: "2026-10-20T12:00:00Z", amount: "99.00", currency: "BRL" },
  ],
  payments: [
    { id: "p1", workspace_id: "w1", workspace_name: "Miolo", kind: "topup", provider: "mock", method: "pix", status: "failed", amount: "30.00", currency: "BRL", credits: "50", created_at: "2026-10-16T12:00:00Z", confirmed_at: null },
  ],
  webhooks: [
    { id: "e1", provider: "mock", event_id: "evt_1", event_type: "PAYMENT_CONFIRMED", workspace_id: "w1", workspace_name: "Miolo", outcome: "failed", note: null, received_at: "2026-10-16T12:00:00Z", processed_at: null, reconciled_at: null, reconciliation_reason: null },
  ],
};
const PROVIDERS = {
  items: [
    { provider: "asaas", status: "account_not_created", note: null },
    { provider: "mercadopago", status: "account_not_created", note: null },
    { provider: "mock", status: "simulated", note: null },
  ],
};

describe("H-SA-05: Pagamentos em abas e o cartão do provedor do SA0", () => {
  async function renderPayments() {
    state.data["/admin/payments"] = PAYMENTS;
    state.data["/admin/providers"] = PROVIDERS;
    const { default: Page } = await import("@/app/admin/(painel)/pagamentos/page");
    return renderAdmin(await Page());
  }
  const kv = (card: HTMLElement) => Object.fromEntries([...card.querySelectorAll("dt")].map((dt) => [dt.textContent, dt.nextElementSibling?.textContent]));

  it("cartão do provedor com as linhas do SA0: conta, chave, webhook, ambiente, integração e o que validar", async () => {
    await renderPayments();
    expect(kv(document.getElementById("prov-asaas")!)).toEqual({
      "Conta no provedor": "Ainda não criada",
      "Chave da API": "Ausente",
      Webhook: "Não configurado",
      Ambiente: "Sandbox, quando a conta for criada",
      "Integração": "Adaptador único PaymentProvider (ADR-0008)",
      "A validar": "Pix recorrente e cartão recorrente",
    });
    expect(document.getElementById("prov-asaas")).toHaveTextContent("Assinaturas e recargas");
    expect(document.querySelector("#prov-asaas .sa-code")).toHaveTextContent("PaymentProvider");
    // o simulado local não tem conta, sandbox nem o que validar
    expect(kv(document.getElementById("prov-mock")!)).toEqual({
      "Conta no provedor": "Não se aplica",
      "Chave da API": "Não se aplica",
      Webhook: "Não se aplica",
      Ambiente: "Local, simulado",
      "Integração": "Adaptador único PaymentProvider (ADR-0008)",
    });
    expect(screen.getByTestId("desc")).not.toHaveTextContent(/SA\d/);
  });

  it("abas Assinaturas / Recargas / Webhooks / Conciliação com o contador do que pede atenção; a troca mostra o painel", async () => {
    await renderPayments();
    const tabs = within(screen.getByRole("tablist", { name: "Pagamentos" })).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Assinaturas1", "Recargas", "Webhooks1", "Conciliação1"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("table", { name: "Assinaturas" })).toHaveTextContent("Miolo");
    expect(screen.queryByRole("table", { name: "Webhooks recebidos" })).toBeNull();
    await userEvent.click(tabs[2]!);
    const webhooks = screen.getByRole("tabpanel", { name: /Webhooks/ });
    expect(webhooks).toHaveTextContent("Cada evento é aplicado uma vez só, pela chave id do evento.");
    expect(within(webhooks).getByRole("table", { name: "Webhooks recebidos" })).toHaveTextContent("evt_1");
    expect(within(webhooks).getByRole("button", { name: "Reprocessar" })).toBeInTheDocument();
    await userEvent.click(tabs[3]!);
    expect(within(screen.getByRole("tabpanel", { name: /Concilia/ })).getByRole("table", { name: "Falhas" })).toHaveTextContent("Miolo");
  });
});

const AUDIT = {
  items: [
    {
      id: "a1",
      created_at: "2026-10-17T03:00:00Z",
      actor: "platform_admin",
      actor_type: "user",
      actor_id: "u-vic",
      actor_email: "vic@hellosquad.example",
      actor_name: "Vic",
      workspace_id: null,
      workspace_name: null,
      category: "configuration",
      action: "admin.catalog_price_versioned",
      entity_type: null,
      entity_id: null,
      payload: { reason: "=1+1, \"teste\"" },
    },
    {
      id: "a2",
      created_at: "2026-10-17T02:00:00Z",
      actor: "customer",
      actor_type: "user",
      actor_id: "u-marina",
      actor_email: "marina@miolo.example",
      actor_name: null,
      workspace_id: "w1",
      workspace_name: "Miolo",
      category: "approval",
      action: "approval.decided",
      entity_type: null,
      entity_id: null,
      payload: {},
    },
  ],
  next_cursor: "c2",
};

describe("H-SA-06: Exportar CSV da Auditoria", () => {
  it("CSV com aspas, vírgula e quebra de linha escapadas e fórmula neutralizada; BOM e CRLF", () => {
    expect(csvCell("Miolo")).toBe("Miolo");
    expect(csvCell('diz "oi", tchau')).toBe('"diz ""oi"", tchau"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-5,50")).toBe(`"'-5,50"`);
    expect(toCsv(["A", "B"], [["1", "x\ny"]])).toBe('\uFEFFA,B\r\n1,"x\ny"\r\n');
  });

  it("gera no navegador a página carregada, com as colunas da tabela, e avisa que é o filtro atual", async () => {
    state.data["/admin/audit"] = AUDIT;
    state.data["/admin/accounts"] = { items: [] };
    const blobs: Blob[] = [];
    const downloads: string[] = [];
    const create = vi.fn((b: Blob) => {
      blobs.push(b);
      return "blob:audit";
    });
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });
    const { default: Page } = await import("@/app/admin/(painel)/auditoria/page");
    renderAdmin(await Page({ searchParams: Promise.resolve({ quem: "platform_admin", tipo: "configuration" }) }));
    // a API lê o filtro de agora (e a exportação usa exatamente essa página)
    expect(state.calls.find((c) => c.path === "/admin/audit")?.query).toMatchObject({ actor: "platform_admin", category: "configuration", limit: 50 });
    const button = within(screen.getByTestId("actions")).getByRole("button", { name: "Exportar CSV" });
    expect(button).toHaveAttribute("title", "Exporta o filtro atual: os eventos carregados nesta página.");
    await userEvent.click(button);
    expect(downloads).toEqual([expect.stringMatching(/^auditoria-\d{4}-\d{2}-\d{2}\.csv$/)]);
    const text = await blobs[0]!.text();
    const lines = text.replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(lines[0]).toBe("Quando,Quem,Conta,Tipo,Ação,Detalhe");
    expect(lines[1]).toBe(`2026-10-17T03:00:00Z,Super Admin · Vic,Plataforma,Configuração,admin.catalog_price_versioned,"{""reason"":""=1+1, \\""teste\\""""}"`);
    expect(lines[2]).toBe("2026-10-17T02:00:00Z,Cliente · marina@miolo.example,Miolo,Aprovação,approval.decided,");
    expect(lines).toHaveLength(3);
    expect(screen.getByRole("status")).toHaveTextContent("2 eventos desta página exportados em CSV, com os filtros atuais.");
    click.mockRestore();
    await act(async () => {});
  });

  it("en e es pelo catálogo", async () => {
    state.data["/admin/audit"] = { items: [], next_cursor: null };
    state.data["/admin/accounts"] = { items: [] };
    const { default: Page } = await import("@/app/admin/(painel)/auditoria/page");
    state.locale = "en";
    state.catalog = en;
    renderAdmin(await Page({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeInTheDocument();
    document.body.innerHTML = "";
    state.locale = "es";
    state.catalog = es;
    renderAdmin(await Page({ searchParams: Promise.resolve({}) }));
    await userEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));
    expect(screen.getByRole("status")).toHaveTextContent("Ningún evento en esta página con los filtros actuales; no se exportó nada.");
  });
});
