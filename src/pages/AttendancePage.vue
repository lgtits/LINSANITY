<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />

    <!-- 月份導航 -->
    <div class="row items-center q-mb-md no-wrap">
      <q-btn flat round dense icon="chevron_left" @click="prevMonth" />
      <div class="text-subtitle1 text-weight-bold text-primary q-px-sm" style="min-width: 110px; text-align: center">
        {{ selectedYear }}年 {{ String(selectedMonth).padStart(2,'0') }}月
      </div>
      <q-btn flat round dense icon="chevron_right" @click="nextMonth" />
      <q-space />
      <span class="text-body2 text-grey-6">{{ filteredRows.length }} 位學生</span>
    </div>

    <!-- 篩選 -->
    <div class="row q-col-gutter-sm q-mb-md items-center">
      <div class="col-12 col-sm">
        <q-input v-model="search" placeholder="搜尋姓名..." outlined dense clearable>
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-12 col-sm-auto row items-center no-wrap q-gutter-xs">
        <q-select v-model="selectedGrade" :options="gradeOptions" label="年級"
          outlined dense emit-value map-options clearable style="min-width: 110px" />
        <q-select v-model="selectedClassType" :options="classTypeFilterOptions" label="班別"
          outlined dense emit-value map-options style="min-width: 100px" />
      </div>
    </div>

    <!-- 尚未設定費率的警告 -->
    <q-banner v-if="!loading && !rates" class="bg-warning-hint q-mb-md rounded-borders">
      <template #avatar><q-icon name="warning" color="orange-7" /></template>
      <div class="text-body2">
        <span class="text-weight-bold">{{ selectedYear }}年{{ String(selectedMonth).padStart(2,'0') }}月 尚未設定費率</span>，
        預收與目前計費無法計算，請先前往費率管理設定。
      </div>
      <template #action>
        <q-btn flat color="orange-9" label="前往費率管理" icon="tune"
          @click="$router.push('/tuition/rates')" />
      </template>
    </q-banner>

    <!-- 尚未建立名單 -->
    <q-card v-if="!loading && enrollment === null && !loadingMonth"
      flat bordered class="q-mb-md bg-info-hint">
      <q-card-section class="row items-center">
        <div class="col">
          <div class="text-subtitle2 text-weight-bold text-primary">
            {{ selectedYear }}年{{ String(selectedMonth).padStart(2,'0') }}月 尚未建立學生名單
          </div>
          <div class="text-body2 text-grey-7 q-mt-xs">
            請先至「費率計算」頁載入學生名單
          </div>
        </div>
        <q-btn outline color="primary" icon="calculate" label="前往費率計算"
          @click="$router.push('/tuition')" />
      </q-card-section>
    </q-card>

    <!-- ══════ 手機：卡片 ══════ -->
    <template v-if="$q.screen.lt.md && enrollment !== null">
      <q-card v-for="row in filteredRows" :key="row.studentId" class="q-mb-sm" flat bordered>
        <q-expansion-item expand-separator>
          <template #header>
            <q-item-section>
              <div class="row items-center no-wrap">
                <span class="text-subtitle1 text-weight-bold">{{ row.student.name }}</span>
                <span class="text-body2 text-grey-6 q-ml-xs">{{ row.student.grade }}年級</span>
              </div>
              <div class="row items-center q-gutter-xs q-mt-xs">
                <q-badge
                  :color="row.settings.classType === 'full' ? 'deep-purple' : row.settings.classType === 'half' ? 'teal' : 'grey-6'"
                  :label="row.settings.classType === 'full' ? '全天班' : row.settings.classType === 'half' ? '半天班' : '不上課'" />
                <template v-if="row.settings.classType !== 'none'">
                  <q-badge :color="row.settings.withMeal ? 'orange-7' : 'grey-6'"
                    :label="row.settings.withMeal ? '含用餐' : '不含用餐'" />
                  <q-badge outline color="positive" :label="`出席 ${row.attendDays}天`" />
                  <q-badge outline color="grey-6" :label="`請假 ${row.absentDays}天`" />
                </template>
              </div>
            </q-item-section>
            <q-item-section side v-if="row.settings.classType !== 'none'" class="text-right">
              <div class="text-caption text-grey-5">預收 {{ row.prepaidFee !== null ? `$${fmtNum(row.prepaidFee)}` : 'N/A' }}</div>
              <div class="text-subtitle1 text-weight-bold" :class="row.currentFee !== null ? 'text-primary' : 'text-grey-5'">
                {{ row.currentFee !== null ? `$${fmtNum(row.currentFee)}` : 'N/A' }}
              </div>
              <div v-if="row.prepaidFee !== null && row.currentFee !== null && row.currentFee < row.prepaidFee"
                class="text-caption text-negative text-weight-bold">退 ${{ fmtNum(row.prepaidFee - row.currentFee) }}</div>
              <div v-if="row.prepaidFee !== null && row.currentFee !== null && row.currentFee > row.prepaidFee"
                class="text-caption text-positive text-weight-bold">補 ${{ fmtNum(row.currentFee - row.prepaidFee) }}</div>
            </q-item-section>
          </template>

          <div v-if="row.settings.classType !== 'none'" class="q-pa-md bg-subtle">
            <div class="text-caption text-grey-6 text-center q-mb-sm">
              點擊日期切換：出席(綠) ➔ 請假(紅) ➔ 未到(灰)
            </div>
            <div class="calendar-grid">
              <div v-for="h in ['日','一','二','三','四','五','六']" :key="h" class="calendar-header-cell">{{ h }}</div>
              <div
                v-for="(cell, idx) in monthDays"
                :key="idx"
                class="calendar-day-cell"
                :class="getDayClass(row.studentId, cell)"
                @click="!cell.empty && toggleDay(row.studentId, cell.day)"
              >
                <div v-if="!cell.empty" class="day-number">{{ cell.day }}</div>
                <div v-if="!cell.empty" class="day-status-icon">
                  <q-icon :name="getDayIcon(row.studentId, cell.day)" size="12px" />
                </div>
              </div>
            </div>
            <div class="row q-gutter-md justify-center q-mt-md text-caption text-grey-7">
              <span class="flex items-center"><q-icon name="check_circle" color="positive" class="q-mr-xs"/>出席</span>
              <span class="flex items-center"><q-icon name="cancel" color="negative" class="q-mr-xs"/>請假</span>
              <span class="flex items-center"><q-icon name="do_not_disturb_on" color="grey-5" class="q-mr-xs"/>未到</span>
            </div>
          </div>
          <div v-else class="q-pa-md text-grey-6 text-body2 text-center">此月份不上課</div>
        </q-expansion-item>
      </q-card>

      <div v-if="!filteredRows.length && enrollment !== null" class="text-center text-grey q-pa-xl">
        <q-icon name="people_outline" size="56px" class="q-mb-sm" /><br>沒有符合的學生
      </div>
    </template>

    <!-- ══════ 桌機：表格 ══════ -->
    <template v-else-if="enrollment !== null">
      <q-table
        :rows="filteredRows"
        :columns="columns"
        row-key="studentId"
        flat bordered
        :rows-per-page-options="[20, 50, 0]" rows-per-page-label="每頁筆數"
        class="q-mb-md"
      >
        <template #body="props">
          <q-tr :props="props" class="cursor-pointer" @click="props.expand = !props.expand">
            <q-td key="grade" :props="props">{{ props.row.student.grade }}年級</q-td>
            <q-td key="name" :props="props">
              <span class="text-weight-bold text-grey-9">{{ props.row.student.name }}</span>
            </q-td>
            <q-td key="classType" :props="props" class="text-center">
              <q-badge
                :color="props.row.settings.classType === 'full' ? 'deep-purple' : props.row.settings.classType === 'half' ? 'teal' : 'grey-6'"
                :label="props.row.settings.classType === 'full' ? '全天班' : props.row.settings.classType === 'half' ? '半天班' : '不上課'" />
            </q-td>
            <q-td key="withMeal" :props="props" class="text-center">
              <q-badge v-if="props.row.settings.classType !== 'none'"
                :color="props.row.settings.withMeal ? 'orange-7' : 'grey-6'"
                :label="props.row.settings.withMeal ? '含用餐' : '不含用餐'" />
              <span v-else class="text-grey-5">—</span>
            </q-td>
            <q-td key="attendance" :props="props" class="text-center">
              <template v-if="props.row.settings.classType !== 'none'">
                <span class="text-positive text-weight-bold">{{ props.row.attendDays }}</span>
                <span class="text-grey-4"> / </span>
                <span class="text-grey-6">{{ props.row.absentDays }}</span>
                <span class="text-caption text-grey-5"> 天</span>
              </template>
              <span v-else class="text-grey-5">—</span>
            </q-td>
            <q-td key="prepaidFee" :props="props" class="text-right text-grey-7">
              <span v-if="props.row.settings.classType !== 'none'">
                {{ props.row.prepaidFee !== null ? `$${fmtNum(props.row.prepaidFee)}` : 'N/A' }}
              </span>
              <span v-else class="text-grey-5">—</span>
            </q-td>
            <q-td key="currentFee" :props="props" class="text-right text-weight-bold">
              <template v-if="props.row.settings.classType !== 'none'">
                <span :class="props.row.currentFee !== null ? 'text-primary' : 'text-grey-5'">
                  {{ props.row.currentFee !== null ? `$${fmtNum(props.row.currentFee)}` : 'N/A' }}
                </span>
                <q-badge v-if="props.row.prepaidFee !== null && props.row.currentFee !== null && props.row.currentFee < props.row.prepaidFee"
                  color="negative" class="q-ml-xs" :label="`退 $${fmtNum(props.row.prepaidFee - props.row.currentFee)}`" />
                <q-badge v-if="props.row.prepaidFee !== null && props.row.currentFee !== null && props.row.currentFee > props.row.prepaidFee"
                  color="positive" class="q-ml-xs" :label="`補 $${fmtNum(props.row.currentFee - props.row.prepaidFee)}`" />
              </template>
              <span v-else class="text-grey-5">—</span>
            </q-td>
            <q-td key="expandBtn" :props="props" class="text-center">
              <q-btn flat round dense :icon="props.expand ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" size="sm" />
            </q-td>
          </q-tr>

          <!-- 展開：日曆 -->
          <q-tr v-show="props.expand" :props="props">
            <q-td colspan="100%" class="bg-subtle q-pa-md">
              <template v-if="props.row.settings.classType !== 'none'">
                <div class="text-body2 text-grey-7 text-weight-bold q-mb-sm">
                  <q-icon name="calendar_month" size="14px" class="q-mr-xs" />簽到日曆
                </div>
                <q-card flat bordered class="q-pa-md">
                  <div class="attendance-calendar-container full-width">
                    <div class="text-caption text-grey-6 text-center q-mb-md">
                      點擊日期切換狀態：出席 (綠) ➔ 請假 (紅) ➔ 未到 (灰)
                    </div>
                    <div class="calendar-grid">
                      <div v-for="h in ['日','一','二','三','四','五','六']" :key="h" class="calendar-header-cell">{{ h }}</div>
                      <div
                        v-for="(cell, idx) in monthDays"
                        :key="idx"
                        class="calendar-day-cell"
                        :class="getDayClass(props.row.studentId, cell)"
                        @click="!cell.empty && toggleDay(props.row.studentId, cell.day)"
                      >
                        <div v-if="!cell.empty" class="day-number">{{ cell.day }}</div>
                        <div v-if="!cell.empty" class="day-status-icon">
                          <q-icon :name="getDayIcon(props.row.studentId, cell.day)" size="11px" />
                        </div>
                      </div>
                    </div>
                    <div class="row q-gutter-md justify-center q-mt-md text-caption text-grey-7">
                      <span class="flex items-center"><q-icon name="check_circle" color="positive" class="q-mr-xs"/>出席</span>
                      <span class="flex items-center"><q-icon name="cancel" color="negative" class="q-mr-xs"/>請假</span>
                      <span class="flex items-center"><q-icon name="do_not_disturb_on" color="grey-5" class="q-mr-xs"/>未到</span>
                    </div>
                  </div>
                </q-card>
              </template>
              <div v-else class="text-grey-6 text-body2">此月份不上課</div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </template>

    <!-- 費用結算總結 -->
    <q-card v-if="enrollment !== null" flat bordered class="q-mb-xl">
      <q-card-section class="q-py-sm">
        <div class="text-subtitle2 text-grey-7 q-mb-sm">
          {{ selectedYear }}年{{ String(selectedMonth).padStart(2,'0') }}月 · {{ filteredRows.length }} 位學生
        </div>
        <div class="row q-col-gutter-md text-center">
          <div class="col-4">
            <div class="text-caption text-grey-5">預收總計</div>
            <div class="text-h6 text-weight-bold text-grey-8">
              {{ totalPrepaid !== null ? `$${fmtNum(totalPrepaid)}` : 'N/A' }}
            </div>
          </div>
          <div class="col-4">
            <div class="text-caption text-grey-5">目前計費</div>
            <div class="text-h6 text-weight-bold text-primary">
              {{ totalCurrent !== null ? `$${fmtNum(totalCurrent)}` : 'N/A' }}
            </div>
          </div>
          <div class="col-4">
            <div class="text-caption text-grey-5">
              {{ totalRefund === null ? '結算差額' : totalRefund > 0 ? '預計退費' : totalRefund < 0 ? '需補收' : '結算差額' }}
            </div>
            <div class="text-h6 text-weight-bold"
              :class="totalRefund === null ? 'text-grey-5' : totalRefund > 0 ? 'text-negative' : totalRefund < 0 ? 'text-positive' : 'text-grey-5'">
              {{ totalRefund !== null ? `$${fmtNum(Math.abs(totalRefund))}` : 'N/A' }}
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { studentService } from '../services/studentService'
import { tuitionService } from '../services/tuitionService'
import { attendanceService } from '../services/attendanceService'
import { localDate } from '../lib/datetime'

