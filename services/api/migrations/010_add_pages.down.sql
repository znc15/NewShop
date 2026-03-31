-- +goose Down
-- +goose NO_TRANSACTION

DROP INDEX IF EXISTS idx_pages_sort_order;
DROP INDEX IF EXISTS idx_pages_status;
DROP INDEX IF EXISTS idx_pages_deleted_at;
DROP INDEX IF EXISTS idx_pages_slug;
DROP TABLE IF EXISTS pages;
