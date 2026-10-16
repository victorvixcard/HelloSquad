#!/usr/bin/env python3
"""X1 · extrai, por faixas, a lógica e os textos dos protótipos do handoff V4.6.

Uso (a partir da raiz do repositório):
    python3 docs/parciais/x1/extract.py

Só lê `design/handoff-v4.6/`; só escreve em `docs/parciais/x1/out/`.
Nunca carrega o HTML inteiro na tela: grava blocos numerados por linha de origem,
para leitura em faixas de até 200 linhas.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HAND = ROOT / "design" / "handoff-v4.6"
OUT = Path(__file__).resolve().parent / "out"

WRAP = 220  # largura máxima de linha nos extratos (continua com "↳")

# blocos de geometria, ícones e animação: não interessam à especificação de fluxos
SKIP_TOP = re.compile(
    r"^(IC|SQ_[A-Z_]+|HEASE|GKEYS|cbz|sqRnd|sqIdle|sqCut|sqRow|hmMono|hmArea|WK_SG|wkSG|BAR_T|BAR_E|MK_G|MK_SZ|"
    r"NDC5|AGC6|SQ_Z|SQ_LOCK|SQ_ROW|SQ_REST|SQ_B|SQ_LH|SQ_LW|SQ_EC|SQ_LS|SQ_UP|SQ_PERSONA|SQ_TURN|SQ_MOVES|SQ_SIG|"
    r"SQ_INTRO_CUT|SQ_INTRO_ORDER|f2|wk2|wkWd|wkDM|wkF|wkRel|wkRange|wkWeek|wkAddMonth|wkDate|wkP|wkD|WK_T0)$"
)

PATH_DATA = re.compile(r'\b(d|points|viewBox|transform)="[^"]{30,}"')
JS_PATH = re.compile(r"'(M\s?-?\d[\d.\-\s,a-zA-Z]{38,})'")  # dados de path SVG: sempre "M" + número
STYLE_ATTR = re.compile(r'\sstyle="[^"]{60,}"')


def slug(s, n=40):
    s = re.sub(r"[^0-9A-Za-zÀ-ÿ]+", "-", s).strip("-").lower()
    return s[:n] or "bloco"


def wrap(line):
    if len(line) <= WRAP:
        return [line]
    out, rest = [line[:WRAP]], line[WRAP:]
    while rest:
        out.append("      ↳ " + rest[:WRAP])
        rest = rest[WRAP:]
    return out


def clean(line, js=False):
    line = PATH_DATA.sub(lambda m: f'{m.group(1)}="…"', line)
    if js:
        line = JS_PATH.sub("'M…'", line)
    else:
        line = STYLE_ATTR.sub(' style="…"', line)
    return line


def dump(path, lines, first_no, js=False):
    """Grava `lines` (lista de str) com o número da linha de origem."""
    buf = []
    for i, ln in enumerate(lines):
        for j, piece in enumerate(wrap(clean(ln.rstrip("\n"), js))):
            buf.append(f"{first_no + i:>6}{' ' if j == 0 else '+'} {piece}")
    path.write_text("\n".join(buf) + "\n", encoding="utf-8")
    return len(buf)


def find(lines, pat, start=0):
    rx = re.compile(pat)
    for i in range(start, len(lines)):
        if rx.search(lines[i]):
            return i
    return -1


def segment_script(lines, s0, s1):
    """Divide o script [s0, s1) em blocos de topo e, dentro da classe e dos
    `Object.assign(Component.prototype, …)`, em seções marcadas por `  // ----`."""
    top = re.compile(r"^(const|let|var|function|class|Object\.|// ?[=-]{8,}|// [A-Za-zÀ-ÿ])")
    marks = []
    for i in range(s0, s1):
        ln = lines[i]
        if top.match(ln):
            marks.append(i)
        elif re.match(r"^  // -{8,}", ln) or re.match(r"^  // -{3,} ", ln):
            marks.append(i)
    marks = sorted(set(marks))
    blocks = []
    for k, a in enumerate(marks):
        b = marks[k + 1] if k + 1 < len(marks) else s1
        blocks.append((a, b))
    # funde comentários de topo ao bloco seguinte
    merged = []
    pend = None
    for a, b in blocks:
        head = lines[a]
        if head.startswith("//") and b - a <= 6:
            pend = pend if pend is not None else a
            continue
        if pend is not None:
            a, pend = pend, None
        merged.append((a, b))
    return merged


def block_name(lines, a, b):
    for i in range(a, min(b, a + 8)):
        ln = lines[i].strip()
        m = re.match(r"^(?:const|let|var)\s+([A-Za-z_$][\w$]*)", ln)
        if m:
            return m.group(1)
        m = re.match(r"^function\s+([A-Za-z_$][\w$]*)", ln)
        if m:
            return m.group(1)
        m = re.match(r"^Object\.assign\(([^,]+)", ln)
        if m and "prototype" not in m.group(1):
            return "assign-" + m.group(1)
        m = re.match(r"^// -+ (.+)$", ln) or re.match(r"^// =+ (.+)$", ln)
        if m:
            return m.group(1)
        if ln.startswith("// ") and not set(ln[3:]) <= set("=-"):
            return ln[3:]
        if ln.startswith("class "):
            return "class-" + ln.split()[1]
        if ln.startswith("Object.assign(Component.prototype"):
            continue
    return "bloco"


STR_RX = re.compile(r"'((?:[^'\\\n]|\\.){3,})'|\"((?:[^\"\\\n]|\\.){3,})\"|`((?:[^`\\]|\\.){3,})`")
PT_HINT = re.compile(r"[ãõçáéíóúâêôàÁÉÍÓÚÃÕÇ]|\b(de|da|do|para|com|você|sua|seu|uma|um|que|não)\b", re.I)


def strings_of(lines, s0, s1, tag):
    rows = []
    for i in range(s0, s1):
        for m in STR_RX.finditer(lines[i]):
            s = next(g for g in m.groups() if g is not None)
            if " " in s and PT_HINT.search(s) and not JS_PATH.fullmatch("'" + s + "'"):
                rows.append(f"{tag}\t{i + 1}\t{s}")
    return rows


TEXT_NODE = re.compile(r">([^<>{}][^<>]*?)<")
ATTR_TXT = re.compile(r'\b(aria-label|title|placeholder|alt|data-tip)="([^"]+)"')


def template_text(lines, t0, t1, tag):
    rows = []
    for i in range(t0, t1):
        ln = lines[i]
        for m in TEXT_NODE.finditer(ln):
            s = m.group(1).strip()
            if s and not re.fullmatch(r"[\W\d_]+", s):
                rows.append(f"{tag}\t{i + 1}\ttexto\t{s}")
        for m in ATTR_TXT.finditer(ln):
            rows.append(f"{tag}\t{i + 1}\t{m.group(1)}\t{m.group(2)}")
        for m in re.finditer(r"\{\{\s*([^}]+?)\s*\}\}", ln):
            pass
    return rows


def process(src, prefix, outdir):
    lines = src.read_text(encoding="utf-8").split("\n")
    lines = [ln + "\n" for ln in lines]
    outdir.mkdir(parents=True, exist_ok=True)
    idx = []
    x0 = find(lines, r"^<x-dc>")
    h1 = find(lines, r"^</helmet>")
    x1 = find(lines, r"^</x-dc>")
    sc0 = find(lines, r'^<script type="text/x-dc"')
    sc1 = find(lines, r"^</script>", sc0 + 1)
    t0 = (h1 + 1) if h1 >= 0 else (x0 + 1)
    meta = {"arquivo": str(src.relative_to(ROOT)), "linhas": len(lines), "template": [t0 + 1, x1],
            "script": [sc0 + 2, sc1], "props_cenario": lines[sc0].strip()[:300]}
    # template
    n = dump(outdir / f"{prefix}_template.txt", lines[t0:x1], t0 + 1)
    idx.append(f"{prefix}_template.txt\t{t0 + 1}-{x1}\t{n} linhas\ttemplate (SVG e estilos longos resumidos)")
    trows = template_text(lines, t0, x1, prefix)
    (outdir / f"{prefix}_template_textos.tsv").write_text("\n".join(trows) + "\n", encoding="utf-8")
    idx.append(f"{prefix}_template_textos.tsv\t-\t{len(trows)} linhas\ttextos visíveis e atributos do template")
    # script
    blocks = segment_script(lines, sc0 + 1, sc1)
    seen = {}
    for a, b in blocks:
        name = block_name(lines, a, b)
        if SKIP_TOP.match(name):
            idx.append(f"(omitido)\t{a + 1}-{b}\t{b - a} linhas\t{name}")
            continue
        base = f"{prefix}_{a + 1:05d}_{slug(name)}"
        seen[base] = seen.get(base, 0) + 1
        fn = f"{base}.txt"
        n = dump(outdir / fn, lines[a:b], a + 1, js=True)
        idx.append(f"{fn}\t{a + 1}-{b}\t{n} linhas\t{name}")
    srows = strings_of(lines, sc0 + 1, sc1, prefix)
    (outdir / f"{prefix}_strings.tsv").write_text("\n".join(srows) + "\n", encoding="utf-8")
    idx.append(f"{prefix}_strings.tsv\t-\t{len(srows)} linhas\tliterais de texto em português do script")
    (outdir / f"{prefix}_INDICE.tsv").write_text("\n".join(idx) + "\n", encoding="utf-8")
    (outdir / f"{prefix}_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return meta, len(idx)


def main():
    jobs = [
        (HAND / "product-ui" / "ProductUIV4.dc.html", "pui", OUT / "pui"),
        (HAND / "product-ui" / "MioloPeca.dc.html", "miolo", OUT / "miolo"),
        (HAND / "landing" / "LandingPageV1.dc.html", "land", OUT / "land"),
    ]
    for src, prefix, outdir in jobs:
        meta, n = process(src, prefix, outdir)
        print(f"{prefix}: {meta['linhas']} linhas · template {meta['template']} · script {meta['script']} · {n} entradas no índice")


if __name__ == "__main__":
    sys.exit(main())
