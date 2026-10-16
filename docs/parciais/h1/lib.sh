# H1 — funções de apoio. Uso: `source docs/parciais/h1/lib.sh` na raiz do repositório.
# Lê as chaves locais do .env em tempo de execução e nunca as imprime.

H1_ROOT="${H1_ROOT:-/home/vitao/projetos/hellosquad}"
H1_LOCK=/tmp/hellosquad-db.lock
MIOLO=6bcdc5bd-3c9a-4a7a-bb83-22b2ba88edc2
VITTA=fc0bba8b-f2b1-46fd-a843-b5ff0cc3ea7b
TRILHA=a031591a-034d-4bda-90be-568d4e71c06f

# psql como postgres no container do HelloSquad (leitura de estado e preparação de cenário).
h1_psql() {
  docker exec -i supabase_db_hellosquad psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qAt -F'|' "$@"
}

# Sobe o worker do squad (o mesmo do `make worker`) em modo simulado, num grupo de processos próprio.
# h1_worker_start LOG [VAR=valor ...]; espera "worker no ar". Grava o PID do grupo em /tmp/h1_worker.pid.
h1_worker_start() {
  local log="$1"; shift
  (cd "$H1_ROOT/apps/backend" && env LLM_PROVIDER=simulated "$@" setsid uv run hellosquad-worker >"$log" 2>&1 & echo $! >/tmp/h1_worker.pid)
  for _ in $(seq 1 120); do
    grep -q "worker no ar" "$log" 2>/dev/null && return 0
    sleep 0.5
  done
  echo "worker não subiu: $(tail -n 5 "$log")"; return 1
}

# Para o worker com SIGTERM no grupo e espera sair (até 40 s).
h1_worker_stop() {
  local pid; pid="$(cat /tmp/h1_worker.pid 2>/dev/null)"
  [ -z "$pid" ] && return 0
  kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
  for _ in $(seq 1 80); do kill -0 "$pid" 2>/dev/null || break; sleep 0.5; done
  kill -0 "$pid" 2>/dev/null && kill -KILL -- "-$pid" 2>/dev/null
  rm -f /tmp/h1_worker.pid
}
