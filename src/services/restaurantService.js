import { api } from '../lib/api'
import { supabase, isDemoMode } from '../lib/supabase'

// 餐廳欄位與前端同名（name/phone/address/active），不需轉換
const menuToApp = m => ({
  id: m.id,
  restaurantId: m.restaurant_id,
  name: m.name,
  price: Number(m.price),
  category: m.category,
  available: m.available,
  defaultQty: m.default_qty
})

const menuToDb = d => ({
  restaurant_id: d.restaurantId,
  name: d.name,
  price: d.price,
  category: d.category,
  available: d.available,
  default_qty: d.defaultQty
})

export const restaurantService = {
  async getAll() {
    if (isDemoMode) return api.get('restaurants')
    const { data, error } = await supabase.from('restaurants').select('*').order('name')
    if (error) throw error
    return data
  },

  async getActive() {
    if (isDemoMode) {
      const all = await api.get('restaurants')
      return all.filter(r => r.active)
    }
    const { data, error } = await supabase.from('restaurants').select('*')
      .eq('active', true).order('name')
    if (error) throw error
    return data
  },

  async createRestaurant(data) {
    if (isDemoMode) return api.post('restaurants', { ...data, active: true })
    const { data: result, error } = await supabase.from('restaurants')
      .insert({ ...data, active: true }).select().single()
    if (error) throw error
    return result
  },

  async updateRestaurant(id, data) {
    if (isDemoMode) return api.put('restaurants', id, data)
    const { data: result, error } = await supabase.from('restaurants')
      .update(data).eq('id', id).select().single()
    if (error) throw error
    return result
  },

  async removeRestaurant(id) {
    if (isDemoMode) {
      await api.remove('restaurants', id)
      const menus = await api.get('menuItems')
      for (const m of menus.filter(m => m.restaurantId === id)) {
        await api.remove('menuItems', m.id)
      }
      return
    }
    // menu_items 設定 on delete cascade，刪餐廳會連帶刪菜單
    const { error } = await supabase.from('restaurants').delete().eq('id', id)
    if (error) throw error
  },

  async getMenuItems(restaurantId) {
    if (isDemoMode) {
      return restaurantId
        ? api.get('menuItems', { restaurantId })
        : api.get('menuItems')
    }
    let query = supabase.from('menu_items').select('*')
    if (restaurantId) query = query.eq('restaurant_id', restaurantId)
    const { data, error } = await query
    if (error) throw error
    return data.map(menuToApp)
  },

  async createMenuItem(data) {
    if (isDemoMode) return api.post('menuItems', { ...data, available: true })
    const { data: result, error } = await supabase.from('menu_items')
      .insert({ ...menuToDb(data), available: true }).select().single()
    if (error) throw error
    return menuToApp(result)
  },

  async updateMenuItem(id, data) {
    if (isDemoMode) return api.put('menuItems', id, data)
    const { data: result, error } = await supabase.from('menu_items')
      .update(menuToDb(data)).eq('id', id).select().single()
    if (error) throw error
    return menuToApp(result)
  },

  async removeMenuItem(id) {
    if (isDemoMode) return api.remove('menuItems', id)
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) throw error
  }
}
