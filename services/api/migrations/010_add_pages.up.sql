-- +goose Up
-- +goose NO_TRANSACTION

CREATE TABLE pages (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    slug VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    meta_title VARCHAR(200),
    meta_desc VARCHAR(500),
    status INT DEFAULT 0,
    sort_order INT DEFAULT 0
);

CREATE UNIQUE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_deleted_at ON pages(deleted_at);
CREATE INDEX idx_pages_status ON pages(status);
CREATE INDEX idx_pages_sort_order ON pages(sort_order);