const $router = useRouter()
const $q = useQuasar()
const loading = ref(true)
const loadingMonth = ref(false)

const now = new Date()
const selectedYear  = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1)

function prevMonth() {
  if (selectedMonth.value === 1) { selectedMonth.value = 12; selectedYear.value-- }
  else selectedMonth.value--
}
function nextMonth() {
  if (selectedMonth.value === 12) { selectedMonth.value = 1; selectedYear.value++ }
  else selectedMonth.value++
}

const monthKey = computed(() =>
  `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}`
)

const search = ref('')
const selectedGrade = ref(null)
const selectedClassType = ref('all')

const gradeOptions = [
  { label: '全部年級', value: null },
  ...[1,2,3,4,5,6,7,8,9].map(n => ({ label: `${n}年級`, value: n }))
]
const classTypeFilterOptions = [
  { label: '全部班別', value: 'all' },
  { label: '全天班',   value: 'full' },
  { label: '半天班',   value: 'half' },
  { label: '不上課',   value: 'none' }
]

const columns = [
  { name: 'grade',       label: '年級',      align: 'left',  sortable: true },
  { name: 'name',        label: '姓名',      align: 'left',  sortable: true },
  { name: 'classType',   label: '班別',      align: 'center' },
  { name: 'withMeal',    label: '用餐',      align: 'center' },
  { name: 'attendance',  label: '出席 / 請假', align: 'center' },
  { name: 'prepaidFee',  label: '預收',      align: 'right' },
  { name: 'currentFee',  label: '目前計費',   align: 'right' },
  { name: 'expandBtn',   label: '',          align: 'center' }
]

