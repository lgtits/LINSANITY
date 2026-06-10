<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />

    <!-- 類型切換 -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <q-btn-toggle
        v-model="broadcastType"
        :options="[
          { label: '一般訊息', value: 'general', icon: 'campaign' },
          { label: '餐費通知', value: 'expense', icon: 'receipt_long' }
        ]"
        color="grey-6"
        toggle-color="primary"
        no-caps
        unelevated
        rounded
      />
    </div>

    <div class="row q-col-gutter-md">
      <!-- 收件人選擇（以家長為單位）-->
      <div class="col-12 col-md-5">
        <q-card flat bordered style="height: 100%">
          <q-card-section class="q-pb-xs">
            <div class="row items-center q-mb-xs">
              <div class="text-subtitle2">收件家長</div>
              <q-space />
              <q-btn flat dense label="全選" @click="selectAll" />
              <q-btn flat dense label="清除" color="grey-7" @click="clearAll" />
            </div>
            <div class="row q-col-gutter-xs">
              <div class="col-7">
                <q-input v-model="parentSearch" placeholder="搜尋家長或學生..." outlined dense clearable>
                  <template #prepend><q-icon name="search" /></template>
                </q-input>
              </div>
              <div class="col-5">
                <q-select
                  v-model="gradeFilter"
                  :options="gradeFilterOptions"
                  label="年級篩選"
                  outlined dense clearable
                  emit-value map-options
                />
              </div>
            </div>
          </q-card-section>

          <q-scroll-area style="height: 380px">
            <q-list separator>
              <q-item
                v-for="p in filteredParents"
                :key="p.id"
                clickable
                @click="toggleParent(p.id)"
              >
                <q-item-section avatar>
                  <q-checkbox
                    :model-value="selectedIds.includes(p.id)"
                    color="primary"
                    @update:model-value="toggleParent(p.id)"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>
                    {{ p.name }}
                    <q-badge v-if="!p.lineUserId" color="negative" class="q-ml-xs">未填 LINE ID</q-badge>
                  </q-item-label>
                  <q-item-label style="font-size: 12px" class="text-grey-6">
                    {{ p.children.map(c => c.name).join('、') || '無在籍學生' }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge v-if="broadcastType === 'expense'" :color="balanceColor(balances[p.id])" outline>
                    ${{ balances[p.id] ?? 0 }}
                  </q-badge>
                </q-item-section>
              </q-item>
              <q-item v-if="!filteredParents.length">
                <q-item-section class="text-grey text-center q-pa-md">無符合家長</q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>

          <q-separator />
          <q-card-section class="q-py-sm">
            <span class="text-body2 text-grey-7">已選 {{ selectedIds.length }} 位家長</span>
            <span v-if="selectedNoLineCount > 0" class="text-body2 text-negative q-ml-sm">
              （{{ selectedNoLineCount }} 位未填 LINE，無法送出）
            </span>
          </q-card-section>
        </q-card>
      </div>

      <!-- 訊息撰寫 / 預覽 -->
      <div class="col-12 col-md-7">

        <!-- 一般訊息 -->
        <q-card v-if="broadcastType === 'general'" flat bordered>
          <q-card-section>
            <div class="text-subtitle2 q-mb-sm">訊息內容</div>
            <q-select
              v-model="selectedTemplateId"
              :options="templateOptions"
              label="套用模板（選填）"
              outlined dense clearable
              emit-value map-options
              class="q-mb-sm"
              @update:model-value="applyTemplate"
            />
            <q-input
              v-model="customMessage"
              type="textarea"
              rows="8"
              outlined
              label="訊息內容 *"
              placeholder="輸入要發送給家長的訊息..."
              counter
              maxlength="500"
            />
          </q-card-section>
          <q-card-actions class="q-px-md q-pb-md row items-center">
            <div class="text-body2 text-grey-6">
              所有收件家長將收到相同訊息
              <span v-if="selectedNoLineCount" class="text-negative">（{{ selectedNoLineCount }} 位未填 LINE ID 不會送出）</span>
            </div>
            <q-space />
            <q-btn
              color="primary"
              icon="send"
              label="發送訊息"
              :disable="!selectedIds.length || !customMessage.trim()"
              :loading="sending"
              @click="sendGeneral"
            />
          </q-card-actions>
        </q-card>

        <!-- 餐費通知 -->
        <q-card v-else flat bordered>
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="text-subtitle2">餐費通知預覽</div>
              <q-space />
              <span class="text-body2 text-grey-6">{{ expenseDate }}</span>
            </div>

            <div v-if="!selectedIds.length" class="text-center text-grey q-pa-xl">
              <q-icon name="people_outline" size="48px" class="q-mb-sm" /><br />
              請先從左側選擇收件家長
            </div>

            <q-list v-else separator>
              <q-item v-for="p in selectedParents" :key="p.id" class="q-py-sm">
                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ p.name }}
                    <q-badge v-if="!p.lineUserId" color="negative" class="q-ml-xs">
                      <q-icon name="warning" size="12px" class="q-mr-xs" />未填 LINE ID，無法送出
                    </q-badge>
                  </q-item-label>
                  <q-item-label caption style="white-space: pre-line; line-height: 1.6">
                    {{ buildExpenseMsg(p) }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
          <q-card-actions class="q-px-md q-pb-md row items-center">
            <div class="text-body2 text-grey-6">
              每位家長收到名下孩子合併的費用明細
            </div>
            <q-space />
            <q-btn
              color="teal"
              icon="send"
              label="發送通知"
              :disable="!selectedIds.length"
              :loading="sending"
              @click="sendExpense"
            />
          </q-card-actions>
        </q-card>

      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { studentService } from '../services/studentService'
import { parentService } from '../services/parentService'
import { mealService } from '../services/mealService'
import { orderService } from '../services/orderService'
import { broadcastService } from '../services/broadcastService'
import { localDate } from '../lib/datetime'
import { buildExpenseMessage } from '../lib/messageBuilder'

const $q = useQuasar()

const loading = ref(true)
const sending = ref(false)
const parents = ref([])
const students = ref([])
const balances = ref({})
const todayOrders = ref([])
const templates = ref([])

const broadcastType = ref('general')
const parentSearch = ref('')
const gradeFilter = ref(null)
const selectedIds = ref([])           // 選定的 parentId
const selectedTemplateId = ref(null)
const customMessage = ref('')
const expenseDate = localDate()

onMounted(async () => {
  try {
    [parents.value, students.value, balances.value, todayOrders.value, templates.value] = await Promise.all([
      parentService.getAll(),
      studentService.getAll(),
      mealService.getAllBalances(),
      orderService.getToday(),
      broadcastService.getTemplates()
    ])
  } finally {
    loading.value = false
  }
})

const gradeFilterOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({ label: `${n}年級`, value: n }))

