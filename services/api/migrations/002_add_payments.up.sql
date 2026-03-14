-- +goose Up
-- +goose StatementBegin

-- 支付记录表
CREATE TABLE payments (
    id              BIGSERIAL PRIMARY KEY,
    order_id        BIGINT NOT NULL,
    out_trade_no    VARCHAR(64) UNIQUE NOT NULL,
    trade_no        VARCHAR(64),
    user_id         BIGINT NOT NULL,
    payment_method  VARCHAR(20) NOT NULL,
    total_amount    DECIMAL(10,2) NOT NULL,
    paid_amount     DECIMAL(10,2) DEFAULT 0,
    refunded_amount DECIMAL(10,2) DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'pending',
    subject         VARCHAR(200),
    body            VARCHAR(500),
    passback        VARCHAR(500),
    expire_time     TIMESTAMP,
    paid_at         TIMESTAMP,
    refunded_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_out_trade_no ON payments(out_trade_no);
CREATE INDEX idx_payments_deleted_at ON payments(deleted_at);

-- 退款记录表
CREATE TABLE payment_refunds (
    id               BIGSERIAL PRIMARY KEY,
    payment_id       BIGINT NOT NULL,
    out_request_no   VARCHAR(64) UNIQUE NOT NULL,
    out_trade_no     VARCHAR(64) NOT NULL,
    refund_amount    DECIMAL(10,2) NOT NULL,
    refund_reason    VARCHAR(500),
    status           VARCHAR(20) DEFAULT 'pending',
    refund_trade_no  VARCHAR(64),
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_refunds_payment_id ON payment_refunds(payment_id);
CREATE INDEX idx_payment_refunds_out_trade_no ON payment_refunds(out_trade_no);
CREATE INDEX idx_payment_refunds_out_request_no ON payment_refunds(out_request_no);

-- +goose StatementEnd