const allStudents = ref([])
const enrollment  = ref(null)
const logs        = ref({})   // 實際簽到 { studentId: { totalDays, absentDays, calendar } }
const plannedAtt  = ref({})   // 預計出席 { studentId: { totalDays, absentDays } }
const allRates    = ref({})

const rates = computed(() => allRates.value[monthKey.value] || null)
const hasRates = computed(() => rates.value !== null)

function fmtNum(n) { return Number(n).toLocaleString('zh-TW') }

// 計費：與費率計算頁相同邏輯（請假超過門檻改按日）
function calcFee(classType, withMeal, totalDays, absentDays) {
  if (!rates.value) return null
  if (classType === 'none') return 0
  const attended = Math.max(0, totalDays - absentDays)
  const threshold = rates.value.absentThreshold
  if (classType === 'full') {
    if (absentDays > threshold) return attended * (withMeal ? rates.value.fullMealDaily : rates.value.fullDaily)
    return withMeal ? rates.value.fullFlatMeal : rates.value.fullFlat
  } else {
    if (absentDays > threshold) return attended * (withMeal ? rates.value.halfMealDaily : rates.value.halfDaily)
    return withMeal ? rates.value.halfFlatMeal : rates.value.halfFlat
  }
}

// ── 月份日曆格 ──
const monthDays = computed(() => {
  const year = selectedYear.value
  const month = selectedMonth.value
  const firstDay = new Date(year, month - 1, 1).getDay()
  const total = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push({ empty: true })
  for (let d = 1; d <= total; d++) cells.push({ empty: false, day: d })
  return cells
})

