# SA7b: monta o lado a lado (SA0 à esquerda, HelloSquad à direita), cada lado a 50% (720×450), como na SA6b.
from pathlib import Path

from PIL import Image, ImageDraw

SA0 = Path("/tmp/sa7b/sa0")
OURS = Path("/tmp/sa7b/shots")
OUT = Path(__file__).resolve().parent
NAMES = ["catalogo", "catalogo-otto", "pagamentos", "pagamentos-webhooks", "auditoria", "saude"]
W, H, GAP, BAR = 720, 450, 12, 24

for name in NAMES:
    left = Image.open(SA0 / f"sa0-{name}.png").convert("RGB").resize((W, H), Image.LANCZOS)
    right = Image.open(OURS / f"sa7b-{name}.png").convert("RGB").resize((W, H), Image.LANCZOS)
    canvas = Image.new("RGB", (W * 2 + GAP, H + BAR), (247, 247, 245))
    draw = ImageDraw.Draw(canvas)
    draw.text((8, 6), f"SA0 · {name}", fill=(15, 13, 34))
    draw.text((W + GAP + 8, 6), f"HelloSquad (SA7b, seed) · {name}", fill=(15, 13, 34))
    canvas.paste(left, (0, BAR))
    canvas.paste(right, (W + GAP, BAR))
    canvas.save(OUT / f"lado-a-lado-{name}.png", optimize=True)
    print(f"lado-a-lado-{name}.png {canvas.size}")
