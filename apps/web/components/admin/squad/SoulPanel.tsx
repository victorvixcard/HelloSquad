"use client";

import { Button, type AgentId } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { saveSoulSectionAction } from "@/app/admin/(painel)/squad/actions";
import type { SoulSection, SoulVersion, VersionRef } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { Status } from "../ui";
import { Md } from "./Md";
import { DraftCard, useNotice, useVersionFlow, VersionsCard } from "./VersionFlow";

type Edit = { section: SoulSection["section"]; heading: string; body: string; inPrompt: boolean; note: string };

/**
 * Agente › Alma (SA0 `agente.js` → `GET /admin/squad/agents/{id}`): as seis seções da SOUL com título, texto, versão em
 * que mudou, data e palavras; "N de N seções entram no prompt, cerca de X mil caracteres". Editar uma seção grava no
 * rascunho (versão N+1, não ativa); o cartão do rascunho publica, compara ou descarta; a lista de versões volta.
 */
export function SoulPanel(props: {
  agent: { id: string; name: string; shape?: AgentId };
  unit: string;
  soul: SoulVersion | null;
  soulDraft: SoulVersion | null;
  versions: VersionRef[];
}) {
  const t = useTranslations("admin");
  const f = adminFormat(useLocale());
  const router = useRouter();
  const notice = useNotice();
  const flow = useVersionFlow(props.unit, notice.show);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formId = useId();

  const { soul, soulDraft } = props;
  const shown = soulDraft ?? soul;
  if (!shown) {
    return <p className="sa-mut">{t("alma.empty")}</p>;
  }
  const activeBody = new Map((soul?.sections ?? []).map((s) => [s.section, s]));
  const draftVersion = soulDraft?.ref.version ?? null;
  const changed = soulDraft
    ? soulDraft.sections.filter((s) => {
        const a = activeBody.get(s.section);
        return !a || a.body !== s.body || a.heading !== s.heading || a.in_prompt !== s.in_prompt;
      })
    : [];
  const outOfPrompt = soulDraft ? soulDraft.sections.filter((s) => !s.in_prompt).length : 0;

  async function save() {
    if (!edit) return;
    setBusy(true);
    setError(null);
    const result = await saveSoulSectionAction(props.agent.id, edit.section, edit);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEdit(null);
    notice.show(t("versions.done.saved", { v: result.data.version }));
    router.refresh();
  }

  return (
    <div>
      <div className="sa-tool sq-sum">
        <p>
          <b>{t("alma.inPrompt", { n: shown.sections_in_prompt, total: shown.sections.length })}</b>
          {t("alma.chars", { chars: f.int(shown.chars_in_prompt) })}
        </p>
        {soul ? (
          <span className="sa-mono sa-mut">
            {t("alma.activeLine", {
              v: soul.ref.version,
              date: f.date(soul.ref.published_at ?? soul.ref.created_at),
              author: soul.ref.author,
            })}
          </span>
        ) : null}
      </div>

      {soulDraft ? (
        <DraftCard
          agent={props.agent.shape}
          title={t("alma.draftReady", { v: soulDraft.ref.version, unit: props.unit })}
          check={t("alma.draftCheck")}
          facts={[
            [t("alma.factChanged"), f.int(changed.length)],
            [t("alma.factOut"), f.int(outOfPrompt)],
            [t("alma.factSize"), t("alma.factChars", { chars: f.int(soulDraft.chars_in_prompt) })],
          ]}
          publishLabel={t("versions.publish", { v: soulDraft.ref.version })}
          onPublish={() => flow.askPublish(soulDraft.ref, soul?.ref ?? null)}
          onCompare={soul ? () => flow.compare(soul.ref, soulDraft.ref) : undefined}
          onDiscard={() => flow.askDiscard(soulDraft.ref)}
        />
      ) : null}

      <div className="sa-row c2 is-eq">
        {shown.sections.map((s) => {
          const editing = edit?.section === s.section;
          const isChanged = draftVersion !== null && changed.some((c) => c.section === s.section);
          const headId = `${formId}-${s.section}`;
          return (
            <section key={s.section} className={`sa-card sa-sec-card${s.in_prompt ? "" : " is-out"}`} aria-labelledby={headId}>
              <div className="sa-card-h">
                <div className="sa-card-t">
                  <h3 id={headId}>{s.heading}</h3>
                  <small className="sa-mono">
                    {t("alma.sectionMeta", {
                      section: t(`codes.section.${s.section}`),
                      v: s.changed_in_version,
                      words: f.int(s.words),
                    })}
                  </small>
                </div>
                <span className="sa-tags">
                  {isChanged ? (
                    <Status kind="draft" small>
                      {t("codes.versionStatus.draft")}
                    </Status>
                  ) : null}
                  {s.in_prompt ? null : (
                    <Status kind="pause" small>
                      {t("alma.outTag")}
                    </Status>
                  )}
                </span>
              </div>
              <div className="sa-card-b">
                {editing && edit ? (
                  <div className="sq-form">
                    <div className="sa-fld">
                      <label className="sa-fld-l" htmlFor={`${headId}-h`}>
                        {t("alma.fieldHeading")}
                      </label>
                      <input
                        id={`${headId}-h`}
                        className="sa-inp"
                        value={edit.heading}
                        onChange={(e) => setEdit({ ...edit, heading: e.target.value })}
                      />
                    </div>
                    <div className="sa-fld">
                      <label className="sa-fld-l" htmlFor={`${headId}-b`}>
                        {t("alma.fieldBody")}
                      </label>
                      <textarea
                        id={`${headId}-b`}
                        className="sa-inp sq-ta"
                        rows={10}
                        value={edit.body}
                        autoFocus
                        onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                      />
                    </div>
                    <label className="sq-check">
                      <input type="checkbox" checked={edit.inPrompt} onChange={(e) => setEdit({ ...edit, inPrompt: e.target.checked })} />
                      <span>{t("alma.fieldInPrompt")}</span>
                    </label>
                    <div className="sa-fld">
                      <label className="sa-fld-l" htmlFor={`${headId}-n`}>
                        {t("versions.reason")}
                      </label>
                      <input id={`${headId}-n`} className="sa-inp" value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
                    </div>
                    {error ? (
                      <p className="sq-err" role="alert">
                        {error}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <Md text={s.body} varTitle={t("common.variable")} />
                )}
              </div>
              <div className="sa-sec-f">
                <span className="sa-mut sq-small">{s.in_prompt ? t("alma.inPromptYes") : t("alma.inPromptNo")}</span>
                {editing && edit ? (
                  <span className="sa-tags">
                    <Button variant="ghost" size="s" onClick={() => (setEdit(null), setError(null))} disabled={busy}>
                      {t("versions.cancel")}
                    </Button>
                    <Button
                      variant="primary"
                      size="s"
                      icon={null}
                      onClick={save}
                      disabled={busy || !edit.body.trim() || !edit.heading.trim() || (edit.body === s.body && edit.heading === s.heading && edit.inPrompt === s.in_prompt)}
                    >
                      {busy ? t("versions.working") : t("versions.saveDraft")}
                    </Button>
                  </span>
                ) : (
                  <Button
                    variant="soft"
                    size="s"
                    aria-label={`${t("alma.edit")} ${s.heading}`}
                    onClick={() => {
                      setError(null);
                      setEdit({ section: s.section, heading: s.heading, body: s.body, inPrompt: s.in_prompt, note: "" });
                    }}
                  >
                    {t("alma.edit")}
                  </Button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <VersionsCard
        versions={props.versions}
        formatDate={f.dateTime}
        onCompare={flow.compare}
        onRestore={flow.askRestore}
        hasDraft={Boolean(soulDraft)}
      />
      {flow.dialogs}
      {notice.node}
    </div>
  );
}
