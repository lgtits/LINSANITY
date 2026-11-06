-- 餐費退費：meal_transactions 新增 type = 'refund'
--
-- 退費是「把錢還給家長」，金額為負、student_id 為 null。
-- 不沿用 'deduct'，避免帳務明細／匯出把退費算進「消費」。
-- 餘額仍是 SUM(amount)，parent_balances 視圖不需更動。

ALTER TABLE meal_transactions
  DROP CONSTRAINT IF EXISTS meal_transactions_type_check;

ALTER TABLE meal_transactions
  ADD CONSTRAINT meal_transactions_type_check
  CHECK (type IN ('topup', 'deduct', 'refund'));
