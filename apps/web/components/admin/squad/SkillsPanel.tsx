"use client";

import { Button, type AgentId } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { saveSkillAction } from "@/app/admin/(painel)/squad/actions";
import type { SkillDetail, SkillSummary, VersionRef } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { AdminTabs } from "../AdminTabs";
import { Card, Empty, Status } from "../ui";
import { Md } from "./Md";
import { DraftCard, useNotice, useVersionFlow, VersionsCard } from "./VersionFlow";

type SkillEntry = { summary: SkillSummary; detail: SkillDetail | null; versions: VersionRef[] };

/**
 * Agente › Skills (SA0 `agente.js` → `agent.skills[]` e `GET /admin/squad/agents/{id}/skills/{delivery}`): uma aba por
 * delivery do agente. Skill escrita mostra procedimento, formato e critérios (as seções `##` do arquivo); editar grava
 * o arquivo inteiro como rascunho, que se publica, compara ou descarta. Sem skill: estado vazio honesto.
 */
export function SkillsPanel(props: { agent: { id: string; name: string; article: string; shape?: AgentId }; skills: SkillEntry[] }) {
  const t = useTranslations("admin");
  if (!props.skills.length) return <p className="sa-mut">{t("skills.none")}</p>;
  return (
    <AdminTabs
      idPrefix="sk"
      line
      hash={false}
      label={t("skills.tabsLabel", { name: props.agent.name })}
      tabs={props.skills.map((s) => ({
        id: s.summary.delivery_type,
        label: `${s.summary.delivery_type} · ${short(s.summary.title)}${s.summary.active || s.summary.draft ? "" : ` ${t("skills.noSkillTab")}`}`,
        panel: <SkillView key={s.summary.delivery_type} agent={props.agent} entry={s} />,
      }))}
    />
  );
}

function short(title: string | null) {
  return (title ?? "").split(" ").slice(0, 3).join(" ");
}

function SkillView({ agent, entry }: { agent: { id: string; name: string; article: string; shape?: AgentId }; entry: SkillEntry }) {
  const t = useTranslations("admin");
  const f = adminFormat(useLocale());
  const router = useRouter();
  const notice = useNotice();
  const delivery = entry.summary.delivery_type;
  const unit = t("agente.unit.skill", { name: agent.name, article: agent.article, key: delivery });
  const flow = useVersionFlow(unit, notice.show);
  const [editing, setEditing] = useState<{ content: string; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const active = entry.detail?.active ?? null;
  const draft = entry.detail?.draft ?? null;
  const shown = draft ?? active;
  const path = `squad/${agent.id}/skills/${delivery}.md`;

  if (!shown) {
    return (
      <Card title={`${delivery} · ${entry.summary.title ?? ""}`} sub={t("skills.missingFile", { path })}>
        <Empty agent={agent.shape} title={t("skills.emptyTitle")}>
          {t("skills.emptyBody", { name: agent.name, article: agent.article })}
        </Empty>
      </Card>
    );
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    const result = await saveSkillAction(agent.id, delivery, editing.content, editing.note);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEditing(null);
    notice.show(t("versions.done.saved", { v: result.data.version }));
    router.refresh();
  }

  const meta = shown.meta as { entrega_kind?: string; essenciais?: string[] };
  return (
    <div>
      {draft ? (
        <DraftCard
          agent={agent.shape}
          title={t("skills.draftReady", { v: draft.ref.version, unit })}
          check={t("alma.draftCheck")}
          facts={[[t("skills.factSize"), t("alma.factChars", { chars: f.int(draft.chars) })]]}
          publishLabel={t("versions.publish", { v: draft.ref.version })}
          onPublish={() => flow.askPublish(draft.ref, active?.ref ?? null)}
          onCompare={active ? () => flow.compare(active.ref, draft.ref) : undefined}
          onDiscard={() => flow.askDiscard(draft.ref)}
        />
      ) : null}
      <Card
        id={`${id}-c`}
        title={`${delivery} · ${shown.title ?? entry.summary.title ?? ""}`}
        sub={path}
        actions={
          editing ? null : (
            <span className="sa-tags">
              <Status kind={draft ? "draft" : "done"}>{draft ? t("codes.versionStatus.draft") : t("skills.written")}</Status>
              <Button variant="soft" size="s" onClick={() => (setError(null), setEditing({ content: shown.content, note: "" }))}>
                {t("skills.edit")}
              </Button>
            </span>
          )
        }
      >
        {editing ? (
          <div className="sq-form">
            <div className="sa-fld">
              <label className="sa-fld-l" htmlFor={`${id}-t`}>
                {t("skills.fieldContent")}
              </label>
              <textarea
                id={`${id}-t`}
                className="sa-inp sq-ta is-mono"
                rows={22}
                value={editing.content}
                autoFocus
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              />
              <small className="sa-mut">{t("skills.fieldContentHint")}</small>
            </div>
            <div className="sa-fld">
              <label className="sa-fld-l" htmlFor={`${id}-n`}>
                {t("versions.reason")}
              </label>
              <input id={`${id}-n`} className="sa-inp" value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
            </div>
            {error ? (
              <p className="sq-err" role="alert">
                {error}
              </p>
            ) : null}
            <div className="sa-tool">
              <Button variant="primary" size="s" icon={null} onClick={save} disabled={busy || !editing.content.trim() || editing.content === shown.content}>
                {busy ? t("versions.working") : t("versions.saveDraft")}
              </Button>
              <Button variant="ghost" size="s" onClick={() => (setEditing(null), setError(null))} disabled={busy}>
                {t("versions.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <dl className="sa-kv">
            <dt>{t("skills.kvVersion")}</dt>
            <dd className="sa-mono">
              {t("skills.kvVersionValue", {
                v: shown.ref.version,
                status: t(`codes.versionStatus.${shown.ref.status}`),
                date: f.date(shown.ref.published_at ?? shown.ref.created_at),
                author: shown.ref.author,
              })}
            </dd>
            <dt>{t("skills.kvKind")}</dt>
            <dd className="sa-mono">{meta.entrega_kind ?? t("common.dash")}</dd>
            <dt>{t("skills.kvEssentials")}</dt>
            <dd>{meta.essenciais?.length ? meta.essenciais.join(", ") : t("common.dash")}</dd>
            <dt>{t("skills.kvSize")}</dt>
            <dd className="sa-num">{t("alma.factChars", { chars: f.int(shown.chars) })}</dd>
          </dl>
        )}
      </Card>
      {editing ? null : (
        <div className="sa-row c2 is-eq sq-gap">
          {shown.sections.map((s, i) => (
            <section key={`${s.title}-${i}`} className="sa-card sa-sec-card" aria-labelledby={`${id}-s${i}`}>
              <div className="sa-card-h">
                <div className="sa-card-t">
                  <h3 id={`${id}-s${i}`}>{s.title.replace(/`/g, "")}</h3>
                  <small className="sa-mono">{t("skills.words", { n: words(s.body) })}</small>
                </div>
              </div>
              <div className="sa-card-b">
                <Md text={s.body} varTitle={t("common.variable")} />
              </div>
            </section>
          ))}
        </div>
      )}
      <VersionsCard versions={entry.versions} formatDate={f.dateTime} onCompare={flow.compare} onRestore={flow.askRestore} hasDraft={Boolean(draft)} />
      {flow.dialogs}
      {notice.node}
    </div>
  );
}

function words(text: string) {
  return (text.match(/\S+/g) ?? []).length;
}
