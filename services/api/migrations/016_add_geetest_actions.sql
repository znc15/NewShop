-- +goose Up
INSERT INTO configs (key, value, type, category, description, is_public, version, created_at, updated_at) VALUES 
('geetest.enabled_actions', '["login", "register", "send_code", "reset_password", "checkout"]', 'array', 'system', '启用的极验行为列表', true, 1, NOW(), NOW());

-- +goose Down
DELETE FROM configs WHERE key = 'geetest.enabled_actions';