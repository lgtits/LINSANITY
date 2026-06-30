<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />

    <!-- Tabs -->
    <q-tabs v-model="tab" dense align="left" active-color="primary" indicator-color="primary" class="q-mb-sm">
      <q-tab name="students" icon="school" label="刪除學生" />
      <q-tab name="parents" icon="family_restroom" label="刪除家長" />
    </q-tabs>
    <q-separator class="q-mb-md" />

    <q-banner class="bg-warning-hint q-mb-md rounded-borders">
      <template #avatar><q-icon name="info" color="orange-7" /></template>
      <span v-if="tab === 'students'">刪除記錄中的學生歷史資料（點餐、餐費）仍會保留。可選擇恢復或永久刪除。</span>
      <span v-else>刪除記錄中的家長歷史餐費交易記錄仍會保留。可選擇恢復或永久刪除。</span>
    </q-banner>

    <!-- 搜尋 + 計數 -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6">
        <q-input v-model="search" placeholder="搜尋姓名..." outlined dense clearable>
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-12 col-sm-6 row items-center justify-end">
        <span class="text-body2 text-grey-7">共 {{ filtered.length }} 筆</span>
      </div>
    </div>

    <q-tab-panels v-model="tab" animated keep-alive>

      <!-- ══════ 刪除學生 ══════ -->
      <q-tab-panel name="students" class="q-pa-none">
        <template v-if="$q.screen.lt.md">
          <q-card v-for="s in filteredStudents" :key="s.id" class="q-mb-sm" flat bordered style="opacity:0.8">
            <q-card-section class="q-pb-xs">
              <div class="text-subtitle1 text-weight-bold">{{ s.name }}</div>
              <div class="text-body2 text-grey-7">
                {{ gradeText(s.grade) }}・{{ s.parentName }}・{{ s.phone }}
              </div>
            </q-card-section>
            <q-separator />
            <q-card-actions class="q-px-md q-py-xs">
              <q-space />
              <q-btn flat dense icon="restore" label="恢復" color="primary" size="sm"
                @click="confirmRestoreStudent(s)" />
              <q-btn flat dense icon="delete_forever" label="永久刪除" color="negative" size="sm"
                @click="confirmPermanentDeleteStudent(s)" />
            </q-card-actions>
          </q-card>
        </template>

        <q-table v-else :rows="filteredStudents" :columns="studentColumns" row-key="id"
          flat bordered :rows-per-page-options="[20, 50, 0]" rows-per-page-label="每頁筆數">
          <template #body-cell-grade="props">
            <q-td :props="props">{{ gradeText(props.row.grade) }}</q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn flat dense round icon="restore" color="primary" size="sm"
                @click="confirmRestoreStudent(props.row)">
                <q-tooltip>恢復為在籍學生</q-tooltip>
              </q-btn>
              <q-btn flat dense round icon="delete_forever" color="negative" size="sm" class="q-ml-xs"
                @click="confirmPermanentDeleteStudent(props.row)">
                <q-tooltip>永久刪除（無法復原）</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>

        <div v-if="!loading && !filteredStudents.length" class="text-center text-grey q-pa-xl">
          <q-icon name="delete_sweep" size="56px" class="q-mb-sm" /><br>學生刪除記錄為空
        </div>
      </q-tab-panel>

      <!-- ══════ 刪除家長 ══════ -->
      <q-tab-panel name="parents" class="q-pa-none">
        <template v-if="$q.screen.lt.md">
          <q-card v-for="p in filteredParents" :key="p.id" class="q-mb-sm" flat bordered style="opacity:0.8">
            <q-card-section class="q-pb-xs">
              <div class="text-subtitle1 text-weight-bold">{{ p.name }}</div>
              <div class="text-body2 text-grey-7">
                <q-icon name="phone" size="14px" class="q-mr-xs" />{{ p.phone || '—' }}
              </div>
            </q-card-section>
            <q-separator />
            <q-card-actions class="q-px-md q-py-xs">
              <q-space />
              <q-btn flat dense icon="restore" label="恢復" color="primary" size="sm"
                @click="confirmRestoreParent(p)" />
              <q-btn flat dense icon="delete_forever" label="永久刪除" color="negative" size="sm"
                @click="confirmPermanentDeleteParent(p)" />
            </q-card-actions>
          </q-card>
        </template>

        <q-table v-else :rows="filteredParents" :columns="parentColumns" row-key="id"
          flat bordered :rows-per-page-options="[20, 50, 0]" rows-per-page-label="每頁筆數">
          <template #body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn flat dense round icon="restore" color="primary" size="sm"
                @click="confirmRestoreParent(props.row)">
                <q-tooltip>恢復家長</q-tooltip>
              </q-btn>
              <q-btn flat dense round icon="delete_forever" color="negative" size="sm" class="q-ml-xs"
                @click="confirmPermanentDeleteParent(props.row)">
                <q-tooltip>永久刪除（無法復原）</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>

        <div v-if="!loading && !filteredParents.length" class="text-center text-grey q-pa-xl">
          <q-icon name="delete_sweep" size="56px" class="q-mb-sm" /><br>家長刪除記錄為空
        </div>
      </q-tab-panel>

    </q-tab-panels>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { studentService } from '../services/studentService'
