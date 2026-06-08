-- ════════════════════════════════════════════════════════════════
--  Phase 2 正規化遷移
--  已經跑過舊 schema（students 含 parent_name / phone）的資料庫，執行這支即可。
--  全新安裝請直接用更新後的 schema.sql，不需要這支。
--
--  家長姓名/電話改為一律從 parents join 取得，移除 students 的反正規化複本。
-- ════════════════════════════════════════════════════════════════
alter table students drop column if exists parent_name;
alter table students drop column if exists phone;
