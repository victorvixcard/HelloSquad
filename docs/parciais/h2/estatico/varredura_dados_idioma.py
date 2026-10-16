#!/usr/bin/env python3
"""Varredura estatica H2 (copia adaptada da H1): itens 3 (so dados ficticios) e 4 (pt-BR sem emoji).
Escopo ampliado na H2: conteudo do site (apps/web/content), CSVs, catalogo do backend (i18n/*.json) e modelos de e-mail.

Somente leitura. Nao recebe argumentos. Escreve os detalhes em /tmp/h2_est_dados_* e imprime
apenas contagens e arquivo:linha. Referencia oficial: docs/DADOS_FICTICIOS.md.
Exclusoes: node_modules, .venv, .next, dist, build, __pycache__, .git, test-results,
*.lock, pnpm-lock.yaml, uv.lock, *.tsbuildinfo, design/handoff-v4.6, docs/handoff,
docs/parciais/h1/prototipo (handoff-v4.6 e super-admin-proto) e qualquer pasta *handoff*/*prototip*.
"""
import json
import os
import re
import subprocess
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
OUT = "/tmp/h2_est_dados_"

EXCL_DIRS = {"node_modules", ".venv", ".next", "dist", "build", "__pycache__", ".git", "test-results",
             "playwright-report", "coverage", ".turbo"}
EXCL_PREFIX = ("design/handoff-v4.6", "docs/handoff", "docs/parciais/h1/prototipo")
EXCL_SUFFIX = (".lock", "pnpm-lock.yaml", "uv.lock", ".tsbuildinfo", ".png", ".jpg", ".jpeg", ".gif", ".webp",
               ".ico", ".pdf", ".woff", ".woff2", ".ttf", ".zip", ".gz", ".mp4", ".webm", ".pyc")
EXCLUIDOS = Counter()


def excluded(rel):
    parts = rel.split("/")
    if any(p in EXCL_DIRS for p in parts):
        EXCLUIDOS[next(p for p in parts if p in EXCL_DIRS)] += 1
        return True
    if rel.startswith(EXCL_PREFIX) or any(("handoff" in p.lower() or "prototip" in p.lower()) for p in parts[:-1]):
        EXCLUIDOS["handoff/prototipo"] += 1
        return True
    if rel.endswith(EXCL_SUFFIX):
        EXCLUIDOS["lock/binario"] += 1
        return True
    return False


def walk(rel_dir, pred=lambda r: True):
    base = os.path.join(ROOT, rel_dir)
    if os.path.isfile(base):
        if not excluded(rel_dir) and pred(rel_dir):
            yield rel_dir
        return
    for dp, dns, fns in os.walk(base):
        dns[:] = [d for d in dns if d not in EXCL_DIRS]
        for fn in fns:
            rel = os.path.relpath(os.path.join(dp, fn), ROOT).replace(os.sep, "/")
            if not excluded(rel) and pred(rel):
                yield rel


def read(rel):
    p = os.path.join(ROOT, rel)
    if os.path.getsize(p) > 3_000_000:
        return ""
    with open(p, encoding="utf-8", errors="replace") as fh:
        return fh.read()


def is_test(rel):
    return re.search(r"\.test\.[a-z]+$", rel) is not None


# ---------------------------------------------------------------- escopos
def scope7():
    files = {}

    def add(gen, tag):
        for r in gen:
            files.setdefault(r, tag)
    add(walk("supabase/seed.sql"), "seed")
    for d in sorted(os.listdir(os.path.join(ROOT, "supabase"))):
        if d.startswith("seed") and os.path.isdir(os.path.join(ROOT, "supabase", d)):
            add(walk("supabase/" + d), "seed")
    add(walk("apps/backend/src/hellosquad/llm/fixtures"), "fixture")
    add(walk("apps/web/messages"), "catalogo")
    add(walk("apps/web/content"), "site")
    add(walk("apps/backend/src/hellosquad/i18n", lambda r: r.endswith(".json")), "catalogo_backend")
    add(walk("apps/backend/src/hellosquad/email"), "email")
    add(walk(".", lambda r: r.lower().endswith(".csv")), "csv")
    add(walk("squad"), "squad")
    add(walk("apps/backend/tests"), "teste")
    add(walk("apps/web/e2e"), "teste")
    add(walk("apps/web/test"), "teste")
    add(walk("apps/web", is_test), "teste")
    add(walk("supabase/tests"), "teste")
    add(walk("packages", lambda r: "/tests/" in r or is_test(r)), "teste")
    add(walk("docs/parciais", lambda r: r.endswith(".txt")), "parcial_txt")
    return files


