"use client";

import { Agent, getAgent, isAgentId, type AgentId } from "@hellosquad/ui";
import { useLocale, useTranslations } from "next-intl";
import { TIME_ZONE } from "@/i18n/config";
import "@/components/env/strategy/strategy.css";
import type { DocProps } from "./DocumentBody";
import { DocList, DocSection, list, obj, str } from "./doc-parts";

const REL = { alta: 3, media: 2, baixa: 1 } as const;
type Rel = keyof typeof REL;
const isRel = (v: unknown): v is Rel => v === "alta" || v === "media" || v === "baixa";
const strings = (v: unknown) => list<unknown>(v).map(str).filter(Boolean);

/**
 * Documento da Bia (02.01, 02.02, 02.03, 02.04 e 02.07) na leitura editorial do "Documento da Bia" da V4.4 (template
 * L5069): Panorama com o resumo, as seções de cada entrega na ordem do formato que o worker grava
 * (`squad/deliveries.py` e `research_content` em `squad/flow.py`) e, no fim, as premissas e o que falta. Só mostra o
 * que a versão traz. Na pesquisa (02.07), cada achado diz se veio da busca, com as fontes, ou se é sugestão sem validação.
 */
export function StrategyDoc({ type, content }: DocProps) {
  const t = useTranslations("strategy.doc");
  const ts = useTranslations("strategy.env");
  const locale = useLocale();
  const date = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TIME_ZONE }).format(d);
  };
  const resumo = str(content.resumo);
  const premissas = strings(content.premissas);
  const agentOf = (v: unknown): AgentId | null => {
    const id = str(v);
    return id && isAgentId(id) ? id : null;
  };
  const who = (id: AgentId | null) =>
    id ? (
      <div className="bd-rec-who">
        <Agent agent={id} size={20} />
        <span>{t("leads", { agent: getAgent(id).name })}</span>
      </div>
    ) : null;
  const team = (ids: Array<AgentId | null>) => {
    const unique = [...new Set(ids.filter((x): x is AgentId => !!x))];
    return (
      <DocSection title={t("team")} empty={!unique.length}>
        <div className="bd-team">
          {unique.map((a) => (
            <span key={a}>
              <Agent agent={a} size={24} />
              <small>{getAgent(a).name}</small>
            </span>
          ))}
        </div>
      </DocSection>
    );
  };
  const panorama = (
    <DocSection title={t("panorama")} empty={!resumo} className="bd-pano">
      <p className="bd-lead">{resumo}</p>
    </DocSection>
  );
  const assumptions = (
    <DocSection title={t("assumptions")} empty={!premissas.length}>
      <DocList items={premissas.map((p) => ({ t: p }))} />
    </DocSection>
  );

  if (type === "02.01") {
    const lacunas = list(content.lacunas).map(obj).filter((x) => str(x.titulo));
    const opps = list(content.oportunidades).map(obj).filter((x) => str(x.titulo));
    const faltam = list(content.dados_que_faltam).map(obj).filter((x) => str(x.dado));
    return (
      <>
        {panorama}
        <DocSection title={t("attention")} empty={!lacunas.length}>
          <DocList tone="warn" items={lacunas.map((x) => ({ t: str(x.titulo), s: str(x.descricao) }))} />
        </DocSection>
        <DocSection title={t("opportunities")} empty={!opps.length}>
          <div className="bd-opps">
            {opps.map((x, i) => (
              <div key={i} className="bd-op">
                <b>{str(x.titulo)}</b>
                {str(x.descricao) ? <span>{str(x.descricao)}</span> : null}
                {isRel(x.prioridade) ? <em className={`bi-rel is-${REL[x.prioridade]}`}>{ts(`rel.${x.prioridade}`)}</em> : null}
              </div>
            ))}
          </div>
        </DocSection>
        {assumptions}
        <DocSection title={t("missing")} empty={!faltam.length}>
          <DocList
            items={faltam.map((x) => ({ t: str(x.dado), s: str(x.como_conseguir) ? t("missingHow", { how: str(x.como_conseguir) }) : undefined }))}
          />
        </DocSection>
      </>
    );
  }

  if (type === "02.02") {
    const pos = str(content.posicionamento);
    const difs = strings(content.diferenciais);
    const publicos = list(content.publicos).map(obj).filter((x) => str(x.nome));
    const objetivos = list(content.objetivos).map(obj).filter((x) => str(x.objetivo));
    return (
      <>
        {panorama}
        <DocSection title={t("positioning")} empty={!pos}>
          <blockquote className="bd-q">{`“${pos}”`}</blockquote>
        </DocSection>
        <DocSection title={t("differentials")} empty={!difs.length}>
          <DocList tone="plus" items={difs.map((d) => ({ t: d }))} />
        </DocSection>
        <DocSection title={t("audiences")} empty={!publicos.length}>
          <DocList
            items={publicos.map((x) => ({
              t: str(x.nome),
              s: str(x.descricao),
              hint: str(x.o_que_valoriza) ? t("values", { value: str(x.o_que_valoriza) }) : undefined,
            }))}
          />
        </DocSection>
        <DocSection title={t("objectives")} empty={!objetivos.length}>
          <div className="bd-prios">
            {objetivos.map((x, i) => (
              <div key={i} className="bd-pr">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <b>{str(x.objetivo)}</b>
                <small>
                  {[str(x.indicador) && t("indicator", { value: str(x.indicador) }), str(x.prazo) && t("deadline", { value: str(x.prazo) })]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </div>
            ))}
          </div>
        </DocSection>
        {assumptions}
      </>
    );
  }

  if (type === "02.03") {
    const horizonte = str(content.horizonte);
    const acoes = list(content.acoes)
      .map(obj)
      .filter((x) => str(x.acao))
      .sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0));
    return (
      <>
        {panorama}
        <DocSection title={t("horizon")} empty={!horizonte}>
          <p className="bd-p">{horizonte}</p>
        </DocSection>
        <DocSection title={t("initiatives")} empty={!acoes.length}>
          <div className="bd-recs">
            {acoes.map((x, i) => (
              <div key={i} className="bd-rec">
                <span className="bd-rec-n">{String(i + 1).padStart(2, "0")}</span>
                <div className="bd-rec-b">
                  <b>{str(x.acao)}</b>
                  {str(x.por_que) ? <p>{str(x.por_que)}</p> : null}
                  {who(agentOf(x.responsavel))}
                  {str(x.horizonte) ? <small className="bd-meta">{str(x.horizonte)}</small> : null}
                </div>
              </div>
            ))}
          </div>
        </DocSection>
        {team(acoes.map((x) => agentOf(x.responsavel)))}
        {assumptions}
      </>
    );
  }

  if (type === "02.04") {
    const conceito = obj(content.conceito);
    const publico = str(content.publico);
    const mensagens = strings(content.mensagens_chave);
    const periodo = str(content.periodo);
    const frentes = list(content.prioridades)
      .map(obj)
      .filter((x) => str(x.frente))
      .sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0));
    return (
      <>
        {panorama}
        <DocSection title={t("concept")} empty={!str(conceito.nome) && !str(conceito.ideia)}>
          {str(conceito.nome) ? <blockquote className="bd-q">{`“${str(conceito.nome)}”`}</blockquote> : null}
          {str(conceito.ideia) ? <p className="bd-p">{str(conceito.ideia)}</p> : null}
        </DocSection>
        <div className="bd-2">
          <DocSection title={t("audience")} empty={!publico}>
            <p className="bd-p">{publico}</p>
          </DocSection>
          <DocSection title={t("period")} empty={!periodo}>
            <p className="bd-p">{periodo}</p>
          </DocSection>
        </div>
        <DocSection title={t("keyMessages")} empty={!mensagens.length}>
          <DocList tone="plus" items={mensagens.map((m) => ({ t: m }))} />
        </DocSection>
        <DocSection title={t("fronts")} empty={!frentes.length}>
          <div className="bd-recs">
            {frentes.map((x, i) => (
              <div key={i} className="bd-rec">
                <span className="bd-rec-n">{String(i + 1).padStart(2, "0")}</span>
                <div className="bd-rec-b">
                  <b>{str(x.frente)}</b>
                  {strings(x.entregas).length ? (
                    <ul className="bd-ul">
                      {strings(x.entregas).map((e, j) => (
                        <li key={j}>
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {who(agentOf(x.responsavel))}
                </div>
              </div>
            ))}
          </div>
        </DocSection>
        {team(frentes.map((x) => agentOf(x.responsavel)))}
        {assumptions}
      </>
    );
  }

  if (type === "02.07") {
    const pesquisa = obj(content.pesquisa);
    const done = str(pesquisa.estado) === "realizada";
    const fontes = list(content.fontes).map(obj).filter((x) => str(x.id));
    const byId = new Map(fontes.map((f) => [str(f.id), f]));
    const achados = list(content.achados).map(obj).filter((x) => str(x.texto));
    const hipoteses = strings(content.hipoteses);
    const passos = strings(content.proximos_passos);
    const link = (f: Record<string, unknown>) =>
      str(f.url) ? (
        <a href={str(f.url)} target="_blank" rel="noopener noreferrer">
          {str(f.titulo) || str(f.url)}
        </a>
      ) : (
        <b>{str(f.titulo)}</b>
      );
    return (
      <>
        <DocSection title={t("research")}>
          <div className="bd-research">
            {done ? (
              <>
                <p className="bd-p">
                  {t("researchDone", { provider: str(pesquisa.provedor) || "—", date: str(pesquisa.coletado_em) ? date(str(pesquisa.coletado_em)) : "—" })}
                </p>
                {str(pesquisa.consulta) ? <small>{t("researchQuery", { query: str(pesquisa.consulta) })}</small> : null}
              </>
            ) : (
              <p className="bd-note">{t("researchOff")}</p>
            )}
          </div>
        </DocSection>
        {panorama}
        <DocSection title={t("findings")} empty={!achados.length}>
          <ul className="bd-ul">
            {achados.map((x, i) => {
              const cited = list<unknown>(x.fontes)
                .map(str)
                .map((id) => byId.get(id))
                .filter((f): f is Record<string, unknown> => !!f);
              const researched = str(x.tipo) === "pesquisa" && cited.length > 0;
              return (
                <li key={i} className="bd-fd">
                  <span className={`v41-tag bd-fd-k${researched ? "" : " is-sug"}`}>
                    <span>{researched ? t("kindResearch") : t("kindSuggestion")}</span>
                  </span>
                  <span>{str(x.texto)}</span>
                  {researched ? (
                    <ul className="bd-fd-src" aria-label={t("sources")}>
                      {cited.map((f) => (
                        <li key={str(f.id)}>
                          <small>{t("sourceRef", { id: str(f.id) })}</small> {link(f)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </DocSection>
        <DocSection title={t("hypotheses")} empty={!hipoteses.length}>
          <DocList items={hipoteses.map((h) => ({ t: h }))} />
        </DocSection>
        <DocSection title={t("nextSteps")} empty={!passos.length}>
          <DocList items={passos.map((p) => ({ t: p }))} />
        </DocSection>
        <DocSection title={t("sources")} empty={!fontes.length}>
          <ol className="bd-src">
            {fontes.map((f) => (
              <li key={str(f.id)}>
                <small>{t("sourceRef", { id: str(f.id) })}</small>
                {link(f)}
                {str(f.trecho) ? <span>{str(f.trecho)}</span> : null}
                <small>
                  {[str(f.publicado_em) && t("published", { date: date(str(f.publicado_em)) }), str(f.coletado_em) && t("collected", { date: date(str(f.coletado_em)) })]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </li>
            ))}
          </ol>
        </DocSection>
        {assumptions}
      </>
    );
  }

  return panorama;
}
