<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />

    <!-- 篩選 -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="q-pa-sm">
        <div class="row q-col-gutter-xs items-end">
          <div class="col-12 col-sm-3">
            <q-input v-model="nameSearch" label="搜尋收件人" outlined dense clearable>
              <template #prepend><q-icon name="search" size="sm" /></template>
            </q-input>
          </div>
          <div class="col-6 col-sm-2">
            <q-select
              v-model="typeFilter"
              :options="typeOptions"
              label="類型"
              outlined dense clearable
              emit-value map-options
            />
          </div>
          <div class="col-6 col-sm-2">
            <q-input v-model="dateFrom" type="date" label="從" outlined dense clearable />
          </div>
          <div class="col-6 col-sm-2">
            <q-input v-model="dateTo" type="date" label="至" outlined dense clearable />
          </div>
          <div class="col-6 col-sm-3">
            <q-select
              v-model="sortOrder"
              :options="sortOptions"
              label="排序"
              outlined dense
              emit-value map-options
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div class="row items-center q-mb-sm">
      <span class="text-body2 text-grey-6">{{ filtered.length }} 筆</span>
    </div>

    <!-- 空狀態 -->
    <div v-if="!loading && !filtered.length" class="text-center text-grey q-pa-xl">
      <q-icon name="history" size="56px" class="q-mb-sm" /><br />尚無訊息記錄
    </div>

    <!-- 記錄列表 -->
    <q-list v-else bordered separator class="rounded-borders overflow-hidden">
      <q-expansion-item
        v-for="log in paged"
        :key="log.id"
        expand-separator
      >
        <template #header>
          <q-item-section>
            <q-item-label class="text-weight-bold">
              {{ log.sentAt }}
              <q-badge
                :color="log.type === 'expense' ? 'teal' : 'primary'"
                class="q-ml-sm"
              >
                {{ log.type === 'expense' ? '餐費通知' : '一般訊息' }}
              </q-badge>
            </q-item-label>
            <q-item-label style="font-size: 13px" class="text-grey-6">
              發送 {{ log.recipientCount }} 位家長
              <span v-if="log.failCount" class="text-negative q-ml-xs">
                ・成功 {{ log.successCount }}／失敗 {{ log.failCount }}
              </span>
              <span v-else class="text-positive q-ml-xs">・全部成功</span>
            </q-item-label>
          </q-item-section>
        </template>

        <!-- 展開：每個收件人的訊息 -->
        <q-list separator class="bg-subtle">
          <q-item v-for="rec in log.records" :key="rec.parentId ?? rec.studentId" class="q-py-sm">
            <q-item-section>
              <div class="row items-center q-gutter-xs q-mb-xs">
                <span class="text-weight-bold text-body2">{{ rec.parentName ?? rec.studentName }}</span>
                <q-badge v-if="rec.status" :color="statusColor(rec.status)" :label="statusLabel(rec.status)" />
              </div>
              <div class="text-secondary-content" style="font-size: 13px; white-space: pre-line; line-height: 1.7">
                {{ rec.message }}
              </div>
              <div v-if="rec.error" class="text-negative q-mt-xs" style="font-size: 12px">
                ⚠️ {{ rec.error }}
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-expansion-item>
    </q-list>

    <div class="row items-center justify-end q-gutter-sm q-mt-md">
      <q-pagination
        v-if="pageSize !== 0 && filtered.length > pageSize"
        v-model="page"
        :max="maxPage"
        boundary-numbers color="primary"
      />
      <q-select
        v-model="pageSize"
        :options="pageSizeOptions"
        outlined dense emit-value map-options
        label="每頁筆數"
        style="width: 120px"
      />
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { broadcastService } from '../services/broadcastService'

const loading = ref(true)
const logs = ref([])
const nameSearch = ref('')
const typeFilter = ref(null)
const dateFrom = ref('')
const dateTo = ref('')
const sortOrder = ref('date_desc')

const typeOptions = [
  { label: '一般訊息', value: 'general' },
  { label: '餐費通知', value: 'expense' }
]

function statusColor(s) {
  if (s === 'success') return 'positive'
  if (s === 'failed') return 'negative'
  return 'grey-6'   // simulated
}
function statusLabel(s) {
  if (s === 'success') return '成功'
  if (s === 'failed') return '失敗'
  return '模擬'
}

const sortOptions = [
  { label: '時間（新→舊）', value: 'date_desc' },
  { label: '時間（舊→新）', value: 'date_asc' },
  { label: '人數（多→少）', value: 'count_desc' }
]

onMounted(async () => {
  try {
    logs.value = await broadcastService.getLogs()
  } finally {
    loading.value = false
  }
})

const page = ref(1)
const pageSize = ref(20)
const pageSizeOptions = [
  { label: '20 筆/頁', value: 20 },
  { label: '50 筆/頁', value: 50 },
  { label: '100 筆/頁', value: 100 },
  { label: '全部', value: 0 },
]

watch([nameSearch, typeFilter, dateFrom, dateTo, sortOrder, pageSize], () => { page.value = 1 })

const filtered = computed(() => {
  let list = logs.value
  if (typeFilter.value) list = list.filter(l => l.type === typeFilter.value)
  if (dateFrom.value) list = list.filter(l => l.sentAt.slice(0, 10) >= dateFrom.value)
  if (dateTo.value) list = list.filter(l => l.sentAt.slice(0, 10) <= dateTo.value)
  if (nameSearch.value.trim()) {
    const q = nameSearch.value.trim().toLowerCase()
    list = list.filter(l => l.records.some(r => (r.parentName ?? r.studentName ?? '').toLowerCase().includes(q)))
  }
  const sorters = {
    date_desc:  (a, b) => b.sentAt.localeCompare(a.sentAt),
    date_asc:   (a, b) => a.sentAt.localeCompare(b.sentAt),
    count_desc: (a, b) => b.recipientCount - a.recipientCount
  }
  return [...list].sort(sorters[sortOrder.value])
})

const maxPage = computed(() => pageSize.value === 0 ? 1 : Math.ceil(filtered.value.length / pageSize.value))
const paged = computed(() => {
  if (pageSize.value === 0) return filtered.value
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
</script>
