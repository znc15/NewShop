-- +goose Up
-- +goose StatementBegin

CREATE TABLE categories (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    parent_id   BIGINT DEFAULT 0,
    level       INT DEFAULT 1,
    sort        INT DEFAULT 0,
    icon        VARCHAR(500),
    status      VARCHAR(50) DEFAULT 'active',
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    deleted_at  TIMESTAMP
);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_deleted_at ON categories(deleted_at);

CREATE TABLE brands (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    logo        VARCHAR(500),
    description VARCHAR(1000),
    sort        INT DEFAULT 0,
    status      VARCHAR(50) DEFAULT 'active',
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    deleted_at  TIMESTAMP
);
CREATE UNIQUE INDEX idx_brands_name ON brands(name);
CREATE INDEX idx_brands_deleted_at ON brands(deleted_at);

CREATE TABLE products (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    category_id     BIGINT NOT NULL,
    brand_id        BIGINT,
    main_image      VARCHAR(500),
    images          TEXT,
    price           BIGINT NOT NULL,
    original_price  BIGINT DEFAULT 0,
    stock           INT DEFAULT 0,
    sales           INT DEFAULT 0,
    is_hot          BOOLEAN DEFAULT false,
    is_sale         BOOLEAN DEFAULT false,
    description     TEXT,
    detail          TEXT,
    detail_images   TEXT,
    status          VARCHAR(50) DEFAULT 'draft',
    sort            INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);

CREATE TABLE product_skus (
    id          BIGSERIAL PRIMARY KEY,
    product_id  BIGINT NOT NULL REFERENCES products(id),
    sku_code    VARCHAR(100),
    specs       TEXT,
    price       BIGINT NOT NULL,
    stock       INT DEFAULT 0,
    image       VARCHAR(500),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    deleted_at  TIMESTAMP
);
CREATE UNIQUE INDEX idx_product_skus_sku_code ON product_skus(sku_code);
CREATE INDEX idx_product_skus_product_id ON product_skus(product_id);
CREATE INDEX idx_product_skus_deleted_at ON product_skus(deleted_at);

CREATE TABLE product_images (
    id          BIGSERIAL PRIMARY KEY,
    product_id  BIGINT NOT NULL REFERENCES products(id),
    url         VARCHAR(500) NOT NULL,
    sort        INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    deleted_at  TIMESTAMP
);
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_deleted_at ON product_images(deleted_at);

CREATE TABLE product_attrs (
    id          BIGSERIAL PRIMARY KEY,
    product_id  BIGINT NOT NULL REFERENCES products(id),
    name        VARCHAR(100) NOT NULL,
    value       VARCHAR(500) NOT NULL,
    sort        INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    deleted_at  TIMESTAMP
);
CREATE INDEX idx_product_attrs_product_id ON product_attrs(product_id);
CREATE INDEX idx_product_attrs_deleted_at ON product_attrs(deleted_at);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS product_attrs;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS product_skus;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS brands;
DROP TABLE IF EXISTS categories;
-- +goose StatementEnd