def scope8():
    files = {}
    for d, tag in (("apps/web/messages", "catalogo"), ("apps/backend/src/hellosquad/llm/fixtures", "fixture"),
                   ("apps/web/content", "site"), ("apps/backend/src/hellosquad/i18n", "catalogo_backend"),
                   ("apps/backend/src/hellosquad/email", "email"),
                   ("squad", "squad"), ("supabase/seed.sql", "seed"), ("apps/web/app", "web_app"),
                   ("apps/web/components", "web_components"), ("apps/web/lib", "web_lib")):
        for r in walk(d):
            files.setdefault(r, tag)
    return files


# ---------------------------------------------------------------- item 7
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
CPF_RE = re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")
CNPJ_RE = re.compile(r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b")
PH_RES = (re.compile(r"\+?55\s?\(?\d{2}\)?\s?9?\d{4}-?\d{4}"), re.compile(r"\(\d{2}\)\s?9?\d{4}-?\d{4}"))
FICT_PH = re.compile(r"^\+55 11 99999-00\d{2}$")
FICT_DIGITS = re.compile(r"^55119999900\d{2}$")

CI_BRANDS = ["Nike", "Natura", "Magalu", "Magazine Luiza", "Itaú", "Itau", "Nubank", "Ambev", "Coca-Cola", "Coca Cola",
             "iFood", "Boticário", "Boticario", "Havaianas", "Renner", "Riachuelo", "Americanas", "Mercado Livre",
             "Shopee", "Amazon", "Apple", "Samsung", "Google", "McDonald", "Starbucks", "Heineken", "Petrobras",
             "Bradesco", "Santander", "Instagram", "Facebook", "TikTok", "LinkedIn", "WhatsApp", "YouTube",
             "Pinterest", "Twitter", "Shopify", "Nuvemshop", "Hotmart", "RD Station", "HubSpot", "Mailchimp", "Canva",
             "Rappi", "Uber", "Netflix", "Spotify", "Microsoft", "Adobe", "Bauducco", "Wickbold", "Pullman",
             "Seven Boys", "Bella Paulista", "Le Pain Quotidien", "Cacau Show", "Kopenhagen", "Burger King",
             "Caloi", "Specialized", "Shimano", "Tembici", "Decathlon", "Sephora", "L'Oréal", "Loreal", "Nivea",
             "La Roche-Posay", "Eudora", "Avon", "Jequiti", "Mary Kay", "Asaas", "Mercado Pago", "Supabase",
             "Vercel", "Railway", "Anthropic", "OpenAI", "Stripe", "PagSeguro", "Stone", "Cielo", "Hostinger"]
CS_BRANDS = ["Meta", "Vivo", "Claro", "Tim", "TIM", "Vale", "Caixa", "XP", "Trek", "Oggi", "Sense", "Dove"]
CANAL = {"Instagram", "Facebook", "TikTok", "LinkedIn", "WhatsApp", "YouTube", "Pinterest", "Twitter", "Google", "Meta"}
INFRA = {"Asaas", "Mercado Pago", "Supabase", "Vercel", "Railway", "Anthropic", "OpenAI", "Stripe", "PagSeguro",
         "Stone", "Cielo", "Hostinger"}
BRAND_RES = [(b, re.compile(r"(?<![\w@./-])" + re.escape(b) + r"(?![\w])", re.I)) for b in CI_BRANDS] + \
            [(b, re.compile(r"(?<![\w@./-])" + re.escape(b) + r"(?![\w])")) for b in CS_BRANDS]


def cpf_ok(d):
    if len(d) != 11 or d == d[0] * 11:
        return False
    for n in (9, 10):
        s = sum(int(d[i]) * (n + 1 - i) for i in range(n))
        if (s * 10 % 11) % 10 != int(d[n]):
            return False
    return True


def cnpj_ok(d):
    if len(d) != 14 or d == d[0] * 14:
        return False
    for n in (12, 13):
        w = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2][13 - n:]
        s = sum(int(d[i]) * w[i] for i in range(n))
        r = s % 11
        if (0 if r < 2 else 11 - r) != int(d[n]):
            return False
    return True


