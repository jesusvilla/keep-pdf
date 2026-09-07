<template>
  <div
    class="annotation-container"
    ref="containerRef"
    :style="{ pointerEvents: tool === 'pdf-text' ? 'none' : 'auto' }"
  >
    <v-stage
      ref="stage"
      :config="stageConfig"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
      @click="handleStageClick"
      @tap="handleStageClick"
    >
      <v-layer ref="layerRef">
        <v-rect
          v-for="shape in shapes.filter(s => s.type === 'rect')"
          :key="shape.id"
          :config="getShapeConfig(shape)"
          @mousedown="handleObjectMouseDown"
          @click="handleObjectClick"
          @tap="handleObjectClick"
          @transformEnd="handleTransformEnd"
          @dragStart="handleObjectDragStart"
          @dragEnd="handleDragEnd"
          @dblClick="handleTextDblClick"
        />

        <v-ellipse
          v-for="shape in shapes.filter(s => s.type === 'ellipse')"
          :key="shape.id"
          :config="getShapeConfig(shape)"
          @mousedown="handleObjectMouseDown"
          @click="handleObjectClick"
          @tap="handleObjectClick"
          @transformEnd="handleTransformEnd"
          @dragStart="handleObjectDragStart"
          @dragEnd="handleDragEnd"
          @dblClick="handleTextDblClick"
        />

        <v-text
          v-for="shape in shapes.filter(s => s.type === 'text')"
          :key="shape.id"
          :config="getTextConfig(shape)"
          @mousedown="handleObjectMouseDown"
          @click="handleObjectClick"
          @tap="handleObjectClick"
          @transformEnd="handleTransformEnd"
          @dragStart="handleObjectDragStart"
          @dragEnd="handleDragEnd"
          @dblClick="handleTextDblClick"
        />

        <v-line
          v-for="line in lines"
          :key="line.id"
          :config="getLineConfig(line)"
          @mousedown="handleObjectMouseDown"
          @click="handleObjectClick"
          @tap="handleObjectClick"
          @transformEnd="handleLineTransformEnd"
          @dragStart="handleObjectDragStart"
          @dragEnd="handleLineDragEnd"
        />

        <v-line v-if="isDrawing && currentLine" :config="currentLine" />

        <v-rect
          v-if="isSelecting"
          :config="selectionRectConfig"
        />

        <v-transformer ref="transformerRef" :config="transformerConfig" />
      </v-layer>
    </v-stage>

    <div
      v-if="selectedNodeIds.length > 0 && !isDraggingObject"
      class="action-popover"
      :style="popoverStyle"
    >
      <n-space :size="2" align="center">
        <n-tooltip>
          <template #trigger>
            <n-color-picker
              :value="selectedColor"
              @update:value="changeSelectedObjectsColor"
              :show-alpha="false"
              :modes="['hex']"
            >
              <template #trigger="{ value, onClick, ref: triggerRef }">
                <div
                  :ref="triggerRef"
                  class="color-circle"
                  :style="{ backgroundColor: value || '#000' }"
                  @click="onClick"
                />
              </template>
            </n-color-picker>
          </template>
          Cambiar color
        </n-tooltip>

        <n-tooltip>
          <template #trigger>
            <n-button
              type="error"
              size="small"
              secondary
              class="action-button"
              @click="deleteSelectedObjects"
            >
              <template #icon>
                <n-icon :size="16">
                  <i-ant-design-delete-outlined />
                </n-icon>
              </template>
            </n-button>
          </template>
          Eliminar
        </n-tooltip>
      </n-space>
    </div>

    <textarea
      v-if="editingText"
      ref="textAreaRef"
      class="text-editor"
      v-model="editingTextValue"
      @blur="commitTextEdit"
      @keydown.enter.prevent="commitTextEdit"
      @keydown.escape="cancelTextEdit"
      :style="textEditorStyle"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { NButton, NIcon, NSpace, NColorPicker, NDivider } from 'naive-ui'
import type { AnnotationTool, KonvaLine, KonvaShape } from '../types'

const props = defineProps<{
  tool: AnnotationTool
  strokeColor: string
  strokeWidth: number
  width: number
  height: number
  lines: KonvaLine[]
  shapes: KonvaShape[]
}>()