// ── 取得該學生日曆（確保初始化） ──
function getCalendar(studentId) {
  if (!logs.value[studentId]) {
    logs.value[studentId] = { totalDays: 0, absentDays: 0, calendar: {} }
  }
  const log = logs.value[studentId]
  if (!log.calendar) {
    // 由 totalDays / absentDays 還原日曆：平日依序填入請假，再填出席
    const year = selectedYear.value
    const month = selectedMonth.value
    const daysInMonth = new Date(year, month, 0).getDate()
    const cal = {}
    for (let d = 1; d <= daysInMonth; d++) cal[d] = 'none'

    const weekdays = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay()
      if (dow >= 1 && dow <= 5) weekdays.push(d)
    }
    const absent = log.absentDays || 0
    const present = Math.max(0, (log.totalDays || 0) - absent)
    let idx = 0
    for (let i = 0; i < absent && idx < weekdays.length; i++) cal[weekdays[idx++]] = 'absent'
    for (let i = 0; i < present && idx < weekdays.length; i++) cal[weekdays[idx++]] = 'present'
    log.calendar = cal
  }
  return log.calendar
}

function recalcTotals(studentId) {
  const log = logs.value[studentId]
  if (!log?.calendar) return
  let present = 0, absent = 0
  Object.values(log.calendar).forEach(s => {
    if (s === 'present') present++
    if (s === 'absent') absent++
  })
  log.totalDays = present + absent
  log.absentDays = absent
  const mk = monthKey.value
  attendanceService.updateLog(mk, studentId, 'calendar', log.calendar)
  attendanceService.updateLog(mk, studentId, 'totalDays', log.totalDays)
  attendanceService.updateLog(mk, studentId, 'absentDays', log.absentDays)
}

