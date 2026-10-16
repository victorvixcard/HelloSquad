import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ResultsDoc } from "@/components/env/docs/ResultsDoc";
import { dayNumber, isoDay, type MetricSeries, summarize, weekly } from "@/components/env/results/metrics";
import { type IrisAnalysis, ResultsEnvironment } from "@/components/env/results/ResultsEnvironment";
import { makeShell, renderWithShell } from "./render";

/** Como o seed da S2b: 90 dias até 15/10, origem `fonte_de_teste`, buraco de 3 dias nas sessões (42 a 44 dias antes). */
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
const ANALYSES: IrisAnalysis[] = [
  { id: "w-03", title: "Relatório: últimos 30 dias contra os 30 anteriores", type: "07.03", version: 1, status: "needs_you", href: "/app/miolo/squad/iris/trabalho/w-03" },
];

describe("métricas da Íris (mesmo cálculo do worker)", () => {
  it("dia sem dado não vira zero: a variação é pela média diária dos dias com dado; seguidores, pelo último valor", () => {
    const s = summarize(SERIES[0]!, LAST, 30);
    expect([s.daysNow, s.daysBefore]).toEqual([30, 27]);
    expect(s.now).toBe(3600);
    expect(s.before).toBe(27 * 140);
    expect(s.variation).toBe(-14.3);
    const f = summarize(SERIES[1]!, LAST, 30);
    expect([f.now, f.before, f.stock]).toEqual([4000, 3970, true]);
  });

  it("a semana com dia sem dado é lacuna no gráfico, com a soma parcial guardada para a tabela", () => {
    const w = weekly(SERIES[0]!, LAST);
    expect(w).toHaveLength(12);
    expect(w[5]).toMatchObject({ value: null, daysWithData: 4, partial: 4 * 140 });
    expect(w.filter((x) => x.value === null)).toHaveLength(1);
  });
});

