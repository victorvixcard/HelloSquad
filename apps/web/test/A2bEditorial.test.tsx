import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/env/content/calendar-actions", () => ({ loadCalendarAction: vi.fn(async () => ({ ok: true, items: [] })) }));
const decide = vi.fn(async () => ({ ok: true, data: {} }));
vi.mock("@/app/app/[workspace]/actions", () => ({ decideApprovalAction: (...a: unknown[]) => decide(...(a as [])) }));

import { ContentEnvironment } from "@/components/env/ContentEnvironment";
import type { CalendarData, CalendarPost } from "@/components/env/content/calendar";
import { EditorialDoc } from "@/components/env/docs/EditorialDoc";
import fx0402 from "../../backend/src/hellosquad/llm/fixtures/04.02/otto.produce.json";
import fx0403 from "../../backend/src/hellosquad/llm/fixtures/04.03/otto.produce.json";
import { makeShell, renderWithShell } from "./render";

const post = (over: Partial<CalendarPost>): CalendarPost => ({
  id: "p-1",
  scheduled_on: "2026-10-19",
  scheduled_time: "09:00:00",
  channel: "instagram",
  format: "post",
  theme: "Fornada de segunda",
  owner_agent_id: "otto",
  status: "draft",
  notes: null,
  work_item_id: "w-1",
  delivery_version_id: "v-1",
  ...over,
});

// Hoje é sex, 16/10/2026: a pauta proposta pelo Otto é da semana seguinte (19 a 25/10), como na fixture da 04.02.
const calendar = (items: CalendarPost[]): CalendarData => ({
  ok: true,
  today: "2026-10-16",
  from: "2026-09-28",
  to: "2026-11-15",
  items,
  versions: { "v-1": { no: 1, approvalId: "ap-1" } },
  works: { "w-1": "Preparar o calendário editorial" },
});

const POSTS = [
  post({}),
  post({ id: "p-2", scheduled_on: "2026-10-21", scheduled_time: "18:00:00", format: "reels", theme: "Bastidores da fermentação longa", owner_agent_id: "kaia", notes: "Série de bastidores do forno." }),
  post({ id: "p-3", scheduled_on: "2026-10-23", scheduled_time: "08:00:00", channel: "whatsapp", format: "status", theme: "Encomendas do fim de semana" }),
];

