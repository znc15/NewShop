# NewShop - 新零售电商平台

一个基于 Go + React 构建的现代化电商平台，支持商品管理、订单处理、支付集成、会员体系等核心功能。

## 技术栈

### 后端
- **语言**: Go 1.21+
- **Web框架**: Gin
- **ORM**: GORM
- **数据库**: PostgreSQL 15
- **缓存**: Redis 7
- **搜索**: Meilisearch
- **认证**: JWT (HS256)
- **支付**: 支付宝

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI组件**: shadcn/ui + Tailwind CSS
- **状态管理**: Zustand
- **HTTP客户端**: Axios
- **路由**: React Router v6

## 项目结构

```
NewShop/
├── services/
│   └── api/                    # 后端服务
│       ├── cmd/server/         # 入口点
│       ├── internal/
│       │   ├── config/         # 配置管理
│       │   ├── handler/        # HTTP处理器
│       │   ├── middleware/     # 中间件
│       │   ├── model/          # 数据模型
│       │   ├── repository/     # 数据访问层
│       │   ├── service/        # 业务逻辑层
│       │   ├── pkg/            # 公共工具包
│       │   └── router/         # 路由配置
│       └── migrations/         # 数据库迁移
├── web/                        # 前端项目
│   ├── src/
│   │   ├── components/         # UI组件
│   │   ├── pages/              # 页面组件
│   │   ├── services/           # API服务
│   │   ├── stores/             # 状态管理
│   │   └── types/              # 类型定义
│   └── public/
├── infra/
│   └── docker/                 # Docker配置
├── docs/                       # 文档
├── docker-compose.yml          # 本地开发环境
├── Makefile                    # 常用命令
└── .env.example                # 环境变量示例
```

## 功能模块

### 用户模块
- 用户注册/登录（邮箱验证码）
- JWT 认证 + 刷新令牌
- 个人信息管理
- 收货地址管理
- 会员等级体系
- 积分系统

### 商品模块
- 商品分类/品牌管理
- 商品SKU规格
- 商品搜索（Meilisearch）
- 库存管理
- 预售活动

### 订单模块
- 购物车
- 订单创建（事务保护）
- 订单状态流转
- 物流跟踪
- 退款/售后

### 支付模块
- 支付宝支付（电脑网站/手机网站）
- 支付回调处理
- 退款处理
- 支付记录持久化

### 优惠券模块
- 优惠券模板
- 用户领券
- 订单用券
- 满减/折扣/无门槛

### 管理后台
- 商品管理
- 订单管理
- 用户管理
- 分类管理
- 优惠券管理
- 数据统计

## 快速开始

### 环境要求
- Go 1.21+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### 1. 克隆项目
```bash
git clone https://github.com/yourusername/newshop.git
cd newshop
```

### 2. 启动依赖服务
```bash
make docker-up
```

如果需要一键启动完整栈（数据库 + API + 前端）：
```bash
make docker-app-up
```

说明：
- `make docker-up` 启动基础设施，配置位于 [infra/docker/docker-compose.yml](infra/docker/docker-compose.yml)
- `make docker-app-up` 启动完整应用栈并重建前后端镜像，配置位于根目录 [docker-compose.yml](docker-compose.yml)

### 3. 配置环境变量
```bash
cp .env.example services/api/.env
# 编辑 .env 填入实际配置
```

### 4. 运行数据库迁移
```bash
make migrate
```

### 5. 启动后端服务
```bash
make dev
```

### 6. 启动前端服务
```bash
cd web
npm install
npm run dev
```

### 7. 访问应用
- 前端: http://localhost:3000
- API: http://localhost:8080
- 健康检查: http://localhost:8080/health

## 初始账户

### 管理后台
| 账户类型 | 邮箱 | 密码 | 说明 |
|----------|------|------|------|
| 超级管理员 | admin@newshop.com | admin123 | 拥有所有权限 |

### 前台用户
| 账户类型 | 邮箱 | 密码 | 说明 |
|----------|------|------|------|
| 测试用户 | user@newshop.com | user123456 | 普通会员账户 |

> ⚠️ 生产环境请务必修改默认密码

## 常用命令

```bash
# 开发
make dev           # 启动后端开发服务器
make build         # 编译后端
make test          # 运行测试

# Docker
make docker-up       # 启动基础设施（PostgreSQL/Redis/Meilisearch/Prometheus/Grafana）
make docker-down     # 停止基础设施
make docker-app-up   # 启动完整应用栈（基础设施 + API + Web）
make docker-app-down # 停止完整应用栈

# 数据库
make migrate       # 执行迁移
make migrate-down  # 回滚迁移
```

