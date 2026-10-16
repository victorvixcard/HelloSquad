import { AGENT_IDS, isAgentId, PRODUCT_ICONS, type AgentId } from "@hellosquad/ui";
import { dayKey, shortTime } from "@/components/product/conversation-format";
import { TIME_ZONE } from "@/i18n/config";
import type { BrandFact, FactSource, MemoryConflict, MemoryData, MemorySuggestion } from "@/lib/memory";
import enMemory from "@/messages/en/memory.json";
import esMemory from "@/messages/es/memory.json";
import ptBRMemory from "@/messages/pt-BR/memory.json";

/**
 * Modelo da Memória da Marca (V4.5 `_vMem5`, L13610–13707, com a linguagem da V4.6, L13927): conhecimentos e
 * sugestões do squad lidos da API (S1d) viram as linhas, os cartões de "O squad percebeu", o dossiê e o histórico.
 * Funções puras: a tela só desenha o que sai daqui.
 */

export type Area = "business" | "brand" | "audience" | "knowledge";
export const AREAS: readonly Area[] = ["business", "brand", "audience", "knowledge"];

/**
 * Ordem dos assuntos de cada área (`TOPIC5`, L12711), por id estável (H2-06): o rótulo de cada id está no catálogo
 * (`memory.topics.<área>.<id>`), nos três idiomas. Assunto fora da lista vai ao fim.
 */
const TOPIC_ORDER = {
  business: ["history", "value", "location", "products", "differentials", "operation", "goals"],
  brand: ["positioning", "visual", "tone", "creative", "references"],
  audience: ["profile", "needs", "behaviors", "preferences"],
  knowledge: ["research", "findings", "decisions", "preferences", "guidance"],
} as const satisfies Record<Area, readonly string[]>;
export type TopicId<A extends Area = Area> = (typeof TOPIC_ORDER)[A][number];

/**
 * Id estável de um assunto gravado (H2-06). A API ainda devolve o assunto só como texto, no idioma em que foi gravado
 * (o do negócio; o que veio antes da tradução do backend está em pt-BR), então o id sai do rótulo do catálogo em
 * qualquer um dos três idiomas, sem diferenciar maiúsculas nem espaços. Assunto que não é da lista: null.
 */
const TOPIC_BY_LABEL: ReadonlyMap<string, TopicId> = new Map(
  [ptBRMemory, enMemory, esMemory].flatMap((catalog) =>
    AREAS.flatMap((area) =>
      Object.entries(catalog.topics[area]).map(([id, label]) => [`${area}:${normalizeTopic(label)}`, id as TopicId] as const),
    ),
  ),
);

