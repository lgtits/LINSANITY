import { api } from '../lib/api'
import { isDemoMode } from '../lib/supabase'

export const tuitionService = {
  // ── 費率（每月全域設定）──
  async getRates() {
    if (isDemoMode) return api.get('tuitionRates')
    // supabase: SELECT * FROM tuition_rates
  },

  async updateRates(monthKey, ratesValue) {
    if (isDemoMode) {
      await api.mutate('tuitionRates', data => { data[monthKey] = { ...ratesValue } })
    }
    // supabase: UPSERT tuition_rates WHERE month_key = monthKey
  },

  async deleteRates(monthKey) {
    if (isDemoMode) {
      await api.mutate('tuitionRates', data => { delete data[monthKey] })
    }
    // supabase: DELETE FROM tuition_rates WHERE month_key = monthKey
  },

  // ── 學生報名（每月名單快照）──
  async getEnrollment(monthKey) {
    if (isDemoMode) {
      const all = await api.get('tuitionEnrollments')
      return all[monthKey] || null   // null = 此月份尚未建立名單
    }
    // supabase: SELECT * FROM tuition_enrollments WHERE month_key = monthKey
  },

  async createEnrollment(monthKey, students) {
    // students: { studentId: { classType, withMeal }, ... }
    if (isDemoMode) {
      await api.mutate('tuitionEnrollments', data => { data[monthKey] = { ...students } })
    }
    // supabase: INSERT INTO tuition_enrollments (month_key, student_id, class_type, with_meal) VALUES ...
  },

  async updateEnrollmentSetting(monthKey, studentId, key, value) {
    if (isDemoMode) {
      await api.mutate('tuitionEnrollments', data => {
        if (!data[monthKey]) data[monthKey] = {}
        if (!data[monthKey][studentId]) data[monthKey][studentId] = { classType: 'full', withMeal: false }
        data[monthKey][studentId][key] = value
      })
    }
    // supabase: UPDATE tuition_enrollments SET key = value WHERE month_key = monthKey AND student_id = studentId
  },

  async addToEnrollment(monthKey, studentId, settings) {
    if (isDemoMode) {
      await api.mutate('tuitionEnrollments', data => {
        if (!data[monthKey]) data[monthKey] = {}
        data[monthKey][studentId] = { ...settings }
      })
    }
  },

  async removeFromEnrollment(monthKey, studentId) {
    if (isDemoMode) {
      await api.mutate('tuitionEnrollments', data => {
        if (data[monthKey]) delete data[monthKey][studentId]
      })
    }
  },

  // ── 出席記錄（月份優先）──
  async getAttendance(monthKey) {
    if (isDemoMode) {
      const all = await api.get('tuitionAttendance')
      return all[monthKey] || {}   // {} = 此月份尚無出席記錄
    }
    // supabase: SELECT * FROM tuition_attendance WHERE month_key = monthKey
  },

  async updateAttendance(monthKey, studentId, key, value) {
    if (isDemoMode) {
      await api.mutate('tuitionAttendance', data => {
        if (!data[monthKey]) data[monthKey] = {}
        if (!data[monthKey][studentId]) data[monthKey][studentId] = { totalDays: 22, absentDays: 0 }
        data[monthKey][studentId][key] = value
      })
    }
    // supabase: UPSERT tuition_attendance WHERE month_key = monthKey AND student_id = studentId
  }
}
