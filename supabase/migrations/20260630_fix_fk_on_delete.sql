-- 修正所有 FK 的 ON DELETE 行為，讓永久刪除不會引發 FK violation
--
-- 策略：
--   orders / meal_transactions   → SET NULL（有快照欄位，歷史可保留）
--   tuition / attendance 系列    → CASCADE（學生主檔刪除時連帶清除）
--   meal_transactions.parent_id  → 保留 RESTRICT（NOT NULL 無法 SET NULL；
--                                   由應用層先刪交易再刪家長）
--   students.parent_id           → SET NULL（家長刪除後學生仍存在）

-- ── 1. orders ──────────────────────────────────────────────────────
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_student_id_fkey,
  DROP CONSTRAINT IF EXISTS orders_parent_id_fkey;

ALTER TABLE orders
  ADD CONSTRAINT orders_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
  ADD CONSTRAINT orders_parent_id_fkey
    FOREIGN KEY (parent_id)  REFERENCES parents(id)  ON DELETE SET NULL;

-- ── 2. students.parent_id ──────────────────────────────────────────
ALTER TABLE students
  DROP CONSTRAINT IF EXISTS students_parent_id_fkey;

ALTER TABLE students
  ADD CONSTRAINT students_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE SET NULL;

-- ── 3. meal_transactions.student_id ────────────────────────────────
ALTER TABLE meal_transactions
  DROP CONSTRAINT IF EXISTS meal_transactions_student_id_fkey;

ALTER TABLE meal_transactions
  ADD CONSTRAINT meal_transactions_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;

-- meal_transactions.parent_id NOT NULL → 不改，RESTRICT 保留
-- 應用層在永久刪除家長前先刪交易：parentService.permanentDelete() 已處理

-- ── 4. tuition_enrollments ─────────────────────────────────────────
ALTER TABLE tuition_enrollments
  DROP CONSTRAINT IF EXISTS tuition_enrollments_student_id_fkey;

ALTER TABLE tuition_enrollments
  ADD CONSTRAINT tuition_enrollments_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- ── 5. tuition_attendance ──────────────────────────────────────────
ALTER TABLE tuition_attendance
  DROP CONSTRAINT IF EXISTS tuition_attendance_student_id_fkey;

ALTER TABLE tuition_attendance
  ADD CONSTRAINT tuition_attendance_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- ── 6. attendance_logs ─────────────────────────────────────────────
ALTER TABLE attendance_logs
  DROP CONSTRAINT IF EXISTS attendance_logs_student_id_fkey;

ALTER TABLE attendance_logs
  ADD CONSTRAINT attendance_logs_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