describe("Resultados · Íris com dado real", () => {
  it("período Mês com a comparação, a origem como está e os três indicadores da V4.6 que existem na base", () => {
    const { container } = renderWithShell(<ResultsEnvironment business="Miolo" needs={[]} series={SERIES} analyses={ANALYSES} />, makeShell());
    const seg = screen.getByRole("group", { name: "Período" });
    expect(within(seg).getAllByRole("button").map((b) => b.textContent)).toEqual(["Semana", "Mês", "Trimestre"]);
    expect(within(seg).getByRole("button", { name: "Mês" })).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector(".rs-per")).toHaveTextContent("16/09 a 15/10 · comparado com 17/08 a 15/09");
    expect(container.querySelector(".rs-src")).toHaveTextContent("Origem: fonte de teste");
    expect(screen.queryByText(/dados ilustrativos/)).toBeNull();
    const tiles = [...container.querySelectorAll(".rs-kpis .rs-k")];
    expect(tiles.map((k) => k.querySelector(".rs-k-l")?.textContent)).toEqual(["Pedidos", "Sessões no site", "Alcance no Instagram"]);
    expect(tiles[0]).toHaveClass("is-lead", "is-on");
    expect(tiles[1]!.querySelector(".rs-k-v")).toHaveTextContent("3.600");
    expect(tiles[1]).toHaveTextContent("3 dias sem dado no período anterior");
    expect(tiles[1]!.querySelector(".rs-d")).toHaveClass("is-down");
    expect(tiles[1]!.querySelector(".rs-d")).toHaveTextContent("14,3%");
    // Sem anúncios, sem número (V4.6 `rs-cpc`).
    const cpc = container.querySelector(".rs-cpc")!;
    expect(cpc).toHaveTextContent("Custo por clique");
    expect(cpc).toHaveTextContent("sem dados");
    expect(cpc).toHaveTextContent("Miolo não tem anúncios ativos, então não há número para ler.");
    // Íris percebeu e Oportunidades: a API ainda não tem essas leituras, então não aparecem.
    expect(screen.queryByText("Íris percebeu")).toBeNull();
    expect(screen.queryByText("Oportunidades")).toBeNull();
  });

  it("gráfico de 12 semanas com Ver tabela: a semana do buraco não vira zero", async () => {
    const user = userEvent.setup();
    const { container } = renderWithShell(<ResultsEnvironment business="Miolo" needs={[]} series={SERIES} />, makeShell());
    await user.click(within(container.querySelector<HTMLElement>(".rs-kpis")!).getByRole("button", { name: /^Sessões no site:/ }));
    const chart = screen.getByRole("region", { name: "Sessões no site" });
    expect(within(chart).getByRole("img")).toHaveAccessibleName(/Sessões no site por semana, de 24\/07 a 15\/10/);
    expect(chart).toHaveTextContent("Semana com dia sem dado fica fora da linha: dia sem dado não vira zero.");
    await user.click(within(chart).getByRole("button", { name: "Ver tabela" }));
    const rows = within(within(chart).getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(13);
    expect(rows[0]).toHaveTextContent("Semana desessões");
    expect(rows[6]).toHaveTextContent("4 de 7 dias com dado · soma parcial 560");
    expect(rows.slice(1).map((r) => r.textContent).join(" ")).not.toMatch(/\b0\b/);
    expect(within(chart).getByRole("button", { name: "Ver gráfico" })).toBeInTheDocument();
    expect(container.querySelectorAll(".rs-table tr.is-cur").length).toBeGreaterThan(0);
  });

  it("Analisar com Íris abre a conversa do indicador com o contexto metric, o período e a origem", async () => {
    const user = userEvent.setup();
    const { shell } = renderWithShell(<ResultsEnvironment business="Miolo" needs={[]} series={SERIES} />, makeShell());
    await user.click(screen.getByRole("button", { name: "Analisar Sessões no site com Íris" }));
    const period = "Últimos 30 dias · 16/09 a 15/10";
    expect(shell.openConversation).toHaveBeenCalledWith({
      conversationId: null,
      agent: "iris",
      context: {
        kind: "metric",
        label: "Sessões no site",
        href: "/app/miolo/squad/iris",
        period,
        origin: "Resultados · mês",
        ref: { type: "metric", key: "site.sessions", title: "Sessões no site", period, origin: "Resultados · mês" },
        // A2d (P-09/P-10): o número, a variação e a curva do período vão com a conversa, lidos da mesma série.
        figure: expect.objectContaining({ delta: "-14,3%", up: false, period: "16/09 a 15/10", points: expect.any(Array) }),
      },
    });
  });

  it("Trimestre sem período anterior com dado: nenhuma variação inventada", async () => {
    const user = userEvent.setup();
    const { container } = renderWithShell(<ResultsEnvironment business="Miolo" needs={[]} series={SERIES} />, makeShell());
    await user.click(screen.getByRole("button", { name: "Trimestre" }));
    expect(container.querySelector(".rs-per")).toHaveTextContent("18/07 a 15/10 · sem período anterior com dado para comparar");
    expect(container.querySelectorAll(".rs-kpis .rs-d")).toHaveLength(0);
    expect(container.querySelector(".rs-kpis")).toHaveTextContent("3 dias sem dado");
  });

  it("Análises recentes são os trabalhos da Íris, com tipo, versão, estado e o link do documento; Desempenho por canal lista as séries", () => {
    renderWithShell(<ResultsEnvironment business="Miolo" needs={[]} series={SERIES} analyses={ANALYSES} />, makeShell());
    const an = screen.getByRole("region", { name: "Análises recentes" });
    const link = within(an).getByRole("link", { name: /Relatório: últimos 30 dias/ });
    expect(link).toHaveAttribute("href", "/app/miolo/squad/iris/trabalho/w-03");
    expect(link).toHaveTextContent("Relatório do período · v1 · Aguarda você");
    const ch = screen.getByRole("region", { name: "Desempenho por canal" });
    // A2d (P-05): o primeiro botão é o de conversa do cabeçalho do card; as linhas vêm depois.
    expect(within(ch).getAllByRole("button")[0]).toHaveAccessibleName("Analisar os canais com Íris");
    expect([...ch.querySelectorAll("button.rs-cr")].map((b) => b.querySelector(".rs-cr-l")?.textContent)).toEqual([
      "Sessões no site",
      "Seguidores no Instagram",
      "Alcance no Instagram",
      "Pedidos",
    ]);
    expect(ch).toHaveTextContent("último valor");
  });

  it("sem análise entregue, o vazio honesto", () => {
    renderWithShell(<ResultsEnvironment business="Miolo" needs={[]} series={SERIES} />, makeShell());
    expect(screen.getByRole("region", { name: "Análises recentes" })).toHaveTextContent("A Íris ainda não entregou análises para Miolo.");
  });
});

