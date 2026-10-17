/**
 * CSV no cliente (Auditoria, SA7b). Separador vírgula, CRLF, aspas duplicadas e campo entre aspas quando precisa
 * (RFC 4180), BOM no início para o Excel abrir em UTF-8. Célula que começa com `=`, `+`, `-`, `@`, tab ou CR ganha um
 * apóstrofo na frente: o motivo e o payload vêm de quem escreveu, e a planilha não pode executar fórmula deles.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(header: string[], rows: string[][]): string {
  return `﻿${[header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