import { parentService } from '../services/parentService'

const $q = useQuasar()
const route = useRoute()

const loading = ref(true)
const students = ref([])
const parents  = ref([])
const search   = ref('')
const tab      = ref(route.query.tab === 'parents' ? 'parents' : 'students')

const gradeText = g => g ? `${g}年級` : '-'

const studentColumns = [
  { name: 'grade',      label: '年級', field: 'grade',      align: 'left', sortable: true, sort: (a, b) => a - b },
  { name: 'name',       label: '姓名', field: 'name',       align: 'left', sortable: true },
  { name: 'parentName', label: '家長', field: 'parentName', align: 'left' },
  { name: 'phone',      label: '電話', field: 'phone',      align: 'left' },
  { name: 'notes',      label: '備註', field: 'notes',      align: 'left' },
  { name: 'actions',   label: '操作', field: 'actions',    align: 'center' }
]

const parentColumns = [
  { name: 'name',    label: '姓名', field: 'name',  align: 'left', sortable: true },
  { name: 'phone',   label: '電話', field: 'phone', align: 'left' },
  { name: 'actions', label: '操作', field: 'actions', align: 'center' }
]

const filteredStudents = computed(() => {
  const q = search.value?.trim().toLowerCase()
  let list = students.value
  if (q) list = list.filter(s => s.name.toLowerCase().includes(q))
  return [...list].sort((a, b) =>
    a.grade !== b.grade ? a.grade - b.grade : a.name.localeCompare(b.name, 'zh-TW')
  )
})

const filteredParents = computed(() => {
  const q = search.value?.trim().toLowerCase()
  let list = parents.value
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || (p.phone || '').includes(q))
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'))
})

const filtered = computed(() =>
  tab.value === 'students' ? filteredStudents.value : filteredParents.value
)

onMounted(async () => {
  try {
    ;[students.value, parents.value] = await Promise.all([
      studentService.getDeleted(),
      parentService.getDeleted()
    ])
  } finally {
    loading.value = false
  }
})

// ── 學生操作 ──
function confirmRestoreStudent(s) {
  $q.dialog({
    title: '恢復學生',
    message: `確定要將「${s.name}」恢復為在籍學生？`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'primary', label: '恢復' },
    persistent: true
  }).onOk(async () => {
    await studentService.restore(s.id)
    students.value = students.value.filter(x => x.id !== s.id)
    $q.notify({ message: `${s.name} 已恢復為在籍學生`, color: 'positive', icon: 'restore' })
  })
}

function confirmPermanentDeleteStudent(s) {
  $q.dialog({
    title: '永久刪除',
    message: `確定要永久刪除「${s.name}」？此操作無法復原，但歷史點餐與餐費記錄仍會保留。`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'negative', label: '永久刪除' },
    persistent: true
  }).onOk(async () => {
    await studentService.permanentDelete(s.id)
    students.value = students.value.filter(x => x.id !== s.id)
    $q.notify({ message: `${s.name} 已永久刪除`, color: 'negative', icon: 'delete_forever' })
  })
}

// ── 家長操作 ──
function confirmRestoreParent(p) {
  $q.dialog({
    title: '恢復家長',
    message: `確定要將「${p.name}」恢復？恢復後可在學生表單中重新選擇此家長。`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'primary', label: '恢復' },
    persistent: true
  }).onOk(async () => {
    await parentService.restore(p.id)
    parents.value = parents.value.filter(x => x.id !== p.id)
    $q.notify({ message: `${p.name} 已恢復`, color: 'positive', icon: 'restore' })
  })
}

function confirmPermanentDeleteParent(p) {
  $q.dialog({
    title: '永久刪除',
    message: `確定要永久刪除「${p.name}」？此操作無法復原，但歷史餐費交易記錄仍會保留。`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'negative', label: '永久刪除' },
    persistent: true
  }).onOk(async () => {
    await parentService.permanentDelete(p.id)
    parents.value = parents.value.filter(x => x.id !== p.id)
    $q.notify({ message: `${p.name} 已永久刪除`, color: 'negative', icon: 'delete_forever' })
  })
}
</script>
