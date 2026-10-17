import { unwrap } from "@hellosquad/contracts";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { adminRead, type AuditItem } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { hrefWith } from "@/lib/admin-labels";
import { Card, DataTable } from "../ui";

/** Motivo gravado pela API (`payload.reason`), quando houver. */
function reasonOf(item: AuditItem): string | null {
  const r = item.payload?.reason;
  return typeof r === "string" && r.trim() ? r : null;
}

/**
 * Últimas ações do Super Admin numa tela de escrita (`GET /admin/audit`, quem = Super Admin): depois de cada ação o
 * diálogo relê a página e a entrada nova aparece aqui, sem recarregar. `actions` restringe aos códigos da tela.
 */
export async function RecentAudit(props: {
  id: string;
  title: string;
  sub: string;
  empty: string;
  workspaceId?: string;
  category?: string;
  actions?: readonly string[];
  limit?: number;
}) {
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const f = adminFormat(locale);
  const dash = t("common.dash");
  const result = await adminRead((api) =>
    unwrap(
      api.GET("/admin/audit", {
        params: {
          query: {
            actor: "platform_admin",
            workspace_id: props.workspaceId ?? null,
            category: props.category ?? null,
            limit: props.actions ? 100 : (props.limit ?? 5),
          },
        },
      }),
    ),
  );
  const rows = result.ok
    ? result.data.items.filter((e) => !props.actions || props.actions.includes(e.action)).slice(0, props.limit ?? 5)
    : [];
  const all = hrefWith("/admin/auditoria", { quem: "platform_admin", conta: props.workspaceId, tipo: props.category });
  return (
    <Card
      id={props.id}
      title={props.title}
      sub={props.sub}
      flush
      actions={
        <Link className="hs-btn hs-btn--ghost hs-btn--s" href={all}>
          <span className="hs-lbl">{t("conta.recentAll")}</span>
        </Link>
      }
    >
      {result.ok ? (
        <DataTable<AuditItem>
          caption={props.title}
          rows={rows}
          rowKey={(e) => e.id}
          empty={props.empty}
          columns={[
            { key: "when", label: t("conta.colWhen"), nowrap: true, cell: (e) => f.dateTime(e.created_at) },
            { key: "action", label: t("auditoria.colAction"), nowrap: true, cell: (e) => <span className="sa-code">{e.action}</span> },
            { key: "who", label: t("conta.colAdmin"), nowrap: true, cell: (e) => e.actor_email ?? e.actor_name ?? dash },
            { key: "reason", label: t("conta.colReason"), cell: (e) => reasonOf(e) ?? dash },
          ]}
        />
      ) : (
        <p className="sa-mut hl-pad">{result.error.message}</p>
      )}
    </Card>
  );
}
