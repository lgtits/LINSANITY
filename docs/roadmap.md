# 交接清單 & 功能 Backlog

## A. 從「我的測試 LINE」切換成「客戶的 LINE」

### 客戶必須提供
| 項目 | 哪裡拿 | 用途 |
|---|---|---|
| **LINE 官方帳號**(Messaging API channel) | 客戶自己在 LINE Developers / OA Manager 申請 | 整個發送/接收的基礎 |
| **Channel access token**(長,~170字) | channel → Messaging API 分頁 → Issue | 發送訊息、抓 profile |
| **Channel secret**(短,~32字) | channel → Basic settings 分頁 | webhook 驗章 |

> 其他(`SUPABASE_URL`、`SERVICE_ROLE_KEY`)是 Supabase 自動注入,**不用**客戶提供。

### 切換步驟
```bash
npx supabase secrets set LINE_CHANNEL_ACCESS_TOKEN=客戶的token
npx supabase secrets set LINE_CHANNEL_SECRET=客戶的secret
npx supabase functions deploy send-broadcast
npx supabase functions deploy line-webhook --no-verify-jwt
```
- 在**客戶的** LINE channel → Messaging API → Webhook 設 URL：
  `https://<專案>.supabase.co/functions/v1/line-webhook`,開 Use webhook、Verify、關自動回應。

### ⚠️ 最重要的陷阱:userId 不能沿用
- **userId 是「綁定在某個官方帳號」的**。我測試時用我的 OA 收集到的 userId,在客戶的 OA **完全無效**。
- 切換後必須:
  1. 清空 `line_contacts`（`delete from line_contacts;`）
  2. 清空所有 `parents.line_user_id`（`update parents set line_user_id='';`）
  3. 請客戶的家長**重新加客戶的 OA 好友** → 重新蒐集 → 重新綁定
- 換句話說:LINE 這塊在客戶端等於**重新收集一次**,程式不用改,資料要重來。

### 還要決定
- **Supabase 專案歸誰**：客戶自己開一個(建議,帳單/資料都歸客戶),還是你代管。前端 `.env.local` 的 URL/anon key 要指到正式專案。
- 客戶 OA 的**免費訊息額度**(超過要升級,屬 LINE 方案)。

---

## B. 上線前「必做」(安全)
- [ ] **加登入**(Supabase Auth)— 目前完全沒有登入
- [ ] **收緊 RLS**：拿掉 `demo_all`,改成依登入身分;`broadcast_logs` 只允許 service role 寫
- [ ] 定期備份排程(目前是手動 `npm run backup`)

## C. 功能 Backlog（可挑著做）

### 家長 / 學生
- [ ] **家長封存 / 刪除**(你提的，設計見下)
- [ ] 重複家長合併(同一家長被建兩筆時合併)
- [ ] 學生「畢業」批次處理

### 老師(新功能，設計見 F)
- [ ] **老師管理頁**：老師清單 + 新增/編輯，欄位比照家長(name/phone/lineUserId)。mock `public/mock/teachers.json` 已建
- [ ] `teacherService.js`(比照 `parentService`) + 路由與選單入口
- [ ] schema 加 `teachers` 表
- [ ] **老師點餐記帳**：走「記帳 + 月結」模式，需先定案資料模型(見 F)

### LINE / 通知
- [ ] 綁定後自動發「綁定成功」確認訊息
- [ ] 匯出加好友 QR / 連結,方便發給家長
- [ ] 失敗訊息**一鍵重送**(只重送 status=failed 的)
- [ ] **排程自動發送**(例：每天放學自動發當日餐費通知)— 需 pg_cron 或排程 function
- [ ] 低餘額自動提醒(餘額 < 門檻自動發 LINE)
- [ ] Flex Message(漂亮的餐費卡片,取代純文字)
- [ ] 家長回覆收件匣(webhook 已存 last_message,可做簡單檢視)

### 餐費 / 訂餐
- [ ] 月結帳單匯出 / 對帳
- [ ] 訂餐截止時間鎖定

### 學費 / 簽到
- [ ] 簽到完發 LINE(今日已到 / 缺席通知)
- [ ] 月底退費自動算 + 通知

### 維運
- [ ] 操作稽核紀錄
- [ ] 多帳號 / 角色權限

---

## D. 家長封存 / 刪除 — 設計建議

學生已有 `archived` / `deleted`(軟刪),家長照同模式,但**多一層守門**,因為家長被很多東西參照(學生、交易、LINE)：

- **封存(archived)**：從主列表隱藏、可復原。
  - 守門:若名下還有**在籍學生**,跳提示(這些學生會沒有家長顯示),建議先處理學生再封存。
