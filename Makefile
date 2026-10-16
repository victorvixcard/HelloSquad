# HelloSquad — atalhos do ambiente local.
# Tudo roda nesta máquina: Supabase CLI em Docker (projeto "hellosquad"), FastAPI e Next.js.
# Nenhum alvo publica, faz deploy ou fala com nuvem. Guia completo: docs/SETUP_LOCAL.md.

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

SUPABASE := pnpm exec supabase
BACKEND_DIR := apps/backend
# Trava: alvos que mexem no banco local (testes de integração, pgTAP, seed, e2e) nunca rodam em paralelo.
# Duas sessões rodando make test ao mesmo tempo colidiam (uma reaplicava o seed no meio da outra). Espera até 30 min.
DB_LOCK := flock -w 1800 /tmp/hellosquad-db.lock

# Portas lidas do .env, se existir (só estas duas chaves; segredos não entram no make).
env_value = $(shell sed -n 's/^$(1)=//p' .env 2>/dev/null | tail -n 1)
API_PORT ?= $(or $(call env_value,API_PORT),8100)
WEB_PORT ?= $(or $(call env_value,WEB_PORT),3100)

.PHONY: help install up down status migrate seed test test-backend test-web test-db test-infra e2e build \
	openapi dev dev-api dev-web worker scheduler

help: ## Lista os alvos disponíveis
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-13s\033[0m %s\n", $$1, $$2}'

install: ## Instala dependências JS (pnpm) e Python (uv) a partir dos lockfiles
	pnpm install --frozen-lockfile
	cd $(BACKEND_DIR) && uv sync --locked

up: install ## Sobe o Supabase local (projeto hellosquad), aplica migrations e grava a senha do hellosquad_api
	$(SUPABASE) start
	$(SUPABASE) migration up --local
	cd $(BACKEND_DIR) && uv run hellosquad-local-db roles --optional
	@echo "Supabase local no ar. Chaves locais: pnpm exec supabase status -o env (PUBLISHABLE_KEY e SECRET_KEY vão para o .env)."

down: ## Para o Supabase local do HelloSquad (os dados ficam no volume Docker)
	$(SUPABASE) stop

status: ## Estado do Supabase local, da API (:8100) e da web (:3100)
	$(SUPABASE) status
	@curl -fsS --max-time 2 http://127.0.0.1:$(API_PORT)/health && echo \
		|| echo "API fora do ar em :$(API_PORT) (make dev-api)"
	@curl -fsS -o /dev/null --max-time 5 http://127.0.0.1:$(WEB_PORT) \
		&& echo "Web no ar em http://127.0.0.1:$(WEB_PORT)" \
		|| echo "Web fora do ar em :$(WEB_PORT) (make dev-web)"

migrate: ## Aplica migrations pendentes e grava a senha do papel hellosquad_api (API_DATABASE_URL do .env)
	$(SUPABASE) migration up --local
	cd $(BACKEND_DIR) && uv run hellosquad-local-db roles

seed: ## Dados fictícios de docs/DADOS_FICTICIOS.md no banco local (idempotente)
	$(DB_LOCK) bash -c 'cd $(BACKEND_DIR) && uv run hellosquad-local-db seed ../../supabase/seed.sql'

test: test-backend test-web test-db test-infra ## Roda todos os testes locais (backend, web, banco e infra); os que usam o banco esperam a trava

test-backend: ## Backend: ruff (lint e formato) e pytest (integração usa o banco: com trava)
	cd $(BACKEND_DIR) && uv run ruff check . && uv run ruff format --check .
	$(DB_LOCK) bash -c 'cd $(BACKEND_DIR) && uv run pytest'

test-web: ## Web e pacotes: ESLint, checagem de tipos e testes de componente (Vitest)
	pnpm --filter web lint
	pnpm -r --if-present typecheck
	pnpm -r --if-present test

e2e: ## Ponta a ponta (Playwright, Chromium) no ambiente local: build do web, worker simulado, fluxos da Marina e do Pedro, reaplica o seed (com trava)
	pnpm --filter web build
	$(DB_LOCK) env HELLOSQUAD_DB_LOCK_HELD=1 pnpm --filter web e2e

test-db: ## Banco: testes pgTAP de supabase/tests (exige make up; com trava)
	$(DB_LOCK) $(SUPABASE) test db

test-infra: ## Infra: guarda de segredo do autosave, num repositório temporário em /tmp (sem banco)
	bash infra/tests/git-autosave-guard.sh

build: ## Build de produção do web (o mesmo que o CI roda)
	pnpm --filter web build

openapi: ## Exporta o contrato da API para packages/contracts/openapi.json
	cd $(BACKEND_DIR) && uv run hellosquad-openapi ../../packages/contracts/openapi.json

dev: ## API e web juntas (Ctrl+C encerra as duas)
	$(MAKE) --no-print-directory -j 2 dev-api dev-web

dev-api: ## API FastAPI com reload em http://127.0.0.1:8100
	cd $(BACKEND_DIR) && API_PORT=$(API_PORT) API_RELOAD=true uv run hellosquad-api

dev-web: ## Web Next.js em http://127.0.0.1:3100
	pnpm --filter web exec next dev --turbopack --port $(WEB_PORT)

worker: ## Worker do squad: consome a fila runs_interactive (LLM simulado sem ANTHROPIC_API_KEY; Ctrl+C encerra)
	cd $(BACKEND_DIR) && uv run hellosquad-worker

scheduler: ## Scheduler (placeholder até as rotinas existirem)
	cd $(BACKEND_DIR) && uv run hellosquad-scheduler
