-- +goose Up
-- +goose StatementBegin

-- 积分记录表
CREATE TABLE points_records (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    points      INT NOT NULL,                       -- 积分变动（正为增加，负为扣减）
    balance     INT NOT NULL,                       -- 变动后余额
    type        VARCHAR(50) NOT NULL,               -- 积分类型：check_in/purchase/consume/refund/manual_add/manual_deduct/continuous_bonus
    description VARCHAR(255),                       -- 描述
    related_id  BIGINT DEFAULT 0,                   -- 关联ID（如订单ID）
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_points_records_user_id ON points_records(user_id);
CREATE INDEX idx_points_records_type ON points_records(type);
CREATE INDEX idx_points_records_created_at ON points_records(created_at);

-- 签到记录表
CREATE TABLE check_ins (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL,
    check_date       DATE NOT NULL,                 -- 签到日期
    continuous_days  INT DEFAULT 1,                 -- 连续签到天数
    points_earned    INT NOT NULL,                  -- 获得积分
    created_at       TIMESTAMP DEFAULT NOW(),
    CONSTRAINT idx_user_date UNIQUE (user_id, check_date)
);

CREATE INDEX idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX idx_check_ins_check_date ON check_ins(check_date);

-- 会员等级表
CREATE TABLE member_levels (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(50) NOT NULL,
    min_points INT NOT NULL,                        -- 最低积分要求
    max_points INT NOT NULL,                        -- 最高积分上限
    discount   DECIMAL(3,2) DEFAULT 1.00,           -- 折扣率（0.95表示95折）
    icon       VARCHAR(255),                        -- 等级图标
    rights     JSONB,                               -- 等级权益（数组）
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_member_levels_points ON member_levels(min_points, max_points);

-- 会员经验值表
CREATE TABLE member_experiences (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL UNIQUE,
    total_points INT DEFAULT 0,                     -- 累计积分
    current_level INT DEFAULT 1,                    -- 当前等级
    experience   INT DEFAULT 0,                     -- 当前经验值
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW(),
    deleted_at   TIMESTAMP
);

CREATE INDEX idx_member_experiences_user_id ON member_experiences(user_id);
CREATE INDEX idx_member_experiences_level ON member_experiences(current_level);
CREATE INDEX idx_member_experiences_deleted_at ON member_experiences(deleted_at);

-- 经验值变动日志表
CREATE TABLE experience_logs (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    points     INT NOT NULL,                        -- 经验变动
    type       VARCHAR(50) NOT NULL,                -- 变动类型
    remark     VARCHAR(255),                        -- 备注
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_experience_logs_user_id ON experience_logs(user_id);
CREATE INDEX idx_experience_logs_type ON experience_logs(type);
CREATE INDEX idx_experience_logs_created_at ON experience_logs(created_at);

-- 初始化会员等级数据
INSERT INTO member_levels (name, min_points, max_points, discount, rights) VALUES
('普通会员', 0, 99, 1.00, '[]'),
('铜牌会员', 100, 499, 0.98, '["专属客服","生日礼包"]'),
('银牌会员', 500, 1999, 0.95, '["专属客服","生日礼包","积分加倍","免费包邮"]'),
('金牌会员', 2000, 4999, 0.92, '["专属客服","生日礼包","积分加倍","免费包邮","优先发货","专属折扣"]'),
('钻石会员', 5000, 999999, 0.88, '["专属客服","生日礼包","积分加倍","免费包邮","优先发货","专属折扣","VIP活动","1对1服务"]');

-- +goose StatementEnd
