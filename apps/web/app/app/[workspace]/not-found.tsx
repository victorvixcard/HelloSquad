import Link from "next/link";
import { getTranslations } from "next-intl/server";

// Dentro da casca (por exemplo /app/miolo/squad/fulano).
export default async function WorkspacePageNotFound() {
  const t = await getTranslations("system.workspaceNotFound");
  return (
    <header className="pg-head">
      <p className="hs-label">{t("label")}</p>
      <h1>{t("title")}</h1>
      <p className="pg-desc">
        {t.rich("lead", {
          link: (chunks) => (
            <Link className="hs-link" href="/app">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </header>
  );
}
