# LINE 發送功能 — 你要做的設定

程式我都寫好了（Edge Function `send-broadcast`、前端、log schema）。
以下三步是只有你能做的（需要你的帳號權限）。**第 1、3 步做完就能用「模擬模式」跑完整流程**，
第 2 步（LINE token）拿到後才會真的送出。

---

## 步驟 1：跑 SQL 遷移（加成功/失敗計數欄）

Supabase → SQL Editor，貼上執行：

> 全新安裝用 `schema.sql` 已含這兩欄，可跳過此步；舊資料庫才需補跑：

```sql
alter table broadcast_logs add column if not exists success_count int not null default 0;
alter table broadcast_logs add column if not exists fail_count    int not null default 0;
```

---

## 步驟 2：LINE Developers 拿憑證（要真送才需要）

1. 到 https://developers.line.biz/ → 用 LINE 帳號登入
2. 建一個 **Provider** → 在底下建一個 **Messaging API channel**（這會對應一個官方帳號 OA）
3. 進 channel → **Messaging API** 分頁 → 最下面 **Channel access token (long-lived)** → 按 Issue，複製那串 token
4. ⚠️ **收件人限制**：LINE 只能發給「**已加你 OA 為好友**」的人，而且要他們的 `Uxxxxxxxx` **userId**。
   - userId 不是隨便編的，要從 **webhook**（用戶傳訊息給 OA 時）取得，或從你既有系統匯入。
   - 先測試的話：自己用 LINE 加這個 OA 好友，傳一句話，從 webhook log 拿到自己的 userId，填到「家長管理」某個家長的 LINE ID。
   - （webhook 接收 userId 是另一塊，要的話我再幫你做一支收集 userId 的 function。）

> 免費 OA 每月有免費訊息則數上限，超過要升級，這是 LINE 那邊的方案。

---

## 步驟 3：用 Supabase CLI 部署 Function

需要 Node（你已有）。在專案根目錄執行：

```bash
# 1) 登入（會開瀏覽器授權）
npx supabase login

# 2) 連到你的專案
npx supabase link --project-ref qzoehylpdjeeaufznbrz

# 3) 設定 LINE token（步驟 2 拿到的；還沒拿到可先跳過，會走模擬模式）
npx supabase secrets set LINE_CHANNEL_ACCESS_TOKEN=你的token

# 4) 部署
npx supabase functions deploy send-broadcast
```

- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 是 Supabase 自動注入的，**不用手動設**。
- 之後改了 function 重新 `deploy` 即可；改 token 重新 `secrets set` 即可。

---

## 完成後怎麼測

1. App → 訊息系統 → 發送訊息 → 選家長 → 發送
2. **沒設 token**：會顯示「模擬發送完成」，並在「訊息記錄」看到每位標「模擬」
3. **有設 token**：真的送到 LINE，記錄裡每位標「成功/失敗」，失敗會附 LINE 回的錯誤原因
4. 不論成功失敗都會寫一筆 log（你要的稽核軌跡）

---

# 蒐集家長 userId（webhook）

push 訊息只能發給「加過你 OA 好友」且你有他 `Uxxx` userId 的人。userId 要靠 webhook 自動蒐集。
程式已做好：`line-webhook` function + `line_contacts` 表 + 家長管理的「綁定」UI。

## 步驟 A：SQL Editor 跑遷移（建 line_contacts 表）
> 全新安裝用 `schema.sql` 已含此表，可跳過；舊資料庫才需補跑：

```sql
create table if not exists line_contacts (
  user_id          text primary key,
  display_name     text default '',
  picture_url      text default '',
  last_message     text,
  linked_parent_id text references parents(id) on delete set null,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists line_contacts_linked_idx on line_contacts (linked_parent_id);

alter table line_contacts enable row level security;
drop policy if exists demo_all on line_contacts;
create policy demo_all on line_contacts for all using (true) with check (true);
```

## 步驟 B：設 Channel secret 並部署 webhook
```bash
# Channel secret 在 LINE channel 的「Basic settings」分頁
npx supabase secrets set LINE_CHANNEL_SECRET=你的channel_secret

# ⚠️ webhook 一定要加 --no-verify-jwt（LINE 不會帶 Supabase token）
npx supabase functions deploy line-webhook --no-verify-jwt
```

## 步驟 C：在 LINE 後台設 webhook URL
1. LINE channel → **Messaging API** 分頁 → **Webhook settings**
2. Webhook URL 填：
   ```
   https://qzoehylpdjeeaufznbrz.supabase.co/functions/v1/line-webhook
   ```
3. **Use webhook** 打開，按 **Verify**（應顯示 Success）
4. 建議把「自動回應訊息」關掉（同分頁的 LINE Official Account features），避免蓋掉我們的回覆

## 怎麼用
1. 家長用 LINE **加你的官方帳號好友**，或傳一句話
2. 系統自動把他的 userId + 暱稱記進 `line_contacts`
3. App →「家長管理」會出現提示「N 位已加好友未綁定」
4. 編輯該家長 → 在「**從 LINE 聯絡人帶入**」選單挑對方 → 儲存
5. 之後對這位家長發送，就會真的送達

> 自己測試:你本人的 userId 也可從「Basic settings → Your user ID」直接拿來填,不一定要走 webhook。

## 之後可收緊的安全性

現在 `broadcast_logs` 仍是 `demo_all`（anon 可寫）。Function 是用 service role 寫的，
正式上線可把 `broadcast_logs` 的寫入 policy 限制成只允許 service role，前端就只能讀。