const emit = defineEmits<{
  (e: 'update:lines', lines: KonvaLine[]): void
  (e: 'update:shapes', shapes: KonvaShape[]): void
}>()

const stage = ref<any>(null)
const layerRef = ref<any>(null)
const transformerRef = ref<any>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const textAreaRef = ref<HTMLTextAreaElement | null>(null)

const isDrawing = ref(false)
const isSelecting = ref(false)
const isDraggingExisting = ref(false)
const isDraggingObject = ref(false)
const currentLine = ref<KonvaLine | null>(null)
const selectedNodeIds = ref<string[]>([])
const editingText = ref(false)
const editingTextValue = ref('')
const editingTextId = ref<string | null>(null)

const selectionStart = ref({ x: 0, y: 0 })
const selectionCurrent = ref({ x: 0, y: 0 })
const popoverPosition = ref({ x: 0, y: 0 })
const selectedColor = ref('#ff0000')

const drawStart = ref({ x: 0, y: 0 })
const hasShapeCreated = ref(false)

const stageConfig = computed(() => ({
  width: props.width,
  height: props.height
}))

const transformerConfig = {
  anchorSize: 8,
  borderStroke: '#2080f0',
  borderStrokeWidth: 1,
  borderDash: [4, 4],
  padding: 6,
  anchorStroke: '#2080f0',
  anchorFill: '#ffffff',
  anchorCornerRadius: 2,
  rotateEnabled: true,
  rotateAnchorOffset: 30,
  keepRatio: false,
  enabledAnchors: [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
    'middle-left',
    'middle-right',
    'top-center',
    'bottom-center'
  ]
}

const selectionRectConfig = computed(() => {
  const x = Math.min(selectionStart.value.x, selectionCurrent.value.x)
  const y = Math.min(selectionStart.value.y, selectionCurrent.value.y)
  const width = Math.abs(selectionCurrent.value.x - selectionStart.value.x)
  const height = Math.abs(selectionCurrent.value.y - selectionStart.value.y)

  return {
    x,
    y,
    width,
    height,
    fill: 'rgba(32, 128, 240, 0.1)',
    stroke: '#2080f0',
    strokeWidth: 1,
    dash: [4, 4],
    listening: false
  }
})

const popoverStyle = computed(() => ({
  position: 'absolute' as const,
  top: `${popoverPosition.value.y}px`,
  left: `${popoverPosition.value.x}px`,
  zIndex: 1001
}))

const getShapeConfig = (shape: KonvaShape) => {
  if (shape.type === 'rect') {
    return {
      id: shape.id,
      name: shape.id,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      stroke: shape.stroke,
      strokeWidth: shape.strokeWidth,
      fill: shape.fill !== 'transparent' ? shape.fill : undefined,
      rotation: shape.rotation || 0,
      draggable: true
    }
  }
  if (shape.type === 'ellipse') {
    return {
      id: shape.id,
      name: shape.id,
      x: shape.x,
      y: shape.y,
      radiusX: shape.radiusX,
      radiusY: shape.radiusY,
      stroke: shape.stroke,
      strokeWidth: shape.strokeWidth,
      fill: shape.fill !== 'transparent' ? shape.fill : undefined,
      rotation: shape.rotation || 0,
      draggable: true
    }
  }
  return { ...shape, draggable: true }
}

const getTextConfig = (shape: KonvaShape) => {
  if (shape.type === 'text') {
    return {
      id: shape.id,
      name: shape.id,
      x: shape.x,
      y: shape.y,
      text: shape.text,
      fontSize: shape.fontSize,
      fill: shape.fill,
      rotation: shape.rotation || 0,
      draggable: true
    }
  }
  return { ...shape, draggable: true }
}

const getLineConfig = (line: KonvaLine) => {
  return {
    id: line.id,
    name: line.id,
    points: line.points,
    stroke: line.stroke,
    strokeWidth: line.strokeWidth,
    tension: line.tension,
    lineCap: line.lineCap,
    globalCompositeOperation: line.globalCompositeOperation,
    x: line.x || 0,
    y: line.y || 0,
    rotation: line.rotation || 0,
    draggable: true,
    hitStrokeWidth: 20
  }
}

