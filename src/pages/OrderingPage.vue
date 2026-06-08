<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />
    <!-- 設定列 -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-sm items-end">
          <div class="col-12 col-sm-4">
            <q-input v-model="orderDate" type="date" label="點餐日期" outlined dense
              @update:model-value="onDateChange" />
          </div>
          <div class="col-12 col-sm-5">
            <q-select v-model="selectedRestaurantId" :options="restaurantOptions"
              label="選擇餐廳" outlined dense emit-value map-options
              @update:model-value="onRestaurantChange" />
          </div>
          <div class="col-12 col-sm-3">
            <q-btn color="primary" label="載入學生" icon="group" class="full-width"
              :disable="!selectedRestaurantId" @click="loadStudents" />
          </div>
        </div>
        <div v-if="orderDate" class="text-caption text-grey-6 q-mt-xs">
          {{ weekdayText }} ・ 預計出現 {{ scheduledCount }} 位學生
        </div>
      </q-card-section>
    </q-card>

    <!-- 學生點餐列表 -->
    <template v-if="studentOrders.length">
      <div class="text-subtitle2 text-grey-8 q-mb-sm">學生點餐（{{ studentOrders.length }} 位）</div>

      <q-card v-for="(order, idx) in studentOrders" :key="order.studentId" class="q-mb-sm" flat bordered>
        <q-card-section class="q-py-sm">
          <!-- 學生 header -->
          <div class="row items-center q-mb-sm">
            <div class="col">
              <span class="text-weight-bold">{{ order.studentName }}</span>
              <span class="text-caption text-grey-6 q-ml-sm">{{ order.grade }}年級</span>
              <q-badge v-if="!order.scheduled" color="grey" class="q-ml-xs">加入</q-badge>
            </div>
            <q-btn flat round dense icon="close" color="negative" size="sm" @click="removeStudent(idx)" />
          </div>

          <!-- 已選餐點（含數量控制） -->
          <div v-if="order.items.length" class="q-mb-sm">
            <div v-for="(item, itemIdx) in order.items" :key="item.itemId"
              class="row items-center q-mb-xs no-wrap">
              <q-icon name="fiber_manual_record" size="8px" color="primary" class="q-mr-sm q-mt-xs" style="flex-shrink:0" />
              <span class="col text-body2 ellipsis">{{ item.menuItemName }}</span>

              <!-- 數量控制 -->
              <div class="row items-center no-wrap q-mx-xs" style="gap:2px">
                <q-btn
                  flat round dense icon="remove" size="xs" color="grey-6"
                  :disable="item.qty <= 1"
                  @click="item.qty = Math.max(1, item.qty - 1)"
                />
                <q-input
                  v-model.number="item.qty"
                  type="number"
                  min="1"
                  dense borderless
                  style="width: 36px"
                  input-class="text-center q-pa-none"
                  @update:model-value="v => { const n = parseInt(v); item.qty = n >= 1 ? n : 1 }"
                />
                <q-btn
                  flat round dense icon="add" size="xs" color="primary"
                  @click="item.qty++"
                />
              </div>

              <span class="text-primary text-weight-bold q-mr-xs" style="min-width:44px;text-align:right">
                ${{ item.price * item.qty }}
              </span>
              <q-btn flat round dense icon="close" size="xs" color="grey-6"
                @click="removeItem(order, itemIdx)" />
            </div>
          </div>

          <!-- 加餐點 -->
          <q-select
            v-model="addingSelection[order.studentId]"
            :options="menuOptions"
            :label="order.items.length ? '＋ 再加一個餐點' : '選擇餐點'"
            outlined dense emit-value map-options clearable
            @update:model-value="(val) => addItemToOrder(order, val)"
          />

          <!-- 小計 -->
          <div v-if="order.items.length" class="row justify-end q-mt-xs">
            <span class="text-caption text-grey-6 q-mr-xs">小計</span>
            <span class="text-subtitle2 text-primary text-weight-bold">${{ getSubtotal(order) }}</span>
          </div>
        </q-card-section>
      </q-card>

    </template>

    <!-- 空狀態 -->
    <div v-else class="text-center text-grey q-pa-xl">
      <q-icon name="restaurant_menu" size="64px" class="q-mb-md" /><br>
      <div class="text-h6">
        {{ hasLoaded ? '今日無學生點餐' : '請選擇日期與餐廳後點擊「載入學生」' }}
      </div>
    </div>

    <!-- 加入其他學生（載入後顯示，不論人數） -->
    <q-select
      v-if="hasLoaded"
      v-model="extraStudentId"
      :options="extraStudentOptions"
      label="＋ 加入其他學生"
      outlined dense emit-value map-options clearable
      class="q-mb-lg"
      @update:model-value="addExtraStudent"
    />

    <!-- 點餐總覽 -->
    <q-card v-if="studentOrders.length" class="bg-grey-1" flat bordered>
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-md">
          <q-icon name="receipt_long" class="q-mr-xs" />點餐總覽
        </div>
        <div v-for="order in orderedStudents" :key="order.studentId" class="q-mb-sm">
          <div class="row items-center justify-between">
            <span class="text-weight-bold">{{ order.studentName }}</span>
            <span class="text-primary text-weight-bold">${{ getSubtotal(order) }}</span>
          </div>
          <div v-for="item in order.items" :key="item.itemId"
            class="row items-center q-pl-sm text-body2 text-grey-7">
            <q-icon name="fiber_manual_record" size="6px" color="grey-5" class="q-mr-xs" />
            <span class="col">
              {{ item.menuItemName }}
              <span v-if="item.qty > 1" class="text-primary"> ×{{ item.qty }}</span>
            </span>
            <span>${{ item.price * item.qty }}</span>
          </div>
        </div>
        <q-separator class="q-my-sm" />
        <div class="row justify-between">
          <span class="text-subtitle1 text-weight-bold">總計</span>
          <span class="text-h5 text-primary text-weight-bold">${{ grandTotal }}</span>
        </div>
      </q-card-section>
      <q-card-actions align="right" class="q-pa-md">
        <q-btn color="primary" icon="check_circle" label="確認點餐" size="md"
          :disable="grandTotal === 0" @click="confirmOrder">
          <q-tooltip v-if="grandTotal === 0">請先為學生選擇餐點</q-tooltip>
        </q-btn>
      </q-card-actions>
    </q-card>

    <!-- ══════ 當日已確認訂單（以 batch 為單位） ══════ -->
    <template v-if="confirmedBatches.length">
      <q-separator class="q-my-lg" />
      <div class="row items-center q-mb-sm">
        <div>
          <div class="text-subtitle1 text-weight-bold">{{ orderDate }} 已確認訂單</div>
          <div class="text-caption text-grey-6">
            {{ confirmedBatches.length }} 筆・{{ confirmedStudentCount }} 位學生・共 ${{ confirmedTotal }}
          </div>
        </div>
      </div>

      <q-card v-for="batch in confirmedBatches" :key="batch.batchId" class="q-mb-sm" flat bordered>
        <q-card-section class="q-py-sm">
          <div class="row items-center q-mb-sm">
            <q-icon name="restaurant" color="primary" class="q-mr-sm" />
            <div class="col">
              <span class="text-subtitle2 text-weight-bold">{{ batch.restaurantName }}</span>
              <span class="text-body2 text-grey-6 q-ml-sm">下單 {{ batch.datetime?.slice(11) }}</span>
            </div>
            <span class="text-primary text-weight-bold text-subtitle2">${{ batch.batchTotal }}</span>
          </div>

          <div v-for="order in batch.studentOrders" :key="order.id" class="q-pl-sm q-mb-xs">
            <div class="row items-start text-body2">
              <span class="text-weight-medium q-mr-md" style="min-width:64px">{{ order.studentName }}</span>
              <div class="col">
                <div v-for="item in order.items" :key="item.itemId" class="row text-grey-7">
                  <span class="col">{{ item.menuItemName }}<span v-if="item.qty > 1" class="text-primary"> ×{{ item.qty }}</span></span>
                  <span>${{ item.price * item.qty }}</span>
                </div>
              </div>
              <span class="text-primary text-weight-bold q-ml-sm">${{ order.total }}</span>
            </div>
          </div>

          <!-- 品項彙總（方便叫餐） -->
          <q-separator class="q-my-sm" />
          <div class="bg-blue-1 rounded-borders q-pa-sm">
            <div class="text-caption text-weight-bold text-blue-9 q-mb-xs">
              <q-icon name="receipt" size="14px" class="q-mr-xs" />品項彙總
            </div>
            <div v-for="s in batch.itemSummary" :key="s.name + '_' + s.qty"
              class="row items-center text-body2 q-pl-xs">
              <span class="col">
                {{ s.name }}
                <span v-if="s.qty > 1" class="text-grey-7">×{{ s.qty }}</span>
              </span>
              <span class="text-primary text-weight-bold q-mr-md">×{{ s.count }}份</span>
              <span class="text-grey-7" style="min-width:48px;text-align:right">${{ s.amount }}</span>
            </div>
            <div class="row justify-end text-caption text-grey-7 q-mt-xs">
              合計 {{ batch.portions }} 份・${{ batch.batchTotal }}
            </div>
          </div>
        </q-card-section>
      </q-card>
    </template>

  </q-page>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useQuasar } from 'quasar'