function applyToggle(studentId, dayNum) {
  const cal = getCalendar(studentId)
  const cur = cal[dayNum] || 'none'
  cal[dayNum] = cur === 'present' ? 'absent' : cur === 'absent' ? 'none' : 'present'
  recalcTotals(studentId)
}

function toggleDay(studentId, dayNum) {
  const mm = String(selectedMonth.value).padStart(2, '0')
  const dd = String(dayNum).padStart(2, '0')
  const cellDate = `${selectedYear.value}-${mm}-${dd}`
  if (cellDate < localDate()) {
    $q.dialog({
      title: '修改過去記錄',
      message: `確認要修改 ${selectedYear.value}/${mm}/${dd} 的簽到記錄？`,
      cancel: { flat: true, label: '取消' },
      ok: { color: 'warning', label: '確認修改' },
      persistent: true
    }).onOk(() => applyToggle(studentId, dayNum))
  } else {
    applyToggle(studentId, dayNum)
  }
}

function getDayClass(studentId, cell) {
  if (cell.empty) return 'cell-empty'
  const cal = getCalendar(studentId)
  return `cell-${cal[cell.day] || 'none'}`
}

function getDayIcon(studentId, dayNum) {
  const cal = getCalendar(studentId)
  const s = cal[dayNum] || 'none'
  if (s === 'present') return 'check_circle'
  if (s === 'absent') return 'cancel'
  return 'do_not_disturb_on'
}

