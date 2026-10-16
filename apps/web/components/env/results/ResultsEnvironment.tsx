"use client";

import { Agent, Button } from "@hellosquad/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useShell } from "@/components/product/shell-context";
import { EnvIdentity } from "../EnvIdentity";
import { NeedsStrip, type StripNeed } from "../NeedsStrip";

const KPIS = ["orders", "visits", "reach"] as const;

/**
 * Resultados · Íris no primeiro acesso da V4.6 (`rs.empty`, template L5372): sem fonte conectada não há número,
 * então a tela diz o que falta, o que a Íris vai acompanhar e leva às conexões (na V4.6, a Memória da Marca).
 * Nenhum indicador, gráfico ou leitura é mostrado antes de existir um dado real.
 */
export function ResultsEnvironment({ business, needs }: { business: string; needs: StripNeed[] }) {
  const t = useTranslations("envs.iris");
  const shell = useShell();
  return (
    <div className="ps-v is-wide v4 rs" style={{ maxWidth: shell.layout.contentW }}>
      <EnvIdentity agent="iris" business={business} />
      <NeedsStrip items={needs} />
      <section className="ps-emptybig rs-empty" aria-labelledby="rs-empty-t">
        <Agent agent="iris" size={64} />
        <h2 id="rs-empty-t">{t("emptyTitle")}</h2>
        <p>{t("emptyText")}</p>
        <ul className="rs-empty-l" aria-label={t("tracks")}>
          {KPIS.map((k) => (
            <li key={k}>{t(`kpis.${k}`)}</li>
          ))}
        </ul>
        <Button variant="primary" size="s" icon={null} href={`/app/${shell.workspace.slug}/memoria-da-marca`} linkAs={Link}>
          {t("connections")}
        </Button>
      </section>
    </div>
  );
}
