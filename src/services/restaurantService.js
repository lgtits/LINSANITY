import { api } from '../lib/api'
import { supabase, isDemoMode } from '../lib/supabase'

// 餐廳/餐點被訂單引用，刪除一律走軟刪除（deleted 旗標），與 parents/students 同慣例。
// 餐廳欄位與前端同名（name/phone/address/active/deleted），不需轉換
const menuToApp = m => ({
  id: m.id,
  restaurantId: m.restaurant_id,
  name: m.name,
  price: Number(m.price),
  category: m.category,
  available: m.available,
  defaultQty: m.default_qty,
  deleted: m.deleted ?? false
})

const menuToDb = d => ({
  restaurant_id: d.restaurantId,
  name: d.name,
  price: d.price,
  category: d.category,
  available: d.available,
  default_qty: d.defaultQty
})

// demo：餐廳被軟刪除時，旗下餐點一併視為不可見（對應 supabase 的 !inner 過濾）
async function liveRestaurantIds() {
  const all = await api.get('restaurants')
  return new Set(all.filter(r => !r.deleted).map(r => r.id))
}

export const restaurantService = {
  // 只回傳未刪除的餐廳
  async getAll() {
    if (isDemoMode) {
      const all = await api.get('restaurants')
      return all.filter(r => !r.deleted)
    }
    const { data, error } = await supabase.from('restaurants').select('*')
      .eq('deleted', false).order('name')
    if (error) throw error
    return data
  },

  async getActive() {
    if (isDemoMode) {
      const all = await api.get('restaurants')
      return all.filter(r => r.active && !r.deleted)
    }
    const { data, error } = await supabase.from('restaurants').select('*')
      .eq('active', true).eq('deleted', false).order('name')
    if (error) throw error
    return data
  },

  async getDeletedRestaurants() {
    if (isDemoMode) {
      const all = await api.get('restaurants')
      return all.filter(r => r.deleted)
    }
    const { data, error } = await supabase.from('restaurants').select('*')
      .eq('deleted', true).order('name')
    if (error) throw error
    return data
  },

  async createRestaurant(data) {
    if (isDemoMode) return api.post('restaurants', { ...data, active: true, deleted: false })
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

  // 軟刪除餐廳。旗下餐點不動旗標，靠 getMenuItems 的餐廳條件一併隱藏，
  // 復原餐廳時各餐點就能維持自己原本的刪除狀態。
  async removeRestaurant(id) {
    if (isDemoMode) return api.put('restaurants', id, { deleted: true })
    const { error } = await supabase.from('restaurants').update({ deleted: true }).eq('id', id)
    if (error) throw error
  },

  async restoreRestaurant(id) {
    if (isDemoMode) return api.put('restaurants', id, { deleted: false })
    const { error } = await supabase.from('restaurants').update({ deleted: false }).eq('id', id)
    if (error) throw error
  },

  // 真刪除：餐點靠 FK cascade 一併移除，訂單則因 FK set null 保留快照
  async permanentDeleteRestaurant(id) {
    if (isDemoMode) {
      const menus = await api.get('menuItems')
      for (const m of menus.filter(m => m.restaurantId === id)) {
        await api.remove('menuItems', m.id)
      }
      return api.remove('restaurants', id)
    }
    const { error } = await supabase.from('restaurants').delete().eq('id', id)
    if (error) throw error
  },

  // 只回傳未刪除、且所屬餐廳也未刪除的餐點
  async getMenuItems(restaurantId) {
    if (isDemoMode) {
      const [all, live] = await Promise.all([
        restaurantId ? api.get('menuItems', { restaurantId }) : api.get('menuItems'),
        liveRestaurantIds()
      ])
      return all.filter(m => !m.deleted && live.has(m.restaurantId))
    }
    let query = supabase.from('menu_items').select('*, restaurants!inner(deleted)')
      .eq('deleted', false).eq('restaurants.deleted', false)
    if (restaurantId) query = query.eq('restaurant_id', restaurantId)
    const { data, error } = await query
    if (error) throw error
    return data.map(menuToApp)
  },

  async getDeletedMenuItems() {
    if (isDemoMode) {
      const all = await api.get('menuItems')
      return all.filter(m => m.deleted)
    }
    const { data, error } = await supabase.from('menu_items').select('*')
      .eq('deleted', true).order('name')
    if (error) throw error
    return data.map(menuToApp)
  },

  async createMenuItem(data) {
    if (isDemoMode) return api.post('menuItems', { ...data, available: true, deleted: false })
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
    if (isDemoMode) return api.put('menuItems', id, { deleted: true })
    const { error } = await supabase.from('menu_items').update({ deleted: true }).eq('id', id)
    if (error) throw error
  },

  async restoreMenuItem(id) {
    if (isDemoMode) return api.put('menuItems', id, { deleted: false })
    const { error } = await supabase.from('menu_items').update({ deleted: false }).eq('id', id)
    if (error) throw error
  },

  // 真刪除：order_items.menu_item_id 為 set null，歷史訂單靠快照欄位保留
  async permanentDeleteMenuItem(id) {
    if (isDemoMode) return api.remove('menuItems', id)
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) throw error
  }
}
