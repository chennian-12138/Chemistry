-- 为中英双语全文案/数据库内容增加 translations JSONB 列。
-- 用法：psql "$DATABASE_URL" -f backend/scripts/apply-translations-schema.sql
-- 也可以直接让部署脚本执行 npx prisma db push（但个别环境若已有 Prisma 管理不了的列，可改用手工 SQL）。
ALTER TABLE reaction ADD COLUMN IF NOT EXISTS translations jsonb;
ALTER TABLE reaction_tag ADD COLUMN IF NOT EXISTS translations jsonb;
ALTER TABLE reaction_pattern ADD COLUMN IF NOT EXISTS translations jsonb;
ALTER TABLE molecule_role ADD COLUMN IF NOT EXISTS translations jsonb;
ALTER TABLE section_description ADD COLUMN IF NOT EXISTS translations jsonb;
