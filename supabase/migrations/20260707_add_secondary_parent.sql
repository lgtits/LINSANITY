-- 次要家長：只用來「多收一份一樣的訊息」，不牽動餘額/學生/訂單
-- secondary_name        供辨識與發送紀錄顯示（如「王媽媽（次要）」）
-- secondary_line_user_id 次要收件人的 LINE userId
ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS secondary_name         text DEFAULT '',
  ADD COLUMN IF NOT EXISTS secondary_line_user_id text DEFAULT '';
