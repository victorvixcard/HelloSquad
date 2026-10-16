import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/env/content/calendar-actions", () => ({ loadCalendarAction: vi.fn(async () => ({ ok: true, items: [] })) }));
vi.mock("@/app/app/[workspace]/actions", () => ({ decideApprovalAction: vi.fn() }));

import { ContentEnvironment } from "@/components/env/ContentEnvironment";
import type { CalendarData } from "@/components/env/content/calendar";
import { GrowthEnvironment } from "@/components/env/growth/GrowthEnvironment";
import { dayNumber, isoDay, type MetricSeries, organicPerf } from "@/components/env/results/metrics";
import { ResultsEnvironment } from "@/components/env/results/ResultsEnvironment";
import { makeShell, renderWithShell } from "./render";

/** Como o seed da S2b (e o A2bResults): 90 dias até 15/10, origem `fonte_de_teste`, buraco de 3 dias nas sessões. */
const LAST = dayNumber("2026-10-15");
function serie(channel: string, metric: string, unit: string, value: (n: number) => number, gap = false): MetricSeries {
  const points = [];
  for (let n = 89; n >= 0; n -= 1) {
    if (gap && n >= 42 && n <= 44) continue;
    points.push({ day: isoDay(LAST - n), value: value(n).toFixed(2) });
  }
  return { channel, metric, unit, sources: ["fonte_de_teste"], points, missing_days: [] };
}
const SERIES: MetricSeries[] = [
  serie("site", "sessions", "sessões", (n) => (n < 30 ? 120 : 140), true),
  serie("instagram", "followers", "seguidores", (n) => 4000 - n),
  serie("instagram", "reach", "pessoas alcançadas", (n) => (n < 30 ? 1000 : 900)),
  serie("store", "orders", "pedidos", (n) => (n < 30 ? 37 : 38)),
];

