"use client";

import { Agent, getAgent, PRODUCT_ICONS, type AgentId } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type CSSProperties } from "react";
import { useLive } from "@/components/product/live";
import { useShell } from "@/components/product/shell-context";
import { EnvIdentity } from "../EnvIdentity";
import { NeedsStrip, type StripNeed } from "../NeedsStrip";
import { AllWorks } from "./AllWorks";
import { type BoardWork, type Family } from "./board";
import { StatusGlyph } from "./StatusGlyph";

/** Um projeto do roadmap, como a API devolve (`GET /workspaces/{id}/projects`), com os trabalhos pedidos nele. */
export type ProjectRow = {
  id: string;
  name: string;
  objective: string | null;
  status: "draft" | "active" | "paused" | "done" | "cancelled";
  lead: AgentId;
  works: Array<{ id: string; title: string; agent: AgentId; href: string }>;
};

export type ProjectsData = {
  business: string;
  needs: StripNeed[];
  projects: ProjectRow[];
  works: BoardWork[];
};

/** Projeto ativo, pausado ou concluído; rascunho e cancelado não têm desenho de projeto na V4.6. */
function projectFamily(status: ProjectRow["status"]): Family | null {
  return status === "active" ? "and" : status === "paused" ? "pause" : status === "done" ? "done" : null;
}

/**
 * Projetos · Nexo, as camadas da V4.6 (template L4768–4910; `_vProj` V4.1 L11012): identidade do Nexo, a faixa
 * "Precisa de você", o "Roadmap de projetos", "Seu Squad está trabalhando" e "Próximos marcos", e "Todos os
 * trabalhos" (Quadro, Lista e Biblioteca). Só o que a API devolve; o resto fica no vazio da própria V4.6.
 */
