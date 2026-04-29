-- +goose Up
-- +goose StatementBegin

INSERT INTO admins (username, password_hash, nickname, role, status, created_at, updated_at)
VALUES (
  'admin@newshop.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  '超级管理员',
  'super_admin',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM admins WHERE username = 'admin@newshop.com';
-- +goose StatementEnd
