<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />

    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-6">
        <q-input v-model="search" placeholder="搜尋姓名..." outlined dense clearable>
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-12 col-sm-6 row items-center justify-end">
        <span class="text-body2 text-grey-7">共 {{ filtered.length }} 位封存學生</span>
      </div>
    </div>

    <!-- 手機：卡片 -->
    <template v-if="$q.screen.lt.md">
      <q-card v-for="s in filtered" :key="s.id" class="q-mb-sm" flat bordered>
        <q-card-section class="q-pb-xs">
          <div class="row items-start no-wrap">
            <div class="col">
              <div class="text-subtitle1 text-weight-bold">{{ s.name }}</div>
              <div class="text-body2 text-grey-7">
                {{ gradeText(s.grade) }}・{{ s.parentName }}・{{ s.phone }}
              </div>
              <div v-if="s.notes" class="text-body2 q-mt-xs">{{ s.notes }}</div>
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-actions class="q-px-md q-py-xs">
          <q-space />
          <q-btn flat dense icon="unarchive" label="恢復" color="primary" size="sm"
            @click="confirmRestore(s)" />
          <q-btn flat dense icon="delete" label="移至刪除" color="negative" size="sm"
            @click="confirmMoveToDeleted(s)" />
        </q-card-actions>
      </q-card>
    </template>

    <!-- 桌機：表格 -->
    <q-table v-else :rows="filtered" :columns="columns" row-key="id" flat bordered
      :rows-per-page-options="[10, 20, 0]">
      <template #body-cell-grade="props">
        <q-td :props="props">{{ gradeText(props.row.grade) }}</q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props" class="text-center">
          <q-btn flat dense round icon="unarchive" color="primary" size="sm"
            @click="confirmRestore(props.row)">
            <q-tooltip>恢復為在籍學生</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="delete" color="negative" size="sm" class="q-ml-xs"
            @click="confirmMoveToDeleted(props.row)">
            <q-tooltip>移至刪除記錄</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <div v-if="!loading && !filtered.length" class="text-center text-grey q-pa-xl">
      <q-icon name="archive" size="56px" class="q-mb-sm" /><br>沒有封存的學生
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
  try { students.value = await studentService.getArchived() }
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
    await studentService.unarchive(student.id)
    students.value = students.value.filter(s => s.id !== student.id)
    $q.notify({ message: `${student.name} 已恢復為在籍學生`, color: 'positive', icon: 'unarchive' })
  })
}

function confirmMoveToDeleted(student) {
  $q.dialog({
    title: '移至刪除記錄',
    message: `確定要將「${student.name}」移至刪除記錄？可在刪除記錄中恢復或永久刪除。`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'negative', label: '移至刪除' },
    persistent: true
  }).onOk(async () => {
    await studentService.softDelete(student.id)
    students.value = students.value.filter(s => s.id !== student.id)
    $q.notify({ message: `${student.name} 已移至刪除記錄`, color: 'warning', icon: 'delete_sweep' })
  })
}
</script>