def item7(files):
    em, docs, ph, br = [], [], [], []
    for rel, tag in sorted(files.items()):
        for ln, line in enumerate(read(rel).splitlines(), 1):
            ctx = line.strip()[:170]
            for m in EMAIL_RE.finditer(line):
                e = m.group(0).rstrip(".")
                dom = e.split("@", 1)[1].lower()
                if not dom.endswith(".example"):
                    em.append((tag, rel, ln, e, ctx))
            for kind, rx, val in (("CPF", CPF_RE, cpf_ok), ("CNPJ", CNPJ_RE, cnpj_ok)):
                for m in rx.finditer(line):
                    raw = m.group(0)
                    d = re.sub(r"\D", "", raw)
                    fmt = bool(re.search(r"[./-]", raw))
                    docs.append((tag, rel, ln, kind, raw, "formatado" if fmt else "so_digitos",
                                 "DV_valido" if val(d) else "DV_invalido", ctx))
            seen = set()
            for rx in PH_RES:
                for m in rx.finditer(line):
                    raw = m.group(0)
                    a, b = m.start(), m.end()
                    if (a, raw) in seen:
                        continue
                    seen.add((a, raw))
                    pre = line[a - 1] if a > 0 else " "
                    post = line[b] if b < len(line) else " "
                    if re.match(r"[0-9A-Za-z_-]", pre) or re.match(r"[0-9A-Za-z_]", post):
                        continue  # dentro de hash/uuid/numero maior
                    d = re.sub(r"\D", "", raw)
                    if FICT_PH.match(raw.strip()) or FICT_DIGITS.match(d):
                        continue
                    ph.append((tag, rel, ln, raw, ctx))
            for b, rx in BRAND_RES:
                for m in rx.finditer(line):
                    kind = "canal" if b in CANAL else ("infra/pagamento" if b in INFRA else "marca")
                    br.append((tag, rel, ln, b, kind, ctx))
    with open(OUT + "emails_nao_example.txt", "w") as fh:
        for t in em:
            fh.write("%s\t%s:%d\t%s\t| %s\n" % t)
    with open(OUT + "cpf_cnpj.txt", "w") as fh:
        for t in docs:
            fh.write("%s\t%s:%d\t%s\t%s\t%s\t%s\t| %s\n" % t)
    with open(OUT + "telefones.txt", "w") as fh:
        for t in ph:
            fh.write("%s\t%s:%d\t%s\t| %s\n" % t)
    with open(OUT + "marcas.txt", "w") as fh:
        for t in br:
            fh.write("%s\t%s:%d\t%s\t%s\t| %s\n" % t)
    print("[7] arquivos no escopo:", len(files), dict(Counter(files.values())))
    print("[7] e-mails fora de .example:", len(em), "dominios:", dict(Counter(e[3].split("@")[1].lower() for e in em)))
    print("[7] e-mails por escopo:", dict(Counter(e[0] for e in em)))
    print("[7] CPF/CNPJ candidatos:", len(docs), dict(Counter((d[3], d[5], d[6]) for d in docs)))
    print("[7] telefones fora do padrao ficticio:", len(ph), dict(Counter(p[0] for p in ph)))
    for p in ph[:12]:
        print("    tel", "%s:%d" % (p[1], p[2]), repr(p[3]))
    marca_por = defaultdict(Counter)
    for t in br:
        marca_por[(t[4], t[3])][t[0]] += 1
    print("[7] marcas citadas (tipo, marca) -> escopos:")
    for k in sorted(marca_por):
        print("   ", k, dict(marca_por[k]))


# ---------------------------------------------------------------- item 8
EMOJI_RANGES = ((0x1F000, 0x1FAFF), (0x2600, 0x27BF), (0x2B00, 0x2BFF), (0xFE0F, 0xFE0F), (0x1F1E6, 0x1F1FF),
                (0x2300, 0x23FF))


def is_emoji(ch):
    o = ord(ch)
    return any(a <= o <= b for a, b in EMOJI_RANGES)


