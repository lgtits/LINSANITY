# TODO

## 關閉 Supabase auth 的背景 token 刷新

**現象**：console 每 30 秒噴一次
`Uncaught (in promise) Error: Acquiring an exclusive Navigator LockManager lock "lock:sb-<ref>-auth-token" immediately failed`

**原因**：`createClient()` 一定會建 GoTrue client（每個請求要靠它決定 Authorization header），
而 `autoRefreshToken` 預設 true，會啟一個 30 秒的 `setInterval`（`GoTrueClient.js:4052`）。
tick 內用 `_acquireLock(0, ...)`（`GoTrueClient.js:4192`）搶跨分頁的鎖，搶不到就立刻 throw，
而且是先搶鎖才判斷有沒有 session，所以「沒登入」擋不住。開兩個分頁或 HMR 重載就會觸發。

**影響**：僅 console 噪音。資料查詢走 `_getAccessToken()` → `getSession()`，
用的是預設 5 秒 timeout 且逾時會搶鎖，不受影響。

**修法**：`src/lib/supabase.js`
```js
createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
```
本專案登入是 `LoginPage.vue:56` 的 localStorage 旗標，沒有用 Supabase Auth
（`src/` 內無任何 `supabase.auth` 呼叫），關掉無副作用。

**注意**：日後若改用 Supabase Auth，這個設定要拿掉，且屆時該錯誤會從噪音變成真 bug。
