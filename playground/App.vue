<template>
  <n-config-provider :theme="darkTheme">
    <div style="display: flex; width: 100%; height: 100vh;">
      <div style="flex: 1; position: relative; display: flex; flex-direction: column;">
        <div style="padding: 12px 16px; background: #1e1e1e; border-bottom: 1px solid #333; display: flex; align-items: center; gap: 12px;">
          <n-button type="primary" @click="fileInput?.click()">
            <template #icon>
              <n-icon>
                <i-ant-design-upload-outlined />
              </n-icon>
            </template>
            Subir PDF
          </n-button>

          <n-text v-if="fileName" depth="2">
            {{ fileName }}
          </n-text>

          <n-button
            v-if="isLocalFile"
            size="small"
            quaternary
            @click="resetToSample"
          >
            Volver al ejemplo
          </n-button>

          <input
            ref="fileInput"
            type="file"
            accept=".pdf,application/pdf"
            style="display: none;"
            @change="handleFileUpload"
          />
        </div>

        <div style="flex: 1; position: relative;">
          <PdfViewer
            ref="pdfViewerRef"
            :src="pdfUrl"
            :initial-annotations="annotations"
            @annotations-change="handleAnnotationsChange"
          />
        </div>
      </div>

      <div style="width: 400px; background: #1e1e1e; border-left: 1px solid #333; display: flex; flex-direction: column;">
        <n-space justify="space-between" align="center" style="padding: 16px; border-bottom: 1px solid #333;">
          <n-h3 style="margin: 0; color: #fff;">Anotaciones (JSON)</n-h3>
          <n-space :size="8">
            <n-button size="small" @click="formatJson">
              Formatear
            </n-button>
            <n-button size="small" @click="resetAnnotations">
              Reset
            </n-button>
          </n-space>
        </n-space>

        <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
          <n-input
            v-model:value="editedJson"
            type="textarea"
            :autosize="false"
            placeholder="Edita el JSON aquí..."
            class="json-editor"
            @focus="isEditing = true"
            @blur="isEditing = false"
          />

          <n-alert
            v-if="jsonError"
            type="error"
            style="margin: 8px 16px;"
            :show-icon="false"
          >
            {{ jsonError }}
          </n-alert>
        </div>

        <div style="padding: 16px; border-top: 1px solid #333;">
          <n-space vertical>
            <n-button
              type="primary"
              block
              @click="applyJsonChanges"
              :loading="applyingChanges"
              :disabled="!!jsonError"
            >
              Aplicar cambios
            </n-button>
            <n-text depth="3" style="font-size: 12px;">
              Edita el JSON arriba y haz clic en "Aplicar cambios" para actualizar el visor
            </n-text>
          </n-space>
        </div>
      </div>
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import {
  NConfigProvider,
  NSpace,
  NH3,
  NButton,
  NInput,
  NText,
  NIcon,
  NAlert,
  darkTheme
} from 'naive-ui'
import type { PageAnnotation } from '../src/types'

const SAMPLE_PDF_URL = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'

const pdfUrl = ref(SAMPLE_PDF_URL)
const fileName = ref<string | null>(null)
const isLocalFile = ref(false)
const annotations = ref<PageAnnotation[]>([])
const editedJson = ref('')
const applyingChanges = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const currentObjectUrl = ref<string | null>(null)
const isEditing = ref(false)
const jsonError = ref<string | null>(null)
const pdfViewerRef = ref<any>(null)

const jsonString = computed(() => {
  return JSON.stringify(annotations.value, null, 2)
})

watch(jsonString, (newVal) => {
  if (!isEditing.value) {
    editedJson.value = newVal
    jsonError.value = null
  }
}, { immediate: true })

watch(editedJson, (newVal) => {
  try {
    if (newVal.trim() === '') {
      jsonError.value = null
      return
    }
    JSON.parse(newVal)
    jsonError.value = null
  } catch (error) {
    jsonError.value = error instanceof Error ? error.message : 'JSON inválido'
  }
})

const handleAnnotationsChange = (newAnnotations: PageAnnotation[]) => {
  annotations.value = newAnnotations
}

const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    alert('Por favor selecciona un archivo PDF válido')
    input.value = ''
    return
  }

  if (currentObjectUrl.value) {
    URL.revokeObjectURL(currentObjectUrl.value)
  }

  currentObjectUrl.value = URL.createObjectURL(file)
  pdfUrl.value = currentObjectUrl.value
  fileName.value = file.name
  isLocalFile.value = true
  annotations.value = []
  input.value = ''
}

const resetToSample = () => {
  if (currentObjectUrl.value) {
    URL.revokeObjectURL(currentObjectUrl.value)
    currentObjectUrl.value = null
  }
  pdfUrl.value = SAMPLE_PDF_URL
  fileName.value = null
  isLocalFile.value = false
  annotations.value = []
}

const resetAnnotations = () => {
  annotations.value = []
  editedJson.value = '[]'
  jsonError.value = null

  if (pdfViewerRef.value) {
    pdfViewerRef.value.setAnnotations([])
  }
}

const formatJson = () => {
  try {
    const parsed = JSON.parse(editedJson.value)
    editedJson.value = JSON.stringify(parsed, null, 2)
    jsonError.value = null
  } catch (error) {
    jsonError.value = error instanceof Error ? error.message : 'JSON inválido'
  }
}

const applyJsonChanges = async () => {
  applyingChanges.value = true
  try {
    const parsed = JSON.parse(editedJson.value)

    if (!Array.isArray(parsed)) {
      jsonError.value = 'El JSON debe ser un array de anotaciones'
      return
    }

    annotations.value = parsed
    jsonError.value = null

    if (pdfViewerRef.value) {
      pdfViewerRef.value.setAnnotations(parsed)
    }
  } catch (error) {
    jsonError.value = error instanceof Error ? error.message : 'JSON inválido'
  } finally {
    applyingChanges.value = false
  }
}

onBeforeUnmount(() => {
  if (currentObjectUrl.value) {
    URL.revokeObjectURL(currentObjectUrl.value)
  }
})
</script>

<style scoped>
.json-editor {
  flex: 1;
  height: 100%;
}

.json-editor :deep(.n-input__textarea-el) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #d4d4d4;
  background-color: #1e1e1e;
  padding: 16px;
  height: 100% !important;
}

.json-editor :deep(.n-input) {
  background-color: #1e1e1e;
  border: none;
  height: 100%;
}

.json-editor :deep(.n-input--focus) {
  border: none;
  box-shadow: none;
}

.json-editor :deep(.n-input__border) {
  border: none;
}

.json-editor :deep(.n-input__state-border) {
  border: none;
}
</style>
