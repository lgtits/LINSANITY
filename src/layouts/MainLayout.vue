<template>
  <q-layout view="lHh LpR lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          v-if="$q.screen.gt.sm"
          flat
          dense
          round
          icon="menu"
          @click="drawerOpen = !drawerOpen"
        />
        <q-toolbar-title class="text-weight-bold">{{ currentTitle }}</q-toolbar-title>
      </q-toolbar>
    </q-header>

    <!-- 桌機：左側導覽列 -->
    <q-drawer v-model="drawerOpen" :breakpoint="1024" show-if-above bordered :width="220">
      <div class="q-pa-md text-primary text-weight-bold text-h6 q-mt-sm">
        <q-icon name="school" class="q-mr-sm" />補習班系統
      </div>
      <q-separator />
      <q-list padding>
        <q-item
          v-for="item in navItems"
          :key="item.to"
          clickable
          :to="item.to"
          exact
          active-class="text-primary bg-green-1"
          rounded
          v-ripple
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" />
          </q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- 手機：底部導覽列（用 q-btn 確保全部可見） -->
    <q-footer v-if="$q.screen.lt.md" class="bg-white shadow-up-3">
      <div class="row" style="min-height: 56px">
        <q-btn
          v-for="item in navItems"
          :key="item.to"
          flat
          no-caps
          stack
          :icon="item.icon"
          :label="item.label"
          :color="route.path === item.to ? 'primary' : 'grey-5'"
          class="col"
          style="font-size: 10px; padding: 4px 0"
          @click="router.push(item.to)"
        />
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const drawerOpen = ref(true)

const navItems = [
  { to: '/students', icon: 'people', label: '學生列表' },
  { to: '/ordering', icon: 'restaurant_menu', label: '點餐' },
  { to: '/meals', icon: 'account_balance_wallet', label: '餐費記錄' },
  { to: '/restaurants', icon: 'restaurant', label: '餐廳管理' },
  { to: '/tuition', icon: 'school', label: '寒暑假學費' },
]

const currentTitle = computed(
  () => navItems.find((i) => i.to === route.path)?.label || '補習班系統',
)
</script>

<style scoped>
.shadow-up-3 {
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}
</style>
