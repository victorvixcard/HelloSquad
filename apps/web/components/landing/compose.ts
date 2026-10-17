// Frases que a classe da R32 monta em tempo de execução (nomes dos agentes + estado), para en/es. O dicionário traduz
// strings inteiras; estas três formas juntam pedaços: "Bia, Kaia e Kiwi", "Kaia (Criação)" e "<nomes> está a postos.".
const AGENTS = "(?:Nexo|Bia|Kaia|Otto|Kiwi|Max|Íris)";
const NAMES = new RegExp(`^((?:${AGENTS}, )*${AGENTS}) e (${AGENTS})$`);
const WITH_ROLE = new RegExp(`^(${AGENTS}) \\((.+)\\)$`);
const STATUS = /^(.+) (está montando seu squad|estão a postos|está a postos)(\.?)$/;
const AND: Record<string, string> = { en: "and", es: "y" };

export function composeTranslator(locale: string, dict: Record<string, string>): (s: string) => string {
  const and = AND[locale] ?? "e";
  const tr = (s: string): string => {
    const hit = dict[s];
    if (hit !== undefined) return hit;
    let m = NAMES.exec(s);
    if (m) return `${m[1]} ${and} ${m[2]}`;
    m = WITH_ROLE.exec(s);
    if (m) return `${m[1]} (${dict[m[2]!] ?? m[2]})`;
    m = STATUS.exec(s);
    if (m) return `${tr(m[1]!)} ${dict[m[2]!] ?? m[2]}${m[3]}`;
    return s;
  };
  return tr;
}
