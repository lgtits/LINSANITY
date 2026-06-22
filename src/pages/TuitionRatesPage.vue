<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />

    <!-- 標題列 -->
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h6 text-weight-bold">費率管理</div>
        <div class="text-body2 text-grey-6">設定各月份的學費費率，費率計算頁會依此計算應收金額</div>
      </div>
      <q-space />
      <q-btn outline icon="add" color="primary" label="新增月份費率"
        style="font-size:12px" @click="openAdd" />
    </div>

    <!-- 手機：卡片 -->
    <template v-if="$q.screen.lt.md">
      <q-card v-for="(rate, mk) in sortedRates" :key="mk" class="q-mb-sm" flat bordered>
        <q-card-section class="q-pb-xs">
          <div class="row items-center q-mb-xs">
            <span class="text-subtitle1 text-weight-bold text-primary">{{ mk }}</span>
            <q-space />
            <q-btn flat round dense icon="content_copy" color="grey-6" size="sm"
              @click="openCopy(mk)">
              <q-tooltip>複製到其他月份</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="edit" color="primary" size="sm"
              @click="openEdit(mk, rate)" />
          </div>
          <div class="text-body2 text-grey-6 q-mb-sm">
            請假超過 {{ rate.absentThreshold }} 天改按日計費
          </div>
          <div class="row q-col-gutter-xs">
            <div class="col-6">
              <q-list dense bordered class="rounded-borders">
                <q-item dense class="bg-deep-purple-1">
                  <q-item-section><span class="text-body2 text-weight-bold text-deep-purple">全天班</span></q-item-section>
                </q-item>
                <q-item dense>
                  <q-item-section class="text-body2 text-grey-7">月費（不含餐）</q-item-section>
                  <q-item-section side class="text-body2 text-weight-bold">${{ fmtNum(rate.fullFlat) }}</q-item-section>
                </q-item>
                <q-item dense>
                  <q-item-section class="text-body2 text-grey-7">月費（含用餐）</q-item-section>
                  <q-item-section side class="text-body2 text-weight-bold">${{ fmtNum(rate.fullFlatMeal) }}</q-item-section>
                </q-item>
                <q-item dense>
                  <q-item-section class="text-body2 text-grey-7">按日（不含餐）</q-item-section>
                  <q-item-section side class="text-body2">${{ rate.fullDaily }}/天</q-item-section>
                </q-item>
                <q-item dense>
                  <q-item-section class="text-body2 text-grey-7">按日（含用餐）</q-item-section>
                  <q-item-section side class="text-body2">${{ rate.fullMealDaily }}/天</q-item-section>
                </q-item>
              </q-list>
            </div>
            <div class="col-6">
              <q-list dense bordered class="rounded-borders">
                <q-item dense class="bg-teal-1">
                  <q-item-section><span class="text-body2 text-weight-bold text-teal">半天班</span></q-item-section>
                </q-item>
                <q-item dense>
                  <q-item-section class="text-body2 text-grey-7">月費（不含餐）</q-item-section>
                  <q-item-section side class="text-body2 text-weight-bold">${{ fmtNum(rate.halfFlat) }}</q-item-section>
                </q-item>
                <q-item dense>
                  <q-item-section class="text-body2 text-grey-7">月費（含用餐）</q-item-section>
                  <q-item-section side class="text-body2 text-weight-bold">${{ fmtNum(rate.halfFlatMeal) }}</q-item-section>
                </q-item>
                <q-item dense>
                  <q-item-section class="text-body2 text-grey-7">按日（不含餐）</q-item-section>
                  <q-item-section side class="text-body2">${{ rate.halfDaily }}/天</q-item-section>
                </q-item>
                <q-item dense>
                  <q-item-section class="text-body2 text-grey-7">按日（含用餐）</q-item-section>
                  <q-item-section side class="text-body2">${{ rate.halfMealDaily }}/天</q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
          <!-- 附加活動 -->
          <div v-if="rate.extraActivities?.length" class="q-mt-sm">
            <q-list dense bordered class="rounded-borders">
              <q-item dense class="bg-amber-1">
                <q-item-section><span class="text-body2 text-weight-bold text-amber-9">附加活動</span></q-item-section>
              </q-item>
              <q-item v-for="ea in rate.extraActivities" :key="ea.id" dense>
                <q-item-section class="text-body2 text-grey-7">{{ ea.name }}</q-item-section>
                <q-item-section side class="text-body2 text-weight-bold">${{ fmtNum(ea.amount) }}</q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-card-section>
      </q-card>
    </template>

    <!-- 桌機：表格 -->
    <q-table v-else :rows="tableRows" :columns="columns" row-key="monthKey"
      flat bordered :rows-per-page-options="[20, 50, 0]" rows-per-page-label="每頁筆數">
      <template #body-cell-actions="props">
        <q-td :props="props" class="text-center">
          <q-btn flat dense round icon="content_copy" color="grey-6" size="sm"
            @click="openCopy(props.row.monthKey)">
            <q-tooltip>複製到其他月份</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="edit" color="primary" size="sm"
            @click="openEdit(props.row.monthKey, allRates[props.row.monthKey])" />
        </q-td>
      </template>
    </q-table>

    <div v-if="!loading && !Object.keys(allRates).length" class="text-center text-grey q-pa-xl">
      <q-icon name="tune" size="56px" class="q-mb-sm" /><br>尚無費率設定，請新增月份
    </div>

    <!-- ══════ 新增/編輯 Dialog ══════ -->
    <q-dialog v-model="showDialog" persistent>
      <q-card style="width: min(95vw, 480px)">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ isEdit ? `編輯 ${editingMonthKey}` : '新增月份費率' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section style="max-height: 70vh; overflow-y: auto">
            <q-input v-if="!isEdit" v-model="form.monthKey" label="月份 *" outlined dense
              placeholder="如：2026-07"
              hint="格式：YYYY-MM"
              :rules="[v => /^\d{4}-\d{2}$/.test(v) || '格式應為 YYYY-MM']"
              class="q-mb-md" />

            <div class="text-body2 text-grey-7 text-weight-bold q-mb-sm">按日計費門檻</div>
            <q-input v-model.number="form.absentThreshold" label="請假超過幾天改按日計費"
              type="number" suffix="天" outlined dense class="q-mb-md"
              :rules="[v => v >= 0 || '請輸入正確天數']" />

            <q-separator class="q-mb-md" />

            <div class="row items-center q-mb-sm">
              <q-badge color="deep-purple" label="全天班" />
            </div>
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-6">
                <q-input v-model.number="form.fullFlat" label="月費（不含餐）"
                  type="number" prefix="$" suffix="/月" outlined dense
                  :rules="[v => v > 0 || '請輸入正確金額']" />
              </div>
              <div class="col-6">
                <q-input v-model.number="form.fullFlatMeal" label="月費（含用餐）"
                  type="number" prefix="$" suffix="/月" outlined dense
                  :rules="[v => v > 0 || '請輸入正確金額']" />
              </div>
              <div class="col-6">
                <q-input v-model.number="form.fullDaily" label="按日（不含餐）"
                  type="number" prefix="$" suffix="/天" outlined dense
                  :rules="[v => v > 0 || '請輸入正確金額']" />
              </div>
              <div class="col-6">
                <q-input v-model.number="form.fullMealDaily" label="按日（含用餐）"
                  type="number" prefix="$" suffix="/天" outlined dense
                  :rules="[v => v > 0 || '請輸入正確金額']" />
              </div>
            </div>

            <q-separator class="q-mb-md" />

            <div class="row items-center q-mb-sm">
              <q-badge color="teal" label="半天班" />
            </div>
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input v-model.number="form.halfFlat" label="月費（不含餐）"
                  type="number" prefix="$" suffix="/月" outlined dense
                  :rules="[v => v > 0 || '請輸入正確金額']" />
              </div>
              <div class="col-6">
                <q-input v-model.number="form.halfFlatMeal" label="月費（含用餐）"
                  type="number" prefix="$" suffix="/月" outlined dense
                  :rules="[v => v > 0 || '請輸入正確金額']" />
              </div>
              <div class="col-6">
                <q-input v-model.number="form.halfDaily" label="按日（不含餐）"
                  type="number" prefix="$" suffix="/天" outlined dense
                  :rules="[v => v > 0 || '請輸入正確金額']" />
              </div>
              <div class="col-6">
                <q-input v-model.number="form.halfMealDaily" label="按日（含用餐）"
                  type="number" prefix="$" suffix="/天" outlined dense
                  :rules="[v => v > 0 || '請輸入正確金額']" />
              </div>
            </div>

            <q-separator class="q-mb-md" />

            <div class="row items-center q-mb-sm">
              <q-badge color="amber-9" label="附加活動" />
              <q-space />
              <q-btn flat dense size="sm" icon="add" color="amber-9" label="新增活動" @click="addActivity" />
            </div>
            <div v-if="!form.extraActivities.length" class="text-body2 text-grey-5 q-mb-md">
              尚未新增附加活動
            </div>
            <div v-for="(ea, idx) in form.extraActivities" :key="idx" class="row q-col-gutter-sm q-mb-sm items-center">
              <div class="col">
                <q-input v-model="ea.name" label="活動名稱" outlined dense
                  :rules="[v => !!v || '請輸入名稱']" />
              </div>
              <div class="col-4">
                <q-input v-model.number="ea.amount" label="金額" type="number" prefix="$" outlined dense
                  :rules="[v => v > 0 || '請輸入金額']" />
              </div>
              <div class="col-auto">
                <q-btn flat round dense icon="delete" color="negative" size="sm" @click="removeActivity(idx)" />
              </div>
            </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="取消" v-close-popup />
          <q-btn color="primary" icon="save" label="儲存" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ══════ 複製 Dialog ══════ -->
    <q-dialog v-model="showCopyDialog" persistent>
      <q-card style="width: min(95vw, 360px)">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">複製費率</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <div class="text-body2 text-grey-7 q-mb-md">
            將「{{ copySourceKey }}」的費率複製到新月份
          </div>
          <q-input v-model="copyTargetKey" label="目標月份 *" outlined dense
            placeholder="如：2027-07"
            hint="格式：YYYY-MM"
            :rules="[v => /^\d{4}-\d{2}$/.test(v) || '格式應為 YYYY-MM']" />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="取消" v-close-popup />
          <q-btn color="primary" icon="content_copy" label="複製" @click="doCopy" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { tuitionService } from '../services/tuitionService'

