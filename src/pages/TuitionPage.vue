<template>
  <q-page padding>

    <!-- ══════════════════════════════════
         控制列
    ══════════════════════════════════ -->
    <div class="row q-col-gutter-sm q-mb-md">
      <!-- 月份導航 -->
      <div class="col-12 col-sm-auto">
        <div class="row items-center no-wrap">
          <q-btn flat round dense icon="chevron_left" @click="prevMonth" />
          <div class="text-subtitle2 text-weight-bold text-primary q-px-xs" style="min-width: 100px; text-align: center">
            {{ selectedYear }}年 {{ String(selectedMonth).padStart(2,'0') }}月
          </div>
          <q-btn flat round dense icon="chevron_right" @click="nextMonth" />
        </div>
      </div>

      <!-- 搜尋 -->
      <div class="col-12 col-sm">
        <q-input v-model="search" placeholder="搜尋姓名..." outlined dense clearable>
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>

      <!-- 年級 + 匯出 -->
      <div class="col-12 col-sm-auto row items-center q-gutter-xs">
        <q-select
          v-model="selectedGrade"
          :options="gradeFilterOptions"
          label="年級篩選"
          outlined dense emit-value map-options clearable
          style="min-width: 110px"
        />
        <span class="text-caption text-grey-7">共 {{ filteredRows.length }} 位</span>
        <q-btn flat dense icon="file_download" color="positive" size="sm" label="匯出" @click="exportExcel" />
      </div>
    </div>

    <!-- ══════════════════════════════════
         計費說明 (在控制列下方，學生列表上方)
    ══════════════════════════════════ -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="q-py-sm">
        <div class="row items-center q-mb-sm">
          <q-icon name="info_outline" color="primary" size="18px" class="q-mr-xs" />
          <span class="text-subtitle2 text-weight-bold">計費說明</span>
          <q-space />
          <q-btn flat dense round icon="settings" color="grey-7" size="sm" @click="openRatesDialog">
            <q-tooltip>修改費率</q-tooltip>
          </q-btn>
        </div>

        <div class="row q-col-gutter-sm">
          <!-- 全天班 -->
          <div class="col-6">
            <div class="rate-block q-pa-sm rounded-borders">
              <div class="row items-center q-mb-xs">
                <q-badge color="deep-purple" label="全天班" />
              </div>
              <div class="text-caption text-grey-6">請假 ≤ {{ rates.absentThreshold }} 天</div>
              <div class="text-subtitle2 text-weight-bold text-deep-purple">${{ fmtNum(rates.fullFlat) }} <span class="text-caption text-grey-6">/ 月</span></div>
              <q-separator class="q-my-xs" />
              <div class="text-caption text-grey-6">請假 > {{ rates.absentThreshold }} 天</div>
              <div class="text-body2 text-weight-bold text-deep-purple">${{ rates.fullDaily }} <span class="text-caption text-grey-6">/ 天</span></div>
              <div class="text-caption text-orange-8">
                <q-icon name="restaurant" size="12px" />含用餐 ${{ rates.fullMealDaily }} / 天
              </div>
            </div>
          </div>

          <!-- 半天班 -->
          <div class="col-6">
            <div class="rate-block rate-half q-pa-sm rounded-borders">
              <div class="row items-center q-mb-xs">
                <q-badge color="teal" label="半天班" />
              </div>
              <div class="text-caption text-grey-6">請假 ≤ {{ rates.absentThreshold }} 天</div>
              <div class="text-subtitle2 text-weight-bold text-teal">${{ fmtNum(rates.halfFlat) }} <span class="text-caption text-grey-6">/ 月</span></div>
              <q-separator class="q-my-xs" />
              <div class="text-caption text-grey-6">請假 > {{ rates.absentThreshold }} 天</div>
              <div class="text-body2 text-weight-bold text-teal">${{ rates.halfDaily }} <span class="text-caption text-grey-6">/ 天</span></div>
              <div class="text-caption text-orange-8">
                <q-icon name="restaurant" size="12px" />含用餐 ${{ rates.halfMealDaily }} / 天
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ══════════════════════════════════
         手機：卡片清單 (與學生列表頁類似，更精簡)
    ══════════════════════════════════ -->
    <template v-if="$q.screen.lt.md">
      <q-card
        v-for="row in filteredRows"
        :key="row.student.id"
        class="q-mb-sm"
        flat bordered
      >
        <q-expansion-item expand-separator>
          <template #header>
            <q-item-section>
              <div class="row items-center no-wrap">
                <span class="text-subtitle1 text-weight-bold text-grey-9">{{ row.student.name }}</span>
                <span class="text-caption text-grey-6 q-ml-xs">({{ row.student.grade }}年級)</span>
              </div>
              <div class="row items-center q-gutter-xs q-mt-xs">
                <q-badge
                  dense
                  :color="row.settings.classType === 'full' ? 'deep-purple' : 'teal'"
                  :label="row.settings.classType === 'full' ? '全天班' : '半天班'"
                />
                <q-badge v-if="row.settings.withMeal" color="orange-7" label="含用餐" />
                <q-badge outline color="positive" :label="`出席 ${row.attendance.attendDays}天`" />
                <q-badge outline :color="row.attendance.absentDays > rates.absentThreshold ? 'negative' : 'grey-7'" :label="`請假 ${row.attendance.absentDays}天`" />
              </div>
            </q-item-section>
            <q-item-section side class="text-right">
              <div class="text-subtitle1 text-weight-bold text-primary">${{ fmtNum(row.fee) }}</div>
              <div class="text-caption text-grey-5" :class="row.attendance.absentDays > rates.absentThreshold ? 'text-negative text-weight-bold' : ''">
                {{ row.attendance.absentDays > rates.absentThreshold ? '按日計費' : '月費制' }}
              </div>
            </q-item-section>
          </template>

          <!-- 展開：編輯與日曆 -->
          <div class="q-pa-md bg-grey-1">
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-6">
                <q-select
                  :model-value="row.settings.classType"
                  @update:model-value="v => updateSetting(row.student.id, 'classType', v)"
                  :options="classTypeOptions" label="班別"
                  outlined dense emit-value map-options
                />
              </div>
              <div class="col-6 flex items-center justify-end">
                <q-toggle
                  :model-value="row.settings.withMeal"
                  @update:model-value="v => updateSetting(row.student.id, 'withMeal', v)"
                  label="含用餐" color="orange-7"
                  checked-icon="restaurant" unchecked-icon="block"
                />
              </div>
            </div>

            <!-- 日曆簽到 -->
            <q-card flat bordered class="q-pa-sm q-mb-md">
              <div class="attendance-calendar-container full-width">
                <div class="text-caption text-grey-6 text-center q-mb-sm">
                  點擊日期切換：出席(綠) ➔ 請假(紅) ➔ 非上課日(灰)
                </div>
                <div class="calendar-grid">
                  <div v-for="h in ['日', '一', '二', '三', '四', '五', '六']" :key="h" class="calendar-header-cell">
                    {{ h }}
                  </div>
                  <div
                    v-for="(cell, idx) in getMonthDays(selectedYear, selectedMonth)"
                    :key="idx"
                    class="calendar-day-cell"
                    :class="getDayClass(row.student.id, cell)"
                    @click="!cell.empty && toggleDay(row.student.id, cell.day)"
                  >
                    <div v-if="!cell.empty" class="day-number">{{ cell.day }}</div>
                    <div v-if="!cell.empty" class="day-status-icon">
                      <q-icon :name="getDayIcon(row.student.id, cell.day)" size="12px" />
                    </div>
                  </div>
                </div>
              </div>
            </q-card>

            <!-- 費用統計明細 -->
            <q-card flat bordered class="q-pa-sm">
              <q-list dense separator>
                <q-item>
                  <q-item-section class="text-caption text-grey-7">上課天數統計</q-item-section>
                  <q-item-section side class="text-caption text-weight-bold">
                    共 {{ row.attendance.totalDays }} 天 / 出席 {{ row.attendance.attendDays }} 天 / 請假 {{ row.attendance.absentDays }} 天
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section class="text-caption text-grey-7">計費方式</q-item-section>
                  <q-item-section side class="text-caption">
                    <span v-if="row.attendance.absentDays <= rates.absentThreshold">
                      月費制 (請假 ≤ {{ rates.absentThreshold }} 天)
                    </span>
                    <span v-else class="text-negative text-weight-bold">
                      按日計費 (出席 {{ row.attendance.attendDays }} 天 × ${{ dailyRate(row) }} / 天)
                    </span>
                  </q-item-section>
                </q-item>
                <q-separator class="q-my-xs" />
                <q-item class="bg-blue-50">
                  <q-item-section class="text-weight-bold">應收學費</q-item-section>
                  <q-item-section side>
                    <span class="text-h6 text-primary text-weight-bold">${{ fmtNum(row.fee) }}</span>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card>
          </div>
        </q-expansion-item>
      </q-card>

      <div v-if="!filteredRows.length" class="text-center text-grey q-pa-xl">
        <q-icon name="people_outline" size="56px" class="q-mb-sm" /><br>沒有符合的學生
      </div>
    </template>

    <!-- ══════════════════════════════════
         桌機：表格列表 (與學生列表頁類似)
    ══════════════════════════════════ -->
    <template v-else>
      <q-table
        :rows="filteredRows"
        :columns="columns"
        row-key="student.id"
        flat
        bordered
        :rows-per-page-options="[10, 20, 0]"
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
                :color="props.row.settings.classType === 'full' ? 'deep-purple' : 'teal'"
                :label="props.row.settings.classType === 'full' ? '全天班' : '半天班'"
              />
            </q-td>
            <q-td key="withMeal" :props="props" class="text-center">
              <q-chip
                dense size="sm"
                :color="props.row.settings.withMeal ? 'orange-1' : 'grey-2'"
                :text-color="props.row.settings.withMeal ? 'orange-9' : 'grey-5'"
                :icon="props.row.settings.withMeal ? 'restaurant' : 'block'"
              >{{ props.row.settings.withMeal ? '含用餐' : '不含用餐' }}</q-chip>
            </q-td>
            <q-td key="attendance" :props="props" class="text-center">
              <span class="text-positive text-weight-bold">{{ props.row.attendance.attendDays }}</span>
              <span class="text-grey-4"> / </span>
              <span :class="props.row.attendance.absentDays > rates.absentThreshold ? 'text-negative text-weight-bold' : 'text-grey-6'">
                {{ props.row.attendance.absentDays }}
              </span>
              <span class="text-caption text-grey-5"> 天</span>
            </q-td>
            <q-td key="billingType" :props="props" class="text-center">
              <span :class="props.row.attendance.absentDays > rates.absentThreshold ? 'text-negative text-weight-bold' : 'text-grey-6'">
                {{ props.row.attendance.absentDays > rates.absentThreshold ? '按日計費' : '月費制' }}
              </span>
            </q-td>
            <q-td key="fee" :props="props" class="text-right text-subtitle2 text-weight-bold text-primary">
              ${{ fmtNum(props.row.fee) }}
            </q-td>
            <q-td key="expandBtn" :props="props" class="text-center">
              <q-btn flat round dense :icon="props.expand ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" size="sm" />
            </q-td>
          </q-tr>

          <!-- 展開內容 -->
          <q-tr v-show="props.expand" :props="props">
            <q-td colspan="100%" class="bg-grey-1 q-pa-md">
              <div class="row q-col-gutter-md">
                <!-- 左：設定與明細 -->
                <div class="col-12 col-md-6">
                  <div class="text-caption text-grey-7 text-weight-bold q-mb-sm">
                    <q-icon name="tune" size="14px" class="q-mr-xs" />{{ selectedYear }}年{{ String(selectedMonth).padStart(2,'0') }}月 設定與統計
                  </div>
                  <q-card flat bordered class="q-pa-md q-mb-md">
                    <div class="row q-col-gutter-sm">
                      <div class="col-6">
                        <q-select
                          :model-value="props.row.settings.classType"
                          @update:model-value="v => updateSetting(props.row.student.id, 'classType', v)"
                          :options="classTypeOptions" label="班別"
                          outlined dense emit-value map-options
                        />
                      </div>
                      <div class="col-6 flex items-center">
                        <q-toggle
                          :model-value="props.row.settings.withMeal"
                          @update:model-value="v => updateSetting(props.row.student.id, 'withMeal', v)"
                          label="含用餐" color="orange-7"
                          checked-icon="restaurant" unchecked-icon="block"
                        />
                      </div>
                    </div>
                  </q-card>

                  <div class="text-caption text-grey-7 text-weight-bold q-mb-sm">
                    <q-icon name="receipt_long" size="14px" class="q-mr-xs" />出席統計與費用明細
                  </div>
                  <q-card flat bordered>
                    <q-list dense separator>
                      <q-item>
                        <q-item-section class="text-caption text-grey-7">上課總天數 (出席 + 請假)</q-item-section>
                        <q-item-section side class="text-caption text-weight-bold">{{ props.row.attendance.totalDays }} 天</q-item-section>
                      </q-item>
                      <q-item>
                        <q-item-section class="text-caption text-grey-7">請假天數</q-item-section>
                        <q-item-section side class="text-caption">
                          <span :class="props.row.attendance.absentDays > rates.absentThreshold ? 'text-negative text-weight-bold' : ''">
                            {{ props.row.attendance.absentDays }} 天
                            <q-chip v-if="props.row.attendance.absentDays > rates.absentThreshold" dense size="xs" color="negative" text-color="white" class="q-ml-xs">超過{{ rates.absentThreshold }}天</q-chip>
                          </span>
                        </q-item-section>
                      </q-item>
                      <q-item>
                        <q-item-section class="text-caption text-grey-7">實際出席天數</q-item-section>
                        <q-item-section side class="text-positive text-weight-bold text-caption">{{ props.row.attendance.attendDays }} 天</q-item-section>
                      </q-item>
                      <q-item>
                        <q-item-section class="text-caption text-grey-7">計費方式</q-item-section>
                        <q-item-section side class="text-caption">
                          <span v-if="props.row.attendance.absentDays <= rates.absentThreshold">
                            月費制 {{ props.row.settings.classType === 'full' ? `$${fmtNum(rates.fullFlat)}` : `$${fmtNum(rates.halfFlat)}` }}
                          </span>
                          <span v-else class="text-negative text-weight-bold">
                            {{ props.row.attendance.attendDays }} 天 × ${{ dailyRate(props.row) }} / 天 (按日計費)
                          </span>
                        </q-item-section>
                      </q-item>
                      <q-separator />
                      <q-item class="bg-blue-50">
                        <q-item-section class="text-subtitle2 text-weight-bold">應收學費</q-item-section>
                        <q-item-section side>
                          <span class="text-h5 text-primary text-weight-bold">${{ fmtNum(props.row.fee) }}</span>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-card>
                </div>

                <!-- 右：日曆 -->
                <div class="col-12 col-md-6 flex flex-column">
                  <div class="text-caption text-grey-7 text-weight-bold q-mb-sm">
                    <q-icon name="calendar_month" size="14px" class="q-mr-xs" />上課日曆與簽到
                  </div>
                  <q-card flat bordered class="q-pa-md col flex justify-center items-center">
                    <div class="attendance-calendar-container full-width">
                      <div class="text-caption text-grey-6 text-center q-mb-md">
                        點擊日期切換狀態：出席 (綠) ➔ 請假 (紅) ➔ 非上課日 (灰)
                      </div>
                      <div class="calendar-grid">
                        <div v-for="h in ['日', '一', '二', '三', '四', '五', '六']" :key="h" class="calendar-header-cell">
                          {{ h }}
                        </div>
                        <div
                          v-for="(cell, idx) in getMonthDays(selectedYear, selectedMonth)"
                          :key="idx"
                          class="calendar-day-cell"
                          :class="getDayClass(props.row.student.id, cell)"
                          @click="!cell.empty && toggleDay(props.row.student.id, cell.day)"
                        >
                          <div v-if="!cell.empty" class="day-number">{{ cell.day }}</div>
                          <div v-if="!cell.empty" class="day-status-icon">
                            <q-icon :name="getDayIcon(props.row.student.id, cell.day)" size="11px" />
                          </div>
                        </div>
                      </div>
                      <!-- Legend -->
                      <div class="row q-gutter-md justify-center q-mt-md text-caption text-grey-7">
                        <span class="flex items-center"><q-icon name="check_circle" color="positive" class="q-mr-xs"/>出席</span>
                        <span class="flex items-center"><q-icon name="cancel" color="negative" class="q-mr-xs"/>請假</span>
                        <span class="flex items-center"><q-icon name="do_not_disturb_on" color="grey-5" class="q-mr-xs"/>非上課日</span>
                      </div>
                    </div>
                  </q-card>
                </div>
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </template>

    <!-- ══════ 總計 ══════ -->
    <q-card flat bordered class="q-mb-xl">
      <q-card-section class="q-py-sm">
        <div class="row items-center">
          <div>
            <div class="text-subtitle2 text-grey-7">
              {{ selectedYear }}年{{ String(selectedMonth).padStart(2,'0') }}月 · {{ filteredRows.length }} 位學生
            </div>
            <div class="text-caption text-grey-5">學費總計</div>
          </div>
          <q-space />
          <div class="text-h5 text-weight-bold text-primary">${{ fmtNum(totalFee) }}</div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ══════════════════════════════════
         費率設定 Dialog
    ══════════════════════════════════ -->
    <q-dialog v-model="showRatesDialog" persistent>
      <q-card style="width: min(95vw, 420px)">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">費率設定</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <!-- 請假門檻 -->
          <div class="q-mb-md">
            <div class="text-caption text-grey-7 text-weight-bold q-mb-sm">按日計費門檻</div>
            <q-input
              v-model.number="rateForm.absentThreshold"
              label="請假超過幾天改按日計費"
              type="number" suffix="天"
              outlined dense
              hint="預設 7 天，超過此天數才按日計算"
              :rules="[v => v >= 0 || '請輸入正確天數']"
            />
          </div>

          <q-separator class="q-mb-md" />

          <!-- 全天班 -->
          <div class="row items-center q-mb-sm">
            <q-badge color="deep-purple" label="全天班" class="q-mr-sm" />
          </div>
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-12">
              <q-input
                v-model.number="rateForm.fullFlat"
                :label="`月費（請假 ≤ ${rateForm.absentThreshold} 天）`"
                type="number" prefix="$" suffix="/ 月"
                outlined dense
                :rules="[v => v > 0 || '請輸入正確金額']"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="rateForm.fullDaily"
                label="按日計費（不含餐）"
                type="number" prefix="$" suffix="/ 天"
                outlined dense
                :rules="[v => v > 0 || '請輸入正確金額']"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="rateForm.fullMealDaily"
                label="按日計費（含用餐）"
                type="number" prefix="$" suffix="/ 天"
                outlined dense
                :rules="[v => v > 0 || '請輸入正確金額']"
              />
            </div>
          </div>

          <q-separator class="q-mb-md" />

          <!-- 半天班 -->
          <div class="row items-center q-mb-sm">
            <q-badge color="teal" label="半天班" class="q-mr-sm" />
          </div>
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-12">
              <q-input
                v-model.number="rateForm.halfFlat"
                :label="`月費（請假 ≤ ${rateForm.absentThreshold} 天）`"
                type="number" prefix="$" suffix="/ 月"
                outlined dense
                :rules="[v => v > 0 || '請輸入正確金額']"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="rateForm.halfDaily"
                label="按日計費（不含餐）"
                type="number" prefix="$" suffix="/ 天"
                outlined dense
                :rules="[v => v > 0 || '請輸入正確金額']"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="rateForm.halfMealDaily"
                label="按日計費（含用餐）"
                type="number" prefix="$" suffix="/ 天"
                outlined dense
                :rules="[v => v > 0 || '請輸入正確金額']"
              />
            </div>
          </div>

          <div class="row justify-end q-gutter-sm">
            <q-btn flat label="取消" v-close-popup />
            <q-btn color="primary" label="儲存費率" icon="save" @click="saveRates" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import * as XLSX from 'xlsx'
