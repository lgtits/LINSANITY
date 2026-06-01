<template>
  <q-page padding>

    <!-- ══════════════════════════════════
         上方：學生餘額列表
    ══════════════════════════════════ -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-5">
        <q-input v-model="search" placeholder="搜尋姓名..." outlined dense clearable>
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-12 col-sm-4">
        <q-select v-model="selectedGrade" :options="gradeFilterOptions" label="年級篩選"
          outlined dense emit-value map-options clearable />
      </div>
      <div class="col-12 col-sm-3 row justify-end items-center q-gutter-xs">
        <span class="text-caption text-grey-7">共 {{ filteredBalance.length }} 位</span>
        <q-btn flat dense icon="file_download" color="positive" size="sm" label="餘額表"
          @click="exportBalanceSummary" />
        <q-btn flat dense icon="file_download" color="primary" size="sm" label="全記錄"
          @click="exportAllTransactions" />
      </div>
    </div>

    <!-- 手機：卡片 -->
    <template v-if="$q.screen.lt.md">
      <q-card v-for="item in filteredBalance" :key="item.student.id" class="q-mb-sm" flat bordered>
        <q-card-section class="q-pb-xs">
          <div class="text-subtitle1 text-weight-bold">{{ item.student.name }}</div>
          <div class="text-caption text-grey-7">
            {{ item.student.grade }}年級・{{ item.student.parentName }}・{{ item.student.phone }}
          </div>
        </q-card-section>
        <q-separator />
        <q-card-actions class="q-px-md q-py-xs">
          <q-badge :color="balanceColor(item.balance)" class="text-body2 q-pa-xs" style="font-size:14px">
            餐費 ${{ item.balance }}
          </q-badge>
          <q-space />
          <q-btn flat dense icon="savings" label="儲值" color="primary" size="sm"
            @click="openTopup(item.student)" />
          <q-btn flat dense icon="history" label="記錄" color="grey-7" size="sm"
            @click="openDetail(item.student)" />
        </q-card-actions>
      </q-card>
      <div v-if="!filteredBalance.length" class="text-center text-grey q-pa-xl">
        <q-icon name="people_outline" size="56px" class="q-mb-sm" /><br>沒有符合的學生
      </div>
    </template>

    <!-- 桌機：表格 -->
    <q-table
      v-else
      :rows="filteredBalance"
      :columns="balanceColumns"
      :row-key="(row) => row.student.id"
      flat bordered
      :rows-per-page-options="[10, 20, 0]"
      class="q-mb-xl cursor-pointer"
      @row-click="(_, row) => openDetail(row.student)"
    >
      <template #body-cell-grade="props">
        <q-td :props="props">{{ props.row.student.grade }}年級</q-td>
      </template>
      <template #body-cell-name="props">
        <q-td :props="props" class="text-weight-bold">{{ props.row.student.name }}</q-td>
      </template>
      <template #body-cell-parentName="props">
        <q-td :props="props">{{ props.row.student.parentName }}</q-td>
      </template>
      <template #body-cell-phone="props">
        <q-td :props="props">{{ props.row.student.phone }}</q-td>
      </template>
      <template #body-cell-balance="props">
        <q-td :props="props" class="text-right">
          <q-badge :color="balanceColor(props.row.balance)" style="font-size:13px" class="q-pa-xs">
            ${{ props.row.balance }}
          </q-badge>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props" class="text-center" @click.stop>
          <q-btn flat dense round icon="savings" color="primary" size="sm"
            @click="openTopup(props.row.student)" />
          <q-btn flat dense round icon="history" color="grey-7" size="sm" class="q-ml-xs"
            @click="openDetail(props.row.student)" />
        </q-td>
      </template>
    </q-table>

    <!-- ══════════════════════════════════
         下方：點餐記錄 Tabs
    ══════════════════════════════════ -->
    <div class="text-h6 text-weight-bold q-mb-sm q-mt-md">點餐記錄</div>

    <q-tabs v-model="recordTab" align="left" indicator-color="primary" active-color="primary" class="q-mb-md">
      <q-tab name="today" icon="today" label="今日" />
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
                <div class="text-caption text-grey-6">
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
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white" size="36px">
                  {{ record.studentName[0] }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">
                  {{ record.studentName }}
                  <span class="text-caption text-grey-6 q-ml-xs">{{ record.grade }}年級</span>
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

            <!-- 展開：依餐廳分組 -->
            <div class="bg-grey-1">
              <div v-for="order in record.orders" :key="order.id" class="q-pa-sm q-mb-xs">
                <div class="row items-center q-mb-xs">
                  <q-icon name="restaurant" color="primary" size="sm" class="q-mr-xs" />
                  <span class="text-weight-bold text-body2">{{ order.restaurantName }}</span>
                  <span class="text-caption text-grey-6 q-ml-xs">${{ order.total }}</span>
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
          <span class="text-caption text-grey-6">{{ historyRecords.length }} 筆</span>
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
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white" size="36px">
                  {{ record.studentName[0] }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">
                  {{ record.studentName }}
                  <span class="text-caption text-grey-6 q-ml-xs">{{ record.grade }}年級</span>
                </q-item-label>
                <q-item-label caption>
                  {{ record.date }} ・ {{ record.orders.map(o => o.restaurantName).join('、') }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="row items-center q-gutter-xs">
                  <span class="text-subtitle2 text-primary text-weight-bold">${{ record.totalAmount }}</span>
                  <q-btn flat round dense icon="content_copy" color="grey-6" size="sm"
                    @click.stop="copyOneStudentNotification(record)">
                    <q-tooltip>複製通知</q-tooltip>
                  </q-btn>
                  <q-btn flat round dense icon="file_download" color="positive" size="sm"
                    @click.stop="exportRecordExcel(record)">
                    <q-tooltip>匯出 Excel</q-tooltip>
                  </q-btn>
                </div>
              </q-item-section>
            </template>

            <div class="bg-grey-1">
              <div v-for="order in record.orders" :key="order.id" class="q-pa-sm q-mb-xs">
                <div class="row items-center q-mb-xs">
                  <q-icon name="restaurant" color="primary" size="sm" class="q-mr-xs" />
                  <span class="text-weight-bold text-body2">{{ order.restaurantName }}</span>
                  <span class="text-caption text-grey-6 q-ml-xs">${{ order.total }}</span>
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
          {{ orders.length ? '無符合篩選的記錄' : '尚無點餐記錄' }}
        </div>
      </q-tab-panel>
    </q-tab-panels>

    <!-- ══════════ 消費記錄 Dialog ══════════ -->
    <q-dialog v-model="showDetail" :maximized="$q.screen.lt.sm">
      <q-card style="width: min(95vw, 500px); max-height: 88vh" class="column">
        <q-card-section class="row items-center q-pb-none">
          <div>
            <div class="text-h6">{{ detailStudent?.name }}</div>
            <div class="text-caption text-grey-7">
              {{ detailStudent?.grade }}年級・{{ detailStudent?.phone }}
            </div>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="text-center q-py-sm">
          <div class="text-caption text-grey-6">目前餘額</div>
          <div class="text-h3 text-weight-bold"
            :class="'text-' + balanceColor(balances[detailStudent?.id])">
            ${{ balances[detailStudent?.id] ?? 0 }}
          </div>
        </q-card-section>

        <q-separator />
        <div class="q-px-md q-pt-md text-subtitle2 text-grey-8">消費記錄</div>
        <q-scroll-area class="col" style="min-height: 160px">
          <q-list separator>
            <q-item v-for="tx in detailTransactions" :key="tx.id" dense>
              <q-item-section avatar>
                <q-icon :name="tx.type === 'topup' ? 'add_circle' : 'remove_circle'"
                  :color="tx.type === 'topup' ? 'positive' : 'negative'" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ tx.note }}</q-item-label>
                <q-item-label caption>{{ tx.datetime || tx.date }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <span class="text-weight-bold"
                  :class="tx.type === 'topup' ? 'text-positive' : 'text-negative'">
                  {{ tx.type === 'topup' ? '+' : '' }}{{ tx.amount }}
                </span>
              </q-item-section>
            </q-item>
            <q-item v-if="!detailTransactions.length">
              <q-item-section class="text-grey text-center q-pa-md">尚無消費記錄</q-item-section>
            </q-item>
          </q-list>
        </q-scroll-area>
      </q-card>
    </q-dialog>

    <!-- ══════════ 儲值 Dialog ══════════ -->
    <q-dialog v-model="showTopupDialog" persistent>
      <q-card style="width: min(95vw, 360px)">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">儲值 - {{ topupTarget?.name }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-form @submit.prevent="doTopup" class="q-gutter-sm">
            <q-input v-model.number="topupAmount" label="儲值金額 *" outlined dense
              type="number" prefix="$" :rules="[v => v > 0 || '請輸入正確金額']" />
            <q-input v-model="topupNote" label="備註（如：七月儲值）" outlined dense />
            <div class="row justify-end q-mt-md q-gutter-sm">
              <q-btn flat label="取消" v-close-popup />
              <q-btn type="submit" color="primary" label="確認儲值" icon="savings" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import * as XLSX from 'xlsx'
import { studentService } from '../services/studentService'
import { mealService } from '../services/mealService'
import { orderService } from '../services/orderService'

const $q = useQuasar()

const gradeFilterOptions = [
  { label: '全部年級', value: null },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({ label: `${n}年級`, value: n }))
]

const weekdayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
const todayStr = new Date().toISOString().slice(0, 10)
const todayWeekday = weekdayNames[new Date().getDay()]

function getWeekdayText(dateStr) {
  return weekdayNames[new Date(dateStr + 'T00:00:00').getDay()]
}

function balanceColor(b) {
  const v = b ?? 0
  if (v >= 300) return 'positive'
  if (v >= 100) return 'warning'
  return 'negative'
}

// ── 學生餘額 ──
const students = ref([])
const balances = ref({})
const allTransactions = ref([])
const search = ref('')
const selectedGrade = ref(null)

const studentBalances = computed(() =>
  students.value
    .map(s => ({ student: s, balance: balances.value[s.id] ?? 0 }))
    .sort((a, b) =>
      a.student.grade !== b.student.grade
        ? a.student.grade - b.student.grade
        : a.student.name.localeCompare(b.student.name, 'zh-TW')
    )
)

const filteredBalance = computed(() => {
  let list = studentBalances.value
  if (selectedGrade.value !== null) list = list.filter(i => i.student.grade === selectedGrade.value)
  const q = search.value?.trim().toLowerCase()
  if (q) list = list.filter(i => i.student.name.toLowerCase().includes(q))
  return list
})

const balanceColumns = [
  { name: 'grade',      label: '年級',    field: r => r.student.grade,      align: 'left',  sortable: true, sort: (a, b) => a - b },
  { name: 'name',       label: '姓名',    field: r => r.student.name,       align: 'left',  sortable: true },
  { name: 'parentName', label: '家長',    field: r => r.student.parentName, align: 'left' },
  { name: 'phone',      label: '電話',    field: r => r.student.phone,      align: 'left' },
  { name: 'balance',    label: '餐費餘額', field: 'balance',                 align: 'right', sortable: true },
  { name: 'actions',    label: '操作',    field: 'actions',                  align: 'center' }
]

const txByStudent = computed(() => {
  const map = {}
  for (const tx of allTransactions.value) {
    if (!map[tx.studentId]) map[tx.studentId] = []
    map[tx.studentId].push(tx)
  }
  for (const id of Object.keys(map)) map[id].sort((a, b) => b.date.localeCompare(a.date))
  return map
})

// ── 點餐記錄 ──
const orders = ref([])
const recordTab = ref('today')

// 將 orders 依 (date + student) 分組
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
  const recs = groupByStudent(orders.value.filter(o => o.date === todayStr))
  return recs.sort((a, b) =>
    a.grade !== b.grade ? a.grade - b.grade : a.studentName.localeCompare(b.studentName, 'zh-TW')
  )
})

