import { api } from '../lib/api'
import { supabase, isDemoMode } from '../lib/supabase'

function now() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.toISOString().slice(0, 10)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ISO timestamptz → "YYYY-MM-DD HH:mm"
const fmtDT = v => (v ? String(v).replace('T', ' ').slice(0, 16) : '')

const toApp = r => ({
  id: r.id,
  parentId: r.parent_id,
  studentId: r.student_id ?? undefined,
  type: r.type,
  amount: Number(r.amount),
  note: r.note,
  date: r.date,
  datetime: r.datetime ? fmtDT(r.datetime) : r.date
})

export const mealService = {
  async getTransactions(parentId) {
    if (isDemoMode) {
      const txs = await api.get('mealTransactions', { parentId })
      return txs.sort((a, b) => (b.datetime || b.date).localeCompare(a.datetime || a.date))
    }
    const { data, error } = await supabase.from('meal_transactions').select('*')
      .eq('parent_id', parentId).order('datetime', { ascending: false })
    if (error) throw error
    return data.map(toApp)
  },

  async getAllTransactions() {
    if (isDemoMode) {
      const txs = await api.get('mealTransactions')
      return txs.sort((a, b) => (b.datetime || b.date).localeCompare(a.datetime || a.date))
    }
    const { data, error } = await supabase.from('meal_transactions').select('*')
      .order('datetime', { ascending: false })
    if (error) throw error
    return data.map(toApp)
  },

  async getBalance(parentId) {
    if (isDemoMode) {
      const txs = await api.get('mealTransactions', { parentId })
      return txs.reduce((sum, t) => sum + t.amount, 0)
    }
    const { data, error } = await supabase.from('parent_balances').select('balance')
      .eq('parent_id', parentId).maybeSingle()
    if (error) throw error
    return data ? Number(data.balance) : 0
  },

  // 回傳 { parentId: balance } map
  async getAllBalances() {
    if (isDemoMode) {
      const txs = await api.get('mealTransactions')
      const map = {}
      for (const t of txs) map[t.parentId] = (map[t.parentId] || 0) + t.amount
      return map
    }
    const { data, error } = await supabase.from('parent_balances').select('*')
    if (error) throw error
    const map = {}
    for (const r of data) map[r.parent_id] = Number(r.balance)
    return map
  },

  async topup(parentId, amount, note) {
    const dt = now()
    if (isDemoMode) {
      return api.post('mealTransactions', {
        parentId, type: 'topup',
        amount: Math.abs(amount), note,
        date: dt.slice(0, 10), datetime: dt
      })
    }
    const { data, error } = await supabase.from('meal_transactions').insert({
      parent_id: parentId, type: 'topup',
      amount: Math.abs(amount), note,
      date: dt.slice(0, 10), datetime: dt
    }).select().single()
    if (error) throw error
    return toApp(data)
  },

  async deduct(parentId, studentId, amount, note, date) {
    const dt = now()
    if (isDemoMode) {
      return api.post('mealTransactions', {
        parentId, studentId, type: 'deduct',
        amount: -Math.abs(amount), note,
        date: date || dt.slice(0, 10),
        datetime: date ? `${date} ${dt.slice(11)}` : dt
      })
    }
    const { data, error } = await supabase.from('meal_transactions').insert({
      parent_id: parentId, student_id: studentId, type: 'deduct',
      amount: -Math.abs(amount), note,
      date: date || dt.slice(0, 10),
      datetime: date ? `${date} ${dt.slice(11)}` : dt
    }).select().single()
    if (error) throw error
    return toApp(data)
  }
}