import { studentService } from '../services/studentService'
import { tuitionService } from '../services/tuitionService'

const $q = useQuasar()

// ── 月份控制 ──
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

// ── 篩選 ──
const search        = ref('')
const selectedGrade = ref(null)

const gradeFilterOptions = [
  { label: '全部年級', value: null },
  ...[1,2,3,4,5,6,7,8,9].map(n => ({ label: `${n}年級`, value: n }))
]
const classTypeOptions = [
  { label: '全天班', value: 'full' },
  { label: '半天班', value: 'half' }
]

// ── 費率 ──
const SAVED_MONTHLY_RATES_KEY = 'linsanity_tuition_monthly_rates'
const defaultRates = {
  absentThreshold: 7,
  fullFlat:        10000,
  fullDaily:       400,
  fullMealDaily:   450,
  halfFlat:        5000,
  halfDaily:       200,
  halfMealDaily:   250
}

const allRates = ref({})

const rates = computed(() => {
  const mk = monthKey.value
  return allRates.value[mk] || defaultRates
})

const showRatesDialog = ref(false)
const rateForm = ref({ ...rates.value })

function openRatesDialog() {
  rateForm.value = { ...rates.value }
  showRatesDialog.value = true
}

function saveRates() {
  const mk = monthKey.value
  allRates.value[mk] = { ...rateForm.value }
  tuitionService.updateRates(mk, rateForm.value)
  localStorage.setItem(SAVED_MONTHLY_RATES_KEY, JSON.stringify(allRates.value))
  showRatesDialog.value = false
  $q.notify({ message: `已儲存 ${selectedYear.value}年${selectedMonth.value}月 的費率設定`, color: 'positive', icon: 'check' })
}