const todayTotal = computed(() => todayRecords.value.reduce((s, r) => s + r.totalAmount, 0))

// 歷史篩選
const orderSearch = ref('')
const orderGrade = ref(null)
const orderDateFrom = ref('')
const orderDateTo = ref('')
const orderSort = ref('date_desc')

const sortOptions = [
  { label: '日期（新→舊）', value: 'date_desc' },
  { label: '日期（舊→新）', value: 'date_asc' },
  { label: '學生姓名',       value: 'name' },
  { label: '年級',           value: 'grade' },
  { label: '金額（高→低）',  value: 'total_desc' }
]

const historyRecords = computed(() => {
  let recs = groupByStudent(orders.value.filter(o => o.date !== todayStr))
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

onMounted(async () => {
  students.value = await studentService.getAll()
  balances.value = await mealService.getAllBalances()
  allTransactions.value = await mealService.getAllTransactions()
  orders.value = await orderService.getAll()
})

async function refreshAll() {
  balances.value = await mealService.getAllBalances()
  allTransactions.value = await mealService.getAllTransactions()
  orders.value = await orderService.getAll()
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
    await mealService.topup(order.studentId, order.total, `退款：${order.restaurantName} ${order.date}`)
    await refreshAll()
    $q.notify({ message: `已退款 $${order.total} 給 ${order.studentName}`, color: 'positive', icon: 'savings' })
  })
}

