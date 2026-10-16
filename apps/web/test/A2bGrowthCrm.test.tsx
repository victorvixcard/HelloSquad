import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrmEnvironment } from "@/components/env/crm/CrmEnvironment";
import type { ContactSummary, CrmCampaign, CrmSegments } from "@/components/env/crm/crm-types";
import { CrmDoc } from "@/components/env/docs/CrmDoc";
import { GrowthDoc } from "@/components/env/docs/GrowthDoc";
import { GrowthEnvironment } from "@/components/env/growth/GrowthEnvironment";
import type { KiwiWork } from "@/components/env/growth/growth-types";
import { makeShell, renderWithShell } from "./render";

const actions = vi.hoisted(() => ({ importContactsAction: vi.fn(), loadContactSummaryAction: vi.fn() }));
vi.mock("@/app/app/[workspace]/crm-actions", () => actions);

/** Intl separa "R$" do número com espaço sem quebra; os testes comparam com espaço comum. */
const plain = (el: Element | null) => (el?.textContent ?? "").replace(/ /g, " ");

const SUMMARY: ContactSummary = {
  total: 20,
  consented: { email: 10, whatsapp: 6, any_channel: 10 },
  without_consent: 10,
  sources: [{ source: "importação CSV de teste", contacts: 20 }],
  last_import_at: "2026-10-15T12:00:00Z",
};

const SEGMENTS: CrmSegments = {
  workItemId: "wi-seg",
  title: "Segmentos da base de clientes",
  versionNo: 1,
  origins: ["importação CSV de teste"],
  segments: [
    { id: "ativos_30", name: "Clientes ativos", description: "Compraram nos últimos 30 dias.", use: "Avisar primeiro quando as encomendas abrirem.", size: 7, email: 4, wa: 3 },
    { id: "inativos_90", name: "Clientes que sumiram", description: "Não compram há mais de 90 dias.", use: "Reativar com o Natal.", size: 6, email: 3, wa: 2 },
  ],
};

const CAMPAIGNS: CrmCampaign[] = [
  {
    id: "wi-camp",
    type: "06.01",
    title: "Reativação de Natal",
    state: "you",
    goal: "Trazer de volta clientes que sumiram",
    segment: "Clientes que sumiram",
    channels: ["email", "whatsapp"],
    steps: null,
    next: "Aprovar a v1",
    href: "/app/miolo/squad/max/trabalho/wi-camp",
  },
];

const crm = (props: Partial<Parameters<typeof CrmEnvironment>[0]> = {}) =>
  renderWithShell(<CrmEnvironment business="Miolo" needs={[]} summary={SUMMARY} canImport segments={SEGMENTS} campaigns={CAMPAIGNS} {...props} />, makeShell());

beforeEach(() => {
  actions.importContactsAction.mockReset();
});

