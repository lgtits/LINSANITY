import { api } from '../lib/api'
import { supabase, isDemoMode } from '../lib/supabase'

const toApp = row => ({
  id: row.id,
  name: row.name,
  grade: row.grade,
  parentName: row.parent_name ?? row.parentName,
  phone: row.phone,
  scheduleDays: row.schedule_days ?? row.scheduleDays ?? [],
  notes: row.notes || '',
  lineUserId: row.line_user_id ?? row.lineUserId ?? '',
  archived: row.archived ?? false,
  deleted: row.deleted ?? false
})

const toDb = data => ({
  name: data.name,
  grade: data.grade,
  parent_name: data.parentName,
  phone: data.phone,
  line_user_id: data.lineUserId ?? '',
  schedule_days: data.scheduleDays,
  notes: data.notes,
  archived: data.archived ?? false,
  deleted: data.deleted ?? false
})

export const studentService = {
  // 只回傳在籍學生（未封存、未刪除）
  async getAll() {
    if (isDemoMode) {
      const all = await api.get('students')
      return all.filter(s => !s.archived && !s.deleted)
    }
    const { data, error } = await supabase.from('students').select('*')
      .eq('archived', false).eq('deleted', false).order('grade').order('name')
    if (error) throw error
    return data.map(toApp)
  },

  async getByDay(weekday) {
    if (isDemoMode) {
      const all = await api.get('students')
      return all.filter(s => !s.archived && !s.deleted && s.scheduleDays.includes(weekday))
    }
    const { data, error } = await supabase.from('students').select('*')
      .eq('archived', false).eq('deleted', false)
      .filter('schedule_days', 'cs', `{${weekday}}`)
    if (error) throw error
    return data.map(toApp)
  },

  async getArchived() {
    if (isDemoMode) {
      const all = await api.get('students')
      return all.filter(s => s.archived && !s.deleted)
    }
    const { data, error } = await supabase.from('students').select('*')
      .eq('archived', true).eq('deleted', false).order('grade').order('name')
    if (error) throw error
    return data.map(toApp)
  },

  async getDeleted() {
    if (isDemoMode) {
      const all = await api.get('students')
      return all.filter(s => s.deleted)
    }
    const { data, error } = await supabase.from('students').select('*')
      .eq('deleted', true).order('grade').order('name')
    if (error) throw error
    return data.map(toApp)
  },

  async create(data) {
    if (isDemoMode) return api.post('students', { ...data, archived: false, deleted: false })
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

  async archive(id) {
    if (isDemoMode) return api.put('students', id, { archived: true })
    const { error } = await supabase.from('students').update({ archived: true }).eq('id', id)
    if (error) throw error
  },

  async unarchive(id) {
    if (isDemoMode) return api.put('students', id, { archived: false })
    const { error } = await supabase.from('students').update({ archived: false }).eq('id', id)
    if (error) throw error
  },

  async softDelete(id) {
    if (isDemoMode) return api.put('students', id, { deleted: true, archived: false })
    const { error } = await supabase.from('students').update({ deleted: true }).eq('id', id)
    if (error) throw error
  },

  async restore(id) {
    if (isDemoMode) return api.put('students', id, { deleted: false, archived: false })
    const { error } = await supabase.from('students').update({ deleted: false }).eq('id', id)
    if (error) throw error
  },

  async permanentDelete(id) {
    if (isDemoMode) return api.remove('students', id)
    const { error } = await supabase.from('students').delete().eq('id', id)
    if (error) throw error
  }
}
