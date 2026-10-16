import { isApiError, unwrap } from "@hellosquad/contracts";
import { getAgent, isAgentId, type AgentId } from "@hellosquad/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { DeliveryDetail, type DeliveryDetailData } from "@/components/env/DeliveryDetail";
import { DocumentDetail, type DocumentDetailData } from "@/components/env/docs/DocumentDetail";
import { originOf, workEvents, type WorkEvent } from "@/components/env/projects/work-history";
import { dayKey, shortTime } from "@/components/product/conversation-format";
import { TIME_ZONE } from "@/i18n/config";
import { loadMe, serverApi } from "@/lib/api";
import { loadWorkItem, loadWorkspaceCore, type Conversation } from "@/lib/core";
import { deliveryTypeKey, isDocumentDelivery } from "@/lib/delivery-types";

type Params = { params: Promise<{ workspace: string; agente: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const item = await loadWorkItem(id).catch(() => null);
  return item ? { title: item.title } : {};
}

function shortDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

/** A conversa em que o pedido nasceu: a lista da casca (já lida nesta requisição) ou, se for antiga, um GET. */
async function loadConversation(workspaceId: string, conversationId: string | null): Promise<Conversation | null> {
  if (!conversationId) return null;
  const core = await loadWorkspaceCore(workspaceId);
  const known = core.conversations.find((c) => c.id === conversationId);
  if (known) return known;
  try {
    const api = await serverApi();
    return await unwrap(api.GET("/conversations/{conversation_id}", { params: { path: { conversation_id: conversationId } } }));
  } catch (error) {
    if (isApiError(error)) return null;
    throw error;
  }
}

/**
 * Detalhe do trabalho (fora da barra). O segmento `[agente]` é o ambiente de onde ele foi aberto: o voltar leva
 * para lá (V4.6 `_openWork`/`_vWork`, L9730 e L10950; padrão Projetos).
 */
export default async function TrabalhoPage({ params }: Params) {
  const { workspace: slug, agente, id } = await params;
  if (!isAgentId(agente)) notFound();
  const me = await loadMe();
  if (!me.ok) notFound();
  const membership = me.me.memberships.find((m) => m.workspace.slug === slug);
  if (!membership) notFound();
  const item = await loadWorkItem(id);
  if (!item) notFound();
  const locale = await getLocale();
  const t = await getTranslations("content.work");
  const tw = await getTranslations("projects.work");
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
  // "o Otto", "a Kaia" em pt-BR; só o nome em en e es (o artigo fica no catálogo de cada idioma).
  const named = (a: AgentId) => tc("agentRef", { article: getAgent(a).article, name: getAgent(a).name });

  // Origem (V4.6 §2.1): "pedido na conversa com o Otto · 15/10", "pedido na Sala do Squad · 05/10"…
  const conversation = await loadConversation(membership.workspace.id, item.conversation_id);
  const origin = originOf(item, conversation);
  const date = shortDate(origin.at, locale);
  const originL =
    origin.where === "room"
      ? tw("origin.room", { date })
      : origin.where === "direct" && origin.agent
        ? tw("origin.direct", { agent: named(origin.agent), date })
        : tw("origin.plain", { area: tc(`areas.${agent}`), date });

  // Time: o responsável e os colaboradores (pilha do cabeçalho, "Kaia com o Otto").
  const co = item.collaborator_agent_ids.filter((a): a is AgentId => isAgentId(a) && a !== agent);
  const list = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
  const team = { agents: [agent, ...co], label: co.length ? tw("stackLabel", { lead: getAgent(agent).name, names: list.format(co.map(named)) }) : getAgent(agent).name };

  // Histórico só com o que a API devolve: pedido, etapas, runs, versões e decisões.
  const today = dayKey(new Date().toISOString());
  const when = (iso: string) => {
    const time = shortTime(iso, locale);
    return dayKey(iso) === today ? tw("history.today", { time }) : tw("history.at", { date: shortDate(iso, locale), time });
  };
  const textOf = (e: WorkEvent): string => {
    switch (e.kind) {
      case "asked":
        return e.where === "room" ? tw("history.askedRoom") : e.where === "direct" && e.agent ? tw("history.asked", { agent: named(e.agent) }) : tw("history.askedPlain");
      case "step":
        return e.title;
      case "started":
        return tw("history.started", { name: getAgent(e.agent).name });
      case "failed":
        return tw("history.failed", { name: getAgent(e.agent).name });
      case "delivered":
        return tw("history.delivered", { version: e.version });
      case "decided":
        if (e.decision === "approved") return e.version ? tw("history.approved", { version: e.version }) : tw("history.approvedPlain");
        if (e.decision === "changes_requested") return e.note ? tw("history.adjust", { note: e.note }) : tw("history.adjustPlain", { version: e.version ?? 1 });
        if (e.decision === "answered") return tw("history.answered");
        return e.followUp === "revise" ? tw("history.revise") : e.followUp === "cancel" ? tw("history.cancel") : tw("history.rejected");
    }
  };
  const history = workEvents(item, origin, me.me.user.id).map((e) => ({
    agent: e.kind === "asked" || e.kind === "decided" ? null : e.agent,
    text: textOf(e),
    at: when(e.at),
  }));

  const projectName = item.project_id ? await projectNameOf(item.project_id) : null;

  const approvalData = approval
    ? { id: approval.id, status: approval.status, decision: approval.decision, followUp: approval.follow_up }
    : null;
  const project = projectName ? { name: projectName, href: `/app/${slug}/squad/nexo` } : null;
  // A decisão e a versão nova chegam pelo Realtime (router.refresh): a chave remonta o detalhe com o estado do servidor.
  const key = `${approval?.id ?? "-"}:${approval?.status ?? "-"}:${current?.id ?? "-"}`;

  // Entregas em documento (A2b): Bia, Otto 04.02/04.03, Kiwi, Max e Íris, na leitura editorial do documento da V4.4.
  if (isDocumentDelivery(item.delivery_type) && typeKey) {
    const td = await getTranslations("docs");
    const type = item.delivery_type;
    const doc: DocumentDetailData = {
      workItemId: item.id,
      conversationId: item.conversation_id,
      title: item.title,
      agent,
      envHref: `/app/${slug}/squad/${agente}`,
      envLabel: tc(`areas.${agente}`),
      origin: originL,
      type,
      typeLabel: tc(`deliveryTypes.${typeKey}`),
      approveLabel:
        type === "02.01"
          ? td("approveDiagnosis")
          : type === "02.02" || type === "02.03" || type === "02.04"
            ? td("approveDirection")
            : t("approve", { version: current?.version_no ?? 1 }),
      versions: versions.map((x) => ({
        no: x.version_no,
        at: shortDate(x.created_at, locale),
        status: x.status,
        note: x.change_note,
        content: (x.content ?? {}) as Record<string, unknown>,
      })),
      approval: approvalData,
      history,
      team,
      project,
    };
    return <DocumentDetail key={key} data={doc} />;
  }

  const data: DeliveryDetailData = {
    workItemId: item.id,
    conversationId: item.conversation_id,
    title: item.title,
    agent,
    envHref: `/app/${slug}/squad/${agente}`,
    envLabel: tc(`areas.${agente}`),
    origin: originL,
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
    approval: approvalData,
    brief: briefRows,
    history,
    team,
    project,
  };
  return <DeliveryDetail key={key} data={data} />;
}

/** Nome do projeto do trabalho (`GET /projects/{id}`); sem resposta, sem link (nunca um nome inventado). */
async function projectNameOf(projectId: string): Promise<string | null> {
  try {
    const api = await serverApi();
    const p = await unwrap(api.GET("/projects/{project_id}", { params: { path: { project_id: projectId } } }));
    return p.name;
  } catch (error) {
    if (isApiError(error)) return null;
    throw error;
  }
}