const DADOS = {
  periodo_atual: { inicio: "2026-09-16", fim: "2026-10-15" },
  periodo_anterior: { inicio: "2026-08-17", fim: "2026-09-15" },
  atualizado_ate: "2026-10-15",
  fontes: ["fonte_de_teste"],
  lacunas: [{ canal: "site", metrica: "sessions", de: "2026-09-01", ate: "2026-09-03" }],
};
const EVID = [
  {
    id: "E1", tipo: "metrica", canal: "site", metrica: "sessions", unidade: "sessões", agregacao: "soma", atual: 3600, anterior: 3780,
    media_diaria_atual: 120, media_diaria_anterior: 140, variacao_pct: -13.9, base_da_variacao: "media_diaria",
    dias_com_dado: { atual: 30, anterior: 27 }, dias_no_periodo: 30, origem: ["fonte_de_teste"],
  },
  {
    id: "E2", tipo: "metrica", canal: "instagram", metrica: "followers", unidade: "seguidores", agregacao: "ultimo", atual: 4000, anterior: 3970,
    variacao_pct: 0.8, base_da_variacao: "ultimo_valor", dias_com_dado: { atual: 30, anterior: 30 }, dias_no_periodo: 30, origem: ["fonte_de_teste"],
  },
];

describe("Documentos da Íris (ResultsDoc)", () => {
  it("07.02: leituras com o tipo como o worker gravou, evidências citadas, período, origem e lacunas", () => {
    const content = {
      resumo: "Nos últimos 30 dias, o alcance subiu e as sessões no site caíram.",
      dados: DADOS,
      evidencias: EVID,
      leituras: [
        { texto: "As sessões no site caíram em relação aos 30 dias anteriores.", tipo: "fato", evidencias: ["E1"] },
        { texto: "Alcance em alta e sessões em queda coincidem no mesmo período.", tipo: "hipotese", evidencias: ["E1", "E3"] },
      ],
      o_que_os_dados_nao_mostram: ["De onde vêm os pedidos."],
      dados_que_faltam: [{ dado: "Origem de cada encomenda", como_conseguir: "Registrar o canal no pedido." }],
      proximos_passos: ["Conectar o GA4 do site."],
    };
    const { container } = renderWithShell(<ResultsDoc type="07.02" content={content} business="Miolo" />, makeShell());
    expect(container.querySelector(".bd-lead")).toHaveTextContent("o alcance subiu");
    const reads = [...container.querySelectorAll(".rs-reads > li")];
    expect(reads.map((r) => r.querySelector(".rs-kind")?.textContent)).toEqual(["Fato", "Hipótese"]);
    expect(reads[1]).toHaveTextContent("Evidências: E1, E3");
    expect(screen.getByRole("heading", { name: "Período e origem" })).toBeInTheDocument();
    expect(container).toHaveTextContent("16/09/2026 a 15/10/2026");
    expect(container).toHaveTextContent("Sessões no site: 01/09/2026 a 03/09/2026");
    const table = screen.getByRole("table");
    expect(within(table).getByRole("rowheader", { name: "E1" })).toBeInTheDocument();
    const e1 = within(table).getAllByRole("row")[1]!;
    expect(e1).toHaveTextContent("Sessões no site");
    expect(e1).toHaveTextContent("-13,9%");
    expect(e1).toHaveTextContent("30 de 30 · 27 de 30");
    expect(e1).toHaveTextContent("fonte de teste");
    expect(screen.getByRole("heading", { name: "Evidências" })).toBeInTheDocument();
    expect(container).toHaveTextContent("Como conseguir: Registrar o canal no pedido.");
    expect(screen.queryByText("Causa")).toBeNull();
  });

  it("07.03: comparação entre períodos por evidência, destaques, por canal, limitações e o relatório anterior", () => {
    const content = {
      resumo: "Relatório do período.",
      dados: DADOS,
      evidencias: EVID,
      destaques: [{ texto: "As sessões no site caíram.", tipo: "fato", evidencias: ["E1"] }],
      por_canal: [{ canal: "instagram", texto: "Seguidores com crescimento pequeno.", tipo: "fato", evidencias: ["E2"] }],
      limitacoes: ["O período anterior tem três dias sem dado de sessões."],
      proximos_passos: ["Repetir a leitura com dado real."],
      relatorio_anterior: null,
    };
    const { container } = renderWithShell(<ResultsDoc type="07.03" content={content} business="Miolo" />, makeShell());
    for (const h of ["Destaques", "Comparação entre períodos", "Por canal", "Limitações", "Próximos passos", "Relatório anterior"]) {
      expect(screen.getByRole("heading", { name: h })).toBeInTheDocument();
    }
    expect(within(screen.getByRole("table")).getAllByRole("row")[2]).toHaveTextContent("Seguidores no Instagram");
    expect(within(screen.getByRole("table")).getAllByRole("row")[2]).toHaveTextContent("pelo último valor");
    expect(container).toHaveTextContent("Instagram");
    expect(container).toHaveTextContent("Primeiro relatório: não há relatório anterior para comparar.");
  });

  it("07.04: recomendações em ordem, com base dado ou hipótese, evidências, responsável e discutir com", () => {
    const content = {
      resumo: "O que fazer primeiro.",
      dados: DADOS,
      evidencias: EVID,
      recomendacoes: [
        { ordem: 2, acao: "Testar posts com chamada para o site", por_que: "Uma hipótese é que os posts não convidem a visitar o site.", base: "hipotese", evidencias: ["E1"], responsavel: "otto", esforco: "medio", discutir_com: ["nexo", "otto"] },
        { ordem: 1, acao: "Registrar a origem de cada encomenda", por_que: "Hoje não há como saber de que canal vêm os pedidos.", base: "dado", evidencias: ["E1"], responsavel: "iris", esforco: "baixo", discutir_com: ["nexo", "max"] },
      ],
      perguntas_para_o_squad: ["O balcão consegue anotar o canal?"],
      premissas: ["Os números são de fonte de teste."],
      analises: [{ delivery_version_id: "v-1", versao: 1 }],
    };
    const { container } = renderWithShell(<ResultsDoc type="07.04" content={content} business="Miolo" />, makeShell());
    const recs = [...container.querySelectorAll(".bd-rec")];
    expect(recs.map((r) => r.querySelector(".bd-rec-b > b")?.textContent)).toEqual(["Registrar a origem de cada encomenda", "Testar posts com chamada para o site"]);
    expect(recs[0]).toHaveTextContent("Base: dado");
    expect(recs[0]).toHaveTextContent("Responsável: Íris");
    expect(recs[0]).toHaveTextContent("Discutir com: Nexo, Max");
    expect(recs[1]).toHaveTextContent("Base: hipótese");
    expect(recs[1]).toHaveTextContent("Esforço médio");
    expect(recs[1]).toHaveTextContent("Evidências: E1");
    for (const h of ["Recomendações", "Perguntas para o squad", "Premissas", "Análises usadas", "Evidências"]) {
      expect(screen.getByRole("heading", { name: h })).toBeInTheDocument();
    }
  });
});
