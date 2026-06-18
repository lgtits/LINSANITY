<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />

    <q-banner class="bg-orange-1 text-orange-9 q-mb-md rounded-borders">
      <template #avatar><q-icon name="info" color="orange-7" /></template>
      刪除記錄中的學生歷史資料（點餐、餐費）仍會保留。可選擇恢復或永久刪除。
    </q-banner>

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

    <!-- 手機：卡片 -->
    <template v-if="$q.screen.lt.md">
      <q-card v-for="s in filtered" :key="s.id" class="q-mb-sm" flat bordered style="opacity:0.8">
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
            @click="confirmRestore(s)" />
          <q-btn flat dense icon="delete_forever" label="永久刪除" color="negative" size="sm"
            @click="confirmPermanentDelete(s)" />
        </q-card-actions>
      </q-card>
    </template>

    <!-- 桌機：表格 -->
    <q-table v-else :rows="filtered" :columns="columns" row-key="id" flat bordered
      :rows-per-page-options="[20, 50, 0]" rows-per-page-label="每頁筆數">
      <template #body-cell-grade="props">
        <q-td :props="props">{{ gradeText(props.row.grade) }}</q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props" class="text-center">
          <q-btn flat dense round icon="restore" color="primary" size="sm"
            @click="confirmRestore(props.row)">
            <q-tooltip>恢復為在籍學生</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="delete_forever" color="negative" size="sm" class="q-ml-xs"
            @click="confirmPermanentDelete(props.row)">
            <q-tooltip>永久刪除（無法復原）</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <div v-if="!loading && !filtered.length" class="text-center text-grey q-pa-xl">
      <q-icon name="delete_sweep" size="56px" class="q-mb-sm" /><br>刪除記錄為空
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { studentService } from '../services/studentService'

const $q = useQuasar()
const loading = ref(true)
const students = ref([])
const search = ref('')

const gradeText = g => g ? `${g}年級` : '-'

const columns = [
  { name: 'grade',      label: '年級', field: 'grade',      align: 'left', sortable: true, sort: (a, b) => a - b },
  { name: 'name',       label: '姓名', field: 'name',       align: 'left', sortable: true },
  { name: 'parentName', label: '家長', field: 'parentName', align: 'left' },
  { name: 'phone',      label: '電話', field: 'phone',      align: 'left' },
  { name: 'notes',      label: '備註', field: 'notes',      align: 'left' },
  { name: 'actions',    label: '操作', field: 'actions',    align: 'center' }
]

const filtered = computed(() => {
  const q = search.value?.trim().toLowerCase()
  let list = students.value
  if (q) list = list.filter(s => s.name.toLowerCase().includes(q))
  return [...list].sort((a, b) =>
    a.grade !== b.grade ? a.grade - b.grade : a.name.localeCompare(b.name, 'zh-TW')
  )
})

onMounted(async () => {
  try { students.value = await studentService.getDeleted() }
  finally { loading.value = false }
})

function confirmRestore(student) {
  $q.dialog({
    title: '恢復學生',
    message: `確定要將「${student.name}」恢復為在籍學生？`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'primary', label: '恢復' },
    persistent: true
  }).onOk(async () => {
    await studentService.restore(student.id)
    students.value = students.value.filter(s => s.id !== student.id)
    $q.notify({ message: `${student.name} 已恢復為在籍學生`, color: 'positive', icon: 'restore' })
  })
}

function confirmPermanentDelete(student) {
  $q.dialog({
    title: '永久刪除',
    message: `確定要永久刪除「${student.name}」？此操作無法復原，但歷史點餐與餐費記錄仍會保留。`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'negative', label: '永久刪除' },
    persistent: true
  }).onOk(async () => {
    await studentService.permanentDelete(student.id)
    students.value = students.value.filter(s => s.id !== student.id)
    $q.notify({ message: `${student.name} 已永久刪除`, color: 'negative', icon: 'delete_forever' })
  })
}
</script>
