#!/usr/bin/env bash
# Rede de segurança do dono (16/10/2026): "sempre tem que estar tudo commitado, senão perdemos contexto".
# Commita e envia qualquer mudança pendente de um repositório, com prefixo "wip:", sem substituir os
# commits significativos dos agentes (eles continuam commitando por item). Roda pelo cron a cada poucos minutos.
#
# Uso: git-autosave.sh <caminho-do-repo> <prefixo-da-mensagem>
# Exemplo (cron): */5 * * * * /home/vitao/projetos/hellosquad/infra/git-autosave.sh /home/vitao/projetos/hellosquad "wip: autosave HelloSquad"
set -u
REPO="${1:?caminho do repositório}"
PREFIX="${2:-wip: autosave}"
LOG="${HOME}/.local/state/git-autosave.log"
mkdir -p "$(dirname "$LOG")"
cd "$REPO" || { echo "$(date '+%F %T') [$REPO] não encontrado" >> "$LOG"; exit 1; }

# Evita rodar em cima de uma operação git em andamento (rebase/merge de um agente).
if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] || [ -f .git/MERGE_HEAD ]; then
  echo "$(date '+%F %T') [$REPO] rebase/merge em andamento, pulei" >> "$LOG"; exit 0
fi

if [ -z "$(git status --porcelain)" ]; then
  # Nada novo. Mesmo assim, garante que commits locais não fiquem sem push.
  if [ -n "$(git log --oneline '@{u}..HEAD' 2>/dev/null)" ]; then
    git push -q 2>>"$LOG" && echo "$(date '+%F %T') [$REPO] push de commits locais pendentes" >> "$LOG"
  fi
  exit 0
fi

# Guarda contra segredo (o push vai para um repositório público): o mesmo padrão vale para as linhas novas dos
# arquivos versionados e para os arquivos novos. Chave da Anthropic (as reais passam de 100 caracteres; a fictícia
# curta de tests/test_llm.py não conta), chaves do Supabase com valor, JWT, cookie de
# sessão do Supabase com valor (`sb-…-auth-token=…` ou o `base64-eyJ…` do @supabase/ssr), ANTHROPIC_API_KEY
# preenchida e chave privada. O nome do cookie sozinho (sem valor) não conta: aparece nos relatórios de QA.
# Cobrança (S2e): chave do Asaas (`$aact_…`, as reais passam de 100 caracteres; a fictícia curta dos testes não
# conta), Access Token do Mercado Pago (`APP_USR-`/`TEST-` + números + 32 hex + id do usuário) e as variáveis
# ASAAS_*, MERCADOPAGO_*, MP_* e PAYMENT_* terminadas em KEY, TOKEN ou SECRET com valor (16+). Vazia, como no
# .env.example, não conta; nem as URLs (ASAAS_BASE_URL, MERCADOPAGO_BASE_URL) nem uma referência a variável.
# Integrações da Fase 3 (J3): META_* e GOOGLE_* terminadas em KEY, TOKEN ou SECRET com valor (16+), segredo de
# cliente OAuth do Google (`GOCSPX-…`) e tokens reais longos da Meta (`EAA…`, 100+) e do Google (`ya29.…`, `1//0…`).
# Os tokens dos mocks locais são curtos (`EAAMock…`, `ya29.mock-…`, `1//mock-…`) e não contam.
SECRET_RE='sk-ant-[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{10,}|sb_publishable_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.|sb-[a-z0-9-]+-auth-token(\.[0-9]+)?=[A-Za-z0-9%_+/=-]{20,}|base64-eyJ[A-Za-z0-9_+/=-]{20,}|ANTHROPIC_API_KEY=["'"'"']?[A-Za-z0-9_-]{16,}|\$?aact_[A-Za-z0-9_+/=-]{40,}|\b(APP_USR|TEST)-[0-9]{8,}-[0-9]{4,}-[0-9a-fA-F]{32}-[0-9]{4,}|\b(ASAAS|MERCADOPAGO|MP|PAYMENT|META|GOOGLE)_[A-Z_]*(KEY|TOKEN|SECRET)=["'"'"']?[A-Za-z0-9_+/=.-]{16,}|GOCSPX-[A-Za-z0-9_-]{20,}|\bEAA[A-Za-z0-9]{100,}|\bya29\.[A-Za-z0-9_-]{60,}|\b1//0[A-Za-z0-9_-]{40,}|BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY'
suspects() {
  git diff HEAD --name-only -z -- . ':!*.png' ':!*.jpg' 2>/dev/null | while IFS= read -r -d '' f; do
    git diff HEAD --unified=0 -- "$f" 2>/dev/null | grep -E '^\+' | grep -qE "$SECRET_RE" && printf '%s\n' "$f"
  done
  git ls-files --others --exclude-standard -z | xargs -0 -r grep -lE "$SECRET_RE" 2>/dev/null
}
FOUND="$(suspects | sort -u | tr '\n' ' ')"
if [ -n "$FOUND" ]; then
  MSG="$(date '+%F %T') [$REPO] POSSÍVEL SEGREDO (chave, token ou cookie de sessão com valor) em: ${FOUND% }. Autosave NÃO commitou nada. Tire o valor do arquivo (ou ponha o arquivo no .gitignore); o próximo ciclo commita."
  echo "$MSG" >> "$LOG"; echo "$MSG" >&2; exit 2
fi

git add -A
MSG="$PREFIX $(date '+%d/%m %H:%M') ($(git status --porcelain | wc -l | tr -d ' ') caminhos)"
if git -c user.name="Thor (autosave)" -c user.email="victoruli@gmail.com" commit -q -m "$MSG"; then
  if ! git push -q 2>>"$LOG"; then
    git fetch -q && git rebase -q '@{u}' 2>>"$LOG" && git push -q 2>>"$LOG" || { git rebase --abort 2>/dev/null; echo "$(date '+%F %T') [$REPO] push falhou (conflito?); commit local feito, tentar de novo no próximo ciclo" >> "$LOG"; exit 3; }
  fi
  echo "$(date '+%F %T') [$REPO] $MSG" >> "$LOG"
fi
exit 0
