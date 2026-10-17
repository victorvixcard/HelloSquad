import { getTranslations } from "next-intl/server";
import { ApiUnavailable } from "@/components/ApiUnavailable";
import { ActionNoticeHost } from "@/components/admin/actions/ActionDialog";
import { AdminForbidden } from "@/components/admin/AdminForbidden";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { unwrap } from "@hellosquad/contracts";
import { adminRead, isForbidden, loadAdminMe } from "@/lib/admin";

/**
 * Casca do Super Admin (SA0): barra lateral com Operação e Squad IA, palco com a página. A API decide quem entra
 * (`GET /admin/me`); o middleware já mandou o 403 para a página honesta, e aqui a casca confere de novo. Os contadores
 * da barra (contas em alerta, saldos abaixo do limiar) vêm de `GET /admin/alerts`; se a leitura falhar, a barra fica
 * sem contador (a página diz o que houve).
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const result = await loadAdminMe();
  if (!result.ok) {
    return isForbidden(result.error) ? <AdminForbidden /> : <ApiUnavailable error={result.error} retryHref="/admin" />;
  }
  const [t, alerts] = await Promise.all([
    getTranslations("admin.shell"),
    adminRead((api) => unwrap(api.GET("/admin/alerts"))),
  ]);
  const badges = alerts.ok ? { consumo: alerts.data.accounts.length, saude: alerts.data.providers.length } : {};
  const { full_name, email } = result.data;
  return (
    <div className="sa">
      <a className="sa-skip" href="#conteudo">
        {t("skip")}
      </a>
      <AdminSidebar person={{ name: (full_name || email || "").trim(), email: email ?? "" }} badges={badges} />
      <main className="sa-main">
        <div className="sa-scroll" id="sa-scroll">
          <div className="sa-v">{children}</div>
        </div>
      </main>
      <ActionNoticeHost />
    </div>
  );
}
