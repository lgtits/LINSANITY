import { api } from '../lib/api'

function nowStr() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.toISOString().slice(0, 10)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const broadcastService = {
  // ── Templates ──
  async getTemplates() {
    return api.get('broadcastTemplates')
  },
  async createTemplate(data) {
    return api.post('broadcastTemplates', data)
  },
  async updateTemplate(id, data) {
    return api.put('broadcastTemplates', id, data)
  },
  async deleteTemplate(id) {
    return api.remove('broadcastTemplates', id)
  },

  // ── Logs ──
  async getLogs() {
    const logs = await api.get('broadcastLogs')
    return logs.sort((a, b) => b.sentAt.localeCompare(a.sentAt))
  },

  // records: [{ studentId, studentName, message }]
  async send({ type, records }) {
    return api.post('broadcastLogs', {
      type,
      sentAt: nowStr(),
      recipientCount: records.length,
      records
    })
  }
}
