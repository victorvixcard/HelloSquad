"""Gera app/data-squad.js a partir das fontes do repositório (só leitura).

Fontes: squad/*/agent.yaml, squad/*/SOUL.md, squad/*/skills/*.md, a seção de regras
compartilhadas de squad/README.md (mesmo recorte do backend) e o catálogo de deliveries
do handoff. Rodar da raiz do repositório: python3 design/super-admin-proto/tools/gerar_dados.py
"""

import csv
import hashlib
import json
import re
import subprocess
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[3]
SQUAD = ROOT / "squad"
CSV = ROOT / "design/handoff-v4.6/documentacao/catalogo_46_deliveries_23_integracoes.csv"
OUT = ROOT / "design/super-admin-proto/app/data-squad.js"
TOKENS = ROOT / "design/super-admin-proto/ds/hellosquad/tokens.json"
TOKENS_CSS = ROOT / "design/super-admin-proto/app/tokens.css"
ORDER = ["nexo", "bia", "kaia", "otto", "kiwi", "max", "iris"]
SHARED_RULES_HEADING = "## Regras que todos os agentes compartilham"
FRONT_MATTER = re.compile(r"^---\n(.*?)\n---\n", re.S)


def git_date(path: Path) -> str:
    out = subprocess.run(
        ["git", "log", "-1", "--format=%cs", "--", str(path.relative_to(ROOT))],
        cwd=ROOT, capture_output=True, text=True, check=False,
    ).stdout.strip()
    return out or ""


def words(text: str) -> int:
    return len(re.findall(r"\S+", text))


def yaml_comments(raw: str) -> dict:
    """Comentários de linha do agent.yaml (o PyYAML descarta): chave/item -> comentário."""
    notes = {}
    for line in raw.splitlines():
        m = re.match(r"^\s*(?:-\s*)?([\w.\"]+)\s*:?\s*[^#]*?\s#\s*(.+)$", line)
        if m:
            notes[m.group(1).strip('"')] = m.group(2).strip()
    return notes


def soul_sections(text: str) -> tuple[str, list[dict]]:
    lines = text.strip().splitlines()
    title = lines[0].lstrip("# ").strip()
    body = "\n".join(lines[1:]).strip()
    parts = re.split(r"^## +(.+)$", body, flags=re.M)
    sections = []
    intro = parts[0].strip()
    if intro:
        sections.append({"titulo": "Identidade", "texto": intro})
    for i in range(1, len(parts), 2):
        sections.append({"titulo": parts[i].strip(), "texto": parts[i + 1].strip()})
    for s in sections:
        s["palavras"] = words(s["texto"])
        s["caracteres"] = len(s["texto"])
    return title, sections


def skill(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    m = FRONT_MATTER.match(raw)
    meta = (yaml.safe_load(m.group(1)) or {}) if m else {}
    body = raw[m.end():] if m else raw
    return {
        "meta": meta,
        "corpo": body.strip(),
        "caracteres": len(body.strip()),
        "data": git_date(path),
        "hash": hashlib.sha256(raw.encode("utf-8")).hexdigest()[:7],
    }


def shared_rules() -> str:
    readme = (SQUAD / "README.md").read_text(encoding="utf-8")
    start = readme.find(SHARED_RULES_HEADING)
    end = readme.find("\n## ", start + len(SHARED_RULES_HEADING))
    return readme[start:end if end != -1 else None].strip()


def catalog() -> tuple[list[dict], list[dict]]:
    deliveries, integrations = [], []
    group = ""
    with CSV.open(encoding="utf-8-sig", newline="") as fh:
        for row in csv.DictReader(fh, delimiter=";"):
            if row["agente"].strip():
                group = row["agente"].strip()
            item = {
                "id": row["id"].strip(),
                "grupo": group,
                "nome": row["nome"].strip(),
                "resultado": row["resultado"].strip(),
                "dono": row["dono"].strip(),
                "status": row["status"].strip(),
                "integracoes": row["integracoes"].strip(),
                "prerequisitos": row["prerequisitos"].strip(),
            }
            (deliveries if int(item["id"].split(".")[0]) <= 7 else integrations).append(item)
    return deliveries, integrations


def tokens_css() -> None:
    """tokens.css a partir do tokens.json copiado do handoff (o bundle.css traz só cores e movimento)."""
    t = json.loads(TOKENS.read_text(encoding="utf-8"))
    lines = ["/* Gerado por tools/gerar_dados.py a partir de ds/hellosquad/tokens.json. Não editar à mão. */", ":root{"]
    for group in ("color", "spacing", "radius", "shadow", "duration", "easing"):
        for tok in t[group]["tokens"]:
            value = tok["value"]
            if isinstance(value, str) and value.startswith("{") and value.endswith("}"):
                value = f"var(--{value[1:-1]})"
            lines.append(f"  --{tok['name']}: {value};")
    lines.append("}")
    TOKENS_CSS.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    tokens_css()
    agents = []
    for aid in ORDER:
        ypath, spath = SQUAD / aid / "agent.yaml", SQUAD / aid / "SOUL.md"
        raw = ypath.read_text(encoding="utf-8")
        cfg = yaml.safe_load(raw)
        soul_text = spath.read_text(encoding="utf-8")
        title, sections = soul_sections(soul_text)
        skills = {p.stem: skill(p) for p in sorted((SQUAD / aid / "skills").glob("*.md"))}
        for d in skills:
            # mesmo hash que o backend grava em agent_prompt_versions (squad/loader.py: manifest dos arquivos lidos)
            files = {rel: hashlib.sha256((SQUAD / rel).read_bytes()).hexdigest() for rel in
                     ("README.md", f"{aid}/agent.yaml", f"{aid}/SOUL.md", f"{aid}/skills/{d}.md")}
            manifest = "".join(f"{path}\n{digest}\n" for path, digest in sorted(files.items()))
            skills[d]["promptHash"] = hashlib.sha256(manifest.encode("utf-8")).hexdigest()
        agents.append({
            **cfg,
            "notas": yaml_comments(raw),
            "soul": {
                "titulo": title,
                "texto": soul_text.strip(),
                "secoes": sections,
                "caracteres": len(soul_text.strip()),
                "data": git_date(spath),
                "hash": hashlib.sha256(soul_text.encode("utf-8")).hexdigest()[:7],
            },
            "yaml": {"data": git_date(ypath), "hash": hashlib.sha256(raw.encode("utf-8")).hexdigest()[:7]},
            "skills": skills,
        })
    deliveries, integrations = catalog()
    data = {
        "agentes": agents,
        "regrasCompartilhadas": shared_rules(),
        "deliveries": deliveries,
        "integracoes": integrations,
    }
    js = (
        "/* Gerado por tools/gerar_dados.py a partir de squad/ e do catálogo do handoff. Não editar à mão. */\n"
        "window.SA_SQUAD = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n"
    )
    OUT.write_text(js, encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)}: {len(agents)} agentes, {len(deliveries)} deliveries, "
          f"{len(integrations)} integrações, {sum(len(a['skills']) for a in agents)} skills")


if __name__ == "__main__":
    main()
