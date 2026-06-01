import mockData from '../mock/mealTransactions.json'

let transactions = mockData.map(t => ({ ...t }))

export const mealService = {
  async getTransactions(studentId) {
    return transactions
      .filter(t => t.studentId === studentId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
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

  async topup(studentId, amount, note) {
    const tx = {
      id: 't' + Date.now(),
      studentId,
      type: 'topup',
      amount: Math.abs(amount),
      note,
      date: new Date().toISOString().slice(0, 10)
    }
    transactions.push(tx)
    return { ...tx }
  },

  async getAllTransactions() {
    return [...transactions].sort(
      (a, b) => b.date.localeCompare(a.date) || a.studentId.localeCompare(b.studentId)
    )
  },

  async deduct(studentId, amount, note, date) {
    const tx = {
      id: 't' + Date.now() + Math.random(),
      studentId,
      type: 'deduct',
      amount: -Math.abs(amount),
      note,
      date: date || new Date().toISOString().slice(0, 10)
    }
    transactions.push(tx)
    return { ...tx }
  }
}