const $q = useQuasar()
const loading = ref(true)
const allRates = ref({})

const defaultForm = () => ({
  monthKey: '',
  absentThreshold: 7,
  fullFlat: 10000, fullFlatMeal: 10500,
  fullDaily: 400,  fullMealDaily: 450,
  halfFlat: 5000,  halfFlatMeal: 5500,
  halfDaily: 200,  halfMealDaily: 250,
  extraActivities: []
})

const sortedRates = computed(() =>
  Object.fromEntries(
    Object.entries(allRates.value).sort(([a], [b]) => a.localeCompare(b))
  )
)

const tableRows = computed(() =>
  Object.entries(sortedRates.value).map(([mk, r]) => ({
    monthKey: mk,
    absentThreshold: r.absentThreshold,
    fullFlat: r.fullFlat, fullFlatMeal: r.fullFlatMeal,
    fullDaily: r.fullDaily, fullMealDaily: r.fullMealDaily,
    halfFlat: r.halfFlat, halfFlatMeal: r.halfFlatMeal,
    halfDaily: r.halfDaily, halfMealDaily: r.halfMealDaily,
    extraActivities: r.extraActivities || []
  }))
)

const columns = [
  { name: 'monthKey',         label: '月份',              field: 'monthKey',         align: 'left', sortable: true },
  { name: 'absentThreshold',  label: '請假門檻',           field: 'absentThreshold',  align: 'center' },
  { name: 'fullFlat',         label: '全天月費',           field: 'fullFlat',         align: 'right', format: v => `$${fmtNum(v)}` },
  { name: 'fullFlatMeal',     label: '全天月費(含餐)',      field: 'fullFlatMeal',     align: 'right', format: v => `$${fmtNum(v)}` },
  { name: 'fullDaily',        label: '全天按日',           field: 'fullDaily',        align: 'right', format: v => `$${v}` },
  { name: 'halfFlat',         label: '半天月費',           field: 'halfFlat',         align: 'right', format: v => `$${fmtNum(v)}` },
  { name: 'halfFlatMeal',     label: '半天月費(含餐)',      field: 'halfFlatMeal',     align: 'right', format: v => `$${fmtNum(v)}` },
  { name: 'halfDaily',        label: '半天按日',           field: 'halfDaily',        align: 'right', format: v => `$${v}` },
  { name: 'extraActivities', label: '附加活動',           field: 'extraActivities',  align: 'left', format: v => v?.length ? v.map(a => `${a.name}($${a.amount})`).join('、') : '—' },
  { name: 'actions',          label: '操作',               field: 'actions',          align: 'center' }
]

