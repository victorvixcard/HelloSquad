import type { Metadata } from "next";
import { EmptyPage } from "@/components/shell/EmptyPage";

export const metadata: Metadata = { title: "Minha Equipe & Conversas" };

export default function EquipePage() {
  return (
    <EmptyPage
      eyebrow="Gestão"
      title="Minha Equipe & Conversas"
      description="Os perfis dos especialistas e o histórico das conversas."
    />
  );
}
