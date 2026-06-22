-- 費率表：新增附加活動定義
ALTER TABLE tuition_rates
  ADD COLUMN IF NOT EXISTS extra_activities jsonb NOT NULL DEFAULT '[]';

-- 報名表：新增學生報名的活動
ALTER TABLE tuition_enrollments
  ADD COLUMN IF NOT EXISTS extra_activities jsonb NOT NULL DEFAULT '[]';

-- 簽到表：新增學生實際參加的活動
ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS extra_activities jsonb NOT NULL DEFAULT '[]';
