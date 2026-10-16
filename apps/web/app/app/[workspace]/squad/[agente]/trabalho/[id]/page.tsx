import { getAgent, isAgentId, type AgentId } from "@hellosquad/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { DeliveryDetail, type DeliveryDetailData } from "@/components/env/DeliveryDetail";
import { shortTime } from "@/components/product/conversation-format";
import { TIME_ZONE } from "@/i18n/config";
import { loadMe } from "@/lib/api";
import { loadWorkItem } from "@/lib/core";
import { deliveryTypeKey } from "@/lib/delivery-types";

type Params = { params: Promise<{ workspace: string; agente: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const item = await loadWorkItem(id).catch(() => null);
  return item ? { title: item.title } : {};
}

function shortDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

export default async function TrabalhoPage({ params }: Params) {
  const { workspace: slug, agente, id } = await params;
  if (!isAgentId(agente)) notFound();
  const me = await loadMe();
  if (!me.ok || !me.me.memberships.some((m) => m.workspace.slug === slug)) notFound();
  const item = await loadWorkItem(id);
  if (!item) notFound();
  const locale = await getLocale();
  const t = await getTranslations("content.work");
  const tc = await getTranslations("common");
  const agent: AgentId = isAgentId(item.primary_agent_id) ? item.primary_agent_id : agente;
  const delivery = item.deliveries[0];
  const versions = delivery?.versions ?? [];
  const current = versions.find((x) => x.id === delivery?.current_version_id) ?? versions[versions.length - 1];
  const raw = (current?.content ?? {}) as { legenda?: unknown; hashtags?: unknown; canal?: unknown; versoes?: unknown };
  // Dois formatos de legenda: o do seed (`legenda`, `hashtags`) e o da skill 04.01 do worker (`versoes[]` com
  // `texto` e `hashtags`, S1c). Da skill, a mesa mostra a primeira versão.
  const first = Array.isArray(raw.versoes) ? ((raw.versoes[0] ?? {}) as { texto?: unknown; hashtags?: unknown }) : null;
  const content = first ? { legenda: first.texto, hashtags: first.hashtags, canal: raw.canal } : raw;
  const approval = item.approvals.find((a) => a.status === "pending") ?? item.approvals[item.approvals.length - 1] ?? null;
  const typeKey = deliveryTypeKey(item.delivery_type);
  const brief = item.briefing as Record<string, unknown>;
  const briefRows = (["canal", "objetivo", "tom", "restricoes"] as const)
    .filter((k) => brief[k] != null)
    .map((k) => ({ k: t(`brief.${k}`), v: Array.isArray(brief[k]) ? (brief[k] as unknown[]).join("; ") : String(brief[k]) }));
  const channel = typeof content.canal === "string" ? content.canal : typeof brief.canal === "string" ? brief.canal : null;
  const member = getAgent(agent);
  const data: DeliveryDetailData = {
    workItemId: item.id,
    conversationId: item.conversation_id,
    title: item.title,
    agent,
    envHref: `/app/${slug}/squad/${agente}`,
    envLabel: tc(`areas.${agente}`),
    origin: t("origin", { agent: `${member.article} ${member.name}`, date: shortDate(item.created_at, locale) }),
    typeLabel: typeKey ? tc(`deliveryTypes.${typeKey}`) : (item.delivery_type ?? ""),
    channel: channel ? channel.charAt(0).toUpperCase() + channel.slice(1) : null,
    version: current
      ? {
          no: current.version_no,
          caption: typeof content.legenda === "string" ? content.legenda : "",
          hashtags: Array.isArray(content.hashtags) ? content.hashtags.map(String) : [],
          at: shortDate(current.created_at, locale),
          note: current.change_note,
        }
      : null,
    versions: versions.map((x) => ({ no: x.version_no, at: shortDate(x.created_at, locale) })),
    approval: approval ? { id: approval.id, status: approval.status, decision: approval.decision, followUp: approval.follow_up } : null,
    brief: briefRows,
    history: item.steps.map((s) => ({
      agent: s.agent_id && isAgentId(s.agent_id) ? s.agent_id : null,
      text: s.title,
      at: shortTime(s.finished_at ?? s.started_at ?? item.created_at, locale),
    })),
  };
  // A decisão e a versão nova chegam pelo Realtime (router.refresh): a chave remonta o detalhe com o estado do servidor.
  const key = `${approval?.id ?? "-"}:${approval?.status ?? "-"}:${current?.id ?? "-"}`;
  return <DeliveryDetail key={key} data={data} />;
}
