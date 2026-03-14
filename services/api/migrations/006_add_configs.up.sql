-- +goose Up
-- +goose NO_TRANSACTION

-- 配置表
CREATE TABLE configs (
    id              BIGSERIAL PRIMARY KEY,
    key             VARCHAR(255) UNIQUE NOT NULL,
    value           JSONB NOT NULL,
    type            VARCHAR(50) NOT NULL,
    category        VARCHAR(100) NOT NULL,
    description     TEXT,
    is_public       BOOLEAN DEFAULT FALSE,
    version         INT DEFAULT 1,
    previous_value  JSONB,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_configs_category ON configs(category);
CREATE INDEX idx_configs_is_public ON configs(is_public);
CREATE INDEX idx_configs_deleted_at ON configs(deleted_at);

-- 配置变更历史表
CREATE TABLE config_histories (
    id              BIGSERIAL PRIMARY KEY,
    config_id       BIGINT NOT NULL REFERENCES configs(id),
    old_value       JSONB,
    new_value       JSONB NOT NULL,
    changed_by      BIGINT NOT NULL,
    change_reason   TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_config_histories_config ON config_histories(config_id);

-- +goose Down
-- +goose NO_TRANSACTION

DROP INDEX IF EXISTS idx_config_histories_config;
DROP TABLE IF EXISTS config_histories;
DROP INDEX IF EXISTS idx_configs_deleted_at;
DROP INDEX IF EXISTS idx_configs_is_public;
DROP INDEX IF EXISTS idx_configs_category;
DROP TABLE IF EXISTS configs;
