import { api } from '../lib/api'
import { supabase, isDemoMode } from '../lib/supabase'

function itemTotal(item) { return item.price * (item.qty || 1) }
function today() { return new Date().toISOString().slice(0, 10) }

export const orderService = {
  async getAll() {
    if (isDemoMode) return api.get('orders')
    const { data, error } = await supabase.from('orders').select('*, order_items(*)')
    if (error) throw error
    return data
  },

  async getByDate(date) {
    if (isDemoMode) return api.get('orders', { date })
    const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('date', date)
    if (error) throw error
    return data
  },

  async getToday() {
    if (isDemoMode) return api.get('todayOrders')
    const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('date', today())
    if (error) throw error
    return data
  },

  async saveOrder(data) {
    if (isDemoMode) {
      return api.post('todayOrders', {
        ...data,
        total: data.items.reduce((s, i) => s + itemTotal(i), 0)
      })
    }
    const { data: result, error } = await supabase.rpc('save_order', data)
    if (error) throw error
    return result
  },

  async deleteOrder(id) {
    if (isDemoMode) return api.remove('todayOrders', id)
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) throw error
  },

  async deleteOrderItem(orderId, itemId) {
    if (isDemoMode) {
      let deleted = null
      await api.mutate('todayOrders', orders => {
        const order = orders.find(o => o.id === orderId)
        if (!order) return
        deleted = order.items.find(i => i.itemId === itemId) || null
        order.items = order.items.filter(i => i.itemId !== itemId)
        order.total = order.items.reduce((s, i) => s + itemTotal(i), 0)
        if (order.items.length === 0) orders.splice(orders.indexOf(order), 1)
      })
      return deleted
    }
    const { error } = await supabase.from('order_items').delete().eq('id', itemId)
    if (error) throw error
  }
}
