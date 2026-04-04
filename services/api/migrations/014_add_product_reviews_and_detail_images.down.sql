-- +goose Down
-- +goose NO_TRANSACTION

DROP INDEX IF EXISTS idx_home_reviews_product_id;

ALTER TABLE home_reviews
  DROP COLUMN IF EXISTS product_id;

ALTER TABLE products
  DROP COLUMN IF EXISTS detail_images;
