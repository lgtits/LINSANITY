// Supabase Edge Function: line-webhook
// LINE 在用戶「加好友 / 傳訊息」時 POST 到這裡 → 取 userId + 暱稱 → 存進 line_contacts
// 後台再到「家長管理」把聯絡人綁定到家長。
//
// 需要的 secrets：
//   LINE_CHANNEL_ACCESS_TOKEN  （取得 profile / 回覆訊息）
//   LINE_CHANNEL_SECRET        （驗證 webhook 簽章）
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY （自動注入）
//
// ⚠️ 部署時要關閉 JWT 驗證（LINE 不會帶 Supabase token）：
//     npx supabase functions deploy line-webhook --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? ''
const SECRET = Deno.env.get('LINE_CHANNEL_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 驗證 x-line-signature = base64(HMAC-SHA256(channelSecret, rawBody))
async function verify(rawBody: string, signature: string): Promise<boolean> {
  if (!SECRET || !signature) return false
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)))
  return expected === signature
}

async function getProfile(userId: string) {
  try {
    const r = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    return r.ok ? await r.json() : null
  } catch { return null }
}

async function replyText(replyToken: string, text: string) {
  try {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
    })
  } catch { /* ignore */ }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')

  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''
  if (!(await verify(rawBody, signature))) {
    return new Response('invalid signature', { status: 401 })
  }

  let events: any[] = []
  try { events = JSON.parse(rawBody).events ?? [] } catch { /* ignore */ }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  for (const ev of events) {
    const userId = ev?.source?.userId
    if (!userId) continue
    if (ev.type !== 'follow' && ev.type !== 'message') continue

    const profile = await getProfile(userId)
    // 只帶會變動的欄位；linked_parent_id 不在內，沿用既有綁定不被覆蓋
    await sb.from('line_contacts').upsert({
      user_id: userId,
      display_name: profile?.displayName ?? '',
      picture_url: profile?.pictureUrl ?? '',
      last_message: ev.type === 'message' && ev.message?.type === 'text' ? ev.message.text : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (ev.type === 'follow' && ev.replyToken) {
      await replyText(ev.replyToken, '感謝加入！補習班人員會盡快為您綁定，之後就會在此收到孩子的餐費與課務通知 🙌')
    }
  }

  return new Response('ok')
})
