-- +goose Up
-- +goose StatementBegin

-- 用户表
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(50) UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    nickname        VARCHAR(100),
    avatar          VARCHAR(500),
    member_level    INT DEFAULT 1,
    points          INT DEFAULT 0,
    status          VARCHAR(50) DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);

-- 管理员表
CREATE TABLE admins (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    nickname        VARCHAR(100),
    role            VARCHAR(50) NOT NULL,
    status          VARCHAR(50) DEFAULT 'active',
    last_login_at   TIMESTAMP,
    last_login_ip   VARCHAR(45),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

-- 用户收货地址表
CREATE TABLE user_addresses (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    name            VARCHAR(100) NOT NULL,
    phone           VARCHAR(50) NOT NULL,
    province        VARCHAR(50) NOT NULL,
    city            VARCHAR(50) NOT NULL,
    district        VARCHAR(50) NOT NULL,
    address         VARCHAR(255) NOT NULL,
    is_default      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_addresses_user ON user_addresses(user_id);

-- +goose StatementEnd

