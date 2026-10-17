import { Agent, Button } from "@hellosquad/ui";
import { useTranslations } from "next-intl";

/**
 * 403 honesto do painel (SA2): quem não está em `platform_admins` vê o motivo no próprio idioma e o caminho de volta.
 * Os links são `<a>` (navegação inteira): o CSS do painel não segue para o produto.
 */
export function AdminForbidden() {
  const t = useTranslations("admin");
  return (
    <main className="sa-denied" id="conteudo">
      <section className="sa-card sa-denied-c" aria-labelledby="sa-denied-t">
        <div className="sa-card-b">
          <div className="sa-sb-top">
            <span className="sa-wm">HelloSquad</span>
            <span className="sa-wm-tag">{t("shell.tag")}</span>
          </div>
          <Agent agent="nexo" size={48} expression="serio" />
          <h1 id="sa-denied-t" className="sa-h1">
            {t("forbidden.heading")}
          </h1>
          <p className="sa-desc">{t("forbidden.body")}</p>
          <div className="sa-empty-a">
            <Button href="/app" variant="primary" size="s">
              {t("forbidden.product")}
            </Button>
            <Button href="/sair" variant="ghost" size="s">
              {t("forbidden.signOut")}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
