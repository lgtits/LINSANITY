import { api } from '../lib/api'
import { supabase, isDemoMode } from '../lib/supabase'

const toApp = row => ({
  id: row.id,
  name: row.name,
  grade: row.grade,
  parentName: row.parent_name,
  phone: row.phone,
  scheduleDays: row.schedule_days || [],
  notes: row.notes || ''
})

const toDb = data => ({
  name: data.name,
  grade: data.grade,
  parent_name: data.parentName,
  phone: data.phone,
  schedule_days: data.scheduleDays,
  notes: data.notes
})

export const studentService = {
  async getAll() {
    if (isDemoMode) return api.get('students')
    const { data, error } = await supabase.from('students').select('*').order('grade').order('name')
    if (error) throw error
    return data.map(toApp)
  },

  async getByDay(weekday) {
    if (isDemoMode) {
      const all = await api.get('students')
      return all.filter(s => s.scheduleDays.includes(weekday))
    }
    const { data, error } = await supabase
      .from('students').select('*').filter('schedule_days', 'cs', `{${weekday}}`)
    if (error) throw error
    return data.map(toApp)
  },

  async create(data) {
    if (isDemoMode) return api.post('students', data)
    const { data: result, error } = await supabase.from('students').insert(toDb(data)).select().single()
    if (error) throw error
    return toApp(result)
  },

  async update(id, data) {
    if (isDemoMode) return api.put('students', id, data)
    const { data: result, error } = await supabase.from('students').update(toDb(data)).eq('id', id).select().single()
    if (error) throw error
    return toApp(result)
  },

  async remove(id) {
    if (isDemoMode) return api.remove('students', id)
    const { error } = await supabase.from('students').delete().eq('id', id)
    if (error) throw error
  }
}
