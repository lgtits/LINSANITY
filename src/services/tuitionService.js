import { api } from '../lib/api'
import { isDemoMode } from '../lib/supabase'

export const tuitionService = {
  async getAll() {
    if (isDemoMode) return api.get('tuition')
  },

  async updateSetting(studentId, key, value) {
    if (isDemoMode) {
      await api.mutate('tuition', data => {
        if (!data.settings[studentId]) data.settings[studentId] = { classType: 'full', withMeal: false }
        data.settings[studentId][key] = value
      })
    }
  },

  async updateAttendance(studentId, monthKey, key, value) {
    if (isDemoMode) {
      await api.mutate('tuition', data => {
        if (!data.attendance[studentId]) data.attendance[studentId] = {}
        if (!data.attendance[studentId][monthKey]) {
          data.attendance[studentId][monthKey] = { totalDays: 22, absentDays: 0 }
        }
        data.attendance[studentId][monthKey][key] = value
      })
    }
  },

  async updateRates(monthKey, ratesValue) {
    if (isDemoMode) {
      await api.mutate('tuition', data => {
        data.rates[monthKey] = { ...ratesValue }
      })
    }
  }
}
