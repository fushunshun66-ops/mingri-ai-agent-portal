-- 启用关键扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 初始数据：系统预置角色
-- 将在应用启动时通过代码插入，此处仅预置扩展
