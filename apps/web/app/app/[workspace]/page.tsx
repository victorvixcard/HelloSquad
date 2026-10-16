import type { Metadata } from "next";
import { EmptyPage } from "@/components/shell/EmptyPage";
import { loadMe } from "@/lib/api";

export const metadata: Metadata = { title: "Início" };

export default async function InicioPage() {
  const result = await loadMe();
  const fullName = result.ok ? result.me.user.full_name : null;
  const firstName = fullName?.trim().split(/\s+/)[0];
  return (
    <EmptyPage
      eyebrow="Principal"
      title={firstName ? `Olá, ${firstName}.` : "Olá."}
      description="O que o squad fizer pelo seu negócio aparece aqui: pedidos, trabalhos e o que precisa de você."
    />
  );
}
