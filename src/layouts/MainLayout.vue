<template>
  <q-layout view="lHh LpR lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" @click="drawerOpen = !drawerOpen" />
        <q-toolbar-title class="text-weight-bold">{{ currentTitle }}</q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawerOpen" :breakpoint="1024" show-if-above bordered :width="220">
      <div class="q-pa-md text-primary text-weight-bold text-h6 q-mt-sm">
        <q-icon name="school" class="q-mr-sm" />補習班系統
      </div>
      <q-separator />
      <q-list padding>

        <!-- 學生管理 群組 -->
        <q-expansion-item
          icon="people"
          label="學生管理"
          :default-opened="route.path.startsWith('/students')"
          expand-separator
        >
          <q-item
            v-for="item in studentNavItems"
            :key="item.to"
            clickable :to="item.to" exact
            active-class="text-primary bg-green-1"
            rounded v-ripple
            class="q-pl-lg"
            @click="$q.screen.lt.md && (drawerOpen = false)"
          >
            <q-item-section avatar>
              <q-icon :name="item.icon" size="sm" />
            </q-item-section>
            <q-item-section>{{ item.label }}</q-item-section>
          </q-item>
        </q-expansion-item>

        <!-- 單層：點餐、餐費記錄、餐廳管理 -->
        <q-item
          v-for="item in singleNavItems"
          :key="item.to"
          clickable :to="item.to" exact
          active-class="text-primary bg-green-1"
          rounded v-ripple
          @click="$q.screen.lt.md && (drawerOpen = false)"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" />
          </q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>

        <!-- 寒暑假學費 群組 -->
        <q-expansion-item
          icon="school"
          label="寒暑假學費"
          :default-opened="route.path.startsWith('/tuition')"
          expand-separator
        >
          <q-item
            v-for="item in tuitionNavItems"
            :key="item.to"
            clickable :to="item.to" exact
            active-class="text-primary bg-green-1"
            rounded v-ripple
            class="q-pl-lg"
            @click="$q.screen.lt.md && (drawerOpen = false)"
          >
            <q-item-section avatar>
              <q-icon :name="item.icon" size="sm" />
            </q-item-section>
            <q-item-section>{{ item.label }}</q-item-section>
          </q-item>
        </q-expansion-item>

        <!-- 訊息系統 群組 -->
        <q-expansion-item
          icon="campaign"
          label="訊息系統"
          :default-opened="route.path.startsWith('/broadcast')"
          expand-separator
        >
          <q-item
            v-for="item in broadcastNavItems"
            :key="item.to"
            clickable :to="item.to" exact
            active-class="text-primary bg-green-1"
            rounded v-ripple
            class="q-pl-lg"
            @click="$q.screen.lt.md && (drawerOpen = false)"
          >
            <q-item-section avatar>
              <q-icon :name="item.icon" size="sm" />
            </q-item-section>
            <q-item-section>{{ item.label }}</q-item-section>
          </q-item>
        </q-expansion-item>

      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'

const route = useRoute()
const $q = useQuasar()
const drawerOpen = ref(true)

const studentNavItems = [
  { to: '/students',          icon: 'format_list_bulleted', label: '學生列表' },
  { to: '/students/archived', icon: 'archive',              label: '封存學生' },
  { to: '/students/deleted',  icon: 'delete_sweep',         label: '刪除記錄' }
]

const singleNavItems = [
  { to: '/ordering',    icon: 'restaurant_menu',        label: '點餐' },
  { to: '/meals',       icon: 'account_balance_wallet', label: '餐費記錄' },
  { to: '/restaurants', icon: 'restaurant',             label: '餐廳管理' }
]

const tuitionNavItems = [
  { to: '/tuition',       icon: 'calculate',  label: '費率計算' },
  { to: '/tuition/rates', icon: 'tune',       label: '費率管理' }
]

const broadcastNavItems = [
  { to: '/broadcast',           icon: 'send',        label: '發送訊息' },
  { to: '/broadcast/history',   icon: 'history',     label: '訊息記錄' },
  { to: '/broadcast/templates', icon: 'description', label: '訊息模板' }
]

const allTitles = {
  '/students':          '學生列表',
  '/students/archived': '封存學生',
  '/students/deleted':  '刪除記錄',
  '/ordering':          '點餐',
  '/meals':             '餐費記錄',
  '/restaurants':       '餐廳管理',
  '/tuition':           '費率計算',
  '/tuition/rates':     '費率管理',
  '/broadcast':           '發送訊息',
  '/broadcast/history':   '訊息記錄',
  '/broadcast/templates': '訊息模板'
}

const currentTitle = computed(() => allTitles[route.path] || '補習班系統')
</script>
