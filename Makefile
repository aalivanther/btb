.PHONY: tools-build install gen lint test verify up down fmt seed franchise

TOOLS := docker compose run --rm tools bash -c

tools-build:
	docker compose build tools

install:
	$(TOOLS) 'cd web && pnpm install --frozen-lockfile'

gen:
	$(TOOLS) 'buf generate && cd backend && go mod tidy'

lint:
	$(TOOLS) 'gofumpt -l backend && (cd backend && golangci-lint run) && (cd web && pnpm install --frozen-lockfile && pnpm run lint && pnpm exec tsc --noEmit)'

test:
	$(TOOLS) 'cd backend && go test ./...' && $(TOOLS) 'cd web && pnpm install --frozen-lockfile && pnpm run test'

seed:
	$(TOOLS) 'cd backend && go run ./cmd/seedgen -out seed/seed.generated.json -year 2026 -months 10,11,12'

franchise:
	$(TOOLS) 'cd backend && go run ./cmd/franchisegen -seed seed/seed.json'

videos:
	$(TOOLS) 'cd backend && go run ./cmd/videosgen'

verify: gen lint test

fmt:
	$(TOOLS) '(cd backend && golangci-lint fmt) && (cd web && pnpm install --frozen-lockfile && pnpm run format)'

up:
	docker compose up --build

down:
	docker compose down