const textEditorStyle = computed(() => {
  if (!editingTextId.value) return { display: 'none' }

  const shape = props.shapes.find(s => s.id === editingTextId.value)
  if (!shape || shape.type !== 'text') return { display: 'none' }

  return {
    position: 'absolute' as const,
    top: `${shape.y}px`,
    left: `${shape.x}px`,
    fontSize: `${shape.fontSize}px`,
    color: shape.fill,
    background: 'rgba(255, 255, 255, 0.95)',
    border: '2px solid #2080f0',
    borderRadius: '4px',
    outline: 'none',
    resize: 'none' as const,
    fontFamily: 'inherit',
    padding: '4px',
    minWidth: '100px',
    minHeight: `${shape.fontSize + 10}px`,
    zIndex: 1000,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
  }
})

watch(() => [props.width, props.height], () => {
  stage.value?.getStage()?.batchDraw()
})

watch(selectedNodeIds, () => {
  nextTick(() => {
    updatePopoverPosition()
    updateSelectedColor()
  })
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

const getPointer = () => {
  const s = stage.value?.getStage()
  return s ? s.getPointerPosition() : null
}

const isDrawingTool = computed(() => {
  return ['free-draw', 'rectangle', 'ellipse', 'text'].includes(props.tool)
})

const handleKeyDown = (e: KeyboardEvent) => {
  if (editingText.value) return

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedNodeIds.value.length > 0) {
      e.preventDefault()
      deleteSelectedObjects()
    }
  }
}

const handleObjectMouseDown = (e: any) => {
  e.cancelBubble = true
  isDraggingExisting.value = true

  const node = e.target
  const nodeId = node.name()

  if (nodeId) {
    selectedNodeIds.value = [nodeId]
    updateTransformer([node])
  }
}

const handleMouseDown = (e: any) => {
  if (isDraggingExisting.value) return

  if (props.tool === 'none') {
    const clickedOnEmpty = e.target === e.target.getStage()

    if (clickedOnEmpty) {
      const pos = getPointer()
      if (pos) {
        isSelecting.value = true
        selectionStart.value = { x: pos.x, y: pos.y }
        selectionCurrent.value = { x: pos.x, y: pos.y }
      }
    }
    return
  }

  if (props.tool === 'pdf-text') return

  const pos = getPointer()
  if (!pos) return

  if (editingText.value) {
    commitTextEdit()
    return
  }

  isDrawing.value = true
  drawStart.value = { x: pos.x, y: pos.y }
  hasShapeCreated.value = false

  if (props.tool === 'free-draw') {
    currentLine.value = {
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tool: 'pen',
      points: [pos.x, pos.y],
      stroke: props.strokeColor,
      strokeWidth: props.strokeWidth,
      tension: 0.5,
      lineCap: 'round',
      globalCompositeOperation: 'source-over'
    }
  } else if (props.tool === 'text') {
    const newShapes = [...props.shapes, {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'text' as const,
      x: pos.x,
      y: pos.y,
      text: 'Texto',
      fontSize: 16,
      fill: props.strokeColor,
      rotation: 0
    }]
    emit('update:shapes', newShapes)
  }
}

