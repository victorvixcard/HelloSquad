import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ConfigPanel } from "@/components/admin/squad/ConfigPanel";
import { PromptPanel } from "@/components/admin/squad/PromptPanel";
import { RulesPanel } from "@/components/admin/squad/RulesPanel";
import { SkillsPanel } from "@/components/admin/squad/SkillsPanel";
import { SoulPanel } from "@/components/admin/squad/SoulPanel";
import { sideBySide } from "@/components/admin/squad/VersionFlow";
import type { ConfigVersion, PromptPreview, RuleDocDetail, SoulVersion, VersionRef } from "@/lib/admin";
import en from "@/messages/en";
import es from "@/messages/es";
import messages from "@/messages/pt-BR";

const nav = vi.hoisted(() => ({ path: "/admin/squad", refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.path,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: nav.refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

const api = vi.hoisted(() => ({
  saveSoulSectionAction: vi.fn(),
  saveSkillAction: vi.fn(),
  saveConfigAction: vi.fn(),
  saveSharedAction: vi.fn(),
  publishVersionAction: vi.fn(),
  discardVersionAction: vi.fn(),
  restoreVersionAction: vi.fn(),
  diffVersionsAction: vi.fn(),
  promptPreviewAction: vi.fn(),
  saveRuleDocAction: vi.fn(),
}));
vi.mock("@/app/admin/(painel)/squad/actions", () => api);

function renderAdmin(ui: ReactElement, catalog = messages, locale: "pt-BR" | "en" | "es" = "pt-BR") {
  return render(
    <NextIntlClientProvider locale={locale} timeZone="America/Sao_Paulo" messages={catalog}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function ref(over: Partial<VersionRef>): VersionRef {
  return {
    id: "v1",
    kind: "soul",
    agent_id: "otto",
    key: "SOUL.md",
    version: 1,
    status: "active",
    author: "squad/ (seed)",
    note: null,
    created_at: "2026-10-17T01:00:50Z",
    published_at: "2026-10-17T01:00:50Z",
    restored_from_version: null,
    ...over,
  };
}

const SECTIONS: SoulVersion["sections"] = (
  [
    ["identidade", "Otto — Conteúdo e Comunicação", "Você é o Otto, redator do squad da {{marca.nome}}."],
    ["o_que_faz", "O que você faz", "- **Textos e legendas.** Copy revisável."],
    ["como_fala", "Como você escreve", "Na voz da marca, não na sua. Frases curtas, concretas, sem clichê."],
    ["limites", "Limites", "Nunca publica sem autorização."],
    ["memoria", "Memória", "Usa só memória confirmada."],
    ["nunca_faz", "O que nunca faz", "Nunca inventa dado."],
  ] as const
).map(([section, heading, body], i) => ({
  section,
  position: i + 1,
  heading,
  body,
  in_prompt: true,
  words: body.split(/\s+/).length,
  chars: body.length,
  changed_in_version: 1,
}));

const soul: SoulVersion = { ref: ref({}), title: "Otto — Conteúdo e Comunicação", sections: SECTIONS, sections_in_prompt: 6, chars_in_prompt: 2211 };
const draftRef = ref({ id: "v2", version: 2, status: "draft", author: "vic@hellosquad.example", published_at: null });
const soulDraft: SoulVersion = {
  ref: draftRef,
  title: soul.title,
  sections: SECTIONS.map((s) => (s.section === "como_fala" ? { ...s, body: "Na voz da marca. Frases curtas e concretas.", changed_in_version: 2 } : s)),
  sections_in_prompt: 6,
  chars_in_prompt: 2190,
};
const otto = { id: "otto", name: "Otto", shape: "otto" as const };
const unit = "da Alma do Otto";

beforeEach(() => {
  nav.path = "/admin/squad";
  nav.refresh.mockReset();
  for (const fn of Object.values(api)) fn.mockReset();
  window.history.replaceState(null, "", "/");
});

describe("barra lateral do Squad IA (SA3b)", () => {
  it("nas páginas do squad os sete aparecem como subnavegação; o agente aberto é a página atual", () => {
    nav.path = "/admin/squad/otto";
    renderAdmin(<AdminSidebar person={{ name: "Vic", email: "vic@hellosquad.example" }} />);
    const ia = screen.getByRole("group", { name: "Squad IA" });
    for (const name of ["Nexo", "Bia", "Kaia", "Otto", "Kiwi", "Max", "Íris"]) expect(within(ia).getByRole("link", { name })).toBeVisible();
    expect(within(ia).getByRole("link", { name: "Otto" })).toHaveAttribute("aria-current", "page");
    expect(within(ia).getByRole("link", { name: "Otto" })).toHaveAttribute("href", "/admin/squad/otto");
    expect(within(ia).getByRole("link", { name: "Squad" })).toHaveClass("is-on");
  });

  it("fora do squad a subnavegação não aparece", () => {
    nav.path = "/admin/contas";
    renderAdmin(<AdminSidebar person={{ name: "Vic", email: "vic@hellosquad.example" }} />);
    expect(screen.queryByRole("link", { name: "Kiwi" })).toBeNull();
  });
});

describe("comparar versões lado a lado", () => {
  it("pares de linhas removidas e acrescentadas ficam lado a lado; as iguais nos dois lados", () => {
    const rows = sideBySide([
      { op: " ", text: "## Como você escreve" },
      { op: "-", text: "Frases curtas, concretas, sem clichê." },
      { op: "+", text: "Frases curtas e concretas." },
      { op: "+", text: "Sem emoji." },
      { op: " ", text: "## Limites" },
    ]);
    expect(rows).toEqual([
      { left: "## Como você escreve", right: "## Como você escreve", same: true },
      { left: "Frases curtas, concretas, sem clichê.", right: "Frases curtas e concretas.", same: false },
      { left: null, right: "Sem emoji.", same: false },
      { left: "## Limites", right: "## Limites", same: true },
    ]);
  });
});

describe("Agente › Alma", () => {
  it("mostra as seis seções com versão e palavras e quantas entram no prompt", () => {
    renderAdmin(<SoulPanel agent={otto} unit={unit} soul={soul} soulDraft={null} versions={[soul.ref]} />);
    expect(screen.getByText("6 de 6 seções entram no prompt")).toBeVisible();
    expect(screen.getByText(/cerca de 2\.211 caracteres/)).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "Como você escreve" })).toBeVisible();
    expect(screen.getByText(/Como fala · mudou na v1/)).toBeVisible();
    expect(screen.getByText("{{marca.nome}}")).toHaveClass("sa-var");
    expect(screen.getByText("Em uso")).toBeVisible();
  });

  it("editar uma seção grava o rascunho com o texto e o motivo, avisa e relê a página", async () => {
    api.saveSoulSectionAction.mockResolvedValue({ ok: true, data: draftRef });
    const user = userEvent.setup();
    renderAdmin(<SoulPanel agent={otto} unit={unit} soul={soul} soulDraft={null} versions={[soul.ref]} />);
    await user.click(screen.getByRole("button", { name: "Editar Como você escreve" }));
    const body = screen.getByLabelText("Texto da seção (markdown)");
    await user.clear(body);
    await user.type(body, "Na voz da marca. Frases curtas e concretas.");
    await user.type(screen.getByLabelText("Motivo (fica no histórico de versões)"), "tirar clichê");
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect(api.saveSoulSectionAction).toHaveBeenCalledWith("otto", "como_fala", {
      section: "como_fala",
      heading: "Como você escreve",
      body: "Na voz da marca. Frases curtas e concretas.",
      inPrompt: true,
      note: "tirar clichê",
    });
    expect(await screen.findByText("Rascunho salvo na versão 2. Publique para entrar no runtime.")).toBeVisible();
    expect(nav.refresh).toHaveBeenCalled();
  });

  it("com rascunho: publicar pede confirmação e só então chama a API", async () => {
    api.publishVersionAction.mockResolvedValue({ ok: true, data: { ...draftRef, status: "active" } });
    const user = userEvent.setup();
    renderAdmin(<SoulPanel agent={otto} unit={unit} soul={soul} soulDraft={soulDraft} versions={[draftRef, soul.ref]} />);
    expect(screen.getByText("Versão 2 da Alma do Otto pronta para publicar.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Publicar versão 2" }));
    const dialog = screen.getByRole("dialog", { name: "Publicar a versão 2 da Alma do Otto?" });
    expect(api.publishVersionAction).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Publicar versão 2" }));
    expect(api.publishVersionAction).toHaveBeenCalledWith("v2");
    expect(await screen.findByText("Versão 2 publicada. Os próximos runs usam esta versão.")).toBeVisible();
  });

  it("comparar abre o diff lado a lado da rota /admin/squad/diff", async () => {
    api.diffVersionsAction.mockResolvedValue({
      ok: true,
      data: {
        path: "squad/otto/SOUL.md",
        from_version: soul.ref,
        to_version: draftRef,
        unified: "",
        changed_sections: ["como_fala"],
        lines: [
          { op: "-", text: "Na voz da marca, não na sua. Frases curtas, concretas, sem clichê." },
          { op: "+", text: "Na voz da marca. Frases curtas e concretas." },
        ],
      },
    });
    const user = userEvent.setup();
    renderAdmin(<SoulPanel agent={otto} unit={unit} soul={soul} soulDraft={soulDraft} versions={[draftRef, soul.ref]} />);
    await user.click(screen.getByRole("button", { name: "Comparar versões" }));
    expect(api.diffVersionsAction).toHaveBeenCalledWith("v1", "v2");
    const dialog = await screen.findByRole("dialog", { name: "Comparar: versão 1 e versão 2" });
    const table = await within(dialog).findByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Versão 1 · Ativa" })).toBeVisible();
    expect(within(table).getByRole("columnheader", { name: "Versão 2 · Rascunho" })).toBeVisible();
    expect(within(dialog).getByText("Como fala")).toBeVisible();
    expect(within(table).getByText("Na voz da marca. Frases curtas e concretas.").tagName).toBe("INS");
  });

  it("voltar versão pede confirmação com motivo; com rascunho pendente fica bloqueado e explica", async () => {
    const old = ref({ id: "v1", status: "superseded" });
    const active = ref({ id: "v2", version: 2, status: "active" });
    api.restoreVersionAction.mockResolvedValue({ ok: true, data: ref({ id: "v3", version: 3, restored_from_version: 1 }) });
    const user = userEvent.setup();
    const { unmount } = renderAdmin(<SoulPanel agent={otto} unit={unit} soul={{ ...soul, ref: active }} soulDraft={null} versions={[active, old]} />);
    await user.click(screen.getByRole("button", { name: "Voltar para esta versão (Versão 1)" }));
    const dialog = screen.getByRole("dialog", { name: "Voltar para a versão 1 da Alma do Otto?" });
    await user.type(within(dialog).getByLabelText("Motivo (fica no histórico de versões)"), "texto novo piorou");
    await user.click(within(dialog).getByRole("button", { name: "Voltar para esta versão" }));
    expect(api.restoreVersionAction).toHaveBeenCalledWith("v1", "texto novo piorou");
    expect(await screen.findByText("Versão 3 ativa, com o conteúdo da versão 1.")).toBeVisible();
    unmount();

    renderAdmin(<SoulPanel agent={otto} unit={unit} soul={{ ...soul, ref: active }} soulDraft={soulDraft} versions={[draftRef, active, old]} />);
    expect(screen.getByRole("button", { name: "Voltar para esta versão (Versão 1)" })).toBeDisabled();
    expect(screen.getAllByText(/publique ou descarte antes de voltar/).length).toBeGreaterThan(0);
  });

  it("erro da API aparece no diálogo, com a mensagem dela, e nada é dado como feito", async () => {
    api.discardVersionAction.mockResolvedValue({ ok: false, code: "invalid_state", status: 409, message: "Esta versão não é mais um rascunho." });
    const user = userEvent.setup();
    renderAdmin(<SoulPanel agent={otto} unit={unit} soul={soul} soulDraft={soulDraft} versions={[draftRef, soul.ref]} />);
    await user.click(screen.getByRole("button", { name: "Descartar" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Descartar rascunho" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Esta versão não é mais um rascunho.");
    expect(nav.refresh).not.toHaveBeenCalled();
  });

  it("fala inglês e espanhol pelo catálogo", () => {
    const { unmount } = renderAdmin(<SoulPanel agent={otto} unit="of Otto's soul" soul={soul} soulDraft={null} versions={[soul.ref]} />, en, "en");
    expect(screen.getByText("6 of 6 sections go into the prompt")).toBeVisible();
    unmount();
    renderAdmin(<SoulPanel agent={otto} unit="del alma de Otto" soul={soul} soulDraft={null} versions={[soul.ref]} />, es, "es");
    expect(screen.getByText("6 de 6 secciones entran en el prompt")).toBeVisible();
  });
});

describe("Agente › Skills, Ferramentas e O que ele lê", () => {
  it("uma aba por delivery; sem skill escrita, estado vazio honesto", async () => {
    const skillRef = ref({ id: "s1", kind: "skill", key: "04.01" });
    const user = userEvent.setup();
    renderAdmin(
      <SkillsPanel
        agent={{ id: "otto", name: "Otto", article: "o", shape: "otto" }}
        skills={[
          {
            summary: { delivery_type: "04.01", title: "Textos e legendas de marketing", active: skillRef, draft: null, chars: 3353 },
            detail: {
              agent_id: "otto",
              delivery_type: "04.01",
              draft: null,
              active: {
                ref: skillRef,
                content: "---\ndelivery: \"04.01\"\n---\n# 04.01\n\n## Briefing mínimo\n\n- **canal**",
                meta: { entrega_kind: "caption", essenciais: ["canal", "objetivo", "tema"] },
                title: "Textos e legendas de marketing",
                sections: [{ title: "Briefing mínimo", body: "- **canal**: onde o texto vai sair." }],
                chars: 3353,
              },
            },
            versions: [skillRef],
          },
          { summary: { delivery_type: "04.04", title: "Roteiros de vídeo", active: null, draft: null, chars: null }, detail: null, versions: [] },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Briefing mínimo" })).toBeVisible();
    expect(screen.getByText("canal, objetivo, tema")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: /04\.04/ }));
    expect(screen.getByText("Skill ainda não escrita")).toBeVisible();
    expect(screen.getByText(/o Otto não executa esta delivery/)).toBeVisible();
  });

  const config: ConfigVersion = {
    ref: ref({ id: "c1", kind: "config", key: "agent.yaml" }),
    yaml: "id: otto\nname: Otto\nautonomia_maxima: executar\n",
    fields: {
      tools: ["memoria.ler", "canais.publicar_instagram", "canais.publicar_facebook"],
      tool_notes: { "canais.publicar_instagram": "exige permissão + aprovação específica", "canais.publicar_facebook": "idem" },
      collaborators: ["kaia", "bia"],
      max_autonomy: "executar",
      model: { padrao: "claude-opus-5-5", effort: "medium", thinking: "adaptive" },
      memory: { le: ["marca", "tom_de_voz"], sugere: ["temas"] },
      deliveries: ["04.01", "04.02"],
    },
  };

  it("ferramentas com a nota do agent.yaml (idem herda), YAML só leitura; editar grava rascunho com a lista e a autonomia", async () => {
    api.saveConfigAction.mockResolvedValue({ ok: true, data: ref({ id: "c2", kind: "config", version: 2, status: "draft" }) });
    const user = userEvent.setup();
    renderAdmin(
      <ConfigPanel agent={otto} unit="do agent.yaml do Otto" config={config} configDraft={null} toolCatalog={["memoria.ler", "memoria.sugerir"]} versions={[config.ref]} />,
    );
    expect(screen.getAllByText("Pede autorização")).toHaveLength(2);
    expect(screen.getByText("Médio")).toBeVisible();
    expect(screen.getByText("Adaptativo")).toBeVisible();
    expect(screen.getByLabelText("agent.yaml")).toHaveTextContent("autonomia_maxima: executar");
    await user.click(screen.getByRole("button", { name: "Editar ferramentas e autonomia" }));
    await user.click(screen.getByRole("checkbox", { name: "canais.publicar_facebook" }));
    await user.click(screen.getByRole("checkbox", { name: "memoria.sugerir" }));
    await user.click(screen.getByRole("radio", { name: "Preparar" }));
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect(api.saveConfigAction).toHaveBeenCalledWith("otto", {
      tools: ["memoria.ler", "canais.publicar_instagram", "memoria.sugerir"],
      maxAutonomy: "preparar",
      note: "",
    });
  });

  it("o que ele lê: blocos com tokens e cache; trocar rota e versão pede a montagem à API", async () => {
    const preview: PromptPreview = {
      agent_id: "otto",
      route: "04.01",
      draft: false,
      origin: "database",
      content_hash: "fb290a332565285a9b89",
      sources: [{ key: "SOUL.md", version: 1 }],
      example_context: { locale: "pt-BR", brand_name: "Miolo", request: "Pedido de exemplo" },
      blocks: [
        { part: "rules_and_soul", text: "## Regras", cached: false, chars: 3197, tokens_estimated: 800 },
        { part: "skill", text: "# 04.01", cached: true, chars: 3216, tokens_estimated: 804 },
        { part: "message", text: "<pedido/>", cached: false, chars: 246, tokens_estimated: 62 },
      ],
      chars: 6659,
      tokens_estimated: 1666,
      token_estimate_method: "caracteres/4 (estimativa)",
    };
    api.promptPreviewAction.mockResolvedValue({ ok: true, data: { ...preview, route: "conversa" } });
    const user = userEvent.setup();
    renderAdmin(
      <PromptPanel
        agentId="otto"
        routes={[
          { value: "04.01", label: "04.01 · Textos" },
          { value: "conversa", label: "Conversa" },
        ]}
        initial={preview}
        initialError={null}
        hasDrafts={false}
      />,
    );
    expect(screen.getByText("fb290a332565")).toBeVisible();
    expect(screen.getByRole("region", { name: "skill da rota" })).toHaveTextContent("Em cache");
    expect(screen.getByRole("region", { name: "regras compartilhadas + Alma" })).toHaveTextContent("Sem cache");
    expect(screen.getByText(/3\.197 caracteres · ≈ 800 tokens/)).toBeVisible();
    await user.selectOptions(screen.getByLabelText("Rota"), "conversa");
    expect(api.promptPreviewAction).toHaveBeenLastCalledWith("otto", "conversa", false);
    await user.click(screen.getByRole("radio", { name: "Com os rascunhos" }));
    expect(api.promptPreviewAction).toHaveBeenLastCalledWith("otto", "conversa", true);
    expect(screen.getByText(/Nenhum rascunho esperando/)).toBeVisible();
  });
});

describe("Regras de negócio", () => {
  const rule: RuleDocDetail = {
    doc: {
      id: "r1",
      slug: "diretrizes-do-dono",
      title: "Diretrizes do dono",
      in_prompt: false,
      version: 1,
      updated_at: "2026-10-17T00:17:00Z",
      author: "Vic",
      marks: { decided: 1, current_base: 0, pending: 1, proposal: 0 },
    },
    current: {
      id: "rv1",
      version: 1,
      author: "Vic",
      change_note: "Versão inicial",
      created_at: "2026-10-17T00:17:00Z",
      paragraphs: [
        { mark: "decided", text: "Tudo é testado localmente primeiro.", source: "Vic, 15/10/2026" },
        { mark: "pending", text: "Sessão de suporte: só leitura?", source: "SA0" },
      ],
    },
    versions: [{ id: "rv1", version: 1, author: "Vic", change_note: "Versão inicial", created_at: "2026-10-17T00:17:00Z", paragraphs: [] }],
    prompt_paragraphs: [],
  };
  const shared = {
    detail: {
      doc: "README.md" as const,
      active: ref({ id: "sh1", kind: "shared", agent_id: null, key: "README.md" }),
      active_content: "# squad/\n\n## Regras que todos os agentes compartilham\n\n1. Português do Brasil.\n2. Usar só memória confirmada.\n\n## Outra\n",
      shared_rules: "## Regras que todos os agentes compartilham\n\n1. Português do Brasil.\n2. Usar só memória confirmada.",
      draft: null,
      draft_content: null,
    },
    versions: [ref({ id: "sh1", kind: "shared", agent_id: null, key: "README.md" })],
  };

  it("marcações por parágrafo, pendente não aplicado, e a lista de documentos por teclado", async () => {
    renderAdmin(<RulesPanel rules={[rule]} shared={shared} sharedRulesDraft={null} />);
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("Decidido")).toBeVisible();
    expect(within(panel).getByText("Pendente: o painel não aplica")).toBeVisible();
    expect(within(panel).getByText("Referência interna")).toBeVisible();
    const tab = screen.getByRole("tab", { name: /Diretrizes do dono/ });
    act(() => tab.focus());
    fireEvent.keyDown(tab, { key: "ArrowDown" });
    expect(screen.getByRole("tab", { name: /Regras compartilhadas dos agentes/ })).toHaveAttribute("aria-selected", "true");
    expect(within(screen.getByRole("tabpanel")).getByText("Português do Brasil.")).toBeVisible();
    expect(within(screen.getByRole("tabpanel")).getAllByText("Base atual")).toHaveLength(2);
  });

  it("editar um parágrafo grava a versão nova do documento com todos os parágrafos", async () => {
    api.saveRuleDocAction.mockResolvedValue({ ok: true, data: { version: 2, sharedDraft: null } });
    const user = userEvent.setup();
    renderAdmin(<RulesPanel rules={[rule]} shared={shared} sharedRulesDraft={null} />);
    await user.click(screen.getByRole("button", { name: "Editar o parágrafo 2" }));
    await user.selectOptions(screen.getByLabelText("Marcação"), "decided");
    await user.click(screen.getByRole("button", { name: "Salvar como versão nova" }));
    expect(api.saveRuleDocAction).toHaveBeenCalledWith("r1", {
      paragraphs: [
        { mark: "decided", text: "Tudo é testado localmente primeiro.", source: "Vic, 15/10/2026" },
        { mark: "decided", text: "Sessão de suporte: só leitura?", source: "SA0" },
      ],
      inPrompt: false,
      note: "",
    });
    expect(await screen.findByText('Versão 2 de "Diretrizes do dono" salva. Fica na auditoria.')).toBeVisible();
  });

  it("regras compartilhadas editam pela rota shared/README.md, trocando só a linha do parágrafo", async () => {
    api.saveSharedAction.mockResolvedValue({ ok: true, data: ref({ id: "sh2", kind: "shared", version: 2, status: "draft" }) });
    const user = userEvent.setup();
    renderAdmin(<RulesPanel rules={[]} shared={shared} sharedRulesDraft={null} />);
    await user.click(screen.getByRole("button", { name: "Editar o parágrafo 1" }));
    const text = screen.getByLabelText("Texto do parágrafo 1");
    await user.clear(text);
    await user.type(text, "Português do Brasil, frases curtas.");
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect(api.saveSharedAction).toHaveBeenCalledWith(
      "README.md",
      "# squad/\n\n## Regras que todos os agentes compartilham\n\n1. Português do Brasil, frases curtas.\n2. Usar só memória confirmada.\n\n## Outra\n",
      "",
    );
  });
});
