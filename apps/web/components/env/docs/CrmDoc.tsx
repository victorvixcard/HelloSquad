"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { DocProps } from "./DocumentBody";
import { DocList, DocSection, list, obj, str } from "./doc-parts";
import "../crm/crm.css";

const num = (v: unknown) => (typeof v === "number" ? v : null);
const SEGMENT_IDS = ["todos", "ativos_30", "esfriando_31_90", "inativos_90", "sem_compra", "recorrentes"];

/**
 * Documento do Max (A2b): segmentos (06.03), campanha (06.01) e sequência de mensagens (06.02, só texto), nas seções
 * do formato que o worker grava (`deliveries.py` e `flow.py` max_content). Os números da base vêm da API, nunca do
 * modelo; o envio não é autorizado por aprovar o documento.
 */
export function CrmDoc({ type, content }: DocProps) {
  const t = useTranslations("crm");
  const format = useFormatter();
  const n = (v: number | null) => (v === null ? "—" : format.number(v));
  // Datas do conteúdo vêm como AAAA-MM-DD; meio-dia UTC evita virar o dia anterior no fuso do Brasil.
  const day = (d: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(d) ? format.dateTime(new Date(`${d}T12:00:00Z`), { day: "2-digit", month: "2-digit", year: "numeric" }) : d;
  const channel = (c: string) => (c === "email" || c === "whatsapp" ? t(`channel.${c}`) : c);
  const segment = (id: string) => (SEGMENT_IDS.includes(id) ? t(`segment.${id}`) : id);
  const reach = (o: Record<string, unknown>) => {
    const ok = obj(o.elegiveis);
    return `${t("doc.segSize", { n: num(o.tamanho) ?? 0 })} · ${t("seg.receiveV", { email: n(num(ok.email)), wa: n(num(ok.whatsapp)) })}`;
  };
  const premises = list(content.premissas).map(str).filter(Boolean);
  const lead = str(content.resumo) ? (
    <DocSection title="">
      <p className="bd-lead">{str(content.resumo)}</p>
    </DocSection>
  ) : null;
  const premisesSection = (
    <DocSection title={t("doc.premises")} empty={!premises.length}>
      <DocList items={premises.map((p) => ({ t: p }))} />
    </DocSection>
  );

  if (type === "06.03") {
    const base = obj(content.base);
    const consent = obj(base.com_consentimento);
    const origins = list(base.origens).map((o) => str(o.origem)).filter(Boolean);
    const segs = list(content.segmentos);
    const care = list(content.cuidados).map(str).filter(Boolean);
    return (
      <>
        {lead}
        <DocSection title={t("doc.base")} empty={num(base.total) === null}>
          <div className="bd-stats">
            <div>
              <b>{n(num(base.total))}</b>
              <small>{t("doc.baseTotal")}</small>
            </div>
            <div>
              <b>{n(num(consent.algum))}</b>
              <small>{t("doc.baseAny")}</small>
            </div>
            <div>
              <b>{n(num(base.sem_consentimento))}</b>
              <small>{t("doc.baseNone")}</small>
            </div>
          </div>
          {str(base.calculado_em) ? (
            <p className="bd-note">{t("doc.baseAt", { date: day(str(base.calculado_em)), sources: origins.join(", ") || "—" })}</p>
          ) : null}
        </DocSection>
        <DocSection title={t("doc.segments")} empty={!segs.length}>
          <DocList
            items={segs.map((s) => ({
              t: `${str(s.nome)} · ${reach(s)}`,
              s: str(s.descricao),
              hint: t("doc.segUse", { use: str(s.uso_sugerido) }),
            }))}
          />
        </DocSection>
        <DocSection title={t("doc.care")} empty={!care.length}>
          <DocList tone="warn" items={care.map((c) => ({ t: c }))} />
        </DocSection>
        {premisesSection}
        <p className="bd-note">{t("rule")}</p>
      </>
    );
  }

  if (type === "06.01") {
    const goal = obj(content.objetivo);
    const seg = obj(content.segmento);
    const offer = obj(content.oferta);
    const cal = list(content.calendario);
    const measure = list(content.como_medir).map(str).filter(Boolean);
    const kind = str(content.tipo);
    return (
      <>
        {lead}
        <DocSection title={t("doc.goal")} empty={!str(goal.objetivo)}>
          {kind === "reativacao" || kind === "fidelizacao" ? <span className="bd-tag">{t(`doc.kind.${kind}`)}</span> : null}
          <DocList items={[{ t: str(goal.objetivo), s: t("doc.goalMeta", { indicator: str(goal.indicador), deadline: str(goal.prazo) }) }]} />
        </DocSection>
        <DocSection title={t("doc.audience")} empty={!str(seg.id)}>
          <DocList items={[{ t: segment(str(seg.id)), s: num(seg.tamanho) !== null ? reach(seg) : undefined, hint: str(seg.por_que) ? t("doc.audienceWhy", { why: str(seg.por_que) }) : undefined }]} />
        </DocSection>
        <DocSection title={t("doc.offer")} empty={!str(offer.descricao)}>
          <DocList
            items={[{ t: str(offer.descricao), s: `${t("doc.offerTerms", { terms: str(offer.condicoes) })} ${t("doc.offerValid", { valid: str(offer.validade) })}` }]}
          />
        </DocSection>
        <DocSection title={t("doc.calendar")} empty={!cal.length}>
          <DocList
            items={cal.map((c) => ({ t: t("doc.calendarStep", { order: str(c.ordem), date: day(str(c.data)), channel: channel(str(c.canal)) }), s: str(c.acao) }))}
          />
        </DocSection>
        <DocSection title={t("doc.measure")} empty={!measure.length}>
          <DocList items={measure.map((m) => ({ t: m }))} />
        </DocSection>
        {premisesSection}
        {str(content.envio) ? <p className="bd-note">{t("doc.notSent")}</p> : null}
      </>
    );
  }

  // 06.02 · sequência de mensagens (só texto)
  const steps = list(content.etapas);
  const pub = obj(content.publico);
  const campaign = obj(content.campanha);
  return (
    <>
      {lead}
      <p className="bd-note">{t("doc.textOnly")}</p>
      <DocSection title={t("doc.goal")} empty={!str(content.objetivo)}>
        <p className="bd-p">{str(content.objetivo)}</p>
        {num(campaign.versao) !== null ? <p className="bd-meta">{t("doc.campaignRef", { no: num(campaign.versao)! })}</p> : null}
      </DocSection>
      <DocSection title={t("doc.audience")} empty={!str(content.segmento)}>
        <DocList items={[{ t: segment(str(content.segmento)), s: num(pub.tamanho) !== null ? reach(pub) : undefined }]} />
      </DocSection>
      <DocSection title={t("doc.sequence")} empty={!steps.length}>
        <ol className="cr-steps">
          {steps.map((s, i) => (
            <li key={i} className="bd-card">
              <span className="bd-k">{t("doc.stepK", { day: str(s.dia), channel: channel(str(s.canal)) })}</span>
              {str(s.assunto) ? (
                <p className="bd-p">
                  <b>{t("doc.subject")}: </b>
                  {str(s.assunto)}
                </p>
              ) : null}
              <p className="bd-p">{str(s.texto)}</p>
              <dl className="mx-f">
                <div>
                  <dt>{t("doc.cta")}</dt>
                  <dd>{str(s.cta)}</dd>
                </div>
                {str(s.condicao) ? (
                  <div>
                    <dt>{t("doc.condition")}</dt>
                    <dd>{str(s.condicao)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{t("doc.unsubscribe")}</dt>
                  <dd>{str(s.descadastro)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </DocSection>
      <DocSection title={t("doc.frequency")} empty={!str(content.frequencia)}>
        <p className="bd-p">{str(content.frequencia)}</p>
      </DocSection>
      {premisesSection}
      {str(content.envio) ? <p className="bd-note">{t("doc.notSent")}</p> : null}
    </>
  );
}
