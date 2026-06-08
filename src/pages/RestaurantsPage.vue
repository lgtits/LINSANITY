<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />
    <q-tabs v-model="tab" align="left" indicator-color="primary" active-color="primary" class="q-mb-md">
      <q-tab name="restaurants" icon="store" label="餐廳" />
      <q-tab name="menu" icon="menu_book" label="餐點" />
    </q-tabs>

    <!-- ===== 餐廳 tab ===== -->
    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="restaurants" class="q-pa-none">

        <!-- 手機：卡片 -->
        <template v-if="$q.screen.lt.md">
          <q-card
            v-for="r in restaurants"
            :key="r.id"
            class="q-mb-sm"
            flat
            bordered
            :style="!r.active ? 'opacity:0.5' : ''"
          >
            <q-card-section class="row items-center">
              <div class="col">
                <div class="row items-center q-gutter-xs">
                  <span class="text-subtitle1 text-weight-bold">{{ r.name }}</span>
                  <q-badge :color="r.active ? 'positive' : 'grey'">{{ r.active ? '啟用' : '停用' }}</q-badge>
                </div>
                <div class="text-caption text-grey-7">{{ r.phone }}</div>
                <div class="text-caption text-grey-6">{{ r.address }}</div>
              </div>
              <div class="col-auto column q-gutter-xs">
                <q-btn flat round dense icon="edit" color="primary" size="sm" @click="openEditRestaurant(r)" />
                <q-btn flat round dense :icon="r.active ? 'toggle_on' : 'toggle_off'" :color="r.active ? 'positive' : 'grey'" size="sm" @click="toggleRestaurant(r)" />
                <q-btn flat round dense icon="delete" color="negative" size="sm" @click="confirmDeleteRestaurant(r)" />
              </div>
            </q-card-section>
          </q-card>
        </template>

        <!-- 桌機：表格 -->
        <q-table
          v-else
          :rows="restaurants"
          :columns="rColumns"
          row-key="id"
          flat
          bordered
        >
          <template #body-cell-active="props">
            <q-td :props="props">
              <q-badge :color="props.row.active ? 'positive' : 'grey'">
                {{ props.row.active ? '啟用' : '停用' }}
              </q-badge>
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props" class="text-center q-gutter-xs">
              <q-btn flat dense round icon="edit" color="primary" size="sm" @click="openEditRestaurant(props.row)" />
              <q-btn flat dense round :icon="props.row.active ? 'toggle_on' : 'toggle_off'" :color="props.row.active ? 'positive' : 'grey'" size="sm" @click="toggleRestaurant(props.row)" />
              <q-btn flat dense round icon="delete" color="negative" size="sm" @click="confirmDeleteRestaurant(props.row)" />
            </q-td>
          </template>
        </q-table>

        <div v-if="!restaurants.length" class="text-center text-grey q-pa-xl">
          <q-icon name="store" size="56px" /><br>尚無餐廳資料
        </div>
      </q-tab-panel>

      <!-- ===== 餐點 tab ===== -->
      <q-tab-panel name="menu" class="q-pa-none">
        <!-- 餐廳篩選 -->
        <q-select
          v-model="filterRestaurant"
          :options="restaurantOptions"
          label="篩選餐廳"
          outlined
          dense
          clearable
          emit-value
          map-options
          class="q-mb-md"
        />

        <!-- 手機：卡片 -->
        <template v-if="$q.screen.lt.md">
          <q-card
            v-for="m in filteredMenu"
            :key="m.id"
            class="q-mb-sm"
            flat
            bordered
          >
            <q-card-section class="row items-center">
              <div class="col">
                <div class="row items-center q-gutter-xs">
                  <span class="text-subtitle1 text-weight-bold">{{ m.name }}</span>
                  <q-badge :color="m.available ? 'positive' : 'grey'">{{ m.available ? '供應中' : '停供' }}</q-badge>
                </div>
                <div class="text-body2 text-grey-7">{{ restaurantName(m.restaurantId) }}</div>
                <div class="text-h6 text-primary q-mt-xs">${{ m.price }}
                  <span class="text-body2 text-grey-6 q-ml-xs">預設 {{ m.defaultQty ?? 1 }} 份</span>
                </div>
              </div>
              <div class="col-auto column q-gutter-xs">
                <q-btn flat round dense icon="edit" color="primary" size="sm" @click="openEditMenu(m)" />
                <q-btn flat round dense :icon="m.available ? 'visibility' : 'visibility_off'" :color="m.available ? 'positive' : 'grey'" size="sm" @click="toggleMenu(m)" />
                <q-btn flat round dense icon="delete" color="negative" size="sm" @click="confirmDeleteMenu(m)" />
              </div>
            </q-card-section>
          </q-card>
        </template>

        <!-- 桌機：表格 -->
        <q-table
          v-else
          :rows="filteredMenu"
          :columns="mColumns"
          row-key="id"
          flat
          bordered
        >
          <template #body-cell-restaurantId="props">
            <q-td :props="props">{{ restaurantName(props.row.restaurantId) }}</q-td>
          </template>
          <template #body-cell-price="props">
            <q-td :props="props" class="text-primary text-weight-bold">${{ props.row.price }}</q-td>
          </template>
          <template #body-cell-available="props">
            <q-td :props="props">
              <q-badge :color="props.row.available ? 'positive' : 'grey'">
                {{ props.row.available ? '供應中' : '停供' }}
              </q-badge>
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props" class="text-center q-gutter-xs">
              <q-btn flat dense round icon="edit" color="primary" size="sm" @click="openEditMenu(props.row)" />
              <q-btn flat dense round :icon="props.row.available ? 'visibility' : 'visibility_off'" :color="props.row.available ? 'positive' : 'grey'" size="sm" @click="toggleMenu(props.row)" />
              <q-btn flat dense round icon="delete" color="negative" size="sm" @click="confirmDeleteMenu(props.row)" />
            </q-td>
          </template>
        </q-table>

        <div v-if="!filteredMenu.length" class="text-center text-grey q-pa-xl">
          <q-icon name="menu_book" size="56px" /><br>尚無餐點資料
        </div>
      </q-tab-panel>
    </q-tab-panels>

    <!-- FAB -->
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn fab :icon="tab === 'restaurants' ? 'add' : 'add'" color="primary" @click="openAdd" />
    </q-page-sticky>

    <!-- 餐廳 Dialog -->
    <q-dialog v-model="showRestaurantDialog" persistent>
      <q-card style="width: min(95vw, 460px)">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ isEdit ? '編輯餐廳' : '新增餐廳' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-form @submit.prevent="saveRestaurant" class="q-gutter-sm">
            <q-input v-model="rForm.name" label="餐廳名稱 *" outlined dense :rules="[v => !!v || '必填']" />
            <q-input v-model="rForm.phone" label="電話" outlined dense />
            <q-input v-model="rForm.address" label="地址" outlined dense />
            <div class="row justify-end q-mt-md q-gutter-sm">
              <q-btn flat label="取消" v-close-popup />
              <q-btn type="submit" color="primary" :label="isEdit ? '更新' : '新增'" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- 餐點 Dialog -->
    <q-dialog v-model="showMenuDialog" persistent>
      <q-card style="width: min(95vw, 460px)">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ isEdit ? '編輯餐點' : '新增餐點' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-form @submit.prevent="saveMenu" class="q-gutter-sm">
            <q-select
              v-model="mForm.restaurantId"
              :options="restaurantOptions"
              label="所屬餐廳 *"
              outlined
              dense
              emit-value
              map-options
              :rules="[v => !!v || '必填']"
            />
            <q-input v-model="mForm.name" label="餐點名稱 *" outlined dense :rules="[v => !!v || '必填']" />
            <q-input v-model.number="mForm.price" label="價格 *" outlined dense type="number" :rules="[v => v > 0 || '請輸入正確價格']" />
            <q-input v-model.number="mForm.defaultQty" label="預設數量 *" outlined dense type="number" min="1" :rules="[v => v >= 1 || '至少為 1']" />
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
import { restaurantService } from '../services/restaurantService'

