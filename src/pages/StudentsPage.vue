<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />
    <!-- 篩選列 -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-5">
        <q-input v-model="search" placeholder="搜尋姓名..." outlined dense clearable>
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-12 col-sm-4">
        <q-select
          v-model="selectedGrade"
          :options="gradeFilterOptions"
          label="年級篩選"
          outlined
          dense
          emit-value
          map-options
          clearable
        />
      </div>
      <div class="col-12 col-sm-3 row justify-end items-center q-gutter-xs">
        <span class="text-body2 text-grey-7">共 {{ filtered.length }} 位</span>
        <q-btn
          outline
          dense
          icon="file_download"
          color="positive"
          label="匯出 Excel"
          style="font-size: 12px"
          @click="exportStudents"
        />
      </div>
    </div>

    <!-- 手機：卡片清單 -->
    <template v-if="$q.screen.lt.md">
      <q-card v-for="s in filtered" :key="s.id" class="q-mb-sm" flat bordered>
        <q-card-section class="q-pb-xs">
          <div class="row items-start no-wrap">
            <div class="col">
              <div class="text-subtitle1 text-weight-bold">{{ s.name }}</div>
              <div class="text-body2 text-grey-7">
                {{ gradeText(s.grade) }}・{{ s.parentName }}・{{ s.phone }}
              </div>
              <div class="row q-gutter-xs q-mt-xs">
                <q-badge v-for="d in s.scheduleDays" :key="d" color="primary" outline>
                  {{ dayLabel[d] }}
                </q-badge>
              </div>
              <div v-if="s.notes" class="text-body2 q-mt-xs">{{ s.notes }}</div>
            </div>
            <div class="col-auto column q-gutter-xs items-end">
              <q-btn flat round dense icon="edit" color="primary" size="sm" @click="openEdit(s)" />
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                size="sm"
                @click="confirmDelete(s)"
              />
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-actions class="q-px-md q-py-xs">
          <span class="text-body2">
            剩餘餐費：
            <q-badge :color="balanceColor(balances[s.id])" class="q-pa-xs" style="font-size: 14px">
              ${{ balances[s.id] ?? 0 }}
            </q-badge>
          </span>
          <q-space />
          <q-btn
            flat
            dense
            icon="savings"
            label="儲值"
            color="primary"
            size="sm"
            @click="openTopup(s)"
          />
          <q-btn
            flat
            dense
            icon="history"
            label="記錄"
            color="grey-7"
            size="sm"
            @click="openDetail(s)"
          />
        </q-card-actions>
      </q-card>
      <div v-if="!filtered.length" class="text-center text-grey q-pa-xl">
        <q-icon name="people_outline" size="56px" class="q-mb-sm" /><br />沒有符合的學生
      </div>
    </template>

    <!-- 桌機：表格 -->
    <q-table
      v-else
      :rows="filtered"
      :columns="columns"
      row-key="id"
      flat
      bordered
      :rows-per-page-options="[10, 20, 0]"
    >
      <template #body-cell-grade="props">
        <q-td :props="props">{{ gradeText(props.row.grade) }}</q-td>
      </template>
      <template #body-cell-scheduleDays="props">
        <q-td :props="props">
          <q-badge
            v-for="d in props.row.scheduleDays"
            :key="d"
            color="primary"
            outline
            class="q-mr-xs"
          >
            {{ dayLabel[d] }}
          </q-badge>
        </q-td>
      </template>
      <template #body-cell-notes="props">
        <q-td :props="props">{{ props.row.notes || '-' }}</q-td>
      </template>
      <template #body-cell-balance="props">
        <q-td :props="props">
          <span class="text-body2">
            <q-badge
              :color="balanceColor(balances[props.row.id])"
              class="q-pa-xs"
              style="font-size: 13px"
            >
              ${{ balances[props.row.id] ?? 0 }}
            </q-badge>
          </span>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props" class="text-center" @click.stop>
          <q-btn
            flat
            dense
            round
            icon="savings"
            color="primary"
            size="sm"
            @click="openTopup(props.row)"
          >
            <q-tooltip>儲值</q-tooltip>
          </q-btn>
          <q-btn
            flat
            dense
            round
            icon="history"
            color="grey-7"
            size="sm"
            @click="openDetail(props.row)"
          >
            <q-tooltip>消費記錄</q-tooltip>
          </q-btn>
          <q-btn
            flat
            dense
            round
            icon="edit"
            color="primary"
            size="sm"
            @click="openEdit(props.row)"
          />
          <q-btn
            flat
            dense
            round
            icon="delete"
            color="negative"
            size="sm"
            @click="confirmDelete(props.row)"
          />
        </q-td>
      </template>
    </q-table>

    <!-- 新增按鈕 -->
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn fab icon="add" color="primary" @click="openAdd" />
    </q-page-sticky>

    <!-- ══════════ 新增/編輯 Dialog ══════════ -->
    <q-dialog v-model="showFormDialog" persistent>
      <q-card style="width: min(95vw, 480px)">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ isEdit ? '編輯學生' : '新增學生' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-form @submit.prevent="saveStudent" class="q-gutter-sm">
            <q-input
              v-model="form.name"
              label="姓名 *"
              outlined
              dense
              :rules="[(v) => !!v || '請填寫姓名']"
            />
            <q-select
              v-model="form.grade"
              label="年級 *"
              outlined
              dense
              :options="gradeOptions"
              emit-value
              map-options
              :rules="[(v) => !!v || '請選擇年級']"
            />
            <q-input v-model="form.parentName" label="家長姓名" outlined dense />
            <q-input v-model="form.phone" label="聯絡電話" outlined dense />
            <div class="text-body2 text-grey-8 q-mt-sm">上課星期</div>
            <div class="row q-gutter-sm">
              <q-checkbox
                v-for="(label, day) in dayLabel"
                :key="day"
                v-model="form.scheduleDays"
                :val="Number(day)"
                :label="label"
                color="primary"
              />
            </div>
            <q-input
              v-model="form.notes"
              label="備註（過敏、素食等）"
              outlined
              dense
              type="textarea"
              rows="2"
              autogrow
            />
            <div class="row justify-end q-mt-md q-gutter-sm">
              <q-btn flat label="取消" v-close-popup />
              <q-btn type="submit" color="primary" :label="isEdit ? '更新' : '新增'" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ══════════ 消費記錄 Dialog ══════════ -->
    <q-dialog v-model="showDetail" :maximized="$q.screen.lt.sm">
      <q-card style="width: min(95vw, 500px); max-height: 88vh" class="column">
        <q-card-section class="row items-center q-pb-none">
          <div>
            <div class="text-h6">{{ detailStudent?.name }}</div>
            <div class="text-body2 text-grey-7">
              {{ gradeText(detailStudent?.grade) }}・{{ detailStudent?.phone }}
            </div>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="text-center q-py-sm">
          <div class="text-body2 text-grey-6">剩餘餐費</div>
          <div
            class="text-h3 text-weight-bold"
            :class="'text-' + balanceColor(balances[detailStudent?.id])"
          >
            ${{ balances[detailStudent?.id] ?? 0 }}
          </div>
        </q-card-section>

        <q-separator />
        <div class="q-px-md q-pt-md text-subtitle2 text-grey-8">消費記錄</div>
        <q-scroll-area class="col" style="min-height: 200px">
          <q-list separator>
            <q-item v-for="tx in detailTransactions" :key="tx.id" dense>
              <q-item-section avatar>
                <q-icon
                  :name="tx.type === 'topup' ? 'add_circle' : 'remove_circle'"
                  :color="tx.type === 'topup' ? 'positive' : 'negative'"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ tx.note }}</q-item-label>
                <q-item-label caption>{{ tx.datetime || tx.date }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <span
                  class="text-weight-bold"
                  :class="tx.type === 'topup' ? 'text-positive' : 'text-negative'"
                >
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
            <q-input
              v-model.number="topupAmount"
              label="儲值金額 *"
              outlined
              dense
              type="number"
              prefix="$"
              :rules="[(v) => v > 0 || '請輸入正確金額']"
            />
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

const $q = useQuasar()

const loading = ref(true)
const students = ref([])
const balances = ref({})
const allTransactions = ref([])
const search = ref('')
const selectedGrade = ref(null)

const dayLabel = { 1: '週一', 2: '週二', 3: '週三', 4: '週四', 5: '週五' }
const gradeOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ label: `${n}年級`, value: n }))
const gradeFilterOptions = [
  { label: '全部年級', value: null },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ label: `${n}年級`, value: n })),
]

