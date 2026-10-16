"""A2b · junta proto-<nome>.png e nosso-<nome>.png em lado-a-lado-<nome>.png (protótipo à esquerda, produto à direita).
Uso: python3 docs/parciais/a2b/compor.py  (compõe todos os pares que existirem na pasta)."""
from pathlib import Path
from PIL import Image, ImageDraw

DIR = Path(__file__).resolve().parent
for proto in sorted(DIR.glob("proto-*.png")):
    name = proto.name[len("proto-"):]
    ours = DIR / f"nosso-{name}"
    if not ours.exists():
        continue
    a, b = Image.open(proto).convert("RGB"), Image.open(ours).convert("RGB")
    h = max(a.height, b.height)
    out = Image.new("RGB", (a.width + b.width + 24, h + 40), "white")
    out.paste(a, (0, 40))
    out.paste(b, (a.width + 24, 40))
    d = ImageDraw.Draw(out)
    d.text((12, 12), "V4.6 (protótipo, 8010)", fill="black")
    d.text((a.width + 36, 12), "HelloSquad (A2b, 3100)", fill="black")
    out = out.resize((out.width // 2, out.height // 2))
    out.save(DIR / f"lado-a-lado-{name}")
    print("ok", name)
