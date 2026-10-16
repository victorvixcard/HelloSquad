import type { Metadata } from "next";
import { EmptyPage } from "@/components/shell/EmptyPage";

export const metadata: Metadata = { title: "Memória da Marca" };

export default function MemoriaDaMarcaPage() {
  return (
    <EmptyPage
      eyebrow="Gestão"
      title="Memória da Marca"
      description="O que o squad sabe sobre a sua marca. Nada vira regra sem a sua confirmação."
    />
  );
}
