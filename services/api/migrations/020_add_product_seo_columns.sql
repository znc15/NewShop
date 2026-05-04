-- +goose Up
-- +goose StatementBegin
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title VARCHAR(200) DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_keywords VARCHAR(500) DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description VARCHAR(500) DEFAULT '';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE products DROP COLUMN IF EXISTS seo_title;
ALTER TABLE products DROP COLUMN IF EXISTS seo_keywords;
ALTER TABLE products DROP COLUMN IF EXISTS seo_description;
-- +goose StatementEnd
