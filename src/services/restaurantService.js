import { api } from '../lib/api'
import { isDemoMode } from '../lib/supabase'

export const restaurantService = {
  async getAll() {
    if (isDemoMode) return api.get('restaurants')
  },

  async getActive() {
    if (isDemoMode) {
      const all = await api.get('restaurants')
      return all.filter(r => r.active)
    }
  },

  async createRestaurant(data) {
    if (isDemoMode) return api.post('restaurants', { ...data, active: true })
  },

  async updateRestaurant(id, data) {
    if (isDemoMode) return api.put('restaurants', id, data)
  },

  async removeRestaurant(id) {
    if (isDemoMode) {
      await api.remove('restaurants', id)
      const menus = await api.get('menuItems')
      for (const m of menus.filter(m => m.restaurantId === id)) {
        await api.remove('menuItems', m.id)
      }
    }
  },

  async getMenuItems(restaurantId) {
    if (isDemoMode) {
      return restaurantId
        ? api.get('menuItems', { restaurantId })
        : api.get('menuItems')
    }
  },

  async createMenuItem(data) {
    if (isDemoMode) return api.post('menuItems', { ...data, available: true })
  },

  async updateMenuItem(id, data) {
    if (isDemoMode) return api.put('menuItems', id, data)
  },

  async removeMenuItem(id) {
    if (isDemoMode) return api.remove('menuItems', id)
  }
}
