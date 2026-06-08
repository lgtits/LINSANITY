-- ════════════════════════════════════════════════════════════════
--  廣播記錄加上成功/失敗計數（配合 LINE 實際發送）
--  已建表的資料庫執行這支即可。
-- ════════════════════════════════════════════════════════════════
alter table broadcast_logs add column if not exists success_count int not null default 0;
alter table broadcast_logs add column if not exists fail_count    int not null default 0;