// ── 表格欄位 ──
const columns = [
  { name: 'grade',        label: '年級',     align: 'left',  sortable: true },
  { name: 'name',         label: '姓名',     align: 'left',  sortable: true },
  { name: 'classType',    label: '班別',     align: 'center' },
  { name: 'withMeal',     label: '用餐',     align: 'center' },
  { name: 'attendance',   label: '出席 / 請假', align: 'center' },
  { name: 'billingType',  label: '計費方式', align: 'center' },
  { name: 'fee',          label: '應收學費', align: 'right',  sortable: true },
  { name: 'expandBtn',    label: '',         align: 'center' }
]

// ── 資料 ──
const students   = ref([])
const settings   = ref({})
const attendance = ref({})

// ── 日曆輔助方法 ──
function getMonthDays(year, month) {
  const firstDay = new Date(year, month - 1, 1)
  const startDayOfWeek = firstDay.getDay()
  const totalDays = new Date(year, month, 0).getDate()
  
  const cells = []
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push({ empty: true })
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ empty: false, day: d })
  }
  return cells
}

function getStudentCalendar(studentId, monthKey) {
  if (!attendance.value) return {}
  if (!attendance.value[studentId]) {
    attendance.value[studentId] = {}
  }
  if (!attendance.value[studentId][monthKey]) {
    attendance.value[studentId][monthKey] = { totalDays: 22, absentDays: 0 }
  }
  
  const att = attendance.value[studentId][monthKey]
  
  if (!att.calendar) {
    const [yearStr, monthStr] = monthKey.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    const totalDaysInMonth = new Date(year, month, 0).getDate()
    
    const cal = {}
    const isMock = att.totalDays !== undefined && att.absentDays !== undefined
    if (isMock && (att.totalDays > 0 || att.absentDays > 0)) {
      const weekdays = []
      for (let d = 1; d <= totalDaysInMonth; d++) {
        const dayOfWeek = new Date(year, month - 1, d).getDay()
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          weekdays.push(d)
        }
      }
      for (let d = 1; d <= totalDaysInMonth; d++) {
        cal[d] = 'none'
      }
      
      let absCount = att.absentDays || 0
      let totalCount = att.totalDays || 22
      let presCount = Math.max(0, totalCount - absCount)
      
      let curIdx = 0
      for (let i = 0; i < absCount && curIdx < weekdays.length; i++) {
        cal[weekdays[curIdx++]] = 'absent'
      }
      for (let i = 0; i < presCount && curIdx < weekdays.length; i++) {
        cal[weekdays[curIdx++]] = 'present'
      }
    } else {
      for (let d = 1; d <= totalDaysInMonth; d++) {
        const dayOfWeek = new Date(year, month - 1, d).getDay()
        cal[d] = (dayOfWeek >= 1 && dayOfWeek <= 5) ? 'present' : 'none'
      }
    }
    
    att.calendar = cal
    
    let presentCount = 0
    let absentCount = 0
    Object.values(cal).forEach(status => {
      if (status === 'present') presentCount++
      if (status === 'absent') absentCount++
    })
    att.totalDays = presentCount + absentCount
    att.absentDays = absentCount
  }
  
  return att.calendar
}

