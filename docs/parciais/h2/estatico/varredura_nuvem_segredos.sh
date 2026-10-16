#!/usr/bin/env bash
# varredura_nuvem_segredos.sh -- Auditoria H2 (copia adaptada da H1): nuvem e segredos, inclui Asaas, Mercado Pago, webhook, senhas.
# SOMENTE LEITURA: nao altera o repositorio, o indice git nem o banco. Nao faz rede.
# Saidas brutas em /tmp/h1_est_b1_*. Na saida padrao imprime apenas contagens e arquivo:linha MASCARADOS.
# Uso: bash docs/parciais/h2/estatico/varredura_nuvem_segredos.sh > /tmp/h2_est_seg_saida.txt
# Observacoes:
#  - Este proprio script e excluido das varreduras (ele contem os padroes literalmente).
#  - As chaves default publicas do Supabase CLI sao comparadas por sha256 (o script nao as contem).
set -u
export LC_ALL=C
REPO="${REPO:-/home/vitao/projetos/hellosquad}"
cd "$REPO" || exit 1
T=/tmp/h2_est_seg
SELF='docs/parciais/h[12]/estatico/varredura_nuvem_segredos'
EXCL='(^|/)(node_modules|\.venv|\.next)/'

mask() {
  sed -E \
    -e 's/(eyJ[A-Za-z0-9_-]{6})[A-Za-z0-9_.-]+/\1***MASK***/g' \
    -e 's/(sb_(secret|publishable)_[A-Za-z0-9]{4})[A-Za-z0-9_-]+/\1***/g' \
    -e 's/(sk-ant-[a-z0-9]{3})[A-Za-z0-9_-]+/\1***/g' \
    -e 's/(APP_USR-[0-9a-f]{4})[0-9a-f-]+/\1***/g' -e 's/(TEST-[0-9]{4})[0-9a-f-]+/\1***/g' -e 's/(aact_[A-Za-z]{4})[A-Za-z0-9_$=-]+/\1***/g' \
    -e 's#(postgres(ql)?://[^:/@ "]+):postgres@#\1__PGDEF__@#g' \
    -e 's#(postgres(ql)?://[^:/@ "]+:)([^@ "]{2})[^@ "]*@#\1\3***@#g' \
    -e 's#__PGDEF__@#:postgres@#g' \
    -e 's/([Bb]earer[[:space:]]+[A-Za-z0-9]{4})[A-Za-z0-9._~+\/=-]{4,}/\1***/g' \
    -e "s/((apikey|api_key|access_token|refresh_token|provider_token|SERVICE_ROLE_KEY|ANON_KEY|SECRET_KEY|PUBLISHABLE_KEY|JWT_SECRET|API_KEY|PASSWORD|password)[\"']?[[:space:]]*[:=][[:space:]]*[\"']?)([A-Za-z0-9]{3})[A-Za-z0-9._~+\/=-]{5,}/\1\3***/g" \
    -e 's/(sb-[a-z0-9-]+-auth-token(\.[0-9]+)?=)([A-Za-z0-9]{6})[^; "]+/\1\3***/g' \
  | cut -c1-200
}

# ---------------------------------------------------------------- listas de arquivos
git -c core.quotePath=false ls-files -z -co --exclude-standard \
  | grep -zEv "$EXCL" | grep -zEv "^$SELF" > "$T.files0"
find docs/parciais -type f \( -iname '*.txt' -o -iname '*.log' -o -iname '*.json' -o -iname '*.har' -o -iname '*.md' \) \
  -not -path "docs/parciais/h1/estatico/varredura_nuvem_segredos*" -not -path "docs/parciais/h2/estatico/varredura_nuvem_segredos*" -print0 > "$T.ev_files0"
find docs/parciais -type f -iname '*.png' > "$T.png_todas.txt"
echo "== Inventario"
echo "arvore (ls-files -co --exclude-standard, sem node_modules/.venv/.next): $(tr -cd '\0' < "$T.files0" | wc -c) arquivos"
echo "docs/parciais em disco: txt=$(find docs/parciais -type f -iname '*.txt' | wc -l) evidencias(txt/log/json/har/md)=$(tr -cd '\0' < "$T.ev_files0" | wc -c) png=$(wc -l < "$T.png_todas.txt") ; rastreados em docs/parciais=$(git ls-files docs/parciais | wc -l)"

