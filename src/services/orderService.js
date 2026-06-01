// order 結構:
// { id, date, restaurantId, restaurantName, studentId, studentName, grade,
//   items: [{ itemId, menuItemId, menuItemName, price }], total }

const mockOrders = [
  {
    id: 'o_d1', date: '2026-06-02', restaurantId: 'r1', restaurantName: '阿忠便當',
    studentId: 's1', studentName: '王小明', grade: 3,
    items: [{ itemId: 'i_d1', menuItemId: 'm1', menuItemName: '排骨便當', price: 70 }],
    total: 70
  },
  {
    id: 'o_d2', date: '2026-06-02', restaurantId: 'r1', restaurantName: '阿忠便當',
    studentId: 's2', studentName: '李小華', grade: 4,
    items: [{ itemId: 'i_d2', menuItemId: 'm2', menuItemName: '雞腿便當', price: 80 }],
    total: 80
  },
  {
    id: 'o_d3', date: '2026-06-02', restaurantId: 'r1', restaurantName: '阿忠便當',
    studentId: 's3', studentName: '陳美玲', grade: 3,
    items: [{ itemId: 'i_d3', menuItemId: 'm4', menuItemName: '素食便當', price: 65 }],
    total: 65
  },
  {
    id: 'o_d4', date: '2026-06-02', restaurantId: 'r2', restaurantName: '香香自助餐',
    studentId: 's5', studentName: '林佳芬', grade: 2,
    items: [{ itemId: 'i_d4', menuItemId: 'm7', menuItemName: '四菜一湯', price: 90 }],
    total: 90
  },
  {
    id: 'o_d5', date: '2026-06-02', restaurantId: 'r1', restaurantName: '阿忠便當',
    studentId: 's6', studentName: '吳俊賢', grade: 6,
    items: [
      { itemId: 'i_d5a', menuItemId: 'm2', menuItemName: '雞腿便當', price: 80 },
      { itemId: 'i_d5b', menuItemId: 'm3', menuItemName: '控肉便當', price: 75 }
    ],
    total: 155
  },
  {
    id: 'o_d6', date: '2026-06-03', restaurantId: 'r1', restaurantName: '阿忠便當',
    studentId: 's1', studentName: '王小明', grade: 3,
    items: [{ itemId: 'i_d6', menuItemId: 'm2', menuItemName: '雞腿便當', price: 80 }],
    total: 80
  },
  {
    id: 'o_d7', date: '2026-06-03', restaurantId: 'r2', restaurantName: '香香自助餐',
    studentId: 's2', studentName: '李小華', grade: 4,
    items: [{ itemId: 'i_d7', menuItemId: 'm7', menuItemName: '四菜一湯', price: 90 }],
    total: 90
  },
  {
    id: 'o_d8', date: '2026-06-03', restaurantId: 'r2', restaurantName: '香香自助餐',
    studentId: 's3', studentName: '陳美玲', grade: 3,
    items: [{ itemId: 'i_d8', menuItemId: 'm9', menuItemName: '素食套餐', price: 75 }],
    total: 75
  },
  {
    id: 'o_d9', date: '2026-06-03', restaurantId: 'r1', restaurantName: '阿忠便當',
    studentId: 's4', studentName: '張志豪', grade: 5,
    items: [{ itemId: 'i_d9', menuItemId: 'm3', menuItemName: '控肉便當', price: 75 }],
    total: 75
  },
  {
    id: 'o_d10', date: '2026-06-03', restaurantId: 'r2', restaurantName: '香香自助餐',
    studentId: 's5', studentName: '林佳芬', grade: 2,
    items: [{ itemId: 'i_d10', menuItemId: 'm7', menuItemName: '四菜一湯', price: 90 }],
    total: 90
  },
  {
    id: 'o_d11', date: '2026-06-03', restaurantId: 'r1', restaurantName: '阿忠便當',
    studentId: 's6', studentName: '吳俊賢', grade: 6,
    items: [{ itemId: 'i_d11', menuItemId: 'm2', menuItemName: '雞腿便當', price: 80 }],
    total: 80
  }
]

let orders = mockOrders.map(o => ({ ...o, items: o.items.map(i => ({ ...i })) }))

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export const orderService = {
  async getAll() {
    return orders.map(o => ({ ...o, items: o.items.map(i => ({ ...i })) }))
  },

  async getByDate(date) {
    return orders.filter(o => o.date === date).map(o => ({ ...o, items: [...o.items] }))
  },

  async saveOrder(data) {
    const order = {
      ...data,
      id: 'o_' + uid(),
      total: data.items.reduce((s, i) => s + i.price, 0)
    }
    orders.push(order)
    return { ...order }
  },

  // 刪除整筆訂單，回傳被刪的 order（供退款用）
  async deleteOrder(id) {
    const order = orders.find(o => o.id === id)
    if (!order) return null
    orders = orders.filter(o => o.id !== id)
    return { ...order }
  },

  // 刪除訂單中的單一餐點，回傳被刪的 item（供退款用）
  // 若刪除後訂單無任何餐點，整筆訂單自動移除
  async deleteOrderItem(orderId, itemId) {
    const order = orders.find(o => o.id === orderId)
    if (!order) return null
    const item = order.items.find(i => i.itemId === itemId)
    if (!item) return null
    order.items = order.items.filter(i => i.itemId !== itemId)
    order.total = order.items.reduce((s, i) => s + i.price, 0)
    if (order.items.length === 0) {
      orders = orders.filter(o => o.id !== orderId)
    }
    return { ...item }
  }
}
