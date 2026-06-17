<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />

    <!-- 篩選列 -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="q-pa-sm">
        <!-- 第一列：關鍵字 / 日期 / 類型 / 家長 -->
        <div class="row q-col-gutter-xs items-end q-mb-xs">
          <div class="col-12 col-sm-3">
            <q-input v-model="search" label="關鍵字（備註）" outlined dense clearable>
              <template #prepend><q-icon name="search" size="sm" /></template>
            </q-input>
          </div>
          <div class="col-6 col-sm-2">
            <q-input v-model="dateFrom" type="date" label="從" outlined dense clearable />
          </div>
          <div class="col-6 col-sm-2">
            <q-input v-model="dateTo" type="date" label="至" outlined dense clearable />
          </div>
          <div class="col-6 col-sm-2">
            <q-select v-model="filterType" :options="typeOptions" label="類型"
              outlined dense clearable emit-value map-options />
          </div>
          <div class="col-6 col-sm-3">
            <q-select v-model="filterParentId" :options="parentOptions" label="家長"
              outlined dense clearable emit-value map-options />
          </div>
        </div>
        <!-- 第二列：學生 / 按鈕右對齊 -->
        <div class="row q-col-gutter-xs items-end">
          <div class="col-12 col-sm-3">
            <q-select v-model="filterStudentId" :options="studentOptions" label="學生"
              outlined dense clearable emit-value map-options />
          </div>
          <div class="col-12 col-sm-9 row justify-end items-end q-gutter-xs">
<q-btn outline dense label="清除篩選" color="grey-7" icon="clear_all" @click="clearFilters" />
            <q-btn outline dense icon="file_download" label="匯出 Excel" color="positive"
              :disable="!filtered.length" @click="exportExcel" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- 桌機：表格 -->
    <q-table
      v-if="!$q.screen.lt.md"
      :rows="filtered"
      :columns="columns"
      row-key="id"
      flat bordered
      :rows-per-page-options="[20, 50, 100, 0]"
      rows-per-page-label="每頁筆數"
    >
      <template #body-cell-type="props">
        <q-td :props="props">
          <q-badge :color="props.row.type === 'topup' ? 'positive' : 'blue-grey-6'">
            {{ props.row.type === 'topup' ? '儲值' : '消費' }}
          </q-badge>
        </q-td>
      </template>
      <template #body-cell-amount="props">
        <q-td :props="props">
          <span class="text-weight-bold" :class="props.row.type === 'topup' ? 'text-positive' : 'text-negative'">
            {{ props.row.type === 'topup' ? '+' : '' }}{{ props.row.amount.toLocaleString() }}
          </span>
        </q-td>
      </template>
    </q-table>

    <!-- 手機：卡片 -->
    <template v-else>
      <q-card v-for="tx in paged" :key="tx.id" class="q-mb-sm" flat bordered>
        <q-card-section class="q-py-sm">
          <div class="row items-center no-wrap">
            <q-icon
              :name="tx.type === 'topup' ? 'add_circle' : 'remove_circle'"
              :color="tx.type === 'topup' ? 'positive' : 'negative'"
              size="20px" class="q-mr-sm"
            />
            <div class="col">
              <div class="row items-center q-gutter-xs">
                <q-badge :color="tx.type === 'topup' ? 'positive' : 'blue-grey-6'">
                  {{ tx.type === 'topup' ? '儲值' : '消費' }}
                </q-badge>
                <span class="text-caption text-grey-6">{{ tx.datetime || tx.date }}</span>
              </div>
              <div class="text-body2 q-mt-xs">{{ tx.note }}</div>
              <div class="text-caption text-grey-6">
                {{ tx.parentName }}{{ tx.studentName ? ' ・ ' + tx.studentName : '' }}
              </div>
            </div>
            <div class="text-weight-bold q-ml-sm" :class="tx.type === 'topup' ? 'text-positive' : 'text-negative'">
              {{ tx.type === 'topup' ? '+' : '' }}${{ Math.abs(tx.amount).toLocaleString() }}
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- 手機分頁 -->
      <div v-if="filtered.length > mobilePageSize" class="row justify-center q-mt-md">
        <q-pagination v-model="mobilePage" :max="mobileMaxPage" boundary-numbers color="primary" />
      </div>

      <div v-if="!filtered.length" class="text-center text-grey q-pa-xl">
        <q-icon name="receipt_long" size="56px" class="q-mb-sm" /><br>無符合記錄
      </div>
    </template>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import * as XLSX from 'xlsx'
