#!/usr/bin/env python3
"""H2 / i18n: paridade dos catálogos do web (apps/web/messages/<idioma>/*.json) e do backend
(apps/backend/src/hellosquad/i18n/<idioma>.json).

Uso (da raiz do repo):
    python3 docs/parciais/h2/estatico/i18n_catalogos.py            # web + backend
    python3 docs/parciais/h2/estatico/i18n_catalogos.py web
    python3 docs/parciais/h2/estatico/i18n_catalogos.py backend

Relata, por arquivo: chaves faltando/sobrando em en/es em relação ao pt-BR, arquivos que existem num
idioma e não noutro, placeholders ICU/variáveis/tags diferentes, valores vazios, valores en/es idênticos
ao pt-BR (com pelo menos uma palavra) e valores en/es com marcas típicas do português.
Somente leitura; não altera nada.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
WEB_MSG = ROOT / "apps/web/messages"
BACK_I18N = ROOT / "apps/backend/src/hellosquad/i18n"
BASE = "pt-BR"
OTHERS = ["en", "es"]

# Palavras/fragmentos típicos do português (revisar à mão: es compartilha "ão" raramente, en nunca).
PT_MARKERS_EN = [r"\bvocê\b", r"\bnão\b", r"ção\b", r"ções\b", r"ões\b", r"\bseu\b", r"\bsua\b",
                 r"\bpara o\b", r"\bpara a\b", r"ê", r"ã", r"õ", r"ç", r"\bque\b", r"\bcom\b", r"\buma\b",
                 r"\bé\b", r"\bdos\b", r"\bdas\b"]
PT_MARKERS_ES = [r"ção\b", r"ções\b", r"ões\b", r"\bvocê\b", r"\bnão\b", r"ã", r"õ", r"ê",
                 r"\bseu\b", r"\bsua\b", r"\bvocês\b", r"\bentão\b", r"\bpedido\b(?= de)", r"\bisso\b",
                 r"\bisto\b", r"\btambém\b", r"\bagora\b", r"\bfazer\b", r"\bum\b", r"\buma\b"]

# Valores idênticos que não indicam falta de tradução (marca, agentes, siglas, números, URLs...).
NAMES = {"HelloSquad", "Nexo", "Bia", "Kaia", "Kiwi", "Max", "Íris", "Iris", "Squad", "CRM", "SEO",
         "Instagram", "LinkedIn", "Google", "WhatsApp", "Meta", "TikTok", "YouTube", "Facebook", "E-mail",
         "Email", "OK", "Ok", "Pix", "PIX", "CNPJ", "CPF", "Brasil", "Supabase", "Stripe", "API", "URL"}


def flatten(obj, prefix=""):
    out = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            out.update(flatten(v, f"{prefix}.{k}" if prefix else str(k)))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            out.update(flatten(v, f"{prefix}[{i}]"))
    else:
        out[prefix] = obj
    return out


TAG = re.compile(r"</?([A-Za-z][\w-]*)\s*/?>")
PY_FMT = re.compile(r"(?<!\{)\{([A-Za-z_]\w*)(?:[!:][^}]*)?\}(?!\})")
MUSTACHE = re.compile(r"\{\{\s*([\w.]+)\s*\}\}")
PERCENT = re.compile(r"%(?:\([\w]+\))?[sdif]")
BRANCHING = {"plural", "select", "selectordinal"}


def icu_args(s: str) -> set[tuple[str, str]]:
    """Mini-parser ICU: devolve {(nome_do_argumento, tipo)}; corpos de ramos plural/select viram mensagem
    (recursivo), então o texto dentro de {o}/{a} não é tomado como argumento."""
    out: set[tuple[str, str]] = set()

    def msg(i: int, nested: bool) -> int:
        while i < len(s):
            c = s[i]
            if c == "'" and i + 1 < len(s) and s[i + 1] in "{}'":
                j = s.find("'", i + 1)
                i = (j + 1) if j != -1 else len(s)
                continue
            if c == "{":
                i = arg(i + 1)
                continue
            if c == "}" and nested:
                return i + 1
            i += 1
        return i

    def arg(i: int) -> int:
        j = i
        while j < len(s) and s[j] not in ",}":
            j += 1
        name = s[i:j].strip()
        if j >= len(s):
            return j
        if s[j] == "}":
            out.add((name, ""))
            return j + 1
        k = j + 1
        while k < len(s) and s[k] not in ",}":
            k += 1
        typ = s[j + 1:k].strip()
        out.add((name, typ))
        if k < len(s) and s[k] == "}":
            return k + 1
        k += 1
        if typ in BRANCHING:
            while k < len(s):
                while k < len(s) and s[k].isspace():
                    k += 1
                if k < len(s) and s[k] == "}":
                    return k + 1
                while k < len(s) and not s[k].isspace() and s[k] != "{":
                    k += 1
                while k < len(s) and s[k].isspace():
                    k += 1
                if k < len(s) and s[k] == "{":
                    k = msg(k + 1, True)
            return k
        depth = 1
        while k < len(s) and depth:
            depth += {"{": 1, "}": -1}.get(s[k], 0)
            k += 1
        return k

    msg(0, False)
    return out


def placeholders_web(v):
    if not isinstance(v, str):
        return ()
    return (tuple(sorted(icu_args(v))), tuple(sorted(set(TAG.findall(v)))))


def placeholders_back(v):
    if not isinstance(v, str):
        return ()
    return (tuple(sorted(set(PY_FMT.findall(v)))), tuple(sorted(set(MUSTACHE.findall(v)))),
            tuple(sorted(PERCENT.findall(v))))


WORD = re.compile(r"[A-Za-zÀ-ÿ]{3,}")


def strip_icu(v: str) -> str:
    # remove argumentos ICU simples para o teste de "tem palavra"
    return re.sub(r"\{[^{}]*\}", " ", v)


def has_real_word(v) -> bool:
    if not isinstance(v, str):
        return False
    s = strip_icu(v)
    if re.fullmatch(r"\s*(https?://\S+|[\w.+-]+@[\w.-]+)\s*", s):
        return False
    words = [w for w in WORD.findall(s) if w not in NAMES and not w.isupper()]
    return bool(words)


def pt_markers(v, markers):
    if not isinstance(v, str):
        return []
    s = strip_icu(v)
    return [m for m in markers if re.search(m, s, flags=re.IGNORECASE)]


def compare(label, base: dict, other: dict, lang: str, ph_fn, report):
    fb, fo = flatten(base), flatten(other)
    missing = sorted(set(fb) - set(fo))
    extra = sorted(set(fo) - set(fb))
    ph_diff, identical, ptlike, empty_o = [], [], [], []
    for k in sorted(set(fb) & set(fo)):
        vb, vo = fb[k], fo[k]
        if ph_fn(vb) != ph_fn(vo):
            ph_diff.append((k, ph_fn(vb), ph_fn(vo)))
        if isinstance(vo, str) and vo.strip() == "":
            empty_o.append(k)
        if isinstance(vb, str) and vb == vo and has_real_word(vb):
            identical.append((k, vb))
        elif isinstance(vo, str):
            mk = pt_markers(vo, PT_MARKERS_EN if lang == "en" else PT_MARKERS_ES)
            if mk:
                ptlike.append((k, vo, mk))
    for k in missing:
        report.append(f"  FALTA[{lang}] {label}: {k} = {str(fb[k])[:90]!r}")
    for k in extra:
        report.append(f"  SOBRA[{lang}] {label}: {k} = {str(fo[k])[:90]!r}")
    for k, a, b in ph_diff:
        report.append(f"  PLACEHOLDER[{lang}] {label}: {k} pt-BR={a} {lang}={b}")
    for k in empty_o:
        report.append(f"  VAZIO[{lang}] {label}: {k}")
    for k, v in identical:
        report.append(f"  IDENTICO[{lang}] {label}: {k} = {v[:100]!r}")
    for k, v, mk in ptlike:
        report.append(f"  PT_EM_{lang.upper()} {label}: {k} = {v[:120]!r} marcas={mk}")
    return len(fb), len(fo), missing, extra, ph_diff, empty_o, identical, ptlike


def run_web():
    print("=== WEB: apps/web/messages ===")
    langs = [BASE] + OTHERS
    files = {lang: sorted(p.name for p in (WEB_MSG / lang).glob("*.json")) for lang in langs}
    allf = sorted(set().union(*files.values()))
    for lang in langs:
        miss = [f for f in allf if f not in files[lang]]
        print(f"arquivos {lang}: {len(files[lang])}; faltando: {miss or 'nenhum'}")
    # index.ts: mesma lista de imports e de áreas?
    idx = {}
    for lang in langs:
        txt = (WEB_MSG / lang / "index.ts").read_text(encoding="utf-8")
        imps = sorted(re.findall(r'from "\./([\w-]+)\.json"', txt))
        idx[lang] = imps
        print(f"index.ts {lang}: {len(imps)} imports; sem import: {sorted(set(f[:-5] for f in files[lang]) - set(imps)) or 'nenhum'}")
    print(f"index.ts mesma lista nos 3: {idx[BASE] == idx['en'] == idx['es']}")
    report, totals = [], {lang: 0 for lang in langs}
    per_file = []
    empty_base = []
    for f in allf:
        data = {}
        for lang in langs:
            p = WEB_MSG / lang / f
            data[lang] = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
        fbase = flatten(data[BASE])
        empty_base += [f"{f}:{k}" for k, v in fbase.items() if isinstance(v, str) and v.strip() == ""]
        row = [f, len(fbase)]
        totals[BASE] += len(fbase)
        for lang in OTHERS:
            nb, no, *_ = compare(f, data[BASE], data[lang], lang, placeholders_web, report)
            totals[lang] += no
            row.append(no)
        per_file.append(row)
    print("\nchaves (folhas) por arquivo: arquivo pt-BR en es")
    for r in per_file:
        print("  " + " ".join(str(x) for x in r))
    print(f"TOTAL folhas: pt-BR={totals[BASE]} en={totals['en']} es={totals['es']}")
    print(f"VAZIO[pt-BR]: {empty_base or 'nenhum'}")
    _summary(report)


def run_backend():
    print("\n=== BACKEND: apps/backend/src/hellosquad/i18n ===")
    data = {lang: json.loads((BACK_I18N / f"{lang}.json").read_text(encoding="utf-8")) for lang in [BASE] + OTHERS}
    for lang, d in data.items():
        fl = flatten(d)
        emails = [k for k in fl if k.startswith("email.")]
        empties = [k for k, v in fl.items() if isinstance(v, str) and v.strip() == ""]
        prefixes = {}
        for k in fl:
            prefixes[k.split(".")[0]] = prefixes.get(k.split(".")[0], 0) + 1
        print(f"{lang}: {len(fl)} chaves; email.*={len(emails)}; vazios={empties or 'nenhum'}")
        print(f"   por prefixo: {dict(sorted(prefixes.items()))}")
    report = []
    for lang in OTHERS:
        compare("backend", data[BASE], data[lang], lang, placeholders_back, report)
    _summary(report)


def _summary(report):
    kinds = {}
    for line in report:
        kind = line.split()[0]
        kinds[kind] = kinds.get(kind, 0) + 1
    print("contagem por tipo:", dict(sorted(kinds.items())) or "nenhum achado")
    for line in report:
        print(line)


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    if which in ("all", "web"):
        run_web()
    if which in ("all", "backend"):
        run_backend()
