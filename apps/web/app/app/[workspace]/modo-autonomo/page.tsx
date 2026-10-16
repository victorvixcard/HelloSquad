import type { Metadata } from "next";
import { EmptyPage } from "@/components/shell/EmptyPage";

export const metadata: Metadata = { title: "Modo Autônomo" };

export default function ModoAutonomoPage() {
  return (
    <EmptyPage
      eyebrow="Gestão"
      title="Modo Autônomo"
      description="Delegue o que se repete: o squad cuida sozinho e pede a sua aprovação quando precisa."
    />
  );
}