import { mealService } from '../services/mealService'
import { studentService } from '../services/studentService'
import { parentService } from '../services/parentService'

const $q = useQuasar()
const loading = ref(true)

const transactions = ref([])
const students = ref([])
const parents = ref([])

const search = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const filterType = ref(null)
const filterParentId = ref(null)
const filterStudentId = ref(null)

const mobilePage = ref(1)
const mobilePageSize = 20

const typeOptions = [
  { label: '儲值', value: 'topup' },
  { label: '消費', value: 'deduct' }
]

const columns = [
  { name: 'datetime', label: '時間',   field: 'datetime', align: 'left',  sortable: true },
  { name: 'type',     label: '類型',   field: 'type',     align: 'center' },
  { name: 'parent',   label: '家長',   field: 'parentName', align: 'left' },
  { name: 'student',  label: '學生',   field: 'studentName', align: 'left' },
  { name: 'amount',   label: '金額',   field: 'amount',   align: 'right', sortable: true },
  { name: 'note',     label: '備註',   field: 'note',     align: 'left'  },
]

const parentMap = computed(() => Object.fromEntries(parents.value.map(p => [p.id, p.name])))
const studentMap = computed(() => Object.fromEntries(students.value.map(s => [s.id, s.name])))

const parentOptions = computed(() =>
  parents.value.map(p => ({ label: p.name, value: p.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-TW'))
)
const studentOptions = computed(() =>
  students.value.map(s => ({ label: s.name, value: s.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-TW'))
)

const rows = computed(() =>
  transactions.value.map(tx => ({
    ...tx,
    parentName: parentMap.value[tx.parentId] ?? '—',
    studentName: tx.studentId ? (studentMap.value[tx.studentId] ?? '—') : '',
    datetime: tx.datetime || tx.date,
  }))
)

const filtered = computed(() => {
  let list = rows.value
  if (filterType.value) list = list.filter(t => t.type === filterType.value)
  if (filterParentId.value) list = list.filter(t => t.parentId === filterParentId.value)
  if (filterStudentId.value) list = list.filter(t => t.studentId === filterStudentId.value)
  if (dateFrom.value) list = list.filter(t => t.date >= dateFrom.value)
  if (dateTo.value) list = list.filter(t => t.date <= dateTo.value)
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    list = list.filter(t => (t.note || '').toLowerCase().includes(q))
  }
  return list
})

const mobileMaxPage = computed(() => Math.ceil(filtered.value.length / mobilePageSize))
const paged = computed(() => {
  const start = (mobilePage.value - 1) * mobilePageSize
  return filtered.value.slice(start, start + mobilePageSize)
})

function clearFilters() {
  search.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  filterType.value = null
  filterParentId.value = null
  filterStudentId.value = null
}

onMounted(async () => {
  try {
    ;[transactions.value, students.value, parents.value] = await Promise.all([
      mealService.getAllTransactions(),
      studentService.getAll(),
      parentService.getAll()
    ])
  } finally {
    loading.value = false
  }
})

function exportExcel() {
  const data = filtered.value.map(t => ({
    '時間': t.datetime,
    '類型': t.type === 'topup' ? '儲值' : '消費',
    '家長': t.parentName,
    '學生': t.studentName || '—',
    '金額': t.amount,
    '備註': t.note || '',
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [16, 6, 8, 8, 10, 30].map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '帳務明細')
  XLSX.writeFile(wb, `帳務明細_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
</script>
