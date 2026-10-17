import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionNoticeHost, reasonOk } from "@/components/admin/actions/ActionDialog";
import { AccountStatusDialog, CreditAdjustDialog, EnterSupportDialog, parseSignedCredits, SupportSessionBand } from "@/components/admin/actions/AccountActions";
import { CatalogEditDialog, parseCredits } from "@/components/admin/actions/CatalogActions";
import { OfferEditDialog } from "@/components/admin/actions/OfferActions";
import { RunActions, WebhookActions } from "@/components/admin/actions/OpsActions";
import type { AccountDetail, AuditItem } from "@/lib/admin";
import en from "@/messages/en";
import es from "@/messages/es";
import messages from "@/messages/pt-BR";

// SA6b: ações de escrita do Super Admin. Os diálogos são renderizados com o catálogo de verdade e as ações de servidor
// simuladas (respostas no formato do contrato da SA6a); o detalhe da conta é renderizado com a API do painel simulada.

const state = vi.hoisted(() => ({
  locale: "pt-BR" as "pt-BR" | "en" | "es",
  catalog: null as unknown,
  calls: [] as { path: string; query: Record<string, unknown> }[],
  data: {} as Record<string, unknown>,
  me: { user_id: "u-vic", email: "vic@hellosquad.example", full_name: "Vic", mfa_enforced: false },
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/contas",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: state.refresh }),
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
  AdminPage: (p: { title: string; actions?: React.ReactNode; audited?: boolean; children: React.ReactNode }) => (
    <div>
      <h1>{p.title}</h1>
      <span data-testid="top-tag">{p.audited ? "audited" : "read-only"}</span>
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
  loadAdminMe: async () => ({ ok: true, data: state.me }),
}));
vi.mock("@/components/admin/actions/RecentAudit", () => ({
  RecentAudit: (p: { title: string; workspaceId?: string; actions?: readonly string[] }) => (
    <div data-testid="recent" data-workspace={p.workspaceId} data-actions={p.actions?.join(",")}>
      {p.title}
    </div>
  ),
}));
const acoes = vi.hoisted(() => ({
  startSupportSessionAction: vi.fn(),
  endSupportSessionAction: vi.fn(),
  adjustCreditsAction: vi.fn(),
  accountStatusAction: vi.fn(),
  catalogPriceAction: vi.fn(),
  catalogHomologationAction: vi.fn(),
  catalogForSaleAction: vi.fn(),
  planVersionAction: vi.fn(),
  topupVersionAction: vi.fn(),
  runAction: vi.fn(),
  webhookReprocessAction: vi.fn(),
  webhookReconcileAction: vi.fn(),
}));
vi.mock("@/app/admin/(painel)/acoes", () => acoes);

function renderAdmin(ui: ReactElement, catalog: unknown = messages, locale: "pt-BR" | "en" | "es" = "pt-BR") {
  return render(
    <NextIntlClientProvider locale={locale} timeZone="America/Sao_Paulo" messages={catalog as never}>
      {ui}
      <ActionNoticeHost />
    </NextIntlClientProvider>,
  );
}

const MIOLO = "6bcdc5bd-3c9a-4a7a-bb83-22b2ba88edc2";
const REASON = "Devolver crédito da falha do run 7f3a";
const fail = (status: number, message: string, fields: string[] = []) => ({ ok: false as const, code: status === 409 ? "invalid_state" : "validation_error", message, status, fields });

beforeEach(() => {
  for (const fn of Object.values(acoes)) fn.mockReset();
  state.refresh.mockReset();
  state.calls = [];
  state.data = {};
  state.locale = "pt-BR";
  state.catalog = messages;
});

describe("valores e motivo", () => {
  it("créditos com sinal e até 2 casas, como a API aceita", () => {
    expect(parseSignedCredits("10")).toBe("10.00");
    expect(parseSignedCredits("-5,50")).toBe("-5.50");
    expect(parseSignedCredits("−3")).toBe("-3.00");
    expect(parseSignedCredits("+1.234,56")).toBe("1234.56");
    expect(parseSignedCredits("2.5")).toBe("2.50");
    for (const bad of ["", "0", "-0,00", "1,234", "abc", "5,5,5"]) expect(parseSignedCredits(bad)).toBeNull();
    expect(parseCredits("12,5")).toBe("12.50");
    expect(parseCredits("-1")).toBeNull();
  });

  it("motivo de 10 a 500 caracteres depois de tirar os espaços", () => {
    expect(reasonOk("curto")).toBe(false);
    expect(reasonOk("   123456789   ")).toBe(false);
    expect(reasonOk("1234567890")).toBe(true);
    expect(reasonOk("x".repeat(501))).toBe(false);
  });
});

describe("ajustar crédito", () => {
  it("motivo curto não chega à API; o válido manda valor, motivo e a chave gerada ao abrir; reabrir gera outra chave", async () => {
    const user = userEvent.setup();
    acoes.adjustCreditsAction.mockResolvedValue({
      ok: true,
      data: { workspace_id: MIOLO, amount: "-5.50", balance_before: "36.00", balance_after: "30.50", entries: 1, duplicate: false },
    });
    renderAdmin(<CreditAdjustDialog workspaceId={MIOLO} name="Miolo" balance="36.00" available="36.00" />);
    await user.click(screen.getByRole("button", { name: "Ajustar crédito" }));
    const dialog = screen.getByRole("dialog", { name: "Ajustar crédito da Miolo" });
    await user.type(within(dialog).getByLabelText("Créditos"), "-5,50");
    expect(dialog).toHaveTextContent("Saldo: 36 → 30,5");
    await user.type(within(dialog).getByLabelText("Motivo"), "curto");
    await user.click(within(dialog).getByRole("button", { name: "Lançar ajuste" }));
    expect(acoes.adjustCreditsAction).not.toHaveBeenCalled();
    expect(within(dialog).getByLabelText("Motivo")).toHaveAttribute("aria-invalid", "true");
    expect(dialog).toHaveTextContent("Escreva o motivo, de 10 a 500 caracteres.");
    expect(dialog).toHaveTextContent("5 de 500");

    await user.clear(within(dialog).getByLabelText("Motivo"));
    await user.type(within(dialog).getByLabelText("Motivo"), REASON);
    await user.click(within(dialog).getByRole("button", { name: "Lançar ajuste" }));
    expect(acoes.adjustCreditsAction).toHaveBeenCalledTimes(1);
    const [id, input] = acoes.adjustCreditsAction.mock.calls[0]!;
    expect(id).toBe(MIOLO);
    expect(input).toMatchObject({ amount: "-5.50", reason: REASON });
    expect(input.idempotencyKey).toMatch(/^[0-9a-f-]{20,}$/);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Ajuste de −5,5 lançado: saldo 36 → 30,5. Registrado na Auditoria.");
    expect(state.refresh).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Ajustar crédito" }));
    await user.type(within(screen.getByRole("dialog")).getByLabelText("Créditos"), "1");
    await user.type(within(screen.getByRole("dialog")).getByLabelText("Motivo"), REASON);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Lançar ajuste" }));
    expect(acoes.adjustCreditsAction.mock.calls[1]![1].idempotencyKey).not.toBe(input.idempotencyKey);
  });

  it("valor zero marca o campo; 409 da API fica no diálogo, que continua aberto; repetido avisa que nada mudou", async () => {
    const user = userEvent.setup();
    renderAdmin(<CreditAdjustDialog workspaceId={MIOLO} name="Miolo" balance="41.00" available="41.00" />);
    await user.click(screen.getByRole("button", { name: "Ajustar crédito" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Créditos"), "0");
    await user.type(within(dialog).getByLabelText("Motivo"), REASON);
    await user.click(within(dialog).getByRole("button", { name: "Lançar ajuste" }));
    expect(acoes.adjustCreditsAction).not.toHaveBeenCalled();
    expect(within(dialog).getByLabelText("Créditos")).toHaveAttribute("aria-invalid", "true");

    acoes.adjustCreditsAction.mockResolvedValueOnce(fail(409, "Saldo insuficiente para o ajuste: disponível 41, débito 100000."));
    await user.clear(within(dialog).getByLabelText("Créditos"));
    await user.type(within(dialog).getByLabelText("Créditos"), "-100000");
    await user.click(within(dialog).getByRole("button", { name: "Lançar ajuste" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("disponível 41, débito 100000");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(state.refresh).not.toHaveBeenCalled();

    acoes.adjustCreditsAction.mockResolvedValueOnce({
      ok: true,
      data: { workspace_id: MIOLO, amount: "-5.00", balance_before: "41.00", balance_after: "36.00", entries: 0, duplicate: true },
    });
    await user.clear(within(dialog).getByLabelText("Créditos"));
    await user.type(within(dialog).getByLabelText("Créditos"), "-5");
    await user.click(within(dialog).getByRole("button", { name: "Lançar ajuste" }));
    expect(screen.getByRole("status")).toHaveTextContent("Esse ajuste já tinha sido lançado (mesma chave); nada mudou. Saldo 36.");
  });
});

describe("sessão de suporte e estado da conta", () => {
  it("entrar: duração padrão 30, escolhe 15, motivo obrigatório; o aviso diz até quando", async () => {
    const user = userEvent.setup();
    acoes.startSupportSessionAction.mockResolvedValue({
      ok: true,
      data: { id: "s1", workspace_id: MIOLO, reason: REASON, mode: "read_only", started_at: "2026-10-17T02:26:37Z", expires_at: "2026-10-17T02:41:37Z", ended_at: null, status: "active" },
    });
    renderAdmin(<EnterSupportDialog workspaceId={MIOLO} name="Miolo" />);
    await user.click(screen.getByRole("button", { name: "Entrar no ambiente" }));
    const dialog = screen.getByRole("dialog", { name: "Entrar no ambiente da Miolo" });
    expect(within(dialog).getByRole("radio", { name: "30 min" })).toBeChecked();
    expect(dialog).toHaveTextContent("o titular da conta recebe um e-mail");
    await user.click(within(dialog).getByRole("radio", { name: "15 min" }));
    await user.click(within(dialog).getByRole("button", { name: "Entrar com o motivo registrado" }));
    expect(acoes.startSupportSessionAction).not.toHaveBeenCalled();
    await user.type(within(dialog).getByLabelText("Motivo do acesso"), "Conferir o erro de publicação pedido pela Marina");
    await user.click(within(dialog).getByRole("button", { name: "Entrar com o motivo registrado" }));
    expect(acoes.startSupportSessionAction).toHaveBeenCalledWith(MIOLO, { reason: "Conferir o erro de publicação pedido pela Marina", durationMinutes: 15 });
    expect(screen.getByRole("status")).toHaveTextContent("Sessão de suporte na Miolo aberta até 23:41, só leitura.");
  });

  it("faixa da sessão ativa: prazo, tempo que falta e encerrar sem motivo", async () => {
    const user = userEvent.setup();
    const expires = new Date(Date.now() + 14.5 * 60_000).toISOString();
    acoes.endSupportSessionAction.mockResolvedValue({ ok: true, data: { status: "ended" } });
    renderAdmin(<SupportSessionBand workspaceId={MIOLO} name="Miolo" expiresAt={expires} reason={REASON} />);
    const band = screen.getByRole("region", { name: "Suporte" });
    expect(band).toHaveTextContent("Sessão de suporte ativa até");
    expect(band).toHaveTextContent("Faltam 15 min.");
    expect(band).toHaveTextContent(`Motivo: ${REASON}`);
    await user.click(within(band).getByRole("button", { name: "Encerrar sessão" }));
    const dialog = screen.getByRole("dialog", { name: "Encerrar a sessão de suporte na Miolo?" });
    expect(within(dialog).queryByLabelText("Motivo")).toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "Encerrar sessão" }));
    expect(acoes.endSupportSessionAction).toHaveBeenCalledWith(MIOLO);
    expect(screen.getByRole("status")).toHaveTextContent("Sessão de suporte na Miolo encerrada.");
  });

  it("suspender e reativar com motivo; o texto diz o que a API faz", async () => {
    const user = userEvent.setup();
    acoes.accountStatusAction.mockResolvedValue({ ok: true, data: { workspace_id: MIOLO, status: "active", suspended_at: null, suspension_reason: null } });
    const { rerender } = renderAdmin(<AccountStatusDialog workspaceId={MIOLO} name="Trilha Urbana" status="active" />);
    await user.click(screen.getByRole("button", { name: "Suspender" }));
    expect(screen.getByRole("dialog", { name: "Suspender a Trilha Urbana" })).toHaveTextContent("a assinatura não é cancelada e nada é apagado");
    await user.keyboard("{Escape}");
    rerender(
      <NextIntlClientProvider locale="pt-BR" timeZone="America/Sao_Paulo" messages={messages}>
        <AccountStatusDialog workspaceId={MIOLO} name="Trilha Urbana" status="suspended" />
        <ActionNoticeHost />
      </NextIntlClientProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Reativar" }));
    const dialog = screen.getByRole("dialog", { name: "Reativar a Trilha Urbana" });
    await user.type(within(dialog).getByLabelText("Motivo"), "Pagamento regularizado pelo titular");
    await user.click(within(dialog).getByRole("button", { name: "Reativar conta" }));
    expect(acoes.accountStatusAction).toHaveBeenCalledWith(MIOLO, "reactivate", "Pagamento regularizado pelo titular");
    expect(screen.getByRole("status")).toHaveTextContent("Trilha Urbana reativada.");
  });

  it("em inglês e espanhol pelo catálogo", async () => {
    const user = userEvent.setup();
    const { unmount } = renderAdmin(<EnterSupportDialog workspaceId={MIOLO} name="Miolo" />, en, "en");
    await user.click(screen.getByRole("button", { name: "Enter the workspace" }));
    expect(screen.getByRole("dialog", { name: "Enter Miolo’s workspace" })).toHaveTextContent("Session length");
    unmount();
    renderAdmin(<CreditAdjustDialog workspaceId={MIOLO} name="Miolo" balance="1" available="1" />, es, "es");
    expect(screen.getByRole("button", { name: "Ajustar créditos" })).toBeInTheDocument();
  });
});

describe("detalhe da conta", () => {
  const detail = (over: Partial<AccountDetail["account"]>, accesses: AccountDetail["support_accesses"] = []): AccountDetail => ({
    account: {
      id: MIOLO,
      slug: "miolo",
      name: "Miolo",
      locale: "pt-BR",
      status: "active",
      suspension_reason: null,
      created_at: "2026-10-01T12:00:00Z",
      plan: { slug: "pro", name: "Pro", provisional: true },
      credits_balance: "36.00",
      member_count: 1,
      owner_email: "marina@miolo.example",
      ...over,
    },
    members: [],
    credits: { balance: "36.00", reserved: "0.00", available: "36.00" },
    ledger: [],
    support_accesses: accesses,
    usage_30d: {
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
    },
    subscription: null,
    audit_event_id: "a0",
  });
  const audit = (action: string, reason: string, at = "2026-10-17T02:30:00Z"): AuditItem => ({
    id: `${action}-${at}`,
    created_at: at,
    actor: "platform_admin",
    actor_type: "user",
    actor_id: "u-vic",
    actor_email: "vic@hellosquad.example",
    actor_name: "Vic",
    workspace_id: MIOLO,
    workspace_name: "Miolo",
    category: "ledger",
    action,
    entity_type: null,
    entity_id: null,
    payload: { reason, platform_admin: true },
  });
  async function renderAccount(d: AccountDetail, items: AuditItem[]) {
    state.data["/admin/accounts/{workspace_id}"] = d;
    state.data["/admin/audit"] = { items, next_cursor: null };
    const Page = (await import("@/app/admin/(painel)/contas/[id]/page")).default;
    const ui = await Page({ params: Promise.resolve({ id: MIOLO }) });
    return renderAdmin(ui);
  }

  it("ações habilitadas, etiqueta de ações auditadas e a auditoria desta conta pedida com as ações do Super Admin", async () => {
    await renderAccount(detail({}), []);
    expect(screen.getByTestId("top-tag")).toHaveTextContent("audited");
    const actions = screen.getByTestId("actions");
    for (const name of ["Ajustar crédito", "Suspender", "Entrar no ambiente"]) expect(within(actions).getByRole("button", { name })).toBeEnabled();
    const recent = screen.getByTestId("recent");
    expect(recent).toHaveAttribute("data-workspace", MIOLO);
    expect(recent.getAttribute("data-actions")).toBe("support.session_started,support.session_ended,credits.adjusted,workspace.suspended,workspace.reactivated");
    expect(screen.queryByRole("region", { name: "Suporte" })).toBeNull();
  });

  it("a auditoria da tela lê só o Super Admin, filtra pelas ações da tela e mostra o motivo", async () => {
    const { RecentAudit } = await vi.importActual<typeof import("@/components/admin/actions/RecentAudit")>("@/components/admin/actions/RecentAudit");
    state.data["/admin/audit"] = {
      items: [audit("credits.adjusted", "Devolver crédito da falha"), audit("support.account_viewed", ""), audit("workspace.suspended", "Conta em teste de suspensão")],
      next_cursor: null,
    };
    const ui = await RecentAudit({ id: "x", title: "Auditoria desta conta", sub: "s", empty: "vazio", workspaceId: MIOLO, actions: ["credits.adjusted", "workspace.suspended"] });
    renderAdmin(ui);
    expect(state.calls.find((c) => c.path === "/admin/audit")?.query).toMatchObject({ actor: "platform_admin", workspace_id: MIOLO });
    const table = screen.getByRole("table", { name: "Auditoria desta conta" });
    expect(table).toHaveTextContent("credits.adjusted");
    expect(table).toHaveTextContent("Devolver crédito da falha");
    expect(table).toHaveTextContent("vic@hellosquad.example");
    expect(table).toHaveTextContent("workspace.suspended");
    expect(table).not.toHaveTextContent("support.account_viewed");
    expect(screen.getByRole("link", { name: "Ver tudo na Auditoria" })).toHaveAttribute("href", `/admin/auditoria?quem=platform_admin&conta=${MIOLO}`);
  });

  it("sessão aberta pelo Super Admin: faixa com Encerrar e 'Entrar' desabilitado; sessão de outro ou vencida não conta", async () => {
    const future = new Date(Date.now() + 20 * 60_000).toISOString();
    const past = new Date(Date.now() - 60_000).toISOString();
    await renderAccount(
      detail({}, [
        { id: "s2", admin_email: "vic@hellosquad.example", reason: "Conferir o erro de publicação", mode: "read_only", started_at: past, expires_at: future, ended_at: null },
      ]),
      [],
    );
    expect(screen.getByRole("region", { name: "Suporte" })).toHaveTextContent("Motivo: Conferir o erro de publicação");
    expect(within(screen.getByTestId("actions")).getByRole("button", { name: /Entrar no ambiente/ })).toBeDisabled();
  });

  it("conta suspensa: estado, motivo e 'Reativar'", async () => {
    await renderAccount(detail({ status: "suspended", suspension_reason: "Teste de suspensão pedido pelo dono" }), []);
    expect(screen.getByRole("note")).toHaveTextContent("Conta suspensa. Motivo: Teste de suspensão pedido pelo dono");
    expect(within(screen.getByTestId("actions")).getByRole("button", { name: "Reativar" })).toBeEnabled();
    expect(within(screen.getByTestId("actions")).getByRole("button", { name: "Entrar no ambiente (Conta suspensa: reative antes de entrar.)" })).toBeDisabled();
  });
});

describe("catálogo e planos", () => {
  it("preço aprovado e provisório ao mesmo tempo não chega à API; preço válido vira versão nova", async () => {
    const user = userEvent.setup();
    acoes.catalogPriceAction.mockResolvedValue({ ok: true, data: { id: "p1" } });
    renderAdmin(
      <CatalogEditDialog deliveryType="04.01" name="Calendário editorial" price={{ credits: "10.00", revision_credits: null, provisional: true, approved_commercially: false }} homologation="not_started" forSale={false} />,
    );
    await user.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = screen.getByRole("dialog", { name: "04.01 · Calendário editorial: preço e venda" });
    expect(within(dialog).getByLabelText("Créditos por entrega")).toHaveValue("10,00");
    await user.click(within(dialog).getByRole("checkbox", { name: "Preço aprovado comercialmente" }));
    await user.type(within(dialog).getByLabelText("Motivo"), "Preço revisto com o comercial");
    await user.click(within(dialog).getByRole("button", { name: "Gravar preço novo" }));
    expect(acoes.catalogPriceAction).not.toHaveBeenCalled();
    expect(dialog).toHaveTextContent('Desmarque "Provisório"');
    await user.click(within(dialog).getByRole("checkbox", { name: "Preço aprovado comercialmente" }));
    await user.clear(within(dialog).getByLabelText("Créditos por entrega"));
    await user.type(within(dialog).getByLabelText("Créditos por entrega"), "12");
    await user.click(within(dialog).getByRole("button", { name: "Gravar preço novo" }));
    expect(acoes.catalogPriceAction).toHaveBeenCalledWith("04.01", {
      credits: "12.00",
      revisionCredits: null,
      provisional: true,
      approved: false,
      reason: "Preço revisto com o comercial",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Preço de 04.01 gravado como versão nova.");
  });

  it("'à venda' recusado: a mensagem do servidor diz o que falta", async () => {
    const user = userEvent.setup();
    acoes.catalogForSaleAction.mockResolvedValue(fail(409, "Só vai à venda com a homologação concluída."));
    renderAdmin(<CatalogEditDialog deliveryType="01.01" name="Qualificar pedido" price={null} homologation="not_started" forSale={false} />);
    await user.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("radio", { name: "À venda" }));
    expect(within(dialog).getByRole("checkbox", { name: "À venda" })).toBeChecked();
    await user.type(within(dialog).getByLabelText("Motivo"), "Tentar liberar a venda");
    await user.click(within(dialog).getByRole("button", { name: "Gravar venda" }));
    expect(acoes.catalogForSaleAction).toHaveBeenCalledWith("01.01", { forSale: true, reason: "Tentar liberar a venda" });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Só vai à venda com a homologação concluída.");
  });

  it("plano: 'à venda' travado até o preço ser aprovado e não provisório; preço só vai quando muda", async () => {
    const user = userEvent.setup();
    acoes.planVersionAction.mockResolvedValue({ ok: true, data: { version: 2 } });
    renderAdmin(
      <OfferEditDialog
        kind="plan"
        slug="pro"
        name="Pro"
        version={1}
        current={{ credits: "300.00", cycle: "monthly", validityDays: 30, amount: "49.90", currency: "BRL", provisional: true, approved: false, forSale: false }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Editar como versão nova" }));
    const dialog = screen.getByRole("dialog", { name: "Pro: versão 2" });
    expect(within(dialog).getByRole("checkbox", { name: "À venda" })).toBeDisabled();
    await user.click(within(dialog).getByRole("checkbox", { name: "Provisório" }));
    await user.click(within(dialog).getByRole("checkbox", { name: "Preço aprovado comercialmente" }));
    expect(within(dialog).getByRole("checkbox", { name: "À venda" })).toBeEnabled();
    await user.clear(within(dialog).getByLabelText("Créditos por ciclo"));
    await user.type(within(dialog).getByLabelText("Créditos por ciclo"), "350");
    await user.type(within(dialog).getByLabelText("Motivo"), "Plano revisto com o comercial");
    await user.click(within(dialog).getByRole("button", { name: "Gravar versão 2" }));
    const [slug, body] = acoes.planVersionAction.mock.calls[0]!;
    expect(slug).toBe("pro");
    expect(body).toMatchObject({ credits: "350.00", cycle: "monthly", validity_days: 30, currency: "BRL", provisional: false, approved_commercially: true, for_sale: false });
    expect(body).not.toHaveProperty("amount");
    expect(screen.getByRole("status")).toHaveTextContent("Pro gravado como versão 2.");
  });
});

describe("fila e pagamentos", () => {
  it("só aparece a ação que o estado aceita; reenfileirar manda o motivo", async () => {
    const user = userEvent.setup();
    acoes.runAction.mockResolvedValue({ ok: true, data: { id: "7f3a0000-1", workspace_id: MIOLO, status: "queued", attempts: 0 } });
    const { unmount } = renderAdmin(<RunActions runId="7f3a00001111" status="failed" work="Calendário" account="Miolo" />);
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Reenfileirar" }));
    const dialog = screen.getByRole("dialog", { name: "Reenfileirar o run 7f3a0000?" });
    expect(dialog).toHaveTextContent("Calendário · Miolo");
    await user.type(within(dialog).getByLabelText("Motivo"), "Falhou por saldo; crédito ajustado");
    await user.click(within(dialog).getByRole("button", { name: "Reenfileirar com o motivo" }));
    expect(acoes.runAction).toHaveBeenCalledWith("7f3a00001111", "requeue", "Falhou por saldo; crédito ajustado");
    expect(screen.getByRole("status")).toHaveTextContent("Run 7f3a0000 de volta na fila (tentativas: 0).");
    unmount();
    const queued = renderAdmin(<RunActions runId="r2" status="queued" work={null} account="Miolo" />);
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reenfileirar" })).toBeNull();
    queued.unmount();
    renderAdmin(<RunActions runId="r3" status="succeeded" work={null} account="Miolo" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("reprocessar só no que falhou (SA0) e diz o resultado (duplicado, provedor sem estado); conciliado não oferece marcar de novo", async () => {
    const user = userEvent.setup();
    acoes.webhookReprocessAction
      .mockResolvedValueOnce({ ok: true, data: { payment_event_id: "w1", provider: "mock", provider_status: "confirmed", applied_event_id: "e1", duplicate: true, outcome: "applied" } })
      .mockResolvedValueOnce({ ok: true, data: { payment_event_id: "w1", provider: "mock", provider_status: null, applied_event_id: null, duplicate: null, outcome: "provider_unknown" } });
    const ok = renderAdmin(<WebhookActions eventId="w0" event="PAYMENT_CONFIRMED" outcome="processed" reconciled={false} />);
    expect(screen.queryByRole("button", { name: "Reprocessar" })).toBeNull();
    expect(screen.getByRole("button", { name: "Marcar conciliação" })).toBeInTheDocument();
    ok.unmount();
    renderAdmin(<WebhookActions eventId="w1" event="PAYMENT_CONFIRMED" outcome="failed" reconciled />);
    expect(screen.queryByRole("button", { name: "Marcar conciliação" })).toBeNull();
    for (const expected of ["Duplicado: o estado confirmed já tinha sido aplicado com este id", "O provedor não informou o estado (provedor simulado)"]) {
      await user.click(screen.getByRole("button", { name: "Reprocessar" }));
      await user.type(within(screen.getByRole("dialog")).getByLabelText("Motivo"), "Conferir a cobrança no provedor");
      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reprocessar com o motivo" }));
      expect(screen.getByRole("status")).toHaveTextContent(expected);
    }
    expect(acoes.webhookReprocessAction).toHaveBeenCalledWith("w1", "Conferir a cobrança no provedor");
  });

  it("marcar conciliação com motivo; 409 'já marcada' fica no diálogo", async () => {
    const user = userEvent.setup();
    acoes.webhookReconcileAction.mockResolvedValue(fail(409, "Este webhook já foi conciliado."));
    renderAdmin(<WebhookActions eventId="w2" event="PAYMENT_RECEIVED" outcome="processed" reconciled={false} />);
    await user.click(screen.getByRole("button", { name: "Marcar conciliação" }));
    const dialog = screen.getByRole("dialog", { name: "Marcar PAYMENT_RECEIVED como conciliado" });
    await user.type(within(dialog).getByLabelText("Motivo"), "Divergência explicada pelo extrato");
    await act(async () => {
      await user.click(within(dialog).getByRole("button", { name: "Marcar como conciliado" }));
    });
    expect(acoes.webhookReconcileAction).toHaveBeenCalledWith("w2", "Divergência explicada pelo extrato");
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Este webhook já foi conciliado.");
  });
});
