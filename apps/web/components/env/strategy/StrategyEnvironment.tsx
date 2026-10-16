"use client";

import { getAgent } from "@hellosquad/ui";
import { useTranslations } from "next-intl";
import { useShell } from "@/components/product/shell-context";
import { EnvIdentity } from "../EnvIdentity";
import { NeedsStrip, type StripNeed } from "../NeedsStrip";

/**
 * Estratégia · Bia no primeiro acesso da V4.6 (`bia.first`, template L5434): a direção estratégica ainda não existe,
 * então a tela mostra só o convite ao diagnóstico, nada além. Sem direção, oportunidades nem documentos no banco.
 * "Analisar meu negócio" abre a conversa com a Bia com o pedido da V4.6 já escrito no campo, sem enviar nada.
 */
export function StrategyEnvironment({ business, needs }: { business: string; needs: StripNeed[] }) {
  const t = useTranslations("envs.bia");
  const tp = useTranslations("pages.env");
  const tc = useTranslations("common");
  const shell = useShell();
  const bia = getAgent("bia");
  const nar = shell.layout.contentW < 1040 ? " is-nar" : "";
  const start = () =>
    shell.openConversation({
      conversationId: shell.conversationIds.direct.bia ?? null,
      agent: "bia",
      context: {
        kind: "env",
        label: tc("areas.bia"),
        href: `/app/${shell.workspace.slug}/squad/bia`,
        meta: `${bia.name} ${tp("describe.bia", { business })}`,
      },
      draft: t("startAsk"),
    });

  return (
    <div className={`ps-v is-wide v4 bi${nar}`} style={{ maxWidth: shell.layout.contentW }}>
      <EnvIdentity agent="bia" business={business} />
      <NeedsStrip items={needs} />
      <section className="bi-empty" aria-labelledby="bi-empty-t">
        <span className="ka-k">{t("kicker")}</span>
        <h2 id="bi-empty-t">{t("firstTitle", { business })}</h2>
        <p>{t("firstText")}</p>
        <button type="button" className="hm-btn is-dark is-s" onClick={start}>
          <span>{t("start")}</span>
        </button>
      </section>
    </div>
  );
}
