import { api } from '../lib/api'
import { supabase, isDemoMode } from '../lib/supabase'

const toApp = r => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  lineUserId: r.line_user_id ?? r.lineUserId ?? '',
  archived: r.archived ?? false,
  deleted: r.deleted ?? false
})

const toDb = d => {
  const o = {}
  if (d.name !== undefined) o.name = d.name
  if (d.phone !== undefined) o.phone = d.phone
  if (d.lineUserId !== undefined) o.line_user_id = d.lineUserId
  if (d.archived !== undefined) o.archived = d.archived
  if (d.deleted !== undefined) o.deleted = d.deleted
  return o
}

export const parentService = {
  // 只回傳在籍（非封存、非刪除）的家長
  async getAll() {
    if (isDemoMode) {
      const all = await api.get('parents')
      return all.filter(p => !p.archived && !p.deleted)
    }
    const { data, error } = await supabase.from('parents').select('*')
      .eq('archived', false).eq('deleted', false).order('name')
    if (error) throw error
    return data.map(toApp)
  },

  async getArchived() {
    if (isDemoMode) {
      const all = await api.get('parents')
      return all.filter(p => p.archived && !p.deleted)
    }
    const { data, error } = await supabase.from('parents').select('*')
      .eq('archived', true).eq('deleted', false).order('name')
    if (error) throw error
    return data.map(toApp)
  },

  async getDeleted() {
    if (isDemoMode) {
      const all = await api.get('parents')
      return all.filter(p => p.deleted)
    }
    const { data, error } = await supabase.from('parents').select('*')
      .eq('deleted', true).order('name')
    if (error) throw error
    return data.map(toApp)
  },

  async findByPhone(phone) {
    if (isDemoMode) {
      const all = await api.get('parents')
      return all.find(p => p.phone === phone) ?? null
    }
    const { data, error } = await supabase.from('parents').select('*')
      .eq('phone', phone).maybeSingle()
    if (error) throw error
    return data ? toApp(data) : null
  },

  async create(data) {
    if (isDemoMode) return api.post('parents', { ...data, archived: false, deleted: false })
    const { data: result, error } = await supabase.from('parents')
      .insert(toDb(data)).select().single()
    if (error) throw error
    return toApp(result)
  },

  async update(id, data) {
    if (isDemoMode) {
      await api.put('parents', id, data)
      return
    }
    const { error } = await supabase.from('parents').update(toDb(data)).eq('id', id)
    if (error) throw error
  },

  async archive(id) {
    if (isDemoMode) return api.put('parents', id, { archived: true })
    const { error } = await supabase.from('parents').update({ archived: true }).eq('id', id)
    if (error) throw error
  },

  async unarchive(id) {
    if (isDemoMode) return api.put('parents', id, { archived: false })
    const { error } = await supabase.from('parents').update({ archived: false }).eq('id', id)
    if (error) throw error
  },

  async softDelete(id) {
    if (isDemoMode) return api.put('parents', id, { deleted: true, archived: false })
    const { error } = await supabase.from('parents').update({ deleted: true }).eq('id', id)
    if (error) throw error
  },

  async restore(id) {
    if (isDemoMode) return api.put('parents', id, { deleted: false, archived: false })
    const { error } = await supabase.from('parents').update({ deleted: false }).eq('id', id)
    if (error) throw error
  },

  async permanentDelete(id) {
    if (isDemoMode) return api.remove('parents', id)
    // meal_transactions.parent_id NOT NULL 無法 SET NULL，必須先刪
    // students.parent_id / orders.parent_id 已設 ON DELETE SET NULL，DB 自動處理
    const { error: txErr } = await supabase.from('meal_transactions').delete().eq('parent_id', id)
    if (txErr) throw txErr
    const { error } = await supabase.from('parents').delete().eq('id', id)
    if (error) throw error
  }
}
