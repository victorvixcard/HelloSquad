#!/usr/bin/env bash
# H2 estático P2: sobe o `next start` do build do worktree (padrão /tmp/h2_web) na 3198, espera a porta responder,
# roda o comando dado (string para bash -c) e derruba o servidor no fim (trap; mata o grupo de processos inteiro).
# Uso: bash docs/parciais/h2/estatico/p2_com_servidor.sh '<comando>'
# Log do servidor: /tmp/h2_est_p2_next.log. Nunca toca nas portas 3100/8100 (do dono).
set -u
WT="${WT:-/tmp/h2_web}"
PORT=3198
LOG=/tmp/h2_est_p2_next.log
if ss -ltn | grep -qE ":${PORT}\b"; then echo "porta ${PORT} já ocupada; abortando"; exit 2; fi
cd "$WT/apps/web" || exit 2
setsid pnpm exec next start --port "$PORT" --hostname 127.0.0.1 > "$LOG" 2>&1 < /dev/null &
PID=$!
PGID=$(ps -o pgid= -p "$PID" | tr -d ' ')
cleanup() {
  [ -n "${PGID:-}" ] && kill -TERM -- "-$PGID" 2>/dev/null
  for _ in $(seq 1 30); do ss -ltn | grep -qE ":${PORT}\b" || break; sleep 0.3; done
  [ -n "${PGID:-}" ] && kill -KILL -- "-$PGID" 2>/dev/null
  if ss -ltnp | grep -E ":${PORT}\b"; then echo "AVISO: porta ${PORT} ainda escutando"; else echo "[invólucro] servidor ${PORT} parado (pgid ${PGID})"; fi
}
trap cleanup EXIT INT TERM
ok=0
for _ in $(seq 1 120); do
  if curl -s -o /dev/null --max-time 3 "http://127.0.0.1:${PORT}/robots.txt"; then ok=1; break; fi
  sleep 0.5
done
if [ "$ok" != 1 ]; then echo "servidor não respondeu na ${PORT}"; tail -20 "$LOG"; exit 3; fi
echo "[invólucro] next start no ar na ${PORT} (pid ${PID}, pgid ${PGID})"
cd /home/vitao/projetos/hellosquad || exit 2
bash -c "$1"
RC=$?
echo "[invólucro] comando terminou com exit ${RC}"
exit "$RC"
