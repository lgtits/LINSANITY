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
      <!-- 收件人選擇 -->
      <div class="col-12 col-md-5">
        <q-card flat bordered style="height: 100%">
          <q-card-section class="q-pb-xs">
            <div class="row items-center q-mb-xs">
              <div class="text-subtitle2">收件人</div>
              <q-space />
              <q-btn flat dense label="全選" @click="selectAll" />
              <q-btn flat dense label="清除" color="grey-7" @click="clearAll" />
            </div>
            <div class="row q-col-gutter-xs">
              <div class="col-7">
                <q-input v-model="studentSearch" placeholder="搜尋姓名..." outlined dense clearable>
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
                v-for="s in filteredStudents"
                :key="s.id"
                :clickable="!!s.lineUserId"
                :disable="!s.lineUserId"
                @click="s.lineUserId && toggleStudent(s.id)"
              >
                <q-item-section avatar>
                  <q-checkbox
                    :model-value="selectedIds.includes(s.id)"
                    :disable="!s.lineUserId"
                    color="primary"
                    @update:model-value="s.lineUserId && toggleStudent(s.id)"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ s.name }}</q-item-label>
                  <q-item-label style="font-size: 12px" class="text-grey-6">
                    {{ s.grade }}年級・{{ s.parentName }}
                    <span v-if="!s.lineUserId" class="text-negative q-ml-xs">未填 LINE ID</span>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge v-if="broadcastType === 'expense' && s.lineUserId" :color="balanceColor(balances[s.id])" outline>
                    ${{ balances[s.id] ?? 0 }}
                  </q-badge>
                </q-item-section>
              </q-item>
              <q-item v-if="!filteredStudents.length">
                <q-item-section class="text-grey text-center q-pa-md">無符合學生</q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>

          <q-separator />
          <q-card-section class="q-py-sm">
            <span class="text-body2 text-grey-7">已選 {{ selectedIds.length }} / {{ linkedStudents.length }} 位</span>
            <span v-if="noLineIdCount > 0" class="text-body2 text-grey-5 q-ml-sm">
              （{{ noLineIdCount }} 位未填 LINE ID）
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
              所有收件人將收到相同訊息
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
              請先從左側選擇收件人
            </div>

            <q-list v-else separator>
              <q-item v-for="s in selectedStudents" :key="s.id" class="q-py-sm">
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ s.name }}</q-item-label>
                  <q-item-label caption style="white-space: pre-line; line-height: 1.6">
                    {{ buildExpenseMessage(s) }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
          <q-card-actions class="q-px-md q-pb-md row items-center">
            <div class="text-body2 text-grey-6">
              每位家長收到各自的費用明細
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
import { mealService } from '../services/mealService'
import { broadcastService } from '../services/broadcastService'

const $q = useQuasar()

const loading = ref(true)
const sending = ref(false)
const students = ref([])
const balances = ref({})
const allTransactions = ref([])
const templates = ref([])

const broadcastType = ref('general')
const studentSearch = ref('')
const gradeFilter = ref(null)
const selectedIds = ref([])
const selectedTemplateId = ref(null)
const customMessage = ref('')
const expenseDate = new Date().toISOString().slice(0, 10)

onMounted(async () => {
  try {
    [students.value, balances.value, allTransactions.value, templates.value] = await Promise.all([
      studentService.getAll(),
      mealService.getAllBalances(),
      mealService.getAllTransactions(),
      broadcastService.getTemplates()
    ])
  } finally {
    loading.value = false
  }
})

const gradeFilterOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({ label: `${n}年級`, value: n }))

const filteredStudents = computed(() => {
  let list = students.value
  if (gradeFilter.value !== null) list = list.filter(s => s.grade === gradeFilter.value)
  const q = studentSearch.value.trim().toLowerCase()
  if (q) list = list.filter(s => s.name.toLowerCase().includes(q))
  return list
})

const selectedStudents = computed(() =>
  students.value.filter(s => selectedIds.value.includes(s.id))
)

const linkedStudents = computed(() => students.value.filter(s => s.lineUserId))
const noLineIdCount = computed(() => students.value.length - linkedStudents.value.length)

const templateOptions = computed(() =>
  templates.value.map(t => ({ label: t.name, value: t.id }))
)

function balanceColor(b) {
  const v = b ?? 0
  if (v >= 300) return 'positive'
  if (v >= 100) return 'warning'
  return 'negative'
}

function toggleStudent(id) {
  const student = students.value.find(s => s.id === id)
  if (!student?.lineUserId) return
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) selectedIds.value.push(id)
  else selectedIds.value.splice(idx, 1)
}

function selectAll() {
  selectedIds.value = filteredStudents.value.filter(s => s.lineUserId).map(s => s.id)
}

function clearAll() {
  selectedIds.value = []
}

function applyTemplate(id) {
  if (!id) return
  const tpl = templates.value.find(t => t.id === id)
  if (tpl) customMessage.value = tpl.content
}

function buildExpenseMessage(student) {
  const dateDeducts = allTransactions.value.filter(
    t => t.studentId === student.id && t.type === 'deduct' && t.date === expenseDate.value
  )
  const todayExpense = dateDeducts.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const balance = balances.value[student.id] ?? 0

  let msg = `您好，${student.parentName} 家長：\n`
  if (todayExpense > 0) {
    msg += `${student.name} 今日餐費 $${todayExpense}，目前帳戶餘額 $${balance}。`
  } else {
    msg += `${student.name} 今日無用餐記錄，目前帳戶餘額 $${balance}。`
  }
  if (balance < 100) msg += '\n⚠️ 餘額偏低，請盡快儲值！'
  return msg
}

async function sendGeneral() {
  if (!selectedIds.value.length || !customMessage.value.trim()) return
  sending.value = true
  try {
    const records = selectedStudents.value.map(s => ({
      studentId: s.id,
      studentName: s.name,
      message: customMessage.value.trim()
    }))
    await broadcastService.send({ type: 'general', records })
    $q.notify({ message: `訊息已發送給 ${records.length} 位家長`, color: 'positive', icon: 'check' })
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
    const records = selectedStudents.value.map(s => ({
      studentId: s.id,
      studentName: s.name,
      message: buildExpenseMessage(s)
    }))
    await broadcastService.send({ type: 'expense', records })
    $q.notify({ message: `餐費通知已發送給 ${records.length} 位家長`, color: 'teal', icon: 'check' })
    selectedIds.value = []
  } finally {
    sending.value = false
  }
}
</script>
