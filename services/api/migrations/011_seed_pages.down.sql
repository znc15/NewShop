-- +goose Up
-- +goose StatementBegin

DELETE FROM pages WHERE slug IN ('about', 'story', 'contact', 'join', 'guide', 'shipping', 'returns', 'service', 'help', 'feedback');

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 1;
-- +goose StatementEnd