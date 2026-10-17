import { unwrap } from "@hellosquad/contracts";
import { Agent, AGENT_IDS, getAgent, isAgentId } from "@hellosquad/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminTabs } from "@/components/admin/AdminTabs";
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
  const [detail, soulVersions] = await Promise.all([
    adminRead((api) => unwrap(api.GET("/admin/squad/agents/{agent_id}", { params: { path: { agent_id: agente } } })), back),
    adminRead((api) => unwrap(api.GET("/admin/squad/versions", { params: { query: { kind: "soul", agent_id: agente } } })), back),
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
        ]}
      />
    </AdminPage>
  );
}
