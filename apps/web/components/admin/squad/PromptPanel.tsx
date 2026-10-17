"use client";

import { Button } from "@hellosquad/ui";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { promptPreviewAction } from "@/app/admin/(painel)/squad/actions";
import type { PromptPreview } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { Metrics, Note, Tag } from "../ui";
import { useNotice } from "./VersionFlow";

export type PromptRoute = { value: string; label: string };

/**
 * Agente › O que ele lê (SA0 `agente.js` → `GET /admin/squad/agents/{id}/prompt`): o system prompt montado na ordem do
 * runtime para uma rota (delivery com skill, conversa, reflexão), com a versão ativa ou com os rascunhos; blocos com
 * caracteres, tokens estimados e marca de cache. Só leitura: confere antes de publicar.
 */
export function PromptPanel(props: { agentId: string; routes: PromptRoute[]; initial: PromptPreview | null; initialError: string | null; hasDrafts: boolean }) {
  const t = useTranslations("admin");
  const f = adminFormat(useLocale());
  const notice = useNotice();
  const id = useId();
  const [route, setRoute] = useState(props.initial?.route ?? props.routes[0]?.value ?? "conversa");
  const [draft, setDraft] = useState(false);
  const [preview, setPreview] = useState<PromptPreview | null>(props.initial);
  const [error, setError] = useState<string | null>(props.initialError);
  const [loading, setLoading] = useState(false);

  async function load(nextRoute: string, nextDraft: boolean) {
    setRoute(nextRoute);
    setDraft(nextDraft);
    setLoading(true);
    const result = await promptPreviewAction(props.agentId, nextRoute, nextDraft);
    setLoading(false);
    if (result.ok) {
      setPreview(result.data);
      setError(null);
    } else {
      setPreview(null);
      setError(result.message);
    }
  }

  const blocks = preview?.blocks ?? [];
  const system = blocks.filter((b) => b.part !== "message");
  const message = blocks.filter((b) => b.part === "message");
  const sum = (list: typeof blocks, k: "chars" | "tokens_estimated") => list.reduce((n, b) => n + b[k], 0);
  const ctx = preview?.example_context ?? {};

  return (
    <div>
      <div className="sa-tool sq-ptool">
        <div className="sa-fld">
          <label className="sa-fld-l" htmlFor={`${id}-r`}>
            {t("le.route")}
          </label>
          <select id={`${id}-r`} className="sa-inp sq-sel" value={route} disabled={loading} onChange={(e) => load(e.target.value, draft)}>
            {props.routes.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sa-fld">
          <span className="sa-fld-l" id={`${id}-v`}>
            {t("le.version")}
          </span>
          <div className="sa-segl" role="radiogroup" aria-labelledby={`${id}-v`}>
            {[false, true].map((d) => (
              <label key={String(d)} className={`sq-seg${draft === d ? " is-on" : ""}`}>
                <input type="radio" name={`${id}-d`} checked={draft === d} disabled={loading} onChange={() => load(route, d)} />
                {d ? t("le.withDrafts") : t("le.active")}
              </label>
            ))}
          </div>
        </div>
        <span className="sa-grow" />
        <Button
          variant="soft"
          size="s"
          disabled={!preview}
          onClick={() => {
            if (!preview) return;
            void navigator.clipboard?.writeText(preview.blocks.map((b) => b.text).join("\n\n")).catch(() => undefined);
            notice.show(t("le.copied"));
          }}
        >
          {t("le.copy")}
        </Button>
      </div>
      {draft && !props.hasDrafts ? <p className="sa-mut sq-small sq-pnote">{t("le.noDrafts")}</p> : null}
      <div aria-busy={loading} aria-live="polite">
        {error ? (
          <p className="sq-err" role="alert">
            {error}
          </p>
        ) : null}
        {preview ? (
          <>
            <Metrics
              items={[
                {
                  label: t("le.metSystem"),
                  value: f.int(sum(system, "chars")),
                  unit: t("le.chars"),
                  detail: t("le.approxTokens", { n: f.int(sum(system, "tokens_estimated")) }),
                },
                {
                  label: t("le.metMessage"),
                  value: f.int(sum(message, "chars")),
                  unit: t("le.chars"),
                  detail: t("le.approxTokens", { n: f.int(sum(message, "tokens_estimated")) }),
                },
                {
                  label: t("le.metTotal"),
                  value: `≈ ${f.int(preview.tokens_estimated)}`,
                  unit: t("le.tokens"),
                  detail: preview.token_estimate_method,
                },
                {
                  label: t("le.metHash"),
                  value: <span className="sa-mono sq-hash">{preview.content_hash.slice(0, 12)}</span>,
                  detail: t(`le.origin.${preview.origin}`),
                },
              ]}
            />
            <Note label={t("le.readOnly")}>
              {t("le.how")}{" "}
              {t("le.example", {
                brand: ctx.brand_name ?? t("common.dash"),
                locale: ctx.locale ?? t("common.dash"),
                request: ctx.request ?? t("common.dash"),
              })}
            </Note>
            <p className="sq-src">
              <span className="sa-lbl">{t("le.sources")}</span>
              <span className="sa-chips">
                {preview.sources.map((s, i) => {
                  const src = s as { key?: string; version?: number; kind?: string };
                  return (
                    <span key={`${src.key}-${i}`} className="sa-chip is-mono">
                      {src.key} v{src.version}
                    </span>
                  );
                })}
              </span>
            </p>
            {blocks.map((b, i) => (
              <section key={`${b.part}-${i}`} className="sa-blk" aria-label={t(`le.part.${b.part}`)}>
                <div className="sa-blk-h">
                  <b>
                    {b.part === "message" ? t("le.blockMessage") : t("le.blockSystem", { n: i + 1 })} · {t(`le.part.${b.part}`)}
                  </b>
                  <span className="sa-tags">
                    <Tag kind={b.cached ? "ok" : "sim"}>{b.cached ? t("le.cached") : t("le.notCached")}</Tag>
                    <span className="sa-mono sa-mut sq-small">
                      {t("le.blockSize", { chars: f.int(b.chars), tokens: f.int(b.tokens_estimated) })}
                    </span>
                  </span>
                </div>
                <pre className="sa-pre" tabIndex={0}>
                  {b.text}
                </pre>
              </section>
            ))}
          </>
        ) : null}
      </div>
      {notice.node}
    </div>
  );
}
