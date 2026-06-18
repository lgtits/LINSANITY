<template>
  <div class="flex flex-center login-bg" style="min-height: 100vh">
    <q-card style="width: min(90vw, 360px)" flat bordered>
      <q-card-section class="text-center q-pt-lg q-pb-sm">
        <q-icon name="school" size="48px" color="primary" />
        <div class="text-h6 text-weight-bold q-mt-sm">補習班管理系統</div>
        <div class="text-body2 text-grey-6">請輸入通關密語</div>
      </q-card-section>
      <q-card-section>
        <q-form @submit.prevent="login" class="q-gutter-sm">
          <q-input
            v-model="passphrase"
            type="text"
            label="通關密語"
            outlined dense autofocus
            :error="error"
            error-message="密語錯誤，請再試一次"
            @update:model-value="error = false"
          />
          <q-btn
            type="submit"
            color="primary"
            label="進入系統"
            class="full-width q-mt-sm"
            :loading="loading"
          />
        </q-form>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const passphrase = ref('')
const loading = ref(false)
const error = ref(false)

async function login() {
  loading.value = true
  error.value = false
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-passphrase`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: passphrase.value }),
      }
    )
    const { ok } = await res.json()
    if (ok) {
      localStorage.setItem('app_auth', '1')
      router.push('/')
    } else {
      error.value = true
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}
</script>
