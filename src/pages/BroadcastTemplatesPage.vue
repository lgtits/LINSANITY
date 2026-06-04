<template>
  <q-page padding>
    <q-inner-loading :showing="loading" label="載入中..." />

    <div class="row justify-end q-mb-md">
      <q-btn color="primary" icon="add" label="新增模板" @click="openAdd" />
    </div>

    <!-- 空狀態 -->
    <div v-if="!loading && !templates.length" class="text-center text-grey q-pa-xl">
      <q-icon name="description" size="56px" class="q-mb-sm" /><br />尚無模板，點擊右上角新增
    </div>

    <!-- 模板列表 -->
    <div class="row q-col-gutter-md">
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="col-12 col-sm-6 col-md-4"
      >
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-start no-wrap">
              <div class="col">
                <div class="text-subtitle2 q-mb-xs">{{ tpl.name }}</div>
                <div class="text-body2 text-grey-7" style="white-space: pre-line; line-height: 1.6">
                  {{ tpl.content }}
                </div>
              </div>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-actions class="q-px-md">
            <q-btn flat dense icon="edit" color="primary" label="編輯" size="sm" @click="openEdit(tpl)" />
            <q-space />
            <q-btn flat dense icon="delete" color="negative" size="sm" @click="confirmDelete(tpl)" />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- 新增/編輯 Dialog -->
    <q-dialog v-model="showDialog" persistent>
      <q-card style="width: min(95vw, 480px)">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ isEdit ? '編輯模板' : '新增模板' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-form @submit.prevent="saveTemplate" class="q-gutter-sm">
            <q-input
              v-model="form.name"
              label="模板名稱 *"
              outlined dense
              :rules="[v => !!v || '請填寫名稱']"
            />
            <q-input
              v-model="form.content"
              type="textarea"
              rows="6"
              label="訊息內容 *"
              outlined
              counter
              maxlength="500"
              :rules="[v => !!v || '請填寫訊息內容']"
            />
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
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { broadcastService } from '../services/broadcastService'

const $q = useQuasar()

const loading = ref(true)
const templates = ref([])
const showDialog = ref(false)
const isEdit = ref(false)
const form = ref({ name: '', content: '' })

onMounted(async () => {
  try {
    templates.value = await broadcastService.getTemplates()
  } finally {
    loading.value = false
  }
})

function openAdd() {
  isEdit.value = false
  form.value = { name: '', content: '' }
  showDialog.value = true
}

function openEdit(tpl) {
  isEdit.value = true
  form.value = { ...tpl }
  showDialog.value = true
}

async function saveTemplate() {
  if (isEdit.value) {
    const updated = await broadcastService.updateTemplate(form.value.id, {
      name: form.value.name,
      content: form.value.content
    })
    const idx = templates.value.findIndex(t => t.id === form.value.id)
    if (idx !== -1) templates.value[idx] = updated
    $q.notify({ message: '模板已更新', color: 'positive', icon: 'check' })
  } else {
    const created = await broadcastService.createTemplate({
      name: form.value.name,
      content: form.value.content
    })
    templates.value.push(created)
    $q.notify({ message: '模板已新增', color: 'positive', icon: 'check' })
  }
  showDialog.value = false
}

function confirmDelete(tpl) {
  $q.dialog({
    title: '刪除模板',
    message: `確定要刪除「${tpl.name}」？`,
    cancel: { flat: true, label: '取消' },
    ok: { color: 'negative', label: '刪除' },
    persistent: true
  }).onOk(async () => {
    await broadcastService.deleteTemplate(tpl.id)
    templates.value = templates.value.filter(t => t.id !== tpl.id)
    $q.notify({ message: '模板已刪除', color: 'grey-7', icon: 'delete' })
  })
}
</script>