// ── 列表資料 ──
const rows = computed(() => {
  if (!enrollment.value) return []
  return Object.entries(enrollment.value)
    .map(([studentId, settings]) => {
      const student = allStudents.value.find(s => s.id === studentId)
      if (!student) return null
      const log = logs.value[studentId] || { totalDays: 0, absentDays: 0 }
      const attendDays = Math.max(0, log.totalDays - log.absentDays)
      const planned = plannedAtt.value[studentId] || { totalDays: 0, absentDays: 0 }
      const prepaidFee = calcFee(settings.classType, settings.withMeal, planned.totalDays, planned.absentDays)
      const currentFee = calcFee(settings.classType, settings.withMeal, log.totalDays, log.absentDays)
      return { studentId, student, settings, attendDays, absentDays: log.absentDays, prepaidFee, currentFee }
    })
    .filter(Boolean)
    .sort((a, b) =>
      a.student.grade !== b.student.grade
        ? a.student.grade - b.student.grade
        : a.student.name.localeCompare(b.student.name, 'zh-TW')
    )
})

const filteredRows = computed(() => {
  let list = rows.value
  if (selectedGrade.value !== null) list = list.filter(r => r.student.grade === selectedGrade.value)
  if (selectedClassType.value !== 'all') list = list.filter(r => r.settings.classType === selectedClassType.value)
  const q = search.value?.trim().toLowerCase()
  if (q) list = list.filter(r => r.student.name.toLowerCase().includes(q))
  return list
})

const totalPrepaid = computed(() =>
  hasRates.value ? filteredRows.value.reduce((s, r) => s + (r.prepaidFee ?? 0), 0) : null
)
const totalCurrent = computed(() =>
  hasRates.value ? filteredRows.value.reduce((s, r) => s + (r.currentFee ?? 0), 0) : null
)
const totalRefund = computed(() =>
  totalPrepaid.value === null ? null : totalPrepaid.value - totalCurrent.value
)

// ── 載入月份 ──
async function loadMonth(mk) {
  loadingMonth.value = true
  enrollment.value = null
  logs.value = {}
  plannedAtt.value = {}
  const [enr, monthLogs, planned] = await Promise.all([
    tuitionService.getEnrollment(mk),
    attendanceService.getLogs(mk),
    tuitionService.getAttendance(mk)
  ])
  enrollment.value = enr
  logs.value = monthLogs
  plannedAtt.value = planned
  loadingMonth.value = false
}

watch(monthKey, loadMonth)

onMounted(async () => {
  try {
    const mk = monthKey.value
    const [students, enr, monthLogs, planned, fetchedRates] = await Promise.all([
      studentService.getAll(),
      tuitionService.getEnrollment(mk),
      attendanceService.getLogs(mk),
      tuitionService.getAttendance(mk),
      tuitionService.getRates()
    ])
    allStudents.value = students
    enrollment.value  = enr
    logs.value        = monthLogs
    plannedAtt.value  = planned
    allRates.value    = fetchedRates
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  max-width: 320px;
  margin: 0 auto;
}
.calendar-header-cell {
  text-align: center;
  font-size: 12px;
  font-weight: bold;
  color: #757575;
  padding: 4px 0;
}
.calendar-day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  border: 1px solid #e0e0e0;
  transition: all 0.2s ease;
  min-height: 38px;
}
.calendar-day-cell:hover:not(.cell-empty) {
  filter: brightness(0.9);
}
.cell-empty  { border: none; cursor: default; background: transparent; }
.cell-present { background-color: #e8f5e9; border-color: #81c784; color: #2e7d32; }
.cell-absent  { background-color: #ffebee; border-color: #e57373; color: #c62828; }
.cell-none    { background-color: #fafafa; border-color: #e0e0e0; color: #9e9e9e; }
.day-number { font-size: 12px; font-weight: bold; }
.day-status-icon { margin-top: 2px; height: 12px; }
</style>

<style>
body.body--dark .calendar-header-cell { color: #b0b3b8; }
body.body--dark .calendar-day-cell { border-color: #3a3b3c; }
body.body--dark .cell-present { background-color: #2d3b2d; border-color: #4a7a4a; color: #8bc48b; }
body.body--dark .cell-absent  { background-color: #3b2626; border-color: #7a3b3b; color: #e08080; }
body.body--dark .cell-none    { background-color: #303132; border-color: #3a3b3c; color: #6b6d70; }
</style>
