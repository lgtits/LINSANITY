<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />

    <!-- ══════════════════════════════════
         控制列
    ══════════════════════════════════ -->
    <!-- 第一行：月份導航 + 費率設定 -->
    <div class="row items-center q-mb-sm no-wrap">
      <q-btn flat round dense icon="chevron_left" @click="prevMonth" />
      <div class="text-subtitle1 text-weight-bold text-primary q-px-sm" style="min-width: 110px; text-align: center">
        {{ selectedYear }}年 {{ String(selectedMonth).padStart(2,'0') }}月
      </div>
      <q-btn flat round dense icon="chevron_right" @click="nextMonth" />
      <q-space />
      <q-btn v-if="enrollment !== null" flat dense icon="person_add" color="teal"
        label="更新學生" :loading="refreshingStudents"
        style="font-size: 13px" @click="refreshStudentList" />
      <q-btn flat dense icon="calculate" color="grey-7" label="費率說明"
        style="font-size: 13px" @click="showRatesInfoDialog = true" />
    </div>

    <!-- 第二行：篩選 + 匯出 -->
    <div class="row q-col-gutter-sm q-mb-md items-center">
      <div class="col-12 col-sm">
        <q-input v-model="search" placeholder="搜尋姓名..." outlined dense clearable>
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-12 col-sm-auto row items-center no-wrap q-gutter-xs">
        <q-select v-model="selectedGrade" :options="gradeFilterOptions" label="年級篩選"
          outlined dense emit-value map-options clearable style="min-width: 110px" />
        <q-select v-model="selectedClassType" :options="classTypeFilterOptions" label="班別"
          outlined dense emit-value map-options style="min-width: 100px" />
        <span class="text-body2 text-grey-7">共 {{ filteredRows.length }} 位</span>
        <q-btn outline dense icon="file_download" color="positive" label="匯出 Excel"
          style="font-size: 12px" @click="exportExcel" />
      </div>
    </div>

    <!-- ══════════ 計費說明 Dialog ══════════ -->
    <q-dialog v-model="showRatesInfoDialog">
      <q-card style="width: min(95vw, 520px)">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">計費說明</div>
          <div class="text-body2 text-grey-6 q-ml-sm">{{ selectedYear }}年{{ String(selectedMonth).padStart(2,'0') }}月</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <div v-if="!hasRates" class="text-center text-grey q-pa-md">
            <q-icon name="warning" color="orange-7" size="36px" class="q-mb-sm" /><br>
            <span class="text-body2">此月份尚未設定費率</span>
          </div>
          <template v-else>
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-list dense bordered class="rounded-borders">
                  <q-item dense class="bg-deep-purple-1">
                    <q-item-section><span class="text-body2 text-weight-bold text-deep-purple">全天班</span></q-item-section>
                  </q-item>
                  <q-item dense>
                    <q-item-section class="text-body2 text-grey-7">月費 不含餐</q-item-section>
                    <q-item-section side class="text-body2 text-weight-bold text-primary">${{ fmtNum(rates.fullFlat) }}</q-item-section>
                  </q-item>
                  <q-item dense>
                    <q-item-section class="text-body2 text-grey-7">月費 含用餐</q-item-section>
                    <q-item-section side class="text-body2 text-weight-bold text-primary">${{ fmtNum(rates.fullFlatMeal) }}</q-item-section>
                  </q-item>
                  <q-item dense>
                    <q-item-section class="text-body2 text-grey-7">按日（不含餐）</q-item-section>
                    <q-item-section side class="text-body2 text-weight-bold">${{ rates.fullDaily }} / 天</q-item-section>
                  </q-item>
                  <q-item dense>
                    <q-item-section class="text-body2 text-grey-7">按日（含用餐）</q-item-section>
                    <q-item-section side class="text-body2 text-weight-bold">${{ rates.fullMealDaily }} / 天</q-item-section>
                  </q-item>
                </q-list>
              </div>
              <div class="col-12 col-sm-6">
                <q-list dense bordered class="rounded-borders">
                  <q-item dense class="bg-teal-1">
                    <q-item-section><span class="text-body2 text-weight-bold text-teal">半天班</span></q-item-section>
                  </q-item>
                  <q-item dense>
                    <q-item-section class="text-body2 text-grey-7">月費 不含餐</q-item-section>
                    <q-item-section side class="text-body2 text-weight-bold text-primary">${{ fmtNum(rates.halfFlat) }}</q-item-section>
                  </q-item>
                  <q-item dense>
                    <q-item-section class="text-body2 text-grey-7">月費 含用餐</q-item-section>
                    <q-item-section side class="text-body2 text-weight-bold text-primary">${{ fmtNum(rates.halfFlatMeal) }}</q-item-section>
                  </q-item>
                  <q-item dense>
                    <q-item-section class="text-body2 text-grey-7">按日（不含餐）</q-item-section>
                    <q-item-section side class="text-body2 text-weight-bold">${{ rates.halfDaily }} / 天</q-item-section>
                  </q-item>
                  <q-item dense>
                    <q-item-section class="text-body2 text-grey-7">按日（含用餐）</q-item-section>
                    <q-item-section side class="text-body2 text-weight-bold">${{ rates.halfMealDaily }} / 天</q-item-section>
                  </q-item>
                </q-list>
              </div>
              <div class="col-12">
                <q-list dense bordered class="rounded-borders">
                  <q-item dense class="bg-orange-1">
                    <q-item-section><span class="text-body2 text-weight-bold text-orange-8">混合班</span></q-item-section>
                  </q-item>
                  <q-item dense>
                    <q-item-section class="text-body2 text-grey-7">全天日費</q-item-section>
                    <q-item-section side class="text-body2 text-weight-bold">${{ rates.mixedFullDaily }} / 天</q-item-section>
                  </q-item>
                  <q-item dense>
                    <q-item-section class="text-body2 text-grey-7">半天日費</q-item-section>
                    <q-item-section side class="text-body2 text-weight-bold">${{ rates.mixedHalfDaily }} / 天</q-item-section>
                  </q-item>
                </q-list>
              </div>
            </div>
            <div class="text-body2 text-grey-6 q-mt-sm">
              全天／半天班：請假超過 {{ rates.absentThreshold }} 天時改為按日計費；混合班固定按天計費
            </div>
            <!-- 附加活動說明 -->
            <div v-if="rates.extraActivities?.length" class="q-mt-md">
              <q-list dense bordered class="rounded-borders">
                <q-item dense class="bg-amber-1">
                  <q-item-section><span class="text-body2 text-weight-bold text-amber-9">附加活動（依學生勾選加收）</span></q-item-section>
                </q-item>
                <q-item v-for="ea in rates.extraActivities" :key="ea.id" dense>
                  <q-item-section class="text-body2 text-grey-7">
                    {{ ea.name }}
                    <q-badge v-if="ea.multiPerson" color="amber-8" class="q-ml-xs" label="多人" />
                  </q-item-section>
                  <q-item-section side class="text-body2 text-weight-bold">${{ fmtNum(ea.amount) }}{{ ea.multiPerson ? '/人' : '' }}</q-item-section>
                </q-item>
              </q-list>
            </div>
          </template>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn outline icon="tune" label="前往費率管理" color="primary"
            @click="showRatesInfoDialog = false; $router.push('/tuition/rates')" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 尚未設定費率的警告 -->
    <q-banner v-if="!loading && !hasRates" class="bg-warning-hint q-mb-md rounded-borders">
      <template #avatar><q-icon name="warning" color="orange-7" /></template>
      <div class="text-body2">
        <span class="text-weight-bold">{{ selectedYear }}年{{ String(selectedMonth).padStart(2,'0') }}月 尚未設定費率</span>，
        費用無法計算，請前往費率管理設定。
      </div>
      <template #action>
        <q-btn flat color="orange-9" label="前往設定" icon="tune"
          @click="$router.push('/tuition/rates')" />
      </template>
    </q-banner>

    <!-- 尚未建立名單時的提示 -->
    <q-card v-if="!loading && enrollment === null && !loadingMonth"
      flat bordered class="q-mb-md bg-info-hint">
      <q-card-section class="row items-center">
        <div class="col">
          <div class="text-subtitle2 text-weight-bold text-primary">
            {{ selectedYear }}年{{ String(selectedMonth).padStart(2,'0') }}月 尚未建立學生名單
          </div>
          <div class="text-body2 text-grey-7 q-mt-xs">
            點擊「載入學生」將目前在籍學生載入為本月名單，之後可調整個別學生設定
          </div>
        </div>
        <q-btn color="primary" icon="group_add" label="載入學生"
          class="q-ml-md" @click="loadStudentsForMonth" />
      </q-card-section>
    </q-card>

    <!-- ══════════════════════════════════
         手機：卡片清單 (與學生列表頁類似，更精簡)
    ══════════════════════════════════ -->
    <template v-if="$q.screen.lt.md && enrollment !== null">
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
                <span class="text-subtitle1 text-weight-bold">{{ row.student.name }}</span>
                <span class="text-body2 text-grey-6 q-ml-xs">{{ row.student.grade }}年級</span>
              </div>
              <div class="row items-center q-gutter-xs q-mt-xs">
                <q-badge
                  :color="row.settings.classType === 'full' ? 'deep-purple' : row.settings.classType === 'half' ? 'teal' : row.settings.classType === 'mixed' ? 'orange-8' : 'grey-6'"
                  :label="row.settings.classType === 'full' ? '全天班' : row.settings.classType === 'half' ? '半天班' : row.settings.classType === 'mixed' ? '混合班' : '不上課'" />
                <template v-if="row.settings.classType === 'mixed'">
                  <q-badge outline color="positive" :label="`全天 ${row.attendance.fullDays}天`" />
                  <q-badge outline color="teal" :label="`半天 ${row.attendance.halfDays}天`" />
                </template>
                <template v-else-if="row.settings.classType !== 'none'">
                  <q-badge :color="row.settings.withMeal ? 'orange-7' : 'grey-6'"
                    :label="row.settings.withMeal ? '含用餐' : '不含用餐'" />
                  <q-badge outline color="positive" :label="`出席 ${row.attendance.attendDays}天`" />
                  <q-badge outline :color="row.attendance.absentDays > (rates?.absentThreshold ?? Infinity) ? 'negative' : 'grey-6'" :label="`請假 ${row.attendance.absentDays}天`" />
                </template>
              </div>
            </q-item-section>
            <q-item-section side class="text-right">
              <template v-if="row.settings.classType !== 'none'">
                <div class="text-subtitle1 text-weight-bold" :class="hasRates ? 'text-primary' : 'text-grey-5'">
                  {{ row.fee !== null ? `$${fmtNum(row.fee)}` : 'N/A' }}
                </div>
                <div v-if="row.settings.classType === 'mixed'" class="text-body2 text-orange-8">按天計費</div>
                <div v-else class="text-body2" :class="hasRates && row.attendance.absentDays > rates?.absentThreshold ? 'text-negative text-weight-bold' : 'text-grey-5'">
                  {{ row.attendance.absentDays > (rates?.absentThreshold ?? Infinity) ? '按日計費' : '月費制' }}
                </div>
              </template>
              <template v-else-if="row.fee">
                <div class="text-subtitle1 text-weight-bold text-primary">${{ fmtNum(row.fee) }}</div>
                <div class="text-body2 text-amber-9">僅活動費</div>
              </template>
              <div v-else class="text-body2 text-grey-5">不計費</div>
            </q-item-section>
          </template>

          <!-- 展開：編輯與日曆 -->
          <div class="q-pa-md bg-subtle">
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
                <q-toggle v-if="row.settings.classType !== 'none' && row.settings.classType !== 'mixed'"
                  :model-value="row.settings.withMeal"
                  @update:model-value="v => updateSetting(row.student.id, 'withMeal', v)"
                  label="含用餐" color="orange-7"
                  checked-icon="restaurant" unchecked-icon="block"
                />
              </div>
            </div>

            <!-- 附加活動勾選（手機版） -->
            <div v-if="rates?.extraActivities?.length" class="q-mb-md">
              <div class="text-body2 text-grey-7 text-weight-bold q-mb-xs">
                <q-icon name="local_activity" size="14px" class="q-mr-xs" />附加活動
              </div>
              <q-card flat bordered class="q-pa-sm">
                <div v-for="ea in rates.extraActivities" :key="ea.id" class="q-py-xs">
                  <div class="row items-center no-wrap">
                    <q-checkbox
                      :model-value="getSelectedIds(row.settings.extraActivities).includes(ea.id)"
                      @update:model-value="v => toggleActivity(row.student.id, ea.id, v)"
                      color="amber-9" dense class="q-mr-xs"
                    />
                    <span class="text-body2">{{ ea.name }}</span>
                    <span class="text-body2 text-grey-6 q-ml-xs">${{ fmtNum(ea.amount) }}{{ ea.multiPerson ? '/人' : '' }}</span>
                    <q-space />
                    <q-input v-if="ea.multiPerson && getSelectedIds(row.settings.extraActivities).includes(ea.id)"
                      :model-value="(row.settings.extraActivities || []).find(i => i.id === ea.id)?.qty || 1"
                      @update:model-value="v => updateActivityQty(row.student.id, ea.id, Number(v))"
                      type="number" dense outlined input-class="text-center" suffix="人"
                      style="width: 80px; font-size: 13px" :min="1"
                    />
                  </div>
                </div>
              </q-card>
            </div>

            <!-- 日曆簽到（不上課時隱藏） -->
            <q-card v-if="row.settings.classType !== 'none'" flat bordered class="q-pa-sm q-mb-md">
              <div class="attendance-calendar-container full-width">
                <div class="text-caption text-grey-6 text-center q-mb-sm">
                  <template v-if="row.settings.classType === 'mixed'">
                    點擊切換：全天(綠) ➔ 半天(青) ➔ 請假(紅) ➔ 非上課日(灰)
                  </template>
                  <template v-else>
                    點擊日期切換：出席(綠) ➔ 請假(紅) ➔ 非上課日(灰)
                  </template>
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
                <div class="row q-gutter-sm justify-center q-mt-sm text-caption text-grey-7">
                  <template v-if="row.settings.classType === 'mixed'">
                    <span class="flex items-center"><q-icon name="check_circle" color="positive" class="q-mr-xs"/>全天</span>
                    <span class="flex items-center"><q-icon name="contrast" color="teal" class="q-mr-xs"/>半天</span>
                    <span class="flex items-center"><q-icon name="cancel" color="negative" class="q-mr-xs"/>請假</span>
                    <span class="flex items-center"><q-icon name="do_not_disturb_on" color="grey-5" class="q-mr-xs"/>非上課</span>
                  </template>
                  <template v-else>
                    <span class="flex items-center"><q-icon name="check_circle" color="positive" class="q-mr-xs"/>出席</span>
                    <span class="flex items-center"><q-icon name="cancel" color="negative" class="q-mr-xs"/>請假</span>
                    <span class="flex items-center"><q-icon name="do_not_disturb_on" color="grey-5" class="q-mr-xs"/>非上課日</span>
                  </template>
                </div>
              </div>
            </q-card>

            <!-- 費用統計明細 -->
            <q-card v-if="row.settings.classType !== 'none' || (row.settings.extraActivities || []).length" flat bordered class="q-pa-sm">
              <q-list dense separator>
                <template v-if="row.settings.classType !== 'none'">
                  <template v-if="row.settings.classType === 'mixed'">
                    <q-item>
                      <q-item-section class="text-body2 text-grey-7">全天班天數</q-item-section>
                      <q-item-section side class="text-body2 text-weight-bold text-positive">{{ row.attendance.fullDays }} 天</q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section class="text-body2 text-grey-7">半天班天數</q-item-section>
                      <q-item-section side class="text-body2 text-weight-bold text-teal">{{ row.attendance.halfDays }} 天</q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section class="text-body2 text-grey-7">計費方式</q-item-section>
                      <q-item-section side class="text-body2 text-orange-8">
                        <span v-if="!hasRates" class="text-grey-5">N/A</span>
                        <span v-else>全天{{ row.attendance.fullDays }}×${{ rates?.mixedFullDaily || 0 }} + 半天{{ row.attendance.halfDays }}×${{ rates?.mixedHalfDaily || 0 }}</span>
                      </q-item-section>
                    </q-item>
                  </template>
                  <template v-else>
                  <q-item>
                    <q-item-section class="text-body2 text-grey-7">上課天數統計</q-item-section>
                    <q-item-section side class="text-body2 text-weight-bold">
                      共 {{ row.attendance.totalDays }} 天 / 出席 {{ row.attendance.attendDays }} 天 / 請假 {{ row.attendance.absentDays }} 天
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section class="text-body2 text-grey-7">計費方式</q-item-section>
                    <q-item-section side class="text-body2">
                      <span v-if="row.attendance.absentDays <= (rates?.absentThreshold ?? Infinity)">
                        月費制 (請假 ≤ {{ rates?.absentThreshold }} 天)
                      </span>
                      <span v-else class="text-negative text-weight-bold">
                        按日計費 (出席 {{ row.attendance.attendDays }} 天 × ${{ dailyRate(row) }} / 天)
                      </span>
                    </q-item-section>
                  </q-item>
                  </template>
                </template>
                <!-- 附加活動明細（手機版） -->
                <template v-if="(row.settings.extraActivities || []).length">
                  <q-item v-for="item in row.settings.extraActivities" :key="item.id">
                    <q-item-section class="text-body2 text-amber-9">
                      {{ getActivityName(item.id) }}
                      <span v-if="isMultiPerson(item.id)" class="text-caption text-grey-6">× {{ item.qty || 1 }}人</span>
                    </q-item-section>
                    <q-item-section side class="text-body2 text-weight-bold">
                      +${{ fmtNum(getActivityAmount(item.id) * (isMultiPerson(item.id) ? (item.qty || 1) : 1)) }}
                    </q-item-section>
                  </q-item>
                </template>
                <q-separator class="q-my-xs" />
                <q-item class="bg-info-hint">
                  <q-item-section class="text-weight-bold">{{ row.settings.classType !== 'none' ? '應收學費' : '應收費用' }}</q-item-section>
                  <q-item-section side>
                    <span :class="row.fee !== null ? 'text-h6 text-primary text-weight-bold' : 'text-body2 text-grey-5'">
                      {{ row.fee !== null ? `$${fmtNum(row.fee)}` : 'N/A' }}
                    </span>
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
    <template v-else-if="enrollment !== null">
      <q-table
        :rows="filteredRows"
        :columns="columns"
        row-key="id"
        flat
        bordered
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
                :color="props.row.settings.classType === 'full' ? 'deep-purple' : props.row.settings.classType === 'half' ? 'teal' : props.row.settings.classType === 'mixed' ? 'orange-8' : 'grey-6'"
                :label="props.row.settings.classType === 'full' ? '全天班' : props.row.settings.classType === 'half' ? '半天班' : props.row.settings.classType === 'mixed' ? '混合班' : '不上課'" />
            </q-td>
            <q-td key="withMeal" :props="props" class="text-center">
              <span v-if="props.row.settings.classType === 'none' || props.row.settings.classType === 'mixed'" class="text-grey-5">—</span>
              <q-badge v-else
                :color="props.row.settings.withMeal ? 'orange-7' : 'grey-6'"
                :label="props.row.settings.withMeal ? '含用餐' : '不含用餐'" />
            </q-td>
            <q-td key="attendance" :props="props" class="text-center">
              <template v-if="props.row.settings.classType === 'mixed'">
                <span class="text-positive text-weight-bold">全{{ props.row.attendance.fullDays }}</span>
                <span class="text-grey-4"> / </span>
                <span class="text-teal text-weight-bold">半{{ props.row.attendance.halfDays }}</span>
                <span class="text-caption text-grey-5"> 天</span>
              </template>
              <template v-else-if="props.row.settings.classType !== 'none'">
                <span class="text-positive text-weight-bold">{{ props.row.attendance.attendDays }}</span>
                <span class="text-grey-4"> / </span>
                <span :class="props.row.attendance.absentDays > (rates?.absentThreshold ?? Infinity) ? 'text-negative text-weight-bold' : 'text-grey-6'">
                  {{ props.row.attendance.absentDays }}
                </span>
                <span class="text-caption text-grey-5"> 天</span>
              </template>
              <span v-else class="text-grey-5">—</span>
            </q-td>
            <q-td key="billingType" :props="props" class="text-center">
              <span v-if="props.row.settings.classType === 'mixed'" class="text-orange-8 text-weight-bold">按天計費</span>
              <span v-else-if="props.row.settings.classType !== 'none'"
                :class="props.row.attendance.absentDays > (rates?.absentThreshold ?? Infinity) ? 'text-negative text-weight-bold' : 'text-grey-6'">
                {{ props.row.attendance.absentDays > (rates?.absentThreshold ?? Infinity) ? '按日計費' : '月費制' }}
              </span>
              <span v-else class="text-grey-5">—</span>
            </q-td>
            <q-td key="fee" :props="props" class="text-right text-subtitle2 text-weight-bold"
              :class="props.row.fee ? 'text-primary' : 'text-grey-5'">
              {{ props.row.settings.classType === 'none' && !props.row.fee ? '不計費' : props.row.fee !== null ? `$${fmtNum(props.row.fee)}` : 'N/A' }}
            </q-td>
            <q-td key="expandBtn" :props="props" class="text-center">
              <q-btn flat round dense :icon="props.expand ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" size="sm" />
            </q-td>
          </q-tr>

          <!-- 展開內容 -->
          <q-tr v-show="props.expand" :props="props">
            <q-td colspan="100%" class="bg-subtle q-pa-md">
              <div class="row q-col-gutter-md">
                <!-- 左：設定與明細 -->
                <div class="col-12 col-md-6">
                  <div class="text-body2 text-grey-7 text-weight-bold q-mb-sm">
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
                        <q-toggle v-if="props.row.settings.classType !== 'none' && props.row.settings.classType !== 'mixed'"
                          :model-value="props.row.settings.withMeal"
                          @update:model-value="v => updateSetting(props.row.student.id, 'withMeal', v)"
                          label="含用餐" color="orange-7"
                          checked-icon="restaurant" unchecked-icon="block"
                        />
                      </div>
                    </div>
                  </q-card>

                  <!-- 附加活動勾選 -->
                  <div v-if="rates?.extraActivities?.length" class="q-mb-md">
                    <div class="text-body2 text-grey-7 text-weight-bold q-mb-sm">
                      <q-icon name="local_activity" size="14px" class="q-mr-xs" />附加活動
                    </div>
                    <q-card flat bordered class="q-pa-sm">
                      <div v-for="ea in rates.extraActivities" :key="ea.id" class="q-py-xs">
                        <div class="row items-center no-wrap">
                          <q-checkbox
                            :model-value="getSelectedIds(props.row.settings.extraActivities).includes(ea.id)"
                            @update:model-value="v => toggleActivity(props.row.student.id, ea.id, v)"
                            color="amber-9" dense class="q-mr-xs"
                          />
                          <span class="text-body2">{{ ea.name }}</span>
                          <span class="text-body2 text-grey-6 q-ml-xs">${{ fmtNum(ea.amount) }}{{ ea.multiPerson ? '/人' : '' }}</span>
                          <q-space />
                          <q-input v-if="ea.multiPerson && getSelectedIds(props.row.settings.extraActivities).includes(ea.id)"
                            :model-value="(props.row.settings.extraActivities || []).find(i => i.id === ea.id)?.qty || 1"
                            @update:model-value="v => updateActivityQty(props.row.student.id, ea.id, Number(v))"
                            type="number" dense outlined input-class="text-center" suffix="人"
                            style="width: 80px; font-size: 13px" :min="1"
                          />
                        </div>
                      </div>
                    </q-card>
                  </div>

                  <template v-if="props.row.settings.classType !== 'none'">
                  <div class="text-body2 text-grey-7 text-weight-bold q-mb-sm">
                    <q-icon name="receipt_long" size="14px" class="q-mr-xs" />出席統計與費用明細
                  </div>
                  <q-card flat bordered>
                    <q-list dense separator>
                      <template v-if="props.row.settings.classType === 'mixed'">
                        <q-item>
                          <q-item-section class="text-body2 text-grey-7">全天班天數</q-item-section>
                          <q-item-section side class="text-positive text-weight-bold text-body2">{{ props.row.attendance.fullDays }} 天</q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section class="text-body2 text-grey-7">半天班天數</q-item-section>
                          <q-item-section side class="text-teal text-weight-bold text-body2">{{ props.row.attendance.halfDays }} 天</q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section class="text-body2 text-grey-7">請假天數</q-item-section>
                          <q-item-section side class="text-body2">{{ props.row.attendance.absentDays }} 天</q-item-section>
                        </q-item>
                        <q-item>
                          <q-item-section class="text-body2 text-grey-7">計費方式</q-item-section>
                          <q-item-section side class="text-body2 text-orange-8">
                            <span v-if="!hasRates" class="text-grey-5">N/A（未設定費率）</span>
                            <span v-else>全天{{ props.row.attendance.fullDays }}×${{ rates.mixedFullDaily||0 }} + 半天{{ props.row.attendance.halfDays }}×${{ rates.mixedHalfDaily||0 }}</span>
                          </q-item-section>
                        </q-item>
                      </template>
                      <template v-else>
                      <q-item>
                        <q-item-section class="text-body2 text-grey-7">上課總天數 (出席 + 請假)</q-item-section>
                        <q-item-section side class="text-body2 text-weight-bold">{{ props.row.attendance.totalDays }} 天</q-item-section>
                      </q-item>
                      <q-item>
                        <q-item-section class="text-body2 text-grey-7">請假天數</q-item-section>
                        <q-item-section side class="text-body2">
                          <span :class="props.row.attendance.absentDays > (rates?.absentThreshold ?? Infinity) ? 'text-negative text-weight-bold' : ''">
                            {{ props.row.attendance.absentDays }} 天
                            <q-chip v-if="props.row.attendance.absentDays > (rates?.absentThreshold ?? Infinity)" dense size="xs" color="negative" text-color="white" class="q-ml-xs">超過{{ rates?.absentThreshold }}天</q-chip>
                          </span>
                        </q-item-section>
                      </q-item>
                      <q-item>
                        <q-item-section class="text-body2 text-grey-7">實際出席天數</q-item-section>
                        <q-item-section side class="text-positive text-weight-bold text-body2">{{ props.row.attendance.attendDays }} 天</q-item-section>
                      </q-item>
                      <q-item>
                        <q-item-section class="text-body2 text-grey-7">計費方式</q-item-section>
                        <q-item-section side class="text-body2">
                          <span v-if="!hasRates" class="text-grey-5">N/A（未設定費率）</span>
                          <span v-else-if="props.row.attendance.absentDays <= (rates?.absentThreshold ?? Infinity)">
                            月費制 ${{ props.row.settings.classType === 'full'
                              ? fmtNum(props.row.settings.withMeal ? rates.fullFlatMeal : rates.fullFlat)
                              : fmtNum(props.row.settings.withMeal ? rates.halfFlatMeal : rates.halfFlat) }}
                          </span>
                          <span v-else class="text-negative text-weight-bold">
                            {{ props.row.attendance.attendDays }} 天 × ${{ dailyRate(props.row) }} / 天 (按日計費)
                          </span>
                        </q-item-section>
                      </q-item>
                      </template>
                      <!-- 附加活動明細 -->
                      <template v-if="(props.row.settings.extraActivities || []).length">
                        <q-item v-for="item in props.row.settings.extraActivities" :key="item.id">
                          <q-item-section class="text-body2 text-amber-9">
                            {{ getActivityName(item.id) }}
                            <span v-if="isMultiPerson(item.id)" class="text-caption text-grey-6">× {{ item.qty || 1 }}人</span>
                          </q-item-section>
                          <q-item-section side class="text-body2 text-weight-bold">
                            +${{ fmtNum(getActivityAmount(item.id) * (isMultiPerson(item.id) ? (item.qty || 1) : 1)) }}
                          </q-item-section>
                        </q-item>
                      </template>
                      <q-separator />
                      <q-item class="bg-info-hint">
                        <q-item-section class="text-subtitle2 text-weight-bold">應收學費</q-item-section>
                        <q-item-section side>
                          <span :class="props.row.fee !== null ? 'text-h5 text-primary text-weight-bold' : 'text-body2 text-grey-5'">
                            {{ props.row.fee !== null ? `$${fmtNum(props.row.fee)}` : 'N/A' }}
                          </span>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-card>
                  </template>

                  <!-- 不上課但有附加活動時顯示費用 -->
                  <template v-if="props.row.settings.classType === 'none' && (props.row.settings.extraActivities || []).length">
                    <div class="text-body2 text-grey-7 text-weight-bold q-mb-sm">
                      <q-icon name="receipt_long" size="14px" class="q-mr-xs" />費用明細
                    </div>
                    <q-card flat bordered>
                      <q-list dense separator>
                        <q-item v-for="item in props.row.settings.extraActivities" :key="item.id">
                          <q-item-section class="text-body2 text-amber-9">
                            {{ getActivityName(item.id) }}
                            <span v-if="isMultiPerson(item.id)" class="text-caption text-grey-6">× {{ item.qty || 1 }}人</span>
                          </q-item-section>
                          <q-item-section side class="text-body2 text-weight-bold">${{ fmtNum(getActivityAmount(item.id) * (item.qty || 1)) }}</q-item-section>
                        </q-item>
                        <q-separator />
                        <q-item class="bg-info-hint">
                          <q-item-section class="text-subtitle2 text-weight-bold">應收費用</q-item-section>
                          <q-item-section side>
                            <span class="text-h5 text-primary text-weight-bold">${{ fmtNum(props.row.fee) }}</span>
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-card>
                  </template>
                </div>

                <!-- 右：日曆（不上課時隱藏） -->
                <div v-if="props.row.settings.classType !== 'none'" class="col-12 col-md-6 flex flex-column">
                  <div class="text-body2 text-grey-7 text-weight-bold q-mb-sm">
                    <q-icon name="calendar_month" size="14px" class="q-mr-xs" />預計上課安排
                  </div>
                  <q-card flat bordered class="q-pa-md col flex justify-center items-center">
                    <div class="attendance-calendar-container full-width">
                      <div class="text-caption text-grey-6 text-center q-mb-md">
                        <template v-if="props.row.settings.classType === 'mixed'">
                          點擊切換：全天(綠) ➔ 半天(青) ➔ 請假(紅) ➔ 非上課日(灰)
                        </template>
                        <template v-else>
                          點擊日期切換狀態：出席 (綠) ➔ 請假 (紅) ➔ 非上課日 (灰)
                        </template>
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
                        <template v-if="props.row.settings.classType === 'mixed'">
                          <span class="flex items-center"><q-icon name="check_circle" color="positive" class="q-mr-xs"/>全天</span>
                          <span class="flex items-center"><q-icon name="contrast" color="teal" class="q-mr-xs"/>半天</span>
                          <span class="flex items-center"><q-icon name="cancel" color="negative" class="q-mr-xs"/>請假</span>
                          <span class="flex items-center"><q-icon name="do_not_disturb_on" color="grey-5" class="q-mr-xs"/>非上課日</span>
                        </template>
                        <template v-else>
                          <span class="flex items-center"><q-icon name="check_circle" color="positive" class="q-mr-xs"/>出席</span>
                          <span class="flex items-center"><q-icon name="cancel" color="negative" class="q-mr-xs"/>請假</span>
                          <span class="flex items-center"><q-icon name="do_not_disturb_on" color="grey-5" class="q-mr-xs"/>非上課日</span>
                        </template>
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
          <div :class="totalFee !== null ? 'text-h5 text-weight-bold text-primary' : 'text-body2 text-grey-5'">
            {{ totalFee !== null ? `$${fmtNum(totalFee)}` : 'N/A（未設定費率）' }}
          </div>
        </div>
      </q-card-section>
    </q-card>


  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter, useRoute } from 'vue-router'