function confirmDeleteItem(order, item) {
  $q.dialog({
    title: '刪除餐點',
    message: `刪除「${item.menuItemName}」並退款 $${item.price}？`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'negative', label: '刪除並退款' },
    persistent: true
  }).onOk(async () => {
    const refund = item.price * (item.qty || 1)
    await orderService.deleteOrderItem(order.id, item.itemId)
    await mealService.topup(order.studentId, refund, `退款：${order.restaurantName} - ${item.menuItemName}${item.qty > 1 ? '×' + item.qty : ''}`)
    await refreshAll()
    $q.notify({ message: `已退款 $${refund}（${item.menuItemName}${item.qty > 1 ? '×' + item.qty : ''}）`, color: 'positive', icon: 'savings' })
  })
}

// ── 通知文字 ──
function buildStudentDayNotification(record) {
  const wt = getWeekdayText(record.date)
  const balance = balances.value[record.studentId] ?? 0
  const warning = balance < 100 ? '\n⚠️ 餘額不足，請盡快儲值' : ''
  const lines = [`📢 點餐通知 ${record.date}（${wt}）`]
  for (const order of record.orders) {
    const itemsText = order.items.map(i =>
      i.qty > 1 ? `${i.menuItemName}×${i.qty} $${i.price * i.qty}` : `${i.menuItemName} $${i.price}`
    ).join('、')
    lines.push(`🍱 ${order.restaurantName}：${itemsText}`)
  }
  lines.push(`共 $${record.totalAmount}｜餘額 $${balance}${warning}`)
  return lines.join('\n')
}

