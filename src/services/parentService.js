import { api } from '../lib/api'
import { supabase, isDemoMode } from '../lib/supabase'

// 家長欄位與前端同名（id/name/phone），不需轉換

export const parentService = {
  async getAll() {
    if (isDemoMode) return api.get('parents')
    const { data, error } = await supabase.from('parents').select('*').order('name')
    if (error) throw error
    return data
  },

  async findByPhone(phone) {
    if (isDemoMode) {
      const all = await api.get('parents')
      return all.find(p => p.phone === phone) ?? null
    }
    const { data, error } = await supabase.from('parents').select('*')
      .eq('phone', phone).maybeSingle()
    if (error) throw error
    return data ?? null
  },

  async create(data) {
    if (isDemoMode) return api.post('parents', data)
    const { data: result, error } = await supabase.from('parents')
      .insert(data).select().single()
    if (error) throw error
    return result
  },

  // 更新家長。學生的家長姓名/電話為衍生欄位（從 parents 帶出），故改一處即全家反映，
  // 不需再同步學生（正規化後沒有反正規化複本）
  async update(id, data) {
    if (isDemoMode) {
      await api.put('parents', id, data)
      return
    }
    const { error } = await supabase.from('parents').update(data).eq('id', id)
    if (error) throw error
  }
}