import * as XLSX from 'xlsx'
import { studentService } from '../services/studentService'
import { tuitionService } from '../services/tuitionService'

const $q = useQuasar()
const $router = useRouter()
const route = useRoute()
const loading = ref(true)
const refreshingStudents = ref(false)

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
const selectedClassType = ref('all')

const classTypeFilterOptions = [
  { label: '全部班別', value: 'all' },
  { label: '全天班',   value: 'full' },
  { label: '半天班',   value: 'half' },
  { label: '混合班',   value: 'mixed' },
  { label: '不上課',   value: 'none' }
]

const gradeFilterOptions = [
  { label: '全部年級', value: null },
  ...[1,2,3,4,5,6,7,8,9].map(n => ({ label: `${n}年級`, value: n }))
]
const classTypeOptions = [
  { label: '全天班', value: 'full' },
  { label: '半天班', value: 'half' },
  { label: '混合班', value: 'mixed' },
  { label: '不上課', value: 'none' }
]

// ── 費率 ──
const allRates = ref({})

const rates = computed(() => allRates.value[monthKey.value] || null)
const hasRates = computed(() => rates.value !== null)

const showRatesInfoDialog = ref(false)

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
const allStudents  = ref([])   // 目前在籍學生（用於建立名單）
const enrollment   = ref(null) // 當月報名學生 { studentId: { classType, withMeal } }，null = 尚未建立
const attendance   = ref({})   // 當月出席記錄 { studentId: { totalDays, absentDays, calendar } }
const loadingMonth = ref(false)

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

