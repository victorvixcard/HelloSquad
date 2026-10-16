import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StrategyDoc } from "@/components/env/docs/StrategyDoc";
import { StrategyEnvironment } from "@/components/env/strategy/StrategyEnvironment";
import { buildStrategyData } from "@/components/env/strategy/strategy-data";
import type { WorkItem, WorkItemDetail } from "@/lib/core";
import { makeShell, renderWithShell } from "./render";

/** Conteúdo real que o worker grava: as fixtures da Bia (caso padrão, sem retorno da pessoa). */
function fixture(type: string): Record<string, unknown> {
  const file = join(__dirname, "..", "..", "backend", "src", "hellosquad", "llm", "fixtures", type, "bia.produce.json");
  const data = JSON.parse(readFileSync(file, "utf8")) as { cases: Array<{ when?: unknown; output: { entrega: Record<string, unknown> } }> };
  return (data.cases.find((c) => !c.when) ?? data.cases[0]).output.entrega;
}

const shellWith = () => makeShell({ conversationIds: { room: "room-1", direct: { bia: "bia-1" } } });

describe("Documento da Bia (StrategyDoc)", () => {
  it("02.01: panorama, pontos de atenção, oportunidades com relevância, premissas e dados que faltam", () => {
    const content = fixture("02.01");
    const { container } = renderWithShell(<StrategyDoc type="02.01" content={content} business="Miolo" />, shellWith());
    const heads = [...container.querySelectorAll(".bd-sk")].map((h) => h.textContent);
    expect(heads).toEqual(["Panorama", "Pontos de atenção", "Oportunidades", "Premissas", "Dados que faltam"]);
    expect(container.querySelector(".bd-lead")).toHaveTextContent(String(content.resumo));
    expect(screen.getByText("Encomendas sem canal próprio")).toBeInTheDocument();
    expect(screen.getByText("Encomenda antecipada de Natal").closest(".bd-op")).toHaveTextContent("Relevância alta");
    expect(screen.getByText(/^Como conseguir: Conectar o Instagram/)).toBeInTheDocument();
  });

  it("02.07 sem busca: tudo é sugestão sem validação, sem fontes nem links", () => {
    const content = {
      ...fixture("02.07"),
      pesquisa: { estado: "indisponivel", provedor: null, consulta: null, coletado_em: null, motivo: "web_search_disabled" },
      fontes: [],
    };
    const { container } = renderWithShell(<StrategyDoc type="02.07" content={content} business="Miolo" />, shellWith());
    expect(screen.getByText("Busca na web indisponível nesta versão: tudo aqui é sugestão")).toBeInTheDocument();
    expect(screen.getAllByText("Sugestão · sem validação")).toHaveLength(2);
    expect(screen.queryByText("Pesquisa", { selector: ".bd-fd-k span" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Fontes" })).toBeNull();
    expect(container.querySelectorAll("a")).toHaveLength(0);
    expect(screen.getByRole("heading", { name: "Hipóteses" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Próximos passos" })).toBeInTheDocument();
  });

  it("02.07 com busca: achado de pesquisa com a fonte (link, publicado e coletado) e achado sem fonte como sugestão", () => {
    const content = {
      titulo: "Concorrentes e tendências de fim de ano",
      resumo: "Três achados com fonte e uma sugestão.",
      pesquisa: { estado: "realizada", provedor: "mock", consulta: "padaria fermentação natural natal", coletado_em: "2026-10-16T12:00:00+00:00", motivo: null },
      fontes: [
        {
          id: "F1",
          titulo: "Forno do Largo abre encomendas de panetone",
          url: "https://noticias-do-bairro.example/forno-do-largo-panetone",
          trecho: "Encomendas a partir de novembro.",
          publicado_em: "2026-10-09T10:00:00+00:00",
          coletado_em: "2026-10-16T12:00:00+00:00",
        },
      ],
      achados: [
        { texto: "Concorrente do bairro abre as encomendas em novembro.", tipo: "pesquisa", fontes: ["F1"] },
        { texto: "Mostrar o tempo de fermentação pode diferenciar.", tipo: "sugestao", fontes: [] },
      ],
      hipoteses: [],
      proximos_passos: [],
    };
    renderWithShell(<StrategyDoc type="02.07" content={content} business="Miolo" />, shellWith());
    expect(screen.getByText("Pesquisa na web feita com mock · coletada em 16/10/2026")).toBeInTheDocument();
    const found = screen.getByText("Concorrente do bairro abre as encomendas em novembro.").closest("li")!;
    expect(within(found).getByText("Pesquisa")).toBeInTheDocument();
    const link = within(found).getByRole("link", { name: "Forno do Largo abre encomendas de panetone" });
    expect(link).toHaveAttribute("href", "https://noticias-do-bairro.example/forno-do-largo-panetone");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
    const sug = screen.getByText("Mostrar o tempo de fermentação pode diferenciar.").closest("li")!;
    expect(within(sug).getByText("Sugestão · sem validação")).toBeInTheDocument();
    const sources = screen.getByRole("heading", { name: "Fontes" }).closest("section")!;
    expect(sources).toHaveTextContent("publicado em 09/10/2026 · coletado em 16/10/2026");
    expect(screen.queryByText("Busca na web indisponível nesta versão: tudo aqui é sugestão")).toBeNull();
  });

  it("02.03: iniciativas em ordem com quem lidera e os especialistas envolvidos", () => {
    const { container } = renderWithShell(<StrategyDoc type="02.03" content={fixture("02.03")} business="Miolo" />, shellWith());
    const recs = [...container.querySelectorAll(".bd-rec")];
    expect(recs).toHaveLength(4);
    expect(recs[0]).toHaveTextContent("Abrir as encomendas de Natal com data de retirada");
    expect(recs[0]).toHaveTextContent("Bia lidera");
    expect(recs[1]).toHaveTextContent("Otto lidera");
    expect(screen.getByRole("heading", { name: "Especialistas envolvidos" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------- ambiente com documentos

const NOW = "2026-10-16T12:00:00+00:00";

function work(id: string, delivery_type: string | null, status: WorkItem["status"], extra: Partial<WorkItem> = {}): WorkItem {
  return {
    id,
    workspace_id: "ws-1",
    project_id: null,
    conversation_id: null,
    origin_message_id: null,
    title: `Trabalho ${id}`,
    delivery_type,
    status,
    primary_agent_id: "bia",
    collaborator_agent_ids: [],
    created_by: null,
    created_at: NOW,
    updated_at: NOW,
    awaiting_you: status === "needs_you",
    ...extra,
  } as WorkItem;
}

function detail(w: WorkItem, versions: Array<{ no: number; status: "draft" | "approved" | "superseded"; content: Record<string, unknown>; at?: string }>): WorkItemDetail {
  return {
    ...w,
    briefing: {},
    steps: [],
    runs: [],
    approvals: [],
    deliveries: [
      {
        id: `d-${w.id}`,
        kind: "document",
        current_version_id: null,
        created_at: NOW,
        updated_at: NOW,
        versions: versions.map((v) => ({
          id: `v-${w.id}-${v.no}`,
          version_no: v.no,
          status: v.status,
          content: v.content,
          created_by_type: "agent",
          created_by_user_id: null,
          created_by_agent_id: "bia",
          run_id: null,
          change_note: null,
          created_at: v.at ?? NOW,
          files: [],
        })),
      },
    ],
  } as WorkItemDetail;
}

function scenario({ positioningApproved }: { positioningApproved: boolean }) {
  const dx = work("dx-1", "02.01", "needs_you", { title: "Quero analisar meu negócio" });
  const pos = work("pos-1", "02.02", positioningApproved ? "approved" : "needs_you", { awaiting_you: !positioningApproved });
  const ana = work("ana-1", "02.07", "in_progress", { title: "Concorrentes do bairro", status_label: "Bia criando a primeira versão" });
  const other = work("otto-1", "04.01", "in_progress", { primary_agent_id: "otto" });
  const dxContent = {
    ...fixture("02.01"),
    oportunidades: [
      { titulo: "Bastidores do forno como série", descricao: "Série semanal.", prioridade: "media" },
      { titulo: "Reativar quem sumiu", descricao: "Base parada.", prioridade: "baixa" },
      { titulo: "Encomenda antecipada de Natal", descricao: "Abrir as encomendas.", prioridade: "alta" },
      { titulo: "Kit para empresas", descricao: "Pedidos para escritório.", prioridade: "media" },
    ],
  };
  const works = [dx, pos, ana, other];
  const details = [
    detail(dx, [{ no: 1, status: "draft", content: dxContent }]),
    detail(pos, [{ no: 1, status: positioningApproved ? "approved" : "draft", content: fixture("02.02") }]),
    detail(ana, []),
  ];
  return buildStrategyData(works, details);
}

describe("Estratégia · Bia com documentos", () => {
  it("direção só com posicionamento aprovado; oportunidades da alta para a baixa; em análise; planos e diagnósticos", async () => {
    const user = userEvent.setup();
    const { container } = renderWithShell(<StrategyEnvironment business="Miolo" needs={[]} data={scenario({ positioningApproved: true })} />, shellWith());
    // Sem o primeiro acesso.
    expect(screen.queryByText("A Bia ainda não conhece Miolo o bastante para propor uma direção.")).toBeNull();

    const dir = screen.getByRole("region", { name: "Direção estratégica" });
    expect(within(dir).getByText(/^“Para quem mora em Pinheiros/)).toBeInTheDocument();
    expect(within(dir).getByText("Objetivo principal").nextSibling).toHaveTextContent("Aumentar as encomendas de fim de ano · até 24/12");
    expect(within(dir).getByText("Público prioritário").nextSibling).toHaveTextContent("Moradores de Pinheiros e Vila Madalena, 28 a 45 anos");
    expect(within(dir).queryByText("Prioridade agora")).toBeNull();

    const ops = screen.getByRole("region", { name: "Oportunidades identificadas" });
    expect(within(ops).getByText("em ordem de relevância")).toBeInTheDocument();
    const titles = [...ops.querySelectorAll(".bi-o-h b")].map((b) => b.textContent);
    expect(titles).toEqual(["Encomenda antecipada de Natal", "Bastidores do forno como série", "Kit para empresas", "Reativar quem sumiu"]);
    expect(ops.querySelector(".bi-o.is-lead")).toHaveTextContent("Bia percebeu");
    expect(ops.querySelector(".in6-src")).toHaveTextContent("Diagnóstico de marketing da Miolo · v1 · 16/10");
    const more = within(ops).getByRole("button", { name: "Ver mais 1 oportunidade" });
    await user.click(more);
    expect(within(ops).getByRole("button", { name: "Mostrar só as principais" })).toHaveAttribute("aria-expanded", "true");

    const ana = screen.getByRole("region", { name: "Em análise" });
    const anaLink = within(ana).getByRole("link", { name: /Concorrentes do bairro/ });
    expect(anaLink).toHaveAttribute("href", "/app/miolo/squad/bia/trabalho/ana-1");
    expect(anaLink).toHaveTextContent("Em andamento");
    expect(anaLink).toHaveTextContent("Bia criando a primeira versão");

    const docs = screen.getByRole("region", { name: "Planos e diagnósticos" });
    expect(within(docs).getByText("documentos da Bia, com versões e aprovação")).toBeInTheDocument();
    const dx = within(docs).getByRole("link", { name: "Diagnóstico: Diagnóstico de marketing da Miolo, Aguarda você. Abrir" });
    expect(dx).toHaveAttribute("href", "/app/miolo/squad/bia/trabalho/dx-1");
    expect(dx).toHaveTextContent("outubro · v1");
    const pos = within(docs).getByRole("link", { name: /^Posicionamento, público e objetivos: .*, Aprovado\. Abrir$/ });
    expect(pos).toHaveAttribute("href", "/app/miolo/squad/bia/trabalho/pos-1");
    // O trabalho do Otto não entra.
    expect(container.querySelectorAll(".bi-doc")).toHaveLength(2);
  });

  it("sem posicionamento aprovado, não há direção estratégica", () => {
    renderWithShell(<StrategyEnvironment business="Miolo" needs={[]} data={scenario({ positioningApproved: false })} />, shellWith());
    expect(screen.queryByRole("region", { name: "Direção estratégica" })).toBeNull();
    expect(screen.getByRole("region", { name: "Planos e diagnósticos" })).toBeInTheDocument();
  });

  it("Conversar sobre isso abre a conversa da oportunidade; Refinar com a Bia, a do posicionamento", async () => {
    const user = userEvent.setup();
    const { shell } = renderWithShell(<StrategyEnvironment business="Miolo" needs={[]} data={scenario({ positioningApproved: true })} />, shellWith());
    await user.click(screen.getByRole("button", { name: "Encomenda antecipada de Natal. Conversar com a Bia" }));
    expect(shell.openConversation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        conversationId: null,
        agent: "bia",
        context: expect.objectContaining({
          kind: "opportunity",
          label: "Encomenda antecipada de Natal",
          href: "/app/miolo/squad/bia/trabalho/dx-1",
          ref: expect.objectContaining({ type: "opportunity", key: "dx-1:o1", title: "Encomenda antecipada de Natal" }),
        }),
      }),
    );
    await user.click(screen.getByRole("button", { name: "Refinar com a Bia" }));
    expect(shell.openConversation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        conversationId: null,
        agent: "bia",
        context: expect.objectContaining({ kind: "document", href: "/app/miolo/squad/bia/trabalho/pos-1", ref: expect.objectContaining({ type: "document", key: "pos-1" }) }),
      }),
    );
  });

  it("primeiro acesso: Analisar meu negócio abre a conversa do pedido do diagnóstico (capacidade b-diag)", async () => {
    const user = userEvent.setup();
    const { shell } = renderWithShell(<StrategyEnvironment business="Miolo" needs={[]} />, shellWith());
    await user.click(screen.getByRole("button", { name: "Analisar meu negócio" }));
    expect(shell.openConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: null,
        agent: "bia",
        draft: "Quero analisar meu negócio.",
        deliveryType: "02.01",
        context: expect.objectContaining({ kind: "capability", ref: expect.objectContaining({ type: "capability", key: "02.01" }) }),
      }),
    );
  });

  it("sem trabalho da Bia, a lista vazia continua no primeiro acesso", () => {
    expect(buildStrategyData([work("otto-1", "04.01", "in_progress", { primary_agent_id: "otto" })], []).hasWork).toBe(false);
  });
});
