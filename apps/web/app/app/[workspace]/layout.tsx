import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ApiUnavailable } from "@/components/ApiUnavailable";
import { AppShell, SIDEBAR_COOKIE } from "@/components/shell/AppShell";
import { loadMe } from "@/lib/api";
import "../shell.css";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const result = await loadMe();
  if (!result.ok) return <ApiUnavailable error={result.error} retryHref={`/app/${slug}`} />;
  const { me } = result;
  // Só os workspaces de quem está logado (a API já filtra pela RLS); outro slug é 404.
  const membership = me.memberships.find((m) => m.workspace.slug === slug);
  if (!membership) notFound();
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "min";
  return (
    <AppShell
      workspace={{ slug: membership.workspace.slug, name: membership.workspace.name }}
      user={{ name: me.user.full_name || me.user.email || "Você", email: me.user.email ?? "" }}
      workspaces={me.memberships.map((m) => ({ slug: m.workspace.slug, name: m.workspace.name }))}
      initialCollapsed={collapsed}
    >
      {children}
    </AppShell>
  );
}