function getStudentCalendar(studentId) {
  if (!attendance.value[studentId]) {
    attendance.value[studentId] = { totalDays: 22, absentDays: 0 }
  }
  const att = attendance.value[studentId]
  
  if (!att.calendar) {
    const year = selectedYear.value
    const month = selectedMonth.value
    const totalDaysInMonth = new Date(year, month, 0).getDate()
    
    const classType = enrollment.value[studentId]?.classType
    const cal = {}
    if (classType === 'mixed') {
      for (let d = 1; d <= totalDaysInMonth; d++) cal[d] = 'none'
    } else {
      const isMock = att.totalDays !== undefined && att.absentDays !== undefined
      if (isMock && (att.totalDays > 0 || att.absentDays > 0)) {
        const weekdays = []
        for (let d = 1; d <= totalDaysInMonth; d++) {
          const dayOfWeek = new Date(year, month - 1, d).getDay()
          if (dayOfWeek >= 1 && dayOfWeek <= 5) weekdays.push(d)
        }
        for (let d = 1; d <= totalDaysInMonth; d++) cal[d] = 'none'
        let absCount = att.absentDays || 0
        let totalCount = att.totalDays || 22
        let presCount = Math.max(0, totalCount - absCount)
        let curIdx = 0
        for (let i = 0; i < absCount && curIdx < weekdays.length; i++) cal[weekdays[curIdx++]] = 'absent'
        for (let i = 0; i < presCount && curIdx < weekdays.length; i++) cal[weekdays[curIdx++]] = 'present'
      } else {
        for (let d = 1; d <= totalDaysInMonth; d++) {
          const dayOfWeek = new Date(year, month - 1, d).getDay()
          cal[d] = (dayOfWeek >= 1 && dayOfWeek <= 5) ? 'present' : 'none'
        }
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

function recalculateTotals(studentId, triggerSave = true) {
  const att = attendance.value[studentId]
  if (!att || !att.calendar) return
  const classType = enrollment.value[studentId]?.classType
  let presentCount = 0, absentCount = 0
  Object.values(att.calendar).forEach(s => {
    if (classType === 'mixed') {
      if (s === 'full' || s === 'half') presentCount++
      else if (s === 'leave') absentCount++
    } else {
      if (s === 'present') presentCount++
      else if (s === 'absent') absentCount++
    }
  })
  att.totalDays = presentCount + absentCount
  att.absentDays = absentCount
  if (triggerSave) {
    const mk = monthKey.value
    tuitionService.updateAttendance(mk, studentId, 'calendar', att.calendar)
    tuitionService.updateAttendance(mk, studentId, 'totalDays', att.totalDays)
    tuitionService.updateAttendance(mk, studentId, 'absentDays', att.absentDays)
  }
}

function toggleDay(studentId, dayNum) {
  const cal = getStudentCalendar(studentId)
  if (!cal) return
  const classType = enrollment.value[studentId]?.classType
  const current = cal[dayNum] || 'none'
  if (classType === 'mixed') {
    cal[dayNum] = current === 'full' ? 'half' : current === 'half' ? 'leave' : current === 'leave' ? 'none' : 'full'
  } else {
    cal[dayNum] = current === 'present' ? 'absent' : current === 'absent' ? 'none' : 'present'
  }
  recalculateTotals(studentId, true)
}

function getDayClass(studentId, cell) {
  if (cell.empty) return 'cell-empty'
  const cal = getStudentCalendar(studentId)
  const s = cal[cell.day] || 'none'
  const classType = enrollment.value[studentId]?.classType
  if (classType === 'mixed') {
    if (s === 'full') return 'cell-present'
    if (s === 'half') return 'cell-half'
    if (s === 'leave') return 'cell-absent'
    return 'cell-none'
  }
  return `cell-${s}`
}

function getDayIcon(studentId, dayNum) {
  const cal = getStudentCalendar(studentId)
  const s = cal[dayNum] || 'none'
  if (s === 'present' || s === 'full') return 'check_circle'
  if (s === 'absent' || s === 'leave') return 'cancel'
  if (s === 'half') return 'contrast'
  return 'do_not_disturb_on'
}

function initializeCalendars() {
  if (!enrollment.value) return
  Object.keys(enrollment.value).forEach(sid => getStudentCalendar(sid))
}

async function loadMonth(mk) {
  loadingMonth.value = true
  attendance.value = {}
  enrollment.value = null
  const [enr, att] = await Promise.all([
    tuitionService.getEnrollment(mk),
    tuitionService.getAttendance(mk)
  ])
  enrollment.value = enr
  attendance.value = att
  if (enrollment.value) initializeCalendars()
  loadingMonth.value = false
}

watch(monthKey, loadMonth)

// 從費率管理返回時，強制重新載入費率（避免 bfcache 或 HMR 保留舊狀態）
watch(() => route.path, async (newPath, oldPath) => {
  if (newPath === '/tuition' && oldPath?.startsWith('/tuition/')) {
    allRates.value = await tuitionService.getRates()
  }
})

onMounted(async () => {
  try {
    const mk = monthKey.value
    const [fetchedStudents, fetchedRates, enr, att] = await Promise.all([
      studentService.getAll(),
      tuitionService.getRates(),
      tuitionService.getEnrollment(mk),
      tuitionService.getAttendance(mk)
    ])
    allStudents.value = fetchedStudents
    allRates.value    = fetchedRates
    enrollment.value  = enr
    attendance.value  = att
    if (enrollment.value) initializeCalendars()
  } finally {
    loading.value = false
  }
})

// ── 計費 ──
function calcTuitionBase(classType, withMeal, totalDays, absentDays, calendar) {
  if (!rates.value) return null
  if (classType === 'none') return 0
  if (classType === 'mixed') {
    if (!calendar) return null
    const vals = Object.values(calendar)
    const fullDays = vals.filter(s => s === 'full').length
    const halfDays = vals.filter(s => s === 'half').length
    return fullDays * (rates.value.mixedFullDaily || 0) + halfDays * (rates.value.mixedHalfDaily || 0)
  }
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

function calcExtraFee(selectedItems) {
  if (!rates.value?.extraActivities?.length || !selectedItems?.length) return 0
  return selectedItems.reduce((sum, item) => {
    const def = rates.value.extraActivities.find(ea => ea.id === item.id)
    if (!def) return sum
    const qty = def.multiPerson ? (item.qty || 1) : 1
    return sum + def.amount * qty
  }, 0)
}

function calcFee(classType, withMeal, totalDays, absentDays, selectedActivityIds, calendar) {
  const base = calcTuitionBase(classType, withMeal, totalDays, absentDays, calendar)
  if (base === null) return null
  return base + calcExtraFee(selectedActivityIds)
}

function dailyRate(row) {
  if (!rates.value || row.settings.classType === 'mixed') return null
  if (row.settings.classType === 'full') return row.settings.withMeal ? rates.value.fullMealDaily : rates.value.fullDaily
  return row.settings.withMeal ? rates.value.halfMealDaily : rates.value.halfDaily
}

function getActivityDef(id) {
  return rates.value?.extraActivities?.find(ea => ea.id === id)
}

function getActivityName(id) {
  return getActivityDef(id)?.name || id
}

function getActivityAmount(id) {
  return getActivityDef(id)?.amount || 0
}

function isMultiPerson(id) {
  return getActivityDef(id)?.multiPerson || false
}

function getSelectedIds(items) {
  return (items || []).map(i => i.id)
}

function normalizeActivities(items) {
  if (!items?.length || !rates.value?.extraActivities) return items || []
  return items
    .filter(item => rates.value.extraActivities.some(ea => ea.id === item.id))
    .map(item => {
      const def = rates.value.extraActivities.find(ea => ea.id === item.id)
      return def.multiPerson ? item : { ...item, qty: 1 }
    })
}

function toggleActivity(studentId, activityId, checked) {
  const current = [...(enrollment.value[studentId].extraActivities || [])]
  if (checked) {
    current.push({ id: activityId, qty: 1 })
  } else {
    const idx = current.findIndex(i => i.id === activityId)
    if (idx >= 0) current.splice(idx, 1)
  }
  enrollment.value[studentId] = { ...enrollment.value[studentId], extraActivities: current }
  tuitionService.updateEnrollmentSetting(monthKey.value, studentId, 'extraActivities', current)
}

function updateActivityQty(studentId, activityId, qty) {
  const current = [...(enrollment.value[studentId].extraActivities || [])]
  const item = current.find(i => i.id === activityId)
  if (item) item.qty = Math.max(1, qty)
  enrollment.value[studentId] = { ...enrollment.value[studentId], extraActivities: current }
  tuitionService.updateEnrollmentSetting(monthKey.value, studentId, 'extraActivities', current)
}

// ── 組合列表 ──
const rows = computed(() => {
  if (!enrollment.value) return []
  return Object.entries(enrollment.value)
    .map(([studentId, s]) => {
      const student = allStudents.value.find(x => x.id === studentId)
      if (!student) return null
      const att = attendance.value[studentId] || { totalDays: 22, absentDays: 0 }
      const attendDays = Math.max(0, att.totalDays - att.absentDays)
      const normalizedSettings = { ...s, extraActivities: normalizeActivities(s.extraActivities) }
      const cal = att.calendar || {}
      const fullDays = Object.values(cal).filter(v => v === 'full').length
      const halfDays = Object.values(cal).filter(v => v === 'half').length
      return { id: studentId, student, settings: normalizedSettings, attendance: { ...att, attendDays, fullDays, halfDays }, fee: calcFee(s.classType, s.withMeal, att.totalDays, att.absentDays, normalizedSettings.extraActivities, cal) }
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

const totalFee = computed(() =>
  hasRates.value
    ? filteredRows.value.reduce((s, r) => s + (r.fee ?? 0), 0)
    : null
)

// ── 更新報名設定 ──
function updateSetting(studentId, key, value) {
  if (!enrollment.value?.[studentId]) return
  enrollment.value[studentId] = { ...enrollment.value[studentId], [key]: value }
  tuitionService.updateEnrollmentSetting(monthKey.value, studentId, key, value)
}

// ── 載入學生建立名單 ──
async function loadStudentsForMonth() {
  const mk = monthKey.value
  const defaultEnrollment = {}
  allStudents.value.forEach(s => {
    defaultEnrollment[s.id] = { classType: 'none', withMeal: false, extraActivities: [] }  // extraActivities: [{ id, qty }]
  })
  await tuitionService.createEnrollment(mk, defaultEnrollment)
  enrollment.value = { ...defaultEnrollment }
  initializeCalendars()
  $q.notify({ message: `已載入 ${allStudents.value.length} 位學生`, color: 'positive', icon: 'group' })
}

async function refreshStudentList() {
  refreshingStudents.value = true
  try {
    const mk = monthKey.value
    const freshStudents = await studentService.getAll()
    allStudents.value = freshStudents
    const newStudents = freshStudents.filter(s => !enrollment.value[s.id])
    if (!newStudents.length) {
      $q.notify({ message: '沒有新學生需要加入', color: 'info', icon: 'info' })
      return
    }
    for (const s of newStudents) {
      const defaults = { classType: 'none', withMeal: false, extraActivities: [] }
      await tuitionService.addToEnrollment(mk, s.id, defaults)
      enrollment.value[s.id] = defaults
      attendance.value[s.id] = attendance.value[s.id] || { totalDays: 22, absentDays: 0 }
      getStudentCalendar(s.id)
    }
    $q.notify({ message: `已新增 ${newStudents.length} 位學生`, color: 'positive', icon: 'person_add' })
  } finally {
    refreshingStudents.value = false
  }
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
    '班別':       r.settings.classType === 'full' ? '全天班' : r.settings.classType === 'half' ? '半天班' : r.settings.classType === 'mixed' ? '混合班' : '不上課',
    '用餐':       r.settings.classType === 'mixed' ? '—' : r.settings.withMeal ? '含用餐' : '不含用餐',
    '上課總天數': r.settings.classType === 'mixed' ? `全天${r.attendance.fullDays}+半天${r.attendance.halfDays}` : r.attendance.totalDays,
    '請假天數':   r.settings.classType === 'mixed' ? r.attendance.absentDays : r.attendance.absentDays,
    '出席天數':   r.settings.classType === 'mixed' ? r.attendance.fullDays + r.attendance.halfDays : r.attendance.attendDays,
    '計費方式':   r.settings.classType === 'mixed'
      ? `混合班 全天${r.attendance.fullDays}×$${rates.value?.mixedFullDaily||0}+半天${r.attendance.halfDays}×$${rates.value?.mixedHalfDaily||0}`
      : (!rates.value ? 'N/A' : r.attendance.absentDays > rates.value.absentThreshold ? `按日計費（$${dailyRate(r)}/天）` : '月費制'),
    '附加活動':   (r.settings.extraActivities || []).map(item => {
      const ea = rates.value?.extraActivities?.find(a => a.id === item.id)
      if (!ea) return ''
      return ea.multiPerson ? `${ea.name}($${ea.amount}/人×${item.qty || 1})` : `${ea.name}($${ea.amount})`
    }).filter(Boolean).join('、') || '無',
    '附加活動費': calcExtraFee(r.settings.extraActivities),
    '應收學費':   r.fee
  }))
  data.push({
    '月份': '', '姓名': `合計（${filteredRows.value.length} 位）`,
    '年級': '', '家長': '', '電話': '', '班別': '', '用餐': '',
    '上課總天數': '', '請假天數': '', '出席天數': '', '計費方式': '',
    '附加活動': '', '附加活動費': '',
    '應收學費': totalFee.value
  })
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [10,8,7,8,13,8,10,12,10,10,18,14,12,10].map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `${selectedYear.value}年${String(selectedMonth.value).padStart(2,'0')}月學費`)
  XLSX.writeFile(wb, `寒暑假學費_${mk}.xlsx`)
  $q.notify({ message: `已匯出 ${mk} 學費表`, color: 'positive', icon: 'file_download' })
}
</script>

<style scoped>

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
.cell-present { background-color: #e8f5e9; border-color: #81c784; color: #2e7d32; }
.cell-half    { background-color: #e0f7fa; border-color: #4dd0e1; color: #00838f; }
.cell-absent  { background-color: #ffebee; border-color: #e57373; color: #c62828; }
.cell-none    { background-color: #fafafa; border-color: #e0e0e0; color: #9e9e9e; }
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

<style>
body.body--dark .calendar-header-cell { color: #b0b3b8; }
body.body--dark .calendar-day-cell { border-color: #3a3b3c; }
body.body--dark .cell-present { background-color: #2d3b2d; border-color: #4a7a4a; color: #8bc48b; }
body.body--dark .cell-half    { background-color: #1a3038; border-color: #2a7a8a; color: #4dd0e1; }
body.body--dark .cell-absent  { background-color: #3b2626; border-color: #7a3b3b; color: #e08080; }
body.body--dark .cell-none    { background-color: #303132; border-color: #3a3b3c; color: #6b6d70; }
body.body--dark .border-grey  { border-color: #3a3b3c; }
</style>
