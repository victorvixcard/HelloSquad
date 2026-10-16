#!/usr/bin/env python3
"""X1 · confere se cada texto entre aspas de docs/FLUXOS_DA_V46.md existe literalmente no protótipo.

Uso: python3 docs/parciais/x1/verifica_rotulos.py
Saída: contagem e a lista dos que não casam (gravada em docs/parciais/x1/verifica_rotulos.txt).
Rótulos montados pelo código (com <…>, N, {…}, "…") são normalizados antes da busca, em partes.
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SRC = [ROOT / "design/handoff-v4.6/product-ui/ProductUIV4.dc.html", ROOT / "design/handoff-v4.6/landing/LandingPageV1.dc.html"]
corpus = "\n".join(p.read_text(encoding="utf-8") for p in SRC)
corpus_u = html.unescape(corpus).replace("\\n", "\n")
corpus_n = re.sub(r"\s+", " ", corpus_u)
doc = (ROOT / "docs/FLUXOS_DA_V46.md").read_text(encoding="utf-8")
quotes = re.findall(r'"([^"\n]{2,400})"', doc)
ok, miss, parts_ok = 0, [], 0
for q in quotes:
    if q.startswith(("docs/", "design/", "http")):
        continue
    qn = re.sub(r"\s+", " ", q)
    if qn in corpus_n:
        ok += 1
        continue
    # rótulo montado: quebra nos marcadores e exige que cada pedaço com 4+ caracteres exista
    pieces = [p.strip(" ,.:·") for p in re.split(r"<[^>]*>|\bN\b|\{[^}]*\}|…|\bv\d\b|HH:MM|hh:mm", qn)]
    pieces = [p for p in pieces if len(p) >= 4]
    if pieces and all(p in corpus_n for p in pieces):
        parts_ok += 1
        continue
    miss.append(q)
out = [f"aspas verificadas: {ok + parts_ok + len(miss)}", f"literais: {ok}", f"montadas (todas as partes existem): {parts_ok}", f"não encontradas: {len(miss)}", ""]
out += [f"- {m}" for m in miss]
(Path(__file__).resolve().parent / "verifica_rotulos.txt").write_text("\n".join(out) + "\n", encoding="utf-8")
print("\n".join(out[:4]))