import { studentService } from '../services/studentService'
import { restaurantService } from '../services/restaurantService'
import { orderService } from '../services/orderService'
import { mealService } from '../services/mealService'

const $q = useQuasar()
const loading = ref(true)

const today = new Date().toISOString().slice(0, 10)
const orderDate = ref(today)
const selectedRestaurantId = ref(null)
const studentOrders = ref([])
const allStudents = ref([])
const restaurants = ref([])
const menuItems = ref([])
const extraStudentId = ref(null)
const hasLoaded = ref(false)
const addingSelection = reactive({})
const confirmedOrders = ref([])

const weekdayNames = { 0: '週日', 1: '週一', 2: '週二', 3: '週三', 4: '週四', 5: '週五', 6: '週六' }

const currentWeekday = computed(() =>
  orderDate.value ? new Date(orderDate.value + 'T00:00:00').getDay() : null
)
const weekdayText = computed(() => weekdayNames[currentWeekday.value] ?? '')
const scheduledCount = computed(() =>
  allStudents.value.filter(s => s.scheduleDays.includes(currentWeekday.value)).length
)
const restaurantOptions = computed(() =>
  restaurants.value.filter(r => r.active).map(r => ({ label: r.name, value: r.id }))
)
const menuOptions = computed(() =>
  menuItems.value.filter(m => m.available).map(m => ({ label: `${m.name}  $${m.price}`, value: m.id }))
)
const orderedStudents = computed(() => studentOrders.value.filter(o => o.items.length > 0))
const grandTotal = computed(() => orderedStudents.value.reduce((s, o) => s + getSubtotal(o), 0))
const extraStudentOptions = computed(() => {
  const inList = new Set(studentOrders.value.map(o => o.studentId))
  return allStudents.value
    .filter(s => !inList.has(s.id))
    .map(s => ({ label: `${s.name}（${s.grade}年級）`, value: s.id }))
})

