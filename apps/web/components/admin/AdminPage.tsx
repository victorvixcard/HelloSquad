import { getTranslations } from "next-intl/server";
import { Fragment, type ReactNode } from "react";
import { loadAdminMe } from "@/lib/admin";
import { adminGroupOf, type AdminNavId } from "./nav";
import { TwoFactorBand } from "./TwoFactorBand";
import { Status } from "./ui";

export type Crumb = { label: string; href?: string };

/**
 * Página do painel como o `Page` do SA0: trilha, faixa de 2FA (enquanto `mfa_enforced` for false), identidade da página
 * (título, descrição, ações) e o conteúdo. No lugar de "Dados fictícios · Protótipo SA0", a etiqueta "Só leitura".
 */
export async function AdminPage(props: {
  nav: AdminNavId;
  title: string;
  desc?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
  avatar?: ReactNode;
  /** Telas do Squad IA editam com versão: a etiqueta do topo diz isso no lugar de "Só leitura". */
  versioned?: boolean;
  /** Telas com ações de escrita (SA6b): a etiqueta diz "Ações com motivo e auditoria" no lugar de "Só leitura". */
  audited?: boolean;
  children: ReactNode;
}) {
  const t = await getTranslations("admin.shell");
  const me = await loadAdminMe();
  const mfaOff = me.ok ? !me.data.mfa_enforced : true;
  const trail: Crumb[] = [{ label: t("tag") }, { label: t(`groups.${adminGroupOf(props.nav)}`) }, ...(props.crumbs ?? [])];
  return (
    <>
      <div className="sa-top">
        <nav className="sa-crumb sa-lbl" aria-label={t("crumbLabel")}>
          {trail.map((c, i) => (
            <Fragment key={`${i}-${c.label}`}>
              {i ? <span aria-hidden="true">/</span> : null}
              {c.href ? <a href={c.href}>{c.label}</a> : <span>{c.label}</span>}
            </Fragment>
          ))}
        </nav>
        <div className="sa-crumb">
          <Status kind="draft" small>
            {props.versioned ? t("versioned") : props.audited ? t("audited") : t("readOnly")}
          </Status>
        </div>
      </div>
      {mfaOff ? <TwoFactorBand /> : null}
      <header className="sa-head" id="conteudo" tabIndex={-1}>
        <div className="sa-head-t">
          {props.avatar ? <span className="sa-head-av">{props.avatar}</span> : null}
          <div>
            <h1 className="sa-h1">{props.title}</h1>
            {props.desc ? <p className="sa-desc">{props.desc}</p> : null}
          </div>
        </div>
        {props.actions ? <div className="sa-head-a">{props.actions}</div> : null}
      </header>
      {props.children}
    </>
  );
}
