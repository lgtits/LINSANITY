import { api } from '../lib/api'
import { supabase, isDemoMode } from '../lib/supabase'

// calendar 為 null 時不帶入，讓前端用 total/absent 還原
const toApp = r => {
  const o = { totalDays: r.total_days, absentDays: r.absent_days }
  if (r.calendar) o.calendar = r.calendar
  return o
}
const keyToCol = { totalDays: 'total_days', absentDays: 'absent_days', calendar: 'calendar' }

export const attendanceService = {
  async getLogs(monthKey) {
    if (isDemoMode) {
      const all = await api.get('attendanceLogs')
      return all[monthKey] || {}
    }
    const { data, error } = await supabase.from('attendance_logs').select('*')
      .eq('month_key', monthKey)
    if (error) throw error
    const map = {}
    for (const r of data) map[r.student_id] = toApp(r)
    return map
  },

  async updateLog(monthKey, studentId, key, value) {
    if (isDemoMode) {
      await api.mutate('attendanceLogs', data => {
        if (!data[monthKey]) data[monthKey] = {}
        if (!data[monthKey][studentId]) data[monthKey][studentId] = { totalDays: 0, absentDays: 0 }
        data[monthKey][studentId][key] = value
      })
      return
    }
    const col = keyToCol[key]
    const { data, error } = await supabase.from('attendance_logs')
      .update({ [col]: value }).eq('month_key', monthKey).eq('student_id', studentId).select()
    if (error) throw error
    if (!data.length) {
      const base = { month_key: monthKey, student_id: studentId, total_days: 0, absent_days: 0, [col]: value }
      const { error: insErr } = await supabase.from('attendance_logs').insert(base)
      if (insErr) throw insErr
    }
  }
}