// ── 已確認訂單：依 batchId 分組 ──
const confirmedBatches = computed(() => {
  const map = new Map()
  for (const order of confirmedOrders.value) {
    const key = order.batchId || order.id
    if (!map.has(key)) {
      map.set(key, {
        batchId: key,
        datetime: order.datetime || order.date,
        restaurantId: order.restaurantId,
        restaurantName: order.restaurantName,
        studentOrders: [],
        batchTotal: 0
      })
    }
    const batch = map.get(key)
    batch.studentOrders.push(order)
    batch.batchTotal += order.total
  }
  // 每筆 batch 的品項彙總：依「品項＋每份數量」分組，算份數，方便叫餐
  // 例：兩位都點水餃×10 → 豬肉水餃 ×10 ×2份；三位都點便當 → 排骨便當 ×3份
  const batches = [...map.values()]
  for (const b of batches) {
    const im = new Map()
    for (const order of b.studentOrders) {
      for (const item of order.items) {
        const qty = item.qty || 1
        const k = `${item.menuItemId || item.menuItemName}__${qty}`
        if (!im.has(k)) im.set(k, { name: item.menuItemName, qty, count: 0, amount: 0 })
        const e = im.get(k)
        e.count += 1
        e.amount += item.price * qty
      }
    }
    b.itemSummary = [...im.values()].sort((a, c) => c.count - a.count || a.name.localeCompare(c.name, 'zh-TW'))
    b.portions = b.itemSummary.reduce((s, i) => s + i.count, 0)
  }
  return batches.sort((a, b) => (a.datetime || '').localeCompare(b.datetime || ''))
})