async function copyOneStudentNotification(record) {
  try {
    await navigator.clipboard.writeText(buildStudentDayNotification(record))
    $q.notify({ message: `${record.studentName} 通知已複製！`, color: 'positive', icon: 'content_copy' })
  } catch {
    $q.notify({ message: '複製失敗', color: 'warning' })
  }
}

async function copyAllNotification() {
  const divider = '─'.repeat(22)
  const lines = [`📢 今日點餐通知 ${todayStr}（${todayWeekday}）`, divider]
  for (const record of todayRecords.value) {
    const balance = balances.value[record.studentId] ?? 0
    const warning = balance < 100 ? ' ⚠️' : ''
    const allItems = record.orders.flatMap(o =>
      o.items.map(i => i.qty > 1 ? `${i.menuItemName}×${i.qty}` : i.menuItemName)
    ).join('、')
    lines.push(`${record.studentName}：${allItems} $${record.totalAmount}｜餘額 $${balance}${warning}`)
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

function exportRecordExcel(record) {
  const data = flattenRecord(record)
  writeExcel(data, [12, 8, 7, 12, 15, 5, 7, 8], '點餐記錄', `點餐_${record.studentName}_${record.date}.xlsx`)
}

function exportBalanceSummary() {
  const data = filteredBalance.value.map(item => ({
    '姓名': item.student.name,
    '年級': `${item.student.grade}年級`,
    '家長': item.student.parentName,
    '電話': item.student.phone,
    '目前餘額': item.balance
  }))
  writeExcel(data, [8, 7, 8, 13, 10], '餘額總表', `餘額總表_${today()}.xlsx`)
}

function exportAllTransactions() {
  const sorted = [...allTransactions.value].sort(
    (a, b) => a.date.localeCompare(b.date) || a.studentId.localeCompare(b.studentId)
  )
  const data = sorted.map(tx => {
    const s = students.value.find(x => x.id === tx.studentId)
    const isDeduct = tx.type === 'deduct'
    const parts = isDeduct ? tx.note.split(' - ') : []
    return {
      '日期': tx.date,
      '姓名': s?.name || '-',
      '年級': s ? `${s.grade}年級` : '-',
      '類型': isDeduct ? '消費' : '儲值',
      '餐廳': isDeduct ? (parts[0] || '-') : '-',
      '餐點': isDeduct ? (parts.slice(1).join(' - ') || '-') : '-',
      '說明': isDeduct ? '-' : tx.note,
      '金額': tx.amount
    }
  })
  writeExcel(data, [12, 8, 7, 6, 12, 15, 12, 8], '所有記錄', `所有消費記錄_${today()}.xlsx`)
}

function writeExcel(data, colWidths, sheetName, fileName) {
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = colWidths.map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, fileName)
}

function today() { return new Date().toISOString().slice(0, 10) }

// ── 消費記錄 Dialog ──
const showDetail = ref(false)
const detailStudent = ref(null)
const detailTransactions = ref([])

function openDetail(student) {
  detailStudent.value = student
  detailTransactions.value = txByStudent.value[student.id] || []
  showDetail.value = true
}

// ── 儲值 ──
const showTopupDialog = ref(false)
const topupTarget = ref(null)
const topupAmount = ref(200)
const topupNote = ref('')

function openTopup(student) {
  topupTarget.value = student
  topupAmount.value = 200
  topupNote.value = ''
  showTopupDialog.value = true
}

async function doTopup() {
  await mealService.topup(
    topupTarget.value.id,
    topupAmount.value,
    topupNote.value || `儲值 $${topupAmount.value}`
  )
  await refreshAll()
  showTopupDialog.value = false
  $q.notify({
    message: `儲值成功！${topupTarget.value.name} 餘額 $${balances.value[topupTarget.value.id]}`,
    color: 'positive', icon: 'savings'
  })
}
</script>
