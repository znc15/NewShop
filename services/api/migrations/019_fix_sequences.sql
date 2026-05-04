-- +goose Up
-- +goose StatementBegin
-- 修复 seed 数据显式插入 ID 后 BIGSERIAL sequence 未同步的问题
SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories), 1));
SELECT setval('brands_id_seq', COALESCE((SELECT MAX(id) FROM brands), 1));
SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) FROM products), 1));
SELECT setval('product_skus_id_seq', COALESCE((SELECT MAX(id) FROM product_skus), 1));
SELECT setval('product_images_id_seq', COALESCE((SELECT MAX(id) FROM product_images), 1));
SELECT setval('product_attrs_id_seq', COALESCE((SELECT MAX(id) FROM product_attrs), 1));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- 无需回滚
-- +goose StatementEnd
