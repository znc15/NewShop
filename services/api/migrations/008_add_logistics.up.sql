-- +goose Up
-- +goose StatementBegin

-- 物流公司表
CREATE TABLE logistics_companies (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(50) UNIQUE NOT NULL,
    website         VARCHAR(255),
    phone           VARCHAR(50),
    logo            VARCHAR(500),
    sort_order      INT DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_logistics_companies_code ON logistics_companies(code);
CREATE INDEX idx_logistics_companies_status ON logistics_companies(status);

-- 订单物流表（如果不存在则创建）
CREATE TABLE IF NOT EXISTS order_logistics (
    id                 BIGSERIAL PRIMARY KEY,
    order_id           BIGINT UNIQUE NOT NULL,
    company_id         BIGINT NOT NULL,
    tracking_no        VARCHAR(100) NOT NULL,
    status             VARCHAR(20) DEFAULT 'pending',
    traces             JSONB DEFAULT '[]'::jsonb,
    sender_name        VARCHAR(100),
    sender_phone       VARCHAR(50),
    sender_address     VARCHAR(500),
    receiver_name      VARCHAR(100),
    receiver_phone     VARCHAR(50),
    receiver_address   VARCHAR(500),
    estimated_time     TIMESTAMP,
    actual_time        TIMESTAMP,
    weight             DECIMAL(10,2),
    freight_fee        DECIMAL(10,2),
    remark             VARCHAR(500),
    created_at         TIMESTAMP DEFAULT NOW(),
    updated_at         TIMESTAMP DEFAULT NOW(),
    deleted_at         TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_logistics_order ON order_logistics(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logistics_company ON order_logistics(company_id);
CREATE INDEX IF NOT EXISTS idx_order_logistics_status ON order_logistics(status);

-- 插入常用物流公司数据
INSERT INTO logistics_companies (name, code, website, phone, sort_order, status) VALUES
('顺丰速运', 'SF', 'https://www.sf-express.com', '95338', 1, 'active'),
('中通快递', 'ZTO', 'https://www.zto.com', '95311', 2, 'active'),
('圆通速递', 'YTO', 'https://www.yto.net.cn', '95554', 3, 'active'),
('申通快递', 'STO', 'https://www.sto.cn', '95543', 4, 'active'),
('韵达快递', 'YD', 'https://www.yundaex.com', '95546', 5, 'active'),
('邮政EMS', 'EMS', 'https://www.ems.com.cn', '11183', 6, 'active'),
('百世快递', 'BEST', 'https://www.800best.com', '95320', 7, 'active'),
('德邦快递', 'DBKD', 'https://www.deppon.com', '95353', 8, 'active'),
('京东物流', 'JD', 'https://www.jdl.com', '950616', 9, 'active'),
('极兔速递', 'JTSD', 'https://www.jtexpress.com', '95820', 10, 'active');

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS order_logistics;
DROP TABLE IF EXISTS logistics_companies;

-- +goose StatementEnd