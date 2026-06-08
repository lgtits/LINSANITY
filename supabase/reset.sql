-- ════════════════════════════════════════════════════════════════
--  清空所有資料（保留表結構、視圖、RPC、RLS）
--  在 Supabase SQL Editor 執行。清空後即可從 app 介面從頭建立資料。
--  ⚠️ 不可復原。若想保留某些基礎資料（例如餐廳/菜單），把對應表
--     從下面清單移除即可。
-- ════════════════════════════════════════════════════════════════
truncate table
  order_items, orders, meal_transactions,
  attendance_logs, tuition_attendance, tuition_enrollments, tuition_rates,
  menu_items, restaurants, broadcast_logs, broadcast_templates,
  students, parents
restart identity cascade;
