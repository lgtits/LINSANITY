import mockData from '../mock/mealTransactions.json'

let transactions = mockData.map(t => ({ ...t }))

function currentDatetime() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${now.toISOString().slice(0, 10)} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export const mealService = {
  async getTransactions(studentId) {
    return transactions
      .filter(t => t.studentId === studentId)
      .sort((a, b) => (b.datetime || b.date).localeCompare(a.datetime || a.date))
      .map(t => ({ ...t }))
  },

  async getBalance(studentId) {
    return transactions
      .filter(t => t.studentId === studentId)
      .reduce((sum, t) => sum + t.amount, 0)
  },

  async getAllBalances() {
    const map = {}
    for (const t of transactions) {
      map[t.studentId] = (map[t.studentId] || 0) + t.amount
    }
    return map
  },

  async getAllTransactions() {
    return [...transactions].sort(
      (a, b) => (b.datetime || b.date).localeCompare(a.datetime || a.date)
    )
  },

  async topup(studentId, amount, note) {
    const dt = currentDatetime()
    const tx = {
      id: 't' + Date.now(),
      studentId,
      type: 'topup',
      amount: Math.abs(amount),
      note,
      date: dt.slice(0, 10),
      datetime: dt
    }
    transactions.push(tx)
    return { ...tx }
  },

  async deduct(studentId, amount, note, date) {
    const dt = currentDatetime()
    const tx = {
      id: 't' + Date.now() + Math.random(),
      studentId,
      type: 'deduct',
      amount: -Math.abs(amount),
      note,
      date: date || dt.slice(0, 10),
      datetime: date ? `${date} ${dt.slice(11)}` : dt
    }
    transactions.push(tx)
    return { ...tx }
  }
}
