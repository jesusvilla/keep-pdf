import type { App, Plugin } from 'vue'

import PdfViewer from './components/PdfViewer.vue'
import PdfToolbar from './components/PdfToolbar.vue'
import AnnotationStage from './components/AnnotationStage.vue'

export type {
  PdfCoreConfig,
  PdfDocumentInfo,
  AnnotationTool,
  KonvaLine,
  KonvaShape,
  KonvaRect,
  KonvaEllipse,
  KonvaText,
  PageAnnotation,
  AnnotationState,
  PdfViewerProps
} from './types'

export { PdfCore } from './core/PdfCore'
export { EventBus } from './core/EventBus'
export { AnnotationExporter } from './core/AnnotationExporter'
export { PdfViewer, PdfToolbar, AnnotationStage }

const KeepPdfPlugin: Plugin = {
  install(app: App) {
    app.component('PdfViewer', PdfViewer)
    app.component('PdfToolbar', PdfToolbar)
    app.component('AnnotationStage', AnnotationStage)
  }
}

export default KeepPdfPlugin