const gradeText = (g) => (g ? `${g}年級` : '-')

function balanceColor(b) {
  const v = b ?? 0
  if (v >= 300) return 'positive'
  if (v >= 100) return 'warning'
  return 'negative'
}

const columns = [
  {
    name: 'grade',
    label: '年級',
    field: 'grade',
    align: 'left',
    sortable: true,
    sort: (a, b) => a - b,
  },
  { name: 'name', label: '姓名', field: 'name', align: 'left', sortable: true },
  { name: 'parentName', label: '家長', field: 'parentName', align: 'left' },
  { name: 'phone', label: '電話', field: 'phone', align: 'left' },
  { name: 'scheduleDays', label: '上課日', field: 'scheduleDays', align: 'left' },
  { name: 'notes', label: '備註', field: 'notes', align: 'left' },
  { name: 'balance', label: '剩餘餐費', field: 'id', align: 'left' },
  { name: 'actions', label: '操作', field: 'actions', align: 'center' },
]

const filtered = computed(() => {
  let list = students.value
  if (selectedGrade.value !== null) list = list.filter((s) => s.grade === selectedGrade.value)
  const q = search.value?.trim().toLowerCase()
  if (q) list = list.filter((s) => s.name.toLowerCase().includes(q))
  return [...list].sort((a, b) =>
    a.grade !== b.grade ? a.grade - b.grade : a.name.localeCompare(b.name, 'zh-TW'),
  )
})

