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

    <!-- 未綁定的 LINE 好友提示 -->
    <q-banner v-if="unlinkedContacts.length" class="bg-blue-1 text-blue-9 q-mb-md rounded-borders">
      <template #avatar><q-icon name="link" color="primary" /></template>
      有 <b>{{ unlinkedContacts.length }}</b> 位已加 LINE 好友但尚未綁定家長。編輯家長時，可在「LINE 聯絡人」選單把對方帶入。
    </q-banner>

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
              <template v-if="p.lineUserId">
                <q-badge color="green-1" text-color="positive" class="q-ml-sm" style="font-size:12px">
                  <q-icon name="link" size="12px" class="q-mr-xs" />已綁 LINE
                </q-badge>
                <span v-if="contactMap[p.lineUserId]" class="q-ml-xs text-caption text-grey-8">{{ contactMap[p.lineUserId] }}</span>
              </template>
              <q-badge v-else color="grey-3" text-color="grey-8" class="q-ml-sm" style="font-size:12px">未綁 LINE</q-badge>
            </div>
            <q-btn flat round dense icon="edit" color="primary" size="sm" @click="openEdit(p)" />
          </div>
          <div class="row items-center q-gutter-xs q-mb-xs">
            <q-badge v-for="s in p.students" :key="s.id" color="primary" outline style="font-size:12px">
              {{ s.name }}
            </q-badge>
            <span v-if="!p.students.length" class="text-body2 text-grey-5">尚無在籍學生</span>
          </div>
          <div class="row items-center">
            <span class="text-body2">家庭餘額：</span>
            <q-badge :color="balanceColor(p.balance)" class="q-pa-xs q-ml-xs" style="font-size:13px">
              ${{ p.balance }}
            </q-badge>
            <q-space />
            <q-btn flat dense icon="savings" label="儲值" color="primary" size="sm" @click="openTopup(p)" />
            <q-btn flat dense icon="history" label="記錄" color="grey-7" size="sm" @click="openDetail(p)" />
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
      <template #body-cell-line="props">
        <q-td :props="props" class="text-center">
          <q-badge v-if="props.row.lineUserId" color="positive" label="已綁" />
          <q-badge v-else color="grey-4" text-color="grey-8" label="未綁" />
        </q-td>
      </template>
      <template #body-cell-lineName="props">
        <q-td :props="props">
          <span v-if="contactMap[props.row.lineUserId]" class="text-grey-8">
            {{ contactMap[props.row.lineUserId] }}
          </span>
          <span v-else class="text-grey-4">—</span>
        </q-td>
      </template>
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
          <q-btn flat dense round icon="savings" color="primary" size="sm" @click="openTopup(props.row)">
            <q-tooltip>儲值</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="history" color="grey-7" size="sm" @click="openDetail(props.row)">
            <q-tooltip>消費記錄</q-tooltip>
          </q-btn>
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
            <q-select
              :model-value="null"
              :options="contactOptions"
              label="從 LINE 聯絡人帶入"
              outlined dense emit-value map-options
              :disable="!contacts.length"
              :hint="contacts.length ? '' : '尚無 LINE 好友（需先有人加好友才能選）'"
              @update:model-value="onPickContact"
            />
            <q-input v-model="form.lineUserId" label="LINE userId" outlined dense clearable
              hint="從上面選好友帶入，或貼上 U 開頭的 userId（共用此帳號）" />
            <div v-if="linkedContactName" class="row items-center q-gutter-xs bg-green-1 rounded-borders q-pa-sm">
              <q-icon name="check_circle" color="positive" size="18px" />
              <span class="text-positive text-weight-medium">已綁 LINE：{{ linkedContactName }}</span>
            </div>
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

    <!-- ══════ 儲值 Dialog ══════ -->
    <q-dialog v-model="showTopup" persistent>
      <q-card style="width: min(95vw, 360px)">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">儲值 - {{ topupTarget?.name }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <div class="text-body2 text-grey-7 q-mb-sm">
            目前家庭餘額 <span class="text-weight-bold">${{ balances[topupTarget?.id] ?? 0 }}</span>
          </div>
          <q-form @submit.prevent="doTopup" class="q-gutter-sm">
            <q-input v-model.number="topupAmount" label="儲值金額 *" outlined dense type="number" prefix="$"
              :rules="[v => v > 0 || '請輸入正確金額']" />
            <q-input v-model="topupNote" label="備註（如：七月儲值）" outlined dense />
            <div class="row justify-end q-mt-md q-gutter-sm">
              <q-btn flat label="取消" v-close-popup />
              <q-btn type="submit" color="primary" label="確認儲值" icon="savings" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ══════ 消費記錄 Dialog ══════ -->
    <q-dialog v-model="showDetail" :maximized="$q.screen.lt.sm">
      <q-card style="width: min(95vw, 500px); max-height: 88vh" class="column">
        <q-card-section class="row items-center q-pb-none">
          <div>
            <div class="text-h6">{{ detailParent?.name }}</div>
            <div class="text-body2 text-grey-7">{{ detailParent?.phone || '未填電話' }}</div>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="text-center q-py-sm">
          <div class="text-body2 text-grey-6">家庭餘額</div>
          <div class="text-h3 text-weight-bold" :class="'text-' + balanceColor(balances[detailParent?.id])">
            ${{ balances[detailParent?.id] ?? 0 }}
          </div>
        </q-card-section>
        <q-separator />
        <div class="q-px-md q-pt-md text-subtitle2 text-grey-8">消費記錄</div>
        <div style="max-height: 50vh; overflow-y: auto">
          <q-list separator>
            <q-item v-for="tx in detailTransactions" :key="tx.id" dense>
              <q-item-section avatar>
                <q-icon :name="tx.type === 'topup' ? 'add_circle' : 'remove_circle'"
                  :color="tx.type === 'topup' ? 'positive' : 'negative'" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ tx.note }}</q-item-label>
                <q-item-label caption>{{ tx.datetime || tx.date }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <span class="text-weight-bold" :class="tx.type === 'topup' ? 'text-positive' : 'text-negative'">
                  {{ tx.type === 'topup' ? '+' : '' }}{{ tx.amount }}
                </span>
              </q-item-section>
            </q-item>
            <q-item v-if="!detailTransactions.length">
              <q-item-section class="text-grey text-center q-pa-md">尚無消費記錄</q-item-section>
            </q-item>
          </q-list>
        </div>
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
import { lineContactService } from '../services/lineContactService'

const $q = useQuasar()
const loading = ref(true)

const parents = ref([])
const students = ref([])
const balances = ref({})
const allTransactions = ref([])
const contacts = ref([])
const search = ref('')

const columns = [
  { name: 'name',     label: '家長',     field: 'name',  align: 'left', sortable: true },
  { name: 'phone',    label: '電話',     field: 'phone', align: 'left' },
  { name: 'line',     label: 'LINE',     field: 'lineUserId', align: 'center' },
  { name: 'lineName', label: 'LINE 名稱', field: 'lineUserId', align: 'left' },
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
  ;[parents.value, students.value, balances.value, allTransactions.value, contacts.value] = await Promise.all([
    parentService.getAll(),
    studentService.getAll(),
    mealService.getAllBalances(),
    mealService.getAllTransactions(),
    lineContactService.getAll().catch(() => []),
  ])
}

const unlinkedContacts = computed(() => contacts.value.filter(c => !c.linkedParentId))

// 編輯時可選的 LINE 聯絡人：全部列出，已綁其他家長的標注
const contactOptions = computed(() => {
  const parentMap = Object.fromEntries(parents.value.map(p => [p.id, p.name]))
  return contacts.value.map(c => {
    const isSelf = c.linkedParentId === form.value.id
    const otherName = !isSelf && c.linkedParentId ? parentMap[c.linkedParentId] : null
    const suffix = otherName ? ` (已綁：${otherName})` : ''
    return { label: `${c.displayName || '(未命名)'}${suffix} ・ ${c.userId.slice(0, 12)}…`, value: c.userId }
  })
})
const contactMap = computed(() =>
  Object.fromEntries(contacts.value.map(c => [c.userId, c.displayName || '']))
)

const linkedContactName = computed(() => {
  if (!form.value.lineUserId) return null
  return contactMap.value[form.value.lineUserId] || null
})

function onPickContact(userId) {
  if (userId) form.value.lineUserId = userId
}

const txByParent = computed(() => {
  const map = {}
  for (const tx of allTransactions.value) {
    if (!map[tx.parentId]) map[tx.parentId] = []
    map[tx.parentId].push(tx)
  }
  for (const id of Object.keys(map)) {
    map[id].sort((a, b) => (b.datetime || b.date).localeCompare(a.datetime || a.date))
  }
  return map
})

onMounted(async () => {
  try { await loadAll() } finally { loading.value = false }
})

// ── 新增/編輯 ──
const showDialog = ref(false)
const isEdit = ref(false)
const form = ref({ id: null, name: '', phone: '', lineUserId: '' })

const editingStudents = computed(() =>
  isEdit.value && form.value.id ? (studentsByParent.value[form.value.id] || []) : []
)

function openAdd() {
  isEdit.value = false
  form.value = { id: null, name: '', phone: '', lineUserId: '' }
  showDialog.value = true
}

function openEdit(p) {
  isEdit.value = true
  form.value = { id: p.id, name: p.name, phone: p.phone || '', lineUserId: p.lineUserId || '' }
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

  const payload = { name: form.value.name, phone: form.value.phone, lineUserId: form.value.lineUserId }
  let pid = form.value.id
  if (isEdit.value) {
    await parentService.update(pid, payload)
    $q.notify({ message: '家長資料已更新（名下學生自動同步）', color: 'positive', icon: 'check' })
  } else {
    const created = await parentService.create(payload)
    pid = created.id
    $q.notify({ message: '家長新增成功', color: 'positive', icon: 'check' })
  }

  // 同步 LINE 聯絡人綁定（允許多個家長共用同一 userId，只更新 linked_parent_id 到此家長）
  if (form.value.lineUserId && contacts.value.some(c => c.userId === form.value.lineUserId)) {
    await lineContactService.link(form.value.lineUserId, pid)
  }

  showDialog.value = false
  await loadAll()
}

// ── 儲值 ──
const showTopup = ref(false)
const topupTarget = ref(null)
const topupAmount = ref(200)
const topupNote = ref('')

function openTopup(p) {
  topupTarget.value = p
  topupAmount.value = 200
  topupNote.value = ''
  showTopup.value = true
}

async function doTopup() {
  await mealService.topup(topupTarget.value.id, topupAmount.value, topupNote.value || `儲值 $${topupAmount.value}`)
  ;[balances.value, allTransactions.value] = await Promise.all([
    mealService.getAllBalances(),
    mealService.getAllTransactions(),
  ])
  showTopup.value = false
  $q.notify({
    message: `儲值成功！${topupTarget.value.name} 餘額 $${balances.value[topupTarget.value.id]}`,
    color: 'positive', icon: 'savings',
  })
}

// ── 消費記錄 ──
const showDetail = ref(false)
const detailParent = ref(null)
const detailTransactions = ref([])

function openDetail(p) {
  detailParent.value = p
  detailTransactions.value = txByParent.value[p.id] || []
  showDetail.value = true
}
</script>