const confirmedTotal = computed(() => confirmedBatches.value.reduce((s, b) => s + b.batchTotal, 0))
const confirmedStudentCount = computed(() => new Set(confirmedOrders.value.map(o => o.studentId)).size)

function getSubtotal(order) {
  return order.items.reduce((s, i) => s + i.price * (i.qty || 1), 0)
}

function currentDatetime() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${now.toISOString().slice(0, 10)} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function batchUid() {
  return 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}

function makeOrder(s, scheduled = true) {
  addingSelection[s.id] = null
  return { studentId: s.id, studentName: s.name, grade: s.grade, parentId: s.parentId, items: [], scheduled }
}

function addItemToOrder(order, menuItemId) {
  if (!menuItemId) return
  const item = menuItems.value.find(m => m.id === menuItemId)
  if (!item) return
  order.items.push({
    itemId: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    menuItemId: item.id,
    menuItemName: item.name,
    price: item.price,
    qty: item.defaultQty || 1
  })
  addingSelection[order.studentId] = null
}

function removeItem(order, idx) { order.items.splice(idx, 1) }

async function loadConfirmedOrders() {
  // 讀 saveOrder 寫入的同一份訂單（demo: todayOrders；supabase: orders），依日期過濾
  confirmedOrders.value = await orderService.getConfirmedByDate(orderDate.value)
}

onMounted(async () => {
  try {
    allStudents.value = await studentService.getAll()
    restaurants.value = await restaurantService.getAll()
    await loadConfirmedOrders()
  } finally {
    loading.value = false
  }
})

async function onRestaurantChange(id) {
  menuItems.value = id ? await restaurantService.getMenuItems(id) : []
  studentOrders.value.forEach(o => { o.items = [] })
}

async function onDateChange() {
  studentOrders.value = []
  hasLoaded.value = false
  await loadConfirmedOrders()
}

async function loadStudents() {
  if (!selectedRestaurantId.value) return
  menuItems.value = await restaurantService.getMenuItems(selectedRestaurantId.value)
  const wd = currentWeekday.value
  const scheduled = allStudents.value.filter(s => s.scheduleDays.includes(wd))
  studentOrders.value = scheduled.map(s => makeOrder(s, true))
  hasLoaded.value = true
  $q.notify({ message: `已載入 ${scheduled.length} 位學生（${weekdayText.value}）`, color: 'info', icon: 'group' })
}

function addExtraStudent(studentId) {
  if (!studentId) return
  const s = allStudents.value.find(x => x.id === studentId)
  if (s) studentOrders.value.push(makeOrder(s, false))
  extraStudentId.value = null
}

function removeStudent(idx) { studentOrders.value.splice(idx, 1) }

async function confirmOrder() {
  const toOrder = orderedStudents.value
  if (!toOrder.length) return

  const restaurant = restaurants.value.find(r => r.id === selectedRestaurantId.value)
  const batchId = batchUid()
  const datetime = currentDatetime()

  for (const o of toOrder) {
    const total = getSubtotal(o)
    await orderService.saveOrder({
      batchId, date: orderDate.value, datetime,
      restaurantId: selectedRestaurantId.value,
      restaurantName: restaurant.name,
      studentId: o.studentId,
      studentName: o.studentName,
      grade: o.grade,
      parentId: o.parentId,
      items: o.items
    })
    const itemsText = o.items.map(i => i.qty > 1 ? `${i.menuItemName}×${i.qty}` : i.menuItemName).join('、')
    await mealService.deduct(o.parentId, o.studentId, total, `${restaurant.name} - ${itemsText}`, orderDate.value)
  }

  $q.notify({
    message: `點餐完成！${toOrder.length} 位・$${grandTotal.value}`,
    color: 'positive', icon: 'check_circle', timeout: 3000
  })

  studentOrders.value.forEach(o => { o.items = [] })
  await loadConfirmedOrders()
}
</script>