const handleMouseMove = () => {
  if (isDraggingExisting.value) return

  const pos = getPointer()
  if (!pos) return

  if (isSelecting.value) {
    selectionCurrent.value = { x: pos.x, y: pos.y }
    return
  }

  if (!isDrawing.value) return

  if (props.tool === 'free-draw' && currentLine.value) {
    currentLine.value.points = [...currentLine.value.points, pos.x, pos.y]
  } else if (props.tool === 'rectangle') {
    const distance = Math.sqrt(
      Math.pow(pos.x - drawStart.value.x, 2) +
      Math.pow(pos.y - drawStart.value.y, 2)
    )

    if (distance < 3) return

    const x = Math.min(drawStart.value.x, pos.x)
    const y = Math.min(drawStart.value.y, pos.y)
    const width = Math.abs(pos.x - drawStart.value.x)
    const height = Math.abs(pos.y - drawStart.value.y)

    if (!hasShapeCreated.value) {
      const newShapes = [...props.shapes, {
        id: `rect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'rect' as const,
        x, y, width, height,
        stroke: props.strokeColor,
        strokeWidth: props.strokeWidth,
        fill: 'transparent',
        rotation: 0
      }]
      emit('update:shapes', newShapes)
      hasShapeCreated.value = true
    } else {
      const newShapes = props.shapes.map((shape, index) => {
        if (index === props.shapes.length - 1 && shape.type === 'rect') {
          return { ...shape, x, y, width, height }
        }
        return shape
      })
      emit('update:shapes', newShapes)
    }
  } else if (props.tool === 'ellipse') {
    const distance = Math.sqrt(
      Math.pow(pos.x - drawStart.value.x, 2) +
      Math.pow(pos.y - drawStart.value.y, 2)
    )

    if (distance < 3) return

    const centerX = (drawStart.value.x + pos.x) / 2
    const centerY = (drawStart.value.y + pos.y) / 2
    const radiusX = Math.abs(pos.x - drawStart.value.x) / 2
    const radiusY = Math.abs(pos.y - drawStart.value.y) / 2

    if (!hasShapeCreated.value) {
      const newShapes = [...props.shapes, {
        id: `ellipse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'ellipse' as const,
        x: centerX,
        y: centerY,
        radiusX,
        radiusY,
        stroke: props.strokeColor,
        strokeWidth: props.strokeWidth,
        fill: 'transparent',
        rotation: 0
      }]
      emit('update:shapes', newShapes)
      hasShapeCreated.value = true
    } else {
      const newShapes = props.shapes.map((shape, index) => {
        if (index === props.shapes.length - 1 && shape.type === 'ellipse') {
          return { ...shape, x: centerX, y: centerY, radiusX, radiusY }
        }
        return shape
      })
      emit('update:shapes', newShapes)
    }
  }
}

const handleMouseUp = () => {
  isDraggingExisting.value = false

  if (isSelecting.value) {
    performRegionSelection()
    isSelecting.value = false
    return
  }

  if (!isDrawing.value) return

  if (props.tool === 'free-draw' && currentLine.value) {
    if (currentLine.value.points.length > 2) {
      const newLines = [...props.lines, currentLine.value]
      emit('update:lines', newLines)
    }
    currentLine.value = null
  } else if (props.tool === 'rectangle' && hasShapeCreated.value) {
    const lastShape = props.shapes[props.shapes.length - 1]
    if (lastShape && lastShape.type === 'rect' && (lastShape.width < 5 || lastShape.height < 5)) {
      const newShapes = props.shapes.slice(0, -1)
      emit('update:shapes', newShapes)
    }
  } else if (props.tool === 'ellipse' && hasShapeCreated.value) {
    const lastShape = props.shapes[props.shapes.length - 1]
    if (lastShape && lastShape.type === 'ellipse' && (lastShape.radiusX < 3 || lastShape.radiusY < 3)) {
      const newShapes = props.shapes.slice(0, -1)
      emit('update:shapes', newShapes)
    }
  }

  isDrawing.value = false
  hasShapeCreated.value = false
}

const performRegionSelection = () => {
  const stageNode = stage.value?.getStage()
  if (!stageNode) return

  const x1 = Math.min(selectionStart.value.x, selectionCurrent.value.x)
  const y1 = Math.min(selectionStart.value.y, selectionCurrent.value.y)
  const x2 = Math.max(selectionStart.value.x, selectionCurrent.value.x)
  const y2 = Math.max(selectionStart.value.y, selectionCurrent.value.y)

  const selectionWidth = x2 - x1
  const selectionHeight = y2 - y1

  if (selectionWidth < 5 || selectionHeight < 5) return

  const layerNode = layerRef.value?.getNode()
  if (!layerNode) return

  const selectedNodes: any[] = []
  const selectedIds: string[] = []

  layerNode.getChildren().forEach((node: any) => {
    const nodeName = node.name()
    if (!nodeName || node.getClassName() === 'Transformer') return

    const nodeRect = node.getClientRect({
      skipTransform: false,
      relativeTo: stageNode
    })

    const hasIntersection = !(
      nodeRect.x > x2 ||
      nodeRect.x + nodeRect.width < x1 ||
      nodeRect.y > y2 ||
      nodeRect.y + nodeRect.height < y1
    )

    if (hasIntersection) {
      selectedNodes.push(node)
      selectedIds.push(nodeName)
    }
  })

  selectedNodeIds.value = selectedIds
  updateTransformer(selectedNodes)
}

