// Frases que a classe da R32 monta em tempo de execução (nomes dos agentes + estado), para en/es. O dicionário traduz
// strings inteiras; estas três formas juntam pedaços: "Bia, Kaia e Kiwi", "Kaia (Criação)" e "<nomes> está a postos.".
const AGENTS = "(?:Nexo|Bia|Kaia|Otto|Kiwi|Max|Íris)";
const NAMES = new RegExp(`^((?:${AGENTS}, )*${AGENTS}) e (${AGENTS})$`);
const WITH_ROLE = new RegExp(`^(${AGENTS}) \\((.+)\\)$`);
const STATUS = /^(.+) (está montando seu squad|estão a postos|está a postos)(\.?)$/;
const AND: Record<string, string> = { en: "and", es: "y" };
// Leitor de tela do Modo Autônomo: "Rotina: <pedido> Etapa <n> de 4. <texto>" (os pedaços já vêm traduzidos da fonte).
const ROUTINE = /^Rotina: (.*) Etapa (\d) de 4\. (.*)$/;
const ROUTINE_WORDS: Record<string, [string, string, string]> = { en: ["Routine:", "Step", "of 4."], es: ["Rutina:", "Etapa", "de 4."] };

export function composeTranslator(locale: string, dict: Record<string, string>): (s: string) => string {
  const and = AND[locale] ?? "e";
  const tr = (s: string): string => {
    const hit = dict[s];
    if (hit !== undefined) return hit;
    let m = NAMES.exec(s);
    if (m) return `${m[1]} ${and} ${m[2]}`;
    m = WITH_ROLE.exec(s);
    if (m) return `${m[1]} (${dict[m[2]!] ?? m[2]})`;
    m = ROUTINE.exec(s);
    if (m) {
      const [r, st, of] = ROUTINE_WORDS[locale] ?? ["Rotina:", "Etapa", "de 4."];
      return `${r} ${m[1]} ${st} ${m[2]} ${of} ${m[3]}`;
    }
    m = STATUS.exec(s);
    if (m) return `${tr(m[1]!)} ${dict[m[2]!] ?? m[2]}${m[3]}`;
    return s;
  };
  return tr;
}
