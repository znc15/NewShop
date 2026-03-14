-- +goose Up
-- +goose StatementBegin

-- 优惠券模板表
CREATE TABLE coupons (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    type        INT NOT NULL,                      -- 1-满减 2-折扣 3-无门槛
    amount      DECIMAL(10,2),                     -- 优惠金额(满减/无门槛时使用)
    min_amount  DECIMAL(10,2) DEFAULT 0,           -- 最低消费金额
    discount    DECIMAL(3,2),                      -- 折扣率(0.8表示8折)
    total_count INT NOT NULL DEFAULT 0,            -- 发放总量
    used_count  INT NOT NULL DEFAULT 0,            -- 已领取数量
    per_limit   INT NOT NULL DEFAULT 1,            -- 每人限领数量
    start_time  TIMESTAMP NOT NULL,                -- 生效开始时间
    end_time    TIMESTAMP NOT NULL,                -- 生效结束时间
    status      INT NOT NULL DEFAULT 2,            -- 1-未开始 2-进行中 3-已结束
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    deleted_at  TIMESTAMP
);

CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_coupons_start_time ON coupons(start_time);
CREATE INDEX idx_coupons_end_time ON coupons(end_time);
CREATE INDEX idx_coupons_deleted_at ON coupons(deleted_at);

-- 用户优惠券表
CREATE TABLE user_coupons (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    coupon_id  BIGINT NOT NULL REFERENCES coupons(id),
    status     INT NOT NULL DEFAULT 1,             -- 1-未使用 2-已使用 3-已过期
    used_time  TIMESTAMP,                          -- 使用时间
    order_id   BIGINT DEFAULT 0,                   -- 使用的订单ID
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX idx_user_coupons_status ON user_coupons(status);
CREATE INDEX idx_user_coupons_user_coupon ON user_coupons(user_id, coupon_id);

-- +goose StatementEnd
