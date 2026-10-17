"use client";

import { Button } from "@hellosquad/ui";
import { showActionNotice } from "./actions/ActionDialog";
import { toCsv } from "./csv";

/**
 * "Exportar CSV" da Auditoria (SA0 `auditoria.html`): gera no navegador, a partir da página já carregada, o arquivo com
 * os filtros de agora; o aviso diz quantos eventos saíram e que é o filtro atual. Nada vai à API.
 */
export function AuditCsvButton(props: { label: string; title: string; filename: string; header: string[]; rows: string[][]; done: string }) {
  const download = () => {
    if (props.rows.length) {
      const url = URL.createObjectURL(new Blob([toCsv(props.header, props.rows)], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = props.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
    showActionNotice(props.done);
  };
  return (
    <Button variant="ghost" size="s" icon={null} title={props.title} onClick={download}>
      {props.label}
    </Button>
  );
}
