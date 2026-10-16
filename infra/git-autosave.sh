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

# Guarda contra segredo: se algo parecido com chave aparecer no diff, NÃO commita e avisa no log.
if git diff HEAD --unified=0 -- . ':!*.png' ':!*.jpg' 2>/dev/null | grep -E '^\+' | grep -qE 'sk-ant-[A-Za-z0-9_-]{10,}|sb_secret_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.|BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY'; then
  echo "$(date '+%F %T') [$REPO] POSSÍVEL SEGREDO no diff; autosave NÃO commitou. Conferir à mão." >> "$LOG"; exit 2
fi
# Arquivos novos também passam pela guarda.
if git ls-files --others --exclude-standard -z | xargs -0 -r grep -lE 'sk-ant-[A-Za-z0-9_-]{10,}|sb_secret_[A-Za-z0-9_-]{10,}|BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY' 2>/dev/null | grep -q .; then
  echo "$(date '+%F %T') [$REPO] POSSÍVEL SEGREDO em arquivo novo; autosave NÃO commitou. Conferir à mão." >> "$LOG"; exit 2
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