const handleStageClick = (e: any) => {
  if (editingText.value) {
    commitTextEdit()
    return
  }

  const clickedOnEmpty = e.target === e.target.getStage()

  if (clickedOnEmpty && !isSelecting.value) {
    selectedNodeIds.value = []
    updateTransformer([])
  }
}

const handleObjectClick = (e: any) => {
  e.cancelBubble = true

  const node = e.target
  const nodeId = node.name()

  if (!nodeId) return

  selectedNodeIds.value = [nodeId]
  updateTransformer([node])
}

const updateTransformer = (nodes: any[]) => {
  const transformer = transformerRef.value?.getNode()
  if (!transformer) return

  if (!nodes || nodes.length === 0) {
    transformer.nodes([])
    transformer.getLayer()?.batchDraw()
    return
  }

  transformer.nodes(nodes)
  transformer.getLayer()?.batchDraw()
}

const updatePopoverPosition = () => {
  if (selectedNodeIds.value.length === 0) return

  const transformer = transformerRef.value?.getNode()
  if (!transformer) return

  const transformerRect = transformer.getClientRect()

  popoverPosition.value = {
    x: transformerRect.x + transformerRect.width + 12,
    y: transformerRect.y + (transformerRect.height / 2) - 20
  }
}

const updateSelectedColor = () => {
  if (selectedNodeIds.value.length === 0) return

  const firstId = selectedNodeIds.value[0]

  const shape = props.shapes.find(s => s.id === firstId)
  if (shape) {
    selectedColor.value = shape.type === 'text' ? shape.fill : shape.stroke
    return
  }

  const line = props.lines.find(l => l.id === firstId)
  if (line) {
    selectedColor.value = line.stroke
  }
}

const changeSelectedObjectsColor = (newColor: string) => {
  selectedColor.value = newColor

  const idsToUpdate = new Set(selectedNodeIds.value)

  const newShapes = props.shapes.map(shape => {
    if (!idsToUpdate.has(shape.id)) return shape

    if (shape.type === 'text') {
      return { ...shape, fill: newColor }
    }

    return { ...shape, stroke: newColor }
  })

  const newLines = props.lines.map(line => {
    if (!idsToUpdate.has(line.id)) return line
    return { ...line, stroke: newColor }
  })

  if (newShapes.some((s, i) => s !== props.shapes[i])) {
    emit('update:shapes', newShapes)
  }

  if (newLines.some((l, i) => l !== props.lines[i])) {
    emit('update:lines', newLines)
  }
}

const deleteSelectedObjects = () => {
  if (selectedNodeIds.value.length === 0) return

  const idsToDelete = new Set(selectedNodeIds.value)

  const newShapes = props.shapes.filter(shape => !idsToDelete.has(shape.id))
  const newLines = props.lines.filter(line => !idsToDelete.has(line.id))

  if (newShapes.length !== props.shapes.length) {
    emit('update:shapes', newShapes)
  }

  if (newLines.length !== props.lines.length) {
    emit('update:lines', newLines)
  }

  selectedNodeIds.value = []
  updateTransformer([])
}