EN_STRICT = ["loading", "error", "submit", "cancel", "save", "settings", "dashboard", "sign in", "sign up", "log out",
             "logout", "delete", "edit", "search", "back", "next", "done", "welcome", "untitled", "unknown", "close",
             "retry", "confirm", "success", "failed", "warning", "please", "click", "the", "and", "your", "you",
             "with", "for", "this", "that", "new", "add", "remove", "view", "more", "show", "hide", "select", "send",
             "open", "update", "created", "updated", "deleted", "something went wrong", "not found", "try again",
             "page", "home", "profile", "account", "password", "is", "are", "of", "to", "from", "here", "there"]
EN_RE = re.compile(r"(?<![\w-])(" + "|".join(re.escape(w) for w in EN_STRICT) + r")(?![\w-])", re.I)
PT_RE = re.compile(r"[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]|(?<!\w)(de|da|do|das|dos|para|com|não|nao|uma|um|os|as|sua|seu|você|"
                   r"voce|em|na|no|que|por|mais|ainda|sem|ao|aos|pelo|pela|isso|esse|essa|está|esta)(?!\w)", re.I)
ACCEPT_WORDS = {"hellosquad", "nexo", "otto", "bia", "kaia", "kiwi", "max", "íris", "iris", "miolo", "vitta",
                "trilha urbana", "ok"}


def classify(txt):
    s = txt.strip()
    low = s.lower()
    if not re.search(r"[A-Za-zÀ-ÿ]", s):
        return "c_tecnico"
    if low in ACCEPT_WORDS or re.fullmatch(r"[\w./:#@?&=%+-]+", s) and not re.search(r"[A-ZÀ-Ý]", s[:1]):
        return "c_tecnico"
    if re.fullmatch(r"[a-z]+(\.[A-Za-z0-9_]+)+", s):
        return "c_chave"
    en = len(EN_RE.findall(s))
    pt = len(PT_RE.findall(s))
    if en and en >= pt:
        return "a_ingles"
    if pt:
        return "b_ptbr_fixo"
    words = s.split()
    if len(words) == 1 and s[:1].isupper() and low not in ACCEPT_WORDS:
        return "d_palavra_unica"
    return "d_indeterminado"


ATTR_RE = re.compile(r"\b(placeholder|aria-label|title|alt|label|aria-description|aria-roledescription|"
                     r"aria-valuetext)\s*=\s*\{?\s*([\"'`])((?:(?!\2).)*?)\2")
PROP_RE = re.compile(r"\b(label|title|description|placeholder|message|text|heading|subtitle|tooltip|hint|caption|"
                     r"ariaLabel|cta|emptyText|helperText)\s*:\s*([\"'`])((?:(?!\2).)*?)\2")
CALL_RE = re.compile(r"\b(toast(?:\.\w+)?|new Error|alert|confirm|set(?:Error|Message|Status|Erro|Mensagem|Notice|"
                     r"Feedback|Aviso))\(\s*([\"'`])((?:(?!\2).)*?)\2")
JSX_TXT_RE = re.compile(r"(?<![=\-])>([^<>{}`]*[A-Za-zÀ-ÿ][^<>{}`]*)<(?=/|[A-Za-z])")
CODEY = re.compile(r"[=;(){}]|&&|\|\||^\s*(import|export|return|const|let|var|type|interface|case|default|if|else)\b")


def ui_literals(files):
    rows = []
    for rel, tag in sorted(files.items()):
        if tag not in ("web_app", "web_components", "web_lib") or not re.search(r"\.(tsx|ts|jsx|js)$", rel):
            continue
        if is_test(rel) or rel.endswith(".d.ts"):
            continue
        lines = read(rel).splitlines()
        prev = ""
        in_block = False
        for ln, line in enumerate(lines, 1):
            st = line.strip()
            if st.startswith("/*"):
                in_block = True
            if in_block or st.startswith("//") or st.startswith("*"):
                if "*/" in st:
                    in_block = False
                continue
            found = []
            for rx, kind in ((ATTR_RE, "attr"), (PROP_RE, "prop"), (CALL_RE, "call")):
                for m in rx.finditer(line):
                    lit = m.group(3)
                    if "${" in lit and not re.sub(r"\$\{[^}]*\}", "", lit).strip():
                        continue
                    found.append((kind + ":" + m.group(1), lit))
            if rel.endswith((".tsx", ".jsx")):
                for m in JSX_TXT_RE.finditer(line):
                    lit = m.group(1)
                    if CODEY.search(lit) or not lit.strip():
                        continue
                    found.append(("jsx_text", lit))
                if (st and not CODEY.search(st) and not re.search(r"[<>\"'`]", st)
                        and re.search(r"[A-Za-zÀ-ÿ]{2,}", st) and prev.endswith(">") and not prev.endswith("=>")
                        and len(st.split()) >= 1 and not re.fullmatch(r"[\w.]+", st)):
                    found.append(("jsx_text_ml", st))
            for kind, lit in found:
                rows.append((classify(lit), rel, ln, kind, lit.strip()[:120]))
            if st:
                prev = st
    with open(OUT + "ui_literais.txt", "w") as fh:
        for r in sorted(rows):
            fh.write("%s\t%s:%d\t%s\t%s\n" % r)
    print("[8] literais de UI fora do catalogo (classe -> n):", dict(Counter(r[0] for r in rows)))
    for cls in ("a_ingles", "b_ptbr_fixo"):
        sel = [r for r in rows if r[0] == cls]
        print("    %s: %d em %d arquivos" % (cls, len(sel), len({r[1] for r in sel})))


