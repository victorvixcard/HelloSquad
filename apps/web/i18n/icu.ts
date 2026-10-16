/**
 * Leitura mínima de ICU MessageFormat (o formato do catálogo): argumentos e tags de uma mensagem,
 * para conferir que en e es usam os mesmos que o pt-BR. Entende `{arg}`, `{arg, plural|select, … {…}}`
 * (entra nas opções), `#` e tags `<tag>…</tag>`. O apóstrofo reto (escape do ICU) fica proibido no catálogo.
 */
function closing(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return i;
  }
  return text.length;
}

export function icuArguments(message: string, out = new Set<string>()): Set<string> {
  let i = 0;
  while (i < message.length) {
    if (message[i] !== "{") {
      i++;
      continue;
    }
    const end = closing(message, i);
    const inner = message.slice(i + 1, end);
    const match = /^\s*([A-Za-z0-9_]+)\s*(?:,\s*(plural|select|selectordinal)\s*,([\s\S]*))?/.exec(inner);
    if (match) {
      out.add(match[1]);
      const options = match[3];
      if (options !== undefined) {
        for (let j = 0; j < options.length; j++) {
          if (options[j] !== "{") continue;
          const close = closing(options, j);
          icuArguments(options.slice(j + 1, close), out);
          j = close;
        }
      }
    }
    i = end + 1;
  }
  return out;
}

export function icuTags(message: string): Set<string> {
  return new Set([...message.matchAll(/<([a-zA-Z][\w-]*)>/g)].map((m) => m[1]));
}
