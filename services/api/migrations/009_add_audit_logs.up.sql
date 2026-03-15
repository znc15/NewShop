-- 审计日志表迁移
-- 记录用户操作行为，用于安全审计和问题追溯

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id INTEGER,
    ip VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(36),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以优化查询性能
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id);

-- 添加注释
COMMENT ON TABLE audit_logs IS '审计日志表，记录用户关键操作';
COMMENT ON COLUMN audit_logs.user_id IS '操作用户ID';
COMMENT ON COLUMN audit_logs.action IS '操作类型：login, logout, order_create等';
COMMENT ON COLUMN audit_logs.resource IS '资源类型：user, order, product等';
COMMENT ON COLUMN audit_logs.resource_id IS '资源ID';
COMMENT ON COLUMN audit_logs.ip IS '客户端IP地址';
COMMENT ON COLUMN audit_logs.user_agent IS '用户代理字符串';
COMMENT ON COLUMN audit_logs.request_id IS '请求唯一标识符';
COMMENT ON COLUMN audit_logs.details IS '操作详情JSON';