function recalculateTotals(studentId, monthKey, triggerSave = true) {
  const att = attendance.value[studentId]?.[monthKey]
  if (!att || !att.calendar) return
  
  let presentCount = 0
  let absentCount = 0
  
  Object.values(att.calendar).forEach(status => {
    if (status === 'present') presentCount++
    if (status === 'absent') absentCount++
  })
  
  const totalDays = presentCount + absentCount
  const absentDays = absentCount
  
  att.totalDays = totalDays
  att.absentDays = absentDays
  
  if (triggerSave) {
    tuitionService.updateAttendance(studentId, monthKey, 'calendar', att.calendar)
    tuitionService.updateAttendance(studentId, monthKey, 'totalDays', totalDays)
    tuitionService.updateAttendance(studentId, monthKey, 'absentDays', absentDays)
  }
}

function toggleDay(studentId, dayNum) {
  const mk = monthKey.value
  const cal = getStudentCalendar(studentId, mk)
  if (!cal) return
  
  const current = cal[dayNum] || 'none'
  let next = 'present'
  if (current === 'present') next = 'absent'
  else if (current === 'absent') next = 'none'
  
  cal[dayNum] = next
  recalculateTotals(studentId, mk, true)
}

function getDayClass(studentId, cell) {
  if (cell.empty) return 'cell-empty'
  const mk = monthKey.value
  const cal = getStudentCalendar(studentId, mk)
  const status = cal[cell.day] || 'none'
  return `cell-${status}`
}

