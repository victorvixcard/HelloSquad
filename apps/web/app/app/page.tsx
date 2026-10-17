import { redirect } from "next/navigation";
import { ApiUnavailable } from "@/components/ApiUnavailable";
import { loadMe } from "@/lib/api";

// Depois do login: com workspace, vai para o primeiro; sem nenhum, para a criação. O Super Admin sem negócio vai para o
// painel (`is_platform_admin` do `GET /me`, SA7a), não para o onboarding de cliente (H-SA-02).
export default async function AppIndexPage() {
  const result = await loadMe();
  if (!result.ok) return <ApiUnavailable error={result.error} retryHref="/app" />;
  const first = result.me.memberships[0];
  redirect(first ? `/app/${first.workspace.slug}` : result.me.is_platform_admin ? "/admin" : "/app/novo-workspace");
}
