import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AdminForbidden } from "@/components/admin/AdminForbidden";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.forbidden");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

/** Para onde o middleware reescreve quando a API responde 403 `platform_admin_only` (a URL pedida continua na barra). */
export default function AdminForbiddenPage() {
  return <AdminForbidden />;
}
