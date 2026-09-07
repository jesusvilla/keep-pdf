<template>
  <n-layout-header bordered style="height: 64px; padding: 0 24px; z-index: 1000">
    <n-space align="center" justify="space-between" style="height: 100%">
      <n-space align="center" :size="12">
        <n-button quaternary circle @click="$emit('toggle-sidebar')">
          <template #icon>
            <n-icon :size="18">
              <i-ant-design-menu-outlined />
            </n-icon>
          </template>
        </n-button>

        <n-button
          @click="$emit('page-change', page - 1)"
          :disabled="page <= 1"
          quaternary
        >
          <template #icon>
            <n-icon :size="16">
              <i-ant-design-left-outlined />
            </n-icon>
          </template>
        </n-button>

        <n-input-number
          :value="page"
          :min="1"
          :max="totalPages"
          size="small"
          style="width: 70px"
          @update:value="$emit('page-change', $event ?? 1)"
        />
        <span style="color: #666">/ {{ totalPages }}</span>

        <n-button
          @click="$emit('page-change', page + 1)"
          :disabled="page >= totalPages"
          quaternary
        >
          <template #icon>
            <n-icon :size="16">
              <i-ant-design-right-outlined />
            </n-icon>
          </template>
        </n-button>
      </n-space>

      <n-space align="center" :size="8">
        <n-tooltip>
          <template #trigger>
            <n-button
              :type="activeTool === 'none' ? 'primary' : 'default'"
              :secondary="activeTool !== 'none'"
              size="small"
              @click="$emit('tool-change', 'none')"
            >
              <template #icon>
                <n-icon :size="16">
                  <i-ant-design-select-outlined />
                </n-icon>
              </template>
            </n-button>
          </template>
          Selección
        </n-tooltip>

        <n-tooltip>
          <template #trigger>
            <n-button
              :type="activeTool === 'pdf-text' ? 'primary' : 'default'"
              :secondary="activeTool !== 'pdf-text'"
              size="small"
              @click="$emit('tool-change', 'pdf-text')"
            >
              <template #icon>
                <n-icon :size="16">
                  <i-ant-design-font-size-outlined />
                </n-icon>
              </template>
            </n-button>
          </template>
          Texto del PDF
        </n-tooltip>

        <n-divider vertical />

        <n-tooltip v-for="tool in drawingTools" :key="tool.name">
          <template #trigger>
            <n-button
              :type="activeTool === tool.name ? 'primary' : 'default'"
              :secondary="activeTool !== tool.name"
              size="small"
              @click="$emit('tool-change', tool.name)"
            >
              <template #icon>
                <n-icon :size="16">
                  <component :is="tool.icon" />
                </n-icon>
              </template>
            </n-button>
          </template>
          {{ tool.label }}
        </n-tooltip>

        <n-divider vertical />

        <n-color-picker
          :value="strokeColor"
          @update:value="$emit('update:strokeColor', $event)"
          size="small"
          :show-alpha="false"
          :modes="['hex']"
          :swatches="[]"
        >
          <template #trigger="{ value, onClick, ref: triggerRef }">
            <n-button
              :ref="triggerRef"
              size="small"
              secondary
              @click="onClick"
              class="color-trigger-button"
            >
              <template #icon>
                <div class="toolbar-color-indicator" :style="{ backgroundColor: value || '#000' }" />
              </template>
            </n-button>
          </template>
        </n-color-picker>

        <n-divider vertical />

        <n-button
          type="primary"
          size="small"
          @click="$emit('download')"
          :loading="downloading"
        >
          <template #icon>
            <n-icon :size="16">
              <i-ant-design-download-outlined />
            </n-icon>
          </template>
          Descargar
        </n-button>
      </n-space>

      <n-space align="center" :size="8">
        <n-button @click="$emit('zoom-out')" quaternary circle size="small">
          <template #icon>
            <n-icon :size="16">
              <i-ant-design-minus-outlined />
            </n-icon>
          </template>
        </n-button>
        <span style="min-width: 50px; text-align: center; font-size: 14px">
          {{ Math.round(scale * 100) }}%
        </span>
        <n-button @click="$emit('zoom-in')" quaternary circle size="small">
          <template #icon>
            <n-icon :size="16">
              <i-ant-design-plus-outlined />
            </n-icon>
          </template>
        </n-button>
      </n-space>
    </n-space>
  </n-layout-header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  NLayoutHeader,
  NSpace,
  NButton,
  NInputNumber,
  NIcon,
  NDivider,
  NTooltip,
  NColorPicker
} from 'naive-ui'
import type { AnnotationTool } from '../types'

import AntDesignEditOutlined from '~icons/ant-design/edit-outlined'
import AntDesignBorderOutlined from '~icons/ant-design/border-outlined'
import AntDesignRadiusUprightOutlined from '~icons/ant-design/radius-upright-outlined'
import AntDesignFontSizeOutlined from '~icons/ant-design/font-size-outlined'

defineProps<{
  page: number
  totalPages: number
  scale: number
  activeTool: AnnotationTool
  strokeColor: string
  downloading: boolean
}>()

defineEmits<{
  (e: 'zoom-in'): void
  (e: 'zoom-out'): void
  (e: 'page-change', page: number): void
  (e: 'tool-change', tool: AnnotationTool): void
  (e: 'toggle-sidebar'): void
  (e: 'update:strokeColor', color: string): void
  (e: 'download'): void
}>()

const drawingTools = computed(() => [
  { name: 'free-draw' as const, label: 'Lápiz', icon: AntDesignEditOutlined },
  { name: 'rectangle' as const, label: 'Rectángulo', icon: AntDesignBorderOutlined },
  { name: 'ellipse' as const, label: 'Elipse', icon: AntDesignRadiusUprightOutlined },
  { name: 'text' as const, label: 'Texto', icon: AntDesignFontSizeOutlined }
])
</script>
<style scoped>
.color-trigger-button {
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.toolbar-color-indicator {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}
</style>
