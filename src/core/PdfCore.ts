import pdfjsLib from './pdfWorker'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PdfCoreConfig, PdfDocumentInfo } from '../types'

interface RenderParameters {
  canvasContext: CanvasRenderingContext2D
  viewport: any
}

interface PdfCoreEventMap {
  init: CustomEvent<PdfDocumentInfo>
  'page-change': CustomEvent<number>
  'pages-rendered': CustomEvent<void>
  error: CustomEvent<string>
}

interface PageInfo {
  pageNumber: number
  container: HTMLDivElement
  canvas: HTMLCanvasElement
  renderTask: pdfjsLib.RenderTask | null
  viewport: any
}

export class PdfCore extends EventTarget {
  private container: HTMLElement
  private scale: number
  private textLayerMode: number
  private document: PDFDocumentProxy | null = null
  private loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null
  private pages: PageInfo[] = []
  private currentPageNumber: number = 1
  private observer: IntersectionObserver | null = null

  constructor(config: PdfCoreConfig) {
    super()
    this.container = config.container
    this.scale = typeof config.scale === 'number' ? config.scale : 1.0
    this.textLayerMode = config.textLayerMode ?? 2
    this.setupContainer()
    this.setupIntersectionObserver()
  }

  private setupContainer(): void {
    this.container.style.overflow = 'auto'
    this.container.style.position = 'relative'
    this.container.addEventListener('scroll', this.handleScroll.bind(this))
  }

  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNumber = parseInt(entry.target.getAttribute('data-page-number') || '1')
            if (pageNumber !== this.currentPageNumber) {
              this.currentPageNumber = pageNumber
              this.dispatch('page-change', pageNumber)
            }
          }
        }
      },
      { threshold: 0.5 }
    )
  }

  private dispatch<K extends keyof PdfCoreEventMap>(
    eventName: K,
    detail?: PdfCoreEventMap[K] extends CustomEvent<infer D> ? D : never
  ): void {
    this.dispatchEvent(new CustomEvent(eventName, { detail }))
  }

  async open(url: string): Promise<void> {
    if (this.loadingTask) await this.close()

    try {
      this.loadingTask = pdfjsLib.getDocument({
        url,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/cmaps/',
        cMapPacked: true
      })

      this.document = await this.loadingTask.promise
      await this.renderAllPages()

      this.dispatch('init', {
        pages: this.document.numPages
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.dispatch('error', message)
    }
  }

  private async renderAllPages(): Promise<void> {
    if (!this.document) return

    this.container.innerHTML = ''
    this.pages = []

    for (let i = 1; i <= this.document.numPages; i++) {
      await this.renderPage(i)
    }

    this.dispatch('pages-rendered')
  }

  private async renderPage(pageNumber: number): Promise<void> {
    if (!this.document) return

    try {
      const page = await this.document.getPage(pageNumber)
      const viewport = page.getViewport({ scale: this.scale })
      const renderViewport = page.getViewport({ scale: this.scale * 2 })

      const container = document.createElement('div')
      container.className = 'pdf-page'
      container.setAttribute('data-page-number', String(pageNumber))
      container.style.position = 'relative'
      container.style.margin = '10px auto'
      container.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)'
      container.style.width = `${viewport.width}px`
      container.style.height = `${viewport.height}px`
      container.style.backgroundColor = 'white'

      const canvas = document.createElement('canvas')
      canvas.width = renderViewport.width
      canvas.height = renderViewport.height
      canvas.style.display = 'block'
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      container.appendChild(canvas)

      if (this.textLayerMode > 0) {
        const textLayerDiv = document.createElement('div')
        textLayerDiv.className = 'textLayer'
        textLayerDiv.style.width = `${viewport.width}px`
        textLayerDiv.style.height = `${viewport.height}px`
        container.appendChild(textLayerDiv)

        await this.renderTextLayerManual(page, textLayerDiv, viewport)
      }

      this.container.appendChild(container)

      const pageInfo: PageInfo = {
        pageNumber,
        container,
        canvas,
        renderTask: null,
        viewport
      }

      this.pages.push(pageInfo)
      this.observer?.observe(container)

      const context = canvas.getContext('2d')
      if (!context) return

      const renderContext: RenderParameters = {
        canvasContext: context,
        viewport: renderViewport
      }

      pageInfo.renderTask = page.render(renderContext)
      await pageInfo.renderTask.promise
    } catch (error) {
      console.error(`[PdfCore] Error rendering page ${pageNumber}:`, error)
    }
  }

  private async renderTextLayerManual(
    page: any,
    container: HTMLDivElement,
    viewport: any
  ): Promise<void> {
    const textContent = await page.getTextContent()
    const textItems = textContent.items as any[]

    for (const item of textItems) {
      if (!item.str || item.str.trim() === '') continue

      const tx = (pdfjsLib as any).Util?.transform || null
      let transform = viewport.transform

      if (tx) {
        transform = tx(viewport.transform, item.transform)
      } else {
        transform = item.transform.map((val: number, i: number) => {
          if (i === 4) return val * viewport.scale
          if (i === 5) return val * viewport.scale
          return val
        })
      }

      const span = document.createElement('span')
      span.textContent = item.str
      span.style.left = `${transform[4]}px`
      span.style.top = `${transform[5] - item.height * viewport.scale}px`
      span.style.fontSize = `${item.height * viewport.scale}px`
      span.style.fontFamily = item.fontName || 'sans-serif'

      if (item.width > 0 && item.str.length > 0) {
        const charWidth = (item.width * viewport.scale) / item.str.length
        span.style.letterSpacing = `${charWidth - span.offsetWidth / item.str.length}px`
      }

      container.appendChild(span)
    }
  }

  private handleScroll(): void {
    if (!this.container) return

    const containerRect = this.container.getBoundingClientRect()
    const containerCenter = containerRect.top + containerRect.height / 2

    let closestPage = 1
    let closestDistance = Infinity

    for (const page of this.pages) {
      const pageRect = page.container.getBoundingClientRect()
      const pageCenter = pageRect.top + pageRect.height / 2
      const distance = Math.abs(pageCenter - containerCenter)

      if (distance < closestDistance) {
        closestDistance = distance
        closestPage = page.pageNumber
      }
    }

    if (closestPage !== this.currentPageNumber) {
      this.currentPageNumber = closestPage
      this.dispatch('page-change', closestPage)
    }
  }

  async close(): Promise<void> {
    if (this.document) {
      this.document.destroy()
      this.document = null
    }
    if (this.loadingTask) {
      this.loadingTask.destroy()
      this.loadingTask = null
    }
    this.pages = []
    this.container.innerHTML = ''
  }

  setScale(value: number | string): void {
    const newScale = typeof value === 'string' ? parseFloat(value) : value
    if (!isNaN(newScale) && newScale !== this.scale) {
      this.scale = newScale
      this.renderAllPages()
    }
  }

  zoomIn(scaleDelta: number = 1.1): void {
    const newScale = Math.min(10.0, this.scale * scaleDelta)
    this.setScale(newScale)
  }

  zoomOut(scaleDelta: number = 1.1): void {
    const newScale = Math.max(0.5, this.scale / scaleDelta)
    this.setScale(newScale)
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= (this.document?.numPages ?? 0)) {
      const pageInfo = this.pages.find(p => p.pageNumber === page)
      if (pageInfo) {
        pageInfo.container.scrollIntoView({ behavior: 'smooth', block: 'start' })
        this.currentPageNumber = page
        this.dispatch('page-change', page)
      }
    }
  }

  getCurrentPage(): number {
    return this.currentPageNumber
  }

  getTotalPages(): number {
    return this.document?.numPages ?? 0
  }

  getDocument(): PDFDocumentProxy | null {
    return this.document
  }

  getScale(): number {
    return this.scale
  }

  getPageDimensions(pageNumber: number): { width: number; height: number } | null {
    const page = this.pages.find(p => p.pageNumber === pageNumber)
    return page ? { width: page.viewport.width, height: page.viewport.height } : null
  }

  async getDocumentBytes(): Promise<Uint8Array | null> {
    if (!this.document) return null
    return await this.document.getData()
  }

  getPagePosition(pageNumber: number): { top: number; left: number } | null {
    const pageInfo = this.pages.find(p => p.pageNumber === pageNumber)
    if (!pageInfo) return null

    return {
      top: pageInfo.container.offsetTop,
      left: pageInfo.container.offsetLeft
    }
  }
}
