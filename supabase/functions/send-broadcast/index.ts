// Supabase Edge Function: send-broadcast
// 前端 invoke 這支 → 逐位打 LINE push API → 收集成功/失敗 → 寫 broadcast_logs → 回摘要
//
// 需要的 secrets：
//   LINE_CHANNEL_ACCESS_TOKEN   （LINE Developers 的 Messaging API channel token）
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  （Edge Function 自動注入，不用手動設）
//
// 尚未設定 LINE token 時，會以「模擬」模式回傳（status: 'simulated'），方便先測整條流程。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LINE_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

// 打 LINE push API，回傳 { ok, error? }
async function pushToLine(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const resp = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_TOKEN}`,
      },
      body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
    })
    if (resp.ok) return { ok: true }
    const body = await resp.text()
    return { ok: false, error: `LINE ${resp.status}: ${body.slice(0, 300)}` }
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 300) }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { type, records } = await req.json()
    if (!Array.isArray(records) || records.length === 0) {
      return json({ error: '沒有收件人' }, 400)
    }

    const results = []
    for (const r of records) {
      if (!r.lineUserId) {
        results.push({ ...r, status: 'failed', error: '未填 LINE ID' })
      } else if (!LINE_TOKEN) {
        results.push({ ...r, status: 'simulated' }) // 尚未接 LINE token
      } else {
        const res = await pushToLine(r.lineUserId, r.message)
        results.push(res.ok ? { ...r, status: 'success' } : { ...r, status: 'failed', error: res.error })
      }
    }

    const successCount = results.filter((r) => r.status === 'success' || r.status === 'simulated').length
    const failCount = results.length - successCount

    // 由 Edge Function（service role）寫 log，紀錄真實結果
    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: log, error } = await sb
      .from('broadcast_logs')
      .insert({
        type,
        sent_at: new Date().toISOString(),
        recipient_count: results.length,
        success_count: successCount,
        fail_count: failCount,
        records: results,
      })
      .select()
      .single()
    if (error) return json({ error: error.message }, 500)

    return json({ successCount, failCount, simulated: !LINE_TOKEN, log })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
