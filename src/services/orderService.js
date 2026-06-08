import { api } from '../lib/api'
import { supabase, isDemoMode } from '../lib/supabase'

function itemTotal(item) { return item.price * (item.qty || 1) }
function today() { return new Date().toISOString().slice(0, 10) }

// ISO timestamptz → "YYYY-MM-DD HH:mm"
const fmtDT = v => (v ? String(v).replace('T', ' ').slice(0, 16) : null)

const toApp = o => ({
  id: o.id,
  batchId: o.batch_id,
  date: o.date,
  datetime: fmtDT(o.datetime),
  restaurantId: o.restaurant_id,
  restaurantName: o.restaurant_name,
  studentId: o.student_id,
  studentName: o.student_name,
  grade: o.grade,
  parentId: o.parent_id,
  total: Number(o.total),
  items: (o.order_items || []).map(i => ({
    itemId: i.id,
    menuItemId: i.menu_item_id,
    menuItemName: i.menu_item_name,
    price: Number(i.price),
    qty: i.qty
  }))
})

export const orderService = {
  async getAll() {
    if (isDemoMode) return api.get('orders')
    const { data, error } = await supabase.from('orders').select('*, order_items(*)')
    if (error) throw error
    return data.map(toApp)
  },

  async getByDate(date) {
    if (isDemoMode) return api.get('orders', { date })
    const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('date', date)
    if (error) throw error
    return data.map(toApp)
  },

  async getToday() {
    if (isDemoMode) return api.get('todayOrders')
    const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('date', today())
    if (error) throw error
    return data.map(toApp)
  },

  // 點餐頁「已確認訂單」：讀 saveOrder 寫入的同一份，依日期過濾
  // demo 寫入 todayOrders；supabase 直接以 orders.date 查（任何日期都正確）
  async getConfirmedByDate(date) {
    if (isDemoMode) {
      const all = await api.get('todayOrders')
      return all.filter(o => o.date === date)
    }
    const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('date', date)
    if (error) throw error
    return data.map(toApp)
  },

  async saveOrder(data) {
    if (isDemoMode) {
      return api.post('todayOrders', {
        ...data,
        total: data.items.reduce((s, i) => s + itemTotal(i), 0)
      })
    }
    // 對應 schema.sql 的 save_order(payload jsonb)，一次寫入 orders + order_items
    const { data: result, error } = await supabase.rpc('save_order', { payload: data })
    if (error) throw error
    return result
  },

  async deleteOrder(id) {
    if (isDemoMode) return api.remove('todayOrders', id)
    // order_items 設定 on delete cascade
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
    // 取得被刪品項（供退費計算用）
    const { data: item, error: getErr } = await supabase.from('order_items')
      .select('*').eq('id', itemId).maybeSingle()
    if (getErr) throw getErr

    const { error: delErr } = await supabase.from('order_items').delete().eq('id', itemId)
    if (delErr) throw delErr

    // 重算該訂單 total；若已無品項則刪整筆訂單
    const { data: rest, error: restErr } = await supabase.from('order_items')
      .select('price, qty').eq('order_id', orderId)
    if (restErr) throw restErr

    if (!rest.length) {
      await supabase.from('orders').delete().eq('id', orderId)
    } else {
      const total = rest.reduce((s, i) => s + Number(i.price) * (i.qty || 1), 0)
      await supabase.from('orders').update({ total }).eq('id', orderId)
    }

    return item
      ? { itemId: item.id, menuItemId: item.menu_item_id, menuItemName: item.menu_item_name, price: Number(item.price), qty: item.qty }
      : null
  }
}
