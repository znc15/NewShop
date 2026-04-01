-- +goose Up
-- +goose NO_TRANSACTION

CREATE TABLE IF NOT EXISTS home_banners (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  subtitle VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image_url VARCHAR(500) NOT NULL,
  link VARCHAR(500) NOT NULL DEFAULT '',
  button_text VARCHAR(60) NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_home_banners_status ON home_banners(status);
CREATE INDEX IF NOT EXISTS idx_home_banners_deleted_at ON home_banners(deleted_at);

CREATE TABLE IF NOT EXISTS home_reviews (
  id BIGSERIAL PRIMARY KEY,
  author VARCHAR(80) NOT NULL,
  handle VARCHAR(120) NOT NULL DEFAULT '',
  avatar VARCHAR(10) NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  sort INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_home_reviews_status ON home_reviews(status);
CREATE INDEX IF NOT EXISTS idx_home_reviews_deleted_at ON home_reviews(deleted_at);

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(180) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_newsletter_subscriptions_email UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_status ON newsletter_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_deleted_at ON newsletter_subscriptions(deleted_at);

INSERT INTO home_banners (title, subtitle, description, image_url, link, button_text, sort, status)
VALUES
  ('博丽灵梦 红白经典款', 'Bestseller ✦ 灵梦系列', '幻想乡的无节操巫女，以博丽神社为据点。Fumo 系列中最稳定的人气款。', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1920&auto=format&fit=crop', '/products?sort=sales', '立即领养', 1, 'active'),
  ('雾雨魔理沙 黑白经典款', 'New Arrival ✦ 魔理沙系列', '普通的黑白魔法使，个性鲜明。最新批次现货已到仓。', 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?q=80&w=1920&auto=format&fit=crop', '/new', '立即领养', 2, 'active'),
  ('琪露诺 最强冰妖精', 'Limited ✦ 琪露诺系列', '最强、最笨、最可爱的冰之妖精，数量有限。', 'https://images.unsplash.com/photo-1578469645760-b8ba6b42b260?q=80&w=1920&auto=format&fit=crop', '/products', '立即预约', 3, 'active')
ON CONFLICT DO NOTHING;

INSERT INTO home_reviews (author, handle, avatar, content, rating, sort, status)
VALUES
  ('凛华', '@rinkaaa · 已领养：灵梦 · 魔理沙', '凛', '终于收到梦寐以求的灵梦 Fumo 了，包装超级严实，吊牌完好无损。', 5, 1, 'active'),
  ('苍波 Aoba', '@aobawave · 已领养：绮罗人（代寻）', '苍', '托代寻服务找到了绝版款，全程沟通顺畅，开箱那一刻真的泪目。', 5, 2, 'active'),
  ('冰见千夏', '@chinatsu_ice · 已领养：琪露诺 · 灵梦 · 咲夜', '冰', '第三次回购了，这次买的限定版从下单到收到只用了三天。', 5, 3, 'active')
ON CONFLICT DO NOTHING;
