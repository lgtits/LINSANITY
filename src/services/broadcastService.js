import { api } from '../lib/api'
import { supabase, isDemoMode } from '../lib/supabase'

function nowStr() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.toISOString().slice(0, 10)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ISO timestamptz → "YYYY-MM-DD HH:mm"
const fmtDT = v => (v ? String(v).replace('T', ' ').slice(0, 16) : '')

const logToApp = r => ({
  id: r.id,
  type: r.type,
  sentAt: fmtDT(r.sent_at),
  recipientCount: r.recipient_count,
  successCount: r.success_count ?? r.recipient_count,
  failCount: r.fail_count ?? 0,
  records: r.records || []
})

export const broadcastService = {
  // ── Templates ──
  async getTemplates() {
    if (isDemoMode) return api.get('broadcastTemplates')
    const { data, error } = await supabase.from('broadcast_templates').select('*').order('name')
    if (error) throw error
    return data
  },

  async createTemplate(data) {
    if (isDemoMode) return api.post('broadcastTemplates', data)
    const { data: result, error } = await supabase.from('broadcast_templates')
      .insert(data).select().single()
    if (error) throw error
    return result
  },

  async updateTemplate(id, data) {
    if (isDemoMode) return api.put('broadcastTemplates', id, data)
    const { data: result, error } = await supabase.from('broadcast_templates')
      .update(data).eq('id', id).select().single()
    if (error) throw error
    return result
  },

  async deleteTemplate(id) {
    if (isDemoMode) return api.remove('broadcastTemplates', id)
    const { error } = await supabase.from('broadcast_templates').delete().eq('id', id)
    if (error) throw error
  },

  // ── Logs ──
  async getLogs() {
    if (isDemoMode) {
      const logs = await api.get('broadcastLogs')
      return logs.sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    }
    const { data, error } = await supabase.from('broadcast_logs').select('*')
      .order('sent_at', { ascending: false })
    if (error) throw error
    return data.map(logToApp)
  },

  // records: [{ parentId, parentName, lineUserId, message }]
  // 回傳 { successCount, failCount, log }
  async send({ type, records }) {
    if (isDemoMode) {
      // demo：無 Edge Function，模擬發送（有 LINE ID 視為成功，沒有則失敗）
      const results = records.map(r => r.lineUserId
        ? { ...r, status: 'simulated' }
        : { ...r, status: 'failed', error: '未填 LINE ID' })
      const successCount = results.filter(r => r.status !== 'failed').length
      const failCount = results.length - successCount
      const log = await api.post('broadcastLogs', {
        type, sentAt: nowStr(),
        recipientCount: results.length,
        successCount, failCount,
        records: results
      })
      return { successCount, failCount, simulated: true, log }
    }
    // supabase：交給 Edge Function 實際打 LINE 並寫 log（service role）
    const { data, error } = await supabase.functions.invoke('send-broadcast', {
      body: { type, records }
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data   // { successCount, failCount, simulated, log }
  }
}
