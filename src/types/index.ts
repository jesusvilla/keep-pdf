export interface PdfCoreConfig {
  container: HTMLElement
  scale?: number | string
  textLayerMode?: number
}

export interface PdfDocumentInfo {
  pages: number
  title?: string
  fingerprint?: string
}

export type AnnotationTool =
  | 'none'
  | 'pdf-text'
  | 'highlight'
  | 'rectangle'
  | 'ellipse'
  | 'free-draw'
  | 'text'

export interface KonvaLine {
  id: string
  tool: 'pen'
  points: number[]
  stroke: string
  strokeWidth: number
  tension: number
  lineCap: 'round' | 'square' | 'butt'
  globalCompositeOperation: 'source-over'
  x?: number
  y?: number
  rotation?: number
}

export interface KonvaRect {
  id: string
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
  stroke: string
  strokeWidth: number
  fill: string
  rotation: number
}

export interface KonvaEllipse {
  id: string
  type: 'ellipse'
  x: number
  y: number
  radiusX: number
  radiusY: number
  stroke: string
  strokeWidth: number
  fill: string
  rotation: number
}

export interface KonvaText {
  id: string
  type: 'text'
  x: number
  y: number
  text: string
  fontSize: number
  fill: string
  rotation: number
}

export type KonvaShape = KonvaRect | KonvaEllipse | KonvaText

export interface PageAnnotation {
  pageNumber: number
  lines: KonvaLine[]
  shapes: KonvaShape[]
}

export interface AnnotationState {
  tool: AnnotationTool
  strokeColor: string
  strokeWidth: number
  pages: Record<number, PageAnnotation>
}

export interface PdfViewerProps {
  src: string
  initialAnnotations?: PageAnnotation[]
}
