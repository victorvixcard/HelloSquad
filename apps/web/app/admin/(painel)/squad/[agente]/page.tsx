import { unwrap } from "@hellosquad/contracts";
import { Agent, AGENT_IDS, getAgent, isAgentId } from "@hellosquad/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ConfigPanel } from "@/components/admin/squad/ConfigPanel";
import { PromptPanel } from "@/components/admin/squad/PromptPanel";
import { SkillsPanel } from "@/components/admin/squad/SkillsPanel";
import { SoulPanel } from "@/components/admin/squad/SoulPanel";
import { ApiProblem } from "@/components/admin/ui";
import { adminRead } from "@/lib/admin";
import { codeLabel } from "@/lib/admin-labels";

type Props = { params: Promise<{ agente: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { agente } = await params;
  const t = await getTranslations("admin.agente");
  return { title: isAgentId(agente) ? t("metaTitle", { name: getAgent(agente).name }) : t("title") };
}

/**
 * Agente (SA0 `agente.html` → `GET /admin/squad/agents/{id}` e versões): quatro abas, Alma, Skills, Ferramentas e
 * limites, O que ele lê. A aba aberta fica no endereço (#alma). Anterior e próximo percorrem os sete.
 */
export default async function AgentPage({ params }: Props) {
  const { agente } = await params;
  if (!isAgentId(agente)) notFound();
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  void locale;
  const back = `/admin/squad/${agente}`;
  const member = getAgent(agente);
  const versionsOf = (kind: "soul" | "config" | "skill", key?: string) =>
    adminRead(
      (api) => unwrap(api.GET("/admin/squad/versions", { params: { query: { kind, agent_id: agente, key: key ?? null } } })),
      back,
    );
  const [detail, soulVersions, configVersions, squad] = await Promise.all([
    adminRead((api) => unwrap(api.GET("/admin/squad/agents/{agent_id}", { params: { path: { agent_id: agente } } })), back),
    versionsOf("soul"),
    versionsOf("config"),
    adminRead((api) => unwrap(api.GET("/admin/squad")), back),
  ]);
  const crumbs = [{ label: t("squad.title"), href: "/admin/squad" }, { label: member.name }];
  if (!detail.ok) {
    if (detail.error.status === 404) notFound();
    return (
      <AdminPage nav="squad" title={member.name} crumbs={crumbs} versioned>
        <ApiProblem label={t("common.apiDown")} message={detail.error.message} />
      </AdminPage>
    );
  }
  const d = detail.data;
  const a = d.agent;
  // Skills escritas (ou com rascunho): o arquivo, as seções e as versões; as outras ficam com o estado vazio honesto.
  const skills = await Promise.all(
    d.skills.map(async (summary) => {
      if (!summary.active && !summary.draft) return { summary, detail: null, versions: [] };
      const path = { agent_id: agente, delivery_type: summary.delivery_type };
      const [skill, versions] = await Promise.all([
        adminRead((api) => unwrap(api.GET("/admin/squad/agents/{agent_id}/skills/{delivery_type}", { params: { path } })), back),
        versionsOf("skill", summary.delivery_type),
      ]);
      return { summary, detail: skill.ok ? skill.data : null, versions: versions.ok ? versions.data.items : [] };
    }),
  );
  const written = d.skills.filter((s) => s.active).length;
  // O que ele lê: as rotas que montam prompt (delivery com skill, conversa, reflexão); abre na primeira, versão ativa.
  const routes = [
    ...d.skills
      .filter((s) => s.active || s.draft)
      .map((s) => ({ value: s.delivery_type, label: t("le.routeDelivery", { code: s.delivery_type, title: s.title ?? "" }) })),
    { value: "conversa", label: t("le.routeChat") },
    { value: "reflexao", label: t("le.routeReflection") },
  ];
  const firstPreview = await adminRead(
    (api) =>
      unwrap(
        api.GET("/admin/squad/agents/{agent_id}/prompt", {
          params: { path: { agent_id: agente }, query: { route: routes[0]!.value, draft: false } },
        }),
      ),
    back,
  );
  const hasDrafts = Boolean(d.soul_draft || d.config_draft || d.skills.some((s) => s.draft));
  const i = AGENT_IDS.indexOf(agente);
  const prev = AGENT_IDS[(i + AGENT_IDS.length - 1) % AGENT_IDS.length]!;
  const next = AGENT_IDS[(i + 1) % AGENT_IDS.length]!;
  const unit = (kind: "soul" | "config", key?: string) =>
    t(`agente.unit.${kind}`, { name: a.name, article: a.article ?? "o", key: key ?? "" });

  return (
    <AdminPage
      nav="squad"
      crumbs={crumbs}
      title={a.name}
      versioned
      avatar={<Agent agent={agente} size={44} title={a.name} />}
      desc={a.role_full ?? a.role ?? undefined}
      actions={
        <>
          <a className="hs-ib hs-ib--soft sq-nav" href={`/admin/squad/${prev}`} aria-label={t("agente.prev", { name: getAgent(prev).name })}>
            <span aria-hidden="true">‹</span>
          </a>
          <a className="hs-ib hs-ib--soft sq-nav" href={`/admin/squad/${next}`} aria-label={t("agente.next", { name: getAgent(next).name })}>
            <span aria-hidden="true">›</span>
          </a>
        </>
      }
    >
      <p className="sq-model">
        <span className="sa-chip">
          {t("agente.modelChip", { model: codeLabel(t, "model", a.default_model), effort: codeLabel(t, "effort", a.effort) })}
        </span>
      </p>
      <AdminTabs
        idPrefix="ag"
        label={t("agente.tabsLabel")}
        tabs={[
          {
            id: "alma",
            label: t("agente.tabSoul"),
            panel: (
              <SoulPanel
                agent={{ id: a.id, name: a.name, shape: agente }}
                unit={unit("soul")}
                soul={d.soul}
                soulDraft={d.soul_draft}
                versions={soulVersions.ok ? soulVersions.data.items : []}
              />
            ),
          },
          {
            id: "skills",
            label: t("agente.tabSkills", { n: written, total: d.skills.length }),
            panel: <SkillsPanel agent={{ id: a.id, name: a.name, article: a.article ?? "o", shape: agente }} skills={skills} />,
          },
          {
            id: "ferramentas",
            label: t("agente.tabTools"),
            panel: (
              <ConfigPanel
                agent={{ id: a.id, name: a.name, shape: agente }}
                unit={unit("config")}
                config={d.config}
                configDraft={d.config_draft}
                toolCatalog={squad.ok ? squad.data.tool_catalog : []}
                versions={configVersions.ok ? configVersions.data.items : []}
              />
            ),
          },
          {
            id: "le",
            label: t("agente.tabReads"),
            panel: (
              <PromptPanel
                // Publicar, voltar ou gravar rascunho muda as versões: a aba remonta com a montagem nova do servidor.
                key={[d.soul?.ref.id, d.soul_draft?.ref.id, d.config?.ref.id, d.config_draft?.ref.id, ...d.skills.map((s) => s.draft?.id ?? s.active?.id)].join(":")}
                agentId={a.id}
                routes={routes}
                initial={firstPreview.ok ? firstPreview.data : null}
                initialError={firstPreview.ok ? null : firstPreview.error.message}
                hasDrafts={hasDrafts}
              />
            ),
          },
        ]}
      />
    </AdminPage>
  );
}
