"use client";

import { Agent, Button, type AgentId } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState, type ReactNode } from "react";
import {
  diffVersionsAction,
  discardVersionAction,
  publishVersionAction,
  restoreVersionAction,
  type AdminActionResult,
} from "@/app/admin/(painel)/squad/actions";
import type { VersionDiff, VersionRef } from "@/lib/admin";
import { Dialog } from "../TwoFactorBand";
import { Status, type StatusKind } from "../ui";

/*
 * Ciclo de versão do Squad IA (SA3a): rascunho → publicar; comparar (GET /admin/squad/diff, lado a lado); voltar
 * versão (cria a versão nova, já ativa, com o conteúdo antigo); descartar. Toda ação passa por confirmação e leva o
 * motivo para a auditoria quando a API aceita um. Depois de gravar, a página relê a API (router.refresh).
 */

const STATUS_KIND: Record<VersionRef["status"], StatusKind> = {
  draft: "draft",
  active: "done",
  superseded: "pause",
  discarded: "block",
};

/** Aviso flutuante do SA0 (toast), lido pelo leitor de tela. */
export function useNotice() {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(id);
  }, [notice]);
  const node = (
    <div role="status" aria-live="polite" className="sq-live">
      {notice ? <div className="sa-toast">{notice}</div> : null}
    </div>
  );
  return { show: setNotice, node };
}

type Ask =
  | { type: "publish"; ref: VersionRef; active: VersionRef | null }
  | { type: "discard"; ref: VersionRef }
  | { type: "restore"; ref: VersionRef };

/**
 * Confirmações e comparação de uma unidade versionada (Alma, skill, agent.yaml, documento compartilhado). `unit` é o
 * nome já no idioma da tela ("da Alma do Otto").
 */
export function useVersionFlow(unit: string, onDone: (message: string) => void) {
  const t = useTranslations("admin.versions");
  const router = useRouter();
  const [ask, setAsk] = useState<Ask | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diff, setDiff] = useState<{ from: VersionRef; to: VersionRef; data: VersionDiff | null; error: string | null } | null>(null);
  const reasonId = useId();

  const close = () => {
    if (busy) return;
    setAsk(null);
    setError(null);
    setReason("");
  };

  async function confirm() {
    if (!ask) return;
    setBusy(true);
    setError(null);
    let result: AdminActionResult<VersionRef>;
    if (ask.type === "publish") result = await publishVersionAction(ask.ref.id);
    else if (ask.type === "discard") result = await discardVersionAction(ask.ref.id);
    else result = await restoreVersionAction(ask.ref.id, reason);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const done =
      ask.type === "publish"
        ? t("done.published", { v: result.data.version })
        : ask.type === "discard"
          ? t("done.discarded", { v: ask.ref.version })
          : t("done.restored", { v: result.data.version, from: ask.ref.version });
    setAsk(null);
    setReason("");
    setDiff(null);
    onDone(done);
    router.refresh();
  }

  async function compare(from: VersionRef, to: VersionRef) {
    setDiff({ from, to, data: null, error: null });
    const result = await diffVersionsAction(from.id, to.id);
    setDiff({ from, to, data: result.ok ? result.data : null, error: result.ok ? null : result.message });
  }

  const title =
    ask?.type === "publish"
      ? t("publishTitle", { v: ask.ref.version, unit })
      : ask?.type === "discard"
        ? t("discardTitle", { v: ask.ref.version, unit })
        : ask
          ? t("restoreTitle", { v: ask.ref.version, unit })
          : "";
  const desc =
    ask?.type === "publish"
      ? ask.active
        ? t("publishDesc", { active: ask.active.version })
        : t("publishDescFirst")
      : ask?.type === "discard"
        ? t("discardDesc")
        : ask
          ? t("restoreDesc", { v: ask.ref.version })
          : "";
  const confirmLabel =
    ask?.type === "publish"
      ? t("publish", { v: ask.ref.version })
      : ask?.type === "discard"
        ? t("discardConfirm")
        : t("restoreConfirm");

  const dialogs = (
    <>
      <Dialog
        open={ask !== null}
        onClose={close}
        title={title}
        desc={desc}
        closeLabel={t("close")}
        footer={
          <>
            <span className="sa-grow" />
            <Button variant="ghost" size="s" onClick={close} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button variant="primary" size="s" icon={null} onClick={confirm} disabled={busy} data-autofocus={ask?.type !== "restore" || undefined}>
              {busy ? t("working") : confirmLabel}
            </Button>
          </>
        }
      >
        {ask?.type === "restore" ? (
          <div className="sa-fld">
            <label className="sa-fld-l" htmlFor={reasonId}>
              {t("reason")}
            </label>
            <textarea
              id={reasonId}
              className="sa-inp"
              rows={3}
              value={reason}
              data-autofocus
              onChange={(e) => setReason(e.target.value)}
            />
            <small className="sa-mut">{t("reasonHint")}</small>
          </div>
        ) : (
          <p className="sa-mut">{ask?.type === "publish" ? t("publishCheck") : t("discardKeep")}</p>
        )}
        {error ? (
          <p className="sq-err" role="alert">
            {error}
          </p>
        ) : null}
      </Dialog>
      <Dialog
        open={diff !== null}
        onClose={() => setDiff(null)}
        title={diff ? t("diffTitle", { from: diff.from.version, to: diff.to.version }) : ""}
        desc={t("diffLegend")}
        closeLabel={t("close")}
      >
        {diff ? <DiffBody diff={diff.data} error={diff.error} from={diff.from} to={diff.to} /> : null}
      </Dialog>
    </>
  );

  return {
    dialogs,
    askPublish: (ref: VersionRef, active: VersionRef | null) => setAsk({ type: "publish", ref, active }),
    askDiscard: (ref: VersionRef) => setAsk({ type: "discard", ref }),
    askRestore: (ref: VersionRef) => setAsk({ type: "restore", ref }),
    compare,
  };
}

