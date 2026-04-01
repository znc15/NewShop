# Makefile
.PHONY: dev build test docker-up docker-down docker-app-up docker-app-down migrate migrate-down

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

docker-app-up:
	docker compose up -d

docker-app-down:
	docker compose down

migrate:
	cd services/api && goose -dir migrations postgres "host=localhost port=5432 user=postgres password=postgres dbname=newshop sslmode=disable" up

migrate-down:
	cd services/api && goose -dir migrations postgres "host=localhost port=5432 user=postgres password=postgres dbname=newshop sslmode=disable" down