function getDayIcon(studentId, dayNum) {
  const mk = monthKey.value
  const cal = getStudentCalendar(studentId, mk)
  const status = cal[dayNum] || 'none'
  if (status === 'present') return 'check_circle'
  if (status === 'absent') return 'cancel'
  return 'do_not_disturb_on'
}

function initializeCalendars() {
  if (!students.value || !attendance.value) return
  const mk = monthKey.value
  students.value.forEach(student => {
    getStudentCalendar(student.id, mk)
  })
}

watch(monthKey, () => {
  initializeCalendars()
})

onMounted(async () => {
  const saved = localStorage.getItem(SAVED_MONTHLY_RATES_KEY)
  if (saved) {
    try {
      allRates.value = JSON.parse(saved)
    } catch (e) {
      console.error('Failed to parse saved monthly tuition rates:', e)
    }
  }
  students.value   = await studentService.getAll()
  const data       = await tuitionService.getAll()
  const serviceRates = data.rates || {}
  allRates.value = { ...serviceRates, ...allRates.value }
  settings.value   = data.settings
  attendance.value = data.attendance
  initializeCalendars()
})

// ── 計費 ──
function calcFee(classType, withMeal, totalDays, absentDays) {
  const attended = Math.max(0, totalDays - absentDays)
  const threshold = rates.value.absentThreshold
  if (classType === 'full') {
    if (absentDays > threshold) return attended * (withMeal ? rates.value.fullMealDaily : rates.value.fullDaily)
    return rates.value.fullFlat
  } else {
    if (absentDays > threshold) return attended * (withMeal ? rates.value.halfMealDaily : rates.value.halfDaily)
    return rates.value.halfFlat
  }
}

