<template>
  <n-layout position="absolute" has-sider>
    <PdfToolbar
      :page="currentPage"
      :total-pages="totalPages"
      :scale="currentScale"
      :active-tool="annotationState.tool"
      :stroke-color="annotationState.strokeColor"
      :downloading="isDownloading"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @page-change="handlePageChange"
      @tool-change="handleToolChange"
      @toggle-sidebar="showSidebar = !showSidebar"
      @update:stroke-color="annotationState.strokeColor = $event"
      @download="handleDownload"
    />

    <n-layout-sider
      v-if="showSidebar"
      bordered
      :width="240"
      :collapsed-width="0"
      collapse-mode="width"
      show-trigger
      position="absolute"
      style="top: 64px; bottom: 0; z-index: 900"
    >
      <n-scrollbar style="max-height: 100%">
        <div style="padding: 12px">
          <n-space vertical>
            <n-card
              v-for="page in totalPages"
              :key="page"
              size="small"
              :bordered="page === currentPage"
              :style="{
                cursor: 'pointer',
                opacity: page === currentPage ? 1 : 0.7,
                borderColor: page === currentPage ? '#2080f0' : '#e0e0e6'
              }"
              @click="handlePageChange(page)"
            >
              <div style="text-align: center; font-size: 14px">
                Página {{ page }}
              </div>
            </n-card>
          </n-space>
        </div>
      </n-scrollbar>
    </n-layout-sider>

    <n-layout-content
      position="absolute"
      style="top: 64px; bottom: 0; right: 0; transition: left 0.3s ease"
      :style="{ left: showSidebar ? '240px' : '0' }"
    >
      <div class="pdf-wrapper">
        <div
          ref="pdfContainer"
          class="pdf-container"
          @scroll="handleContainerScroll"
        >
          <AnnotationStage
            v-if="pdfLoaded"
            :tool="annotationState.tool"
            :stroke-color="annotationState.strokeColor"
            :stroke-width="annotationState.strokeWidth"
            :width="currentPageDimensions.width"
            :height="currentPageDimensions.height"
            :lines="currentAnnotations.lines"
            :shapes="currentAnnotations.shapes"
            :style="annotationStageStyle"
            @update:lines="updateLines"
            @update:shapes="updateShapes"
          />
        </div>
      </div>
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue'
import {
  NLayout,
  NLayoutSider,
  NLayoutContent,
  NSpace,
  NCard,
  NScrollbar
} from 'naive-ui'
import { PdfCore } from '../core/PdfCore'
import { AnnotationExporter } from '../core/AnnotationExporter'
import type { AnnotationTool, AnnotationState, KonvaLine, KonvaShape, PageAnnotation } from '../types'
import PdfToolbar from './PdfToolbar.vue'
import AnnotationStage from './AnnotationStage.vue'

const props = defineProps<{
  src: string
  initialAnnotations?: PageAnnotation[]
}>()

const emit = defineEmits<{
  (e: 'annotations-change', annotations: PageAnnotation[]): void
}>()

const pdfContainer = ref<HTMLDivElement | null>(null)
const core = ref<PdfCore | null>(null)
const currentPage = ref(1)
const totalPages = ref(0)
const currentScale = ref(1.0)
const showSidebar = ref(true)
const pdfLoaded = ref(false)
const isDownloading = ref(false)
const canvasPosition = ref({ top: 0, left: 0 })

const currentPageDimensions = computed(() => {
  if (!core.value) return { width: 800, height: 600 }
  const dimensions = core.value.getPageDimensions(currentPage.value)
  return dimensions || { width: 800, height: 600 }
})

const annotationStageStyle = computed(() => ({
  position: 'absolute' as const,
  top: `${canvasPosition.value.top}px`,
  left: `${canvasPosition.value.left}px`,
  zIndex: 10
}))

const annotationState = reactive<AnnotationState>({
  tool: 'none',
  strokeColor: '#ff0000',
  strokeWidth: 2,
  pages: {}
})

const currentAnnotations = computed(() => {
  return annotationState.pages[currentPage.value] || {
    pageNumber: currentPage.value,
    lines: [],
    shapes: []
  }
})

