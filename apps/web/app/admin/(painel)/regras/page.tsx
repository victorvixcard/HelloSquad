import { unwrap } from "@hellosquad/contracts";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AdminPage } from "@/components/admin/AdminPage";
import { RulesPanel } from "@/components/admin/squad/RulesPanel";
import { ApiProblem } from "@/components/admin/ui";
import { adminRead } from "@/lib/admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.regras");
  return { title: t("title") };
}

/**
 * Regras de negócio (SA0 `regras.html`): os documentos de `GET /admin/rules` (cada um com os parágrafos da versão
 * atual e o histórico) e as regras compartilhadas dos sete (`GET /admin/squad/shared/README.md`, o trecho que entra no
 * prompt), com as versões de cada um. A edição acontece no painel (cliente) e relê esta página ao gravar.
 */
export default async function RulesPage() {
  const t = await getTranslations("admin");
  const back = "/admin/regras";
  const [list, shared, sharedVersions] = await Promise.all([
    adminRead((api) => unwrap(api.GET("/admin/rules")), back),
    adminRead((api) => unwrap(api.GET("/admin/squad/shared/{doc}", { params: { path: { doc: "README.md" } } })), back),
    adminRead((api) => unwrap(api.GET("/admin/squad/versions", { params: { query: { kind: "shared", key: "README.md" } } })), back),
  ]);
  if (!list.ok) {
    return (
      <AdminPage nav="regras" title={t("regras.title")} desc={t("regras.desc")} versioned>
        <ApiProblem label={t("common.apiDown")} message={list.error.message} />
      </AdminPage>
    );
  }
  const details = await Promise.all(
    list.data.items.map((doc) => adminRead((api) => unwrap(api.GET("/admin/rules/{doc_id}", { params: { path: { doc_id: doc.id } } })), back)),
  );
  return (
    <AdminPage nav="regras" title={t("regras.title")} desc={t("regras.desc")} versioned>
      <RulesPanel
        rules={details.flatMap((d) => (d.ok ? [d.data] : []))}
        shared={shared.ok ? { detail: shared.data, versions: sharedVersions.ok ? sharedVersions.data.items : [] } : null}
        sharedRulesDraft={list.data.shared_rules_draft}
      />
    </AdminPage>
  );
}