describe("CRM · Max com a base real (A2b)", () => {
  it("números da base, consentimento visível e fontes com a última importação", () => {
    crm();
    const base = screen.getByRole("region", { name: "Visão da base" });
    expect(within(base).getByText("Aceitam receber mensagens: 10 de 20 contatos")).toBeInTheDocument();
    expect([...base.querySelectorAll(".mx-kp")].map((k) => [k.querySelector("b")?.textContent, k.querySelector("span")?.textContent])).toEqual([
      ["20", "Contatos cadastrados"],
      ["10", "Aceitam e-mail"],
      ["6", "Aceitam WhatsApp"],
      ["10", "Sem consentimento"],
    ]);
    expect(within(base).getByText("Nada é enviado sem consentimento e sem a sua autorização.")).toBeInTheDocument();
    expect(within(base).getByText("Fontes e canais")).toBeInTheDocument();
    expect(within(base).getByText("CSV · última importação em 15/10/2026")).toBeInTheDocument();
    expect(within(base).getByText("importação CSV de teste")).toBeInTheDocument();
    expect(within(base).getByText("20 contatos")).toBeInTheDocument();
    expect(screen.queryByText(/Max percebeu|dados ilustrativos/)).toBeNull();
  });

  it("importa o CSV pela action e mostra as linhas recusadas com número e motivo, sem dado pessoal", async () => {
    const user = userEvent.setup();
    actions.importContactsAction.mockResolvedValue({
      ok: true,
      data: {
        id: "imp-1",
        file_name: "contatos.csv",
        source: "Planilha do balcão",
        total_rows: 3,
        accepted_rows: 1,
        refused_rows: 2,
        refused: [
          { line: 3, reason: "no_consent" },
          { line: 4, reason: "duplicate_existing" },
        ],
        created_at: "2026-10-16T12:00:00Z",
      },
    });
    crm();
    await user.click(screen.getByRole("button", { name: "Importar a planilha de clientes" }));
    const form = screen.getByRole("form", { name: "Importar uma planilha CSV" });
    const csv = "nome,email\nLia Fictícia,lia@exemplo.example\n";
    await user.upload(within(form).getByLabelText("Arquivo CSV"), new File([csv], "contatos.csv", { type: "text/csv" }));
    await user.type(within(form).getByLabelText("Origem dos dados"), "Planilha do balcão");
    await user.click(within(form).getByRole("button", { name: "Importar" }));
    expect(actions.importContactsAction).toHaveBeenCalledWith("ws-1", { file_name: "contatos.csv", source: "Planilha do balcão", csv });
    expect(await screen.findByRole("status")).toHaveTextContent("1 contato importado, 2 linhas recusadas");
    const refused = screen.getByRole("list", { name: "Linhas recusadas" });
    expect(within(refused).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Linha 3 · sem consentimento",
      "Linha 4 · contato já está na base",
    ]);
    expect(document.body.textContent).not.toContain("lia@exemplo.example");
  });

  it("recusa no cliente o arquivo acima de 1 MB e não chama a API", async () => {
    const user = userEvent.setup();
    crm();
    await user.click(screen.getByRole("button", { name: "Importar a planilha de clientes" }));
    const form = screen.getByRole("form", { name: "Importar uma planilha CSV" });
    await user.upload(within(form).getByLabelText("Arquivo CSV"), new File(["x".repeat(1024 * 1024 + 1)], "grande.csv", { type: "text/csv" }));
    await user.type(within(form).getByLabelText("Origem dos dados"), "Planilha");
    await user.click(within(form).getByRole("button", { name: "Importar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("O arquivo passa de 1 MB. Divida a planilha e importe em partes.");
    expect(actions.importContactsAction).not.toHaveBeenCalled();
  });

  it("sem papel de owner ou admin, o botão Importar não aparece", () => {
    crm({ canImport: false });
    expect(screen.queryByRole("button", { name: "Importar a planilha de clientes" })).toBeNull();
  });

  it("Segmentos do último 06.03 com o Público selecionado e a conversa do segmento com o Max", async () => {
    const user = userEvent.setup();
    const { shell } = crm();
    const seg = screen.getByRole("region", { name: "Segmentos" });
    const radios = within(seg).getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("aria-label"))).toEqual([
      "Clientes ativos: 7 contatos, 4 por e-mail e 3 por WhatsApp",
      "Clientes que sumiram: 6 contatos, 3 por e-mail e 2 por WhatsApp",
    ]);
    await user.click(radios[1]!);
    expect(within(seg).getByRole("heading", { level: 3, name: "Clientes que sumiram" })).toBeInTheDocument();
    expect(within(seg).getByText("Público selecionado")).toBeInTheDocument();
    expect(within(seg).getByText("3 por e-mail · 2 por WhatsApp")).toBeInTheDocument();
    expect(within(seg).getByText("Nenhum canal conectado")).toBeInTheDocument();
    expect(within(seg).getByRole("link", { name: "da Segmentos da base de clientes · v1" })).toHaveAttribute("href", "/app/miolo/squad/max/trabalho/wi-seg");
    await user.click(within(seg).getByRole("button", { name: "Criar campanha para este público" }));
    expect(shell.openConversation).toHaveBeenCalledWith({
      conversationId: null,
      agent: "max",
      context: {
        kind: "segment",
        label: "Clientes que sumiram",
        origin: "CRM · segmentos",
        ref: { type: "segment", key: "inativos_90", title: "Clientes que sumiram", summary: "6 contatos" },
      },
      draft: "Quero uma campanha para o público Clientes que sumiram.",
    });
  });

  it("Campanhas e jornadas lista o 06.01 com o estado e o link para o documento", () => {
    crm();
    const camps = screen.getByRole("region", { name: "Campanhas e jornadas" });
    const link = within(camps).getByRole("link", { name: /Reativação de Natal/ });
    expect(link).toHaveAttribute("href", "/app/miolo/squad/max/trabalho/wi-camp");
    expect(link).toHaveTextContent("Aguardando aprovação");
    expect(link).toHaveTextContent("E-mail, WhatsApp");
    expect(link).toHaveTextContent("Próximo · Aprovar a v1");
    const legend = within(camps).getByLabelText("Estados das campanhas");
    expect([...legend.querySelectorAll(".mx-st")].map((x) => x.textContent)).toEqual(["Rascunho", "Aguardando aprovação", "Programada", "Ativa", "Pausada", "Concluída"]);
  });

  it("sem contatos, o vazio da A1b com Importar funcionando", async () => {
    const user = userEvent.setup();
    crm({ summary: { ...SUMMARY, total: 0, consented: { email: 0, whatsapp: 0, any_channel: 0 }, without_consent: 0, sources: [], last_import_at: null }, segments: null, campaigns: [] });
    expect(screen.getByRole("region", { name: "Sua base de clientes ainda não está aqui." })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Importar a planilha de clientes" }));
    expect(screen.getByRole("form", { name: "Importar uma planilha CSV" })).toBeInTheDocument();
  });
});

const PLAN: KiwiWork = {
  kind: "plan",
  id: "wi-plan",
  title: "Plano de mídia das encomendas de Natal",
  state: "you",
  awaiting: true,
  href: "/app/miolo/squad/kiwi/trabalho/wi-plan",
  ceiling: 1200,
  period: "por mês, de 03/11 a 20/12/2026",
  split: [
    { channel: "meta_ads", value: 900 },
    { channel: "google_ads", value: 300 },
  ],
  limits: ["O teto vale para os dois canais juntos."],
  goal: "Aumentar as encomendas de Natal feitas pelo site",
  audience: ["Moradores de Pinheiros"],
};

describe("Growth · Kiwi com o plano de mídia (A2b)", () => {
  it("Campanhas pagas lista o 05.01 com teto, distribuição, período, limites e o link, sem investir nada", async () => {
    const user = userEvent.setup();
    renderWithShell(<GrowthEnvironment business="Miolo" needs={[]} paid={[PLAN]} />, makeShell());
    await user.click(screen.getByRole("tab", { name: /Campanhas pagas/ }));
    const card = screen.getByRole("article", { name: "Plano de mídia das encomendas de Natal" });
    expect(plain(card)).toContain("até R$ 1.200 · por mês, de 03/11 a 20/12/2026 · teto proposto, sem verba liberada");
    expect(plain(card)).toContain("Meta Ads (Instagram e Facebook) R$ 900 · Google Ads R$ 300");
    expect(within(card).getByText("O teto vale para os dois canais juntos.")).toBeInTheDocument();
    expect(within(card).getByText("Nada foi investido: a conta de anúncios não está conectada. Aprovar este plano não autoriza investir.")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Revisar o plano" })).toHaveAttribute("href", "/app/miolo/squad/kiwi/trabalho/wi-plan");
    expect(screen.getByText("Nenhum anúncio no ar. Nada é investido nem ativado sem a sua autorização.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Campanhas pagas/ })).toHaveTextContent("Nada no ar");
  });
});

const doc = (ui: React.ReactElement) => renderWithShell(ui, makeShell());

describe("Documentos da Kiwi e do Max (A2b)", () => {
  it("05.01: orçamento em reais, limites, hipóteses e o aviso de execução", () => {
    const { container } = doc(
      <GrowthDoc
        type="05.01"
        business="Miolo"
        content={{
          resumo: "Proponho até R$ 1.200 por mês.",
          objetivos: [{ objetivo: "Aumentar as encomendas", indicador: "Encomendas pelo site", prazo: "até 20/12/2026" }],
          canais: [{ canal: "meta_ads", papel: "Apresentar as encomendas", publico: "Vizinhança" }],
          orcamento: { moeda: "BRL", teto_informado: null, teto_proposto: 1200, periodo: "por mês", distribuicao: [{ canal: "google_ads", valor: 300 }] },
          limites: ["Aprovar este plano não autoriza gastar."],
          hipoteses: [{ hipotese: "Anúncios trazem encomendas.", como_medir: "UTM", criterio_de_sucesso: "Custo menor que a margem" }],
          para_executar: ["Conectar as contas de anúncios."],
          premissas: [],
          execucao: { investimento: "nao_executado", conta_de_anuncios: "nao_conectada" },
        }}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Limites" })).toBeInTheDocument();
    expect(plain(container)).toContain("R$ 1.200");
    expect(screen.getByText("não informado")).toBeInTheDocument();
    expect(plain(container)).toContain("Google Ads: R$ 300");
    expect(screen.getByText("Como medir: UTM Critério de sucesso: Custo menor que a margem")).toBeInTheDocument();
    expect(screen.getByText("Nada foi investido: a conta de anúncios não está conectada. Aprovar este plano não autoriza investir.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Premissas" })).toBeNull();
  });

  it("05.02: públicos, testes com verba e o plano de mídia de referência", () => {
    const { container } = doc(
      <GrowthDoc
        type="05.02"
        business="Miolo"
        content={{
          publicos: [{ id: "P1", nome: "Vizinhança", segmentacao: "Raio de 3 km", por_que: "Retira na loja." }],
          mensagens: [{ id: "M1", angulo: "O pão da ceia", texto: "Encomende pelo site." }],
          variacoes: [{ id: "V1", publico: "P1", mensagem: "M1", canal: "meta_ads", formato: "stories", criativo: "Foto vertical" }],
          testes: [{ ordem: 1, hipotese: "A ceia vende mais.", variavel: "mensagem", variacoes: ["V1", "V2"], metrica_principal: "Custo por encomenda", criterio_de_sucesso: "Menor custo", duracao: "7 dias", verba: 300 }],
          pedido_para_kaia: "Kaia, duas peças verticais.",
          premissas: [],
          execucao: { anuncios: "nao_criados", conta_de_anuncios: "nao_conectada" },
          plano_de_midia: { versao: 1, teto_proposto: 1200, delivery_version_id: "dv-1" },
        }}
      />,
    );
    expect(screen.getByText("P1 · Vizinhança")).toBeInTheDocument();
    expect(screen.getByText("V1 · P1 + M1 · Meta Ads (Instagram e Facebook) · stories")).toBeInTheDocument();
    expect(plain(container)).toContain("Muda a mensagem · Variações: V1, V2 · Métrica principal: Custo por encomenda · Critério de sucesso: Menor custo · Duração: 7 dias · Verba: R$ 300");
    expect(plain(container)).toContain("Segue o plano de mídia v1, com teto de R$ 1.200.");
    expect(screen.getByText("Nenhum anúncio foi criado: a conta de anúncios não está conectada. Aprovar estes testes não autoriza investir.")).toBeInTheDocument();
  });

  it("06.03: números da base da API, segmentos com elegíveis por canal e os cuidados", () => {
    doc(
      <CrmDoc
        type="06.03"
        business="Miolo"
        content={{
          base: { total: 21, com_consentimento: { algum: 11, email: 11, whatsapp: 7 }, sem_consentimento: 10, origens: [{ origem: "importação CSV de teste", contatos: 20 }], calculado_em: "2026-10-16" },
          segmentos: [{ id: "ativos_30", nome: "Clientes ativos", descricao: "Compraram nos últimos 30 dias.", uso_sugerido: "Avisar primeiro.", tamanho: 7, elegiveis: { email: 4, whatsapp: 3 } }],
          cuidados: ["Só recebe mensagem quem consentiu naquele canal."],
          premissas: [],
        }}
      />,
    );
    expect(screen.getByText("Clientes ativos · 7 contatos · 4 por e-mail · 3 por WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Números calculados em 16/10/2026, a partir de: importação CSV de teste.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Cuidados" })).toBeInTheDocument();
  });

  it("06.01: público, oferta, calendário com datas no dia certo e o envio não autorizado", () => {
    doc(
      <CrmDoc
        type="06.01"
        business="Miolo"
        content={{
          tipo: "reativacao",
          objetivo: { objetivo: "Trazer de volta clientes", indicador: "Encomendas do segmento", prazo: "até 20/12/2026" },
          segmento: { id: "inativos_90", por_que: "Pararam de comprar.", tamanho: 7, elegiveis: { email: 3, whatsapp: 2 } },
          oferta: { descricao: "Reserva antecipada", condicoes: "Pelo site", validade: "de 03/11 a 30/11/2026" },
          calendario: [{ ordem: 1, data: "2026-11-03", canal: "email", acao: "E-mail de convite." }],
          como_medir: ["Encomendas do segmento."],
          premissas: [],
          envio: "nao_autorizado",
        }}
      />,
    );
    expect(screen.getByText("Sem comprar há mais de 90 dias")).toBeInTheDocument();
    expect(screen.getByText("7 contatos · 3 por e-mail · 2 por WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("1. 03/11/2026 · E-mail")).toBeInTheDocument();
    expect(screen.getByText("Nada é enviado: o envio não foi autorizado. Aprovar este documento não autoriza enviar.")).toBeInTheDocument();
  });

  it("06.02: cada etapa com dia, canal, assunto, texto, chamada, condição e descadastro; só texto", () => {
    doc(
      <CrmDoc
        type="06.02"
        business="Miolo"
        content={{
          objetivo: "Trazer de volta clientes",
          segmento: "inativos_90",
          etapas: [
            { ordem: 1, dia: 0, canal: "email", assunto: "O seu pão de Natal", texto: "Olá! O forno continua aceso.", cta: "Reservar", condicao: null, descadastro: "Link para sair da lista no rodapé." },
            { ordem: 2, dia: 3, canal: "whatsapp", assunto: null, texto: "Lembrete curto.", cta: "Responder", condicao: "Só para quem não abriu o e-mail", descadastro: "Responda SAIR para não receber mais." },
          ],
          frequencia: "No máximo três mensagens em sete dias.",
          premissas: [],
          publico: { tamanho: 7, elegiveis: { email: 3, whatsapp: 2 } },
          campanha: { versao: 1, delivery_version_id: "dv-2" },
          envio: "nao_autorizado",
        }}
      />,
    );
    expect(screen.getByText("Só texto: nada é enviado. O envio tem autorização própria, que vem depois.")).toBeInTheDocument();
    const steps = screen.getAllByRole("listitem").filter((li) => li.classList.contains("bd-card"));
    expect(steps).toHaveLength(2);
    expect(within(steps[0]!).getByText("Dia 0 · E-mail")).toBeInTheDocument();
    expect(steps[0]).toHaveTextContent("Assunto: O seu pão de Natal");
    expect(within(steps[0]!).getByText("Link para sair da lista no rodapé.")).toBeInTheDocument();
    expect(within(steps[1]!).getByText("Dia 3 · WhatsApp")).toBeInTheDocument();
    expect(within(steps[1]!).getByText("Só para quem não abriu o e-mail")).toBeInTheDocument();
    expect(within(steps[1]!).getAllByText("Descadastro")).toHaveLength(1);
    expect(screen.getByText("Segue a campanha aprovada (v1).")).toBeInTheDocument();
  });
});
