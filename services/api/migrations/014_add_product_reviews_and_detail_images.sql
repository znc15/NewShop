-- +goose Up
-- +goose NO_TRANSACTION

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS detail_images TEXT NOT NULL DEFAULT '';

ALTER TABLE home_reviews
  ADD COLUMN IF NOT EXISTS product_id BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_home_reviews_product_id ON home_reviews(product_id);
-- +goose Down
-- +goose NO_TRANSACTION

DROP INDEX IF EXISTS idx_home_reviews_product_id;

ALTER TABLE home_reviews
  DROP COLUMN IF EXISTS product_id;

ALTER TABLE products
  DROP COLUMN IF EXISTS detail_images;
