<template>
  <q-page padding>
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
        <span class="text-caption text-grey-7">共 {{ filtered.length }} 位</span>
        <q-btn flat dense icon="file_download" color="positive" size="sm" label="匯出" @click="exportExcel" />
      </div>
    </div>

    <!-- 手機：卡片清單 -->
    <template v-if="$q.screen.lt.md">
      <q-card
        v-for="s in filtered"
        :key="s.id"
        class="q-mb-sm"
        flat
        bordered
      >
        <q-card-section class="q-pb-xs">
          <div class="row items-start no-wrap">
            <div class="col">
              <div class="text-subtitle1 text-weight-bold">{{ s.name }}</div>
              <div class="text-caption text-grey-7">{{ gradeText(s.grade) }}・{{ s.parentName }}・{{ s.phone }}</div>
              <div class="row q-gutter-xs q-mt-xs">
                <q-badge
                  v-for="d in s.scheduleDays"
                  :key="d"
                  color="primary"
                  outline
                >{{ dayLabel[d] }}</q-badge>
              </div>
              <q-chip v-if="s.notes" dense icon="warning" color="orange-2" text-color="orange-9" size="sm" class="q-mt-xs">
                {{ s.notes }}
              </q-chip>
            </div>
            <div class="col-auto column q-gutter-xs items-end">
              <q-btn flat round dense icon="edit" color="primary" size="sm" @click="openEdit(s)" />
              <q-btn flat round dense icon="delete" color="negative" size="sm" @click="confirmDelete(s)" />
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-actions class="q-px-md q-py-xs">
          <q-badge
            :color="balanceColor(balances[s.id])"
            class="text-body2 q-pa-xs"
            style="font-size: 14px"
          >
            餐費 ${{ balances[s.id] ?? 0 }}
          </q-badge>
          <q-space />
          <q-btn
            flat
            dense
            icon="savings"
            label="儲值"
            color="primary"
            size="sm"
            @click="openTopupDirect(s)"
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
        <q-icon name="people_outline" size="56px" class="q-mb-sm" /><br>沒有符合的學生
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
      @row-click="(evt, row) => openDetail(row)"
      class="cursor-pointer"
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
          >{{ dayLabel[d] }}</q-badge>
        </q-td>
      </template>
      <template #body-cell-notes="props">
        <q-td :props="props">
          <q-chip v-if="props.row.notes" dense icon="warning" color="orange-2" text-color="orange-9" size="sm">
            {{ props.row.notes }}
          </q-chip>
        </q-td>
      </template>
      <template #body-cell-balance="props">
        <q-td :props="props" class="text-right">
          <q-badge :color="balanceColor(balances[props.row.id])" style="font-size: 13px" class="q-pa-xs">
            ${{ balances[props.row.id] ?? 0 }}
          </q-badge>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props" class="text-center" @click.stop>
          <q-btn flat dense round icon="savings" color="primary" size="sm" @click="openTopupDirect(props.row)" />
          <q-btn flat dense round icon="edit" color="grey-7" size="sm" @click="openEdit(props.row)" class="q-mx-xs" />
          <q-btn flat dense round icon="delete" color="negative" size="sm" @click="confirmDelete(props.row)" />
        </q-td>
      </template>
    </q-table>

    <!-- 新增按鈕 -->
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn fab icon="add" color="primary" @click="openAdd" />
    </q-page-sticky>

    <!-- ===== 新增/編輯 Dialog ===== -->
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
              outlined dense
              :rules="[v => !!v || '請填寫姓名']"
            />
            <q-select
              v-model="form.grade"
              label="年級 *"
              outlined dense
              :options="gradeOptions"
              emit-value
              map-options
              :rules="[v => !!v || '請選擇年級']"
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
              outlined dense
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

    <!-- ===== 學生詳情 Dialog（消費記錄 + 儲值） ===== -->
    <q-dialog v-model="showDetail" :maximized="$q.screen.lt.sm">
      <q-card style="width: min(95vw, 500px); max-height: 88vh" class="column">
        <q-card-section class="row items-center q-pb-none">
          <div>
            <div class="text-h6">{{ detailStudent?.name }}</div>
            <div class="text-caption text-grey-7">
              {{ gradeText(detailStudent?.grade) }}・{{ detailStudent?.phone }}
            </div>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <!-- 餘額 -->
        <q-card-section class="text-center q-py-sm">
          <div class="text-caption text-grey-6">目前餘額</div>
          <div
            class="text-h3 text-weight-bold"
            :class="'text-' + balanceColor(balances[detailStudent?.id])"
          >
            ${{ balances[detailStudent?.id] ?? 0 }}
          </div>
          <q-btn
            color="primary"
            icon="savings"
            label="儲值"
            class="q-mt-sm"
            @click="openTopupFromDetail"
          />
        </q-card-section>

        <q-separator />

        <!-- 消費記錄 -->
        <div class="q-px-md q-pt-md text-subtitle2 text-grey-8">消費記錄</div>
        <q-scroll-area class="col" style="min-height: 160px">
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
                <q-item-label caption>{{ tx.date }}</q-item-label>
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

    <!-- ===== 儲值 Dialog ===== -->
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
              outlined dense
              type="number"
              prefix="$"
              :rules="[v => v > 0 || '請輸入正確金額']"
            />
            <q-input
              v-model="topupNote"
              label="備註（如：七月儲值）"
              outlined dense
            />
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

