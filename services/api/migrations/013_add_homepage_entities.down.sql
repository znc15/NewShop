-- +goose Down
-- +goose NO_TRANSACTION

DROP TABLE IF EXISTS newsletter_subscriptions;
DROP TABLE IF EXISTS home_reviews;
DROP TABLE IF EXISTS home_banners;
