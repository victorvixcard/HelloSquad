"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { DocProps } from "./DocumentBody";
import { DocList, DocSection, list, obj, str } from "./doc-parts";
import "../growth/growth.css";

const num = (v: unknown) => (typeof v === "number" ? v : null);

/**
 * Documento da Kiwi (A2b): plano de mídia e orçamento (05.01) e públicos e testes (05.02), nas seções do formato que o
 * worker grava (`deliveries.py` MediaPlanDelivery e AdTestsDelivery; `flow.py` kiwi_content). O aviso de execução vem
 * de `execucao`: nada foi investido nem criado, e aprovar não autoriza investir.
 */
export function GrowthDoc({ type, content }: DocProps) {
  const t = useTranslations("growth");
  const format = useFormatter();
  const brl = (v: number | null) => (v === null ? "" : format.number(v, { style: "currency", currency: "BRL", maximumFractionDigits: 0 }));
  const channel = (c: string) => (c === "meta_ads" || c === "google_ads" ? t(`channel.${c}`) : c);
  const variable = (v: string) => (["publico", "mensagem", "criativo", "formato"].includes(v) ? t(`variable.${v}`) : v);
  const fmt = (v: string) => (["post", "carousel", "reels", "stories", "status", "article", "email", "video"].includes(v) ? t(`format.${v}`) : v);
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

  if (type === "05.01") {
    const budget = obj(content.orcamento);
    const objectives = list(content.objetivos);
    const channels = list(content.canais);
    const split = list(budget.distribuicao);
    const limits = list(content.limites).map(str).filter(Boolean);
    const hyps = list(content.hipoteses);
    const toRun = list(content.para_executar).map(str).filter(Boolean);
    const exec = obj(content.execucao);
    return (
      <>
        {lead}
        <DocSection title={t("doc.goals")} empty={!objectives.length}>
          <DocList items={objectives.map((o) => ({ t: str(o.objetivo), s: t("doc.goalMeta", { indicator: str(o.indicador), deadline: str(o.prazo) }) }))} />
        </DocSection>
        <DocSection title={t("doc.channels")} empty={!channels.length}>
          <DocList
            items={channels.map((c) => ({ t: channel(str(c.canal)), s: `${t("doc.role", { role: str(c.papel) })} ${t("doc.audience", { audience: str(c.publico) })}` }))}
          />
        </DocSection>
        <DocSection title={t("doc.budget")} empty={!Object.keys(budget).length}>
          <div className="bd-stats">
            <div>
              <b>{brl(num(budget.teto_proposto))}</b>
              <small>{t("doc.ceiling")}</small>
            </div>
            <div>
              <b>{num(budget.teto_informado) === null ? t("doc.notInformed") : brl(num(budget.teto_informado))}</b>
              <small>{t("doc.informed")}</small>
            </div>
            <div>
              <b className="gw-period">{str(budget.periodo)}</b>
              <small>{t("doc.period")}</small>
            </div>
          </div>
          {split.length ? (
            <>
              <h3 className="bd-k gw-sub">{t("doc.split")}</h3>
              <DocList items={split.map((d) => ({ t: `${channel(str(d.canal))}: ${brl(num(d.valor))}` }))} />
            </>
          ) : null}
        </DocSection>
        <DocSection title={t("doc.limits")} empty={!limits.length}>
          <DocList tone="warn" items={limits.map((l) => ({ t: l }))} />
        </DocSection>
        <DocSection title={t("doc.hypotheses")} empty={!hyps.length}>
          <DocList
            items={hyps.map((h) => ({
              t: str(h.hipotese),
              s: `${t("doc.measure", { how: str(h.como_medir) })} ${t("doc.success", { criterion: str(h.criterio_de_sucesso) })}`,
            }))}
          />
        </DocSection>
        <DocSection title={t("doc.toRun")} empty={!toRun.length}>
          <DocList items={toRun.map((x) => ({ t: x }))} />
        </DocSection>
        {premisesSection}
        {Object.keys(exec).length ? <p className="bd-note">{t("exec.plan")}</p> : null}
      </>
    );
  }

  // 05.02 · públicos e testes
  const audiences = list(content.publicos);
  const messages = list(content.mensagens);
  const variations = list(content.variacoes);
  const tests = list(content.testes);
  const plan = obj(content.plano_de_midia);
  const exec = obj(content.execucao);
  return (
    <>
      {lead}
      {num(plan.versao) !== null ? <p className="bd-meta">{t("doc.planRef", { no: num(plan.versao)!, value: brl(num(plan.teto_proposto)) })}</p> : null}
      <DocSection title={t("doc.audiences")} empty={!audiences.length}>
        <DocList items={audiences.map((a) => ({ t: `${str(a.id)} · ${str(a.nome)}`, s: str(a.segmentacao), hint: t("doc.why", { why: str(a.por_que) }) }))} />
      </DocSection>
      <DocSection title={t("doc.messages")} empty={!messages.length}>
        <DocList items={messages.map((m) => ({ t: `${str(m.id)} · ${str(m.angulo)}`, s: str(m.texto) }))} />
      </DocSection>
      <DocSection title={t("doc.variations")} empty={!variations.length}>
        <DocList
          items={variations.map((v) => ({
            t: `${str(v.id)} · ${t("doc.variation", { audience: str(v.publico), message: str(v.mensagem), channel: channel(str(v.canal)), format: fmt(str(v.formato)) })}`,
            s: str(v.criativo),
          }))}
        />
      </DocSection>
      <DocSection title={t("doc.tests")} empty={!tests.length}>
        <DocList
          items={tests.map((x) => ({
            t: `${t("doc.testK", { order: str(x.ordem) })} · ${str(x.hipotese)}`,
            s: [
              t("doc.variable", { variable: variable(str(x.variavel)) }),
              t("doc.uses", { list: list(x.variacoes).map(str).join(", ") }),
              t("doc.metric", { metric: str(x.metrica_principal) }),
              t("doc.success", { criterion: str(x.criterio_de_sucesso) }),
              t("doc.duration", { duration: str(x.duracao) }),
              num(x.verba) === null ? t("doc.noBudget") : t("doc.testBudget", { value: brl(num(x.verba)) }),
            ].join(" · "),
          }))}
        />
      </DocSection>
      <DocSection title={t("doc.forKaia")} empty={!str(content.pedido_para_kaia)}>
        <p className="bd-p">{str(content.pedido_para_kaia)}</p>
      </DocSection>
      {premisesSection}
      {Object.keys(exec).length ? <p className="bd-note">{t("exec.tests")}</p> : null}
    </>
  );
}
