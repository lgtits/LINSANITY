-- 家長封存／軟刪除欄位
ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted  boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS parents_archived_idx ON parents (archived, deleted);
