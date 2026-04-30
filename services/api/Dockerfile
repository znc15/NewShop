# 构建阶段
FROM golang:alpine AS builder

WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache git gcc musl-dev

# 设置 Go 工具链自动下载
ENV GOTOOLCHAIN=auto
# 强制启用 Go Modules，避免在部分环境中意外进入 GOPATH 模式导致本地模块 import（如 newshop/api/docs）解析失败。
ENV GO111MODULE=on
ENV GOPROXY=https://goproxy.cn,direct

# 复制 go.mod 和 go.sum
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 如果构建上下文缺少 swagger 生成物，则在构建期生成，避免因缺少 `newshop/api/docs` 导致编译失败。
# 注意：这一步只在 `./docs/docs.go` 不存在时执行，以减少不必要的下载与生成开销。
RUN if [ ! -f ./docs/docs.go ]; then \
			echo "未检测到 ./docs/docs.go，开始生成 swagger 文档..."; \
			go install github.com/swaggo/swag/cmd/swag@v1.16.6; \
			/go/bin/swag init -g cmd/server/main.go -o ./docs; \
		fi && test -f ./docs/docs.go

# 构建二进制文件
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /server ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /migrate ./cmd/migrate
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /seed ./cmd/seed

# 运行阶段
FROM alpine:latest

# 安装运行时依赖
RUN apk --no-cache add ca-certificates tzdata curl

WORKDIR /app

# 从构建阶段复制二进制文件
COPY --from=builder /server .
COPY --from=builder /migrate .
COPY --from=builder /seed .

# 暴露端口
EXPOSE 8080

# 启动服务
CMD ["./server"]
