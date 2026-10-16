import { AGENT_IDS } from "@hellosquad/ui";
import type { Metadata } from "next";
import { EmptyPage } from "@/components/shell/EmptyPage";

export const metadata: Metadata = { title: "Sala do Squad" };

export default function SalaDoSquadPage() {
  return (
    <EmptyPage
      eyebrow="Principal"
      title="Sala do Squad"
      description="A conversa com todo o squad. O Nexo organiza e chama quem precisa."
      agents={AGENT_IDS}
    />
  );
}
