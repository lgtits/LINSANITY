<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />

    <!-- 類型切換 -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <q-btn-toggle
        v-model="broadcastType"
        :options="[
          { label: '帳務通知', value: 'expense', icon: 'receipt_long' },
          { label: '一般訊息', value: 'general', icon: 'campaign' }
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
              <div class="col-12">
                <q-input v-model="parentSearch" placeholder="搜尋家長或學生..." outlined dense clearable>
                  <template #prepend><q-icon name="search" /></template>
                </q-input>
              </div>
              <div class="col-6">
                <q-select
                  v-model="gradeFilter"
                  :options="gradeFilterOptions"
                  label="年級篩選"
                  outlined dense clearable
                  emit-value map-options
                />
              </div>
              <div class="col-6">
                <div class="row items-center justify-between q-px-sm rounded-borders"
                  style="border: 1px solid rgba(0,0,0,0.24); height: 40px">
                  <span class="text-caption text-grey-8">當日有異動</span>
                  <q-toggle v-model="onlyTodayActivity" color="primary" dense />
                </div>
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
                    @click.stop
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
                  <q-item-label v-if="p.secondaryName || p.secondaryLineUserId" class="q-mt-xs" @click.stop>
                    <q-checkbox
                      :model-value="selectedSecIds.includes(p.id)"
                      color="teal"
                      dense
                      size="sm"
                      @update:model-value="toggleSecondary(p.id)"
                    >
                      <span class="text-teal-8" style="font-size: 12px">
                        <q-icon name="group_add" size="12px" class="q-mr-xs" />次要：{{ p.secondaryName || '(未命名)' }}
                      </span>
                    </q-checkbox>
                    <q-badge v-if="!p.secondaryLineUserId" color="negative" class="q-ml-xs" style="font-size: 11px">未填 LINE ID</q-badge>
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
            <span v-if="selectedSecIds.length > 0" class="text-body2 text-teal q-ml-sm">
              ＋{{ selectedSecIds.length }} 位次要
            </span>
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

            <!-- 預覽：實際送出的樣子 -->
            <div class="text-subtitle2 q-mt-md q-mb-sm">預覽</div>
            <div v-if="!selectedTargets.length" class="text-center text-grey q-pa-md">
              請先從左側選擇收件家長
            </div>
            <div v-else-if="!customMessage.trim()" class="text-center text-grey q-pa-md">
              輸入訊息內容後即可預覽
            </div>
            <div v-else>
              <div class="text-caption text-grey-7 q-mb-xs">
                以下 {{ selectedTargets.length }} 位對象都會收到相同內容：
              </div>
              <div class="q-mb-sm">
                <q-chip
                  v-for="t in selectedTargets" :key="t.key"
                  dense square size="sm"
                  :color="t.isSecondary ? 'teal-1' : 'blue-1'"
                  :text-color="t.isSecondary ? 'teal-9' : 'blue-9'"
                  :icon="t.lineUserId ? undefined : 'warning'"
                >
                  {{ t.name }}
                </q-chip>
              </div>
              <div class="bubble-preview">{{ customMessage }}</div>
            </div>
          </q-card-section>
          <q-card-actions class="q-px-md q-pb-md row items-center">
            <div class="text-body2 text-grey-6">
              所有收件對象將收到相同訊息
              <span v-if="selectedSecIds.length" class="text-teal">（含 {{ selectedSecIds.length }} 位次要家長）</span>
              <span v-if="selectedNoLineCount" class="text-negative">（{{ selectedNoLineCount }} 位未填 LINE ID 不會送出）</span>
            </div>
            <q-space />
            <q-btn
              color="primary"
              icon="send"
              label="發送訊息"
              :disable="!selectedTargets.length || !customMessage.trim()"
              :loading="sending"
              @click="sendGeneral"
            />
          </q-card-actions>
        </q-card>

        <!-- 帳務通知 -->
        <q-card v-else flat bordered>
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="text-subtitle2">帳務通知預覽</div>
              <q-space />
              <q-input
                v-model="expenseDate"
                type="date"
                outlined dense
                :max="today"
                style="max-width: 180px"
                @update:model-value="onDateChange"
              />
            </div>

            <div v-if="!selectedTargets.length" class="text-center text-grey q-pa-xl">
              <q-icon name="people_outline" size="48px" class="q-mb-sm" /><br />
              請先從左側選擇收件家長
            </div>

            <div v-else class="q-gutter-sm">
              <div v-for="t in selectedTargets" :key="t.key">
                <div class="text-weight-medium q-mb-xs">
                  <q-icon v-if="t.isSecondary" name="group_add" size="16px" class="q-mr-xs text-teal-8" />
                  <span :class="{ 'text-teal-8': t.isSecondary }">{{ t.name }}</span>
                  <q-badge v-if="!t.lineUserId" color="negative" class="q-ml-xs">
                    <q-icon name="warning" size="12px" class="q-mr-xs" />未填 LINE ID，無法送出
                  </q-badge>
                </div>
                <q-input
                  v-model="expenseMsgs[t.key]"
                  type="textarea"
                  outlined dense autogrow
                />
                <q-separator class="q-mt-sm" />
              </div>
            </div>
          </q-card-section>
          <q-card-actions class="q-px-md q-pb-md row items-center">
            <div class="text-body2 text-grey-6">
              每位家長收到名下孩子合併的費用明細，可逐筆編輯
            </div>
            <q-space />
            <q-btn
              flat no-caps
              color="grey-7"
              icon="refresh"
              label="重新產生"
              :disable="!selectedTargets.length"
              @click="refreshExpenseMsgs"
            />
            <q-btn
              color="teal"
              icon="send"
              label="發送通知"
              :disable="!selectedTargets.length"
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
import { ref, computed, watch, onMounted } from 'vue'
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
const dateOrders = ref([])
const allTransactions = ref([])
const templates = ref([])

