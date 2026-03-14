-- +goose Down
-- +goose NO_TRANSACTION

DROP INDEX IF EXISTS idx_config_histories_config;
DROP TABLE IF EXISTS config_histories;
DROP INDEX IF EXISTS idx_configs_deleted_at;
DROP INDEX IF EXISTS idx_configs_is_public;
DROP INDEX IF EXISTS idx_configs_category;
DROP TABLE IF EXISTS configs;
