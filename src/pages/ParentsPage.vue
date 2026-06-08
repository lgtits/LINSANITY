<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />

    <!-- 標題列 -->
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h6 text-weight-bold">家長管理</div>
        <div class="text-body2 text-grey-6">家長的姓名、電話在此維護；餘額為全家共用的餐費帳戶</div>
      </div>
      <q-space />
      <q-btn outline icon="person_add" color="primary" label="新增家長"
        style="font-size:12px" @click="openAdd" />
    </div>

    <!-- 搜尋 -->
    <q-input v-model="search" placeholder="搜尋家長姓名或電話..." outlined dense clearable class="q-mb-md">
      <template #prepend><q-icon name="search" /></template>
    </q-input>

    <!-- 手機：卡片 -->
    <template v-if="$q.screen.lt.md">
      <q-card v-for="p in filtered" :key="p.id" class="q-mb-sm" flat bordered>
        <q-card-section class="q-py-sm">
          <div class="row items-center no-wrap q-mb-xs">
            <div class="col">
              <span class="text-subtitle2 text-weight-bold">{{ p.name }}</span>
              <span class="text-body2 text-grey-6 q-ml-sm">
                <q-icon name="phone" size="14px" />{{ p.phone || '—' }}
              </span>
            </div>
            <q-btn flat round dense icon="edit" color="primary" size="sm" @click="openEdit(p)" />
          </div>
          <div class="row items-center q-gutter-xs q-mb-xs">
            <q-badge v-for="s in p.students" :key="s.id" color="primary" outline style="font-size:12px">
              {{ s.name }}
            </q-badge>
            <span v-if="!p.students.length" class="text-body2 text-grey-5">尚無在籍學生</span>
          </div>
          <div class="text-body2">
            家庭餘額：
            <q-badge :color="balanceColor(p.balance)" class="q-pa-xs" style="font-size:13px">
              ${{ p.balance }}
            </q-badge>
          </div>
        </q-card-section>
      </q-card>

      <div v-if="!filtered.length" class="text-center text-grey q-pa-xl">
        <q-icon name="people_outline" size="56px" class="q-mb-sm" /><br>沒有符合的家長
      </div>
    </template>

    <!-- 桌機：表格 -->
    <q-table v-else :rows="filtered" :columns="columns" row-key="id"
      flat bordered :rows-per-page-options="[10, 20, 0]">
      <template #body-cell-students="props">
        <q-td :props="props">
          <q-badge v-for="s in props.row.students" :key="s.id" color="primary" outline class="q-mr-xs">
            {{ s.name }}<span class="text-grey-6 q-ml-xs">{{ s.grade }}年</span>
          </q-badge>
          <span v-if="!props.row.students.length" class="text-grey-5">—</span>
        </q-td>
      </template>
      <template #body-cell-balance="props">
        <q-td :props="props">
          <q-badge :color="balanceColor(props.row.balance)" class="q-pa-xs" style="font-size:13px">
            ${{ props.row.balance }}
          </q-badge>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props" class="text-center">
          <q-btn flat dense round icon="edit" color="primary" size="sm" @click="openEdit(props.row)" />
        </q-td>
      </template>
    </q-table>

    <!-- ══════ 新增/編輯 Dialog ══════ -->
    <q-dialog v-model="showDialog" persistent>
      <q-card style="width: min(95vw, 400px)">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ isEdit ? '編輯家長' : '新增家長' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-form @submit.prevent="save" class="q-gutter-sm">
            <q-input v-model="form.name" label="家長姓名 *" outlined dense
              :rules="[v => !!v || '請填寫姓名']" />
            <q-input v-model="form.phone" label="聯絡電話" outlined dense
              hint="作為防止重複的依據，建議填寫" />
            <div v-if="isEdit && editingStudents.length"
              class="text-caption text-orange-9 bg-orange-1 rounded-borders q-pa-sm">
              <q-icon name="info" size="14px" class="q-mr-xs" />
              修改後會同步更新名下 {{ editingStudents.length }} 位學生的家長資料：{{ editingStudents.map(s => s.name).join('、') }}
            </div>
            <div class="row justify-end q-mt-md q-gutter-sm">
              <q-btn flat label="取消" v-close-popup />
              <q-btn type="submit" color="primary" :label="isEdit ? '更新' : '新增'" />
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
import { parentService } from '../services/parentService'
import { studentService } from '../services/studentService'
import { mealService } from '../services/mealService'

const $q = useQuasar()
const loading = ref(true)

const parents = ref([])
const students = ref([])
const balances = ref({})
const search = ref('')

const columns = [
  { name: 'name',     label: '家長',     field: 'name',  align: 'left', sortable: true },
  { name: 'phone',    label: '電話',     field: 'phone', align: 'left' },
  { name: 'students', label: '名下學生', field: 'students', align: 'left' },
  { name: 'balance',  label: '家庭餘額', field: 'balance', align: 'left', sortable: true },
  { name: 'actions',  label: '操作',     field: 'actions', align: 'center' },
]

function balanceColor(b) {
  const v = b ?? 0
  if (v >= 300) return 'positive'
  if (v >= 100) return 'warning'
  return 'negative'
}

const studentsByParent = computed(() => {
  const map = {}
  for (const s of students.value) {
    if (!map[s.parentId]) map[s.parentId] = []
    map[s.parentId].push(s)
  }
  return map
})

const rows = computed(() =>
  parents.value.map(p => ({
    ...p,
    students: studentsByParent.value[p.id] || [],
    balance: balances.value[p.id] ?? 0,
  }))
)

const filtered = computed(() => {
  const q = search.value?.trim().toLowerCase()
  let list = rows.value
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || (p.phone || '').includes(q))
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'))
})

async function loadAll() {
  ;[parents.value, students.value, balances.value] = await Promise.all([
    parentService.getAll(),
    studentService.getAll(),
    mealService.getAllBalances(),
  ])
}

onMounted(async () => {
  try { await loadAll() } finally { loading.value = false }
})

// ── 新增/編輯 ──
const showDialog = ref(false)
const isEdit = ref(false)
const form = ref({ id: null, name: '', phone: '' })

const editingStudents = computed(() =>
  isEdit.value && form.value.id ? (studentsByParent.value[form.value.id] || []) : []
)

function openAdd() {
  isEdit.value = false
  form.value = { id: null, name: '', phone: '' }
  showDialog.value = true
}

function openEdit(p) {
  isEdit.value = true
  form.value = { id: p.id, name: p.name, phone: p.phone || '' }
  showDialog.value = true
}

async function save() {
  // 電話防重複：若有人用同電話且不是自己，擋下
  if (form.value.phone) {
    const existing = await parentService.findByPhone(form.value.phone)
    if (existing && existing.id !== form.value.id) {
      $q.notify({ message: `此電話已是「${existing.name}」，請改用其他電話`, color: 'negative', icon: 'error' })
      return
    }
  }

  if (isEdit.value) {
    await parentService.update(form.value.id, { name: form.value.name, phone: form.value.phone })
    $q.notify({ message: '家長資料已更新（含名下學生）', color: 'positive', icon: 'check' })
  } else {
    await parentService.create({ name: form.value.name, phone: form.value.phone })
    $q.notify({ message: '家長新增成功', color: 'positive', icon: 'check' })
  }
  showDialog.value = false
  await loadAll()
}
</script>
