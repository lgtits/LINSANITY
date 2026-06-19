const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${dateStr.replace(/-/g, '/')} (${WEEKDAYS[d.getDay()]})`
}

/**
 * @param {object} opts
 * @param {string} opts.parentName
 * @param {string} opts.date        - YYYY-MM-DD
 * @param {{ name: string, total: number, orders: { restaurantName: string, items: { menuItemName: string, qty: number }[] }[] }[]} opts.kids
 * @param {number} opts.balance
 * @param {{ amount: number, note: string }[]} [opts.topups]
 */
export function buildExpenseMessage({ parentName, date, kids, balance, topups = [], isToday = true }) {
  const dayLabel = isToday ? '今日' : formatDate(date)
  const lines = [`您好，${parentName} 家長：`, formatDate(date)]

  if (!kids.length) {
    lines.push(`${dayLabel}無用餐記錄`)
  } else {
    let familyTotal = 0
    for (const kid of kids) {
      familyTotal += kid.total
      lines.push(`${kid.name} ${dayLabel}餐費 $${kid.total}`)
      for (const order of kid.orders) {
        const items = order.items
          .map(i => i.qty > 1 ? `${i.menuItemName}×${i.qty}` : i.menuItemName)
          .join('、')
        lines.push(`  • ${order.restaurantName}：${items}`)
      }
    }
    if (kids.length > 1) lines.push(`當日共 $${familyTotal}`)
  }

  for (const t of topups) {
    const note = t.note ? `（${t.note}）` : ''
    lines.push(`${dayLabel}儲值 +$${t.amount}${note}`)
  }

  const balanceLabel = isToday ? '目前帳戶餘額' : `截至 ${formatDate(date)} 帳戶餘額`
  lines.push(`${balanceLabel} $${balance}。`)
  return lines.join('\n')
}
