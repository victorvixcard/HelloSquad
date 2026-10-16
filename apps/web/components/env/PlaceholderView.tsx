"use client";

import { Agent, NAV_ICONS, type AgentId } from "@hellosquad/ui";
import { useTranslations } from "next-intl";
import { useShell } from "@/components/product/shell-context";

type Page = "auto" | "mem" | "team";
const ICON: Record<Page, readonly string[]> = { auto: NAV_ICONS.auto, mem: NAV_ICONS.mem, team: NAV_ICONS.team };
const WHO: Record<Page, AgentId> = { auto: "nexo", mem: "nexo", team: "nexo" };

/** Páginas de Gestão fora do escopo da A1f: cabeçalho da V4 e estado vazio honesto, sem dado inventado. */
export function PlaceholderView({ page, business }: { page: Page; business: string }) {
  const t = useTranslations(`pages.${page}`);
  const shell = useShell();
  return (
    <div className="ps-v is-wide v4" style={{ maxWidth: shell.layout.contentW }}>
      <header className="v4-id">
        <span className="v4-id-av" aria-hidden="true">
          <svg className="sb-ic" viewBox="0 0 18 18">
            {ICON[page].map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
        </span>
        <div className="v4-id-t">
          <h1 className="v4-h1">{t("title")}</h1>
          <p className="v4-id-d">{t("sub", { business })}</p>
        </div>
      </header>
      <section className="v4-card v41-main">
        <div className="v4-empty v41-empty">
          <Agent agent={WHO[page]} size={48} expression="sleep" />
          <span>{t("empty", { business })}</span>
        </div>
      </section>
    </div>
  );
}