## 如何添加新的 Docker 服务

如果你想给项目新增一个容器，先确认它属于哪一类：

- 基础设施服务：放到 [infra/docker/docker-compose.yml](infra/docker/docker-compose.yml)
- 应用栈服务：放到根目录 [docker-compose.yml](docker-compose.yml)

添加时通常按下面几步处理：

1. 为服务补 `image` 或 `build` 配置。
2. 需要持久化的数据就加 `volumes`。
3. 需要依赖其他服务就补 `depends_on` 和健康检查。
4. 需要外部访问就补 `ports`，避免和现有端口冲突。
5. 如果是常用启动命令，顺手在 [Makefile](Makefile) 里加对应的 `make` 目标。

改完以后，先执行 `make docker-up` 或 `make docker-app-up` 验证能否正常启动，再按需补充 README 中的端口和访问地址说明。

## API 文档

### 认证相关
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/v1/auth/register | 用户注册 |
| POST | /api/v1/auth/login | 用户登录 |
| POST | /api/v1/auth/refresh | 刷新令牌 |
| POST | /api/v1/auth/send-code | 发送验证码 |
| GET | /api/v1/auth/profile | 获取用户信息 |
| PUT | /api/v1/auth/profile | 更新用户信息 |

### 商品相关
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/products | 商品列表 |
| GET | /api/v1/products/:id | 商品详情 |
| GET | /api/v1/products/search | 商品搜索 |
| GET | /api/v1/categories | 分类列表 |
| GET | /api/v1/brands | 品牌列表 |

### 订单相关
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/orders | 订单列表 |
| GET | /api/v1/orders/:id | 订单详情 |
| POST | /api/v1/orders | 创建订单 |
| PUT | /api/v1/orders/:id/cancel | 取消订单 |
| PUT | /api/v1/orders/:id/confirm | 确认收货 |

### 购物车相关
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/cart | 获取购物车 |
| POST | /api/v1/cart | 添加到购物车 |
| PUT | /api/v1/cart/:id | 更新购物车项 |
| DELETE | /api/v1/cart/:id | 删除购物车项 |

### 支付相关
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/v1/payment/create | 创建支付 |
| GET | /api/v1/payment/query | 查询支付 |
| POST | /api/v1/payment/notify | 支付回调 |
| POST | /api/v1/payment/refund | 申请退款 |

### 管理后台
| 方法 | 路径 | 描述 |
|------|------|------|
| GET/POST/PUT/DELETE | /api/admin/products | 商品管理 |
| GET/PUT | /api/admin/orders | 订单管理 |
| GET/PUT | /api/admin/users | 用户管理 |
| GET/POST/PUT/DELETE | /api/admin/categories | 分类管理 |
| GET/POST/PUT/DELETE | /api/admin/coupons | 优惠券管理 |
| GET | /api/admin/stats/overview | 数据概览 |

## 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| SERVER_PORT | 服务端口 | 8080 |
| SERVER_MODE | 运行模式 | debug |
| DB_HOST | 数据库主机 | localhost |
| DB_PORT | 数据库端口 | 5432 |
| DB_NAME | 数据库名 | newshop |
| DB_USER | 数据库用户 | postgres |
| DB_PASSWORD | 数据库密码 | postgres |
| REDIS_HOST | Redis主机 | localhost |
| REDIS_PORT | Redis端口 | 6379 |
| JWT_SECRET | JWT密钥 | (必须设置) |
| JWT_EXPIRY | 令牌有效期 | 24h |
| CORS_ALLOWED_ORIGINS | 允许的CORS来源 | http://localhost:3000,http://localhost:5173 |

## 架构设计

### 三层架构
```
Handler → Service → Repository
   │         │         │
   ▼         ▼         ▼
 HTTP     业务逻辑   数据访问
```

### 数据库设计
- **用户系统**: users, addresses, member_levels, member_experiences, points_records, check_ins
- **商品系统**: products, categories, brands, product_images, product_specs
- **订单系统**: orders, order_items, cart_items
- **支付系统**: payments, payment_refunds
- **营销系统**: coupons, user_coupons
- **预售系统**: presales, presale_orders

## 开发指南

### 代码规范
- 遵循 Go 官方代码规范
- 使用 golangci-lint 进行代码检查
- 所有错误必须处理，不能忽略
- 使用 zap 进行日志记录

### 提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
refactor: 重构
test: 测试
chore: 构建/工具
```

### 分支策略
- `main`: 主分支，稳定版本
- `develop`: 开发分支
- `feature/*`: 功能分支
- `hotfix/*`: 紧急修复分支

## 许可证

MIT License
