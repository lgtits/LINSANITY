import mockData from '../mock/students.json'
import { supabase, isDemoMode } from '../lib/supabase'

let students = mockData.map(s => ({ ...s }))

// Supabase snake_case → app camelCase
const toApp = row => ({
  id: row.id,
  name: row.name,
  grade: row.grade,
  parentName: row.parent_name,
  phone: row.phone,
  scheduleDays: row.schedule_days || [],
  notes: row.notes || ''
})

// app camelCase → Supabase snake_case
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
    if (isDemoMode) {
      return students.map(s => ({ ...s }))
    }
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('grade')
      .order('name')
    if (error) throw error
    return data.map(toApp)
  },

  async getByDay(weekday) {
    if (isDemoMode) {
      return students.filter(s => s.scheduleDays.includes(weekday)).map(s => ({ ...s }))
    }
    // 週幾篩選：PostgreSQL array contains
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .filter('schedule_days', 'cs', `{${weekday}}`)
    if (error) throw error
    return data.map(toApp)
  },

  async create(data) {
    if (isDemoMode) {
      const student = { ...data, id: 's' + Date.now() }
      students.push(student)
      return { ...student }
    }
    const { data: result, error } = await supabase
      .from('students')
      .insert(toDb(data))
      .select()
      .single()
    if (error) throw error
    return toApp(result)
  },

  async update(id, data) {
    if (isDemoMode) {
      const idx = students.findIndex(s => s.id === id)
      if (idx === -1) throw new Error('學生不存在')
      students[idx] = { ...students[idx], ...data }
      return { ...students[idx] }
    }
    const { data: result, error } = await supabase
      .from('students')
      .update(toDb(data))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return toApp(result)
  },

  async remove(id) {
    if (isDemoMode) {
      students = students.filter(s => s.id !== id)
      return
    }
    const { error } = await supabase.from('students').delete().eq('id', id)
    if (error) throw error
  }
}
