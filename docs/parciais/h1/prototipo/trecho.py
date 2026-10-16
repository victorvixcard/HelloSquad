#!/usr/bin/env python3
"""H1 · extrai trechos curtos do protótipo (nunca o arquivo inteiro).
Uso: python3 trecho.py <regex> [contexto=90] [max=8] [arquivo=/tmp/h1_proto_ui.html]
Imprime: L<linha>: …trecho…"""
import re, sys
pat = re.compile(sys.argv[1])
ctx = int(sys.argv[2]) if len(sys.argv) > 2 else 90
mx = int(sys.argv[3]) if len(sys.argv) > 3 else 8
path = sys.argv[4] if len(sys.argv) > 4 else "/tmp/h1_proto_ui.html"
n = 0
with open(path, encoding="utf-8") as f:
    for i, line in enumerate(f, 1):
        for m in pat.finditer(line):
            s, e = max(0, m.start() - ctx), min(len(line), m.end() + ctx)
            print(f"L{i}: …{line[s:e].strip()}…")
            n += 1
            if n >= mx:
                sys.exit(0)