const txByStudent = computed(() => {
  const map = {}
  for (const tx of allTransactions.value) {
    if (!map[tx.studentId]) map[tx.studentId] = []
    map[tx.studentId].push(tx)
  }
  for (const id of Object.keys(map)) {
    map[id].sort((a, b) => (b.datetime || b.date).localeCompare(a.datetime || a.date))
  }
  return map
})

onMounted(async () => {
  try {
    students.value = await studentService.getAll()
    balances.value = await mealService.getAllBalances()
    allTransactions.value = await mealService.getAllTransactions()
  } finally {
    loading.value = false
  }
})

async function refreshBalances() {
  balances.value = await mealService.getAllBalances()
  allTransactions.value = await mealService.getAllTransactions()
}

// ── 新增/編輯 ──
const showFormDialog = ref(false)
const isEdit = ref(false)
const emptyForm = () => ({
  name: '',
  grade: null,
  parentName: '',
  phone: '',
  scheduleDays: [],
  notes: '',
})
const form = ref(emptyForm())

function openAdd() {
  isEdit.value = false
  form.value = emptyForm()
  showFormDialog.value = true
}

function openEdit(student) {
  isEdit.value = true
  form.value = { ...student, scheduleDays: [...student.scheduleDays] }
  showFormDialog.value = true
}

async function saveStudent() {
  if (isEdit.value) {
    await studentService.update(form.value.id, form.value)
    const idx = students.value.findIndex((s) => s.id === form.value.id)
    if (idx !== -1) students.value[idx] = { ...form.value }
    $q.notify({ message: '學生資料已更新', color: 'positive', icon: 'check' })
  } else {
    const created = await studentService.create(form.value)
    students.value.push(created)
    $q.notify({ message: '學生新增成功', color: 'positive', icon: 'check' })
  }
  showFormDialog.value = false
}

function confirmDelete(student) {
  $q.dialog({
    title: '確認刪除',
    message: `確定要刪除學生「${student.name}」嗎？`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'negative', label: '刪除' },
    persistent: true,
  }).onOk(async () => {
    await studentService.remove(student.id)
    students.value = students.value.filter((s) => s.id !== student.id)
    $q.notify({ message: '學生已刪除', color: 'negative', icon: 'delete' })
  })
}

// ── 消費記錄 Dialog ──
const showDetail = ref(false)
const detailStudent = ref(null)
const detailTransactions = ref([])

function openDetail(student) {
  detailStudent.value = student
  detailTransactions.value = txByStudent.value[student.id] || []
  showDetail.value = true
}

// ── 儲值 Dialog ──
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
    topupNote.value || `儲值 $${topupAmount.value}`,
  )
  await refreshBalances()
  showTopupDialog.value = false
  $q.notify({
    message: `儲值成功！${topupTarget.value.name} 餘額 $${balances.value[topupTarget.value.id]}`,
    color: 'positive',
    icon: 'savings',
  })
}

// ── 匯出 ──
function exportStudents() {
  const data = filtered.value.map((s) => ({
    姓名: s.name,
    年級: gradeText(s.grade),
    家長: s.parentName,
    電話: s.phone,
    上課日: s.scheduleDays.map((d) => dayLabel[d]).join('、'),
    剩餘餐費: balances.value[s.id] ?? 0,
    備註: s.notes,
  }))
  writeExcel(data, [8, 7, 8, 13, 16, 10, 14], '學生列表', `學生列表_${today()}.xlsx`)
}

function writeExcel(data, colWidths, sheetName, fileName) {
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = colWidths.map((w) => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, fileName)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
</script>