onMounted(async () => {
  if (!pdfContainer.value) return

  core.value = new PdfCore({
    container: pdfContainer.value,
    scale: 1.0
  })

  core.value.addEventListener('init', (e: any) => {
    totalPages.value = e.detail.pages
    pdfLoaded.value = true

    if (props.initialAnnotations) {
      for (const ann of props.initialAnnotations) {
        annotationState.pages[ann.pageNumber] = ann
      }
    }

    nextTick(() => updateCanvasPosition())
  })

  core.value.addEventListener('page-change', (e: any) => {
    currentPage.value = e.detail
    nextTick(() => updateCanvasPosition())
  })

  await core.value.open(props.src)
})

onBeforeUnmount(() => {
  core.value?.close()
})

watch(
  () => props.src,
  async (newSrc) => {
    if (newSrc && core.value) {
      pdfLoaded.value = false
      await core.value.open(newSrc)
    }
  }
)

watch(currentPage, () => {
  nextTick(() => updateCanvasPosition())
})

const updateCanvasPosition = () => {
  if (!core.value) return

  const position = core.value.getPagePosition(currentPage.value)
  if (position) {
    canvasPosition.value = position
  }
}

const handleContainerScroll = () => {
  nextTick(() => updateCanvasPosition())
}

const handleZoomIn = () => {
  core.value?.zoomIn(1.2)
  currentScale.value = core.value?.getScale() ?? currentScale.value
  nextTick(() => updateCanvasPosition())
}

const handleZoomOut = () => {
  core.value?.zoomOut(1.2)
  currentScale.value = core.value?.getScale() ?? currentScale.value
  nextTick(() => updateCanvasPosition())
}

const handlePageChange = (page: number) => {
  core.value?.goToPage(page)
}

const handleToolChange = (tool: AnnotationTool) => {
  annotationState.tool = tool
}

const updateLines = (lines: KonvaLine[]) => {
  annotationState.pages[currentPage.value] = {
    pageNumber: currentPage.value,
    lines,
    shapes: currentAnnotations.value.shapes
  }
  emitAnnotations()
}

const updateShapes = (shapes: KonvaShape[]) => {
  annotationState.pages[currentPage.value] = {
    pageNumber: currentPage.value,
    lines: currentAnnotations.value.lines,
    shapes
  }
  emitAnnotations()
}

const emitAnnotations = () => {
  const allAnnotations = Object.values(annotationState.pages).filter(
    ann => ann.lines.length > 0 || ann.shapes.length > 0
  )
  emit('annotations-change', allAnnotations)
}

const handleDownload = async () => {
  if (!core.value) return

  isDownloading.value = true
  try {
    const pdfBytes = await core.value.getDocumentBytes()
    if (!pdfBytes) return

    const annotations = Object.values(annotationState.pages)
    const dimensions = currentPageDimensions.value
    const exportedPdf = await AnnotationExporter.exportPdfWithAnnotations(
      pdfBytes,
      annotations,
      dimensions.width,
      dimensions.height
    )

    const blob = new Blob(
      [exportedPdf.buffer as ArrayBuffer],
      { type: 'application/pdf' }
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'documento-anotado.pdf'
    link.click()
    URL.revokeObjectURL(url)
  } finally {
    isDownloading.value = false
  }
}

const setAnnotations = (newAnnotations: PageAnnotation[]) => {
  annotationState.pages = {}

  for (const ann of newAnnotations) {
    annotationState.pages[ann.pageNumber] = ann
  }
}

defineExpose({
  setAnnotations
})
</script>

<style scoped>
.pdf-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: #525659;
}

.pdf-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
}

.pdf-container :deep(.pdf-page) {
  background-color: white;
}

.pdf-container :deep(canvas) {
  display: block;
}

.pdf-container :deep(.textLayer) {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  opacity: 0.25;
  line-height: 1.0;
}

.pdf-container :deep(.textLayer > span) {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
}

.pdf-container :deep(.textLayer ::selection) {
  background: rgba(32, 128, 240, 0.5);
}
</style>