type Row = { left: string | null; right: string | null; same: boolean };

/** Linhas do diff unificado em pares lado a lado: removidas à esquerda, acrescentadas à direita. */
export function sideBySide(lines: VersionDiff["lines"]): Row[] {
  const rows: Row[] = [];
  let minus: string[] = [];
  let plus: string[] = [];
  const flush = () => {
    for (let i = 0; i < Math.max(minus.length, plus.length); i++)
      rows.push({ left: minus[i] ?? null, right: plus[i] ?? null, same: false });
    minus = [];
    plus = [];
  };
  for (const line of lines) {
    if (line.op === "-") minus.push(line.text);
    else if (line.op === "+") plus.push(line.text);
    else {
      flush();
      rows.push({ left: line.text, right: line.text, same: true });
    }
  }
  flush();
  return rows;
}

function DiffBody({ diff, error, from, to }: { diff: VersionDiff | null; error: string | null; from: VersionRef; to: VersionRef }) {
  const t = useTranslations("admin");
  if (error) return <p className="sq-err">{error}</p>;
  if (!diff) return <p className="sa-mut">{t("versions.diffLoading")}</p>;
  const rows = sideBySide(diff.lines);
  const changed = rows.some((r) => !r.same);
  return (
    <div className="sq-diff-w">
      {diff.changed_sections.length ? (
        <p className="sq-diff-s">
          <span className="sa-lbl">{t("versions.diffChanged")}</span>
          <span className="sa-chips">
            {diff.changed_sections.map((s) => (
              <span key={s} className="sa-chip">
                {t.has(`codes.section.${s}` as never) ? t(`codes.section.${s}` as never) : s}
              </span>
            ))}
          </span>
        </p>
      ) : null}
      {changed ? (
        <div className="sq-diff-scroll" tabIndex={0} aria-label={t("versions.diffTitle", { from: from.version, to: to.version })}>
          <table className="sq-diff">
            <thead>
              <tr>
                <th scope="col">{t("versions.diffSide", { v: from.version, status: t(`codes.versionStatus.${from.status}`) })}</th>
                <th scope="col">{t("versions.diffSide", { v: to.version, status: t(`codes.versionStatus.${to.status}`) })}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={r.same ? "is-same" : undefined}>
                  <td className={r.same ? undefined : r.left === null ? "is-gap" : "is-del"}>
                    {r.same || r.left === null ? null : <span className="sq-op" aria-label={t("versions.removed")}>−</span>}
                    {r.left === null ? null : r.same ? r.left : <del>{r.left}</del>}
                  </td>
                  <td className={r.same ? undefined : r.right === null ? "is-gap" : "is-add"}>
                    {r.same || r.right === null ? null : <span className="sq-op" aria-label={t("versions.added")}>+</span>}
                    {r.right === null ? null : r.same ? r.right : <ins>{r.right}</ins>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="sa-mut">{t("versions.diffNone")}</p>
      )}
    </div>
  );
}

/**
 * Cartão "Versão N pronta para publicar" (lugar do `ApprovalCard` do DS no SA0): o agente, o resumo e as três ações
 * (Publicar · Comparar versões · Descartar).
 */
export function DraftCard(props: {
  agent?: AgentId;
  title: string;
  check?: string;
  facts: [string, string][];
  publishLabel: string;
  onPublish: () => void;
  onCompare?: () => void;
  onDiscard: () => void;
}) {
  const t = useTranslations("admin.versions");
  return (
    <section className="sa-card sq-draft" aria-label={props.title}>
      <div className="sq-draft-h">
        {props.agent ? <Agent agent={props.agent} size={34} /> : null}
        <div>
          <Status kind="draft" small>
            {t("draftTag")}
          </Status>
          <p className="sq-draft-t">{props.title}</p>
          {props.check ? <p className="sa-mut sq-draft-c">{props.check}</p> : null}
        </div>
      </div>
      <dl className="sq-facts">
        {props.facts.map(([k, v]) => (
          <div key={k}>
            <dt className="sa-lbl">{k}</dt>
            <dd className="sa-num">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="sq-draft-a">
        <Button variant="primary" size="s" icon={null} onClick={props.onPublish}>
          {props.publishLabel}
        </Button>
        {props.onCompare ? (
          <Button variant="soft" size="s" onClick={props.onCompare}>
            {t("compare")}
          </Button>
        ) : null}
        <Button variant="ghost" size="s" onClick={props.onDiscard}>
          {t("discard")}
        </Button>
      </div>
    </section>
  );
}

/** Lista de versões de uma unidade: ativa "Em uso"; substituída pode ser comparada com a ativa e voltar. */
export function VersionsCard(props: {
  versions: VersionRef[];
  formatDate: (iso: string) => string;
  onCompare: (from: VersionRef, to: VersionRef) => void;
  onRestore: (ref: VersionRef) => void;
  hasDraft: boolean;
  extra?: ReactNode;
}) {
  const t = useTranslations("admin");
  const active = props.versions.find((v) => v.status === "active") ?? null;
  return (
    <section className="sa-card" aria-labelledby="sq-vers-t">
      <div className="sa-card-h">
        <div className="sa-card-t">
          <h2 id="sq-vers-t">{t("versions.title")}</h2>
          <small>{t("versions.sub")}</small>
        </div>
      </div>
      <div className="sa-card-b">
        {props.versions.length ? (
          <ul className="sa-list">
            {props.versions.map((v) => (
              <li key={v.id} className="sa-li">
                <span className="sa-biz" aria-hidden="true">
                  v{v.version}
                </span>
                <span className="sa-li-t">
                  <b>
                    {t("versions.line", { v: v.version })}{" "}
                    <Status kind={STATUS_KIND[v.status]} small>
                      {t(`codes.versionStatus.${v.status}`)}
                    </Status>
                  </b>
                  <small>
                    {[
                      props.formatDate(v.published_at ?? v.created_at),
                      v.author,
                      v.restored_from_version ? t("versions.restoredFrom", { v: v.restored_from_version }) : null,
                      v.note,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </span>
                {v.status === "active" ? (
                  <Status kind="done">{t("versions.inUse")}</Status>
                ) : v.status === "superseded" || v.status === "draft" ? (
                  <span className="sa-tags">
                    {active ? (
                      <Button variant="ghost" size="s" onClick={() => props.onCompare(v.status === "draft" ? active : v, v.status === "draft" ? v : active)}>
                        {t("versions.compareActive")}
                        <span className="sa-sr"> ({t("versions.line", { v: v.version })})</span>
                      </Button>
                    ) : null}
                    {v.status === "superseded" ? (
                      <Button
                        variant="soft"
                        size="s"
                        onClick={() => props.onRestore(v)}
                        disabled={props.hasDraft}
                        title={props.hasDraft ? t("versions.restoreBlocked") : undefined}
                      >
                        {t("versions.restore")}
                        <span className="sa-sr"> ({t("versions.line", { v: v.version })})</span>
                      </Button>
                    ) : null}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="sa-mut">{t("common.empty")}</p>
        )}
        {props.hasDraft ? <p className="sa-mut sq-vers-n">{t("versions.restoreBlocked")}</p> : null}
        {props.extra}
      </div>
    </section>
  );
}
