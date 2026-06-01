import { api } from '../lib/api'
import { isDemoMode } from '../lib/supabase'

function now() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.toISOString().slice(0, 10)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const mealService = {
  async getTransactions(studentId) {
    if (isDemoMode) {
      const txs = await api.get('mealTransactions', { studentId })
      return txs.sort((a, b) => (b.datetime || b.date).localeCompare(a.datetime || a.date))
    }
  },

  async getAllTransactions() {
    if (isDemoMode) {
      const txs = await api.get('mealTransactions')
      return txs.sort((a, b) => (b.datetime || b.date).localeCompare(a.datetime || a.date))
    }
  },

  async getBalance(studentId) {
    if (isDemoMode) {
      const txs = await api.get('mealTransactions', { studentId })
      return txs.reduce((sum, t) => sum + t.amount, 0)
    }
  },

  async getAllBalances() {
    if (isDemoMode) {
      const txs = await api.get('mealTransactions')
      const map = {}
      for (const t of txs) map[t.studentId] = (map[t.studentId] || 0) + t.amount
      return map
    }
  },

  async topup(studentId, amount, note) {
    if (isDemoMode) {
      const dt = now()
      return api.post('mealTransactions', {
        studentId, type: 'topup',
        amount: Math.abs(amount), note,
        date: dt.slice(0, 10), datetime: dt
      })
    }
  },

  async deduct(studentId, amount, note, date) {
    if (isDemoMode) {
      const dt = now()
      return api.post('mealTransactions', {
        studentId, type: 'deduct',
        amount: -Math.abs(amount), note,
        date: date || dt.slice(0, 10),
        datetime: date ? `${date} ${dt.slice(11)}` : dt
      })
    }
  }
}
