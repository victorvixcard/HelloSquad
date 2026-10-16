"use client";

import { Agent, getAgent, PRODUCT_ICONS, STATUS_GLYPHS } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useShell } from "@/components/product/shell-context";
import { EnvIdentity } from "../EnvIdentity";
import { NeedsStrip, type StripNeed } from "../NeedsStrip";

/** Trabalho da Kaia em andamento (dado real da API), para a bancada e para o começo da galeria. */
export type KaiaWork = { id: string; title: string; single: boolean; href: string };

type Cat = "all" | "social" | "car" | "brand" | "promo" | "img" | "vid";
type NewCat = Exclude<Cat, "all">;
/** Filtros da galeria, na ordem da V4.3 (`KA_CATS`, L11870). */
const CATS: readonly Cat[] = ["all", "social", "car", "brand", "promo", "img", "vid"];

/** Etiqueta de situação da V4.6: o mesmo desenho para o mesmo estado (`STK6`, L13856). */
function StatusTag({ label }: { label: string }) {
  const g = STATUS_GLYPHS.and;
  return (
    <span className="v41-tag is-and">
      <svg className="wk-sg is-and" viewBox="0 0 16 16" aria-hidden="true">
        <circle className="g-o" cx="8" cy="8" r="6.2" />
        <path className="g-f" d={g.fill} />
        <path className="g-m" d={g.mark} />
      </svg>
      <span>{label}</span>
    </span>
  );
}

/**
 * Marca & Criação · Kaia, o estúdio da V4.3/V4.6 (template L5378): "Bancada da Kaia" (a faixa "Precisa de você" e
 * "Em produção" com os trabalhos dela em andamento) e "Criações" com os filtros da galeria. Peça entregue só entra
 * quando houver entrega visual (o motor de imagem é do Vic); até lá a galeria mostra o que está em produção e as
 * contagens reais. Com um filtro ativo, o último quadro é o novo pedido, que abre a conversa com a Kaia.
 */
export function BrandEnvironment({ business, needs, production }: { business: string; needs: StripNeed[]; production: KaiaWork[] }) {
  const t = useTranslations("envs.kaia");
  const tp = useTranslations("pages.env");
  const tc = useTranslations("common");
  const shell = useShell();
  const router = useRouter();
  const [cat, setCat] = useState<Cat>("all");
  const kaia = getAgent("kaia");
  const nar = shell.layout.contentW < 1040 ? " is-nar" : "";
  // O que está em produção vem primeiro; sem tipo de peça ligado a uma categoria ainda, só aparece em "Todas".
  const tiles = cat === "all" ? production : [];
  const count = (c: Cat) => (c === "all" ? production.length : 0);
  const ask = (c: NewCat) =>
    shell.openConversation({
      conversationId: shell.conversationIds.direct.kaia ?? null,
      agent: "kaia",
      context: {
        kind: "env",
        label: tc("areas.kaia"),
        href: `/app/${shell.workspace.slug}/squad/kaia`,
        meta: `${kaia.name} ${tp("describe.kaia", { business })}`,
      },
      draft: t(`ask.${c}`),
    });

  return (
    <div className={`ps-v is-wide v4 ka${nar}`} style={{ maxWidth: shell.layout.contentW }}>
      <EnvIdentity agent="kaia" business={business} />
      <NeedsStrip items={needs} />
      <section className="ka-bench" aria-label={t("bench")}>
        <section className="ka-prod" aria-labelledby="ka-prod-t">
          <header className="ka-sh">
            <h2 id="ka-prod-t">{t("prod")}</h2>
            <span className="ka-n">{production.length}</span>
          </header>
          <div className="ka-pl">
            {production.map((w) => (
              <button key={w.id} type="button" className="ka-p" onClick={() => router.push(w.href)}>
                <span className="ka-p-v">
                  <span className="ka-wip">
                    <Agent agent="kaia" size={32} expression="oval" thinking />
                  </span>
                </span>
                <span className="ka-p-t">
                  <b>{w.title}</b>
                  {w.single ? <small>{t("prodSingle")}</small> : null}
                </span>
                <span className="ka-p-r">
                  <StatusTag label={t("prodTag")} />
                </span>
              </button>
            ))}
          </div>
        </section>
      </section>
      <section className="ka-gal" aria-labelledby="ka-gal-t">
        <header className="ka-gh">
          <h2 id="ka-gal-t">{t("gallery")}</h2>
          <p>{cat === "all" ? t("gallerySub", { business }) : t("gallerySubCat")}</p>
        </header>
        <div className="ka-cats" role="group" aria-label={t("filters")}>
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              className={`ka-cat${cat === c ? " is-on" : ""}`}
              aria-pressed={cat === c}
              aria-label={t("catAria", { label: t(`cats.${c}`), count: count(c) })}
              onClick={() => setCat(c)}
            >
              <span>{t(`cats.${c}`)}</span>
              <small>{count(c)}</small>
            </button>
          ))}
        </div>
        {cat === "all" && !tiles.length ? (
          <div className="v4-empty">
            <Agent agent="kaia" size={48} expression="oval" />
            <b>{t("emptyTitle")}</b>
            <span>{t("emptyText", { business })}</span>
          </div>
        ) : (
          <div className="ka-grid">
            {tiles.map((w) => (
              <button key={w.id} type="button" className="ka-t is-wip" aria-label={t("wipAria", { title: w.title })} onClick={() => router.push(w.href)}>
                <span className="ka-t-v">
                  <span className="ka-wipv">
                    <Agent agent="kaia" size={44} expression="oval" thinking />
                    <small>{t("wip")}</small>
                  </span>
                </span>
                <span className="ka-t-c">
                  <small className="ka-t-k">{t("wipKick")}</small>
                  <b>{w.title}</b>
                  <span className="ka-t-m">
                    <StatusTag label={t("wipTag")} />
                  </span>
                </span>
              </button>
            ))}
            {cat !== "all" ? (
              <button type="button" className="ka-t is-start" aria-label={t("newAria", { label: t(`new.${cat}`) })} onClick={() => ask(cat)}>
                <span className="ka-t-v">
                  <span className="ka-startv">
                    <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
                      <path d={PRODUCT_ICONS.plus} />
                    </svg>
                  </span>
                </span>
                <span className="ka-t-c">
                  <small className="ka-t-k">{t("newKick")}</small>
                  <b>{t(`new.${cat}`)}</b>
                  <span className="ka-t-m">
                    <small>{t("newMeta")}</small>
                  </span>
                </span>
              </button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