describe("Conteúdo · Otto: calendário editorial com a pauta da API", () => {
  it("sem post, o vazio da V4.6 continua", () => {
    renderWithShell(<ContentEnvironment business="Miolo" needs={[]} calendar={calendar([])} />);
    expect(screen.getByText("O Otto ainda não tem um calendário de Miolo")).toBeInTheDocument();
    expect(screen.getByText("Nada agendado por enquanto.")).toBeInTheDocument();
    expect(screen.queryByText("aguarda você")).toBeNull();
  });

  it("semana: navega para a próxima semana e mostra os posts propostos com o estado aguarda você", async () => {
    const user = userEvent.setup();
    const { container } = renderWithShell(<ContentEnvironment business="Miolo" needs={[]} calendar={calendar(POSTS)} />);
    expect(screen.getByText("12 a 18 out · esta semana")).toBeInTheDocument();
    expect(container.querySelector(".ct-key")).toHaveTextContent("aguarda vocêagendadopublicado");
    await user.click(screen.getByRole("button", { name: "Próxima semana" }));
    expect(screen.getByText("19 a 25 out")).toBeInTheDocument();
    const card = screen.getByRole("button", { name: "Fornada de segunda, seg, 19/10, 9h, Post, v1 aguarda a sua aprovação. Selecionar" });
    expect(card).toHaveClass("ct-pc", "is-you");
    expect(within(card).getByText("Aguarda você")).toBeInTheDocument();
    expect(within(card).getByText("9h · Post")).toBeInTheDocument();
    expect(screen.getByText("18h · Reels")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hoje" })).toBeInTheDocument();
    // Próximas publicações: a pauta que vem, até 3.
    expect(container.querySelectorAll(".v41-tile")).toHaveLength(3);
  });

  it("abrir um post mostra o inspetor; Conversar com Otto abre a conversa do post", async () => {
    const user = userEvent.setup();
    const shell = makeShell();
    renderWithShell(<ContentEnvironment business="Miolo" needs={[]} calendar={calendar(POSTS)} />, shell);
    await user.click(screen.getByRole("button", { name: "Próxima semana" }));
    await user.click(screen.getByRole("button", { name: /^Bastidores da fermentação longa, qua, 21\/10, 18h, Reels/ }));
    const ins = screen.getByRole("region", { name: "Detalhe: Bastidores da fermentação longa" });
    expect(within(ins).getByText("V1 aguarda a sua aprovação")).toBeInTheDocument();
    expect(within(ins).getByText("qua, 21/10, 18h · Instagram · Reels")).toBeInTheDocument();
    expect(within(ins).getByText("Série de bastidores do forno.")).toBeInTheDocument();
    expect(within(ins).getByText("Kaia")).toBeInTheDocument();
    expect(within(ins).getByText("Preparar o calendário editorial")).toBeInTheDocument();
    expect(within(ins).getByRole("link", { name: "Abrir entrega" })).toHaveAttribute("href", "/app/miolo/squad/otto/trabalho/w-1");
    expect(within(ins).queryByText("Legenda do Otto")).toBeNull();
    expect(within(ins).queryByText("Desempenho")).toBeNull();
    await user.click(within(ins).getByRole("button", { name: "Conversar com Otto sobre este conteúdo" }));
    expect(shell.openConversation).toHaveBeenCalledWith({
      conversationId: null,
      agent: "otto",
      context: {
        kind: "calendar_post",
        label: "Bastidores da fermentação longa",
        href: "/app/miolo/squad/otto",
        period: "Semana 43",
        origin: "Calendário · semana",
        ref: { type: "calendar_post", id: "p-2", title: "Bastidores da fermentação longa", period: "Semana 43", origin: "Calendário · semana" },
      },
    });
    // Aprovar a v1 daqui é a decisão do dono sobre a versão inteira da pauta (não publica nada).
    await user.click(within(ins).getByRole("button", { name: "Aprovar v1" }));
    expect(decide).toHaveBeenCalledWith("ap-1", "approved");
    await user.click(within(ins).getByRole("button", { name: "Fechar o detalhe" }));
    expect(screen.queryByRole("region", { name: /^Detalhe:/ })).toBeNull();
  });

  it("quem não é o dono não vê Aprovar; a pauta aprovada aparece como Aprovado", async () => {
    const user = userEvent.setup();
    const planned = POSTS.map((p) => ({ ...p, status: "planned" }));
    renderWithShell(<ContentEnvironment business="Miolo" needs={[]} calendar={calendar(planned)} />, makeShell({ canDecide: false }));
    await user.click(screen.getByRole("button", { name: "Lista" }));
    const group = screen.getByRole("region", { name: "Semana 43 · 19 a 25 out" });
    const row = within(group).getByRole("button", { name: /^Fornada de segunda, seg, 19\/10, 9h, Post, publicação não autorizada/ });
    expect(row).toHaveClass("ct-row");
    expect(within(row).getByText("Instagram · Post")).toBeInTheDocument();
    expect(within(row).getByText("Aprovado")).toBeInTheDocument();
    expect(within(row).getByText("Otto")).toBeInTheDocument();
    await user.click(row);
    const ins = screen.getByRole("region", { name: "Detalhe: Fornada de segunda" });
    expect(within(ins).queryByRole("button", { name: /^Aprovar/ })).toBeNull();
    expect(within(ins).getByRole("button", { name: "Conversar com Otto sobre este conteúdo" })).toHaveClass("is-dark");
  });

  it("mês: grade de segunda a domingo com o mês e os posts", async () => {
    const user = userEvent.setup();
    const { container } = renderWithShell(<ContentEnvironment business="Miolo" needs={[]} calendar={calendar(POSTS)} />);
    await user.click(screen.getByRole("button", { name: "Mês" }));
    expect(screen.getByText("Outubro de 2026")).toBeInTheDocument();
    expect(container.querySelector(".ct-mo-h")).toHaveTextContent("SEGTERQUAQUISEXSÁBDOM");
    expect(container.querySelectorAll(".ct-mi.is-post")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Mês anterior" })).toBeEnabled();
  });
});

type Fx = { cases: Array<{ name: string; output: { entrega: Record<string, unknown> } }> };
const entrega = (fx: Fx, name: string) => fx.cases.find((c) => c.name === name)!.output.entrega;

describe("EditorialDoc: os documentos do Otto", () => {
  it("04.02: período e a pauta, um post por linha", () => {
    renderWithShell(<EditorialDoc type="04.02" content={entrega(fx0402 as Fx, "calendario")} business="Miolo" />);
    expect(screen.getByText("seg, 19/10 a dom, 25/10")).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent("seg, 19/10");
    expect(within(rows[1]!).getByRole("rowheader", { name: "Fornada de segunda" })).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent("9hInstagramPost");
    expect(rows[2]).toHaveTextContent("ReelsBastidores da fermentação longaKaia");
    expect(rows[3]).toHaveTextContent("WhatsAppStatus");
    expect(screen.getByText("Três publicações: uma por canal confirmado, com os bastidores no meio da semana.")).toBeInTheDocument();
  });

  it("04.03: uma versão por canal, roteiro em trechos, pedido para a Kaia com o aviso honesto", () => {
    const content = { ...entrega(fx0403 as Fx, "com_estrategia"), estrategia: { versao: 2, conceito: "Natal de forno aceso", delivery_version_id: "v-9" } };
    renderWithShell(<EditorialDoc type="04.03" content={content} business="Miolo" />);
    expect(screen.getByText("Natal de forno aceso · v2")).toBeInTheDocument();
    const insta = screen.getByRole("article", { name: "Instagram · Reels" });
    expect(within(insta).getByText("Trecho 1")).toBeInTheDocument();
    expect(within(insta).getByText("Visual: Mãos abrindo a porta do forno, vapor saindo.")).toBeInTheDocument();
    expect(within(insta).getByText("#fermentacaonatural")).toBeInTheDocument();
    expect(within(insta).getByText("Passe na loja no sábado de manhã.")).toBeInTheDocument();
    const wa = screen.getByRole("article", { name: "WhatsApp · Status" });
    expect(within(wa).queryByText("Roteiro")).toBeNull();
    expect(screen.getByText("Capa do reels com o pão saindo do forno e o vapor, nas cores da Miolo.")).toBeInTheDocument();
    expect(screen.getByText(/A peça visual espera o motor de imagem/)).toBeInTheDocument();
  });
});
