-- +goose Up
INSERT INTO configs (key, value, type, category, description, is_public, version, created_at, updated_at) VALUES 
('geetest.id', '"3f538da6fc0df26e1996272406121183"', 'string', 'system', '极验 ID', true, 1, NOW(), NOW()),
('geetest.key', '"d5924a410cc6d2fb509adbc7489a20a5"', 'string', 'system', '极验 Key', false, 1, NOW(), NOW());

-- +goose Down

DELETE FROM configs WHERE key IN ('geetest.id', 'geetest.key');
