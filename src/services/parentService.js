import { api } from '../lib/api'
import { supabase, isDemoMode } from '../lib/supabase'

// supabase 用 line_user_id（snake），前端用 lineUserId（camel）；name/phone 同名
const toApp = r => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  lineUserId: r.line_user_id ?? r.lineUserId ?? ''
})
const toDb = d => {
  const o = {}
  if (d.name !== undefined) o.name = d.name
  if (d.phone !== undefined) o.phone = d.phone
  if (d.lineUserId !== undefined) o.line_user_id = d.lineUserId
  return o
}

export const parentService = {
  async getAll() {
    if (isDemoMode) return api.get('parents')
    const { data, error } = await supabase.from('parents').select('*').order('name')
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
    if (isDemoMode) return api.post('parents', data)
    const { data: result, error } = await supabase.from('parents')
      .insert(toDb(data)).select().single()
    if (error) throw error
    return toApp(result)
  },

  // 更新家長。學生的家長姓名/電話/LINE 為衍生（從 parents 帶出），改一處即全家反映
  async update(id, data) {
    if (isDemoMode) {
      await api.put('parents', id, data)
      return
    }
    const { error } = await supabase.from('parents').update(toDb(data)).eq('id', id)
    if (error) throw error
  }
}
