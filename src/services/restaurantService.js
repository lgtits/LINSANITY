import restaurantData from '../mock/restaurants.json'
import menuData from '../mock/menuItems.json'

let restaurants = restaurantData.map(r => ({ ...r }))
let menuItems = menuData.map(m => ({ ...m }))

export const restaurantService = {
  async getAll() {
    return restaurants.map(r => ({ ...r }))
  },

  async getActive() {
    return restaurants.filter(r => r.active).map(r => ({ ...r }))
  },

  async createRestaurant(data) {
    const item = { ...data, id: 'r' + Date.now(), active: true }
    restaurants.push(item)
    return { ...item }
  },

  async updateRestaurant(id, data) {
    const idx = restaurants.findIndex(r => r.id === id)
    if (idx === -1) throw new Error('餐廳不存在')
    restaurants[idx] = { ...restaurants[idx], ...data }
    return { ...restaurants[idx] }
  },

  async removeRestaurant(id) {
    restaurants = restaurants.filter(r => r.id !== id)
    menuItems = menuItems.filter(m => m.restaurantId !== id)
  },

  async getMenuItems(restaurantId) {
    const items = restaurantId
      ? menuItems.filter(m => m.restaurantId === restaurantId)
      : menuItems
    return items.map(m => ({ ...m }))
  },

  async createMenuItem(data) {
    const item = { ...data, id: 'm' + Date.now(), available: true }
    menuItems.push(item)
    return { ...item }
  },

  async updateMenuItem(id, data) {
    const idx = menuItems.findIndex(m => m.id === id)
    if (idx === -1) throw new Error('餐點不存在')
    menuItems[idx] = { ...menuItems[idx], ...data }
    return { ...menuItems[idx] }
  },

  async removeMenuItem(id) {
    menuItems = menuItems.filter(m => m.id !== id)
  }
}
