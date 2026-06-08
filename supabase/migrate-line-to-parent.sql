-- ════════════════════════════════════════════════════════════════
--  把 LINE 推播 ID 從 students 搬到 parents
--  （LINE 是發給家長的，一個家長一個帳號，孩子共用）
--  已建表的資料庫執行這支即可；全新安裝用更新後的 schema.sql 不需要。
-- ════════════════════════════════════════════════════════════════
alter table parents add column if not exists line_user_id text default '';

-- 若 students 仍有資料且想保留既有 LINE ID，先搬過去（取每個家長名下任一非空值）
update parents p set line_user_id = sub.lid
from (
  select distinct on (parent_id) parent_id, line_user_id as lid
  from students
  where line_user_id is not null and line_user_id <> ''
  order by parent_id, id
) sub
where p.id = sub.parent_id
  and (p.line_user_id is null or p.line_user_id = '');

alter table students drop column if exists line_user_id;
