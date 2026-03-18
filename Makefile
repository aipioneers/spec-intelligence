.PHONY: install dev web desktop test test-ui test-rust lint build clean status llm-status generate-plan generate-tasks analyze

# ── Config ──────────────────────────────────────────────────────────────
PORT        ?= 3333
SLUG        ?= 001-spec-intelligence-ui
OLLAMA_MODEL ?= glm-4.7-flash:latest

# ── Setup ───────────────────────────────────────────────────────────────
install: ## Install all dependencies
	npm install

# ── Development ─────────────────────────────────────────────────────────
dev: ## Start web dev server
	cd packages/web && npx next dev --port $(PORT)

web: dev ## Alias for dev

desktop: ## Start Tauri desktop app
	cd packages/desktop && cargo tauri dev

# ── Testing ─────────────────────────────────────────────────────────────
test: test-ui test-rust ## Run all tests

test-ui: ## Run UI unit tests (Vitest)
	cd packages/ui && npx vitest run

test-ui-watch: ## Run UI tests in watch mode
	cd packages/ui && npx vitest

test-rust: ## Run Rust tests
	cd packages/desktop/src-tauri && cargo test

test-e2e: ## Run Playwright E2E tests
	cd packages/web && npx playwright test

test-e2e-ui: ## Run Playwright with UI
	cd packages/web && npx playwright test --ui

# ── Quality ─────────────────────────────────────────────────────────────
lint: ## Lint all packages
	npx turbo run lint

typecheck: ## Type-check all packages
	cd packages/ui && npx tsc --noEmit
	cd packages/desktop/src-tauri && cargo check --lib

clippy: ## Run Rust clippy
	cd packages/desktop/src-tauri && cargo clippy

# ── Build ───────────────────────────────────────────────────────────────
build: ## Build all packages
	npx turbo run build

build-web: ## Build web package only
	cd packages/web && npx next build

build-desktop: ## Build Tauri desktop binary
	cd packages/desktop && cargo tauri build

# ── API ─────────────────────────────────────────────────────────────────
status: ## Check API health (dev server must be running)
	@curl -s http://localhost:$(PORT)/api/features | python3 -m json.tool

llm-status: ## Check Ollama/LLM connection status
	@curl -s http://localhost:$(PORT)/api/llm/status | python3 -m json.tool

generate-plan: ## Generate plan via Ollama (SLUG=001-spec-kit-ui)
	curl -s -X POST http://localhost:$(PORT)/api/features/$(SLUG)/plan | python3 -m json.tool

generate-tasks: ## Generate tasks via Ollama (SLUG=001-spec-kit-ui)
	curl -s -X POST http://localhost:$(PORT)/api/features/$(SLUG)/tasks | python3 -m json.tool

analyze: ## Run cross-artifact analysis
	curl -s -X POST http://localhost:$(PORT)/api/analysis | python3 -m json.tool

# ── Ollama ──────────────────────────────────────────────────────────────
ollama-pull: ## Pull the default LLM model
	ollama pull $(OLLAMA_MODEL)

ollama-models: ## List available Ollama models
	ollama list

# ── Cleanup ─────────────────────────────────────────────────────────────
clean: ## Remove all build artifacts and node_modules
	npx turbo run clean
	rm -rf node_modules

clean-rust: ## Clean Rust build cache
	cd packages/desktop/src-tauri && cargo clean

# ── Help ────────────────────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
