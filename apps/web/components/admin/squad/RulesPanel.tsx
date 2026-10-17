"use client";

import { Agent, AGENT_IDS, Button } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { saveRuleDocAction, saveSharedAction } from "@/app/admin/(painel)/squad/actions";
import type { RuleDocDetail, RuleParagraph, SharedDetail, VersionRef } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { Dialog } from "../TwoFactorBand";
import { Card, Metrics, Note, Status, Tag } from "../ui";
import { DraftCard, useNotice, useVersionFlow, VersionsCard } from "./VersionFlow";

type Mark = RuleParagraph["mark"];
const MARKS: Mark[] = ["decided", "current_base", "pending", "proposal"];
/** Marcação da API → desenho do SA0 (`SA.Marker`): classe e tipo do `Tag` do DS. */
const MARK_UI: Record<Mark, { cls: string; tag: "ok" | "auto" | "you" | "sim" }> = {
  decided: { cls: "decidido", tag: "ok" },
  current_base: { cls: "base", tag: "auto" },
  pending: { cls: "pendente", tag: "you" },
  proposal: { cls: "proposta", tag: "sim" },
};

export type SharedRulesDoc = { detail: SharedDetail; versions: VersionRef[] };

type Doc =
  | { kind: "rule"; id: string; title: string; inPrompt: boolean; version: number | null; date: string | null; author: string | null; detail: RuleDocDetail }
  | { kind: "shared"; id: "compartilhadas"; title: string; inPrompt: true; version: number | null; date: string | null; author: string | null; shared: SharedRulesDoc };

function Marker({ mark }: { mark: Mark }) {
  const t = useTranslations("admin.codes.mark");
  const ui = MARK_UI[mark];
  return (
    <span className={`sa-mk is-${ui.cls}`}>
      <span className={`hs-tag hs-tag--${ui.tag}`}>{t(mark)}</span>
    </span>
  );
}

function rich(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((s, i) => (i % 2 ? <b key={i}>{s}</b> : s));
}

/** Trecho que entra no prompt: no rascunho, o mesmo cabeçalho até o próximo "## " do arquivo. */
function sharedSection(detail: SharedDetail): { text: string; content: string } {
  const content = detail.draft_content ?? detail.active_content ?? "";
  const active = detail.shared_rules ?? "";
  if (!detail.draft_content) return { text: active, content };
  const head = active.split("\n")[0] ?? "";
  const at = head ? content.indexOf(head) : -1;
  if (at < 0) return { text: active, content };
  const rest = content.slice(at + head.length);
  const end = rest.search(/\n## /);
  return { text: head + (end < 0 ? rest : rest.slice(0, end)), content };
}

function numbered(text: string) {
  return text
    .split("\n")
    .map((line) => /^\s*(\d+)\.\s+(.+)$/.exec(line))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => ({ n: m[1]!, text: m[2]!.trim(), line: m[0] }));
}

/**
 * Regras de negócio (SA0 `regras.js` → `GET /admin/rules`, `GET /admin/rules/{id}` e `GET /admin/squad/shared/README.md`):
 * documentos com parágrafos marcados [DECIDIDO] [BASE ATUAL] [PENDENTE] [PROPOSTA] e "entra no prompt" ou "referência
 * interna"; à esquerda a lista (abas verticais), à direita o documento. Editar um parágrafo de um documento grava a
 * versão nova dele (a mais recente vale); as regras compartilhadas dos sete (`squad/README.md`) editam pela rota
 * `shared/README.md`, como rascunho a publicar.
 */
