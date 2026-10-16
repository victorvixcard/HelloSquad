"use client";

import { Agent, getAgent, type AgentId } from "@hellosquad/ui";
import { useTranslations } from "next-intl";
import { useShell } from "@/components/product/shell-context";
import { EnvIdentity } from "./EnvIdentity";
import { NeedsStrip, type StripNeed } from "./NeedsStrip";

/**
 * Ambientes ainda não reproduzidos nesta fatia (Projetos, Estratégia, Marca & Criação, Growth, CRM, Resultados):
 * a camada de identidade da V4.6, a faixa "Precisa de você" e um estado vazio honesto, sem visão inventada.
 */
export function AgentEnvironment({ agent, business, needs }: { agent: AgentId; business: string; needs: StripNeed[] }) {
  const t = useTranslations("pages.env");
  const shell = useShell();
  const member = getAgent(agent);
  return (
    <div className="ps-v is-wide v4" style={{ maxWidth: shell.layout.contentW }}>
      <EnvIdentity agent={agent} business={business} />
      <NeedsStrip items={needs} />
      <section className="v4-card v41-main">
        <div className="v4-empty v41-empty">
          <Agent agent={agent} size={48} expression="oval" />
          <span>{t("provisional", { name: member.name })}</span>
        </div>
      </section>
    </div>
  );
}
