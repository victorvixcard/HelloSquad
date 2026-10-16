import { isApiError, unwrap } from "@hellosquad/contracts";
import { cache } from "react";
import { topicIdOf } from "@/components/memory/memory-model";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import enMemory from "@/messages/en/memory.json";
import esMemory from "@/messages/es/memory.json";
import ptBRMemory from "@/messages/pt-BR/memory.json";
import { serverApi } from "./api";
import type { BrandFact, FactSource, MemoryDossier } from "./memory";

const MEMORY_CATALOG: Record<Locale, typeof ptBRMemory> = { "pt-BR": ptBRMemory, en: enMemory, es: esMemory };

/**
 * Onde o objetivo contado ao Nexo entra na Memória da Marca (V4.6 `OBJ_FIND`, L6194: "Meu negócio" · "Objetivos" ·
 * "Objetivo atual", confirmado). O assunto e a chave são texto do idioma do negócio, como os outros do dossiê, e vêm do
 * catálogo (`memory.topics.business.goals` e `memory.objectiveKey`, H2-06); sem o idioma do negócio, pt-BR.
 */
export function objectiveFact(locale?: unknown) {
  const catalog = MEMORY_CATALOG[isLocale(locale) ? locale : DEFAULT_LOCALE];
  return { area: "business", topic: catalog.topics.business.goals, key: catalog.objectiveKey } as const;
}

/** O objetivo com os nomes em pt-BR (quem grava ainda não passa o idioma do negócio: `objectiveFact(locale)`). */
export const OBJECTIVE_FACT = objectiveFact(DEFAULT_LOCALE);

/** Estados que orientam o squad (o que a Memória "sabe"); sugestão, conflito, descartado e fora de uso não contam. */
const KNOWN: ReadonlySet<BrandFact["state"]> = new Set(["confirmed", "decision", "from_source", "observed"]);

/** Cartão "Para o squad conhecer…" do primeiro acesso (V4.6 `_vOnb`, L8480): três passos e o progresso. */
export type Onboarding = {
  /** Primeiro acesso: a Memória ainda não sabe nada além do que o próprio cartão pergunta (o objetivo). */
  show: boolean;
  done: number;
  total: 3;
  /** "Mande o site": uma fonte "Site" conectada (lida). */
  site: boolean;
  /** "Conecte o Instagram": a fonte Instagram conectada. */
  instagram: boolean;
  /** "Conte o resto ao Nexo": o objetivo guardado na Memória, ou null. */
  objective: string | null;
};

function facts(dossier: Pick<MemoryDossier, "areas">): BrandFact[] {
  return dossier.areas.flatMap((a) => a.topics.flatMap((t) => t.facts));
}

function connected(sources: FactSource[], name: RegExp): boolean {
  return sources.some((s) => s.kind === "connection" && name.test(s.name) && s.state === "connected");
}

/** O objetivo pelo id estável do assunto ("Objetivos", "Goals" ou "Objetivos"), não pelo texto em pt-BR (H2-06). */
const isObjective = (f: BrandFact) => f.area === "business" && topicIdOf("business", f.topic) === "goals";

/**
 * Progresso real do primeiro acesso, sem nada simulado: o site e o Instagram contam quando a fonte existe e está
 * conectada (ainda não há rota que leia site ou conecte o Instagram, então nesta versão eles não avançam); o objetivo
 * conta quando está na Memória. O cartão some quando a Memória já sabe algo além do objetivo (a conta já configurada,
 * como a Miolo do seed).
 */
export function onboardingFrom(dossier: Pick<MemoryDossier, "areas" | "sources">): Onboarding {
  const known = facts(dossier).filter((f) => KNOWN.has(f.state));
  const objective = known.find(isObjective)?.content ?? null;
  const site = connected(dossier.sources, /^site\b/i);
  const instagram = connected(dossier.sources, /^instagram\b/i);
  return {
    show: !known.some((f) => !isObjective(f)),
    done: Number(site) + Number(instagram) + Number(objective !== null),
    total: 3,
    site,
    instagram,
    objective,
  };
}

/** Leitura do dossiê para o Início; falha da API vira "sem cartão" (o Início segue funcionando). */
export const loadOnboarding = cache(async (workspaceId: string): Promise<Onboarding | null> => {
  try {
    const api = await serverApi();
    const dossier = await unwrap(api.GET("/workspaces/{workspace_id}/memory", { params: { path: { workspace_id: workspaceId } } }));
    return onboardingFrom(dossier);
  } catch (error) {
    if (!isApiError(error)) throw error;
    return null;
  }
});
