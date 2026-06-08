import { api } from '../lib/api'
import { supabase, isDemoMode } from '../lib/supabase'

// 家長姓名/電話為衍生欄位：supabase 用 join、demo 用 parents 拼接，單一真相在 parents
const SELECT = '*, parents(name, phone)'

const toApp = row => ({
  id: row.id,
  name: row.name,
  grade: row.grade,
  parentId: row.parent_id ?? row.parentId ?? '',
  parentName: row.parents?.name ?? '',
  phone: row.parents?.phone ?? '',
  scheduleDays: row.schedule_days ?? row.scheduleDays ?? [],
  notes: row.notes || '',
  archived: row.archived ?? false,
  deleted: row.deleted ?? false
})

const toDb = data => ({
  name: data.name,
  grade: data.grade,
  parent_id: data.parentId,
  schedule_days: data.scheduleDays,
  notes: data.notes,
  archived: data.archived ?? false,
  deleted: data.deleted ?? false
})

// demo：用 parents 補上家長姓名/電話
async function stitchParents(students) {
  const parents = await api.get('parents')
  const map = Object.fromEntries(parents.map(p => [p.id, p]))
  return students.map(s => ({
    ...s,
    parentName: map[s.parentId]?.name ?? '',
    phone: map[s.parentId]?.phone ?? ''
  }))
}

export const studentService = {
  // 只回傳在籍學生（未封存、未刪除）
  async getAll() {
    if (isDemoMode) {
      const all = await api.get('students')
      return stitchParents(all.filter(s => !s.archived && !s.deleted))
    }
    const { data, error } = await supabase.from('students').select(SELECT)
      .eq('archived', false).eq('deleted', false).order('grade').order('name')
    if (error) throw error
    return data.map(toApp)
  },

  async getByDay(weekday) {
    if (isDemoMode) {
      const all = await api.get('students')
      return stitchParents(all.filter(s => !s.archived && !s.deleted && s.scheduleDays.includes(weekday)))
    }
    const { data, error } = await supabase.from('students').select(SELECT)
      .eq('archived', false).eq('deleted', false)
      .filter('schedule_days', 'cs', `{${weekday}}`)
    if (error) throw error
    return data.map(toApp)
  },

  async getArchived() {
    if (isDemoMode) {
      const all = await api.get('students')
      return stitchParents(all.filter(s => s.archived && !s.deleted))
    }
    const { data, error } = await supabase.from('students').select(SELECT)
      .eq('archived', true).eq('deleted', false).order('grade').order('name')
    if (error) throw error
    return data.map(toApp)
  },

  async getDeleted() {
    if (isDemoMode) {
      const all = await api.get('students')
      return stitchParents(all.filter(s => s.deleted))
    }
    const { data, error } = await supabase.from('students').select(SELECT)
      .eq('deleted', true).order('grade').order('name')
    if (error) throw error
    return data.map(toApp)
  },

  async create(data) {
    if (isDemoMode) {
      const created = await api.post('students', { ...toCleanDemo(data), archived: false, deleted: false })
      return (await stitchParents([created]))[0]
    }
    const { data: result, error } = await supabase.from('students')
      .insert(toDb(data)).select(SELECT).single()
    if (error) throw error
    return toApp(result)
  },

  async update(id, data) {
    if (isDemoMode) {
      const updated = await api.put('students', id, toCleanDemo(data))
      return (await stitchParents([updated]))[0]
    }
    const { data: result, error } = await supabase.from('students')
      .update(toDb(data)).eq('id', id).select(SELECT).single()
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

// demo 寫入只保留正規化欄位，不存 parentName/phone（避免反正規化複本）
function toCleanDemo(data) {
  return {
    name: data.name,
    grade: data.grade,
    parentId: data.parentId,
    scheduleDays: data.scheduleDays,
    notes: data.notes ?? '',
    ...(data.archived !== undefined ? { archived: data.archived } : {}),
    ...(data.deleted !== undefined ? { deleted: data.deleted } : {})
  }
}
