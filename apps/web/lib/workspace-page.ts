import { notFound } from "next/navigation";
import { loadMe } from "./api";

/** O negócio da rota (o layout já garantiu que a pessoa é membro; aqui só lemos o nome). */
export async function workspaceOf(slug: string) {
  const me = await loadMe();
  if (!me.ok) notFound();
  const membership = me.me.memberships.find((m) => m.workspace.slug === slug);
  if (!membership) notFound();
  return membership.workspace;
}