function fmtNum(n) { return Number(n).toLocaleString('zh-TW') }

onMounted(async () => {
  try {
    allRates.value = await tuitionService.getRates()
  } finally {
    loading.value = false
  }
})

// ── 新增/編輯 ──
const showDialog = ref(false)
const isEdit = ref(false)
const editingMonthKey = ref('')
const form = ref(defaultForm())

function openAdd() {
  isEdit.value = false
  form.value = defaultForm()
  showDialog.value = true
}

function openEdit(mk, rate) {
  isEdit.value = true
  editingMonthKey.value = mk
  form.value = {
    monthKey: mk, ...rate,
    extraActivities: (rate.extraActivities || []).map(ea => ({ ...ea }))
  }
  showDialog.value = true
}

function addActivity() {
  form.value.extraActivities.push({ id: `ea${Date.now()}`, name: '', amount: 0 })
}

function removeActivity(idx) {
  form.value.extraActivities.splice(idx, 1)
}

async function save() {
  if (!isEdit.value && !/^\d{4}-\d{2}$/.test(form.value.monthKey)) {
    $q.notify({ message: '請填寫正確的月份格式（YYYY-MM）', color: 'negative', icon: 'error' })
    return
  }
  const mk = isEdit.value ? editingMonthKey.value : form.value.monthKey
  if (!isEdit.value && allRates.value[mk]) {
    $q.notify({ message: `${mk} 費率已存在，請使用編輯功能修改`, color: 'warning', icon: 'warning' })
    return
  }
  const rateData = {
    absentThreshold: form.value.absentThreshold,
    fullFlat: form.value.fullFlat,         fullFlatMeal: form.value.fullFlatMeal,
    fullDaily: form.value.fullDaily,       fullMealDaily: form.value.fullMealDaily,
    halfFlat: form.value.halfFlat,         halfFlatMeal: form.value.halfFlatMeal,
    halfDaily: form.value.halfDaily,       halfMealDaily: form.value.halfMealDaily,
    extraActivities: form.value.extraActivities.filter(ea => ea.name && ea.amount > 0)
  }
  allRates.value = { ...allRates.value, [mk]: rateData }
  await tuitionService.updateRates(mk, rateData)

  showDialog.value = false
  $q.notify({ message: `${mk} 費率已儲存`, color: 'positive', icon: 'check' })
}

// ── 複製 ──
const showCopyDialog = ref(false)
const copySourceKey = ref('')
const copyTargetKey = ref('')

function openCopy(mk) {
  copySourceKey.value = mk
  copyTargetKey.value = ''
  showCopyDialog.value = true
}

async function doCopy() {
  if (allRates.value[copyTargetKey.value]) {
    $q.notify({ message: `${copyTargetKey.value} 費率已存在，無法覆蓋`, color: 'warning', icon: 'warning' })
    return
  }
  const source = allRates.value[copySourceKey.value]
  allRates.value = { ...allRates.value, [copyTargetKey.value]: { ...source } }
  await tuitionService.updateRates(copyTargetKey.value, source)

  showCopyDialog.value = false
  $q.notify({ message: `已複製到 ${copyTargetKey.value}`, color: 'positive', icon: 'content_copy' })
}

</script>