function dailyRate(row) {
  if (row.settings.classType === 'full') return row.settings.withMeal ? rates.value.fullMealDaily : rates.value.fullDaily
  return row.settings.withMeal ? rates.value.halfMealDaily : rates.value.halfDaily
}

// ── 組合列表 ──
const rows = computed(() =>
  students.value.map(student => {
    const s   = settings.value[student.id]   || { classType: 'full', withMeal: false }
    const att = attendance.value[student.id]?.[monthKey.value] || { totalDays: 22, absentDays: 0 }
    const attendDays = Math.max(0, att.totalDays - att.absentDays)
    return { student, settings: s, attendance: { ...att, attendDays }, fee: calcFee(s.classType, s.withMeal, att.totalDays, att.absentDays) }
  }).sort((a, b) =>
    a.student.grade !== b.student.grade
      ? a.student.grade - b.student.grade
      : a.student.name.localeCompare(b.student.name, 'zh-TW')
  )
)

const filteredRows = computed(() => {
  let list = rows.value
  if (selectedGrade.value !== null) list = list.filter(r => r.student.grade === selectedGrade.value)
  const q = search.value?.trim().toLowerCase()
  if (q) list = list.filter(r => r.student.name.toLowerCase().includes(q))
  return list
})

const totalFee = computed(() => filteredRows.value.reduce((s, r) => s + r.fee, 0))

