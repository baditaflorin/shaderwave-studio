.DEFAULT_GOAL := help

.PHONY: help install-hooks dev build test test-integration smoke lint fmt pages-preview release clean hooks-pre-commit hooks-commit-msg hooks-pre-push data docker-build docker-push compose-up compose-down

help:
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "%-22s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install-hooks: ## wire local git hooks
	git config core.hooksPath .githooks
	chmod +x .githooks/*

dev: ## run the frontend dev server
	npm run dev

build: ## build the GitHub Pages site into docs/
	npm run build

test: ## run unit tests
	npm run test

test-integration: ## run integration tests
	npm run test

smoke: ## run the static Pages smoke test
	npm run smoke

lint: ## run linters and type checks
	npm run lint
	npm run format:check
	npm run typecheck

fmt: ## autoformat source and docs
	npm run format

pages-preview: ## serve docs/ exactly as Vite/GitHub Pages expects
	npm run pages-preview

release: ## tag the current version
	git tag "v$$(node -p "require('./package.json').version")"

clean: ## remove generated local outputs except committed Pages docs
	rm -rf coverage test-results playwright-report .vite

data: ## Mode A has no static data pipeline
	@echo "Mode A: no data artifacts to regenerate."

docker-build: ## Mode A has no Docker image
	@echo "Mode A: docker-build is intentionally absent."

docker-push: ## Mode A has no Docker image
	@echo "Mode A: docker-push is intentionally absent."

compose-up: ## Mode A has no compose stack
	@echo "Mode A: compose-up is intentionally absent."

compose-down: ## Mode A has no compose stack
	@echo "Mode A: compose-down is intentionally absent."

hooks-pre-commit:
	.githooks/pre-commit

hooks-commit-msg:
	.githooks/commit-msg .git/COMMIT_EDITMSG

hooks-pre-push:
	.githooks/pre-push