const $q = useQuasar()

const loading = ref(true)
const tab = ref('restaurants')
const restaurants = ref([])
const menuItems = ref([])
const filterRestaurant = ref(null)
const isEdit = ref(false)
const showRestaurantDialog = ref(false)
const showMenuDialog = ref(false)

const emptyR = () => ({ name: '', phone: '', address: '' })
const emptyM = () => ({ restaurantId: '', name: '', price: 0, defaultQty: 1 })
const rForm = ref(emptyR())
const mForm = ref(emptyM())

const rColumns = [
  { name: 'name',    label: '名稱', field: 'name',    align: 'left', sortable: true },
  { name: 'phone',   label: '電話', field: 'phone',   align: 'left' },
  { name: 'address', label: '地址', field: 'address', align: 'left' },
  { name: 'active',  label: '狀態', field: 'active',  align: 'center' },
  { name: 'actions', label: '操作', field: 'actions', align: 'center' }
]

const mColumns = [
  { name: 'restaurantId', label: '餐廳',   field: 'restaurantId', align: 'left' },
  { name: 'name',         label: '餐點',   field: 'name',         align: 'left', sortable: true },
  { name: 'price',        label: '價格',   field: 'price',        align: 'right', sortable: true },
  { name: 'defaultQty',   label: '預設數量', field: 'defaultQty', align: 'center' },
  { name: 'available',    label: '狀態',   field: 'available',    align: 'center' },
  { name: 'actions',      label: '操作',   field: 'actions',      align: 'center' }
]