// 每位家長名下在籍學生
const childrenByParent = computed(() => {
  const map = {}
  for (const s of students.value) {
    if (!map[s.parentId]) map[s.parentId] = []
    map[s.parentId].push(s)
  }
  return map
})

// 家長 + 名下學生
const parentRows = computed(() =>
  parents.value.map(p => ({ ...p, children: childrenByParent.value[p.id] || [] }))
)

const filteredParents = computed(() => {
  let list = parentRows.value
  if (gradeFilter.value !== null) list = list.filter(p => p.children.some(c => c.grade === gradeFilter.value))
  const q = parentSearch.value.trim().toLowerCase()
  if (q) list = list.filter(p =>
    p.name.toLowerCase().includes(q) || p.children.some(c => c.name.toLowerCase().includes(q))
  )
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'))
})

const selectedParents = computed(() => parentRows.value.filter(p => selectedIds.value.includes(p.id)))

// 已選但沒填 LINE ID 的數量（這些無法實際送出，只供預覽）
const selectedNoLineCount = computed(() => selectedParents.value.filter(p => !p.lineUserId).length)

const templateOptions = computed(() => templates.value.map(t => ({ label: t.name, value: t.id })))

function balanceColor(b) {
  const v = b ?? 0
  if (v >= 300) return 'positive'
  if (v >= 100) return 'warning'
  return 'negative'
}

function notifyResult(res) {
  if (res.simulated) {
    $q.notify({
      message: `模擬發送完成：${res.successCount} 位（尚未接 LINE token，未真正送出）`,
      color: 'grey-8', icon: 'science', timeout: 4000
    })
  } else {
    $q.notify({
      message: `發送完成：成功 ${res.successCount}、失敗 ${res.failCount}`,
      color: res.failCount ? 'warning' : 'positive', icon: res.failCount ? 'warning' : 'check'
    })
  }
}

function toggleParent(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) selectedIds.value.push(id)
  else selectedIds.value.splice(idx, 1)
}

function selectAll() {
  // 全選目前篩選出的家長（含未填 LINE，可預覽；送出時系統會標未填者失敗）
  selectedIds.value = filteredParents.value.map(p => p.id)
}

function clearAll() {
  selectedIds.value = []
}

function applyTemplate(id) {
  if (!id) return
  const tpl = templates.value.find(t => t.id === id)
  if (tpl) customMessage.value = tpl.content
}

// 某學生今日的訂單
function ordersOf(studentId) {
  return todayOrders.value.filter(o => o.studentId === studentId)
}

// 家長層級的餐費通知：合併名下孩子當日「餐點明細 + 金額」+ 家庭餘額
function buildExpenseMsg(parent) {
  const kids = (childrenByParent.value[parent.id] || [])
    .map(kid => {
      const kidOrders = ordersOf(kid.id)
      if (!kidOrders.length) return null
      return { name: kid.name, total: kidOrders.reduce((s, o) => s + o.total, 0), orders: kidOrders }
    })
    .filter(Boolean)
  return buildExpenseMessage({ parentName: parent.name, date: expenseDate, kids, balance: balances.value[parent.id] ?? 0 })
}

async function sendGeneral() {
  if (!selectedIds.value.length || !customMessage.value.trim()) return
  sending.value = true
  try {
    const records = selectedParents.value.map(p => ({
      parentId: p.id,
      parentName: p.name,
      lineUserId: p.lineUserId,
      message: customMessage.value.trim()
    }))
    const res = await broadcastService.send({ type: 'general', records })
    notifyResult(res)
    selectedIds.value = []
    customMessage.value = ''
    selectedTemplateId.value = null
  } finally {
    sending.value = false
  }
}

async function sendExpense() {
  if (!selectedIds.value.length) return
  sending.value = true
  try {
    const records = selectedParents.value.map(p => ({
      parentId: p.id,
      parentName: p.name,
      lineUserId: p.lineUserId,
      message: buildExpenseMsg(p)
    }))
    const res = await broadcastService.send({ type: 'expense', records })
    notifyResult(res)
    selectedIds.value = []
  } finally {
    sending.value = false
  }
}
</script>
