import { redirect } from "next/navigation";
import { ApiUnavailable } from "@/components/ApiUnavailable";
import { loadMe } from "@/lib/api";

// Depois do login: com workspace, vai para o primeiro; sem nenhum, para a criação.
export default async function AppIndexPage() {
  const result = await loadMe();
  if (!result.ok) return <ApiUnavailable error={result.error} retryHref="/app" />;
  const first = result.me.memberships[0];
  redirect(first ? `/app/${first.workspace.slug}` : "/app/novo-workspace");
}