const handleTransformEnd = (e: any) => {
  const node = e.target
  const id = node.name()

  const newShapes = props.shapes.map(shape => {
    if (shape.id !== id) return shape

    if (shape.type === 'rect') {
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      node.scaleX(1)
      node.scaleY(1)

      return {
        ...shape,
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
        rotation: node.rotation()
      }
    }

    if (shape.type === 'ellipse') {
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      node.scaleX(1)
      node.scaleY(1)

      return {
        ...shape,
        x: node.x(),
        y: node.y(),
        radiusX: Math.max(5, shape.radiusX * scaleX),
        radiusY: Math.max(5, shape.radiusY * scaleY),
        rotation: node.rotation()
      }
    }

    if (shape.type === 'text') {
      const scaleX = node.scaleX()
      node.scaleX(1)
      node.scaleY(1)

      return {
        ...shape,
        x: node.x(),
        y: node.y(),
        fontSize: Math.max(8, shape.fontSize * scaleX),
        rotation: node.rotation()
      }
    }

    return shape
  })

  emit('update:shapes', newShapes)
  isDraggingObject.value = false
  nextTick(() => updatePopoverPosition())
}

const handleDragEnd = (e: any) => {
  const node = e.target
  const id = node.name()

  const newShapes = props.shapes.map(shape => {
    if (shape.id !== id) return shape

    return {
      ...shape,
      x: node.x(),
      y: node.y()
    }
  })

  emit('update:shapes', newShapes)
  isDraggingObject.value = false
  nextTick(() => updatePopoverPosition())
}

const handleLineTransformEnd = (e: any) => {
  const node = e.target
  const id = node.name()

  const newLines = props.lines.map(line => {
    if (line.id !== id) return line

    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    node.scaleX(1)
    node.scaleY(1)

    const newPoints = line.points.map((point, index) => {
      if (index % 2 === 0) {
        return point * scaleX
      }
      return point * scaleY
    })

    return {
      ...line,
      points: newPoints,
      x: node.x(),
      y: node.y(),
      rotation: node.rotation()
    } as KonvaLine
  })

  emit('update:lines', newLines)
  isDraggingObject.value = false
  nextTick(() => updatePopoverPosition())
}

const handleObjectDragStart = () => {
  isDraggingObject.value = true
}

const handleLineDragEnd = (e: any) => {
  const node = e.target
  const id = node.name()

  const newLines = props.lines.map(line => {
    if (line.id !== id) return line

    return {
      ...line,
      x: node.x(),
      y: node.y()
    } as KonvaLine
  })

  emit('update:lines', newLines)
  isDraggingObject.value = false
  nextTick(() => updatePopoverPosition())
}

const handleTextDblClick = (e: any) => {
  e.cancelBubble = true

  const node = e.target
  const id = node.name()

  const shape = props.shapes.find(s => s.id === id)
  if (shape && shape.type === 'text') {
    startTextEdit(shape)
  }
}

const startTextEdit = (shape: KonvaShape) => {
  if (shape.type !== 'text') return

  editingTextId.value = shape.id
  editingTextValue.value = shape.text
  editingText.value = true

  nextTick(() => {
    if (textAreaRef.value) {
      textAreaRef.value.focus()
      textAreaRef.value.select()
    }
  })
}

const commitTextEdit = () => {
  if (!editingTextId.value) return

  const newShapes = props.shapes.map(shape => {
    if (shape.id !== editingTextId.value) return shape

    if (shape.type === 'text') {
      return {
        ...shape,
        text: editingTextValue.value
      }
    }

    return shape
  })

  emit('update:shapes', newShapes)

  editingText.value = false
  editingTextId.value = null
  editingTextValue.value = ''
}

const cancelTextEdit = () => {
  editingText.value = false
  editingTextId.value = null
  editingTextValue.value = ''
}
</script>

<style scoped>
.annotation-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.action-popover {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
  border: 1px solid #e0e0e6;
  display: inline-flex;
}

.action-popover::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  width: 8px;
  height: 8px;
  background: white;
  border-left: 1px solid #e0e0e6;
  border-bottom: 1px solid #e0e0e6;
}

.color-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.color-circle:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
  transform: scale(1.05);
}

.color-picker-wrapper {
  display: inline-block;
  cursor: pointer;
  line-height: 0;
}

.color-picker-wrapper :deep(.n-color-picker-trigger) {
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}

.color-square {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.color-square:hover {
  border-color: rgba(0, 0, 0, 0.2);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-button {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.text-editor {
  position: absolute;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid #2080f0;
  border-radius: 4px;
  outline: none;
  resize: none;
  font-family: inherit;
  padding: 4px;
  min-width: 100px;
  min-height: 30px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style>
