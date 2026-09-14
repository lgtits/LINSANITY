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

        <div class="row items-center justify-between q-mb-md">
          <div class="text-subtitle1 text-weight-bold">餐廳列表</div>
          <div class="row items-center q-gutter-sm">
            <q-btn-toggle v-model="showDeleted" :options="viewOptions" toggle-color="primary" flat dense no-caps />
            <q-btn v-if="!showDeleted" color="primary" icon="add" label="新增餐廳" @click="openAddRestaurant" />
          </div>
        </div>

        <!-- 手機：卡片 -->
        <template v-if="$q.screen.lt.md">
          <q-card
            v-for="r in displayRestaurants"
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
                <template v-if="showDeleted">
                  <q-btn flat round dense icon="restore" color="primary" size="sm" @click="restoreRestaurant(r)">
                    <q-tooltip>復原</q-tooltip>
                  </q-btn>
                  <q-btn flat round dense icon="delete_forever" color="negative" size="sm" @click="confirmPurgeRestaurant(r)">
                    <q-tooltip>永久刪除</q-tooltip>
                  </q-btn>
                </template>
                <template v-else>
                  <q-btn flat round dense icon="edit" color="primary" size="sm" @click="openEditRestaurant(r)" />
                  <q-btn flat round dense :icon="r.active ? 'toggle_on' : 'toggle_off'" :color="r.active ? 'positive' : 'grey'" size="sm" @click="toggleRestaurant(r)" />
                  <q-btn flat round dense icon="delete" color="negative" size="sm" @click="confirmDeleteRestaurant(r)" />
                  <q-btn flat round dense icon="restaurant_menu" color="secondary" size="sm" @click="openAddMenuForRestaurant(r)">
                    <q-tooltip>增加餐點</q-tooltip>
                  </q-btn>
                </template>
              </div>
            </q-card-section>
          </q-card>
        </template>

        <!-- 桌機：表格 -->
        <q-table
          v-else
          :rows="displayRestaurants"
          :columns="rColumns"
          row-key="id"
          flat
          bordered
          :rows-per-page-options="[20, 50, 0]" rows-per-page-label="每頁筆數"
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
              <template v-if="showDeleted">
                <q-btn flat dense round icon="restore" color="primary" size="sm" @click="restoreRestaurant(props.row)">
                  <q-tooltip>復原</q-tooltip>
                </q-btn>
                <q-btn flat dense round icon="delete_forever" color="negative" size="sm" @click="confirmPurgeRestaurant(props.row)">
                  <q-tooltip>永久刪除</q-tooltip>
                </q-btn>
              </template>
              <template v-else>
                <q-btn flat dense round icon="edit" color="primary" size="sm" @click="openEditRestaurant(props.row)" />
                <q-btn flat dense round :icon="props.row.active ? 'toggle_on' : 'toggle_off'" :color="props.row.active ? 'positive' : 'grey'" size="sm" @click="toggleRestaurant(props.row)" />
                <q-btn flat dense round icon="delete" color="negative" size="sm" @click="confirmDeleteRestaurant(props.row)" />
                <q-btn flat dense round icon="restaurant_menu" color="secondary" size="sm" @click="openAddMenuForRestaurant(props.row)">
                  <q-tooltip>增加餐點</q-tooltip>
                </q-btn>
              </template>
            </q-td>
          </template>
        </q-table>

        <div v-if="!displayRestaurants.length" class="text-center text-grey q-pa-xl">
          <q-icon name="store" size="56px" /><br>{{ showDeleted ? '沒有已刪除的餐廳' : '尚無餐廳資料' }}
        </div>
      </q-tab-panel>

      <!-- ===== 餐點 tab ===== -->
      <q-tab-panel name="menu" class="q-pa-none">

        <div class="row items-center justify-between q-mb-md">
          <div class="text-subtitle1 text-weight-bold">餐點列表</div>
          <div class="row items-center q-gutter-sm">
            <q-btn-toggle v-model="showDeleted" :options="viewOptions" toggle-color="primary" flat dense no-caps />
            <q-btn v-if="!showDeleted" color="primary" icon="add" label="新增餐點" @click="openAddMenu" />
          </div>
        </div>

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
                <template v-if="showDeleted">
                  <q-btn flat round dense icon="restore" color="primary" size="sm" @click="restoreMenu(m)">
                    <q-tooltip>復原</q-tooltip>
                  </q-btn>
                  <q-btn flat round dense icon="delete_forever" color="negative" size="sm" @click="confirmPurgeMenu(m)">
                    <q-tooltip>永久刪除</q-tooltip>
                  </q-btn>
                </template>
                <template v-else>
                  <q-btn flat round dense icon="edit" color="primary" size="sm" @click="openEditMenu(m)" />
                  <q-btn flat round dense :icon="m.available ? 'visibility' : 'visibility_off'" :color="m.available ? 'positive' : 'grey'" size="sm" @click="toggleMenu(m)" />
                  <q-btn flat round dense icon="delete" color="negative" size="sm" @click="confirmDeleteMenu(m)" />
                </template>
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
          :rows-per-page-options="[20, 50, 0]" rows-per-page-label="每頁筆數"
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
              <template v-if="showDeleted">
                <q-btn flat dense round icon="restore" color="primary" size="sm" @click="restoreMenu(props.row)">
                  <q-tooltip>復原</q-tooltip>
                </q-btn>
                <q-btn flat dense round icon="delete_forever" color="negative" size="sm" @click="confirmPurgeMenu(props.row)">
                  <q-tooltip>永久刪除</q-tooltip>
                </q-btn>
              </template>
              <template v-else>
                <q-btn flat dense round icon="edit" color="primary" size="sm" @click="openEditMenu(props.row)" />
                <q-btn flat dense round :icon="props.row.available ? 'visibility' : 'visibility_off'" :color="props.row.available ? 'positive' : 'grey'" size="sm" @click="toggleMenu(props.row)" />
                <q-btn flat dense round icon="delete" color="negative" size="sm" @click="confirmDeleteMenu(props.row)" />
              </template>
            </q-td>
          </template>
        </q-table>

        <div v-if="!filteredMenu.length" class="text-center text-grey q-pa-xl">
          <q-icon name="menu_book" size="56px" /><br>{{ showDeleted ? '沒有已刪除的餐點' : '尚無餐點資料' }}
        </div>
      </q-tab-panel>
    </q-tab-panels>

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
const deletedRestaurants = ref([])
const deletedMenuItems = ref([])
const showDeleted = ref(false)
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