function normalizeTopic(topic: string): string {
  return topic.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function topicIdOf(area: Area, topic: string): TopicId | null {
  return TOPIC_BY_LABEL.get(`${area}:${normalizeTopic(topic)}`) ?? null;
}

/** "Principais conhecimentos" do dossiê (`KEY5`, L12919): a chave do catálogo e o id do assunto onde o squad procura. */
export const KEY_TOPICS: ReadonlyArray<{ key: KeyName; area: Area; topic: TopicId }> = [
  { key: "value", area: "business", topic: "value" },
  { key: "audience", area: "audience", topic: "profile" },
  { key: "products", area: "business", topic: "products" },
  { key: "differentials", area: "business", topic: "differentials" },
  { key: "positioning", area: "brand", topic: "positioning" },
  { key: "visual", area: "brand", topic: "visual" },
  { key: "tone", area: "brand", topic: "tone" },
];
export type KeyName = "value" | "audience" | "products" | "differentials" | "positioning" | "visual" | "tone";

export type MemState = BrandFact["state"];
type SourceKind = BrandFact["source_type"];

/** Desenho de cada estado (`KST5` → classe `me-st is-<k>`, ícone `KIC5`): sempre ícone e texto, nunca só cor. */
export const STATE_LOOK: Record<MemState, { k: string; icon: string }> = {
  confirmed: { k: "ok", icon: "M4.4 8.3l2.4 2.4 4.8-5" },
  decision: { k: "ok", icon: "M4.4 8.3l2.4 2.4 4.8-5" },
  from_source: { k: "src", icon: "M8 3.6v5.8 M5.6 7.2 8 9.6l2.4-2.4 M4.4 12.4h7.2" },
  observed: {
    k: "obs",
    icon: "M2.6 8s2-3.6 5.4-3.6S13.4 8 13.4 8s-2 3.6-5.4 3.6S2.6 8 2.6 8z M8 6.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z",
  },
  suggested: { k: "hypo", icon: "M8 5.2v.1 M8 7.4v3.6" },
  outdated: { k: "old", icon: "M8 4.6V8l2 1.3" },
  discarded: { k: "rej", icon: "M5.2 5.2l5.6 5.6 M10.8 5.2l-5.6 5.6" },
  conflicting: { k: "conf", icon: "M5.4 4.4v7.2 M10.6 4.4v7.2" },
  unused: { k: "off", icon: "M4.4 11.6l7.2-7.2" },
};
/** Chave que o squad ainda não sabe ("Ainda não sabe · contar agora", L13619). */
export const MISSING_ICON = "M8 4.6v6.8 M4.6 8h6.8";

const HIDDEN: ReadonlySet<MemState> = new Set(["discarded", "unused"]);
const PENDING: ReadonlySet<MemState> = new Set(["suggested", "conflicting", "discarded", "unused"]);
const IN_USE_FIRST: ReadonlySet<MemState> = new Set(["confirmed", "decision"]);

/** Uma linha de "Tudo o que o squad sabe": um conhecimento atual ou uma sugestão ainda aberta (estado "Sugerido"). */
export type MemItem = {
  id: string;
  kind: "fact" | "suggestion";
  area: Area;
  topic: string;
  key: string;
  value: string;
  state: MemState;
  sourceType: SourceKind | null;
  sourceName: string | null;
  origin: string | null;
  /** Vazio na API = todo o squad (a V4.5 omite `ags` quando são os sete). */
  usedBy: AgentId[];
  /** Quem percebeu (sugestão) ou registrou (observação). */
  by: AgentId | null;
  confirmedAt: string | null;
  at: string;
  version: number;
  question: string | null;
  /** Sugestão que chegou nesta sessão pelo Realtime (`is-new`, V4.5). */
  isNew: boolean;
};

function asArea(a: string): Area {
  return (AREAS as readonly string[]).includes(a) ? (a as Area) : "knowledge";
}

function agents(list: readonly string[]): AgentId[] {
  return list.filter(isAgentId);
}

export function factItem(f: BrandFact, sources: readonly FactSource[]): MemItem {
  return {
    id: f.id,
    kind: "fact",
    area: asArea(f.area),
    topic: f.topic,
    key: f.key,
    value: f.content,
    state: f.state,
    sourceType: f.source_type,
    sourceName: sources.find((s) => s.id === f.source_id)?.name ?? null,
    origin: f.origin,
    usedBy: agents(f.used_by_agents),
    by: f.perceived_by_agent_id && isAgentId(f.perceived_by_agent_id) ? f.perceived_by_agent_id : null,
    confirmedAt: f.confirmed_at,
    at: f.valid_from || f.created_at,
    version: f.version,
    question: null,
    isNew: false,
  };
}

export function suggestionItem(s: MemorySuggestion, isNew = false): MemItem {
  const decided = s.decision === "discard" ? "discarded" : null;
  return {
    id: s.id,
    kind: "suggestion",
    area: asArea(s.area),
    topic: s.topic,
    key: s.key,
    value: s.content,
    state: decided ?? "suggested",
    sourceType: "agent_observation",
    sourceName: null,
    origin: s.origin,
    usedBy: agents(s.used_by_agents),
    by: isAgentId(s.agent_id) ? s.agent_id : null,
    confirmedAt: null,
    at: s.created_at,
    version: 1,
    question: s.question,
    isNew,
  };
}

/** Todas as linhas: conhecimentos atuais (inclusive descartados e fora de uso) + sugestões abertas e descartadas. */
export function memoryItems(data: MemoryData, newIds: ReadonlySet<string> = new Set()): MemItem[] {
  const facts = data.dossier.areas.flatMap((a) => a.topics.flatMap((t) => t.facts));
  const open = data.suggestions.filter((s) => s.decision === null && s.state !== "done");
  const discarded = data.suggestions.filter((s) => s.decision === "discard");
  return [
    ...facts.map((f) => factItem(f, data.dossier.sources)),
    ...open.map((s) => suggestionItem(s, newIds.has(s.id))),
    ...discarded.map((s) => suggestionItem(s)),
  ];
}

export const isHidden = (x: MemItem) => HIDDEN.has(x.state);

/** O especialista usa este conhecimento? Lista vazia = todo o squad. */
export function usedByAgent(x: MemItem, agent: AgentId): boolean {
  return x.usedBy.length === 0 || x.usedBy.includes(agent);
}

/** Quem usa, na ordem oficial; vazio = os sete. */
export function usersOf(x: MemItem): AgentId[] {
  return x.usedBy.length === 0 ? [...AGENT_IDS] : AGENT_IDS.filter((a) => x.usedBy.includes(a));
}

export type Filters = { area: Area | "all" | "sources"; q: string; agent: AgentId | null; showHidden: boolean };

/** Busca da V4.5 (L13658): em chave, valor e assunto, sem diferenciar maiúsculas. */
export function matches(x: MemItem, q: string): boolean {
  const needle = q.trim().toLowerCase();
  return !needle || `${x.key} ${x.value} ${x.topic}`.toLowerCase().includes(needle);
}

export function visible(x: MemItem, f: Filters): boolean {
  return (f.showHidden || !isHidden(x)) && (!f.agent || usedByAgent(x, f.agent)) && matches(x, f.q);
}

export type TopicGroup = { topic: string; rows: MemItem[] };
export type AreaGroup = { area: Area; topics: TopicGroup[]; count: number };

/** Grupos por área e assunto na ordem da V4.5, só com o que passa nos filtros. */
export function groupItems(items: readonly MemItem[], f: Filters): AreaGroup[] {
  const areas = f.area === "all" ? AREAS : f.area === "sources" ? [] : [f.area];
  return areas
    .map((area) => {
      const rows = items.filter((x) => x.area === area && visible(x, f));
      const order: readonly string[] = TOPIC_ORDER[area];
      const topics: string[] = [];
      for (const x of rows) if (!topics.includes(x.topic)) topics.push(x.topic);
      const rank = (t: string) => {
        const at = order.indexOf(topicIdOf(area, t) ?? "");
        return at < 0 ? order.length : at;
      };
      topics.sort((a, b) => rank(a) - rank(b));
      const groups = topics.map((topic) => ({ topic, rows: rows.filter((x) => x.topic === topic) }));
      return { area, topics: groups, count: rows.length };
    })
    .filter((g) => g.count > 0);
}

/** Contagem de cada aba (sem descartados e fora de uso; a de fontes conta as fontes). */
export function tabCount(items: readonly MemItem[], area: Filters["area"], sources: number): number {
  if (area === "sources") return sources;
  return items.filter((x) => (area === "all" || x.area === area) && !isHidden(x)).length;
}

export function hiddenCount(items: readonly MemItem[], agent: AgentId | null): number {
  return items.filter((x) => isHidden(x) && (!agent || usedByAgent(x, agent))).length;
}

/** "<O Otto> consulta N conhecimentos": sem sugestões, conflitos, descartados e fora de uso. */
export function agentCount(items: readonly MemItem[], agent: AgentId): number {
  return items.filter((x) => usedByAgent(x, agent) && !PENDING.has(x.state)).length;
}

/** Linha aberta: quem usa é "Quem vai usar depois do seu ok" (sugestão) ou "Ninguém usa agora" (pendente). */
export function usesHeading(x: MemItem): "usesHow" | "usesAfter" | "usesNone" {
  if (!PENDING.has(x.state)) return "usesHow";
  return x.state === "suggested" ? "usesAfter" : "usesNone";
}

/** Ações da linha (V4.5 L13680), antes de saber se há rota: quem decide é o owner. */
export function rowActions(x: MemItem) {
  const s = x.state;
  return {
    confirm: s === "suggested" || s === "from_source" || s === "observed",
    fix: s !== "discarded",
    discard: s === "suggested",
    off: s === "confirmed" || s === "decision" || s === "from_source" || s === "observed" || s === "outdated",
    on: s === "unused",
  };
}

/** Um dos "Principais conhecimentos": o primeiro em uso do assunto (Confirmado e Decisão sua antes). */
export function keyFact(items: readonly MemItem[], area: Area, topic: TopicId): MemItem | null {
  const pool = items.filter(
    (x) => x.kind === "fact" && x.area === area && topicIdOf(area, x.topic) === topic && !isHidden(x) && x.state !== "conflicting",
  );
  return pool.find((x) => IN_USE_FIRST.has(x.state)) ?? pool[0] ?? null;
}

/** Cartões de "O squad percebeu": sugestões abertas (as que chegaram agora primeiro), conflitos e desatualizados. */
export type Pending =
  | { kind: "suggestion"; item: MemItem }
  | { kind: "conflict"; conflict: MemoryConflict }
  | { kind: "outdated"; item: MemItem };

export function pendingCards(items: readonly MemItem[], conflicts: readonly MemoryConflict[]): Pending[] {
  const hypo = items
    .filter((x) => x.kind === "suggestion" && x.state === "suggested")
    .sort((a, b) => Number(b.isNew) - Number(a.isNew) || Date.parse(b.at) - Date.parse(a.at));
  return [
    ...hypo.map((item) => ({ kind: "suggestion" as const, item })),
    ...conflicts.filter((c) => c.state === "open").map((conflict) => ({ kind: "conflict" as const, conflict })),
    ...items.filter((x) => x.state === "outdated").map((item) => ({ kind: "outdated" as const, item })),
  ];
}

export function pendingCounts(items: readonly MemItem[], conflicts: readonly MemoryConflict[]) {
  return {
    suggestions: items.filter((x) => x.kind === "suggestion" && x.state === "suggested").length,
    conflicts: conflicts.filter((c) => c.state === "open").length,
    outdated: items.filter((x) => x.state === "outdated").length,
  };
}

/** "Alterações recentes" (V4.5 `LOG5` e `_m5Hist`, com o filtro da V4.6): só o que aconteceu de verdade. */
export type LogEntry =
  | { kind: "confirmed" | "corrected" | "discarded" | "decided"; value: string; at: string; who: null; target: string | null }
  | { kind: "suggested"; value: string; at: string; who: AgentId; target: string | null }
  | { kind: "resolved"; value: string; key: string; at: string; who: null; target: string | null };

export function memoryLog(data: MemoryData): LogEntry[] {
  const facts = data.dossier.areas.flatMap((a) => a.topics.flatMap((t) => t.facts));
  const factById = new Map(facts.map((f) => [f.id, f]));
  const fromSuggestion = new Set(data.suggestions.map((s) => s.resulting_fact_id).filter(Boolean));
  const out: LogEntry[] = [];
  for (const s of data.suggestions) {
    // A V4.6 não repete em "Alterações recentes" o que ainda espera você (L13934).
    if (s.decision === null || !s.decided_at) continue;
    if (isAgentId(s.agent_id)) out.push({ kind: "suggested", value: s.content, at: s.created_at, who: s.agent_id, target: s.resulting_fact_id });
    const fact = s.resulting_fact_id ? factById.get(s.resulting_fact_id) : undefined;
    if (s.decision === "confirm") out.push({ kind: "confirmed", value: fact?.content ?? s.content, at: s.decided_at, who: null, target: s.resulting_fact_id });
    else if (s.decision === "correct") out.push({ kind: "corrected", value: fact?.content ?? s.content, at: s.decided_at, who: null, target: s.resulting_fact_id });
    else out.push({ kind: "discarded", value: s.content, at: s.decided_at, who: null, target: null });
  }
  for (const c of data.conflicts) {
    if (c.state !== "resolved" || !c.resolved_at) continue;
    const kept = c.resulting_fact_id ? factById.get(c.resulting_fact_id) : undefined;
    out.push({ kind: "resolved", key: c.fact_a.key, value: kept?.content ?? "", at: c.resolved_at, who: null, target: c.resulting_fact_id });
  }
  for (const f of facts) {
    if (fromSuggestion.has(f.id)) continue;
    // Correção do dono: versão nova sobre a anterior ("Você corrigiu: …").
    if (f.version > 1 && f.source_type === "correction") out.push({ kind: "corrected", value: f.content, at: f.created_at, who: null, target: f.id });
    // Decisão tomada na conversa ("Você decidiu: …", como em `LOG5`).
    else if (f.state === "decision" && f.confirmed_at) out.push({ kind: "decided", value: f.content, at: f.confirmed_at, who: null, target: f.id });
  }
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** Primeira letra minúscula, como o `_m5Lower` (L12961). */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Data curta da V4.5: "hoje · 10:31" hoje, "15/10" nos outros dias. */
export function shortWhen(iso: string, now: Date, locale: string, today: (time: string) => string): string {
  if (dayKey(iso) === dayKey(now.toISOString())) return today(shortTime(iso, locale));
  return dayMonth(iso, locale);
}

export function dayMonth(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

/** Ícone da fonte (`SRCK5`, L12718; `src5`, L12783): pelo tipo e, nas conexões e arquivos, pelo nome. */
export function sourceIcon(kind: SourceKind, name: string | null): string {
  if (kind === "onboarding" || kind === "correction") return PRODUCT_ICONS.user;
  if (kind === "conversation" || kind === "approval") return PRODUCT_ICONS.chat;
  if (kind === "agent_observation") return PRODUCT_ICONS.squad;
  const n = (name ?? "").toLowerCase();
  if (n.includes("instagram")) return PRODUCT_ICONS.insta;
  if (n.includes("google")) return PRODUCT_ICONS.pin;
  if (n.includes("whatsapp")) return PRODUCT_ICONS.wa;
  if (n.includes("mail")) return PRODUCT_ICONS.mail;
  if (n.includes("planilha")) return PRODUCT_ICONS.sheet;
  if (n.includes("site")) return PRODUCT_ICONS.globe;
  return PRODUCT_ICONS.file;
}

/** Classe do estado da fonte (`SRCST5`, L12804): "Indisponível" usa o desenho de "Não conectada". */
export function sourceLook(state: FactSource["state"]): string {
  return {
    declared: "decl",
    connected: "ok",
    outdated: "old",
    needs_reconnect: "exp",
    not_connected: "off",
    unavailable: "off",
  }[state];
}
