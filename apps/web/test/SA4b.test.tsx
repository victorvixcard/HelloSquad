import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { brDay, metricFormat, readingState } from "@/components/admin/economics";
import { BalanceDialog, parseAmount } from "@/components/admin/health/BalanceDialog";
import { monthRange, qualityTotal, readDelta, recentMonths } from "@/components/admin/quality";
import type {
  AlertRule,
  ConsumptionResponse,
  ConsumptionRow,
  EconomicReadings,
  ProviderHealthItem,
  QualityComparison,
  QualityResponse,
  QualityRow,
} from "@/lib/admin";
import en from "@/messages/en";
import messages from "@/messages/pt-BR";

// SA4b: Consumo por cliente, Qualidade das entregas e Saúde das APIs. As páginas do servidor são renderizadas com a
// API do painel simulada (as respostas no formato do contrato da SA4a) e o catálogo de verdade nos idiomas da tela.

const state = vi.hoisted(() => ({
  locale: "pt-BR" as "pt-BR" | "en" | "es",
  catalog: null as unknown,
  calls: [] as { path: string; query: Record<string, unknown> }[],
  data: {} as Record<string, unknown>,
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/consumo",
  useRouter: () => ({ push: state.push, replace: state.push, refresh: state.refresh }),
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
  AdminPage: (p: { title: string; children: React.ReactNode }) => (
    <div>
      <h1>{p.title}</h1>
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
}));
const action = vi.hoisted(() => ({ reportBalanceAction: vi.fn() }));
vi.mock("@/app/admin/(painel)/saude/actions", () => action);

function renderAdmin(ui: ReactElement, catalog = messages, locale: "pt-BR" | "en" | "es" = "pt-BR") {
  return render(
    <NextIntlClientProvider locale={locale} timeZone="America/Sao_Paulo" messages={catalog}>
      {ui}
    </NextIntlClientProvider>,
  );
}
async function renderPage(load: () => Promise<{ default: (p: never) => Promise<ReactElement> }>, sp: Record<string, string> = {}, catalog = messages, locale: "pt-BR" | "en" | "es" = "pt-BR") {
  state.locale = locale;
  state.catalog = catalog;
  const Page = (await load()).default;
  const ui = await Page({ searchParams: Promise.resolve(sp) } as never);
  return renderAdmin(ui, catalog, locale);
}

const MIOLO = "6bcdc5bd-3c9a-4a7a-bb83-22b2ba88edc2";
const VITTA = "0d4f1f2e-5d0b-4a9b-9a51-0f3b1e7c2a10";
const RULES: AlertRule[] = [
  { metric: "ai_cost_per_credit_brl", comparison: "max", threshold: "0.1500", credit_reference_brl: null, window_days: null, proposal: true, source: "SA0", valid_from: "2026-10-16T03:00:00Z" },
  { metric: "gross_margin", comparison: "min", threshold: "0.6500", credit_reference_brl: "0.5000", window_days: null, proposal: true, source: "SA0", valid_from: "2026-10-16T03:00:00Z" },
  { metric: "cost_per_turn_trend", comparison: "max", threshold: "0.1000", credit_reference_brl: null, window_days: 7, proposal: true, source: "SA0", valid_from: "2026-10-16T03:00:00Z" },
];
const readings = (r: Partial<EconomicReadings>): EconomicReadings => ({
  ai_cost_per_credit_brl: null,
  gross_margin: null,
  cost_per_turn_usd: null,
  cost_per_turn_trend: null,
  alerts: [],
  ...r,
});
const usage = {
  requests: 0,
  credits_charged: "0",
  llm_calls: 0,
  conversation_calls: 0,
  input_tokens: 0,
  cache_read_tokens: 0,
  cache_write_tokens: 0,
  output_tokens: 0,
  ai_cost_deliveries_usd: "0",
  ai_cost_conversation_usd: "0",
  ai_cost_usd: "0",
  turns: 0,
  conversation_turns: 0,
  turn_cost_usd: "0",
};
const row = (r: Partial<ConsumptionRow>): ConsumptionRow => ({
  ...usage,
  workspace_id: MIOLO,
  workspace_name: "Miolo",
  ai_cost_brl: "0",
  ai_cost_per_credit_brl: null,
  economics: readings({}),
  ...r,
});

function consumption(over: Partial<ConsumptionResponse> = {}): ConsumptionResponse {
  return {
    since: "2026-09-17",
    until: "2026-10-16",
    usd_brl: "5.4000",
    items: [
      row({
        requests: 3,
        credits_charged: "10.00",
        llm_calls: 6,
        ai_cost_deliveries_usd: "0.400000",
        ai_cost_conversation_usd: "0.100000",
        ai_cost_usd: "0.500000",
        turns: 4,
        ai_cost_brl: "2.7000",
        economics: readings({
          ai_cost_per_credit_brl: "0.2700",
          gross_margin: "0.4600",
          cost_per_turn_usd: "0.125000",
          alerts: [
            { metric: "ai_cost_per_credit_brl", value: "0.2700", threshold: "0.1500", comparison: "max", proposal: true },
            { metric: "gross_margin", value: "0.4600", threshold: "0.6500", comparison: "min", proposal: true },
          ],
        }),
      }),
      row({ workspace_id: VITTA, workspace_name: "Vitta", requests: 1, credits_charged: "20.00", ai_cost_usd: "0.050000", ai_cost_deliveries_usd: "0.050000", economics: readings({ ai_cost_per_credit_brl: "0.0135", gross_margin: "0.9730" }) }),
    ],
    totals: { ...usage, requests: 4, credits_charged: "30.00", llm_calls: 7, ai_cost_deliveries_usd: "0.450000", ai_cost_conversation_usd: "0.100000", ai_cost_usd: "0.550000", turns: 5 },
    granularity: "week",
    series: [
      { period_start: "2026-10-12", requests: 4, credits_charged: "30.00", llm_calls: 7, ai_cost_deliveries_usd: "0.450000", ai_cost_conversation_usd: "0.100000", ai_cost_usd: "0.550000", ai_cost_brl: "2.9700", turns: 5, turn_cost_usd: "0.55", ai_cost_per_credit_brl: "0.0990", gross_margin: "0.8020", cost_per_turn_usd: "0.110000" },
    ],
    economics: readings({ ai_cost_per_credit_brl: "0.0990", gross_margin: "0.8020", cost_per_turn_usd: "0.110000" }),
    trend_accounts: 0,
    alert_rules: RULES,
    margin_basis: { credit_reference_brl: "0.5000", exchange_rate: { usd_brl: "5.4000", fx_date: "2026-10-16", fx_source: "informado à mão" } as never, provisional: true },
    ...over,
  };
}

const qrow = (key: string, r: Partial<QualityRow> = {}): QualityRow => ({
  key,
  deliveries: 0,
  approved_first_time: 0,
  approved: 0,
  adjustments: 0,
  not_approved: 0,
  ai_cost_usd: "0",
  ai_cost_per_approved_usd: null,
  failed_runs: 0,
  failed_steps: 0,
  agent_errors: 0,
  ...r,
});
const rates = (r: Partial<QualityComparison["delta"]> = {}): QualityComparison["delta"] => ({
  approved_first_rate: null,
  adjustments_per_delivery: null,
  not_approved_rate: null,
  ai_cost_per_approved_usd: null,
  agent_errors_per_100: null,
  failed_calls_per_100: null,
  ...r,
});

beforeEach(() => {
  state.calls = [];
  state.data = {};
  state.push.mockReset();
  state.refresh.mockReset();
  action.reportBalanceAction.mockReset();
});

describe("leituras econômicas e de qualidade (SA4b)", () => {
  it("formata como o SA0: R$ com três casas, margem em %, tendência com sinal", () => {
    const fm = metricFormat("pt-BR");
    expect(fm("ai_cost_per_credit_brl", "0.15")).toBe("R$ 0,150");
    expect(fm("gross_margin", "0.4600")).toBe("46%");
    expect(fm("cost_per_turn_trend", "0.1")).toBe("+10%");
    expect(fm("cost_per_turn_trend", "-0.05")).toBe("−5%");
    expect(fm("cost_per_turn_trend", "0.001")).toBe("0%");
    expect(fm("gross_margin", null)).toBeNull();
  });

  it("o estado do cartão vem do alerta da API; leitura nula é 'sem dado'", () => {
    const r = readings({ ai_cost_per_credit_brl: "0.27", alerts: [{ metric: "ai_cost_per_credit_brl", value: "0.27", threshold: "0.15", comparison: "max", proposal: true }] });
    expect(readingState(r, "ai_cost_per_credit_brl")).toBe("attention");
    expect(readingState(r, "gross_margin")).toBe("none");
    expect(readingState(readings({ gross_margin: "0.9" }), "gross_margin")).toBe("ok");
  });

  it("a leitura da comparação sai da diferença arredondada como aparece", () => {
    expect(readDelta("0.004", 1, 100, 0)).toEqual({ reading: "same", shown: 0 });
    expect(readDelta("0.12", 1, 100, 0)).toEqual({ reading: "better", shown: 12 });
    expect(readDelta("0.5", -1, 1, 2)).toEqual({ reading: "worse", shown: 0.5 });
    expect(readDelta("-1.5", -1, 1, 1)).toEqual({ reading: "better", shown: -1.5 });
    expect(readDelta(null, 1, 100, 0)).toEqual({ reading: "none", shown: null });
  });

  it("o total por tipo soma as contagens e recalcula as taxas das somas", () => {
    const t = qualityTotal([
      qrow("04.01", { deliveries: 2, approved_first_time: 1, approved: 2, adjustments: 1, ai_cost_usd: "0.04", agent_errors: 1, failed_steps: 1 }),
      qrow("02.01", { deliveries: 2, approved_first_time: 2, approved: 1, not_approved: 1, ai_cost_usd: "0.02" }),
    ]);
    expect(t).toEqual({ deliveries: 4, firstRate: 0.75, adjustments: 0.25, notApproved: 1, costPerApproved: 0.02, agentErrors: 1, failedSteps: 1 });
    expect(qualityTotal([]).firstRate).toBeNull();
  });

  it("meses: o corrente termina hoje, a lista vira o ano e o dia de Brasília não volta", () => {
    expect(monthRange("2026-10", "2026-10-16")).toEqual({ since: "2026-10-01", until: "2026-10-16" });
    expect(monthRange("2026-02", "2026-10-16")).toEqual({ since: "2026-02-01", until: "2026-02-28" });
    expect(recentMonths("2026-01-05", 3)).toEqual(["2026-01", "2025-12", "2025-11"]);
    expect(brDay(0, new Date("2026-10-17T02:30:00Z"))).toBe("2026-10-16");
    expect(brDay(6, new Date("2026-10-16T15:00:00Z"))).toBe("2026-10-10");
  });

  it("o saldo aceita os formatos do SA0", () => {
    expect(parseAmount("38,50")).toBe("38.50");
    expect(parseAmount("1.234,56")).toBe("1234.56");
    expect(parseAmount("US$ 40")).toBe("40.00");
    expect(parseAmount("38.5")).toBe("38.50");
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("Consumo por cliente (SA4b)", () => {
  it("mostra os alertas com a faixa marcada Proposta, a margem Provisória e quem está fora da faixa", async () => {
    state.data["/admin/consumption"] = consumption();
    state.data["/admin/accounts"] = { items: [{ id: MIOLO, name: "Miolo" }], next_cursor: null };
    await renderPage(() => import("@/app/admin/(painel)/consumo/page"), { conta: MIOLO, agrupar: "mes" });

    const call = state.calls.find((c) => c.path === "/admin/consumption")!;
    expect(call.query).toMatchObject({ workspace_id: MIOLO, granularity: "month" });
    expect(call.query.until).toBe(brDay(0));
    expect(call.query.since).toBe(brDay(29));

    expect(screen.getByRole("heading", { level: 2, name: "Alertas econômicos" })).toBeInTheDocument();
    const perCredit = screen.getByRole("region", { name: "IA por crédito" });
    expect(within(perCredit).getByText("Proposta")).toBeInTheDocument();
    expect(within(perCredit).getByText("OK até R$ 0,150 por crédito cobrado.")).toBeInTheDocument();
    expect(within(perCredit).getByText("1 conta em atenção")).toBeInTheDocument();
    expect(within(perCredit).getByRole("link", { name: "Miolo" })).toHaveAttribute("href", `/admin/contas/${MIOLO}`);
    expect(within(perCredit).getByText("R$ 0,270")).toBeInTheDocument();
    // conjunto dentro da faixa (a API não mandou alerta do conjunto)
    expect(within(perCredit).getByText("OK")).toBeInTheDocument();

    const margin = screen.getByRole("region", { name: "Margem bruta estimada" });
    expect(within(margin).getByText("Provisória")).toBeInTheDocument();
    expect(within(margin).getByText("OK a partir de 65% com o crédito a R$ 0,50 (exemplo).")).toBeInTheDocument();
    const trend = screen.getByRole("region", { name: "Tendência do custo por turno" });
    expect(within(trend).getByText("Sem dado")).toBeInTheDocument();
    expect(within(trend).getByText("Nenhuma conta do filtro tem duas semanas de uso para comparar.")).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Consumo por cliente, Últimos 30 dias" });
    const miolo = within(table).getByRole("link", { name: "Miolo" }).closest("tr")!;
    expect(within(miolo).getByText("Atenção")).toBeInTheDocument();
    expect(within(miolo).getByText("IA por crédito · margem")).toBeInTheDocument();
    const vitta = within(table).getByRole("link", { name: "Vitta" }).closest("tr")!;
    expect(within(vitta).getByText("OK")).toBeInTheDocument();
    expect(within(table).getByText("1 em atenção")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Consumo do conjunto, Últimos 30 dias, por Mês" })).toBeInTheDocument();
    expect(screen.getByText(/A margem usa o crédito a R\$ 0,50 \(valor de exemplo do protótipo\)/)).toBeInTheDocument();
  });

  it("período de 7 dias e, em inglês, o mesmo desenho pelo catálogo", async () => {
    state.data["/admin/consumption"] = consumption({ items: [], totals: usage, series: [], economics: readings({}) });
    state.data["/admin/accounts"] = { items: [], next_cursor: null };
    await renderPage(() => import("@/app/admin/(painel)/consumo/page"), { periodo: "7" }, en as never, "en");
    expect(state.calls.find((c) => c.path === "/admin/consumption")!.query.since).toBe(brDay(6));
    expect(screen.getByRole("heading", { level: 2, name: "Economic alerts" })).toBeInTheDocument();
    expect(screen.getAllByText("Proposal")).toHaveLength(3);
    expect(screen.getByText("No account with usage in the period.")).toBeInTheDocument();
  });
});

describe("Qualidade das entregas (SA4b)", () => {
  const quality = (over: Partial<QualityResponse> = {}): QualityResponse => ({
    since: "2026-07-19",
    until: "2026-10-16",
    by_type: [qrow("04.01", { deliveries: 2, approved_first_time: 1, approved: 2, adjustments: 1, ai_cost_usd: "0.04", ai_cost_per_approved_usd: "0.02", agent_errors: 1, failed_steps: 1 })],
    by_month: [qrow("2026-10", { deliveries: 2, approved_first_time: 1, approved: 2, adjustments: 1, agent_errors: 1, failed_steps: 1 })],
    by_prompt_version: [
      { ...qrow("04.01", { deliveries: 2, approved_first_time: 1 }), agent_id: "otto", prompt_version: "fb290a332565", origin: "database", sources: [{ kind: "soul", key: "otto", version: 2 }], first_used_at: "2026-10-16T12:00:00Z" },
    ],
    locale: "pt-BR",
    how_to_read: [
      { key: "approved_first", title: "Aprovada de primeira", text: "Aprovada pelo dono da conta sem nenhum pedido de ajuste." },
      { key: "rates", title: "Comparar períodos", text: "Para comparar períodos de volumes diferentes, as contagens viram taxa." },
    ],
    ...over,
  });
  const period = (deliveries: number, r: Partial<QualityComparison["delta"]>) => ({
    since: "2026-09-01",
    until: "2026-09-30",
    totals: qrow("", { deliveries, not_approved: 1, agent_errors: 2, failed_steps: 0 }),
    rates: rates(r),
    prompt_versions: [],
  });

  it("como ler vem da API no idioma da tela; por tipo, por versão e a comparação com melhorou e piorou", async () => {
    state.data["/admin/quality"] = quality();
    state.data["/admin/quality/compare"] = {
      a: period(4, { approved_first_rate: "0.5000", adjustments_per_delivery: "0.25", not_approved_rate: "0.25" }),
      b: period(2, { approved_first_rate: "0.7500", adjustments_per_delivery: "0.50", not_approved_rate: "0.25" }),
      delta: rates({ approved_first_rate: "0.2500", adjustments_per_delivery: "0.25", not_approved_rate: "0" }),
    } satisfies QualityComparison;
    await renderPage(() => import("@/app/admin/(painel)/qualidade/page"));

    const q = state.calls.find((c) => c.path === "/admin/quality")!;
    expect(q.query).toMatchObject({ locale: "pt-BR", until: brDay(0), since: brDay(89) });
    const months = recentMonths(brDay(0));
    const cmp = state.calls.filter((c) => c.path === "/admin/quality/compare");
    expect(cmp).toHaveLength(1);
    expect(cmp[0]!.query).toMatchObject({ a_since: `${months[1]}-01`, b_since: `${months[0]}-01`, b_until: brDay(0) });

    const how = screen.getByRole("region", { name: "Como ler" });
    expect(within(how).getByText("Aprovada de primeira")).toBeInTheDocument();
    expect(within(how).getByText("Para comparar períodos de volumes diferentes, as contagens viram taxa.")).toBeInTheDocument();

    const types = screen.getByRole("table", { name: "Por tipo de entrega" });
    expect(within(types).getByText("04.01")).toBeInTheDocument();
    expect(within(types).getAllByText("50%").length).toBeGreaterThan(0);
    const versions = screen.getByRole("table", { name: "Por versão de prompt", hidden: true });
    expect(within(versions).getByText("fb290a332565")).toBeInTheDocument();
    expect(within(versions).getByText("versões do painel")).toBeInTheDocument();
    expect(within(versions).getByText("soul otto v2")).toBeInTheDocument();

    const compare = screen.getByRole("region", { name: "Comparar dois meses" });
    const first = within(compare).getByText("Aprovadas de primeira").closest("tr")!;
    expect(within(first).getByText("+25 p.p.")).toBeInTheDocument();
    expect(within(first).getByText("Melhorou")).toBeInTheDocument();
    const adj = within(compare).getByText("Ajustes por entrega").closest("tr")!;
    expect(within(adj).getByText("Piorou")).toBeInTheDocument();
    const not = within(compare).getByText("Não aprovadas").closest("tr")!;
    expect(within(not).getByText("Sem mudança")).toBeInTheDocument();
    expect(within(compare).getByText("volume, não é melhor nem pior")).toBeInTheDocument();
  });

  it("dois meses escolhidos na URL pedem a comparação deles além do mês corrente", async () => {
    state.data["/admin/quality"] = quality({ by_type: [], by_month: [], by_prompt_version: [] });
    state.data["/admin/quality/compare"] = { a: period(0, {}), b: period(0, {}), delta: rates() } satisfies QualityComparison;
    const months = recentMonths(brDay(0));
    await renderPage(() => import("@/app/admin/(painel)/qualidade/page"), { a: months[3]!, b: months[2]!, periodo: "365" });
    const cmp = state.calls.filter((c) => c.path === "/admin/quality/compare");
    expect(cmp).toHaveLength(2);
    expect(cmp[1]!.query).toMatchObject({ a_since: `${months[3]}-01`, a_until: monthRange(months[3]!, brDay(0)).until, b_since: `${months[2]}-01` });
    expect(state.calls.find((c) => c.path === "/admin/quality")!.query.since).toBe(brDay(364));
    expect(screen.getAllByText("Nenhuma entrega decidida no período.").length).toBeGreaterThan(0);
  });
});

describe("Saúde das APIs (SA4b)", () => {
  const provider = (p: Partial<ProviderHealthItem>): ProviderHealthItem => ({
    provider: "anthropic",
    display_name: "Anthropic",
    purpose: "Modelos de linguagem dos sete agentes",
    status: "simulated",
    key: "missing",
    calls_24h: 0,
    failures_24h: 0,
    spend_usd: { h24: "0.30", d7: "7.00", d30: "12.00", total: "15.00" },
    last_success_at: null,
    last_failure_at: null,
    last_failure_text: null,
    last_balance_refusal_at: null,
    reported_balance: null,
    reported_balance_currency: null,
    reported_balance_at: null,
    alert_below: null,
    note: "Runtime em modo simulado até a chave da API chegar (LLM_PROVIDER).",
    calls_7d: 0,
    failures_7d: 0,
    balance_alert: false,
    balance_history: [],
    ...p,
  });

  it("estado e chave pelo catálogo (nunca o segredo), gasto por janela e o saldo abaixo do alerta", async () => {
    state.data["/admin/providers"] = {
      items: [
        provider({
          reported_balance: "38.00",
          reported_balance_currency: "USD",
          reported_balance_at: "2026-10-16T11:15:00Z",
          alert_below: "50.00",
          balance_alert: true,
          balance_history: [
            { id: "b1", amount: "38.00", currency: "USD", read_at: "2026-10-16T11:15:00Z", alert_below: "50.00", reason: "Saldo lido no console", reported_by: "u1", reported_by_email: "vic@hellosquad.example", created_at: "2026-10-16T11:16:00Z" },
          ],
        }),
        provider({ provider: "asaas", display_name: "Asaas", purpose: "Assinaturas e recargas (PaymentProvider)", status: "account_not_created", spend_usd: null, calls_24h: null, failures_24h: null, note: "Conta ainda não criada; adaptador pronto e testado contra servidor falso (S2e)." }),
      ],
    };
    const { container } = await renderPage(() => import("@/app/admin/(painel)/saude/page"));
    const anthropic = screen.getByRole("region", { name: "Anthropic" });
    expect(within(anthropic).getByText("Simulado")).toBeInTheDocument();
    expect(within(anthropic).getByText("Ausente")).toBeInTheDocument();
    expect(within(anthropic).getByText("Saldo abaixo do alerta")).toBeInTheDocument();
    expect(within(anthropic).getByText(/Recarregue no painel da Anthropic/)).toBeInTheDocument();
    expect(within(anthropic).getByText(/o saldo dura cerca de 38 dias/)).toBeInTheDocument();
    expect(within(anthropic).getByText("US$ 12,00")).toBeInTheDocument();
    expect(within(anthropic).getByRole("table", { name: "Saldos informados de Anthropic" })).toBeInTheDocument();
    expect(within(anthropic).getByRole("button", { name: "Informar saldo" })).toBeInTheDocument();
    const asaas = screen.getByRole("region", { name: "Asaas" });
    expect(within(asaas).getByText("Conta não criada")).toBeInTheDocument();
    expect(within(asaas).queryByRole("button", { name: "Informar saldo" })).toBeNull();
    expect(container.textContent).not.toMatch(/sb_secret|sk-ant|ASAAS_|MP_ACCESS|service_role/);
  });

  it("informar saldo: motivo curto não chega à API; o valido grava, relê a página e avisa", async () => {
    const user = userEvent.setup();
    action.reportBalanceAction.mockResolvedValue({ ok: true, data: { balance_alert: true } });
    renderAdmin(<BalanceDialog provider="anthropic" providerName="Anthropic" currency={null} alertBelow={null} />);
    await user.click(screen.getByRole("button", { name: "Informar saldo" }));
    const dialog = screen.getByRole("dialog", { name: "Informar saldo de Anthropic" });
    await user.type(within(dialog).getByLabelText("Saldo"), "38,00");
    await user.type(within(dialog).getByLabelText("Alertar abaixo de"), "50");
    await user.type(within(dialog).getByLabelText("Motivo"), "curto");
    await user.click(within(dialog).getByRole("button", { name: "Registrar saldo" }));
    expect(action.reportBalanceAction).not.toHaveBeenCalled();
    expect(within(dialog).getByLabelText("Motivo")).toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).getByText("Escreva o motivo com 10 a 500 caracteres.")).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Motivo"), " o bastante: lido no console");
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Registrar saldo" }));
    });
    expect(action.reportBalanceAction).toHaveBeenCalledWith("anthropic", {
      amount: "38.00",
      currency: "USD",
      readAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/),
      reason: "curto o bastante: lido no console",
      alertBelow: "50.00",
    });
    expect(state.refresh).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Saldo de Anthropic registrado: abaixo do alerta.");
  });

  it("erro da API aparece no diálogo, com o campo recusado marcado", async () => {
    const user = userEvent.setup();
    action.reportBalanceAction.mockResolvedValue({ ok: false, code: "invalid_parameter", message: "A leitura não pode ser no futuro.", status: 422, fields: ["read_at"] });
    renderAdmin(<BalanceDialog provider="anthropic" providerName="Anthropic" currency="USD" alertBelow="50.00" />);
    await user.click(screen.getByRole("button", { name: "Informar saldo" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Alertar abaixo de")).toHaveValue("50.00");
    await user.type(within(dialog).getByLabelText("Saldo"), "10");
    await user.type(within(dialog).getByLabelText("Motivo"), "Saldo lido no console");
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Registrar saldo" }));
    });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("A leitura não pode ser no futuro.");
    expect(within(dialog).getByLabelText("Lido em")).toHaveAttribute("aria-invalid", "true");
    expect(state.refresh).not.toHaveBeenCalled();
  });
});

describe("barra lateral (SA4b)", () => {
  it("Consumo, Saúde e Qualidade abrem; os contadores de alerta dizem o que contam", () => {
    renderAdmin(<AdminSidebar person={{ name: "Vic", email: "vic@hellosquad.example" }} badges={{ consumo: 2, saude: 1 }} />);
    const consumo = screen.getByRole("link", { name: /Consumo por cliente/ });
    expect(consumo).toHaveAttribute("href", "/admin/consumo");
    expect(consumo).toHaveAccessibleName("Consumo por cliente, 2 contas em atenção");
    expect(screen.getByRole("link", { name: /Saúde das APIs/ })).toHaveAccessibleName("Saúde das APIs, 1 saldo abaixo do alerta");
    expect(screen.getByRole("link", { name: "Qualidade das entregas" })).toHaveAttribute("href", "/admin/qualidade");
    expect(screen.getAllByText("em breve")).toHaveLength(2);
  });

  it("sem alerta, sem contador", () => {
    renderAdmin(<AdminSidebar person={{ name: "Vic", email: "vic@hellosquad.example" }} badges={{ consumo: 0 }} />);
    expect(screen.getByRole("link", { name: "Consumo por cliente" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Saúde das APIs" })).toBeInTheDocument();
  });
});
