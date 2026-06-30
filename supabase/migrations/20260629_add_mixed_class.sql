-- 混合班：tuition_rates 新增全天/半天按日費率
ALTER TABLE tuition_rates
  ADD COLUMN IF NOT EXISTS mixed_full_daily numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mixed_half_daily numeric(10,2) DEFAULT 0;

-- tuition_enrollments：class_type 允許 'mixed'
ALTER TABLE tuition_enrollments
  DROP CONSTRAINT IF EXISTS tuition_enrollments_class_type_check;

ALTER TABLE tuition_enrollments
  ADD CONSTRAINT tuition_enrollments_class_type_check
  CHECK (class_type IN ('full', 'half', 'none', 'mixed'));

-- tuition_attendance / attendance_logs 的 calendar JSONB 欄位
-- 混合班使用 full / half / leave / none 四種狀態，無需 DDL 變更。
