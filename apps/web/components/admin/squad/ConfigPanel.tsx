"use client";

import { Agent, Button, getAgent, isAgentId, type AgentId } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { saveConfigAction } from "@/app/admin/(painel)/squad/actions";
import type { ConfigVersion, VersionRef } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { Card, Tag } from "../ui";
import { DraftCard, useNotice, useVersionFlow, VersionsCard } from "./VersionFlow";

const AUTONOMY = ["analisar", "preparar", "executar"] as const;
type Autonomy = (typeof AUTONOMY)[number];

/**
 * Ferramentas cuja nota no agent.yaml diz que pedem autorização (o comentário delas, nunca inferido de outro lugar);
 * "idem" repete a nota da ferramenta de cima, como no arquivo.
 */
function asksAuthorization(tools: string[], notes: Record<string, string>): Set<string> {
  const out = new Set<string>();
  let previous = false;
  for (const tool of tools) {
    const note = notes[tool];
    const asks: boolean = note ? (/^idem\b/i.test(note.trim()) ? previous : /exige|só após|permiss|autoriza/i.test(note)) : false;
    if (asks) out.add(tool);
    previous = asks;
  }
  return out;
}

/**
 * Agente › Ferramentas e limites (SA0 `agente.js` → `agent.config.fields` e `config.yaml`): ferramentas permitidas
 * com a nota de cada uma, autonomia máxima, modelo e esforço por etapa, colaboradores e escopos de memória; o
 * agent.yaml inteiro fica visível, só leitura. Editar ferramentas e autonomia grava um rascunho do agent.yaml (o resto
 * do arquivo, com os comentários, não muda); ferramenta fora do catálogo é recusada pela API (422 `unknown_tool`).
 */
