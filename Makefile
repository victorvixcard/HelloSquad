# HelloSquad — atalhos do ambiente local.
# Tudo roda nesta máquina: Supabase CLI em Docker (projeto "hellosquad"), FastAPI e Next.js.
# Nenhum alvo publica, faz deploy ou fala com nuvem. Guia completo: docs/SETUP_LOCAL.md.

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

SUPABASE := pnpm exec supabase
BACKEND_DIR := apps/backend

# Portas lidas do .env, se existir (só estas duas chaves; segredos não entram no make).
env_value = $(shell sed -n 's/^$(1)=//p' .env 2>/dev/null | tail -n 1)
API_PORT ?= $(or $(call env_value,API_PORT),8100)
WEB_PORT ?= $(or $(call env_value,WEB_PORT),3100)

.PHONY: help install up down status migrate seed test test-backend test-web test-db build \
	dev dev-api dev-web worker scheduler

help: ## Lista os alvos disponíveis
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-13s\033[0m %s\n", $$1, $$2}'

install: ## Instala dependências JS (pnpm) e Python (uv) a partir dos lockfiles
	pnpm install --frozen-lockfile
	cd $(BACKEND_DIR) && uv sync --locked

up: install ## Sobe o Supabase local (projeto hellosquad) e aplica migrations pendentes
	$(SUPABASE) start
	$(SUPABASE) migration up --local
	@echo "Supabase local no ar. Chaves locais: pnpm exec supabase status -o env (ANON_KEY e SERVICE_ROLE_KEY vão para o .env)."

down: ## Para o Supabase local do HelloSquad (os dados ficam no volume Docker)
	$(SUPABASE) stop

status: ## Estado do Supabase local, da API (:8100) e da web (:3100)
	$(SUPABASE) status
	@curl -fsS --max-time 2 http://127.0.0.1:$(API_PORT)/health && echo \
		|| echo "API fora do ar em :$(API_PORT) (make dev-api)"
	@curl -fsS -o /dev/null --max-time 5 http://127.0.0.1:$(WEB_PORT) \
		&& echo "Web no ar em http://127.0.0.1:$(WEB_PORT)" \
		|| echo "Web fora do ar em :$(WEB_PORT) (make dev-web)"

migrate: ## Aplica migrations pendentes de supabase/migrations no banco local
	$(SUPABASE) migration up --local

seed: ## Dados fictícios no banco local (implementado pelo Stark na S0)
	@echo "seed: ainda não implementado. Chega na fatia S0 (Stark), a partir de docs/DADOS_FICTICIOS.md."

test: test-backend test-web test-db ## Roda todos os testes locais (backend, web e banco)

test-backend: ## Backend: ruff (lint e formato) e pytest
	cd $(BACKEND_DIR) && uv run ruff check . && uv run ruff format --check . && uv run pytest

test-web: ## Web: ESLint e checagem de tipos
	pnpm --filter web lint
	pnpm --filter web typecheck

test-db: ## Banco: testes pgTAP de supabase/tests (exige make up)
	$(SUPABASE) test db

build: ## Build de produção do web (o mesmo que o CI roda)
	pnpm --filter web build

dev: ## API e web juntas (Ctrl+C encerra as duas)
	$(MAKE) --no-print-directory -j 2 dev-api dev-web

dev-api: ## API FastAPI com reload em http://127.0.0.1:8100
	cd $(BACKEND_DIR) && API_PORT=$(API_PORT) API_RELOAD=true uv run hellosquad-api

dev-web: ## Web Next.js em http://127.0.0.1:3100
	pnpm --filter web exec next dev --turbopack --port $(WEB_PORT)

worker: ## Worker (placeholder até a fila existir)
	cd $(BACKEND_DIR) && uv run hellosquad-worker

scheduler: ## Scheduler (placeholder até as rotinas existirem)
	cd $(BACKEND_DIR) && uv run hellosquad-scheduler
