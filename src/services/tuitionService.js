import { api } from '../lib/api'
import { supabase, isDemoMode } from '../lib/supabase'

// ── 費率 mapper ──
const rateToApp = r => ({
  absentThreshold: r.absent_threshold,
  fullFlat: Number(r.full_flat),       fullFlatMeal: Number(r.full_flat_meal),
  fullDaily: Number(r.full_daily),     fullMealDaily: Number(r.full_meal_daily),
  halfFlat: Number(r.half_flat),       halfFlatMeal: Number(r.half_flat_meal),
  halfDaily: Number(r.half_daily),     halfMealDaily: Number(r.half_meal_daily),
  mixedFullDaily: Number(r.mixed_full_daily || 0),
  mixedHalfDaily: Number(r.mixed_half_daily || 0),
  extraActivities: r.extra_activities || []
})

const rateToDb = (monthKey, v) => ({
  month_key: monthKey,
  absent_threshold: v.absentThreshold,
  full_flat: v.fullFlat,   full_flat_meal: v.fullFlatMeal,
  full_daily: v.fullDaily, full_meal_daily: v.fullMealDaily,
  half_flat: v.halfFlat,   half_flat_meal: v.halfFlatMeal,
  half_daily: v.halfDaily, half_meal_daily: v.halfMealDaily,
  mixed_full_daily: v.mixedFullDaily || 0,
  mixed_half_daily: v.mixedHalfDaily || 0,
  extra_activities: v.extraActivities || []
})

// ── 出席（預計／實際共用）mapper ──
// calendar 為 null 時不帶入，讓前端用 total/absent 還原
const attRowToApp = r => {
  const o = { totalDays: r.total_days, absentDays: r.absent_days }
  if (r.calendar) o.calendar = r.calendar
  return o
}
const attKeyToCol = { totalDays: 'total_days', absentDays: 'absent_days', calendar: 'calendar' }

export const tuitionService = {
  // ── 費率（每月全域設定）──
  async getRates() {
    if (isDemoMode) return api.get('tuitionRates')
    const { data, error } = await supabase.from('tuition_rates').select('*')
    if (error) throw error
    const map = {}
    for (const r of data) map[r.month_key] = rateToApp(r)
    return map
  },

  async updateRates(monthKey, ratesValue) {
    if (isDemoMode) {
      await api.mutate('tuitionRates', data => { data[monthKey] = { ...ratesValue } })
      return
    }
    const { error } = await supabase.from('tuition_rates')
      .upsert(rateToDb(monthKey, ratesValue), { onConflict: 'month_key' })
    if (error) throw error
  },

  async deleteRates(monthKey) {
    if (isDemoMode) {
      await api.mutate('tuitionRates', data => { delete data[monthKey] })
      return
    }
    const { error } = await supabase.from('tuition_rates').delete().eq('month_key', monthKey)
    if (error) throw error
  },

  // ── 學生報名（每月名單快照）──
  async getEnrollment(monthKey) {
    if (isDemoMode) {
      const all = await api.get('tuitionEnrollments')
      return all[monthKey] || null
    }
    const { data, error } = await supabase.from('tuition_enrollments').select('*')
      .eq('month_key', monthKey)
    if (error) throw error
    if (!data.length) return null   // null = 此月份尚未建立名單
    const map = {}
    for (const r of data) map[r.student_id] = { classType: r.class_type, withMeal: r.with_meal, extraActivities: r.extra_activities || [] }
    return map
  },

  async createEnrollment(monthKey, students) {
    // students: { studentId: { classType, withMeal }, ... }
    if (isDemoMode) {
      await api.mutate('tuitionEnrollments', data => { data[monthKey] = { ...students } })
      return
    }
    await supabase.from('tuition_enrollments').delete().eq('month_key', monthKey)
    const rows = Object.entries(students).map(([sid, s]) => ({
      month_key: monthKey, student_id: sid, class_type: s.classType, with_meal: s.withMeal, extra_activities: s.extraActivities || []
    }))
    if (rows.length) {
      const { error } = await supabase.from('tuition_enrollments').insert(rows)
      if (error) throw error
    }
  },

  async updateEnrollmentSetting(monthKey, studentId, key, value) {
    if (isDemoMode) {
      await api.mutate('tuitionEnrollments', data => {
        if (!data[monthKey]) data[monthKey] = {}
        if (!data[monthKey][studentId]) data[monthKey][studentId] = { classType: 'full', withMeal: false, extraActivities: [] }
        data[monthKey][studentId][key] = value
      })
      return
    }
    const colMap = { classType: 'class_type', withMeal: 'with_meal', extraActivities: 'extra_activities' }
    const col = colMap[key]
    const { data, error } = await supabase.from('tuition_enrollments')
      .update({ [col]: value }).eq('month_key', monthKey).eq('student_id', studentId).select()
    if (error) throw error
    if (!data.length) {
      const base = { month_key: monthKey, student_id: studentId, class_type: 'full', with_meal: false, extra_activities: [], [col]: value }
      const { error: insErr } = await supabase.from('tuition_enrollments').insert(base)
      if (insErr) throw insErr
    }
  },

  async addToEnrollment(monthKey, studentId, settings) {
    if (isDemoMode) {
      await api.mutate('tuitionEnrollments', data => {
        if (!data[monthKey]) data[monthKey] = {}
        data[monthKey][studentId] = { ...settings }
      })
      return
    }
    const { error } = await supabase.from('tuition_enrollments').upsert({
      month_key: monthKey, student_id: studentId,
      class_type: settings.classType, with_meal: settings.withMeal,
      extra_activities: settings.extraActivities || []
    }, { onConflict: 'month_key,student_id' })
    if (error) throw error
  },

  async removeFromEnrollment(monthKey, studentId) {
    if (isDemoMode) {
      await api.mutate('tuitionEnrollments', data => {
        if (data[monthKey]) delete data[monthKey][studentId]
      })
      return
    }
    const { error } = await supabase.from('tuition_enrollments').delete()
      .eq('month_key', monthKey).eq('student_id', studentId)
    if (error) throw error
  },

  // ── 出席記錄（預計上課安排，月份優先）──
  async getAttendance(monthKey) {
    if (isDemoMode) {
      const all = await api.get('tuitionAttendance')
      return all[monthKey] || {}
    }
    const { data, error } = await supabase.from('tuition_attendance').select('*')
      .eq('month_key', monthKey)
    if (error) throw error
    const map = {}
    for (const r of data) map[r.student_id] = attRowToApp(r)
    return map
  },

  async updateAttendance(monthKey, studentId, key, value) {
    if (isDemoMode) {
      await api.mutate('tuitionAttendance', data => {
        if (!data[monthKey]) data[monthKey] = {}
        if (!data[monthKey][studentId]) data[monthKey][studentId] = { totalDays: 22, absentDays: 0 }
        data[monthKey][studentId][key] = value
      })
      return
    }
    const col = attKeyToCol[key]
    const { data, error } = await supabase.from('tuition_attendance')
      .update({ [col]: value }).eq('month_key', monthKey).eq('student_id', studentId).select()
    if (error) throw error
    if (!data.length) {
      const base = { month_key: monthKey, student_id: studentId, total_days: 22, absent_days: 0, [col]: value }
      const { error: insErr } = await supabase.from('tuition_attendance').insert(base)
      if (insErr) throw insErr
    }
  }
}
