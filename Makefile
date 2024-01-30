.PHONY: check fix format lint start test typecheck

node_modules: package.json package-lock.json
	npm install
	touch node_modules

.env:
	cp .env.dist .env

check: format lint test typecheck

fix: node_modules
	npx eslint . --fix --max-warnings 0
	npx prettier --ignore-unknown --write '**'

format: node_modules
	npx prettier --ignore-unknown --check '**'

lint: node_modules
	npx eslint . --max-warnings 0

typecheck: node_modules
	npx tsc --noEmit

test: node_modules
	npx vitest run

start: .env node_modules
	npx tsx --require dotenv/config src