const students = ref([])
const balances = ref({})
const search = ref('')
const selectedGrade = ref(null)

const dayLabel = { 1: '週一', 2: '週二', 3: '週三', 4: '週四', 5: '週五' }
const gradeOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({ label: `${n}年級`, value: n }))
const gradeFilterOptions = [
  { label: '全部年級', value: null },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({ label: `${n}年級`, value: n }))
]

const gradeText = (g) => (g ? `${g}年級` : '-')

function balanceColor(b) {
  const v = b ?? 0
  if (v >= 300) return 'positive'
  if (v >= 100) return 'warning'
  return 'negative'
}

// ── 表單 ──
const showFormDialog = ref(false)
const isEdit = ref(false)
const emptyForm = () => ({ name: '', grade: null, parentName: '', phone: '', scheduleDays: [], notes: '' })
const form = ref(emptyForm())

const columns = [
  { name: 'grade',        label: '年級',   field: 'grade',        align: 'left',  sortable: true, sort: (a, b) => a - b },
  { name: 'name',         label: '姓名',   field: 'name',         align: 'left',  sortable: true },
  { name: 'parentName',   label: '家長',   field: 'parentName',   align: 'left' },
  { name: 'phone',        label: '電話',   field: 'phone',        align: 'left' },
  { name: 'scheduleDays', label: '上課日', field: 'scheduleDays', align: 'left' },
  { name: 'notes',        label: '備註',   field: 'notes',        align: 'left' },
  { name: 'balance',      label: '餐費餘額', field: 'id',         align: 'right' },
  { name: 'actions',      label: '操作',   field: 'actions',      align: 'center' }
]

const filtered = computed(() => {
  let list = students.value
  if (selectedGrade.value !== null) {
    list = list.filter(s => s.grade === selectedGrade.value)
  }
  const q = search.value?.trim().toLowerCase()
  if (q) {
    list = list.filter(s => s.name.toLowerCase().includes(q))
  }
  return [...list].sort((a, b) =>
    a.grade !== b.grade
      ? a.grade - b.grade
      : a.name.localeCompare(b.name, 'zh-TW')
  )
})

onMounted(async () => {
  students.value = await studentService.getAll()
  balances.value = await mealService.getAllBalances()
})

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
    const idx = students.value.findIndex(s => s.id === form.value.id)
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
    persistent: true
  }).onOk(async () => {
    await studentService.remove(student.id)
    students.value = students.value.filter(s => s.id !== student.id)
    $q.notify({ message: '學生已刪除', color: 'negative', icon: 'delete' })
  })
}

// ── 詳情 Dialog ──
const showDetail = ref(false)
const detailStudent = ref(null)
const detailTransactions = ref([])

async function openDetail(student) {
  detailStudent.value = student
  detailTransactions.value = await mealService.getTransactions(student.id)
  showDetail.value = true
}

// ── 儲值 ──
const showTopupDialog = ref(false)
const topupTarget = ref(null)
const topupAmount = ref(200)
const topupNote = ref('')

function openTopupDirect(student) {
  topupTarget.value = student
  topupAmount.value = 200
  topupNote.value = ''
  showTopupDialog.value = true
}

function openTopupFromDetail() {
  topupTarget.value = detailStudent.value
  topupAmount.value = 200
  topupNote.value = ''
  showTopupDialog.value = true
}

function exportExcel() {
  const data = filtered.value.map(s => ({
    '姓名': s.name,
    '年級': `${s.grade}年級`,
    '家長': s.parentName,
    '電話': s.phone,
    '上課日': s.scheduleDays.map(d => ({ 1:'週一',2:'週二',3:'週三',4:'週四',5:'週五' }[d])).join('、'),
    '餐費餘額': balances.value[s.id] ?? 0,
    '備註': s.notes
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [8, 7, 8, 13, 16, 10, 14].map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '學生餘額')
  XLSX.writeFile(wb, `學生餘額_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

async function doTopup() {
  const tx = await mealService.topup(
    topupTarget.value.id,
    topupAmount.value,
    topupNote.value || `儲值 $${topupAmount.value}`
  )
  balances.value[topupTarget.value.id] =
    (balances.value[topupTarget.value.id] ?? 0) + topupAmount.value

  // 如果詳情 dialog 是同一位學生，同步更新記錄列表
  if (detailStudent.value?.id === topupTarget.value.id) {
    detailTransactions.value.unshift(tx)
  }

  showTopupDialog.value = false
  $q.notify({
    message: `儲值成功！${topupTarget.value.name} 餘額 $${balances.value[topupTarget.value.id]}`,
    color: 'positive',
    icon: 'savings'
  })
}
</script>
