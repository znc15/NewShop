-- +goose Up
-- +goose StatementBegin

-- 预售商品表
CREATE TABLE presales (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deposit_amount BIGINT NOT NULL,        -- 定金金额（分）
    balance_amount BIGINT NOT NULL,        -- 尾款金额（分）
    original_price BIGINT NOT NULL,        -- 原价（分）
    deposit_start_time TIMESTAMP NOT NULL, -- 定金开始时间
    deposit_end_time TIMESTAMP NOT NULL,   -- 定金结束时间
    balance_start_time TIMESTAMP NOT NULL, -- 尾款开始时间
    balance_end_time TIMESTAMP NOT NULL,   -- 尾款结束时间
    deliver_time TIMESTAMP NOT NULL,       -- 预计发货时间
    total_stock INT NOT NULL DEFAULT 0,    -- 预售总库存
    sold_count INT NOT NULL DEFAULT 0,     -- 已售数量
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_presales_product_id ON presales(product_id);
CREATE INDEX idx_presales_status ON presales(status);
CREATE INDEX idx_presales_deleted_at ON presales(deleted_at);
CREATE INDEX idx_presales_deposit_time ON presales(deposit_start_time, deposit_end_time);
CREATE INDEX idx_presales_balance_time ON presales(balance_start_time, balance_end_time);

-- 预售订单表
CREATE TABLE presale_orders (
    id BIGSERIAL PRIMARY KEY,
    presale_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    order_id BIGINT,                       -- 关联的主订单ID
    deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
    deposit_paid_at TIMESTAMP,
    balance_paid BOOLEAN NOT NULL DEFAULT FALSE,
    balance_paid_at TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_deposit',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_presale_orders_presale_id ON presale_orders(presale_id);
CREATE INDEX idx_presale_orders_user_id ON presale_orders(user_id);
CREATE INDEX idx_presale_orders_order_id ON presale_orders(order_id);
CREATE INDEX idx_presale_orders_status ON presale_orders(status);
CREATE INDEX idx_presale_orders_deleted_at ON presale_orders(deleted_at);

-- +goose StatementEnd
