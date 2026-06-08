import { api } from '../lib/api'
import { supabase, isDemoMode } from '../lib/supabase'

const toApp = r => ({
  userId: r.user_id,
  displayName: r.display_name ?? '',
  pictureUrl: r.picture_url ?? '',
  lastMessage: r.last_message ?? '',
  linkedParentId: r.linked_parent_id ?? null,
})

export const lineContactService = {
  async getAll() {
    if (isDemoMode) return api.get('lineContacts')
    const { data, error } = await supabase.from('line_contacts').select('*')
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data.map(toApp)
  },

  // 綁定：把聯絡人連到家長（一個家長只綁一個 userId，先清掉舊的）
  async link(userId, parentId) {
    if (isDemoMode) {
      await api.mutate('lineContacts', rows => {
        for (const c of rows) if (c.linkedParentId === parentId) c.linkedParentId = null
        const c = rows.find(x => x.userId === userId)
        if (c) c.linkedParentId = parentId
      })
      return
    }
    await supabase.from('line_contacts').update({ linked_parent_id: null }).eq('linked_parent_id', parentId)
    const { error } = await supabase.from('line_contacts').update({ linked_parent_id: parentId }).eq('user_id', userId)
    if (error) throw error
  },

  async unlink(userId) {
    if (isDemoMode) {
      await api.mutate('lineContacts', rows => {
        const c = rows.find(x => x.userId === userId)
        if (c) c.linkedParentId = null
      })
      return
    }
    const { error } = await supabase.from('line_contacts').update({ linked_parent_id: null }).eq('user_id', userId)
    if (error) throw error
  },
}