# ---------------------------------------------------------------- historico
git -c core.quotePath=false log -p --all --no-color --no-ext-diff > "$T.hist.txt" 2>/dev/null
echo "historico: $(git rev-list --all | wc -l) commits; $(wc -l < "$T.hist.txt") linhas em $T.hist.txt"

# ---------------------------------------------------------------- padroes (grupo, nome, flags, ERE POSIX)
cat > "$T.padroes.tsv" <<'EOF'
nuvem	supabase_co	-	supabase\.co([^a-zA-Z0-9]|$)
nuvem	supabase_co_sub	-	[a-z0-9-]+\.supabase\.co([^a-zA-Z0-9]|$)
nuvem	supabase_com	-	supabase\.com
nuvem	supabase_com_docs	-	supabase\.com/docs
nuvem	pooler_ou_supabase_in	-	pooler\.supabase\.com|supabase\.in([^a-zA-Z0-9]|$)
nuvem	railway	-	railway\.(app|com)
nuvem	vercel	-	vercel\.(app|com)
nuvem	api_anthropic	-	api\.anthropic\.com
segredo	jwt	-	eyJ[A-Za-z0-9_-]{20,}\.eyJ
segredo	sb_secret	-	sb_secret_[A-Za-z0-9_-]{10,}
segredo	sb_publishable	-	sb_publishable_[A-Za-z0-9_-]{10,}
segredo	sk_ant	-	sk-ant-
segredo	private_key	-	BEGIN .*PRIVATE KEY
segredo	pg_url_senha	-	postgres(ql)?://[^:/@ ]+:[^@ ]+@
segredo	auth_bearer	i	authorization["']?[[:space:]]*[:=][[:space:]]*["'`]?bearer
segredo	authorization_hdr	i	authorization:
segredo	apikey	i	apikey["']?[[:space:]]*:
segredo	access_token_val	-	access_token["']?[[:space:]]*[:=][[:space:]]*["']?[A-Za-z0-9._-]{16,}
segredo	refresh_token_val	-	refresh_token["']?[[:space:]]*[:=][[:space:]]*["']?[A-Za-z0-9._-]{8,}
segredo	env_chave_valor	-	(SERVICE_ROLE_KEY|JWT_SECRET|ANTHROPIC_API_KEY|SECRET_KEY|ANON_KEY|PUBLISHABLE_KEY|ASAAS_API_KEY|MERCADOPAGO_ACCESS_TOKEN|MP_ACCESS_TOKEN|WEBHOOK_SECRET|SMTP_PASSWORD|EMAIL_SMTP_PASSWORD)[[:space:]]*=[[:space:]]*["']?[^[:space:]"'$<{]{8,}
segredo	cookie_sb	i	(set-)?cookie:[[:space:]]*sb-|sb-[a-z0-9]+-auth-token
segredo	jwt_secret_default	-	super-secret-jwt-token-with-at-least
segredo	outros_tokens	-	ghp_[A-Za-z0-9]{20,}|github_pat_|xox[abp]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}
segredo	service_role	i	service_role
segredo	asaas	-	\$aact_|aact_(prod|hmlg|YTU|MzkwOD)[A-Za-z0-9_-]*
segredo	mp_app_usr	-	APP_USR-[0-9a-f-]{8,}
segredo	mp_test	-	TEST-[0-9]{6,}
segredo	webhook_secret	i	(webhook[_-]?(secret|token|signature|key)|whsec_)["']?[[:space:]]*[:=]?[[:space:]]*["']?[A-Za-z0-9_+/=-]{8,}
segredo	senha_literal	i	(password|senha|passwd|pwd)["']?[[:space:]]*[:=][[:space:]]*["'][^"']{6,}["']
EOF

echo
echo "== Contagens por padrao (linhas): arvore | historico (git log -p --all) | evidencias docs/parciais (todas em disco)"
while IFS=$'\t' read -r grupo nome flags re; do
  gf=(); [[ "$flags" == i ]] && gf=(-i)
  xargs -0 -r grep -HnIsE "${gf[@]}" -- "$re" < "$T.files0" > "$T.wt_$nome.txt" 2>/dev/null
  grep -hE "${gf[@]}" -- "$re" "$T.hist.txt" > "$T.hist_$nome.txt" 2>/dev/null
  xargs -0 -r grep -HnIsE "${gf[@]}" -- "$re" < "$T.ev_files0" > "$T.ev_$nome.txt" 2>/dev/null
  printf '%-7s %-22s arvore=%-5s historico=%-6s evidencias=%s\n' "$grupo" "$nome" \
    "$(wc -l < "$T.wt_$nome.txt")" "$(grep -cE "${gf[@]}" -- "$re" "$T.hist.txt")" "$(wc -l < "$T.ev_$nome.txt")"
done < "$T.padroes.tsv"

echo
echo "== Item 5: ocorrencias de nuvem na arvore (arquivo:linha mascarado, max 20 por padrao)"
for n in supabase_co_sub pooler_ou_supabase_in railway vercel api_anthropic; do
  echo "-- $n ($(wc -l < "$T.wt_$n.txt"))"; head -n 20 "$T.wt_$n.txt" | mask
done
echo "-- supabase_com SEM /docs ($(grep -vc 'supabase\.com/docs' "$T.wt_supabase_com.txt"))"
grep -v 'supabase\.com/docs' "$T.wt_supabase_com.txt" | head -n 20 | mask
echo "-- supabase_com/docs por arquivo (links de documentacao)"
cut -d: -f1 "$T.wt_supabase_com_docs.txt" | sort | uniq -c | sort -rn | head -n 20
echo "-- api.anthropic.com FORA de apps/backend/src/hellosquad/llm/ ($(grep -vc '^apps/backend/src/hellosquad/llm/' "$T.wt_api_anthropic.txt"))"
grep -v '^apps/backend/src/hellosquad/llm/' "$T.wt_api_anthropic.txt" | head -n 20 | mask

echo
echo "== Item 5: URLs http(s) em configs"
CFG=$(tr '\0' '\n' < "$T.files0" | grep -E '(^|/)\.env[^/]*\.example$|(^|/)\.env\.example|^apps/web/next\.config\.ts$|^supabase/config\.toml$|^infra/|(^|/)Makefile$|(^|/)docker-compose[^/]*$|^\.github/')
echo "configs avaliados: $(echo "$CFG" | tr '\n' ' ')"
echo "$CFG" | while read -r f; do [ -f "$f" ] && grep -HnE 'https?://' "$f"; done > "$T.cfg_urls.txt"
echo "linhas com URL: $(wc -l < "$T.cfg_urls.txt")"; head -n 40 "$T.cfg_urls.txt" | mask
echo "-- workflows (deploy/vercel/railway/supabase link|db push/secrets.)"
echo "$CFG" | grep -E '^(\.github|infra/github)/' | while read -r f; do
  grep -HnEi 'deploy|vercel|railway|supabase[[:space:]]+(link|db[[:space:]]+push|functions[[:space:]]+deploy|login)|secrets\.|SUPABASE_ACCESS_TOKEN|pull_request_target|environment:' "$f"; done > "$T.workflows.txt"
echo "acertos: $(wc -l < "$T.workflows.txt")"; head -n 30 "$T.workflows.txt" | mask

echo
echo "== Item 6a: segredos na arvore (arquivo:linha mascarado, max 20 por padrao)"
for n in jwt sb_secret sb_publishable sk_ant private_key pg_url_senha auth_bearer apikey access_token_val refresh_token_val env_chave_valor cookie_sb jwt_secret_default outros_tokens service_role asaas mp_app_usr mp_test webhook_secret senha_literal; do
  c=$(wc -l < "$T.wt_$n.txt"); [ "$c" -eq 0 ] && continue
  echo "-- $n ($c)"; head -n 20 "$T.wt_$n.txt" | mask
done
echo "-- senhas em URLs postgres (arvore+historico+evidencias), por senha mascarada"
cat "$T.wt_pg_url_senha.txt" "$T.hist_pg_url_senha.txt" "$T.ev_pg_url_senha.txt" \
  | grep -oE 'postgres(ql)?://[^:/@ ]+:[^@ ]+@' | sed -E 's#^postgres(ql)?://##' | mask | sort | uniq -c | sed -E 's#^ +##' | head -n 10

echo
echo "== Item 6c: evidencias em docs/parciais (arquivo:linha mascarado, max 15 por padrao)"
for n in jwt sb_secret sb_publishable sk_ant private_key pg_url_senha authorization_hdr apikey access_token_val refresh_token_val env_chave_valor cookie_sb jwt_secret_default outros_tokens service_role asaas mp_app_usr mp_test webhook_secret senha_literal; do
  c=$(wc -l < "$T.ev_$n.txt"); [ "$c" -eq 0 ] && continue
  echo "-- $n ($c linhas em $(cut -d: -f1 "$T.ev_$n.txt" | sort -u | wc -l) arquivos)"; head -n 15 "$T.ev_$n.txt" | mask
done

echo
echo "== Itens 6b/6c: atribuicao no historico, decodificacao de JWT e cruzamento com .env (python)"
python3 - "$T" "$SELF" <<'PY'
import base64, datetime, hashlib, hmac, json, os, re, sys
T, SELF = sys.argv[1], sys.argv[2]
DEF_JWT_SECRET = b"super-secret-jwt-token-with-at-least-32-characters-long"
DEF_HASH = {"9705102db0d5f99ee08daa19a73e510d9877a2a9add9369da247cbbe6c2a0140": "sb_publishable default do CLI",
            "c85debb55f2f204d868cc1552c42faa143b4c675f61363ab040dd50b5b5304cd": "sb_secret default do CLI"}
def mask(s):
    s = re.sub(r'(eyJ[A-Za-z0-9_-]{6})[A-Za-z0-9_.-]+', r'\1***MASK***', s)
    s = re.sub(r'(sb_(?:secret|publishable)_[A-Za-z0-9]{4})[A-Za-z0-9_-]+', r'\1***', s)
    s = re.sub(r'(sk-ant-[a-z0-9]{3})[A-Za-z0-9_-]+', r'\1***', s)
    s = re.sub(r'(APP_USR-[0-9a-f]{4})[0-9a-f-]+', r'\1***', s)
    s = re.sub(r'(TEST-[0-9]{4})[0-9a-f-]+', r'\1***', s)
    s = re.sub(r'(aact_[A-Za-z]{4})[A-Za-z0-9_$=-]+', r'\1***', s)
    s = re.sub(r'(postgres(?:ql)?://[^:/@\s"]+:)(?!postgres@)([^@\s"]{2})[^@\s"]*@', r'\1\2***@', s)
    s = re.sub(r'([Bb]earer\s+[A-Za-z0-9]{4})[A-Za-z0-9._~+/=-]{4,}', r'\1***', s)
    s = re.sub(r'((?:apikey|api_key|access_token|refresh_token|provider_token|SERVICE_ROLE_KEY|ANON_KEY|SECRET_KEY|PUBLISHABLE_KEY|JWT_SECRET|API_KEY|PASSWORD|password)["\']?\s*[:=]\s*["\']?)([A-Za-z0-9]{3})[A-Za-z0-9._~+/=-]{5,}', r'\1\2***', s)
    s = re.sub(r'(sb-[a-z0-9-]+-auth-token(?:\.\d+)?=)([A-Za-z0-9]{6})[^;\s"]+', r'\1\2***', s)
    return s.strip()[:170]
pats = []
for ln in open(T + ".padroes.tsv"):
    g, n, fl, rx = ln.rstrip("\n").split("\t")
    pats.append((g, n, re.compile(rx.replace("[[:space:]]", r"\s"), re.I if fl == "i" else 0)))
# --- 6b: atribuicao commit/arquivo no historico
hits, dates, c, f = {}, {}, "?", "?"
with open(T + ".hist.txt", errors="replace") as fh:
    for line in fh:
        if line.startswith("commit ") and len(line) >= 47:
            c, f = line[7:16], "(mensagem do commit)"; continue
        if line.startswith("Date:"):
            dates[c] = line[5:].strip()[:24]; continue
        if line.startswith("diff --git "):
            f = line.rstrip("\n").split(" b/", 1)[-1]; continue
        if line.startswith(("+++ ", "--- ", "index ")):
            continue
        for g, n, rx in pats:
            if rx.search(line):
                k = (n, c, f)
                if k not in hits: hits[k] = [0, line[:1], mask(line[1:])]
                hits[k][0] += 1
print("-- 6b historico: commit data arquivo [linhas] sinal: trecho mascarado (max 12 por padrao)")
for g, n, rx in pats:
    ks = [k for k in hits if k[0] == n]
    if not ks: continue
    print(f"[{n}] {len(ks)} pares commit/arquivo, {len(set(k[1] for k in ks))} commits")
    for k in ks[:12]:
        h = hits[k]; print(f"  {k[1]} {dates.get(k[1],'?')} {k[2]} [{h[0]}] {h[1]}: {h[2]}")
# --- JWTs: coleta de arvore, historico e evidencias
JWT = re.compile(r'eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*')
def b64d(x): return base64.urlsafe_b64decode(x + "=" * (-len(x) % 4))
def textfile(p):
    try:
        b = open(p, "rb").read()
    except OSError:
        return None
    return None if b"\0" in b[:8192] else b.decode("utf-8", "replace")
wt = [p for p in open(T + ".files0", "rb").read().decode().split("\0") if p]
ev = [p for p in open(T + ".ev_files0", "rb").read().decode().split("\0") if p]
srcs = {"arvore": {}, "evid": {}}
for nome, lst in (("arvore", wt), ("evid", ev)):
    for p in lst:
        t = textfile(p)
        if t is None: continue
        srcs[nome][p] = t
toks = {}
def add(tok, onde, loc):
    d = toks.setdefault(tok, {"arvore": [], "historico": [], "evid": []}); d[onde].append(loc)
for nome in ("arvore", "evid"):
    for p, t in srcs[nome].items():
        for i, l in enumerate(t.splitlines(), 1):
            for m in JWT.finditer(l): add(m.group(0), nome, f"{p}:{i}")
c = "?"
with open(T + ".hist.txt", errors="replace") as fh:
    for line in fh:
        if line.startswith("commit ") and len(line) >= 47: c = line[7:16]
        elif line.startswith("diff --git "): f = line.rstrip("\n").split(" b/", 1)[-1]
        for m in JWT.finditer(line): add(m.group(0), "historico", f"{c}:{f}")
now = datetime.datetime.now(datetime.timezone.utc).timestamp()
print(f"\n-- JWTs distintos: {len(toks)} (fp=sha256[:8] do token; verif_default=HMAC com o segredo publico do CLI)")
for tok, d in toks.items():
    h, p, s = (tok.split(".") + ["", ""])[:3]
    try: hd = json.loads(b64d(h))
    except Exception: hd = {}
    try: pl = json.loads(b64d(p))
    except Exception: pl = {}
    ver = "-"
    if hd.get("alg") == "HS256" and s:
        mac = base64.urlsafe_b64encode(hmac.new(DEF_JWT_SECRET, f"{h}.{p}".encode(), hashlib.sha256).digest()).rstrip(b"=").decode()
        ver = "sim" if hmac.compare_digest(mac, s) else "nao"
    exp = pl.get("exp"); expi = datetime.datetime.fromtimestamp(exp, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ") if isinstance(exp, (int, float)) else "-"
    venc = ("vencido" if exp < now else "VALIDO") if isinstance(exp, (int, float)) else "-"
    sub = pl.get("sub"); sub = (str(sub)[:4] + "***") if sub else "-"
    em = pl.get("email"); em = (em[:2] + "***@" + em.split("@")[-1]) if isinstance(em, str) and "@" in em else "-"
    print(f"fp={hashlib.sha256(tok.encode()).hexdigest()[:8]} alg={hd.get('alg')} kid={str(hd.get('kid','-'))[:6]} iss={pl.get('iss','-')} ref={pl.get('ref','-')} role={pl.get('role','-')} aud={pl.get('aud','-')} exp={expi} {venc} sub={sub} email={em} sid={'sim' if 'session_id' in pl else 'nao'} verif_default={ver}")
    for k in ("arvore", "historico", "evid"):
        if d[k]: print(f"   {k}: {len(d[k])} ocorr.; ex.: " + "; ".join(sorted(set(d[k]))[:3]))
# --- cruzamento dos valores dos .env* locais (nao rastreados) com arvore/historico/evidencias
envs = []
for root, dirs, files in os.walk("."):
    dirs[:] = [x for x in dirs if x not in ("node_modules", ".venv", ".next", ".git")]
    envs += [os.path.join(root, x)[2:] for x in files if x.startswith(".env") and not x.endswith(".example")]
hist = open(T + ".hist.txt", errors="replace").read()
print(f"\n-- .env* locais em disco (nao .example): {envs}")
for e in envs:
    tracked = os.popen(f"git ls-files --error-unmatch -- '{e}' 2>/dev/null").read().strip()
    print(f"[{e}] rastreado_no_git={'SIM' if tracked else 'nao'}")
    for ln in open(e, errors="replace"):
        m = re.match(r'\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$', ln.rstrip("\n"))
        if not m: continue
        k, v = m.group(1), m.group(2).strip().strip('"').strip("'")
        if not v: print(f"   {k}: (vazio)"); continue
        if re.match(r'^(https?|postgres(ql)?)://', v):
            host = re.sub(r'^[a-z]+://([^@/]*@)?([^/:]+).*$', r'\2', v)
            pw = re.match(r'^[a-z]+://[^/@:]*:([^/@]+)@', v)
            extra = ""
            if pw:
                s = pw.group(1)
                extra = " senha=postgres(default CLI)" if s == "postgres" else (
                    f" senha=nao-default len={len(s)} ocorrencias: arvore={sum(t.count(s) for p, t in srcs['arvore'].items() if p != e)} historico={hist.count(s)} evidencias={sum(t.count(s) for t in srcs['evid'].values())}")
            print(f"   {k}: URL host={host} {'NUVEM' if re.search(r'supabase\.(co|com|in)|railway|vercel|anthropic', host) else 'local/outro'} senha_na_url={'sim' if pw else 'nao'}{extra}"); continue
        if not re.search(r'KEY|SECRET|TOKEN|PASS|JWT', k) and not v.startswith(("sb_", "eyJ", "sk-ant-")): continue
        hv = hashlib.sha256(v.encode()).hexdigest()
        if hv in DEF_HASH: cls = DEF_HASH[hv]
        elif v.encode() == DEF_JWT_SECRET: cls = "JWT_SECRET default publico do CLI"
        elif v.startswith("eyJ"):
            hh, pp, ss = (v.split(".") + ["", ""])[:3]
            mac = base64.urlsafe_b64encode(hmac.new(DEF_JWT_SECRET, f"{hh}.{pp}".encode(), hashlib.sha256).digest()).rstrip(b"=").decode()
            try: rl = json.loads(b64d(pp)).get("role")
            except Exception: rl = "?"
            cls = f"JWT role={rl} assinado_com_segredo_default={'sim' if mac == ss else 'NAO'}"
        elif v.startswith("sk-ant-"): cls = "formato de chave Anthropic REAL (sk-ant-...)"
        elif v.startswith("sb_"): cls = "chave sb_ NAO default (parece de projeto real)"
        else: cls = "outro valor"
        n_wt = sum(t.count(v) for p, t in srcs["arvore"].items() if p != e)
        n_ev = sum(t.count(v) for t in srcs["evid"].values())
        print(f"   {k}: len={len(v)} classe=[{cls}] ocorrencias: arvore={n_wt} historico={hist.count(v)} evidencias={n_ev}")
PY

echo
echo "== Item 6d: capturas .png com nome suspeito"
grep -iE 'terminal|devtools|console|network|rede|status|conta|perfil|config|env|chave|token|login|entrar|sess(a|ao|ão)|cookie|admin|ajustes|settings' "$T.png_todas.txt" > "$T.png_suspeitas.txt"
echo "png total=$(wc -l < "$T.png_todas.txt") suspeitas=$(wc -l < "$T.png_suspeitas.txt") (lista em $T.png_suspeitas.txt)"

echo
echo "== Item 6e: .gitignore, .env commitado, guarda do autosave"
for p in '.env' '.env.local' 'apps/web/.env.local' 'apps/backend/.env' 'chave.pem' '.env.production'; do
  printf '%-22s ' "$p"; git check-ignore -q --no-index "$p" && echo ignorado || echo NAO-ignorado
done
echo "-- .env* adicionados em algum commit:"
git log --all --diff-filter=A --name-only --format= | grep -E '(^|/)\.env($|\.local|\.production|\.[a-z]+$)' | sort -u | head -n 10
echo "-- guarda de segredo em infra/git-autosave.sh:"
grep -nEi 'secret|segredo|eyJ|sk-ant|sb_|private|\.env|token|grep -' infra/git-autosave.sh | mask | head -n 25
