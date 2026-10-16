"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { importContactsAction } from "@/app/app/[workspace]/crm-actions";
import type { ContactImport } from "./crm-types";
import "./crm.css";

/** O CSV vai inteiro no corpo da requisição e a API o lê em memória; acima de 1 MB, a tela recusa antes de enviar. */
export const MAX_CSV_BYTES = 1024 * 1024;

function readText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Importar uma planilha CSV (A2b). A V4.6 abre uma conversa roteirizada (`mx-imp`); aqui é um formulário curto com o
 * arquivo e a origem dos dados (registrada em cada contato e consentimento). Ao voltar: quantos entraram e a lista das
 * linhas recusadas, com número e motivo, sem nenhum dado pessoal.
 */
export function ImportPanel({
  workspaceId,
  onDone,
  onCancel,
}: {
  workspaceId: string;
  onDone: (report: ContactImport) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("crm.import");
  const ids = useId();
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) return setError(t("noFile"));
    if (file.size > MAX_CSV_BYTES) return setError(t("tooBig"));
    if (!source.trim()) return setError(t("noSource"));
    setError(null);
    setBusy(true);
    try {
      const csv = await readText(file);
      const res = await importContactsAction(workspaceId, { file_name: file.name, source: source.trim(), csv });
      if (res.ok) onDone(res.data);
      else setError(t("failed", { message: res.message }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mx-imp" aria-labelledby={`${ids}-t`} onSubmit={submit} noValidate>
      <h3 id={`${ids}-t`}>{t("title")}</h3>
      <p>{t("text")}</p>
      <div className="mx-imp-f">
        <label>
          <span>{t("file")}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
            }}
          />
        </label>
        <label>
          <span>{t("source")}</span>
          <input type="text" value={source} placeholder={t("sourceHint")} onChange={(e) => setSource(e.target.value)} maxLength={120} />
        </label>
      </div>
      {error ? (
        <p className="mx-imp-e" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mx-imp-a">
        <button type="submit" className="hm-btn is-dark is-s" disabled={busy}>
          <span>{busy ? t("sending") : t("submit")}</span>
        </button>
        <button type="button" className="hm-link is-s" onClick={onCancel} disabled={busy}>
          <span>{t("cancel")}</span>
        </button>
      </div>
    </form>
  );
}

/** "N contatos importados, M linhas recusadas" e a lista das recusadas (número e motivo). */
export function ImportReport({ report }: { report: ContactImport }) {
  const t = useTranslations("crm.import");
  return (
    <div className="mx-rep">
      <p role="status">
        <b>{t("result", { accepted: report.accepted_rows, refused: report.refused_rows })}</b>
      </p>
      {report.refused.length ? (
        <>
          <ul aria-label={t("refused")}>
            {report.refused.map((r) => (
              <li key={`${r.line}-${r.reason}`}>{t("line", { line: r.line, reason: t(`reason.${r.reason}`) })}</li>
            ))}
          </ul>
          <small>{t("note")}</small>
        </>
      ) : null}
    </div>
  );
}
