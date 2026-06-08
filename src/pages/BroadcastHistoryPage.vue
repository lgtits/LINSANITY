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
        v-for="log in filtered"
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
        <q-list separator class="bg-grey-1">
          <q-item v-for="rec in log.records" :key="rec.parentId ?? rec.studentId" class="q-py-sm">
            <q-item-section>
              <div class="row items-center q-gutter-xs q-mb-xs">
                <span class="text-weight-bold text-body2">{{ rec.parentName ?? rec.studentName }}</span>
                <q-badge v-if="rec.status" :color="statusColor(rec.status)" :label="statusLabel(rec.status)" />
              </div>
              <div style="font-size: 13px; white-space: pre-line; line-height: 1.7; color: #555">
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
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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
</script>
