#!/usr/bin/env bash
set -euo pipefail

# NewShop 一键运维脚本
# 目标：用最少依赖完成 Docker 部署、更新、重启、日志、状态与健康检查。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

usage() {
  cat <<'EOF'
NewShop 一键运维脚本

用法：
  bash scripts/maintain.sh <命令> [参数]

常用命令：
  check                     检查 Docker/Compose 是否可用
  deploy [app|infra]         一键部署（默认 app）
  update [app|infra]         一键更新（git 拉取 + 重建 + 启动；默认 app）
  up [app|infra]             启动（默认 app）
  down [app|infra]           停止（默认 app）
  restart [app|infra]        重启（默认 app）
  status [app|infra]         查看容器状态（默认 app）
  logs [app|infra] [svc]     跟随日志（默认 app；可选指定服务名）
  health                     本机健康检查（3000/8080）
  api-migrate                在 app 栈里执行 API 维护迁移（./migrate）
  api-seed --yes             在 app 栈里执行测试数据导入（./seed，非幂等）

说明：
  - app 栈：根目录 docker-compose.yml（含 postgres/redis/meili/api/web）
  - infra 栈：infra/docker/docker-compose.yml（含监控 prometheus/grafana，且也含 api/web）
  - 更新会优先执行 git 拉取（若当前目录是 git 仓库且存在远端）。

示例：
  bash scripts/maintain.sh deploy
  bash scripts/maintain.sh update
  bash scripts/maintain.sh logs app api
  bash scripts/maintain.sh status infra
EOF
}

log() {
  printf '[maintain] %s\n' "$*"
}

die() {
  printf '[maintain] 错误：%s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "缺少命令：$1"
}

compose_app() {
  (cd "$REPO_ROOT" && docker compose "$@")
}

compose_infra() {
  (cd "$REPO_ROOT/infra/docker" && docker compose "$@")
}

stack_from_arg() {
  local stack="${1:-app}"
  case "$stack" in
    app|infra) echo "$stack" ;;
    *) die "未知栈类型：$stack（仅支持 app/infra）" ;;
  esac
}

stack_compose() {
  local stack="$1"
  shift
  if [[ "$stack" == "infra" ]]; then
    compose_infra "$@"
  else
    compose_app "$@"
  fi
}

check() {
  need_cmd docker
  docker version >/dev/null 2>&1 || die "Docker 未运行或不可用"

  # docker compose v2
  docker compose version >/dev/null 2>&1 || die "docker compose 不可用（需要 Compose v2）"

  log "Docker/Compose 检查通过"
}

git_pull_if_possible() {
  if ! command -v git >/dev/null 2>&1; then
    log "未检测到 git，跳过代码更新"
    return 0
  fi

  if [[ ! -d "$REPO_ROOT/.git" ]]; then
    log "当前目录不是 git 仓库，跳过代码更新"
    return 0
  fi

  (cd "$REPO_ROOT" && git remote -v >/dev/null 2>&1) || {
    log "未检测到 git 远端，跳过代码更新"
    return 0
  }

  log "拉取最新代码（git pull --rebase）"
  (cd "$REPO_ROOT" && git pull --rebase)
}

do_up() {
  local stack
  stack="$(stack_from_arg "${1:-app}")"

  check

  log "启动 $stack 栈（构建并后台运行）"
  if [[ "$stack" == "infra" ]]; then
    stack_compose "$stack" up -d --build
  else
    stack_compose "$stack" up -d --build
  fi

  log "启动完成：$stack"
}

do_down() {
  local stack
  stack="$(stack_from_arg "${1:-app}")"

  check

  log "停止 $stack 栈"
  stack_compose "$stack" down
  log "停止完成：$stack"
}

do_restart() {
  local stack
  stack="$(stack_from_arg "${1:-app}")"

  check

  log "重启 $stack 栈"
  stack_compose "$stack" restart
  log "重启完成：$stack"
}

do_status() {
  local stack
  stack="$(stack_from_arg "${1:-app}")"

  check

  stack_compose "$stack" ps
}

do_logs() {
  local stack svc
  stack="$(stack_from_arg "${1:-app}")"
  svc="${2:-}"

  check

  if [[ -n "$svc" ]]; then
    stack_compose "$stack" logs -f --tail=200 "$svc"
  else
    stack_compose "$stack" logs -f --tail=200
  fi
}

do_health() {
  check

  local ok=0
  if command -v curl >/dev/null 2>&1; then
    log "检查 Web: http://localhost:3000/health"
    curl -fsS http://localhost:3000/health >/dev/null && ok=$((ok+1)) || true

    log "检查 API: http://localhost:8080/health"
    curl -fsS http://localhost:8080/health >/dev/null && ok=$((ok+1)) || true
  elif command -v wget >/dev/null 2>&1; then
    log "检查 Web: http://localhost:3000/health"
    wget -q -O - http://localhost:3000/health >/dev/null && ok=$((ok+1)) || true

    log "检查 API: http://localhost:8080/health"
    wget -q -O - http://localhost:8080/health >/dev/null && ok=$((ok+1)) || true
  else
    die "缺少 curl/wget，无法执行健康检查"
  fi

  if [[ $ok -lt 2 ]]; then
    die "健康检查未通过（建议先执行：bash scripts/maintain.sh status app && bash scripts/maintain.sh logs app）"
  fi

  log "健康检查通过"
}

do_update() {
  local stack
  stack="$(stack_from_arg "${1:-app}")"

  check
  git_pull_if_possible

  log "更新并重建 $stack 栈"
  stack_compose "$stack" up -d --build
  log "更新完成：$stack"
}

do_api_migrate() {
  check
  log "在 app 栈执行 API 维护迁移：./migrate"
  compose_app exec -T api ./migrate
  log "API 维护迁移完成"
}

do_api_seed() {
  check

  if [[ "${1:-}" != "--yes" ]]; then
    die "seed 会重复插入测试数据（非幂等），需要显式确认：bash scripts/maintain.sh api-seed --yes"
  fi

  log "在 app 栈执行测试数据导入：./seed"
  compose_app exec -T api ./seed
  log "测试数据导入完成"
}

main() {
  local cmd
  cmd="${1:-help}"

  case "$cmd" in
    -h|--help|help)
      usage
      ;;
    check)
      check
      ;;
    deploy)
      shift
      do_up "${1:-app}"
      ;;
    update)
      shift
      do_update "${1:-app}"
      ;;
    up)
      shift
      do_up "${1:-app}"
      ;;
    down)
      shift
      do_down "${1:-app}"
      ;;
    restart)
      shift
      do_restart "${1:-app}"
      ;;
    status)
      shift
      do_status "${1:-app}"
      ;;
    logs)
      shift
      do_logs "${1:-app}" "${2:-}"
      ;;
    health)
      do_health
      ;;
    api-migrate)
      do_api_migrate
      ;;
    api-seed)
      shift
      do_api_seed "${1:-}"
      ;;
    *)
      usage
      die "未知命令：$cmd"
      ;;
  esac
}

main "$@"
