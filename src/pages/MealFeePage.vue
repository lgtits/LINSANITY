<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />

    <q-tabs v-model="recordTab" align="left" indicator-color="primary" active-color="primary"
      class="q-mb-md" dense>
      <q-tab name="today"   icon="today"   label="今日" />
      <q-tab name="history" icon="history" label="歷史" />
    </q-tabs>

    <q-tab-panels v-model="recordTab" animated>

      <!-- ══════ 今日 tab ══════ -->
      <q-tab-panel name="today" class="q-pa-none">
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="q-py-sm">
            <div class="row items-center">
              <div class="col">
                <div class="text-subtitle2 text-weight-bold">
                  {{ todayStr }}（{{ todayWeekday }}）
                </div>
                <div class="text-body2 text-grey-6">
                  {{ todayRecords.length }} 位學生・共 ${{ todayTotal }}
                </div>
              </div>
              <div class="col-auto row q-gutter-xs">
                <q-btn outline icon="content_copy" label="複製全班通知" color="primary" size="sm"
                  :disable="!todayRecords.length" @click="copyAllNotification" />
                <q-btn outline icon="file_download" label="匯出 Excel" color="positive" size="sm"
                  :disable="!todayRecords.length" @click="exportTodayExcel" />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-list v-if="todayRecords.length" bordered separator class="rounded-borders overflow-hidden">
          <q-expansion-item
            v-for="record in todayRecords"
            :key="record.key"
            expand-separator
          >
            <template #header>
              <q-item-section>
                <q-item-label class="text-weight-bold">
                  {{ record.studentName }}
                  <span class="text-body2 text-grey-6 q-ml-xs">{{ record.grade }}年級</span>
                </q-item-label>
                <q-item-label caption>
                  {{ record.orders.length }} 筆訂單・{{ record.orders.map(o => o.restaurantName).join('、') }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="row items-center q-gutter-xs">
                  <span class="text-subtitle2 text-primary text-weight-bold">${{ record.totalAmount }}</span>
                  <q-btn flat round dense icon="content_copy" color="grey-6" size="sm"
                    @click.stop="copyOneStudentNotification(record)">
                    <q-tooltip>複製此學生通知</q-tooltip>
                  </q-btn>
                </div>
              </q-item-section>
            </template>

            <div class="bg-grey-1">
              <div v-for="order in record.orders" :key="order.id" class="q-pa-sm q-mb-xs">
                <div class="row items-center q-mb-xs">
                  <q-icon name="restaurant" color="primary" size="sm" class="q-mr-xs" />
                  <span class="text-weight-bold text-body2">{{ order.restaurantName }}</span>
                  <span class="text-body2 text-grey-6 q-ml-xs">${{ order.total }}</span>
                  <q-space />
                  <q-btn flat dense round icon="delete" color="negative" size="xs"
                    @click="confirmDeleteOrder(order)">
                    <q-tooltip>刪除此餐廳訂單</q-tooltip>
                  </q-btn>
                </div>
                <div v-for="item in order.items" :key="item.itemId"
                  class="row items-center q-pl-md q-mb-xs">
                  <q-icon name="fiber_manual_record" size="8px" color="grey-5" class="q-mr-sm" />
                  <span class="col text-body2">
                    {{ item.menuItemName }}
                    <span v-if="item.qty > 1" class="text-primary"> ×{{ item.qty }}</span>
                  </span>
                  <span class="text-primary text-weight-bold q-mr-sm">${{ item.price * (item.qty || 1) }}</span>
                  <q-btn flat round dense icon="close" size="xs" color="grey-6"
                    @click="confirmDeleteItem(order, item)">
                    <q-tooltip>刪除此餐點</q-tooltip>
                  </q-btn>
                </div>
              </div>
            </div>
          </q-expansion-item>
        </q-list>

        <div v-else class="text-center text-grey q-pa-xl">
          <q-icon name="restaurant_menu" size="56px" class="q-mb-sm" /><br>今日尚無點餐記錄
        </div>
      </q-tab-panel>

      <!-- ══════ 歷史 tab ══════ -->
      <q-tab-panel name="history" class="q-pa-none">
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="q-pa-sm">
            <div class="row q-col-gutter-xs items-end">
              <div class="col-12 col-sm-3">
                <q-input v-model="orderSearch" label="搜尋學生" outlined dense clearable>
                  <template #prepend><q-icon name="search" size="sm" /></template>
                </q-input>
              </div>
              <div class="col-6 col-sm-2">
                <q-select v-model="orderGrade" :options="gradeFilterOptions" label="年級"
                  outlined dense emit-value map-options clearable />
              </div>
              <div class="col-6 col-sm-2">
                <q-input v-model="orderDateFrom" type="date" label="從" outlined dense />
              </div>
              <div class="col-6 col-sm-2">
                <q-input v-model="orderDateTo" type="date" label="至" outlined dense />
              </div>
              <div class="col-6 col-sm-3">
                <q-select v-model="orderSort" :options="sortOptions" label="排序"
                  outlined dense emit-value map-options />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <div class="row items-center q-mb-sm">
          <span class="text-body2 text-grey-6">{{ historyRecords.length }} 筆</span>
          <q-space />
          <q-btn flat dense icon="file_download" label="匯出篩選結果" color="positive" size="sm"
            :disable="!historyRecords.length" @click="exportHistoryExcel" />
        </div>

        <q-list v-if="historyRecords.length" bordered separator class="rounded-borders overflow-hidden">
          <q-expansion-item
            v-for="record in historyRecords"
            :key="record.key"
            expand-separator
          >
            <template #header>
              <q-item-section>
                <q-item-label class="text-weight-bold">
                  {{ record.studentName }}
                  <span class="text-body2 text-grey-6 q-ml-xs">{{ record.grade }}年級</span>
                </q-item-label>
                <q-item-label caption>
                  {{ record.date }} ・ {{ record.orders.map(o => o.restaurantName).join('、') }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <span class="text-subtitle2 text-primary text-weight-bold">${{ record.totalAmount }}</span>
              </q-item-section>
            </template>

            <div class="bg-grey-1">
              <div v-for="order in record.orders" :key="order.id" class="q-pa-sm q-mb-xs">
                <div class="row items-center q-mb-xs">
                  <q-icon name="restaurant" color="primary" size="sm" class="q-mr-xs" />
                  <span class="text-weight-bold text-body2">{{ order.restaurantName }}</span>
                  <span class="text-body2 text-grey-6 q-ml-xs">${{ order.total }}</span>
                  <q-space />
                  <q-btn flat dense round icon="delete" color="negative" size="xs"
                    @click="confirmDeleteOrder(order)">
                    <q-tooltip>刪除此餐廳訂單</q-tooltip>
                  </q-btn>
                </div>
                <div v-for="item in order.items" :key="item.itemId"
                  class="row items-center q-pl-md q-mb-xs">
                  <q-icon name="fiber_manual_record" size="8px" color="grey-5" class="q-mr-sm" />
                  <span class="col text-body2">
                    {{ item.menuItemName }}
                    <span v-if="item.qty > 1" class="text-primary"> ×{{ item.qty }}</span>
                  </span>
                  <span class="text-primary text-weight-bold q-mr-sm">${{ item.price * (item.qty || 1) }}</span>
                  <q-btn flat round dense icon="close" size="xs" color="grey-6"
                    @click="confirmDeleteItem(order, item)">
                    <q-tooltip>刪除此餐點</q-tooltip>
                  </q-btn>
                </div>
              </div>
            </div>
          </q-expansion-item>
        </q-list>

        <div v-else class="text-center text-grey q-pa-xl">
          <q-icon name="event_note" size="48px" /><br>
          {{ historyLoaded ? '無符合篩選的記錄' : '尚無點餐記錄' }}
        </div>
      </q-tab-panel>

    </q-tab-panels>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import * as XLSX from 'xlsx'
import { mealService } from '../services/mealService'
import { orderService } from '../services/orderService'
import { studentService } from '../services/studentService'
import { localDate } from '../lib/datetime'

const $q = useQuasar()
const loading = ref(true)

const gradeFilterOptions = [
  { label: '全部年級', value: null },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({ label: `${n}年級`, value: n }))
]

const weekdayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
const todayStr = localDate()
const todayWeekday = weekdayNames[new Date().getDay()]

function getWeekdayText(dateStr) {
  return weekdayNames[new Date(dateStr + 'T00:00:00').getDay()]
}

// ── 點餐記錄 ──
const todayOrders   = ref([])
const historyOrders = ref([])
const historyLoaded = ref(false)
const balances      = ref({})   // { parentId: balance }
const allStudents   = ref([])
const recordTab     = ref('today')

// studentId → parentId 對照表
const studentParentMap = computed(() => {
  const map = {}
  for (const s of allStudents.value) map[s.id] = s.parentId
  return map
})

function parentIdOf(studentId) {
  return studentParentMap.value[studentId] ?? studentId
}


function groupByStudent(orderList) {
  const map = new Map()
  for (const order of orderList) {
    const key = `${order.date}_${order.studentId}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        date: order.date,
        studentId: order.studentId,
        studentName: order.studentName,
        grade: order.grade,
        orders: [],
        totalAmount: 0
      })
    }
    const rec = map.get(key)
    rec.orders.push(order)
    rec.totalAmount += order.total
  }
  return [...map.values()]
}

const todayRecords = computed(() => {
  const recs = groupByStudent(todayOrders.value)
  return recs.sort((a, b) =>
    a.grade !== b.grade ? a.grade - b.grade : a.studentName.localeCompare(b.studentName, 'zh-TW')
  )
})

const todayTotal = computed(() => todayRecords.value.reduce((s, r) => s + r.totalAmount, 0))

const orderSearch   = ref('')
const orderGrade    = ref(null)
const orderDateFrom = ref('')
const orderDateTo   = ref('')
const orderSort     = ref('date_desc')

const sortOptions = [
  { label: '日期（新→舊）', value: 'date_desc' },
  { label: '日期（舊→新）', value: 'date_asc' },
  { label: '學生姓名',       value: 'name' },
  { label: '年級',           value: 'grade' },
  { label: '金額（高→低）',  value: 'total_desc' }
]

const historyRecords = computed(() => {
  let recs = groupByStudent(historyOrders.value)
  const q = orderSearch.value?.trim().toLowerCase()
  if (q) recs = recs.filter(r => r.studentName.toLowerCase().includes(q))
  if (orderGrade.value !== null) recs = recs.filter(r => r.grade === orderGrade.value)
  if (orderDateFrom.value) recs = recs.filter(r => r.date >= orderDateFrom.value)
  if (orderDateTo.value)   recs = recs.filter(r => r.date <= orderDateTo.value)
  const sorters = {
    date_desc:  (a, b) => b.date.localeCompare(a.date)  || a.studentName.localeCompare(b.studentName, 'zh-TW'),
    date_asc:   (a, b) => a.date.localeCompare(b.date)  || a.studentName.localeCompare(b.studentName, 'zh-TW'),
    name:       (a, b) => a.studentName.localeCompare(b.studentName, 'zh-TW') || b.date.localeCompare(a.date),
    grade:      (a, b) => a.grade - b.grade || b.date.localeCompare(a.date),
    total_desc: (a, b) => b.totalAmount - a.totalAmount
  }
  return [...recs].sort(sorters[orderSort.value])
})

async function loadHistory() {
  if (historyLoaded.value) return
  const all = await orderService.getAll()
  historyOrders.value = all.filter(o => o.date !== todayStr)
  historyLoaded.value = true
}

watch(recordTab, tab => { if (tab === 'history') loadHistory() })

onMounted(async () => {
  try {
    ;[todayOrders.value, balances.value, allStudents.value] = await Promise.all([
      orderService.getToday(),
      mealService.getAllBalances(),
      studentService.getAll()
    ])
  } finally {
    loading.value = false
  }
})

async function refreshOrders() {
  ;[todayOrders.value, balances.value] = await Promise.all([
    orderService.getToday(),
    mealService.getAllBalances()
  ])
  if (historyLoaded.value) {
    const all = await orderService.getAll()
    historyOrders.value = all.filter(o => o.date !== todayStr)
  }
}

// ── 刪除訂單 ──
function confirmDeleteOrder(order) {
  $q.dialog({
    title: '刪除訂單',
    message: `刪除 ${order.studentName}「${order.restaurantName}」的訂單，並退款 $${order.total}？`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'negative', label: '刪除並退款' },
    persistent: true
  }).onOk(async () => {
    await orderService.deleteOrder(order.id)
    await mealService.topup(parentIdOf(order.studentId), order.total, `退款：${order.restaurantName} ${order.date}`)
    await refreshOrders()
    $q.notify({ message: `已退款 $${order.total} 給 ${order.studentName}`, color: 'positive', icon: 'savings' })
  })
}

function confirmDeleteItem(order, item) {
  $q.dialog({
    title: '刪除餐點',
    message: `刪除「${item.menuItemName}」並退款 $${item.price * (item.qty || 1)}？`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'negative', label: '刪除並退款' },
    persistent: true
  }).onOk(async () => {
    const refund = item.price * (item.qty || 1)
    await orderService.deleteOrderItem(order.id, item.itemId)
    await mealService.topup(parentIdOf(order.studentId), refund, `退款：${order.restaurantName} - ${item.menuItemName}${item.qty > 1 ? '×' + item.qty : ''}`)
    await refreshOrders()
    $q.notify({ message: `已退款 $${refund}（${item.menuItemName}${item.qty > 1 ? '×' + item.qty : ''}）`, color: 'positive', icon: 'savings' })
  })
}

// ── 通知文字（以家長為單位，含當日所有孩子訂單）──
function buildParentDayNotification(record) {
  const parentId = parentIdOf(record.studentId)
  const familyRecords = todayRecords.value.filter(r => parentIdOf(r.studentId) === parentId)
  const parentBalance = balances.value[parentId] ?? 0
  const warning = parentBalance < 100 ? '\n⚠️ 餘額不足，請盡快儲值' : ''
  const wt = getWeekdayText(record.date)
  const isMultiChild = familyRecords.length > 1
  const lines = [`📢 點餐通知 ${record.date}（${wt}）`]

  for (const rec of familyRecords) {
    if (isMultiChild) lines.push(`👤 ${rec.studentName}`)
    for (const order of rec.orders) {
      const itemsText = order.items.map(i =>
        i.qty > 1 ? `${i.menuItemName}×${i.qty} $${i.price * i.qty}` : `${i.menuItemName} $${i.price}`
      ).join('、')
      lines.push(`🍱 ${order.restaurantName}：${itemsText}`)
    }
    if (isMultiChild) lines.push(`  小計 $${rec.totalAmount}`)
  }

  const familyTotal = familyRecords.reduce((s, r) => s + r.totalAmount, 0)
  const balanceLabel = isMultiChild ? '家長餘額' : '餘額'
  lines.push(`共 $${familyTotal}｜${balanceLabel} $${parentBalance}${warning}`)
  return lines.join('\n')
}

async function copyOneStudentNotification(record) {
  try {
    await navigator.clipboard.writeText(buildParentDayNotification(record))
    $q.notify({ message: `${record.studentName} 通知已複製！`, color: 'positive', icon: 'content_copy' })
  } catch {
    $q.notify({ message: '複製失敗', color: 'warning' })
  }
}

async function copyAllNotification() {
  const divider = '─'.repeat(22)
  const lines = [`📢 今日點餐通知 ${todayStr}（${todayWeekday}）`, divider]

  const seenParents = new Set()
  for (const record of todayRecords.value) {
    const pid = parentIdOf(record.studentId)
    if (seenParents.has(pid)) continue
    seenParents.add(pid)

    const familyRecords = todayRecords.value.filter(r => parentIdOf(r.studentId) === pid)
    const balance = balances.value[pid] ?? 0
    const warning = balance < 100 ? ' ⚠️' : ''
    const familyTotal = familyRecords.reduce((s, r) => s + r.totalAmount, 0)

    if (familyRecords.length === 1) {
      const rec = familyRecords[0]
      const allItems = rec.orders.flatMap(o =>
        o.items.map(i => i.qty > 1 ? `${i.menuItemName}×${i.qty}` : i.menuItemName)
      ).join('、')
      lines.push(`${rec.studentName}：${allItems} $${familyTotal}｜餘額 $${balance}${warning}`)
    } else {
      for (const rec of familyRecords) {
        const allItems = rec.orders.flatMap(o =>
          o.items.map(i => i.qty > 1 ? `${i.menuItemName}×${i.qty}` : i.menuItemName)
        ).join('、')
        lines.push(`${rec.studentName}：${allItems} $${rec.totalAmount}`)
      }
      lines.push(`  家長共 $${familyTotal}｜餘額 $${balance}${warning}`)
    }
  }

  lines.push(divider)
  lines.push(`共 ${todayRecords.value.length} 位・總計 $${todayTotal.value}`)
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    $q.notify({ message: '全班通知已複製！', color: 'positive', icon: 'content_copy' })
  } catch {
    $q.notify({ message: '複製失敗', color: 'warning' })
  }
}

// ── Excel 匯出 ──
function flattenRecord(record) {
  return record.orders.flatMap(o =>
    o.items.map(i => ({
      '日期': record.date,
      '姓名': record.studentName,
      '年級': `${record.grade}年級`,
      '餐廳': o.restaurantName,
      '餐點': i.menuItemName,
      '數量': i.qty || 1,
      '單價': i.price,
      '小計': i.price * (i.qty || 1)
    }))
  )
}

function exportTodayExcel() {
  const data = todayRecords.value.flatMap(flattenRecord)
  writeExcel(data, [12, 8, 7, 12, 15, 5, 7, 8], '今日點餐', `今日點餐_${todayStr}.xlsx`)
}

function exportHistoryExcel() {
  const data = historyRecords.value.flatMap(flattenRecord)
  writeExcel(data, [12, 8, 7, 12, 15, 5, 7, 8], '點餐記錄', `點餐記錄_${today()}.xlsx`)
}


function writeExcel(data, colWidths, sheetName, fileName) {
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = colWidths.map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, fileName)
}

function today() { return localDate() }
</script>