export function RulesPanel(props: { rules: RuleDocDetail[]; shared: SharedRulesDoc | null; sharedRulesDraft: VersionRef | null }) {
  const t = useTranslations("admin");
  const f = adminFormat(useLocale());
  const notice = useNotice();
  const docs: Doc[] = [
    ...props.rules.map((d) => ({
      kind: "rule" as const,
      id: d.doc.id,
      title: d.doc.title,
      inPrompt: d.doc.in_prompt,
      version: d.doc.version,
      date: d.doc.updated_at,
      author: d.doc.author,
      detail: d,
    })),
    ...(props.shared
      ? [
          {
            kind: "shared" as const,
            id: "compartilhadas" as const,
            title: t("regras.sharedTitle"),
            inPrompt: true as const,
            version: props.shared.detail.active?.version ?? null,
            date: props.shared.detail.active?.published_at ?? null,
            author: props.shared.detail.active?.author ?? null,
            shared: props.shared,
          },
        ]
      : []),
  ];
  const [cur, setCur] = useState(docs[0]?.id ?? "");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const doc = docs.find((d) => d.id === cur) ?? docs[0];

  const counts = (d: Doc) => {
    const c: Record<Mark, number> = { decided: 0, current_base: 0, pending: 0, proposal: 0 };
    if (d.kind === "rule") for (const p of d.detail.current?.paragraphs ?? []) c[p.mark] += 1;
    else c.current_base = numbered(sharedSection(d.shared.detail).text).length;
    return c;
  };
  const total: Record<Mark, number> = { decided: 0, current_base: 0, pending: 0, proposal: 0 };
  for (const d of docs) for (const m of MARKS) total[m] += counts(d)[m];
  const paragraphs = MARKS.reduce((n, m) => n + total[m], 0);
  const inPrompt = docs.filter((d) => d.inPrompt).length;
  const summary = (c: Record<Mark, number>) =>
    (["decided", "current_base", "proposal"] as const)
      .filter((m) => c[m])
      .map((m) => t(`regras.count.${m}`, { n: c[m] }))
      .join(" · ");

  if (!doc) return <p className="sa-mut">{t("regras.none")}</p>;
  return (
    <>
      <Metrics
        items={[
          { label: t("regras.metDocs"), value: f.int(docs.length), detail: t("regras.metDocsSub", { prompt: inPrompt, internal: docs.length - inPrompt }) },
          { label: t("regras.metParagraphs"), value: f.int(paragraphs), detail: summary(total) },
          {
            label: t("regras.metPending"),
            value: f.int(total.pending),
            kind: total.pending ? "you" : undefined,
            detail: total.pending ? t("regras.metPendingSome") : t("regras.metPendingNone"),
          },
          { label: t("regras.metProposals"), value: f.int(total.proposal), detail: t("regras.metProposalsSub") },
        ]}
      />
      <Card flat id="rg-leg" title={t("regras.legendTitle")} sub={t("regras.legendSub")}>
        <dl className="sa-row c4">
          {MARKS.map((m) => (
            <div key={m}>
              <dt>
                <Marker mark={m} />
              </dt>
              <dd className="rg-leg-d">{t(`regras.legend.${m}`)}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <div className="sa-row c12 sq-gap">
        <div className="sa-grp rg-side">
          <div className="sa-grp-h">
            <h2 className="rg-side-t">{t("regras.docs")}</h2>
            <span className="sa-lbl">{docs.length}</span>
          </div>
          <div className="rg-docs" role="tablist" aria-orientation="vertical" aria-label={t("regras.docsLabel")}>
            {docs.map((d, i) => {
              const on = d.id === doc.id;
              const c = counts(d);
              return (
                <button
                  key={d.id}
                  ref={(el) => {
                    refs.current[d.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`rg-doc-${d.id}`}
                  aria-selected={on}
                  aria-controls="rg-panel"
                  tabIndex={on ? 0 : -1}
                  className="rg-doc"
                  onClick={() => setCur(d.id)}
                  onKeyDown={(e) => {
                    const n = docs.length;
                    const j =
                      e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowUp" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
                    if (j === null) return;
                    e.preventDefault();
                    setCur(docs[j]!.id);
                    refs.current[docs[j]!.id]?.focus();
                  }}
                >
                  <span className="rg-doc-t">{d.title}</span>
                  <span className="rg-doc-f">
                    {(d.inPrompt ? t("regras.inPrompt") : t("regras.internal")) + " · " + t("regras.versionN", { v: d.version ?? 0 })}
                  </span>
                  <span className="rg-doc-c">
                    {c.pending ? (
                      <Status kind="you" small>
                        {t("regras.count.pending", { n: c.pending })}
                      </Status>
                    ) : null}
                    <span>{summary(c)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div role="tabpanel" id="rg-panel" aria-labelledby={`rg-doc-${doc.id}`}>
          {doc.kind === "rule" ? (
            <RuleDocView key={doc.id} detail={doc.detail} sharedRulesDraft={props.sharedRulesDraft} onNotice={notice.show} />
          ) : (
            <SharedDocView key={doc.id} title={doc.title} shared={doc.shared} onNotice={notice.show} />
          )}
        </div>
      </div>
      {notice.node}
    </>
  );
}

function PromptFlag({ inPrompt, file }: { inPrompt: boolean; file?: string }) {
  const t = useTranslations("admin.regras");
  if (!inPrompt) return <Note label={t("internal")}>{t("flagInternal")}</Note>;
  return (
    <Note label={t("inPrompt")}>
      <div className="rg-flag">
        <span className="rg-stack" aria-label={t("sevenRead")} role="img">
          {AGENT_IDS.map((id) => (
            <Agent key={id} agent={id} size={22} />
          ))}
        </span>
        <span>{file ? t("flagFile", { file }) : t("flagDoc")}</span>
      </div>
    </Note>
  );
}

type ParDraft = { mark: Mark; text: string; source: string; note: string };

function RuleDocView({ detail, sharedRulesDraft, onNotice }: { detail: RuleDocDetail; sharedRulesDraft: VersionRef | null; onNotice: (m: string) => void }) {
  const t = useTranslations("admin");
  const f = adminFormat(useLocale());
  const router = useRouter();
  const id = useId();
  const flow = useVersionFlow(t("regras.sharedUnit"), onNotice);
  const current = detail.current;
  const pars = current?.paragraphs ?? [];
  const [edit, setEdit] = useState<{ i: number; draft: ParDraft } | null>(null);
  const [flag, setFlag] = useState<{ note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(paragraphs: RuleParagraph[], inPrompt: boolean, why: string) {
    setBusy(true);
    setError(null);
    const result = await saveRuleDocAction(detail.doc.id, { paragraphs, inPrompt, note: why });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    onNotice(t("regras.saved", { v: result.data.version, title: detail.doc.title }));
    router.refresh();
    return true;
  }

  async function saveParagraph() {
    if (!edit) return;
    const next = pars.map((p, j) =>
      j === edit.i ? { mark: edit.draft.mark, text: edit.draft.text.trim(), source: edit.draft.source.trim() || p.source || null } : p,
    );
    if (await persist(next, detail.doc.in_prompt, edit.draft.note)) setEdit(null);
  }

  return (
    <>
      {sharedRulesDraft && detail.doc.in_prompt ? (
        <DraftCard
          title={t("regras.sharedDraft", { v: sharedRulesDraft.version })}
          check={t("regras.sharedDraftCheck")}
          facts={[]}
          publishLabel={t("versions.publish", { v: sharedRulesDraft.version })}
          onPublish={() => flow.askPublish(sharedRulesDraft, null)}
          onDiscard={() => flow.askDiscard(sharedRulesDraft)}
        />
      ) : null}
      <Card
        id={`${id}-card`}
        title={detail.doc.title}
        sub={
          current
            ? t("regras.versionLine", { v: current.version, date: f.date(current.created_at), author: current.author })
            : t("common.dash")
        }
        actions={
          <Button variant="soft" size="s" onClick={() => (setError(null), setFlag({ note: "" }))}>
            {detail.doc.in_prompt ? t("regras.toInternal") : t("regras.toPrompt")}
          </Button>
        }
      >
        <PromptFlag inPrompt={detail.doc.in_prompt} />
        <ol className="rg-ps" aria-label={t("regras.paragraphs")}>
          {pars.map((p, i) =>
            edit?.i === i ? (
              <li key={i} className="rg-p">
                <div>
                  <Marker mark={edit.draft.mark} />
                </div>
                <div className="rg-ed">
                  <div className="sa-fld">
                    <label className="sa-fld-l" htmlFor={`${id}-t`}>
                      {t("regras.fieldText", { n: i + 1 })}
                    </label>
                    <textarea
                      id={`${id}-t`}
                      className="sa-inp"
                      rows={4}
                      value={edit.draft.text}
                      autoFocus
                      onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, text: e.target.value } })}
                    />
                  </div>
                  <div className="sa-form c2">
                    <div className="sa-fld">
                      <label className="sa-fld-l" htmlFor={`${id}-m`}>
                        {t("regras.fieldMark")}
                      </label>
                      <select
                        id={`${id}-m`}
                        className="sa-inp sq-sel"
                        value={edit.draft.mark}
                        onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, mark: e.target.value as Mark } })}
                      >
                        {MARKS.map((m) => (
                          <option key={m} value={m}>
                            {t(`codes.mark.${m}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sa-fld">
                      <label className="sa-fld-l" htmlFor={`${id}-s`}>
                        {t("regras.fieldSource")}
                      </label>
                      <input
                        id={`${id}-s`}
                        className="sa-inp"
                        value={edit.draft.source}
                        onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, source: e.target.value } })}
                      />
                    </div>
                  </div>
                  <div className="sa-fld">
                    <label className="sa-fld-l" htmlFor={`${id}-n`}>
                      {t("versions.reason")}
                    </label>
                    <input
                      id={`${id}-n`}
                      className="sa-inp"
                      value={edit.draft.note}
                      onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, note: e.target.value } })}
                    />
                  </div>
                  {edit.draft.mark === "pending" ? (
                    <div>
                      <Status kind="block" small>
                        {t("regras.pendingNotApplied")}
                      </Status>
                    </div>
                  ) : null}
                  {error ? (
                    <p className="sq-err" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <div className="sa-tool">
                    <Button
                      variant="primary"
                      size="s"
                      icon={null}
                      onClick={saveParagraph}
                      disabled={
                        busy ||
                        !edit.draft.text.trim() ||
                        (edit.draft.text === p.text && edit.draft.mark === p.mark && edit.draft.source === (p.source ?? ""))
                      }
                    >
                      {busy ? t("versions.working") : t("regras.saveVersion")}
                    </Button>
                    <span className="sa-grow" />
                    <Button variant="ghost" size="s" onClick={() => (setEdit(null), setError(null))} disabled={busy}>
                      {t("versions.cancel")}
                    </Button>
                  </div>
                </div>
              </li>
            ) : (
              <li key={i} className="rg-p">
                <div>
                  <Marker mark={p.mark} />
                </div>
                <div className="rg-p-b">
                  <p className="rg-p-t">{rich(p.text)}</p>
                  {p.mark === "pending" ? (
                    <div className="rg-p-s">
                      <Status kind="block" small>
                        {t("regras.pendingNotApplied")}
                      </Status>
                    </div>
                  ) : null}
                  <span className="sa-mono rg-p-f">{`§${i + 1}${p.source ? ` · ${p.source}` : ""}`}</span>
                </div>
                <span className="rg-p-a">
                  <Button
                    variant="ghost"
                    size="s"
                    onClick={() => (setError(null), setEdit({ i, draft: { mark: p.mark, text: p.text, source: p.source ?? "", note: "" } }))}
                  >
                    {t("regras.edit")}
                    <span className="sa-sr"> {t("regras.paragraphN", { n: i + 1 })}</span>
                  </Button>
                </span>
              </li>
            ),
          )}
        </ol>
      </Card>
      <Card title={t("versions.title")} sub={t("regras.versionsSub")}>
        <ul className="sa-list">
          {detail.versions.map((v) => (
            <li key={v.id} className="sa-li">
              <span className="sa-biz" aria-hidden="true">
                v{v.version}
              </span>
              <span className="sa-li-t">
                <b>
                  {t("versions.line", { v: v.version })}{" "}
                  {v.version === current?.version ? (
                    <Status kind="done" small>
                      {t("versions.inUse")}
                    </Status>
                  ) : null}
                </b>
                <small>{[f.dateTime(v.created_at), v.author, v.change_note].filter(Boolean).join(" · ")}</small>
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Dialog
        open={flag !== null}
        onClose={() => !busy && setFlag(null)}
        title={detail.doc.in_prompt ? t("regras.toInternalTitle", { title: detail.doc.title }) : t("regras.toPromptTitle", { title: detail.doc.title })}
        desc={detail.doc.in_prompt ? t("regras.toInternalDesc") : t("regras.toPromptDesc")}
        closeLabel={t("versions.close")}
        footer={
          <>
            <span className="sa-grow" />
            <Button variant="ghost" size="s" onClick={() => setFlag(null)} disabled={busy}>
              {t("versions.cancel")}
            </Button>
            <Button
              variant="primary"
              size="s"
              icon={null}
              disabled={busy}
              onClick={async () => {
                if (flag && (await persist(pars, !detail.doc.in_prompt, flag.note))) setFlag(null);
              }}
            >
              {busy ? t("versions.working") : t("regras.saveVersion")}
            </Button>
          </>
        }
      >
        <div className="sa-fld">
          <label className="sa-fld-l" htmlFor={`${id}-fn`}>
            {t("versions.reason")}
          </label>
          <textarea id={`${id}-fn`} className="sa-inp" rows={3} value={flag?.note ?? ""} data-autofocus onChange={(e) => setFlag({ note: e.target.value })} />
        </div>
        {error ? (
          <p className="sq-err" role="alert">
            {error}
          </p>
        ) : null}
      </Dialog>
      {flow.dialogs}
    </>
  );
}

function SharedDocView({ title, shared, onNotice }: { title: string; shared: SharedRulesDoc; onNotice: (m: string) => void }) {
  const t = useTranslations("admin");
  const f = adminFormat(useLocale());
  const router = useRouter();
  const id = useId();
  const flow = useVersionFlow(t("regras.sharedUnit"), onNotice);
  const { detail } = shared;
  const section = sharedSection(detail);
  const items = numbered(section.text);
  const [edit, setEdit] = useState<{ i: number; text: string; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = detail.active;
  const draft = detail.draft;

  async function save() {
    if (!edit) return;
    const item = items[edit.i]!;
    const hits = section.content.split(item.line).length - 1;
    if (hits !== 1) {
      setError(t("regras.sharedLineMissing"));
      return;
    }
    setBusy(true);
    setError(null);
    const content = section.content.replace(item.line, item.line.replace(item.text, edit.text.trim()));
    const result = await saveSharedAction("README.md", content, edit.note);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEdit(null);
    onNotice(t("versions.done.saved", { v: result.data.version }));
    router.refresh();
  }

  return (
    <>
      {draft ? (
        <DraftCard
          title={t("regras.sharedDraft", { v: draft.version })}
          check={t("regras.sharedDraftCheck")}
          facts={[]}
          publishLabel={t("versions.publish", { v: draft.version })}
          onPublish={() => flow.askPublish(draft, active)}
          onCompare={active ? () => flow.compare(active, draft) : undefined}
          onDiscard={() => flow.askDiscard(draft)}
        />
      ) : null}
      <Card
        id={`${id}-card`}
        title={title}
        sub={active ? t("regras.versionLine", { v: active.version, date: f.date(active.published_at ?? active.created_at), author: active.author }) : undefined}
        actions={draft ? <Status kind="draft">{t("codes.versionStatus.draft")}</Status> : <Tag kind="auto">squad/README.md</Tag>}
      >
        <PromptFlag inPrompt file="squad/README.md" />
        <ol className="rg-ps" aria-label={t("regras.paragraphs")}>
          {items.map((p, i) => (
            <li key={`${p.n}-${i}`} className="rg-p">
              <div>
                <Marker mark="current_base" />
              </div>
              {edit?.i === i ? (
                <div className="rg-ed">
                  <div className="sa-fld">
                    <label className="sa-fld-l" htmlFor={`${id}-t`}>
                      {t("regras.fieldText", { n: i + 1 })}
                    </label>
                    <textarea id={`${id}-t`} className="sa-inp" rows={4} value={edit.text} autoFocus onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
                  </div>
                  <div className="sa-fld">
                    <label className="sa-fld-l" htmlFor={`${id}-n`}>
                      {t("versions.reason")}
                    </label>
                    <input id={`${id}-n`} className="sa-inp" value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
                  </div>
                  {error ? (
                    <p className="sq-err" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <div className="sa-tool">
                    <Button variant="primary" size="s" icon={null} onClick={save} disabled={busy || !edit.text.trim() || edit.text.trim() === p.text}>
                      {busy ? t("versions.working") : t("versions.saveDraft")}
                    </Button>
                    <span className="sa-grow" />
                    <Button variant="ghost" size="s" onClick={() => (setEdit(null), setError(null))} disabled={busy}>
                      {t("versions.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rg-p-b">
                    <p className="rg-p-t">{rich(p.text)}</p>
                    <span className="sa-mono rg-p-f">{`§${i + 1} · squad/README.md`}</span>
                  </div>
                  <span className="rg-p-a">
                    <Button variant="ghost" size="s" onClick={() => (setError(null), setEdit({ i, text: p.text, note: "" }))}>
                      {t("regras.edit")}
                      <span className="sa-sr"> {t("regras.paragraphN", { n: i + 1 })}</span>
                    </Button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ol>
      </Card>
      <VersionsCard versions={shared.versions} formatDate={f.dateTime} onCompare={flow.compare} onRestore={flow.askRestore} hasDraft={Boolean(draft)} />
      {flow.dialogs}
    </>
  );
}
