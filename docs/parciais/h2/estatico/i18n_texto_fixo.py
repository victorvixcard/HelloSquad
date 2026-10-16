#!/usr/bin/env python3
"""H2 / i18n: candidatos a texto visível fixo no código do web (fora de apps/web/messages e content).

Uso (da raiz do repo):
    python3 docs/parciais/h2/estatico/i18n_texto_fixo.py            # lista candidatos
    python3 docs/parciais/h2/estatico/i18n_texto_fixo.py --resumo   # só contagens

Heurística (regex, sem AST): texto JSX entre tags, atributos visíveis com string literal
(aria-label, placeholder, title, alt, label...), mensagens de erro/toast/setError, `error: "..."`,
metadata title/description, e literais de string com "cara de frase" (2+ palavras com letras, ou
acentos) dentro de arquivos de rota especiais (og, not-found, error, loading, layout, page).
Ignora className, data-testid, imports, console.*, rotas, chaves de catálogo (t("a.b")), CSS.
Os candidatos precisam de revisão manual: o script lista, a revisão decide.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
WEB = ROOT / "apps/web"
DIRS = ["app", "components", "lib", "i18n"]
EXTRA = ["middleware.ts"]
SKIP_PARTS = {"node_modules", ".next", "test", "e2e", "test-results", "__tests__"}

LETTERS = "A-Za-zÀ-ÿ"
ACCENT = re.compile(r"[À-ÿ]")
BRAND_ONLY = re.compile(r"^\s*(HelloSquad|Nexo|Bia|Kaia|Kiwi|Max|Íris|Iris|Otto|Squad)\s*$")
SYMBOLS_ONLY = re.compile(r"^[\s·→←/|\-–—:;,.!?()\[\]0-9%+*#&@×✓✕…'\"`]*$")

VISIBLE_ATTRS = r"(?:aria-label|aria-description|aria-roledescription|aria-valuetext|placeholder|title|alt|label|subtitle|description|caption|heading|tooltip|emptyText|helperText|cta|summary)"
RE_ATTR = re.compile(VISIBLE_ATTRS + r"""\s*=\s*(?:\{\s*)?(["'`])((?:(?!\1).)*?[""" + LETTERS + r"""](?:(?!\1).)*?)\1""")
RE_JSX_TEXT = re.compile(r">\s*([^<>{}\n]*[" + LETTERS + r"]{2,}[^<>{}\n]*?)\s*(?=<|\{|$)")
RE_ERR = re.compile(r"""(?:new\s+Error|toast(?:\.\w+)?|setError|setMessage|setStatus|notFound|alert|confirm|redirect\w*)\s*\(\s*(["'`])((?:(?!\1).)+)\1""")
RE_ERRPROP = re.compile(r"""\b(?:error|message|msg|detail|title|description|label|text|hint|name|heading|subtitle|alt|placeholder|cta|summary)\s*:\s*(["'`])((?:(?!\1).)+)\1""")
RE_STRING = re.compile(r"""(["'`])((?:(?!\1)[^\\\n]|\\.)*)\1""")

PT_WORDS = re.compile(r"\b(?:de|do|da|dos|das|para|com|sem|sua|seu|você|não|uma|um|que|em|no|na|ao|à|e|ou|o|a|os|as)\b\s+\w")
EN_WORDS = re.compile(r"\b(?:the|your|you|to|of|and|with|for|not|is|are|this|please)\b\s+\w", re.I)
RE_TEXT_LINE = re.compile(r"^[A-Za-zÀ-ÿ¿¡“\"][^<>{}=;`|&]*[A-Za-zÀ-ÿ.!?…:”\"]$")
TECH = re.compile(r"""^(?:[\w.\-/:@#?=&%+*]+|[a-z0-9\-:/\[\]._!]+(?:\s+[a-z0-9\-:/\[\]._!]+)*)$""")
CSSISH = re.compile(r"\b(?:flex|grid|px-|py-|mt-|mb-|text-|bg-|border|rounded|items-|justify-|gap-|w-|h-|min-|max-|hover:|focus:|var\(--|rgba?\(|calc\(|solid|inherit|none|auto|absolute|relative)\b")
SPECIAL_ROUTE = re.compile(r"(?:^|/)(?:not-found|error|global-error|loading|layout|page|route|opengraph-image|twitter-image|icon)\.tsx?$|/og/")


def is_texty(s: str) -> bool:
    s2 = re.sub(r"\$\{[^}]*\}", " ", s)
    s2 = re.sub(r"\{[^}]*\}", " ", s2)
    if not re.search(f"[{LETTERS}]{{2,}}", s2):
        return False
    if BRAND_ONLY.match(s2) or SYMBOLS_ONLY.match(s2):
        return False
    if s2.startswith(("/", "http", "#", ".", "@", "--", "mailto:", "data:", "image/", "text/", "application/")):
        return False
    if CSSISH.search(s2) and not ACCENT.search(s2):
        return False
    words = re.findall(f"[{LETTERS}]+", s2)
    if ACCENT.search(s2):
        return True
    # frase: 2+ palavras separadas por espaço e começando com maiúscula ou com pontuação de frase
    if len(words) >= 2 and " " in s2.strip() and not TECH.match(s2.strip()):
        return True
    # palavra única capitalizada (rótulo de botão) só conta em JSX/atributo (decidido pelo chamador)
    return False


def single_label(s: str) -> bool:
    s = s.strip()
    return bool(re.fullmatch(f"[A-ZÀ-Ý][{LETTERS}]+[.!?…:]?", s)) and not BRAND_ONLY.match(s)


def skip_line(line: str) -> bool:
    st = line.strip()
    return (st.startswith(("import ", "export * from", "//", "/*", "*", "console.")) or "console." in st
            or st.startswith("@") or "data-testid" in st and st.count('"') <= 2)


def strip_noise(line: str) -> str:
    line = re.sub(r"""className\s*=\s*(\{`[^`]*`\}|"[^"]*"|'[^']*'|\{[^}]*\})""", "", line)
    line = re.sub(r"""(?:data-testid|id|href|key|role|type|name|rel|target|src|lang|htmlFor|variant|size|as|method|action|encType|autoComplete|inputMode|d|viewBox|fill|stroke\w*|xmlns)\s*=\s*("[^"]*"|'[^']*')""", "", line)
    line = re.sub(r"""\bt\w*\(\s*["'`][^"'`]*["'`]""", "t(KEY", line)  # chamadas de tradução
    return line


def files():
    out = []
    for d in DIRS:
        for p in (WEB / d).rglob("*"):
            if p.suffix in (".ts", ".tsx") and not (SKIP_PARTS & set(p.relative_to(WEB).parts)) \
                    and ".test." not in p.name and ".spec." not in p.name:
                out.append(p)
    for e in EXTRA:
        if (WEB / e).exists():
            out.append(WEB / e)
    return sorted(out)


def scan(path: Path):
    rel = path.relative_to(ROOT).as_posix()
    special = bool(SPECIAL_ROUTE.search(rel))
    is_tsx = path.suffix == ".tsx"
    found = []
    in_block_comment = False
    for n, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        st = raw.strip()
        if in_block_comment:
            if "*/" in st:
                in_block_comment = False
            continue
        if st.startswith("/*") and "*/" not in st:
            in_block_comment = True
            continue
        if skip_line(raw):
            continue
        line = strip_noise(raw)
        hits = set()
        for m in RE_ATTR.finditer(line):
            v = m.group(2)
            if is_texty(v) or single_label(v):
                hits.add(("atributo", v))
        for m in RE_ERR.finditer(line):
            v = m.group(2)
            if is_texty(v):
                hits.add(("erro/aviso", v))
        for m in RE_ERRPROP.finditer(line):
            v = m.group(2)
            if is_texty(v):
                hits.add(("propriedade", v))
        if is_tsx:
            for m in RE_JSX_TEXT.finditer(line):
                v = m.group(1).strip()
                if v and (is_texty(v) or single_label(v)) and "=>" not in v and "&&" not in v \
                        and not re.search(r"[;=]\s*$|^\)|^[,:]|\breturn\b|\bconst\b", v):
                    hits.add(("jsx", v))
        for m in RE_STRING.finditer(line):
            v = m.group(2)
            if any(v == h[1] for h in hits):
                continue
            if (special or "/og/" in rel or "metadata" in raw.lower()) and is_texty(v):
                hits.add(("literal", v))
            elif is_texty(v) and (ACCENT.search(v) or PT_WORDS.search(v) or EN_WORDS.search(v)):
                hits.add(("literal-frase", v))
        if is_tsx and RE_TEXT_LINE.match(st) and len(re.findall(f"[{LETTERS}]{{2,}}", st)) >= 2 \
                and not any(st == h[1] for h in hits):
            hits.add(("jsx-linha", st))
        for kind, v in sorted(hits):
            found.append((rel, n, kind, v.strip()[:140]))
    return found


def main():
    fs = files()
    allhits = []
    for p in fs:
        allhits += scan(p)
    if "--resumo" not in sys.argv:
        for rel, n, kind, v in allhits:
            print(f"{rel}:{n}\t[{kind}]\t{v}")
    print(f"\n# arquivos .ts/.tsx varridos: {len(fs)}")
    print(f"# candidatos: {len(allhits)} em {len({h[0] for h in allhits})} arquivos")


if __name__ == "__main__":
    main()
