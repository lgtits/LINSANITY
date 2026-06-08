# Supabase 遷移指南

這個資料夾是把目前 demo（`public/mock/*.json` + 記憶體 `api`）搬上 Supabase 的準備。

## 使用方式

1. Supabase 專案 → SQL Editor
2. 先貼 `schema.sql` 執行（建表、視圖、RPC、RLS）
3. 再貼 `seed.sql` 執行（帶入與 mock 相同的假資料）
4. 前端設定 `config.json` 的 `demoMode = false`，並在環境變數放
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`

## 資料表對照

| Mock 檔 | Supabase 表 | 主鍵 |
|---|---|---|
| parents.json | `parents` | id |
| students.json | `students` | id |
| restaurants.json | `restaurants` | id |
| menuItems.json | `menu_items` | id |
| orders.json + todayOrders.json | `orders` + `order_items` | id |
| mealTransactions.json | `meal_transactions` | id |
| tuitionRates.json | `tuition_rates` | month_key |
| tuitionEnrollments.json | `tuition_enrollments` | (month_key, student_id) |
| tuitionAttendance.json | `tuition_attendance`（預計） | (month_key, student_id) |
| attendanceLogs.json | `attendance_logs`（實際） | (month_key, student_id) |
| broadcastTemplates.json | `broadcast_templates` | id |
| broadcastLogs.json | `broadcast_logs` | id |

## 關鍵設計決策

- **文字主鍵**：沿用 `s1`/`p1`/`m1` 讓假資料能原樣帶入；**新資料**則由 `default gen_random_uuid()::text` 自動產生 id（前端 insert 不帶 id）。種子的短 id 與新資料的 uuid 共存皆為 text，沒問題。
- **餐費分類帳**：餘額不存欄位，`= SUM(meal_transactions.amount)`。已提供 `parent_balances` 視圖；前端 `getAllBalances` 可改查視圖。topup 的 `student_id` 為 null、金額為正；deduct 金額為負並標記孩子。
- **訂單快照**：`orders` 存下單當下的 `restaurant_name`/`student_name`，`order_items` 存當下 `price`，主檔改名/改價不影響歷史。
- **沒有 todayOrders 表**：demo 為了區隔「今日可編輯訂單」才拆兩份；Supabase 裡「今日訂單 = orders where date = current_date」。
- **學費月份資料**：`tuition_*` 用 `(month_key, student_id)` 複合主鍵，直接對應 mock 的「月→學生」巢狀結構。`calendar` 欄為 null 時前端會用 `total_days/absent_days` 還原日曆。

## 已修正的假資料問題

- `todayOrders.json` 補上 `parentId`（原本缺，會導致確認訂單時扣款掛不到家長）。

## 家長正規化（Phase 2，已完成）

- `students` **不存** 家長姓名/電話，只留 `parent_id`。前端看到的 `student.parentName`/`phone`
  是衍生的：supabase 用 `select('*, parents(name, phone)')` join，demo 用 `parents` 拼接。
- 單一真相在 `parents`：改家長姓名/電話一處即全家反映，不會分裂或不同步。
- 新增/編輯學生時，家長以**下拉選擇**（`parent_id`），不再用電話猜身分。
- **若你的資料庫是用舊版 schema（含 `parent_name`/`phone`）建的**，跑一次
  `migrate-phase2.sql` 把那兩欄移除即可（程式即使欄位還在也能正常運作，移除只是清乾淨）。
- 訂單的 `student_name`/`grade`/`restaurant_name` 仍是**下單當下快照**，**不要**改成即時 join。

## Service 的 Supabase 分支（已全部補完）

所有 service 都已具備 `isDemoMode ? demo : supabase` 雙分支，並用 mapper
對齊 snake_case ↔ camelCase：

- `studentService`、`orderService`、`mealService`、`restaurantService`
- `parentService`、`tuitionService`、`attendanceService`、`broadcastService`

切換只需把 `config.json` 的 `demoMode` 設為 `false`、填好環境變數即可。

幾個實作重點：

- **餘額**：`mealService.getBalance / getAllBalances` 查 `parent_balances` 視圖。
- **訂單**：`orderService.saveOrder` 呼叫 `rpc('save_order', { payload })`；
  `deleteOrderItem` 會重算 `total`、品項清空時刪整筆訂單。
- **出席**：`calendar` 為 null 時 service 不帶該欄，讓前端用 total/absent 還原日曆。
- **時間**：DB timestamptz 讀出後統一格式化為 `YYYY-MM-DD HH:mm` 再回前端。

## ⚠️ 安全性

`schema.sql` 最後對所有表開了 `demo_all`（全開放讀寫）policy，只為了讓
目前用 anon key、無登入的前端能跑。**正式上線前**請改成依 `auth.uid()`
或自訂角色限制，例如只有後台帳號可寫、家長只能讀自己孩子的資料。
