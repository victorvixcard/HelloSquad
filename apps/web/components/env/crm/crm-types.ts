import type { components } from "@hellosquad/contracts";
import type { WorkState } from "../growth/work-content";

export type ContactSummary = components["schemas"]["ContactSummary"];
export type ContactImport = components["schemas"]["ContactImport"];

/** Um segmento do último 06.03: o que o Max escreveu e os números que a API calculou da base (nunca do modelo). */
export type CrmSegment = {
  id: string;
  name: string;
  description: string;
  use: string;
  size: number | null;
  email: number | null;
  wa: number | null;
};

export type CrmSegments = { workItemId: string; title: string; versionNo: number; origins: string[]; segments: CrmSegment[] };

/** Um trabalho 06.01 (campanha) ou 06.02 (sequência) em "Campanhas e jornadas", com o link para o documento. */
export type CrmCampaign = {
  id: string;
  type: "06.01" | "06.02";
  title: string;
  state: WorkState;
  goal: string;
  segment: string | null;
  channels: string[];
  steps: number | null;
  next: string | null;
  href: string;
};