export function ConfigPanel(props: {
  agent: { id: string; name: string; shape?: AgentId };
  unit: string;
  config: ConfigVersion | null;
  configDraft: ConfigVersion | null;
  toolCatalog: string[];
  versions: VersionRef[];
}) {
  const t = useTranslations("admin");
  const f = adminFormat(useLocale());
  const router = useRouter();
  const notice = useNotice();
  const flow = useVersionFlow(props.unit, notice.show);
  const id = useId();
  const { config, configDraft } = props;
  const shown = configDraft ?? config;
  const [edit, setEdit] = useState<{ tools: string[]; autonomy: Autonomy; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!shown) return <p className="sa-mut">{t("ferramentas.empty")}</p>;
  const fields = shown.fields;
  const autonomy = (AUTONOMY as readonly string[]).includes(fields.max_autonomy ?? "") ? (fields.max_autonomy as Autonomy) : "preparar";
  const catalog = [...new Set([...props.toolCatalog, ...fields.tools])].sort();
  const model = fields.model as Record<string, unknown>;
  const memory = fields.memory as { le?: string[]; sugere?: string[] };
  const asks = asksAuthorization(fields.tools, fields.tool_notes);
  const modelValue = (key: string, value: unknown) => {
    const v = String(value);
    const group = key === "effort" ? "effort" : key === "thinking" ? "thinking" : "model";
    return t.has(`codes.${group}.${v}` as never) ? t(`codes.${group}.${v}` as never) : v;
  };

  async function save() {
    if (!edit) return;
    setBusy(true);
    setError(null);
    const result = await saveConfigAction(props.agent.id, { tools: edit.tools, maxAutonomy: edit.autonomy, note: edit.note });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEdit(null);
    notice.show(t("versions.done.saved", { v: result.data.version }));
    router.refresh();
  }

  const dirty =
    edit !== null &&
    (edit.autonomy !== autonomy || edit.tools.length !== fields.tools.length || edit.tools.some((x) => !fields.tools.includes(x)));
  const added = configDraft && config ? configDraft.fields.tools.filter((x) => !config.fields.tools.includes(x)).length : 0;
  const removed = configDraft && config ? config.fields.tools.filter((x) => !configDraft.fields.tools.includes(x)).length : 0;

  return (
    <div>
      <p className="sa-mono sa-mut sq-path">
        {t("ferramentas.pathLine", {
          agent: props.agent.id,
          v: shown.ref.version,
          status: t(`codes.versionStatus.${shown.ref.status}`),
          date: f.date(shown.ref.published_at ?? shown.ref.created_at),
        })}
      </p>
      {configDraft ? (
        <DraftCard
          agent={props.agent.shape}
          title={t("ferramentas.draftReady", { v: configDraft.ref.version, unit: props.unit })}
          check={t("ferramentas.draftCheck")}
          facts={[
            [t("ferramentas.factTools"), f.int(configDraft.fields.tools.length)],
            [t("ferramentas.factChange"), t("ferramentas.factChangeValue", { added, removed })],
            [t("ferramentas.factAutonomy"), t(`codes.autonomy.${configDraft.fields.max_autonomy ?? "preparar"}` as never)],
          ]}
          publishLabel={t("versions.publish", { v: configDraft.ref.version })}
          onPublish={() => flow.askPublish(configDraft.ref, config?.ref ?? null)}
          onCompare={config ? () => flow.compare(config.ref, configDraft.ref) : undefined}
          onDiscard={() => flow.askDiscard(configDraft.ref)}
        />
      ) : null}

      {edit ? (
        <div className="sa-note is-draft sq-editbar">
          <span className="sa-lbl">{t("codes.versionStatus.draft")}</span>
          <div className="sq-editbar-b">
            <span>{t("ferramentas.editNote")}</span>
            <div className="sa-fld sq-editbar-n">
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
            <span className="sa-tags">
              <Button variant="ghost" size="s" onClick={() => (setEdit(null), setError(null))} disabled={busy}>
                {t("versions.cancel")}
              </Button>
              <Button variant="primary" size="s" icon={null} onClick={save} disabled={busy || !dirty}>
                {busy ? t("versions.working") : t("versions.saveDraft")}
              </Button>
            </span>
          </div>
        </div>
      ) : null}

      <div className="sa-row c21">
        <Card
          id={`${id}-tools`}
          title={t("ferramentas.tools")}
          sub={t("ferramentas.toolsSub", { n: (edit?.tools ?? fields.tools).length, total: catalog.length })}
          actions={
            edit ? null : (
              <Button variant="soft" size="s" onClick={() => (setError(null), setEdit({ tools: [...fields.tools], autonomy, note: "" }))}>
                {t("ferramentas.edit")}
              </Button>
            )
          }
        >
          {edit ? (
            <fieldset className="sq-tools">
              <legend className="sa-sr">{t("ferramentas.tools")}</legend>
              {catalog.map((tool) => (
                <label key={tool} className="sq-check">
                  <input
                    type="checkbox"
                    checked={edit.tools.includes(tool)}
                    onChange={(e) =>
                      setEdit({ ...edit, tools: e.target.checked ? [...edit.tools, tool] : edit.tools.filter((x) => x !== tool) })
                    }
                  />
                  <span className="sa-mono">{tool}</span>
                </label>
              ))}
            </fieldset>
          ) : (
            <ul className="sa-list">
              {fields.tools.map((tool) => (
                <li key={tool} className="sa-li">
                  <span className="sa-li-t">
                    <b className="sa-mono sq-tool">{tool}</b>
                    {fields.tool_notes[tool] ? <small>{fields.tool_notes[tool]}</small> : null}
                  </span>
                  {asks.has(tool) ? <Tag kind="you">{t("ferramentas.asksAuth")}</Tag> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="sq-stack">
          <Card title={t("ferramentas.autonomy")} sub={t("ferramentas.autonomySub")}>
            {edit ? (
              <div className="sa-segl" role="radiogroup" aria-label={t("ferramentas.autonomy")}>
                {AUTONOMY.map((a) => (
                  <label key={a} className={`sq-seg${edit.autonomy === a ? " is-on" : ""}`}>
                    <input type="radio" name={`${id}-auto`} value={a} checked={edit.autonomy === a} onChange={() => setEdit({ ...edit, autonomy: a })} />
                    {t(`codes.autonomy.${a}` as never)}
                  </label>
                ))}
              </div>
            ) : (
              <p>
                <Tag kind={autonomy === "executar" ? "you" : "auto"}>{t(`codes.autonomy.${autonomy}` as never)}</Tag>
              </p>
            )}
            <p className="sa-mut sq-small sq-gap-s">{t("ferramentas.autonomyNote")}</p>
          </Card>
          <Card title={t("ferramentas.model")} actions={<a className="sa-rowlink sq-small" href="/admin/modelos#regras">{t("ferramentas.modelRules")}</a>}>
            <ul className="sa-list">
              {Object.entries(model).map(([k, v]) => (
                <li key={k} className="sa-li">
                  <span className="sa-li-t">
                    <b>{t.has(`ferramentas.modelKeys.${k}` as never) ? t(`ferramentas.modelKeys.${k}` as never) : k}</b>
                    <small>{modelValue(k, v)}</small>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title={t("ferramentas.collaborators")}>
            {fields.collaborators.length ? (
              <ul className="sq-collab">
                {fields.collaborators.map((c) => (
                  <li key={c}>
                    {isAgentId(c) ? <Agent agent={c} size={22} /> : null}
                    <a className="sa-rowlink" href={`/admin/squad/${c}`}>
                      {isAgentId(c) ? getAgent(c).name : c}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sa-mut">{t("common.dash")}</p>
            )}
          </Card>
        </div>
      </div>

      <div className="sa-row c2 sq-gap">
        <Card title={t("ferramentas.memory")} sub={t("ferramentas.memorySub")}>
          <p className="sa-lbl sq-lbl">{t("ferramentas.memoryReads")}</p>
          <div className="sa-chips">
            {(memory.le ?? []).map((m) => (
              <span key={m} className="sa-chip is-mono">
                {m}
              </span>
            ))}
          </div>
          <p className="sa-lbl sq-lbl">{t("ferramentas.memorySuggests")}</p>
          <div className="sa-chips">
            {(memory.sugere ?? []).map((m) => (
              <span key={m} className="sa-chip is-mono sq-chip-dash">
                {m}
              </span>
            ))}
          </div>
        </Card>
        <Card title={t("ferramentas.deliveries")} sub={t("ferramentas.deliveriesSub")}>
          <div className="sa-chips">
            {fields.deliveries.map((d) => (
              <span key={d} className="sa-chip is-mono">
                {d}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <Card title={t("ferramentas.yaml")} sub={t("ferramentas.yamlSub", { agent: props.agent.id })} actions={<Tag kind="sim">{t("ferramentas.readOnly")}</Tag>}>
        <pre className="sa-pre sq-yaml" tabIndex={0} aria-label={t("ferramentas.yaml")}>
          {shown.yaml}
        </pre>
      </Card>

      <VersionsCard versions={props.versions} formatDate={f.dateTime} onCompare={flow.compare} onRestore={flow.askRestore} hasDraft={Boolean(configDraft)} />
      {flow.dialogs}
      {notice.node}
    </div>
  );
}