const restaurantOptions = computed(() =>
  restaurants.value.map(r => ({ label: r.name, value: r.id }))
)

const filteredMenu = computed(() =>
  filterRestaurant.value
    ? menuItems.value.filter(m => m.restaurantId === filterRestaurant.value)
    : menuItems.value
)

function restaurantName(id) {
  return restaurants.value.find(r => r.id === id)?.name || '-'
}

onMounted(async () => {
  try {
    restaurants.value = await restaurantService.getAll()
    menuItems.value = await restaurantService.getMenuItems()
  } finally {
    loading.value = false
  }
})

function openAdd() {
  isEdit.value = false
  if (tab.value === 'restaurants') {
    rForm.value = emptyR()
    showRestaurantDialog.value = true
  } else {
    mForm.value = emptyM()
    showMenuDialog.value = true
  }
}

function openEditRestaurant(r) {
  isEdit.value = true
  rForm.value = { ...r }
  showRestaurantDialog.value = true
}

function openEditMenu(m) {
  isEdit.value = true
  mForm.value = { ...m }
  showMenuDialog.value = true
}

async function saveRestaurant() {
  if (isEdit.value) {
    const updated = await restaurantService.updateRestaurant(rForm.value.id, rForm.value)
    const idx = restaurants.value.findIndex(r => r.id === updated.id)
    if (idx !== -1) restaurants.value[idx] = updated
    $q.notify({ message: '餐廳已更新', color: 'positive', icon: 'check' })
  } else {
    const created = await restaurantService.createRestaurant(rForm.value)
    restaurants.value.push(created)
    $q.notify({ message: '餐廳已新增', color: 'positive', icon: 'check' })
  }
  showRestaurantDialog.value = false
}

async function saveMenu() {
  if (isEdit.value) {
    const updated = await restaurantService.updateMenuItem(mForm.value.id, mForm.value)
    const idx = menuItems.value.findIndex(m => m.id === updated.id)
    if (idx !== -1) menuItems.value[idx] = updated
    $q.notify({ message: '餐點已更新', color: 'positive', icon: 'check' })
  } else {
    const created = await restaurantService.createMenuItem(mForm.value)
    menuItems.value.push(created)
    $q.notify({ message: '餐點已新增', color: 'positive', icon: 'check' })
  }
  showMenuDialog.value = false
}

async function toggleRestaurant(r) {
  const updated = await restaurantService.updateRestaurant(r.id, { active: !r.active })
  const idx = restaurants.value.findIndex(x => x.id === r.id)
  if (idx !== -1) restaurants.value[idx] = updated
}

async function toggleMenu(m) {
  const updated = await restaurantService.updateMenuItem(m.id, { available: !m.available })
  const idx = menuItems.value.findIndex(x => x.id === m.id)
  if (idx !== -1) menuItems.value[idx] = updated
}

function confirmDeleteRestaurant(r) {
  $q.dialog({
    title: '確認刪除',
    message: `刪除「${r.name}」後，該餐廳所有餐點也會一起刪除。`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'negative', label: '刪除' },
    persistent: true
  }).onOk(async () => {
    await restaurantService.removeRestaurant(r.id)
    restaurants.value = restaurants.value.filter(x => x.id !== r.id)
    menuItems.value = menuItems.value.filter(m => m.restaurantId !== r.id)
    $q.notify({ message: '餐廳已刪除', color: 'negative', icon: 'delete' })
  })
}

function confirmDeleteMenu(m) {
  $q.dialog({
    title: '確認刪除',
    message: `確定刪除餐點「${m.name}」？`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'negative', label: '刪除' },
    persistent: true
  }).onOk(async () => {
    await restaurantService.removeMenuItem(m.id)
    menuItems.value = menuItems.value.filter(x => x.id !== m.id)
    $q.notify({ message: '餐點已刪除', color: 'negative', icon: 'delete' })
  })
}
</script>