const viewOptions = [
  { label: '使用中', value: false },
  { label: '已刪除', value: true }
]

// 下拉選單一律只給未刪除的餐廳，避免把餐點指派到已刪除的餐廳
const restaurantOptions = computed(() =>
  restaurants.value.map(r => ({ label: r.name, value: r.id }))
)

const displayRestaurants = computed(() =>
  showDeleted.value ? deletedRestaurants.value : restaurants.value
)

const displayMenu = computed(() =>
  showDeleted.value ? deletedMenuItems.value : menuItems.value
)

const filteredMenu = computed(() =>
  filterRestaurant.value
    ? displayMenu.value.filter(m => m.restaurantId === filterRestaurant.value)
    : displayMenu.value
)

// 已刪除的餐點可能隸屬已刪除的餐廳，兩份名單都要查
function restaurantName(id) {
  const all = [...restaurants.value, ...deletedRestaurants.value]
  return all.find(r => r.id === id)?.name || '-'
}

async function reload() {
  const [live, liveMenu, gone, goneMenu] = await Promise.all([
    restaurantService.getAll(),
    restaurantService.getMenuItems(),
    restaurantService.getDeletedRestaurants(),
    restaurantService.getDeletedMenuItems()
  ])
  restaurants.value = live
  menuItems.value = liveMenu
  deletedRestaurants.value = gone
  deletedMenuItems.value = goneMenu
}

onMounted(async () => {
  try {
    await reload()
  } finally {
    loading.value = false
  }
})

function openAddRestaurant() {
  isEdit.value = false
  rForm.value = emptyR()
  showRestaurantDialog.value = true
}

function openAddMenu() {
  isEdit.value = false
  mForm.value = emptyM()
  showMenuDialog.value = true
}

function openAddMenuForRestaurant(r) {
  isEdit.value = false
  mForm.value = { ...emptyM(), restaurantId: r.id }
  showMenuDialog.value = true
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
    message: `刪除「${r.name}」後，該餐廳的餐點也會一併隱藏。歷史訂單不受影響，可從「已刪除」復原。`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'negative', label: '刪除' },
    persistent: true
  }).onOk(async () => {
    await restaurantService.removeRestaurant(r.id)
    await reload()
    $q.notify({ message: '餐廳已刪除', color: 'negative', icon: 'delete' })
  })
}

function confirmDeleteMenu(m) {
  $q.dialog({
    title: '確認刪除',
    message: `確定刪除餐點「${m.name}」？歷史訂單不受影響，可從「已刪除」復原。`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'negative', label: '刪除' },
    persistent: true
  }).onOk(async () => {
    await restaurantService.removeMenuItem(m.id)
    await reload()
    $q.notify({ message: '餐點已刪除', color: 'negative', icon: 'delete' })
  })
}

async function restoreRestaurant(r) {
  await restaurantService.restoreRestaurant(r.id)
  await reload()
  $q.notify({ message: '餐廳已復原', color: 'positive', icon: 'restore' })
}

async function restoreMenu(m) {
  await restaurantService.restoreMenuItem(m.id)
  await reload()
  $q.notify({ message: '餐點已復原', color: 'positive', icon: 'restore' })
}

// 永久刪除：主檔真的消失，歷史訂單靠下單當下的名稱/價格快照保留
function confirmPurgeRestaurant(r) {
  $q.dialog({
    title: '永久刪除',
    message: `「${r.name}」與其所有餐點將從資料庫移除，無法復原。歷史訂單會保留餐廳名稱，但不再連結到此餐廳。`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'negative', label: '永久刪除' },
    persistent: true
  }).onOk(async () => {
    await restaurantService.permanentDeleteRestaurant(r.id)
    await reload()
    $q.notify({ message: '餐廳已永久刪除', color: 'negative', icon: 'delete_forever' })
  })
}

function confirmPurgeMenu(m) {
  $q.dialog({
    title: '永久刪除',
    message: `餐點「${m.name}」將從資料庫移除，無法復原。歷史訂單會保留餐點名稱與價格，但不再連結到此餐點。`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'negative', label: '永久刪除' },
    persistent: true
  }).onOk(async () => {
    await restaurantService.permanentDeleteMenuItem(m.id)
    await reload()
    $q.notify({ message: '餐點已永久刪除', color: 'negative', icon: 'delete_forever' })
  })
}
</script>
