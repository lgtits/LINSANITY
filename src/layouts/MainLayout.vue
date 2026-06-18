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
          group="sidebar-nav"
        >
          <q-item
            v-for="item in studentNavItems"
            :key="item.to"
            clickable
            :to="item.to"
            exact
            active-class="nav-active"
            rounded
            v-ripple
            class="q-pl-lg"
            @click="$q.screen.lt.md && (drawerOpen = false)"
          >
            <q-item-section avatar>
              <q-icon :name="item.icon" size="sm" />
            </q-item-section>
            <q-item-section>{{ item.label }}</q-item-section>
          </q-item>
        </q-expansion-item>

        <!-- 單層：點餐、餐費記錄、訂餐管理 -->
        <q-item
          v-for="item in singleNavItems"
          :key="item.to"
          clickable
          :to="item.to"
          exact
          active-class="nav-active"
          rounded
          v-ripple
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
          group="sidebar-nav"
        >
          <q-item
            v-for="item in tuitionNavItems"
            :key="item.to"
            clickable
            :to="item.to"
            exact
            active-class="nav-active"
            rounded
            v-ripple
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
          group="sidebar-nav"
        >
          <q-item
            v-for="item in broadcastNavItems"
            :key="item.to"
            clickable
            :to="item.to"
            exact
            active-class="nav-active"
            rounded
            v-ripple
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

      <div class="absolute-bottom">
        <q-separator />
        <q-list>
          <q-item clickable v-ripple @click="showSettings = true">
            <q-item-section avatar>
              <q-icon name="settings" />
            </q-item-section>
            <q-item-section>設定</q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-drawer>

    <q-dialog v-model="showSettings">
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">設定</div>
        </q-card-section>
        <q-separator />
        <q-card-section class="q-gutter-sm">
          <!-- 暗黑模式 -->
          <q-item tag="label">
            <q-item-section>
              <q-item-label>深色模式</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle v-model="darkMode" @update:model-value="onToggleDark" />
            </q-item-section>
          </q-item>

          <q-separator />

          <!-- 字體大小 -->
          <q-item>
            <q-item-section>
              <q-item-label class="q-mb-sm">字體大小</q-item-label>
              <q-btn-toggle
                v-model="fontSize"
                spread no-caps unelevated rounded
                toggle-color="primary"
                color="grey-4" text-color="grey-8"
                :options="[
                  { label: '小', value: 'small' },
                  { label: '中', value: 'medium' },
                  { label: '大', value: 'large' }
                ]"
                @update:model-value="onFontSize"
              />
            </q-item-section>
          </q-item>

          <q-separator />

          <!-- 主題色 -->
          <q-item>
            <q-item-section>
              <q-item-label class="q-mb-sm">主題色</q-item-label>
              <div class="row q-gutter-sm">
                <q-btn
                  v-for="t in themes" :key="t.key"
                  round unelevated size="md"
                  :style="{ backgroundColor: t.primary }"
                  :icon="themeKey === t.key ? 'check' : ''"
                  text-color="white"
                  @click="onTheme(t.key)"
                >
                  <q-tooltip>{{ t.label }}</q-tooltip>
                </q-btn>
              </div>
            </q-item-section>
          </q-item>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="關閉" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

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
const showSettings = ref(false)

// ---- 深色模式 ----
const darkMode = ref($q.dark.isActive)
const savedDark = localStorage.getItem('darkMode')
if (savedDark !== null) {
  const val = savedDark === 'true'
  $q.dark.set(val)
  darkMode.value = val
}
function onToggleDark(val) {
  $q.dark.set(val)
  localStorage.setItem('darkMode', val)
}

// ---- 字體大小 ----
const fontSizeMap = { small: '14px', medium: '16px', large: '18px' }
const fontSize = ref(localStorage.getItem('fontSize') || 'medium')
function applyFontSize(size) {
  document.body.style.zoom = ''
  document.documentElement.style.fontSize = fontSizeMap[size]
}
function onFontSize(size) {
  applyFontSize(size)
  localStorage.setItem('fontSize', size)
}
applyFontSize(fontSize.value)

// ---- 主題色 ----
const themes = [
  { key: 'matcha',  label: '抹茶綠', primary: '#5C7A3E', secondary: '#8FAF6A', darkPrimary: '#90b06e', darkSecondary: '#a8c88a' },
  { key: 'ocean',   label: '海洋藍', primary: '#1565C0', secondary: '#42A5F5', darkPrimary: '#64B5F6', darkSecondary: '#90CAF9' },
  { key: 'indigo',  label: '靛紫',   primary: '#4527A0', secondary: '#7E57C2', darkPrimary: '#B39DDB', darkSecondary: '#D1C4E9' },
  { key: 'coral',   label: '珊瑚橘', primary: '#D84315', secondary: '#FF7043', darkPrimary: '#FF8A65', darkSecondary: '#FFAB91' },
  { key: 'rose',    label: '玫瑰粉', primary: '#AD1457', secondary: '#EC407A', darkPrimary: '#F48FB1', darkSecondary: '#F8BBD0' },
]
const themeKey = ref(localStorage.getItem('themeKey') || 'matcha')
function applyTheme(key) {
  const t = themes.find(x => x.key === key) || themes[0]
  const root = document.documentElement
  root.style.setProperty('--q-primary', t.primary)
  root.style.setProperty('--q-secondary', t.secondary)
  root.dataset.theme = key
}
function onTheme(key) {
  themeKey.value = key
  applyTheme(key)
  localStorage.setItem('themeKey', key)
}
applyTheme(themeKey.value)

const studentNavItems = [
  { to: '/students', icon: 'format_list_bulleted', label: '學生列表' },
  { to: '/students/parents', icon: 'family_restroom', label: '家長管理' },
  { to: '/students/ledger', icon: 'receipt_long', label: '帳務明細' },
  { to: '/students/archived', icon: 'archive', label: '封存學生' },
  { to: '/students/deleted', icon: 'delete_sweep', label: '刪除記錄' },
]

const singleNavItems = [
  { to: '/ordering', icon: 'restaurant_menu', label: '點餐' },
  { to: '/meals', icon: 'account_balance_wallet', label: '餐費記錄' },
  { to: '/restaurants', icon: 'restaurant', label: '訂餐管理' },
]

const tuitionNavItems = [
  { to: '/tuition',            icon: 'calculate',      label: '費率計算' },
  { to: '/tuition/rates',      icon: 'tune',           label: '費率管理' },
  { to: '/tuition/attendance', icon: 'fact_check',     label: '簽到記錄' },
]

const broadcastNavItems = [
  { to: '/broadcast', icon: 'send', label: '發送訊息' },
  { to: '/broadcast/history', icon: 'history', label: '訊息記錄' },
  { to: '/broadcast/templates', icon: 'description', label: '訊息模板' },
]

const allTitles = {
  '/students': '學生列表',
  '/students/parents': '家長管理',
  '/students/ledger': '帳務明細',
  '/students/archived': '封存學生',
  '/students/deleted': '刪除記錄',
  '/ordering': '點餐',
  '/meals': '餐費記錄',
  '/restaurants': '訂餐管理',
  '/tuition': '費率計算',
  '/tuition/rates': '費率管理',
  '/tuition/attendance': '簽到記錄',
  '/broadcast': '發送訊息',
  '/broadcast/history': '訊息記錄',
  '/broadcast/templates': '訊息模板',
}

const currentTitle = computed(() => allTitles[route.path] || '補習班系統')
</script>