/** A2d · correções da H2 contra a Product UI V4.6 (lado web). */
describe("A2d · H2-31 (P-08): o objeto da conversa do ambiente da Kiwi é Growth", () => {
  it("o título da tela segue Growth Marketing; o botão e o objeto da conversa usam o rótulo curto Growth (V4.6 ENVS.media.l)", async () => {
    const user = userEvent.setup();
    const { shell } = renderWithShell(<GrowthEnvironment business="Miolo" needs={[]} />, makeShell());
    expect(screen.getByRole("heading", { level: 1, name: "Growth Marketing" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Growth Marketing, ao lado/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Conversar com Kiwi sobre Growth, ao lado" }));
    expect(shell.openConversation).toHaveBeenCalledWith({
      conversationId: null,
      agent: "kiwi",
      context: {
        kind: "env",
        label: "Growth",
        href: "/app/miolo/squad/kiwi",
        meta: "Kiwi cuida do crescimento de Miolo: busca, anúncios e mais visitas virando encomendas.",
        ref: { type: "environment", key: "kiwi", title: "Growth" },
      },
    });
  });
});

describe("A2d · H2-10: Resultados contra a V4.6 (P-03, P-04, P-05)", () => {
  it("P-05: os dois cards têm o botão redondo de conversa no cabeçalho, pelos caminhos da V4.6", async () => {
    const user = userEvent.setup();
    const { shell } = renderWithShell(<ResultsEnvironment business="Miolo" needs={[]} series={SERIES} />, makeShell());
    const an = screen.getByRole("region", { name: "Análises recentes" });
    const talkAn = within(an).getByRole("button", { name: "Conversar com Íris sobre as análises" });
    expect(talkAn).toHaveClass("v4-ask", "is-s");
    expect(talkAn).toHaveAttribute("data-tip", "Conversar com Íris");
    // V4.6 `rs.an.talk` = `_openCtx('env', 'res')`: a conversa do ambiente, a mesma do botão da identidade.
    await user.click(talkAn);
    expect(shell.openConversation).toHaveBeenLastCalledWith({
      conversationId: null,
      agent: "iris",
      context: {
        kind: "env",
        label: "Resultados",
        href: "/app/miolo/squad/iris",
        meta: expect.stringMatching(/^Íris /),
        ref: { type: "environment", key: "iris", title: "Resultados" },
      },
    });
    const ch = screen.getByRole("region", { name: "Desempenho por canal" });
    const talkCh = within(ch).getByRole("button", { name: "Analisar os canais com Íris" });
    expect(talkCh).toHaveAttribute("data-tip", "Analisar com Íris");
    // V4.6 `rs.chans.talk` = a conversa do primeiro canal: aqui, o indicador da primeira linha, como o clique na linha.
    await user.click(talkCh);
    const viaHeader = (shell.openConversation as unknown as { mock: { lastCall: unknown[] } }).mock.lastCall;
    await user.click(within(ch).getByRole("button", { name: /^Sessões no site:/ }));
    expect((shell.openConversation as unknown as { mock: { lastCall: unknown[] } }).mock.lastCall).toEqual(viaHeader);
    expect(viaHeader[0]).toMatchObject({ agent: "iris", context: { kind: "metric", label: "Sessões no site", ref: { type: "metric", key: "site.sessions" } } });
  });

  it("P-03: cada linha tem só as três colunas do .rs-cr (nome, variação no lugar da barra, valor com a unidade)", () => {
    const { container } = renderWithShell(<ResultsEnvironment business="Miolo" needs={[]} series={SERIES} />, makeShell());
    const rows = [...container.querySelectorAll("button.rs-cr")];
    expect(rows).toHaveLength(4);
    for (const r of rows) {
      expect([...r.children].map((c) => c.className)).toEqual(["rs-cr-l", "rs-cr-m", "rs-cr-v"]);
      expect([...r.querySelector(".rs-cr-v")!.children].map((c) => c.tagName)).toEqual(["B", "SMALL"]);
    }
    expect(rows[0]!.querySelector(".rs-cr-m")).toHaveTextContent("-14,3%");
    expect(rows[0]!.querySelector(".rs-cr-v")).toHaveTextContent("3.600sessões");
    // Sem barra de participação: as séries têm unidades diferentes (A2b §4 item 30); nenhuma barra inventada.
    expect(container.querySelector(".rs-cr-t")).toBeNull();
  });

  it("P-04: as faixas do gráfico têm o nome do período, no alto (V4.6 rs-cl is-band e is-band is-prev)", async () => {
    const user = userEvent.setup();
    const { container } = renderWithShell(<ResultsEnvironment business="Miolo" needs={[]} series={SERIES} />, makeShell());
    const bands = () => [...container.querySelectorAll(".rs-lbls .rs-cl.is-band")].map((e) => `${e.className} = ${e.textContent}`);
    expect(bands()).toEqual(["rs-cl is-band = 16/09 a 15/10", "rs-cl is-band is-prev = 17/08 a 15/09"]);
    const cur = container.querySelector<HTMLElement>(".rs-cl.is-band:not(.is-prev)")!;
    expect(cur.style.top).toBe("6.78%");
    await user.click(screen.getByRole("button", { name: "Semana" }));
    expect(bands()).toEqual(["rs-cl is-band = 09/10 a 15/10", "rs-cl is-band is-prev = 02/10 a 08/10"]);
    // Trimestre: o período anterior fica fora das 12 semanas, então só a faixa do período tem rótulo.
    await user.click(screen.getByRole("button", { name: "Trimestre" }));
    expect(bands()).toEqual(["rs-cl is-band = 18/07 a 15/10"]);
  });
});

describe("A2d · H2-09 (P-01): Conteúdo lê os números da Íris em vez de negar que existem", () => {
  const calendar: CalendarData = { ok: true, today: "2026-10-16", from: "2026-09-28", to: "2026-11-15", items: [], versions: {}, works: {} };
  // Última semana (09 a 15/10) contra a anterior: sessões 100/dia × 110/dia; alcance 1.200/dia × 1.000/dia.
  const WEEKLY: MetricSeries[] = [
    serie("site", "sessions", "sessões", (n) => (n < 7 ? 100 : 110)),
    serie("instagram", "followers", "seguidores", (n) => 4000 - n),
    serie("instagram", "reach", "pessoas alcançadas", (n) => (n < 7 ? 1200 : 1000)),
    serie("store", "orders", "pedidos", () => 5),
  ];

  it("organicPerf: a semana do período Semana de Resultados, só visitas e alcance; sem número, null (o vazio)", () => {
    const perf = organicPerf(WEEKLY)!;
    expect([isoDay(perf.start), isoDay(perf.end)]).toEqual(["2026-10-09", "2026-10-15"]);
    expect(perf.items.map((x) => [x.key, x.now, x.variation])).toEqual([
      ["site.sessions", 700, -9.1],
      ["instagram.reach", 8400, 20],
    ]);
    expect(organicPerf([])).toBeNull();
    expect(organicPerf([WEEKLY[3]!])).toBeNull();
  });

  it("com séries: Visitas ao site e Alcance com a variação, o período, a origem e Ver em Resultados; nada da peça mais clicada", () => {
    const { container } = renderWithShell(<ContentEnvironment business="Miolo" needs={[]} calendar={calendar} perf={organicPerf(WEEKLY)} />, makeShell());
    const card = screen.getByRole("region", { name: "Desempenho orgânico" });
    const cells = [...card.querySelectorAll(".v41-kv > div")];
    expect(cells.map((c) => c.textContent)).toEqual(["Visitas ao site700-9,1%", "Alcance8.400+20%"]);
    expect(cells[0]!.querySelector(".rs-d")).toHaveClass("is-down");
    expect(cells[1]!.querySelector(".rs-d")).not.toHaveClass("is-down");
    expect(card.querySelector(".v41-meta")).toHaveTextContent("09/10 a 15/10Origem: fonte de teste");
    expect(within(card).getByRole("link", { name: "Ver em Resultados" })).toHaveAttribute("href", "/app/miolo/squad/iris");
    expect(card).not.toHaveTextContent("A Íris ainda não tem números do Instagram para ler.");
    expect(card.querySelector(".v41-best")).toBeNull();
    expect(card).not.toHaveTextContent(/ilustrativos|cliques/);
    // "Otto percebeu" segue vazio (a API não tem as oportunidades do Otto), sem dizer que a Íris não tem números.
    const noticed = screen.getByRole("region", { name: "Otto percebeu" });
    expect(noticed).toHaveTextContent("As oportunidades aparecem quando o Otto conhecer Miolo.");
    expect(noticed).not.toHaveTextContent("primeiros números");
    expect(container.querySelectorAll(".rs-d")).toHaveLength(2);
  });

  it("sem número nenhum, o vazio da V4.6 continua nos dois cards", () => {
    renderWithShell(<ContentEnvironment business="Miolo" needs={[]} calendar={calendar} perf={organicPerf([])} />, makeShell());
    expect(screen.getByRole("region", { name: "Desempenho orgânico" })).toHaveTextContent("A Íris ainda não tem números do Instagram para ler.");
    expect(screen.getByRole("region", { name: "Otto percebeu" })).toHaveTextContent(
      "As oportunidades aparecem quando o Otto conhecer Miolo e a Íris tiver os primeiros números.",
    );
  });
});
