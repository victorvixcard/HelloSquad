import type { AgentId } from "@hellosquad/ui";
import type { Metadata } from "next";

// Textos do site público. Fontes: Hero da Landing Page V1 (R32) e handoff V4.6, seção A
// (design/handoff-v4.6/README.md). Kiwi é Growth Marketing (decisão do dono, 15/10/2026).
export const SITE = {
  title: "HelloSquad: seu squad de IA assume o marketing",
  description:
    "A HelloSquad é uma equipe de marketing com IA para pequenos e médios negócios: sete especialistas que compartilham a memória da sua marca e trabalham juntos. Você toma as decisões.",
  definition:
    "A HelloSquad funciona como uma equipe de marketing com IA para pequenos e médios negócios. São sete especialistas que compartilham a mesma memória da marca e trabalham de forma coordenada. Você pede, o squad organiza e executa. As decisões continuam sendo suas: aprovar, autorizar, confirmar.",
} as const;

/** Responsabilidade de cada especialista (handoff V4.6, seção A). */
export const RESPONSIBILITIES: Record<AgentId, string> = {
  nexo: "Coordenação: distribui pedidos e acompanha projetos e trabalhos.",
  bia: "Diagnóstico, plano de marketing e oportunidades.",
  kaia: "Identidade e peças visuais.",
  otto: "Calendário editorial, textos e publicações.",
  kiwi: "Mídia paga, SEO e aquisição orgânica, conversão e testes.",
  max: "Relacionamento, jornadas e reativação.",
  iris: "Métricas, análises e leituras de desempenho.",
};

/**
 * Base do Open Graph. A Metadata API do Next substitui o objeto openGraph inteiro quando uma página
 * define o seu: toda página que mexe em openGraph espalha esta base.
 */
export const OPEN_GRAPH_BASE = {
  type: "website",
  locale: "pt_BR",
  siteName: "HelloSquad",
  title: SITE.title,
  description: SITE.description,
} satisfies NonNullable<Metadata["openGraph"]>;
