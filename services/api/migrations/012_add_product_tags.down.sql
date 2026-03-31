-- +goose Down
-- +goose NO_TRANSACTION

ALTER TABLE products DROP COLUMN IF EXISTS is_sale;
ALTER TABLE products DROP COLUMN IF EXISTS is_hot;
