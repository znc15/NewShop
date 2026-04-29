# Makefile
.PHONY: \
	dev build test \
	docker-up docker-down docker-infra-up docker-infra-down docker-infra-config docker-infra-logs \
	docker-app-up docker-app-down docker-app-config docker-app-logs \
	migrate migrate-down \
	ops ops-check ops-deploy ops-update

dev:
	cd services/api && go run cmd/server/main.go

build:
	cd services/api && go build -o bin/server cmd/server/main.go

test:
	cd services/api && go test ./... -v

docker-up:
	cd infra/docker && docker compose up -d

docker-down:
	cd infra/docker && docker compose down

docker-infra-up: docker-up

docker-infra-down: docker-down

docker-infra-config:
	cd infra/docker && docker compose config >/dev/null

docker-infra-logs:
	cd infra/docker && docker compose logs -f --tail=200

docker-app-up:
	docker compose up -d --build

docker-app-down:
	docker compose down

docker-app-config:
	docker compose config >/dev/null

docker-app-logs:
	docker compose logs -f --tail=200

migrate:
	cd services/api && goose -dir migrations postgres "host=localhost port=5432 user=postgres password=postgres dbname=newshop sslmode=disable" up

migrate-down:
	cd services/api && goose -dir migrations postgres "host=localhost port=5432 user=postgres password=postgres dbname=newshop sslmode=disable" down

ops:
	@bash scripts/maintain.sh $(ARGS)

ops-check:
	@bash scripts/maintain.sh check

# 用法：make ops-deploy STACK=app
#      make ops-update STACK=infra
ops-deploy:
	@bash scripts/maintain.sh deploy $(STACK)

ops-update:
	@bash scripts/maintain.sh update $(STACK)