// ── 更新設定 ──
function updateSetting(studentId, key, value) {
  if (!settings.value[studentId]) settings.value[studentId] = { classType: 'full', withMeal: false }
  settings.value[studentId] = { ...settings.value[studentId], [key]: value }
  tuitionService.updateSetting(studentId, key, value)
}


// ── 格式化 ──
function fmtNum(n) { return Number(n).toLocaleString('zh-TW') }

// ── 匯出 Excel ──
function exportExcel() {
  const mk = monthKey.value
  const data = filteredRows.value.map(r => ({
    '月份':       mk,
    '姓名':       r.student.name,
    '年級':       `${r.student.grade}年級`,
    '家長':       r.student.parentName,
    '電話':       r.student.phone,
    '班別':       r.settings.classType === 'full' ? '全天班' : '半天班',
    '用餐':       r.settings.withMeal ? '含用餐' : '不含用餐',
    '上課總天數': r.attendance.totalDays,
    '請假天數':   r.attendance.absentDays,
    '出席天數':   r.attendance.attendDays,
    '計費方式':   r.attendance.absentDays > rates.value.absentThreshold ? `按日計費（$${dailyRate(r)}/天）` : '月費制',
    '應收學費':   r.fee
  }))
  data.push({
    '月份': '', '姓名': `合計（${filteredRows.value.length} 位）`,
    '年級': '', '家長': '', '電話': '', '班別': '', '用餐': '',
    '上課總天數': '', '請假天數': '', '出席天數': '', '計費方式': '',
    '應收學費': totalFee.value
  })
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [10,8,7,8,13,8,10,12,10,10,18,10].map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `${selectedYear.value}年${String(selectedMonth.value).padStart(2,'0')}月學費`)
  XLSX.writeFile(wb, `寒暑假學費_${mk}.xlsx`)
  $q.notify({ message: `已匯出 ${mk} 學費表`, color: 'positive', icon: 'file_download' })
}
</script>

<style scoped>
.rate-block {
  background: #f3e5f5;
  border: 1px solid #e1bee7;
}
.rate-half {
  background: #e0f2f1;
  border: 1px solid #b2dfdb;
}

/* 簽到日曆樣式 */
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
  position: relative;
  min-height: 38px;
}
.calendar-day-cell:hover:not(.cell-empty) {
  filter: brightness(0.9);
}
.cell-empty {
  border: none;
  cursor: default;
  background: transparent;
}
.cell-present {
  background-color: #e8f5e9;
  border-color: #81c784;
  color: #2e7d32;
}
.cell-absent {
  background-color: #ffebee;
  border-color: #e57373;
  color: #c62828;
}
.cell-none {
  background-color: #fafafa;
  border-color: #e0e0e0;
  color: #9e9e9e;
}
.day-number {
  font-size: 12px;
  font-weight: bold;
}
.day-status-icon {
  margin-top: 2px;
  height: 12px;
}
.border-grey {
  border: 1px solid #e0e0e0;
}
</style>
