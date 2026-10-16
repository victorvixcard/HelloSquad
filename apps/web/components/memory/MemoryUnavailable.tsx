"use client";

import { PRODUCT_ICONS } from "@hellosquad/ui";
import { useTranslations } from "next-intl";
import { useShell } from "@/components/product/shell-context";

/** A API não respondeu: cabeçalho da Memória e o aviso, sem conhecimento inventado. */
export function MemoryUnavailable() {
  const t = useTranslations("memory");
  const shell = useShell();
  return (
    <div className="ps-v is-wide v4 me" style={{ maxWidth: shell.layout.contentW }}>
      <header className="v4-id me-id">
        <span className="v4-id-av me-ico" aria-hidden="true">
          <svg className="sb-ic" viewBox="0 0 18 18">
            <path d={PRODUCT_ICONS.mem} />
          </svg>
        </span>
        <div className="v4-id-t">
          <h1 className="v4-h1">{t("title")}</h1>
          <p className="v4-id-d">{t("sub")}</p>
        </div>
      </header>
      <p className="me-none" role="status">
        {t("unavailableApi")}
      </p>
    </div>
  );
}
