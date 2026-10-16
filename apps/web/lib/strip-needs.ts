import type { AgentId } from "@hellosquad/ui";
import { getTranslations } from "next-intl/server";
import type { StripNeed } from "@/components/env/NeedsStrip";
import type { Approval } from "./core";
import { deliveryTypeKey } from "./delivery-types";
import { needItems } from "./needs";

/** Pendências de um ambiente (V4.6: uma faixa por ambiente). Projetos/Nexo vê todas; os demais, as do especialista. */
export async function stripNeeds(slug: string, approvals: Approval[], agent: AgentId): Promise<StripNeed[]> {
  const t = await getTranslations("pages.needs");
  const tc = await getTranslations("common");
  return needItems(slug, approvals)
    .filter((n) => agent === "nexo" || n.agent === agent)
    .map((n) => {
      const key = deliveryTypeKey(n.deliveryType);
      const type = key ? tc(`deliveryTypes.${key}`) : null;
      return {
        approvalId: n.approvalId,
        agent: n.agent,
        kind: tc(`approvalKinds.${n.kind}`),
        title: n.title,
        sub: type && n.versionNo ? t("sub", { type, version: n.versionNo }) : t("subNoVersion"),
        cta: t(`cta.${n.kind}`, { object: key ? t(`object.${key}`) : t("object.default") }),
        href: n.href,
      };
    });
}