const broadcastType = ref('expense')
const parentSearch = ref('')
const gradeFilter = ref(null)
const onlyTodayActivity = ref(true)
const selectedIds = ref([])           // 選定的主要家長 parentId
const selectedSecIds = ref([])        // 選定要一併發送次要家長的 parentId
const selectedTemplateId = ref(null)
const customMessage = ref('')
const today = localDate()
const expenseDate = ref(today)
const expenseMsgs = ref({})

async function fetchDateData(date) {
  ;[balances.value, dateOrders.value, allTransactions.value] = await Promise.all([
    mealService.getBalancesAsOfDate(date),
    orderService.getByDate(date),
    mealService.getAllTransactions()
  ])
}

async function onDateChange() {
  loading.value = true
  try {
    await fetchDateData(expenseDate.value)
    refreshExpenseMsgs()
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    ;[parents.value, students.value, templates.value] = await Promise.all([
      parentService.getAll(),
      studentService.getAll(),
      broadcastService.getTemplates()
    ])
    await fetchDateData(expenseDate.value)
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

// 選定日期有點餐消費或儲值的家長 id 集合
const parentsWithDateActivity = computed(() => {
  const ids = new Set()
  for (const o of dateOrders.value) {
    const pid = students.value.find(s => s.id === o.studentId)?.parentId
    if (pid) ids.add(pid)
  }
  for (const tx of allTransactions.value) {
    const txDate = (tx.datetime || tx.date || '').slice(0, 10)
    if (txDate === expenseDate.value) ids.add(tx.parentId)
  }
  return ids
})

const filteredParents = computed(() => {
  let list = parentRows.value
  if (onlyTodayActivity.value) list = list.filter(p => parentsWithDateActivity.value.has(p.id))
  if (gradeFilter.value !== null) list = list.filter(p => p.children.some(c => c.grade === gradeFilter.value))
  const q = parentSearch.value.trim().toLowerCase()
  if (q) list = list.filter(p =>
    p.name.toLowerCase().includes(q) || p.children.some(c => c.name.toLowerCase().includes(q))
  )
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'))
})

// 收件對象清單：每位家長的「主要」與被勾選的「次要」各自成為一個 target。
// key 唯一（主要用 parentId，次要用 sec:parentId），供預覽訊息獨立編輯。
const selectedTargets = computed(() => {
  const out = []
  for (const p of parentRows.value) {
    if (selectedIds.value.includes(p.id)) {
      out.push({ key: p.id, parentId: p.id, parent: p, name: p.name, lineUserId: p.lineUserId, isSecondary: false })
    }
    if (selectedSecIds.value.includes(p.id) && (p.secondaryName || p.secondaryLineUserId)) {
      out.push({
        key: `sec:${p.id}`, parentId: p.id, parent: p,
        name: `${p.secondaryName || p.name}（次要）`, lineUserId: p.secondaryLineUserId, isSecondary: true
      })
    }
  }
  return out
})

// 已選對象中沒填 LINE ID 的數量（無法實際送出，只供預覽）
const selectedNoLineCount = computed(() => selectedTargets.value.filter(t => !t.lineUserId).length)

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

function toggleSecondary(id) {
  const idx = selectedSecIds.value.indexOf(id)
  if (idx === -1) selectedSecIds.value.push(id)
  else selectedSecIds.value.splice(idx, 1)
}

function selectAll() {
  // 全選目前篩選出的家長（含未填 LINE，可預覽；送出時系統會標未填者失敗）
  selectedIds.value = filteredParents.value.map(p => p.id)
  // 一併勾選有設次要家長者的次要
  selectedSecIds.value = filteredParents.value.filter(p => p.secondaryName || p.secondaryLineUserId).map(p => p.id)
}

function clearAll() {
  selectedIds.value = []
  selectedSecIds.value = []
}

function applyTemplate(id) {
  if (!id) return
  const tpl = templates.value.find(t => t.id === id)
  if (tpl) customMessage.value = tpl.content
}

// 選定日期的訂單
function ordersOf(studentId) {
  return dateOrders.value.filter(o => o.studentId === studentId)
}

// 選定日期儲值，依 parentId 分組
const dateTopupsByParent = computed(() => {
  const map = {}
  for (const tx of allTransactions.value) {
    if (tx.type !== 'topup') continue
    const txDate = (tx.datetime || tx.date || '').slice(0, 10)
    if (txDate !== expenseDate.value) continue
    if (!map[tx.parentId]) map[tx.parentId] = []
    map[tx.parentId].push({ amount: tx.amount, note: tx.note || '' })
  }
  return map
})

// 家長層級的餐費通知：合併名下孩子當日「餐點明細 + 金額」+ 儲值 + 餘額
// displayName：訊息開頭的稱呼；次要家長帶入自己的名字，其餘帳單內容仍是同一家庭
function buildExpenseMsg(parent, displayName = parent.name) {
  const kids = (childrenByParent.value[parent.id] || [])
    .map(kid => {
      const kidOrders = ordersOf(kid.id)
      if (!kidOrders.length) return null
      return { name: kid.name, total: kidOrders.reduce((s, o) => s + o.total, 0), orders: kidOrders }
    })
    .filter(Boolean)
  const topups = dateTopupsByParent.value[parent.id] || []
  return buildExpenseMessage({
    parentName: displayName, date: expenseDate.value, kids,
    balance: balances.value[parent.id] ?? 0, topups,
    isToday: expenseDate.value === today
  })
}

// 帳務訊息預設內容：同一家庭的帳單，但稱呼帶入該對象自己的名字
function buildTargetMsg(t) {
  const displayName = t.isSecondary ? (t.parent.secondaryName || t.parent.name) : t.parent.name
  return buildExpenseMsg(t.parent, displayName)
}

function refreshExpenseMsgs() {
  const msgs = {}
  for (const t of selectedTargets.value) {
    msgs[t.key] = buildTargetMsg(t)
  }
  expenseMsgs.value = msgs
}

// 勾選變動時保留既有編輯，只補新增對象的預設訊息
watch([selectedIds, selectedSecIds], () => {
  const updated = {}
  for (const t of selectedTargets.value) {
    updated[t.key] = expenseMsgs.value[t.key] ?? buildTargetMsg(t)
  }
  expenseMsgs.value = updated
}, { deep: true })

async function sendGeneral() {
  if (!selectedTargets.value.length || !customMessage.value.trim()) return
  sending.value = true
  try {
    const msg = customMessage.value.trim()
    const records = selectedTargets.value.map(t => ({
      parentId: t.parentId,
      parentName: t.name,
      lineUserId: t.lineUserId,
      message: msg
    }))
    const res = await broadcastService.send({ type: 'general', records })
    notifyResult(res)
    selectedIds.value = []
    selectedSecIds.value = []
    customMessage.value = ''
    selectedTemplateId.value = null
  } finally {
    sending.value = false
  }
}

async function sendExpense() {
  if (!selectedTargets.value.length) return
  sending.value = true
  try {
    const records = selectedTargets.value.map(t => ({
      parentId: t.parentId,
      parentName: t.name,
      lineUserId: t.lineUserId,
      message: expenseMsgs.value[t.key] || buildTargetMsg(t)
    }))
    const res = await broadcastService.send({ type: 'expense', records })
    notifyResult(res)
    selectedIds.value = []
    selectedSecIds.value = []
    expenseMsgs.value = {}
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
/* LINE 泡泡風格預覽：保留換行、限制寬度 */
.bubble-preview {
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 14px;
  background: #9ee27a;
  color: #1a1a1a;
  line-height: 1.5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}
.body--dark .bubble-preview {
  background: #6bbf59;
  color: #0a0a0a;
}
</style>