- **刪除**：
  - 不能直接硬刪——`students` / `meal_transactions` 都有 FK 指向 parents,硬刪會被擋。
  - 作法 A(建議)：**軟刪**(`deleted` 旗標),保留歷史與餘額紀錄。
  - 作法 B：只有「完全沒有學生、沒有交易、沒綁 LINE」的孤兒家長才允許硬刪。
- 對應要做：schema 加 `archived`/`deleted` 欄 + 遷移、`parentService` 加 archive/delete/restore、家長管理頁加按鈕與「封存家長」清單(比照學生的封存/刪除頁)。

> 建議先做「封存 + 軟刪 + 守門提示」,跟學生一致,最安全。

---

## F. 老師管理 + 老師記帳 — 設計討論（2026-06，待定案）

### 老師管理
- 進入後是老師清單，欄位比照家長：`name` / `phone` / `lineUserId`。
- mock 已建 `public/mock/teachers.json`(id 用 `t*`)。
- 不放家長專屬的金流欄位(餘額/儲值)，金流另議(見下)。
- 待確認：老師是否要家長沒有的欄位(教授科目/班別、到職日、備註)。

### 老師點餐記帳 — 資料模型(未定案)
問題：老師點餐記帳能不能直接共用 `meal_transactions`？
**不能直接共用**——該表 `parent_id NOT NULL references parents`，餘額 view `parent_balances` 也綁死 parent_id；老師不是家長，塞不進去。三條路：

| 方案 | 做法 | 優點 | 缺點 |
|---|---|---|---|
| **A. 通用帳戶(傾向)** | 擁有者改 `owner_type`(parent/teacher)+`owner_id` | 一套邏輯吃兩種人，記錄/餘額共用 | 改欄位 + 既有查詢(demo mock 改動輕) |
| B. 加 `teacher_id` | 與 parent_id 並存，二擇一 + XOR 約束 | 改動小 | 每個查詢分叉、越長越亂 |
| C. 獨立 `teacher_transactions` | 另開一張一樣的表 | 完全隔離 | mealService 複製兩份 |

**待客戶決定的產品語意**：老師記帳是
- (a) 跟家長一樣「先儲值再扣款」，還是
- (b)「先記帳、月底結算」的月結帳？

> 若走 (b) 月結，順手把「結帳快照」做進去(見下)，資料模型一次到位。

### 帳本效能(順帶結論)
- `parent_balances` 是**普通 view**，每次查餘額重掃全表做 `SUM ... GROUP BY`(有 `parent_id` 索引)。
- 量級估算：~150 童、每月約 3,150 筆 ≈ **3.8 萬筆/年**，10 年 ~38 萬筆。對 Postgres 是小資料，純 view 撐十年沒問題。
- 單一家長查餘額會把條件下推成 `SUM WHERE parent_id=?` 吃索引，**與總筆數無關**，永遠快。
- **真正先卡的是前端**：`ParentsPage` 載入呼叫 `getAllTransactions()` 把整張表撈到瀏覽器再 JS 分組。幾年後第一個要改的 → 列表頁別撈全表，明細改成點開家長才查 `getTransactions(parentId)`(已有此 API)。
- 要再擴的順序：① 覆蓋索引 `(parent_id, amount)` → index-only；② **月結快照**(每月底寫結轉餘額，掃描收斂成當月)，剛好對應老師月結需求；③ 百萬列以上才考慮 materialized view 定時刷新或觸發器維護 `balance` 欄。

---

## E. 已知行為紀錄（目前刻意不處理）

### LINE userId 與家長的綁定關係
- **正常 UI 流程是 1:1**:綁定選單只列「未綁定 + 目前家長已綁的」聯絡人,無法用選單把同一聯絡人指給第二個家長;綁定時也會清掉該家長原本綁的其他聯絡人。
- **但非資料庫強制**:`parents.line_user_id` 沒有唯一限制。手動把同一串 `Uxxx` 貼到多個家長是擋不住的,且改綁聯絡人到新家長時,舊家長的 `line_user_id` 不會自動清除 → 可能殘留重複。
- **決定(2026-06)**:**暫不做 1:1 強制,也不做發送去重**,只留此紀錄。日後若真的遇到重複造成困擾,再評估:`line_user_id` 加唯一限制 + 改綁清舊 + 手動貼重複時擋下。

### 時區
- 前端「今天」判斷 → **已修**(`src/lib/datetime.js` 本地時間)。
- `send-broadcast` 的 `sent_at` → **已修**(改寫台灣本地時間,需重部署 send-broadcast)。
- ⏳ `line-webhook` 的 `line_contacts.updated_at` 仍是 UTC,但**目前畫面沒顯示**,等之後要顯示聯絡人時間時再一起改+重部署。
- 1 筆測試期間的訂單 `datetime` 與 `date` 對不齊(舊碼遺留),切換客戶清空就消失,不特別處理。