export function ProjectsView({ data }: { data: ProjectsData }) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const shell = useShell();
  const live = useLive();
  const router = useRouter();
  const [sel, setSel] = useState<string | null>(null);
  const [moreB, setMoreB] = useState(false);
  const narrow = shell.layout.contentW < 1040;
  const envHref = `/app/${shell.workspace.slug}/squad/nexo`;
  const names = (ids: AgentId[]) =>
    new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(ids.map((a) => getAgent(a).name));

  const talk = (label: string) =>
    shell.openConversation({
      conversationId: shell.conversationIds.direct.nexo ?? null,
      agent: "nexo",
      context: { kind: "env", label, href: envHref, meta: t("summary.meta") },
    });
  // "Começar pela Campanha de Natal" (L11116): a Sala do Squad em tela cheia, com o pedido já escrito no campo.
  const startCampaign = () =>
    shell.openConversation({ conversationId: shell.conversationIds.room, agent: null, room: true, draft: t("roadmap.startDraft") }, "full");

  const projects = data.projects.flatMap((p) => {
    const family = projectFamily(p.status);
    return family ? [{ ...p, family }] : [];
  });
  const activeN = projects.filter((p) => p.family !== "pause").length;
  const pausedN = projects.length - activeN;

  // "Seu Squad está trabalhando": os trabalhos em andamento de verdade (in_progress), quem está e o quê.
  const working = data.works.filter((w) => w.status === "in_progress");
  const rowsB = working.map((w) => ({ w, th: live.modes[w.lead] === "work" }));
  const workingRow = ({ w, th }: (typeof rowsB)[number]) => (
    <button type="button" className="v41-row" key={w.id} onClick={() => router.push(w.href)}>
      <Agent agent={w.lead} size={26} expression="oval" thinking={th} />
      <span className="v41-row-t">
        <b>{w.title}</b>
        <small>
          <span className="v4-who">{getAgent(w.lead).name}</span> · {t("working.state")}
        </small>
      </span>
      <i className="v41-row-e" />
    </button>
  );

  return (
    <div className="ps-v is-wide v4 pj" style={{ maxWidth: shell.layout.contentW }}>
      <EnvIdentity agent="nexo" business={data.business} />
      <NeedsStrip items={data.needs} />

      <section className="v4-card v41-main pj-rm" aria-labelledby="pj-rm-t">
        <header className="v4-ch">
          <div className="v4-ch-t">
            <h2 id="pj-rm-t">{t("roadmap.title")}</h2>
            <small>{projects.length ? t("roadmap.sub", { active: activeN, paused: pausedN }) : ""}</small>
          </div>
          {projects.length ? (
            <span className="pj-lg" aria-hidden="true">
              <span>
                <i className="pj-lg-bar" />
                {t("roadmap.legend.project")}
              </span>
              <span>
                <i className="pj-lg-ms" />
                {t("roadmap.legend.milestone")}
              </span>
              <span>
                <i className="pj-lg-plan" />
                {t("roadmap.legend.planned")}
              </span>
              <span>
                <i className="pj-lg-you">
                  <svg viewBox="0 0 16 16">
                    <path d="M8 4.3v4.6 M8 11.5v.15" />
                  </svg>
                </i>
                {t("roadmap.legend.you")}
              </span>
            </span>
          ) : null}
        </header>
        {projects.length ? (
          // A API ainda não tem datas nem marcos de projeto (FLUXOS §10.2, "parcial"): as linhas saem sem a faixa
          // no tempo, que só existe com dado real.
          <div className="pj-tl">
            <div className="pj-body">
              {projects.map((p, i) => {
                const on = sel === p.id;
                const statusL = t(`roadmap.projectStatus.${p.family === "and" ? "active" : p.family === "pause" ? "paused" : "done"}`);
                const owners = [p.lead, ...p.works.map((w) => w.agent).filter((a, k, all) => a !== p.lead && all.indexOf(a) === k)];
                return (
                  <div key={p.id} className={"pj-row" + (on ? " is-sel" : "")} style={{ "--i": i } as CSSProperties}>
                    <div className="pj-rw">
                      <button
                        type="button"
                        className="pj-rl"
                        id={`pj-r-${p.id}`}
                        aria-expanded={on}
                        aria-controls={`pj-d-${p.id}`}
                        aria-label={t("roadmap.rowAria", { title: p.name, status: statusL })}
                        onClick={() => setSel(on ? null : p.id)}
                      >
                        <span className="pj-rl-av" style={{ "--ag": getAgent(p.lead).color } as CSSProperties} aria-hidden="true">
                          <Agent agent={p.lead} size={26} expression={p.family === "pause" ? "sleep" : p.family === "done" ? "happy" : "oval"} />
                        </span>
                        <span className="pj-rl-t">
                          <b>{p.name}</b>
                          <small className={`wk-st is-${p.family}`}>
                            <StatusGlyph family={p.family} />
                            <span>{statusL}</span>
                          </small>
                        </span>
                      </button>
                      <div className="pj-tr" />
                    </div>
                    {on ? (
                      <div className="pj-d" id={`pj-d-${p.id}`} role="region" aria-label={t("roadmap.detailAria", { title: p.name })}>
                        <dl className="pj-d-g">
                          <div className="pj-f is-obj">
                            <dt>{t("roadmap.objective")}</dt>
                            <dd>{p.objective || "—"}</dd>
                          </div>
                          <div className="pj-f">
                            <dt>{t("roadmap.owners")}</dt>
                            <dd>
                              <span className="pj-own">
                                {owners.map((a) => (
                                  <span key={a} className="pj-own-i" data-tip={getAgent(a).name}>
                                    <Agent agent={a} size={24} />
                                  </span>
                                ))}
                              </span>
                              <small>{names(owners)}</small>
                            </dd>
                          </div>
                          <div className="pj-f">
                            <dt>{t("roadmap.status")}</dt>
                            <dd>
                              <span className={`wk-st is-${p.family}`}>
                                <StatusGlyph family={p.family} />
                                <span>{statusL}</span>
                              </span>
                            </dd>
                          </div>
                          <div className="pj-f">
                            <dt>{t("roadmap.nextMilestone")}</dt>
                            <dd>
                              <b>{t("roadmap.noDate")}</b>
                            </dd>
                          </div>
                          <div className="pj-f">
                            <dt>{t("roadmap.due")}</dt>
                            <dd>
                              <b>{t("roadmap.noDue")}</b>
                            </dd>
                          </div>
                        </dl>
                        {p.works.length ? (
                          <div className="pj-d-w">
                            <span className="pj-d-wk">{t("roadmap.works", { count: p.works.length })}</span>
                            <div className="pj-d-wl">
                              {p.works.map((w) => (
                                <button type="button" className="pj-d-wi" key={w.id} onClick={() => router.push(w.href)}>
                                  <Agent agent={w.agent} size={22} />
                                  <span>
                                    <b>{w.title}</b>
                                    <small>{getAgent(w.agent).name}</small>
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <div className="pj-d-a">
                          <button type="button" className="hm-btn is-soft is-s" onClick={() => talk(p.name)}>
                            <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                              <path d={PRODUCT_ICONS.ask} />
                            </svg>
                            <span>{t("roadmap.talk")}</span>
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="v4-empty">
            <Agent agent="nexo" size={40} expression="oval" />
            <b>{t("roadmap.emptyTitle")}</b>
            <span>{t("roadmap.emptyText")}</span>
            <button type="button" className="hm-btn is-soft is-s" onClick={startCampaign}>
              {t("roadmap.emptyStart")}
            </button>
          </div>
        )}
      </section>

      {/* V4.5 (L13836): sem o cartão "Precisa de você" (virou a faixa), os dois cartões dividem a linha (is-2). */}
      <div className={"v41-low pj-low" + (narrow ? " is-nar" : "") + " is-2"}>
        <div className="v41-stack">
          <section className="v41-cd" aria-labelledby="pj-b-t">
            <header className="v41-cd-h">
              <h3 id="pj-b-t">{t("working.title")}</h3>
              <span className="v41-stk" role="img" aria-label={working.length ? t("working.sum", { count: working.length }) : ""}>
                {rowsB.map(({ w, th }) => (
                  <Agent key={w.id} agent={w.lead} size={18} outline thinking={th} />
                ))}
              </span>
              <button type="button" className="v4-ask is-s" aria-label={t("working.talk")} data-tip={t("working.talkTip")} onClick={() => talk(t("working.title"))}>
                <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                  <path d={PRODUCT_ICONS.ask} />
                </svg>
              </button>
            </header>
            {rowsB.length ? (
              <>
                <div className="v41-rows">{rowsB.slice(0, 2).map(workingRow)}</div>
                {rowsB.length > 2 ? (
                  <>
                    <div className={"v41-more" + (moreB ? " is-open" : "")} id="x41-pjB">
                      <div className="v41-more-in">
                        <div className="v41-rows">{rowsB.slice(2).map(workingRow)}</div>
                      </div>
                    </div>
                    <button type="button" className="v41-xbtn" aria-expanded={moreB} aria-controls="x41-pjB" onClick={() => setMoreB((v) => !v)}>
                      <span>{moreB ? t("working.less") : t("working.more", { count: rowsB.length - 2 })}</span>
                      <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                        <path d={PRODUCT_ICONS.chev} />
                      </svg>
                    </button>
                  </>
                ) : null}
              </>
            ) : (
              <p className="v41-cd-e">{t("working.empty")}</p>
            )}
          </section>
          <section className="v41-cd" aria-labelledby="pj-c-t">
            <header className="v41-cd-h">
              <h3 id="pj-c-t">{t("milestones.title")}</h3>
              <span className="v41-cd-s" />
              <button type="button" className="v4-ask is-s" aria-label={t("milestones.talk")} data-tip={t("milestones.talkTip")} onClick={() => talk(t("milestones.title"))}>
                <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                  <path d={PRODUCT_ICONS.ask} />
                </svg>
              </button>
            </header>
            {/* A API não tem marcos com data (FLUXOS §10.2, "parcial"): o vazio é o da própria V4.6. */}
            <p className="v41-cd-e">{t("milestones.empty")}</p>
          </section>
        </div>
      </div>

      <AllWorks works={data.works} narrow={narrow} />
    </div>
  );
}