def flatten(obj, pref=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from flatten(v, pref + "." + str(k) if pref else str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from flatten(v, "%s[%d]" % (pref, i))
    else:
        yield pref, obj


def catalog_and_keys():
    cat = {}
    bad = []
    mdir = "apps/web/messages/pt-BR"
    for fn in sorted(os.listdir(os.path.join(ROOT, mdir))):
        if fn.endswith(".json"):
            ns = fn[:-5]
            with open(os.path.join(ROOT, mdir, fn), encoding="utf-8") as fh:
                data = json.load(fh)
            for k, v in flatten(data, ns):
                cat[k] = v
    for k, v in cat.items():
        if not isinstance(v, str):
            continue
        leaf = k.split(".")[-1]
        sv = re.sub(r"\{[^}]*\}", " ", v)  # remove placeholders ICU
        sv = re.sub(r"<[^>]*>", " ", sv)
        if not v.strip() or v.strip() == leaf or re.fullmatch(r"[a-z]+(\.[A-Za-z0-9_]+)+", v.strip()) or \
                re.search(r"\b(TODO|TBD|FIXME|XXX|lorem)\b", v, re.I):
            bad.append(("sem_traducao", k, v[:120]))
            continue
        en = EN_RE.findall(sv)
        if en:
            bad.append(("ingles?:" + ",".join(sorted({e.lower() for e in en})), k, v[:120]))
    # chaves usadas no codigo que nao existem no catalogo
    prefixes = set()
    for k in cat:
        parts = re.split(r"\.", re.sub(r"\[\d+\]", "", k))
        for i in range(1, len(parts) + 1):
            prefixes.add(".".join(parts[:i]))
    missing = []
    decl = re.compile(r"(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:[\"']"
                      r"([\w.]+)[\"']|\{[^}]*namespace:\s*[\"']([\w.]+)[\"'][^}]*\})?\s*\)")
    for d in ("apps/web/app", "apps/web/components", "apps/web/lib"):
        for rel in walk(d, lambda r: r.endswith((".ts", ".tsx")) and not is_test(r)):
            src = read(rel)
            for m in decl.finditer(src):
                var, ns = m.group(1), m.group(2) or m.group(3) or ""
                call = re.compile(r"(?<![\w.])" + re.escape(var) + r"(?:\.rich|\.raw|\.markup|\.has)?\(\s*[\"']([\w.]+)[\"']")
                for c in call.finditer(src):
                    full = (ns + "." if ns else "") + c.group(1)
                    if full not in prefixes:
                        ln = src.count("\n", 0, c.start()) + 1
                        missing.append((rel, ln, full))
    with open(OUT + "catalogo_achados.txt", "w") as fh:
        for b in bad:
            fh.write("%s\t%s\t%s\n" % b)
        for mm in missing:
            fh.write("chave_ausente\t%s:%d\t%s\n" % mm)
    print("[8] catalogo: %d chaves; suspeitas de ingles: %d; sem traducao: %d; chaves usadas e ausentes: %d" % (
        len(cat), sum(1 for b in bad if b[0].startswith("ingles")), sum(1 for b in bad if b[0] == "sem_traducao"),
        len(missing)))
    for mm in missing[:10]:
        print("    ausente %s:%d %s" % mm)


def emojis(files, label):
    rows = []
    for rel, tag in sorted(files.items()):
        for ln, line in enumerate(read(rel).splitlines(), 1):
            for ch in line:
                if is_emoji(ch):
                    rows.append((tag, rel, ln, ch, "U+%04X" % ord(ch)))
    with open(OUT + "emoji_" + label + ".txt", "w") as fh:
        for r in rows:
            fh.write("%s\t%s:%d\t%s\t%s\n" % r)
    per_file = Counter(r[1] for r in rows)
    print("[8] emoji (%s): %d ocorrencias em %d arquivos; por escopo %s; codepoints %s" % (
        label, len(rows), len(per_file), dict(Counter(r[0] for r in rows)), dict(Counter(r[4] for r in rows))))
    for f, n in per_file.most_common(12):
        first = next(r for r in rows if r[1] == f)
        print("    %s: %d (1a em %s:%d %s)" % (f, n, f, first[2], first[4]))


def english_text(files, tags):
    rows = []
    for rel, tag in sorted(files.items()):
        if tag not in tags:
            continue
        if rel.endswith(".json"):
            try:
                data = json.loads(read(rel))
            except ValueError:
                continue
            items = [(k, v) for k, v in flatten(data) if isinstance(v, str)]
        else:
            items = [(str(i), l) for i, l in enumerate(read(rel).splitlines(), 1)]
        for k, v in items:
            en = len(EN_RE.findall(v))
            pt = len(PT_RE.findall(v))
            if en >= 3 and en > pt:
                rows.append((tag, rel, k, v.strip()[:150]))
    with open(OUT + "ingles_fixture_squad_seed.txt", "w") as fh:
        for r in rows:
            fh.write("%s\t%s:%s\t%s\n" % r)
    print("[8] trechos com cara de ingles (fixtures/squad/seed):", len(rows), dict(Counter(r[0] for r in rows)))
    for r in rows[:10]:
        print("    %s:%s" % (r[1], r[2]))


def commits():
    raw = subprocess.run(["git", "-C", ROOT, "log", "--since=2026-10-16 00:00", "--format=%h %s%n%b"],
                         capture_output=True, text=True).stdout
    with open(OUT + "commits.txt", "w") as fh:
        fh.write(raw)
    rec = subprocess.run(["git", "-C", ROOT, "log", "--since=2026-10-16 00:00", "--format=%h%x1f%s%x1f%b%x1e"],
                         capture_output=True, text=True).stdout
    found, eng = [], []
    total = 0
    for r in rec.split("\x1e"):
        r = r.strip("\n")
        if not r:
            continue
        total += 1
        h, s, b = (r.split("\x1f") + ["", ""])[:3]
        em = [c for c in s + b if is_emoji(c)]
        if em:
            found.append((h, "".join(sorted(set(em))), s[:80]))
        subj = re.sub(r"^\w+(\([^)]*\))?!?:\s*", "", s)
        if len(EN_RE.findall(subj)) >= 2 and not PT_RE.search(subj):
            eng.append((h, s[:80]))
    with open(OUT + "commits_achados.txt", "w") as fh:
        for f in found:
            fh.write("emoji\t%s\t%s\t%s\n" % f)
        for e in eng:
            fh.write("ingles\t%s\t%s\n" % e)
    print("[8] commits desde 2026-10-16: %d; com emoji: %d; assunto com cara de ingles: %d" % (
        total, len(found), len(eng)))
    for f in found[:10]:
        print("    emoji %s %s" % (f[0], " ".join("U+%04X" % ord(c) for c in f[1])))


def main():
    f7 = scope7()
    item7(f7)
    f8 = scope8()
    print("[8] arquivos no escopo:", len(f8), dict(Counter(f8.values())))
    emojis(f8, "escopo8")
    extra = {}
    for d in ("apps", "packages", "supabase", "squad", "infra"):
        for r in walk(d):
            extra.setdefault(r, d)
    emojis(extra, "produto_todo")
    tests7 = {r: t for r, t in f7.items() if t in ("teste", "parcial_txt")}
    emojis(tests7, "testes_e_txt")
    ui_literals(f8)
    catalog_and_keys()
    english_text(f8, ("fixture", "squad", "seed"))
    commits()
    print("[*] excluidos (motivo -> arquivos):", dict(EXCLUIDOS))


if __name__ == "__main__":
    main()
